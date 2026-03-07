import { NextRequest, NextResponse } from 'next/server';
import { fetchComparisonBySlug } from '@/lib/compare/fetch-comparison';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const data = await fetchComparisonBySlug(slug, false);

  if (!data) {
    return NextResponse.json({ error: 'Comparison not found' }, { status: 404 });
  }

  return NextResponse.json({
    comparison: data.comparison,
    source_product: data.sourceProduct,
    alternatives: data.altProducts,
  });
}
