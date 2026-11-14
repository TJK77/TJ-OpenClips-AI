import { createReadStream } from 'node:fs';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { config, dirs, publicConfig, bufferConfigured } from './config.mjs';
import * as store from './store.mjs';
import {
  createRouter,
  json,
  fail,
  readJson,
  parseCookies,
  setCookie,
  isSecureRequest,
  clientIp,
  streamToFile,
} from './http.mjs';
import {
  hashPassword,
  verifyPassword,
  encryptSecret,
  decryptSecret,
  maskKey,
  sha256,
  newToken,
  rateLimit,
  EMAIL_RE,
  passwordProblem,
} from './security.mjs';
import {
  groqTest,
  openrouterTest,
  geminiTest,
  openrouterFreeModels,
  analyseTranscript,
  generateCaption,
  ProviderError,
  GROQ_MODELS,
} from './providers.mjs';
import { probe, renderClip, buildSrt, writeSrt, makeThumbnail, aspectDims, ASPECT_KEYS, ffmpegAvailable, ffmpegCapabilities } from './video.mjs';
import { enqueue, providerKey, STAGES, DEFAULT_CAPTION_STYLE, queueSize } from './jobs.mjs';
import {
  authorizationLink,
  exchangeCode,
  listChannels,
  createUpdate,
  signClipToken,
  verifyClipToken,
  BufferError,
} from './buffer.mjs';

const SESSION_COOKIE = 'oc_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PROVIDERS = ['groq', 'openrouter', 'gemini'];

/* ------------------------------------------------------------------ helpers */

const userView = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  initials: user.initials,
  createdAt: user.createdAt,
  avatar: user.avatar || null,
  timezone: user.timezone || 'UTC',
});

function initialsFor(name, email) {
  const source = String(name || email || 'U').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function createSession(res, req, userId) {
  const token = newToken();
  store.insert('sessions', {
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    ip: clientIp(req),
  });
  setCookie(res, SESSION_COOKIE, token, {
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    secure: isSecureRequest(req),
  });
  return token;
}

export function currentUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const hash = sha256(token);
  const session = store.where('sessions', (s) => s.tokenHash === hash)[0];
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    store.remove('sessions', session.id);
    return null;
  }
  return store.get('users', session.userId);
}

function requireUser(ctx, res) {
  if (!ctx.user) {
    fail(res, 401, 'Sign in to continue.');
    return false;
  }
  return true;
}

const providerRecord = (userId, provider) =>
  store
    .where('credentials', (c) => c.userId === userId && c.provider === provider)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)))[0] || null;

function providerView(record) {
  if (!record) return { provider: null, configured: false };
  return {
    provider: record.provider,
    configured: Boolean(record.encryptedKey),
    keyMask: record.keyMask || '',
    model: record.model || '',
    status: record.status || 'untested',
    lastError: record.lastError || null,
    lastTestedAt: record.lastTestedAt || null,
    latencyMs: record.latencyMs || null,
    models: record.models || [],
    usage: record.usage || null,
  };
}

const clipView = (clip) => ({
  id: clip.id,
  videoId: clip.videoId,
  jobId: clip.jobId,
  title: clip.title,
  hook: clip.hook,
  caption: clip.caption,
  hashtags: clip.hashtags || [],
  reason: clip.reason,
  speaker: clip.speaker,
  start: clip.start,
  end: clip.end,
  duration: clip.duration,
  score: clip.score,
  metrics: clip.metrics,
  aspect: clip.aspect,
  width: clip.width,
  height: clip.height,
  status: clip.status,
  sourceTitle: clip.sourceTitle,
  captionStyle: clip.captionStyle,
  videoUrl: `/api/clips/${clip.id}/file`,
  thumbUrl: `/api/clips/${clip.id}/thumb`,
  downloadUrl: `/api/clips/${clip.id}/download`,
  createdAt: clip.createdAt,
});

const videoView = (video) => ({
  id: video.id,
  title: video.title,
  project: video.project || 'Untitled project',
  source: video.source,
  sourceUrl: video.sourceUrl || null,
  language: video.language || 'auto',
  status: video.status,
  duration: video.duration || 0,
  width: video.width || 0,
  height: video.height || 0,
  fps: video.fps || 0,
  sizeBytes: video.sizeBytes || 0,
  clipCount: video.clipCount || 0,
  error: video.error || null,
  createdAt: video.createdAt,
  fileUrl: `/api/videos/${video.id}/file`,
  thumbUrl: video.thumbPath ? `/api/videos/${video.id}/thumb` : null,
});

const jobView = (job) => ({
  id: job.id,
  videoId: job.videoId,
  status: job.status,
  stage: job.stage,
  progress: job.progress,
  stages: job.stages,
  error: job.error || null,
  errorHint: job.errorHint || null,
  errorStage: job.errorStage || null,
  aspect: job.aspect,
  analysisProvider: job.analysisProvider,
  model: job.model,
  transcript: job.transcript ? { language: job.transcript.language, segments: job.transcript.segments, words: job.transcript.words || [], text: job.transcript.text } : null,
  analysisSummary: job.analysisSummary || null,
  topics: job.topics || [],
  clipIds: job.clipIds || [],
  notes: job.notes || [],
  createdAt: job.createdAt,
  startedAt: job.startedAt || null,
  finishedAt: job.finishedAt || null,
});

function captionStyles(userId) {
  const existing = store.where('captions', (c) => c.userId === userId);
  if (existing.length) return existing;
  const seeded = store.insert('captions', {
    userId,
    name: DEFAULT_CAPTION_STYLE.name,
    style: DEFAULT_CAPTION_STYLE,
    isDefault: true,
  });
  return [seeded];
}

