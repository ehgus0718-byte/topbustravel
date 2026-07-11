import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "자주 묻는 질문",
  description:
    "탑버스트래블 이용 안내 — 탑승지, 1인 예약, 단체·워크숍 견적, 취소·환불 규정, 어르신·아이 동반 코스에 대한 답변을 모았습니다.",
};

const FAQS = [
  {
    q: "탑승지는 어디인가요?",
    a: "대전과 세종 주요 지점에서 출발합니다. 상품마다 탑승지가 달라 상세페이지의 '탑승지 안내'에서 확인하실 수 있고, 예약 후 출발 안내 문자로 다시 알려드립니다.",
  },
  {
    q: "혼자 또는 두 명이서도 예약할 수 있나요?",
    a: "네. 좌석 단위로 판매하는 상품은 1인부터 예약 가능합니다. 부부여행, 커플여행으로도 부담 없이 이용하세요.",
  },
  {
    q: "단체(회사 워크숍, MT, 동호회) 견적은 어떻게 받나요?",
    a: "문의 페이지나 고객센터로 인원, 날짜, 원하는 지역을 알려주시면 전세버스 포함 맞춤 견적을 드립니다. 25인승부터 45인승 대형버스까지 준비되어 있습니다.",
  },
  {
    q: "예약 취소와 환불 규정은 어떻게 되나요?",
    a: "출발일 기준 취소 시점에 따라 환불 비율이 달라집니다. 각 상품 상세페이지의 취소 규정을 확인해 주세요. 우천 등으로 진행이 어려운 경우 전액 환불 또는 일정 변경을 안내드립니다.",
  },
  {
    q: "어르신이나 아이와 함께 가도 괜찮은 코스가 있나요?",
    a: "네. 걷는 구간이 짧고 휴식이 넉넉한 효도여행·가족여행 코스를 따로 준비하고 있습니다. 상품 목록에서 확인하세요.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-8 md:pt-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h1 className="text-[22px] font-extrabold md:text-3xl">자주 묻는 질문</h1>
      <p className="mt-1.5 text-[13px] text-sub md:text-sm">
        찾는 답이 없다면{" "}
        <Link href="/contact" className="font-semibold text-primary underline-offset-2 hover:underline">
          문의하기
        </Link>
        로 남겨주세요. 평일 09:00~18:00에 답변드립니다.
      </p>

      <dl className="mt-7 space-y-3">
        {FAQS.map(({ q, a }) => (
          <div key={q} className="rounded-2xl border border-line p-4 md:p-5">
            <dt className="flex gap-2 text-[15px] font-bold md:text-base">
              <span className="text-primary">Q.</span>
              {q}
            </dt>
            <dd className="mt-2 pl-6 text-[13px] leading-relaxed text-sub md:text-[14px]">
              {a}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
