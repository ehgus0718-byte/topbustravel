"use client";
import { createClient } from "@supabase/supabase-js";

// 브라우저용 클라이언트 (anon key) — 공개 데이터 조회 전용
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
