export default function ReserveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 예약(결제) 플로우는 데스크톱에서도 좁은 중앙 컬럼이 UX 표준
  return <div className="mx-auto w-full max-w-2xl">{children}</div>;
}