function stats(userId) {
  const videos = store.where('videos', (v) => v.userId === userId);
  const clips = store.where('clips', (c) => c.userId === userId);
  const posts = store.where('posts', (p) => p.userId === userId);
  const account = store.where('bufferAccounts', (b) => b.userId === userId)[0] || null;
  const channels = account?.channels || [];
  return {
    videos: videos.length,
    clips: clips.length,
    minutesProcessed: Math.round(videos.reduce((sum, v) => sum + (v.duration || 0), 0) / 60),
    scheduled: posts.filter((p) => ['scheduled', 'queued', 'publishing'].includes(p.status)).length,
    published: posts.filter((p) => p.status === 'published').length,
    drafts: posts.filter((p) => p.status === 'draft').length,
    failed: posts.filter((p) => p.status === 'failed').length,
    channels: channels.length,
    avgScore: clips.length ? Math.round(clips.reduce((s, c) => s + (c.score || 0), 0) / clips.length) : 0,
  };
}

async function serveFile(req, res, filePath, { mime = 'application/octet-stream', download = null } = {}) {
  let info;
  try {
    info = await stat(filePath);
  } catch {
    return fail(res, 404, 'File not found.');
  }
  const headers = {
    'content-type': mime,
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=120',
  };
  if (download) headers['content-disposition'] = `attachment; filename="${download.replace(/["\\]/g, '')}"`;
  const range = req.headers.range;
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match && match[1] ? Number(match[1]) : 0;
    const end = match && match[2] ? Math.min(Number(match[2]), info.size - 1) : info.size - 1;
    if (Number.isNaN(start) || start >= info.size || end < start) {
      res.writeHead(416, { 'content-range': `bytes */${info.size}` });
      return res.end();
    }
    res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${info.size}`, 'content-length': end - start + 1 });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'content-length': info.size });
  createReadStream(filePath).pipe(res);
}

const safeName = (name) => String(name || 'video').replace(/[^a-z0-9._-]+/gi, '-').slice(0, 80);

async function ytdlpAvailable() {
  return new Promise((resolve) => {
    const child = spawn('yt-dlp', ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

function runYtdlp(url, output) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'yt-dlp',
      ['-f', 'mp4/bestvideo*+bestaudio/best', '--merge-output-format', 'mp4', '--no-playlist', '-o', output, '--', url],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stderr = '';
    child.stderr.on('data', (c) => {
      stderr += c.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), 15 * 60 * 1000);
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(new Error(`yt-dlp could not start: ${error.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(stderr.split('\n').filter(Boolean).slice(-2).join(' ') || `yt-dlp exited ${code}`));
    });
  });
}

async function directDownload(url, output) {
  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15 * 60 * 1000),
      headers: { 'user-agent': 'Mozilla/5.0 TJ-OpenClips/2.0' },
    });
  } catch (error) {
    throw new Error(`Could not download the URL: ${error.message}`);
  }
  if (!response.ok) throw new Error(`The URL responded ${response.status}.`);
  const type = response.headers.get('content-type') || '';
  if (!/^(video|audio)\/|application\/(octet-stream|mp4)/i.test(type)) {
    throw Object.assign(
      new Error(`That URL returned "${type || 'unknown content'}", not a video file. Platform pages need yt-dlp support.`),
      { status: 415 }
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > config.maxUploadBytes) throw new Error('The remote video is larger than the upload limit.');
  await writeFile(output, buffer);
  return buffer.length;
}

/* --------------------------------------------------------------------- router */

export const router = createRouter();

/* --- auth --- */

router.post('/api/auth/register', async (req, res, ctx) => {
  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return fail(res, 429, 'Too many registration attempts. Try again later.');
  }
  const body = await readJson(req);
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (name.length < 2) return fail(res, 400, 'Enter your full name.');
  if (!EMAIL_RE.test(email)) return fail(res, 400, 'Enter a valid email address.');
  const problem = passwordProblem(password);
  if (problem) return fail(res, 400, problem);
  if (body.confirmPassword !== undefined && String(body.confirmPassword) !== password) {
    return fail(res, 400, 'The passwords do not match.');
  }
  if (store.where('users', (u) => u.email === email).length) {
    return fail(res, 409, 'An account with this email already exists. Sign in instead.');
  }

  const user = store.insert('users', {
    name,
    email,
    initials: initialsFor(name, email),
    passwordHash: hashPassword(password),
    timezone: String(body.timezone || 'UTC'),
  });
  createSession(res, req, user.id);
  return json(res, 201, { user: userView(user) });
});

router.post('/api/auth/login', async (req, res) => {
  const body = await readJson(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!rateLimit(`login:${clientIp(req)}:${email}`, 12, 15 * 60 * 1000)) {
    return fail(res, 429, 'Too many sign-in attempts. Wait a few minutes and try again.');
  }
  const user = store.where('users', (u) => u.email === email)[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail(res, 401, 'Email or password is incorrect.');
  }
  createSession(res, req, user.id);
  return json(res, 200, { user: userView(user) });
});

router.post('/api/auth/logout', async (req, res) => {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) {
    const hash = sha256(token);
    store.removeWhere('sessions', (s) => s.tokenHash === hash);
  }
  setCookie(res, SESSION_COOKIE, '', { maxAge: 0, secure: isSecureRequest(req) });
  return json(res, 200, { ok: true });
});

router.get('/api/me', async (req, res, ctx) => {
  if (!ctx.user) return fail(res, 401, 'Not signed in.');
  return json(res, 200, { user: userView(ctx.user), stats: stats(ctx.user.id) });
});

