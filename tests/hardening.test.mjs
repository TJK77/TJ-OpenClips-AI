import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  hashPassword,
  verifyPassword,
  needsRehash,
  PASSWORD_HASH_PARAMS,
} from '../server/security.mjs';

/**
 * Regression coverage for the five approved hardening changes:
 *   1. CSP / X-Frame-Options / nosniff / Referrer-Policy on every response
 *   2. scrypt N=2^17, legacy hashes still verify, transparent rehash on login
 *   3. rate limiting shared across server processes
 *   4. SESSION_SECRET / CREDENTIAL_ENCRYPTION_KEY from env, never regenerated,
 *      failing safe and never exposed
 *   5. /api/providers/openrouter/free-models authenticated and rate limited
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 3993;
const BASE = `http://127.0.0.1:${PORT}`;
const LEGACY_PASSWORD = 'LegacyPass1';
const CURRENT_PREFIX = `scrypt$${PASSWORD_HASH_PARAMS.N}$`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Never inherit real secrets or a real database from the host environment.
const baseEnv = { ...process.env };
for (const key of ['SESSION_SECRET', 'CREDENTIAL_ENCRYPTION_KEY', 'DATABASE_URL']) delete baseEnv[key];

let dataDir;
let server;
let cookie = '';

function legacyHash(password, N = 16384) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function runNode(script, { env = {}, dir } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], {
      cwd: ROOT,
      env: { ...baseEnv, DATA_DIR: dir, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const lastJson = (stdout) => JSON.parse(stdout.trim().split('\n').filter(Boolean).pop());

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...(options.headers || {}), ...(cookie ? { cookie } : {}) },
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((part) => part.split(';')[0]).join('; ');
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers, text };
}

before(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'hardening-'));
  await writeFile(
    join(dataDir, 'db.json'),
    JSON.stringify({
      users: [
        {
          id: 'usr_legacy',
          name: 'Legacy User',
          email: 'legacy@example.com',
          initials: 'LU',
          createdAt: new Date().toISOString(),
          timezone: 'UTC',
          passwordHash: legacyHash(LEGACY_PASSWORD),
        },
      ],
    })
  );
  server = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: { ...baseEnv, DATA_DIR: dataDir, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', (chunk) => {
    output += chunk;
  });
  server.stderr.on('data', (chunk) => {
    output += chunk;
  });
  for (let i = 0; i < 120; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/config`);
      if (res.ok) return;
    } catch {
      /* not listening yet */
    }
    await sleep(150);
  }
  throw new Error(`server failed to start: ${output}`);
});

after(async () => {
  server?.kill('SIGKILL');
  await rm(dataDir, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ 1. headers */

test('1. security headers are set on pages and API responses', async () => {
  const page = await fetch(`${BASE}/`);
  assert.equal(page.status, 200);
  const csp = page.headers.get('content-security-policy');
  assert.ok(csp, 'Content-Security-Policy header is present');
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "img-src 'self' data: blob: https:",
    'https://fonts.googleapis.com',
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ]) {
    assert.ok(csp.includes(directive), `CSP includes ${directive}`);
  }
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(page.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(page.headers.get('permissions-policy') || '', /camera=\(\)/);

  const config = await api('/api/config');
  assert.equal(config.status, 200);
  assert.equal(config.headers.get('x-frame-options'), 'DENY');
  assert.equal(config.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(config.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.ok(config.headers.get('content-security-policy').includes("frame-ancestors 'none'"));

  // The public config must report secret *sources*, never secret values.
  const secretsFile = JSON.parse(await readFile(join(dataDir, '.secrets.json'), 'utf8'));
  assert.ok(Object.keys(secretsFile).length > 0);
  for (const value of Object.values(secretsFile)) {
    assert.ok(!config.text.includes(value), 'secret value leaked into /api/config');
  }
  assert.equal(config.body.secrets.credentialsAvailable, true);
});

/* ------------------------------------------------------------ 2. password hash */

test('2. passwords use scrypt N=2^17 and legacy N=2^14 hashes still verify', () => {
  const fresh = hashPassword('CurrentPass1');
  assert.ok(fresh.startsWith(CURRENT_PREFIX), `new hash uses N=${PASSWORD_HASH_PARAMS.N}`);
  assert.equal(verifyPassword('CurrentPass1', fresh), true);
  assert.equal(verifyPassword('WrongPass1', fresh), false);
  assert.equal(needsRehash(fresh), false);

  const legacy = legacyHash('LegacyPass1');
  assert.ok(legacy.startsWith('scrypt$16384$'));
  assert.equal(verifyPassword('LegacyPass1', legacy), true, 'old hashes still authenticate');
  assert.equal(verifyPassword('WrongPass1', legacy), false);
  assert.equal(needsRehash(legacy), true, 'old hashes are flagged for upgrade');

  assert.equal(verifyPassword('x', 'not-a-hash'), false);
  assert.equal(needsRehash('not-a-hash'), true);
});

test('3. a successful sign-in upgrades a legacy hash in place', async () => {
  const wrong = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'legacy@example.com', password: 'NotThePassword1' }),
  });
  assert.equal(wrong.status, 401);

  const login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'legacy@example.com', password: LEGACY_PASSWORD }),
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, 'legacy@example.com');

  let stored = '';
  for (let i = 0; i < 80; i += 1) {
    const doc = JSON.parse(await readFile(join(dataDir, 'db.json'), 'utf8'));
    stored = (doc.users || []).find((u) => u.email === 'legacy@example.com')?.passwordHash || '';
    if (stored.startsWith(CURRENT_PREFIX)) break;
    await sleep(100);
  }
  assert.ok(stored.startsWith(CURRENT_PREFIX), 'stored hash was upgraded after sign-in');
  assert.equal(verifyPassword(LEGACY_PASSWORD, stored), true, 'upgraded hash accepts the same password');
});

