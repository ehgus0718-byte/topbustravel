import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSettings } from "@/lib/api/settings";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let settings: Record<string, string> = {};
  try {
    settings = await getSettings(createServerSupabase());
  } catch {
    // DB 미연결 시에도 레이아웃은 렌더링
  }
  const tel = settings.tel || "042-000-0000";

  return (
    <div className="mx-auto min-h-dvh max-w-[480px] bg-white shadow-[0_0_40px_rgba(25,31,40,0.08)]">
      <Header tel={tel} />
      <main className="min-h-[70dvh]">{children}</main>
      <Footer tel={tel} companyInfo={settings.company_info || ""} />
      <BottomNav />
    </div>
  );
}
