import DevTools from '@/components/dev/dev-tools';
import { database } from '@/src/server/memory-store';

export const dynamic = 'force-dynamic';

async function databaseIsConfigured() {
  try {
    await database().prepare('select 1').first();
    return true;
  } catch {
    return false;
  }
}

export default async function DevPage() {
  return (
    <DevTools
      databaseConfigured={await databaseIsConfigured()}
      panoramaConfigured={Boolean(
        process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID?.trim(),
      )}
    />
  );
}
