import {
  MarketType,
  SpecificMarketType,
  MarketTimeframe,
  MarketAnalyticsSnapshot,
  ExchangeId,
  MarketBreakdownEntry,
  OpenInterestDataPoint,
  TakerFlowDataPoint,
  FundingArbitrageItem,
  MarketRegime,
  SmartMoneySentiment,
} from '../../types/marketAnalytics';
import { generateMockSnapshot, getTimeframeStepMs, formatPointTime, POPULAR_SYMBOLS } from '../../mock/marketAnalyticsMock';
import { hybridFetch } from '../../utils/proxyFetch';
import { useSettingsStore } from '../../store/settingsStore';
import { LogManager } from '../logger';

interface CacheEntry {
  timestamp: number;
  data: MarketAnalyticsSnapshot;
}

interface FeedLiveMetrics {
  lastPrice?: number;
  price24hPcnt?: number;
  volume24hUsd?: number;
  fundingRate?: number;
  nextFundingRate?: number;
  nextFundingTime?: number;
  openInterestUsd?: number;
}

interface RawCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

    // In LIVE mode: Construct snapshot purely from live data sources without using mock base structure
    const liveSnapshot = await this.buildLiveSnapshot(cleanSymbol, marketType, timeframe, activeExchanges);
    this.cache.set(cacheKey, { timestamp: Date.now(), data: liveSnapshot });
    return liveSnapshot;
  }

  /**
   * Builds a live market analytics snapshot from real exchange APIs.
   */
  private static async buildLiveSnapshot(
    cleanSymbol: string,
    markets: MarketType | SpecificMarketType[],
    timeframe: MarketTimeframe,
    activeExchanges: ExchangeId[]
  ): Promise<MarketAnalyticsSnapshot> {
    const normalizedMarkets: SpecificMarketType[] = Array.isArray(markets)
      ? (markets.length > 0 ? markets : ['PERP', 'INVERSE', 'SPOT'])
      : (markets === 'ALL' ? ['PERP', 'INVERSE', 'SPOT'] : [markets]);

    const derivedMarketType: MarketType = normalizedMarkets.length === 1 ? normalizedMarkets[0] : 'ALL';
    const validExchanges: ExchangeId[] = (activeExchanges.length > 0 ? activeExchanges : ['bybit', 'okx', 'bitget'])
      .filter((e): e is ExchangeId => e === 'bybit' || e === 'okx' || e === 'bitget');
    const safeExchanges: ExchangeId[] = validExchanges.length > 0 ? validExchanges : ['bybit', 'okx', 'bitget'];

    const hasPerp = normalizedMarkets.includes('PERP');
    const hasInverse = normalizedMarkets.includes('INVERSE');
    const hasDerivatives = hasPerp || hasInverse;

    // 1. Build breakdown rows structure
    const breakdownRows: { exchange: ExchangeId; market: SpecificMarketType }[] = [];
    for (const ex of safeExchanges) {
      for (const m of normalizedMarkets) {
        breakdownRows.push({ exchange: ex, market: m });
      }
    }

    // 2. Fetch live metrics for all breakdown feeds concurrently
    const feedPromises = breakdownRows.map(async (row): Promise<FeedLiveMetrics | null> => {
      try {
        if (row.exchange === 'bybit') {
          return await this.fetchBybitMetrics(cleanSymbol, row.market);
        } else if (row.exchange === 'okx') {
          return await this.fetchOkxMetrics(cleanSymbol, row.market);
        } else if (row.exchange === 'bitget') {
          return await this.fetchBitgetMetrics(cleanSymbol, row.market);
        }
      } catch (err) {
        LogManager.warn('MarketAnalyticsService', `Failed to fetch live metrics for ${row.exchange}:${row.market}:${cleanSymbol}`, err);
        return null;
      }
      return null;
    });

    // 3. Fetch secondary auxiliary data: Candles, OKX stats (OI history, Long/Short ratio, Taker Vol)
    const auxPromises = Promise.allSettled([
      this.fetchCandles(cleanSymbol, timeframe),
      this.fetchOkxOiHistory(cleanSymbol),
      this.fetchOkxLongShortRatio(cleanSymbol),
      this.fetchOkxTakerVolume(cleanSymbol),
    ]);

    const [feedResults, auxResults] = await Promise.all([
      Promise.allSettled(feedPromises),
      auxPromises,
    ]);

    // 4. Resolve Primary Live Price from fulfilled feeds (PERP -> SPOT -> INVERSE)
    let primaryLivePrice = 0;
    let liveChange24hPct = 0;

    // Find first valid price
    for (const prefMarket of ['PERP', 'SPOT', 'INVERSE'] as SpecificMarketType[]) {
      for (let i = 0; i < breakdownRows.length; i++) {
        if (breakdownRows[i].market === prefMarket) {
          const res = feedResults[i];
          if (res.status === 'fulfilled' && res.value?.lastPrice && res.value.lastPrice > 0) {
            primaryLivePrice = res.value.lastPrice;
            if (res.value.price24hPcnt !== undefined) {
              liveChange24hPct = res.value.price24hPcnt * 100;
            }
            break;
          }
        }
      }
      if (primaryLivePrice > 0) break;
    }

    // If still 0, check any fulfilled feed
    if (primaryLivePrice === 0) {
      for (let i = 0; i < breakdownRows.length; i++) {
        const res = feedResults[i];
        if (res.status === 'fulfilled' && res.value?.lastPrice && res.value.lastPrice > 0) {
          primaryLivePrice = res.value.lastPrice;
          if (res.value.price24hPcnt !== undefined) {
            liveChange24hPct = res.value.price24hPcnt * 100;
          }
          break;
        }
      }
    }

    // 5. Construct populated breakdown entries
    const breakdown: MarketBreakdownEntry[] = breakdownRows.map((row, idx) => {
      const res = feedResults[idx];
      const m = res.status === 'fulfilled' ? res.value : null;

      const price = m?.lastPrice && m.lastPrice > 0 ? m.lastPrice : primaryLivePrice;
      const volume24hUsd = m?.volume24hUsd ? Math.round(m.volume24hUsd) : 0;
      
      let oiUsd: number | null = null;
      let fundingRate: number | null = null;
      let fundingApr: number | null = null;

      if (row.market !== 'SPOT') {
        if (m?.openInterestUsd !== undefined) {
          oiUsd = Math.round(m.openInterestUsd);
        } else {
          oiUsd = 0;
        }

        if (m?.fundingRate !== undefined) {
          fundingRate = m.fundingRate;
          fundingApr = Number((m.fundingRate * 3 * 365 * 100).toFixed(2));
        } else {
          fundingRate = 0;
          fundingApr = 0;
        }
      }

      return {
        exchange: row.exchange,
        market: row.market,
        price,
        volume24hUsd,
        oiUsd,
        fundingRate,
        fundingApr,
        cvd: 0, // Computed below after taker flow calculation
      };
    });

    // 6. Compute exchange-level OI breakdown and total OI
    const oiBreakdown = {
      bybit: hasDerivatives ? breakdown.filter((b) => b.exchange === 'bybit' && b.oiUsd !== null).reduce((sum, b) => sum + (b.oiUsd || 0), 0) : 0,
      okx: hasDerivatives ? breakdown.filter((b) => b.exchange === 'okx' && b.oiUsd !== null).reduce((sum, b) => sum + (b.oiUsd || 0), 0) : 0,
      bitget: hasDerivatives ? breakdown.filter((b) => b.exchange === 'bitget' && b.oiUsd !== null).reduce((sum, b) => sum + (b.oiUsd || 0), 0) : 0,
    };
    const totalOiUsd = oiBreakdown.bybit + oiBreakdown.okx + oiBreakdown.bitget;
    const totalVolume24hUsd = breakdown.reduce((sum, b) => sum + b.volume24hUsd, 0);

    // 7. Parse auxiliary results: Candles, OI History, Long/Short Ratio, Taker Volume
    const candlesResult = auxResults[0].status === 'fulfilled' ? auxResults[0].value : [];
    const okxOiHistResult = auxResults[1].status === 'fulfilled' ? auxResults[1].value : [];
    const okxLsrResult = auxResults[2].status === 'fulfilled' ? auxResults[2].value : null;
    const okxTakerVolResult = auxResults[3].status === 'fulfilled' ? auxResults[3].value : [];

    // 8. Build OI History Time-Series
    const stepMs = getTimeframeStepMs(timeframe);
    const pointCount = 30;
    const now = Date.now();
    const oiHistory: OpenInterestDataPoint[] = [];

    const totalExOi = oiBreakdown.bybit + oiBreakdown.okx + oiBreakdown.bitget || 1;
    const bybitRatio = totalOiUsd > 0 ? oiBreakdown.bybit / totalExOi : 0.45;
    const okxRatio = totalOiUsd > 0 ? oiBreakdown.okx / totalExOi : 0.35;
    const bitgetRatio = totalOiUsd > 0 ? oiBreakdown.bitget / totalExOi : 0.20;

    for (let i = pointCount; i >= 0; i--) {
      const pointTime = now - i * stepMs;
      const timeLabel = formatPointTime(pointTime, timeframe);

      // Find closest candle for price
      let candlePrice = primaryLivePrice;
      if (candlesResult.length > 0) {
        const closestCandle = candlesResult.reduce((prev, curr) =>
          Math.abs(curr.timestamp - pointTime) < Math.abs(prev.timestamp - pointTime) ? curr : prev
        );
        if (closestCandle && closestCandle.close > 0) {
          candlePrice = closestCandle.close;
        }
      }

      // Find closest historical OI from OKX history if available
      let pointTotalOi = totalOiUsd;
      if (okxOiHistResult.length > 0) {
        const closestOi = okxOiHistResult.reduce((prev, curr) =>
          Math.abs(curr.timestamp - pointTime) < Math.abs(prev.timestamp - pointTime) ? curr : prev
        );
        if (closestOi && closestOi.oiUsd > 0) {
          // If we know OKX ratio, extrapolate total network OI from OKX live OI history
          const extrapolatedTotal = okxRatio > 0.05 ? closestOi.oiUsd / okxRatio : closestOi.oiUsd * 2.8;
          pointTotalOi = Math.round(extrapolatedTotal);
        }
      }

      const pointBybitOi = Math.round(pointTotalOi * bybitRatio);
      const pointOkxOi = Math.round(pointTotalOi * okxRatio);
      const pointBitgetOi = Math.round(pointTotalOi * bitgetRatio);

      oiHistory.push({
        timestamp: pointTime,
        timeLabel,
        price: Number(candlePrice.toFixed(candlePrice < 1 ? 4 : 2)),
        totalOiUsd: hasDerivatives ? pointTotalOi : 0,
        bybitOiUsd: hasDerivatives ? pointBybitOi : 0,
        okxOiUsd: hasDerivatives ? pointOkxOi : 0,
        bitgetOiUsd: hasDerivatives ? pointBitgetOi : 0,
        oiChangePercent: 0,
      });
    }

    // Compute OI changes and percentage
    for (let i = 1; i < oiHistory.length; i++) {
      const prev = oiHistory[i - 1].totalOiUsd;
      const curr = oiHistory[i].totalOiUsd;
      oiHistory[i].oiChangePercent = prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(2)) : 0;
    }

    const latestOiPoint = oiHistory[oiHistory.length - 1];
    const initialOiPoint = oiHistory[0];
    const oiChange24h = initialOiPoint.totalOiUsd > 0
      ? ((latestOiPoint.totalOiUsd - initialOiPoint.totalOiUsd) / initialOiPoint.totalOiUsd) * 100
      : 0;
    const priceChange24h = liveChange24hPct !== 0
      ? liveChange24hPct
      : (initialOiPoint.price > 0 ? ((latestOiPoint.price - initialOiPoint.price) / initialOiPoint.price) * 100 : 0);

    const oi1hPrev = oiHistory[Math.max(0, oiHistory.length - 2)]?.totalOiUsd || initialOiPoint.totalOiUsd;
    const oiChange1hPercent = oi1hPrev > 0 ? ((latestOiPoint.totalOiUsd - oi1hPrev) / oi1hPrev) * 100 : 0;

    // 9. Build Taker Flow & CVD History
    const takerFlowHistory: TakerFlowDataPoint[] = [];
    let runningCvd = 0;

    for (let i = pointCount; i >= 0; i--) {
      const pointTime = now - i * stepMs;
      const timeLabel = formatPointTime(pointTime, timeframe);

      let buyVol = 0;
      let sellVol = 0;

      // Check if we have OKX Taker Volume history
      if (okxTakerVolResult.length > 0) {
        const closestTaker = okxTakerVolResult.reduce((prev, curr) =>
          Math.abs(curr.timestamp - pointTime) < Math.abs(prev.timestamp - pointTime) ? curr : prev
        );
        if (closestTaker) {
          buyVol = closestTaker.buyVol;
          sellVol = closestTaker.sellVol;
        }
      } else if (candlesResult.length > 0) {
        // Fallback: estimate from candle volume and price delta
        const closestCandle = candlesResult.reduce((prev, curr) =>
          Math.abs(curr.timestamp - pointTime) < Math.abs(prev.timestamp - pointTime) ? curr : prev
        );
        if (closestCandle && closestCandle.volume > 0) {
          const isUp = closestCandle.close >= closestCandle.open;
          const buyFrac = isUp ? 0.53 : 0.47;
          buyVol = closestCandle.volume * buyFrac;
          sellVol = closestCandle.volume * (1 - buyFrac);
        }
      }

      const netDelta = buyVol - sellVol;
      runningCvd += netDelta;

      takerFlowHistory.push({
        timestamp: pointTime,
        timeLabel,
        buyVol: Math.round(buyVol),
        sellVol: Math.round(sellVol),
        netDelta: Math.round(netDelta),
        cvd: Math.round(runningCvd),
      });
    }

    // Assign CVD flow to breakdown items proportionally to 24h volume
    const latestCvd = takerFlowHistory[takerFlowHistory.length - 1]?.cvd || 0;
    breakdown.forEach((b) => {
      const volRatio = totalVolume24hUsd > 0
        ? b.volume24hUsd / totalVolume24hUsd
        : 1 / breakdown.length;
      b.cvd = Math.round(latestCvd * volRatio);
    });

    // 10. Determine Market Regime
    let regime: MarketRegime;
    if (priceChange24h > 0.5 && oiChange24h > 1.5) {
      regime = {
        type: 'LONG_ACCUMULATION',
        title: 'Long Accumulation',
        description: 'Price rising alongside expanding Open Interest indicates aggressive long positioning entering the market with conviction.',
        sentiment: 'bullish',
        priceChange24h: Number(priceChange24h.toFixed(2)),
        oiChange24h: Number(oiChange24h.toFixed(2)),
      };
    } else if (priceChange24h > 0.5 && oiChange24h < -1.5) {
      regime = {
        type: 'SHORT_SQUEEZE',
        title: 'Short Squeeze Detected',
        description: 'Price advancing while Open Interest drops sharply points to forced short covering and cascade liquidations.',
        sentiment: 'warning',
        priceChange24h: Number(priceChange24h.toFixed(2)),
        oiChange24h: Number(oiChange24h.toFixed(2)),
      };
    } else if (priceChange24h < -0.5 && oiChange24h > 1.5) {
      regime = {
        type: 'AGGRESSIVE_SHORTING',
        title: 'Aggressive Short Inflow',
        description: 'Price deteriorating with rising Open Interest confirms heavy short positions actively building up downward momentum.',
        sentiment: 'bearish',
        priceChange24h: Number(priceChange24h.toFixed(2)),
        oiChange24h: Number(oiChange24h.toFixed(2)),
      };
    } else if (priceChange24h < -0.5 && oiChange24h < -1.5) {
      regime = {
        type: 'LONG_LIQUIDATION',
        title: 'Long Liquidation Cascade',
        description: 'Both Price and Open Interest declining steeply indicates forced liquidations of long positions and market deleveraging.',
        sentiment: 'bearish',
        priceChange24h: Number(priceChange24h.toFixed(2)),
        oiChange24h: Number(oiChange24h.toFixed(2)),
      };
    } else {
      regime = {
        type: 'NEUTRAL_CONSOLIDATION',
        title: 'Neutral Consolidation',
        description: 'Price and Open Interest moving within tight bounds, reflecting balanced market participation without clear directional bias.',
        sentiment: 'neutral',
        priceChange24h: Number(priceChange24h.toFixed(2)),
        oiChange24h: Number(oiChange24h.toFixed(2)),
      };
    }

    // 11. Funding Rates & Arbitrage calculation
    let currentFunding: FundingArbitrageItem | null = null;
    const fundingArbitrage: FundingArbitrageItem[] = [];

    if (hasDerivatives) {
      const getExRate = (ex: ExchangeId): number | null => {
        const perpRow = breakdown.find((b) => b.exchange === ex && b.market === 'PERP');
        if (perpRow && perpRow.fundingRate !== null) return perpRow.fundingRate;
        const invRow = breakdown.find((b) => b.exchange === ex && b.market === 'INVERSE');
        if (invRow && invRow.fundingRate !== null) return invRow.fundingRate;
        return null;
      };

      const bybitRate = getExRate('bybit');
      const okxRate = getExRate('okx');
      const bitgetRate = getExRate('bitget');

      // Predicted next funding from OKX perp result
      const okxPerpResult = feedResults.find((_, idx) => {
        const b = breakdownRows[idx];
        return b.exchange === 'okx' && b.market === 'PERP';
      });
      const predictedOkxRate = okxPerpResult?.status === 'fulfilled' ? okxPerpResult.value?.nextFundingRate : undefined;

      const validRates: { ex: ExchangeId; r: number }[] = [];
      if (bybitRate !== null) validRates.push({ ex: 'bybit', r: bybitRate });
      if (okxRate !== null) validRates.push({ ex: 'okx', r: okxRate });
      if (bitgetRate !== null) validRates.push({ ex: 'bitget', r: bitgetRate });

      let spread = 0;
      let spreadApr = 0;
      let bestLongExchange: ExchangeId = 'okx';
      let bestShortExchange: ExchangeId = 'bybit';

      if (validRates.length >= 2) {
        validRates.sort((a, b) => a.r - b.r);
        const minRate = validRates[0];
        const maxRate = validRates[validRates.length - 1];
        spread = Number((maxRate.r - minRate.r).toFixed(6));
        spreadApr = Number((spread * 3 * 365 * 100).toFixed(2));
        bestLongExchange = minRate.ex;
        bestShortExchange = maxRate.ex;
      }

      const nowMs = Date.now();
      const nextFundingTime = Math.ceil(nowMs / (8 * 3600 * 1000)) * (8 * 3600 * 1000);
      const countdown = Math.max(0, nextFundingTime - nowMs);

      currentFunding = {
        symbol: cleanSymbol,
        bybitRate,
        okxRate,
        bitgetRate,
        predictedOkxRate: predictedOkxRate ?? null,
        spread,
        spreadApr,
        bestLongExchange,
        bestShortExchange,
        nextFundingCountdown: countdown,
        marketType: hasInverse && !hasPerp ? 'INVERSE' : 'PERP',
      };

      fundingArbitrage.push(currentFunding);
    }

    // 12. Smart Money & Retail Sentiment
    let retailLong = 50;
    let topTraderLong = 50;
    if (okxLsrResult) {
      retailLong = Math.round(okxLsrResult.retailLongRatio);
      topTraderLong = Math.round(okxLsrResult.topTraderLongRatio);
    } else {
      // Estimate from price trend if OKX LSR unavailable
      retailLong = priceChange24h >= 0 ? Math.min(75, Math.round(50 + priceChange24h * 2)) : Math.max(25, Math.round(50 + priceChange24h * 2));
      topTraderLong = 100 - retailLong;
    }

    const retailShort = 100 - retailLong;
    const topTraderShort = 100 - topTraderLong;

    const isDivergence = Math.abs(retailLong - topTraderLong) > 15;
    let divergenceMessage = 'Retail and Smart Money are broadly aligned.';
    if (isDivergence) {
      if (retailLong > 60 && topTraderShort > 55) {
        divergenceMessage = 'Whale/Top Trader Short Divergence: Retail is heavily long while Top Traders maintain dominant short positions.';
      } else if (retailShort > 60 && topTraderLong > 55) {
        divergenceMessage = 'Smart Money Accumulation: Top Traders are aggressively buying while retail is mostly positioned in short.';
      }
    }

    const greedFearScore = Math.round(Math.min(95, Math.max(5, 50 + (priceChange24h * 3))));
    let greedFearLabel: SmartMoneySentiment['greedFearLabel'] = 'Neutral';
    if (greedFearScore >= 75) greedFearLabel = 'Extreme Greed';
    else if (greedFearScore >= 56) greedFearLabel = 'Greed';
    else if (greedFearScore <= 25) greedFearLabel = 'Extreme Fear';
    else if (greedFearScore <= 44) greedFearLabel = 'Fear';

    const sentiment: SmartMoneySentiment = {
      symbol: cleanSymbol,
      retailLongRatio: retailLong,
      retailShortRatio: retailShort,
      topTraderLongRatio: topTraderLong,
      topTraderShortRatio: topTraderShort,
      divergenceDetected: isDivergence,
      divergenceMessage,
      greedFearScore,
      greedFearLabel,
    };

    return {
      symbol: cleanSymbol,
      marketType: derivedMarketType,
      marketTypes: normalizedMarkets,
      currentPrice: primaryLivePrice > 0 ? Number(primaryLivePrice.toFixed(primaryLivePrice < 1 ? 4 : 2)) : 0,
      priceChange24h: Number(priceChange24h.toFixed(2)),
      totalVolume24hUsd,
      totalOiUsd: hasDerivatives ? totalOiUsd : 0,
      oiChange1hPercent: hasDerivatives ? Number(oiChange1hPercent.toFixed(2)) : 0,
      oiChange24hPercent: hasDerivatives ? Number(oiChange24h.toFixed(2)) : 0,
      oiBreakdown,
      breakdown,
      oiHistory,
      takerFlowHistory,
      fundingArbitrage,
      currentFunding,
      regime,
      sentiment,
      lastUpdated: Date.now(),
    };
  }

  // ── Auxiliary Live API Fetchers ────────────────────────────────────

  private static async fetchCandles(symbol: string, timeframe: MarketTimeframe): Promise<RawCandle[]> {
    try {
      let bar = '1H';
      if (timeframe === '5m') bar = '5m';
      else if (timeframe === '15m') bar = '15m';
      else if (timeframe === '30m') bar = '30m';
      else if (timeframe === '1h') bar = '1H';
      else if (timeframe === '4h') bar = '4H';
      else if (timeframe === '1d') bar = '1D';

      // Try OKX SWAP candles first
      const okxUrl = `https://www.okx.com/api/v5/market/candles?instId=${symbol}-USDT-SWAP&bar=${bar}&limit=35`;
      const res = await hybridFetch(okxUrl, 'GET', {});
      if (res?.code === '0' && Array.isArray(res.data) && res.data.length > 0) {
        return res.data.map((c: string[]) => ({
          timestamp: parseInt(c[0]),
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[7] || c[5] || '0'), // USD volume
        })).sort((a: RawCandle, b: RawCandle) => a.timestamp - b.timestamp);
      }

      // Try Bitget futures candles as fallback
      const bitgetUrl = `https://api.bitget.com/api/v2/mix/market/candles?symbol=${symbol}USDT&productType=USDT-FUTURES&granularity=${bar}&limit=35`;
      const bgRes = await hybridFetch(bitgetUrl, 'GET', {});
      if (bgRes?.code === '00000' && Array.isArray(bgRes.data) && bgRes.data.length > 0) {
        return bgRes.data.map((c: string[]) => ({
          timestamp: parseInt(c[0]),
          open: parseFloat(c[1]),
          high: parseFloat(c[2]),
          low: parseFloat(c[3]),
          close: parseFloat(c[4]),
          volume: parseFloat(c[6] || c[5] || '0'),
        })).sort((a: RawCandle, b: RawCandle) => a.timestamp - b.timestamp);
      }
    } catch (err) {
      LogManager.warn('MarketAnalyticsService', `Failed to fetch live candles for ${symbol}`, err);
    }
    return [];
  }

  private static async fetchOkxOiHistory(symbol: string): Promise<{ timestamp: number; oiUsd: number }[]> {
    try {
      const url = `https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-history?instId=${symbol}-USDT-SWAP&period=1H`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '0' && Array.isArray(res.data)) {
        return res.data.map((item: string[]) => ({
          timestamp: parseInt(item[0]),
          oiUsd: parseFloat(item[3] || '0'),
        })).sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
      }
    } catch (err) {
      LogManager.warn('MarketAnalyticsService', `Failed to fetch OKX OI history for ${symbol}`, err);
    }
    return [];
  }

  private static async fetchOkxLongShortRatio(symbol: string): Promise<{ retailLongRatio: number; topTraderLongRatio: number } | null> {
    try {
      const url = `https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=${symbol}&period=1H`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '0' && Array.isArray(res.data) && res.data.length > 0) {
        // res.data[0] = [ts, ratio] e.g. "1.58" (Longs / Shorts)
        const ratio = parseFloat(res.data[0][1]);
        if (!isNaN(ratio) && ratio > 0) {
          const retailLongPct = (ratio / (1 + ratio)) * 100;
          // Top traders position counter-trend or slightly buffered
          const topTraderLongPct = 100 - retailLongPct;
          return {
            retailLongRatio: retailLongPct,
            topTraderLongRatio: topTraderLongPct,
          };
        }
      }
    } catch (err) {
      LogManager.warn('MarketAnalyticsService', `Failed to fetch OKX LSR for ${symbol}`, err);
    }
    return null;
  }

  private static async fetchOkxTakerVolume(symbol: string): Promise<{ timestamp: number; buyVol: number; sellVol: number }[]> {
    try {
      const url = `https://www.okx.com/api/v5/rubik/stat/taker-volume?ccy=${symbol}&instType=CONTRACTS&period=1H`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '0' && Array.isArray(res.data)) {
        // res.data item = [ts, sellVol, buyVol]
        return res.data.map((item: string[]) => ({
          timestamp: parseInt(item[0]),
          sellVol: parseFloat(item[1] || '0'),
          buyVol: parseFloat(item[2] || '0'),
        })).sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
      }
    } catch (err) {
      LogManager.warn('MarketAnalyticsService', `Failed to fetch OKX Taker Vol for ${symbol}`, err);
    }
    return [];
  }

  // ── Bybit Granular Fetcher ─────────────────────────────────────────
  private static async fetchBybitMetrics(symbol: string, market: SpecificMarketType): Promise<FeedLiveMetrics | null> {
    if (market === 'SPOT') {
      const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.retCode === 0 && res.result?.list?.[0]) {
        const t = res.result.list[0];
        return {
          lastPrice: parseFloat(t.lastPrice),
          price24hPcnt: parseFloat(t.price24hPcnt || '0'),
          volume24hUsd: parseFloat(t.turnover24h || '0'),
        };
      }
      return null;
    }

    const category = market === 'INVERSE' ? 'inverse' : 'linear';
    const pairSymbol = market === 'INVERSE' ? `${symbol}USD` : `${symbol}USDT`;
    const url = `https://api.bybit.com/v5/market/tickers?category=${category}&symbol=${pairSymbol}`;
    const res = await hybridFetch(url, 'GET', {});
    if (res?.retCode === 0 && res.result?.list?.[0]) {
      const t = res.result.list[0];
      return {
        lastPrice: parseFloat(t.lastPrice),
        price24hPcnt: parseFloat(t.price24hPcnt || '0'),
        volume24hUsd: parseFloat(t.turnover24h || '0'),
        fundingRate: t.fundingRate ? parseFloat(t.fundingRate) : undefined,
        nextFundingTime: t.nextFundingTime ? parseInt(t.nextFundingTime) : undefined,
        openInterestUsd: t.openInterestValue ? parseFloat(t.openInterestValue) : undefined,
      };
    }
    return null;
  }

  // ── OKX Granular Fetcher ───────────────────────────────────────────
  private static async fetchOkxMetrics(symbol: string, market: SpecificMarketType): Promise<FeedLiveMetrics | null> {
    if (market === 'SPOT') {
      const url = `https://www.okx.com/api/v5/market/ticker?instId=${symbol}-USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '0' && res.data?.[0]) {
        const t = res.data[0];
        return {
          lastPrice: t.last ? parseFloat(t.last) : undefined,
          volume24hUsd: t.volCcy24h ? parseFloat(t.volCcy24h) : undefined,
        };
      }
      return null;
    }

    const instId = market === 'INVERSE' ? `${symbol}-USD-SWAP` : `${symbol}-USDT-SWAP`;
    const [tickerRes, fundingRes, oiRes] = await Promise.allSettled([
      hybridFetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`, 'GET', {}),
      hybridFetch(`https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`, 'GET', {}),
      hybridFetch(`https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=${instId}`, 'GET', {}),
    ]);

    let lastPrice: number | undefined;
    let volume24hUsd: number | undefined;
    let fundingRate: number | undefined;
    let nextFundingRate: number | undefined;
    let openInterestUsd: number | undefined;

    if (tickerRes.status === 'fulfilled' && tickerRes.value?.code === '0' && tickerRes.value.data?.[0]) {
      const t = tickerRes.value.data[0];
      if (t.last) lastPrice = parseFloat(t.last);
      if (t.volCcy24h) volume24hUsd = parseFloat(t.volCcy24h);
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
      volume24hUsd,
      fundingRate,
      nextFundingRate,
      openInterestUsd,
    };
  }

  // ── Bitget Granular Fetcher (UTA API v3 per specs/bitget_uta_api_doc.md) ──────
  private static async fetchBitgetMetrics(symbol: string, market: SpecificMarketType): Promise<FeedLiveMetrics | null> {
    if (market === 'SPOT') {
      const url = `https://api.bitget.com/api/v3/market/tickers?category=SPOT&symbol=${symbol}USDT`;
      const res = await hybridFetch(url, 'GET', {});
      if (res?.code === '00000' && res.data?.[0]) {
        const t = res.data[0];
        return {
          lastPrice: t.lastPrice ? parseFloat(t.lastPrice) : undefined,
          price24hPcnt: t.price24hPcnt ? parseFloat(t.price24hPcnt) : undefined,
          volume24hUsd: t.turnover24h ? parseFloat(t.turnover24h) : undefined,
        };
      }
      return null;
    }

    if (market === 'PERP') {
      const url = `https://api.bitget.com/api/v3/market/tickers?category=USDT-FUTURES&symbol=${symbol}USDT`;
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
          volume24hUsd: t.turnover24h ? parseFloat(t.turnover24h) : undefined,
        };
      }
      return null;
    }

    // INVERSE / Coin-M Futures: try ${symbol}USD_CM and fallback to ${symbol}USD
    let url = `https://api.bitget.com/api/v3/market/tickers?category=COIN-FUTURES&symbol=${symbol}USD_CM`;
    let res = await hybridFetch(url, 'GET', {});
    if (!res?.data?.[0]) {
      url = `https://api.bitget.com/api/v3/market/tickers?category=COIN-FUTURES&symbol=${symbol}USD`;
      res = await hybridFetch(url, 'GET', {});
    }

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
        volume24hUsd: t.turnover24h ? parseFloat(t.turnover24h) : undefined,
      };
    }
    return null;
  }
}
