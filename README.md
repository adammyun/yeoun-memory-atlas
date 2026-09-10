# 여운 — 기억이 머무는 지도

모바일 우선의 Next.js + TypeScript / MapLibre GL JS / Supabase Auth + PostgreSQL/PostGIS MVP입니다. 최초 세로 슬라이스만 구현했습니다. 실제 Supabase 연결 정보가 없으면 예시 기억을 보여주며, 로그인이나 저장이 성공한 것처럼 흉내 내지 않습니다. 예시 데이터는 Supabase 데이터와 섞이지 않고 로컬 저장소에도 저장하지 않습니다.

## 실행

Node.js 22.13 이상과 pnpm을 사용합니다.

```sh
pnpm install
cp .env.example .env.local
# 아래 두 환경변수 설정 (연결 없이 UI를 보려면 비워 둡니다)
pnpm dev
```

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: publishable key 또는 legacy anon key. **service_role / secret key를 넣지 마세요.**

`pnpm build`는 Next.js 정적 배포 결과를 `out/`에 생성합니다. `pnpm start`는 이 결과를 localhost:3000에서 미리 봅니다. 개발 환경에서 파일 감시 한도 문제가 있으면 `WATCHPACK_POLLING=true pnpm dev`를 사용합니다. 공급망 정책을 보존했으며, 사용하지 않는 esbuild/sharp/workerd 설치 스크립트는 실행하지 않도록 명시했습니다. 지도와 CSS를 포함한 Next.js 빌드는 webpack을 사용합니다.

## Supabase 설정

1. 새 Supabase 프로젝트의 SQL Editor에서 `supabase/migrations/202609100001_memories.sql`을 실행합니다. 또는 프로젝트를 연결한 Supabase CLI에서 `supabase db push`를 사용합니다. 이 마이그레이션은 PostGIS를 `extensions` 스키마에 설치하는 새 프로젝트를 대상으로 합니다. 다른 스키마에 이미 설치한 경우 확장 스키마를 먼저 맞춰야 합니다.
2. Auth의 Email provider 및 이메일/비밀번호 로그인을 켭니다. 이메일 확인은 활성화 상태를 권장합니다. Authentication → URL Configuration의 Site URL과 Redirect URLs에 앱 주소(개발: `http://localhost:3000`, 배포: 실제 HTTPS origin)를 추가합니다.
3. `.env.local`에 두 공개 환경변수를 설정하고 개발 서버를 재시작하거나 다시 빌드합니다. 정적 Next.js 배포에서는 빌드 시 값이 포함되므로 호스팅 환경변수만 바꾸는 것으로는 반영되지 않습니다.
4. 회원가입 → 이메일 확인 → 로그인 → 지도 위치 클릭 또는 길게 누르기 → 기억 저장 → 나의 기억에서 확인합니다.
5. 다른 계정 또는 시크릿 창에서 공개 기억만 보이는지 확인합니다. 공개 위치 정밀도를 변경하면 `public_location`도 DB 트리거가 다시 계산합니다.

비밀 서버 키를 사용하는 API는 없습니다. 브라우저는 Supabase의 인증된 HTTP API를 호출하며, **권한 경계는 PostgreSQL RLS와 제한된 RPC**에 있습니다. 따라서 정적 호스팅에서도 권한 검사가 DB에서 이루어집니다.

## 구성

```text
app/                         Next.js App Router, 공통 테마, 메타데이터
components/memory-app.tsx     화면 흐름, 세션/조회 상태, 검색
components/memories/map.tsx   MapLibre 수명 주기, 클러스터, 위치 선택
components/memories/          인증 Dialog, 기록 Sheet, 상세 Sheet
components/ui/               제공된 접근성 UI primitives
lib/supabase.ts              브라우저 Supabase 클라이언트
lib/memories.ts              저장 및 안전한 RPC 조회
lib/validation.ts            저장 전 입력 검증 (DB 제약도 적용)
lib/types.ts                 공개 DTO와 타입
lib/demo.ts                  연결 전 표시하는 명시적 예시
supabase/migrations/         PostGIS, 테이블, 공간 인덱스, RLS, RPC
supabase/tests/privacy.sql   두 사용자/비로그인 권한 통합 검증
```

## 구현된 흐름

- 이메일 회원가입/로그인/로그아웃, Supabase의 세션 관리
- 전체 화면 지도, 영역 이동 후 250ms debounce 조회, 이전 요청 취소
- 공개/개인 조회 전환, 감정 필터, 개인 지도 연도/공개 여부 필터
- 클릭/650ms 길게 누르기 또는 ‘기억 남기기’로 지도 중앙 위치 선택
- 장소 이름, 제목, 본문, 날짜, 감정, private/public, 익명, exact/approximate 저장
- MapLibre GeoJSON 클러스터, 클러스터 클릭 시 확대, 마커 선택 시 상세 bottom sheet
- 현재 위치, 제출형 장소 검색 (Nominatim), 로딩/빈 목록/오류/성공 상태
- 기본값 private + anonymous + approximate

## 데이터 및 프라이버시

`memories.location`은 원본 geography(Point, 4326), `public_location`은 공개용 geometry(Point, 4326)입니다. 저장 시 트리거가 exact이면 원본, approximate이면 0.01도 고정 격자로 계산합니다. 원본 공간 인덱스, 공개 geometry의 partial GiST 인덱스, 소유자/날짜 인덱스가 있습니다.

