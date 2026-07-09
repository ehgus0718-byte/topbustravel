import type { SupabaseClient } from "@supabase/supabase-js";
import type { SiteSettings } from "@/types";

export async function getSettings(sb: SupabaseClient): Promise<SiteSettings> {
  const { data, error } = await sb.from("site_settings").select("*");
  if (error) throw error;
  const map: SiteSettings = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}
