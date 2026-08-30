export type PolicySection = {
  h?: string;
  p?: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
  note?: string;
};

export default function PolicyDoc({
  title,
  intro,
  effective,
  sections,
}: {
  title: string;
  intro?: string;
  effective?: string;
  sections: PolicySection[];
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8 md:pt-12">
      <h1 className="text-[22px] font-extrabold md:text-3xl">{title}</h1>
      {intro && <p className="mt-1.5 text-[13px] leading-relaxed text-sub md:text-sm">{intro}</p>}
      {effective && <p className="mt-1 text-[12px] text-faint">시행일 {effective}</p>}

      <div className="mt-7 space-y-6">
        {sections.map((s, i) => (
          <section key={i} className="rounded-2xl border border-line p-4 md:p-5">
            {s.h && <h2 className="text-[15px] font-bold md:text-base">{s.h}</h2>}

            {s.p?.map((text, j) => (
              <p key={j} className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-sub md:text-[14px]">
                {text}
              </p>
            ))}

            {s.list && (
              <ul className="mt-2 space-y-1.5">
                {s.list.map((text, j) => (
                  <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-sub md:text-[14px]">
                    <span className="text-primary">·</span>
                    <span className="whitespace-pre-line">{text}</span>
                  </li>
                ))}
              </ul>
            )}

            {s.table && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-[12px] md:text-[13px]">
                  <thead>
                    <tr>
                      {s.table.head.map((th, j) => (
                        <th
                          key={j}
                          className="border border-line bg-canvas px-2.5 py-2 text-left font-bold text-sub"
                        >
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {s.table.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((td, k) => (
                          <td
                            key={k}
                            className="border border-line px-2.5 py-2 align-top leading-relaxed text-sub"
                          >
                            {td}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {s.note && (
              <p className="mt-3 rounded-xl bg-canvas px-3 py-2.5 text-[12px] leading-relaxed text-faint md:text-[13px]">
                {s.note}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
