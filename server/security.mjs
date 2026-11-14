import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { config } from './config.mjs';

const SCRYPT_N = 16384;
const KEY_LEN = 32;

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, KEY_LEN, { N: SCRYPT_N, r: 8, p: 1 });
  return `scrypt$${SCRYPT_N}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, n, saltHex, hashHex] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = scryptSync(String(password), salt, expected.length, {
      N: Number(n) || SCRYPT_N,
      r: 8,
      p: 1,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const vaultKey = () => createHash('sha256').update(`vault:${config.credentialKey}`).digest();

/** AES-256-GCM. Format: v1.<iv>.<tag>.<ciphertext> (base64url). */
export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', vaultKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptSecret(payload) {
  const [version, ivB64, tagB64, dataB64] = String(payload || '').split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(ivB64, 'base64url'));
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

const buckets = new Map();

/** Fixed-window limiter. Returns false when the caller should be rejected. */
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
    }
  }
  return true;
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
