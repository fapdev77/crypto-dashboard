import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { OkxTransactionService } from '../services/okx/OkxTransactionService';
import { getOkxTxLogCache, getOkxTxLogMeta } from '../services/historyCache';
import { LogManager } from '../services/LogManager';

/**
 * Global background sync hook for OKX transaction logs.
 * Mounted in WorkSpace.tsx alongside useHistoryCachePolling.
 */
export function useOkxTransactionSync() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval } = useSettingsStore();
  const {
    okxTxLastSyncTime,
    setIsOkxTxSyncing,
    setOkxTxProgress,
    setOkxTxLastSyncTime,
    setOkxTxLatestTransactionTime,
    setOkxTxOldestTransactionTime,
    setOkxTxTotalRecords,
    setCachedOkxTxLog,
  } = useSyncCoordinatorStore();

  useEffect(() => {
    const okxKeys = keys.filter(k => k.exchange === 'okx' && k.isActive);
    if (useMockData || okxKeys.length === 0) return;

    const service = new OkxTransactionService();

    const initialSync = async () => {
      // Skip if synced recently (avoid re-sync on Fast Refresh / HMR)
      const now = Date.now();
      const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
      if (now - okxTxLastSyncTime < intervalMs && okxTxLastSyncTime > 0) return;

      setIsOkxTxSyncing(true);
      setOkxTxProgress({ pct: 0, records: 0 });

      try {
        const startTime = Date.now();
        let totalNewRecords = 0;
        let isIncremental = false;

        for (const key of okxKeys) {
          const meta = await getOkxTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            isIncremental = true;
            const newRecords = await service.syncIncremental(key, meta.latestTransactionTime);
            totalNewRecords += newRecords.length;
          } else {
            const preMeta = await getOkxTxLogMeta(key.id);
            const preCount = preMeta?.totalRecords || 0;
            await service.syncAll(key, (pct, records) => {
              setOkxTxProgress({ pct, records });
            });
            const postMeta = await getOkxTxLogMeta(key.id);
            totalNewRecords += (postMeta?.totalRecords || 0) - preCount;
          }
        }
        const fetchEndTime = Date.now();

        // Reload full cache after sync
        const allEntries: any[] = [];
        for (const key of okxKeys) {
          const cached = await getOkxTxLogCache(key.id);
          allEntries.push(...cached);
        }
        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
        setCachedOkxTxLog(allEntries as any);

        const writeEndTime = Date.now();
        const fetchElapsed = fetchEndTime - startTime;
        const writeElapsed = writeEndTime - fetchEndTime;
        const totalSec = (writeEndTime - startTime) / 1000;

        // Update metadata
        const allTimes = allEntries.map((e: any) => e.transactionTime);
        if (allTimes.length > 0) {
          setOkxTxLatestTransactionTime(Math.max(...allTimes));
          setOkxTxOldestTransactionTime(Math.min(...allTimes));
        }
        setOkxTxTotalRecords(allEntries.length);
        setOkxTxLastSyncTime(now);

        LogManager.system(
          'OkxTxSync',
          `=== SYNC COMPLETE === ` +
          `Mode: ${isIncremental ? 'Incremental' : 'Deep'} | ` +
          `Fetch: ${(fetchElapsed / 1000).toFixed(1)}s | ` +
          `Write: ${(writeElapsed / 1000).toFixed(1)}s | ` +
          `Total: ${totalSec.toFixed(1)}s | ` +
          `New: ${totalNewRecords} | ` +
          `Total Cached: ${allEntries.length} records`
        );
      } catch (err) {
        LogManager.error('OkxTxSync', 'Background sync failed:', err);
      } finally {
        setIsOkxTxSyncing(false);
      }
    };

    initialSync();

    const handleClearEvent = () => {
      initialSync();
    };
    window.addEventListener('transactions-cache-cleared', handleClearEvent);
    window.addEventListener('history-cache-cleared', handleClearEvent);

    const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
    const interval = setInterval(async () => {
      const activeOkxKeys = useApiKeysStore.getState().keys.filter(k => k.exchange === 'okx' && k.isActive);
      if (activeOkxKeys.length === 0) return;

      setIsOkxTxSyncing(true);
      try {
        let totalNewRecords = 0;
        for (const key of activeOkxKeys) {
          const meta = await getOkxTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const newRecords = await service.syncIncremental(key, meta.latestTransactionTime);
            totalNewRecords += newRecords.length;
          }
        }

        if (totalNewRecords > 0) {
          const allEntries: any[] = [];
          for (const key of activeOkxKeys) {
            const cached = await getOkxTxLogCache(key.id);
            allEntries.push(...cached);
          }
          allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
          setCachedOkxTxLog(allEntries as any);
          setOkxTxTotalRecords(allEntries.length);
        }
        setOkxTxLastSyncTime(Date.now());
      } catch (err) {
        LogManager.error('OkxTxSync', 'Periodic sync failed:', err);
      } finally {
        setIsOkxTxSyncing(false);
      }
    }, intervalMs);

    return () => {
      clearInterval(interval);
      window.removeEventListener('transactions-cache-cleared', handleClearEvent);
      window.removeEventListener('history-cache-cleared', handleClearEvent);
    };
  }, [keys, useMockData, historyCacheInterval]);
}
