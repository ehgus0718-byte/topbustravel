-- ============================================================
-- topBustravel DB Schema  (Supabase SQL Editor에서 실행)
-- ============================================================
create extension if not exists "pgcrypto";

-- 1. 카테고리 (당일여행 / 1박2일 / 테마투어 ...)
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. 여행상품
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  summary text,                              -- 목록 카드 한 줄 소개
  description text,                          -- 상세 설명 (줄바꿈 텍스트)
  duration_text text not null default '당일',
  base_price int not null default 0,         -- 성인 기본가
  child_price int,                           -- null이면 성인가 적용
  infant_price int not null default 0,
  thumbnail_url text,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  includes jsonb not null default '[]'::jsonb,   -- ["버스/기사", "가이드", ...]
  excludes jsonb not null default '[]'::jsonb,
  notices text,                              -- 유의사항
  refund_policy text,                        -- 환불규정
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. 상품 갤러리 이미지
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);

-- 4. 출발일 (날짜별 가격/좌석)
create table public.departures (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  departure_date date not null,
  adult_price int,                           -- null이면 상품 기본가
  child_price int,
  infant_price int,
  total_seats int not null default 40,
  reserved_seats int not null default 0,
  status text not null default 'open',       -- open | closed | canceled
  unique (product_id, departure_date)
);

-- 5. 탑승지
create table public.boarding_points (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,                        -- "서울역 2번출구"
  boarding_time text,                        -- "07:00"
  sort_order int not null default 0
);

-- 6. 여행일정 타임라인
create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  day_no int not null default 1,
  time_text text,                            -- "09:30"
  title text not null,                       -- "황금산 코끼리바위"
  description text,
  sort_order int not null default 0
);

-- 7. 예약 (id = 나이스페이 Moid, pending reservation 패턴)
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  departure_id uuid references public.departures(id) on delete set null,
  boarding_point_id uuid references public.boarding_points(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  adult_count int not null default 1,
  child_count int not null default 0,
  infant_count int not null default 0,
  total_amount int not null default 0,
  status text not null default 'pending',    -- pending | paid | confirmed | canceled | refunded
  payment_method text,                       -- card | bank
  payment_tid text,
  paid_at timestamptz,
  request_memo text,                         -- 고객 요청사항
  admin_note text,                           -- 관리자 메모
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. 리뷰 (관리자 승인 후 노출)
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  author_name text not null,
  rating int not null default 5 check (rating between 1 and 5),
  content text not null,
  is_visible boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. 문의
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  phone text not null,
  message text not null,
  status text not null default 'new',        -- new | done
  created_at timestamptz not null default now()
);

-- 10. 사이트 설정
create table public.site_settings (
  key text primary key,
  value text not null default ''
);

insert into public.site_settings (key, value) values
  ('tel', '042-000-0000'),
  ('kakao_url', 'https://pf.kakao.com/_your_channel'),
  ('bank_account', '국민은행 000000-00-000000 (예금주: topBustravel)'),
  ('company_info', '상호: topBustravel | 대표: 홍길동 | 사업자등록번호: 000-00-00000 | 통신판매업신고: 제0000-대전유성-0000호 | 주소: 대전광역시');

-- 인덱스
create index idx_departures_product_date on public.departures (product_id, departure_date);
create index idx_reservations_created on public.reservations (created_at desc);
create index idx_reservations_phone on public.reservations (customer_phone);
create index idx_products_category on public.products (category_id);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_reservations_updated before update on public.reservations
  for each row execute function public.set_updated_at();

-- 좌석 증가 (결제 완료 시 원자적 처리)
create or replace function public.increment_reserved_seats(dep_id uuid, cnt int)
returns void language sql security definer as $$
  update public.departures set reserved_seats = reserved_seats + cnt where id = dep_id;
$$;

-- ============================================================
-- RLS: 공개 데이터는 anon 읽기 허용, 쓰기는 전부 서버(service role)만
-- ============================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.departures enable row level security;
alter table public.boarding_points enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.reservations enable row level security;
alter table public.reviews enable row level security;
alter table public.inquiries enable row level security;
alter table public.site_settings enable row level security;

create policy "public read categories" on public.categories for select using (is_active);
create policy "public read products" on public.products for select using (is_active);
create policy "public read images" on public.product_images for select using (true);
create policy "public read departures" on public.departures for select using (true);
create policy "public read boarding" on public.boarding_points for select using (true);
create policy "public read itinerary" on public.itinerary_items for select using (true);
create policy "public read reviews" on public.reviews for select using (is_visible);
create policy "public read settings" on public.site_settings for select using (true);
-- reservations / inquiries: 공개 정책 없음 → 서버 API를 통해서만 접근

-- ============================================================
-- Storage: 상품 이미지 버킷 (공개)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
