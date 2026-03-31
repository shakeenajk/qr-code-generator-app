/**
 * Unit tests for tierLimits.ts
 * Validates exported constants and types match the specified tier limit values.
 */

import { TIER_LIMITS } from '../tierLimits';
import type { TierKey, TierLimitValues } from '../tierLimits';

// Type assertions — compile-time checks
const _tierKey: TierKey = 'free';
const _tierKey2: TierKey = 'starter';
const _tierKey3: TierKey = 'pro';
const _limits: TierLimitValues = TIER_LIMITS.free;

// Runtime assertions (run via: node --loader ts-node/esm src/lib/__tests__/tierLimits.test.ts)
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

// Free tier
assert(TIER_LIMITS.free.totalQr === 5, 'free.totalQr should be 5');
assert(TIER_LIMITS.free.dynamicQr === 3, 'free.dynamicQr should be 3');

// Starter tier
assert(TIER_LIMITS.starter.totalQr === 100, 'starter.totalQr should be 100');
assert(TIER_LIMITS.starter.dynamicQr === 10, 'starter.dynamicQr should be 10');

// Pro tier
assert(TIER_LIMITS.pro.totalQr === 250, 'pro.totalQr should be 250');
assert(TIER_LIMITS.pro.dynamicQr === 100, 'pro.dynamicQr should be 100');

// No Infinity values
const tiers: TierKey[] = ['free', 'starter', 'pro'];
for (const tier of tiers) {
  assert(isFinite(TIER_LIMITS[tier].totalQr), `${tier}.totalQr must not be Infinity`);
  assert(isFinite(TIER_LIMITS[tier].dynamicQr), `${tier}.dynamicQr must not be Infinity`);
}

console.log('All tierLimits assertions passed.');
