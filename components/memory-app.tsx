'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Leaf,
  LoaderCircle,
  LogOut,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  UserRound,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import MemoryDetail from './memories/memory-detail';
import MemoryFilterSheet from './memories/memory-filter-sheet';
import MemoryForm from './memories/memory-form';
import MemoryMap, { type MapHandle } from './memories/map';
import PanoramaViewer from './memories/panorama-viewer';
import PlaceMemorySheet from './memories/place-memory-sheet';
import PlaceSearch from './map/place-search';
import {
  emotions,
  formatDate,
  type Bounds,
  type Memory,
  type PlaceMemoryGroup,
  type Point,
} from '@/lib/types';
import {
  fetchPlaceMemoryGroup,
  fetchPublicMemories,
  fetchPublicMemory,
} from '@/src/features/memories/api';
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  SEARCH_RESULT_ZOOM,
} from '@/src/features/map/constants';
import { logout } from '@/src/features/auth/api';
import type {
  MemoryLocationDraft,
  PlaceSearchResult,
} from '@/src/features/places/model';
import { placeToMemoryLocation } from '@/src/features/places/selection';
import {
  memoryMatchesFilters,
  replaceFilterUrl,
} from '@/src/features/memories/filters';
import type { MemoryFilters } from '@/src/features/memories/schemas';
import {
  memoryPanoramaTarget,
  type PanoramaTarget,
} from '@/src/features/panorama/target';

function isInBounds(memory: Memory, bounds: Bounds | null) {
  if (!bounds) return true;
  return (
    memory.lng >= bounds.west &&
    memory.lng <= bounds.east &&
    memory.lat >= bounds.south &&
    memory.lat <= bounds.north
  );
}

function MemoryCard({
  memory,
  onSelect,
}: {
  memory: Memory;
  onSelect: (memory: Memory) => void;
}) {
  return (
    <button className="memory-card" onClick={() => onSelect(memory)}>
      {memory.media[0] && (
        <Image
          className="memory-card-thumbnail"
          src={memory.media[0].url}
          alt={`${memory.title}의 기억 사진`}
          width={400}
          height={200}
          unoptimized
        />
      )}
      <div className="card-meta">
        <span>
          <MapPin size={12} /> {memory.location_name}
        </span>
        <span style={{ color: emotions[memory.emotion].color }}>
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
        <span>
          {memory.owned
            ? '나의 기억'
            : memory.is_anonymous
              ? '익명의 기억'
              : '공개 기억'}
          <ArrowUpRight size={13} />
        </span>
      </div>
    </button>
  );
}

