export default function Footer({
  tel,
  companyInfo,
}: {
  tel: string;
  companyInfo: string;
}) {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 text-xs leading-relaxed text-faint md:flex md:items-start md:justify-between md:gap-10 md:px-6 md:py-10 md:pb-10">
        <div>
          <p className="mb-2 text-sm font-bold text-sub">topBustravel</p>
          <p className="prewrap">{companyInfo.replace(/ \| /g, "\n")}</p>
        </div>
        <div className="mt-2 shrink-0 md:mt-0 md:text-right">
          <p>고객센터 {tel} (평일 09:00 ~ 18:00)</p>
          <p className="mt-3">
            © {new Date().getFullYear()} topBustravel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
