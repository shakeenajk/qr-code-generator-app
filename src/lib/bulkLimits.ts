/**
 * Maximum CSV rows per bulk generation batch.
 * Free tier has no bulk access.
 *
 * Single source of truth for bulk row cap enforcement.
 * Import BULK_TIER_LIMITS wherever bulk row count checks are needed.
 */

import type { TierKey } from './tierLimits';

export const BULK_TIER_LIMITS: Record<TierKey, number> = {
  free:    0,
  starter: 50,
  pro:     500,
};
