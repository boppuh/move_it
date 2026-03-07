import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchComparisonBySlug } from '@/lib/compare/fetch-comparison';
import { formatPrice } from '@/lib/format';
import { ValueScoreBadge } from '@/components/comparison/ValueScoreBadge';
import { AlternativeCard } from '@/components/comparison/AlternativeCard';
import { SpecTable } from '@/components/comparison/SpecTable';
import { AnalysisSummary } from '@/components/comparison/AnalysisSummary';
import { ShareButton } from '@/components/comparison/ShareButton';
import type { SimilarProduct, ValueAnalysis } from '@/lib/types';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const getComparisonData = cache(fetchComparisonBySlug);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getComparisonData(slug);

  if (!data || !data.sourceProduct) {
    return { title: 'Comparison Not Found' };
  }

  const { sourceProduct, comparison } = data;
  const score = comparison.value_score;
  const scoreText = score != null ? ` — Value Score: ${score}/100` : '';

  return {
    title: `${sourceProduct.name}${scoreText}`,
    description: `AI-powered value comparison for the ${sourceProduct.name}. Is it worth the price? See similar alternatives.`,
    openGraph: {
      title: `Is the ${sourceProduct.name} worth it?`,
      description: (comparison.analysis as ValueAnalysis | null)?.verdict ?? 'See AI-powered furniture value comparison.',
      type: 'article',
    },
  };
}

export default async function ComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getComparisonData(slug);

  if (!data || !data.sourceProduct) {
    notFound();
  }

  const { comparison, sourceProduct, altProducts, altScores } = data;
  const analysis = comparison.analysis as ValueAnalysis | null;

  // Build alternatives with real similarity scores from stored JSONB
  const scoreMap = new Map(altScores.map((a) => [a.id, a.score ?? 0]));
  const alternatives = altProducts
    .filter((p) => p.id)
    .map((p) => ({
      ...p,
      id: p.id!,
      name: p.name,
      brand: p.brand ?? null,
      price: p.price ?? null,
      sale_price: p.sale_price ?? null,
      url: p.url ?? null,
      image_url: p.image_url ?? null,
      retailer_id: p.retailer_id ?? null,
      similarity_score: scoreMap.get(p.id!) ?? 0,
      category: p.category,
    } as SimilarProduct & { name: string; brand: string | null; category: string }))
    .sort((a, b) => b.similarity_score - a.similarity_score);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12">
      {/* Back */}
      <Link
        href="/"
        className="w-fit text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        ← New comparison
      </Link>

      {/* Header */}
      <section className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
        {comparison.value_score != null && (
          <div className="shrink-0">
            <ValueScoreBadge score={comparison.value_score} size="lg" />
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            {sourceProduct.brand && (
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-400">
                {sourceProduct.brand}
              </p>
            )}
            <h1 className="text-2xl font-bold leading-snug text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {sourceProduct.name}
            </h1>
          </div>

          {sourceProduct.price != null && (
            <p className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
              {formatPrice(sourceProduct.price)}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <ShareButton slug={slug} title={sourceProduct.name} />
            {sourceProduct.url && (
              <a
                href={sourceProduct.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                View original →
              </a>
            )}
          </div>
        </div>
      </section>

      {/* AI Analysis */}
      {analysis && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            AI Analysis
          </h2>
          <AnalysisSummary
            verdict={analysis.verdict}
            strengths={analysis.strengths}
            weaknesses={analysis.weaknesses}
          />
        </section>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Similar Alternatives
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.map((alt) => (
              <AlternativeCard
                key={alt.id}
                product={alt}
                sourcePrice={sourceProduct.price ?? null}
                comparisonNote={analysis?.comparison_notes?.[alt.id]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Spec Table */}
      {alternatives.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Side-by-Side Specs
          </h2>
          <div className="rounded-2xl border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <SpecTable source={sourceProduct} alternatives={alternatives} />
          </div>
        </section>
      )}

      {alternatives.length === 0 && (
        <div className="rounded-2xl border border-zinc-100 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500 dark:text-zinc-400">
            No similar products found in our database yet. Check back after more products are ingested.
          </p>
        </div>
      )}
    </main>
  );
}
