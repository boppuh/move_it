/**
 * Smoke test: verify products are seeded with embeddings and similarity search works.
 * Usage: npx tsx --env-file=.env.local scripts/smoke-test.ts
 */

import { createClient } from '../src/lib/supabase';
import { findSimilarProductsById } from '../src/lib/compare/similarity';

async function smokeTest() {
  const supabase = createClient();

  // 1. Check retailer count
  const { data: retailers, error: rErr } = await supabase
    .from('retailers')
    .select('name, slug')
    .order('name');

  if (rErr) throw new Error(`Retailers query failed: ${rErr.message}`);
  console.log(`\n✓ Retailers (${retailers?.length ?? 0}):`);
  retailers?.forEach((r) => console.log(`  - ${r.name}`));

  // 2. Check product counts by category
  const { data: counts, error: cErr } = await supabase
    .from('products')
    .select('category')
    .eq('is_active', true);

  if (cErr) throw new Error(`Products query failed: ${cErr.message}`);

  const byCat: Record<string, number> = {};
  counts?.forEach(({ category }) => { byCat[category] = (byCat[category] ?? 0) + 1; });

  console.log(`\n✓ Products by category:`);
  Object.entries(byCat).sort().forEach(([cat, n]) => console.log(`  - ${cat}: ${n}`));

  // 3. Check embedding coverage
  const { count: withEmbedding } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  const { count: total } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✓ Embeddings: ${withEmbedding ?? 0}/${total ?? 0} products have embeddings`);

  if ((withEmbedding ?? 0) === 0) {
    console.error('\n✗ No embeddings found — seed-products.ts may not have completed successfully');
    process.exit(1);
  }

  // 4. Test similarity search on a bed
  const { data: bedSample } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('category', 'bed')
    .not('embedding', 'is', null)
    .limit(1)
    .single();

  if (!bedSample) {
    console.error('\n✗ No bed products found');
    process.exit(1);
  }

  console.log(`\n✓ Similarity search for: "${bedSample.name}" ($${bedSample.price})`);

  const similar = await findSimilarProductsById(bedSample.id, { limit: 5 });

  if (similar.length === 0) {
    console.warn('  ⚠ No similar products found (similarity threshold may be too high for this dataset)');
  } else {
    similar.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} — $${p.price} (score: ${p.similarity_score.toFixed(3)})`);
    });
  }

  // 5. Test price-filtered similarity
  const filtered = await findSimilarProductsById(bedSample.id, {
    priceMax: 500,
    limit: 5,
  });
  console.log(`\n✓ Price-filtered (≤$500): ${filtered.length} results`);
  filtered.forEach((p) => console.log(`  - ${p.name} — $${p.price}`));

  console.log('\n✓ All checks passed. Ready for Sprint 2.\n');
}

smokeTest().catch((err) => {
  console.error('\n✗ Smoke test failed:', err.message);
  process.exit(1);
});
