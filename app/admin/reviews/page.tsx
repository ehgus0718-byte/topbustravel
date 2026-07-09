"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { fmtDateTime } from "@/lib/format";

export default function AdminReviewsPage() {
  const [list, setList] = useState<any[]>([]);

  const load = () =>
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => setList(d.reviews ?? []));

  useEffect(() => {
    load();
  }, []);

  const toggle = async (r: any) => {
    await fetch(`/api/admin/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_visible: !r.is_visible }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 리뷰를 삭제할까요?")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <h1 className="mb-3 text-[17px] font-extrabold">리뷰 관리</h1>
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold">
                  {r.author_name}{" "}
                  <span className="text-accent">{"★".repeat(r.rating)}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggle(r)}
                    className={`rounded-lg px-2.5 py-1 text-[12px] font-bold ${
                      r.is_visible ? "bg-primary-soft text-primary" : "bg-accent/10 text-accent"
                    }`}
                  >
                    {r.is_visible ? "게시중" : "승인 대기"}
                  </button>
                  <button onClick={() => remove(r.id)} className="text-[12px] text-danger">
                    삭제
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[12px] text-faint">
                {r.product?.title ?? "-"} · {fmtDateTime(r.created_at)}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed">{r.content}</p>
            </div>
          ))}
          {list.length === 0 && (
            <p className="py-10 text-center text-sm text-faint">리뷰가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
