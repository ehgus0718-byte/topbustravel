export const metadata = { title: "관리자", robots: { index: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-4xl bg-white">{children}</div>;
}
