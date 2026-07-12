import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "이벤트",
  description: "탑버스트래블 진행중인 이벤트",
};

function eventStatus(starts?: string | null, ends?: string | null): {
  label: string;
  cls: string;
} | null {
  const today = new Date().toISOString().slice(0, 10);
  if (ends && today > ends) return { label: "종료", cls: "bg-canvas text-faint" };
  if (starts && today < starts) return { label: "예정", cls: "bg-canvas text-sub" };
  if (starts || ends) return { label: "진행중", cls: "bg-primary text-white" };
  return null;
}

export default async function EventsPage() {
  const sb = createAdminSupabase();
  const { data: events } = await sb
    .from("events")
    .select("id, title, content, banner_url, starts_on, ends_on, created_at")
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20 pt-8 md:pt-12">
      <h1 className="text-[22px] font-extrabold md:text-3xl">이벤트</h1>
      <p className="mt-1.5 text-[13px] text-sub md:text-sm">
        진행 중인 이벤트와 혜택을 확인하세요.
      </p>

      {!events || events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line px-5 py-14 text-center">
          <p className="text-sm text-faint">진행 중인 이벤트가 없습니다.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {events.map((ev: any) => {
            const st = eventStatus(ev.starts_on, ev.ends_on);
            return (
              <li
                key={ev.id}
                className="overflow-hidden rounded-2xl border border-line"
              >
                {ev.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.banner_url}
                    alt={ev.title}
                    className="w-full object-cover"
                  />
                )}
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-2">
                    {st && (
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    )}
                    <h2 className="text-[16px] font-bold leading-snug md:text-lg">
                      {ev.title}
                    </h2>
                  </div>
                  {(ev.starts_on || ev.ends_on) && (
                    <p className="mt-1.5 text-[13px] font-semibold text-primary">
                      {ev.starts_on ?? ""}
                      {ev.starts_on && ev.ends_on ? " ~ " : ""}
                      {ev.ends_on ?? ""}
                    </p>
                  )}
                  {ev.content && (
                    <p className="prewrap mt-2.5 text-[14px] leading-relaxed text-ink">
                      {ev.content}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
