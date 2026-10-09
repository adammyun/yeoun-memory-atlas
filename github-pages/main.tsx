import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, LogIn, MapPinned } from 'lucide-react';
import MemoryApp from '@/components/memory-app';
import MyMemoryMap from '@/components/my-memory-map';
import DevTools from '@/components/dev/dev-tools';
import {
  DEFAULT_MEMORY_FILTERS,
  parseMemoryFilters,
  parseUserMemoryFilters,
} from '@/src/features/memories/filters';
import {
  AUTH_CHANGED_EVENT,
  isPagesAuthenticated,
  setPagesAuthenticated,
} from '@/src/lib/runtime';
import '@/app/globals.css';

document.documentElement.dataset.yeounRuntime = 'pages';

function routeState() {
  const raw = window.location.hash.slice(1) || '/';
  const url = new URL(raw, 'https://pages.local');
  return { path: url.pathname, search: url.searchParams };
}

function parameters(search: URLSearchParams) {
  return Object.fromEntries(search.entries());
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="#/">
          <span className="brand-mark">◌</span><b>여운</b>
        </a>
        <p className="eyebrow">BROWSER DEMO SESSION</p>
        <h1>이 브라우저에 기억을 이어서 기록하세요</h1>
        <p>
          GitHub Pages 버전은 계정 정보를 전송하지 않습니다. 기억과 사진은 이
          브라우저의 IndexedDB에만 저장됩니다.
        </p>
        <button className="auth-submit" type="button" onClick={onLogin}>
          <LogIn size={18} /> 로컬 시연 세션 시작
        </button>
        <a className="auth-back" href="#/">
          <ArrowLeft size={16} /> 지도로 돌아가기
        </a>
      </section>
    </main>
  );
}

function UnsupportedRoute() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <MapPinned size={30} />
        <h1>이 화면을 찾지 못했어요</h1>
        <p>지도에서 울산의 기억을 다시 둘러볼 수 있습니다.</p>
        <a className="auth-submit" href="#/">지도로 돌아가기</a>
      </section>
    </main>
  );
}

function PagesApp() {
  const [route, setRoute] = useState(routeState);
  const [authenticated, setAuthenticated] = useState(isPagesAuthenticated);

  useEffect(() => {
    const updateRoute = () => setRoute(routeState());
    const updateAuth = () => setAuthenticated(isPagesAuthenticated());
    const interceptInternalLinks = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="/"]');
      if (!anchor || anchor.target === '_blank') return;
      event.preventDefault();
      window.location.hash = anchor.getAttribute('href') ?? '/';
    };
    window.addEventListener('hashchange', updateRoute);
    window.addEventListener('storage', updateAuth);
    window.addEventListener(AUTH_CHANGED_EVENT, updateAuth);
    document.addEventListener('click', interceptInternalLinks);
    return () => {
      window.removeEventListener('hashchange', updateRoute);
      window.removeEventListener('storage', updateAuth);
      window.removeEventListener(AUTH_CHANGED_EVENT, updateAuth);
      document.removeEventListener('click', interceptInternalLinks);
    };
  }, []);

  const clientId = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID ?? '';

  if (route.path === '/login' || route.path === '/signup') {
    return (
      <LoginPage
        onLogin={() => {
          setPagesAuthenticated(true);
          window.location.hash = '/';
        }}
      />
    );
  }

  if (route.path === '/my-map') {
    if (!authenticated) {
      return (
        <LoginPage
          onLogin={() => {
            setPagesAuthenticated(true);
            window.location.hash = '/my-map';
          }}
        />
      );
    }
    return (
      <MyMemoryMap
        displayName="나"
        initialFilters={parseUserMemoryFilters(parameters(route.search))}
        naverMapsClientId={clientId}
      />
    );
  }

  if (route.path === '/dev') {
    return (
      <DevTools
        databaseConfigured
        panoramaConfigured={Boolean(clientId.trim())}
      />
    );
  }

  if (route.path !== '/') return <UnsupportedRoute />;

  return (
    <MemoryApp
      isAuthenticated={authenticated}
      initialFilters={
        route.search.size
          ? parseMemoryFilters(parameters(route.search))
          : DEFAULT_MEMORY_FILTERS
      }
      naverMapsClientId={clientId}
    />
  );
}

createRoot(document.getElementById('root')!).render(<PagesApp />);

