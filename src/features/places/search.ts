import { fetchPlaceSearchResults } from './api';
import type { PlaceSearchResult } from './model';

type PlaceSearcher = (
  query: string,
  signal: AbortSignal,
) => Promise<PlaceSearchResult[]>;

export async function searchPlacesSafely(
  query: string,
  signal: AbortSignal,
  searcher: PlaceSearcher = fetchPlaceSearchResults,
): Promise<{ places: PlaceSearchResult[]; failed: boolean }> {
  try {
    return { places: await searcher(query, signal), failed: false };
  } catch {
    return { places: [], failed: !signal.aborted };
  }
}
