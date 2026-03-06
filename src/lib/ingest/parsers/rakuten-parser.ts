import { RawProduct } from '@/lib/types';

function getTextContent(element: Element, tagName: string): string | null {
  return element.getElementsByTagName(tagName)[0]?.textContent?.trim() ?? null;
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const num = parseFloat(raw.replace(/[$,]/g, ''));
  return isNaN(num) ? null : num;
}

export function parseRakutenFeed(xml: string): RawProduct[] {
  // Node.js does not have DOMParser — use a regex-based lightweight approach
  // for the standard Rakuten product catalog XML format
  const products: RawProduct[] = [];

  // Match <product> ... </product> blocks
  const productPattern = /<product[^>]*>([\s\S]*?)<\/product>/gi;
  let match: RegExpExecArray | null;

  while ((match = productPattern.exec(xml)) !== null) {
    const block = match[1];

    const getText = (tag: string): string | null => {
      const m = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i').exec(block);
      return m ? (m[1] ?? m[2] ?? '').trim() || null : null;
    };

    const name = getText('name') ?? getText('productname') ?? getText('title');
    const category = getText('category') ?? getText('productcategory') ?? getText('type');

    if (!name || !category) continue;

    const priceRaw = getText('price') ?? getText('saleprice') ?? getText('retailprice');
    const salePriceRaw = getText('saleprice');

    const product: RawProduct = {
      name,
      category: category.toLowerCase(),
      brand: getText('brand') ?? getText('manufacturer') ?? undefined,
      external_id: getText('sku') ?? getText('productid') ?? getText('id') ?? undefined,
      price: parsePrice(priceRaw) ?? undefined,
      sale_price: parsePrice(salePriceRaw) ?? undefined,
      url: getText('buyurl') ?? getText('producturl') ?? getText('clickurl') ?? undefined,
      image_url: getText('imageurl') ?? getText('largeimage') ?? getText('image') ?? undefined,
      description: getText('description') ?? getText('longdescription') ?? undefined,
      currency: 'USD',
      materials: [],
      style_tags: [],
      is_active: true,
    };

    products.push(product);
  }

  return products;
}