router.patch('/api/me', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) return fail(res, 400, 'Enter your full name.');
    patch.name = name;
    patch.initials = initialsFor(name, ctx.user.email);
  }
  if (body.timezone !== undefined) patch.timezone = String(body.timezone).slice(0, 60);
  const user = store.update('users', ctx.user.id, patch);
  return json(res, 200, { user: userView(user) });
});

router.post('/api/me/password', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  if (!verifyPassword(String(body.currentPassword || ''), ctx.user.passwordHash)) {
    return fail(res, 400, 'Your current password is incorrect.');
  }
  const problem = passwordProblem(body.newPassword);
  if (problem) return fail(res, 400, problem);
  store.update('users', ctx.user.id, { passwordHash: hashPassword(String(body.newPassword)) });
  store.removeWhere('sessions', (s) => s.userId === ctx.user.id);
  createSession(res, req, ctx.user.id);
  return json(res, 200, { ok: true });
});

/* --- config & state --- */

router.get('/api/config', async (req, res) => {
  const [ffmpeg, caps] = await Promise.all([ffmpegAvailable(), ffmpegCapabilities()]);
  return json(res, 200, {
    ...publicConfig(),
    ffmpegAvailable: ffmpeg,
    subtitleBurnIn: caps.subtitles,
    watermarkOverlay: caps.drawtext,
    ytdlp: await ytdlpAvailable(),
    queue: queueSize(),
    stages: STAGES,
    aspects: ASPECT_KEYS,
  });
});

router.get('/api/state', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const userId = ctx.user.id;
  const providers = {};
  for (const provider of PROVIDERS) providers[provider] = providerView(providerRecord(userId, provider));
  const account = store.where('bufferAccounts', (b) => b.userId === userId)[0] || null;
  return json(res, 200, {
    user: userView(ctx.user),
    stats: stats(userId),
    videos: store.where('videos', (v) => v.userId === userId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(videoView),
    jobs: store.where('jobs', (j) => j.userId === userId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 20).map(jobView),
    clips: store.where('clips', (c) => c.userId === userId).sort((a, b) => (b.score || 0) - (a.score || 0)).map(clipView),
    posts: store.where('posts', (p) => p.userId === userId).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    providers,
    captionStyles: captionStyles(userId).map((s) => ({ id: s.id, name: s.name, style: s.style, isDefault: Boolean(s.isDefault) })),
    buffer: {
      configured: bufferConfigured(),
      connected: Boolean(account?.accessToken),
      account: account ? { id: account.id, connectedAt: account.connectedAt, authMethod: account.authMethod } : null,
      channels: account?.channels || [],
      lastError: account?.lastError || null,
    },
    processing: { queue: queueSize(), maxClipsPerJob: config.clipLimitPerJob, maxUploadMb: Math.round(config.maxUploadBytes / 1048576) },
  });
});

/* --- providers --- */

router.get('/api/providers', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const out = {};
  for (const provider of PROVIDERS) out[provider] = providerView(providerRecord(ctx.user.id, provider));
  return json(res, 200, { providers: out, groqModels: GROQ_MODELS });
});

router.put('/api/providers/:provider', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const provider = ctx.params.provider;
  if (!PROVIDERS.includes(provider)) return fail(res, 404, 'Unknown provider.');
  const body = await readJson(req);
  const existing = providerRecord(ctx.user.id, provider);
  const patch = {};

  if (body.apiKey !== undefined) {
    const key = String(body.apiKey).trim();
    if (key && key.length < 12) return fail(res, 400, 'That API key looks too short.');
    patch.encryptedKey = key ? encryptSecret(key) : null;
    patch.keyMask = key ? maskKey(key) : '';
    patch.status = key ? 'untested' : 'untested';
    patch.lastError = null;
    patch.models = [];
    patch.usage = null;
  }
  if (body.model !== undefined) patch.model = String(body.model).slice(0, 120);

  if (existing) store.update('credentials', existing.id, patch);
  else store.insert('credentials', { userId: ctx.user.id, provider, ...patch });
  return json(res, 200, { provider: providerView(providerRecord(ctx.user.id, provider)) });
});

router.del('/api/providers/:provider', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  store.removeWhere('credentials', (c) => c.userId === ctx.user.id && c.provider === ctx.params.provider);
  return json(res, 200, { ok: true });
});

router.post('/api/providers/:provider/test', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const provider = ctx.params.provider;
  if (!PROVIDERS.includes(provider)) return fail(res, 404, 'Unknown provider.');
  const record = providerRecord(ctx.user.id, provider);
  if (!record?.encryptedKey) return fail(res, 400, 'Save an API key for this provider first.');
  const key = decryptSecret(record.encryptedKey);
  if (!key) return fail(res, 500, 'The stored key could not be decrypted. Re-enter it.');

  try {
    let result;
    if (provider === 'groq') result = await groqTest(key);
    else if (provider === 'openrouter') result = await openrouterTest(key);
    else result = await geminiTest(key);

    store.update('credentials', record.id, {
      status: 'connected',
      lastError: null,
      lastTestedAt: new Date().toISOString(),
      latencyMs: result.latencyMs,
      models: result.models || result.freeModels || [],
      usage: result.usage || null,
    });
    return json(res, 200, { ok: true, provider, ...result, record: providerView(providerRecord(ctx.user.id, provider)) });
  } catch (error) {
    const detail = error instanceof ProviderError ? error.detail || error.message : error.message;
    const hint = error?.hint || null;
    store.update('credentials', record.id, {
      status: 'failed',
      lastError: detail,
      lastTestedAt: new Date().toISOString(),
    });
    return fail(res, 400, detail, { provider, hint, record: providerView(providerRecord(ctx.user.id, provider)) });
  }
});

