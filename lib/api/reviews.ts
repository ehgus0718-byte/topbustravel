import type { SupabaseClient } from "@supabase/supabase-js";

// 공개 리뷰 작성 요청 — 관리자 승인(is_visible=true) 후 노출
export async function submitReview(
  sb: SupabaseClient,
  input: { product_id: string; author_name: string; rating: number; content: string }
) {
  // 클라이언트에서는 서버 API(/api/reviews)를 호출하는 것을 권장.
  // 이 함수는 서버(service role)에서 사용.
  const { error } = await sb.from("reviews").insert({ ...input, is_visible: false });
  if (error) throw error;
}
