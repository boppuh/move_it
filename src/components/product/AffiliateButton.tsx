import { getAffiliateRedirectUrl } from '@/lib/affiliate/link-builder';
import { formatPrice } from '@/lib/format';

interface AffiliateButtonProps {
  productId: string;
  /** Retailer display name — shown as "View at {name}". Defaults to "View product". */
  retailerName?: string;
  /** When provided, appended to the label as "— $price". */
  price?: number | null;
  comparisonId?: string;
  /** 'default' (full-size) or 'compact' (small card button). Default: 'default'. */
  variant?: 'default' | 'compact';
}

export function AffiliateButton({
  productId,
  retailerName,
  price,
  comparisonId,
  variant = 'default',
}: AffiliateButtonProps) {
  const href = getAffiliateRedirectUrl(productId, comparisonId);

  let label: string;
  if (variant === 'compact') {
    label = 'View →';
  } else if (retailerName) {
    label = price != null
      ? `View at ${retailerName} — ${formatPrice(price)}`
      : `View at ${retailerName} →`;
  } else {
    label = price != null ? `View — ${formatPrice(price)} →` : 'View product →';
  }

  const className =
    variant === 'compact'
      ? 'rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
      : 'inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
    >
      {label}
    </a>
  );
}
