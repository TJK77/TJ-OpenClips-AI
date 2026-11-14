import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { dirs } from './config.mjs';
import { dbPool } from './store.mjs';

/**
 * Fixed-window rate limiter shared across server processes.
 *
 * - PostgreSQL mode (DATABASE_URL set): counters live in app_rate_limits and are
 *   updated inside a row-locked transaction, so every process sees the same window.
 * - File mode: counters live in one JSON file updated under a lock file, so two
 *   processes sharing DATA_DIR cannot each allow the full quota.
 * - If the shared store is unavailable the in-process map still enforces the limit
 *   for that process, which is exactly the pre-hardening behaviour — never weaker.
 *
 * Limits and windows are unchanged from the previous implementation.
 */
const FILE = join(dirs.data, 'rate-limits.json');
const LOCK = join(dirs.data, 'rate-limits.lock');
const TABLE = 'app_rate_limits';
const MAX_KEYS = 5000;
const LOCK_WAIT_MS = 2000;

const memory = new Map();
let tableReady = false;
let lastFailureLog = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function noteFailure(scope, error) {
  const now = Date.now();
  if (now - lastFailureLog < 60_000) return;
  lastFailureLog = now;
  console.warn(`[ratelimit] ${scope} store unavailable, using in-process fallback:`, error?.message);
}

/** Per-process fallback: identical semantics to the original in-memory limiter. */
function localCheck(key, limit, windowMs, now) {
  const hits = (memory.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    memory.set(key, hits);
    return false;
  }
  hits.push(now);
  memory.set(key, hits);
  if (memory.size > MAX_KEYS) {
    for (const [k, v] of memory) {
      if (!v.length || now - v[v.length - 1] > windowMs) memory.delete(k);
    }
  }
  return true;
}

async function withLock(work) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  let fd = null;
  while (Date.now() < deadline) {
    try {
      fd = openSync(LOCK, 'wx');
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(LOCK).mtimeMs > 10_000) {
          unlinkSync(LOCK);
          continue;
        }
      } catch {
        /* lock vanished between stat and unlink — retry */
      }
      await sleep(4);
    }
  }
  try {
    // A lock that could not be acquired within the deadline is treated as
    // best-effort rather than locking users out of the application.
    return await work();
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd);
      } catch {
        /* already closed */
      }
      try {
        unlinkSync(LOCK);
      } catch {
        /* already removed */
      }
    }
  }
}

function fileCheck(key, limit, windowMs, now) {
  return withLock(() => {
    let doc = {};
    if (existsSync(FILE)) {
      try {
        doc = JSON.parse(readFileSync(FILE, 'utf8')) || {};
      } catch {
        doc = {};
      }
    }
    const hits = (Array.isArray(doc[key]) ? doc[key] : []).filter(
      (t) => typeof t === 'number' && now - t < windowMs
    );
    const allowed = hits.length < limit;
    if (allowed) hits.push(now);
    doc[key] = hits;
    const keys = Object.keys(doc);
    if (keys.length > MAX_KEYS) {
      for (const k of keys) {
        const v = doc[k];
        if (!Array.isArray(v) || !v.length || now - v[v.length - 1] > windowMs) delete doc[k];
      }
    }
    const tmp = `${FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(doc), { mode: 0o600 });
    renameSync(tmp, FILE);
    return allowed;
  });
}

async function postgresCheck(pool, key, limit, windowMs, now) {
  if (!tableReady) {
    await pool.query(
      `create table if not exists ${TABLE} (
        key text primary key,
        hits jsonb not null default '[]'::jsonb,
        updated_at timestamptz not null default now()
      )`
    );
    tableReady = true;
  }
  const client = await pool.connect();
  try {
    await client.query('begin');
    // Create the row first so the following SELECT ... FOR UPDATE always locks it.
    await client.query(
      `insert into ${TABLE} (key, hits) values ($1, '[]'::jsonb) on conflict (key) do nothing`,
      [key]
    );
    const { rows } = await client.query(`select hits from ${TABLE} where key = $1 for update`, [key]);
    const cutoff = now - windowMs;
    const hits = (Array.isArray(rows[0]?.hits) ? rows[0].hits : []).filter((t) => Number(t) > cutoff);
    const allowed = hits.length < limit;
    if (allowed) hits.push(now);
    await client.query(
      `update ${TABLE} set hits = $2::jsonb, updated_at = now() where key = $1`,
      [key, JSON.stringify(hits)]
    );
    if (Math.random() < 0.02) {
      await client.query(`delete from ${TABLE} where updated_at < now() - interval '1 day'`).catch(() => {});
    }
    await client.query('commit');
    return allowed;
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      /* connection already gone */
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Returns false when the caller should be rejected. */
export async function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const pool = dbPool();
  if (pool) {
    try {
      return await postgresCheck(pool, key, limit, windowMs, now);
    } catch (error) {
      noteFailure('postgres', error);
    }
  }
  try {
    return await fileCheck(key, limit, windowMs, now);
  } catch (error) {
    noteFailure('file', error);
    return localCheck(key, limit, windowMs, now);
  }
}

/** Test/diagnostic helper — never exposes counters for other processes. */
export const rateLimitBackend = () => (dbPool() ? 'postgres' : 'file');
