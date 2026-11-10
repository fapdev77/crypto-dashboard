import { describe, it, expect } from 'vitest';
import {
  isUsdPeggedStablecoin,
  resolveUsdRate,
  needsTokenRate,
  aggregateStatsToUsd,
} from '../usdAggregation';

const values = (overrides: Record<string, string> = {}) => ({
  totalFunding: '0',
  totalFees: '0',
  totalCashFlow: '0',
  totalChange: '0',
  finalBalance: '0',
  totalInflow: '0',
  totalOutflow: '0',
  ...overrides,
});

describe('resolveUsdRate', () => {
  it('treats USD-pegged stablecoins as 1', () => {
    expect(resolveUsdRate('USDT', {}, {})).toBe(1);
    expect(resolveUsdRate('usdc', {}, {})).toBe(1);
    expect(isUsdPeggedStablecoin('USDC')).toBe(true);
  });

  it('does not treat BRL as a USD-pegged stablecoin', () => {
    expect(isUsdPeggedStablecoin('BRL')).toBe(false);
    expect(resolveUsdRate('BRL', {}, { BRL: 5 })).toBeCloseTo(0.2);
  });

  it('falls back to the default fiat rate when none was fetched', () => {
    expect(resolveUsdRate('BRL', {}, undefined)).toBeCloseTo(1 / 5.65);
    expect(resolveUsdRate('EURT', {}, undefined)).toBeCloseTo(1 / 0.92);
  });

  it('uses fetched token prices for crypto and reports unknown assets as null', () => {
    expect(resolveUsdRate('BTC', { BTC: 50000 }, {})).toBe(50000);
    expect(resolveUsdRate('BTC', {}, {})).toBeNull();
    expect(resolveUsdRate('', {}, {})).toBeNull();
  });
});

describe('needsTokenRate', () => {
  it('only asks for a network price when nothing else resolves the asset', () => {
    expect(needsTokenRate('USDT', {})).toBe(false);
    expect(needsTokenRate('BRL', { BRL: 5 })).toBe(false);
    expect(needsTokenRate('EURT', {})).toBe(false);
    expect(needsTokenRate('BTC', {})).toBe(true);
  });
});

describe('aggregateStatsToUsd', () => {
  it('includes stablecoins and crypto in one USD total', () => {
    const { stats, missingRates } = aggregateStatsToUsd(
      {
        USDT: values({ totalFees: '10' }),
        BTC: values({ totalFees: '0.01' }),
      },
      { BTC: 50000 },
      {}
    );

    expect(stats.totalFees).toBe('510');
    expect(missingRates).toEqual([]);
  });

  it('converts BRL with the fiat rate instead of assuming 1:1', () => {
    const { stats } = aggregateStatsToUsd(
      { BRL: values({ finalBalance: '100' }) },
      {},
      { BRL: 5 }
    );

    expect(stats.finalBalance).toBe('20');
  });

  it('lists currencies that were dropped for lack of a rate', () => {
    const { stats, missingRates } = aggregateStatsToUsd(
      { XYZ: values({ totalFees: '9' }) },
      {},
      {}
    );

    expect(stats.totalFees).toBe('0');
    expect(missingRates).toEqual(['XYZ']);
  });

  it('ignores currencies with no rate when every value is zero', () => {
    const { missingRates } = aggregateStatsToUsd(
      { XYZ: values({ totalFees: '0', totalChange: '0' }) },
      {},
      {}
    );

    expect(missingRates).toEqual([]);
  });

  it('derives initial balance and percentage change from the USD totals', () => {
    const { stats } = aggregateStatsToUsd(
      {
        USDT: values({ finalBalance: '120', totalChange: '20' }),
      },
      {},
      {}
    );

    expect(stats.initialBalance).toBe('100');
    expect(stats.percentageChange).toBeCloseTo(20);
  });
});
