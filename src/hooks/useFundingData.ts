import { useState, useEffect, useMemo } from 'react';
import { useFundingStore } from '../store/fundingStore';
import { getAllFundingFees } from '../services/historyCache';
import { UnifiedFundingFee, FundingFeeAggregated } from '../types';
import { CurrentFundingRate } from '../services/funding/FundingService';

export function useFundingData() {
  const [history, setHistory] = useState<UnifiedFundingFee[]>([]);
  const { currentRates, isSyncing, syncProgress } = useFundingStore();
  const [isLoading, setIsLoading] = useState(true);

  // Poll IndexedDB for new history every few seconds while syncing, or just once if not syncing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchHistory = async () => {
      const data = await getAllFundingFees();
      setHistory(data);
      setIsLoading(false);
    };
    
    fetchHistory();
    
    if (isSyncing) {
      interval = setInterval(fetchHistory, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSyncing, syncProgress]);

  const aggregatedData = useMemo(() => {
    const map = new Map<string, FundingFeeAggregated & { oldestRecordTs?: number }>();
    
    // Initialize map with current rates
    currentRates.forEach(cr => {
      const key = `${cr.exchange}-${cr.symbol}`;
      map.set(key, {
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
        oldestRecordTs: undefined
      });
    });
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastMonthEnd = currentMonthStart - 1;
    
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
    const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
    // Anchored to the last complete month (now.getMonth() - 1), not the current month
    const oneYearAgoStart = new Date(now.getFullYear() - 1, now.getMonth() - 1, 1).getTime();
    
    // Group history by symbol
    history.forEach(fee => {
      const key = `${fee.exchange}-${fee.symbol}`;
      let agg = map.get(key);
      if (!agg) {
        agg = {
          exchange: fee.exchange,
          symbol: fee.symbol,
          instrumentType: fee.instrumentType,
          lastFundingRate: undefined, // Will be set below
          todaySum: 0,
          currentMonthSum: 0,
          lastMonthSum: 0,
          last3MonthsSum: 0,
          last6MonthsSum: 0,
          yearSum: 0,
          oldestRecordTs: undefined,
          highestRecordTs: undefined
        } as FundingFeeAggregated & { oldestRecordTs?: number, highestRecordTs?: number };
        map.set(key, agg);
      }
      
      const ts = fee.timestamp;
      const rate = fee.fundingRate;
      
      // Track the most recent historical record to use as lastFundingRate
      const currentHighestTs = (agg as any).highestRecordTs ?? -1;
      if (ts > currentHighestTs) {
        (agg as any).highestRecordTs = ts;
        agg.lastFundingRate = rate;
      }

      const currentOldestTs = agg.oldestRecordTs ?? Infinity;
      if (ts < currentOldestTs) {
        agg.oldestRecordTs = ts;
      }
      
      if (ts >= todayStart) {
        agg.todaySum += rate;
      }
      
      if (ts >= currentMonthStart) {
        agg.currentMonthSum += rate;
      } else {
        // Exclude current month
        if (ts >= lastMonthStart && ts <= lastMonthEnd) {
          agg.lastMonthSum += rate;
        }
        if (ts >= threeMonthsAgoStart) {
          agg.last3MonthsSum += rate;
        }
        if (ts >= sixMonthsAgoStart) {
          if (agg.last6MonthsSum !== undefined) agg.last6MonthsSum += rate;
        }
        if (ts >= oneYearAgoStart) {
          if (agg.yearSum !== undefined) agg.yearSum += rate;
        }
      }
    });
    
    return Array.from(map.values()).map(agg => {
      // For Bitget and OKX, the API only goes back ~3 months.
      // If we haven't accumulated enough data in the local cache yet, we should
      // not display a partial sum for 6 months or 1 year.
      if (agg.exchange === 'okx' || agg.exchange === 'bitget') {
        const oldest = agg.oldestRecordTs ?? now.getTime();
        if (oldest > sixMonthsAgoStart) {
          agg.last6MonthsSum = undefined;
        }
        if (oldest > oneYearAgoStart) {
          agg.yearSum = undefined;
        }
      }
      
      // Clean up internal properties
      const { oldestRecordTs, highestRecordTs, ...rest } = agg as any;
      return rest as FundingFeeAggregated;
    });
  }, [currentRates, history]);

  return { aggregatedData, isLoading };
}
