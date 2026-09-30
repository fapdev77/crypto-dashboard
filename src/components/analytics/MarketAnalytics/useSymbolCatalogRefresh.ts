import { useEffect } from 'react';
import { useSettingsStore } from '../../../store/settingsStore';
import { exchangeCoinCatalog } from '../../../services/marketAnalytics/exchangeCoinCatalog';

/** Re-checks cadence while the tab is hidden without spinning the timer. */
const HIDDEN_RETRY_MS = 60_000;

/**
 * Keeps the Market Analytics symbol registry fresh while the component is mounted.
 *
 * - Refreshes immediately when the cached registry is older than the configured interval.
 * - Otherwise schedules the next refresh exactly at `lastFetch + interval`.
 * - While the tab is hidden it defers (re-checks every minute) to avoid background churn.
 * - Re-arms whenever the user changes `symbolCatalogRefreshHours` in Settings.
 */
export function useSymbolCatalogRefresh(): void {
  const refreshHours = useSettingsStore((state) => state.symbolCatalogRefreshHours);
  const useMockData = useSettingsStore((state) => state.useMockData);

  useEffect(() => {
    // Simulation mode promises no external calls — fall back to the static seed catalog instead.
    if (useMockData) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const intervalMs = Math.max(1, refreshHours) * 60 * 60 * 1000;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        timer = setTimeout(tick, HIDDEN_RETRY_MS);
        return;
      }
      await exchangeCoinCatalog.refresh();
      if (!cancelled) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    if (exchangeCoinCatalog.isStale(refreshHours)) {
      void tick();
    } else {
      const updatedAt = exchangeCoinCatalog.getRegistryUpdatedAt() ?? Date.now();
      const delay = Math.max(0, updatedAt + intervalMs - Date.now());
      timer = setTimeout(tick, delay);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshHours, useMockData]);
}
