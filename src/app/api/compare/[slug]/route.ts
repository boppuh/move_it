import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = createClient();

  // Fetch comparison
  const { data: comparison, error } = await supabase
    .from('comparisons')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !comparison) {
    return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
  }

  const PRODUCT_FIELDS = 'id, name, brand, price, sale_price, url, image_url, retailer_id, category, materials, style_tags, dimensions, rating, review_count';

  // Increment view count (fire-and-forget)
  void Promise.resolve(
    supabase
      .from('comparisons')
      .update({ view_count: (comparison.view_count ?? 0) + 1 })
      .eq('id', comparison.id)
  ).catch((err) => console.error('[view_count]', err));

  // Fetch source product and alternatives in parallel
  const altEntries: { id: string }[] = comparison.alternatives ?? [];
  const altIds = altEntries.map((a) => a.id).filter(Boolean);

  const [sourceResult, altResult] = await Promise.all([
    comparison.source_product
      ? supabase.from('products').select(PRODUCT_FIELDS).eq('id', comparison.source_product).single()
      : Promise.resolve({ data: null }),
    altIds.length > 0
      ? supabase.from('products').select(PRODUCT_FIELDS).in('id', altIds)
      : Promise.resolve({ data: [] }),
  ]);

  const sourceProduct = sourceResult.data;
  const altProducts = altResult.data;

  return NextResponse.json({
    comparison,
    source_product: sourceProduct,
    alternatives: altProducts,
  });
}
