import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center">
      <p className="text-[40px]">🚌</p>
      <h1 className="mt-3 text-[20px] font-extrabold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-1.5 text-[14px] text-sub">
        주소가 바뀌었거나 삭제된 페이지예요.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-primary px-6 py-3 text-[14px] font-bold text-white"
      >
        홈으로 가기
      </Link>
    </div>
  );
}
