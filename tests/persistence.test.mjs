import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Durability is the one property a single-process test cannot prove. Every other
 * suite writes and reads inside the same process, where the in-memory store
 * answers immediately and disk is never consulted. These tests spawn separate
 * Node processes that share nothing but DATA_DIR, so a passing assertion means
 * the bytes genuinely survived a restart — the exact behaviour production
 * depends on when no DATABASE_URL is configured.
 *
 * They also pin down the two failure modes that would otherwise lose data
 * silently: a half-written database file and an unreachable Postgres instance.
 */

const ROOT = process.cwd();
const CHILD_TIMEOUT_MS = 20000;

function runStore(code, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`store child timed out after ${CHILD_TIMEOUT_MS}ms`));
    }, CHILD_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      err += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code2) => {
      clearTimeout(timer);
      if (code2 !== 0) {
        reject(new Error(`store child exited ${code2}: ${err.slice(-800)}`));
        return;
      }
      const line = out.trim().split('\n').filter(Boolean).pop() || '';
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error(`unparseable store output: ${out.slice(-400)} ${err.slice(-400)}`));
      }
    });
  });
}

const freshDir = () => mkdtemp(join(tmpdir(), 'openclips-durable-'));

test('a record written by one process is readable by the next', async () => {
  const dir = await freshDir();
  try {
    const written = await runStore(
      `import { insert, saveNow } from './server/store.mjs';
       const record = insert('users', { email: 'restart@example.com', name: 'Restart Survivor' });
       saveNow();
       console.log(JSON.stringify({ id: record.id }));`,
      { DATA_DIR: dir }
    );
    assert.match(written.id, /^use_/, 'store assigned a real id');

    const reopened = await runStore(
      `import { all } from './server/store.mjs';
       console.log(JSON.stringify({ users: all('users') }));`,
      { DATA_DIR: dir }
    );
    assert.equal(reopened.users.length, 1, 'the user written by the previous process survived');
    assert.equal(reopened.users[0].id, written.id);
    assert.equal(reopened.users[0].email, 'restart@example.com');
    assert.equal(reopened.users[0].name, 'Restart Survivor');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('updates and deletions persist across a restart', async () => {
  const dir = await freshDir();
  try {
    await runStore(
      `import { insert, update, removeWhere, saveNow } from './server/store.mjs';
       const keep = insert('videos', { title: 'Keep me' });
       insert('videos', { title: 'Delete me' });
       update('videos', keep.id, { title: 'Kept and renamed' });
       const removed = removeWhere('videos', (row) => row.title === 'Delete me');
       saveNow();
       console.log(JSON.stringify({ removed }));`,
      { DATA_DIR: dir }
    );

    const reopened = await runStore(
      `import { all } from './server/store.mjs';
       console.log(JSON.stringify({ videos: all('videos') }));`,
      { DATA_DIR: dir }
    );
    assert.equal(reopened.videos.length, 1, 'the deleted row stays deleted after restart');
    assert.equal(reopened.videos[0].title, 'Kept and renamed');
    assert.ok(reopened.videos[0].updatedAt, 'the update timestamp was persisted too');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a completed write leaves no partial temp file behind', async () => {
  const dir = await freshDir();
  try {
    await runStore(
      `import { insert, saveNow } from './server/store.mjs';
       insert('clips', { title: 'Atomic' });
       saveNow();
       console.log(JSON.stringify({ ok: true }));`,
      { DATA_DIR: dir }
    );

    const parsed = JSON.parse(await readFile(join(dir, 'db.json'), 'utf8'));
    assert.equal(parsed.clips.length, 1, 'the database file is complete, parseable JSON');
    await assert.rejects(
      stat(join(dir, 'db.json.tmp')),
      'no partial temp file survives a completed write'
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('a corrupt database file degrades to an empty store instead of crashing', async () => {
  const dir = await freshDir();
  try {
    await writeFile(join(dir, 'db.json'), '{"users": [ this is not json');
    const result = await runStore(
      `import { all, insert, saveNow } from './server/store.mjs';
       const before = all('users').length;
       insert('users', { email: 'recovered@example.com' });
       saveNow();
       console.log(JSON.stringify({ before }));`,
      { DATA_DIR: dir }
    );
    assert.equal(result.before, 0, 'unreadable data is reported as empty rather than half-parsed');

    const reopened = await runStore(
      `import { all } from './server/store.mjs';
       console.log(JSON.stringify({ emails: all('users').map((row) => row.email) }));`,
      { DATA_DIR: dir }
    );
    assert.deepEqual(reopened.emails, ['recovered@example.com'], 'the store is writable again after corruption');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('an unreachable DATABASE_URL falls back to the file store instead of throwing', async () => {
  const dir = await freshDir();
  try {
    const result = await runStore(
      `import { initPersistence, storeMode, insert, saveNow, all } from './server/store.mjs';
       const init = await initPersistence();
       insert('posts', { title: 'Fallback works' });
       saveNow();
       console.log(JSON.stringify({ init, mode: storeMode(), posts: all('posts').length }));`,
      { DATA_DIR: dir, DATABASE_URL: 'postgres://user:pass@127.0.0.1:1/none' }
    );
    assert.equal(result.init.mode, 'file', 'the reported mode matches what is actually in use');
    assert.equal(result.mode, 'file');
    assert.equal(typeof result.init.error, 'string');
    assert.ok(result.init.error.length > 0, 'the real driver error is surfaced, not swallowed');
    assert.equal(result.posts, 1, 'the application keeps working while Postgres is unavailable');

    const reopened = await runStore(
      `import { all } from './server/store.mjs';
       console.log(JSON.stringify({ posts: all('posts').length }));`,
      { DATA_DIR: dir }
    );
    assert.equal(reopened.posts, 1, 'and that fallback data is durable as well');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
