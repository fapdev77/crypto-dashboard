import {
  MarketType,
  MarketTimeframe,
  MarketAnalyticsSnapshot,
  ExchangeId,
} from '../../types/marketAnalytics';
import { generateMockSnapshot, POPULAR_SYMBOLS } from '../../mock/marketAnalyticsMock';
import { hybridFetch } from '../../utils/proxyFetch';
import { useSettingsStore } from '../../store/settingsStore';
import { LogManager } from '../logger';

interface CacheEntry {
  timestamp: number;
  data: MarketAnalyticsSnapshot;
}

export class MarketAnalyticsService {
  private static cache: Map<string, CacheEntry> = new Map();
  private static CACHE_TTL_MS = 10_000; // 10 seconds

  private static getCacheKey(symbol: string, market: MarketType, tf: MarketTimeframe): string {
    return `${symbol}_${market}_${tf}`;
  }

  /**
   * Main entrypoint to obtain market analytics snapshot.
   */
  static async fetchSnapshot(
    symbol: string,
    marketType: MarketType = 'ALL',
    timeframe: MarketTimeframe = '1h',
    activeExchanges: ExchangeId[] = ['bybit', 'okx', 'bitget'],
    forceRefresh: boolean = false
  ): Promise<MarketAnalyticsSnapshot> {
    const cleanSymbol = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
    const cacheKey = this.getCacheKey(cleanSymbol, marketType, timeframe);

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return cached.data;
      }
    }

    const useMockData = useSettingsStore.getState().useMockData;

    // In simulation mode, immediately return the mock generator
    if (useMockData) {
      const mockSnapshot = generateMockSnapshot(cleanSymbol, marketType, timeframe, activeExchanges);
      this.cache.set(cacheKey, { timestamp: Date.now(), data: mockSnapshot });
      return mockSnapshot;
    }

    try {
      // Base mock structure to provide deep time-series history
      const baseSnapshot = generateMockSnapshot(cleanSymbol, marketType, timeframe, activeExchanges);

      // Attempt parallel fetch of live metrics
      const [bybitData, okxData, bitgetData] = await Promise.allSettled([
        this.fetchBybitMetrics(cleanSymbol, marketType),
        this.fetchOkxMetrics(cleanSymbol, marketType),
        this.fetchBitgetMetrics(cleanSymbol, marketType),
      ]);

      let livePrice = baseSnapshot.currentPrice;
      let livePriceChange = baseSnapshot.priceChange24h;

      // Extract Bybit live data if successful
      if (bybitData.status === 'fulfilled' && bybitData.value) {
        if (bybitData.value.lastPrice) livePrice = bybitData.value.lastPrice;
        if (bybitData.value.price24hPcnt !== undefined) livePriceChange = bybitData.value.price24hPcnt * 100;
        
        // Update Bybit funding rate
        if (bybitData.value.fundingRate !== undefined && baseSnapshot.currentFunding) {
          baseSnapshot.currentFunding.bybitRate = bybitData.value.fundingRate;
        }
      }

      // Extract OKX live data if successful
      if (okxData.status === 'fulfilled' && okxData.value) {
        if (okxData.value.fundingRate !== undefined && baseSnapshot.currentFunding) {
          baseSnapshot.currentFunding.okxRate = okxData.value.fundingRate;
        }
        if (okxData.value.nextFundingRate !== undefined && baseSnapshot.currentFunding) {
          baseSnapshot.currentFunding.predictedOkxRate = okxData.value.nextFundingRate;
        }
        if (okxData.value.openInterestUsd !== undefined) {
          baseSnapshot.oiBreakdown.okx = Math.round(okxData.value.openInterestUsd);
        }
      }

      // Extract Bitget live data if successful
      if (bitgetData.status === 'fulfilled' && bitgetData.value) {
        if (bitgetData.value.fundingRate !== undefined && baseSnapshot.currentFunding) {
          baseSnapshot.currentFunding.bitgetRate = bitgetData.value.fundingRate;
        }
        if (bitgetData.value.openInterestUsd !== undefined) {
          baseSnapshot.oiBreakdown.bitget = Math.round(bitgetData.value.openInterestUsd);
        }
      }

      // Recalculate funding spread if rates were fetched
      if (baseSnapshot.currentFunding) {
        const cf = baseSnapshot.currentFunding;
        const validRates: { ex: ExchangeId; r: number }[] = [];
        if (cf.bybitRate !== null) validRates.push({ ex: 'bybit', r: cf.bybitRate });
        if (cf.okxRate !== null) validRates.push({ ex: 'okx', r: cf.okxRate });
        if (cf.bitgetRate !== null) validRates.push({ ex: 'bitget', r: cf.bitgetRate });

        if (validRates.length >= 2) {
          validRates.sort((a, b) => a.r - b.r);
          const minRate = validRates[0];
          const maxRate = validRates[validRates.length - 1];
          cf.spread = Number((maxRate.r - minRate.r).toFixed(6));
          cf.spreadApr = Number((cf.spread * 3 * 365 * 100).toFixed(2));
          cf.bestLongExchange = minRate.ex;
          cf.bestShortExchange = maxExLongShort(minRate.ex, maxRate.ex);
        }
      }

      baseSnapshot.currentPrice = Number(livePrice.toFixed(livePrice < 1 ? 4 : 2));
      baseSnapshot.priceChange24h = Number(livePriceChange.toFixed(2));
      baseSnapshot.lastUpdated = Date.now();

      this.cache.set(cacheKey, { timestamp: Date.now(), data: baseSnapshot });
      return baseSnapshot;
    } catch (err) {
      LogManager.warn('MarketAnalyticsService', `Live fetch failed for ${cleanSymbol}, fallback to simulation`, err);
      const fallback = generateMockSnapshot(cleanSymbol, marketType, timeframe, activeExchanges);
      this.cache.set(cacheKey, { timestamp: Date.now(), data: fallback });
      return fallback;
    }
  }

  // ── Bybit Fetcher ──────────────────────────────────────────────────
  private static async fetchBybitMetrics(symbol: string, marketType: MarketType) {
    if (marketType === 'SPOT') {
      const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.retCode === 0 && res.result?.list?.[0]) {
        const t = res.result.list[0];
        return {
          lastPrice: parseFloat(t.lastPrice),
          price24hPcnt: parseFloat(t.price24hPcnt || '0'),
          volume24h: parseFloat(t.turnover24h || '0'),
        };
      }
      return null;
    }

    const category = marketType === 'INVERSE' ? 'inverse' : 'linear';
    const pairSymbol = marketType === 'INVERSE' ? `${symbol}USD` : `${symbol}USDT`;
    const url = `https://api.bybit.com/v5/market/tickers?category=${category}&symbol=${pairSymbol}`;
    const res = await hybridFetch(url, 'GET', {});
    if (res?.retCode === 0 && res.result?.list?.[0]) {
      const t = res.result.list[0];
      return {
        lastPrice: parseFloat(t.lastPrice),
        price24hPcnt: parseFloat(t.price24hPcnt || '0'),
        fundingRate: t.fundingRate ? parseFloat(t.fundingRate) : undefined,
        nextFundingTime: t.nextFundingTime ? parseInt(t.nextFundingTime) : undefined,
        openInterestValue: t.openInterestValue ? parseFloat(t.openInterestValue) : undefined,
      };
    }
    return null;
  }

  // ── OKX Fetcher ────────────────────────────────────────────────────
  private static async fetchOkxMetrics(symbol: string, marketType: MarketType) {
    if (marketType === 'SPOT') {
      const url = `https://api.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '0' && res.data?.[0]) {
        return {
          lastPrice: parseFloat(res.data[0].last),
        };
      }
      return null;
    }

    const instId = marketType === 'INVERSE' ? `${symbol}-USD-SWAP` : `${symbol}-USDT-SWAP`;
    const [fundingRes, oiRes] = await Promise.allSettled([
      hybridFetch(`https://api.okx.com/api/v5/public/funding-rate?instId=${instId}`, 'GET', {}),
      hybridFetch(`https://api.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${instId}`, 'GET', {}),
    ]);

    let fundingRate: number | undefined;
    let nextFundingRate: number | undefined;
    let openInterestUsd: number | undefined;

    if (fundingRes.status === 'fulfilled' && fundingRes.value?.code === '0' && fundingRes.value.data?.[0]) {
      const d = fundingRes.value.data[0];
      if (d.fundingRate) fundingRate = parseFloat(d.fundingRate);
      if (d.nextFundingRate) nextFundingRate = parseFloat(d.nextFundingRate);
    }

    if (oiRes.status === 'fulfilled' && oiRes.value?.code === '0' && oiRes.value.data?.[0]) {
      const d = oiRes.value.data[0];
      if (d.oiUsd) openInterestUsd = parseFloat(d.oiUsd);
    }

    return {
      fundingRate,
      nextFundingRate,
      openInterestUsd,
    };
  }

  // ── Bitget Fetcher ─────────────────────────────────────────────────
  private static async fetchBitgetMetrics(symbol: string, marketType: MarketType) {
    if (marketType === 'SPOT') {
      const url = `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol}USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '00000' && res.data?.[0]) {
        return {
          lastPrice: parseFloat(res.data[0].lastPr),
        };
      }
      return null;
    }

    const productType = marketType === 'INVERSE' ? 'coin-futures' : 'usdt-futures';
    const pairSymbol = marketType === 'INVERSE' ? `${symbol}USD` : `${symbol}USDT`;

    const [fundingRes, oiRes] = await Promise.allSettled([
      hybridFetch(`https://api.bitget.com/api/v2/mix/market/current-fund-rate?symbol=${pairSymbol}&productType=${productType}`, 'GET', {}),
      hybridFetch(`https://api.bitget.com/api/v2/mix/market/open-interest?symbol=${pairSymbol}&productType=${productType}`, 'GET', {}),
    ]);

    let fundingRate: number | undefined;
    let openInterestUsd: number | undefined;

    if (fundingRes.status === 'fulfilled' && fundingRes.value?.code === '00000' && fundingRes.value.data?.[0]) {
      const d = fundingRes.value.data[0];
      if (d.fundingRate) fundingRate = parseFloat(d.fundingRate);
    }

    if (oiRes.status === 'fulfilled' && oiRes.value?.code === '00000' && oiRes.value.data?.[0]) {
      const d = oiRes.value.data[0];
      if (d.size) openInterestUsd = parseFloat(d.size);
    }

    return {
      fundingRate,
      openInterestUsd,
    };
  }
}

function maxExLongShort(minEx: ExchangeId, maxEx: ExchangeId): ExchangeId {
  return maxEx;
}
