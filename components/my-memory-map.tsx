'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Globe2,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Plus,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import DeveloperHotspot from './dev/developer-hotspot';
import MemoryDetail from './memories/memory-detail';
import MemoryForm from './memories/memory-form';
import MemoryMap, { type MapHandle } from './memories/map';
import PanoramaViewer from './memories/panorama-viewer';
import { logout } from '@/src/features/auth/api';
import {
  memoryPanoramaTarget,
  type PanoramaTarget,
} from '@/src/features/panorama/target';
import { deleteMemory, fetchMyMemories } from '@/src/features/memories/api';
import {
  emotions,
  formatDate,
  type Emotion,
  type Memory,
  type Point,
} from '@/lib/types';
import {
  RECENT_MEMORY_YEARS,
  replaceFilterUrl,
} from '@/src/features/memories/filters';
import type { UserMemoryFilters } from '@/src/features/memories/schemas';

type MyFilters = Omit<UserMemoryFilters, 'limit'>;

function MyMemoryCard({
  memory,
  onSelect,
}: {
  memory: Memory;
  onSelect: (memory: Memory) => void;
}) {
  return (
    <button
      className="memory-card my-memory-card"
      onClick={() => onSelect(memory)}
    >
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
        <span>
          {memory.visibility === 'public' ? (
            <Globe2 size={12} />
          ) : (
            <LockKeyhole size={12} />
          )}
          {memory.visibility === 'public'
            ? '공개'
            : memory.visibility === 'unlisted'
              ? '링크 공유'
              : '나만 보기'}
        </span>
      </div>
      <h3>{memory.title}</h3>
      <p>{formatDate(memory.memory_date)}</p>
      <div className="card-footer">
        <span style={{ color: emotions[memory.emotion].color }}>
          {emotions[memory.emotion].label}
        </span>
        <span>
          열어보기 <ArrowUpRight size={13} />
        </span>
      </div>
    </button>
  );
}

