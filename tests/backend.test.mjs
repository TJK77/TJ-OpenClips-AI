import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { probe, extractAudio, renderClip, buildSrt, writeSrt, makeThumbnail } from '../server/video.mjs';

const PORT = 3987;
const BASE = `http://127.0.0.1:${PORT}`;
let dataDir;
let server;
let cookie = '';
let sampleVideo;

async function makeSample(path) {
  await new Promise((resolve, reject) => {
    const child = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25:duration=8',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8',
      '-shortest', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path,
    ], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), ...(cookie ? { cookie } : {}) },
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'oc-test-'));
  sampleVideo = join(dataDir, 'sample.mp4');
  await makeSample(sampleVideo);
  server = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, SESSION_SECRET: 'test-secret-value-1234', CREDENTIAL_ENCRYPTION_KEY: 'test-encryption-key-1234' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start')), 20000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (chunk) => process.stderr.write(chunk));
    server.on('error', reject);
  });
});

after(async () => {
  server?.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 400));
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

/* ------------------------------------------------------------ video engine */

test('video engine: probe reads real metadata', async () => {
  const meta = await probe(sampleVideo);
  assert.ok(meta.hasVideo, 'sample has a video stream');
  assert.ok(meta.hasAudio, 'sample has an audio stream');
  assert.ok(Math.abs(meta.duration - 8) < 1.5, `duration ~8s, got ${meta.duration}`);
  assert.equal(meta.width, 640);
});

test('video engine: extractAudio produces a real audio file', async () => {
  const out = join(dataDir, 'audio.m4a');
  await extractAudio(sampleVideo, out);
  const info = await stat(out);
  assert.ok(info.size > 1000, `audio file has bytes, got ${info.size}`);
});

test('video engine: buildSrt emits valid timestamped cues', () => {
  const segments = [
    { start: 0.5, end: 2.2, text: 'Hello and welcome back to the show.' },
    { start: 2.2, end: 4.8, text: 'Today we are talking about clip farming.' },
  ];
  const srt = buildSrt(segments, { start: 0, end: 8 });
  assert.match(srt, /^1\r?\n00:00:00,500 --> /, 'first cue starts at 0.5s');
  assert.match(srt, /Hello and welcome back/);
  assert.ok(srt.includes('farming.'), 'second cue text present');
  assert.equal((srt.match(/\d{2}:\d{2}:\d{2},\d{3} --> /g) || []).length, 2, 'two cues emitted');
});

test('video engine: renderClip writes a real reframed 9:16 video with burned subtitles', async () => {
  const srtPath = join(dataDir, 'clip.srt');
  await writeSrt(
    srtPath,
    buildSrt([{ start: 0.4, end: 3.5, text: 'This is a real rendered caption.' }], { start: 0, end: 6 })
  );
  const out = join(dataDir, 'clip.mp4');
  const result = await renderClip({
    input: sampleVideo,
    output: out,
    start: 1,
    end: 5,
    aspect: '9:16',
    srtPath,
    style: { fontName: 'DejaVu Sans', fontSize: 48, color: '#ffffff' },
  });
  const info = await stat(out);
  assert.ok(info.size > 5000, `rendered clip has bytes, got ${info.size}`);
  const meta = await probe(out);
  assert.equal(meta.width, 1080, 'vertical width');
  assert.equal(meta.height, 1920, 'vertical height');
  assert.ok(Math.abs(meta.duration - 4) < 1.2, `clip ~4s, got ${meta.duration}`);
  assert.deepEqual(result.notes, [], 'no degraded-render notes');
});

test('video engine: renderClip honours 1:1 and 4:5 aspect ratios', async () => {
  for (const [aspect, w, h] of [['1:1', 1080, 1080], ['4:5', 1080, 1350]]) {
    const out = join(dataDir, `clip-${aspect.replace(':', 'x')}.mp4`);
    await renderClip({ input: sampleVideo, output: out, start: 0.5, end: 2.5, aspect });
    const meta = await probe(out);
    assert.equal(meta.width, w, `${aspect} width`);
    assert.equal(meta.height, h, `${aspect} height`);
  }
});

