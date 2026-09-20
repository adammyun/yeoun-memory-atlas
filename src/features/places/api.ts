import type { PlaceSearchResult } from './model';

export async function fetchPlaceSearchResults(
  query: string,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/places/search?${params}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to search places');
  const result = (await response.json()) as { data: PlaceSearchResult[] };
  return result.data;
}
