import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OkxAdapter } from '../OkxAdapter';
import { ApiCredentials } from '../../../store/apiKeysStore';
import * as proxyModule from '../../../utils/proxyFetch';
import { useLogStore } from '../../../store/logStore';

vi.mock('../../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
}));

const mockKey: ApiCredentials = {
  id: 'key-okx-log',
  label: 'OKX Test',
  exchange: 'okx',
  apiKey: 'k',
  apiSecret: 's',
  passphrase: 'p',
  isActive: true,
};

const adapter = new OkxAdapter();

const getInfoLogs = () => useLogStore.getState().entries.filter(e => e.level === 'INFO');
const getWarnLogs = () => useLogStore.getState().entries.filter(e => e.level === 'WARN');
const getErrorLogs = () => useLogStore.getState().entries.filter(e => e.level === 'ERROR');

beforeEach(() => {
  vi.clearAllMocks();
  useLogStore.setState({ entries: [] });
});

// ─── getBalance ─────────────────────────────────────────────────────────────

describe('OkxAdapter.getBalance - logging', () => {
  it('emits an INFO log at the start of getBalance', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('/api/v5/asset/balances')) {
        return { code: '0', data: [] };
      }
      return {
        code: '0',
        data: [{ totalEq: '0', adjEq: '0', availEq: '0', upl: '0', details: [] }],
      };
    });

    await adapter.getBalance(mockKey);

    const balanceInfo = getInfoLogs().find(e => e.source === 'OKXAdapter.Balance');
    expect(balanceInfo).toBeDefined();
    expect(balanceInfo!.message).toContain('[OKX Test]');
    expect(balanceInfo!.message).toContain('okx.com');
  });

  it('emits an ERROR log and throws when balance API returns an error code', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '50001', msg: 'Invalid API key' });

    await expect(adapter.getBalance(mockKey)).rejects.toThrow('OKX balance API Error (50001): Invalid API key');

    const err = getErrorLogs().find(e => e.source === 'OKXAdapter.Balance');
    expect(err).toBeDefined();
    expect(err!.message).toContain('50001');
  });

  it('emits a WARN log when the funding balance endpoint returns an error (non-critical)', async () => {
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('/api/v5/account/balance')) {
        return { code: '0', data: [{ totalEq: '0', adjEq: '0', availEq: '0', upl: '0', details: [] }] };
      }
      return { code: '50002', msg: 'Funding error' };
    });

    await adapter.getBalance(mockKey);

    const fundingWarn = getWarnLogs().find(e => e.source === 'OKXAdapter.Balance');
    expect(fundingWarn).toBeDefined();
  });
});

// ─── getOpenPositions ────────────────────────────────────────────────────────

describe('OkxAdapter.getOpenPositions - logging', () => {
  it('emits an INFO log at the start of getOpenPositions', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '0', data: [] });

    await adapter.getOpenPositions(mockKey);

    const posInfo = getInfoLogs().find(e => e.source === 'OKXAdapter.Positions');
    expect(posInfo).toBeDefined();
    expect(posInfo!.message).toContain('[OKX Test]');
  });

  it('emits an ERROR log and throws when positions API returns an error code', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '50013', msg: 'Positions forbidden' });

    await expect(adapter.getOpenPositions(mockKey)).rejects.toThrow('OKX positions API Error (50013): Positions forbidden');

    const err = getErrorLogs().find(e => e.source === 'OKXAdapter.Positions');
    expect(err).toBeDefined();
    expect(err!.message).toContain('50013');
  });
});

// ─── fetchAndNormalize ───────────────────────────────────────────────────────

describe('OkxAdapter.fetchAndNormalize - logging', () => {
  it('emits an INFO log at the start of fetchAndNormalize', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '0', data: [] });

    await adapter.fetchAndNormalize(mockKey);

    const hist = getInfoLogs().find(e => e.source === 'OKXAdapter.History');
    expect(hist).toBeDefined();
    expect(hist!.message).toContain('[OKX Test]');
  });

  it('emits a WARN log on per-type fetch error and still returns partial results', async () => {
    let callCount = 0;
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { code: '50099', msg: 'SWAP error' };
      return { code: '0', data: [] };
    });

    const result = await adapter.fetchAndNormalize(mockKey);
    expect(Array.isArray(result)).toBe(true);

    const histWarn = getWarnLogs().find(e => e.source === 'OKXAdapter.History');
    expect(histWarn).toBeDefined();
  });
});

// ─── fetchBills ──────────────────────────────────────────────────────────────

describe('OkxAdapter.fetchBills - logging', () => {
  it('emits an INFO log at the start of fetchBills', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '0', data: [] });

    await adapter.fetchBills(mockKey);

    const bills = getInfoLogs().find(e => e.source === 'OKXAdapter.Bills');
    expect(bills).toBeDefined();
    expect(bills!.message).toContain('[OKX Test]');
  });
});

// ─── getOpenOrders ───────────────────────────────────────────────────────────

describe('OkxAdapter.getOpenOrders - logging', () => {
  it('emits an INFO log at the start of getOpenOrders', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '0', data: [] });

    await adapter.getOpenOrders(mockKey);

    const orders = getInfoLogs().find(e => e.source === 'OKXAdapter.OpenOrders');
    expect(orders).toBeDefined();
    expect(orders!.message).toContain('[OKX Test]');
  });

  it('emits a WARN log on per-instType network error without aborting', async () => {
    let callCount = 0;
    vi.mocked(proxyModule.proxyFetch).mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Network error');
      return { code: '0', data: [] };
    });

    const result = await adapter.getOpenOrders(mockKey);
    expect(Array.isArray(result)).toBe(true);

    const ordersWarn = getWarnLogs().find(e => e.source === 'OKXAdapter.OpenOrders');
    expect(ordersWarn).toBeDefined();
  });
});

// ─── getHistoryOrders ────────────────────────────────────────────────────────

describe('OkxAdapter.getHistoryOrders - logging', () => {
  it('emits an INFO log at the start of getHistoryOrders', async () => {
    vi.mocked(proxyModule.proxyFetch).mockResolvedValue({ code: '0', data: [] });

    await adapter.getHistoryOrders(mockKey);

    const hist = getInfoLogs().find(e => e.source === 'OKXAdapter.HistoryOrders');
    expect(hist).toBeDefined();
    expect(hist!.message).toContain('[OKX Test]');
  });
});
