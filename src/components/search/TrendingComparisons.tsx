import Link from 'next/link';
import { createClient } from '@/lib/supabase';

interface TrendingComparison {
  id: string;
  slug: string;
  value_score: number | null;
  view_count: number;
  source_product_name: string | null;
}

async function getTrendingComparisons(): Promise<TrendingComparison[]> {
  const supabase = createClient();

  // Single query: join products for source product name
  const { data } = await supabase
    .from('comparisons')
    .select('id, slug, value_score, view_count, products(name)')
    .order('view_count', { ascending: false })
    .limit(6);

  if (!data?.length) return [];

  return data.map((c: {
    id: string;
    slug: string;
    value_score: number | null;
    view_count: number;
    products: { name: string }[] | { name: string } | null;
  }) => {
    // Supabase returns FK many-to-one joins as arrays; take first element
    const productName = Array.isArray(c.products)
      ? (c.products[0]?.name ?? null)
      : (c.products?.name ?? null);
    return {
      id: c.id,
      slug: c.slug,
      value_score: c.value_score,
      view_count: c.view_count,
      source_product_name: productName,
    };
  });
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-zinc-400';
  if (score >= 70) return 'text-green-600 dark:text-green-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-500 dark:text-red-400';
}

export async function TrendingComparisons() {
  const trending = await getTrendingComparisons();

  if (!trending.length) return null;

  return (
    <section className="w-full max-w-2xl">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Trending Comparisons
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {trending.map((item) => (
          <Link
            key={item.id}
            href={`/compare/${item.slug}`}
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-white px-4 py-3 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <span className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {item.source_product_name ?? item.slug}
            </span>
            {item.value_score != null && (
              <span className={`ml-3 shrink-0 text-sm font-bold ${scoreColor(item.value_score)}`}>
                {item.value_score}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
