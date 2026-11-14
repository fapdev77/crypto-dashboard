import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BitgetUTAAdapter } from '../BitgetUTAAdapter';
import { ApiCredentials } from '../../../store/apiKeysStore';
import * as proxyModule from '../../../utils/proxyFetch';
import { useLogStore } from '../../../store/logStore';

vi.mock('../../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
}));

const mockKey: ApiCredentials = {
  id: 'key-bitget-uta-log',
  label: 'Bitget UTA Test',
  exchange: 'bitget',
  apiKey: 'k',
  apiSecret: 's',
  passphrase: 'p',
  isActive: true,
};

const adapter = new BitgetUTAAdapter();

const getInfoLogs = () => useLogStore.getState().entries.filter(e => e.level === 'INFO');
const getWarnLogs = () => useLogStore.getState().entries.filter(e => e.level === 'WARN');

beforeEach(() => {
  vi.clearAllMocks();
  useLogStore.setState({ entries: [] });
});

// ─── getBalance ─────────────────────────────────────────────────────────────

describe('BitgetUTAAdapter.getBalance - logging', () => {
  it('emits an INFO log at the start of getBalance', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({
      code: '00000',
      data: { assets: [], accountEquity: '0', usdtEquity: '0', unrealisedPnl: '0', mmr: '0', mgnRatio: '0' },
    });

    await adapter.getBalance(mockKey);

    const info = getInfoLogs().find(e => e.source === 'BitgetUTAAdapter.Balance');
    expect(info).toBeDefined();
    expect(info!.message).toContain('[Bitget UTA Test]');
    expect(info!.message).toContain('api.bitget.com');
    expect(info!.message).toContain('Unified + Funding');
  });

  it('emits a WARN log when unified assets endpoint fails (non-critical — partial data returned)', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('/api/v3/account/assets')) throw new Error('UTA assets error');
      return { code: '00000', data: [] };
    });

    await adapter.getBalance(mockKey);

    const warn = getWarnLogs().find(e => e.source === 'BitgetUTAAdapter');
    expect(warn).toBeDefined();
  });

  it('emits a WARN log when funding assets endpoint fails (non-critical)', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('/api/v3/account/assets') && !targetUrl.includes('funding')) {
        return { code: '00000', data: { assets: [], accountEquity: '0', usdtEquity: '0', unrealisedPnl: '0', mmr: '0', mgnRatio: '0' } };
      }
      if (targetUrl.includes('funding-assets')) throw new Error('Funding error');
      return { code: '00000', data: [] };
    });

    await adapter.getBalance(mockKey);

    const warn = getWarnLogs().find(e => e.source === 'BitgetUTAAdapter');
    expect(warn).toBeDefined();
  });
});

// ─── getOpenPositions ────────────────────────────────────────────────────────

describe('BitgetUTAAdapter.getOpenPositions - logging', () => {
  it('emits an INFO log at the start of getOpenPositions', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.getOpenPositions(mockKey);

    const info = getInfoLogs().find(e => e.source === 'BitgetUTAAdapter.Positions');
    expect(info).toBeDefined();
    expect(info!.message).toContain('[Bitget UTA Test]');
    expect(info!.message).toContain('USDT/COIN/USDC-FUTURES');
  });

  it('emits a WARN log on per-category error and returns remaining results', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('USDT-FUTURES')) return { code: 'ERR', msg: 'Category error' };
      return { code: '00000', data: [] };
    });

    const result = await adapter.getOpenPositions(mockKey);
    expect(Array.isArray(result)).toBe(true);

    const warn = getWarnLogs().find(e => e.source === 'BitgetUTAAdapter.Positions');
    expect(warn).toBeDefined();
    expect(warn!.message).toContain('USDT-FUTURES');
  });

  it('returns positions from successful categories even when one category fails', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('USDT-FUTURES')) throw new Error('Network error on USDT-FUTURES');
      if (targetUrl.includes('COIN-FUTURES')) {
        return {
          code: '00000',
          data: [{
            symbol: 'ETHUSD_CM',
            total: '10',
            posSide: 'long',
            marginMode: 'crossed',
            markPrice: '3000',
            avgPrice: '2900',
            positionBalance: '100',
            leverage: '10',
            category: 'COIN-FUTURES',
          }],
        };
      }
      return { code: '00000', data: [] };
    });

    const result = await adapter.getOpenPositions(mockKey);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── fetchAndNormalize ───────────────────────────────────────────────────────

describe('BitgetUTAAdapter.fetchAndNormalize - logging', () => {
  it('emits an INFO log at the start of fetchAndNormalize', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.fetchAndNormalize(mockKey);

    const hist = getInfoLogs().find(e => e.source === 'BitgetUTAAdapter.History');
    expect(hist).toBeDefined();
    expect(hist!.message).toContain('[Bitget UTA Test]');
    expect(hist!.message).toContain('UTA v3');
  });
});

// ─── fetchBills ──────────────────────────────────────────────────────────────

describe('BitgetUTAAdapter.fetchBills - logging', () => {
  it('emits an INFO log at the start of fetchBills', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.fetchBills(mockKey);

    const bills = getInfoLogs().find(e => e.source === 'BitgetUTAAdapter.Bills');
    expect(bills).toBeDefined();
    expect(bills!.message).toContain('[Bitget UTA Test]');
    expect(bills!.message).toContain('UTA v3');
  });
});

// ─── getOpenOrders ───────────────────────────────────────────────────────────

describe('BitgetUTAAdapter.getOpenOrders - logging', () => {
  it('emits an INFO log at the start of getOpenOrders', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.getOpenOrders(mockKey);

    const orders = getInfoLogs().find(e => e.source === 'BitgetUTAAdapter.OpenOrders');
    expect(orders).toBeDefined();
    expect(orders!.message).toContain('[Bitget UTA Test]');
    expect(orders!.message).toContain('UTA v3');
  });

  it('emits a WARN log on per-category network error without aborting', async () => {
    let callCount = 0;
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Timeout');
      return { code: '00000', data: [] };
    });

    const result = await adapter.getOpenOrders(mockKey);
    expect(Array.isArray(result)).toBe(true);

    const warn = getWarnLogs().find(e => e.source === 'BitgetUTAAdapter.OpenOrders');
    expect(warn).toBeDefined();
  });
});

// ─── getHistoryOrders ────────────────────────────────────────────────────────

describe('BitgetUTAAdapter.getHistoryOrders - logging', () => {
  it('emits an INFO log at the start of getHistoryOrders', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '00000', data: [] });

    await adapter.getHistoryOrders(mockKey);

    const hist = getInfoLogs().find(e => e.source === 'BitgetUTAAdapter.HistoryOrders');
    expect(hist).toBeDefined();
    expect(hist!.message).toContain('[Bitget UTA Test]');
    expect(hist!.message).toContain('UTA v3');
  });
});
