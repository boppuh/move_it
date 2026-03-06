/**
 * Fetches a product page URL and returns cleaned text content for GPT extraction.
 * Strips scripts, styles, and navigation noise; keeps product-relevant text.
 */
export async function fetchProductPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; IsItWorthIt/1.0; +https://isitworth.it)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  return extractTextFromHtml(html, url);
}

/**
 * Strips HTML tags and extracts meaningful text, limiting to ~4000 chars
 * to keep GPT prompt costs low while preserving product details.
 */
function extractTextFromHtml(html: string, url: string): string {
  // Remove script, style, nav, footer, header blocks
  let cleaned = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Strip remaining tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Prepend URL as context hint, truncate to ~4000 chars
  const prefix = `URL: ${url}\n\n`;
  const maxContent = 4000 - prefix.length;
  return prefix + cleaned.slice(0, maxContent);
}
