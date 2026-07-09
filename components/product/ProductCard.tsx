import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { won } from "@/lib/format";

export default function ProductCard({
  product,
  horizontal = false,
}: {
  product: Product;
  horizontal?: boolean;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group block ${horizontal ? "w-[260px] shrink-0" : ""}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-canvas">
        {product.thumbnail_url ? (
          <Image
            src={product.thumbnail_url}
            alt={product.title}
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover transition-transform duration-300 group-active:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-faint">
            이미지 준비중
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-lg bg-ink/70 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {product.duration_text}
        </span>
        {product.is_featured && (
          <span className="absolute right-2.5 top-2.5 rounded-lg bg-accent px-2 py-1 text-[11px] font-bold text-white">
            추천
          </span>
        )}
      </div>
      <div className="mt-2.5 px-0.5">
        {product.category?.name && (
          <p className="text-[11px] font-semibold text-primary">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-[15px] font-bold leading-snug">
          {product.title}
        </h3>
        {product.summary && !horizontal && (
          <p className="mt-1 line-clamp-1 text-[13px] text-sub">{product.summary}</p>
        )}
        <p className="mt-1.5 text-[15px] font-extrabold text-ink">
          {won(product.base_price)}
          <span className="font-medium text-faint">~</span>
        </p>
      </div>
    </Link>
  );
}
