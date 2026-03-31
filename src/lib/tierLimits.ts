// Centralized tier limits — single source of truth for all enforcement logic.
// Import TIER_LIMITS wherever QR count checks are needed.

export type TierKey = 'free' | 'starter' | 'pro';

export interface TierLimitValues {
  /** Maximum total saved QR codes (static + dynamic). */
  totalQr: number;
  /** Maximum dynamic QR codes. */
  dynamicQr: number;
}

export const TIER_LIMITS: Record<TierKey, TierLimitValues> = {
  free:    { totalQr: 5,   dynamicQr: 3   },
  starter: { totalQr: 100, dynamicQr: 10  },
  pro:     { totalQr: 250, dynamicQr: 100 },
};
