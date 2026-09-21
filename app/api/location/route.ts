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
    return Response.json(
      { message: '지역 위치를 확인할 수 없습니다.' },
      { status: 404 },
    );
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
