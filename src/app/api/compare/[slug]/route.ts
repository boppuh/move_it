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

  // Increment view count atomically (fire-and-forget)
  void (async () => {
    const { error: rpcErr } = await supabase.rpc('increment_view_count', { comparison_id: comparison.id });
    if (rpcErr) console.error('[view_count]', rpcErr);
  })();

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
