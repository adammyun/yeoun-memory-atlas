'use client';
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
  UserRound,
} from 'lucide-react';
import { emotions, formatDate, type Memory } from '@/lib/types';
export default function MemoryDetail({
  memory,
  onClose,
  onLocate,
  preview,
}: {
  memory: Memory;
  onClose: () => void;
  onLocate: () => void;
  preview: boolean;
}) {
  const emotion = emotions[memory.emotion];
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
          {formatDate(memory.memory_date)}의 기억
        </SheetDescription>
        <div className="story-body">{memory.content}</div>
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
            {memory.visibility === 'private' ? (
              <LockKeyhole size={14} />
            ) : (
              <Globe2 size={14} />
            )}{' '}
            {memory.visibility === 'private' ? '나만 보기' : '공개된 기억'}
          </span>
        </footer>
        {preview && (
          <p className="privacy-footnote">
            서비스를 소개하기 위해 만든 예시 기억이에요.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
