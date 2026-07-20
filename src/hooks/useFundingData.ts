import { useState, useEffect, useMemo } from 'react';
import { useFundingStore } from '../store/fundingStore';
import { getAllFundingSummaries } from '../services/historyCache';
import { FundingRateSummary, FundingFeeAggregated } from '../types';
import { LogManager } from '../services/LogManager';

export function useFundingData() {
  const [summaries, setSummaries] = useState<FundingRateSummary[]>([]);
  const { currentRates, isSyncing, syncProgress } = useFundingStore();
  const [isLoading, setIsLoading] = useState(true);

  // Poll IndexedDB for new summaries every few seconds while syncing, or just once if not syncing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSummaries = async () => {
      try {
        const data = await getAllFundingSummaries();
        setSummaries(data);
      } catch (err) {
        LogManager.error('useFundingData', 'Failed to load summaries:', err);
        setSummaries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();

    if (isSyncing) {
      interval = setInterval(fetchSummaries, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSyncing, syncProgress]);

  // Lightweight mapping: seed from currentRates, overwrite from pre-computed summaries
  const aggregatedData = useMemo(() => {
    const map = new Map<string, FundingFeeAggregated>();

    // Seed from current rates (provides nextFundingRate/nextFundingTime + zero-fill for unsync'd symbols)
    currentRates.forEach(cr => {
      map.set(`${cr.exchange}-${cr.symbol}`, {
        exchange: cr.exchange,
        symbol: cr.symbol,
        instrumentType: cr.instrumentType,
        nextFundingRate: cr.fundingRate,
        nextFundingTime: cr.nextFundingTime,
        lastFundingRate: undefined,
        todaySum: 0,
        currentMonthSum: 0,
        lastMonthSum: 0,
        last3MonthsSum: 0,
        last6MonthsSum: 0,
        yearSum: 0,
      });
    });

    // Overwrite historical fields from pre-computed summaries
    summaries.forEach(s => {
      const key = `${s.exchange}-${s.symbol}`;
      const existing = map.get(key);
      const base = existing ?? {
        exchange: s.exchange,
        symbol: s.symbol,
        instrumentType: s.instrumentType,
        nextFundingRate: undefined,
        nextFundingTime: undefined,
      };

      map.set(key, {
        ...base,
        lastFundingRate: parseFloat(s.lastFundingRate),
        todaySum: parseFloat(s.todayFundingRate),
        currentMonthSum: parseFloat(s.currentMonthFundingRate),
        lastMonthSum: parseFloat(s.lastMonthFundingRate),
        last3MonthsSum: parseFloat(s.last3MonthsFundingRate),
        // Optional fields: only set if the summary has the data
        ...(s.last6MonthsFundingRate !== undefined
          ? { last6MonthsSum: parseFloat(s.last6MonthsFundingRate) }
          : { last6MonthsSum: undefined }),
        ...(s.last12MonthsFundingRate !== undefined
          ? { yearSum: parseFloat(s.last12MonthsFundingRate) }
          : { yearSum: undefined }),
      });
    });

    return Array.from(map.values());
  }, [currentRates, summaries]);

  return { aggregatedData, isLoading };
}
