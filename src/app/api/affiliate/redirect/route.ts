import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildAffiliateUrl } from '@/lib/affiliate/link-builder';
import { logClick } from '@/lib/affiliate/click-logger';
import type { Product, Retailer } from '@/lib/types';
import { createClient } from '@/lib/supabase';

const QuerySchema = z.object({
  pid: z.string().uuid(),
  cid: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    pid: searchParams.get('pid'),
    cid: searchParams.get('cid') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  const { pid, cid } = parsed.data;
  const supabase = createClient();

  const { data: product, error } = await supabase
    .from('products')
    .select('*, retailers(*)')
    .eq('id', pid)
    .single();

  if (error || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const retailer = product.retailers as Retailer | null;
  const affiliateUrl = retailer
    ? buildAffiliateUrl(product as Product, retailer)
    : (product.url ?? null);

  if (!affiliateUrl) {
    return NextResponse.json({ error: 'No URL available for this product' }, { status: 404 });
  }

  // Fire-and-forget click log — redirect regardless of outcome
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    undefined;

  void logClick({
    productId: pid,
    comparisonId: cid,
    retailerId: retailer?.id,
    referrer: request.headers.get('referer') ?? undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip,
  });

  return NextResponse.redirect(affiliateUrl, 302);
}
