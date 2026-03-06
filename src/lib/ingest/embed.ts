import { openai } from '@/lib/openai';
import { createClient } from '@/lib/supabase';
import { Product } from '@/lib/types';

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 200; // ~300 batches/min, well under 3000 RPM

export function buildEmbeddingInput(product: Product): string {
  const materials = product.materials?.join(', ') ?? '';
  const styleTags = product.style_tags?.join(', ') ?? '';
  const description = (product.description ?? '').slice(0, 200);

  return `${product.category} | ${product.brand ?? ''} | ${product.name} | Materials: ${materials} | Style: ${styleTags} | ${description}`.trim();
}

export async function generateEmbedding(product: Product): Promise<number[]> {
  const input = buildEmbeddingInput(product);

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding || embedding.length !== 1536) {
    throw new Error(`Unexpected embedding dimensions: ${embedding?.length}`);
  }

  return embedding;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function batchGenerateEmbeddings(products: Product[]): Promise<void> {
  const supabase = createClient();
  const chunks: Product[][] = [];

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    chunks.push(products.slice(i, i + BATCH_SIZE));
  }

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    // Generate embeddings for the whole batch in parallel
    const embeddingResults = await Promise.allSettled(
      chunk.map(async (product) => ({
        product,
        embedding: await generateEmbedding(product),
      }))
    );

    const updates = embeddingResults
      .filter((r): r is PromiseFulfilledResult<{ product: Product; embedding: number[] }> => r.status === 'fulfilled')
      .map(({ value }) => ({
        id: value.product.id,
        embedding: `[${value.embedding.join(',')}]`,
      }));

    const failures = embeddingResults.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`${failures.length} embedding(s) failed in chunk ${chunkIndex + 1}`);
    }

    // Upsert embeddings to DB
    for (const update of updates) {
      if (!update.id) continue;

      const { error } = await supabase
        .from('products')
        .update({ embedding: update.embedding })
        .eq('id', update.id);

      if (error) {
        console.error(`Failed to update embedding for product ${update.id}:`, error.message);
      }
    }

    // Rate limit delay between batches
    if (chunkIndex < chunks.length - 1) {
      await sleep(BATCH_DELAY_MS);
    }
  }
}
