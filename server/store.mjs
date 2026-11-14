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
  save();
  return record;
}

export function update(collection, id, patch) {
  const record = get(collection, id);
  if (!record) return null;
  Object.assign(record, patch, { updatedAt: new Date().toISOString() });
  save();
  return record;
}

export function remove(collection, id) {
  const index = all(collection).findIndex((row) => row.id === id);
  if (index < 0) return false;
  db[collection].splice(index, 1);
  save();
  return true;
}

export function removeWhere(collection, predicate) {
  const before = all(collection).length;
  db[collection] = all(collection).filter((row) => !predicate(row));
  const removed = before - db[collection].length;
  if (removed) save();
  return removed;
}

export const newId = (prefix) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
