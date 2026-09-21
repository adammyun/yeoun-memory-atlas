'use client';

import { LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PlaceSearchResult } from '@/src/features/places/model';
import { searchPlacesSafely } from '@/src/features/places/search';

const SEARCH_DELAY_MS = 400;

export default function PlaceSearch({
  onSelect,
}: {
  onSelect: (place: PlaceSearchResult) => void;
}) {
  const request = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const normalized = query.trim();
    request.current?.abort();
    if (normalized.length < 2) return;

    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => {
      setSearching(true);
      setFailed(false);
      void searchPlacesSafely(normalized, controller.signal)
        .then(({ places, failed: searchFailed }) => {
          if (!controller.signal.aborted) {
            setResults(places);
            setFailed(searchFailed);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function clearSearch() {
    request.current?.abort();
    setQuery('');
    setResults(null);
    setSearching(false);
    setFailed(false);
  }

  return (
    <section className="place-search-control" aria-label="장소 검색">
      <div className="place-search-input">
        {searching ? (
          <LoaderCircle className="spin" size={19} aria-hidden="true" />
        ) : (
          <Search size={19} aria-hidden="true" />
        )}
        <input
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            setFailed(false);
            setResults(null);
          }}
          placeholder="울산의 장소를 검색해보세요"
          aria-label="장소 이름"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results !== null || failed}
          aria-controls="place-search-results"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="검색어 지우기"
          >
            <X size={17} />
          </button>
        )}
      </div>

      {(results !== null || failed) && (
        <div
          className="place-search-results"
          id="place-search-results"
          role="region"
          aria-label="장소 검색 결과"
        >
          {failed ? (
            <output>장소 검색을 잠시 사용할 수 없어요.</output>
          ) : results?.length ? (
            <ul role="listbox">
              {results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    onClick={() => {
                      clearSearch();
                      onSelect(place);
                    }}
                  >
                    <MapPin size={17} aria-hidden="true" />
                    <span>
                      <strong>{place.name}</strong>
                      <small>{place.displayName}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <output>검색 결과가 없어요.</output>
          )}
          <small className="place-search-attribution">
            Search by Photon · © OpenStreetMap contributors
          </small>
        </div>
      )}
    </section>
  );
}
