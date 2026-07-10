export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-auto w-full max-w-2xl">{children}</div>;
}
