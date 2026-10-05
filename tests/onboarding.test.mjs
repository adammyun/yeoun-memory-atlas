import assert from 'node:assert/strict';
import test from 'node:test';

import {
  completeOnboarding,
  isOnboardingCompleted,
  resetOnboarding,
  shouldStartOnboarding,
} from '../src/features/onboarding/storage.ts';
import {
  DEVELOPER_GESTURE_CLICKS,
  recordDeveloperClick,
} from '../src/features/onboarding/developer-gesture.ts';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, value);
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

test('an incomplete first visit starts the tutorial', () => {
  const storage = new MemoryStorage();
  assert.equal(isOnboardingCompleted(storage), false);
  assert.equal(shouldStartOnboarding(storage), true);
});

test('skip or finish records completion and prevents the next automatic run', () => {
  const storage = new MemoryStorage();
  completeOnboarding(storage);
  assert.equal(isOnboardingCompleted(storage), true);
  assert.equal(shouldStartOnboarding(storage), false);
});

test('reset reopens the tutorial and a forced URL ignores completion', () => {
  const storage = new MemoryStorage();
  completeOnboarding(storage);
  assert.equal(shouldStartOnboarding(storage, true), true);
  resetOnboarding(storage);
  assert.equal(shouldStartOnboarding(storage), true);
});

test('a single developer hotspot click has no effect', () => {
  const result = recordDeveloperClick([], 1_000);
  assert.equal(result.activated, false);
  assert.deepEqual(result.clicks, [1_000]);
});

test('five hotspot clicks inside two seconds activate the developer route', () => {
  let clicks = [];
  let activated = false;
  for (let index = 0; index < DEVELOPER_GESTURE_CLICKS; index++) {
    const result = recordDeveloperClick(clicks, 1_000 + index * 300);
    clicks = result.clicks;
    activated = result.activated;
  }
  assert.equal(activated, true);
  assert.deepEqual(clicks, []);
});

test('older hotspot clicks expire before activation', () => {
  let clicks = [];
  for (const timestamp of [0, 600, 1_200, 1_800, 2_400]) {
    const result = recordDeveloperClick(clicks, timestamp);
    clicks = result.clicks;
    assert.equal(result.activated, false);
  }
});
