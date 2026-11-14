import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OkxAdapter } from '../OkxAdapter';
import { ApiCredentials } from '../../../store/apiKeysStore';
import * as proxyModule from '../../../utils/proxyFetch';

vi.mock('../../../utils/proxyFetch', () => ({
  proxyFetch: vi.fn(),
}));

describe('OkxAdapter.getBalance', () => {
  const adapter = new OkxAdapter();
  const mockKey: ApiCredentials = {
    id: 'key-okx-1',
    label: 'Main OKX',
    exchange: 'okx',
    apiKey: 'test-api-key',
    apiSecret: 'test-secret',
    passphrase: 'test-passphrase',
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly maps gross wallet balance (cashBal) and stores net equity (eq and eqUsd)', async () => {
    const mockProxyFetch = vi.mocked(proxyModule.proxyFetch);

    // Mock /api/v5/account/balance response
    mockProxyFetch.mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('/api/v5/account/balance')) {
        return {
          code: '0',
          msg: '',
          data: [
            {
              totalEq: '90000',
              adjEq: '95000',
              availEq: '80000',
              upl: '-5000',
              details: [
                {
                  ccy: 'BTC',
                  cashBal: '1.0', // 1 BTC gross cash balance
                  eq: '0.8',     // 0.8 BTC net equity after -0.2 BTC unrealized loss
                  eqUsd: '80000', // $80,000 net USD value
                  coinUsdPrice: '100000', // $100,000 price per BTC
                },
              ],
            },
          ],
        };
      }
      if (targetUrl.includes('/api/v5/asset/balances')) {
        return {
          code: '0',
          msg: '',
          data: [],
        };
      }
      return { code: '0', data: [] };
    });

    const balances = await adapter.getBalance(mockKey);
    expect(balances).toHaveLength(1);

    const btc = balances[0];
    expect(btc.ccy).toBe('BTC');
    // Gross balance should be cashBal = 1.0 BTC
    expect(btc.amount).toBe(1.0);
    // Gross USD value should be cashBal * coinPrice = 1.0 * 100,000 = $100,000
    expect(btc.usdValue).toBe(100000);
    expect(btc.walletBalance).toBe(1.0);

    // Raw should preserve official equity
    expect(btc.raw?.equity).toBe(0.8);
    expect(btc.raw?.usdValue).toBe(80000);
  });

  it('correctly maps funding balance without replacing coin amount with total account equity', async () => {
    const mockProxyFetch = vi.mocked(proxyModule.proxyFetch);

    // Mock exact scenario: Trading ($728.38) + Funding ($201.87) = Total ~$930.26
    mockProxyFetch.mockImplementation(async ({ targetUrl }: { targetUrl: string }) => {
      if (targetUrl.includes('/api/v5/account/balance')) {
        return {
          code: '0',
          msg: '',
          data: [
            {
              totalEq: '728.41',
              adjEq: '728.41',
              availEq: '728.41',
              upl: '0',
              details: [
                {
                  ccy: 'USDT',
                  cashBal: '686.105826',
                  eq: '686.105826',
                  eqUsd: '685.71',
                  coinUsdPrice: '0.9994',
                },
                {
                  ccy: 'BTC',
                  cashBal: '0.00051',
                  eq: '0.00051',
                  eqUsd: '42.70',
                  coinUsdPrice: '83725',
                },
              ],
            },
          ],
        };
      }
      if (targetUrl.includes('/api/v5/asset/balances')) {
        return {
          code: '0',
          msg: '',
          data: [
            {
              ccy: 'USDT',
              bal: '201.994174',
              availBal: '201.994174',
              frozenBal: '0',
            },
          ],
        };
      }
      return { code: '0', data: [] };
    });

    const balances = await adapter.getBalance(mockKey);
    // Should have 3 balances: Trading USDT, Trading BTC, Funding USDT
    expect(balances).toHaveLength(3);

    const fundingUsdt = balances.find(b => b.id.includes('FUNDING-USDT'));
    expect(fundingUsdt).toBeDefined();
    // Funding amount must be 201.994174, NOT total account equity (~930.30)
    expect(fundingUsdt!.amount).toBeCloseTo(201.994, 2);
    expect(fundingUsdt!.usdValue).toBeCloseTo(201.87, 1);
    expect(fundingUsdt!.raw?.equity).toBeCloseTo(201.994, 2);
    expect(fundingUsdt!.raw?.usdValue).toBeCloseTo(201.87, 1);
    expect(fundingUsdt!.totalEquity).toBeUndefined();

    const tradingUsdt = balances.find(b => b.id.includes('UNIFIED-USDT'));
    expect(tradingUsdt).toBeDefined();
    expect(tradingUsdt!.amount).toBeCloseTo(686.1058, 3);
    expect(tradingUsdt!.usdValue).toBeCloseTo(685.71, 1);

    const tradingBtc = balances.find(b => b.id.includes('UNIFIED-BTC'));
    expect(tradingBtc).toBeDefined();
    expect(tradingBtc!.amount).toBeCloseTo(0.00051, 5);
    expect(tradingBtc!.usdValue).toBeCloseTo(42.70, 1);

    // Sum of all balances should equal the true account valuation (~$930.28), NOT $1,658.19
    const totalUsd = balances.reduce((sum, b) => sum + (b.usdValue || 0), 0);
    expect(totalUsd).toBeCloseTo(930.28, 0);
  });
});
