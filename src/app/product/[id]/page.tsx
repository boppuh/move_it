import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import { AffiliateButton } from '@/components/product/AffiliateButton';
import type { Product, Retailer } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('name, price, brand')
    .eq('id', id)
    .single();

  if (!data) return { title: 'Product Not Found' };

  const priceText = data.price != null ? ` — ${formatPrice(data.price)}` : '';
  return {
    title: `${data.name}${priceText}`,
    description: `Compare ${data.name} and find similar alternatives at better prices.`,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('*, retailers(*)')
    .eq('id', id)
    .single();

  if (error || !product) notFound();

  const retailer = product.retailers as Retailer | null;
  const p = product as Product;

  const effectivePrice =
    p.sale_price != null && p.sale_price < (p.price ?? Infinity) ? p.sale_price : p.price;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12">
      <Link
        href="/browse"
        className="w-fit text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        ← Browse
      </Link>

      <div className="grid gap-10 sm:grid-cols-2">
        {/* Hero image */}
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-800">
          {p.image_url ? (
            <Image
              src={p.image_url}
              alt={p.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl text-zinc-200 dark:text-zinc-700">
              🛋️
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          {p.brand && (
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">{p.brand}</p>
          )}
          <h1 className="text-2xl font-bold leading-snug text-zinc-900 dark:text-zinc-50">
            {p.name}
          </h1>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatPrice(effectivePrice)}
            </span>
            {p.price != null && effectivePrice !== p.price && (
              <span className="text-lg text-zinc-400 line-through">{formatPrice(p.price)}</span>
            )}
          </div>

          {retailer && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Sold by <span className="font-medium text-zinc-700 dark:text-zinc-300">{retailer.name}</span>
            </p>
          )}

          {p.rating != null && (
            <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
              <span>★ {p.rating.toFixed(1)}</span>
              {p.review_count != null && (
                <span>({p.review_count.toLocaleString()} reviews)</span>
              )}
            </div>
          )}

          {p.dimensions && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {p.dimensions.width}″W × {p.dimensions.height}″H
              {p.dimensions.depth != null ? ` × ${p.dimensions.depth}″D` : ''}
            </p>
          )}

          {p.materials && p.materials.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.materials.map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          {p.style_tags && p.style_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {p.style_tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {p.id && (
              <AffiliateButton
                productId={p.id}
                retailerName={retailer?.name}
                price={effectivePrice}
              />
            )}
            <Link
              href={`/?q=${encodeURIComponent(p.name)}`}
              className="inline-flex items-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Find alternatives →
            </Link>
          </div>
        </div>
      </div>

      {p.description && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Description
          </h2>
          <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">{p.description}</p>
        </section>
      )}
    </main>
  );
}
