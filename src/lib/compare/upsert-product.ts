import { createClient } from '@/lib/supabase';
import type { Product, RawProduct } from '@/lib/types';

/**
 * Builds the product row from a RawProduct + embedding vector and upserts it
 * into the products table, falling back to a plain insert when the upsert
 * constraint (external_id, retailer_id) cannot be matched.
 *
 * @param urlFallback  Optional URL to use when rawProduct.url is absent
 *                     (e.g. the user-submitted URL from the pipeline).
 */
export async function upsertProduct(
  rawProduct: RawProduct,
  embedding: number[],
  urlFallback?: string
): Promise<Product> {
  const supabase = createClient();

  const insertData = {
    name: rawProduct.name,
    category: rawProduct.category,
    brand: rawProduct.brand ?? null,
    price: rawProduct.price ?? null,
    sale_price: rawProduct.sale_price ?? null,
    currency: rawProduct.currency ?? 'USD',
    url: rawProduct.url ?? urlFallback ?? null,
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

  const { data: upserted, error: upsertError } = await supabase
    .from('products')
    .upsert(insertData, { onConflict: 'external_id,retailer_id', ignoreDuplicates: false })
    .select()
    .single();

  if (upsertError) {
    // No external_id / no matching row — fall back to plain insert
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save product: ${insertError.message}`);
    }
    return inserted as Product;
  }

  return upserted as Product;
}
