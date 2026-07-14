import { useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useFundingStore } from '../store/fundingStore';
import { FundingService, CurrentFundingRate } from '../services/funding/FundingService';
import { 
  getFundingMeta, 
  updateFundingMeta, 
  saveFundingFeesCache 
} from '../services/historyCache';
import { LogManager } from '../services/LogManager';

const EXCHANGES: ('bybit' | 'okx' | 'bitget')[] = ['bybit', 'okx', 'bitget'];

export function useFundingSync() {
  const { fundingPollingInterval, fundingHistoryInterval, useMockData } = useSettingsStore();
  const setLastSyncTime = useSettingsStore(state => state.setLastSyncTime);
  const { isSyncing, setSyncStatus, lastHistoryFetch, setLastHistoryFetch } = useFundingStore();
  
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncInProgressRef = useRef(false);

  // Poll current rates (fast, single endpoint per exchange usually)
  const fetchCurrentRates = useCallback(async () => {
    if (useMockData) return;
    try {
      const results: CurrentFundingRate[] = [];
      for (const ex of EXCHANGES) {
        const rates = await FundingService.fetchCurrentFundingRates(ex);
        results.push(...rates);
      }
      
      // Store current rates in a global cache or React state? 
      // The current rates change often. Let's dispatch an event so UI can listen to it,
      // or we can store it in localStorage or Zustand.
      // We will create a Zustand store for the current rates to trigger UI updates.
      useFundingStore.setState({ currentRates: results });
    } catch (e) {
      LogManager.error('useFundingSync', 'Failed to fetch current rates:', e);
    }
  }, [useMockData]);

  // Sync historical rates slowly
  const syncHistoricalRates = useCallback(async (currentRates: CurrentFundingRate[]) => {
    if (useMockData || syncInProgressRef.current) return;
    
    // Check if we need to sync based on history interval
    const now = Date.now();
    const intervalMs = fundingHistoryInterval * 60 * 60 * 1000;
    
    if (now - lastHistoryFetch < intervalMs) {
      return; // Not time yet
    }
    
    syncInProgressRef.current = true;
    let successCount = 0;
    
    try {
      const totalSymbols = currentRates.length;
      if (totalSymbols === 0) {
        syncInProgressRef.current = false;
        return;
      }

      setSyncStatus(true, 0, 'Starting historical funding sync...');
      
      for (let i = 0; i < totalSymbols; i++) {
        const rate = currentRates[i];
        
        // Let's check meta to see if we need to fetch
        const meta = await getFundingMeta(rate.exchange, rate.symbol);
        // We fetch if it's new or if it's been more than fundingHistoryInterval since last fetch for this symbol.
        // But since we just check `lastHistoryFetch` globally, we just fetch for all sequentially.
        
        setSyncStatus(true, Math.round((i / totalSymbols) * 100), `Syncing ${rate.exchange.toUpperCase()} ${rate.symbol}...`);
        
        const history = await FundingService.fetchFundingHistory(rate.exchange, rate.symbol, rate.instrumentType, 100);
        
        if (history.length > 0) {
          await saveFundingFeesCache(history);
          
          const oldest = history[history.length - 1].timestamp;
          const newest = history[0].timestamp;
          
          await updateFundingMeta(
            rate.exchange,
            rate.symbol,
            meta ? Math.min(meta.oldestTimestamp, oldest) : oldest,
            meta ? Math.max(meta.latestTimestamp, newest) : newest
          );
        }
        
        successCount++;
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const completedAt = Date.now();
      setLastHistoryFetch(completedAt);
      setLastSyncTime(completedAt);
      setSyncStatus(false, 100, `Synced ${successCount} symbols.`);
      
    } catch (error: any) {
      LogManager.error('useFundingSync', 'Historical sync error:', error);
      setSyncStatus(false, 0, `Sync failed: ${error.message}`);
    } finally {
      syncInProgressRef.current = false;
      setTimeout(() => {
        if (!syncInProgressRef.current) {
          setSyncStatus(false, 0, '');
        }
      }, 3000);
    }
  }, [useMockData, fundingHistoryInterval, lastHistoryFetch, setLastHistoryFetch, setLastSyncTime, setSyncStatus]);

  // Main loop
  useEffect(() => {
    if (useMockData) return;
    
    // Initial fetch
    fetchCurrentRates().then(() => {
      const rates = useFundingStore.getState().currentRates;
      if (rates && rates.length > 0) {
         syncHistoricalRates(rates);
      }
    });
    
    // Polling setup
    const intervalMs = fundingPollingInterval * 60 * 1000;
    pollingTimerRef.current = setInterval(() => {
      fetchCurrentRates();
    }, intervalMs);
    
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [useMockData, fundingPollingInterval, fetchCurrentRates, syncHistoricalRates]);

  // Expose manual trigger
  const forceSync = async () => {
    if (syncInProgressRef.current) return;
    await fetchCurrentRates();
    const rates = useFundingStore.getState().currentRates;
    if (rates && rates.length > 0) {
      // Force bypass interval check
      setLastHistoryFetch(0);
      await syncHistoricalRates(rates);
    }
  };

  return { forceSync };
}
