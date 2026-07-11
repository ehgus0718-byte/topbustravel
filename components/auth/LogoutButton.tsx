"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded-xl border border-line px-3.5 py-2 text-[13px] font-semibold text-sub transition hover:bg-canvas disabled:opacity-50"
    >
      {loading ? "..." : "로그아웃"}
    </button>
  );
}
