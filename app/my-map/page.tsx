import MyMemoryMap from '@/components/my-memory-map';
import { parseUserMemoryFilters } from '@/src/features/memories/filters';
import { requireChatGPTUser } from '@/app/chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function MyMapPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireChatGPTUser('/my-map');
  return <MyMemoryMap displayName={user.displayName} initialFilters={parseUserMemoryFilters(await searchParams)} />;
}
