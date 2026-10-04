import { env } from 'cloudflare:workers';
import type { ChatGPTUser } from '@/app/chatgpt-auth';
import type {
  Bounds,
  Emotion,
  Memory,
  MemoryMedia,
  PlaceMemoryGroup,
  Visibility,
} from '@/src/features/memories/model';
import type {
  CreateMemoryInput,
  MemoryFilters,
  UpdateMemoryInput,
  UserMemoryFilters,
} from '@/src/features/memories/schemas';

type MemoryRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  location_name: string;
  memory_date: string | null;
  emotion: Emotion;
  visibility: Visibility;
  is_anonymous: number;
  location_precision: 'exact' | 'approximate';
  latitude: number;
  longitude: number;
  public_latitude: number;
  public_longitude: number;
  created_at: string;
  updated_at: string;
};

type MediaRow = {
  id: string;
  memory_id: string;
  storage_key: string;
  mime_type: string;
  sort_order: number;
};

export type StoredUpload = {
  id: string;
  storageKey: string;
  mimeType: string;
  size: number;
};

const seedRows = [
  ['20000000-0000-4000-8000-000000000001', 'demo-user-1', '시험이 끝난 뒤의 밤 산책', '친구와 시험이 끝난 뒤 늦은 시간까지 강바람을 맞으며 걸었던 가상의 기억.', '태화강 국가정원', '2019-06-21', 'peaceful', 'public', 1, 'approximate', 35.5532, 129.2924],
  ['20000000-0000-4000-8000-000000000002', 'demo-user-2', '파도 소리가 오래 남은 오후', '대왕암공원 산책길 끝에서 잠시 멈춰 바다를 바라보았던 가상의 기억.', '대왕암공원', '2021-10-16', 'meaningful', 'public', 0, 'exact', 35.4926, 129.4391],
  ['20000000-0000-4000-8000-000000000005', 'demo-user-3', '가족과 처음 찾은 정원', '가족과 처음 국가정원을 둘러보며 사진을 여러 장 남겼던 가상의 기억.', '태화강 국가정원', '2020-10-04', 'happy', 'public', 0, 'exact', 35.5502, 129.2903],
  ['20000000-0000-4000-8000-000000000006', 'demo-user-1', '혼자 달린 자전거 길', '복잡한 생각을 정리하려고 강변을 천천히 달렸던 가상의 기억.', '태화강 국가정원 산책로', '2022-08-27', 'lonely', 'public', 1, 'exact', 35.5503, 129.2897],
  ['20000000-0000-4000-8000-000000000007', 'demo-user-2', '처음 마주한 봄 꽃밭', '햇빛 아래 펼쳐진 꽃밭의 색이 유난히 선명했던 가상의 순간.', '태화강 국가정원', '2023-04-09', 'excited', 'public', 0, 'exact', 35.5498, 129.2905],
  ['20000000-0000-4000-8000-000000000008', 'demo-user-3', '오래된 친구와 다시 만난 곳', '오랫동안 연락하지 못했던 친구와 다시 만나 밀린 이야기를 나눈 가상의 기억.', '태화강 국가정원 산책로', '2025-09-13', 'love', 'public', 1, 'exact', 35.5497, 129.2896],
  ['20000000-0000-4000-8000-000000000009', 'demo-user-1', '비가 그친 뒤의 잔디 냄새', '울산대공원을 천천히 걷다가 비가 그친 뒤의 공기를 기억해 둔 가상의 이야기.', '울산대공원', '2018-07-14', 'nostalgic', 'public', 0, 'exact', 35.5317, 129.2935],
  ['20000000-0000-4000-8000-000000000010', 'demo-user-2', '골목의 작은 불빛', '성남동 골목을 지나며 가게 불빛이 하나씩 켜지는 모습을 바라본 가상의 기억.', '성남동 문화의거리', null, 'meaningful', 'public', 1, 'approximate', 35.5558, 129.3193],
  ['20000000-0000-4000-8000-000000000011', 'demo-user-3', '수업이 끝난 늦은 오후', '울산대학교 주변을 걸으며 다음 학기를 천천히 상상해 본 가상의 기억.', '울산대학교 주변', '2024-03-22', 'meaningful', 'public', 0, 'exact', 35.5438, 129.2592],
  ['20000000-0000-4000-8000-000000000012', 'demo-user-1', '여름 저녁의 모래사장', '일산해수욕장에서 해가 질 때까지 파도 소리를 들었던 가상의 기억.', '일산해수욕장', '2025-08-02', 'happy', 'public', 1, 'exact', 35.4975, 129.4283],
  ['20000000-0000-4000-8000-000000000015', 'demo-user-2', '햇살이 따뜻했던 공원 벤치', '새 학기를 앞두고 울산대공원 벤치에 앉아 작은 계획을 적어 보았던 가상의 기억.', '울산대공원', '2026-03-07', 'happy', 'public', 1, 'exact', 35.5322, 129.2941],
  ['20000000-0000-4000-8000-000000000099', 'local_seedy', '나만 간직한 골목의 저녁', '공개 지도에는 나타나지 않는 로컬 시연용 가상 비공개 기억.', '울산 주택가 골목', '2022-11-03', 'nostalgic', 'private', 0, 'exact', 35.5412, 129.3051],
] as const;

