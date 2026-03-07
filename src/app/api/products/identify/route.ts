import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { identifyFromUrl, identifyFromText } from '@/lib/compare/identify';
import { generateEmbedding } from '@/lib/ingest/embed';
import { createClient } from '@/lib/supabase';

const IdentifyRequestSchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(1).optional(),
}).refine((d) => d.url || d.text, {
  message: 'Either url or text is required',
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = IdentifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join('; ') || 'Invalid request' },
      { status: 400 }
    );
  }

  const { url, text } = parsed.data;

  let rawProduct;
  try {
    rawProduct = url
      ? await identifyFromUrl(url)
      : await identifyFromText(text!);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Identification failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  // Generate embedding
  let embedding: number[];
  try {
    // buildEmbeddingInput needs a full Product-like object — fill defaults
    const productForEmbed = {
      name: rawProduct.name,
      category: rawProduct.category,
      brand: rawProduct.brand ?? null,
      description: rawProduct.description ?? null,
      materials: rawProduct.materials ?? [],
      style_tags: rawProduct.style_tags ?? [],
    };
    embedding = await generateEmbedding(productForEmbed as Parameters<typeof generateEmbedding>[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Embedding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Upsert to products table — enumerate fields explicitly to prevent unknown
  // GPT-returned properties from being forwarded to Supabase.
  const supabase = createClient();
  const insertData = {
    name: rawProduct.name,
    category: rawProduct.category,
    brand: rawProduct.brand ?? null,
    price: rawProduct.price ?? null,
    sale_price: rawProduct.sale_price ?? null,
    currency: rawProduct.currency ?? 'USD',
    url: rawProduct.url ?? null,
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

  const { data, error } = await supabase
    .from('products')
    .upsert(insertData, { onConflict: 'external_id,retailer_id', ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    // If upsert fails (e.g., no external_id), just insert
    const { data: inserted, error: insertError } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: `DB insert failed: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ product: inserted });
  }

  return NextResponse.json({ product: data });
}
