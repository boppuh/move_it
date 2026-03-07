import { createClient } from '@/lib/supabase';
import type { Product } from '@/lib/types';

export interface StoredAlternative {
  id: string;
  score: number | null;
}

export const PRODUCT_FIELDS =
  'id, name, brand, price, sale_price, url, image_url, retailer_id, category, materials, style_tags, dimensions, rating, review_count';

export interface ComparisonData {
  comparison: {
    id: string;
    slug: string;
    source_product: string | null;
    alternatives: StoredAlternative[];
    analysis: unknown;
    value_score: number | null;
    view_count: number;
    share_count: number;
    created_at: string;
  };
  sourceProduct: Product | null;
  altProducts: Product[];
  altScores: StoredAlternative[];
}

/**
 * Fetches a comparison by slug and returns it with source and alternative products.
 * Pass trackView=false for programmatic/API callers that should not inflate view counts.
 */
export async function fetchComparisonBySlug(slug: string, trackView = true): Promise<ComparisonData | null> {
  const supabase = createClient();

  const { data: comparison, error } = await supabase
    .from('comparisons')
    .select('id, slug, source_product, alternatives, analysis, value_score, view_count, share_count, created_at')
    .eq('slug', slug)
    .single();

  if (error || !comparison) return null;

  // Increment view count atomically (fire-and-forget) — only for real page visits
  if (trackView) {
    void (async () => {
      const { error: rpcErr } = await supabase.rpc('increment_view_count', { comparison_id: comparison.id });
      if (rpcErr) console.error('[view_count]', rpcErr);
    })();
  }

  const altEntries: StoredAlternative[] = comparison.alternatives ?? [];
  const altIds = altEntries.map((a) => a.id).filter(Boolean);

  const [sourceResult, altResult] = await Promise.all([
    comparison.source_product
      ? supabase.from('products').select(PRODUCT_FIELDS).eq('id', comparison.source_product).single()
      : Promise.resolve({ data: null }),
    altIds.length
      ? supabase.from('products').select(PRODUCT_FIELDS).in('id', altIds)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    comparison,
    sourceProduct: sourceResult.data as Product | null,
    altProducts: (altResult.data ?? []) as Product[],
    altScores: altEntries,
  };
}
