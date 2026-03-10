import type { Product, Retailer } from '@/lib/types';

const CJ_PUBLISHER_ID = process.env.CJ_PUBLISHER_ID ?? '';
const SHAREASALE_AFFILIATE_ID = process.env.SHAREASALE_AFFILIATE_ID ?? '';
const RAKUTEN_PUBLISHER_ID = process.env.RAKUTEN_PUBLISHER_ID ?? '';

// Static merchant ID maps — extend as new retailers are onboarded
const SHAREASALE_MERCHANTS: Record<string, string> = {
  article: '87089',
};

const RAKUTEN_MERCHANTS: Record<string, string> = {
  'west-elm': '43176',
};

/**
 * Builds an affiliate-tracked URL for a given product + retailer.
 * Falls back to the raw product URL when no network is configured
 * or the required env var is missing.
 */
export function buildAffiliateUrl(product: Product, retailer: Retailer): string {
  const productUrl = product.url;
  if (!productUrl) return '';

  const network = retailer.affiliate_network;

  if (network === 'cj' && CJ_PUBLISHER_ID) {
    return `https://www.anrdoezrs.net/links/${CJ_PUBLISHER_ID}/type/dlg/${encodeURIComponent(productUrl)}`;
  }

  if (network === 'shareasale' && SHAREASALE_AFFILIATE_ID) {
    const merchantId = SHAREASALE_MERCHANTS[retailer.slug];
    if (merchantId) {
      return `https://shareasale.com/r.cfm?b=1&u=${SHAREASALE_AFFILIATE_ID}&m=${merchantId}&urllink=${encodeURIComponent(productUrl)}`;
    }
  }

  if (network === 'rakuten' && RAKUTEN_PUBLISHER_ID) {
    const merchantId = RAKUTEN_MERCHANTS[retailer.slug];
    if (merchantId) {
      return `https://click.linksynergy.com/deeplink?id=${RAKUTEN_PUBLISHER_ID}&mid=${merchantId}&murl=${encodeURIComponent(productUrl)}`;
    }
  }

  // No network configured or merchant not in map — return raw URL
  return productUrl;
}

/**
 * Returns the internal affiliate redirect URL for a product.
 * The redirect route handles click logging + final URL construction server-side.
 */
export function getAffiliateRedirectUrl(productId: string, comparisonId?: string): string {
  const params = new URLSearchParams({ pid: productId });
  if (comparisonId) params.set('cid', comparisonId);
  return `/api/affiliate/redirect?${params.toString()}`;
}
