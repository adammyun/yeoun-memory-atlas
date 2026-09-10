import { emotions, type MemoryDraft } from './types.ts';
export function validateDraft(d: MemoryDraft) {
  if (!d.title.trim() || d.title.trim().length > 100)
    throw new Error('제목은 1~100자로 적어주세요.');
  if (!d.content.trim() || d.content.trim().length > 10000)
    throw new Error('기억은 1~10,000자로 적어주세요.');
  if (!d.location_name.trim() || d.location_name.trim().length > 160)
    throw new Error('장소 이름을 160자 이내로 적어주세요.');
  if (
    !Number.isFinite(d.lng) ||
    !Number.isFinite(d.lat) ||
    Math.abs(d.lng) > 180 ||
    Math.abs(d.lat) > 85
  )
    throw new Error('지도에서 올바른 위치를 선택해 주세요.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(d.memory_date) ||
    !Number.isFinite(Date.parse(d.memory_date)) ||
    new Date(d.memory_date).toISOString().slice(0, 10) !== d.memory_date
  )
    throw new Error('올바른 날짜를 입력해 주세요.');
  if (
    !Object.hasOwn(emotions, d.emotion) ||
    !['private', 'public'].includes(d.visibility) ||
    !['exact', 'approximate'].includes(d.location_precision) ||
    typeof d.is_anonymous !== 'boolean'
  )
    throw new Error('공개 설정을 다시 확인해 주세요.');
  return {
    ...d,
    title: d.title.trim(),
    content: d.content.trim(),
    location_name: d.location_name.trim(),
  };
}
