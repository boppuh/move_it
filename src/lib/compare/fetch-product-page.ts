const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '::1']);

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

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new Error('Requests to internal addresses are not allowed');
  }

  // Block private/loopback IPv4 ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 127 ||                              // 127.x.x.x loopback
      a === 10 ||                               // 10.x.x.x private
      (a === 169 && b === 254) ||               // 169.254.x.x link-local / AWS metadata
      (a === 172 && b >= 16 && b <= 31) ||      // 172.16–31.x.x private
      (a === 192 && b === 168)                  // 192.168.x.x private
    ) {
      throw new Error('Requests to internal addresses are not allowed');
    }
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