/* -------------------------------------------------------------- 3. rate limits */

test('4. existing sign-in limit is still enforced (12 per window)', async () => {
  const attempt = () =>
    api('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@example.com', password: 'WrongPass1' }),
    });
  for (let i = 0; i < 12; i += 1) {
    const res = await attempt();
    assert.equal(res.status, 401, `attempt ${i + 1} reaches the credential check`);
  }
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
});

test('5. rate limiting is shared between server processes sharing a data directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'limit-'));
  try {
    const script = [
      "import { rateLimit } from './server/ratelimit.mjs';",
      'let allowed = 0;',
      "for (let i = 0; i < 8; i += 1) { if (await rateLimit('xproc:shared', 10, 60000)) allowed += 1; }",
      'console.log(JSON.stringify({ allowed }));',
    ].join('\n');
    const [a, b] = await Promise.all([
      runNode(script, { dir }),
      runNode(script, { dir }),
    ]);
    assert.equal(a.code, 0, a.stderr);
    assert.equal(b.code, 0, b.stderr);
    const total = lastJson(a.stdout).allowed + lastJson(b.stdout).allowed;
    assert.equal(total, 10, 'two processes together may not exceed the single-process quota');

    // The shared window is persisted, so a third process sees it immediately.
    const c = await runNode(script, { dir });
    assert.equal(lastJson(c.stdout).allowed, 0, 'a fresh process inherits the exhausted window');
    const stored = JSON.parse(await readFile(join(dir, 'rate-limits.json'), 'utf8'));
    assert.equal(stored['xproc:shared'].length, 10);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------- 5. free models */

test('6. OpenRouter free-model lookup requires a session and is rate limited', async () => {
  cookie = '';
  const anonymous = await fetch(`${BASE}/api/providers/openrouter/free-models`);
  assert.equal(anonymous.status, 401, 'unauthenticated proxy access is refused');

  const login = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'legacy@example.com', password: LEGACY_PASSWORD }),
  });
  assert.equal(login.status, 200);

  const statuses = [];
  for (let i = 0; i < 21; i += 1) {
    const res = await api('/api/providers/openrouter/free-models');
    statuses.push(res.status);
  }
  // 200 when the upstream answers, 502 when it cannot be reached — both prove the
  // request passed authentication and the limiter; 429 proves the cap.
  assert.ok(
    statuses.slice(0, 20).every((status) => status === 200 || status === 502),
    `first 20 calls reach upstream: ${statuses.join(',')}`
  );
  assert.equal(statuses[20], 429, 'the 21st call is refused');
});

/* ----------------------------------------------------------------- 4. secrets */

const ENCRYPT_SCRIPT = [
  "import { config, publicConfig } from './server/config.mjs';",
  "import { encryptSecret } from './server/security.mjs';",
  "const payload = encryptSecret('sk-test-plaintext-value');",
  'console.log(JSON.stringify({ key: config.credentialKey, secrets: publicConfig().secrets, payload, configJson: JSON.stringify(publicConfig()) }));',
].join('\n');

const PROBE_SCRIPT = [
  "import { config, publicConfig, initSecrets } from './server/config.mjs';",
  "import { decryptSecret, encryptSecret } from './server/security.mjs';",
  'initSecrets({ encryptedCredentials: 1 });',
  'let encryptError = null;',
  "try { encryptSecret('probe'); } catch (error) { encryptError = error.message; }",
  'console.log(JSON.stringify({ key: config.credentialKey, secrets: publicConfig().secrets, decrypted: decryptSecret(process.env.PAYLOAD), encryptError }));',
].join('\n');

