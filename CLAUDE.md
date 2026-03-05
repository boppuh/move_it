# CLAUDE.md
Project: "Is It Worth It?" — Cross-Retailer Furniture Comparison Tool

## What This Is
An AI-powered furniture comparison tool that lets users paste a product URL or name and instantly see:

- A value score (1–100) based on materials, construction, reviews, and pricing
- 3–5 comparable alternatives from other retailers, ranked by value
- Side-by-side spec comparisons
- Affiliate-tracked links to purchase

Every recommendation generates affiliate revenue. Users pay nothing.

## Tech Stack
- **Framework:** Next.js 14 (App Router, React Server Components)
- **Database:** Supabase PostgreSQL + pgvector extension (embedding-based similarity search)
- **AI:** OpenAI text-embedding-3-small (1536-dim) for product embeddings, GPT-4o-mini for value analysis
- **Styling:** Tailwind CSS + shadcn/ui
- **Hosting:** Vercel (with Vercel Cron for scheduled jobs)
- **Affiliate Networks:** CJ Affiliate (Wayfair, AllModern, Crate & Barrel), ShareASale (Article), Rakuten (West Elm)

## Architecture
```
User → Next.js App (Vercel)
       ├─ /api/compare    → OpenAI API (embeddings + GPT)
       ├─ /api/products   → Supabase (pgvector similarity search)
       ├─ /api/affiliate  → CJ / ShareASale (link generation)
       └─ /api/ingest     → Affiliate feed parser (cron)

Supabase PostgreSQL
       ├─ products (+ pgvector embeddings)
       ├─ comparisons (saved results)
       ├─ affiliate_clicks (tracking)
       └─ retailers (config)
```

## Database Schema

### products — Central table for normalized product data from affiliate feeds
```sql
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
  materials TEXT[],                         -- ['polyester', 'solid wood']
  style_tags TEXT[],                        -- ['mid-century', 'modern']
  rating NUMERIC(2,1),
  review_count INTEGER,
  embedding VECTOR(1536),                  -- text-embedding-3-small
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_products_embedding ON products USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_products_style_tags ON products USING gin (style_tags);
CREATE INDEX idx_products_materials ON products USING gin (materials);
CREATE INDEX idx_products_category_price ON products (category, is_active, price);
CREATE UNIQUE INDEX idx_products_external ON products (external_id, retailer_id);
```

### retailers
```sql
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
```

### comparisons — Cached comparison results. Each becomes a shareable URL.
```sql
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  source_product UUID REFERENCES products(id),
  alternatives UUID[],
  analysis JSONB,                          -- GPT-generated value analysis
  value_score INTEGER,                     -- 1–100
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### affiliate_clicks — Outbound click tracking for attribution
```sql
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
```

## API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | /api/compare | Main entry. Accepts URL or product name → returns value score + alternatives |
| GET | /api/compare/[slug] | Retrieve saved comparison by slug (for shareable links & SEO) |
| GET | /api/products/similar | Vector similarity search with category/price filters |
| POST | /api/products/identify | Identify product from URL or name, match to DB or create new |
| GET | /api/affiliate/redirect | Log click + 302 redirect to affiliate-tagged retailer URL |
| POST | /api/ingest/feed | Vercel cron trigger: pull affiliate feeds, normalize, embed, upsert |

## Comparison Engine Pipeline (POST /api/compare)

1. **Identify product** — Parse input (URL or text). If URL, fetch page and extract product data via GPT-4o-mini. Match to existing DB entry or create new.
2. **Generate embedding** — Call text-embedding-3-small on: `{category} | {brand} | {name} | Materials: {materials} | Style: {style_tags} | {description[:200]}`
3. **Similarity search** — pgvector nearest neighbors, filtered by same category + is_active. Cosine threshold ≥ 0.75.
4. **Value analysis** — GPT-4o-mini structured prompt: value_score (1–100), verdict, strengths, weaknesses, per-alternative comparison notes.
5. **Save & return** — Upsert to comparisons table, generate slug, return full result.

## Component Tree
```
app/
├─ layout.tsx              -- Root layout, nav, footer
├─ page.tsx               -- Landing page (SearchHero + TrendingComparisons)
├─ compare/[slug]/
│   └─ page.tsx           -- ComparisonResult (server component)
├─ product/[id]/
│   └─ page.tsx           -- ProductDetail
└─ browse/
    └─ page.tsx           -- CategoryGrid

