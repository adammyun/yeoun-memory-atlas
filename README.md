# 여운 hosted target

기존 `work/site`의 PostgreSQL/PostGIS 애플리케이션을 유지하면서, 현재 Sites 미리보기에서 실제로 실행할 수 있도록 만든 Cloudflare Worker 배포 타깃입니다.

## 구조

- Vinext/Next.js App Router UI
- Cloudflare D1: 배포 환경의 구조화된 기억 데이터
- Cloudflare R2: 사진 원본 저장
- Sign in with ChatGPT: 배포 환경 사용자 식별
- Route Handler → `src/server/memory-store.ts` → D1/R2 경계

공개 지도 API는 `visibility = 'public'` 조건을 서버에서 강제합니다. 비공개 및 링크 공유 기억은 소유자만 읽을 수 있습니다. `approximate` 위치는 원좌표와 공개 좌표를 별도로 저장하며, 공개 API는 반올림된 공개 좌표만 반환합니다. 공개 응답에는 `user_id`가 포함되지 않습니다.

## 로컬 실행

일반 개발 환경에서는 Node.js 22와 pnpm 11을 설치한 뒤 아래 명령을 실행합니다.

```bash
pnpm install
pnpm db:generate
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_charming_sunfire.sql
pnpm dev
```

개발 서버의 `/signin-with-chatgpt?return_to=/` 경로는 로컬 모의 사용자로 로그인합니다. 빌드된 Worker의 `pnpm start`는 인증을 모의하지 않습니다.

## 검증

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

공개 API 예시:

```bash
curl 'http://127.0.0.1:5173/api/memories?west=129.1&south=35.3&east=129.6&north=35.8&limit=200'
```

## 원본 애플리케이션과의 관계

`work/site`는 개발·향후 일반 Node.js 배포용 PostgreSQL/PostGIS 구현입니다. 이 디렉터리는 raw TCP 데이터베이스 연결을 지원하지 않는 Sites 런타임을 위한 얇은 배포 타깃입니다. 제품 UI, DTO, 검증 규칙은 공유 가능한 형태로 유지하되 저장소 어댑터만 D1/R2로 교체했습니다.