- 원본 테이블은 authenticated 소유자만 SELECT/INSERT/UPDATE/DELETE할 수 있습니다. 공개 기록이라도 타인의 원본 행은 읽을 수 없습니다. anon에게 테이블 권한을 부여하지 않습니다.
- 공개 읽기는 고정된 반환 타입을 가진 `map_memories` / `memory_detail`만 허용합니다. `SECURITY DEFINER` 함수의 search_path를 비우고, 모든 객체를 스키마로 한정하며, 함수 안에서 공개 여부/소유자를 검증합니다.
- 공개 DTO에는 **user_id, 이메일, 프로필, 원본 geography가 아예 없습니다.** anonymous=false인 경우에도 현재 MVP에서는 작성자 프로필을 제공하지 않습니다.
- 공개 영역 검색과 그 결과 개수는 **public_location만** 사용합니다. 원본 좌표로 검색한 뒤 표시만 흐리게 하는 방식이 아닙니다. 따라서 좁은 영역 검색으로 approximate의 원본 좌표를 역추정할 수 없습니다.
- 개인 조회는 auth.uid()를 사용합니다. 클라이언트가 owner ID를 전달할 수 없습니다.
- unlisted는 DB에서 지원하지만 공유 링크/폼 옵션/API 노출은 이번 슬라이스에서 제외했습니다. 소유자 이외에는 조회할 수 없습니다.
- 목록은 본문 180자와 최대 300개를 반환합니다. 301번째 레코드는 제한 초과 감지에만 사용합니다. 전체 개수를 가장하거나 전체 DB를 다운로드하지 않습니다. 상세에서만 전체 본문을 가져옵니다.
- 넓은 지도에서는 최근 300개만 보이므로, 향후 같은 RPC 경계에 zoom 기반 서버 집계/타일 또는 cursor pagination을 추가해야 합니다. 필터는 현재 영역에서 받은 제한된 결과 안에서 동작합니다.
- 클러스터에는 오직 현재 허용된 지도 조회 결과만 들어갑니다. 공개 지도에서 내 비공개 기록도 합치지 않습니다.
- 로그아웃/계정 전환 시 메모리 목록과 상세를 즉시 비우고 이전 요청을 취소합니다.
- 정밀도 보호는 사용자 작성 본문/장소명에 포함된 주소를 자동으로 삭제하지 않습니다. 공개 폼에서 민감한 주소 확인 안내를 제공합니다. 격자 크기는 위도에 따라 실제 거리가 달라집니다.

`memory_media`는 RLS가 적용된 소유자 전용 메타데이터 테이블입니다. Storage 버킷 `memory-images`는 비공개로 생성됩니다. **사진 업로드/열람 UI와 Storage object 정책은 이번 슬라이스에 넣지 않았습니다.** 사진을 추가할 때 EXIF 제거, 공개 여부에 따른 접근 제어, 짧은 유효기간의 전달 방식과 함께 구현해야 합니다. private 사진이 공용 URL로 노출되는 임시 구현은 없습니다.

공개에서 이미 전달된 데이터를 나중에 다른 사용자의 브라우저에서 회수할 수는 없습니다. 공개 여부 변경은 이후 모든 조회에서 즉시 반영됩니다. 지도 공급자에게 지도 타일 요청이, 검색 공급자에게 제출한 장소 검색어가 전달됩니다. 기억 본문이나 작성자 ID를 지도/검색 공급자에게 보내지 않습니다.

## 검증

```sh
pnpm typecheck
pnpm test
pnpm build
# 로컬 Supabase 실행 및 migration 적용 후:
psql "$LOCAL_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/privacy.sql
```

SQL 통합 테스트는 공개/비공개/unlisted, 익명 DTO 필드, 원본 좌표 탐색 차단, 소유자 원본 좌표 읽기, 타인 수정 차단, 공개 취소를 검사하며 롤백합니다. **Supabase 프로젝트 정보와 로컬 PostgreSQL/PostGIS 런타임이 제공되지 않아 SQL 통합 테스트와 실제 이메일/다중 계정 저장 E2E는 아직 실행하지 않았습니다.** 이를 통과하기 전 실사용 데이터로 배포하지 마세요.

브라우저에서 WebMCP를 지원하면 `start_memory_creation`으로 기록 폼을 열 수 있습니다. 이 도구는 저장하거나 공개하지 않습니다. 지원되는 WebMCP 검증 환경이 없어 등록/상태 전환의 실행 검증은 미완료이며 일반 UI 사용에는 필요하지 않습니다.

## 의도적으로 제외

사진 업로드, unlisted 링크 공유, 프로필 시스템, 팔로우, 댓글, 좋아요, 알림, 메시징, 순위. 지도 전체 데이터를 미리 가져오거나 mock 저장소로 실제 저장을 대체하지 않습니다.

## 참고

- [Supabase RLS 및 데이터 보호](https://supabase.com/docs/guides/database/secure-data)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)
- [MapLibre 클러스터](https://maplibre.org/maplibre-gl-js/docs/examples/cluster/)
- [OpenStreetMap 저작권/기여자](https://www.openstreetmap.org/copyright)