test('7. environment secrets win over the stored file and are never published', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'secrets-env-'));
  try {
    const fileKey = randomBytes(32).toString('hex');
    await writeFile(
      join(dir, '.secrets.json'),
      JSON.stringify({ SESSION_SECRET: randomBytes(32).toString('hex'), CREDENTIAL_ENCRYPTION_KEY: fileKey })
    );
    const envKey = randomBytes(32).toString('hex');
    const envSession = randomBytes(32).toString('hex');
    const run = await runNode(ENCRYPT_SCRIPT, {
      dir,
      env: { CREDENTIAL_ENCRYPTION_KEY: envKey, SESSION_SECRET: envSession },
    });
    assert.equal(run.code, 0, run.stderr);
    const result = lastJson(run.stdout);
    assert.equal(result.key, envKey, 'the environment value is used, not the file value');
    assert.equal(result.secrets.credentials, 'env');
    assert.equal(result.secrets.session, 'env');
    assert.equal(result.secrets.credentialsAvailable, true);
    assert.ok(result.payload.startsWith('v1.'), 'credentials encrypt with AES-256-GCM');
    assert.ok(!result.configJson.includes(envKey), 'public config never contains the key');
    assert.ok(!result.configJson.includes(envSession), 'public config never contains the session secret');
    const stored = JSON.parse(await readFile(join(dir, '.secrets.json'), 'utf8'));
    assert.equal(stored.CREDENTIAL_ENCRYPTION_KEY, fileKey, 'the stored file is left untouched');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('8. an existing credential key is reused, never regenerated', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'secrets-keep-'));
  try {
    const key = randomBytes(32).toString('hex');
    const session = randomBytes(32).toString('hex');
    await writeFile(
      join(dir, '.secrets.json'),
      JSON.stringify({ SESSION_SECRET: session, CREDENTIAL_ENCRYPTION_KEY: key })
    );
    const seeded = await runNode(ENCRYPT_SCRIPT, {
      dir,
      env: { CREDENTIAL_ENCRYPTION_KEY: key, SESSION_SECRET: session },
    });
    assert.equal(seeded.code, 0, seeded.stderr);
    const { payload } = lastJson(seeded.stdout);

    // Restart without any environment: the key must come from the stored file.
    const run = await runNode(PROBE_SCRIPT, { dir, env: { PAYLOAD: payload } });
    assert.equal(run.code, 0, run.stderr);
    const result = lastJson(run.stdout);
    assert.equal(result.key, key, 'the stored key is reused across restarts');
    assert.equal(result.secrets.credentials, 'generated');
    assert.equal(result.decrypted, 'sk-test-plaintext-value', 'stored credentials still decrypt');
    assert.equal(result.encryptError, null);
    const stored = JSON.parse(await readFile(join(dir, '.secrets.json'), 'utf8'));
    assert.equal(stored.CREDENTIAL_ENCRYPTION_KEY, key);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('9. a missing credential key fails safe instead of orphaning stored credentials', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'secrets-missing-'));
  try {
    const key = randomBytes(32).toString('hex');
    const seeded = await runNode(ENCRYPT_SCRIPT, {
      dir,
      env: { CREDENTIAL_ENCRYPTION_KEY: key, SESSION_SECRET: randomBytes(32).toString('hex') },
    });
    assert.equal(seeded.code, 0, seeded.stderr);
    const { payload } = lastJson(seeded.stdout);
    // Lose the key exactly like a redeploy onto ephemeral storage would.
    await rm(join(dir, '.secrets.json'), { force: true });

    const run = await runNode(PROBE_SCRIPT, { dir, env: { PAYLOAD: payload } });
    assert.equal(run.code, 0, run.stderr);
    const result = lastJson(run.stdout);
    assert.equal(result.key, null, 'no replacement key is invented');
    assert.equal(result.secrets.credentials, 'missing');
    assert.equal(result.secrets.credentialsAvailable, false);
    assert.equal(result.decrypted, null, 'undecryptable credentials are reported, not faked');
    assert.match(result.encryptError || '', /CREDENTIAL_ENCRYPTION_KEY/, 'storing reports the real cause');

    let doc = {};
    try {
      doc = JSON.parse(await readFile(join(dir, '.secrets.json'), 'utf8'));
    } catch {
      doc = {};
    }
    assert.equal(
      doc.CREDENTIAL_ENCRYPTION_KEY,
      undefined,
      'no credential key was written, so the old one could still be restored'
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
