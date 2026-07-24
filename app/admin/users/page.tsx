"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "../AdminNav";
import { won, fmtDateTime } from "@/lib/format";

export default function AdminUsersPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [list, setList] = useState<any[] | null>(null);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const saveUser = async (u: any) => {
    const phoneChanged = form.phone.replace(/\D/g, "") !== (u.phone || "").replace(/\D/g, "");
    if (
      phoneChanged &&
      !confirm(
        `휴대폰 번호를 변경합니다.\n\n${u.phone} → ${form.phone}\n\n이 번호로 로그인하게 됩니다. 계속할까요?`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToast("회원 정보를 수정했습니다");
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message || "수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const load = () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => setList(d.users ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const viewReservations = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setToast("전화번호가 복사되었습니다. 검색창에 붙여넣어 주세요.");
    } catch {
      // 클립보드 권한이 없는 환경 (일부 구형 브라우저)에서도 이동은 계속 진행
    }
    router.push("/admin/reservations");
  };

  return (
    <div>
      <AdminNav />
      <div className="p-4">
        <h1 className="mb-3 text-[17px] font-extrabold">
          회원 관리{" "}
          {list && (
            <span className="text-[13px] font-semibold text-faint">({list.length}명)</span>
          )}
        </h1>

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

        {list === null ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((u) => (
              <div key={u.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold">{u.name}</p>
                  <button
                    onClick={() => viewReservations(u.phone)}
                    className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-sub"
                  >
                    예약보기 →
                  </button>
                </div>
                <p className="mt-0.5 text-[13px] text-sub">{u.phone}</p>
                <div className="mt-2 flex items-center gap-3 text-[12px] text-faint">
                  <span>
                    예약{" "}
                    <b className="text-ink">{u.reservationCount}</b>건
                  </span>
                  <span>
                    누적{" "}
                    <b className="text-ink">{won(u.totalSpent)}</b>
                  </span>
                  <span>가입 {fmtDateTime(u.created_at)}</span>
                  {u.last_login_at && <span>최근접속 {fmtDateTime(u.last_login_at)}</span>}
                </div>

                {editing === u.id ? (
                  <div className="mt-3 rounded-lg bg-canvas p-3">
                    <p className="text-[12px] font-semibold text-sub">회원 정보 수정</p>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="이름"
                      className="mt-2 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    />
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="휴대폰 번호"
                      className="mt-2 w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-primary"
                    />
                    <p className="mt-2 text-[11px] leading-relaxed text-danger">
                      번호는 로그인 수단입니다. 잘못 입력하면 그 번호를 가진 사람이 이 계정으로
                      로그인하게 되니, 고객이 번호를 바꿔 로그인하지 못하는 경우에만 사용하세요.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        onClick={() => setEditing(null)}
                        className="h-10 flex-1 rounded-lg border border-line text-[13px] font-semibold text-sub"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => saveUser(u)}
                        disabled={saving}
                        className="h-10 flex-1 rounded-lg bg-primary text-[13px] font-bold text-white disabled:opacity-50"
                      >
                        {saving ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setForm({ name: u.name, phone: u.phone });
                      setEditing(u.id);
                    }}
                    className="mt-2.5 rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-sub"
                  >
                    정보 수정
                  </button>
                )}
              </div>
            ))}
            {list.length === 0 && (
              <p className="py-10 text-center text-sm text-faint">
                {q ? "검색 결과가 없습니다." : "가입한 회원이 없습니다."}
              </p>
            )}
          </div>
        )}
      </div>

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
