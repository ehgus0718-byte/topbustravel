import { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

// POST: 이미지 업로드 → Supabase Storage(product-images) → 공개 URL 반환
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "8MB 이하 이미지만 업로드할 수 있습니다." }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const sb = createAdminSupabase();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await sb.storage
      .from("product-images")
      .upload(path, buf, { contentType: file.type || "image/jpeg" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = sb.storage.from("product-images").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "업로드 실패" }, { status: 500 });
  }
}
