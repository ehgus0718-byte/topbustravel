"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "./AdminNav";
import { won, fmtDate, fmtDateTime, STATUS_LABEL } from "@/lib/format";

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/summary")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="등록 상품" value={data?.productCount ?? "-"} />
          <Stat label="결제 대기" value={data?.pendingCount ?? "-"} accent />
          <Stat label="오늘 결제" value={data?.todayPaidCount ?? "-"} />
          <Stat label="새 문의" value={data?.newInquiryCount ?? "-"} accent />
        </div>

        <h2 className="mb-2 mt-6 text-[15px] font-extrabold">최근 예약</h2>
        <div className="space-y-2">
          {(data?.recentReservations ?? []).map((r: any) => (
            <Link
              key={r.id}
              href="/admin/reservations"
              className="flex items-center justify-between rounded-xl border border-line p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold">
                  {r.customer_name} · {r.product?.title ?? "-"}
                </p>
                <p className="text-[12px] text-faint">
                  {r.departure ? fmtDate(r.departure.departure_date) + " 출발 · " : ""}
                  {fmtDateTime(r.created_at)} 접수
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[13px] font-bold">{won(r.total_amount)}</p>
                <p className="text-[11px] font-semibold text-primary">
                  {STATUS_LABEL[r.status] ?? r.status}
                </p>
              </div>
            </Link>
          ))}
          {data && data.recentReservations?.length === 0 && (
            <p className="py-8 text-center text-sm text-faint">아직 예약이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-canvas p-3.5">
      <p className="text-[12px] font-semibold text-faint">{label}</p>
      <p className={`mt-1 text-[22px] font-extrabold ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
