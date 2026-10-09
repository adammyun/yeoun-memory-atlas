function navigate(path: string, replace = false) {
  const hash = path.startsWith('/') ? `#${path}` : path;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

export function useRouter() {
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, true),
    refresh: () => window.dispatchEvent(new HashChangeEvent('hashchange')),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    prefetch: async () => undefined,
  };
}

