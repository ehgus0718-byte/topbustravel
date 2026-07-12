"use client";
import { useEffect, useMemo, useState } from "react";
import AdminNav from "../AdminNav";
import { fmtDateTime } from "@/lib/format";

type ProductOption = { id: string; title: string };

export default function AdminReviewsPage() {
  const [list, setList] = useState<any[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // 새 후기 작성 폼
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    author_name: "",
    rating: 5,
    content: "",
    created_at: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = () =>
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((d) => setList(d.reviews ?? []))
      .finally(() => setLoading(false));

  const loadProducts = () =>
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((d) =>
        setProducts((d.products ?? []).map((p: any) => ({ id: p.id, title: p.title })))
      );

  useEffect(() => {
    load();
    loadProducts();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    if (!q.trim()) return list;
    const kw = q.trim().toLowerCase();
    return list.filter(
      (r) =>
        r.author_name?.toLowerCase().includes(kw) ||
        r.content?.toLowerCase().includes(kw) ||
        r.product?.title?.toLowerCase().includes(kw)
    );
  }, [list, q]);

  const toggle = async (r: any) => {
    await fetch(`/api/admin/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_visible: !r.is_visible }),
    });
    setToast(r.is_visible ? "비공개로 전환했습니다" : "게시했습니다");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("이 후기를 삭제할까요? 되돌릴 수 없습니다.")) return;
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    setToast("삭제했습니다");
    load();
  };

  const resetForm = () =>
    setForm({ product_id: "", author_name: "", rating: 5, content: "", created_at: "" });

  const submit = async () => {
    if (!form.product_id) return alert("상품을 선택해 주세요.");
    if (!form.author_name.trim()) return alert("작성자 이름을 입력해 주세요.");
    if (!form.content.trim()) return alert("내용을 입력해 주세요.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      setToast("후기를 등록했습니다 (즉시 게시됨)");
      resetForm();
      setOpen(false);
      load();
    } catch (e: any) {
      alert(e.message || "등록 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-[17px] font-extrabold">
            리뷰 관리 <span className="text-[13px] font-semibold text-faint">({list.length}개)</span>
          </h1>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg bg-primary px-3 py-1.5 text-[13px] font-bold text-white"
          >
            {open ? "닫기" : "+ 후기 작성"}
          </button>
        </div>

        {/* 관리자 직접 작성 — 초기 서비스라 후기가 없을 때 신뢰도 확보용.
            즉시 게시되며, 다녀온 날짜에 맞춰 작성일을 지정할 수 있음. */}
        {open && (
          <div className="mb-4 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
            <p className="mb-3 text-[13px] font-bold text-primary">새 후기 직접 작성</p>
            <div className="space-y-2.5">
              <select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              >
                <option value="">상품 선택</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  value={form.author_name}
                  onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                  placeholder="작성자 이름 (예: 김*수)"
                  className="flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                />
                <input
                  type="date"
                  value={form.created_at}
                  onChange={(e) => setForm({ ...form, created_at: e.target.value })}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                  title="작성일(선택) — 비우면 오늘 날짜로 등록"
                />
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, rating: n })}
                    className={`text-[22px] ${n <= form.rating ? "text-accent" : "text-line"}`}
                    aria-label={`별점 ${n}점`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="후기 내용"
                rows={3}
                className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetForm();
                    setOpen(false);
                  }}
                  className="h-10 flex-1 rounded-lg border border-line text-[13px] font-semibold text-sub"
                >
                  취소
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {saving ? "등록 중..." : "등록하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 검색 */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="작성자·내용·상품명 검색"
          className="mb-3 w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-primary"
        />

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
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
                        r.is_visible
                          ? "bg-primary-soft text-primary"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {r.is_visible ? "게시중" : "비공개"}
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
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-faint">
                {q ? "검색 결과가 없습니다." : "리뷰가 없습니다."}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
