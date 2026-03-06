/**
 * Seed 75 realistic furniture products across 3 retailers for development/testing.
 * Run after seed-retailers.ts.
 *
 * Usage: npx tsx scripts/seed-products.ts
 */

import { createClient } from '../src/lib/supabase';
import { batchGenerateEmbeddings } from '../src/lib/ingest/embed';

const PRODUCTS = [
  // ─── BEDS ──────────────────────────────────────────────────────────────────
  { name: 'Modway Aveline Queen Platform Bed', brand: 'Modway', category: 'bed', price: 399, retailer: 'wayfair', materials: ['engineered wood', 'fabric'], style_tags: ['modern'], description: 'Clean-lined upholstered platform bed with button-tufted headboard and solid slat support. No box spring needed.', dimensions: { width: 63, height: 45, depth: 86, unit: 'in' }, rating: 4.3, review_count: 1842 },
  { name: 'Article Culla Queen Bed Frame', brand: 'Article', category: 'bed', price: 699, retailer: 'article', materials: ['solid wood', 'fabric'], style_tags: ['scandinavian', 'modern'], description: 'Solid ash wood legs, performance fabric upholstery. Designed for easy assembly and lasting quality.', dimensions: { width: 63, height: 48, depth: 87, unit: 'in' }, rating: 4.6, review_count: 412 },
  { name: 'West Elm Andes Queen Bed', brand: 'West Elm', category: 'bed', price: 1299, retailer: 'west-elm', materials: ['solid wood', 'linen'], style_tags: ['modern', 'scandinavian'], description: 'Solid mango wood frame with a natural finish. Linen blend upholstery on the headboard. FSC certified wood.', dimensions: { width: 64, height: 52, depth: 88, unit: 'in' }, rating: 4.4, review_count: 287 },
  { name: 'Wayfair Sleep™ Kari Queen Upholstered Bed', brand: 'Wayfair Sleep', category: 'bed', price: 549, retailer: 'wayfair', materials: ['engineered wood', 'polyester'], style_tags: ['modern', 'glam'], description: 'Upholstered tufted headboard with nailhead trim. Sturdy center support legs for queen and king sizes.', dimensions: { width: 64, height: 55, depth: 88, unit: 'in' }, rating: 4.1, review_count: 3201 },
  { name: 'AllModern Nadia Platform Bed', brand: 'AllModern', category: 'bed', price: 479, retailer: 'allmodern', materials: ['engineered wood', 'velvet'], style_tags: ['mid-century', 'modern'], description: 'Low-profile walnut-finished legs, plush velvet upholstery in a range of colors. Mid-century inspired silhouette.', dimensions: { width: 63, height: 38, depth: 87, unit: 'in' }, rating: 4.2, review_count: 956 },
  { name: 'Article Bett Queen Bed', brand: 'Article', category: 'bed', price: 599, retailer: 'article', materials: ['solid wood', 'linen'], style_tags: ['scandinavian'], description: 'Light ash solid wood frame, natural linen headboard. Simple Scandinavian design for any bedroom.', dimensions: { width: 63, height: 46, depth: 87, unit: 'in' }, rating: 4.5, review_count: 324 },
  { name: 'West Elm Mid-Century Upholstered Bed Queen', brand: 'West Elm', category: 'bed', price: 1199, retailer: 'west-elm', materials: ['solid wood', 'velvet'], style_tags: ['mid-century'], description: 'Angled walnut legs, tufted velvet headboard. The defining mid-century form reimagined for the modern bedroom.', dimensions: { width: 64, height: 50, depth: 88, unit: 'in' }, rating: 4.5, review_count: 521 },
  { name: 'Modway Lily Queen Bed Frame', brand: 'Modway', category: 'bed', price: 329, retailer: 'wayfair', materials: ['metal'], style_tags: ['industrial', 'modern'], description: 'Industrial powder-coated steel frame. Open-weave headboard design. No box spring required. Easy assembly.', dimensions: { width: 63, height: 44, depth: 86, unit: 'in' }, rating: 4.0, review_count: 2134 },
  { name: 'AllModern Easton Queen Bed', brand: 'AllModern', category: 'bed', price: 899, retailer: 'allmodern', materials: ['solid wood', 'fabric'], style_tags: ['farmhouse', 'traditional'], description: 'Solid pine wood with distressed white finish. Shiplap headboard adds rustic farmhouse character.', dimensions: { width: 64, height: 58, depth: 88, unit: 'in' }, rating: 4.3, review_count: 743 },
  { name: 'Article Mod Queen Bed', brand: 'Article', category: 'bed', price: 799, retailer: 'article', materials: ['solid wood', 'leather'], style_tags: ['mid-century', 'modern'], description: 'Italian-inspired leather upholstery on a solid walnut frame. Clean geometric lines meet warm natural materials.', dimensions: { width: 63, height: 44, depth: 87, unit: 'in' }, rating: 4.7, review_count: 198 },
  { name: 'West Elm Sienna Queen Bed', brand: 'West Elm', category: 'bed', price: 999, retailer: 'west-elm', materials: ['solid wood', 'polyester'], style_tags: ['bohemian', 'modern'], description: 'Mango wood frame with hand-carved details. Soft upholstered headboard in earth-tone fabric.', dimensions: { width: 64, height: 54, depth: 88, unit: 'in' }, rating: 4.2, review_count: 312 },
  { name: 'Zinus Alexia 12 Inch Queen Platform Bed', brand: 'Zinus', category: 'bed', price: 249, retailer: 'wayfair', materials: ['engineered wood', 'metal'], style_tags: ['modern'], description: 'Metal and wood hybrid frame. Integrated slat system, no box spring needed. Budget-friendly with quick assembly.', dimensions: { width: 63, height: 12, depth: 83, unit: 'in' }, rating: 4.4, review_count: 8921 },
  { name: 'AllModern Keyla Queen Upholstered Bed', brand: 'AllModern', category: 'bed', price: 749, retailer: 'allmodern', materials: ['engineered wood', 'linen'], style_tags: ['coastal', 'modern'], description: 'Relaxed linen upholstery in natural tones. Gently curved headboard. Casual coastal aesthetic for relaxed bedrooms.', dimensions: { width: 64, height: 50, depth: 88, unit: 'in' }, rating: 4.4, review_count: 621 },
  { name: 'Article Nera Queen Bed', brand: 'Article', category: 'bed', price: 849, retailer: 'article', materials: ['solid wood', 'velvet'], style_tags: ['glam', 'modern'], description: 'Deep jewel-toned velvet with gold-finished solid wood legs. A statement piece for the contemporary bedroom.', dimensions: { width: 63, height: 50, depth: 87, unit: 'in' }, rating: 4.6, review_count: 267 },
  { name: 'West Elm Emmett Queen Upholstered Bed', brand: 'West Elm', category: 'bed', price: 1499, retailer: 'west-elm', materials: ['solid wood', 'cotton'], style_tags: ['traditional', 'modern'], description: 'High wingback headboard in 100% cotton. Deep button tufting. Timeless silhouette with a contemporary feel.', dimensions: { width: 64, height: 60, depth: 88, unit: 'in' }, rating: 4.3, review_count: 445 },
  { name: 'Wayfair Basics Queen Metal Platform Bed', brand: 'Wayfair Basics', category: 'bed', price: 199, retailer: 'wayfair', materials: ['metal'], style_tags: ['industrial'], description: 'Minimalist powder-coated steel frame. 12 support legs. Fits most standard mattresses without a box spring.', dimensions: { width: 63, height: 14, depth: 80, unit: 'in' }, rating: 4.2, review_count: 5632 },
  { name: 'AllModern Vienna Queen Platform Bed', brand: 'AllModern', category: 'bed', price: 1099, retailer: 'allmodern', materials: ['solid wood', 'polyester'], style_tags: ['scandinavian', 'modern'], description: 'Danish design-inspired with solid oak legs and a cushioned headboard in durable performance fabric.', dimensions: { width: 64, height: 46, depth: 87, unit: 'in' }, rating: 4.5, review_count: 389 },
  { name: 'Article Timber Queen Bed', brand: 'Article', category: 'bed', price: 499, retailer: 'article', materials: ['solid wood'], style_tags: ['farmhouse', 'industrial'], description: 'Reclaimed-look solid pine with a warm walnut stain. Natural wood grain variations make each piece unique.', dimensions: { width: 63, height: 42, depth: 87, unit: 'in' }, rating: 4.4, review_count: 534 },

  // ─── SOFAS ─────────────────────────────────────────────────────────────────
  { name: 'Article Sven 3-Seat Sofa', brand: 'Article', category: 'sofa', price: 1299, retailer: 'article', materials: ['solid wood', 'polyester'], style_tags: ['mid-century', 'modern'], description: 'Iconic mid-century modern silhouette. Tightly woven fabric, solid walnut legs. The most popular sofa online.', dimensions: { width: 88, height: 33, depth: 35, unit: 'in' }, rating: 4.7, review_count: 2341 },
  { name: 'West Elm Harmony 3-Seater Sofa', brand: 'West Elm', category: 'sofa', price: 1899, retailer: 'west-elm', materials: ['solid wood', 'cotton'], style_tags: ['modern', 'scandinavian'], description: 'GREENGUARD Gold certified frame. Sustainably sourced wood legs. Performance cotton blend cushion covers.', dimensions: { width: 87, height: 34, depth: 37, unit: 'in' }, rating: 4.4, review_count: 876 },
  { name: 'AllModern Flynn 3-Seat Sofa', brand: 'AllModern', category: 'sofa', price: 979, retailer: 'allmodern', materials: ['engineered wood', 'polyester'], style_tags: ['modern'], description: 'Clean, contemporary profile. Removable and washable cushion covers. Great value for a stylish living room.', dimensions: { width: 84, height: 32, depth: 35, unit: 'in' }, rating: 4.2, review_count: 1654 },
  { name: 'Wayfair Custom Upholstery™ Pearce Sofa', brand: 'Wayfair Custom', category: 'sofa', price: 1199, retailer: 'wayfair', materials: ['engineered wood', 'fabric'], style_tags: ['traditional', 'modern'], description: '70+ fabric options. Classic rolled arms and cushioned back. Choose your configuration and fabric from the product page.', dimensions: { width: 86, height: 35, depth: 38, unit: 'in' }, rating: 4.3, review_count: 4521 },
  { name: 'Article Timber Sofa', brand: 'Article', category: 'sofa', price: 1099, retailer: 'article', materials: ['solid wood', 'fabric'], style_tags: ['farmhouse', 'industrial'], description: 'Solid oak frame with a reclaimed look. Durable, removable cushion covers in natural fabric blends.', dimensions: { width: 85, height: 33, depth: 34, unit: 'in' }, rating: 4.5, review_count: 1023 },
  { name: 'West Elm Urban Sofa', brand: 'West Elm', category: 'sofa', price: 1799, retailer: 'west-elm', materials: ['solid wood', 'linen'], style_tags: ['modern', 'mid-century'], description: 'Deep seat, low silhouette. Belgian linen upholstery in 12 colors. FSC certified mango wood legs.', dimensions: { width: 91, height: 31, depth: 39, unit: 'in' }, rating: 4.5, review_count: 1204 },
  { name: 'AllModern Bastian 3-Seat Sofa', brand: 'AllModern', category: 'sofa', price: 1399, retailer: 'allmodern', materials: ['solid wood', 'velvet'], style_tags: ['glam', 'modern'], description: 'Rich velvet in jewel tones. Solid wood frame with tapered legs. Makes a statement in any room.', dimensions: { width: 85, height: 34, depth: 36, unit: 'in' }, rating: 4.3, review_count: 892 },
  { name: 'Wayfair Gregory Mid-Century Sofa', brand: 'Modway', category: 'sofa', price: 799, retailer: 'wayfair', materials: ['engineered wood', 'fabric'], style_tags: ['mid-century'], description: 'Tufted cushions and angled wood legs define the mid-century silhouette. Available in 8 upholstery options.', dimensions: { width: 82, height: 33, depth: 32, unit: 'in' }, rating: 4.1, review_count: 3287 },
  { name: 'Article Napa Sofa', brand: 'Article', category: 'sofa', price: 1499, retailer: 'article', materials: ['solid wood', 'leather'], style_tags: ['modern', 'industrial'], description: 'Top-grain leather with a lived-in look that improves with age. Solid steel legs, generous cushioning.', dimensions: { width: 87, height: 33, depth: 36, unit: 'in' }, rating: 4.8, review_count: 654 },
  { name: 'West Elm Andes Sofa', brand: 'West Elm', category: 'sofa', price: 2199, retailer: 'west-elm', materials: ['solid wood', 'polyester'], style_tags: ['scandinavian', 'modern'], description: 'Solid mango wood legs. Performance upholstery resists pilling, fading, and water-based stains.', dimensions: { width: 89, height: 35, depth: 38, unit: 'in' }, rating: 4.4, review_count: 543 },
  { name: 'AllModern Kova Sectional Left', brand: 'AllModern', category: 'sofa', price: 1699, retailer: 'allmodern', materials: ['engineered wood', 'polyester'], style_tags: ['modern', 'coastal'], description: 'L-shaped configuration. Removable cushion covers. Light frame floats above the floor for an open look.', dimensions: { width: 110, height: 32, depth: 64, unit: 'in' }, rating: 4.2, review_count: 721 },
  { name: 'Wayfair Carnegy Chesterfield Sofa', brand: 'Alcott Hill', category: 'sofa', price: 899, retailer: 'wayfair', materials: ['engineered wood', 'fabric'], style_tags: ['traditional', 'glam'], description: 'Deep button tufting, rolled arms, and nail-head trim give this sofa a classic Chesterfield character.', dimensions: { width: 82, height: 35, depth: 36, unit: 'in' }, rating: 4.2, review_count: 2891 },
  { name: 'Article Quilt 2-Seat Loveseat', brand: 'Article', category: 'sofa', price: 899, retailer: 'article', materials: ['solid wood', 'cotton'], style_tags: ['bohemian', 'scandinavian'], description: 'Handcrafted quilted fabric in earthy tones. Solid wood base. A cozy, artisan-inspired loveseat.', dimensions: { width: 62, height: 33, depth: 34, unit: 'in' }, rating: 4.6, review_count: 287 },

  // ─── NIGHTSTANDS ───────────────────────────────────────────────────────────
  { name: 'Article Oscuro Nightstand', brand: 'Article', category: 'nightstand', price: 249, retailer: 'article', materials: ['solid wood'], style_tags: ['mid-century', 'modern'], description: 'Solid walnut with clean geometric lines. Single drawer with dovetail joinery. The perfect bedside companion.', dimensions: { width: 22, height: 24, depth: 18, unit: 'in' }, rating: 4.7, review_count: 543 },
  { name: 'West Elm Acorn Nightstand', brand: 'West Elm', category: 'nightstand', price: 449, retailer: 'west-elm', materials: ['solid wood'], style_tags: ['modern', 'scandinavian'], description: 'FSC certified solid acacia wood. Two drawers with metal pulls. The grain pattern gives each piece a unique character.', dimensions: { width: 20, height: 26, depth: 18, unit: 'in' }, rating: 4.4, review_count: 312 },
  { name: 'AllModern Dory Nightstand', brand: 'AllModern', category: 'nightstand', price: 199, retailer: 'allmodern', materials: ['engineered wood'], style_tags: ['modern', 'coastal'], description: 'White lacquer finish. Open shelf and a single drawer. Bright and minimalist coastal style.', dimensions: { width: 20, height: 24, depth: 16, unit: 'in' }, rating: 4.1, review_count: 876 },
  { name: 'Wayfair Lark Manor Remi Nightstand', brand: 'Lark Manor', category: 'nightstand', price: 229, retailer: 'wayfair', materials: ['solid wood'], style_tags: ['farmhouse', 'traditional'], description: 'Solid pine with a distressed white finish. Three drawers with bun hardware. Classic cottage appeal.', dimensions: { width: 22, height: 30, depth: 16, unit: 'in' }, rating: 4.3, review_count: 1987 },
  { name: 'Article Matera Nightstand', brand: 'Article', category: 'nightstand', price: 199, retailer: 'article', materials: ['solid wood', 'metal'], style_tags: ['industrial', 'modern'], description: 'Matte black metal frame with solid wood shelf. Open design creates an airy, industrial aesthetic.', dimensions: { width: 20, height: 22, depth: 16, unit: 'in' }, rating: 4.5, review_count: 412 },
  { name: 'West Elm Patchwork Nightstand', brand: 'West Elm', category: 'nightstand', price: 499, retailer: 'west-elm', materials: ['solid wood', 'rattan'], style_tags: ['bohemian', 'coastal'], description: 'Hand-woven rattan panels on a solid wood frame. Two-tone construction adds artisan texture to bedside storage.', dimensions: { width: 22, height: 25, depth: 17, unit: 'in' }, rating: 4.5, review_count: 234 },
  { name: 'AllModern Nora Floating Nightstand', brand: 'AllModern', category: 'nightstand', price: 149, retailer: 'allmodern', materials: ['engineered wood'], style_tags: ['modern', 'scandinavian'], description: 'Wall-mounted floating design saves floor space. Single drawer and open shelf. Matte white finish.', dimensions: { width: 18, height: 10, depth: 12, unit: 'in' }, rating: 4.3, review_count: 1231 },
  { name: 'Wayfair Better Homes Gardens Nightstand', brand: 'Better Homes & Gardens', category: 'nightstand', price: 139, retailer: 'wayfair', materials: ['engineered wood'], style_tags: ['farmhouse', 'traditional'], description: 'Two drawers with metal glides and a lower open shelf. Warm medium oak finish with herringbone drawer fronts.', dimensions: { width: 22, height: 26, depth: 16, unit: 'in' }, rating: 4.4, review_count: 4312 },
  { name: 'Article Culla Nightstand', brand: 'Article', category: 'nightstand', price: 299, retailer: 'article', materials: ['solid wood', 'fabric'], style_tags: ['scandinavian', 'modern'], description: 'Solid ash wood with a single upholstered drawer front. A refined bedside table that elevates the bedroom.', dimensions: { width: 21, height: 24, depth: 18, unit: 'in' }, rating: 4.6, review_count: 287 },
  { name: 'West Elm Mid-Century Nightstand', brand: 'West Elm', category: 'nightstand', price: 399, retailer: 'west-elm', materials: ['solid wood'], style_tags: ['mid-century'], description: 'Angled legs, clean drawer fronts. Solid wood in three finish options. A bedroom classic.', dimensions: { width: 22, height: 26, depth: 18, unit: 'in' }, rating: 4.5, review_count: 678 },
  { name: 'AllModern Lena Marble Nightstand', brand: 'AllModern', category: 'nightstand', price: 349, retailer: 'allmodern', materials: ['marble', 'metal'], style_tags: ['glam', 'modern'], description: 'White marble top on a gold-finished metal base. Open shelf design. Adds luxe texture to any bedroom.', dimensions: { width: 20, height: 24, depth: 16, unit: 'in' }, rating: 4.2, review_count: 543 },
  { name: 'Wayfair George Oliver Nightstand', brand: 'George Oliver', category: 'nightstand', price: 189, retailer: 'wayfair', materials: ['solid wood', 'metal'], style_tags: ['industrial', 'farmhouse'], description: 'Reclaimed-look pine top with black metal frame. Two open shelves. Industrial farmhouse style at an accessible price.', dimensions: { width: 20, height: 25, depth: 16, unit: 'in' }, rating: 4.2, review_count: 2134 },
  { name: 'Article Nera Nightstand', brand: 'Article', category: 'nightstand', price: 279, retailer: 'article', materials: ['solid wood', 'brass'], style_tags: ['glam', 'mid-century'], description: 'Solid walnut with brushed brass hardware. Single drawer with smooth-glide mechanism. Compact and elegant.', dimensions: { width: 20, height: 23, depth: 17, unit: 'in' }, rating: 4.7, review_count: 198 },
  { name: 'West Elm Tambour Nightstand', brand: 'West Elm', category: 'nightstand', price: 549, retailer: 'west-elm', materials: ['solid wood', 'rattan'], style_tags: ['bohemian', 'traditional'], description: 'Tambour-style woven rattan doors hide interior storage. Solid mango wood frame. Artisan detailing throughout.', dimensions: { width: 22, height: 28, depth: 18, unit: 'in' }, rating: 4.4, review_count: 156 },
  { name: 'AllModern Modern Nightstand Set of 2', brand: 'AllModern', category: 'nightstand', price: 279, retailer: 'allmodern', materials: ['engineered wood'], style_tags: ['modern'], description: 'Matching pair of nightstands. Single drawer with hairpin legs. Clean modern profile that works in any bedroom.', dimensions: { width: 18, height: 22, depth: 14, unit: 'in' }, rating: 4.3, review_count: 1432 },
];

