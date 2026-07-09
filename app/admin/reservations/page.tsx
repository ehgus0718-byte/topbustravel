"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { won, fmtDate, fmtDateTime, STATUS_LABEL } from "@/lib/format";

const FILTERS = ["all", "pending", "paid", "confirmed", "canceled", "refunded"];

export default function AdminReservationsPage() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [list, setList] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    const params = new URLSearchParams({ status });
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/admin/reservations?${params}`)
      .then((r) => r.json())
      .then((d) => setList(d.reservations ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const patch = async (id: string, body: any) => {
    await fetch(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <h1 className="mb-3 text-[17px] font-extrabold">예약 관리</h1>

        <div className="mb-3 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="이름 또는 전화번호 검색"
            className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-[14px] outline-none focus:border-primary"
          />
          <button onClick={load} className="rounded-xl bg-ink px-4 text-[13px] font-bold text-white">
            검색
          </button>
        </div>

        <div className="mb-4 flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold ${
                status === f ? "bg-ink text-white" : "border border-line bg-white text-sub"
              }`}
            >
              {f === "all" ? "전체" : STATUS_LABEL[f]}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="rounded-xl border border-line">
              <button
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="flex w-full items-center justify-between gap-2 p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold">
                    {r.customer_name}{" "}
                    <span className="font-medium text-faint">{r.customer_phone}</span>
                  </p>
                  <p className="truncate text-[12px] text-sub">
                    {r.product?.title ?? "-"} ·{" "}
                    {r.departure ? fmtDate(r.departure.departure_date) : "-"} 출발
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-bold">{won(r.total_amount)}</p>
                  <p
                    className={`text-[11px] font-bold ${
                      r.status === "pending"
                        ? "text-accent"
                        : r.status === "paid" || r.status === "confirmed"
                          ? "text-primary"
                          : "text-faint"
                    }`}
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </p>
                </div>
              </button>

              {openId === r.id && (
                <div className="border-t border-line p-3 text-[13px]">
                  <p className="text-sub">
                    예약번호 {r.id.slice(0, 8).toUpperCase()} · {fmtDateTime(r.created_at)} 접수
                  </p>
                  <p className="mt-1 text-sub">
                    인원: 성인 {r.adult_count} / 아동 {r.child_count} / 유아 {r.infant_count}
                    {r.boarding_point && ` · 탑승: ${r.boarding_point.name} (${r.boarding_point.boarding_time})`}
                  </p>
                  <p className="mt-1 text-sub">
                    결제: {r.payment_method === "bank" ? "무통장" : "카드"}
                    {r.payment_tid && ` · TID ${r.payment_tid}`}
                  </p>
                  {r.request_memo && (
                    <p className="mt-1.5 rounded-lg bg-canvas p-2 text-ink">
                      💬 {r.request_memo}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={r.status}
                      onChange={(e) => patch(r.id, { status: e.target.value })}
                      className="rounded-lg border border-line px-2 py-2 text-[13px]"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const note = prompt("관리자 메모", r.admin_note ?? "");
                        if (note === null) return;
                        patch(r.id, { admin_note: note });
                      }}
                      className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-sub"
                    >
                      메모 {r.admin_note ? "✏️" : "+"}
                    </button>
                    <a
                      href={`tel:${r.customer_phone.replace(/-/g, "")}`}
                      className="rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-sub"
                    >
                      📞 전화
                    </a>
                  </div>
                  {r.admin_note && (
                    <p className="mt-2 text-[12px] text-faint">메모: {r.admin_note}</p>
                  )}
                </div>
              )}
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-10 text-center text-sm text-faint">예약이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
