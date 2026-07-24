import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { won, formatPhone } from "@/lib/format";
import LogoutButton from "@/components/auth/LogoutButton";
import AccountSettings from "@/components/auth/AccountSettings";
import ProductCard from "@/components/product/ProductCard";
import { getProductsByIds } from "@/lib/api/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "마이페이지" };

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "결제대기", cls: "bg-canvas text-sub" },
  paid: { text: "결제완료", cls: "bg-primary-soft text-primary" },
  confirmed: { text: "예약확정", cls: "bg-primary text-white" },
  canceled: { text: "취소됨", cls: "bg-canvas text-faint" },
  refunded: { text: "환불완료", cls: "bg-canvas text-faint" },
};

export default async function MyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my");

  const sb = createAdminSupabase();
  const { data: reservations } = await sb
    .from("reservations")
    .select(
      "id, status, adult_count, child_count, infant_count, total_amount, created_at, product:products(title), departure:departures(departure_date)"
    )
    .or(`user_uid.eq.${user.uid},customer_phone.eq.${user.phone}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: wishRows } = await sb
    .from("wishlists")
    .select("product_id")
    .eq("user_uid", user.uid)
    .order("created_at", { ascending: false });
  const wishlist = await getProductsByIds(sb, (wishRows ?? []).map((r) => r.product_id));

  return (
    <div className="px-5 pb-16 pt-8 md:pt-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold md:text-3xl">
            {user.name}님, 안녕하세요 👋
          </h1>
          <p className="mt-1 text-[13px] text-sub md:text-sm">
            {formatPhone(user.phone)}
          </p>
        </div>
        <LogoutButton />
      </div>

      <h2 className="mt-9 text-[16px] font-extrabold md:text-lg">예약 내역</h2>
      {!reservations || reservations.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line px-5 py-10 text-center">
          <p className="text-sm text-faint">아직 예약 내역이 없습니다.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-[14px] font-bold text-white"
          >
            여행상품 보러가기
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {reservations.map((r: any) => {
            const st = STATUS_LABEL[r.status] ?? {
              text: r.status,
              cls: "bg-canvas text-sub",
            };
            const people =
              r.adult_count + r.child_count + r.infant_count;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-line p-4 md:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-bold leading-snug md:text-base">
                    {r.product?.title ?? "여행상품"}
                  </p>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${st.cls}`}
                  >
                    {st.text}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] text-sub">
                  {r.departure?.departure_date
                    ? `출발일 ${r.departure.departure_date} · `
                    : ""}
                  {people}명 · {won(r.total_amount)}
                </p>
                <p className="mt-0.5 text-[12px] text-faint">
                  예약번호 {String(r.id).slice(0, 8).toUpperCase()} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("ko-KR")}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <h2 id="wishlist" className="mt-10 scroll-mt-20 text-[16px] font-extrabold md:text-lg">
        찜한 여행
      </h2>
      {wishlist.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-line px-5 py-10 text-center">
          <p className="text-sm text-faint">아직 찜한 여행이 없습니다.</p>
          <Link
            href="/products"
            className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-[14px] font-bold text-white"
          >
            여행상품 보러가기
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {wishlist.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <h2 className="mt-10 text-[16px] font-extrabold md:text-lg">내 정보</h2>
      <AccountSettings initialName={user.name} initialPhone={user.phone} />
    </div>
  );
}
