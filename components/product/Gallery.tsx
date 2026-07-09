"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/types";

export default function Gallery({
  images,
  title,
}: {
  images: ProductImage[];
  title: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center bg-canvas text-faint">
        이미지 준비중
      </div>
    );
  }

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
      >
        {images.map((img, i) => (
          <div
            key={img.id}
            className="relative aspect-[4/3] w-full shrink-0 snap-center bg-canvas"
          >
            <Image
              src={img.image_url}
              alt={`${title} 사진 ${i + 1}`}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
      <span className="absolute bottom-3 right-3 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        {index + 1} / {images.length}
      </span>
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