export default function MyMemoryMap({
  displayName,
  initialFilters,
  naverMapsClientId,
}: {
  displayName: string;
  initialFilters: MyFilters;
  naverMapsClientId: string;
}) {
  const router = useRouter();
  const mapRef = useRef<MapHandle | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Memory | null>(null);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [createPoint, setCreatePoint] = useState<Point | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [panoramaTarget, setPanoramaTarget] =
    useState<PanoramaTarget | null>(null);

  // oxlint-disable react/react-compiler -- Loading state is reset for each server-filtered request.
  useEffect(() => {
    const controller = new AbortController();
    // Request state intentionally resets when the owner filters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setLoadError(false);
    fetchMyMemories(filters, controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setMemories(rows);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, revision]);
  // oxlint-enable react/react-compiler

  const years = useMemo(
    () =>
      Array.from(
        new Set([
          ...RECENT_MEMORY_YEARS,
          ...(filters.year ? [filters.year] : []),
        ]),
      ).sort((a, b) => b - a),
    [filters.year],
  );

  const archiveGroups = useMemo(() => {
    const groups = new Map<string, Memory[]>();
    for (const memory of memories) {
      const key = memory.memory_date?.slice(0, 4) ?? 'unknown';
      groups.set(key, [...(groups.get(key) ?? []), memory]);
    }
    return Array.from(groups, ([key, rows]) => ({ key, rows })).sort((a, b) => {
      if (a.key === 'unknown') return 1;
      if (b.key === 'unknown') return -1;
      return Number(b.key) - Number(a.key);
    });
  }, [memories]);

  const activeFilterCount =
    Number(Boolean(filters.visibility)) +
    Number(Boolean(filters.year)) +
    filters.emotions.length;

  function changeFilters(next: MyFilters) {
    setSelected(null);
    setFilters(next);
    replaceFilterUrl(next, next.visibility);
  }

  function toggleEmotion(emotion: Emotion) {
    changeFilters({
      ...filters,
      emotions: filters.emotions.includes(emotion)
        ? filters.emotions.filter((item) => item !== emotion)
        : [...filters.emotions, emotion],
    });
  }

  function selectMemory(memory: Memory) {
    setSelected(memory);
    mapRef.current?.flyTo(memory);
  }

  function upsertMemory(memory: Memory) {
    setRevision((value) => value + 1);
    setEditing(null);
    setCreatePoint(null);
    setSelected(memory);
    toast.success('기억을 저장했어요.');
  }

  async function removeSelected() {
    if (!selected || !window.confirm('이 기억을 삭제할까요?')) return;
    setDeleting(true);
    try {
      await deleteMemory(selected.id);
      setMemories((rows) => rows.filter((memory) => memory.id !== selected.id));
      setSelected(null);
      toast.success('기억을 삭제했어요.');
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : '삭제하지 못했어요.',
      );
    } finally {
      setDeleting(false);
    }
  }

  async function signOut() {
    try {
      await logout();
      router.replace('/');
      router.refresh();
    } catch {
      toast.error('로그아웃하지 못했어요.');
    }
  }

  return (
    <main className="atlas my-atlas">
      <a className="skip-link" href="#my-memory-list">
        내 기억 목록으로 건너뛰기
      </a>
      <Toaster position="top-center" richColors />
      <header className="topbar">
        <Link className="brand" href="/" data-tour="brand">
          <span className="brand-mark">◌</span>
          <b>여운</b>
          <span className="brand-caption">{displayName}의 기억 지도</span>
        </Link>
        <DeveloperHotspot />
        <nav className="app-nav" aria-label="주요 메뉴">
          <Link href="/">지도</Link>
          <Link className="active" href="/my-map" aria-current="page">
            내 기억
          </Link>
          <button onClick={() => void signOut()}>
            <LogOut size={15} /> 로그아웃
          </button>
        </nav>
      </header>

      <MemoryMap
        memories={memories}
        mapRef={mapRef}
        draftPoint={createPoint}
        highlightedIds={[]}
        selectedMemoryId={selected?.id ?? null}
        onBounds={() => undefined}
        onSelect={selectMemory}
        onCreate={setCreatePoint}
      />

      <aside
        id="my-memory-list"
        className={`discovery my-memory-panel ${expanded ? 'expanded' : ''}`}
        aria-label="내 기억 목록"
        tabIndex={-1}
      >
        <button
          className="mobile-sheet-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? '내 기억 목록 접기' : '내 기억 목록 펼치기'}
          aria-expanded={expanded}
        >
          <span />
        </button>
        <div className="my-map-heading">
          <p className="eyebrow">MY MEMORY MAP</p>
          <h1>내가 기억하는 장소들</h1>
          <p>공개한 이야기와 나만 간직한 이야기를 한곳에서 봅니다.</p>
        </div>

        <div className="my-map-filters" aria-label="내 기억 필터">
          <select
            aria-label="공개 범위"
            value={filters.visibility ?? 'all'}
            onChange={(event) => {
              const value = event.target.value;
              changeFilters({
                ...filters,
                visibility:
                  value === 'all'
                    ? undefined
                    : (value as MyFilters['visibility']),
              });
            }}
          >
            <option value="all">전체 공개 범위</option>
            <option value="public">공개</option>
            <option value="private">나만 보기</option>
            <option value="unlisted">링크 공유</option>
          </select>
          <select
            aria-label="기억 연도"
            value={filters.year ?? 'all'}
            onChange={(event) =>
              changeFilters({
                ...filters,
                year:
                  event.target.value === 'all'
                    ? undefined
                    : Number(event.target.value),
              })
            }
          >
            <option value="all">전체 연도</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}년
              </option>
            ))}
          </select>
          <div className="my-emotion-filters" aria-label="감정 필터">
            {Object.entries(emotions).map(([key, item]) => {
              const emotion = key as Emotion;
              const selected = filters.emotions.includes(emotion);
              return (
                <button
                  key={emotion}
                  type="button"
                  className={selected ? 'selected' : ''}
                  aria-pressed={selected}
                  onClick={() => toggleEmotion(emotion)}
                >
                  <span
                    className="emotion-dot"
                    style={{ background: item.color }}
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => changeFilters({ emotions: [] })}
            >
              필터 {activeFilterCount}개 초기화
            </button>
          )}
        </div>

        <div className="section-title">
          <h2>
            나의 기억 <span className="count">{memories.length}</span>
          </h2>
        </div>

        {loadError && (
          <output className="load-banner">
            내 기억을 불러오지 못했어요.
            <button onClick={() => setRevision((value) => value + 1)}>
              다시 시도
            </button>
          </output>
        )}
        <div className="memory-list" aria-busy={loading} aria-live="polite">
          {loading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" size={24} /> 기억을 펼치는 중…
            </div>
          ) : memories.length ? (
            archiveGroups.map((group) => (
              <section className="memory-archive-group" key={group.key}>
                <h3>
                  {group.key === 'unknown'
                    ? '날짜를 기록하지 않은 기억'
                    : `${group.key}년`}
                  <span>{group.rows.length}</span>
                </h3>
                {group.rows.map((memory) => (
                  <MyMemoryCard
                    key={memory.id}
                    memory={memory}
                    onSelect={selectMemory}
                  />
                ))}
              </section>
            ))
          ) : (
            <div className="empty-state">
              <Leaf size={26} />
              <strong>
                {activeFilterCount
                  ? '조건에 맞는 기억이 없어요'
                  : '아직 남긴 기억이 없어요'}
              </strong>
              <p>
                {activeFilterCount
                  ? '필터를 초기화하면 다른 기억을 다시 볼 수 있어요.'
                  : '지도에서 장소를 골라 첫 기억을 남겨보세요.'}
              </p>
              {activeFilterCount > 0 && (
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
      </aside>

      <div className="map-caption">
        <span className="live-dot" /> 나의 기억 지도
        <span>정확한 위치는 로그인한 나에게만 표시됩니다</span>
      </div>
      <div className={`map-actions ${expanded ? 'panel-expanded' : ''}`}>
        <button
          className="primary"
          aria-label="현재 지도 중심에 새 기억 추가"
          onClick={() => {
            const center = mapRef.current?.center();
            if (center) setCreatePoint(center);
          }}
        >
          <Plus size={19} /> 기억 추가
        </button>
      </div>

      {createPoint && (
        <MemoryForm
          point={createPoint}
          onClose={() => setCreatePoint(null)}
          onSaved={upsertMemory}
        />
      )}
      {editing && (
        <MemoryForm
          key={editing.id}
          point={editing}
          memory={editing}
          onClose={() => setEditing(null)}
          onSaved={upsertMemory}
        />
      )}
      {selected && !editing && (
        <MemoryDetail
          memory={selected}
          preview={false}
          onOpenPanorama={() =>
            setPanoramaTarget(memoryPanoramaTarget(selected))
          }
          deleting={deleting}
          onClose={() => setSelected(null)}
          onLocate={() => {
            mapRef.current?.flyTo(selected);
            setSelected(null);
          }}
          onEdit={() => setEditing(selected)}
          onDelete={() => void removeSelected()}
        />
      )}
      {panoramaTarget && (
        <PanoramaViewer
          clientId={naverMapsClientId}
          placeName={panoramaTarget.placeName}
          point={panoramaTarget.point}
          onClose={() => setPanoramaTarget(null)}
        />
      )}
    </main>
  );
}
