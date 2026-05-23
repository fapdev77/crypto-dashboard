import { describe, it, expect } from 'vitest';
import { calculateWinRate, calculateProfitFactor, calculateFundingEfficiency, calculateTotalFees } from './analyticsMath';
import { UnifiedHistoryPosition } from '../types';

describe('analyticsMath', () => {
  const mockHistory: UnifiedHistoryPosition[] = [
    { id: '1', connectionId: 'c1', exchange: 'bybit', label: 'L1', symbol: 'BTCUSDT', side: 'long', realizedPnl: 100, closeTime: 1, tradingFee: -2, fundingFee: 5 },
    { id: '2', connectionId: 'c1', exchange: 'bybit', label: 'L1', symbol: 'BTCUSDT', side: 'long', realizedPnl: -50, closeTime: 2, tradingFee: -1, fundingFee: -2 },
    { id: '3', connectionId: 'c1', exchange: 'bybit', label: 'L1', symbol: 'BTCUSDT', side: 'long', realizedPnl: 200, closeTime: 3, tradingFee: -4, fundingFee: 10 },
  ];

  it('calculates win rate correctly', () => {
    const winRate = calculateWinRate(mockHistory);
    expect(winRate).toBeCloseTo(66.666, 2);
  });

  it('calculates profit factor correctly', () => {
    const pf = calculateProfitFactor(mockHistory);
    expect(pf).toBe(6); // 300 / 50 = 6
  });

  it('calculates funding efficiency correctly', () => {
    const efficiency = calculateFundingEfficiency(mockHistory);
    expect(efficiency).toBe(7.5); // 15 / 2 = 7.5
  });

  it('calculates total fees correctly', () => {
    const fees = calculateTotalFees(mockHistory);
    expect(fees.tradingFees).toBe(7); // |-2| + |-1| + |-4| = 7
    expect(fees.netFundingFees).toBe(13); // 5 - 2 + 10 = 13
  });
});
