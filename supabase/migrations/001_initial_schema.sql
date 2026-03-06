-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Retailers: affiliate network config
CREATE TABLE retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  affiliate_network TEXT,                  -- 'cj', 'shareasale', 'rakuten'
  commission_rate NUMERIC(4,2),
  cookie_days INTEGER,
  feed_url TEXT,
  feed_format TEXT,                        -- 'csv', 'xml'
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Products: normalized data from affiliate feeds
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES retailers(id),
  external_id TEXT,                        -- retailer's SKU/product ID
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,                           -- bed, sofa, nightstand, etc.
  price NUMERIC(10,2),
  sale_price NUMERIC(10,2),               -- nullable
  currency TEXT DEFAULT 'USD',
  url TEXT,                                -- product page URL
  image_url TEXT,
  description TEXT,
  dimensions JSONB,                        -- {width, height, depth, unit}
  materials TEXT[],                        -- ['polyester', 'solid wood']
  style_tags TEXT[],                       -- ['mid-century', 'modern']
  rating NUMERIC(2,1),
  review_count INTEGER,
  embedding VECTOR(1536),                  -- text-embedding-3-small
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comparisons: cached results with shareable slugs
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  source_product UUID REFERENCES products(id),
  alternatives UUID[],
  analysis JSONB,                          -- GPT-generated value analysis
  value_score INTEGER,                     -- 1-100
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Affiliate clicks: outbound click tracking for attribution
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID REFERENCES comparisons(id),
  product_id UUID REFERENCES products(id),
  retailer_id UUID REFERENCES retailers(id),
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_products_style_tags ON products USING gin (style_tags);
CREATE INDEX idx_products_materials ON products USING gin (materials);
CREATE INDEX idx_products_category_price ON products (category, is_active, price);
CREATE UNIQUE INDEX idx_products_external ON products (external_id, retailer_id);
CREATE INDEX idx_comparisons_slug ON comparisons (slug);
CREATE INDEX idx_comparisons_source ON comparisons (source_product, created_at DESC);
CREATE INDEX idx_affiliate_clicks_comparison ON affiliate_clicks (comparison_id, clicked_at DESC);
CREATE INDEX idx_affiliate_clicks_product ON affiliate_clicks (product_id, clicked_at DESC);

-- RPC: Similarity search with pgvector
CREATE OR REPLACE FUNCTION find_similar_products(
  query_embedding VECTOR(1536),
  query_category TEXT,
  exclude_id UUID DEFAULT NULL,
  price_min NUMERIC DEFAULT NULL,
  price_max NUMERIC DEFAULT NULL,
  result_limit INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.75
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  brand TEXT,
  price NUMERIC,
  sale_price NUMERIC,
  url TEXT,
  image_url TEXT,
  retailer_id UUID,
  similarity_score FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.brand,
    p.price,
    p.sale_price,
    p.url,
    p.image_url,
    p.retailer_id,
    1 - (p.embedding <=> query_embedding) AS similarity_score
  FROM products p
  WHERE p.category = query_category
    AND p.is_active = true
    AND p.embedding IS NOT NULL
    AND (exclude_id IS NULL OR p.id != exclude_id)
    AND (price_min IS NULL OR p.price >= price_min)
    AND (price_max IS NULL OR p.price <= price_max)
    AND 1 - (p.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT result_limit;
$$;
