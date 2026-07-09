"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const MENU = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/products", label: "상품" },
  { href: "/admin/departures", label: "출발일" },
  { href: "/admin/reservations", label: "예약" },
  { href: "/admin/reviews", label: "리뷰" },
  { href: "/admin/inquiries", label: "문의" },
  { href: "/admin/settings", label: "설정" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <div className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-[15px] font-extrabold">
          <span className="text-primary">topBus</span> 관리자
        </p>
        <button onClick={logout} className="text-[12px] font-semibold text-faint">
          로그아웃
        </button>
      </div>
      <nav className="flex overflow-x-auto no-scrollbar">
        {MENU.map((m) => {
          const active =
            m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href);
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-[13px] font-semibold ${
                active ? "border-primary text-primary" : "border-transparent text-sub"
              }`}
            >
              {m.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
