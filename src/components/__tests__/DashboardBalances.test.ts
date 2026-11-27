import { describe, it, expect } from 'vitest';
import { UnifiedBalance } from '../../types';

describe('Dashboard activeBalances net balance mapping', () => {
  it('preserves OKX funding amount and does not overwrite it with account total equity', () => {
    // Replicating the Dashboard mapping logic for OKX balances
    const rawBalances: UnifiedBalance[] = [
      {
        id: 'conn-okx-1-UNIFIED-USDT',
        connectionId: 'conn-okx-1',
        exchange: 'okx',
        label: 'Main-ES',
        ccy: 'USDT',
        amount: 686.105826,
        usdValue: 685.71,
        raw: {
          ccy: 'USDT',
          cashBal: '686.105826',
          eq: '686.105826',
          eqUsd: '685.71',
          equity: 686.105826,
          usdValue: 685.71,
          accountMetrics: { totalEquity: 930.300707, walletBalance: 930.300707 },
        },
      },
      {
        id: 'conn-okx-1-UNIFIED-BTC',
        connectionId: 'conn-okx-1',
        exchange: 'okx',
        label: 'Main-ES',
        ccy: 'BTC',
        amount: 0.00051,
        usdValue: 42.70,
        raw: {
          ccy: 'BTC',
          cashBal: '0.00051',
          eq: '0.00051',
          eqUsd: '42.70',
          equity: 0.00051,
          usdValue: 42.70,
          accountMetrics: { totalEquity: 930.300707, walletBalance: 930.300707 },
        },
      },
      {
        id: 'conn-okx-1-FUNDING-USDT',
        connectionId: 'conn-okx-1',
        exchange: 'okx',
        label: 'Main-ES',
        ccy: 'USDT',
        amount: 201.994174,
        usdValue: 201.87,
        raw: {
          ccy: 'USDT',
          bal: '201.994174',
          availBal: '201.994174',
          equity: 201.994174,
          usdValue: 201.87,
          accountMetrics: { totalEquity: 930.300707, walletBalance: 930.300707 },
        },
      },
    ];

    const mapped = rawBalances.map(b => {
      const ex = b.exchange?.toLowerCase();
      if (ex !== 'bybit' && ex !== 'bitget' && ex !== 'okx') {
        return b;
      }

      const rawObj: any = b.raw || {};
      const rawEquity = rawObj.equity !== undefined && rawObj.equity !== null && rawObj.equity !== ''
        ? parseFloat(String(rawObj.equity))
        : (rawObj.eq !== undefined && rawObj.eq !== null && rawObj.eq !== ''
            ? parseFloat(String(rawObj.eq))
            : NaN);
      const rawUsdValue = rawObj.usdValue !== undefined && rawObj.usdValue !== null && rawObj.usdValue !== ''
        ? parseFloat(String(rawObj.usdValue))
        : (rawObj.eqUsd !== undefined && rawObj.eqUsd !== null && rawObj.eqUsd !== ''
            ? parseFloat(String(rawObj.eqUsd))
            : NaN);

      const coinPrice = (b.amount > 0 && (b.usdValue || 0) > 0)
        ? (b.usdValue / b.amount)
        : 0;

      if (!isNaN(rawEquity) && rawEquity >= 0) {
        const netAmount = rawEquity;
        const netUsdValue = (!isNaN(rawUsdValue) && rawUsdValue > 0)
          ? rawUsdValue
          : (coinPrice > 0 ? netAmount * coinPrice : (b.usdValue || 0));

        return {
          ...b,
          amount: netAmount,
          usdValue: netUsdValue,
        };
      }

      return b;
    });

    const fundingItem = mapped.find(b => b.id.includes('FUNDING-USDT'));
    expect(fundingItem).toBeDefined();
    expect(fundingItem!.amount).toBeCloseTo(201.994, 2);
    expect(fundingItem!.usdValue).toBeCloseTo(201.87, 1);

    const totalUsd = mapped.reduce((acc, b) => acc + (b.usdValue || 0), 0);
    expect(totalUsd).toBeCloseTo(930.28, 1);
  });
});
