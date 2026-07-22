import type { SupabaseClient } from "@supabase/supabase-js";

export interface HeroSlide {
  id: string;
  badge: string | null;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  starts_on: string | null; // YYYY-MM-DD
  ends_on: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

/** 한국시간 기준 오늘 날짜 (YYYY-MM-DD) */
function todayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * 홈 히어로에 노출할 활성 슬라이드 조회
 * - is_visible = true
 * - 시작일/종료일 범위 안 (null이면 제한 없음)
 * - sort_order 오름차순, 최대 5개 (고객이 실제로 보는 상한)
 */
export async function getActiveHeroSlides(sb: SupabaseClient): Promise<HeroSlide[]> {
  const today = todayKST();
  const { data, error } = await sb
    .from("hero_slides")
    .select("*")
    .eq("is_visible", true)
    .or(`starts_on.is.null,starts_on.lte.${today}`)
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as HeroSlide[];
}