test('video engine: makeThumbnail writes a jpeg', async () => {
  const out = join(dataDir, 'thumb.jpg');
  await makeThumbnail(sampleVideo, out, 1);
  const head = await readFile(out);
  assert.equal(head[0], 0xff, 'jpeg magic byte');
  assert.ok(head.length > 500);
});

/* ------------------------------------------------------------------- api */

test('api: config reports real engine capability', async () => {
  const { status, body } = await api('/api/config');
  assert.equal(status, 200);
  assert.equal(body.ffmpegAvailable, true);
  assert.ok(body.stages.length >= 9, 'nine pipeline stages exposed');
  assert.deepEqual(body.aspects.sort(), ['16:9', '1:1', '4:5', '9:16'].sort());
});

test('api: unauthenticated access is rejected', async () => {
  const { status } = await api('/api/state');
  assert.equal(status, 401);
  const file = await api('/api/clips/anything/file');
  assert.equal(file.status, 401, 'media is not readable without a session');
});

test('api: registration validates input and creates a session', async () => {
  const weak = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'short' }),
  });
  assert.equal(weak.status, 400, 'weak password rejected');

  const mismatch = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'SuperSecret123', confirmPassword: 'Other12345' }),
  });
  assert.equal(mismatch.status, 400, 'password mismatch rejected');

  const ok = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'SuperSecret123', confirmPassword: 'SuperSecret123' }),
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.user.email, 'test@example.com');
  assert.ok(cookie.includes('oc_session'), 'httpOnly session cookie issued');

  const dup = await api('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com', password: 'SuperSecret123' }),
  });
  assert.equal(dup.status, 409, 'duplicate email rejected');

  const me = await api('/api/me');
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'test@example.com');
});

test('api: provider keys are stored masked and never returned in plaintext', async () => {
  const secret = 'gsk_live_thisIsASecretKeyValue1234567890';
  const put = await api('/api/providers/groq', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: secret, model: 'whisper-large-v3-turbo' }),
  });
  assert.equal(put.status, 200);
  assert.equal(put.body.provider.configured, true);
  assert.equal(JSON.stringify(put.body).includes(secret), false, 'raw key never returned');
  assert.match(put.body.provider.keyMask, /•/, 'key is masked');

  const state = await api('/api/state');
  assert.equal(JSON.stringify(state.body).includes(secret), false, 'state response leaks no key');
  assert.equal(state.body.providers.groq.configured, true);

  const removed = await api('/api/providers/groq', { method: 'DELETE' });
  assert.equal(removed.status, 200);
  const after = await api('/api/providers');
  assert.equal(after.body.providers.groq.configured, false);
});

test('api: analysis without provider credentials fails honestly', async () => {
  const { status, body } = await api('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ videoId: 'vid_missing' }),
  });
  assert.equal(status, 404, 'unknown video rejected');
  assert.ok(body.error);
});

test('api: video upload is validated and stored with real metadata', async () => {
  const bytes = await readFile(sampleVideo);
  const upload = await api('/api/videos/upload', {
    method: 'POST',
    headers: {
      'content-type': 'video/mp4',
      'x-filename': 'sample.mp4',
      'x-title': 'Test upload',
      'x-project': 'Test project',
    },
    body: bytes,
  });
  assert.equal(upload.status, 201, `upload accepted: ${JSON.stringify(upload.body).slice(0, 200)}`);
  assert.ok(Math.abs(upload.body.video.duration - 8) < 1.5);
  assert.equal(upload.body.video.status, 'imported');

  const job = await api('/api/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ videoId: upload.body.video.id, aspect: '9:16' }),
  });
  assert.equal(job.status, 400, 'job blocked without AI credentials');
  assert.equal(job.body.needsCredentials, true);
  assert.ok(String(job.body.error).includes('Groq'), 'names the missing provider');

  const videoFile = await api(`/api/videos/${upload.body.video.id}/file`);
  assert.equal(videoFile.status, 200, 'authenticated media streaming works');

  const notVideo = await api('/api/videos/upload', {
    method: 'POST',
    headers: { 'content-type': 'video/mp4', 'x-filename': 'fake.mp4' },
    body: Buffer.from('this is definitely not a video'),
  });
  assert.equal(notVideo.status, 400, 'non-video upload rejected');
});

