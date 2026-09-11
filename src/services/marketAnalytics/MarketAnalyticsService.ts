import {
  MarketType,
  SpecificMarketType,
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

  private static getCacheKey(symbol: string, market: MarketType | SpecificMarketType[], tf: MarketTimeframe): string {
    const marketKey = Array.isArray(market) ? [...market].sort().join('+') : market;
    return `${symbol}_${marketKey}_${tf}`;
  }

  /**
   * Main entrypoint to obtain market analytics snapshot.
   */
  static async fetchSnapshot(
    symbol: string,
    marketType: MarketType | SpecificMarketType[] = 'ALL',
    timeframe: MarketTimeframe = '1h',
    activeExchanges: ExchangeId[] = ['bybit', 'okx', 'bitget'],
    forceRefresh: boolean = false
  ): Promise<MarketAnalyticsSnapshot> {
    const cleanSymbol = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
    const primaryMarket: MarketType = Array.isArray(marketType)
      ? (marketType.length === 1 ? marketType[0] : 'ALL')
      : marketType;
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
      // Base mock structure to provide deep time-series history and breakdown matrix
      const baseSnapshot = generateMockSnapshot(cleanSymbol, marketType, timeframe, activeExchanges);

      // Attempt parallel fetch of live metrics
      const [bybitData, okxData, bitgetData] = await Promise.allSettled([
        this.fetchBybitMetrics(cleanSymbol, primaryMarket),
        this.fetchOkxMetrics(cleanSymbol, primaryMarket),
        this.fetchBitgetMetrics(cleanSymbol, primaryMarket),
      ]);

      const bybitVal = bybitData.status === 'fulfilled' ? bybitData.value : null;
      const okxVal = okxData.status === 'fulfilled' ? okxData.value : null;
      const bitgetVal = bitgetData.status === 'fulfilled' ? bitgetData.value : null;

      let livePrice = baseSnapshot.currentPrice;
      let livePriceChange = baseSnapshot.priceChange24h;

      // Extract Bybit live data if successful
      if (bybitVal) {
        if (bybitVal.lastPrice) {
          livePrice = bybitVal.lastPrice;
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'bybit') b.price = bybitVal.lastPrice!;
          });
        }
        if (bybitVal.price24hPcnt !== undefined) livePriceChange = bybitVal.price24hPcnt * 100;
        
        // Update Bybit funding rate
        const bbFunding = bybitVal.fundingRate;
        if (bbFunding !== undefined) {
          if (baseSnapshot.currentFunding) {
            baseSnapshot.currentFunding.bybitRate = bbFunding;
          }
          const bbApr = Number((bbFunding * 3 * 365 * 100).toFixed(2));
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'bybit' && b.market !== 'SPOT') {
              b.fundingRate = bbFunding;
              b.fundingApr = bbApr;
            }
          });
        }
      }

      // Extract OKX live data if successful
      if (okxVal) {
        // Update OKX price in breakdown
        if (okxVal.lastPrice !== undefined) {
          const okxPrice = okxVal.lastPrice;
          if (!bybitVal?.lastPrice) livePrice = okxPrice;
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'okx') b.price = okxPrice;
          });
        }

        const okxFunding = okxVal.fundingRate;
        if (okxFunding !== undefined) {
          if (baseSnapshot.currentFunding) {
            baseSnapshot.currentFunding.okxRate = okxFunding;
          }
          const okxApr = Number((okxFunding * 3 * 365 * 100).toFixed(2));
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'okx' && b.market !== 'SPOT') {
              b.fundingRate = okxFunding;
              b.fundingApr = okxApr;
            }
          });
        }
        if (okxVal.nextFundingRate !== undefined && baseSnapshot.currentFunding) {
          baseSnapshot.currentFunding.predictedOkxRate = okxVal.nextFundingRate;
        }
        if (okxVal.openInterestUsd !== undefined) {
          const roundedOi = Math.round(okxVal.openInterestUsd);
          baseSnapshot.oiBreakdown.okx = roundedOi;
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'okx' && b.market !== 'SPOT') {
              b.oiUsd = roundedOi;
            }
          });
        }
      }

      // Extract Bitget live data if successful (Bitget UTA v3 API per specs/bitget_uta_api_doc.md)
      if (bitgetVal) {
        // Update Bitget price in breakdown
        if (bitgetVal.lastPrice !== undefined) {
          const bgPrice = bitgetVal.lastPrice;
          if (!bybitVal?.lastPrice && !okxVal?.lastPrice) livePrice = bgPrice;
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'bitget') b.price = bgPrice;
          });
        }

        const bgFunding = bitgetVal.fundingRate;
        if (bgFunding !== undefined) {
          if (baseSnapshot.currentFunding) {
            baseSnapshot.currentFunding.bitgetRate = bgFunding;
          }
          const bgApr = Number((bgFunding * 3 * 365 * 100).toFixed(2));
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'bitget' && b.market !== 'SPOT') {
              b.fundingRate = bgFunding;
              b.fundingApr = bgApr;
            }
          });
        }
        if (bitgetVal.openInterestUsd !== undefined) {
          const roundedOi = Math.round(bitgetVal.openInterestUsd);
          baseSnapshot.oiBreakdown.bitget = roundedOi;
          baseSnapshot.breakdown.forEach((b) => {
            if (b.exchange === 'bitget' && b.market !== 'SPOT') {
              b.oiUsd = roundedOi;
            }
          });
        }
      }

      // Consistency safeguard: If live price was resolved from any active exchange,
      // prevent any exchange in breakdown from remaining stuck at outdated mock basePrice ($65k)
      const hasLivePrice = !!(bybitVal?.lastPrice || okxVal?.lastPrice || bitgetVal?.lastPrice);

      if (hasLivePrice) {
        const bybitHasPrice = !!bybitVal?.lastPrice;
        const okxHasPrice = !!okxVal?.lastPrice;
        const bitgetHasPrice = !!bitgetVal?.lastPrice;

        baseSnapshot.breakdown.forEach((b) => {
          if (b.exchange === 'bybit' && !bybitHasPrice) b.price = livePrice;
          if (b.exchange === 'okx' && !okxHasPrice) b.price = livePrice;
          if (b.exchange === 'bitget' && !bitgetHasPrice) b.price = livePrice;
        });
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
          cf.bestShortExchange = maxRate.ex;
        }
      }

      // Recalculate aggregated total OI from derivative exchanges
      const hasDerivatives = baseSnapshot.marketTypes.some((m) => m !== 'SPOT');
      if (hasDerivatives) {
        baseSnapshot.totalOiUsd = baseSnapshot.oiBreakdown.bybit + baseSnapshot.oiBreakdown.okx + baseSnapshot.oiBreakdown.bitget;
      } else {
        baseSnapshot.totalOiUsd = 0;
        baseSnapshot.oiBreakdown = { bybit: 0, okx: 0, bitget: 0 };
        baseSnapshot.currentFunding = null;
        baseSnapshot.fundingArbitrage = [];
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
      const url = `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '0' && res.data?.[0]) {
        return {
          lastPrice: parseFloat(res.data[0].last),
        };
      }
      return null;
    }

    const instId = marketType === 'INVERSE' ? `${symbol}-USD-SWAP` : `${symbol}-USDT-SWAP`;
    const [tickerRes, fundingRes, oiRes] = await Promise.allSettled([
      hybridFetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`, 'GET', {}),
      hybridFetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`, 'GET', {}),
      hybridFetch(`https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${instId}`, 'GET', {}),
    ]);

    let lastPrice: number | undefined;
    let fundingRate: number | undefined;
    let nextFundingRate: number | undefined;
    let openInterestUsd: number | undefined;

    if (tickerRes.status === 'fulfilled' && tickerRes.value?.code === '0' && tickerRes.value.data?.[0]) {
      const t = tickerRes.value.data[0];
      if (t.last) lastPrice = parseFloat(t.last);
    }

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
      lastPrice,
      fundingRate,
      nextFundingRate,
      openInterestUsd,
    };
  }

  // ── Bitget Fetcher (UTA API v3 per specs/bitget_uta_api_doc.md) ──────
  private static async fetchBitgetMetrics(symbol: string, marketType: MarketType) {
    if (marketType === 'SPOT') {
      const url = `https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=${symbol}USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '00000' && res.data?.[0]) {
        const t = res.data[0];
        return {
          lastPrice: t.lastPrice ? parseFloat(t.lastPrice) : undefined,
          price24hPcnt: t.price24hPcnt ? parseFloat(t.price24hPcnt) : undefined,
          volume24h: t.turnover24h ? parseFloat(t.turnover24h) : undefined,
        };
      }
      return null;
    }

    const category = marketType === 'INVERSE' ? 'COIN-FUTURES' : 'USDT-FUTURES';
    const pairSymbol = marketType === 'INVERSE' ? `${symbol}USD_CM` : `${symbol}USDT`;
    const url = `https://api.bitget.com/api/v3/market/tickers?category=${category}&symbol=${pairSymbol}`;
    const res = await hybridFetch(url, 'GET', {});

    if (res?.code === '00000' && res.data?.[0]) {
      const t = res.data[0];
      const lastPrice = t.lastPrice ? parseFloat(t.lastPrice) : undefined;
      const fundingRate = t.fundingRate ? parseFloat(t.fundingRate) : undefined;
      let openInterestUsd: number | undefined;
      if (t.openInterest && lastPrice) {
        openInterestUsd = parseFloat(t.openInterest) * lastPrice;
      }
      return {
        lastPrice,
        fundingRate,
        openInterestUsd,
        price24hPcnt: t.price24hPcnt ? parseFloat(t.price24hPcnt) : undefined,
        volume24h: t.turnover24h ? parseFloat(t.turnover24h) : undefined,
      };
    }
    return null;
  }
}

