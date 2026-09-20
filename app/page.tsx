import MemoryApp from '@/components/memory-app';
import { parseMemoryFilters } from '@/src/features/memories/filters';
import { getChatGPTUser } from './chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <MemoryApp isAuthenticated={Boolean(await getChatGPTUser())} initialFilters={parseMemoryFilters(await searchParams)} />;
}
