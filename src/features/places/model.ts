import type { Point } from '@/lib/types';

export type PlaceSearchResult = {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type: string | null;
};

export type MemoryLocationDraft = {
  point: Point;
  locationName: string;
};
