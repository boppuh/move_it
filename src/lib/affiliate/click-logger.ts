import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase';

export interface ClickParams {
  productId: string;
  comparisonId?: string;
  retailerId?: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * Fire-and-forget insert into affiliate_clicks.
 * Never throws — errors are logged to console only.
 */
export async function logClick(params: ClickParams): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('affiliate_clicks').insert({
      product_id: params.productId,
      comparison_id: params.comparisonId ?? null,
      retailer_id: params.retailerId ?? null,
      referrer: params.referrer ?? null,
      user_agent: params.userAgent ?? null,
      ip_hash: params.ip ? hashIp(params.ip) : null,
    });
    if (error) console.error('[affiliate_click]', error);
  } catch (err) {
    console.error('[affiliate_click]', err);
  }
}
