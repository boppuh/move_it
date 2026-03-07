import { Suspense } from 'react';
import { SearchBar } from '@/components/search/SearchBar';
import { TrendingComparisons } from '@/components/search/TrendingComparisons';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-16 px-4 py-24">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-xl text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Is it worth it?
        </h1>
        <p className="max-w-md text-lg text-zinc-500 dark:text-zinc-400">
          Paste a furniture URL or describe what you&apos;re looking at. We&apos;ll find similar
          pieces and tell you if you&apos;re getting a good deal.
        </p>

        <SearchBar />
      </section>

      {/* Trending */}
      <Suspense fallback={null}>
        <TrendingComparisons />
      </Suspense>
    </main>
  );
}
