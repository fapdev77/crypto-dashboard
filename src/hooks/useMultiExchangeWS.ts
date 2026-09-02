/**
 * Core connection management hook.
 *
 * Manages REST polling connections for all active API keys by:
 * - Bootstrapping initial data (balances, positions, open orders) via REST
 * - Polling for updates on a configurable interval (default 5s)
 * - Handling connection lifecycle (connect, disconnect, retry on error)
 * - Coordinating data across stores (connection, balances, positions, orders)
 *
 * Mock data injection is handled by the separate useMockDataInjector hook.
 */
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { useConnectionStore } from '../store/connectionStore';
import { useBalancesStore } from '../store/balancesStore';
import { usePositionsStore } from '../store/positionsStore';
import { clearConnectionData } from '../store/crossStoreCleanup';
import { useSettingsStore } from '../store/settingsStore';
import { useOrdersStore } from '../store/ordersStore';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';
import { LogManager } from '../services/LogManager';
import { useMockDataInjector } from './useMockDataInjector';

/** How long to wait before retrying a failed bootload (ms). */
const RETRY_DELAY_MS = 5000;

/**
 * Fetch live balances, positions, and open orders for a single connection
 * and push them into the respective Zustand stores.
 */
async function syncRestData(config: ApiCredentials): Promise<void> {
  try {
    const adapter = ExchangeAggregator.getAdapter(config);
    const balancePromise = adapter.getBalance ? adapter.getBalance(config) : Promise.resolve([]);
    const positionsPromise = adapter.getOpenPositions ? adapter.getOpenPositions(config) : Promise.resolve([]);
    const openOrdersPromise = adapter.getOpenOrders ? adapter.getOpenOrders(config) : Promise.resolve([]);
    const [balanceResult, positionsResult, ordersResult] = await Promise.allSettled([
      balancePromise,
      positionsPromise,
      openOrdersPromise,
    ]);

    if (balanceResult.status === 'fulfilled') {
      useBalancesStore.getState().updateBalances(config.id, balanceResult.value as any);
    } else {
      LogManager.warn(`REST-${config.id}`, `Failed to fetch balances for ${config.exchange}:`, balanceResult.reason);
    }

    if (positionsResult.status === 'fulfilled') {
      usePositionsStore.getState().updatePositions(config.id, positionsResult.value);
    } else {
      LogManager.warn(`REST-${config.id}`, `Failed to fetch open positions for ${config.exchange}:`, positionsResult.reason);
    }

    if (ordersResult.status === 'fulfilled') {
      useOrdersStore.getState().updateOpenOrders(config.id, ordersResult.value);
    } else {
      LogManager.warn(`REST-${config.id}`, `Failed to fetch open orders for ${config.exchange}:`, ordersResult.reason);
    }
  } catch (err) {
    LogManager.error(`REST-${config.id}`, `${config.exchange} REST polling failed:`, err);
  }
}

/**
 * Tear down a connection: clear poll timer, remove orders, balances, positions & connection state.
 */
function disconnect(
  id: string,
  intervals: Record<string, NodeJS.Timeout | null>,
  setStatus: ReturnType<typeof useConnectionStore.getState>['setConnectionStatus'],
  setError: ReturnType<typeof useConnectionStore.getState>['setConnectionError'],
): void {
  const pollTimer = intervals[id + '-poll'];
  if (pollTimer) {
    clearTimeout(pollTimer);
    delete intervals[id + '-poll'];
  }
  clearConnectionData(id);
  useOrdersStore.getState().clearConnectionOrders(id);
  setStatus(id, 'disconnected', null);
  setError(id, null);
}

/**
 * Start a polling loop for a single connection.
 * Each cycle fetches fresh data then schedules the next tick.
 */
function startRestPolling(
  config: ApiCredentials,
  intervals: Record<string, NodeJS.Timeout | null>,
): void {
  const { id } = config;

  const poll = async () => {
    if (intervals[id + '-poll'] === null) return; // disconnected while waiting

    const isMockEnabled = useSettingsStore.getState().useMockData;
    const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
    if (isMockEnabled || !currentConfig?.isActive) return;

    await syncRestData(config);

    const intervalMs = useSettingsStore.getState().pollingInterval * 1000;
    if (intervals[id + '-poll'] !== null) {
      intervals[id + '-poll'] = setTimeout(poll, intervalMs);
    }
  };

  const intervalMs = useSettingsStore.getState().pollingInterval * 1000;
  intervals[id + '-poll'] = setTimeout(poll, intervalMs);
}