router.get('/api/providers/openrouter/free-models', async (req, res) => {
  try {
    return json(res, 200, { models: await openrouterFreeModels() });
  } catch (error) {
    return fail(res, 502, error.message);
  }
});

/* --- videos --- */

router.post('/api/videos/upload', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  if (!rateLimit(`upload:${ctx.user.id}`, 20, 60 * 60 * 1000)) {
    return fail(res, 429, 'Upload limit reached for this hour. Try again shortly.');
  }
  const filename = safeName(req.headers['x-filename'] || 'upload.mp4');
  const title = String(req.headers['x-title'] || filename.replace(/\.[^.]+$/, '')).slice(0, 160);
  const project = String(req.headers['x-project'] || 'Untitled project').slice(0, 160);
  const language = String(req.headers['x-language'] || 'auto').slice(0, 40);

  const videoId = store.newId('vid');
  const ext = extname(filename).toLowerCase() || '.mp4';
  const path = join(dirs.uploads, `${videoId}${ext}`);

  let size;
  try {
    size = await streamToFile(req, path, config.maxUploadBytes);
  } catch (error) {
    return fail(res, error.status || 500, error.message);
  }

  let meta;
  try {
    meta = await probe(path);
    if (!meta.hasVideo) throw new Error('The file has no video stream.');
  } catch (error) {
    await unlink(path).catch(() => {});
    return fail(res, 400, `That file could not be read as a video: ${error.message}`);
  }

  const thumbPath = join(dirs.thumbs, `${videoId}.jpg`);
  try {
    await makeThumbnail(path, thumbPath, Math.min(2, (meta.duration || 2) / 2));
  } catch {
    /* thumbnail is optional */
  }

  const video = store.insert('videos', {
    id: videoId,
    userId: ctx.user.id,
    title,
    project,
    language,
    source: 'upload',
    filename,
    path,
    thumbPath,
    sizeBytes: size,
    duration: meta.duration,
    width: meta.width,
    height: meta.height,
    fps: meta.fps,
    hasAudio: meta.hasAudio,
    status: 'imported',
  });
  return json(res, 201, { video: videoView(video) });
});

router.post('/api/videos/import', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const url = String(body.url || '').trim();
  if (!/^https?:\/\/[^\s]+$/i.test(url)) return fail(res, 400, 'Enter a valid http(s) video URL.');

  const videoId = store.newId('vid');
  const path = join(dirs.uploads, `${videoId}.mp4`);
  const canYtdlp = await ytdlpAvailable();
  let method = 'direct';

  try {
    if (canYtdlp) {
      method = 'yt-dlp';
      await runYtdlp(url, path);
    } else {
      await directDownload(url, path);
    }
  } catch (error) {
    if (canYtdlp) {
      await unlink(path).catch(() => {});
      return fail(res, 400, `Video import failed: ${error.message}`, {
        hint: 'The link may be private, region-locked or unsupported by yt-dlp.',
      });
    }
    await unlink(path).catch(() => {});
    return fail(res, error.status || 400, error.message, {
      hint: 'Direct file URLs work now. Platform pages (YouTube, TikTok) need yt-dlp installed on the server.',
    });
  }

  let meta;
  try {
    meta = await probe(path);
    if (!meta.hasVideo) throw new Error('No video stream found in the downloaded file.');
  } catch (error) {
    await unlink(path).catch(() => {});
    return fail(res, 400, `The downloaded file is not a readable video: ${error.message}`);
  }

  const thumbPath = join(dirs.thumbs, `${videoId}.jpg`);
  try {
    await makeThumbnail(path, thumbPath, Math.min(2, (meta.duration || 2) / 2));
  } catch {
    /* optional */
  }

  const video = store.insert('videos', {
    id: videoId,
    userId: ctx.user.id,
    title: String(body.title || '').trim().slice(0, 160) || 'Imported video',
    project: String(body.project || 'Untitled project').slice(0, 160),
    language: String(body.language || 'auto').slice(0, 40),
    source: method === 'yt-dlp' ? 'url' : 'url-direct',
    sourceUrl: url,
    path,
    thumbPath,
    sizeBytes: meta.sizeBytes,
    duration: meta.duration,
    width: meta.width,
    height: meta.height,
    fps: meta.fps,
    hasAudio: meta.hasAudio,
    status: 'imported',
  });
  return json(res, 201, { video: videoView(video), method });
});

router.get('/api/videos', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  return json(res, 200, {
    videos: store
      .where('videos', (v) => v.userId === ctx.user.id)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .map(videoView),
  });
});

router.get('/api/videos/:id/file', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const video = store.get('videos', ctx.params.id);
  if (!video || video.userId !== ctx.user.id) return fail(res, 404, 'Video not found.');
  return serveFile(req, res, video.path, { mime: 'video/mp4' });
});

router.get('/api/videos/:id/thumb', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const video = store.get('videos', ctx.params.id);
  if (!video || video.userId !== ctx.user.id || !video.thumbPath) return fail(res, 404, 'Thumbnail not found.');
  return serveFile(req, res, video.thumbPath, { mime: 'image/jpeg' });
});

router.del('/api/videos/:id', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const video = store.get('videos', ctx.params.id);
  if (!video || video.userId !== ctx.user.id) return fail(res, 404, 'Video not found.');
  const clips = store.where('clips', (c) => c.videoId === video.id);
  for (const clip of clips) {
    await unlink(clip.path).catch(() => {});
    await unlink(clip.thumbPath).catch(() => {});
    await unlink(clip.srtPath).catch(() => {});
  }
  store.removeWhere('clips', (c) => c.videoId === video.id);
  await unlink(video.path).catch(() => {});
  await unlink(video.thumbPath).catch(() => {});
  if (video.audioPath) await unlink(video.audioPath).catch(() => {});
  store.removeWhere('jobs', (j) => j.videoId === video.id);
  store.remove('videos', video.id);
  return json(res, 200, { ok: true });
});

