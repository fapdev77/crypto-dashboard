import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';

export function useHistoryCachePolling() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval } = useSettingsStore();

  useEffect(() => {
    if (useMockData || keys.length === 0) return;

    const intervalMs = historyCacheInterval * 60 * 1000;

    const poll = async () => {
      console.log('[HistoryCachePolling] Executing background update...');
      const service = new PositionHistoryService();
      try {
        await Promise.all(keys.map(apiKey => service.fetchWithCache(apiKey)));
        console.log('[HistoryCachePolling] Background update complete.');
      } catch (err) {
        console.error('[HistoryCachePolling] Error during background update:', err);
      }
    };

    // Note: Do not run immediately, let on-demand trigger handles it, 
    // unless we haven't loaded yet. Since the user can visit closed positions immediately,
    // we just schedule the first run.
    const intervalId = setInterval(poll, intervalMs);

    return () => clearInterval(intervalId);
  }, [keys, useMockData, historyCacheInterval]);
}
