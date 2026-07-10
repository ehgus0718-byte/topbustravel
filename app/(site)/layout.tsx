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
    <div className="flex min-h-dvh flex-col bg-white">
      <Header tel={tel} />
      <main className="min-h-[70dvh] flex-1">{children}</main>
      <Footer tel={tel} companyInfo={settings.company_info || ""} />
      <BottomNav />
    </div>
  );
}
