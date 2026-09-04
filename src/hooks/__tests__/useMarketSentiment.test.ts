import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMarketSentiment } from '../useMarketSentiment';
import { useSettingsStore } from '../../store/settingsStore';

describe('useMarketSentiment', () => {
  beforeEach(() => {
    useSettingsStore.setState({ useMockData: true });
    vi.clearAllMocks();
  });

  it('should return initial sentiment data in simulation/mock mode', () => {
    const { result } = renderHook(() => useMarketSentiment());

    expect(result.current.sentiment).toBeDefined();
    expect(result.current.sentiment.currentIndex.value).toBeGreaterThanOrEqual(0);
    expect(result.current.sentiment.currentIndex.value).toBeLessThanOrEqual(100);
    expect(result.current.sentiment.historical.length).toBeGreaterThan(0);
  });

  it('should calculate 24h and 7d changes correctly', () => {
    const { result } = renderHook(() => useMarketSentiment());
    const { change24h, change7d, currentIndex, historical } = result.current.sentiment;

    const expected24h = currentIndex.value - (historical[1]?.value ?? currentIndex.value);
    const expected7d = currentIndex.value - (historical[historical.length - 1]?.value ?? currentIndex.value);

    expect(change24h).toBe(expected24h);
    expect(change7d).toBe(expected7d);
  });

  it('should provide tactical trader advice and trend summary', () => {
    const { result } = renderHook(() => useMarketSentiment());
    const { trendSummary } = result.current.sentiment;

    expect(trendSummary.regime).toMatch(/Bullish|Bearish|Neutral|Consolidation/);
    expect(trendSummary.volatilityIndex).toMatch(/Low|Moderate|High|Extreme/);
    expect(trendSummary.traderAdvice.en).toBeTruthy();
    expect(trendSummary.traderAdvice.pt).toBeTruthy();
  });

  it('should have a working refetch function', async () => {
    const { result } = renderHook(() => useMarketSentiment());

    expect(typeof result.current.refetch).toBe('function');
    await result.current.refetch();
    expect(result.current.isLoading).toBe(false);
  });
});
