"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { won, fmtDate } from "@/lib/format";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AdminDeparturesPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [departures, setDepartures] = useState<any[]>([]);
  const [bulk, setBulk] = useState({
    start_date: "",
    end_date: "",
    weekdays: [] as number[],
    adult_price: "",
    total_seats: "40",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products ?? []);
        if (d.products?.[0]) setProductId(d.products[0].id);
      });
  }, []);

  const load = (pid: string) => {
    if (!pid) return;
    fetch(`/api/admin/departures?product_id=${pid}`)
      .then((r) => r.json())
      .then((d) => setDepartures(d.departures ?? []));
  };

  useEffect(() => {
    load(productId);
  }, [productId]);

  const addBulk = async () => {
    if (!bulk.start_date || !bulk.end_date || bulk.weekdays.length === 0) {
      alert("기간과 요일을 선택해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/departures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          start_date: bulk.start_date,
          end_date: bulk.end_date,
          weekdays: bulk.weekdays,
          adult_price: bulk.adult_price ? Number(bulk.adult_price) : null,
          total_seats: Number(bulk.total_seats) || 40,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`${data.count}개 날짜가 등록되었습니다. (이미 있는 날짜는 건너뜀)`);
      load(productId);
    } catch (e: any) {
      alert(e.message || "등록 실패");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id: string, body: any) => {
    await fetch(`/api/admin/departures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load(productId);
  };

  const remove = async (id: string) => {
    if (!confirm("이 출발일을 삭제할까요?")) return;
    await fetch(`/api/admin/departures/${id}`, { method: "DELETE" });
    load(productId);
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <h1 className="mb-3 text-[17px] font-extrabold">출발일 관리</h1>

        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="mb-4 w-full rounded-xl border border-line px-3 py-3 text-[14px]"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* 일괄 등록 */}
        <div className="mb-5 rounded-2xl bg-canvas p-4">
          <p className="mb-2.5 text-[13px] font-bold">출발일 일괄 등록</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={bulk.start_date} onChange={(e) => setBulk({ ...bulk, start_date: e.target.value })} className="rounded-xl border border-line px-3 py-2.5 text-[13px]" />
            <input type="date" value={bulk.end_date} onChange={(e) => setBulk({ ...bulk, end_date: e.target.value })} className="rounded-xl border border-line px-3 py-2.5 text-[13px]" />
          </div>
          <div className="mt-2 flex gap-1.5">
            {WEEKDAYS.map((w, i) => (
              <button
                key={i}
                onClick={() =>
                  setBulk({
                    ...bulk,
                    weekdays: bulk.weekdays.includes(i)
                      ? bulk.weekdays.filter((d) => d !== i)
                      : [...bulk.weekdays, i],
                  })
                }
                className={`h-9 w-9 rounded-lg text-[13px] font-bold ${
                  bulk.weekdays.includes(i) ? "bg-primary text-white" : "bg-white text-sub border border-line"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input type="number" placeholder="가격 (비우면 상품 기본가)" value={bulk.adult_price} onChange={(e) => setBulk({ ...bulk, adult_price: e.target.value })} className="rounded-xl border border-line px-3 py-2.5 text-[13px]" />
            <input type="number" placeholder="좌석 수" value={bulk.total_seats} onChange={(e) => setBulk({ ...bulk, total_seats: e.target.value })} className="rounded-xl border border-line px-3 py-2.5 text-[13px]" />
          </div>
          <button onClick={addBulk} disabled={busy} className="mt-2.5 h-11 w-full rounded-xl bg-ink text-[13px] font-bold text-white disabled:opacity-60">
            {busy ? "등록 중..." : "일괄 등록"}
          </button>
        </div>

        {/* 목록 */}
        <div className="space-y-2">
          {departures.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3">
              <div>
                <p className="text-[14px] font-bold">{fmtDate(d.departure_date)}</p>
                <p className="text-[12px] text-faint">
                  {d.adult_price ? won(d.adult_price) : "기본가"} · 예약 {d.reserved_seats}/{d.total_seats}석
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => patch(d.id, { status: d.status === "open" ? "closed" : "open" })}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-bold ${
                    d.status === "open" ? "bg-primary-soft text-primary" : "bg-canvas text-faint"
                  }`}
                >
                  {d.status === "open" ? "판매중" : "마감"}
                </button>
                <button
                  onClick={() => {
                    const v = prompt("이 날짜의 성인 가격 (비우면 상품 기본가)", d.adult_price ?? "");
                    if (v === null) return;
                    patch(d.id, { adult_price: v === "" ? null : Number(v) });
                  }}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-semibold text-sub"
                >
                  가격
                </button>
                <button onClick={() => remove(d.id)} className="px-1 text-[12px] text-danger">
                  삭제
                </button>
              </div>
            </div>
          ))}
          {productId && departures.length === 0 && (
            <p className="py-8 text-center text-sm text-faint">등록된 출발일이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}
