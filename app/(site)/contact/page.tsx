import ContactClient from "./ContactClient";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSettings } from "@/lib/api/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "문의하기" };

export default async function ContactPage() {
  let settings: Record<string, string> = {};
  try {
    settings = await getSettings(createServerSupabase());
  } catch {}
  return (
    <ContactClient
      tel={settings.tel || "042-000-0000"}
      kakaoUrl={settings.kakao_url || "#"}
    />
  );
}
