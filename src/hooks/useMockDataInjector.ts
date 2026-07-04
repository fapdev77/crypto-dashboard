/**
 * Hook that injects mock data into stores when Simulation Mode is active.
 *
 * Separated from useMultiExchangeWS to keep connection management
 * focused on real API connections only (SRP).
 */
import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useBalancesStore } from '../store/balancesStore';
import { usePositionsStore } from '../store/positionsStore';
import { useOrdersStore } from '../store/ordersStore';
import { clearConnectionData } from '../store/crossStoreCleanup';
import { useConnectionStore } from '../store/connectionStore';
import mockAccountsData from '../mock/accounts.json';
import mockBalancesData from '../mock/balances.json';
import mockPositionsData from '../mock/positions.json';
import mockOrdersData from '../mock/orders.json';

export function useMockDataInjector() {
  const useMockData = useSettingsStore((state) => state.useMockData);
  const keys = useApiKeysStore((state) => state.keys);
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus);

  useEffect(() => {
    // When switching FROM mock mode (useMockData went from true to false),
    // clean up all mock data connections to prevent mock data persisting
    // alongside real data in the stores.
    if (!useMockData) {
      mockAccountsData.forEach((acc: any) => {
        clearConnectionData(acc.connectionId);
        useOrdersStore.getState().clearConnectionOrders(acc.connectionId);
      });
      return;
    }

    // Clean any existing real connections first
    keys.forEach(k => {
      setConnectionStatus(k.id, 'disconnected', null);
      clearConnectionData(k.id);
      useOrdersStore.getState().clearConnectionOrders(k.id);
    });

    // Inject mock data
    const balState = useBalancesStore.getState();
    const posState = usePositionsStore.getState();
    mockAccountsData.forEach((acc: any) => {
      const { connectionId } = acc;
      const accountBalances = mockBalancesData.filter((b: any) => b.connectionId === connectionId);
      balState.updateBalances(connectionId, accountBalances as any);
      const accountPositions = mockPositionsData.filter((pos: any) => pos.connectionId === connectionId);
      posState.updatePositions(connectionId, accountPositions as any);
      const openOrders = mockOrdersData.filter(
        (o: any) => o.connectionId === connectionId && ['NEW', 'PARTIALLY_FILLED'].includes(o.status)
      );
      useOrdersStore.getState().updateOpenOrders(connectionId, openOrders as any);
    });
  }, [useMockData, keys, setConnectionStatus]);
}
