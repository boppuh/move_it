import { RawProduct } from '@/lib/types';

// ShareASale CSV feed uses different column names than CJ
const FIELD_MAP: Record<string, keyof RawProduct> = {
  'name': 'name',
  'product name': 'name',
  'title': 'name',
  'brand': 'brand',
  'category': 'category',
  'subcategory': 'category',
  'price': 'price',
  'saleprice': 'sale_price',
  'sale price': 'sale_price',
  'sku': 'external_id',
  'productid': 'external_id',
  'product id': 'external_id',
  'buyurl': 'url',
  'buy url': 'url',
  'producturl': 'url',
  'imageurl': 'image_url',
  'image url': 'image_url',
  'largeimage': 'image_url',
  'description': 'description',
  'longdescription': 'description',
  'long description': 'description',
};

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

function parseRow(headers: string[], values: string[]): Partial<RawProduct> {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h.toLowerCase().trim().replace(/\s+/g, '')] = (values[i] ?? '').trim();
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

    if (field === 'price' || field === 'sale_price') {
      const num = parseFloat(val.replace(/[$,]/g, ''));
      if (!isNaN(num)) (product as Record<string, unknown>)[field] = num;
    } else {
      (product as Record<string, unknown>)[field] = val;
    }
  }

  return product;
}

export function parseShareAsaleFeed(csv: string): RawProduct[] {
  const lines = csv.split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  // ShareASale feeds sometimes have a header line starting with "Name,SKU,..."
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
