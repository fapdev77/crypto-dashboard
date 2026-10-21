import { describe, it, expect } from 'vitest';
import { InverseMarketService } from '../InverseMarketService';

describe('InverseMarketService', () => {
  describe('extractBaseSymbol', () => {
    it('normalizes Bybit Coin-M symbols', () => {
      expect(InverseMarketService.extractBaseSymbol('BTCUSD')).toBe('BTC');
      expect(InverseMarketService.extractBaseSymbol('ETHUSD')).toBe('ETH');
      expect(InverseMarketService.extractBaseSymbol('SOLUSD')).toBe('SOL');
    });

    it('normalizes Bitget UTA v3 Coin-M symbols', () => {
      expect(InverseMarketService.extractBaseSymbol('BTCUSD_CM')).toBe('BTC');
      expect(InverseMarketService.extractBaseSymbol('DOGEUSD_CM')).toBe('DOGE');
      expect(InverseMarketService.extractBaseSymbol('XRPUSD_CM')).toBe('XRP');
    });

    it('normalizes OKX SWAP Coin-M symbols', () => {
      expect(InverseMarketService.extractBaseSymbol('BTC-USD-SWAP')).toBe('BTC');
      expect(InverseMarketService.extractBaseSymbol('ETH-USD-SWAP')).toBe('ETH');
      expect(InverseMarketService.extractBaseSymbol('SOL-USD-SWAP')).toBe('SOL');
    });

    it('handles numeric prefixes such as 1000PEPE', () => {
      expect(InverseMarketService.extractBaseSymbol('1000PEPEUSD_CM')).toBe('PEPE');
    });
  });

  describe('fetchInverseMarketOverview', () => {
    it('generates consistent and valid Coin-M asset overview records', async () => {
      const data = await InverseMarketService.fetchInverseMarketOverview(true);

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check standard BTC contract
      const btc = data.find((d) => d.symbol === 'BTC');
      expect(btc).toBeDefined();

      if (btc) {
        expect(btc.name).toBe('Bitcoin');
        expect(btc.price).toBeGreaterThan(1000);
        expect(btc.high24h).toBeGreaterThanOrEqual(btc.low24h);
        expect(btc.totalVolumeCoin).toBeGreaterThan(0);
        expect(btc.totalVolumeUsd).toBeGreaterThan(0);
        expect(btc.totalOiUsd).toBeGreaterThan(0);

        // CVD metrics
        expect(btc.estimatedBuyerRatio).toBeGreaterThanOrEqual(0);
        expect(btc.estimatedBuyerRatio).toBeLessThanOrEqual(100);
        expect(typeof btc.estimatedCvdUsd).toBe('number');

        // Funding rate fields
        expect(typeof btc.todaySum).toBe('number');
        expect(typeof btc.currentMonthSum).toBe('number');
        expect(typeof btc.last3MonthsSum).toBe('number');

        // Segregated exchanges
        expect(btc.exchanges.bybit).toBeDefined();
        expect(btc.exchanges.okx).toBeDefined();
        expect(btc.exchanges.bitget).toBeDefined();

        if (btc.exchanges.bybit) {
          expect(btc.exchanges.bybit.exchange).toBe('bybit');
          expect(btc.exchanges.bybit.pairSymbol).toBe('BTCUSD');
          expect(btc.exchanges.bybit.price).toBeGreaterThan(1000);
          expect(btc.exchanges.bybit.volume24hCoin).toBeGreaterThan(0);
          expect(btc.exchanges.bybit.volume24hUsd).toBeGreaterThan(1_000_000);
          expect(btc.exchanges.bybit.openInterestUsd).toBeGreaterThan(1_000_000);
          expect(btc.exchanges.bybit.nextFundingTime).toBeGreaterThan(0);
        }

        if (btc.exchanges.bitget) {
          expect(btc.exchanges.bitget.exchange).toBe('bitget');
          expect(btc.exchanges.bitget.pairSymbol).toBe('BTCUSD_CM');
          expect(btc.exchanges.bitget.volume24hUsd).toBeGreaterThan(100_000);
          expect(btc.exchanges.bitget.nextFundingTime).toBeGreaterThan(0);
        }

        if (btc.exchanges.okx) {
          expect(btc.exchanges.okx.exchange).toBe('okx');
          expect(btc.exchanges.okx.pairSymbol).toBe('BTC-USD-SWAP');
          expect(btc.exchanges.okx.volume24hUsd).toBeGreaterThan(1_000_000);
          expect(typeof btc.exchanges.okx.nextFundingRate).toBe('number');
          expect(btc.exchanges.okx.nextFundingTime).toBeGreaterThan(0);
        }
      }
    });

    it('computes arbitrage funding spread when multiple exchanges are active', async () => {
      const data = await InverseMarketService.fetchInverseMarketOverview(true);
      const multiExAsset = data.find((d) => d.activeExchanges.length >= 2 && d.maxFundingSpreadApr !== null);

      expect(multiExAsset).toBeDefined();
      if (multiExAsset) {
        expect(multiExAsset.maxFundingSpreadApr).toBeGreaterThanOrEqual(0);
        expect(multiExAsset.bestLongExchange).toBeDefined();
        expect(multiExAsset.bestShortExchange).toBeDefined();
      }
    });
  });
});
