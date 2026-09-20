'use client';

import { RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { emotions, type Emotion } from '@/lib/types';
import { RECENT_MEMORY_YEARS } from '@/src/features/memories/filters';
import type { MemoryFilters } from '@/src/features/memories/schemas';

export default function MemoryFilterSheet({
  filters,
  onChange,
}: {
  filters: MemoryFilters;
  onChange: (filters: MemoryFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = Number(Boolean(filters.year)) + filters.emotions.length;

  function toggleEmotion(emotion: Emotion) {
    onChange({
      ...filters,
      emotions: filters.emotions.includes(emotion)
        ? filters.emotions.filter((item) => item !== emotion)
        : [...filters.emotions, emotion],
    });
  }

  return (
    <>
      <button
        type="button"
        className={`map-filter-button ${activeCount ? 'active' : ''}`}
        onClick={() => setOpen(true)}
        aria-label={`기억 필터 열기${activeCount ? `, ${activeCount}개 적용 중` : ''}`}
      >
        <SlidersHorizontal size={17} /> 필터
        {activeCount > 0 && <span>{activeCount}</span>}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="story-sheet filter-sheet"
        >
          <span className="sheet-grip" />
          <div className="sheet-heading">
            <div>
              <span className="eyebrow">REVISIT A MOMENT</span>
              <SheetTitle className="modal-heading">
                어떤 기억을 다시 볼까요?
              </SheetTitle>
            </div>
            <SheetClose className="close-button" aria-label="필터 닫기">
              <X size={20} />
            </SheetClose>
          </div>
          <SheetDescription>
            경험한 연도와 감정을 함께 골라 지도에 남은 이야기를 좁혀보세요.
          </SheetDescription>

          <div className="filter-fields">
            <label>
              기억의 연도
              <select
                value={filters.year ?? 'all'}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    year:
                      event.target.value === 'all'
                        ? undefined
                        : Number(event.target.value),
                  })
                }
              >
                <option value="all">전체 기간</option>
                {RECENT_MEMORY_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>

            <fieldset>
              <legend>그날의 감정 · 여러 개 선택 가능</legend>
              <div className="filter-emotions">
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
            </fieldset>
          </div>

          <div className="filter-sheet-actions">
            <button
              type="button"
              className="secondary"
              disabled={!activeCount}
              onClick={() => onChange({ emotions: [] })}
            >
              <RotateCcw size={16} /> 초기화
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => setOpen(false)}
            >
              지도에서 보기
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
