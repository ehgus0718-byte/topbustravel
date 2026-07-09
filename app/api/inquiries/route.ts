import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// POST /api/inquiries — 문의 접수
export async function POST(req: Request) {
  try {
    const { name, phone, message, product_id } = await req.json();
    if (!name?.trim() || !phone || !message?.trim()) {
      return NextResponse.json({ error: "필수 정보가 누락되었습니다." }, { status: 400 });
    }
    const sb = createAdminSupabase();
    const { error } = await sb.from("inquiries").insert({
      name: String(name).trim().slice(0, 50),
      phone: String(phone).slice(0, 20),
      message: String(message).trim().slice(0, 2000),
      product_id: product_id || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[inquiries POST]", e);
    return NextResponse.json({ error: "접수 중 오류가 발생했습니다." }, { status: 500 });
  }
}
