'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Globe2,
  ImagePlus,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { emotions, type Emotion, type Memory, type Point } from '@/lib/types';
import { createMemory, updateMemory } from '@/src/features/memories/api';
import {
  createMemorySchema,
  updateMemorySchema,
} from '@/src/features/memories/schemas';
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_ACCEPT,
  MAX_IMAGE_EDGE,
  MAX_IMAGE_FILE_SIZE,
  MAX_MEMORY_IMAGES,
} from '@/src/features/media/constants';

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const fieldLabels: Record<string, string> = {
  title: '제목',
  content: '내용',
  location_name: '장소 이름',
  memory_date: '날짜',
  emotion: '감정',
  visibility: '공개 범위',
  lng: '경도',
  lat: '위도',
};

async function stripImageMetadata(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 처리하지 못했습니다.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('사진을 처리하지 못했습니다.'))),
        'image/webp',
        0.86,
      ),
    );
    const name = file.name.replace(/\.[^.]+$/, '') || 'memory-photo';
    return new File([blob], `${name}.webp`, { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}

export default function MemoryForm({
  point,
  memory,
  initialLocationName = '',
  onClose,
  onSaved,
}: {
  point: Point;
  memory?: Memory;
  initialLocationName?: string;
  onClose: () => void;
  onSaved: (memory: Memory) => void;
}) {
  const editing = Boolean(memory);
  const [title, setTitle] = useState(memory?.title ?? '');
  const [content, setContent] = useState(memory?.content ?? '');
  const [locationName, setLocationName] = useState(
    memory?.location_name ?? initialLocationName,
  );
  const [memoryDate, setMemoryDate] = useState(memory?.memory_date ?? '');
  const [emotion, setEmotion] = useState<Emotion>(
    memory?.emotion ?? 'peaceful',
  );
  const [visibility, setVisibility] = useState<'private' | 'public'>(
    memory?.visibility === 'public' ? 'public' : 'private',
  );
  const [anonymous, setAnonymous] = useState(memory?.is_anonymous ?? true);
  const [approximate, setApproximate] = useState(
    memory?.location_precision === 'approximate',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newImages, setNewImages] = useState<PendingImage[]>([]);
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([]);
  const previewUrls = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
      previewUrls.current.clear();
    },
    [],
  );

  const keptMedia = (memory?.media ?? []).filter(
    (media) => !removedMediaIds.includes(media.id),
  );

  async function selectImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;
    if (
      keptMedia.length + newImages.length + files.length >
      MAX_MEMORY_IMAGES
    ) {
      setError('사진은 한 기억에 최대 5장까지 첨부할 수 있습니다.');
      return;
    }
    if (
      files.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type as never))
    ) {
      setError('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
      return;
    }
    if (files.some((file) => file.size > MAX_IMAGE_FILE_SIZE)) {
      setError('사진 한 장은 5MB 이하여야 합니다.');
      return;
    }
    setBusy(true);
    try {
      const sanitized = await Promise.all(files.map(stripImageMetadata));
      const pending = sanitized.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.add(previewUrl);
        return { id: crypto.randomUUID(), file, previewUrl };
      });
      setError('');
      setNewImages((current) => [...current, ...pending]);
    } catch {
      setError('사진을 안전하게 처리하지 못했습니다. 다른 사진을 선택해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  function removePendingImage(image: PendingImage) {
    URL.revokeObjectURL(image.previewUrl);
    previewUrls.current.delete(image.previewUrl);
    setNewImages((current) => current.filter((item) => item.id !== image.id));
  }

  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const draft = {
      title,
      content,
      location_name: locationName,
      memory_date: memoryDate,
      emotion,
      visibility,
      is_anonymous: visibility === 'public' && anonymous,
      location_precision: approximate ? 'approximate' : 'exact',
      ...point,
    };
    setBusy(true);
    setError('');
    try {
      if (editing && memory) {
        const parsed = updateMemorySchema.safeParse(draft);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const field = fieldLabels[String(issue?.path[0])] ?? '입력값';
          setError(`${field}을(를) 다시 확인해 주세요.`);
          return;
        }
        onSaved(
          await updateMemory(
            memory.id,
            parsed.data,
            newImages.map((image) => image.file),
            removedMediaIds,
          ),
        );
      } else {
        const parsed = createMemorySchema.safeParse(draft);
        if (!parsed.success) {
          const issue = parsed.error.issues[0];
          const field = fieldLabels[String(issue?.path[0])] ?? '입력값';
          setError(`${field}을(를) 다시 확인해 주세요.`);
          return;
        }
        onSaved(
          await createMemory(
            parsed.data,
            newImages.map((image) => image.file),
          ),
        );
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : '기억을 저장하지 못했어요. 다시 시도해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
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
              {editing ? '기억을 다듬어 볼까요.' : '이곳에, 나의 기억을.'}
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
          {editing
            ? '위치는 그대로 두고 이야기와 공개 설정을 바꿀 수 있어요.'
            : '완벽한 이야기가 아니어도 좋아요. 기억하고 싶은 순간을 남겨주세요.'}
        </SheetDescription>

        <form className="memory-form" onSubmit={submit} noValidate>
          <div className="location-selected">
            <MapPin size={18} />
            <span>
              {editing
                ? memory?.location_name
                : initialLocationName || '지도에서 선택한 위치'}
              <small>
                {editing
                  ? '이 기억의 위치는 그대로 유지돼요.'
                  : initialLocationName
                    ? '검색 결과에서 선택한 장소예요.'
                    : '장소 이름을 아래에 직접 적을 수 있어요.'}
              </small>
            </span>
            {!editing && (
              <button type="button" onClick={onClose} disabled={busy}>
                다시 선택
              </button>
            )}
          </div>

          <label>
            장소 이름 <small className="optional-label">선택</small>
            <input
              maxLength={160}
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="예: 태화강 국가정원 산책로"
              disabled={editing}
            />
          </label>

          <div className="form-row">
            <label>
              기억이 있었던 날짜 <small className="optional-label">선택</small>
              <input
                type="date"
                value={memoryDate}
                onChange={(event) => setMemoryDate(event.target.value)}
              />
            </label>
            <div className="field">
              <label id="emotion-label" htmlFor="memory-emotion">
                그날의 감정
              </label>
              <Select
                value={emotion}
                onValueChange={(value) => setEmotion(value as Emotion)}
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
              onChange={(event) => setTitle(event.target.value)}
              placeholder="어떻게 기억하고 있나요?"
            />
          </label>

          <label>
            이야기
            <textarea
              required
              maxLength={10_000}
              rows={5}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="그날의 공기, 함께한 사람, 아직 남아 있는 마음…"
            />
          </label>

          <section className="memory-images-field" aria-label="기억 사진">
            <div className="memory-images-heading">
              <span>
                사진 <small className="optional-label">선택 · 최대 5장</small>
              </span>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={
                  busy ||
                  keptMedia.length + newImages.length >= MAX_MEMORY_IMAGES
                }
              >
                <ImagePlus size={17} /> 사진 선택
              </button>
              <input
                ref={fileInput}
                className="visually-hidden"
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                onChange={selectImages}
                disabled={busy}
              />
            </div>

            {keptMedia.length + newImages.length > 0 ? (
              <div className="memory-image-previews">
                {keptMedia.map((media, index) => (
                  <figure key={media.id}>
                    <Image
                      src={media.url}
                      alt={`${memory?.title || title || '기억'}의 기존 사진 ${index + 1}`}
                      width={240}
                      height={240}
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setRemovedMediaIds((current) => [...current, media.id])
                      }
                      disabled={busy}
                      aria-label={`기존 사진 ${index + 1} 삭제`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </figure>
                ))}
                {newImages.map((image, index) => (
                  <figure key={image.id}>
                    <Image
                      src={image.previewUrl}
                      alt={`${title || '새 기억'}의 새 사진 ${keptMedia.length + index + 1}`}
                      width={240}
                      height={240}
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removePendingImage(image)}
                      disabled={busy}
                      aria-label={`새 사진 ${index + 1} 제거`}
                    >
                      <X size={15} />
                    </button>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="memory-images-empty">
                JPG, PNG, WEBP · 한 장당 5MB 이하
              </p>
            )}
          </section>

          <fieldset>
            <legend>누구에게 보여줄까요?</legend>
            <RadioGroup
              className="visibility-options"
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as 'private' | 'public')
              }
            >
              <label
                htmlFor="visibility-private"
                className={visibility === 'private' ? 'chosen' : ''}
              >
                <RadioGroupItem id="visibility-private" value="private" />
                <LockKeyhole size={17} />
                <span>
                  나만 보기<small>로그인한 나에게만 보입니다</small>
                </span>
              </label>
              <label
                htmlFor="visibility-public"
                className={visibility === 'public' ? 'chosen' : ''}
              >
                <RadioGroupItem id="visibility-public" value="public" />
                <Globe2 size={17} />
                <span>
                  모두에게<small>현재 지도에 공개합니다</small>
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          <div className="privacy-settings">
            <label htmlFor="anonymous">
              <span>
                공개할 때 익명으로 표시
                <small>공개 응답에는 작성자 정보가 포함되지 않습니다.</small>
              </span>
              <Switch
                id="anonymous"
                checked={anonymous}
                disabled={visibility !== 'public'}
                onCheckedChange={setAnonymous}
              />
            </label>
            {!editing && (
              <label htmlFor="approximate">
                <span>
                  대략적인 위치로 표시
                  <small>
                    공개 응답에는 원본 좌표 대신 격자화된 좌표를 보냅니다.
                  </small>
                </span>
                <Switch
                  id="approximate"
                  checked={approximate}
                  onCheckedChange={setApproximate}
                />
              </label>
            )}
          </div>

          {visibility === 'public' && (
            <p className="privacy-footnote">
              <ShieldCheck size={15} />
              장소 이름과 본문에 집 주소 등 민감한 정보가 없는지 확인해 주세요.
            </p>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button className="primary full" disabled={busy}>
            {busy
              ? newImages.length
                ? '사진과 기억을 저장하는 중…'
                : editing
                  ? '기억을 수정하는 중…'
                  : '기억을 남기는 중…'
              : editing
                ? '변경 내용 저장하기'
                : '기억 남기기'}
            <ArrowRight size={17} />
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
