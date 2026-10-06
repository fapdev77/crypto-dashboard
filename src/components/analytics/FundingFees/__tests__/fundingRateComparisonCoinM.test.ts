import { describe, it, expect } from 'vitest';
import { isInverseSymbol } from '../../../../utils/inverseUtils';
import { FundingFeeAggregated } from '../../../../types';

describe('FundingRateComparison - COIN-M / Inverse Filtering', () => {
  describe('isInverseSymbol', () => {
    it('should correctly identify inverse symbols across exchanges', () => {
      // Bybit inverse
      expect(isInverseSymbol('BTCUSD')).toBe(true);
      expect(isInverseSymbol('ETHUSD')).toBe(true);
      expect(isInverseSymbol('SOLUSD')).toBe(true);

      // OKX inverse
      expect(isInverseSymbol('BTC-USD-SWAP')).toBe(true);
      expect(isInverseSymbol('ETH-USD-SWAP')).toBe(true);

      // Bitget inverse
      expect(isInverseSymbol('BTCUSD_DMCBL')).toBe(true);

      // Explicit tags
      expect(isInverseSymbol('BTC-COIN-M')).toBe(true);
      expect(isInverseSymbol('BTC_INVERSE')).toBe(true);
    });

    it('should reject linear USDT-M / USDC-M symbols', () => {
      expect(isInverseSymbol('BTCUSDT')).toBe(false);
      expect(isInverseSymbol('ETHUSDT')).toBe(false);
      expect(isInverseSymbol('BTCUSDC')).toBe(false);
      expect(isInverseSymbol('BTC-USDT-SWAP')).toBe(false);
      expect(isInverseSymbol('BTC-USDC-SWAP')).toBe(false);
      expect(isInverseSymbol('')).toBe(false);
      expect(isInverseSymbol(undefined)).toBe(false);
    });
  });

  describe('COIN-M filtering logic', () => {
    const mockData: Partial<FundingFeeAggregated>[] = [
      {
        exchange: 'bybit',
        symbol: 'BTCUSDT',
        instrumentType: 'USDT-M',
        lastFundingRate: 0.0001,
        todaySum: 0.0003
      },
      {
        exchange: 'bybit',
        symbol: 'BTCUSD',
        instrumentType: 'COIN-M',
        lastFundingRate: 0.00015,
        todaySum: 0.00045
      },
      {
        exchange: 'okx',
        symbol: 'ETH-USDT-SWAP',
        instrumentType: 'USDT-M',
        lastFundingRate: 0.00008,
        todaySum: 0.00024
      },
      {
        exchange: 'okx',
        symbol: 'ETH-USD-SWAP',
        instrumentType: 'COIN-M',
        lastFundingRate: 0.00012,
        todaySum: 0.00036
      },
      {
        exchange: 'bitget',
        symbol: 'SOLUSDT',
        instrumentType: 'USDT-M',
        lastFundingRate: 0.0002,
        todaySum: 0.0006
      }
    ];

    it('should filter only COIN-M / Inverse instruments when showCoinMOnly is active', () => {
      const showCoinMOnly = true;

      const filtered = (mockData as FundingFeeAggregated[]).filter(row => {
        if (showCoinMOnly) {
          const isCoinM = 
            row.instrumentType === 'COIN-M' ||
            isInverseSymbol(row.symbol) ||
            (row.symbol.endsWith('USD') && !row.symbol.endsWith('USDT') && !row.symbol.endsWith('USDC')) ||
            row.symbol.includes('-USD-SWAP');
          if (!isCoinM) return false;
        }
        return true;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => `${r.exchange}|${r.symbol}`)).toEqual([
        'bybit|BTCUSD',
        'okx|ETH-USD-SWAP'
      ]);
      expect(filtered.every(r => r.instrumentType === 'COIN-M')).toBe(true);
    });

    it('should return all instruments when showCoinMOnly is false', () => {
      const showCoinMOnly = false;

      const filtered = (mockData as FundingFeeAggregated[]).filter(row => {
        if (showCoinMOnly) {
          const isCoinM = 
            row.instrumentType === 'COIN-M' ||
            isInverseSymbol(row.symbol) ||
            (row.symbol.endsWith('USD') && !row.symbol.endsWith('USDT') && !row.symbol.endsWith('USDC')) ||
            row.symbol.includes('-USD-SWAP');
          if (!isCoinM) return false;
        }
        return true;
      });

      expect(filtered).toHaveLength(5);
    });
  });
});
