# topBustravel 🚌

버스 타고 떠나는 가장 쉬운 여행 — 모바일 중심 여행사 홈페이지

## 기술 스택

- **Next.js 15** (App Router, TypeScript) — SSR 기반 SEO, API Routes로 백엔드 통합
- **Tailwind CSS v4** — 모바일 우선 앱 스타일 UI (480px 앱 셸 + 하단 탭바)
- **Supabase** — PostgreSQL DB + Storage(상품 이미지)
- **나이스페이 JS SDK v2** — 카드 결제 (pending reservation 패턴)

## 주요 기능

| 사용자 | 관리자 (`/admin`) |
|---|---|
| 상품 목록/상세 (갤러리, 일정 타임라인, 포함/불포함, 유의사항/환불규정, 리뷰) | 대시보드 (예약/문의 현황) |
| 출발일 캘린더 (날짜별 가격/잔여좌석) | 상품 CRUD (이미지 업로드, 탑승지/일정 편집) |
| 인원(성인/아동/유아) + 탑승지 선택 예약 | 출발일 일괄 등록 (기간+요일) / 가격·마감 관리 |
| 나이스페이 카드 결제 / 무통장 입금 | 예약 상태 변경 (좌석 자동 보정) + 메모 |
| 예약조회 (이름+전화번호) | 리뷰 승인/삭제, 문의 처리, 사이트 설정 |
| 전화/카카오톡 문의 연결 | |

## 프로젝트 구조 (앱 확장 대비)

```
app/
├── (site)/          # 사용자 페이지 (헤더+하단탭바 레이아웃)
├── admin/           # 관리자 페이지 (비밀번호 로그인)
└── api/             # 백엔드 (예약/결제/관리자 API)
components/          # UI 컴포넌트 (화면 전용)
lib/
├── api/             # ★ 데이터 접근 레이어 — React Native 앱에서 그대로 재사용
├── supabase/        # 클라이언트 3종 (browser / server / service-role)
├── auth.ts          # 관리자 인증 토큰
└── format.ts        # 가격/날짜/전화번호 포맷
types/               # 공유 타입 — 앱에서 그대로 재사용
supabase/            # schema.sql + seed.sql
```

**앱 연동 전략**: `lib/api/` + `types/`는 UI에 의존하지 않는 순수 함수/타입입니다.
React Native 앱을 만들 때 이 두 폴더를 복사하고 Supabase 클라이언트만 주입하면
동일한 데이터 로직을 사용할 수 있습니다. 결제/예약 생성은 이 사이트의
`/api/reservations`, `/api/payments/return`을 앱에서도 그대로 호출하면 됩니다.

## 설치

### 1. Supabase 준비

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행 (테이블 + RLS + Storage 버킷)
3. (선택) `supabase/seed.sql` 실행 — 샘플 상품 3개 + 출발일/일정/리뷰
4. Settings → API에서 `URL`, `anon key`, `service_role key` 복사

### 2. 환경변수

```bash
cp .env.example .env
# .env 파일을 열어 값 입력
```

| 변수 | 설명 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 공개 키 (읽기 전용, RLS 적용) |
| `SUPABASE_SERVICE_ROLE_KEY` | 서비스 키 (서버 전용, 절대 노출 금지) |
| `NEXT_PUBLIC_SITE_URL` | 배포 도메인 (결제 returnUrl에 사용) |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 |
| `NICEPAY_CLIENT_ID` / `NICEPAY_SECRET_KEY` | 나이스페이 키 (JS SDK v2용) |

### 3. 실행

```bash
npm install
npm run dev     # 개발: http://localhost:3000
npm run build && npm start   # 프로덕션
```

## AI SPACE (Café24) 배포

1. GitHub 저장소에 push
2. AI SPACE에서 Node.js 런타임으로 배포 (빈 스페이스 필요)
3. 프로젝트 환경변수에 위 6개 변수 등록
4. 도메인 연결 후 `NEXT_PUBLIC_SITE_URL`을 실제 도메인으로 변경

> **메모리 주의**: lite 스페이스(256MB)에서 Next.js SSR은 여유가 크지 않습니다.
> 빌드가 메모리 부족으로 실패하면 로컬/CI에서 빌드 후 `.next` 포함 업로드를 검토하세요.

## 나이스페이 결제 흐름 (pending reservation 패턴)

```
[예약 페이지] → POST /api/reservations
                └ DB에 pending 예약 생성, UUID 반환 (서버가 금액 재계산)
[클라이언트] → AUTHNICE.requestPay(orderId=UUID)
[나이스페이] → POST /api/payments/return (인증 결과)
                ├ UUID로 예약 조회 → 금액 대조 (위변조 검증)
                ├ 승인 API 호출 (Basic clientId:secretKey)
                └ 성공: status=paid + 좌석 증가 → /reservation/complete
```

- `orderId(Moid)` = 예약 UUID → PG 파라미터에 의존하지 않고 DB에서 모든 정보 조회
- 무통장 입금은 pending 상태로 접수 → 관리자가 입금 확인 후 "예약확정" 처리

## TODO (2차 작업)

- [ ] SMS 알림 연동 — `app/api/payments/return/route.ts`의 TODO 지점에
      기존 `send-reservation-status-sms` 로직 이식
- [ ] 나이스페이 실 키 연동 테스트 (샌드박스 → 운영)
- [ ] 파비콘/OG 이미지 (`public/`에 추가)

## 관리자 접속

`/admin` → `.env`의 `ADMIN_PASSWORD`로 로그인 (세션 7일 유지)
