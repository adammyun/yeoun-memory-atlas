import { getChatGPTUser } from '@/app/chatgpt-auth';
import { userMemoryFiltersSchema } from '@/src/features/memories/schemas';
import { listUserMemories } from '@/src/server/memory-store';
import { errorResponse, queryObject } from '@/src/server/responses';

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: '로그인이 필요합니다.' }, { status: 401 });
  try {
    const query = userMemoryFiltersSchema.parse(queryObject(request));
    return Response.json({ data: await listUserMemories(user.userId, query, query.limit) });
  } catch (error) { return errorResponse(error); }
}
