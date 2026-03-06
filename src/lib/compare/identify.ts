import { openai } from '@/lib/openai';
import { fetchProductPage } from './fetch-product-page';
import type { RawProduct } from '@/lib/types';

const IDENTIFY_SYSTEM = `You are a furniture product data extractor. Given product page text or a user description, extract structured product information and return valid JSON.

Required fields:
- name: string (product name, required)
- category: string (one of: bed, sofa, nightstand, dresser, desk, chair, table, bookcase, other)

Optional fields (omit if not found):
- brand: string
- price: number (numeric only, no currency symbols)
- sale_price: number
- description: string (1-3 sentences max)
- image_url: string (absolute URL if found)
- materials: array of strings (e.g. ["solid wood", "polyester fill"])
- style_tags: array from: mid-century, modern, traditional, scandinavian, industrial, farmhouse, glam, bohemian, coastal
- dimensions: object with numeric fields and unit ("in" or "cm"):
  { width?: number, height?: number, depth?: number, unit: "in" | "cm" }

Return ONLY a JSON object, no markdown, no explanation.`;

/**
 * Identifies a product from a URL by fetching the page and extracting with GPT.
 */
export async function identifyFromUrl(url: string): Promise<RawProduct> {
  const pageText = await fetchProductPage(url);
  return extractProductFromText(pageText, url);
}

/**
 * Identifies a product from a free-text description using GPT extraction.
 */
export async function identifyFromText(text: string): Promise<RawProduct> {
  return extractProductFromText(text);
}

async function extractProductFromText(
  text: string,
  sourceUrl?: string
): Promise<RawProduct> {
  const userContent = sourceUrl
    ? `Extract product data from this page content:\n\n${text}`
    : `Extract product data from this description:\n\n${text}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: IDENTIFY_SYSTEM },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 512,
  });

  const raw = response.choices[0]?.message?.content ?? '{}';

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`GPT returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new Error('Could not identify product name from input');
  }

  if (!parsed.category || typeof parsed.category !== 'string') {
    throw new Error('Could not identify product category from input');
  }

  // Set URL if we have it
  if (sourceUrl && !parsed.url) {
    parsed.url = sourceUrl;
  }

  return parsed as RawProduct;
}
