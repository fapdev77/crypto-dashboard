import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';
import { OrderHistoryService } from '../services/orders/OrderHistoryService';

export function useHistoryCachePolling() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval, bumpHistoryCacheVersion, setLastSyncTime } = useSettingsStore();

  useEffect(() => {
    const activeKeys = keys.filter(k => k.isActive);
    if (useMockData || activeKeys.length === 0) return;

    const intervalMs = historyCacheInterval * 60 * 1000;

    const poll = async () => {
      console.log('[HistoryCachePolling] Executing background update...');
      const positionService = new PositionHistoryService();
      const orderService = new OrderHistoryService();
      try {
        const positionSyncs = activeKeys.map(apiKey => positionService.fetchWithCache(apiKey));
        const orderSyncs = activeKeys.map(apiKey => orderService.fetchWithCache(apiKey));
        
        await Promise.all([...positionSyncs, ...orderSyncs]);
        
        bumpHistoryCacheVersion();
        setLastSyncTime(Date.now());
        console.log('[HistoryCachePolling] Background update complete.');
      } catch (err) {
        console.error('[HistoryCachePolling] Error during background update:', err);
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
