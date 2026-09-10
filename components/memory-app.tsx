'use client';
import Link from 'next/link';
import { flushSync } from 'react-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MapPin,
  Compass,
  BookOpen,
  Plus,
  Minus,
  Search,
  LocateFixed,
  ArrowUpRight,
  ArrowRight,
  Leaf,
  LockKeyhole,
  Globe2,
  LogOut,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import MemoryMap, { type MapHandle } from './memories/map';
import AuthDialog from './memories/auth-dialog';
import MemoryForm from './memories/memory-form';
import MemoryDetail from './memories/memory-detail';
import { demoMemories } from '@/lib/demo';
import { getSupabase } from '@/lib/supabase';
import { fetchMemories, fetchMemory } from '@/lib/memories';
import {
  emotions,
  formatDate,
  type Bounds,
  type Emotion,
  type Memory,
  type Point,
} from '@/lib/types';

const EMPTY_MEMORIES: Memory[] = [];
type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};
export default function MemoryApp() {
  const mapRef = useRef<MapHandle | null>(null);
  const db = getSupabase();
  const preview = !db;
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<'explore' | 'mine'>('explore');
  const [authOpen, setAuthOpen] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [rows, setRows] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [limited, setLimited] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [emotion, setEmotion] = useState<Emotion | 'all'>('all');
  const [visibility, setVisibility] = useState('all');
  const [year, setYear] = useState('all');
  const [selected, setSelected] = useState<Memory | null>(null);
  const [point, setPoint] = useState<Point | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [area, setArea] = useState('서울, 성수동');
  const [expanded, setExpanded] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  const identity = useRef<string | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const lastSearch = useRef(0);
  useEffect(() => {
    if (!db) return;
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (identity.current !== id) {
        identity.current = id;
        detailRequest.current?.abort();
        setSelected(null);
        setRows([]);
        setUserId(id);
        setRevision((x) => x + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, [db]);
  // oxlint-disable react/react-compiler -- Clear protected query results synchronously when the session or query scope changes.
  useEffect(() => {
    if (preview || !bounds || (mode === 'mine' && !userId)) {
      setRows([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const requestedIdentity = userId;
    setLoading(true);
    setLoadError(false);
    setRows([]);
    setLimited(false);
    const timer = setTimeout(() => {
      fetchMemories(bounds, mode === 'mine', controller.signal)
        .then((r) => {
          if (
            !controller.signal.aborted &&
            identity.current === requestedIdentity
          ) {
            setRows(r.memories);
            setLimited(r.limited);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setLoadError(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [bounds, mode, userId, revision, preview]);
  // oxlint-enable react/react-compiler
  useEffect(
    () => () => {
      detailRequest.current?.abort();
      searchRequest.current?.abort();
    },
    [],
  );
  const source = preview
    ? mode === 'explore'
      ? demoMemories
      : EMPTY_MEMORIES
    : rows;
  const memories = useMemo(
    () =>
      source.filter(
        (m) =>
          (!preview ||
            !bounds ||
            (m.lng >= bounds.west &&
              m.lng <= bounds.east &&
              m.lat >= bounds.south &&
              m.lat <= bounds.north)) &&
          (emotion === 'all' || m.emotion === emotion) &&
          (mode !== 'mine' ||
            ((visibility === 'all' || m.visibility === visibility) &&
              (year === 'all' || m.memory_date.startsWith(year)))),
      ),
    [source, bounds, emotion, mode, visibility, year, preview],
  );
  const changeMode = (v: string) => {
    detailRequest.current?.abort();
    setOpening(null);
    setSelected(null);
    setMode(v as 'explore' | 'mine');
    setRows([]);
    setEmotion('all');
    setVisibility('all');
    setYear('all');
  };
  const openMemory = useCallback(
    async (m: Memory) => {
      detailRequest.current?.abort();
      if (preview) {
        setSelected(m);
        return;
      }
      const controller = new AbortController();
      detailRequest.current = controller;
      setOpening(m.id);
      try {
        const full = await fetchMemory(
          m.id,
          mode === 'mine',
          controller.signal,
        );
        if (!controller.signal.aborted) setSelected(full);
      } catch {
        if (!controller.signal.aborted)
          toast.error(
            '이 기억을 읽을 수 없어요. 공개 설정이 변경되었을 수 있습니다.',
          );
      } finally {
        if (!controller.signal.aborted) setOpening(null);
      }
    },
    [preview, mode],
  );
  const startCreate = useCallback((p: Point) => {
    setPoint(p);
  }, []);
  async function locate() {
    if (!navigator.geolocation) {
      toast.error('이 브라우저에서는 현재 위치를 사용할 수 없어요.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        mapRef.current?.flyTo({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        });
        setArea('내 주변');
      },
      () =>
        toast.error(
          '현재 위치를 찾지 못했어요. 브라우저의 위치 권한을 확인해 주세요.',
        ),
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  async function searchPlace(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!search.trim() || searching || Date.now() - lastSearch.current < 1100)
      return;
    lastSearch.current = Date.now();
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=ko&q=${encodeURIComponent(search.trim())}`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!controller.signal.aborted) setResults(data);
    } catch {
      if (!controller.signal.aborted)
        toast.error('장소를 찾지 못했어요. 잠시 후 다시 검색해 주세요.');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }
  async function signOut() {
    if (!db) return;
    detailRequest.current?.abort();
    setSelected(null);
    setRows([]);
    const { error } = await db.auth.signOut();
    if (error) toast.error('로그아웃하지 못했어요. 다시 시도해 주세요.');
    else {
      setUserId(null);
      setMode('explore');
      toast('로그아웃했어요.');
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: object,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: 'start_memory_creation',
          title: '기억 기록 시작',
          description:
            '선택한 좌표의 기록 폼을 엽니다. 저장하거나 공개하지 않습니다.',
          inputSchema: {
            type: 'object',
            properties: {
              lng: { type: 'number', minimum: -180, maximum: 180 },
              lat: { type: 'number', minimum: -85, maximum: 85 },
            },
            required: ['lng', 'lat'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false },
          execute: (input: unknown) => {
            const p = input as Point;
            if (
              !p ||
              typeof p.lng !== 'number' ||
              typeof p.lat !== 'number' ||
              !Number.isFinite(p.lng) ||
              !Number.isFinite(p.lat) ||
              Math.abs(p.lng) > 180 ||
              Math.abs(p.lat) > 85
            )
              throw new Error('Invalid coordinates');
            flushSync(() => startCreate(p));
            return { status: 'form_opened', saved: false };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [startCreate]);
  return (
    <main className="atlas">
      <Toaster position="top-center" richColors />
      <header className="topbar">
        <Link className="brand" href="/" aria-label="여운 홈">
          <span className="brand-mark">◌</span>
          <b>여운</b>
          <span className="brand-caption">기억이 머무는 지도</span>
        </Link>
        <Tabs
          value={mode}
          onValueChange={(v) => changeMode(String(v))}
          className="main-tabs"
        >
          <TabsList aria-label="지도 보기" className="main-tabs-list">
            <TabsTrigger value="explore">
              <Compass size={18} />
              둘러보기
            </TabsTrigger>
            <TabsTrigger value="mine">
              <BookOpen size={18} />
              나의 기억
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {userId ? (
          <button className="login" onClick={signOut}>
            로그아웃
            <LogOut size={16} />
          </button>
        ) : (
          <button className="login" onClick={() => setAuthOpen(true)}>
            로그인
            <ArrowUpRight size={16} />
          </button>
        )}
      </header>
      <MemoryMap
        memories={memories}
        mapRef={mapRef}
        onBounds={setBounds}
        onSelect={openMemory}
        onCreate={startCreate}
      />
      <aside
        className={`discovery ${expanded ? 'expanded' : ''}`}
        aria-label={mode === 'mine' ? '나의 기억 목록' : '주변 기억 목록'}
      >
        <button
          className="mobile-sheet-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? '기억 목록 접기' : '기억 목록 펼치기'}
          aria-expanded={expanded}
        >
          <span />
        </button>
        <form className="search-box" onSubmit={searchPlace}>
          <Search size={19} />
          <input
            aria-label="장소 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="어떤 장소가 떠오르나요?"
          />
          <button aria-label="검색" disabled={searching || !search.trim()}>
            {searching ? (
              <LoaderCircle size={18} className="spin" />
            ) : (
              <ArrowRight size={18} />
            )}
          </button>
        </form>
        {results !== null && (
          <div className="search-results">
            <div className="search-results-title">
              검색 결과
              <button
                onClick={() => setResults(null)}
                aria-label="검색 결과 닫기"
              >
                <X size={17} />
              </button>
            </div>
            {results.length ? (
              results.map((r) => (
                <button
                  key={r.place_id}
                  onClick={() => {
                    mapRef.current?.flyTo({
                      lng: Number(r.lon),
                      lat: Number(r.lat),
                    });
                    setArea(r.display_name.split(',')[0]);
                    setResults(null);
                    setExpanded(false);
                  }}
                >
                  <MapPin size={16} />
                  {r.display_name}
                </button>
              ))
            ) : (
              <p>검색 결과가 없어요. 다른 장소 이름으로 검색해 주세요.</p>
            )}
            <small>© OpenStreetMap contributors</small>
          </div>
        )}
        <div className="editorial">
          <span className="eyebrow">
            {mode === 'mine' ? 'YOUR PERSONAL ATLAS' : 'A PLACE, MANY STORIES'}
          </span>
          <h1>
            {mode === 'mine' ? (
              <>
                나의 순간들이
                <br />
                머무는 곳.
              </>
            ) : (
              <>
                같은 장소,
                <br />
                서로 다른 이야기.
              </>
            )}
          </h1>
          <p>
            {mode === 'mine'
              ? '지나온 길 위에 남아 있는, 나만의 소중한 순간들.'
              : '익숙한 풍경 속, 누군가의 특별한 순간을 만나보세요.'}
          </p>
        </div>
        <div className="emotion-filters" aria-label="감정 필터">
          <button
            className={emotion === 'all' ? 'selected' : ''}
            onClick={() => setEmotion('all')}
          >
            전체
          </button>
          {Object.entries(emotions).map(([key, item]) => (
            <button
              key={key}
              aria-pressed={emotion === key}
              className={emotion === key ? 'selected' : ''}
              onClick={() => setEmotion(key as Emotion)}
            >
              <span
                className="emotion-dot"
                style={{ background: item.color }}
              />
              {item.label}
            </button>
          ))}
        </div>
        {mode === 'mine' && userId && (
          <div className="own-filters">
            <Select value={year} onValueChange={(v) => setYear(String(v))}>
              <SelectTrigger aria-label="기억 연도">
                <SelectValue placeholder="모든 연도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 연도</SelectItem>
                {Array.from(new Set(rows.map((m) => m.memory_date.slice(0, 4))))
                  .sort()
                  .reverse()
                  .map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}년
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select
              value={visibility}
              onValueChange={(v) => setVisibility(String(v))}
            >
              <SelectTrigger aria-label="공개 여부">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 공개 설정</SelectItem>
                <SelectItem value="private">나만 보기</SelectItem>
                <SelectItem value="public">공개</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="section-title">
          <h2>
            {mode === 'mine'
              ? '이곳에 남긴 나의 기억'
              : '이 근처에 남겨진 기억'}
            <span className="count">
              {loading ? '…' : memories.length}
              {limited ? '+' : ''}
            </span>
          </h2>
          {preview && <span className="sample-label">예시</span>}
        </div>
        <div className="memory-list" aria-live="polite">
          {mode === 'mine' && !userId ? (
            <div className="empty-state">
              <BookOpen size={27} />
              <strong>나만의 지도를 펼쳐보세요</strong>
              <p>
                로그인하면 내가 남긴 기억을
                <br />
                한곳에서 다시 만날 수 있어요.
              </p>
              <button className="text-link" onClick={() => setAuthOpen(true)}>
                로그인하기
                <ArrowRight size={16} />
              </button>
            </div>
          ) : loading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" size={25} />
              이곳의 기억을 찾고 있어요.
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <p>기억을 불러오지 못했어요.</p>
              <button
                className="text-link"
                onClick={() => setRevision((x) => x + 1)}
              >
                다시 시도
                <ArrowRight size={16} />
              </button>
            </div>
          ) : memories.length ? (
            memories.map((memory, index) => (
              <button
                className="memory-card"
                key={memory.id}
                onClick={() => {
                  void openMemory(memory);
                  mapRef.current?.flyTo(memory);
                }}
                aria-label={`${memory.title} 기억 읽기`}
              >
                <div className="card-meta">
                  <span>
                    <MapPin size={12} />
                    {memory.location_name}
                  </span>
                  <span
                    className="card-emotion"
                    style={{ color: emotions[memory.emotion].color }}
                  >
                    <span
                      className="emotion-dot"
                      style={{ background: emotions[memory.emotion].color }}
                    />
                    {emotions[memory.emotion].label}
                  </span>
                </div>
                <h3>{memory.title}</h3>
                <p>{memory.content}</p>
                <div className="card-footer">
                  <span>{formatDate(memory.memory_date)}</span>
                  {opening === memory.id ? (
                    <LoaderCircle size={14} className="spin" />
                  ) : (
                    <span>
                      {memory.owned ? (
                        memory.visibility === 'private' ? (
                          <LockKeyhole size={12} />
                        ) : (
                          <Globe2 size={12} />
                        )
                      ) : (
                        <span className="tiny-trace" />
                      )}
                      {memory.owned
                        ? '나의 기억'
                        : memory.is_anonymous
                          ? '익명의 기억'
                          : '공개 기억'}
                      <ArrowUpRight size={13} />
                    </span>
                  )}
                </div>
                {index === 0 && <span className="card-corner" />}
              </button>
            ))
          ) : (
            <div className="empty-state">
              <Leaf size={27} />
              <strong>아직 조용한 곳이에요</strong>
              <p>
                지도를 움직이거나 필터를 바꿔보세요.
                <br />
                이곳의 첫 기억을 남겨도 좋아요.
              </p>
              <button
                className="text-link"
                onClick={() => {
                  const p = mapRef.current?.center();
                  if (p) startCreate(p);
                }}
              >
                기억 남기기
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
        {limited && (
          <p className="limit-note">
            현재 영역의 최근 300개예요. 지도를 확대하면 더 찾아볼 수 있어요.
          </p>
        )}
        <div className="side-note">
          <span>◌</span> 모든 장소에는, 아직 듣지 못한 이야기가 있어요.
        </div>
      </aside>
      <div className="map-caption">
        <span className="live-dot" />
        {area}
        <span>
          {mode === 'mine'
            ? '내가 남긴 기억을 보고 있어요'
            : '지도를 움직여 기억을 발견하세요'}
        </span>
      </div>
      {preview && <div className="preview-badge">미리보기 · 예시 기억</div>}
      <div className="map-zoom">
        <button aria-label="지도 확대" onClick={() => mapRef.current?.zoom(1)}>
          <Plus size={18} />
        </button>
        <button aria-label="지도 축소" onClick={() => mapRef.current?.zoom(-1)}>
          <Minus size={18} />
        </button>
      </div>
      <div className="map-guide">
        <span className="guide-trace" />
        <span>작은 흔적을 누르면 이야기가 열려요</span>
      </div>
      <div className="map-actions">
        <button
          className="icon-button"
          aria-label="현재 위치로 이동"
          onClick={locate}
        >
          <LocateFixed size={20} />
        </button>
        <button
          className="primary"
          onClick={() => {
            const p = mapRef.current?.center();
            if (p) startCreate(p);
            else toast('지도가 준비되면 위치를 선택해 주세요.');
          }}
        >
          <Plus size={19} />
          기억 남기기
        </button>
      </div>
      <div className="map-hint">
        지도 위를 클릭하거나 길게 눌러 기억을 남겨보세요
      </div>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      {point && (
        <MemoryForm
          key={`${point.lng}:${point.lat}`}
          point={point}
          canSave={!!userId}
          preview={preview}
          onClose={() => setPoint(null)}
          onLogin={() => setAuthOpen(true)}
          onSaved={() => {
            setPoint(null);
            setMode('mine');
            setEmotion('all');
            setVisibility('all');
            setYear('all');
            setRevision((x) => x + 1);
            toast.success('이곳에 기억을 남겼어요.');
          }}
        />
      )}
      {selected && (
        <MemoryDetail
          memory={selected}
          preview={preview}
          onClose={() => setSelected(null)}
          onLocate={() => {
            mapRef.current?.flyTo(selected);
            setSelected(null);
          }}
        />
      )}
    </main>
  );
}
