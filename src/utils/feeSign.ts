import Big from 'big.js';

/**
 * Canonical fee convention used across the app: a positive value is a cost the
 * trader paid, a negative value is a rebate received.
 *
 * Each venue reports the `fee` field differently in its transaction history:
 * - Bybit v5 transaction log returns fees as positive costs
 *   (e.g. `"fee": "0.01908720"` alongside `"change": "-0.0190872"`).
 * - Bitget UTA bills and OKX bills return fees as negative costs
 *   (e.g. `"fee": "-0.00000531"`).
 *
 * Everything downstream (stats, USD aggregation, cards, exports) assumes the
 * canonical convention, so raw fees must go through `toFeeCost` first.
 */
export type FeeSource = 'bybit' | 'bitget' | 'okx';

/** Raw fee is already a positive cost. */
export const POSITIVE_FEE_IS_COST: FeeSource[] = ['bybit'];

/** Returns whether the venue reports fees as positive costs. */
export function isPositiveFeeConvention(source: FeeSource): boolean {
  return POSITIVE_FEE_IS_COST.includes(source);
}

/**
 * Normalize a raw exchange fee into the canonical convention
 * (positive = paid, negative = rebate).
 */
export function toFeeCost(source: FeeSource, fee: string | number | undefined | null): Big {
  const raw = new Big(fee || '0');
  return isPositiveFeeConvention(source) ? raw : raw.times(-1);
}
