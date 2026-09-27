import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOrderReports, OrderFilters } from '../useOrderReports';
import { useSyncCoordinatorStore } from '../../store/syncCoordinatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';

describe('useOrderReports ordersSyncError integration', () => {
  const defaultFilters: OrderFilters = {
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'CLOSED',
    timePeriod: 7 * 24 * 60 * 60 * 1000,
    accountId: 'All',
  };

  beforeEach(() => {
    useSyncCoordinatorStore.getState().setOrdersSyncError(null);
    useSyncCoordinatorStore.getState().setCachedClosedOrders([]);
    useSettingsStore.setState({ useMockData: false });
    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bybit',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
          label: 'Bybit 1',
          isActive: true,
        },
      ],
    });
  });

  it('initializes with ordersSyncError null when no error is present in syncCoordinatorStore', () => {
    const { result } = renderHook(() => useOrderReports(defaultFilters));

    expect(result.current.ordersSyncError).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes ordersSyncError when syncCoordinatorStore already has an error set', () => {
    useSyncCoordinatorStore.getState().setOrdersSyncError('Bybit order history rate limited');

    const { result } = renderHook(() => useOrderReports(defaultFilters));

    expect(result.current.ordersSyncError).toBe('Bybit order history rate limited');
    expect(result.current.error).toBe('Bybit order history rate limited');
  });

  it('dynamically updates ordersSyncError and error when syncCoordinatorStore changes', () => {
    const { result } = renderHook(() => useOrderReports(defaultFilters));

    expect(result.current.ordersSyncError).toBeNull();

    act(() => {
      useSyncCoordinatorStore.getState().setOrdersSyncError('Network timeout during order sync');
    });

    expect(result.current.ordersSyncError).toBe('Network timeout during order sync');
    expect(result.current.error).toBe('Network timeout during order sync');

    act(() => {
      useSyncCoordinatorStore.getState().setOrdersSyncError(null);
    });

    expect(result.current.ordersSyncError).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
