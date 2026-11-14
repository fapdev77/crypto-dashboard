import Big from 'big.js';
import type { ConsolidatedStats } from '../hooks/useConsolidatedTransactions';

/**
 * Single source of truth for the consolidated KPI values.
 *
 * The macro cards, the drilldown modal and the export all read the totals from
 * here. Previously the card used `|sum of fees|` while the modal summed
 * `|fees|` per venue, which made them disagree whenever venues reported fees
 * with different signs.
 */

export type ConsolidatedMetric = 'funding' | 'fees' | 'balance' | 'netchange';
export type ConsolidatedExchangeId = 'bybit' | 'bitget' | 'okx';

export interface ConsolidatedMetricRow {
  exchange: ConsolidatedExchangeId;
  /** Signed value in USD, already normalized to the canonical fee convention. */
  value: string;
  totalCount: number;
}

export interface ConsolidatedMetricBreakdown {
  rows: ConsolidatedMetricRow[];
  /** Signed total across the venues that actually have transactions. */
  grandTotal: string;
}

const EXCHANGES: ConsolidatedExchangeId[] = ['bybit', 'bitget', 'okx'];

function metricValue(
  aggregatedUsd: ConsolidatedStats['byExchange'][ConsolidatedExchangeId]['aggregatedUsd'],
  metric: ConsolidatedMetric
): string {
  switch (metric) {
    case 'funding':
      return aggregatedUsd.totalFunding || '0';
    case 'fees':
      return aggregatedUsd.totalFees || '0';
    case 'balance':
      return aggregatedUsd.finalBalance || '0';
    case 'netchange':
      return aggregatedUsd.totalChange || '0';
  }
}

export function getConsolidatedMetric(
  stats: ConsolidatedStats,
  metric: ConsolidatedMetric
): ConsolidatedMetricBreakdown {
  const rows: ConsolidatedMetricRow[] = [];
  let grandTotal = new Big(0);

  for (const exchange of EXCHANGES) {
    const block = stats.byExchange[exchange];
    if (!block || block.totalCount === 0) continue;
    const value = metricValue(block.aggregatedUsd, metric);
    rows.push({ exchange, value, totalCount: block.totalCount });
    grandTotal = grandTotal.plus(new Big(value));
  }

  return { rows, grandTotal: grandTotal.toString() };
}

/**
 * Canonical sign prefix for a fee amount: costs are shown with a leading '-'
 * and net rebates with a leading '+'. Zero has no prefix.
 */
export function feeDisplaySign(value: Big | number | string): '-' | '+' | '' {
  const big = value instanceof Big ? value : new Big(value || '0');
  if (big.gt(0)) return '-';
  if (big.lt(0)) return '+';
  return '';
}
