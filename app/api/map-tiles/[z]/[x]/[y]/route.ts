type Context = { params: Promise<{ z: string; x: string; y: string }> };

export async function GET(_: Request, context: Context) {
  const params = await context.params;
  const z = Number(params.z);
  const x = Number(params.x);
  const y = Number(params.y);
  const edge = 2 ** z;

  if (
    !Number.isInteger(z) ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    z < 0 ||
    z > 19 ||
    x < 0 ||
    y < 0 ||
    x >= edge ||
    y >= edge
  ) {
    return new Response('Invalid map tile', { status: 400 });
  }

  const upstream = await fetch(
    `https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
    { headers: { accept: 'image/png' } },
  );
  if (!upstream.ok || !upstream.body) {
    return new Response('Map tile unavailable', { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'image/png',
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      'x-content-type-options': 'nosniff',
    },
  });
}
