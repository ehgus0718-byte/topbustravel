import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET() {
  const sb = createAdminSupabase();
  const { data, error } = await sb.from("site_settings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;
  return NextResponse.json({ settings });
}

// PUT: { settings: { key: value, ... } }
export async function PUT(req: Request) {
  const { settings } = await req.json();
  const sb = createAdminSupabase();
  const rows = Object.entries(settings ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
  const { error } = await sb.from("site_settings").upsert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
