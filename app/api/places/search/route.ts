import { placeSearchQuerySchema } from '@/src/features/places/schemas';
import { errorResponse, queryObject } from '@/src/server/responses';

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, string | number | undefined>;
};

export async function GET(request: Request) {
  try {
    const { q } = placeSearchQuerySchema.parse(queryObject(request));
    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '7');
    url.searchParams.set('lat', '35.5396');
    url.searchParams.set('lon', '129.3114');
    url.searchParams.set('zoom', '11');
    url.searchParams.set('location_bias_scale', '0.2');
    const response = await fetch(url, { headers: { accept: 'application/geo+json, application/json' } });
    if (!response.ok) throw new Error('장소 검색 서비스에 연결하지 못했습니다.');
    const body = (await response.json()) as { features?: PhotonFeature[] };
    const data = (body.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates || coordinates.some((value) => typeof value !== 'number')) return [];
      const p = feature.properties ?? {};
      const street = [p.street, p.housenumber].filter(Boolean).join(' ');
      const name = String(p.name || street || p.district || p.city || '이름 없는 장소');
      const parts = [street, p.district, p.city, p.county, p.state, p.country]
        .filter((part, index, all) => Boolean(part) && part !== name && all.indexOf(part) === index)
        .map(String);
      return [{
        id: p.osm_id === undefined ? `${coordinates[0]}:${coordinates[1]}:${name}` : `${p.osm_type ?? 'osm'}:${p.osm_id}`,
        name,
        displayName: parts.length ? `${name} · ${parts.join(', ')}` : name,
        longitude: coordinates[0], latitude: coordinates[1],
        type: p.osm_value ? String(p.osm_value) : p.osm_key ? String(p.osm_key) : null,
      }];
    });
    return Response.json({ data });
  } catch (error) { return errorResponse(error); }
}
