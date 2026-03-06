import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { IngestFeedRequestSchema, RawProduct } from '@/lib/types';
import { parseCjFeed } from '@/lib/ingest/parsers/cj-parser';
import { parseShareAsaleFeed } from '@/lib/ingest/parsers/shareasale-parser';
import { parseRakutenFeed } from '@/lib/ingest/parsers/rakuten-parser';
import { extractMaterials, inferStyleTags, parseDimensions } from '@/lib/ingest/normalize';
import { batchGenerateEmbeddings } from '@/lib/ingest/embed';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Allow in development when not configured
  return request.headers.get('x-cron-secret') === secret;
}

async function normalizeProduct(raw: RawProduct, retailerId: string): Promise<Record<string, unknown>> {
  const [materials, styleTags] = await Promise.all([
    raw.materials && raw.materials.length > 0
      ? Promise.resolve(raw.materials)
      : extractMaterials(raw.description ?? raw.name),
    raw.style_tags && raw.style_tags.length > 0
      ? Promise.resolve(raw.style_tags)
      : inferStyleTags(raw.name, raw.description ?? ''),
  ]);

  const dimensions =
    raw.dimensions ??
    (raw.description ? parseDimensions(raw.description) : null);

  return {
    retailer_id: retailerId,
    external_id: raw.external_id ?? null,
    name: raw.name,
    brand: raw.brand ?? null,
    category: raw.category.toLowerCase().trim(),
    price: raw.price ?? null,
    sale_price: raw.sale_price ?? null,
    currency: raw.currency ?? 'USD',
    url: raw.url ?? null,
    image_url: raw.image_url ?? null,
    description: raw.description ?? null,
    dimensions: dimensions ?? null,
    materials,
    style_tags: styleTags,
    rating: raw.rating ?? null,
    review_count: raw.review_count ?? null,
    is_active: true,
    last_synced_at: new Date().toISOString(),
  };
}

async function processRetailer(
  supabase: ReturnType<typeof createClient>,
  retailerId: string,
  feedUrl: string,
  feedFormat: string
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;

  // Fetch feed
  const feedResponse = await fetch(feedUrl);
  if (!feedResponse.ok) {
    return { inserted, updated, errors: [`Failed to fetch feed: ${feedResponse.statusText}`] };
  }
  const feedContent = await feedResponse.text();

  // Parse feed
  let rawProducts: RawProduct[] = [];
  try {
    if (feedFormat === 'xml') {
      rawProducts = parseRakutenFeed(feedContent);
    } else if (feedFormat === 'csv') {
      // Determine which CSV parser to use based on retailer
      // Try CJ first, fall back to ShareASale format
      rawProducts = parseCjFeed(feedContent);
      if (rawProducts.length === 0) {
        rawProducts = parseShareAsaleFeed(feedContent);
      }
    }
  } catch (err) {
    return { inserted, updated, errors: [`Parse error: ${String(err)}`] };
  }

  if (rawProducts.length === 0) {
    return { inserted, updated, errors: ['No products parsed from feed'] };
  }

  // Normalize and upsert in batches
  const UPSERT_BATCH = 50;
  const newProductIds: string[] = [];

  for (let i = 0; i < rawProducts.length; i += UPSERT_BATCH) {
    const batch = rawProducts.slice(i, i + UPSERT_BATCH);

    const normalized = await Promise.all(
      batch.map(async (raw) => {
        try {
          return await normalizeProduct(raw, retailerId);
        } catch (err) {
          errors.push(`Normalize error for "${raw.name}": ${String(err)}`);
          return null;
        }
      })
    );

    const valid = normalized.filter((p): p is Record<string, unknown> => p !== null);

    if (valid.length === 0) continue;

    const { data, error } = await supabase
      .from('products')
      .upsert(valid, { onConflict: 'external_id,retailer_id', ignoreDuplicates: false })
      .select('id, external_id');

    if (error) {
      errors.push(`Upsert error: ${error.message}`);
      continue;
    }

    // Track new products for embedding generation
    data?.forEach((p) => newProductIds.push(p.id));
    inserted += data?.length ?? 0;
  }

  // Generate embeddings for new/updated products
  if (newProductIds.length > 0) {
    const { data: productsForEmbedding } = await supabase
      .from('products')
      .select('*')
      .in('id', newProductIds)
      .is('embedding', null);

    if (productsForEmbedding && productsForEmbedding.length > 0) {
      try {
        await batchGenerateEmbeddings(productsForEmbedding);
      } catch (err) {
        errors.push(`Embedding generation error: ${String(err)}`);
      }
    }
  }

  updated = inserted; // upsert counts both inserts and updates
  inserted = 0;       // we don't distinguish without checking created_at

  return { inserted, updated, errors };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized', status: 401 }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = IngestFeedRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors, status: 400 },
        { status: 400 }
      );
    }

    const { retailer_slug } = parsed.data;
    const supabase = createClient();

    // Fetch target retailers
    let query = supabase.from('retailers').select('*').eq('is_active', true);
    if (retailer_slug) {
      query = query.eq('slug', retailer_slug);
    }

    const { data: retailers, error: retailersError } = await query;

    if (retailersError) {
      return NextResponse.json(
        { error: `Failed to fetch retailers: ${retailersError.message}`, status: 500 },
        { status: 500 }
      );
    }

    if (!retailers || retailers.length === 0) {
      return NextResponse.json(
        { error: 'No active retailers found', status: 404 },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      retailers
        .filter((r) => r.feed_url && r.feed_format)
        .map(async (retailer) => {
          const result = await processRetailer(
            supabase,
            retailer.id,
            retailer.feed_url!,
            retailer.feed_format!
          );
          return { retailer: retailer.slug, ...result };
        })
    );

    const totals = results.reduce(
      (acc, r) => ({
        inserted: acc.inserted + r.inserted,
        updated: acc.updated + r.updated,
        errors: [...acc.errors, ...r.errors.map((e) => `[${r.retailer}] ${e}`)],
      }),
      { inserted: 0, updated: 0, errors: [] as string[] }
    );

    return NextResponse.json({ ...totals, retailers: results });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), status: 500 },
      { status: 500 }
    );
  }
}
