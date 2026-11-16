import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// 상태 점검용 엔드포인트 — 외부 업타임 감시(5분 간격)가 호출합니다.
// - 앱이 살아 있고 DB 조회까지 성공해야 200 + "status":"ok"
// - DB 조회가 실패하거나 3초 안에 응답이 없으면 503 + "status":"db_error"
// - 호출될 때마다 DB를 1회 조회하므로 Supabase 무료 플랜의 무사용 정지도 함께 예방됩니다.
// 공개 데이터(categories) 1건만 읽고, 개인정보·키 등은 응답에 담지 않습니다.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DB_TIMEOUT_MS = 3000;

function mb(bytes: number) {
  return Math.round((bytes / 1024 / 1024) * 10) / 10;
}

export async function GET() {
  const started = Date.now();
  let db: "ok" | "error" = "error";

  try {
    const sb = createServerSupabase();
    const query = sb.from("categories").select("id").limit(1);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("db timeout")), DB_TIMEOUT_MS)
    );
    const { error } = await Promise.race([query, timeout]);
    if (!error) db = "ok";
    else console.error("[health] db error:", error.message);
  } catch (e) {
    console.error("[health] db check failed:", e instanceof Error ? e.message : e);
  }

  const mem = process.memoryUsage();
  const body = {
    status: db === "ok" ? "ok" : "db_error",
    db,
    db_ms: Date.now() - started,
    uptime_min: Math.round(process.uptime() / 60),
    memory_mb: {
      rss: mb(mem.rss),
      heap_used: mb(mem.heapUsed),
      heap_total: mb(mem.heapTotal),
      external: mb(mem.external),
    },
    time: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: db === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
