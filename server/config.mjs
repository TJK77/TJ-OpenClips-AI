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

const SECRETS_FILE = join(DATA_DIR, '.secrets.json');
const MIN_SECRET_LENGTH = 16;
const CREDENTIAL_KEY = 'CREDENTIAL_ENCRYPTION_KEY';
const SESSION_SECRET = 'SESSION_SECRET';

/**
 * Secrets come from the environment when provided; that is the only durable
 * source across redeploys on ephemeral hosting. When the environment does not
 * provide them they are generated once and persisted in the data directory so
 * encrypted provider keys stay readable across restarts.
 *
 * Resolution is lazy and explicit: server.mjs calls initSecrets() after the
 * store is loaded, so the loader knows whether encrypted credentials already
 * exist. If they do and no key can be found, a new key is NOT generated —
 * generating one would permanently orphan the stored credentials. Instead the
 * credential key resolves to null, encrypt/decrypt fail safely, and a warning
 * is logged without any secret value.
 */
const secretState = {
  session: null,
  credentials: null,
  dependents: 0,
  warnings: [],
  logged: false,
};

function readSecretFile() {
  if (!existsSync(SECRETS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(SECRETS_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function writeSecretFile(doc) {
  try {
    writeFileSync(SECRETS_FILE, JSON.stringify(doc, null, 2), { mode: 0o600 });
    return true;
  } catch (error) {
    console.error('[config] could not persist server secret:', error.message);
    return false;
  }
}

function resolveSecret(name, { hasDependentData }) {
  const fromEnv = typeof process.env[name] === 'string' ? process.env[name].trim() : '';
  if (fromEnv) {
    if (fromEnv.length >= MIN_SECRET_LENGTH) return { value: fromEnv, source: 'env' };
    secretState.warnings.push(
      `${name} is set but shorter than ${MIN_SECRET_LENGTH} characters, so it is ignored.`
    );
  }
  const doc = readSecretFile();
  const stored = doc[name];
  if (typeof stored === 'string' && stored.length >= MIN_SECRET_LENGTH) {
    return { value: stored, source: 'generated' };
  }
  if (hasDependentData) {
    secretState.warnings.push(
      `${name} is missing but encrypted credentials already depend on it. No new key was generated; set ${name} in the environment to restore them.`
    );
    return { value: null, source: 'missing' };
  }
  const generated = randomBytes(32).toString('hex');
  doc[name] = generated;
  writeSecretFile(doc);
  return { value: generated, source: 'generated' };
}

function ensure(name) {
  const slot = name === SESSION_SECRET ? 'session' : 'credentials';
  if (!secretState[slot]) {
    secretState[slot] = resolveSecret(name, {
      // Only the credential key is destructive to regenerate: losing it makes
      // every stored provider/Buffer secret undecryptable. A new session secret
      // merely invalidates previously signed clip links.
      hasDependentData: name === CREDENTIAL_KEY && secretState.dependents > 0,
    });
  }
  return secretState[slot];
}

/** Called once at boot, after the store is loaded. Safe to call repeatedly. */
export function initSecrets({ encryptedCredentials = 0 } = {}) {
  secretState.dependents = Math.max(0, Number(encryptedCredentials) || 0);
  ensure(SESSION_SECRET);
  ensure(CREDENTIAL_KEY);
  if (!secretState.logged) {
    secretState.logged = true;
    for (const warning of secretState.warnings) console.warn('[config]', warning);
    if (secretState.credentials.source === 'missing') {
      console.warn('[config] credential storage is disabled until CREDENTIAL_ENCRYPTION_KEY is restored.');
    }
  }
  return secretStatus();
}

export function secretStatus() {
  const session = ensure(SESSION_SECRET);
  const credentials = ensure(CREDENTIAL_KEY);
  return {
    session: session.source,
    credentials: credentials.source,
    credentialsAvailable: Boolean(credentials.value),
    warnings: secretState.warnings.slice(),
  };
}

export const config = {
  port: Number(process.env.PORT || 3000),
  dataDir: DATA_DIR,
  get sessionSecret() {
    return ensure(SESSION_SECRET).value;
  },
  get credentialKey() {
    return ensure(CREDENTIAL_KEY).value;
  },
  get secretsSource() {
    return { session: ensure(SESSION_SECRET).source, credentials: ensure(CREDENTIAL_KEY).source };
  },
  maxUploadBytes: Math.max(16, Number(process.env.MAX_UPLOAD_MB || 512)) * 1024 * 1024,
  maxConcurrentJobs: Math.max(1, Number(process.env.MAX_CONCURRENT_JOBS || 1)),
  clipLimitPerJob: Math.max(1, Number(process.env.MAX_CLIPS_PER_JOB || 6)),
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobe: process.env.FFPROBE_PATH || 'ffprobe',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: process.env.GOOGLE_AUTHORIZE_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    userInfoUrl: process.env.GOOGLE_USERINFO_URL || 'https://www.googleapis.com/oauth2/v3/userinfo',
    redirectPath: '/api/auth/google/callback',
  },
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

export const googleConfigured = () =>
  Boolean(config.google.clientId && config.google.clientSecret);

/** Public view of configuration for the UI — never includes secret values. */
export function publicConfig() {
  const secrets = secretStatus();
  return {
    maxUploadMb: Math.round(config.maxUploadBytes / (1024 * 1024)),
    bufferConfigured: bufferConfigured(),
    googleConfigured: googleConfigured(),
    maxClipsPerJob: config.clipLimitPerJob,
    secrets: {
      session: secrets.session,
      credentials: secrets.credentials,
      credentialsAvailable: secrets.credentialsAvailable,
    },
    processing: {
      ffmpeg: config.ffmpeg,
      ephemeralStorage: true,
    },
  };
}
