import { getChatGPTUser } from '@/app/chatgpt-auth';
import { boundsSchema, createMemorySchema } from '@/src/features/memories/schemas';
import { createMemory, listPublicMemories } from '@/src/server/memory-store';
import { assertSameOrigin, errorResponse, queryObject } from '@/src/server/responses';
import { readMemoryForm, removeStoredImages, storeImages } from '@/src/server/uploads';

export async function GET(request: Request) {
  try {
    const query = boundsSchema.parse(queryObject(request));
    const viewer = await getChatGPTUser();
    const result = await listPublicMemories(query, query, query.limit, viewer?.userId);
    return Response.json({ data: result.memories, meta: { hasMore: result.hasMore } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  let uploads = [] as Awaited<ReturnType<typeof storeImages>>;
  try {
    assertSameOrigin(request);
    const form = readMemoryForm(await request.formData());
    const input = createMemorySchema.parse(form.memory);
    uploads = await storeImages(form.images, user.userId);
    const memory = await createMemory(user, input, uploads);
    return Response.json({ data: memory }, { status: 201 });
  } catch (error) {
    await removeStoredImages(uploads);
    return errorResponse(error);
  }
}
