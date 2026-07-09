"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { fmtDateTime } from "@/lib/format";

export default function AdminInquiriesPage() {
  const [list, setList] = useState<any[]>([]);

  const load = () =>
    fetch("/api/admin/inquiries")
      .then((r) => r.json())
      .then((d) => setList(d.inquiries ?? []));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (i: any) => {
    await fetch(`/api/admin/inquiries/${i.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: i.status === "new" ? "done" : "new" }),
    });
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <h1 className="mb-3 text-[17px] font-extrabold">문의 관리</h1>
        <div className="space-y-2">
          {list.map((i) => (
            <div key={i.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold">
                  {i.name} <span className="font-medium text-faint">{i.phone}</span>
                </p>
                <button
                  onClick={() => toggle(i)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                    i.status === "new" ? "bg-accent/10 text-accent" : "bg-canvas text-faint"
                  }`}
                >
                  {i.status === "new" ? "새 문의" : "처리완료"}
                </button>
              </div>
              <p className="mt-1 text-[12px] text-faint">
                {i.product?.title ? `[${i.product.title}] · ` : ""}
                {fmtDateTime(i.created_at)}
              </p>
              <p className="prewrap mt-1.5 text-[13px] leading-relaxed">{i.message}</p>
              <a
                href={`tel:${i.phone.replace(/-/g, "")}`}
                className="mt-2 inline-block rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-sub"
              >
                📞 전화하기
              </a>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-10 text-center text-sm text-faint">문의가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