/* --- jobs --- */

router.post('/api/jobs', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const video = store.get('videos', String(body.videoId || ''));
  if (!video || video.userId !== ctx.user.id) return fail(res, 404, 'Video not found.');
  if (!video.hasAudio) return fail(res, 400, 'This video has no audio track, so there is no speech to transcribe.');

  const aspect = ASPECT_KEYS.includes(body.aspect) ? body.aspect : '9:16';
  const analysisProvider = PROVIDERS.includes(body.analysisProvider) ? body.analysisProvider : 'openrouter';

  const missing = [];
  if (!providerKey(ctx.user.id, 'groq')) missing.push('Groq (transcription)');
  if (!providerKey(ctx.user.id, analysisProvider)) missing.push(`${analysisProvider} (analysis)`);
  if (missing.length) {
    return fail(res, 400, `Configure ${missing.join(' and ')} in AI Models before analysing a video.`, {
      missingProviders: missing,
      needsCredentials: true,
    });
  }

  const job = store.insert('jobs', {
    userId: ctx.user.id,
    videoId: video.id,
    status: 'queued',
    stage: 'import',
    progress: 0,
    stages: STAGES.map((s) => ({ ...s, status: 'pending' })),
    aspect,
    analysisProvider,
    model: String(body.model || '').slice(0, 120),
    transcriptionModel: String(body.transcriptionModel || 'whisper-large-v3-turbo').slice(0, 120),
    language: String(body.language || video.language || 'auto').slice(0, 40),
    targetClips: Math.max(1, Math.min(config.clipLimitPerJob, Number(body.targetClips) || 4)),
    minSec: Math.max(5, Number(body.minSec) || 15),
    maxSec: Math.max(10, Number(body.maxSec) || 60),
    captionStyle: { ...DEFAULT_CAPTION_STYLE, ...(body.captionStyle || {}) },
    watermark: String(body.watermark || '').slice(0, 40),
  });
  store.update('videos', video.id, { status: 'queued', error: null });
  enqueue(job.id);
  return json(res, 202, { job: jobView(store.get('jobs', job.id)) });
});

router.get('/api/jobs/:id', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const job = store.get('jobs', ctx.params.id);
  if (!job || job.userId !== ctx.user.id) return fail(res, 404, 'Job not found.');
  return json(res, 200, { job: jobView(job) });
});

router.post('/api/jobs/:id/retry', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const job = store.get('jobs', ctx.params.id);
  if (!job || job.userId !== ctx.user.id) return fail(res, 404, 'Job not found.');
  if (job.status === 'running' || job.status === 'queued') return fail(res, 409, 'This job is already running.');
  store.update('jobs', job.id, {
    status: 'queued',
    progress: 0,
    error: null,
    errorHint: null,
    errorStage: null,
    stages: STAGES.map((s) => ({ ...s, status: 'pending' })),
  });
  store.update('videos', job.videoId, { status: 'queued', error: null });
  enqueue(job.id);
  return json(res, 202, { job: jobView(store.get('jobs', job.id)) });
});

/* --- clips --- */

router.get('/api/clips', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  return json(res, 200, {
    clips: store
      .where('clips', (c) => c.userId === ctx.user.id)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .map(clipView),
  });
});

router.get('/api/clips/:id/file', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clip = store.get('clips', ctx.params.id);
  if (!clip || clip.userId !== ctx.user.id) return fail(res, 404, 'Clip not found.');
  return serveFile(req, res, clip.path, { mime: 'video/mp4' });
});

router.get('/api/clips/:id/download', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clip = store.get('clips', ctx.params.id);
  if (!clip || clip.userId !== ctx.user.id) return fail(res, 404, 'Clip not found.');
  const name = `${safeName(clip.title)}-${clip.aspect.replace(':', 'x')}.mp4`;
  return serveFile(req, res, clip.path, { mime: 'video/mp4', download: name });
});

router.get('/api/clips/:id/thumb', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clip = store.get('clips', ctx.params.id);
  if (!clip || clip.userId !== ctx.user.id) return fail(res, 404, 'Thumbnail not found.');
  return serveFile(req, res, clip.thumbPath, { mime: 'image/jpeg' });
});

/** Signed URL Buffer can fetch without a session cookie. */
router.get('/api/public/clips/:id/:token', async (req, res) => {
  const clip = store.get('clips', req.params.id);
  if (!clip) return fail(res, 404, 'Clip not found.');
  if (!verifyClipToken(req.params.id, req.params.token)) return fail(res, 403, 'This media link has expired.');
  return serveFile(req, res, clip.path, { mime: 'video/mp4' });
});

