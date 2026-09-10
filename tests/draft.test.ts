import { test } from 'node:test';
import assert from 'node:assert/strict';
// Validation is isolated from Supabase to test errors before any network write.
import { validateDraft } from '../lib/validation.ts';
const draft = {
  title: '  기억  ',
  content: '  이야기  ',
  location_name: '서울숲',
  memory_date: '2026-09-10',
  emotion: 'calm' as const,
  visibility: 'private' as const,
  is_anonymous: true,
  location_precision: 'approximate' as const,
  lng: 127.04321,
  lat: 37.54321,
};
void test('trims text without changing privacy defaults or exact owner coordinates', () => {
  const result = validateDraft(draft);
  assert.equal(result.title, '기억');
  assert.equal(result.content, '이야기');
  assert.equal(result.visibility, 'private');
  assert.equal(result.is_anonymous, true);
  assert.equal(result.lng, draft.lng);
});
void test('rejects malformed dates, including rollover dates', () => {
  for (const date of ['2026-02-30', 'not-a-date', '2026-13-01'])
    assert.throws(() => validateDraft({ ...draft, memory_date: date }));
});
void test('rejects non-finite and out-of-range coordinates before saving', () => {
  for (const lng of [NaN, Infinity, 181, -181])
    assert.throws(() => validateDraft({ ...draft, lng }));
  for (const lat of [NaN, Infinity, 86, -86])
    assert.throws(() => validateDraft({ ...draft, lat }));
});
void test('rejects whitespace-only and oversized content', () => {
  assert.throws(() => validateDraft({ ...draft, title: '   ' }));
  assert.throws(() => validateDraft({ ...draft, content: 'x'.repeat(10001) }));
  assert.throws(() => validateDraft({ ...draft, location_name: '' }));
});
void test('does not accept unlisted or forged privacy options in this slice', () => {
  assert.throws(() => validateDraft({ ...draft, visibility: 'unlisted' }));
  assert.throws(() =>
    validateDraft({ ...draft, is_anonymous: 'false' as never }),
  );
  assert.throws(() =>
    validateDraft({ ...draft, location_precision: 'hidden' as never }),
  );
  assert.throws(() =>
    validateDraft({ ...draft, emotion: '__proto__' as never }),
  );
});
