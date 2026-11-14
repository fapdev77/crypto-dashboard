import {
  MarketType,
  SpecificMarketType,
  ExchangeId,
  MarketBreakdownEntry,
  MarketTimeframe,
  MarketAnalyticsSnapshot,
  OpenInterestDataPoint,
  TakerFlowDataPoint,
  FundingArbitrageItem,
  MarketRegime,
  SmartMoneySentiment,
} from '../types/marketAnalytics';

export const POPULAR_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'AVAX', 'BNB', 'LINK', 'ADA', 'SUI'];

interface SymbolMeta {
  basePrice: number;
  baseOiUsd: number;
  volatility: number;
  avgVolume24h: number;
}

const SYMBOL_BASE_META: Record<string, SymbolMeta> = {
  BTC: { basePrice: 65420, baseOiUsd: 18_450_000_000, volatility: 0.015, avgVolume24h: 32_500_000_000 },
  ETH: { basePrice: 3480, baseOiUsd: 9_200_000_000, volatility: 0.022, avgVolume24h: 16_100_000_000 },
  SOL: { basePrice: 152.4, baseOiUsd: 2_650_000_000, volatility: 0.035, avgVolume24h: 4_800_000_000 },
  XRP: { basePrice: 0.584, baseOiUsd: 980_000_000, volatility: 0.028, avgVolume24h: 1_450_000_000 },
  DOGE: { basePrice: 0.124, baseOiUsd: 740_000_000, volatility: 0.042, avgVolume24h: 920_000_000 },
  AVAX: { basePrice: 28.6, baseOiUsd: 410_000_000, volatility: 0.038, avgVolume24h: 580_000_000 },
  BNB: { basePrice: 574.5, baseOiUsd: 1_250_000_000, volatility: 0.018, avgVolume24h: 1_100_000_000 },
  LINK: { basePrice: 13.85, baseOiUsd: 320_000_000, volatility: 0.032, avgVolume24h: 430_000_000 },
  ADA: { basePrice: 0.362, baseOiUsd: 290_000_000, volatility: 0.030, avgVolume24h: 380_000_000 },
  SUI: { basePrice: 1.82, baseOiUsd: 450_000_000, volatility: 0.045, avgVolume24h: 750_000_000 },
  PEPE: { basePrice: 0.0000098, baseOiUsd: 380_000_000, volatility: 0.055, avgVolume24h: 890_000_000 },
  SHIB: { basePrice: 0.0000185, baseOiUsd: 290_000_000, volatility: 0.048, avgVolume24h: 410_000_000 },
  WIF: { basePrice: 2.15, baseOiUsd: 340_000_000, volatility: 0.060, avgVolume24h: 620_000_000 },
  NEAR: { basePrice: 4.85, baseOiUsd: 260_000_000, volatility: 0.038, avgVolume24h: 340_000_000 },
  ARB: { basePrice: 0.58, baseOiUsd: 210_000_000, volatility: 0.040, avgVolume24h: 280_000_000 },
  OP: { basePrice: 1.55, baseOiUsd: 190_000_000, volatility: 0.042, avgVolume24h: 220_000_000 },
  TAO: { basePrice: 325.0, baseOiUsd: 180_000_000, volatility: 0.052, avgVolume24h: 290_000_000 },
  RENDER: { basePrice: 6.40, baseOiUsd: 160_000_000, volatility: 0.046, avgVolume24h: 240_000_000 },
  FET: { basePrice: 1.38, baseOiUsd: 150_000_000, volatility: 0.050, avgVolume24h: 210_000_000 },
  APT: { basePrice: 8.25, baseOiUsd: 195_000_000, volatility: 0.042, avgVolume24h: 260_000_000 },
  INJ: { basePrice: 21.40, baseOiUsd: 170_000_000, volatility: 0.044, avgVolume24h: 190_000_000 },
  TIA: { basePrice: 5.60, baseOiUsd: 185_000_000, volatility: 0.048, avgVolume24h: 230_000_000 },
  TON: { basePrice: 5.45, baseOiUsd: 310_000_000, volatility: 0.028, avgVolume24h: 380_000_000 },
  AAVE: { basePrice: 145.20, baseOiUsd: 210_000_000, volatility: 0.036, avgVolume24h: 270_000_000 },
  UNI: { basePrice: 7.80, baseOiUsd: 160_000_000, volatility: 0.034, avgVolume24h: 195_000_000 },
  PENDLE: { basePrice: 4.15, baseOiUsd: 135_000_000, volatility: 0.045, avgVolume24h: 180_000_000 },
  ONDO: { basePrice: 0.76, baseOiUsd: 140_000_000, volatility: 0.048, avgVolume24h: 190_000_000 },
  BONK: { basePrice: 0.000021, baseOiUsd: 165_000_000, volatility: 0.058, avgVolume24h: 270_000_000 },
  FLOKI: { basePrice: 0.000145, baseOiUsd: 120_000_000, volatility: 0.054, avgVolume24h: 190_000_000 },
  WLD: { basePrice: 1.85, baseOiUsd: 175_000_000, volatility: 0.052, avgVolume24h: 260_000_000 },
  DOT: { basePrice: 4.40, baseOiUsd: 230_000_000, volatility: 0.032, avgVolume24h: 210_000_000 },
  POL: { basePrice: 0.38, baseOiUsd: 145_000_000, volatility: 0.038, avgVolume24h: 180_000_000 },
  KAS: { basePrice: 0.165, baseOiUsd: 110_000_000, volatility: 0.042, avgVolume24h: 150_000_000 },
  SEI: { basePrice: 0.34, baseOiUsd: 125_000_000, volatility: 0.046, avgVolume24h: 170_000_000 },
  JUP: { basePrice: 0.88, baseOiUsd: 115_000_000, volatility: 0.044, avgVolume24h: 160_000_000 },
  ENA: { basePrice: 0.32, baseOiUsd: 105_000_000, volatility: 0.052, avgVolume24h: 155_000_000 },
};

