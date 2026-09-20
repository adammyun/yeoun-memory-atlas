import { ZodError } from 'zod';

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return Response.json({ message: '입력한 내용을 다시 확인해 주세요.', issues: error.issues }, { status: 400 });
  }
  if (error instanceof SyntaxError) return Response.json({ message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  const message = error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
  return Response.json({ message }, { status: 400 });
}

export function queryObject(request: Request) {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new Error('허용되지 않은 요청입니다.');
  }
}