router.post('/api/clips/:id/render', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clip = store.get('clips', ctx.params.id);
  if (!clip || clip.userId !== ctx.user.id) return fail(res, 404, 'Clip not found.');
  const video = store.get('videos', clip.videoId);
  if (!video) return fail(res, 404, 'The source video is no longer available.');
  const body = await readJson(req);

  const start = Math.max(0, Number(body.start ?? clip.start));
  const end = Math.min(video.duration || 1e9, Number(body.end ?? clip.end));
  if (end - start < 2) return fail(res, 400, 'The clip must be at least 2 seconds long.');
  const aspect = ASPECT_KEYS.includes(body.aspect) ? body.aspect : clip.aspect;
  const style = { ...clip.captionStyle, ...(body.style || {}) };
  const watermark = String(body.watermark ?? '').slice(0, 40);

  const job = store.get('jobs', clip.jobId);
  const transcript = job?.transcript;
  if (!transcript) return fail(res, 409, 'The transcript for this clip is no longer available. Re-run the analysis.');

  const srt = buildSrt(transcript.segments, { start, end, words: transcript.words || [] });
  await writeSrt(clip.srtPath, srt);
  const output = join(dirs.clips, `${clip.id}.mp4`);
  const tmpOutput = join(dirs.clips, `${clip.id}.tmp.mp4`);

  try {
    const result = await renderClip({
      input: video.path,
      output: tmpOutput,
      start,
      end,
      aspect,
      srtPath: clip.srtPath,
      style,
      watermark,
    });
    const { rename } = await import('node:fs/promises');
    await rename(tmpOutput, output);
    await makeThumbnail(output, clip.thumbPath, Math.min(1, (end - start) / 3)).catch(() => {});
    const updated = store.update('clips', clip.id, {
      start,
      end,
      duration: Math.round((end - start) * 10) / 10,
      aspect,
      width: result.width,
      height: result.height,
      captionStyle: style,
      notes: result.notes || [],
      renderedAt: new Date().toISOString(),
      status: 'ready',
    });
    return json(res, 200, { clip: clipView(updated), notes: result.notes || [] });
  } catch (error) {
    await unlink(tmpOutput).catch(() => {});
    return fail(res, 500, `Re-render failed: ${error.message}`);
  }
});

router.post('/api/clips/apply-caption-style', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const ids = Array.isArray(body.clipIds) ? body.clipIds.map(String) : [];
  const style = { ...DEFAULT_CAPTION_STYLE, ...(body.style || {}) };
  const results = [];
  for (const id of ids) {
    const clip = store.get('clips', id);
    if (!clip || clip.userId !== ctx.user.id) continue;
    const video = store.get('videos', clip.videoId);
    const job = store.get('jobs', clip.jobId);
    if (!video || !job?.transcript) {
      results.push({ id, ok: false, error: 'Transcript unavailable for this clip.' });
      continue;
    }
    const srt = buildSrt(job.transcript.segments, { start: clip.start, end: clip.end, words: job.transcript.words || [] });
    await writeSrt(clip.srtPath, srt);
    try {
      const result = await renderClip({
        input: video.path,
        output: clip.path,
        start: clip.start,
        end: clip.end,
        aspect: clip.aspect,
        srtPath: clip.srtPath,
        style,
      });
      store.update('clips', clip.id, { captionStyle: style, notes: result.notes || [], renderedAt: new Date().toISOString() });
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, error: error.message });
    }
  }
  return json(res, 200, { results });
});

router.patch('/api/clips/:id', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clip = store.get('clips', ctx.params.id);
  if (!clip || clip.userId !== ctx.user.id) return fail(res, 404, 'Clip not found.');
  const body = await readJson(req);
  const patch = {};
  for (const key of ['title', 'caption', 'hook']) {
    if (body[key] !== undefined) patch[key] = String(body[key]).slice(0, 600);
  }
  if (body.hashtags !== undefined && Array.isArray(body.hashtags)) patch.hashtags = body.hashtags.map(String).slice(0, 10);
  const updated = store.update('clips', clip.id, patch);
  return json(res, 200, { clip: clipView(updated) });
});

router.del('/api/clips/:id', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clip = store.get('clips', ctx.params.id);
  if (!clip || clip.userId !== ctx.user.id) return fail(res, 404, 'Clip not found.');
  await unlink(clip.path).catch(() => {});
  await unlink(clip.thumbPath).catch(() => {});
  await unlink(clip.srtPath).catch(() => {});
  store.remove('clips', clip.id);
  return json(res, 200, { ok: true });
});

/* --- caption styles --- */

router.get('/api/caption-styles', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  return json(res, 200, {
    styles: captionStyles(ctx.user.id).map((s) => ({ id: s.id, name: s.name, style: s.style, isDefault: Boolean(s.isDefault) })),
  });
});

router.post('/api/caption-styles', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const style = { ...DEFAULT_CAPTION_STYLE, ...(body.style || {}) };
  const name = String(body.name || style.name || 'Custom style').slice(0, 60);
  const record = store.insert('captions', { userId: ctx.user.id, name, style: { ...style, name } });
  return json(res, 201, { style: { id: record.id, name: record.name, style: record.style, isDefault: false } });
});

/* --- buffer --- */

router.get('/api/buffer/status', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const account = store.where('bufferAccounts', (b) => b.userId === ctx.user.id)[0] || null;
  return json(res, 200, {
    configured: bufferConfigured(),
    connected: Boolean(account?.accessToken),
    channels: account?.channels || [],
    lastError: account?.lastError || null,
    connectedAt: account?.connectedAt || null,
    authMethod: account?.authMethod || null,
    docs: 'Buffer requires an approved OAuth2 client (or an existing personal access token).',
  });
});

router.get('/api/buffer/authorize', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  if (!bufferConfigured()) {
    return fail(res, 501, 'Buffer OAuth is not configured on this server.', {
      needsEnvironment: ['BUFFER_CLIENT_ID', 'BUFFER_CLIENT_SECRET'],
      hint: 'Add your Buffer OAuth client credentials in Settings → Environment variables, then reload.',
    });
  }
  const state = newToken();
  store.update('users', ctx.user.id, { bufferState: state });
  const origin = `${req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers.host}`;
  return json(res, 200, { url: authorizationLink(state, origin) });
});

