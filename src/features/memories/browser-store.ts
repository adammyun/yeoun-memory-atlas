import type {
  Bounds,
  Emotion,
  Memory,
  MemoryMedia,
  PlaceMemoryGroup,
  Visibility,
} from './model';
import type {
  CreateMemoryInput,
  MemoryFilters,
  UpdateMemoryInput,
  UserMemoryFilters,
} from './schemas';

const DATABASE_NAME = 'yeoun-memory-atlas';
const DATABASE_VERSION = 1;
const STORE_NAME = 'memories';
const LOCAL_USER_ID = 'github-pages-user';

type StoredMedia = {
  id: string;
  dataUrl: string;
  sortOrder: number;
};

type StoredMemory = {
  id: string;
  ownerId: string;
  title: string;
  content: string;
  locationName: string;
  memoryDate: string | null;
  emotion: Emotion;
  visibility: Visibility;
  isAnonymous: boolean;
  locationPrecision: 'exact' | 'approximate';
  exactLat: number;
  exactLng: number;
  publicLat: number;
  publicLng: number;
  createdAt: string;
  updatedAt: string;
  media: StoredMedia[];
};

type SeedRow = readonly [
  id: string,
  ownerId: string,
  title: string,
  content: string,
  locationName: string,
  memoryDate: string | null,
  emotion: Emotion,
  visibility: Visibility,
  isAnonymous: boolean,
  locationPrecision: 'exact' | 'approximate',
  lat: number,
  lng: number,
];

const seedRows: SeedRow[] = [
  ['20000000-0000-4000-8000-000000000001', 'demo-user-1', '시험이 끝난 뒤의 밤 산책', '친구와 시험이 끝난 뒤 늦은 시간까지 강바람을 맞으며 걸었던 가상의 기억.', '태화강 국가정원', '2019-06-21', 'peaceful', 'public', true, 'approximate', 35.5532, 129.2924],
  ['20000000-0000-4000-8000-000000000002', 'demo-user-2', '파도 소리가 오래 남은 오후', '대왕암공원 산책길 끝에서 잠시 멈춰 바다를 바라보았던 가상의 기억.', '대왕암공원', '2021-10-16', 'meaningful', 'public', false, 'exact', 35.4926, 129.4391],
  ['20000000-0000-4000-8000-000000000005', 'demo-user-3', '가족과 처음 찾은 정원', '가족과 처음 국가정원을 둘러보며 사진을 여러 장 남겼던 가상의 기억.', '태화강 국가정원', '2020-10-04', 'happy', 'public', false, 'exact', 35.5502, 129.2903],
  ['20000000-0000-4000-8000-000000000006', 'demo-user-1', '혼자 달린 자전거 길', '복잡한 생각을 정리하려고 강변을 천천히 달렸던 가상의 기억.', '태화강 국가정원 산책로', '2022-08-27', 'lonely', 'public', true, 'exact', 35.5503, 129.2897],
  ['20000000-0000-4000-8000-000000000007', 'demo-user-2', '처음 마주한 봄 꽃밭', '햇빛 아래 펼쳐진 꽃밭의 색이 유난히 선명했던 가상의 순간.', '태화강 국가정원', '2023-04-09', 'excited', 'public', false, 'exact', 35.5498, 129.2905],
  ['20000000-0000-4000-8000-000000000008', 'demo-user-3', '오래된 친구와 다시 만난 곳', '오랫동안 연락하지 못했던 친구와 다시 만나 밀린 이야기를 나눈 가상의 기억.', '태화강 국가정원 산책로', '2025-09-13', 'love', 'public', true, 'exact', 35.5497, 129.2896],
  ['20000000-0000-4000-8000-000000000009', 'demo-user-1', '비가 그친 뒤의 잔디 냄새', '울산대공원을 천천히 걷다가 비가 그친 뒤의 공기를 기억해 둔 가상의 이야기.', '울산대공원', '2018-07-14', 'nostalgic', 'public', false, 'exact', 35.5317, 129.2935],
  ['20000000-0000-4000-8000-000000000010', 'demo-user-2', '골목의 작은 불빛', '성남동 골목을 지나며 가게 불빛이 하나씩 켜지는 모습을 바라본 가상의 기억.', '성남동 문화의거리', null, 'meaningful', 'public', true, 'approximate', 35.5558, 129.3193],
  ['20000000-0000-4000-8000-000000000011', 'demo-user-3', '수업이 끝난 늦은 오후', '울산대학교 주변을 걸으며 다음 학기를 천천히 상상해 본 가상의 기억.', '울산대학교 주변', '2024-03-22', 'meaningful', 'public', false, 'exact', 35.5438, 129.2592],
  ['20000000-0000-4000-8000-000000000012', 'demo-user-1', '여름 저녁의 모래사장', '일산해수욕장에서 해가 질 때까지 파도 소리를 들었던 가상의 기억.', '일산해수욕장', '2025-08-02', 'happy', 'public', true, 'exact', 35.4975, 129.4283],
  ['20000000-0000-4000-8000-000000000015', 'demo-user-2', '햇살이 따뜻했던 공원 벤치', '새 학기를 앞두고 울산대공원 벤치에 앉아 작은 계획을 적어 보았던 가상의 기억.', '울산대공원', '2026-03-07', 'happy', 'public', true, 'exact', 35.5322, 129.2941],
  ['20000000-0000-4000-8000-000000000099', LOCAL_USER_ID, '나만 간직한 골목의 저녁', '공개 지도에는 나타나지 않는 브라우저 시연용 가상 비공개 기억.', '울산 주택가 골목', '2022-11-03', 'nostalgic', 'private', false, 'exact', 35.5412, 129.3051],
];

