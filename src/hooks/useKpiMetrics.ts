import { useState, useEffect, useMemo } from 'react';
import Big from 'big.js';
import { FundingFeeAggregated, ExchangeName } from '../types';
import { CurrentFundingRate } from '../services/funding/FundingService';

// ── Types ─────────────────────────────────────────────────────────

export interface KpiMetricItem {
  symbol: string;
  rate: number;
  exchange?: ExchangeName;
}

export interface MarketMetrics {
  totalSymbols: number;
  usdtmSymbols: number;
  coinmSymbols: number;
  positiveRatePct: number;
  negativeRatePct: number;
  neutralRatePct: number;
  netPositiveSpread: number; // positiveRatePct - negativeRatePct
  avgTodayRate: number;
  stdDevTodayRate: number;
  nextFundingCountdown: number; // ms until next global funding settlement
}

export interface Rankings {
  topPayers: KpiMetricItem[];
  bottomPayers: KpiMetricItem[];
  highestVolatility: KpiMetricItem[];
}

export interface KpiMetrics {
  marketMetrics: MarketMetrics;
  rankings: Rankings;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Compute standard deviation of an array of numbers using Big.js for precision.
 */
const stdDev = (values: number[], mean: number): number => {
  if (values.length === 0) return 0;
  const sumSq = values.reduce((acc, v) => {
    const diff = new Big(v).minus(mean);
    return acc.plus(diff.times(diff));
  }, new Big(0));
  return Math.sqrt(parseFloat(sumSq.div(values.length).toFixed(18)));
};

// ── Hook ───────────────────────────────────────────────────────────

export function useKpiMetrics(
  aggregatedData: FundingFeeAggregated[],
  currentRates: CurrentFundingRate[],
): KpiMetrics {
  // ── Live countdown ──────────────────────────────────────────────
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Market Metrics ──────────────────────────────────────────────
  const marketMetrics = useMemo<MarketMetrics>(() => {
    const total = aggregatedData.length;

    if (total === 0) {
      return {
        totalSymbols: 0,
        usdtmSymbols: 0,
        coinmSymbols: 0,
        positiveRatePct: 0,
        negativeRatePct: 0,
        neutralRatePct: 0,
        netPositiveSpread: 0,
        avgTodayRate: 0,
        stdDevTodayRate: 0,
        nextFundingCountdown: 0,
      };
    }

    const usdtmCount = aggregatedData.filter(d => d.instrumentType === 'USDT-M').length;
    const coinmCount = aggregatedData.filter(d => d.instrumentType === 'COIN-M').length;

    const todayValues = aggregatedData
      .map(d => d.todaySum)
      .filter(v => typeof v === 'number' && !isNaN(v));

    const positiveCount = todayValues.filter(v => v > 0).length;
    const negativeCount = todayValues.filter(v => v < 0).length;
    const neutralCount = todayValues.filter(v => v === 0).length;

    // Average (Big.js)
    const sum = todayValues.reduce((acc, v) => acc.plus(v), new Big(0));
    const avg = todayValues.length > 0 ? parseFloat(sum.div(todayValues.length).toFixed(12)) : 0;

    // Standard deviation
    const sd = todayValues.length > 0 ? stdDev(todayValues, avg) : 0;

    // Nearest next funding time
    let nearest = Infinity;
    for (const rate of currentRates) {
      if (rate.nextFundingTime > now && rate.nextFundingTime < nearest) {
        nearest = rate.nextFundingTime;
      }
    }

    const posPct = todayValues.length > 0 ? (positiveCount / todayValues.length) * 100 : 0;
    const negPct = todayValues.length > 0 ? (negativeCount / todayValues.length) * 100 : 0;
    const neutPct = todayValues.length > 0 ? (neutralCount / todayValues.length) * 100 : 0;

    return {
      totalSymbols: total,
      usdtmSymbols: usdtmCount,
      coinmSymbols: coinmCount,
      positiveRatePct: posPct,
      negativeRatePct: negPct,
      neutralRatePct: neutPct,
      netPositiveSpread: posPct - negPct,
      avgTodayRate: avg,
      stdDevTodayRate: sd,
      nextFundingCountdown: nearest !== Infinity ? nearest - now : 0,
    };
  }, [aggregatedData, currentRates, now]);

  // ── Rankings ────────────────────────────────────────────────────
  const rankings = useMemo<Rankings>(() => {
    const items = aggregatedData.map(d => ({
      symbol: d.symbol,
      rate: d.todaySum,
      exchange: d.exchange,
    }));

    const positive = items
      .filter(i => i.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    const negative = items
      .filter(i => i.rate < 0)
      .sort((a, b) => a.rate - b.rate) // most negative first
      .slice(0, 5);

    const volatile = items
      .filter(i => i.rate !== 0)
      .sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate))
      .slice(0, 5);

    return {
      topPayers: positive,
      bottomPayers: negative,
      highestVolatility: volatile,
    };
  }, [aggregatedData]);

  return { marketMetrics, rankings };
}
