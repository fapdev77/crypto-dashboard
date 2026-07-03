import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { useConnectionStore } from '../store/connectionStore';
import { useBalancesStore } from '../store/balancesStore';
import { usePositionsStore } from '../store/positionsStore';
import { clearConnectionData } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOrdersStore } from '../store/ordersStore';
import mockAccountsData from '../mock/accounts.json';
import mockBalancesData from '../mock/balances.json';
import mockPositionsData from '../mock/positions.json';
import mockOrdersData from '../mock/orders.json';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';
import { LogManager } from '../services/LogManager';

/**
 * Core data-fetching hook. Manages REST polling connections for all active API keys.
 *
 * - Bootstraps initial data (balances, positions, open orders) via REST
 * - Polls for updates on a configurable interval (default 5s)
 * - Uses mock data when Simulation Mode is active
 * - Handles connection lifecycle (connect, disconnect, retry on error)
 * - Coordinates data across connectionStore, balancesStore, positionsStore, and ordersStore
 */
export function useMultiExchangeWS() {
  const keys = useApiKeysStore((state) => state.keys);
  const useMockData = useSettingsStore((state) => state.useMockData);
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus);
  const setConnectionError = useConnectionStore((state) => state.setConnectionError);

  const intervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});

  useEffect(() => {
    if (useMockData) {
      Object.keys(intervalsRef.current).forEach(id => disconnect(id));
      keys.forEach(k => {
        clearConnectionData(k.id);
        useOrdersStore.getState().clearConnectionOrders(k.id);
      });

      const balState = useBalancesStore.getState();
      const posState = usePositionsStore.getState();
      mockAccountsData.forEach((acc: any) => {
        const { connectionId } = acc;
        const accountBalances = mockBalancesData.filter((b: any) => b.connectionId === connectionId);
        balState.updateBalances(connectionId, accountBalances as any);
        const accountPositions = mockPositionsData.filter((pos: any) => pos.connectionId === connectionId);
        posState.updatePositions(connectionId, accountPositions as any);

        const openOrders = mockOrdersData.filter((o: any) => o.connectionId === connectionId && ['NEW', 'PARTIALLY_FILLED'].includes(o.status));
        useOrdersStore.getState().updateOpenOrders(connectionId, openOrders as any);
      });
      return;
    }

    const activeKeys = keys.filter(k => k.isActive);
    if (activeKeys.length === 0) {
      Object.keys(intervalsRef.current).forEach(id => {
        const realId = id.replace('-poll', '');
        disconnect(realId);
      });
      keys.forEach(k => {
        clearConnectionData(k.id);
        useOrdersStore.getState().clearConnectionOrders(k.id);
      });
      mockAccountsData.forEach((acc: any) => {
        clearConnectionData(acc.connectionId);
      });
      return;
    }

    const activeIds = new Set<string>();
    mockAccountsData.forEach((acc: any) => {
      clearConnectionData(acc.connectionId);
    });

    activeKeys.forEach((config) => {
      activeIds.add(config.id);
      if (!intervalsRef.current[config.id + '-poll']) {
        connect(config);
      }
    });

    Object.keys(intervalsRef.current).forEach((id) => {
      const realId = id.replace('-poll', '');
      if (!activeIds.has(realId)) {
        disconnect(realId);
      }
    });

    const existingBalances = Object.values(useBalancesStore.getState().balances);
    const existingPositions = Object.values(usePositionsStore.getState().positions);
    const existingConnectionIds = new Set([
      ...existingBalances.map(b => b.connectionId),
      ...existingPositions.map(p => p.connectionId)
    ]);

    existingConnectionIds.forEach(id => {
      if (!id.startsWith('mocked-data') && !activeIds.has(id)) {
        clearConnectionData(id);
      }
    });
  }, [keys, useMockData]);

  useEffect(() => {
    return () => {
      Object.keys(intervalsRef.current).forEach((id) => {
        const realId = id.replace('-poll', '');
        disconnect(realId);
      });
    };
  }, []);

  const disconnect = (id: string) => {
    const pollTimer = intervalsRef.current[id + '-poll'];
    if (pollTimer) {
      clearTimeout(pollTimer);
      delete intervalsRef.current[id + '-poll'];
    }

    useOrdersStore.getState().clearConnectionOrders(id);
    setConnectionStatus(id, 'disconnected', null);
    setConnectionError(id, null);
  };

  const syncRestData = async (config: ApiCredentials) => {
    try {
      const adapter = ExchangeAggregator.getAdapter(config.exchange);
      const openOrdersPromise = adapter.getOpenOrders ? adapter.getOpenOrders(config) : Promise.resolve([]);
      const [balances, positions, openOrders] = await Promise.all([
        adapter.getBalance(config),
        adapter.getOpenPositions(config),
        openOrdersPromise
      ]);
      useBalancesStore.getState().updateBalances(config.id, balances as any);
      usePositionsStore.getState().updatePositions(config.id, positions);
      useOrdersStore.getState().updateOpenOrders(config.id, openOrders);
    } catch (err) {
      LogManager.error(`REST-${config.id}`, `${config.exchange} REST polling failed:`, err);
    }
  };

  const startRestPolling = (config: ApiCredentials) => {
    const { id } = config;
    const poll = async () => {
      if (intervalsRef.current[id + '-poll'] === null) return; // Prevent execution if disconnected

      const isMockEnabled = useSettingsStore.getState().useMockData;
      const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);

      if (isMockEnabled || !currentConfig || !currentConfig.isActive) {
        return;
      }

      await syncRestData(config);

      const intervalMs = useSettingsStore.getState().pollingInterval * 1000;
      if (intervalsRef.current[id + '-poll'] !== null) {
        intervalsRef.current[id + '-poll'] = setTimeout(poll, intervalMs);
      }
    };

    // First cycle
    const intervalMs = useSettingsStore.getState().pollingInterval * 1000;
    intervalsRef.current[id + '-poll'] = setTimeout(poll, intervalMs);
  };

  const connect = (config: ApiCredentials) => {
    const { id, label, exchange } = config;

    setConnectionStatus(id, 'connecting', null);
    setConnectionError(id, null);

    // Set a dummy timeout to indicate it's active initially until the poll starts
    intervalsRef.current[id + '-poll'] = setTimeout(() => { }, 100000);

    // REST Bootloader
    (async () => {
      try {
        LogManager.info(`REST-${id}`, 'Bootloading initial balances, positions and open orders...');
        await ExchangeAggregator.bootloadConnection(config);
        // Fetch open orders as part of the initial bootload
        await syncRestData(config);
        LogManager.info(`REST-${id}`, 'REST Bootload completed.');

        setConnectionStatus(id, 'connected', null);
        toast.success(`${exchange.toUpperCase()} - ${label} connected!`, { id: `success-${id}` });

        if (intervalsRef.current[id + '-poll']) {
          clearTimeout(intervalsRef.current[id + '-poll'] as NodeJS.Timeout);
        }
        startRestPolling(config);
      } catch (error: any) {
        LogManager.error(`REST-${id}`, 'REST Bootload failed:', error);
        setConnectionStatus(id, 'error', `REST Bootload Error: ${error.message}`);
        setConnectionError(id, `REST Bootload Error: ${error.message}`);
        toast.error(`${exchange.toUpperCase()} initial sync failed: ${error.message}`, { id: `rest-err-${id}` });

        // Retry logic for bootload on error
        const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
        if (currentConfig && currentConfig.isActive && !useSettingsStore.getState().useMockData) {
          LogManager.info(`REST-${id}`, 'Retrying connection in 5 seconds...');
          intervalsRef.current[id + '-poll'] = setTimeout(() => {
            connect(currentConfig);
          }, 5000);
        }
      }
    })();
  };
}

