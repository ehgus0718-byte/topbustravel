import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/api/products";
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
