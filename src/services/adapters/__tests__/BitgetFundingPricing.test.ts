import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BitgetUTAAdapter } from '../BitgetUTAAdapter';
import { ApiCredentials } from '../../../store/apiKeysStore';
import * as proxyModule from '../../../utils/proxyFetch';

describe('BitgetUTAAdapter Funding Pricing & Toggle', () => {
  const adapter = new BitgetUTAAdapter();

  const mockKey: ApiCredentials = {
    id: 'test-key-1',
    label: 'Main',
    exchange: 'bitget',
    accountType: 'uta',
    apiKey: 'mock-key',
    apiSecret: 'mock-secret',
    passphrase: 'mock-passphrase',
    isActive: true,
    includeFunding: true,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates correct market usdValue for SOL in funding instead of 1:1', async () => {
    vi.spyOn(proxyModule, 'proxyFetch').mockImplementation(async ({ targetUrl }: any) => {
      if (targetUrl.includes('/api/v3/account/assets')) {
        return {
          code: '00000',
          data: {
            assets: [
              {
                coin: 'USDT',
                equity: '100',
                usdValue: '100',
                balance: '100',
                available: '100',
              }
            ]
          }
        };
      }
      if (targetUrl.includes('/api/v3/account/funding-assets')) {
        return {
          code: '00000',
          data: [
            {
              coin: 'SOL',
              available: '2.00',
              frozen: '0',
              balance: '2.00',
            }
          ]
        };
      }
      if (targetUrl.includes('/api/v3/market/tickers') && targetUrl.includes('SOLUSDT')) {
        return {
          code: '00000',
          data: [
            {
              lastPrice: '104.75'
            }
          ]
        };
      }
      return { code: '00000', data: [] };
    });

    const balances = await adapter.getBalance(mockKey);
    const solFunding = balances.find(b => b.ccy === 'SOL');

    expect(solFunding).toBeDefined();
    expect(solFunding?.amount).toBe(2);
    // 2 SOL * 104.75 = 209.50, NOT 2.00!
    expect(solFunding?.usdValue).toBeCloseTo(209.50, 2);
    expect(solFunding?.raw?.coinPrice).toBe(104.75);
  });

  it('excludes funding assets when includeFunding is false', async () => {
    vi.spyOn(proxyModule, 'proxyFetch').mockImplementation(async ({ targetUrl }: any) => {
      if (targetUrl.includes('/api/v3/account/assets')) {
        return {
          code: '00000',
          data: {
            assets: [
              {
                coin: 'ADA',
                equity: '46290.68629',
                usdValue: '10051.65',
                balance: '46290.68629',
                available: '46290.68629',
              }
            ]
          }
        };
      }
      if (targetUrl.includes('/api/v3/account/funding-assets')) {
        return {
          code: '00000',
          data: [
            {
              coin: 'ADA',
              available: '957.446869',
              frozen: '0',
              balance: '957.446869',
            }
          ]
        };
      }
      return { code: '00000', data: [] };
    });

    const keyWithoutFunding: ApiCredentials = {
      ...mockKey,
      id: 'hff-sub-key',
      label: 'HFF',
      includeFunding: false,
      isSubAccount: true,
    };

    const balances = await adapter.getBalance(keyWithoutFunding);
    const fundingBalances = balances.filter(b => b.id.includes('funding'));

    // Subaccount with includeFunding=false must NOT have any funding balance entries
    expect(fundingBalances).toHaveLength(0);
    // Only the UTA balance exists
    expect(balances).toHaveLength(1);
    expect(balances[0].ccy).toBe('ADA');
    expect(balances[0].amount).toBeCloseTo(46290.686, 2);
    expect(balances[0].usdValue).toBeCloseTo(10051.65, 2);
  });
});
