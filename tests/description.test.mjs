/**
 * Phase 13 description generator: the local fallback must be useful without
 * inventing anything. Every keyword and hashtag has to come from the real
 * transcript, and the result must never be labelled as AI-generated.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { localDescription } from '../server/providers.mjs';

const TRANSCRIPT =
  'Most creators never publish their first video because they edit too early. ' +
  'Batch filming three episodes in one afternoon removes that friction. ' +
  'Start with a simple checklist and post the episode even when it feels unfinished.';

test('local fallback labels itself as extractive, not AI', () => {
  const result = localDescription({ text: TRANSCRIPT, platform: 'tiktok' });
  assert.equal(result.aiGenerated, false);
  assert.equal(result.source, 'local-extractive');
});

test('every hashtag and keyword exists in the transcript', () => {
  const result = localDescription({ text: TRANSCRIPT, platform: 'reels' });
  const haystack = TRANSCRIPT.toLowerCase();
  assert.ok(result.keywords.length > 0, 'expected keywords');
  assert.ok(result.hashtags.length > 0, 'expected hashtags');
  for (const keyword of result.keywords) {
    assert.ok(haystack.includes(keyword), `invented keyword: ${keyword}`);
  }
  for (const tag of result.hashtags) {
    assert.ok(haystack.includes(tag.slice(1)), `invented hashtag: ${tag}`);
  }
});

test('hashtags are lowercase, unique and usable', () => {
  const result = localDescription({ text: TRANSCRIPT });
  for (const tag of result.hashtags) {
    assert.match(tag, /^#[a-z0-9]+$/);
  }
  assert.equal(new Set(result.hashtags).size, result.hashtags.length);
});

test('title and description stay within platform limits', () => {
  const long = `${TRANSCRIPT} ${TRANSCRIPT} ${TRANSCRIPT}`;
  const result = localDescription({ text: long });
  assert.ok(result.title.length > 0 && result.title.length <= 71, 'title length');
  assert.ok(result.description.length <= 380, 'description length');
  assert.ok(result.hook.length <= 140, 'hook length');
});

test('platform changes the call to action without changing the content', () => {
  const tiktok = localDescription({ text: TRANSCRIPT, platform: 'tiktok' });
  const linkedin = localDescription({ text: TRANSCRIPT, platform: 'linkedin' });
  assert.notEqual(tiktok.cta, linkedin.cta);
  assert.deepEqual(tiktok.keywords, linkedin.keywords);
});

test('empty input does not crash or fabricate', () => {
  const result = localDescription({ text: '' });
  assert.equal(result.title, '');
  assert.deepEqual(result.hashtags, []);
});
