import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadNaverMapsPanorama,
  NaverPanoramaLoadError,
} from '../src/features/panorama/naver-maps.ts';
import { memoryPanoramaTarget } from '../src/features/panorama/target.ts';

function installBrowserFixture(onAppend) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  let currentScript = null;

  globalThis.window = {
    setTimeout,
    clearTimeout,
  };
  globalThis.document = {
    createElement() {
      const listeners = new Map();
      return {
        id: '',
        src: '',
        async: false,
        defer: false,
        addEventListener(name, listener) {
          listeners.set(name, listener);
        },
        emit(name) {
          listeners.get(name)?.();
        },
        remove() {
          currentScript = null;
        },
      };
    },
    getElementById() {
      return currentScript;
    },
    head: {
      appendChild(script) {
        currentScript = script;
        onAppend(script, globalThis.window);
      },
    },
  };

  return () => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  };
}

test('rejects a missing Web SDK Client ID before adding a script', async () => {
  let appendCount = 0;
  const restore = installBrowserFixture(() => appendCount++);
  try {
    await assert.rejects(
      loadNaverMapsPanorama(''),
      (error) =>
        error instanceof NaverPanoramaLoadError &&
        error.code === 'missing-client-id',
    );
    assert.equal(appendCount, 0);
  } finally {
    restore();
  }
});

test('reports an SDK script failure and allows a later retry', async () => {
  let appendCount = 0;
  const restore = installBrowserFixture((script) => {
    appendCount++;
    queueMicrotask(() => script.emit('error'));
  });
  try {
    await assert.rejects(
      loadNaverMapsPanorama('public-client-id'),
      (error) =>
        error instanceof NaverPanoramaLoadError &&
        error.code === 'script-failed',
    );
    await assert.rejects(loadNaverMapsPanorama('public-client-id'));
    assert.equal(appendCount, 2);
  } finally {
    restore();
  }
});

test('shares one SDK request and loads only the panorama submodule', async () => {
  let appendCount = 0;
  let scriptUrl = '';
  const restore = installBrowserFixture((script, browserWindow) => {
    appendCount++;
    scriptUrl = script.src;
    queueMicrotask(() => {
      browserWindow.naver = { maps: { Panorama: class Panorama {} } };
      script.emit('load');
    });
  });
  try {
    const first = loadNaverMapsPanorama('public-client-id');
    const second = loadNaverMapsPanorama('public-client-id');
    assert.strictEqual(first, second);
    const maps = await first;
    assert.equal(typeof maps.Panorama, 'function');
    assert.equal(appendCount, 1);

    const parsed = new URL(scriptUrl);
    assert.equal(parsed.searchParams.get('ncpKeyId'), 'public-client-id');
    assert.equal(parsed.searchParams.get('submodules'), 'panorama');
  } finally {
    restore();
  }
});

test('uses only coordinates already present in the authorized memory DTO', () => {
  const target = memoryPanoramaTarget({
    lat: 35.55,
    lng: 129.29,
    location_name: '태화강 국가정원',
    raw_latitude: 35.5532,
    raw_longitude: 129.2924,
  });

  assert.deepEqual(target, {
    placeName: '태화강 국가정원',
    point: { lat: 35.55, lng: 129.29 },
  });
  assert.equal('raw_latitude' in target.point, false);
});
