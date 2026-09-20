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
});
