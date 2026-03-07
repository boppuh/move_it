import { createClient } from '@/lib/supabase';
import { identifyFromUrl, identifyFromText } from './identify';
import { generateEmbedding } from '@/lib/ingest/embed';
import { findSimilarProducts } from './similarity';
import { generateValueAnalysis } from './analyze';
import type { Product, SimilarProduct } from '@/lib/types';

export interface ComparisonInput {
  url?: string;
  text?: string;
}

export interface ComparisonResult {
  id: string;
  slug: string;
  source_product: Product;
  alternatives: (SimilarProduct & { name: string; brand: string | null; category: string })[];
  value_score: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  comparison_notes: Record<string, string>;
  view_count: number;
  share_count: number;
  created_at: string;
}

/**
 * Runs the full comparison pipeline:
 * 1. Identify source product (URL or text)
 * 2. Generate embedding
 * 3. Find similar products
 * 4. Generate value analysis
 * 5. Persist comparison to DB
 */
export async function runComparison(input: ComparisonInput): Promise<ComparisonResult> {
  if (!input.url && !input.text) {
    throw new Error('Either url or text is required');
  }

  const supabase = createClient();

  // Step 1: Identify
  const rawProduct = input.url
    ? await identifyFromUrl(input.url)
    : await identifyFromText(input.text!);

  // Step 2: Embed + upsert source product
  const productForEmbed = {
    name: rawProduct.name,
    category: rawProduct.category,
    brand: rawProduct.brand ?? null,
    description: rawProduct.description ?? null,
    materials: rawProduct.materials ?? [],
    style_tags: rawProduct.style_tags ?? [],
  } as Product;

  const embedding = await generateEmbedding(productForEmbed);

  // Upsert to products table
  const insertData = {
    name: rawProduct.name,
    category: rawProduct.category,
    brand: rawProduct.brand ?? null,
    price: rawProduct.price ?? null,
    sale_price: rawProduct.sale_price ?? null,
    currency: rawProduct.currency ?? 'USD',
    url: rawProduct.url ?? input.url ?? null,
    image_url: rawProduct.image_url ?? null,
    description: rawProduct.description ?? null,
    dimensions: rawProduct.dimensions ?? null,
    materials: rawProduct.materials ?? [],
    style_tags: rawProduct.style_tags ?? [],
    rating: rawProduct.rating ?? null,
    review_count: rawProduct.review_count ?? null,
    external_id: rawProduct.external_id ?? null,
    retailer_id: rawProduct.retailer_id ?? null,
    embedding: `[${embedding.join(',')}]`,
    is_active: true,
  };

  // Try upsert on (external_id, retailer_id); fall back to plain insert for user-submitted URLs
  let sourceProduct: Product;
  const { data: upserted, error: upsertError } = await supabase
    .from('products')
    .upsert(insertData, { onConflict: 'external_id,retailer_id', ignoreDuplicates: false })
    .select()
    .single();

  if (upsertError) {
    // No external_id / unique conflict — just insert a new row
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save source product: ${insertError.message}`);
    }
    sourceProduct = inserted as Product;
  } else {
    sourceProduct = upserted as Product;
  }

  // Step 3: Find similar products
  const similarRaw = await findSimilarProducts(embedding, rawProduct.category, {
    excludeId: sourceProduct.id,
    limit: 5,
  });

  // Enrich alternatives with name/brand/category from DB
  const altIds = similarRaw.map((s) => s.id);
  let alternatives: (SimilarProduct & { name: string; brand: string | null; category: string })[] = [];

  if (altIds.length > 0) {
    const { data: altProducts } = await supabase
      .from('products')
      .select('id, name, brand, category')
      .in('id', altIds);

    const altMap = new Map(
      (altProducts ?? []).map((p: { id: string; name: string; brand: string | null; category: string }) => [p.id, p])
    );

    alternatives = similarRaw.map((s) => {
      const product = altMap.get(s.id);
      return {
        ...s,
        name: product?.name ?? s.name ?? 'Unknown',
        brand: product?.brand ?? s.brand ?? null,
        category: product?.category ?? rawProduct.category,
      };
    });
  }

  // Step 4: Generate value analysis
  const analysis = await generateValueAnalysis(
    {
      name: sourceProduct.name,
      brand: sourceProduct.brand ?? null,
      price: sourceProduct.price ?? null,
      description: sourceProduct.description ?? null,
      materials: sourceProduct.materials ?? [],
      style_tags: sourceProduct.style_tags ?? [],
      category: sourceProduct.category,
    },
    alternatives
  );

  // Step 5: Persist comparison
  const slug = generateSlug(sourceProduct.name);

  // Store alternatives as [{id, score}] JSONB to preserve real similarity scores
  const alternativesWithScores = alternatives.map((a) => ({
    id: a.id,
    score: a.similarity_score,
  }));

  const { data: comparison, error: compareError } = await supabase
    .from('comparisons')
    .insert({
      slug,
      source_product: sourceProduct.id,
      alternatives: alternativesWithScores,
      analysis: analysis,
      value_score: analysis.value_score,
      view_count: 0,
      share_count: 0,
    })
    .select()
    .single();

  if (compareError) {
    throw new Error(`Failed to save comparison: ${compareError.message}`);
  }

  return {
    id: comparison.id,
    slug: comparison.slug,
    source_product: sourceProduct,
    alternatives,
    value_score: analysis.value_score,
    verdict: analysis.verdict,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    comparison_notes: analysis.comparison_notes,
    view_count: comparison.view_count,
    share_count: comparison.share_count,
    created_at: comparison.created_at,
  };
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  // Append short random suffix to avoid collisions
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
