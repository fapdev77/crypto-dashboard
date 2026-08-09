import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { OrderHistoryService } from '../services/orders/OrderHistoryService';
import { LogManager } from '../services/LogManager';

/** Module-level guard: shared across all hook instances */
const syncInProgressRef = { current: false };

/**
 * Background polling hook that periodically refreshes the history cache
 * (positions + orders) for all active API keys.
 *
 * Runs immediately on mount if the last sync is older than the configured interval,
 * then keeps repeating at the interval. Hooked into the app lifecycle via main.tsx.
 */
export function useHistoryCachePolling() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval, bumpHistoryCacheVersion, setLastSyncTime } = useSettingsStore();

  useEffect(() => {
    const activeKeys = keys.filter(k => k.isActive);
    if (useMockData || activeKeys.length === 0) return;

    const intervalMs = historyCacheInterval * 60 * 1000;

    const poll = async () => {
      if (syncInProgressRef.current) {
        LogManager.warn('HistoryCachePolling', 'Sync skipped — previous sync still in progress');
        return;
      }
      syncInProgressRef.current = true;

      const startMs = performance.now();
      LogManager.info('HistoryCachePolling', 'Executing background update...');
      const positionService = new PositionHistoryService();
      const orderService = new OrderHistoryService();
      try {
        const positionSyncs = activeKeys.map(apiKey => positionService.fetchWithCache(apiKey));
        const orderSyncs = activeKeys.map(apiKey => orderService.fetchWithCache(apiKey));
        
        await Promise.all([...positionSyncs, ...orderSyncs]);
        
        bumpHistoryCacheVersion();
        setLastSyncTime(Date.now());
        const elapsed = ((performance.now() - startMs) / 1000).toFixed(1);
        LogManager.info('HistoryCachePolling', `Background update complete — ${elapsed}s`);
      } catch (err) {
        LogManager.error('HistoryCachePolling', 'Error during background update:', err);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Run immediately on mount ONLY if the last sync was longer than the interval ago,
    // then keep refreshing on the configured interval.
    const lastSync = useSettingsStore.getState().lastSyncTime;
    const now = Date.now();
    if (now - lastSync >= intervalMs) {
      poll();
    }
    const intervalId = setInterval(poll, intervalMs);

    return () => clearInterval(intervalId);
  }, [keys, useMockData, historyCacheInterval]);
}
