import { getChatGPTUser } from '@/app/chatgpt-auth';
import { nearLocationSchema } from '@/src/features/memories/schemas';
import { nearbyMemories } from '@/src/server/memory-store';
import { errorResponse, queryObject } from '@/src/server/responses';

export async function GET(request: Request) {
  try {
    const query = nearLocationSchema.parse(queryObject(request));
    const user = await getChatGPTUser();
    return Response.json({ data: await nearbyMemories(query.lat, query.lng, query.radiusMeters, query.limit, user?.userId) });
  } catch (error) { return errorResponse(error); }
}
