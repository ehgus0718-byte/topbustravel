import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { searchSuggestions } from "@/lib/api/products";

export async function GET(req: Request) {
  const kw = new URL(req.url).searchParams.get("q") || "";
  if (!kw.trim()) return NextResponse.json({ items: [] });
  try {
    const sb = createServerSupabase();
    const items = await searchSuggestions(sb, kw);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[search/suggest]", e);
    return NextResponse.json({ items: [] });
  }
}
