import { DEFAULT_MAP_CENTER } from '@/src/features/map/constants';

type CloudflareLocation = {
  city?: string;
  region?: string;
  latitude?: string;
  longitude?: string;
};

export async function GET(request: Request) {
  const cf = request.cf as CloudflareLocation | undefined;
  const lat = Number(cf?.latitude);
  const lng = Number(cf?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({
      data: {
        ...DEFAULT_MAP_CENTER,
        label: '울산광역시',
        precision: 'fallback',
      },
    });
  }
  const place = cf?.city || cf?.region;
  return Response.json({
    data: {
      lat,
      lng,
      label: place ? `${place} 주변` : '현재 지역 주변',
      precision: 'regional',
    },
  });
}
