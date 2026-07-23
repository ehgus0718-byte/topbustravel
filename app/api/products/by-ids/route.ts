import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProductsByIds } from "@/lib/api/products";

export async function GET(req: Request) {
  const idsParam = new URL(req.url).searchParams.get("ids") || "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
  if (ids.length === 0) return NextResponse.json({ items: [] });
  try {
    const sb = createServerSupabase();
    const items = await getProductsByIds(sb, ids);
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[products/by-ids]", e);
    return NextResponse.json({ items: [] });
  }
}
