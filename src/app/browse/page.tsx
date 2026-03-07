import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export const metadata: Metadata = {
  title: 'Browse Furniture',
  description: 'Browse furniture by category and find the best value alternatives.',
};

const CATEGORIES: { slug: string; label: string; icon: string }[] = [
  { slug: 'sofa', label: 'Sofas', icon: '🛋️' },
  { slug: 'bed', label: 'Beds', icon: '🛏️' },
  { slug: 'table', label: 'Tables', icon: '🪑' },
  { slug: 'chair', label: 'Chairs', icon: '🪑' },
  { slug: 'desk', label: 'Desks', icon: '🖥️' },
  { slug: 'storage', label: 'Storage', icon: '🗄️' },
  { slug: 'lighting', label: 'Lighting', icon: '💡' },
  { slug: 'rug', label: 'Rugs', icon: '🏡' },
];

async function getCategoryCounts(): Promise<Record<string, number>> {
  const supabase = createClient();
  const results = await Promise.all(
    CATEGORIES.map((c) =>
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('category', c.slug)
        .eq('is_active', true)
        .then(({ count }) => [c.slug, count ?? 0] as [string, number])
    )
  );
  return Object.fromEntries(results);
}

export default async function BrowsePage() {
  const counts = await getCategoryCounts();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Browse by Category</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Explore furniture categories and compare products for the best value.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/browse/${cat.slug}`}
            className="flex flex-col gap-2 rounded-2xl border border-zinc-100 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="text-3xl">{cat.icon}</span>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{cat.label}</h2>
            <p className="text-sm text-zinc-400">
              {counts[cat.slug] === 0
                ? 'Coming soon'
                : `${counts[cat.slug].toLocaleString()} product${counts[cat.slug] === 1 ? '' : 's'}`}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
