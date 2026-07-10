export default function ProductDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 모바일 기준으로 설계된 상세 페이지를 데스크톱에서 중앙 컬럼으로 표시
  return <div className="mx-auto w-full max-w-3xl">{children}</div>;
}
