"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const login = async () => {
    if (!password) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        alert("비밀번호가 올바르지 않습니다.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-center text-[22px] font-extrabold">
          <span className="text-primary">topBus</span> 관리자
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          placeholder="관리자 비밀번호"
          className="mt-6 w-full rounded-xl border border-line px-4 py-3.5 text-[15px] outline-none focus:border-primary"
        />
        <button
          onClick={login}
          disabled={busy}
          className="mt-3 h-13 w-full rounded-xl bg-primary py-3.5 text-[15px] font-bold text-white disabled:opacity-60"
        >
          {busy ? "확인 중..." : "로그인"}
        </button>
      </div>
    </div>
  );
}
