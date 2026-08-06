import { useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncCoordinatorStore } from '../store/syncCoordinatorStore';
import { BybitTransactionService } from '../services/bybit/BybitTransactionService';
import { getBybitTxLogCache, getBybitTxLogMeta } from '../services/historyCache';
import { LogManager } from '../services/LogManager';

/**
 * Global background sync hook for Bybit transaction logs.
 * Mounted in WorkSpace.tsx alongside useHistoryCachePolling.
 *
 * Progressive sync behavior:
 * 1. On mount: starts deep sync if no prior sync exists
 * 2. Subsequent: incremental sync on the historyCacheInterval
 * 3. Reports progress via syncCoordinatorStore (isBybitTxSyncing, bybitTxProgress)
 */
export function useBybitTransactionSync() {
  const keys = useApiKeysStore(state => state.keys);
  const { useMockData, historyCacheInterval } = useSettingsStore();
  const {
    bybitTxLastSyncTime,
    setIsBybitTxSyncing,
    setBybitTxProgress,
    setBybitTxLastSyncTime,
    setBybitTxLatestTransactionTime,
    setBybitTxOldestTransactionTime,
    setBybitTxTotalRecords,
    setCachedTxLog,
  } = useSyncCoordinatorStore();

  useEffect(() => {
    const bybitKeys = keys.filter(k => k.exchange === 'bybit' && k.isActive);
    if (useMockData || bybitKeys.length === 0) return;

    const service = new BybitTransactionService();

    const initialSync = async () => {
      // Skip if synced recently (avoid re-sync on Fast Refresh / HMR)
      const now = Date.now();
      const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
      if (now - bybitTxLastSyncTime < intervalMs && bybitTxLastSyncTime > 0) return;

      setIsBybitTxSyncing(true);
      setBybitTxProgress({ pct: 0, records: 0 });

      try {
        const startTime = Date.now();
        let totalNewRecords = 0;
        let isIncremental = false;

        for (const key of bybitKeys) {
          // Check if cache already exists in IndexedDB
          // If yes: incremental sync from latest cached timestamp
          // If no: full progressive deep sync (backfill up to 2 years)
          const meta = await getBybitTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            isIncremental = true;
            const newRecords = await service.syncIncremental(key, meta.latestTransactionTime);
            totalNewRecords += newRecords.length;
          } else {
            const preMeta = await getBybitTxLogMeta(key.id);
            const preCount = preMeta?.totalRecords || 0;
            await service.syncAll(key, (pct, records) => {
              setBybitTxProgress({ pct, records });
            });
            const postMeta = await getBybitTxLogMeta(key.id);
            totalNewRecords += (postMeta?.totalRecords || 0) - preCount;
          }
        }
        const fetchEndTime = Date.now();

        // Reload full cache after sync
        const allEntries: any[] = [];
        for (const key of bybitKeys) {
          const cached = await getBybitTxLogCache(key.id);
          allEntries.push(...cached);
        }
        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
        setCachedTxLog(allEntries as any);

        const writeEndTime = Date.now();
        const fetchElapsed = fetchEndTime - startTime;
        const writeElapsed = writeEndTime - fetchEndTime;
        const totalSec = (writeEndTime - startTime) / 1000;

        // Update metadata
        const allTimes = allEntries.map((e: any) => e.transactionTime);
        if (allTimes.length > 0) {
          setBybitTxLatestTransactionTime(Math.max(...allTimes));
          setBybitTxOldestTransactionTime(Math.min(...allTimes));
        }
        setBybitTxTotalRecords(allEntries.length);
        setBybitTxLastSyncTime(now);

        LogManager.system(
          'BybitTxSync',
          `=== SYNC COMPLETE === ` +
          `Mode: ${isIncremental ? 'Incremental' : 'Deep'} | ` +
          `Fetch: ${(fetchElapsed / 1000).toFixed(1)}s | ` +
          `Write: ${(writeElapsed / 1000).toFixed(1)}s | ` +
          `Total: ${totalSec.toFixed(1)}s | ` +
          `${totalNewRecords} new records | ${allEntries.length} total records`
        );
      } catch (err) {
        LogManager.error('BybitTransactionSync', 'Deep sync error:', err);
      } finally {
        setIsBybitTxSyncing(false);
        setBybitTxProgress(null);
      }
    };

    // On mount: smart sync — incremental if cache exists, deep sync if not
    initialSync();

    // Periodic incremental sync
    const intervalMs = (historyCacheInterval || 5) * 60 * 1000;
    const intervalId = setInterval(async () => {
      const store = useSyncCoordinatorStore.getState();
      if (store.isBybitTxSyncing) return;

      setIsBybitTxSyncing(true);
      try {
        const startTime = Date.now();
        let totalNewRecords = 0;

        for (const key of bybitKeys) {
          const meta = await getBybitTxLogMeta(key.id);
          if (meta && meta.latestTransactionTime > 0) {
            const newRecords = await service.syncIncremental(key, meta.latestTransactionTime);
            totalNewRecords += newRecords.length;
          }
        }
        const fetchEndTime = Date.now();

        // Reload cache
        const allEntries: any[] = [];
        for (const key of bybitKeys) {
          const cached = await getBybitTxLogCache(key.id);
          allEntries.push(...cached);
        }
        allEntries.sort((a, b) => b.transactionTime - a.transactionTime);
        setCachedTxLog(allEntries as any);
        setBybitTxTotalRecords(allEntries.length);
        setBybitTxLastSyncTime(Date.now());

        const writeEndTime = Date.now();
        const fetchElapsed = fetchEndTime - startTime;
        const writeElapsed = writeEndTime - fetchEndTime;
        const totalSec = (writeEndTime - startTime) / 1000;

        LogManager.system(
          'BybitTxSync',
          `=== SYNC COMPLETE === ` +
          `Mode: Incremental (Interval) | ` +
          `Fetch: ${(fetchElapsed / 1000).toFixed(1)}s | ` +
          `Write: ${(writeElapsed / 1000).toFixed(1)}s | ` +
          `Total: ${totalSec.toFixed(1)}s | ` +
          `${totalNewRecords} new records | ${allEntries.length} total records`
        );
      } catch (err) {
        LogManager.error('BybitTransactionSync', 'Incremental sync error:', err);
      } finally {
        setIsBybitTxSyncing(false);
        setBybitTxProgress(null);
      }
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, useMockData, historyCacheInterval]);
}