const blur = (value: number) => Math.round(value * 100) / 100;

function seedMemory(row: SeedRow): StoredMemory {
  const [id, ownerId, title, content, locationName, memoryDate, emotion, visibility, isAnonymous, locationPrecision, lat, lng] = row;
  const createdAt = '2026-09-10T00:00:00.000Z';
  const isApproximatePublicFixture =
    locationPrecision === 'approximate' && ownerId !== LOCAL_USER_ID;
  const storedLat = isApproximatePublicFixture ? blur(lat) : lat;
  const storedLng = isApproximatePublicFixture ? blur(lng) : lng;
  return {
    id,
    ownerId,
    title,
    content,
    locationName,
    memoryDate,
    emotion,
    visibility,
    isAnonymous,
    locationPrecision,
    // A static site cannot enforce a server boundary for bundled fixtures, so
    // non-owned approximate examples never ship their source coordinate.
    exactLat: storedLat,
    exactLng: storedLng,
    publicLat: locationPrecision === 'approximate' ? blur(lat) : lat,
    publicLng: locationPrecision === 'approximate' ? blur(lng) : lng,
    createdAt,
    updatedAt: createdAt,
    media: [],
  };
}

let databasePromise: Promise<IDBDatabase> | null = null;

function database() {
  databasePromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error('브라우저 저장소를 열지 못했습니다.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      for (const row of seedRows) store.put(seedMemory(row));
    };
    request.onsuccess = () => resolve(request.result);
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('브라우저 저장 요청에 실패했습니다.'));
  });
}

async function allRecords() {
  const db = await database();
  return requestResult(
    db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll() as IDBRequest<StoredMemory[]>,
  );
}

async function recordById(id: string) {
  const db = await database();
  return requestResult(
    db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id) as IDBRequest<StoredMemory | undefined>,
  );
}

async function putRecord(record: StoredMemory) {
  const db = await database();
  await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(record));
}

function media(record: StoredMemory): MemoryMedia[] {
  return record.media.map((item) => ({
    id: item.id,
    url: item.dataUrl,
    sortOrder: item.sortOrder,
  }));
}

function toMemory(record: StoredMemory, ownerCoordinates = false): Memory {
  const owned = record.ownerId === LOCAL_USER_ID;
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    location_name: record.locationName,
    memory_date: record.memoryDate,
    emotion: record.emotion,
    visibility: record.visibility,
    is_anonymous: record.isAnonymous,
    location_precision: record.locationPrecision,
    lat: ownerCoordinates && owned ? record.exactLat : record.publicLat,
    lng: ownerCoordinates && owned ? record.exactLng : record.publicLng,
    created_at: record.createdAt,
    owned,
    media: media(record),
  };
}

function matchesFilters(record: StoredMemory, filters: Pick<MemoryFilters, 'year' | 'emotions'>) {
  return (
    (!filters.year || record.memoryDate?.startsWith(String(filters.year))) &&
    (!filters.emotions.length || filters.emotions.includes(record.emotion))
  );
}

function inBounds(record: StoredMemory, bounds: Bounds) {
  return (
    record.publicLng >= bounds.west &&
    record.publicLng <= bounds.east &&
    record.publicLat >= bounds.south &&
    record.publicLat <= bounds.north
  );
}

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
}

export async function listBrowserPublicMemories(
  bounds: Bounds,
  filters: MemoryFilters,
  signal?: AbortSignal,
) {
  checkAbort(signal);
  const rows = (await allRecords())
    .filter((row) => row.visibility === 'public' && inBounds(row, bounds) && matchesFilters(row, filters))
    .sort((a, b) => (b.memoryDate ?? b.createdAt).localeCompare(a.memoryDate ?? a.createdAt));
  checkAbort(signal);
  return { memories: rows.slice(0, 200).map((row) => toMemory(row)), hasMore: rows.length > 200 };
}