let seedPromise: Promise<void> | null = null;

export function database() {
  return env.DB;
}

export function objectBucket() {
  return env.BUCKET;
}

export function ensureSeedData() {
  seedPromise ??= seedDemoRows().catch((error) => {
    seedPromise = null;
    throw error;
  });
  return seedPromise;
}

async function seedDemoRows() {
  const existing = await database()
    .prepare("select id from memories where id = ?")
    .bind(seedRows.at(-1)![0])
    .first();
  if (existing) return;
  const created = '2026-09-10T00:00:00.000Z';
  await database().batch(
    seedRows.map((row) => {
      const [id, userId, title, content, locationName, date, emotion, visibility, anonymous, precision, lat, lng] = row;
      const publicLat = precision === 'approximate' ? blur(lat) : lat;
      const publicLng = precision === 'approximate' ? blur(lng) : lng;
      return database()
        .prepare(`insert or ignore into memories
          (id, user_id, title, content, location_name, memory_date, emotion,
           visibility, is_anonymous, location_precision, latitude, longitude,
           public_latitude, public_longitude, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, userId, title, content, locationName, date,
          emotion, visibility, anonymous, precision, lat, lng, publicLat, publicLng, created, created);
    }),
  );
}

function blur(value: number) {
  return Math.round(value * 100) / 100;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const radians = (degree: number) => (degree * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function mediaByMemoryIds(ids: string[]) {
  const map = new Map<string, MemoryMedia[]>();
  if (!ids.length) return map;
  const placeholders = ids.map(() => '?').join(',');
  const result = await database()
    .prepare(`select id, memory_id, storage_key, mime_type, sort_order from memory_media where memory_id in (${placeholders}) order by sort_order`)
    .bind(...ids)
    .all<MediaRow>();
  for (const row of result.results) {
    const item = { id: row.id, url: `/api/media/${row.id}`, sortOrder: row.sort_order };
    map.set(row.memory_id, [...(map.get(row.memory_id) ?? []), item]);
  }
  return map;
}

async function toMemories(rows: MemoryRow[], viewerId?: string | null, ownerCoordinates = false) {
  const media = await mediaByMemoryIds(rows.map((row) => row.id));
  return rows.map((row): Memory => ({
    id: row.id,
    title: row.title,
    content: row.content,
    location_name: row.location_name,
    memory_date: row.memory_date,
    emotion: row.emotion,
    visibility: row.visibility,
    is_anonymous: Boolean(row.is_anonymous),
    location_precision: row.location_precision,
    lat: ownerCoordinates && row.user_id === viewerId ? row.latitude : row.public_latitude,
    lng: ownerCoordinates && row.user_id === viewerId ? row.longitude : row.public_longitude,
    created_at: row.created_at,
    owned: Boolean(viewerId && row.user_id === viewerId),
    media: media.get(row.id) ?? [],
  }));
}

export async function listPublicMemories(bounds: Bounds, filters: MemoryFilters, limit: number, viewerId?: string | null) {
  await ensureSeedData();
  const clauses = ["visibility = 'public'", 'public_longitude between ? and ?', 'public_latitude between ? and ?'];
  const values: unknown[] = [bounds.west, bounds.east, bounds.south, bounds.north];
  if (filters.year) {
    clauses.push("substr(memory_date, 1, 4) = ?");
    values.push(String(filters.year));
  }
  if (filters.emotions.length) {
    clauses.push(`emotion in (${filters.emotions.map(() => '?').join(',')})`);
    values.push(...filters.emotions);
  }
  const result = await database()
    .prepare(`select * from memories where ${clauses.join(' and ')} order by coalesce(memory_date, created_at) desc limit ?`)
    .bind(...values, limit + 1)
    .all<MemoryRow>();
  const hasMore = result.results.length > limit;
  return { memories: await toMemories(result.results.slice(0, limit), viewerId), hasMore };
}

export async function getMemory(id: string, viewerId?: string | null) {
  await ensureSeedData();
  const row = await database().prepare('select * from memories where id = ?').bind(id).first<MemoryRow>();
  if (!row) return null;
  const owned = viewerId === row.user_id;
  if (row.visibility !== 'public' && !owned) return null;
  return (await toMemories([row], viewerId, owned))[0];
}

export async function listUserMemories(userId: string, filters: Omit<UserMemoryFilters, 'limit'>, limit = 300) {
  const clauses = ['user_id = ?'];
  const values: unknown[] = [userId];
  if (filters.visibility) { clauses.push('visibility = ?'); values.push(filters.visibility); }
  if (filters.year) { clauses.push("substr(memory_date, 1, 4) = ?"); values.push(String(filters.year)); }
  if (filters.emotions.length) { clauses.push(`emotion in (${filters.emotions.map(() => '?').join(',')})`); values.push(...filters.emotions); }
  const result = await database().prepare(`select * from memories where ${clauses.join(' and ')} order by coalesce(memory_date, created_at) desc limit ?`).bind(...values, limit).all<MemoryRow>();
  return toMemories(result.results, userId, true);
}

export async function createMemory(user: ChatGPTUser, input: CreateMemoryInput, uploads: StoredUpload[]) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const publicLat = input.location_precision === 'approximate' ? blur(input.lat) : input.lat;
  const publicLng = input.location_precision === 'approximate' ? blur(input.lng) : input.lng;
  const statements = [database().prepare(`insert into memories
    (id, user_id, title, content, location_name, memory_date, emotion, visibility,
     is_anonymous, location_precision, latitude, longitude, public_latitude,
     public_longitude, created_at, updated_at)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      id, user.userId, input.title, input.content, input.location_name,
      input.memory_date, input.emotion, input.visibility, input.is_anonymous ? 1 : 0,
      input.location_precision, input.lat, input.lng, publicLat, publicLng, now, now,
    )];
  uploads.forEach((upload, index) => statements.push(database().prepare(`insert into memory_media
    (id, memory_id, storage_key, media_type, mime_type, file_size, sort_order, created_at)
    values (?, ?, ?, 'image', ?, ?, ?, ?)`).bind(upload.id, id, upload.storageKey, upload.mimeType, upload.size, index, now)));
  await database().batch(statements);
  return getMemory(id, user.userId);
}

export async function updateMemory(userId: string, id: string, input: UpdateMemoryInput, uploads: StoredUpload[], removeIds: string[]) {
  const row = await database().prepare('select * from memories where id = ? and user_id = ?').bind(id, userId).first<MemoryRow>();
  if (!row) return null;
  const now = new Date().toISOString();
  await database().prepare(`update memories set title = ?, content = ?, memory_date = ?, emotion = ?, visibility = ?, is_anonymous = ?, updated_at = ? where id = ? and user_id = ?`)
    .bind(input.title, input.content, input.memory_date, input.emotion, input.visibility, input.is_anonymous ? 1 : 0, now, id, userId).run();
  if (removeIds.length) {
    const placeholders = removeIds.map(() => '?').join(',');
    const doomed = await database().prepare(`select * from memory_media where memory_id = ? and id in (${placeholders})`).bind(id, ...removeIds).all<MediaRow>();
    await Promise.all(doomed.results.map((media) => objectBucket().delete(media.storage_key)));
    await database().prepare(`delete from memory_media where memory_id = ? and id in (${placeholders})`).bind(id, ...removeIds).run();
  }
  const count = await database().prepare('select count(*) as count from memory_media where memory_id = ?').bind(id).first<{ count: number }>();
  if ((count?.count ?? 0) + uploads.length > 5) throw new Error('사진은 최대 5장까지 첨부할 수 있어요.');
  if (uploads.length) {
    await database().batch(uploads.map((upload, index) => database().prepare(`insert into memory_media
      (id, memory_id, storage_key, media_type, mime_type, file_size, sort_order, created_at)
      values (?, ?, ?, 'image', ?, ?, ?, ?)`).bind(upload.id, id, upload.storageKey, upload.mimeType, upload.size, (count?.count ?? 0) + index, now)));
  }
  return getMemory(id, userId);
}

export async function deleteMemory(userId: string, id: string) {
  const row = await database().prepare('select id from memories where id = ? and user_id = ?').bind(id, userId).first();
  if (!row) return false;
  const media = await database().prepare('select * from memory_media where memory_id = ?').bind(id).all<MediaRow>();
  await Promise.all(media.results.map((item) => objectBucket().delete(item.storage_key)));
  await database().prepare('delete from memories where id = ? and user_id = ?').bind(id, userId).run();
  return true;
}

export async function nearbyMemories(lat: number, lng: number, radius: number, limit: number, viewerId?: string | null): Promise<PlaceMemoryGroup> {
  await ensureSeedData();
  const latDelta = radius / 111_320;
  const lngDelta = radius / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  const result = await database().prepare(`select * from memories where visibility = 'public' and public_latitude between ? and ? and public_longitude between ? and ?`)
    .bind(lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta).all<MemoryRow>();
  const rows = result.results.map((row) => ({ row, distance: haversineMeters(lat, lng, row.public_latitude, row.public_longitude) })).filter((item) => item.distance <= radius).sort((a, b) => a.distance - b.distance);
  const selected = rows.slice(0, limit);
  const memories = await toMemories(selected.map((item) => item.row), viewerId);
  const emotionCount = new Map<Emotion, number>();
  memories.forEach((memory) => emotionCount.set(memory.emotion, (emotionCount.get(memory.emotion) ?? 0) + 1));
  return {
    center: { latitude: lat, longitude: lng },
    placeName: memories[0]?.location_name ?? '이 장소',
    memoryCount: rows.length,
    hasMore: rows.length > limit,
    emotionSummary: Array.from(emotionCount, ([emotion, count]) => ({ emotion, count })),
    memories: memories.map((memory, index) => ({
      id: memory.id, title: memory.title, contentPreview: memory.content.slice(0, 130),
      memoryDate: memory.memory_date, emotion: memory.emotion, latitude: memory.lat,
      longitude: memory.lng, isAnonymous: memory.is_anonymous,
      distanceMeters: Math.round(selected[index].distance), firstImageUrl: memory.media[0]?.url ?? null,
    })),
  };
}

export async function getMediaRecord(id: string, viewerId?: string | null) {
  const row = await database().prepare(`select mm.*, m.visibility, m.user_id from memory_media mm join memories m on m.id = mm.memory_id where mm.id = ?`).bind(id).first<MediaRow & { visibility: Visibility; user_id: string }>();
  if (!row || (row.visibility !== 'public' && row.user_id !== viewerId)) return null;
  return row;
}