async function getRetailerIds(
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('retailers').select('id, slug');
  if (error) throw new Error(`Failed to fetch retailers: ${error.message}`);

  const map: Record<string, string> = {};
  data?.forEach((r) => {
    map[r.slug] = r.id;
  });
  return map;
}

async function seedProducts() {
  const supabase = createClient();

  console.log('Fetching retailer IDs...');
  const retailerIds = await getRetailerIds(supabase);

  const records = PRODUCTS.map((p) => {
    const retailerId = retailerIds[p.retailer];
    if (!retailerId) {
      console.warn(`Retailer not found: ${p.retailer} — skipping "${p.name}"`);
      return null;
    }

    return {
      retailer_id: retailerId,
      external_id: `seed-${p.brand?.toLowerCase().replace(/\s/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      sale_price: null,
      currency: 'USD',
      url: null,
      image_url: null,
      description: p.description,
      dimensions: p.dimensions,
      materials: p.materials,
      style_tags: p.style_tags,
      rating: p.rating,
      review_count: p.review_count,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  console.log(`Inserting ${records.length} products...`);

  const { data, error } = await supabase
    .from('products')
    .insert(records)
    .select();

  if (error) {
    console.error('Insert error:', error);
    process.exit(1);
  }

  console.log(`Inserted ${data?.length ?? 0} products. Generating embeddings...`);

  if (data && data.length > 0) {
    await batchGenerateEmbeddings(data);
    console.log('Embeddings generated successfully.');
  }

  console.log('Done!');
}

seedProducts().catch(console.error);
