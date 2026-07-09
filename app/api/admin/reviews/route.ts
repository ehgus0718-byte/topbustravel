import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// GET: 전체 리뷰 (미승인 포함)
export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("*, product:products(title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reviews: data ?? [] });
}
