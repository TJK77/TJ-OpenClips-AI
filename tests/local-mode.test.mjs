import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Proves the key-free production path end to end against the real HTTP API:
 * upload -> job (explicit local opt-in) -> speech detection -> ffmpeg render
 * -> authenticated MP4 download. No AI credential is involved, and the test
 * fails if any of those stages is faked.
 */
const PORT = 3988;
const BASE = `http://127.0.0.1:${PORT}`;
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

let dataDir;
let server;
let cookie = '';
let sampleVideo;

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(FFMPEG, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    child.stderr.on('data', (c) => {
      err += c.toString();
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-600)}`))
    );
  });
}

/** 37.5s video whose audio is speech-like: 18s tone, 1.5s silence, 18s tone. */
async function makeSpeechSample(path) {
  await runFfmpeg([
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=37.5',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=18',
    '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono:d=1.5',
    '-f', 'lavfi', '-i', 'sine=frequency=520:duration=18',
    '-filter_complex', '[1:a][2:a][3:a]concat=n=3:v=0:a=1[a]',
    '-map', '0:v', '-map', '[a]', '-shortest',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k',
    path,
  ]);
}

async function probeJson(path) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
      '-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path,
    ]);
    let out = '';
    let err = '';
    child.stdout.on('data', (c) => {
      out += c.toString();
    });
    child.stderr.on('data', (c) => {
      err += c.toString();
    });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(JSON.parse(out)) : reject(new Error(`ffprobe exited ${code}: ${err.slice(-400)}`))
    );
  });
}

async function api(path, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...headers },
    body,
  });
  const raw = res.headers.getSetCookie?.() || [];
  const setCookie = raw[0] || res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const type = res.headers.get('content-type') || '';
  const parsed = type.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, headers: res.headers, body: parsed };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'openclips-local-'));
  sampleVideo = join(dataDir, 'speech.mp4');
  await makeSpeechSample(sampleVideo);

  server = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: join(dataDir, 'store') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    let log = '';
    const timer = setTimeout(() => reject(new Error(`server did not start: ${log.slice(-800)}`)), 30000);
    const onData = (chunk) => {
      log += chunk.toString();
      if (log.includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    };
    server.stdout.on('data', onData);
    server.stderr.on('data', onData);
    server.on('exit', (code) => reject(new Error(`server exited ${code}: ${log.slice(-800)}`)));
  });
});

after(async () => {
  if (server) server.kill('SIGKILL');
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

test('local mode: real clip is rendered and downloaded without any AI key', async () => {
  const reg = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Local Mode',
      email: `local.mode.${Date.now()}@example.com`,
      password: 'StudioTest2026!',
    }),
  });
  assert.equal(reg.status, 201, `registered: ${JSON.stringify(reg.body).slice(0, 200)}`);

  const bytes = await (await import('node:fs/promises')).readFile(sampleVideo);
  const upload = await api('/api/videos/upload', {
    method: 'POST',
    headers: {
      'content-type': 'video/mp4',
      'x-filename': 'speech.mp4',
      'x-title': 'Speech sample',
      'x-project': 'Local mode',
    },
    body: bytes,
  });
  assert.equal(upload.status, 201, `upload accepted: ${JSON.stringify(upload.body).slice(0, 300)}`);
  const videoId = upload.body.video.id;
  assert.ok(videoId);

  // Without the explicit flag the AI gate must still refuse — no silent downgrade.
  const gated = await api('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ videoId, aspect: '9:16' }),
  });
  assert.equal(gated.status, 400, 'AI path still requires credentials');
  assert.equal(gated.body.needsCredentials, true);

  const started = await api('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ videoId, aspect: '9:16', local: true, targetClips: 1, minSec: 15, maxSec: 30 }),
  });
  assert.equal(started.status, 202, `job accepted: ${JSON.stringify(started.body).slice(0, 300)}`);
  assert.equal(started.body.job.analysisMode, 'local');
  const jobId = started.body.job.id;

  let job = null;
  for (let i = 0; i < 120; i += 1) {
    await sleep(1000);
    const poll = await api(`/api/jobs/${jobId}`);
    job = poll.body.job;
    if (job.status === 'completed' || job.status === 'failed') break;
  }
  assert.equal(job.status, 'completed', `job finished: ${job.error || ''} ${job.errorHint || ''}`);
  assert.equal(job.analysisMode, 'local');
  const transcribeStage = job.stages.find((s) => s.key === 'transcribe');
  assert.equal(transcribeStage.status, 'done');
  assert.match(String(transcribeStage.detail), /local|skipped/i, 'transcription is labelled honestly');
  assert.equal(job.transcript?.segments?.length ?? 0, 0, 'no invented transcript');

  const clips = await api('/api/clips');
  const clip = clips.body.clips.find((c) => c.videoId === videoId);
  assert.ok(clip, 'clip record created');
  assert.equal(clip.status, 'ready');
  assert.equal(clip.width, 1080);
  assert.equal(clip.height, 1920);
  assert.ok(clip.duration > 5, 'clip has a real duration');

  const download = await api(`/api/clips/${clip.id}/download`);
  assert.equal(download.status, 200, 'download served');
  assert.match(download.headers.get('content-type') || '', /video\/mp4/);
  assert.match(download.headers.get('content-disposition') || '', /attachment/);
  const mp4 = Buffer.from(download.body);
  assert.ok(mp4.length > 50000, `downloaded ${mp4.length} bytes`);
  assert.equal(mp4.subarray(4, 8).toString(), 'ftyp', 'real MP4 container');

  const out = join(dataDir, 'downloaded.mp4');
  await writeFile(out, mp4);
  assert.ok((await stat(out)).size > 50000);
  const meta = await probeJson(out);
  const videoStream = meta.streams.find((s) => s.codec_type === 'video');
  const audioStream = meta.streams.find((s) => s.codec_type === 'audio');
  assert.equal(videoStream.width, 1080);
  assert.equal(videoStream.height, 1920);
  assert.ok(audioStream, 'rendered clip keeps an audio track');
  assert.ok(Math.abs(Number(meta.format.duration) - clip.duration) < 2, 'duration matches the clip record');
});
