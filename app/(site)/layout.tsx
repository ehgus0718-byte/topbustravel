import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import Footer from "@/components/layout/Footer";
import FloatingLinks from "@/components/common/FloatingLinks";
import { WishlistProvider } from "@/components/product/WishlistProvider";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSettings } from "@/lib/api/settings";
import { getActiveFloatingButtons, type FloatingButton } from "@/lib/api/floating";
import { getSessionUser } from "@/lib/session";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = createServerSupabase();
  let settings: Record<string, string> = {};
  try {
    settings = await getSettings(sb);
  } catch {
    // DB 미연결 시에도 레이아웃은 렌더링
  }
  // 플로팅 링크 버튼 — 실패해도 레이아웃 렌더링에는 영향 없음
  let floating: FloatingButton[] = [];
  try {
    floating = await getActiveFloatingButtons(sb);
  } catch {}
  const tel = settings.tel || "042-000-0000";
  const user = await getSessionUser();

  return (
    <WishlistProvider loggedIn={!!user}>
      <div className="flex min-h-dvh flex-col bg-white">
        <Header tel={tel} user={user ? { name: user.name } : null} />
        <main className="min-h-[70dvh] flex-1">{children}</main>
        <Footer tel={tel} companyInfo={settings.company_info || ""} />
        {floating.length > 0 && <FloatingLinks buttons={floating} />}
        <BottomNav />
      </div>
    </WishlistProvider>
  );
}
