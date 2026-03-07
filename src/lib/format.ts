/**
 * Shared formatting utilities.
 */

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return '—';
  return priceFormatter.format(price);
}
