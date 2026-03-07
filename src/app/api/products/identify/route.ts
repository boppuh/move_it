import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { identifyFromUrl, identifyFromText } from '@/lib/compare/identify';
import { generateEmbedding } from '@/lib/ingest/embed';
import { upsertProduct } from '@/lib/compare/upsert-product';

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

  let product;
  try {
    product = await upsertProduct(rawProduct, embedding);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'DB error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ product });
}
