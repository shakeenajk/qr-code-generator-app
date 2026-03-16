export type Tier = 'free' | 'starter' | 'pro';

const PRICE_TIER_MAP: Record<string, 'starter' | 'pro'> = {
  [import.meta.env.STRIPE_PRICE_STARTER_MONTHLY]: 'starter',
  [import.meta.env.STRIPE_PRICE_STARTER_ANNUAL]: 'starter',
  [import.meta.env.STRIPE_PRICE_PRO_MONTHLY]: 'pro',
  [import.meta.env.STRIPE_PRICE_PRO_ANNUAL]: 'pro',
};

export function tierFromPriceId(priceId: string): Tier {
  return PRICE_TIER_MAP[priceId] ?? 'free';
}
