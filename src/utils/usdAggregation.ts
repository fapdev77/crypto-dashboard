import Big from 'big.js';
import { DEFAULT_FIAT_RATES } from '../services/currency/currencyTypes';

/**
 * Shared USD aggregation for transaction stats.
 *
 * Kept in one place so the consolidated dashboard, the per-exchange pages and
 * the exports can never disagree about how a currency is converted to USD.
 */

/** Currencies that always trade 1:1 with USD. */
const USD_PEGGED = new Set([
  'USDT', 'USDC', 'USD', 'DAI', 'FDUSD', 'USDE', 'USDD',
  'BUSD', 'PYUSD', 'TUSD', 'USDP', 'GUSD', 'USDG',
]);

/** Non-USD assets whose USD price can be derived from the fiat rate table. */
const FIAT_PROXIES: Record<string, string> = {
  BRL: 'BRL',
  EUR: 'EUR',
  GBP: 'GBP',
  // Tether EUR tracks the euro closely enough for aggregated reporting.
  EURT: 'EUR',
};

export interface CurrencyStatsValues {
  totalFunding: string;
  totalFees: string;
  totalCashFlow: string;
  totalChange: string;
  finalBalance: string;
  totalInflow: string;
  totalOutflow: string;
}

export interface UsdStats extends CurrencyStatsValues {
  initialBalance: string;
  percentageChange: number;
}

export interface UsdAggregationResult {
  stats: UsdStats;
  /** Currencies that contributed 0 to the USD totals because no rate was known. */
  missingRates: string[];
}

export type FiatRatesLike = Partial<Record<string, number>> | undefined;

function normalizeCode(currency: string | undefined | null): string {
  return (currency || '').toUpperCase().trim();
}

/** True for stablecoins that are pegged to the US dollar. */
export function isUsdPeggedStablecoin(currency: string | undefined | null): boolean {
  return USD_PEGGED.has(normalizeCode(currency));
}

/**
 * USD value of one unit of `currency`, or null when no rate is available.
 * USD-pegged stablecoins are 1, fiat proxies use the fiat rate table, and
 * everything else falls back to the fetched token prices.
 */
export function resolveUsdRate(
  currency: string | undefined | null,
  tokenRates: Record<string, number> | undefined,
  fiatRates?: FiatRatesLike
): number | null {
  const code = normalizeCode(currency);
  if (!code) return null;
  if (USD_PEGGED.has(code)) return 1;

  const tokenRate = tokenRates?.[code];
  if (typeof tokenRate === 'number' && isFinite(tokenRate) && tokenRate > 0) return tokenRate;

  const fiatCode = FIAT_PROXIES[code];
  if (fiatCode) {
    const rate = fiatRates?.[fiatCode] ?? DEFAULT_FIAT_RATES[fiatCode as keyof typeof DEFAULT_FIAT_RATES];
    if (typeof rate === 'number' && isFinite(rate) && rate > 0) return 1 / rate;
  }

  return null;
}

/** Whether a currency still needs a network price fetch to be converted to USD. */
export function needsTokenRate(currency: string | undefined | null, fiatRates?: FiatRatesLike): boolean {
  const code = normalizeCode(currency);
  if (!code || USD_PEGGED.has(code)) return false;
  return resolveUsdRate(code, undefined, fiatRates) === null;
}

/**
 * Aggregate per-currency stats into USD.
 *
 * Every currency present in `perCurrency` is included, including stablecoins,
 * so callers must not add the stable bucket on top of this result.
 */
export function aggregateStatsToUsd(
  perCurrency: Record<string, CurrencyStatsValues> | undefined,
  tokenRates: Record<string, number> | undefined,
  fiatRates?: FiatRatesLike
): UsdAggregationResult {
  const sums: CurrencyStatsValues = {
    totalFunding: '0',
    totalFees: '0',
    totalCashFlow: '0',
    totalChange: '0',
    finalBalance: '0',
    totalInflow: '0',
    totalOutflow: '0',
  };
  const acc: Record<keyof CurrencyStatsValues, Big> = {
    totalFunding: new Big(0),
    totalFees: new Big(0),
    totalCashFlow: new Big(0),
    totalChange: new Big(0),
    finalBalance: new Big(0),
    totalInflow: new Big(0),
    totalOutflow: new Big(0),
  };
  const missingRates: string[] = [];

  for (const [currency, values] of Object.entries(perCurrency || {})) {
    const rate = resolveUsdRate(currency, tokenRates, fiatRates) ?? 0;
    // Only warn about a missing rate when that currency actually moved a total;
    // an all-zero bucket contributes nothing even when converted.
    const hasValue = (Object.keys(acc) as Array<keyof CurrencyStatsValues>)
      .some(key => new Big(values[key] || '0').abs().gt(0));
    if (rate === 0 && hasValue && !isUsdPeggedStablecoin(currency)) {
      missingRates.push(currency);
    }
    (Object.keys(acc) as Array<keyof CurrencyStatsValues>).forEach(key => {
      acc[key] = acc[key].plus(new Big(values[key] || '0').times(rate));
    });
  }

  (Object.keys(acc) as Array<keyof CurrencyStatsValues>).forEach(key => {
    sums[key] = acc[key].toString();
  });

  const initialBalance = acc.finalBalance.minus(acc.totalChange).minus(acc.totalInflow).plus(acc.totalOutflow);
  const basis = initialBalance.plus(acc.totalInflow);
  let percentageChange = 0;
  if (basis.gt(0)) {
    percentageChange = acc.totalChange.div(basis).times(100).toNumber();
  } else if (basis.eq(0) && acc.totalChange.gt(0)) {
    percentageChange = 100;
  }

  return {
    stats: {
      ...sums,
      initialBalance: initialBalance.toString(),
      percentageChange,
    },
    missingRates,
  };
}