export async function getBrowserPublicMemory(id: string, signal?: AbortSignal) {
  checkAbort(signal);
  const row = await recordById(id);
  checkAbort(signal);
  if (!row || row.visibility !== 'public') throw new Error('공개 기억을 찾지 못했습니다.');
  return toMemory(row);
}

function fileDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('사진을 읽지 못했습니다.'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

async function storedMedia(files: File[], offset = 0) {
  return Promise.all(
    files.map(async (file, index): Promise<StoredMedia> => ({
      id: crypto.randomUUID(),
      dataUrl: await fileDataUrl(file),
      sortOrder: offset + index,
    })),
  );
}

export async function createBrowserMemory(input: CreateMemoryInput, images: File[]) {
  const now = new Date().toISOString();
  const record: StoredMemory = {
    id: crypto.randomUUID(),
    ownerId: LOCAL_USER_ID,
    title: input.title,
    content: input.content,
    locationName: input.location_name,
    memoryDate: input.memory_date,
    emotion: input.emotion,
    visibility: input.visibility,
    isAnonymous: input.is_anonymous,
    locationPrecision: input.location_precision,
    exactLat: input.lat,
    exactLng: input.lng,
    publicLat: input.location_precision === 'approximate' ? blur(input.lat) : input.lat,
    publicLng: input.location_precision === 'approximate' ? blur(input.lng) : input.lng,
    createdAt: now,
    updatedAt: now,
    media: await storedMedia(images),
  };
  await putRecord(record);
  return toMemory(record, true);
}

export async function listBrowserUserMemories(
  filters: Omit<UserMemoryFilters, 'limit'>,
  signal?: AbortSignal,
) {
  checkAbort(signal);
  const rows = (await allRecords())
    .filter(
      (row) =>
        row.ownerId === LOCAL_USER_ID &&
        (!filters.visibility || row.visibility === filters.visibility) &&
        matchesFilters(row, filters),
    )
    .sort((a, b) => (b.memoryDate ?? b.createdAt).localeCompare(a.memoryDate ?? a.createdAt));
  checkAbort(signal);
  return rows.map((row) => toMemory(row, true));
}

export async function updateBrowserMemory(
  id: string,
  input: UpdateMemoryInput,
  images: File[],
  removeMediaIds: string[],
) {
  const current = await recordById(id);
  if (!current || current.ownerId !== LOCAL_USER_ID) throw new Error('수정할 수 있는 기억을 찾지 못했습니다.');
  const kept = current.media.filter((item) => !removeMediaIds.includes(item.id));
  if (kept.length + images.length > 5) throw new Error('사진은 최대 5장까지 첨부할 수 있어요.');
  const next: StoredMemory = {
    ...current,
    title: input.title,
    content: input.content,
    memoryDate: input.memory_date,
    emotion: input.emotion,
    visibility: input.visibility,
    isAnonymous: input.is_anonymous,
    updatedAt: new Date().toISOString(),
    media: [...kept, ...(await storedMedia(images, kept.length))].map((item, index) => ({ ...item, sortOrder: index })),
  };
  await putRecord(next);
  return toMemory(next, true);
}

export async function deleteBrowserMemory(id: string) {
  const current = await recordById(id);
  if (!current || current.ownerId !== LOCAL_USER_ID) throw new Error('삭제할 수 있는 기억을 찾지 못했습니다.');
  const db = await database();
  await requestResult(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id));
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (degree: number) => (degree * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function browserPlaceMemoryGroup(
  memory: Pick<Memory, 'lat' | 'lng'>,
  radius: number,
  limit: number,
  signal?: AbortSignal,
): Promise<PlaceMemoryGroup> {
  checkAbort(signal);
  const rows = (await allRecords())
    .filter((row) => row.visibility === 'public')
    .map((row) => ({ row, distance: haversineMeters(memory.lat, memory.lng, row.publicLat, row.publicLng) }))
    .filter((item) => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
  const selected = rows.slice(0, limit);
  const emotionCounts = new Map<Emotion, number>();
  for (const item of selected) {
    emotionCounts.set(item.row.emotion, (emotionCounts.get(item.row.emotion) ?? 0) + 1);
  }
  checkAbort(signal);
  return {
    center: { latitude: memory.lat, longitude: memory.lng },
    placeName: selected[0]?.row.locationName ?? '이 장소',
    memoryCount: rows.length,
    hasMore: rows.length > limit,
    emotionSummary: Array.from(emotionCounts, ([emotion, count]) => ({ emotion, count })),
    memories: selected.map(({ row, distance }) => ({
      id: row.id,
      title: row.title,
      contentPreview: row.content.slice(0, 130),
      memoryDate: row.memoryDate,
      emotion: row.emotion,
      latitude: row.publicLat,
      longitude: row.publicLng,
      isAnonymous: row.isAnonymous,
      distanceMeters: Math.round(distance),
      firstImageUrl: row.media[0]?.dataUrl ?? null,
    })),
  };
}
