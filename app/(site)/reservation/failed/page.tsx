import Link from "next/link";

export const metadata = { title: "결제 실패" };

export default async function FailedPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  return (
    <div className="flex flex-col items-center px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10 text-[28px]">
        ⚠️
      </div>
      <h1 className="mt-4 text-[20px] font-extrabold">결제에 실패했습니다</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-sub">
        {msg || "결제가 정상적으로 처리되지 않았습니다."}
        <br />
        다시 시도하시거나 전화로 문의해 주세요.
      </p>
      <Link
        href="/products"
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-[14px] font-bold text-white"
      >
        여행상품 다시 보기
      </Link>
    </div>
  );
}
