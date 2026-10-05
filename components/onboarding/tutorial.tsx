'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import {
  completeOnboarding,
  shouldStartOnboarding,
} from '@/src/features/onboarding/storage';

type TourStep = {
  eyebrow: string;
  title: string;
  description: string;
  selectors?: string[];
  mapInteraction?: boolean;
};

type Highlight = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const VIEWPORT_GAP = 12;
const HIGHLIGHT_GAP = 8;

const steps: TourStep[] = [
  {
    eyebrow: 'WELCOME TO YEOUN',
    title: '장소에 남은 마음을 발견해요',
    description:
      '여운은 한 장소에 겹쳐진 서로 다른 사람들의 기억을 천천히 들여다보는 지도예요.',
    selectors: ['[data-tour="brand"]'],
  },
  {
    eyebrow: 'EXPLORE THE MAP',
    title: '지도를 움직여 울산을 둘러보세요',
    description:
      '드래그하거나 확대·축소해도 안내는 계속됩니다. 화면 안에 필요한 기억만 불러와요.',
    selectors: ['.map-surface'],
    mapInteraction: true,
  },
  {
    eyebrow: 'SEARCH A PLACE',
    title: '기억하고 싶은 장소를 찾아보세요',
    description:
      '검색창에서 태화강 국가정원, 대왕암공원처럼 울산의 장소를 바로 찾을 수 있어요.',
    selectors: ['[data-tour="search"]'],
  },
  {
    eyebrow: 'MEMORY TRACE',
    title: '작은 흔적 하나가 하나의 기억이에요',
    description:
      '지도 위의 원을 선택하면 그 장소에 남은 기억과 감정을 읽을 수 있어요.',
    selectors: [
      '.raster-memory-marker:empty',
      '.raster-memory-marker',
      '.map-surface',
    ],
  },
  {
    eyebrow: 'A PLACE, MANY STORIES',
    title: '숫자가 있는 흔적에는 여러 이야기가 겹쳐 있어요',
    description:
      '같은 장소 가까이에 남겨진 기억을 한데 모아 보여줘요. 선택하면 장소별 기억 목록이 열립니다.',
    selectors: [
      '.raster-memory-marker:not(:empty)',
      '.memory-list',
      '.map-surface',
    ],
  },
  {
    eyebrow: 'LEAVE A MEMORY',
    title: '나의 기억을 지도에 남겨보세요',
    description:
      '기억 남기기를 누르거나 지도에서 위치를 고르면 제목, 감정, 공개 범위를 기록할 수 있어요.',
    selectors: ['[data-tour="create"]'],
  },
  {
    eyebrow: 'FILTER MEMORIES',
    title: '날짜와 감정으로 기억을 좁혀보세요',
    description:
      '지금 보고 싶은 시기와 감정을 골라 지도에 남은 이야기의 결을 바꿀 수 있어요.',
    selectors: ['[data-tour="filter"]'],
  },
  {
    eyebrow: 'MY MEMORY MAP',
    title: '내가 남긴 장소만 다시 모아볼 수 있어요',
    description:
      '로그인하면 내 기억 지도에서 공개한 이야기와 나만 간직한 이야기를 함께 관리할 수 있어요.',
    selectors: [
      '[data-tour="my-memories"]',
      '[data-tour="account-navigation"]',
    ],
  },
  {
    eyebrow: 'FIND MY LOCATION',
    title: '지금 있는 곳으로 지도를 옮겨보세요',
    description:
      '위치 권한을 허용하면 현재 위치를 표시해요. 사용할 수 없을 때는 울산으로 안전하게 돌아옵니다.',
    selectors: ['[data-tour="locate"]'],
  },
  {
    eyebrow: 'READY TO EXPLORE',
    title: '이제 장소에 남은 여운을 만나보세요',
    description:
      '이 안내는 처음 한 번만 표시됩니다. 숨겨진 개발자 화면에서 언제든 다시 시작할 수 있어요.',
  },
];

function findVisibleElement(selectors: string[] | undefined) {
  for (const selector of selectors ?? []) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const element = candidates.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    if (element) return element;
  }
  return null;
}

