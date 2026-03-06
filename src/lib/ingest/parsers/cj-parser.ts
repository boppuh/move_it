import { RawProduct } from '@/lib/types';

// CJ Affiliate CSV feed column mappings (common variations)
const FIELD_MAP: Record<string, keyof RawProduct> = {
  // Name variations
  'product name': 'name',
  'name': 'name',
  'title': 'name',
  'product title': 'name',
  // Brand
  'brand': 'brand',
  'manufacturer': 'brand',
  // Category
  'category': 'category',
  'product type': 'category',
  'product category': 'category',
  // Price
  'price': 'price',
  'retail price': 'price',
  'sale price': 'sale_price',
  // IDs
  'sku': 'external_id',
  'product id': 'external_id',
  'item id': 'external_id',
  // URLs
  'buy url': 'url',
  'link': 'url',
  'product url': 'url',
  'image url': 'image_url',
  'image': 'image_url',
  // Description
  'description': 'description',
  'product description': 'description',
  // Rating
  'rating': 'rating',
  'average rating': 'rating',
  // Reviews
  'review count': 'review_count',
  'number of reviews': 'review_count',
};

function parseRow(headers: string[], values: string[]): Partial<RawProduct> {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h.toLowerCase().trim()] = (values[i] ?? '').trim();
  });

  const product: Partial<RawProduct> = {
    currency: 'USD',
    materials: [],
    style_tags: [],
    is_active: true,
  };

  for (const [col, field] of Object.entries(FIELD_MAP)) {
    const val = row[col];
    if (!val) continue;

    if (field === 'price' || field === 'sale_price' || field === 'rating') {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      if (!isNaN(num)) (product as Record<string, unknown>)[field] = num;
    } else if (field === 'review_count') {
      const num = parseInt(val.replace(/,/g, ''), 10);
      if (!isNaN(num)) product.review_count = num;
    } else {
      (product as Record<string, unknown>)[field] = val;
    }
  }

  return product;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function parseCjFeed(csv: string): RawProduct[] {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const products: RawProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const raw = parseRow(headers, values);

    if (!raw.name || !raw.category) continue;

    products.push(raw as RawProduct);
  }

  return products;
}
