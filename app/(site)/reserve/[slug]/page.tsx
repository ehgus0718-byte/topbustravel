import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/api/products";
import { getSessionUser } from "@/lib/session";
import ReserveClient from "@/components/reserve/ReserveClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "예약하기" };

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { slug } = await params;
  const { date } = await searchParams;

  // 결제/예약은 회원만 가능 — 프론트 버튼뿐 아니라 이 페이지 자체를 서버에서 막아
  // 링크 직접 접근으로도 우회할 수 없게 한다. 실제 저장은 /api/reservations에서 재검증.
  const user = await getSessionUser();
  if (!user) {
    const next = `/reserve/${slug}${date ? `?date=${date}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  let product = null;
  try {
    product = await getProductBySlug(createServerSupabase(), slug);
  } catch {}
  if (!product) notFound();

  const departure =
    product.departures.find((d) => d.departure_date === date) ?? null;
  if (!departure) notFound();

  return <ReserveClient product={product} departure={departure} />;
}
