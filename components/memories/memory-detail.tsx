'use client';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import {
  MapPin,
  CalendarDays,
  LockKeyhole,
  Globe2,
  X,
  ArrowUpRight,
  BookOpen,
  Eye,
  LoaderCircle,
  Pencil,
  Trash2,
  UserRound,
} from 'lucide-react';
import { emotions, formatDate, type Memory } from '@/lib/types';
export default function MemoryDetail({
  memory,
  onClose,
  onLocate,
  onOpenDetail,
  onOpenPanorama,
  preview,
  loading = false,
  onEdit,
  onDelete,
  deleting = false,
}: {
  memory: Memory;
  onClose: () => void;
  onLocate: () => void;
  onOpenDetail?: () => void;
  onOpenPanorama: () => void;
  preview: boolean;
  loading?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const emotion = emotions[memory.emotion];
  const privateVisibility = memory.visibility !== 'public';
  const visibilityLabel =
    memory.visibility === 'public'
      ? '공개된 기억'
      : memory.visibility === 'unlisted'
        ? '링크로 공유'
        : '나만 보기';
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        className="story-sheet detail-sheet"
        showCloseButton={false}
      >
        <span className="sheet-grip" />
        <div className="detail-top">
          <span
            className="emotion-pill"
            style={{ color: emotion.color, background: emotion.color + '15' }}
          >
            <span
              className="emotion-dot"
              style={{ background: emotion.color }}
            />
            {emotion.label}
          </span>
          <SheetClose className="close-button" aria-label="기억 닫기">
            <X size={20} />
          </SheetClose>
        </div>
        <span className="detail-location">
          <MapPin size={15} />
          {memory.location_name}
        </span>
        <SheetTitle className="story-title">{memory.title}</SheetTitle>
        <SheetDescription className="story-meta">
          <CalendarDays size={14} />
          {memory.memory_date
            ? `${formatDate(memory.memory_date)}의 기억`
            : formatDate(null)}
        </SheetDescription>
        <div className={`story-body ${preview ? 'preview-story-body' : ''}`}>
          {memory.content}
        </div>
        {memory.media.length > 0 && (
          <div
            className={`memory-detail-gallery ${memory.media.length === 1 ? 'single' : ''}`}
            aria-label="기억 사진"
          >
            {memory.media.map((media, index) => (
              <Image
                key={media.id}
                src={media.url}
                alt={`${memory.title}의 기억 사진 ${index + 1}`}
                width={800}
                height={600}
                unoptimized
              />
            ))}
          </div>
        )}
        {preview && onOpenDetail && (
          <button
            className="primary full detail-open-button"
            onClick={onOpenDetail}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <BookOpen size={17} />
            )}
            {loading ? '기억을 불러오는 중…' : '기억 자세히 보기'}
          </button>
        )}
        <button
          type="button"
          className="panorama-entry panorama-entry-compact"
          onClick={onOpenPanorama}
        >
          <Eye size={18} />
          <span>
            거리뷰
            <small>기억이 남겨진 장소 주변 둘러보기</small>
          </span>
          <ArrowUpRight size={17} />
        </button>
        <button className="location-card" onClick={onLocate}>
          <span className="location-card-icon">
            <MapPin size={23} />
          </span>
          <span>
            {memory.location_name}
            <small>
              {memory.location_precision === 'approximate' && !memory.owned
                ? '정확한 위치를 보호하고 있어요 · 대략적인 위치'
                : '지도에서 이 장소 보기'}
            </small>
          </span>
          <ArrowUpRight size={18} />
        </button>
        {memory.owned && (onEdit || onDelete) && (
          <div className="owner-actions">
            {onEdit && (
              <button onClick={onEdit} disabled={deleting}>
                <Pencil size={16} /> 수정
              </button>
            )}
            {onDelete && (
              <button
                className="danger-action"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            )}
          </div>
        )}
        <footer className="detail-footer">
          <span>
            <UserRound size={15} />
            {memory.owned
              ? '나의 기록'
              : memory.is_anonymous
                ? '이름 없이 남긴 기억'
                : '한 사람이 남긴 기억'}
          </span>
          <span>
            {privateVisibility ? (
              <LockKeyhole size={14} />
            ) : (
              <Globe2 size={14} />
            )}{' '}
            {visibilityLabel}
          </span>
        </footer>
      </SheetContent>
    </Sheet>
  );
}
