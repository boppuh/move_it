import Image from 'next/image';
import Link from 'next/link';
import type { SimilarProduct } from '@/lib/types';
import { formatPrice } from '@/lib/format';

interface AlternativeCardProps {
  product: SimilarProduct & { name: string; brand: string | null };
  sourcePrice: number | null;
  comparisonNote?: string;
}

function savingsPercent(sourcePrice: number, altPrice: number): number {
  return Math.round(((sourcePrice - altPrice) / sourcePrice) * 100);
}

export function AlternativeCard({ product, sourcePrice, comparisonNote }: AlternativeCardProps) {
  // Use the effective (displayed) price — sale_price when available, otherwise regular price
  const effectivePrice =
    product.sale_price != null && product.sale_price < (product.price ?? Infinity)
      ? product.sale_price
      : product.price;

  const savings =
    sourcePrice != null && effectivePrice != null && effectivePrice < sourcePrice
      ? savingsPercent(sourcePrice, effectivePrice)
      : null;

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-2xl bg-zinc-50 dark:bg-zinc-800">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-zinc-200 dark:text-zinc-700">
            🛋️
          </div>
        )}

        {savings != null && savings > 0 && (
          <div className="absolute right-3 top-3 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            Save {savings}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand && (
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {product.brand}
          </p>
        )}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            {formatPrice(effectivePrice)}
          </span>
          {product.price != null && effectivePrice !== product.price && (
            <span className="text-sm text-zinc-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {comparisonNote && (
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {comparisonNote}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400">
            {Math.round(product.similarity_score * 100)}% similar
          </span>

          {product.url && (
            <Link
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              View →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
