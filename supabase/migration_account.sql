-- ============================================================
-- 회원 계정 관리 (번호 변경 / 탈퇴 유예 / 변경 이력)
-- Supabase SQL Editor에서 실행 — 기존 데이터 보존
-- ============================================================

-- 1) 예약 ↔ 회원 연결
--    지금은 마이페이지가 전화번호로만 예약을 찾기 때문에,
--    번호를 바꾸면 과거 예약이 사라진다. 회원 고유번호를 함께 저장해 해결.
alter table public.reservations
  add column if not exists user_uid text;

-- 기존 예약을 전화번호로 매칭해 한 번 채워 넣기 (이미 채워진 건 건드리지 않음)
update public.reservations r
   set user_uid = u.id::text
  from public.users u
 where r.user_uid is null
   and r.customer_phone = u.phone;

create index if not exists reservations_user_uid_idx
  on public.reservations (user_uid);

-- 2) 회원 탈퇴 유예 (신청 즉시 계정 잠금 → 유예기간 후 실제 삭제)
alter table public.users
  add column if not exists withdraw_requested_at timestamptz;
alter table public.users
  add column if not exists withdraw_scheduled_at timestamptz;

-- 3) 전화번호 변경 이력 (분쟁 대비 — 누가 언제 어떤 번호로 바꿨는지)
create table if not exists public.user_phone_changes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  old_phone text not null,
  new_phone text not null,
  changed_by text not null default 'user',   -- 'user' | 'admin'
  created_at timestamptz not null default now()
);
alter table public.user_phone_changes enable row level security;
-- 공개 정책 없음 — 서버(서비스롤)에서만 접근

create index if not exists user_phone_changes_user_idx
  on public.user_phone_changes (user_id);
