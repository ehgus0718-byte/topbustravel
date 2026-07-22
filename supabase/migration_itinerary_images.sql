-- ============================================================
-- 여행일정 사진 카드 기능 (1단계)
-- Supabase SQL Editor에서 실행 — 기존 데이터에 영향 없음
-- ============================================================

-- 일정 항목별 사진 목록 (빈 배열 기본값 → 기존 일정은 그대로 텍스트만 표시됨)
alter table public.itinerary_items
  add column if not exists image_urls text[] not null default '{}';
