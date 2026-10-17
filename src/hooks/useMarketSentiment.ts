import { useState, useEffect, useCallback, useMemo } from 'react';
import { hybridFetch } from '../utils/proxyFetch';
import { useSettingsStore } from '../store/settingsStore';
import { usePositionsStore } from '../store/positionsStore';
import { useFundingStore } from '../store/fundingStore';
import {
  FearAndGreedItem,
  MarketSentimentData,
  SentimentClassification,
  MarketTrendSummary,
} from '../types/marketSentiment';

const MOCK_SENTIMENT_DATA: FearAndGreedItem[] = [
  { value: 68, valueClassification: 'Greed', timestamp: Math.floor(Date.now() / 1000) },
  { value: 64, valueClassification: 'Greed', timestamp: Math.floor(Date.now() / 1000) - 86400 },
  { value: 61, valueClassification: 'Greed', timestamp: Math.floor(Date.now() / 1000) - 86400 * 2 },
  { value: 58, valueClassification: 'Greed', timestamp: Math.floor(Date.now() / 1000) - 86400 * 3 },
  { value: 54, valueClassification: 'Neutral', timestamp: Math.floor(Date.now() / 1000) - 86400 * 4 },
  { value: 49, valueClassification: 'Neutral', timestamp: Math.floor(Date.now() / 1000) - 86400 * 5 },
  { value: 45, valueClassification: 'Neutral', timestamp: Math.floor(Date.now() / 1000) - 86400 * 6 },
];

function classifyScore(val: number): SentimentClassification {
  if (val <= 24) return 'Extreme Fear';
  if (val <= 44) return 'Fear';
  if (val <= 55) return 'Neutral';
  if (val <= 75) return 'Greed';
  return 'Extreme Greed';
}

