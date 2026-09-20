import { getChatGPTUser } from '@/app/chatgpt-auth';
import { memoryIdSchema } from '@/src/features/memories/schemas';
import { getMediaRecord, objectBucket } from '@/src/server/memory-store';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const parsed = memoryIdSchema.safeParse((await context.params).id);
  if (!parsed.success) return new Response('Not found', { status: 404 });
  const user = await getChatGPTUser();
  const media = await getMediaRecord(parsed.data, user?.userId);
  if (!media) return new Response('Not found', { status: 404 });
  const object = await objectBucket().get(media.storage_key);
  if (!object) return new Response('Not found', { status: 404 });
  return new Response(object.body, {
    headers: {
      'content-type': media.mime_type,
      'cache-control': media.visibility === 'public' ? 'public, max-age=3600' : 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