export function getTimeframeStepMs(tf: MarketTimeframe): number {
  switch (tf) {
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '1d':
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

export function formatPointTime(ts: number, tf: MarketTimeframe): string {
  const d = new Date(ts);
  if (tf === '1d') {
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  }
  const hours = d.getUTCHours().toString().padStart(2, '0');
  const minutes = d.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Deterministic feed hash for distinct seed generation across exchanges and markets */
export function getFeedSeed(ex: string, m: string): number {
  const str = `${ex}_${m}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateMockSnapshot(
  symbol: string,
  markets: MarketType | SpecificMarketType[] = 'ALL',
  timeframe: MarketTimeframe = '1h',
  activeExchanges: string[] = ['bybit', 'okx', 'bitget']
): MarketAnalyticsSnapshot {
  const coin = symbol.toUpperCase().replace(/USDT$|USD$|-SWAP$/, '');
  const meta = SYMBOL_BASE_META[coin] || {
    basePrice: 100,
    baseOiUsd: 500_000_000,
    volatility: 0.025,
    avgVolume24h: 750_000_000,
  };

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

  // Adjust for market type (OI only sums derivatives)
  let marketOiMultiplier = 0;
  if (hasPerp && hasInverse) marketOiMultiplier = 1.0;
  else if (hasPerp) marketOiMultiplier = 0.75;
  else if (hasInverse) marketOiMultiplier = 0.25;

  const stepMs = getTimeframeStepMs(timeframe);
  const pointCount = 30; // 30 candles/intervals
  const now = Date.now();

  const oiHistory: OpenInterestDataPoint[] = [];
  const takerFlowHistory: TakerFlowDataPoint[] = [];

  let currentPrice = meta.basePrice;
  let runningCvd = 0;
  let runningOi = meta.baseOiUsd * marketOiMultiplier;

  // Pseudo-random walk with deterministic seed based on symbol char codes
  const seed = coin.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  for (let i = pointCount; i >= 0; i--) {
    const timestamp = now - i * stepMs;
    const timeLabel = formatPointTime(timestamp, timeframe);

    const sinWave = Math.sin((timestamp / (stepMs * 10)) + seed);
    const cosWave = Math.cos((timestamp / (stepMs * 7)) + seed);
    
    // Price variation
    const priceDelta = (sinWave * 0.006 + cosWave * 0.004) * meta.basePrice;
    currentPrice = Math.max(0.0001, meta.basePrice + priceDelta);

    // OI variation
    const oiDeltaPercent = (sinWave * 0.012 + (i % 3 === 0 ? 0.008 : -0.005));
    runningOi = Math.max(10_000, runningOi * (1 + oiDeltaPercent));

    // Exchange share breakdown (Bybit ~45%, OKX ~35%, Bitget ~20%)
    const bybitRatio = 0.45 + (sinWave * 0.03);
    const okxRatio = 0.35 - (cosWave * 0.02);
    const bitgetRatio = Math.max(0.05, 1 - (bybitRatio + okxRatio));

    const bybitOi = runningOi * bybitRatio;
    const okxOi = runningOi * okxRatio;
    const bitgetOi = runningOi * bitgetRatio;

    oiHistory.push({
      timestamp,
      timeLabel,
      price: Number(currentPrice.toFixed(meta.basePrice < 1 ? 4 : 2)),
      totalOiUsd: Math.round(runningOi),
      bybitOiUsd: Math.round(bybitOi),
      okxOiUsd: Math.round(okxOi),
      bitgetOiUsd: Math.round(bitgetOi),
      oiChangePercent: Number((oiDeltaPercent * 100).toFixed(2)),
    });

    // Taker Flow
    const intervalVol = (meta.avgVolume24h / (24 * (60 / (stepMs / 60000)))) * (0.8 + Math.abs(cosWave) * 0.5);
    const buyerBias = 0.5 + (sinWave * 0.1); // 40% to 60%
    const buyVol = intervalVol * buyerBias;
    const sellVol = intervalVol * (1 - buyerBias);
    const netDelta = buyVol - sellVol;
    runningCvd += netDelta;

    takerFlowHistory.push({
      timestamp,
      timeLabel,
      buyVol: Math.round(buyVol),
      sellVol: Math.round(sellVol),
      netDelta: Math.round(netDelta),
      cvd: Math.round(runningCvd),
    });
  }

  const latestOi = oiHistory[oiHistory.length - 1];
  const latestTaker = takerFlowHistory[takerFlowHistory.length - 1] || { cvd: 0 };
  const initialOi = oiHistory[0];
  const oiChange24h = ((latestOi.totalOiUsd - initialOi.totalOiUsd) / (initialOi.totalOiUsd || 1)) * 100;
  const priceChange24h = ((latestOi.price - initialOi.price) / (initialOi.price || 1)) * 100;

  // Determine market regime
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

  // Funding arbitrage generation
  const nowMs = Date.now();
  const nextFundingTime = Math.ceil(nowMs / (8 * 3600 * 1000)) * (8 * 3600 * 1000);
  const countdown = Math.max(0, nextFundingTime - nowMs);

  const makeArbitrageItem = (sym: string): FundingArbitrageItem => {
    const sSeed = sym.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const baseRate = 0.0001 + (Math.sin(sSeed) * 0.00025); // ~0.01% standard
    
    // Spread differences across exchanges
    const bybitRate = Number((baseRate + 0.00008 * Math.cos(sSeed)).toFixed(6));
    const okxRate = Number((baseRate - 0.00005 * Math.sin(sSeed)).toFixed(6));
    const bitgetRate = Number((baseRate + 0.00012 * Math.sin(sSeed + 2)).toFixed(6));
    const predictedOkxRate = Number((okxRate + 0.00004 * Math.cos(sSeed)).toFixed(6));

    const rates = [
      { ex: 'bybit' as const, rate: bybitRate },
      { ex: 'okx' as const, rate: okxRate },
      { ex: 'bitget' as const, rate: bitgetRate },
    ].sort((a, b) => a.rate - b.rate);

    const minEx = rates[0];
    const maxEx = rates[rates.length - 1];
    const spread = Number((maxEx.rate - minEx.rate).toFixed(6));
    const spreadApr = Number((spread * 3 * 365 * 100).toFixed(2));

    return {
      symbol: sym,
      bybitRate,
      okxRate,
      bitgetRate,
      predictedOkxRate,
      spread,
      spreadApr,
      bestLongExchange: minEx.ex, // Pay least (or receive most if negative)
      bestShortExchange: maxEx.ex, // Receive highest rate
      nextFundingCountdown: countdown,
      marketType: hasInverse && !hasPerp ? ('INVERSE' as const) : ('PERP' as const),
    };
  };

  // Combine popular symbols with the currently selected coin
  const arbitrageSymbols = Array.from(new Set([coin, ...POPULAR_SYMBOLS]));
  const fundingArbitrage: FundingArbitrageItem[] = arbitrageSymbols
    .map(makeArbitrageItem)
    .sort((a, b) => b.spreadApr - a.spreadApr);

  const currentFunding = fundingArbitrage.find((f) => f.symbol === coin) || makeArbitrageItem(coin);

  // Smart Money Sentiment
  const retailLong = Math.round(52 + Math.sin(seed) * 18);
  const retailShort = 100 - retailLong;
  // Top traders often counter-trend retail
  const topTraderLong = Math.round(50 - Math.sin(seed) * 22);
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

  const greedFearScore = Math.round(Math.min(95, Math.max(5, 50 + (priceChange24h * 4) + (Math.sin(seed) * 15))));
  let greedFearLabel: SmartMoneySentiment['greedFearLabel'] = 'Neutral';
  if (greedFearScore >= 75) greedFearLabel = 'Extreme Greed';
  else if (greedFearScore >= 56) greedFearLabel = 'Greed';
  else if (greedFearScore <= 25) greedFearLabel = 'Extreme Fear';
  else if (greedFearScore <= 44) greedFearLabel = 'Fear';

  const sentiment: SmartMoneySentiment = {
    symbol: coin,
    retailLongRatio: retailLong,
    retailShortRatio: retailShort,
    topTraderLongRatio: topTraderLong,
    topTraderShortRatio: topTraderShort,
    divergenceDetected: isDivergence,
    divergenceMessage,
    greedFearScore,
    greedFearLabel,
  };

  const derivMarketsCount = (hasPerp ? 1 : 0) + (hasInverse ? 1 : 0);
  const breakdown: MarketBreakdownEntry[] = [];

  for (const ex of safeExchanges) {
    for (const m of normalizedMarkets) {
      const isDeriv = m !== 'SPOT';
      const exSeed = getFeedSeed(ex, m);
      const priceJitter = m === 'PERP' ? 0.0002 : (m === 'SPOT' ? 0.0006 : -0.0004);
      const mPrice = Number((latestOi.price * (1 + priceJitter * Math.sin(seed + exSeed))).toFixed(latestOi.price < 1 ? 4 : 2));
      const mVol = Number((meta.avgVolume24h / (safeExchanges.length * normalizedMarkets.length) * (0.85 + 0.3 * Math.cos(seed + exSeed))).toFixed(0));
      const mOi = isDeriv
        ? Math.round((latestOi.totalOiUsd / (safeExchanges.length * (derivMarketsCount || 1))) * (0.9 + 0.2 * Math.sin(seed + exSeed)))
        : null;
      const rate8h = isDeriv ? Number((0.0001 + 0.00004 * Math.cos(seed + exSeed)).toFixed(6)) : null;
      const rateApr = rate8h !== null ? Number((rate8h * 3 * 365 * 100).toFixed(2)) : null;
      const mCvd = Number(((latestTaker.cvd / (safeExchanges.length * normalizedMarkets.length)) * (0.9 + 0.2 * Math.sin(seed + exSeed))).toFixed(0));

      breakdown.push({
        exchange: ex,
        market: m,
        price: mPrice,
        volume24hUsd: mVol,
        oiUsd: mOi,
        fundingRate: rate8h,
        fundingApr: rateApr,
        cvd: mCvd,
      });
    }
  }

  // Price aggregation priority: PERP -> SPOT -> INVERSE
  let aggregatedPrice = latestOi.price;
  const perpEntry = breakdown.find((b) => b.market === 'PERP');
  const spotEntry = breakdown.find((b) => b.market === 'SPOT');
  const inverseEntry = breakdown.find((b) => b.market === 'INVERSE');
  if (perpEntry) aggregatedPrice = perpEntry.price;
  else if (spotEntry) aggregatedPrice = spotEntry.price;
  else if (inverseEntry) aggregatedPrice = inverseEntry.price;

  return {
    symbol: coin,
    marketType: derivedMarketType,
    marketTypes: normalizedMarkets,
    currentPrice: aggregatedPrice,
    priceChange24h: Number(priceChange24h.toFixed(2)),
    totalVolume24hUsd: meta.avgVolume24h,
    totalOiUsd: hasDerivatives ? latestOi.totalOiUsd : 0,
    oiChange1hPercent: hasDerivatives ? Number(((latestOi.totalOiUsd - oiHistory[Math.max(0, oiHistory.length - 2)].totalOiUsd) / (oiHistory[Math.max(0, oiHistory.length - 2)].totalOiUsd || 1) * 100).toFixed(2)) : 0,
    oiChange24hPercent: hasDerivatives ? Number(oiChange24h.toFixed(2)) : 0,
    oiBreakdown: {
      bybit: hasDerivatives ? latestOi.bybitOiUsd : 0,
      okx: hasDerivatives ? latestOi.okxOiUsd : 0,
      bitget: hasDerivatives ? latestOi.bitgetOiUsd : 0,
    },
    breakdown,
    oiHistory,
    takerFlowHistory,
    fundingArbitrage: hasDerivatives ? fundingArbitrage : [],
    currentFunding: hasDerivatives ? currentFunding : null,
    regime,
    sentiment,
    lastUpdated: now,
  };
}
