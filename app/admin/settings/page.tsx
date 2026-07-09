"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

const FIELDS = [
  { key: "tel", label: "고객센터 전화번호", rows: 1 },
  { key: "kakao_url", label: "카카오톡 채널 URL", rows: 1 },
  { key: "bank_account", label: "무통장 입금 계좌", rows: 1 },
  { key: "company_info", label: "사업자 정보 (푸터 표시, ' | '로 구분)", rows: 3 },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings ?? {}));
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error();
      alert("저장되었습니다.");
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminNav />
      <div className="space-y-5 p-4">
        <h1 className="text-[17px] font-extrabold">사이트 설정</h1>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <p className="mb-1.5 text-[13px] font-bold text-sub">{f.label}</p>
            {f.rows > 1 ? (
              <textarea
                rows={f.rows}
                value={settings[f.key] ?? ""}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                className="w-full rounded-xl border border-line px-3.5 py-3 text-[14px] outline-none focus:border-primary"
              />
            ) : (
              <input
                value={settings[f.key] ?? ""}
                onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                className="w-full rounded-xl border border-line px-3.5 py-3 text-[14px] outline-none focus:border-primary"
              />
            )}
          </div>
        ))}
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
