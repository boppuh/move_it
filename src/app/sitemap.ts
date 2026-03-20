import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const STATIC_ROUTES = [
  { url: BASE_URL, priority: 1.0 },
  { url: `${BASE_URL}/browse`, priority: 0.8 },
  { url: `${BASE_URL}/about`, priority: 0.5 },
];

const CATEGORY_ROUTES = [
  'sofa', 'bed', 'table', 'chair', 'desk', 'storage', 'lighting', 'rug',
].map((cat) => ({ url: `${BASE_URL}/browse/${cat}`, priority: 0.7 }));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();
  const { data: comparisons } = await supabase
    .from('comparisons')
    .select('slug, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  const comparisonRoutes: MetadataRoute.Sitemap = (comparisons ?? []).map((c) => ({
    url: `${BASE_URL}/compare/${c.slug}`,
    lastModified: c.created_at ? new Date(c.created_at) : undefined,
    priority: 0.6,
  }));

  return [
    ...STATIC_ROUTES.map((r) => ({ url: r.url, priority: r.priority })),
    ...CATEGORY_ROUTES.map((r) => ({ url: r.url, priority: r.priority })),
    ...comparisonRoutes,
  ];
}
