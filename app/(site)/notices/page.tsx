import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "공지사항",
  description: "탑버스트래블 공지사항",
};

export default async function NoticesPage() {
  const sb = createAdminSupabase();
  const { data: notices } = await sb
    .from("notices")
    .select("id, title, content, is_pinned, created_at")
    .eq("is_visible", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-8 md:pt-12">
      <h1 className="text-[22px] font-extrabold md:text-3xl">공지사항</h1>
      <p className="mt-1.5 text-[13px] text-sub md:text-sm">
        탑버스트래블의 소식과 안내를 확인하세요.
      </p>

      {!notices || notices.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line px-5 py-14 text-center">
          <p className="text-sm text-faint">등록된 공지사항이 없습니다.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {notices.map((n: any) => (
            <li key={n.id} className="rounded-2xl border border-line p-4 md:p-5">
              <div className="flex items-start gap-2">
                {n.is_pinned && (
                  <span className="shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold text-primary">
                    중요
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold leading-snug md:text-base">
                    {n.title}
                  </h2>
                  <p className="mt-0.5 text-[12px] text-faint">
                    {new Date(n.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </div>
              </div>
              {n.content && (
                <p className="prewrap mt-3 text-[14px] leading-relaxed text-ink">
                  {n.content}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
