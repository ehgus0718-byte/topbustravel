import type { SupabaseClient } from "@supabase/supabase-js";

export interface FloatingButton {
  id: string;
  label: string;
  link_url: string;
  icon_url: string | null;
  new_tab: boolean;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
}

/**
 * 사이트에 노출할 플로팅 링크 버튼 조회
 * - is_visible = true
 * - sort_order 오름차순, 최대 3개 (화면을 가리지 않는 상한)
 */
export async function getActiveFloatingButtons(
  sb: SupabaseClient
): Promise<FloatingButton[]> {
  const { data, error } = await sb
    .from("floating_buttons")
    .select("*")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(3);
  if (error) throw error;
  return (data ?? []) as FloatingButton[];
}