function constrainHighlight(rect: DOMRect): Highlight {
  const left = Math.max(VIEWPORT_GAP, rect.left - HIGHLIGHT_GAP);
  const top = Math.max(VIEWPORT_GAP, rect.top - HIGHLIGHT_GAP);
  const right = Math.min(window.innerWidth - VIEWPORT_GAP, rect.right + HIGHLIGHT_GAP);
  const bottom = Math.min(window.innerHeight - VIEWPORT_GAP, rect.bottom + HIGHLIGHT_GAP);
  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export default function OnboardingTutorial() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const step = steps[stepIndex];

  useEffect(() => {
    // The portal and localStorage are browser-only and must wait until hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const forced = new URL(window.location.href).searchParams.get('tutorial') === '1';
    if (shouldStartOnboarding(window.localStorage, forced)) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
  }, []);

  const updateHighlight = useCallback(() => {
    const target = findVisibleElement(step.selectors);
    setHighlight(target ? constrainHighlight(target.getBoundingClientRect()) : null);
  }, [step.selectors]);

  useLayoutEffect(() => {
    if (!open) return;
    // The first measurement must happen before paint to keep the spotlight aligned.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateHighlight();
    const timeouts = [0, 250, 800].map((delay) =>
      window.setTimeout(updateHighlight, delay),
    );
    const observer = new MutationObserver(updateHighlight);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);
    return () => {
      timeouts.forEach(window.clearTimeout);
      observer.disconnect();
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
    };
  }, [open, updateHighlight]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open, stepIndex]);

  const closeTour = useCallback(() => {
    completeOnboarding(window.localStorage);
    setOpen(false);
    previousFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTour();
        return;
      }
      if (event.key === 'ArrowLeft' && stepIndex > 0) {
        event.preventDefault();
        setStepIndex((value) => value - 1);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (stepIndex === steps.length - 1) closeTour();
        else setStepIndex((value) => value + 1);
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const controls = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'),
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeTour, open, stepIndex]);

  if (!mounted || !open) return null;

  const next = () => {
    if (stepIndex === steps.length - 1) closeTour();
    else setStepIndex((value) => value + 1);
  };

  const panelStyle = highlight
    ? ({
        '--tour-target-top': `${highlight.top}px`,
        '--tour-target-left': `${highlight.left}px`,
        '--tour-target-width': `${highlight.width}px`,
        '--tour-target-height': `${highlight.height}px`,
      } as React.CSSProperties)
    : undefined;

  return createPortal(
    <section
      className={`onboarding-tour ${highlight ? 'has-target' : 'is-centered'} ${highlight && highlight.top + highlight.height / 2 < window.innerHeight / 2 ? 'target-upper' : 'target-lower'} ${step.mapInteraction ? 'map-step' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
      aria-label={`처음 사용자 안내, ${stepIndex + 1}단계 중 ${steps.length}단계`}
      style={panelStyle}
    >
      {highlight ? (
        <>
          <div className="tour-dim tour-dim-top" />
          <div className="tour-dim tour-dim-left" />
          <div className="tour-dim tour-dim-right" />
          <div className="tour-dim tour-dim-bottom" />
          <div className="tour-highlight" aria-hidden="true" />
        </>
      ) : (
        <div className="tour-dim tour-dim-full" />
      )}

      <div className="tour-panel" ref={panelRef} tabIndex={-1} key={stepIndex}>
        <div className="tour-panel-heading">
          <span>{step.eyebrow}</span>
          <button type="button" onClick={closeTour} aria-label="안내 건너뛰기">
            <X size={18} />
          </button>
        </div>
        <p className="tour-progress" aria-live="polite">
          {stepIndex + 1} / {steps.length}
        </p>
        <h2 id="onboarding-title">{step.title}</h2>
        <p id="onboarding-description">{step.description}</p>
        {step.mapInteraction && (
          <small className="tour-interaction-hint">지금 지도를 직접 움직여도 좋아요.</small>
        )}
        <div className="tour-actions">
          <button
            type="button"
            className="tour-skip"
            onClick={closeTour}
          >
            건너뛰기
          </button>
          <div>
            <button
              type="button"
              className="tour-back"
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((value) => value - 1)}
            >
              <ArrowLeft size={16} /> 이전
            </button>
            <button type="button" className="tour-next" onClick={next}>
              {stepIndex === steps.length - 1 ? (
                <>
                  지도 둘러보기 <Check size={16} />
                </>
              ) : stepIndex === 0 ? (
                <>
                  시작하기 <ArrowRight size={16} />
                </>
              ) : (
                <>
                  다음 <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>,
    document.body,
  );
}
