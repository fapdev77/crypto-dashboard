import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOrdersStore } from '../store/ordersStore';
import mockAccountsData from '../mock/accounts.json';
import mockBalancesData from '../mock/balances.json';
import mockPositionsData from '../mock/positions.json';
import mockOrdersData from '../mock/orders.json';
import { ExchangeAggregator } from '../services/adapters/ExchangeAggregator';

export function useMultiExchangeWS() {
  const keys = useApiKeysStore((state) => state.keys);
  const useMockData = useSettingsStore((state) => state.useMockData);
  const setConnectionStatus = useDashboardStore((state) => state.setConnectionStatus);
  const setConnectionError = useDashboardStore((state) => state.setConnectionError);

  const intervalsRef = useRef<Record<string, NodeJS.Timeout | null>>({});

  useEffect(() => {
    if (useMockData) {
      Object.keys(intervalsRef.current).forEach(id => disconnect(id));
      keys.forEach(k => {
        useDashboardStore.getState().clearConnectionData(k.id);
        useOrdersStore.getState().clearConnectionOrders(k.id);
      });

      const currentState = useDashboardStore.getState();
      mockAccountsData.forEach((acc: any) => {
        const { connectionId } = acc;
        const accountBalances = mockBalancesData.filter((b: any) => b.connectionId === connectionId);
        currentState.updateBalances(connectionId, accountBalances as any);
        const accountPositions = mockPositionsData.filter((pos: any) => pos.connectionId === connectionId);
        currentState.updatePositions(connectionId, accountPositions as any);
        
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
      const currentState = useDashboardStore.getState();
      keys.forEach(k => {
        currentState.clearConnectionData(k.id);
        useOrdersStore.getState().clearConnectionOrders(k.id);
      });
      mockAccountsData.forEach((acc: any) => {
        currentState.clearConnectionData(acc.connectionId);
      });
      return;
    }

    const activeIds = new Set<string>();
    const currentState = useDashboardStore.getState();
    mockAccountsData.forEach((acc: any) => {
      currentState.clearConnectionData(acc.connectionId);
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

    const existingConnectionIds = new Set([
      ...Object.values(currentState.balances).map(b => b.connectionId),
      ...Object.values(currentState.positions).map(p => p.connectionId)
    ]);

    existingConnectionIds.forEach(id => {
      if (!id.startsWith('mocked-data') && !activeIds.has(id)) {
        currentState.clearConnectionData(id);
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
      const dashState = useDashboardStore.getState();
      dashState.updateBalances(config.id, balances as any);
      dashState.updatePositions(config.id, positions);
      useOrdersStore.getState().updateOpenOrders(config.id, openOrders);
    } catch (err) {
      console.error(`[REST-${config.id}] ${config.exchange} REST polling failed:`, err);
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
    const { id, exchange } = config;

    setConnectionStatus(id, 'connecting', null);
    setConnectionError(id, null);
    
    // Set a dummy timeout to indicate it's active initially until the poll starts
    intervalsRef.current[id + '-poll'] = setTimeout(() => {}, 100000);

    // REST Bootloader
    (async () => {
      try {
        console.log(`[REST-${id}] Bootloading initial balances, positions and open orders...`);
        await ExchangeAggregator.bootloadConnection(config);
        // Fetch open orders as part of the initial bootload
        await syncRestData(config);
        console.log(`[REST-${id}] REST Bootload completed.`);

        setConnectionStatus(id, 'connected', null);
        toast.success(`${exchange.toUpperCase()} connected via REST.`, { id: `success-${id}` });

        if (intervalsRef.current[id + '-poll']) {
          clearTimeout(intervalsRef.current[id + '-poll'] as NodeJS.Timeout);
        }
        startRestPolling(config);
      } catch (error: any) {
        console.error(`[REST-${id}] REST Bootload failed:`, error);
        setConnectionStatus(id, 'error', `REST Bootload Error: ${error.message}`);
        setConnectionError(id, `REST Bootload Error: ${error.message}`);
        toast.error(`${exchange.toUpperCase()} initial sync failed: ${error.message}`, { id: `rest-err-${id}` });
        
        // Retry logic for bootload on error
        const currentConfig = useApiKeysStore.getState().keys.find((k) => k.id === id);
        if (currentConfig && currentConfig.isActive && !useSettingsStore.getState().useMockData) {
           console.log(`[REST-${id}] Retrying connection in 5 seconds...`);
           intervalsRef.current[id + '-poll'] = setTimeout(() => {
              connect(currentConfig);
           }, 5000);
        }
      }
    })();
  };
}

