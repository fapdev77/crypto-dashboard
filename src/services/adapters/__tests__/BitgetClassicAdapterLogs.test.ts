import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BitgetClassicAdapter } from '../BitgetClassicAdapter';
import { ApiCredentials } from '../../../store/apiKeysStore';
import * as proxyModule from '../../../utils/proxyFetch';
import { useLogStore } from '../../../store/logStore';

vi.mock('../../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
}));

const mockKey: ApiCredentials = {
  id: 'key-bitget-classic-log',
  label: 'Bitget Classic Test',
  exchange: 'bitget',
  apiKey: 'k',
  apiSecret: 's',
  passphrase: 'p',
  isActive: true,
};

const adapter = new BitgetClassicAdapter();

const getInfoLogs = () => useLogStore.getState().entries.filter(e => e.level === 'INFO');
const getWarnLogs = () => useLogStore.getState().entries.filter(e => e.level === 'WARN');

beforeEach(() => {
  vi.clearAllMocks();
  useLogStore.setState({ entries: [] });
});

// ─── getBalance ─────────────────────────────────────────────────────────────

describe('BitgetClassicAdapter.getBalance - logging', () => {
  it('emits an INFO log at the start of getBalance', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.getBalance(mockKey);

    const info = getInfoLogs().find(e => e.source === 'BitgetClassicAdapter.Balance');
    expect(info).toBeDefined();
    expect(info!.message).toContain('[Bitget Classic Test]');
    expect(info!.message).toContain('api.bitget.com');
  });

  it('emits a WARN log when an endpoint fails (non-critical path)', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('USDT-FUTURES')) throw new Error('Simulated failure');
      return { code: '00000', data: [] };
    });

    await adapter.getBalance(mockKey);

    const warn = getWarnLogs().find(e => e.source === 'BitgetClassicAdapter');
    expect(warn).toBeDefined();
  });
});

// ─── getOpenPositions ────────────────────────────────────────────────────────

describe('BitgetClassicAdapter.getOpenPositions - logging', () => {
  it('emits an INFO log at the start of getOpenPositions', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.getOpenPositions(mockKey);

    const info = getInfoLogs().find(e => e.source === 'BitgetClassicAdapter.Positions');
    expect(info).toBeDefined();
    expect(info!.message).toContain('[Bitget Classic Test]');
    expect(info!.message).toContain('USDT/COIN/USDC-FUTURES');
  });

  it('emits a WARN log on per-productType error and returns remaining results', async () => {
    let callCount = 0;
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async () => {
      callCount++;
      // First productType (USDT-FUTURES) returns an error code
      if (callCount === 1) return { code: 'ERR', msg: 'Simulated error' };
      return { code: '00000', data: [] };
    });

    // Should NOT throw — per-type errors are caught with warn + return []
    const result = await adapter.getOpenPositions(mockKey);
    expect(Array.isArray(result)).toBe(true);

    const warn = getWarnLogs().find(e => e.source === 'BitgetClassicAdapter.Positions');
    expect(warn).toBeDefined();
    expect(warn!.message).toContain('USDT-FUTURES');
  });

  it('returns positions from successful categories even when one category fails', async () => {
    let callCount = 0;
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network error on USDT-FUTURES');
      // COIN-FUTURES succeeds with one position
      return {
        code: '00000',
        data: [{
          symbol: 'ETHUSD_CM',
          total: '10',
          holdSide: 'long',
          marginMode: 'crossed',
          markPrice: '3000',
          openPriceAvg: '2900',
          marginSize: '100',
          leverage: '10',
          productType: 'COIN-FUTURES',
        }],
      };
    });

    const result = await adapter.getOpenPositions(mockKey);
    // At least one position from COIN-FUTURES should be returned
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── fetchAndNormalize ───────────────────────────────────────────────────────

describe('BitgetClassicAdapter.fetchAndNormalize - logging', () => {
  it('emits an INFO log at the start of fetchAndNormalize', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: { entList: [], endId: '' } });

    await adapter.fetchAndNormalize(mockKey);

    const hist = getInfoLogs().find(e => e.source === 'BitgetClassicAdapter.History');
    expect(hist).toBeDefined();
    expect(hist!.message).toContain('[Bitget Classic Test]');
  });
});

// ─── fetchBills ──────────────────────────────────────────────────────────────

describe('BitgetClassicAdapter.fetchBills - logging', () => {
  it('emits an INFO log at the start of fetchBills', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.fetchBills(mockKey);

    const bills = getInfoLogs().find(e => e.source === 'BitgetClassicAdapter.Bills');
    expect(bills).toBeDefined();
    expect(bills!.message).toContain('[Bitget Classic Test]');
  });
});

// ─── getOpenOrders ───────────────────────────────────────────────────────────

describe('BitgetClassicAdapter.getOpenOrders - logging', () => {
  it('emits an INFO log at the start of getOpenOrders', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: { entrustedList: [] } });

    await adapter.getOpenOrders(mockKey);

    const orders = getInfoLogs().find(e => e.source === 'BitgetClassicAdapter.OpenOrders');
    expect(orders).toBeDefined();
    expect(orders!.message).toContain('[Bitget Classic Test]');
  });

  it('emits a WARN log on per-productType network error without aborting', async () => {
    let callCount = 0;
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Timeout');
      return { code: '00000', data: { entrustedList: [] } };
    });

    const result = await adapter.getOpenOrders(mockKey);
    expect(Array.isArray(result)).toBe(true);

    const warn = getWarnLogs().find(e => e.source === 'BitgetClassicAdapter.OpenOrders');
    expect(warn).toBeDefined();
  });
});

// ─── getHistoryOrders ────────────────────────────────────────────────────────

describe('BitgetClassicAdapter.getHistoryOrders - logging', () => {
  it('emits an INFO log at the start of getHistoryOrders', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.getHistoryOrders(mockKey);

    const hist = getInfoLogs().find(e => e.source === 'BitgetClassicAdapter.HistoryOrders');
    expect(hist).toBeDefined();
    expect(hist!.message).toContain('[Bitget Classic Test]');
  });
});
