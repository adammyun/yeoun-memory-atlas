import type { PlaceSearchResult } from './model';
import { isPagesRuntime } from '@/src/lib/runtime';
import { browserPlaceSearch } from './browser-search';

export async function fetchPlaceSearchResults(
  query: string,
  signal: AbortSignal,
) {
  if (isPagesRuntime()) return browserPlaceSearch(query, signal);
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/places/search?${params}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to search places');
  const result = (await response.json()) as { data: PlaceSearchResult[] };
  return result.data;
}
