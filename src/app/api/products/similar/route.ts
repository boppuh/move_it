import { NextRequest, NextResponse } from 'next/server';
import { SimilarProductsQuerySchema } from '@/lib/types';
import { findSimilarProductsById } from '@/lib/compare/similarity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = SimilarProductsQuerySchema.safeParse({
      product_id: searchParams.get('product_id'),
      category: searchParams.get('category') ?? undefined,
      price_min: searchParams.get('price_min') ?? undefined,
      price_max: searchParams.get('price_max') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors, status: 400 },
        { status: 400 }
      );
    }

    const { product_id, price_min, price_max, limit } = parsed.data;

    const products = await findSimilarProductsById(product_id, {
      priceMin: price_min,
      priceMax: price_max,
      limit,
    });

    return NextResponse.json({
      products,
      source_product_id: product_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message, status }, { status });
  }
}
