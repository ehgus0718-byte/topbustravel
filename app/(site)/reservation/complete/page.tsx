import Link from "next/link";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSettings } from "@/lib/api/settings";
import { won, fmtDate, STATUS_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "예약 완료" };

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let r: any = null;
  let settings: Record<string, string> = {};
  if (id) {
    try {
      const sb = createAdminSupabase();
      const [{ data }, s] = await Promise.all([
        sb
          .from("reservations")
          .select(
            "*, product:products(title), departure:departures(departure_date), boarding_point:boarding_points(name, boarding_time)"
          )
          .eq("id", id)
          .maybeSingle(),
        getSettings(createServerSupabase()),
      ]);
      r = data;
      settings = s;
    } catch {}
  }

  if (!r) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-[15px] font-semibold text-sub">예약 정보를 찾을 수 없습니다.</p>
        <Link href="/" className="mt-4 inline-block text-[14px] font-bold text-primary">
          홈으로 가기
        </Link>
      </div>
    );
  }

  const isBank = r.payment_method === "bank" && r.status === "pending";

  return (
    <div className="px-4 py-8">
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-[28px]">
          {isBank ? "🏦" : "✅"}
        </div>
        <h1 className="mt-4 text-[20px] font-extrabold">
          {isBank ? "예약이 접수되었습니다" : "예약이 완료되었습니다"}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-sub">
          {isBank
            ? "아래 계좌로 입금해 주시면 확인 후 예약이 확정됩니다."
            : "예약 내역은 예약조회 메뉴에서 확인할 수 있습니다."}
        </p>
      </div>

      {isBank && (
        <div className="mb-4 rounded-2xl border-2 border-primary bg-primary-soft p-4 text-center">
          <p className="text-[13px] font-semibold text-sub">입금 계좌</p>
          <p className="mt-1 text-[16px] font-extrabold text-primary">
            {settings.bank_account || "계좌 정보는 유선으로 안내드립니다."}
          </p>
          <p className="mt-1.5 text-[13px] font-bold text-ink">
            입금 금액: {won(r.total_amount)}
          </p>
          <p className="mt-1 text-[12px] text-faint">
            예약자명({r.customer_name})으로 입금해 주세요.
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-canvas p-4">
        <Row label="예약번호" value={r.id.slice(0, 8).toUpperCase()} />
        <Row label="상품" value={r.product?.title ?? "-"} />
        <Row
          label="출발일"
          value={r.departure ? fmtDate(r.departure.departure_date) : "-"}
        />
        <Row
          label="탑승지"
          value={
            r.boarding_point
              ? `${r.boarding_point.name} (${r.boarding_point.boarding_time})`
              : "-"
          }
        />
        <Row
          label="인원"
          value={[
            r.adult_count > 0 && `성인 ${r.adult_count}`,
            r.child_count > 0 && `아동 ${r.child_count}`,
            r.infant_count > 0 && `유아 ${r.infant_count}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
        <Row label="결제금액" value={won(r.total_amount)} />
        <Row label="상태" value={STATUS_LABEL[r.status] ?? r.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link
          href="/reservation/lookup"
          className="flex h-12 items-center justify-center rounded-xl border border-line text-[14px] font-semibold text-sub"
        >
          예약조회
        </Link>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-xl bg-primary text-[14px] font-bold text-white"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[14px]">
      <span className="shrink-0 text-faint">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
