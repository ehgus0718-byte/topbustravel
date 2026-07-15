import type { SupabaseClient } from "@supabase/supabase-js";

export interface Popup {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
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
 * 홈에 노출할 활성 팝업 조회
 * - is_visible = true
 * - 시작일/종료일 범위 안 (null이면 제한 없음)
 * - sort_order 오름차순, 최대 5개
 */
export async function getActivePopups(sb: SupabaseClient): Promise<Popup[]> {
  const today = todayKST();
  const { data, error } = await sb
    .from("popups")
    .select("*")
    .eq("is_visible", true)
    .or(`starts_on.is.null,starts_on.lte.${today}`)
    .or(`ends_on.is.null,ends_on.gte.${today}`)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return (data ?? []) as Popup[];
}
