import type { PlaceSearchResult } from './model';

const ULSAN_PLACES: PlaceSearchResult[] = [
  { id: 'ulsan:taehwagarden', name: '태화강 국가정원', displayName: '태화강 국가정원 · 울산광역시 중구 태화동', longitude: 129.2903, latitude: 35.5502, type: 'park' },
  { id: 'ulsan:grandpark', name: '울산대공원', displayName: '울산대공원 · 울산광역시 남구 대공원로', longitude: 129.2935, latitude: 35.5317, type: 'park' },
  { id: 'ulsan:daewangam', name: '대왕암공원', displayName: '대왕암공원 · 울산광역시 동구 일산동', longitude: 129.4391, latitude: 35.4926, type: 'park' },
  { id: 'ulsan:ilsanbeach', name: '일산해수욕장', displayName: '일산해수욕장 · 울산광역시 동구 일산동', longitude: 129.4283, latitude: 35.4975, type: 'beach' },
  { id: 'ulsan:seongnam', name: '성남동 문화의거리', displayName: '성남동 문화의거리 · 울산광역시 중구 성남동', longitude: 129.3193, latitude: 35.5558, type: 'pedestrian' },
  { id: 'ulsan:university', name: '울산대학교', displayName: '울산대학교 · 울산광역시 남구 대학로', longitude: 129.2592, latitude: 35.5438, type: 'university' },
  { id: 'ulsan:taehwawalk', name: '태화강 산책로', displayName: '태화강 산책로 · 울산광역시 중구', longitude: 129.2897, latitude: 35.5503, type: 'path' },
];

export async function browserPlaceSearch(query: string, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const terms = query.trim().toLocaleLowerCase('ko-KR').split(/\s+/).filter(Boolean);
  return ULSAN_PLACES.filter((place) => {
    const haystack = `${place.name} ${place.displayName}`.toLocaleLowerCase('ko-KR');
    return terms.every((term) => haystack.includes(term));
  }).slice(0, 7);
}

