export const emotions = {
  calm: { label: '평온', color: '#6f8a66' },
  joy: { label: '기쁨', color: '#d7a758' },
  longing: { label: '그리움', color: '#9a8bb6' },
  love: { label: '설렘', color: '#c7867e' },
  sadness: { label: '슬픔', color: '#829dad' },
} as const;
export type Emotion = keyof typeof emotions;
export type Visibility = 'private' | 'public' | 'unlisted';
export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};
export type Point = { lng: number; lat: number };
export type Memory = {
  id: string;
  title: string;
  content: string;
  location_name: string;
  memory_date: string;
  emotion: Emotion;
  visibility: Visibility;
  is_anonymous: boolean;
  location_precision: 'exact' | 'approximate';
  lng: number;
  lat: number;
  created_at: string;
  owned: boolean;
};
export type MemoryDraft = Omit<Memory, 'id' | 'created_at' | 'owned'>;
export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date));
