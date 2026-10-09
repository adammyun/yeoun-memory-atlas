import type { Memory } from './model';
import { isPagesRuntime } from '@/src/lib/runtime';
import {
  memoryFiltersSchema,
  userMemoryFiltersSchema,
  type MemoryFilters,
  type UserMemoryFilters,
} from './schemas';

export const DEFAULT_MEMORY_FILTERS: MemoryFilters = { emotions: [] };

export const RECENT_MEMORY_YEARS = Array.from(
  { length: 10 },
  (_, index) => new Date().getFullYear() - index,
);

export function parseMemoryFilters(input: unknown): MemoryFilters {
  const parsed = memoryFiltersSchema.safeParse(input);
  return parsed.success ? parsed.data : DEFAULT_MEMORY_FILTERS;
}

export function parseUserMemoryFilters(
  input: unknown,
): Omit<UserMemoryFilters, 'limit'> {
  const parsed = userMemoryFiltersSchema.safeParse(input);
  if (!parsed.success) return DEFAULT_MEMORY_FILTERS;
  return {
    year: parsed.data.year,
    emotions: parsed.data.emotions,
    visibility: parsed.data.visibility,
  };
}

export function memoryMatchesFilters(
  memory: Pick<Memory, 'memory_date' | 'emotion'>,
  filters: MemoryFilters,
) {
  return (
    (!filters.year ||
      Boolean(memory.memory_date?.startsWith(String(filters.year)))) &&
    (!filters.emotions.length || filters.emotions.includes(memory.emotion))
  );
}

export function replaceFilterUrl(
  filters: MemoryFilters,
  visibility?: UserMemoryFilters['visibility'],
) {
  const params = new URLSearchParams(window.location.search);
  if (filters.year) params.set('year', String(filters.year));
  else params.delete('year');
  if (filters.emotions.length) {
    params.set('emotion', filters.emotions.join(','));
  } else {
    params.delete('emotion');
  }
  if (visibility) params.set('visibility', visibility);
  else params.delete('visibility');
  const query = params.toString();
  if (isPagesRuntime()) {
    const current = new URL(
      window.location.hash.slice(1) || '/',
      'https://pages.local',
    );
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}#${current.pathname}${query ? `?${query}` : ''}`,
    );
    return;
  }
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`,
  );
}
