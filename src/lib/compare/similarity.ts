import { createClient } from '@/lib/supabase';
import { SimilarProduct } from '@/lib/types';

const SIMILARITY_THRESHOLD = 0.75;
const DEFAULT_LIMIT = 5;

interface SimilarProductsOptions {
  priceMin?: number;
  priceMax?: number;
  excludeId?: string;
  limit?: number;
}

export async function findSimilarProducts(
  embedding: number[],
  category: string,
  options: SimilarProductsOptions = {}
): Promise<SimilarProduct[]> {
  const { priceMin, priceMax, excludeId, limit = DEFAULT_LIMIT } = options;
  const supabase = createClient();

  // pgvector cosine similarity via Supabase RPC (see migration for SQL function)
  const embeddingStr = `[${embedding.join(',')}]`;

  const { data, error } = await supabase.rpc('find_similar_products', {
    query_embedding: embeddingStr,
    query_category: category,
    exclude_id: excludeId ?? null,
    price_min: priceMin ?? null,
    price_max: priceMax ?? null,
    result_limit: limit,
    similarity_threshold: SIMILARITY_THRESHOLD,
  });

  if (error) {
    throw new Error(`Similarity search failed: ${error.message}`);
  }

  return (data as SimilarProduct[]) ?? [];
}

export async function findSimilarProductsById(
  productId: string,
  options: SimilarProductsOptions = {}
): Promise<SimilarProduct[]> {
  const supabase = createClient();

  // Fetch the source product's embedding and category
  const { data: product, error } = await supabase
    .from('products')
    .select('embedding, category')
    .eq('id', productId)
    .single();

  if (error || !product) {
    throw new Error(`Product not found: ${productId}`);
  }

  if (!product.embedding) {
    throw new Error(`Product ${productId} has no embedding`);
  }

  // Supabase returns pgvector values as strings — parse if needed
  const embedding: number[] =
    typeof product.embedding === 'string'
      ? JSON.parse(product.embedding)
      : product.embedding;

  return findSimilarProducts(embedding, product.category, {
    ...options,
    excludeId: productId,
  });
}
