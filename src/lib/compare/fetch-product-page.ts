/**
 * Allowlist of retailer domains this server is permitted to fetch.
 * An allowlist is the only reliable SSRF defense: hostname-pattern checks
 * cannot prevent DNS rebinding (attacker controls DNS TTL) or
 * IPv6-mapped IPv4 addresses (e.g. ::ffff:169.254.169.254).
 */
const ALLOWED_RETAILER_DOMAINS = new Set([
  'wayfair.com',
  'allmodern.com',
  'westelm.com',
  'article.com',
  'crateandbarrel.com',
  'cb2.com',
  'potterybarn.com',
  'ikea.com',
  'zgallerie.com',
  'anthropologie.com',
  'cb2.com',
]);

function assertSafeUrl(raw: string): void {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP/HTTPS URLs are allowed');
  }

  const host = parsed.hostname.toLowerCase();

  // Allowlist check: host must be an approved retailer domain or subdomain.
  // This prevents DNS rebinding and IPv6-mapped IPv4 bypasses.
  const isAllowed = [...ALLOWED_RETAILER_DOMAINS].some(
    (domain) => host === domain || host.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    throw new Error(`URL must be from a supported retailer. Supported: ${[...ALLOWED_RETAILER_DOMAINS].join(', ')}`);
  }
}

/**
 * Fetches a product page URL and returns cleaned text content for GPT extraction.
 * Strips scripts, styles, and navigation noise; keeps product-relevant text.
 */
export async function fetchProductPage(url: string): Promise<string> {
  assertSafeUrl(url);

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; IsItWorthIt/1.0; +https://isitworth.it)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'error', // prevent redirect-based SSRF bypass
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
