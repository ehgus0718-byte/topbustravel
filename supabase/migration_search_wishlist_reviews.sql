-- ============================================================
-- 찜(위시리스트) + 리뷰 사진 + 검색 성능 인덱스
-- Supabase SQL Editor에서 실행 — 기존 테이블/데이터에 영향 없음
-- ============================================================

-- 1) 찜(위시리스트) — 로그인 회원만 (user_uid = 세션의 SessionUser.uid)
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_uid text not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_uid, product_id)
);
alter table public.wishlists enable row level security;
-- 공개 정책 없음 — 서버 API(세션 검증)를 통해서만 접근 (reservations와 동일한 방식)

create index if not exists wishlists_user_idx on public.wishlists (user_uid);

-- 2) 리뷰 사진 첨부
alter table public.reviews
  add column if not exists image_urls text[] not null default '{}';

-- 3) 상품명 검색 성능 (한글 부분일치 검색 가속)
create extension if not exists pg_trgm;
create index if not exists products_title_trgm_idx
  on public.products using gin (title gin_trgm_ops);
