import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSymbolCatalogRefresh } from '../useSymbolCatalogRefresh';
import { useSettingsStore } from '../../../../store/settingsStore';

const mocks = vi.hoisted(() => ({
  refresh: vi.fn().mockResolvedValue(undefined),
  isStale: vi.fn(),
  getRegistryUpdatedAt: vi.fn(),
  getStaleExchanges: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../../services/marketAnalytics/exchangeCoinCatalog', () => ({
  exchangeCoinCatalog: {
    refresh: mocks.refresh,
    isStale: mocks.isStale,
    getRegistryUpdatedAt: mocks.getRegistryUpdatedAt,
    getStaleExchanges: mocks.getStaleExchanges,
  },
}));

describe('useSymbolCatalogRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refresh.mockResolvedValue(undefined);
    useSettingsStore.setState({ symbolCatalogRefreshHours: 1, useMockData: false });
  });

  it('refreshes immediately when the cached registry is stale', async () => {
    mocks.isStale.mockReturnValue(true);
    mocks.getRegistryUpdatedAt.mockReturnValue(null);

    renderHook(() => useSymbolCatalogRefresh());

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it('does not refresh on mount while the cache is still fresh', () => {
    mocks.isStale.mockReturnValue(false);
    mocks.getRegistryUpdatedAt.mockReturnValue(Date.now());

    renderHook(() => useSymbolCatalogRefresh());

    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('never fetches while simulation/mock mode is enabled', () => {
    useSettingsStore.setState({ useMockData: true });
    mocks.isStale.mockReturnValue(true);
    mocks.getRegistryUpdatedAt.mockReturnValue(null);

    renderHook(() => useSymbolCatalogRefresh());

    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
