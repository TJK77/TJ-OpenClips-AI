import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dirs } from './config.mjs';

/**
 * A single JSON document holds every collection. Writes are debounced and
 * atomic (tmp file + rename) so a crash cannot leave a half-written database.
 * Large binaries never live here — video files stay on disk and only metadata
 * plus paths are stored.
 */
const FILE = join(dirs.data, 'db.json');

/**
 * Optional Postgres mirror (Supabase / Neon free tier). The in-memory store stays
 * the synchronous source of truth so every existing call site keeps working, and
 * each write is mirrored row-by-row into one jsonb table. Without DATABASE_URL the
 * store behaves exactly as before (single JSON file).
 */
const DATABASE_URL = (process.env.DATABASE_URL || '').trim();
const TABLE = 'app_documents';

let pool = null;
let mode = 'file';
let chain = Promise.resolve();

export const storeMode = () => mode;

export const COLLECTIONS = [
  'users',
  'sessions',
  'credentials',
  'videos',
  'jobs',
  'clips',
  'posts',
  'bufferAccounts',
  'captions',
];

const blank = () => Object.fromEntries(COLLECTIONS.map((name) => [name, []]));

function load() {
  try {
    if (!existsSync(FILE)) return blank();
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    const base = blank();
    for (const name of COLLECTIONS) {
      if (Array.isArray(parsed?.[name])) base[name] = parsed[name];
    }
    return base;
  } catch (error) {
    console.error('[store] could not read database, starting empty:', error.message);
    return blank();
  }
}

let db = load();
let timer = null;

function queue(task) {
  if (!pool) return;
  chain = chain.then(task).catch((error) => {
    console.error('[store] postgres write failed:', error.message);
  });
}

const UPSERT = `insert into ${TABLE} (collection, id, data) values ($1, $2, $3::jsonb)
  on conflict (collection, id) do update set data = excluded.data, updated_at = now()`;

const persistRow = (collection, record) =>
  queue(() => pool.query(UPSERT, [collection, record.id, JSON.stringify(record)]));

const persistDelete = (collection, id) =>
  queue(() => pool.query(`delete from ${TABLE} where collection = $1 and id = $2`, [collection, id]));

/** Connect to Postgres when DATABASE_URL is set and restore persisted documents. */
export async function initPersistence() {
  if (!DATABASE_URL) {
    mode = 'file';
    return { mode };
  }
  try {
    const pg = await import('pg');
    const Pool = pg.default?.Pool || pg.Pool;
    const needsSsl = /supabase|neon|sslmode=require/i.test(DATABASE_URL);
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 4,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
    await pool.query(`create table if not exists ${TABLE} (
      collection text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (collection, id)
    )`);
    const { rows } = await pool.query(`select collection, id, data from ${TABLE}`);
    mode = 'postgres';
    if (rows.length) {
      const fresh = blank();
      for (const row of rows) {
        if (fresh[row.collection]) fresh[row.collection].push(row.data);
      }
      db = fresh;
    } else {
      for (const name of COLLECTIONS) {
        for (const record of db[name] || []) persistRow(name, record);
      }
      await chain;
    }
    console.log(`[store] postgres ready — ${rows.length} documents restored`);
    return { mode, documents: rows.length };
  } catch (error) {
    console.error('[store] postgres unavailable, staying on the file store:', error.message);
    pool = null;
    mode = 'file';
    return { mode, error: error.message };
  }
}

export function saveNow() {
  const tmp = `${FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(db));
  renameSync(tmp, FILE);
}

export function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    try {
      saveNow();
    } catch (error) {
      console.error('[store] write failed:', error.message);
    }
  }, 20);
  if (typeof timer.unref === 'function') timer.unref();
}

export const all = (collection) => db[collection] || [];
export const get = (collection, id) => all(collection).find((row) => row.id === id) || null;
export const where = (collection, predicate) => all(collection).filter(predicate);
export const count = (collection, predicate) =>
  predicate ? all(collection).filter(predicate).length : all(collection).length;

export function insert(collection, row) {
  const record = {
    id: `${collection.slice(0, 3)}_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    createdAt: new Date().toISOString(),
    ...row,
  };
  db[collection].push(record);
  persistRow(collection, record);
  save();
  return record;
}

export function update(collection, id, patch) {
  const record = get(collection, id);
  if (!record) return null;
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  persistRow(collection, record);
  save();
  return record;
}

export function remove(collection, id) {
  const index = all(collection).findIndex((row) => row.id === id);
  if (index < 0) return false;
  const [record] = db[collection].splice(index, 1);
  persistDelete(collection, id);
  save();
  return record ? true : false;
}

export function removeWhere(collection, predicate) {
  const before = all(collection).length;
  const doomed = all(collection).filter(predicate);
  db[collection] = all(collection).filter((row) => !predicate(row));
  const removed = before - db[collection].length;
  for (const record of doomed) persistDelete(collection, record.id);
  if (removed) save();
  return removed;
}

export const newId = (prefix) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
