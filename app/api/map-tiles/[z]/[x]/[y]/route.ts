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

  const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    headers: {
      accept: 'image/png',
      'user-agent':
        'YeounMemoryAtlas/1.0 (+https://yeoun-memory-atlas.finn7132.chatgpt.site)',
    },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response('Map tile unavailable', { status: 502 });
  }

  const headers = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'image/png',
    'cache-control':
      upstream.headers.get('cache-control') ??
      'public, max-age=604800, stale-while-revalidate=86400',
    'x-content-type-options': 'nosniff',
  });
  for (const name of ['etag', 'expires', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(upstream.body, { headers });
}
