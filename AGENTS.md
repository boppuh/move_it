# AGENTS.md
Agent Roles for Multi-Agent Workflows

If using Claude Code with multi-agent orchestration (e.g., claude-flow or parallel task execution), use these specialized agent definitions.

## Agent: data-ingest
**Scope:** Feed parsing, product normalization, embedding generation
**Files:** `src/lib/ingest/`, `src/app/api/ingest/`

**Responsibilities:**
- Parse affiliate feed files (CSV from CJ, XML from Rakuten)
- Normalize product data into the standard schema (`products` table)
- Handle dimension parsing: convert inconsistent formats (`"39.4"H x 82.3"W"` vs `"Height: 100cm"`) into structured JSONB `{width, height, depth, unit}`
- Extract `style_tags` and `materials` from descriptions using GPT-4o-mini when not explicitly provided in feed data
- Generate embeddings via text-embedding-3-small in batches of 100 (respect TPM rate limits)
- Upsert to Supabase with conflict resolution on `(external_id, retailer_id)`
- Mark products as `is_active = false` when removed from feeds (soft delete)

**Dependencies:** Supabase client, OpenAI client, Zod schemas for product validation
**Tests:** Mock feed data → verify normalized output matches schema. Verify embedding dimension = 1536. Verify upsert idempotency.

---

## Agent: comparison-engine
**Scope:** The core comparison pipeline (identify → embed → search → analyze → save)
**Files:** `src/lib/compare/`, `src/app/api/compare/`, `src/app/api/products/`

**Responsibilities:**
- `/api/products/identify`: URL parsing via GPT-4o-mini (extract product name, price, brand, materials, dimensions, image from retailer pages). Text input: embed query, find closest DB match.
- `/api/products/similar`: pgvector similarity search with mandatory category filter, optional price range. Return top N by cosine similarity.
- `/api/compare`: Orchestrate the full 5-step pipeline. Call GPT-4o-mini with structured prompt for value analysis (`value_score`, `verdict`, `strengths`, `weaknesses`). Generate slug. Cache in `comparisons` table.
- Comparison result caching: same source product returns cached result for 24 hours.

**Dependencies:** data-ingest agent's product schema, Supabase client, OpenAI client
**Tests:** Mock product data → verify pipeline outputs match expected response schema. Test slug generation. Test cache hit/miss behavior.

---

## Agent: frontend
**Scope:** All UI components and pages
**Files:** `src/app/`, `src/components/`

**Responsibilities:**
- Landing page with SearchBar (URL paste or text input)
- Loading state with skeleton + progress steps
- `/compare/[slug]` page: server-rendered. `ValueScoreBadge`, source product hero, `AlternativeCard` grid, `SpecTable`, `AnalysisSummary`. Streaming for AI analysis section.
- `/product/[id]`, `/browse`, `/about` pages
- `ShareButton` (copy link, OG meta tags)
- `AffiliateButton` ("View at Wayfair — $799") with retailer logo
- Mobile-first responsive design
- `TrendingComparisons` section (most-viewed comparisons query)

**Dependencies:** API routes from comparison-engine, shadcn/ui components
**Tests:** Component rendering tests for key UI components. Verify server components don't import client-only code.

---

## Agent: affiliate
**Scope:** Affiliate link generation, click tracking, network integration
**Files:** `src/lib/affiliate/`, `src/app/api/affiliate/`

**Responsibilities:**
- `/api/affiliate/redirect`: Look up retailer's affiliate network, construct network-specific deep link (CJ, ShareASale, Rakuten formats), log to `affiliate_clicks` table, 302 redirect.
- Network-specific URL builders (each network has different deep link format)
- FTC disclosure component for comparison pages
- Click analytics queries (clicks per day, per retailer, per comparison)

**Dependencies:** Supabase client, `retailers` table config
**Tests:** Verify correct URL format per network. Verify click logging. Verify redirect status code = 302.

---

## Agent: seo
**Scope:** SEO optimization, meta tags, sitemaps, structured data
**Files:** `src/app/*/metadata.ts`, `src/app/sitemap.ts`, `src/app/robots.ts`

**Responsibilities:**
- Dynamic meta tags per comparison page: `"[Product] — Is It Worth It? See 5 Alternatives"`
- Open Graph images (template-based or auto-generated)
- XML sitemap generation from `comparisons` table
- `robots.txt`
- Product structured data (JSON-LD Schema.org Product markup)
- Canonical URLs

**Dependencies:** `comparisons` and `products` data
**Tests:** Verify meta tags render correctly for sample comparison pages. Validate structured data against Schema.org.

---

## Coordination Rules
1. **data-ingest runs first.** Nothing else works without products in the database.
2. **comparison-engine depends on data-ingest.** It queries the `products` table and uses the same embedding format.
3. **frontend depends on comparison-engine.** It consumes the API responses.
4. **affiliate can run in parallel with frontend.** The redirect endpoint is independent.
5. **seo runs last.** It wraps existing pages with metadata.

---

## Shared Conventions (All Agents)
- Read `CLAUDE.md` for full architecture, schema, and coding conventions before starting.
- Use TypeScript strict mode. No `any`.
- Use Zod for all data validation at API boundaries.
- Use `@/` path aliases for imports.
- Server Components by default. `"use client"` only when necessary.
- All Supabase queries are server-side only.
- Environment variables from `.env.local` — never hardcode secrets.
- Co-locate test files: `foo.ts` → `foo.test.ts` in the same directory.
