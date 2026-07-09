import { createClient } from "@supabase/supabase-js";

// 서버 컴포넌트용 클라이언트 (anon key) — SSR 공개 데이터 조회
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}
