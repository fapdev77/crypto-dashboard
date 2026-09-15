import { ExchangeId } from '../../types/marketAnalytics';
import {
  InverseAssetAggregated,
  InverseAssetExchangeMetric,
} from '../../types/marketAnalytics';
import { hybridFetch } from '../../utils/proxyFetch';
import { getAllFundingSummaries } from '../historyCache';
import { useSettingsStore } from '../../store/settingsStore';
import { LogManager } from '../logger';

// Standard names for popular crypto assets
const ASSET_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  AVAX: 'Avalanche',
  DOT: 'Polkadot',
  LINK: 'Chainlink',
  LTC: 'Litecoin',
  BCH: 'Bitcoin Cash',
  NEAR: 'NEAR Protocol',
  SUI: 'Sui',
  APT: 'Aptos',
  ATOM: 'Cosmos',
  UNI: 'Uniswap',
  ETC: 'Ethereum Classic',
  FIL: 'Filecoin',
  TRX: 'TRON',
  BNB: 'BNB',
};

export class InverseMarketService {
  private static cachedData: InverseAssetAggregated[] | null = null;
  private static lastFetchTime = 0;
  private static CACHE_TTL_MS = 5000; // 5 seconds in-memory cache

  /**
   * Normalize an exchange symbol string to clean base ticker (e.g. BTCUSD_CM -> BTC, BTC-USD-SWAP -> BTC)
   */
  public static extractBaseSymbol(raw: string): string {
    return (raw || '')
      .toUpperCase()
      .replace(/_CM$/, '')
      .replace(/-USD-SWAP$/, '')
      .replace(/-SWAP$/, '')
      .replace(/USD$/, '')
      .replace(/USDT$/, '')
      .replace(/^1000/, '')
      .trim();
  }

  /**
   * Main entrypoint to fetch all Coin-M (Inverse) assets with market and funding metrics
   */
  public static async fetchInverseMarketOverview(forceRefresh = false): Promise<InverseAssetAggregated[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedData && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedData;
    }

    const useMockData = useSettingsStore.getState().useMockData;
    if (useMockData) {
      const mockResult = this.generateMockInverseOverview();
      this.cachedData = mockResult;
      this.lastFetchTime = now;
      return mockResult;
    }

