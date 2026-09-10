import { validateDraft } from './validation';
import { getSupabase } from './supabase';
import { type Bounds, type Memory, type MemoryDraft } from './types';
export async function fetchMemories(
  bounds: Bounds,
  ownOnly: boolean,
  signal: AbortSignal,
): Promise<{ memories: Memory[]; limited: boolean }> {
  const db = getSupabase();
  if (!db) throw new Error('Supabase 연결이 필요합니다.');
  const { data, error } = await db
    .rpc('map_memories', { ...bounds, own_only: ownOnly })
    .abortSignal(signal);
  if (error) throw error;
  const rows = (data ?? []) as Memory[];
  return { memories: rows.slice(0, 300), limited: rows.length > 300 };
}
export async function fetchMemory(
  id: string,
  ownOnly: boolean,
  signal: AbortSignal,
): Promise<Memory> {
  const db = getSupabase();
  if (!db) throw new Error('Supabase 연결이 필요합니다.');
  const { data, error } = await db
    .rpc('memory_detail', { memory_id: id, own_only: ownOnly })
    .abortSignal(signal);
  if (error) throw error;
  if (!data?.[0])
    throw new Error(
      '이 기억을 읽을 수 없어요. 공개 설정이 변경되었을 수 있습니다.',
    );
  return data[0] as Memory;
}
export async function saveMemory(input: MemoryDraft) {
  const d = validateDraft(input);
  const db = getSupabase();
  if (!db) throw new Error('Supabase 연결 후 저장할 수 있어요.');
  const { error } = await db
    .from('memories')
    .insert({
      title: d.title,
      content: d.content,
      location: `SRID=4326;POINT(${d.lng} ${d.lat})`,
      location_name: d.location_name,
      memory_date: d.memory_date,
      emotion: d.emotion,
      visibility: d.visibility,
      is_anonymous: d.is_anonymous,
      location_precision: d.location_precision,
    });
  if (error) throw error;
}
