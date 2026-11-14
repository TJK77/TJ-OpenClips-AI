/**
 * Link inspection tests. No network: every outbound call is stubbed, so these
 * assert our parsing, error mapping and honesty rules rather than YouTube's
 * current behaviour.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVideoUrl,
  isBlockedHost,
  fetchYouTubeMetadata,
  inspectVideoUrl,
} from '../server/youtube.mjs';

test('parses every common YouTube URL shape', () => {
  const cases = [
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'video'],
    ['https://youtu.be/dQw4w9WgXcQ?t=30', 'dQw4w9WgXcQ', 'video'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'short'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'live'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123', 'dQw4w9WgXcQ', 'video'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'video'],
  ];
  for (const [url, id, kind] of cases) {
    const parsed = parseVideoUrl(url);
    assert.equal(parsed.ok, true, `${url} should parse`);
    assert.equal(parsed.platform, 'youtube', url);
    assert.equal(parsed.videoId, id, url);
    assert.equal(parsed.kind, kind, url);
    assert.equal(parsed.url, `https://www.youtube.com/watch?v=${id}`);
  }
});

test('rejects malformed input and internal hosts', () => {
  assert.equal(parseVideoUrl('').ok, false);
  assert.equal(parseVideoUrl('not a url').ok, false);
  assert.equal(parseVideoUrl('ftp://youtube.com/watch?v=dQw4w9WgXcQ').ok, false);
  assert.equal(parseVideoUrl('https://www.youtube.com/watch?v=short').ok, false);
  assert.equal(parseVideoUrl('http://127.0.0.1/video.mp4').ok, false);
  assert.equal(parseVideoUrl('http://192.168.1.5/a.mp4').ok, false);
  assert.equal(isBlockedHost('169.254.169.254'), true);
  assert.equal(isBlockedHost('example.com'), false);
});

test('plain media URLs are treated as direct sources', () => {
  const parsed = parseVideoUrl('https://cdn.example.com/clip.mp4');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.platform, 'direct');
  assert.equal(parsed.url, 'https://cdn.example.com/clip.mp4');
});

test('oEmbed failures map to honest messages', async () => {
  const restricted = await fetchYouTubeMetadata('dQw4w9WgXcQ', {
    fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  assert.equal(restricted.ok, false);
  assert.match(restricted.error, /private|age-restricted/i);

  const missing = await fetchYouTubeMetadata('dQw4w9WgXcQ', {
    fetchImpl: async () => ({ ok: false, status: 404 }),
  });
  assert.equal(missing.ok, false);
  assert.match(missing.error, /could not find/i);
});

test('YouTube inspection returns real metadata but never claims media is accessible', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => ({
      title: 'Real Title',
      author_name: 'Real Channel',
      thumbnail_url: 'https://i.ytimg.com/vi/x/hq.jpg',
    }),
  });
  const result = await inspectVideoUrl('https://youtu.be/dQw4w9WgXcQ', { fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.title, 'Real Title');
  assert.equal(result.channel, 'Real Channel');
  assert.equal(result.mediaAccessible, false);
  assert.equal(result.method, 'oembed-metadata');
  assert.ok(result.workflows.some((w) => w.id === 'upload' && w.available));
  assert.match(result.message, /bot verification/i);
});

test('a private YouTube video reports failure instead of fake success', async () => {
  const fetchImpl = async () => ({ ok: false, status: 403 });
  const result = await inspectVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', { fetchImpl });
  assert.equal(result.ok, false);
  assert.equal(result.mediaAccessible, false);
  assert.match(result.error, /private|age-restricted/i);
});

test('direct inspection reports real media bytes as accessible', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: new Map([
      ['content-type', 'video/mp4'],
      ['content-length', '1024'],
    ]),
  });
  const result = await inspectVideoUrl('https://cdn.example.com/clip.mp4', { fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.mediaAccessible, true);
  assert.equal(result.method, 'direct-media');
  assert.equal(result.sizeBytes, 1024);
});

test('an HTML page is not accepted as a downloadable video', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'text/html']]),
  });
  const result = await inspectVideoUrl('https://example.com/watch', { fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.mediaAccessible, false);
  assert.match(result.message, /not a video file/i);
});