components/
├─ search/
│   ├─ SearchBar.tsx      -- URL/text input with autocomplete
│   └─ SearchLoading.tsx  -- Skeleton + progress animation
├─ comparison/
│   ├─ ValueScoreBadge.tsx    -- Circular score indicator (1–100)
│   ├─ AlternativeCard.tsx    -- Product card with savings badge
│   ├─ SpecTable.tsx          -- Side-by-side spec comparison
│   ├─ AnalysisSummary.tsx    -- GPT verdict, strengths, weaknesses
│   └─ ShareButton.tsx        -- Copy link, social share
├─ product/
│   ├─ ProductCard.tsx        -- Reusable product thumbnail
│   └─ AffiliateButton.tsx    -- "View at [Retailer]" with tracking
└─ ui/                        -- shadcn components
```

## Page Routes

| Route | Page | Notes |
|-------|------|-------|
| / | Landing / Search | Hero with search bar. "Paste a URL or describe a piece." Trending comparisons below. |
| /compare/[slug] | Comparison Result | Source product, value score, alternatives grid, side-by-side specs. Shareable URL. |
| /product/[id] | Product Detail | Single product view with specs and "Find alternatives" CTA. |
| /browse | Browse by Category | Grid of categories (beds, sofas, tables). SEO landing pages. |
| /about | About / How It Works | Trust-building. How comparisons work, affiliate disclosure, privacy. |

## Embedding Strategy
- **Model:** text-embedding-3-small (1536 dimensions)
- **Input format:** `"{category} | {brand} | {name} | Materials: {', '.join(materials)} | Style: {', '.join(style_tags)} | {description[:200]}"`
- **Similarity metric:** Cosine distance via pgvector `<=>` operator
- **Threshold:** Start at 0.75, tune after testing with real products
- **Mandatory filter:** Same category (a bed should never match a sofa)
- HNSW index on the embedding column for fast approximate search

## Affiliate Link Formats
- **CJ Affiliate** (Wayfair, AllModern, Crate & Barrel): `https://www.anrdoezrs.net/links/{publisher_id}/type/dlg/{retailer_url}`
- **ShareASale** (Article): `https://shareasale.com/r.cfm?b={banner_id}&u={affiliate_id}&m={merchant_id}&urllink={encoded_url}`
- **Rakuten** (West Elm): `https://click.linksynergy.com/deeplink?id={publisher_id}&mid={merchant_id}&murl={encoded_url}`

All outbound product links route through `/api/affiliate/redirect` which handles network-specific URL construction, click logging, and 302 redirect. The frontend never touches raw affiliate URLs.

## Coding Conventions
- TypeScript everywhere. Strict mode. No `any` types.
- Server Components by default. Only add `"use client"` when the component needs interactivity (search input, buttons, etc.).
- Zod for all API request/response validation.
- Environment variables via `.env.local` — never hardcoded keys.
- Error handling: Every API route wraps in try/catch, returns structured `{ error: string, status: number }` on failure.
- Naming: PascalCase components, camelCase functions/variables, SCREAMING_SNAKE for env vars.
- Imports: Use `@/` path aliases. Group: external → internal → relative → types.
- No default exports except for `page.tsx` and `layout.tsx` (Next.js requires them).
- Prefer named functions over arrow functions for top-level declarations.
- Supabase client: Use `createClient()` from `@supabase/supabase-js`. Server-side only for DB queries — no client-side Supabase.

## Environment Variables
```
NEXT_PUBLIC_SITE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
CJ_PUBLISHER_ID=
CJ_API_KEY=
SHAREASALE_AFFILIATE_ID=
SHAREASALE_API_TOKEN=
RAKUTEN_PUBLISHER_ID=
```

## Testing
- Vitest for unit tests (`*.test.ts` co-located with source files)
- Test the comparison pipeline with mock data before connecting real APIs
- Test affiliate URL generation for each network format
- Test embedding generation and similarity search with known product pairs

## Key Design Decisions
- **Affiliate-only monetization** — No subscription, no paywall. Every product link is an affiliate link. Revenue scales with usage.
- **Server-rendered comparison pages** — Each `/compare/[slug]` page is SSR for SEO. "[Product] alternatives" queries are high-intent organic traffic.
- **pgvector over dedicated vector DB** — Keeps everything in one Supabase instance. Simpler ops at MVP scale. Migrate to Pinecone/Weaviate only if needed at >100K products.
- **GPT-4o-mini for analysis, not GPT-4o** — Cost-efficient. Value analysis doesn't need frontier reasoning. Switch to GPT-4o only if quality is insufficient.
- **Category-filtered similarity** — Mandatory same-category filter in all vector searches. Prevents cross-category false matches (tufted ottoman ≠ tufted headboard).

## What NOT to Build in Phase 1
- Auth / user accounts (Phase 3)
- Price alerts / price history tracking (Phase 3)
- Room planning / spatial features (Phase 2)
- Mobile app (web-first, responsive)
- Custom ML models (use OpenAI APIs)
- Image-based similarity (text embeddings first, CLIP later if needed)
- Admin dashboard (use Supabase Studio)

## Reference Data
The competitive landscape analysis found:

- No existing tool combines cross-retailer comparison with AI similarity matching. All incumbent tools are brand-locked.
- Affiliate economics: 5–8% commission on $297–$779 average order value = $15–65 per purchase.
- Distribution: TikTok #dupe has ~6B views. Dupe.com went viral March 2024. 63% of ages 18–34 purchase items discovered via social media.
- Failed approaches: Modsy ($72.7M), Laurel & Wolf ($25.5M), Homepolish ($20M) all failed trying to scale human designer services.
- What works: Dupe.com (free, viral, affiliate-driven), Planner 5D ($300K raised, ~$11M revenue), bootstrapped capital efficiency.