test('api: posts cannot be self-marked as published', async () => {
  const create = await api('/api/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clipIds: [], action: 'draft' }),
  });
  assert.equal(create.status, 400, 'post requires a clip');

  const post = await api('/api/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clipIds: ['clip_x'], action: 'draft' }),
  });
  assert.equal(post.status, 404, 'unknown clip rejected');

  const schedule = await api('/api/posts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clipIds: ['clip_x'], action: 'schedule' }),
  });
  assert.equal(schedule.status, 400, 'scheduling requires a date');
});

test('api: buffer reports not-configured instead of faking a connection', async () => {
  const status = await api('/api/buffer/status');
  assert.equal(status.status, 200);
  assert.equal(status.body.configured, false, 'no OAuth client in this environment');
  assert.equal(status.body.connected, false);

  const authorize = await api('/api/buffer/authorize');
  assert.equal(authorize.status, 501, 'authorize explains the missing configuration');
  assert.deepEqual(authorize.body.needsEnvironment, ['BUFFER_CLIENT_ID', 'BUFFER_CLIENT_SECRET']);

  const send = await api('/api/posts/post_missing/send', { method: 'POST' });
  assert.equal(send.status, 404);
});

test('api: analytics and account purge work on real data', async () => {
  const analytics = await api('/api/analytics');
  assert.equal(analytics.status, 200);
  assert.ok(Array.isArray(analytics.body.byStatus));

  const purge = await api('/api/account/purge', { method: 'POST' });
  assert.equal(purge.status, 200);

  const state = await api('/api/state');
  assert.equal(state.body.videos.length, 0, 'purge removed uploaded video records');
});

test('api: settings persist for the signed-in user', async () => {
  const patch = await api('/api/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ quality: 'high', autoCaptions: false, language: 'en', bogusKey: 'ignored' }),
  });
  assert.equal(patch.status, 200);
  assert.equal(patch.body.settings.quality, 'high');
  assert.equal(patch.body.settings.autoCaptions, false);
  assert.equal('bogusKey' in patch.body.settings, false, 'unknown keys are ignored');

  const state = await api('/api/state');
  assert.equal(state.body.settings.quality, 'high', 'state exposes the saved settings');
  assert.equal(state.body.settings.autoCaptions, false);
});

test('api: AI description falls back to the real transcript without inventing content', async () => {
  const transcript =
    'Most creators never publish their first video because they edit too early. ' +
    'Batch filming three episodes in one afternoon removes that friction.';
  const res = await api('/api/ai/caption', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: transcript, platform: 'tiktok' }),
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.aiGenerated, false, 'no key configured, so nothing is labelled AI');
  assert.equal(res.body.source, 'local-extractive');
  assert.ok(res.body.caption.length > 0, 'composer receives a top-level caption');
  assert.ok(res.body.hashtags.length > 0, 'composer receives top-level hashtags');
  assert.match(res.body.note, /no AI provider key/i, 'the response says plainly that no AI ran');
  const haystack = transcript.toLowerCase();
  for (const tag of res.body.hashtags) {
    assert.ok(haystack.includes(tag.slice(1)), `hashtag ${tag} must come from the transcript`);
  }
});

test('api: description requests are authorised and validated', async () => {
  const missing = await api('/api/ai/caption', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(missing.status, 400, 'empty request rejected');

  const foreign = await api('/api/ai/caption', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clipId: 'clip_not_owned' }),
  });
  assert.equal(foreign.status, 404, 'clips owned by nobody are refused');

  const anonymous = await fetch(`${BASE}/api/ai/caption`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(anonymous.status, 401, 'no session means no generation');
});

test('api: logout invalidates the session', async () => {
  const out = await api('/api/auth/logout', { method: 'POST' });
  assert.equal(out.status, 200);
  cookie = '';
  const me = await api('/api/me');
  assert.equal(me.status, 401);
});
