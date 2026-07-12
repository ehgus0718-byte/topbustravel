import Link from "next/link";

export default function Footer({
  tel,
  companyInfo,
}: {
  tel: string;
  companyInfo?: string;
}) {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 text-xs leading-relaxed text-faint md:px-6 md:py-10 md:pb-10">
        <div className="md:flex md:items-start md:justify-between md:gap-10">
          <div>
            <p className="mb-2 text-sm font-bold text-sub">topBustravel</p>
            <p>
              상호 소망투어 · 대표 이도현
              <br />
              사업자등록번호 781-69-00237 · 통신판매업신고 2020-대전서구-0689
              <br />
              관광사업등록 제2018-000008호
              <br />
              대전광역시 서구 청사서로 29 · ehgus0718@naver.com
            </p>
          </div>
          <div className="mt-3 shrink-0 md:mt-0 md:text-right">
            <p>
              고객센터{" "}
              <a href={`tel:${tel.replace(/-/g, "")}`} className="font-semibold text-sub">
                {tel}
              </a>{" "}
              (평일 09:00 ~ 18:00)
            </p>
            <p className="mt-2 space-x-3">
              <Link href="/notices" className="underline-offset-2 hover:underline">
                공지사항
              </Link>
              <Link href="/events" className="underline-offset-2 hover:underline">
                이벤트
              </Link>
              <Link href="/faq" className="underline-offset-2 hover:underline">
                자주 묻는 질문
              </Link>
              <Link href="/contact" className="underline-offset-2 hover:underline">
                단체여행 견적문의
              </Link>
            </p>
            <p className="mt-3">
              © {new Date().getFullYear()} topBustravel. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