    try {
      // 1. Parallel batch fetch from Bybit, Bitget UTA v3, OKX (tickers, open-interest, funding rates), and local funding cache
      const [
        bybitRes,
        bitgetRes,
        bitgetFundRes,
        okxRes,
        okxOiRes,
        okxFundRes,
        summaries,
      ] = await Promise.allSettled([
        hybridFetch('https://api.bybit.com/v5/market/tickers?category=inverse', 'GET', {}),
        hybridFetch('https://api.bitget.com/api/v3/market/tickers?category=COIN-FUTURES', 'GET', {}),
        hybridFetch('https://api.bitget.com/api/v3/market/current-fund-rate?category=COIN-FUTURES', 'GET', {}),
        hybridFetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP', 'GET', {}),
        hybridFetch('https://www.okx.com/api/v5/public/open-interest?instType=SWAP', 'GET', {}),
        hybridFetch('https://www.okx.com/api/v5/public/funding-rate?instId=ANY', 'GET', {}),
        getAllFundingSummaries(),
      ]);

      const standard8hFundingTime = Math.ceil(now / (8 * 3600 * 1000)) * (8 * 3600 * 1000);

      // Map Bitget funding rates and next settlement time
      const bitgetFundMap = new Map<string, { fundingRate: number; nextFundingTime: number | null }>();
      if (bitgetFundRes.status === 'fulfilled' && bitgetFundRes.value?.code === '00000' && Array.isArray(bitgetFundRes.value.data)) {
        for (const item of bitgetFundRes.value.data) {
          const sym = item.symbol || '';
          const rate = item.fundingRate ? parseFloat(item.fundingRate) : null;
          const nextTime = item.nextUpdate && parseInt(item.nextUpdate) > 0 ? parseInt(item.nextUpdate) : null;
          if (sym && rate !== null) {
            bitgetFundMap.set(sym.toUpperCase(), { fundingRate: rate, nextFundingTime: nextTime });
            const base = this.extractBaseSymbol(sym);
            if (base) {
              bitgetFundMap.set(base, { fundingRate: rate, nextFundingTime: nextTime });
            }
          }
        }
      }

      // Map OKX Open Interest (oiUsd and oiCcy) by instId
      const okxOiMap = new Map<string, { oiUsd: number; oiCcy: number }>();
      if (okxOiRes.status === 'fulfilled' && okxOiRes.value?.code === '0' && Array.isArray(okxOiRes.value.data)) {
        for (const item of okxOiRes.value.data) {
          const id = item.instId || '';
          if (id.endsWith('-USD-SWAP')) {
            okxOiMap.set(id.toUpperCase(), {
              oiUsd: item.oiUsd ? parseFloat(item.oiUsd) : 0,
              oiCcy: item.oiCcy ? parseFloat(item.oiCcy) : 0,
            });
          }
        }
      }

      // Map OKX current/next funding rates and settlement time by instId
      const okxFundMap = new Map<string, { fundingRate: number; nextFundingTime: number | null }>();
      if (okxFundRes.status === 'fulfilled' && okxFundRes.value?.code === '0' && Array.isArray(okxFundRes.value.data)) {
        for (const item of okxFundRes.value.data) {
          const id = item.instId || '';
          if (id.endsWith('-USD-SWAP')) {
            const rawRate = item.fundingRate || item.nextFundingRate || '';
            const rate = rawRate ? parseFloat(rawRate) : null;
            const timeStr = item.fundingTime || item.nextFundingTime || '';
            const nextTime = timeStr && parseInt(timeStr) > 0 ? parseInt(timeStr) : null;
            if (rate !== null) {
              okxFundMap.set(id.toUpperCase(), { fundingRate: rate, nextFundingTime: nextTime });
            }
          }
        }
      }

      // Map funding summaries by `${exchange}-${symbol}` and base coin
      const fundingSummaryMap = new Map<string, {
        todaySum: number;
        currentMonthSum: number;
        last3MonthsSum: number;
      }>();

      if (summaries.status === 'fulfilled' && Array.isArray(summaries.value)) {
        for (const s of summaries.value) {
          if (s.instrumentType === 'COIN-M') {
            const key = `${s.exchange}-${s.symbol.toUpperCase()}`;
            fundingSummaryMap.set(key, {
              todaySum: parseFloat(s.todayFundingRate || '0'),
              currentMonthSum: parseFloat(s.currentMonthFundingRate || '0'),
              last3MonthsSum: parseFloat(s.last3MonthsFundingRate || '0'),
            });
          }
        }
      }

      // Map of coin -> exchange -> metric
      const assetMap = new Map<string, Record<ExchangeId, InverseAssetExchangeMetric | null>>();

      const ensureAssetRecord = (coin: string) => {
        if (!assetMap.has(coin)) {
          assetMap.set(coin, { bybit: null, okx: null, bitget: null });
        }
        return assetMap.get(coin)!;
      };

      // ── Process Bybit Inverse Tickers ──
      if (bybitRes.status === 'fulfilled' && bybitRes.value?.retCode === 0 && Array.isArray(bybitRes.value.result?.list)) {
        for (const item of bybitRes.value.result.list) {
          const rawSymbol = item.symbol || '';
          const coin = this.extractBaseSymbol(rawSymbol);
          if (!coin) continue;

          const price = parseFloat(item.lastPrice || '0');
          if (price <= 0) continue;

          const high24h = parseFloat(item.highPrice24h || '0') || price;
          const low24h = parseFloat(item.lowPrice24h || '0') || price;
          const price24hPcnt = parseFloat(item.price24hPcnt || '0') * 100; // Bybit sends decimal e.g. 0.023

          // Bybit V5 Inverse contracts:
          // volume24h = trading volume in USD contracts (1 contract = 1 USD for BTC/ETH)
          // turnover24h = turnover in native coin units (e.g. BTC)
          // openInterest = open interest in USD contracts
          // openInterestValue = open interest in native coin units
          const volume24hUsd = parseFloat(item.volume24h || '0') || (parseFloat(item.turnover24h || '0') * price);
          const volume24hCoin = parseFloat(item.turnover24h || '0') || (price > 0 ? volume24hUsd / price : 0);

          let openInterestUsd: number | null = null;
          let openInterestCoin: number | null = null;
          if (item.openInterest) {
            openInterestUsd = parseFloat(item.openInterest);
            openInterestCoin = item.openInterestValue ? parseFloat(item.openInterestValue) : (price > 0 ? openInterestUsd / price : null);
          } else if (item.openInterestValue) {
            openInterestCoin = parseFloat(item.openInterestValue);
            openInterestUsd = openInterestCoin * price;
          }

          const nextFundingRate = item.fundingRate ? parseFloat(item.fundingRate) : null;
          const nextFundingTime = item.nextFundingTime && parseInt(item.nextFundingTime) > 0
            ? parseInt(item.nextFundingTime)
            : standard8hFundingTime;
          const fundingApr = nextFundingRate !== null ? Number((nextFundingRate * 3 * 365 * 100).toFixed(2)) : null;

          // Lookup historical funding
          const histKey = `bybit-${rawSymbol.toUpperCase()}`;
          const hist = fundingSummaryMap.get(histKey);

          const record = ensureAssetRecord(coin);
          record.bybit = {
            exchange: 'bybit',
            pairSymbol: rawSymbol,
            price,
            price24hPcnt,
            high24h,
            low24h,
            volume24hCoin,
            volume24hUsd,
            openInterestUsd,
            openInterestCoin,
            nextFundingRate,
            nextFundingTime,
            fundingApr,
            todaySum: hist ? hist.todaySum : (nextFundingRate ? nextFundingRate * 2 : null),
            currentMonthSum: hist ? hist.currentMonthSum : (nextFundingRate ? nextFundingRate * 30 : null),
            last3MonthsSum: hist ? hist.last3MonthsSum : (nextFundingRate ? nextFundingRate * 90 : null),
          };
        }
      }

      // ── Process Bitget UTA v3 Coin-M Tickers ──
      if (bitgetRes.status === 'fulfilled' && bitgetRes.value?.code === '00000' && Array.isArray(bitgetRes.value.data)) {
        for (const item of bitgetRes.value.data) {
          const rawSymbol = item.symbol || '';
          const coin = this.extractBaseSymbol(rawSymbol);
          if (!coin) continue;

          const price = parseFloat(item.lastPrice || '0');
          if (price <= 0) continue;

          const high24h = parseFloat(item.highPrice24h || '0') || price;
          const low24h = parseFloat(item.lowPrice24h || '0') || price;
          const price24hPcnt = parseFloat(item.price24hPcnt || '0') * 100;

          // Bitget UTA v3 COIN-FUTURES:
          // turnover24h = USD turnover
          // volume24h = coin units volume
          // openInterest = open interest in coin units
          // openInterestValue = open interest in USD (if present)
          const rawTurnover = parseFloat(item.turnover24h || '0');
          const rawBaseVol = parseFloat(item.volume24h || '0');
          const volume24hUsd = rawTurnover > 0 ? rawTurnover : (rawBaseVol > 0 && price > 0 ? rawBaseVol * price : 0);
          const volume24hCoin = rawBaseVol > 0 ? rawBaseVol : (price > 0 && volume24hUsd > 0 ? volume24hUsd / price : 0);

          const oiCoin = item.openInterest ? parseFloat(item.openInterest) : null;
          let openInterestUsd: number | null = null;
          if (item.openInterestValue) {
            openInterestUsd = parseFloat(item.openInterestValue);
          } else if (oiCoin !== null && price > 0) {
            openInterestUsd = oiCoin * price;
          }

          const fundEntry = bitgetFundMap.get(rawSymbol.toUpperCase()) || bitgetFundMap.get(coin);
          const nextFundingRate = fundEntry?.fundingRate ?? (item.fundingRate ? parseFloat(item.fundingRate) : null);
          const nextFundingTime = fundEntry?.nextFundingTime ?? standard8hFundingTime;
          const fundingApr = nextFundingRate !== null ? Number((nextFundingRate * 3 * 365 * 100).toFixed(2)) : null;

          const histKey = `bitget-${rawSymbol.toUpperCase()}`;
          const hist = fundingSummaryMap.get(histKey);

          const record = ensureAssetRecord(coin);
          record.bitget = {
            exchange: 'bitget',
            pairSymbol: rawSymbol,
            price,
            price24hPcnt,
            high24h,
            low24h,
            volume24hCoin,
            volume24hUsd,
            openInterestUsd,
            openInterestCoin: oiCoin,
            nextFundingRate,
            nextFundingTime,
            fundingApr,
            todaySum: hist ? hist.todaySum : (nextFundingRate ? nextFundingRate * 2 : null),
            currentMonthSum: hist ? hist.currentMonthSum : (nextFundingRate ? nextFundingRate * 30 : null),
            last3MonthsSum: hist ? hist.last3MonthsSum : (nextFundingRate ? nextFundingRate * 90 : null),
          };
        }
      }

      // ── Process OKX SWAP Tickers (filter -USD-SWAP) ──
      if (okxRes.status === 'fulfilled' && okxRes.value?.code === '0' && Array.isArray(okxRes.value.data)) {
        for (const item of okxRes.value.data) {
          const rawInstId = item.instId || '';
          if (!rawInstId.endsWith('-USD-SWAP')) continue;

          const coin = this.extractBaseSymbol(rawInstId);
          if (!coin) continue;

          const price = parseFloat(item.last || '0');
          if (price <= 0) continue;

          const high24h = parseFloat(item.high24h || '0') || price;
          const low24h = parseFloat(item.low24h || '0') || price;
          const open24h = parseFloat(item.open24h || item.sodUtc0 || '0') || price;
          const price24hPcnt = open24h > 0 ? ((price - open24h) / open24h) * 100 : 0;

          // OKX SWAP (-USD-SWAP):
          // volCcy24h = 24h volume in base coin units (e.g. BTC)
          // vol24h = contracts
          // volume24hUsd = volCcy24h * price
          const volume24hCoin = parseFloat(item.volCcy24h || '0');
          const volume24hUsd = volume24hCoin > 0 && price > 0 ? volume24hCoin * price : (parseFloat(item.vol24h || '0') * 100);

          const oiEntry = okxOiMap.get(rawInstId.toUpperCase());
          const openInterestUsd = oiEntry?.oiUsd ?? null;
          const openInterestCoin = oiEntry?.oiCcy ?? (openInterestUsd && price > 0 ? openInterestUsd / price : null);

          const fundEntry = okxFundMap.get(rawInstId.toUpperCase());
          const nextFundingRate = fundEntry?.fundingRate ?? null;
          const nextFundingTime = fundEntry?.nextFundingTime ?? standard8hFundingTime;
          const fundingApr = nextFundingRate !== null ? Number((nextFundingRate * 3 * 365 * 100).toFixed(2)) : null;

          const histKey = `okx-${rawInstId.toUpperCase()}`;
          const hist = fundingSummaryMap.get(histKey);

          const record = ensureAssetRecord(coin);
          record.okx = {
            exchange: 'okx',
            pairSymbol: rawInstId,
            price,
            price24hPcnt,
            high24h,
            low24h,
            volume24hCoin,
            volume24hUsd,
            openInterestUsd,
            openInterestCoin,
            nextFundingRate,
            nextFundingTime,
            fundingApr,
            todaySum: hist ? hist.todaySum : (nextFundingRate ? nextFundingRate * 2 : null),
            currentMonthSum: hist ? hist.currentMonthSum : (nextFundingRate ? nextFundingRate * 30 : null),
            last3MonthsSum: hist ? hist.last3MonthsSum : (nextFundingRate ? nextFundingRate * 90 : null),
          };
        }
      }

      // ── Aggregate & Build Master Rows ──
      const results: InverseAssetAggregated[] = [];

      for (const [coin, exMap] of assetMap.entries()) {
        const validMetrics = Object.values(exMap).filter((m): m is InverseAssetExchangeMetric => m !== null);
        if (validMetrics.length === 0) continue;

        const activeExchanges = validMetrics.map((m) => m.exchange);

        // Benchmark Price: Prefer Bybit -> OKX -> Bitget
        const primaryMetric = exMap.bybit || exMap.okx || exMap.bitget || validMetrics[0];
        const price = primaryMetric.price;
        const price24hPcnt = Number(primaryMetric.price24hPcnt.toFixed(2));

        const high24h = Math.max(...validMetrics.map((m) => m.high24h));
        const low24h = Math.min(...validMetrics.map((m) => m.low24h));

        const totalVolumeCoin = validMetrics.reduce((sum, m) => sum + (m.volume24hCoin || 0), 0);
        const totalVolumeUsd = validMetrics.reduce((sum, m) => sum + (m.volume24hUsd || 0), 0);
        const totalOiUsd = validMetrics.reduce((sum, m) => sum + (m.openInterestUsd || 0), 0);

        // CVD Flow estimation based on buyer-seller momentum
        // Directional buyer ratio: 50% baseline + tilt by price change (-25% to +25%)
        const buyerTilt = Math.max(-25, Math.min(25, price24hPcnt * 2.5));
        const estimatedBuyerRatio = Number((50 + buyerTilt).toFixed(1));
        const buyerVolume = totalVolumeUsd * (estimatedBuyerRatio / 100);
        const sellerVolume = totalVolumeUsd * ((100 - estimatedBuyerRatio) / 100);
        const estimatedCvdUsd = Math.round(buyerVolume - sellerVolume);

        // Next funding aggregation
        const metricsWithFunding = validMetrics.filter((m) => m.nextFundingRate !== null);
        const nextFundingRate = metricsWithFunding.length > 0
          ? metricsWithFunding.reduce((acc, m) => acc + (m.nextFundingRate || 0), 0) / metricsWithFunding.length
          : null;

        // Next countdown: standard 8h funding cycle (00:00, 08:00, 16:00 UTC)
        const nowMs = Date.now();
        const nextSettlementMs = Math.ceil(nowMs / (8 * 3600 * 1000)) * (8 * 3600 * 1000);
        const nextFundingCountdown = Math.max(0, Math.floor((nextSettlementMs - nowMs) / 1000));

        // Funding history aggregation
        const todayMetrics = validMetrics.filter((m) => m.todaySum !== null);
        const todaySum = todayMetrics.length > 0
          ? todayMetrics.reduce((sum, m) => sum + (m.todaySum || 0), 0) / todayMetrics.length
          : null;

        const monthMetrics = validMetrics.filter((m) => m.currentMonthSum !== null);
        const currentMonthSum = monthMetrics.length > 0
          ? monthMetrics.reduce((sum, m) => sum + (m.currentMonthSum || 0), 0) / monthMetrics.length
          : null;

        const m3Metrics = validMetrics.filter((m) => m.last3MonthsSum !== null);
        const last3MonthsSum = m3Metrics.length > 0
          ? m3Metrics.reduce((sum, m) => sum + (m.last3MonthsSum || 0), 0) / m3Metrics.length
          : null;

        // Funding Spread APR
        const validAprs = validMetrics
          .filter((m) => m.fundingApr !== null)
          .map((m) => ({ ex: m.exchange, apr: m.fundingApr! }));

        let maxFundingSpreadApr: number | null = null;
        let bestLongExchange: ExchangeId | null = null;
        let bestShortExchange: ExchangeId | null = null;

        if (validAprs.length >= 2) {
          validAprs.sort((a, b) => a.apr - b.apr);
          const minApr = validAprs[0];
          const maxApr = validAprs[validAprs.length - 1];
          maxFundingSpreadApr = Number((maxApr.apr - minApr.apr).toFixed(2));
          bestLongExchange = minApr.ex; // Pay lowest rate
          bestShortExchange = maxApr.ex; // Receive highest rate
        }

        results.push({
          symbol: coin,
          name: ASSET_NAMES[coin] || coin,
          activeExchanges,
          price: Number(price.toFixed(price < 1 ? 4 : 2)),
          price24hPcnt,
          high24h: Number(high24h.toFixed(price < 1 ? 4 : 2)),
          low24h: Number(low24h.toFixed(price < 1 ? 4 : 2)),
          totalVolumeCoin: Math.round(totalVolumeCoin),
          totalVolumeUsd: Math.round(totalVolumeUsd),
          totalOiUsd: Math.round(totalOiUsd),
          estimatedCvdUsd,
          estimatedBuyerRatio,
          nextFundingRate: nextFundingRate !== null ? Number(nextFundingRate.toFixed(6)) : null,
          nextFundingCountdown,
          todaySum: todaySum !== null ? Number(todaySum.toFixed(6)) : null,
          currentMonthSum: currentMonthSum !== null ? Number(currentMonthSum.toFixed(6)) : null,
          last3MonthsSum: last3MonthsSum !== null ? Number(last3MonthsSum.toFixed(6)) : null,
          maxFundingSpreadApr,
          bestLongExchange,
          bestShortExchange,
          exchanges: exMap,
        });
      }

      // Sort by total volume descending (liquidity priority)
      results.sort((a, b) => b.totalVolumeUsd - a.totalVolumeUsd);

      this.cachedData = results;
      this.lastFetchTime = now;
      return results;
    } catch (err) {
      LogManager.warn('InverseMarketService', 'Batch fetch failed, fallback to simulation mode', err);
      const fallback = this.generateMockInverseOverview();
      this.cachedData = fallback;
      this.lastFetchTime = now;
      return fallback;
    }
  }

  /**
   * Generates realistic simulated Coin-M market data for offline / simulation mode
   */
  private static generateMockInverseOverview(): InverseAssetAggregated[] {
    const symbols = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'DOT', 'LINK', 'LTC', 'BCH', 'NEAR', 'SUI'];
    const basePrices: Record<string, number> = {
      BTC: 77400,
      ETH: 2540,
      SOL: 102.5,
      XRP: 1.36,
      DOGE: 0.084,
      ADA: 0.38,
      AVAX: 26.5,
      DOT: 4.8,
      LINK: 14.2,
      LTC: 88.5,
      BCH: 360,
      NEAR: 4.2,
      SUI: 1.85,
    };

    const nowMs = Date.now();
    const nextSettlementMs = Math.ceil(nowMs / (8 * 3600 * 1000)) * (8 * 3600 * 1000);
    const countdown = Math.max(0, Math.floor((nextSettlementMs - nowMs) / 1000));

    return symbols.map((coin) => {
      const p = basePrices[coin] || 10;
      const seed = coin.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const price24hPcnt = Number((Math.sin(seed) * 4.5).toFixed(2));
      const high24h = Number((p * (1 + 0.025 + Math.abs(Math.cos(seed) * 0.02))).toFixed(p < 1 ? 4 : 2));
      const low24h = Number((p * (1 - 0.02 - Math.abs(Math.sin(seed) * 0.015))).toFixed(p < 1 ? 4 : 2));

      const volUsd = Math.round((p > 1000 ? 800_000_000 : 80_000_000) * (0.8 + Math.abs(Math.sin(seed))));
      const volCoin = Math.round(volUsd / p);
      const totalOi = Math.round(volUsd * 0.65);

      const baseRate = 0.0001 + Math.sin(seed) * 0.00008;
      const bybitRate = Number((baseRate + 0.00002 * Math.cos(seed)).toFixed(6));
      const okxRate = Number((baseRate - 0.00003 * Math.sin(seed)).toFixed(6));
      const bitgetRate = Number((baseRate + 0.00004 * Math.sin(seed + 1)).toFixed(6));

      const bybitApr = Number((bybitRate * 3 * 365 * 100).toFixed(2));
      const okxApr = Number((okxRate * 3 * 365 * 100).toFixed(2));
      const bitgetApr = Number((bitgetRate * 3 * 365 * 100).toFixed(2));

      const rates = [
        { ex: 'bybit' as ExchangeId, apr: bybitApr },
        { ex: 'okx' as ExchangeId, apr: okxApr },
        { ex: 'bitget' as ExchangeId, apr: bitgetApr },
      ].sort((a, b) => a.apr - b.apr);

      const spreadApr = Number((rates[2].apr - rates[0].apr).toFixed(2));

      const buyerTilt = Math.max(-25, Math.min(25, price24hPcnt * 2.5));
      const estimatedBuyerRatio = Number((50 + buyerTilt).toFixed(1));
      const buyerVolume = volUsd * (estimatedBuyerRatio / 100);
      const sellerVolume = volUsd * ((100 - estimatedBuyerRatio) / 100);

      const exRecord: Record<ExchangeId, InverseAssetExchangeMetric | null> = {
        bybit: {
          exchange: 'bybit',
          pairSymbol: `${coin}USD`,
          price: p,
          price24hPcnt,
          high24h,
          low24h,
          volume24hCoin: Math.round(volCoin * 0.45),
          volume24hUsd: Math.round(volUsd * 0.45),
          openInterestUsd: Math.round(totalOi * 0.45),
          openInterestCoin: Math.round((totalOi * 0.45) / p),
          nextFundingRate: bybitRate,
          nextFundingTime: nextSettlementMs,
          fundingApr: bybitApr,
          todaySum: Number((bybitRate * 1.8).toFixed(6)),
          currentMonthSum: Number((bybitRate * 28).toFixed(6)),
          last3MonthsSum: Number((bybitRate * 85).toFixed(6)),
        },
        okx: {
          exchange: 'okx',
          pairSymbol: `${coin}-USD-SWAP`,
          price: Number((p * (1 + 0.0003 * Math.cos(seed))).toFixed(p < 1 ? 4 : 2)),
          price24hPcnt,
          high24h,
          low24h,
          volume24hCoin: Math.round(volCoin * 0.35),
          volume24hUsd: Math.round(volUsd * 0.35),
          openInterestUsd: Math.round(totalOi * 0.35),
          openInterestCoin: Math.round((totalOi * 0.35) / p),
          nextFundingRate: okxRate,
          nextFundingTime: nextSettlementMs,
          fundingApr: okxApr,
          todaySum: Number((okxRate * 1.9).toFixed(6)),
          currentMonthSum: Number((okxRate * 27).toFixed(6)),
          last3MonthsSum: Number((okxRate * 82).toFixed(6)),
        },
        bitget: {
          exchange: 'bitget',
          pairSymbol: `${coin}USD_CM`,
          price: Number((p * (1 - 0.0002 * Math.sin(seed))).toFixed(p < 1 ? 4 : 2)),
          price24hPcnt,
          high24h,
          low24h,
          volume24hCoin: Math.round(volCoin * 0.2),
          volume24hUsd: Math.round(volUsd * 0.2),
          openInterestUsd: Math.round(totalOi * 0.2),
          openInterestCoin: Math.round((totalOi * 0.2) / p),
          nextFundingRate: bitgetRate,
          nextFundingTime: nextSettlementMs,
          fundingApr: bitgetApr,
          todaySum: Number((bitgetRate * 2.1).toFixed(6)),
          currentMonthSum: Number((bitgetRate * 31).toFixed(6)),
          last3MonthsSum: Number((bitgetRate * 89).toFixed(6)),
        },
      };

      return {
        symbol: coin,
        name: ASSET_NAMES[coin] || coin,
        activeExchanges: ['bybit', 'okx', 'bitget'],
        price: p,
        price24hPcnt,
        high24h,
        low24h,
        totalVolumeCoin: volCoin,
        totalVolumeUsd: volUsd,
        totalOiUsd: totalOi,
        estimatedCvdUsd: Math.round(buyerVolume - sellerVolume),
        estimatedBuyerRatio,
        nextFundingRate: Number(((bybitRate + okxRate + bitgetRate) / 3).toFixed(6)),
        nextFundingCountdown: countdown,
        todaySum: Number(((bybitRate + okxRate + bitgetRate) / 3 * 1.9).toFixed(6)),
        currentMonthSum: Number(((bybitRate + okxRate + bitgetRate) / 3 * 29).toFixed(6)),
        last3MonthsSum: Number(((bybitRate + okxRate + bitgetRate) / 3 * 86).toFixed(6)),
        maxFundingSpreadApr: spreadApr,
        bestLongExchange: rates[0].ex,
        bestShortExchange: rates[2].ex,
        exchanges: exRecord,
      };
    });
  }
}
