import { useState, useEffect, useMemo } from 'react';
import { useFundingStore } from '../store/fundingStore';
import { useSettingsStore } from '../store/settingsStore';
import { getAllFundingSummaries } from '../services/historyCache';
import { FundingRateSummary, FundingFeeAggregated } from '../types';
import { LogManager } from '../services/LogManager';

export function useFundingData() {
  const [summaries, setSummaries] = useState<FundingRateSummary[]>([]);
  const { currentRates, isSyncing } = useFundingStore();
  const [isLoading, setIsLoading] = useState(true);
  const useMockData = useSettingsStore(state => state.useMockData);

  // Poll IndexedDB for new summaries every few seconds while syncing, or just once if not syncing
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchSummaries = async () => {
      if (useMockData) {
        try {
          const mod = await import('../mock/funding.json');
          setSummaries(mod.default as any);
        } catch (err) {
          LogManager.error('FundingData', 'Failed to load mock funding summaries:', err);
          setSummaries([]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await getAllFundingSummaries();
        setSummaries(data);
      } catch (err) {
        LogManager.error('FundingData', 'Failed to load summaries:', err);
        setSummaries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaries();

    if (isSyncing && !useMockData) {
      interval = setInterval(fetchSummaries, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSyncing, useMockData]);

  // Lightweight mapping: seed from currentRates, overwrite from pre-computed summaries
  const aggregatedData = useMemo(() => {
    const map = new Map<string, FundingFeeAggregated>();

    // Seed from current rates (only if nextFundingTime > 0)
    currentRates.forEach(cr => {
      if (!cr.nextFundingTime || cr.nextFundingTime <= 0) return;
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

    // Overwrite historical fields from pre-computed summaries (skip zeroSummary guards)
    summaries.forEach(s => {
      if (s.lastFundingTime === '0') return;
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

    // Filter out items that have neither a valid next funding time nor historical funding data
    return Array.from(map.values()).filter(item => {
      const hasNextFunding = item.nextFundingTime !== undefined && item.nextFundingTime > 0;
      const hasHistory = item.lastFundingRate !== undefined;
      return hasNextFunding || hasHistory;
    });
  }, [currentRates, summaries]);

  return { aggregatedData, isLoading };
}
