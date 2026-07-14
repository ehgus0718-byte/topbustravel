import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/api/products";
import { getSessionUser } from "@/lib/session";
import ReserveClient from "@/components/reserve/ReserveClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "예약하기" };

// URL 쿼리 인원값 방어적 파싱 (정수, 범위 제한)
function parseCount(v: string | undefined, min: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(99, Math.max(min, Math.floor(n)));
}

export default async function ReservePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; adult?: string; child?: string; infant?: string }>;
}) {
  const { slug } = await params;
  const { date, adult, child, infant } = await searchParams;

  // 결제/예약은 회원만 가능 — 프론트 버튼뿐 아니라 이 페이지 자체를 서버에서 막아
  // 링크 직접 접근으로도 우회할 수 없게 한다. 실제 저장은 /api/reservations에서 재검증.
  const user = await getSessionUser();
  if (!user) {
    const qs = new URLSearchParams();
    if (date) qs.set("date", date);
    if (adult) qs.set("adult", adult);
    if (child) qs.set("child", child);
    if (infant) qs.set("infant", infant);
    const next = `/reserve/${slug}${qs.size ? `?${qs.toString()}` : ""}`;
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

  return (
    <ReserveClient
      product={product}
      departure={departure}
      initialAdult={parseCount(adult, 1, 1)}
      initialChild={parseCount(child, 0, 0)}
      initialInfant={parseCount(infant, 0, 0)}
    />
  );
}
