import { getChatGPTUser } from '@/app/chatgpt-auth';
import { memoryIdSchema, updateMemorySchema } from '@/src/features/memories/schemas';
import { deleteMemory, getMemory, updateMemory } from '@/src/server/memory-store';
import { assertSameOrigin, errorResponse } from '@/src/server/responses';
import { readMemoryForm, removeStoredImages, storeImages } from '@/src/server/uploads';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  try {
    const id = memoryIdSchema.parse((await context.params).id);
    const user = await getChatGPTUser();
    const memory = await getMemory(id, user?.userId);
    if (!memory) return Response.json({ message: '기억을 찾지 못했습니다.' }, { status: 404 });
    return Response.json({ data: memory });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  let uploads = [] as Awaited<ReturnType<typeof storeImages>>;
  try {
    assertSameOrigin(request);
    const id = memoryIdSchema.parse((await context.params).id);
    const form = readMemoryForm(await request.formData());
    const input = updateMemorySchema.parse(form.memory);
    uploads = await storeImages(form.images, user.userId);
    const memory = await updateMemory(user.userId, id, input, uploads, form.removeMediaIds);
    if (!memory) { await removeStoredImages(uploads); return Response.json({ message: '기억을 찾지 못했습니다.' }, { status: 404 }); }
    return Response.json({ data: memory });
  } catch (error) {
    await removeStoredImages(uploads);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  try {
    assertSameOrigin(request);
    const id = memoryIdSchema.parse((await context.params).id);
    if (!(await deleteMemory(user.userId, id))) return Response.json({ message: '기억을 찾지 못했습니다.' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) { return errorResponse(error); }
}
