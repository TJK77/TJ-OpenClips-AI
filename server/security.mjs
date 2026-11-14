import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { config } from './config.mjs';

/**
 * OWASP recommends scrypt N=2^17, r=8, p=1 for password storage. scrypt needs
 * roughly 128*N*r bytes, so N=2^17 needs ~134 MB and Node's 32 MB default
 * maxmem would reject it — maxmem is derived from N instead of hardcoded.
 * The work factor is embedded in every stored hash, so hashes written with the
 * old N=2^14 still verify and are upgraded on the next successful sign-in.
 */
export const PASSWORD_HASH_PARAMS = { N: 131072, r: 8, p: 1 };
const KEY_LEN = 32;

const scryptMaxmem = (n) => Math.max(64 * 1024 * 1024, Math.ceil(128 * n * PASSWORD_HASH_PARAMS.r * 1.5));

function parseHash(stored) {
  const [scheme, n, saltHex, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return null;
  const N = Number(n);
  if (!Number.isInteger(N) || N < 2 || N > 2 ** 22) return null;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return null;
  return { N, saltHex, hashHex };
}

export function hashPassword(password) {
  const salt = randomBytes(16);
  const { N, r, p } = PASSWORD_HASH_PARAMS;
  const hash = scryptSync(String(password), salt, KEY_LEN, { N, r, p, maxmem: scryptMaxmem(N) });
  return `scrypt$${N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/** True when a stored hash uses a weaker work factor (or an unknown format). */
export function needsRehash(stored) {
  const parsed = parseHash(stored);
  if (!parsed) return true;
  return parsed.N < PASSWORD_HASH_PARAMS.N;
}

export function verifyPassword(password, stored) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  try {
    const salt = Buffer.from(parsed.saltHex, 'hex');
    const expected = Buffer.from(parsed.hashHex, 'hex');
    const actual = scryptSync(String(password), salt, expected.length, {
      N: parsed.N,
      r: PASSWORD_HASH_PARAMS.r,
      p: PASSWORD_HASH_PARAMS.p,
      maxmem: scryptMaxmem(parsed.N),
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Null when CREDENTIAL_ENCRYPTION_KEY is unavailable — never a fallback key. */
const vaultKey = () =>
  config.credentialKey ? createHash('sha256').update(`vault:${config.credentialKey}`).digest() : null;

/** AES-256-GCM. Format: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plain) {
  const key = vaultKey();
  if (!key) {
    throw Object.assign(
      new Error(
        'CREDENTIAL_ENCRYPTION_KEY is not configured on the server, so credentials cannot be stored. Set it in the environment and restart.'
      ),
      { status: 503, expose: true }
    );
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

/** Returns null when the key is missing or the payload cannot be authenticated. */
export function decryptSecret(payload) {
  const key = vaultKey();
  if (!key) return null;
  const [version, ivB64, tagB64, dataB64] = String(payload || '').split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

export const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

export function maskKey(key) {
  const value = String(key || '');
  if (!value) return '';
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 4)}••••••••••••${value.slice(-4)}`;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordProblem(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 200) return 'Password is too long.';
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}
