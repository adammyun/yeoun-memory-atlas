const SCRIPT_ID = 'yeoun-naver-panorama-sdk';
const CALLBACK_NAME = '__yeounNaverPanoramaReady';
const LOAD_TIMEOUT_MS = 15_000;

export type NaverPanoramaLoadErrorCode =
  | 'missing-client-id'
  | 'script-failed'
  | 'module-unavailable';

export class NaverPanoramaLoadError extends Error {
  readonly code: NaverPanoramaLoadErrorCode;

  constructor(code: NaverPanoramaLoadErrorCode) {
    super(code);
    this.name = 'NaverPanoramaLoadError';
    this.code = code;
  }
}

export type NaverEventListener = object;

export interface NaverPanoramaInstance {
  getPanoId(): string;
  setSize(size: NaverSize): void;
  setVisible(visible: boolean): void;
}

export type NaverLatLng = object;
export type NaverSize = object;

export interface NaverMapsApi {
  LatLng: new (latitude: number, longitude: number) => NaverLatLng;
  Size: new (width: number, height: number) => NaverSize;
  Panorama: new (
    container: HTMLElement,
    options: {
      position: NaverLatLng;
      size: NaverSize;
      aroundControl: boolean;
      aroundControlOptions: { position: unknown };
      zoomControl: boolean;
    },
  ) => NaverPanoramaInstance;
  Position: { TOP_RIGHT: unknown };
  Event: {
    addListener(
      target: object,
      eventName: string,
      listener: (...args: unknown[]) => void,
    ): NaverEventListener;
    removeListener(listener: NaverEventListener): void;
    clearInstanceListeners(target: object): void;
  };
}

declare global {
  interface Window {
    naver?: { maps?: NaverMapsApi };
    __yeounNaverPanoramaReady?: () => void;
  }
}

let loaderPromise: Promise<NaverMapsApi> | null = null;

function loadedMaps() {
  const maps = window.naver?.maps;
  return maps?.Panorama ? maps : null;
}

export function loadNaverMapsPanorama(clientId: string | undefined) {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new NaverPanoramaLoadError('module-unavailable'),
    );
  }

  const existing = loadedMaps();
  if (existing) return Promise.resolve(existing);
  if (!clientId?.trim()) {
    return Promise.reject(new NaverPanoramaLoadError('missing-client-id'));
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<NaverMapsApi>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      const maps = loadedMaps();
      if (!maps) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(maps);
    };
    const fail = (code: NaverPanoramaLoadErrorCode) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      document.getElementById(SCRIPT_ID)?.remove();
      reject(new NaverPanoramaLoadError(code));
    };
    const timeout = window.setTimeout(
      () => fail('module-unavailable'),
      LOAD_TIMEOUT_MS,
    );

    window[CALLBACK_NAME] = finish;
    const current = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (current) {
      current.addEventListener('load', finish, { once: true });
      current.addEventListener('error', () => fail('script-failed'), {
        once: true,
      });
      finish();
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src =
      'https://oapi.map.naver.com/openapi/v3/maps.js?' +
      new URLSearchParams({
        ncpKeyId: clientId.trim(),
        submodules: 'panorama',
        callback: CALLBACK_NAME,
      });
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => fail('script-failed'), {
      once: true,
    });
    document.head.appendChild(script);
  }).catch((reason) => {
    loaderPromise = null;
    throw reason;
  });

  return loaderPromise;
}
