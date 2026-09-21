'use client';

import Image from 'next/image';

import {
  ArrowRight,
  CalendarDays,
  LoaderCircle,
  MapPin,
  UserRound,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  emotions,
  formatDate,
  type Memory,
  type PlaceMemoryGroup,
  type PlaceMemoryItem,
} from '@/lib/types';

function fallbackItem(memory: Memory): PlaceMemoryItem {
  return {
    id: memory.id,
    title: memory.title,
    contentPreview: memory.content,
    memoryDate: memory.memory_date,
    emotion: memory.emotion,
    latitude: memory.lat,
    longitude: memory.lng,
    isAnonymous: memory.is_anonymous,
    distanceMeters: 0,
    firstImageUrl: memory.media[0]?.url ?? null,
  };
}

export default function PlaceMemorySheet({
  anchor,
  group,
  loading,
  error,
  openingMemoryId,
  onRetry,
  onClose,
  onLocate,
  onOpenMemory,
}: {
  anchor: Memory;
  group: PlaceMemoryGroup | null;
  loading: boolean;
  error: boolean;
  openingMemoryId: string | null;
  onRetry: () => void;
  onClose: () => void;
  onLocate: () => void;
  onOpenMemory: (id: string) => void;
}) {
  const nearby = group?.memories ?? [];
  const memories = (
    nearby.some((memory) => memory.id === anchor.id)
      ? [...nearby]
      : [...nearby, fallbackItem(anchor)]
  ).sort((a, b) => {
    const aDate = a.memoryDate ? Date.parse(a.memoryDate) : Number.MAX_VALUE;
    const bDate = b.memoryDate ? Date.parse(b.memoryDate) : Number.MAX_VALUE;
    return aDate - bDate;
  });
  const placeName =
    group?.placeName ||
    (anchor.location_name === '선택한 장소'
      ? '이 장소의 기억'
      : anchor.location_name);
  const memoryCount = group?.memoryCount || memories.length;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="story-sheet place-sheet"
        showCloseButton={false}
      >
        <span className="sheet-grip" />
        <div className="place-heading">
          <div>
            <span className="eyebrow">SAME PLACE, DIFFERENT MEMORIES</span>
            <div className="place-title-row">
              <SheetTitle className="place-title">{placeName}</SheetTitle>
              <span className="place-memory-count" aria-label={`기억 ${memoryCount}개`}>
                {memoryCount}
              </span>
            </div>
            <SheetDescription className="place-description">
              {memoryCount > 1
                ? `이 장소에 ${memoryCount}개의 기억이 있습니다.`
                : '이 장소에 남겨진 기억입니다.'}
              <br />
              이곳을 다른 사람들은 이렇게 기억하고 있어요.
            </SheetDescription>
          </div>
          <SheetClose className="close-button" aria-label="장소 기억 닫기">
            <X size={20} />
          </SheetClose>
        </div>

        {group && group.emotionSummary.length > 0 && memoryCount > 1 && (
          <div className="place-emotions" aria-label="이 장소의 감정 요약">
            {group.emotionSummary.map((item) => (
              <span key={item.emotion}>
                <i style={{ background: emotions[item.emotion].color }} />
                {emotions[item.emotion].label} {item.count}
              </span>
            ))}
          </div>
        )}

        {loading && (
          <div className="place-status">
            <LoaderCircle className="spin" size={16} /> 주변의 기억을 찾고
            있어요.
          </div>
        )}
        {error && (
          <output className="place-status place-status-error">
            주변 기억을 불러오지 못했어요. 선택한 기억은 계속 볼 수 있어요.
            <button onClick={onRetry}>다시 시도</button>
          </output>
        )}

        <div className="place-timeline" aria-busy={loading}>
          {memories.map((memory) => {
            const selected = memory.id === anchor.id;
            const emotion = emotions[memory.emotion];
            return (
              <article
                key={memory.id}
                className={`place-memory ${selected ? 'selected' : ''}`}
              >
                <span
                  className="timeline-dot"
                  style={{ background: emotion.color }}
                />
                <button onClick={() => onOpenMemory(memory.id)}>
                  {memory.firstImageUrl && (
                    <Image
                      className="place-memory-thumbnail"
                      src={memory.firstImageUrl}
                      alt={`${memory.title}의 기억 사진`}
                      width={640}
                      height={260}
                      unoptimized
                    />
                  )}
                  <div className="place-memory-meta">
                    <span style={{ color: emotion.color }}>
                      {emotion.label}
                    </span>
                    <span>
                      <CalendarDays size={12} />
                      {formatDate(memory.memoryDate)}
                    </span>
                  </div>
                  <h3>{memory.title}</h3>
                  <p>{memory.contentPreview}</p>
                  <footer>
                    <span>
                      <UserRound size={13} />
                      {memory.isAnonymous ? '익명의 기억' : '한 사람의 기억'}
                    </span>
                    {selected && <strong>선택한 기억</strong>}
                    {openingMemoryId === memory.id ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <ArrowRight size={15} />
                    )}
                  </footer>
                </button>
              </article>
            );
          })}
        </div>

        {group?.hasMore && (
          <p className="place-limit-note">
            이 장소에는 더 많은 기억이 있어요. 이번 화면에는 오래된 기억부터
            {group.memories.length}개를 보여줍니다.
          </p>
        )}

        <button className="location-card place-locate" onClick={onLocate}>
          <span className="location-card-icon">
            <MapPin size={21} />
          </span>
          <span>
            지도에서 이 장소 보기
            <small>선택한 marker를 중심으로 돌아갑니다</small>
          </span>
        </button>
      </SheetContent>
    </Sheet>
  );
}
