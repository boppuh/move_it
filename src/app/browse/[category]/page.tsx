import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';

const CATEGORY_LABELS: Record<string, string> = {
  sofa: 'Sofas',
  bed: 'Beds',
  table: 'Tables',
  chair: 'Chairs',
  desk: 'Desks',
  storage: 'Storage',
  lighting: 'Lighting',
  rug: 'Rugs',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

interface PageProps {
  params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const label = CATEGORY_LABELS[category];
  if (!label) return { title: 'Not Found' };
  return {
    title: `${label} Furniture`,
    description: `Browse ${label.toLowerCase()} and compare for the best value.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const label = CATEGORY_LABELS[category];
  if (!label) notFound();

  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand, price, sale_price, url, image_url, category')
    .eq('category', category)
    .eq('is_active', true)
    .order('price', { ascending: true, nullsFirst: false })
    .limit(20);

  const items = (products ?? []) as Product[];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${label} Furniture`,
    numberOfItems: items.length,
    itemListElement: items.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/product/${p.id}`,
      name: p.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12">
        <div>
          <Link
            href="/browse"
            className="mb-4 inline-block text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            ← Browse
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{label}</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">{items.length} products</p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-100 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-500 dark:text-zinc-400">
              No products in this category yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => {
              const effectivePrice =
                product.sale_price != null && product.sale_price < (product.price ?? Infinity)
                  ? product.sale_price
                  : product.price;

              return (
                <div
                  key={product.id}
                  className="flex flex-col rounded-2xl border border-zinc-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                >
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
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    {product.brand && (
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                        {product.brand}
                      </p>
                    )}
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
                      {product.name}
                    </h2>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {formatPrice(effectivePrice)}
                    </p>
                    <div className="mt-auto pt-2">
                      <Link
                        href={`/product/${product.id}`}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                      >
                        Compare →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
