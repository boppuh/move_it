import { z } from 'zod';

// ─── Entity Schemas ───────────────────────────────────────────────────────────

export const DimensionsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive().optional(),
  unit: z.enum(['in', 'cm']),
});

export const RetailerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  affiliate_network: z.enum(['cj', 'shareasale', 'rakuten']).nullable().optional(),
  commission_rate: z.number().min(0).max(1).nullable().optional(),
  cookie_days: z.number().int().positive().nullable().optional(),
  feed_url: z.string().url().nullable().optional(),
  feed_format: z.enum(['csv', 'xml']).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  is_active: z.boolean().default(true),
});

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  retailer_id: z.string().uuid().nullable().optional(),
  external_id: z.string().nullable().optional(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  category: z.string().min(1),
  price: z.number().positive().nullable().optional(),
  sale_price: z.number().positive().nullable().optional(),
  currency: z.string().default('USD'),
  url: z.string().url().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  description: z.string().nullable().optional(),
  dimensions: DimensionsSchema.nullable().optional(),
  materials: z.array(z.string()).default([]),
  style_tags: z.array(z.string()).default([]),
  rating: z.number().min(0).max(5).nullable().optional(),
  review_count: z.number().int().min(0).nullable().optional(),
  embedding: z.array(z.number()).length(1536).nullable().optional(),
  is_active: z.boolean().default(true),
  last_synced_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export const ComparisonSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  source_product: z.string().uuid().nullable().optional(),
  alternatives: z.array(z.string().uuid()).default([]),
  analysis: z.record(z.string(), z.unknown()).nullable().optional(),
  value_score: z.number().int().min(1).max(100).nullable().optional(),
  view_count: z.number().int().min(0).default(0),
  share_count: z.number().int().min(0).default(0),
  created_at: z.string().datetime().optional(),
});

export const AffiliateClickSchema = z.object({
  id: z.string().uuid().optional(),
  comparison_id: z.string().uuid().nullable().optional(),
  product_id: z.string().uuid().nullable().optional(),
  retailer_id: z.string().uuid().nullable().optional(),
  referrer: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  ip_hash: z.string().nullable().optional(),
  clicked_at: z.string().datetime().optional(),
});

// ─── Inferred TypeScript Types ────────────────────────────────────────────────

export type Dimensions = z.infer<typeof DimensionsSchema>;
export type Retailer = z.infer<typeof RetailerSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Comparison = z.infer<typeof ComparisonSchema>;
export type AffiliateClick = z.infer<typeof AffiliateClickSchema>;

// ─── API Request/Response Schemas ────────────────────────────────────────────

export const IngestFeedRequestSchema = z.object({
  retailer_slug: z.string().optional(),
});

export const SimilarProductsQuerySchema = z.object({
  product_id: z.string().uuid(),
  category: z.string().optional(),
  price_min: z.coerce.number().positive().optional(),
  price_max: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export const SimilarProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  price: z.number().nullable(),
  sale_price: z.number().nullable(),
  url: z.string().nullable(),
  image_url: z.string().nullable(),
  retailer_id: z.string().uuid().nullable(),
  similarity_score: z.number().min(0).max(1),
});

export const SimilarProductsResponseSchema = z.object({
  products: z.array(SimilarProductSchema),
  source_product_id: z.string().uuid(),
});

export type IngestFeedRequest = z.infer<typeof IngestFeedRequestSchema>;
export type SimilarProductsQuery = z.infer<typeof SimilarProductsQuerySchema>;
export type SimilarProduct = z.infer<typeof SimilarProductSchema>;
export type SimilarProductsResponse = z.infer<typeof SimilarProductsResponseSchema>;

// ─── Value Analysis (from GPT) ────────────────────────────────────────────────

export const ValueAnalysisSchema = z.object({
  value_score: z.number().int().min(1).max(100),
  verdict: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  comparison_notes: z.record(z.string(), z.string()),  // product_id -> note
});

export type ValueAnalysis = z.infer<typeof ValueAnalysisSchema>;

// ─── Feed Parser Output ───────────────────────────────────────────────────────

export const RawProductSchema = ProductSchema.partial().required({ name: true, category: true });
export type RawProduct = z.infer<typeof RawProductSchema>;
