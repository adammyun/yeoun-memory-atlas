import type { Memory, Point } from '@/lib/types';

export type PanoramaTarget = {
  placeName: string;
  point: Point;
};

/** Uses only coordinates already present in the authorized Memory DTO. */
export function memoryPanoramaTarget(
  memory: Pick<Memory, 'lat' | 'lng' | 'location_name'>,
  placeName = memory.location_name,
): PanoramaTarget {
  return {
    placeName,
    point: { lat: memory.lat, lng: memory.lng },
  };
}
