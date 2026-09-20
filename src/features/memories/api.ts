import type { Bounds, Memory, PlaceMemoryGroup } from './model';
import type {
  CreateMemoryInput,
  MemoryFilters,
  UpdateMemoryInput,
  UserMemoryFilters,
} from './schemas';
import { PLACE_GROUP_LIMIT, PLACE_GROUP_RADIUS_METERS } from './constants';

type ListResponse = {
  data: Memory[];
  meta: { hasMore: boolean };
};

function appendFilters(
  params: URLSearchParams,
  filters: Pick<MemoryFilters, 'year' | 'emotions'>,
) {
  if (filters.year) params.set('year', String(filters.year));
  if (filters.emotions.length) {
    params.set('emotion', filters.emotions.join(','));
  }
}

export async function fetchPublicMemories(
  bounds: Bounds,
  filters: MemoryFilters,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
    limit: '200',
  });
  appendFilters(params, filters);
  const response = await fetch(`/api/memories?${params}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch public memories');
  const result = (await response.json()) as ListResponse;
  return { memories: result.data, hasMore: result.meta.hasMore };
}

export async function fetchPublicMemory(id: string, signal: AbortSignal) {
  const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch memory');
  const result = (await response.json()) as { data: Memory };
  return result.data;
}

async function responseMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;
  return body?.message ?? fallback;
}

function memoryFormData(
  input: CreateMemoryInput | UpdateMemoryInput,
  images: File[],
  removeMediaIds?: string[],
) {
  const formData = new FormData();
  formData.set('memory', JSON.stringify(input));
  if (removeMediaIds) {
    formData.set('removeMediaIds', JSON.stringify(removeMediaIds));
  }
  for (const image of images) formData.append('images', image);
  return formData;
}

export async function createMemory(
  input: CreateMemoryInput,
  images: File[] = [],
) {
  const response = await fetch('/api/memories', {
    method: 'POST',
    body: memoryFormData(input, images),
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        await responseMessage(response, '입력한 내용을 다시 확인해 주세요.'),
      );
    }
    if (response.status === 401) {
      throw new Error('로그인한 뒤 기억을 남길 수 있어요.');
    }
    throw new Error('기억을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  const result = (await response.json()) as { data: Memory };
  return result.data;
}

export async function fetchMyMemories(
  filters: Omit<UserMemoryFilters, 'limit'>,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ limit: '300' });
  appendFilters(params, filters);
  if (filters.visibility) params.set('visibility', filters.visibility);
  const response = await fetch(`/api/users/me/memories?${params}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('내 기억을 불러오지 못했습니다.');
  const result = (await response.json()) as { data: Memory[] };
  return result.data;
}

export async function updateMemory(
  id: string,
  input: UpdateMemoryInput,
  images: File[] = [],
  removeMediaIds: string[] = [],
) {
  const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: memoryFormData(input, images, removeMediaIds),
  });
  if (!response.ok) {
    if (response.status === 400) {
      throw new Error(
        await responseMessage(response, '사진과 입력 내용을 확인해 주세요.'),
      );
    }
    if (response.status === 404) {
      throw new Error('수정할 수 있는 기억을 찾지 못했습니다.');
    }
    throw new Error('기억을 수정하지 못했습니다.');
  }
  const result = (await response.json()) as { data: Memory };
  return result.data;
}

export async function deleteMemory(id: string) {
  const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('삭제할 수 있는 기억을 찾지 못했습니다.');
    }
    throw new Error('기억을 삭제하지 못했습니다.');
  }
}

export async function fetchPlaceMemoryGroup(
  memory: Pick<Memory, 'lat' | 'lng'>,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    lat: String(memory.lat),
    lng: String(memory.lng),
    radiusMeters: String(PLACE_GROUP_RADIUS_METERS),
    limit: String(PLACE_GROUP_LIMIT),
  });
  const response = await fetch(`/api/memories/nearby?${params}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch nearby memories');
  const result = (await response.json()) as { data: PlaceMemoryGroup };
  return result.data;
}
