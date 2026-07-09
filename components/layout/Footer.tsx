export default function Footer({
  tel,
  companyInfo,
}: {
  tel: string;
  companyInfo: string;
}) {
  return (
    <footer className="border-t border-line bg-canvas px-4 py-8 pb-24 text-xs leading-relaxed text-faint">
      <p className="mb-2 font-bold text-sub">topBustravel</p>
      <p className="prewrap">{companyInfo.replace(/ \| /g, "\n")}</p>
      <p className="mt-2">
        고객센터 {tel} (평일 09:00 ~ 18:00)
      </p>
      <p className="mt-3">© {new Date().getFullYear()} topBustravel. All rights reserved.</p>
    </footer>
  );
}
