import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');

export const dirs = {
  data: DATA_DIR,
  uploads: join(DATA_DIR, 'uploads'),
  audio: join(DATA_DIR, 'audio'),
  clips: join(DATA_DIR, 'clips'),
  thumbs: join(DATA_DIR, 'thumbs'),
  subs: join(DATA_DIR, 'subs'),
};

for (const dir of Object.values(dirs)) mkdirSync(dir, { recursive: true });

/**
 * Secrets come from the environment when provided. When they are absent we
 * generate them once and persist them in the data directory so encrypted
 * provider keys stay readable across restarts. Nothing is ever sent to a client.
 */
function serverSecret(name) {
  const fromEnv = process.env[name];
  if (fromEnv && fromEnv.length >= 16) return { value: fromEnv, source: 'env' };
  const file = join(DATA_DIR, '.secrets.json');
  let doc = {};
  if (existsSync(file)) {
    try {
      doc = JSON.parse(readFileSync(file, 'utf8')) || {};
    } catch {
      doc = {};
    }
  }
  if (typeof doc[name] !== 'string' || doc[name].length < 16) {
    doc[name] = randomBytes(32).toString('hex');
    try {
      writeFileSync(file, JSON.stringify(doc, null, 2), { mode: 0o600 });
    } catch (error) {
      console.error('[config] could not persist server secret:', error.message);
    }
  }
  return { value: doc[name], source: 'generated' };
}

const session = serverSecret('SESSION_SECRET');
const credentials = serverSecret('CREDENTIAL_ENCRYPTION_KEY');

export const config = {
  port: Number(process.env.PORT || 3000),
  dataDir: DATA_DIR,
  sessionSecret: session.value,
  credentialKey: credentials.value,
  secretsSource: { session: session.source, credentials: credentials.source },
  maxUploadBytes: Math.max(16, Number(process.env.MAX_UPLOAD_MB || 512)) * 1024 * 1024,
  maxConcurrentJobs: Math.max(1, Number(process.env.MAX_CONCURRENT_JOBS || 1)),
  clipLimitPerJob: Math.max(1, Number(process.env.MAX_CLIPS_PER_JOB || 6)),
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
  buffer: {
    clientId: process.env.BUFFER_CLIENT_ID || '',
    clientSecret: process.env.BUFFER_CLIENT_SECRET || '',
    authorizeUrl: process.env.BUFFER_AUTHORIZE_URL || 'https://buffer.com/oauth2/authorize',
    tokenUrl: process.env.BUFFER_TOKEN_URL || 'https://api.bufferapp.com/1/oauth2/token.json',
    apiBase: (process.env.BUFFER_API_BASE || 'https://api.bufferapp.com/1').replace(/\/$/, ''),
    redirectPath: '/api/buffer/callback',
  },
};

export const bufferConfigured = () =>
  Boolean(config.buffer.clientId && config.buffer.clientSecret);

/** Public view of configuration for the UI — never includes secret values. */
export function publicConfig() {
  return {
    maxUploadMb: Math.round(config.maxUploadBytes / (1024 * 1024)),
    bufferConfigured: bufferConfigured(),
    maxClipsPerJob: config.clipLimitPerJob,
    secrets: {
      session: config.secretsSource.session,
      credentials: config.secretsSource.credentials,
    },
    processing: {
      ffmpeg: config.ffmpeg,
      ephemeralStorage: true,
    },
  };
}