router.get('/api/buffer/callback', async (req, res, ctx) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const user = ctx.user;
  const redirect = (params) => {
    res.writeHead(302, { location: `/#/buffer?${new URLSearchParams(params).toString()}` });
    res.end();
  };
  if (error) return redirect({ buffer: 'error', message: error });
  if (!user || !code || !state || user.bufferState !== state) {
    return redirect({ buffer: 'error', message: 'The Buffer authorization could not be verified. Try connecting again.' });
  }
  const origin = `${req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers.host}`;
  try {
    const token = await exchangeCode(code, origin);
    const channels = await listChannels(token.accessToken);
    const existing = store.where('bufferAccounts', (b) => b.userId === user.id)[0];
    const payload = {
      userId: user.id,
      encryptedToken: encryptSecret(token.accessToken),
      authMethod: 'oauth',
      scope: token.scope,
      channels,
      connectedAt: new Date().toISOString(),
      lastError: null,
    };
    if (existing) store.update('bufferAccounts', existing.id, payload);
    else store.insert('bufferAccounts', payload);
    store.update('users', user.id, { bufferState: null });
    return redirect({ buffer: 'connected', channels: String(channels.length) });
  } catch (err) {
    return redirect({ buffer: 'error', message: err.message });
  }
});

router.post('/api/buffer/token', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const token = String(body.accessToken || '').trim();
  if (token.length < 20) return fail(res, 400, 'That access token looks too short.');
  try {
    const channels = await listChannels(token);
    const existing = store.where('bufferAccounts', (b) => b.userId === ctx.user.id)[0];
    const payload = {
      userId: ctx.user.id,
      encryptedToken: encryptSecret(token),
      authMethod: 'token',
      channels,
      connectedAt: new Date().toISOString(),
      lastError: null,
    };
    if (existing) store.update('bufferAccounts', existing.id, payload);
    else store.insert('bufferAccounts', payload);
    return json(res, 200, { ok: true, channels });
  } catch (error) {
    const detail = error instanceof BufferError ? error.detail || error.message : error.message;
    const existing = store.where('bufferAccounts', (b) => b.userId === ctx.user.id)[0];
    if (existing) store.update('bufferAccounts', existing.id, { lastError: detail });
    return fail(res, 400, detail, { hint: error?.hint || null });
  }
});

router.post('/api/buffer/refresh', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const account = store.where('bufferAccounts', (b) => b.userId === ctx.user.id)[0];
  if (!account) return fail(res, 400, 'Buffer is not connected.');
  const token = decryptSecret(account.encryptedToken);
  if (!token) return fail(res, 500, 'The stored Buffer token could not be decrypted. Reconnect Buffer.');
  try {
    const channels = await listChannels(token);
    store.update('bufferAccounts', account.id, { channels, lastError: null, refreshedAt: new Date().toISOString() });
    return json(res, 200, { channels });
  } catch (error) {
    const detail = error instanceof BufferError ? error.detail || error.message : error.message;
    store.update('bufferAccounts', account.id, { lastError: detail });
    return fail(res, 400, detail, { hint: error?.hint || null });
  }
});

router.post('/api/buffer/disconnect', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  store.removeWhere('bufferAccounts', (b) => b.userId === ctx.user.id);
  return json(res, 200, { ok: true });
});

/* --- posts / publishing --- */

const POST_STATUSES = ['draft', 'uploading', 'scheduled', 'queued', 'publishing', 'published', 'failed'];

router.get('/api/posts', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  return json(res, 200, {
    posts: store.where('posts', (p) => p.userId === ctx.user.id).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  });
});

router.post('/api/posts', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const body = await readJson(req);
  const clipIds = Array.isArray(body.clipIds) ? body.clipIds.map(String) : [];
  if (!clipIds.length) return fail(res, 400, 'Select at least one clip.');
  const clips = clipIds
    .map((id) => store.get('clips', id))
    .filter((clip) => clip && clip.userId === ctx.user.id);
  if (!clips.length) return fail(res, 404, 'None of the selected clips were found.');

  const channels = Array.isArray(body.channels) ? body.channels.slice(0, 10).map((c) => ({
    id: String(c.id || ''),
    name: String(c.name || 'Channel').slice(0, 80),
    service: String(c.service || 'unknown').slice(0, 40),
  })) : [];

  const action = ['draft', 'schedule'].includes(body.action) ? body.action : 'draft';
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (action === 'schedule' && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    return fail(res, 400, 'Choose a valid publish date and time.');
  }
  if (action === 'schedule' && !channels.length) return fail(res, 400, 'Select at least one destination channel.');

  const post = store.insert('posts', {
    userId: ctx.user.id,
    clipIds: clips.map((c) => c.id),
    clipTitles: clips.map((c) => c.title),
    channels,
    caption: String(body.caption || '').slice(0, 2200),
    hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String).slice(0, 12) : [],
    description: String(body.description || '').slice(0, 2200),
    scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
    status: action === 'schedule' ? 'scheduled' : 'draft',
    bufferUpdates: [],
    error: null,
  });
  return json(res, 201, { post });
});

router.patch('/api/posts/:id', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const post = store.get('posts', ctx.params.id);
  if (!post || post.userId !== ctx.user.id) return fail(res, 404, 'Post not found.');
  const body = await readJson(req);
  const patch = {};
  if (body.caption !== undefined) patch.caption = String(body.caption).slice(0, 2200);
  if (body.description !== undefined) patch.description = String(body.description).slice(0, 2200);
  if (body.hashtags !== undefined && Array.isArray(body.hashtags)) patch.hashtags = body.hashtags.map(String).slice(0, 12);
  if (body.scheduledAt !== undefined) {
    const when = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (when && Number.isNaN(when.getTime())) return fail(res, 400, 'Invalid date.');
    patch.scheduledAt = when ? when.toISOString() : null;
  }
  if (body.status !== undefined) {
    if (!POST_STATUSES.includes(body.status)) return fail(res, 400, 'Unknown status.');
    if (body.status === 'published') {
      return fail(res, 400, 'Only Buffer can mark a post as published. Use "Send to Buffer".');
    }
    patch.status = body.status;
  }
  if (body.channels !== undefined && Array.isArray(body.channels)) {
    patch.channels = body.channels.slice(0, 10).map((c) => ({
      id: String(c.id || ''),
      name: String(c.name || 'Channel').slice(0, 80),
      service: String(c.service || 'unknown').slice(0, 40),
    }));
  }
  return json(res, 200, { post: store.update('posts', post.id, patch) });
});

