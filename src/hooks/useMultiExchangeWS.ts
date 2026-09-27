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
import { isAuthError } from '../utils/retryHelper';

/** Initial delay before retrying a failed bootload due to transient issues (ms). */
export const BOOTLOAD_INITIAL_DELAY_MS = 5000;
/** Maximum backoff delay for bootload retries (ms). */
export const BOOTLOAD_MAX_DELAY_MS = 60000;
/** Maximum consecutive retry attempts before halting automatic retries. */
export const BOOTLOAD_MAX_RETRIES = 5;

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
  retryAttempts?: Record<string, number>,
): void {
  const pollTimer = intervals[id + '-poll'];
  if (pollTimer) {
    clearTimeout(pollTimer);
    delete intervals[id + '-poll'];
  }
  if (retryAttempts) {
    delete retryAttempts[id];
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
 * On transient failure, schedule an exponential backoff retry up to BOOTLOAD_MAX_RETRIES.
 * On authentication or credential failure, abort immediately to prevent hammering and IP bans.
 */
export async function bootload(
  config: ApiCredentials,
  intervals: Record<string, NodeJS.Timeout | null>,
  retryAttempts: Record<string, number>,
  setStatus: ReturnType<typeof useConnectionStore.getState>['setConnectionStatus'],
  setError: ReturnType<typeof useConnectionStore.getState>['setConnectionError'],
): Promise<void> {
  const { id, label, exchange } = config;

  try {
    LogManager.info(`REST-${id}`, 'Bootloading initial balances, positions and open orders...');
    await ExchangeAggregator.bootloadConnection(config);
    await syncRestData(config);
    LogManager.info(`REST-${id}`, 'REST Bootload completed.');

    // Reset attempt counter on success
    delete retryAttempts[id];

    setStatus(id, 'connected', null);
    toast.success(`${exchange.toUpperCase()} - ${label} connected!`, { id: `success-${id}` });

    // Clear the dummy timeout and start real polling
    const existing = intervals[id + '-poll'];
    if (existing) clearTimeout(existing);
    startRestPolling(config, intervals);
  } catch (error: any) {
    LogManager.error(`REST-${id}`, 'REST Bootload failed:', error);

    // Unrecoverable authentication or permission error: abort automatic retries immediately
    if (isAuthError(error)) {
      LogManager.error(
        `REST-${id}`,
        `Authentication failure for ${exchange.toUpperCase()} (${label}): ${error.message}. Automatic retries aborted to prevent IP ban.`
      );
      const errMsg = `Authentication Error: ${error.message}`;
      setStatus(id, 'error', errMsg);
      setError(id, errMsg);
      toast.error(
        `${exchange.toUpperCase()} (${label}) authentication failed: Check your API key and permissions.`,
        { id: `rest-err-${id}`, duration: 8000 }
      );
      delete retryAttempts[id];
      return;
    }

    const currentAttempt = (retryAttempts[id] || 0) + 1;
    retryAttempts[id] = currentAttempt;

    // Check if max retry threshold reached
    if (currentAttempt > BOOTLOAD_MAX_RETRIES) {
      LogManager.warn(
        `REST-${id}`,
        `Max bootload retries (${BOOTLOAD_MAX_RETRIES}) reached for ${exchange.toUpperCase()} (${label}). Halting automatic retries.`
      );
      const errMsg = `Connection failed after ${BOOTLOAD_MAX_RETRIES} attempts: ${error.message}`;
      setStatus(id, 'error', errMsg);
      setError(id, errMsg);
      toast.error(
        `${exchange.toUpperCase()} connection failed repeatedly. Automatic retries paused.`,
        { id: `rest-err-${id}`, duration: 6000 }
      );
      return;
    }

    setStatus(
      id,
      'error',
      `REST Bootload Error: ${error.message} (Retrying ${currentAttempt}/${BOOTLOAD_MAX_RETRIES})`
    );
    setError(id, `REST Bootload Error: ${error.message}`);
    toast.error(`${exchange.toUpperCase()} initial sync failed: ${error.message}`, { id: `rest-err-${id}` });

    // Exponential backoff: base * 2^(attempt - 1) + jitter, capped at BOOTLOAD_MAX_DELAY_MS
    const exponential = BOOTLOAD_INITIAL_DELAY_MS * Math.pow(2, currentAttempt - 1);
    const cappedDelay = Math.min(exponential, BOOTLOAD_MAX_DELAY_MS);
    const jitter = Math.floor(Math.random() * 800);
    const delayMs = cappedDelay + jitter;

    // Schedule retry if key remains active and simulation is off
    const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
    if (currentConfig?.isActive && !useSettingsStore.getState().useMockData) {
      LogManager.info(
        `REST-${id}`,
        `Transient failure (attempt ${currentAttempt}/${BOOTLOAD_MAX_RETRIES}). Retrying in ${(delayMs / 1000).toFixed(1)}s...`
      );
      intervals[id + '-poll'] = setTimeout(() => {
        bootload(config, intervals, retryAttempts, setStatus, setError);
      }, delayMs);
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
  const retryAttemptsRef = useRef<Record<string, number>>({});

  // Inject mock data when Simulation Mode is active
  useMockDataInjector();

  // Real connection lifecycle
  useEffect(() => {
    // Skip if mock data is active — useMockDataInjector handles this
    if (useMockData) return;

    const activeKeys = keys.filter((k) => k.isActive);
    const intervals = intervalsRef.current;
    const retryAttempts = retryAttemptsRef.current;

    // Clean up stale mock data
    const activeIds = new Set(activeKeys.map((k) => k.id));

    // Connect new keys
    activeKeys.forEach((config) => {
      if (!intervals[config.id + '-poll']) {
        bootload(config, intervals, retryAttempts, setConnectionStatus, setConnectionError);
      }
    });

    // Disconnect keys that are no longer active
    Object.keys(intervals).forEach((key) => {
      const realId = key.replace('-poll', '');
      if (!activeIds.has(realId)) {
        disconnect(realId, intervals, setConnectionStatus, setConnectionError, retryAttempts);
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
      const retryAttempts = retryAttemptsRef.current;
      Object.keys(intervals).forEach((key) => {
        const realId = key.replace('-poll', '');
        disconnect(realId, intervals, setConnectionStatus, setConnectionError, retryAttempts);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
