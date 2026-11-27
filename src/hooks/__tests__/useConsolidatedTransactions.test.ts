import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useConsolidatedTransactions } from '../useConsolidatedTransactions';
import { useSyncCoordinatorStore } from '../../store/syncCoordinatorStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { proxyFetch, hybridFetch } from '../../utils/proxyFetch';
import { clearUsdPriceCache } from '../../services/pricing/usdPrice';
import { getBitgetTxLogCache } from '../../services/historyCache';
import type { BitgetTransactionLogEntry } from '../../types';

vi.mock('../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
  hybridFetch: vi.fn(),
}));

// The hook reloads entries from IndexedDB on mount; serve the fixture from there.
vi.mock('../../services/historyCache', () => ({
  getBybitTxLogCache: vi.fn(async () => []),
  getBitgetTxLogCache: vi.fn(async () => []),
  getOkxTxLogCache: vi.fn(async () => []),
}));

const mockedProxy = vi.mocked(proxyFetch);
const mockedHybrid = vi.mocked(hybridFetch);

const now = Date.now();

const bitgetBgbEntry: BitgetTransactionLogEntry = {
  id: `conn-1-bgb-${now}`,
  connectionId: 'conn-1',
  exchange: 'bitget',
  label: 'Bitget 1',
  rawId: 'raw-1',
  symbol: 'BGBUSDT',
  category: 'SPOT',
  side: 'Buy',
  transactionTime: now,
  type: 'TRANSFER_IN',
  currency: 'BGB',
  fee: '0',
  cashFlow: '100',
  change: '100',
  cashBalance: '100',
  balance: '100',
  raw: {},
};

describe('useConsolidatedTransactions USD pricing', () => {
  beforeEach(() => {
    clearUsdPriceCache();
    vi.clearAllMocks();

    useSettingsStore.setState({ useMockData: false });
    useApiKeysStore.setState({
      keys: [
        {
          id: 'conn-1',
          exchange: 'bitget',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
          label: 'Bitget 1',
          isActive: true,
        },
      ],
    });
    useSyncCoordinatorStore.setState({
      cachedTxLog: [],
      cachedBitgetTxLog: [bitgetBgbEntry],
      cachedOkxTxLog: [],
    });
    vi.mocked(getBitgetTxLogCache).mockResolvedValue([bitgetBgbEntry]);

    // OKX has no BGB pair (51001); Bitget's own spot ticker does.
    mockedProxy.mockImplementation(async (req: any) => {
      const url = String(req.targetUrl);
      if (url.includes('BGB-USDT')) return { code: '51001', data: [] };
      if (url.includes('bitget.com') && url.includes('BGBUSDT')) {
        return { code: '00000', data: [{ lastPrice: '0.55' }] };
      }
      return { code: '0', data: [] };
    });
    mockedHybrid.mockResolvedValue({ retCode: 0, result: { list: [] } });
  });

  it('prices a Bitget-only token through Bitget and stops reporting it as missing', async () => {
    const { result } = renderHook(() => useConsolidatedTransactions());

    // 100 BGB at 0.55 = 55 USD, included in the final balance.
    await waitFor(() => {
      expect(Number(result.current.stats.aggregatedUsd.finalBalance)).toBeCloseTo(55, 4);
    }, { timeout: 3000 });
    expect(result.current.stats.missingRates).toEqual([]);
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUrl: expect.stringContaining('symbol=BGBUSDT'),
      })
    );
  });
});