router.del('/api/posts/:id', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const post = store.get('posts', ctx.params.id);
  if (!post || post.userId !== ctx.user.id) return fail(res, 404, 'Post not found.');
  store.remove('posts', post.id);
  return json(res, 200, { ok: true });
});

router.post('/api/posts/:id/send', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const post = store.get('posts', ctx.params.id);
  if (!post || post.userId !== ctx.user.id) return fail(res, 404, 'Post not found.');
  const account = store.where('bufferAccounts', (b) => b.userId === ctx.user.id)[0];
  if (!account) {
    return fail(res, 400, 'Buffer is not connected.', { needsBuffer: true, hint: 'Connect Buffer on the Buffer screen first.' });
  }
  const token = decryptSecret(account.encryptedToken);
  if (!token) return fail(res, 500, 'The stored Buffer token could not be decrypted. Reconnect Buffer.');
  if (!post.channels.length) return fail(res, 400, 'Choose at least one Buffer channel for this post.');

  const clip = store.get('clips', post.clipIds[0]);
  if (!clip) return fail(res, 404, 'The clip for this post no longer exists.');

  const host = `${req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http'}://${req.headers.host}`;
  const mediaUrl = `${host}/api/public/clips/${clip.id}/${signClipToken(clip.id, 6 * 3600)}`;
  const text = [post.caption, (post.hashtags || []).join(' ')].filter(Boolean).join('\n\n');

  store.update('posts', post.id, { status: 'uploading', error: null, mediaUrl });
  try {
    const result = await createUpdate(token, {
      channelIds: post.channels.map((c) => c.id).filter(Boolean),
      text,
      mediaUrl,
      scheduledAt: post.scheduledAt ? Math.floor(new Date(post.scheduledAt).getTime() / 1000) : null,
    });
    if (!result.updates.length) {
      throw new BufferError(400, result.raw || 'Buffer did not accept this update.');
    }
    const anyScheduled = result.updates.some((u) => u.scheduledAt);
    const updated = store.update('posts', post.id, {
      status: anyScheduled ? 'scheduled' : 'queued',
      bufferUpdates: result.updates,
      sentAt: new Date().toISOString(),
      error: null,
    });
    return json(res, 200, { post: updated, updates: result.updates, status: updated.status });
  } catch (error) {
    const detail = error instanceof BufferError ? error.detail || error.message : error.message;
    store.update('posts', post.id, { status: 'failed', error: detail });
    return fail(res, 400, detail, { hint: error?.hint || 'Buffer rejected the update. Check the channel and media URL.' });
  }
});

/* --- analytics --- */

router.get('/api/analytics', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const clips = store.where('clips', (c) => c.userId === ctx.user.id);
  const posts = store.where('posts', (p) => p.userId === ctx.user.id);
  const byDay = {};
  for (const clip of clips) {
    const day = String(clip.createdAt).slice(0, 10);
    byDay[day] = byDay[day] || { date: day, clips: 0, score: 0 };
    byDay[day].clips += 1;
    byDay[day].score += clip.score || 0;
  }
  return json(res, 200, {
    stats: stats(ctx.user.id),
    byDay: Object.values(byDay)
      .map((d) => ({ ...d, avgScore: Math.round(d.score / Math.max(1, d.clips)) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
    topClips: clips.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 5).map(clipView),
    byStatus: POST_STATUSES.map((status) => ({ status, count: posts.filter((p) => p.status === status).length })),
  });
});

/* --- account data --- */

router.post('/api/account/export', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const userId = ctx.user.id;
  const payload = {
    exportedAt: new Date().toISOString(),
    user: userView(ctx.user),
    videos: store.where('videos', (v) => v.userId === userId).map(videoView),
    clips: store.where('clips', (c) => c.userId === userId).map(clipView),
    posts: store.where('posts', (p) => p.userId === userId),
    providers: PROVIDERS.map((p) => providerView(providerRecord(userId, p))),
  };
  res.writeHead(200, {
    'content-type': 'application/json',
    'content-disposition': 'attachment; filename="openclips-export.json"',
  });
  res.end(JSON.stringify(payload, null, 2));
});

router.post('/api/account/purge', async (req, res, ctx) => {
  if (!requireUser(ctx, res)) return;
  const userId = ctx.user.id;
  const videos = store.where('videos', (v) => v.userId === userId);
  const clips = store.where('clips', (c) => c.userId === userId);
  for (const clip of clips) {
    await unlink(clip.path).catch(() => {});
    await unlink(clip.thumbPath).catch(() => {});
    await unlink(clip.srtPath).catch(() => {});
  }
  for (const video of videos) {
    await unlink(video.path).catch(() => {});
    await unlink(video.thumbPath).catch(() => {});
    if (video.audioPath) await unlink(video.audioPath).catch(() => {});
  }
  store.removeWhere('clips', (c) => c.userId === userId);
  store.removeWhere('videos', (v) => v.userId === userId);
  store.removeWhere('jobs', (j) => j.userId === userId);
  store.removeWhere('posts', (p) => p.userId === userId);
  return json(res, 200, { ok: true, removed: { videos: videos.length, clips: clips.length } });
});