/**
 * Bootload a single connection: set status, fetch data, show toast, start polling.
 * On failure, schedule a retry.
 */
async function bootload(
  config: ApiCredentials,
  intervals: Record<string, NodeJS.Timeout | null>,
  setStatus: ReturnType<typeof useConnectionStore.getState>['setConnectionStatus'],
  setError: ReturnType<typeof useConnectionStore.getState>['setConnectionError'],
): Promise<void> {
  const { id, label, exchange } = config;

  try {
    LogManager.info(`REST-${id}`, 'Bootloading initial balances, positions and open orders...');
    await ExchangeAggregator.bootloadConnection(config);
    await syncRestData(config);
    LogManager.info(`REST-${id}`, 'REST Bootload completed.');

    setStatus(id, 'connected', null);
    toast.success(`${exchange.toUpperCase()} - ${label} connected!`, { id: `success-${id}` });

    // Clear the dummy timeout and start real polling
    const existing = intervals[id + '-poll'];
    if (existing) clearTimeout(existing);
    startRestPolling(config, intervals);
  } catch (error: any) {
    LogManager.error(`REST-${id}`, 'REST Bootload failed:', error);
    setStatus(id, 'error', `REST Bootload Error: ${error.message}`);
    setError(id, `REST Bootload Error: ${error.message}`);
    toast.error(`${exchange.toUpperCase()} initial sync failed: ${error.message}`, { id: `rest-err-${id}` });

    // Schedule retry
    const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
    if (currentConfig?.isActive && !useSettingsStore.getState().useMockData) {
      LogManager.info(`REST-${id}`, `Retrying connection in ${RETRY_DELAY_MS / 1000}s...`);
      intervals[id + '-poll'] = setTimeout(() => {
        bootload(config, intervals, setStatus, setError);
      }, RETRY_DELAY_MS);
    }
  }
}

/**
 * Main hook — orchestrates REST polling for all active API keys.
 * Delegates mock-data injection to useMockDataInjector.
 */
export function useMultiExchangeWS() {
  const keys = useApiKeysStore((state) => state.keys);
  const useMockData = useSettingsStore((state) => state.useMockData);
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus);
  const setConnectionError = useConnectionStore((state) => state.setConnectionError);

  const intervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});

  // Inject mock data when Simulation Mode is active
  useMockDataInjector();

  // Real connection lifecycle
  useEffect(() => {
    // Skip if mock data is active — useMockDataInjector handles this
    if (useMockData) return;

    const activeKeys = keys.filter((k) => k.isActive);
    const intervals = intervalsRef.current;

    // Clean up stale mock data
    const activeIds = new Set(activeKeys.map((k) => k.id));

    // Connect new keys
    activeKeys.forEach((config) => {
      if (!intervals[config.id + '-poll']) {
        bootload(config, intervals, setConnectionStatus, setConnectionError);
      }
    });

    // Disconnect keys that are no longer active
    Object.keys(intervals).forEach((key) => {
      const realId = key.replace('-poll', '');
      if (!activeIds.has(realId)) {
        disconnect(realId, intervals, setConnectionStatus, setConnectionError);
      }
    });

    // Clean up orphaned data in stores (e.g. from previously removed keys)
    const existingBalanceConnIds = new Set(
      Object.values(useBalancesStore.getState().balances).map((b) => b.connectionId),
    );
    const existingPositionConnIds = new Set(
      Object.values(usePositionsStore.getState().positions).map((p) => p.connectionId),
    );
    const allExisting = new Set([...existingBalanceConnIds, ...existingPositionConnIds]);
    allExisting.forEach((cid) => {
      if (cid.startsWith('mocked-data') || activeIds.has(cid)) return;
      clearConnectionData(cid);
      useOrdersStore.getState().clearConnectionOrders(cid);
    });
  }, [keys, useMockData, setConnectionStatus, setConnectionError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const intervals = intervalsRef.current;
      Object.keys(intervals).forEach((key) => {
        const realId = key.replace('-poll', '');
        disconnect(realId, intervals, setConnectionStatus, setConnectionError);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