export function useMarketSentiment() {
  const useMockData = useSettingsStore((s) => s.useMockData);
  const historyCacheInterval = useSettingsStore((s) => s.historyCacheInterval); // Background sync interval in minutes (default 15)
  const positions = usePositionsStore((s) => s.positions);
  const currentRates = useFundingStore((s) => s.currentRates);

  const [sentimentHistory, setSentimentHistory] = useState<FearAndGreedItem[]>(MOCK_SENTIMENT_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchSentiment = useCallback(async () => {
    if (useMockData) {
      setSentimentHistory(MOCK_SENTIMENT_DATA);
      setIsLoading(false);
      setError(null);
      setLastRefreshedAt(new Date());
      return;
    }

    setIsLoading(true);
    setError(null);

    const apiUrl = 'https://api.alternative.me/fng/?limit=7';

    try {
      const json = await hybridFetch(apiUrl, 'GET', {});

      if (json && Array.isArray(json.data) && json.data.length > 0) {
        const parsed: FearAndGreedItem[] = json.data.map((item: {
          value: string;
          value_classification: string;
          timestamp: string;
          time_until_update?: string;
        }) => {
          const val = parseInt(item.value, 10);
          return {
            value: isNaN(val) ? 50 : val,
            valueClassification: (item.value_classification as SentimentClassification) || classifyScore(val),
            timestamp: parseInt(item.timestamp, 10) || Math.floor(Date.now() / 1000),
            timeUntilUpdate: item.time_until_update ? parseInt(item.time_until_update, 10) : undefined,
          };
        });

        setSentimentHistory(parsed);
        setLastRefreshedAt(new Date());
      } else {
        throw new Error('Invalid response from Fear & Greed API');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
      if (sentimentHistory.length === 0) {
        setSentimentHistory(MOCK_SENTIMENT_DATA);
      }
    } finally {
      setIsLoading(false);
    }
  }, [useMockData, sentimentHistory.length]);

  // Polling tied to historyCacheInterval (in minutes, converted to ms)
  useEffect(() => {
    fetchSentiment();
    const intervalMs = Math.max(1, historyCacheInterval || 15) * 60 * 1000;
    const interval = setInterval(fetchSentiment, intervalMs);
    return () => clearInterval(interval);
  }, [fetchSentiment, historyCacheInterval]);

  const current = sentimentHistory[0] || MOCK_SENTIMENT_DATA[0];
  const yesterday = sentimentHistory[1] || current;
  const weekAgo = sentimentHistory[sentimentHistory.length - 1] || current;

  const change24h = current.value - yesterday.value;
  const change7d = current.value - weekAgo.value;

  const fundingBias: 'Long Dominant' | 'Short Dominant' | 'Balanced' = useMemo(() => {
    const posList = Object.values(positions || {});
    if (posList.length > 0) {
      let longValue = 0;
      let shortValue = 0;
      posList.forEach((p) => {
        const val = Math.abs(p.notionalUsd || Number(p.size) * Number(p.markPrice) || 0);
        if (p.side === 'long') {
          longValue += val;
        } else {
          shortValue += val;
        }
      });
      if (longValue > shortValue * 1.2) return 'Long Dominant';
      if (shortValue > longValue * 1.2) return 'Short Dominant';
      return 'Balanced';
    }

    if (currentRates && currentRates.length > 0) {
      const avgRate =
        currentRates.slice(0, 10).reduce((acc, r) => acc + (Number(r.fundingRate) || 0), 0) /
        Math.min(10, currentRates.length);
      if (avgRate > 0.0001) return 'Long Dominant';
      if (avgRate < -0.0001) return 'Short Dominant';
    }

    return current.value >= 55 ? 'Long Dominant' : current.value <= 45 ? 'Short Dominant' : 'Balanced';
  }, [positions, currentRates, current.value]);

  const trendSummary: MarketTrendSummary = useMemo(() => {
    let regime: 'Bullish' | 'Bearish' | 'Neutral' | 'Consolidation' = 'Neutral';
    let volatility: 'Low' | 'Moderate' | 'High' | 'Extreme' = 'Moderate';

    if (current.value >= 75) {
      regime = 'Bullish';
      volatility = 'Extreme';
    } else if (current.value >= 56) {
      regime = 'Bullish';
      volatility = 'Moderate';
    } else if (current.value <= 24) {
      regime = 'Bearish';
      volatility = 'Extreme';
    } else if (current.value <= 44) {
      regime = 'Bearish';
      volatility = 'Moderate';
    } else {
      regime = 'Consolidation';
      volatility = 'Low';
    }

    let adviceEn = '';
    let advicePt = '';

    if (current.value >= 75) {
      adviceEn = 'Extreme Greed: Market is overheated with high leverage. Watch for sharp liquidation cascades and protect stop-loss levels.';
      advicePt = 'Ganância Extrema: Mercado sobrecomprado com alta alavancagem. Cuidado com correções abruptas (long squeeze) e proteja seus stops.';
    } else if (current.value >= 56) {
      adviceEn = 'Greed: Bullish momentum in control. Favor trend-following pullbacks while monitoring funding rates on perpetual contracts.';
      advicePt = 'Ganância: Momentum altista predominante. Favorece operações a favor da tendência em pullbacks, com atenção aos custos de funding.';
    } else if (current.value <= 24) {
      adviceEn = 'Extreme Fear: Capitulation levels and panic selling. Historically favorable for spot accumulation and delta-neutral hedging.';
      advicePt = 'Medo Extremo: Níveis de capitulação e pânico vendedor. Historicamente propício para acumulação em spot e hedge delta-neutro.';
    } else if (current.value <= 44) {
      adviceEn = 'Fear: Market sentiment is defensive. Risk-off bias suggests tighter position sizing and disciplined risk parameters.';
      advicePt = 'Medo: Sentimento defensivo. Postura cautelosa sugere posições mais enxutas e parâmetros de risco estritos.';
    } else {
      adviceEn = 'Neutral: Sideways chop and consolidation. Ideal environment for range trading, funding fee collection, and mean reversion.';
      advicePt = 'Neutro: Lateralização e consolidação. Cenário propício para operações em amplitude (range) e coleta de taxas de funding.';
    }

    return {
      regime,
      btcDominanceEstimate: 54.8,
      volatilityIndex: volatility,
      fundingBias,
      traderAdvice: {
        en: adviceEn,
        pt: advicePt,
      },
    };
  }, [current.value, fundingBias]);

  const sentimentData: MarketSentimentData = {
    currentIndex: current,
    historical: sentimentHistory,
    trendSummary,
    change24h,
    change7d,
    lastUpdated: lastRefreshedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };

  return {
    sentiment: sentimentData,
    isLoading,
    error,
    refetch: fetchSentiment,
    pollingIntervalMinutes: historyCacheInterval || 15,
  };
}
