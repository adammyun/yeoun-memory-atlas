'use client';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MapPin,
  LockKeyhole,
  Globe2,
  ArrowRight,
  X,
  ShieldCheck,
} from 'lucide-react';
import { emotions, type Emotion, type Point } from '@/lib/types';
import { saveMemory } from '@/lib/memories';
export default function MemoryForm({
  point,
  canSave,
  preview,
  onClose,
  onSaved,
  onLogin,
}: {
  point: Point;
  canSave: boolean;
  preview: boolean;
  onClose: () => void;
  onSaved: () => void;
  onLogin: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [place, setPlace] = useState('');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [emotion, setEmotion] = useState<Emotion>('calm');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [anonymous, setAnonymous] = useState(true);
  const [approximate, setApproximate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!canSave) {
      onLogin();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await saveMemory({
        title,
        content,
        location_name: place,
        memory_date: date,
        emotion,
        visibility,
        is_anonymous: anonymous,
        location_precision: approximate ? 'approximate' : 'exact',
        ...point,
      });
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '저장하지 못했어요. 연결 상태를 확인한 뒤 다시 시도해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet
      open
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="story-sheet create-sheet"
      >
        <span className="sheet-grip" />
        <div className="sheet-heading">
          <div>
            <span className="eyebrow">LEAVE A LITTLE TRACE</span>
            <SheetTitle className="modal-heading">
              이곳에, 나의 기억을.
            </SheetTitle>
          </div>
          <SheetClose
            disabled={busy}
            className="close-button"
            aria-label="기록 닫기"
          >
            <X size={20} />
          </SheetClose>
        </div>
        <SheetDescription>
          완벽한 이야기가 아니어도 좋아요. 기억하고 싶은 순간을 남겨주세요.
        </SheetDescription>
        <form className="memory-form" onSubmit={submit}>
          <div className="location-selected">
            <MapPin size={18} />
            <span>
              선택한 위치{' '}
              <small>
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </small>
            </span>
            <button type="button" onClick={onClose}>
              다시 선택
            </button>
          </div>
          <label>
            장소 이름
            <input
              required
              maxLength={160}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="어떤 장소였나요? 예: 서울숲 산책길"
            />
          </label>
          <div className="form-row">
            <label>
              기억이 있었던 날짜
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <div className="field">
              <label id="emotion-label" htmlFor="memory-emotion">
                그날의 감정
              </label>
              <Select
                value={emotion}
                onValueChange={(v) => setEmotion(v as Emotion)}
              >
                <SelectTrigger
                  id="memory-emotion"
                  aria-labelledby="emotion-label"
                  className="form-select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(emotions).map(([key, item]) => (
                    <SelectItem key={key} value={key}>
                      <span
                        className="emotion-dot"
                        style={{ background: item.color }}
                      />
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label>
            기억의 제목
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="어떻게 기억하고 있나요?"
            />
          </label>
          <label>
            이야기
            <textarea
              required
              maxLength={10000}
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="그날의 공기, 함께한 사람, 아직 남아 있는 마음…"
            />
          </label>
          <fieldset>
            <legend>누구에게 보여줄까요?</legend>
            <RadioGroup
              className="visibility-options"
              value={visibility}
              onValueChange={(v) => setVisibility(v as 'private' | 'public')}
            >
              <label
                htmlFor="visibility-private"
                className={visibility === 'private' ? 'chosen' : ''}
              >
                <RadioGroupItem id="visibility-private" value="private" />
                <LockKeyhole size={17} />
                <span>
                  나만 보기<small>오직 나에게만 남기는 기록</small>
                </span>
              </label>
              <label
                htmlFor="visibility-public"
                className={visibility === 'public' ? 'chosen' : ''}
              >
                <RadioGroupItem id="visibility-public" value="public" />
                <Globe2 size={17} />
                <span>
                  모두에게<small>다른 사람과 나누는 기억</small>
                </span>
              </label>
            </RadioGroup>
          </fieldset>
          <div className="privacy-settings">
            <label htmlFor="anonymous">
              <span>
                이름 없이 남기기
                <small>공개해도 작성자의 신원은 전달하지 않아요.</small>
              </span>
              <Switch
                id="anonymous"
                checked={anonymous}
                onCheckedChange={setAnonymous}
              />
            </label>
            <label htmlFor="approximate">
              <span>
                대략적인 위치로 표시
                <small>다른 사람에게는 약 1km 격자로 표시돼요.</small>
              </span>
              <Switch
                id="approximate"
                checked={approximate}
                onCheckedChange={setApproximate}
              />
            </label>
          </div>
          {visibility === 'public' && (
            <p className="privacy-footnote">
              <ShieldCheck size={15} />
              장소 이름과 본문에도 집 주소 등 민감한 정보가 없는지 확인해
              주세요.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {preview && (
            <p className="form-message">
              미리보기에서는 기록이 저장되지 않아요.
            </p>
          )}
          <button className="primary full" disabled={busy || preview}>
            {busy
              ? '기억을 남기는 중…'
              : canSave
                ? '기억 남기기'
                : '로그인하고 기억 남기기'}
            <ArrowRight size={17} />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
