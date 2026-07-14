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
    const map = new Map<string, FundingFeeAggregated>();
    
    // Initialize map with current rates
    currentRates.forEach(cr => {
      const key = `${cr.exchange}-${cr.symbol}`;
      map.set(key, {
        exchange: cr.exchange,
        symbol: cr.symbol,
        instrumentType: cr.instrumentType,
        nextFundingRate: cr.fundingRate,
        nextFundingTime: cr.nextFundingTime,
        lastFundingRate: 0,
        todaySum: 0,
        currentMonthSum: 0,
        lastMonthSum: 0,
        last3MonthsSum: 0,
        last6MonthsSum: 0,
        yearSum: 0
      });
    });
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const lastMonthEnd = currentMonthStart - 1;
    
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).getTime();
    const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 6, 1).getTime();
    const oneYearAgoStart = new Date(now.getFullYear() - 1, now.getMonth(), 1).getTime();
    
    // Sort history descending
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    
    // Group history by symbol
    sortedHistory.forEach(fee => {
      const key = `${fee.exchange}-${fee.symbol}`;
      let agg = map.get(key);
      if (!agg) {
        agg = {
          exchange: fee.exchange,
          symbol: fee.symbol,
          instrumentType: fee.instrumentType,
          lastFundingRate: fee.fundingRate,
          todaySum: 0,
          currentMonthSum: 0,
          lastMonthSum: 0,
          last3MonthsSum: 0,
          last6MonthsSum: 0,
          yearSum: 0
        };
        map.set(key, agg);
      }
      
      const ts = fee.timestamp;
      const rate = fee.fundingRate; // we just sum the percentages
      
      // If it's the very first historical record (most recent), set it as last funding rate
      if (agg.lastFundingRate === 0) {
        agg.lastFundingRate = rate;
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
          agg.last6MonthsSum += rate;
        }
        if (ts >= oneYearAgoStart) {
          agg.yearSum += rate;
        }
      }
    });
    
    return Array.from(map.values());
  }, [currentRates, history]);

  return { aggregatedData, isLoading };
}
