import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { PositionHistoryService } from '../services/positions/PositionHistoryService';

export function useHistoryCachePolling() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval, bumpHistoryCacheVersion } = useSettingsStore();

  useEffect(() => {
    if (useMockData || keys.length === 0) return;

    const intervalMs = historyCacheInterval * 60 * 1000;

    const poll = async () => {
      console.log('[HistoryCachePolling] Executing background update...');
      const service = new PositionHistoryService();
      try {
        await Promise.all(keys.map(apiKey => service.fetchWithCache(apiKey)));
        bumpHistoryCacheVersion();
        console.log('[HistoryCachePolling] Background update complete.');
      } catch (err) {
        console.error('[HistoryCachePolling] Error during background update:', err);
      }
    };

    // Run immediately on mount to pick up any trades closed since the last poll cycle,
    // then keep refreshing on the configured interval.
    poll();
    const intervalId = setInterval(poll, intervalMs);

    return () => clearInterval(intervalId);
  }, [keys, useMockData, historyCacheInterval]);
}
