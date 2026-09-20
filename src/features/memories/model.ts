export const emotions = {
  happy: { label: '행복', color: '#c89b4a' },
  nostalgic: { label: '그리움', color: '#8f7aa8' },
  love: { label: '사랑', color: '#bd7772' },
  sad: { label: '슬픔', color: '#708b9b' },
  peaceful: { label: '평온', color: '#668064' },
  excited: { label: '설렘', color: '#c47f52' },
  lonely: { label: '외로움', color: '#7d8792' },
  meaningful: { label: '의미 있는 순간', color: '#88705d' },
} as const;

export type Emotion = keyof typeof emotions;
export type Visibility = 'private' | 'unlisted' | 'public';
export type LocationPrecision = 'exact' | 'approximate';
export type Point = { lng: number; lat: number };
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type MemoryMedia = {
  id: string;
  url: string;
  sortOrder: number;
};

/** Safe response shape. It intentionally has no userId or exactLocation field. */
export type Memory = {
  id: string;
  title: string;
  content: string;
  location_name: string;
  memory_date: string | null;
  emotion: Emotion;
  visibility: Visibility;
  is_anonymous: boolean;
  location_precision: LocationPrecision;
  lng: number;
  lat: number;
  created_at: string;
  owned: boolean;
  media: MemoryMedia[];
};

export type MemoryDraft = {
  title: string;
  content: string;
  location_name: string;
  memory_date: string | null;
  emotion: Emotion;
  visibility: Visibility;
  is_anonymous: boolean;
  location_precision: LocationPrecision;
  lng: number;
  lat: number;
};

export type PlaceMemoryItem = {
  id: string;
  title: string;
  contentPreview: string;
  memoryDate: string | null;
  emotion: Emotion;
  latitude: number;
  longitude: number;
  isAnonymous: boolean;
  distanceMeters: number;
  firstImageUrl: string | null;
};

export type PlaceMemoryGroup = {
  center: { latitude: number; longitude: number };
  placeName: string;
  memoryCount: number;
  hasMore: boolean;
  emotionSummary: Array<{ emotion: Emotion; count: number }>;
  memories: PlaceMemoryItem[];
};

export const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(date))
    : '날짜를 적지 않은 기억';