export default function MemoryApp({
  isAuthenticated,
  initialFilters,
}: {
  isAuthenticated: boolean;
  initialFilters: MemoryFilters;
}) {
  const router = useRouter();
  const mapRef = useRef<MapHandle | null>(null);
  const detailRequest = useRef<AbortController | null>(null);
  const nearbyRequest = useRef<AbortController | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [publicRows, setPublicRows] = useState<Memory[]>([]);
  const [createdRows, setCreatedRows] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState(initialFilters);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [placeAnchor, setPlaceAnchor] = useState<Memory | null>(null);
  const [placeGroup, setPlaceGroup] = useState<PlaceMemoryGroup | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeError, setPlaceError] = useState(false);
  const [openingMemoryId, setOpeningMemoryId] = useState<string | null>(null);
  const [draftLocation, setDraftLocation] =
    useState<MemoryLocationDraft | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSearchResult | null>(
    null,
  );
  const [area, setArea] = useState('울산광역시');
  const [expanded, setExpanded] = useState(false);
  const [panoramaTarget, setPanoramaTarget] =
    useState<PanoramaTarget | null>(null);

  // oxlint-disable react/react-compiler -- Loading state is reset when a new viewport request begins.
  useEffect(() => {
    if (!bounds) return;
    const controller = new AbortController();
    // Request state intentionally resets when the viewport or filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(false);
    const timer = setTimeout(() => {
      fetchPublicMemories(bounds, filters, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            setPublicRows(result.memories);
            setHasMore(result.hasMore);
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
  }, [bounds, filters, revision]);
  // oxlint-enable react/react-compiler

  useEffect(
    () => () => {
      detailRequest.current?.abort();
      nearbyRequest.current?.abort();
    },
    [],
  );

  const rows = useMemo(() => {
    const byId = new Map(publicRows.map((memory) => [memory.id, memory]));
    for (const memory of createdRows) {
      if (
        memory.visibility === 'public' &&
        isInBounds(memory, bounds) &&
        memoryMatchesFilters(memory, filters)
      ) {
        byId.set(memory.id, memory);
      }
    }
    return Array.from(byId.values());
  }, [bounds, createdRows, filters, publicRows]);

  const memories = rows;
  const hasActiveFilters = Boolean(filters.year || filters.emotions.length);

  function changeFilters(next: MemoryFilters) {
    nearbyRequest.current?.abort();
    setSelected(null);
    setPlaceAnchor(null);
    setPlaceGroup(null);
    setFilters(next);
    replaceFilterUrl(next);
  }

  const openPlace = useCallback((memory: Memory) => {
    detailRequest.current?.abort();
    nearbyRequest.current?.abort();
    setSelected(null);
    setSelectedPlace(null);
    setDraftLocation(null);
    setPlaceAnchor(memory);
    setPlaceGroup(null);
    setPlaceError(false);
    setPlaceLoading(true);
    const controller = new AbortController();
    nearbyRequest.current = controller;
    fetchPlaceMemoryGroup(memory, controller.signal)
      .then((group) => {
        if (!controller.signal.aborted) setPlaceGroup(group);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlaceError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setPlaceLoading(false);
      });
  }, []);

  const openMemoryFromPlace = useCallback(async (id: string) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setOpeningMemoryId(id);
    try {
      const detail = await fetchPublicMemory(id, controller.signal);
      if (!controller.signal.aborted) {
        setPlaceAnchor(null);
        setPlaceGroup(null);
        setSelected(detail);
      }
    } catch {
      if (!controller.signal.aborted) {
        toast.error('이 기억을 읽을 수 없어요. 공개 설정을 확인해 주세요.');
      }
    } finally {
      if (!controller.signal.aborted) setOpeningMemoryId(null);
    }
  }, []);

  const startCreate = useCallback(
    (point: Point, locationName = '') => {
      if (!isAuthenticated) {
        router.push('/login?next=/');
        return;
      }
      detailRequest.current?.abort();
      nearbyRequest.current?.abort();
      setSelected(null);
      setSelectedPlace(null);
      setPlaceAnchor(null);
      setPlaceGroup(null);
      setDraftLocation({ point, locationName });
    },
    [isAuthenticated, router],
  );

  async function signOut() {
    try {
      await logout();
      setCreatedRows([]);
      router.refresh();
    } catch {
      toast.error('로그아웃하지 못했어요. 다시 시도해 주세요.');
    }
  }

  function memorySaved(memory: Memory) {
    setCreatedRows((current) => [
      memory,
      ...current.filter((item) => item.id !== memory.id),
    ]);
    setDraftLocation(null);
    if (memory.visibility === 'public') {
      setRevision((value) => value + 1);
    }
    setSelected(memory);
    toast.success(
      memory.visibility === 'public'
        ? '기억을 남겼어요. 지도에 새로운 흔적이 나타났습니다.'
        : '나만 보는 기억으로 저장했어요.',
    );
  }

  async function locate() {
    const showUlsanFallback = () => {
      mapRef.current?.flyTo(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      setArea('울산광역시');
    };

    const showRegionalLocation = async () => {
      try {
        const response = await fetch('/api/location', { cache: 'no-store' });
        if (!response.ok) throw new Error('Regional location unavailable');
        const result = (await response.json()) as {
          data: {
            lat: number;
            lng: number;
            label: string;
            precision: 'regional' | 'fallback';
          };
        };
        mapRef.current?.flyTo(
          result.data,
          result.data.precision === 'regional' ? 12.5 : DEFAULT_MAP_ZOOM,
        );
        setArea(result.data.label);
        toast.info(
          result.data.precision === 'regional'
            ? '정확한 위치 권한을 사용할 수 없어 지역 단위 위치를 보여드려요.'
            : '현재 위치를 사용할 수 없어 기본 지역인 울산을 보여드려요.',
        );
        return;
      } catch {
        showUlsanFallback();
        toast.info('기본 지역인 울산 지도를 보여드려요.');
      }
    };

    if (!navigator.geolocation) {
      await showRegionalLocation();
      return;
    }
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          mapRef.current?.flyTo({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setArea('내 주변');
          resolve();
        },
        () => void showRegionalLocation().finally(resolve),
        { timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }

  function selectSearchResult(place: PlaceSearchResult) {
    detailRequest.current?.abort();
    nearbyRequest.current?.abort();
    setSelected(null);
    setPlaceAnchor(null);
    setPlaceGroup(null);
    setDraftLocation(null);
    setSelectedPlace(place);
    setArea(place.name);
    setExpanded(false);
    mapRef.current?.flyTo(
      { lng: place.longitude, lat: place.latitude },
      SEARCH_RESULT_ZOOM,
    );
  }

  return (
    <main className="atlas">
      <a className="skip-link" href="#public-memory-list">
        공개 기억 목록으로 건너뛰기
      </a>
      <Toaster position="top-center" richColors />
      <header className="topbar">
        <Link className="brand" href="/" aria-label="여운 홈">
          <span className="brand-mark">◌</span>
          <b>여운</b>
          <span className="brand-caption">기억이 머무는 지도</span>
        </Link>
        <nav className="app-nav" aria-label="주요 메뉴">
          <Link className="active" href="/" aria-current="page">
            지도
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/my-map">
                <UserRound size={15} /> 내 기억
              </Link>
              <button onClick={() => void signOut()}>
                <LogOut size={15} /> 로그아웃
              </button>
            </>
          ) : (
            <Link href="/login">로그인</Link>
          )}
        </nav>
      </header>

      <MemoryMap
        memories={memories}
        mapRef={mapRef}
        draftPoint={
          draftLocation?.point ??
          (selectedPlace
            ? { lng: selectedPlace.longitude, lat: selectedPlace.latitude }
            : null)
        }
        highlightedIds={placeGroup?.memories.map((memory) => memory.id) ?? []}
        selectedMemoryId={placeAnchor?.id ?? null}
        onBounds={setBounds}
        onSelect={openPlace}
        onCreate={startCreate}
      />

      <PlaceSearch onSelect={selectSearchResult} />
      <MemoryFilterSheet filters={filters} onChange={changeFilters} />

      {selectedPlace && !draftLocation && (
        <section className="selected-place-card" aria-live="polite">
          <div>
            <span className="eyebrow">SELECTED PLACE</span>
            <strong>{selectedPlace.name}</strong>
            <small>{selectedPlace.displayName}</small>
          </div>
          <button
            type="button"
            onClick={() => {
              const draft = placeToMemoryLocation(selectedPlace);
              startCreate(draft.point, draft.locationName);
            }}
          >
            <Plus size={17} /> 이곳에 기억 남기기
          </button>
        </section>
      )}

      <aside
        id="public-memory-list"
        className={`discovery ${expanded ? 'expanded' : ''}`}
        aria-label="주변의 공개 기억"
        tabIndex={-1}
      >
        <button
          className="mobile-sheet-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? '기억 목록 접기' : '기억 목록 펼치기'}
          aria-expanded={expanded}
        >
          <span />
        </button>
        <div className="editorial">
          <span className="eyebrow">A PLACE, MANY STORIES</span>
          <h1>
            같은 장소,
            <br />
            서로 다른 이야기.
          </h1>
          <p>익숙한 풍경 속, 누군가의 특별한 순간을 만나보세요.</p>
        </div>

        {hasActiveFilters && (
          <div className="active-filter-summary" aria-label="적용 중인 필터">
            {filters.year && <span>{filters.year}년</span>}
            {filters.emotions.map((emotion) => (
              <span key={emotion}>{emotions[emotion].label}</span>
            ))}
            <button
              type="button"
              onClick={() => changeFilters({ emotions: [] })}
            >
              초기화
            </button>
          </div>
        )}

        <div className="section-title">
          <h2>
            이 근처에 남겨진 기억{' '}
            <span className="count">{loading ? '…' : memories.length}</span>
          </h2>
        </div>

        {loadError && (
          <output className="load-banner">
            새 기억을 불러오지 못했어요.
            <button onClick={() => setRevision((value) => value + 1)}>
              다시 시도
            </button>
          </output>
        )}

        <div className="memory-list" aria-live="polite" aria-busy={loading}>
          {!memories.length && loading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" size={25} />
              이곳의 기억을 찾고 있어요.
            </div>
          ) : memories.length ? (
            memories.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={memory}
                onSelect={openPlace}
              />
            ))
          ) : (
            <div className="empty-state">
              <Leaf size={27} />
              <strong>
                {hasActiveFilters
                  ? '이 조건에 맞는 기억이 아직 없어요'
                  : '아직 조용한 곳이에요'}
              </strong>
              <p>
                {hasActiveFilters
                  ? '필터를 초기화하거나 다른 조건을 골라보세요.'
                  : '지도를 클릭해 이곳의 첫 번째 기억을 남겨보세요.'}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="empty-reset"
                  onClick={() => changeFilters({ emotions: [] })}
                >
                  필터 초기화
                </button>
              )}
            </div>
          )}
        </div>
        {hasMore && (
          <p className="limit-note">
            지도를 확대하면 더 많은 기억을 볼 수 있어요.
          </p>
        )}
      </aside>

      <div className={`map-caption ${selectedPlace ? 'is-hidden' : ''}`}>
        <span className="live-dot" /> {area}
        <span>현재 화면의 공개 기억만 불러옵니다</span>
      </div>
      <div className="map-guide">
        <span className="guide-trace" />
        지도를 클릭하거나 길게 눌러 위치를 선택하세요
      </div>
      <div className="map-zoom">
        <button aria-label="지도 확대" onClick={() => mapRef.current?.zoom(1)}>
          <Plus size={18} />
        </button>
        <button aria-label="지도 축소" onClick={() => mapRef.current?.zoom(-1)}>
          <Minus size={18} />
        </button>
      </div>
      <div className="map-actions">
        <button
          className="icon-button"
          aria-label="현재 위치로 이동"
          onClick={() => void locate()}
        >
          <LocateFixed size={20} />
        </button>
        <button
          className="primary"
          aria-label="현재 지도 중심에 기억 남기기"
          onClick={() => {
            const center = mapRef.current?.center();
            if (center) startCreate(center);
          }}
        >
          <Plus size={19} /> 기억 남기기
        </button>
      </div>

      {draftLocation && (
        <MemoryForm
          key={`${draftLocation.point.lng}:${draftLocation.point.lat}`}
          point={draftLocation.point}
          initialLocationName={draftLocation.locationName}
          onClose={() => setDraftLocation(null)}
          onSaved={memorySaved}
        />
      )}

      {selected && (
        <MemoryDetail
          memory={selected}
          preview={false}
          onOpenPanorama={() =>
            setPanoramaTarget(memoryPanoramaTarget(selected))
          }
          onClose={() => setSelected(null)}
          onLocate={() => {
            mapRef.current?.flyTo(selected);
            setSelected(null);
          }}
        />
      )}

      {placeAnchor && (
        <PlaceMemorySheet
          anchor={placeAnchor}
          group={placeGroup}
          loading={placeLoading}
          error={placeError}
          openingMemoryId={openingMemoryId}
          onRetry={() => openPlace(placeAnchor)}
          onOpenPanorama={() =>
            setPanoramaTarget(
              memoryPanoramaTarget(
                placeAnchor,
                placeGroup?.placeName || placeAnchor.location_name,
              ),
            )
          }
          onOpenMemory={(id) => void openMemoryFromPlace(id)}
          onClose={() => {
            nearbyRequest.current?.abort();
            setPlaceAnchor(null);
            setPlaceGroup(null);
          }}
          onLocate={() => {
            const center = placeGroup
              ? {
                  lng: placeGroup.center.longitude,
                  lat: placeGroup.center.latitude,
                }
              : placeAnchor;
            mapRef.current?.flyTo(center);
            setPlaceAnchor(null);
            setPlaceGroup(null);
          }}
        />
      )}

      {panoramaTarget && (
        <PanoramaViewer
          placeName={panoramaTarget.placeName}
          point={panoramaTarget.point}
          onClose={() => setPanoramaTarget(null)}
        />
      )}
    </main>
  );
}
