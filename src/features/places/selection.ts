import type { MemoryLocationDraft, PlaceSearchResult } from './model';

export function placeToMemoryLocation(
  place: PlaceSearchResult,
): MemoryLocationDraft {
  return {
    point: { lng: place.longitude, lat: place.latitude },
    locationName: place.name || '기억이 남겨진 장소',
  };
}
