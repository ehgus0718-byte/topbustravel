"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminNav from "../../AdminNav";

const EMPTY = {
  title: "",
  slug: "",
  category_id: "",
  summary: "",
  description: "",
  duration_text: "당일",
  base_price: 0,
  child_price: null as number | null,
  infant_price: 0,
  thumbnail_url: "",
  is_featured: false,
  is_active: true,
  includes: [] as string[],
  excludes: [] as string[],
  optional_items: [] as string[],
  notices: "",
  refund_policy: "",
};

export default function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();

  const [form, setForm] = useState<any>(EMPTY);
  const [images, setImages] = useState<string[]>([]);
  const [boarding, setBoarding] = useState<any[]>([]);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(isNew);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));

    if (!isNew) {
      fetch(`/api/admin/products/${id}`)
        .then((r) => r.json())
        .then((d) => {
          const p = d.product;
          if (!p) return;
          setForm({
            ...EMPTY,
            ...Object.fromEntries(
              Object.keys(EMPTY).map((k) => [k, p[k] ?? (EMPTY as any)[k]])
            ),
          });
          setImages((p.images ?? []).map((i: any) => i.image_url));
          setBoarding(p.boarding_points ?? []);
          setItinerary(p.itinerary ?? []);
          setLoaded(true);
        });
    }
  }, [id, isNew]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const upload = async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "업로드 실패");
      return null;
    }
    return data.url;
  };

  const save = async () => {
    if (!form.title.trim()) return alert("상품명을 입력해 주세요.");
    if (!form.slug.trim()) return alert("URL 주소(slug)를 입력해 주세요.");
    setBusy(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        base_price: Number(form.base_price) || 0,
        child_price: form.child_price === "" || form.child_price === null ? null : Number(form.child_price),
        infant_price: Number(form.infant_price) || 0,
        thumbnail_url: form.thumbnail_url || images[0] || null,
        children: { images, boarding_points: boarding, itinerary },
      };
      const res = await fetch(isNew ? "/api/admin/products" : `/api/admin/products/${id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("저장되었습니다.");
      router.push("/admin/products");
    } catch (e: any) {
      alert(e.message || "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("이 상품을 삭제할까요? 출발일/이미지/일정이 함께 삭제됩니다.")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    router.push("/admin/products");
  };

  if (!loaded)
    return (
      <div>
        <AdminNav />
        <p className="p-8 text-center text-sm text-faint">불러오는 중...</p>
      </div>
    );

  return (
    <div>
      <AdminNav />
      <div className="space-y-6 p-4 pb-28">
        <h1 className="text-[17px] font-extrabold">
          {isNew ? "새 상품 등록" : "상품 수정"}
        </h1>

        <Field label="상품명">
          <Input value={form.title} onChange={(v) => set("title", v)} />
        </Field>

        <Field label="URL 주소 (영문/숫자/하이픈, 예: seosan-day)">
          <Input
            value={form.slug}
            onChange={(v) => set("slug", v.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="카테고리">
            <select
              value={form.category_id ?? ""}
              onChange={(e) => set("category_id", e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-3 text-[14px]"
            >
              <option value="">선택 안 함</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="기간 표시 (예: 당일, 1박2일)">
            <Input value={form.duration_text} onChange={(v) => set("duration_text", v)} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="성인가 (원)">
            <Input type="number" value={form.base_price} onChange={(v) => set("base_price", v)} />
          </Field>
          <Field label="아동가 (비우면 성인가)">
            <Input type="number" value={form.child_price ?? ""} onChange={(v) => set("child_price", v)} />
          </Field>
          <Field label="유아가 (원)">
            <Input type="number" value={form.infant_price} onChange={(v) => set("infant_price", v)} />
          </Field>
        </div>

        <Field label="한 줄 소개">
          <Input value={form.summary ?? ""} onChange={(v) => set("summary", v)} />
        </Field>

        <Field label="상세설명">
          <Textarea rows={6} value={form.description ?? ""} onChange={(v) => set("description", v)} />
        </Field>

        {/* 대표 이미지 */}
        <Field label="대표 이미지 (목록 썸네일)">
          <div className="flex items-center gap-2">
            {form.thumbnail_url && (
              <img src={form.thumbnail_url} alt="" className="h-16 w-20 rounded-lg object-cover" />
            )}
            <button
              onClick={() => thumbRef.current?.click()}
              className="rounded-xl border border-line px-3 py-2.5 text-[13px] font-semibold text-sub"
            >
              이미지 선택
            </button>
            <input
              ref={thumbRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const url = await upload(f);
                if (url) set("thumbnail_url", url);
                e.target.value = "";
              }}
            />
          </div>
        </Field>

        {/* 갤러리 */}
        <Field label={`갤러리 이미지 (${images.length}장)`}>
          <div className="flex flex-wrap gap-2">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="h-16 w-20 rounded-lg object-cover" />
                <button
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[11px] text-white"
                  aria-label="이미지 삭제"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-16 w-20 items-center justify-center rounded-lg border border-dashed border-line text-[20px] text-faint"
            >
              +
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) {
                  const url = await upload(f);
                  if (url) setImages((prev) => [...prev, url]);
                }
                e.target.value = "";
              }}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="포함사항 (한 줄에 하나)">
            <Textarea
              rows={5}
              value={(form.includes ?? []).join("\n")}
              onChange={(v) => set("includes", v.split("\n"))}
            />
          </Field>
          <Field label="불포함사항 (한 줄에 하나)">
            <Textarea
              rows={5}
              value={(form.excludes ?? []).join("\n")}
              onChange={(v) => set("excludes", v.split("\n"))}
            />
          </Field>
        </div>

        <Field label="선택경비 (한 줄에 하나 · 현장에서 원하는 분만 결제하는 항목, 예: 케이블카 탑승권)">
          <Textarea
            rows={3}
            value={(form.optional_items ?? []).join("\n")}
            onChange={(v) => set("optional_items", v.split("\n"))}
          />
        </Field>

        {/* 탑승지 */}
        <Field label="탑승지">
          <div className="space-y-2">
            {boarding.map((b, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={b.boarding_time ?? ""}
                  onChange={(e) => {
                    const n = [...boarding];
                    n[i] = { ...n[i], boarding_time: e.target.value };
                    setBoarding(n);
                  }}
                  placeholder="07:00"
                  className="w-20 rounded-xl border border-line px-3 py-2.5 text-[13px]"
                />
                <input
                  value={b.name ?? ""}
                  onChange={(e) => {
                    const n = [...boarding];
                    n[i] = { ...n[i], name: e.target.value };
                    setBoarding(n);
                  }}
                  placeholder="탑승지 이름"
                  className="flex-1 rounded-xl border border-line px-3 py-2.5 text-[13px]"
                />
                <button
                  onClick={() => setBoarding(boarding.filter((_, j) => j !== i))}
                  className="shrink-0 text-[13px] text-danger"
                >
                  삭제
                </button>
              </div>
            ))}
            <button
              onClick={() => setBoarding([...boarding, { name: "", boarding_time: "" }])}
              className="rounded-xl border border-line px-3 py-2 text-[13px] font-semibold text-sub"
            >
              + 탑승지 추가
            </button>
          </div>
        </Field>

        {/* 여행일정 */}
        <Field label="여행일정">
          <div className="space-y-2">
            {itinerary.map((it, i) => (
              <div key={i} className="rounded-xl border border-line p-2.5">
                <div className="flex gap-2">
                  <input
                    value={it.day_no ?? 1}
                    onChange={(e) => {
                      const n = [...itinerary];
                      n[i] = { ...n[i], day_no: e.target.value };
                      setItinerary(n);
                    }}
                    placeholder="일차"
                    className="w-14 rounded-lg border border-line px-2 py-2 text-center text-[13px]"
                  />
                  <input
                    value={it.time_text ?? ""}
                    onChange={(e) => {
                      const n = [...itinerary];
                      n[i] = { ...n[i], time_text: e.target.value };
                      setItinerary(n);
                    }}
                    placeholder="09:30"
                    className="w-20 rounded-lg border border-line px-2 py-2 text-[13px]"
                  />
                  <input
                    value={it.title ?? ""}
                    onChange={(e) => {
                      const n = [...itinerary];
                      n[i] = { ...n[i], title: e.target.value };
                      setItinerary(n);
                    }}
                    placeholder="장소/활동"
                    className="flex-1 rounded-lg border border-line px-2 py-2 text-[13px]"
                  />
                  <button
                    onClick={() => setItinerary(itinerary.filter((_, j) => j !== i))}
                    className="shrink-0 text-[13px] text-danger"
                  >
                    삭제
                  </button>
                </div>
                <input
                  value={it.description ?? ""}
                  onChange={(e) => {
                    const n = [...itinerary];
                    n[i] = { ...n[i], description: e.target.value };
                    setItinerary(n);
                  }}
                  placeholder="설명 (선택)"
                  className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-[13px]"
                />
              </div>
            ))}
            <button
              onClick={() =>
                setItinerary([...itinerary, { day_no: 1, time_text: "", title: "", description: "" }])
              }
              className="rounded-xl border border-line px-3 py-2 text-[13px] font-semibold text-sub"
            >
              + 일정 추가
            </button>
          </div>
        </Field>

        <Field label="유의사항">
          <Textarea rows={4} value={form.notices ?? ""} onChange={(v) => set("notices", v)} />
        </Field>
        <Field label="취소/환불 규정">
          <Textarea rows={4} value={form.refund_policy ?? ""} onChange={(v) => set("refund_policy", v)} />
        </Field>

        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={!!form.is_featured}
              onChange={(e) => set("is_featured", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            추천 상품
          </label>
          <label className="flex items-center gap-2 text-[14px] font-semibold">
            <input
              type="checkbox"
              checked={!!form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            판매중
          </label>
        </div>

        {!isNew && (
          <button onClick={remove} className="text-[13px] font-semibold text-danger">
            상품 삭제
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-4xl border-t border-line bg-white p-3">
        <button
          onClick={save}
          disabled={busy}
          className="h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-bold text-sub">{label}</p>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: any;
  onChange: (v: any) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line px-3.5 py-3 text-[14px] outline-none focus:border-primary"
    />
  );
}

function Textarea({
  value,
  onChange,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  rows: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-xl border border-line px-3.5 py-3 text-[14px] outline-none focus:border-primary"
    />
  );
}
