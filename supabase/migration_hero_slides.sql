-- ============================================================
-- 홈 히어로 슬라이드 (관리자 관리형)
-- Supabase SQL Editor에서 실행 — 기존 테이블/데이터에 영향 없음
-- ============================================================

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  badge text,                                -- 사진 위 작은 배지 (선택, 예: 7월 출발확정)
  title text not null,                       -- 큰 제목 (한 줄 권장)
  subtitle text,                             -- 부제 (선택, 한 줄 권장)
  image_url text not null,                   -- 배경 사진 (필수)
  link_url text,                             -- 클릭 시 이동 (선택, /products/슬러그 또는 https://...)
  starts_on date,                            -- 노출 시작일 (비우면 제한 없음)
  ends_on date,                              -- 노출 종료일 (비우면 제한 없음)
  sort_order int not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.hero_slides enable row level security;

-- 공개 읽기: 노출 중인 슬라이드만 (쓰기는 서비스롤 전용 = 관리자 API)
create policy "public read hero slides" on public.hero_slides
  for select using (is_visible);
