const PAGES_RUNTIME_ATTRIBUTE = 'pages';
const AUTH_STORAGE_KEY = 'yeoun.pages.auth.v1';

export const AUTH_CHANGED_EVENT = 'yeoun:auth-changed';

export function isPagesRuntime() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.dataset.yeounRuntime === PAGES_RUNTIME_ATTRIBUTE
  );
}

export function isPagesAuthenticated() {
  if (!isPagesRuntime()) return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'signed-in';
}

export function setPagesAuthenticated(value: boolean) {
  if (!isPagesRuntime()) return;
  if (value) window.localStorage.setItem(AUTH_STORAGE_KEY, 'signed-in');
  else window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

