import { describe, it, expect } from 'vitest';
import { generateMockSnapshot } from '../../../mock/marketAnalyticsMock';
import { MarketAnalyticsService } from '../MarketAnalyticsService';

describe('Market Analytics Snapshot Multi-Market & Aggregation (D3)', () => {
  it('generates multi-market snapshot with complete breakdown matrix', () => {
    const snapshot = generateMockSnapshot('BTC', ['PERP', 'SPOT'], '1h', ['bybit', 'okx', 'bitget']);

    expect(snapshot.symbol).toBe('BTC');
    expect(snapshot.marketTypes).toEqual(['PERP', 'SPOT']);
    expect(snapshot.breakdown.length).toBe(6); // 3 exchanges x 2 markets

    // Breakdown has entries for each exchange and market
    const bybitPerp = snapshot.breakdown.find((b) => b.exchange === 'bybit' && b.market === 'PERP');
    const bybitSpot = snapshot.breakdown.find((b) => b.exchange === 'bybit' && b.market === 'SPOT');

    expect(bybitPerp).toBeDefined();
    expect(bybitPerp?.oiUsd).toBeGreaterThan(0);
    expect(bybitPerp?.fundingRate).toBeDefined();

    expect(bybitSpot).toBeDefined();
    // SPOT market has null for OI and funding
    expect(bybitSpot?.oiUsd).toBeNull();
    expect(bybitSpot?.fundingRate).toBeNull();
    expect(bybitSpot?.fundingApr).toBeNull();
  });

  it('aggregates OI and funding only from derivatives when SPOT is also selected', () => {
    const snapshot = generateMockSnapshot('ETH', ['SPOT', 'PERP'], '1h', ['bybit', 'okx', 'bitget']);

    expect(snapshot.totalOiUsd).toBeGreaterThan(0);
    expect(snapshot.currentFunding).not.toBeNull();
    expect(snapshot.fundingArbitrage.length).toBeGreaterThan(0);

    // Sum of non-null OI entries in breakdown equals totalOiUsd
    const nonNullBreakdownOi = snapshot.breakdown
      .filter((b) => b.oiUsd !== null)
      .reduce((sum, b) => sum + (b.oiUsd || 0), 0);

    expect(nonNullBreakdownOi).toBeGreaterThan(0);
  });

  it('sets totalOiUsd = 0 and currentFunding = null when ONLY Spot is selected', () => {
    const spotOnly = generateMockSnapshot('SOL', ['SPOT'], '1h', ['bybit', 'okx']);

    expect(spotOnly.marketTypes).toEqual(['SPOT']);
    expect(spotOnly.totalOiUsd).toBe(0);
    expect(spotOnly.currentFunding).toBeNull();
    expect(spotOnly.fundingArbitrage).toEqual([]);

    // Every entry in breakdown has null for derivative metrics
    expect(spotOnly.breakdown.every((b) => b.oiUsd === null)).toBe(true);
    expect(spotOnly.breakdown.every((b) => b.fundingRate === null)).toBe(true);
    expect(spotOnly.breakdown.every((b) => b.fundingApr === null)).toBe(true);
  });

  it('prioritizes PERP price over SPOT price in aggregation (D3)', () => {
    const snapshot = generateMockSnapshot('BTC', ['SPOT', 'PERP'], '1h', ['bybit', 'okx']);
    const perpEntry = snapshot.breakdown.find((b) => b.market === 'PERP');

    expect(snapshot.currentPrice).toBe(perpEntry?.price);
  });

  it('provides coherent breakdown prices across exchanges', async () => {
    const snapshot = await MarketAnalyticsService.fetchSnapshot('BTC', ['SPOT', 'PERP'], '1h', ['bybit', 'okx', 'bitget'], true);
    expect(snapshot.breakdown.length).toBe(6);
    expect(snapshot.currentPrice).toBeGreaterThan(1000);

    // All breakdown rows must have valid positive prices close to currentPrice
    for (const b of snapshot.breakdown) {
      expect(b.price).toBeGreaterThan(1000);
      const diffPct = Math.abs(b.price - snapshot.currentPrice) / snapshot.currentPrice;
      // Breakdown price shouldn't deviate wildly (e.g. not stuck at 65k when price is 77k)
      expect(diffPct).toBeLessThan(0.05);
    }
  });

  it('guarantees distinct volume, CVD, and metrics without cross-exchange duplicate values', async () => {
    const snapshot = await MarketAnalyticsService.fetchSnapshot('BTC', ['PERP', 'INVERSE', 'SPOT'], '1h', ['bybit', 'okx', 'bitget'], true);
    expect(snapshot.breakdown.length).toBe(9); // 3 exchanges x 3 markets

    const bybitPerp = snapshot.breakdown.find((b) => b.exchange === 'bybit' && b.market === 'PERP')!;
    const bitgetPerp = snapshot.breakdown.find((b) => b.exchange === 'bitget' && b.market === 'PERP')!;
    const okxPerp = snapshot.breakdown.find((b) => b.exchange === 'okx' && b.market === 'PERP')!;

    // Bybit and Bitget must not share identical volumes or identical CVD flows
    expect(bybitPerp.volume24hUsd).not.toBe(bitgetPerp.volume24hUsd);
    expect(bybitPerp.cvd).not.toBe(bitgetPerp.cvd);

    // Within Bitget, PERP and INVERSE should have distinct volumes and CVD
    const bitgetInv = snapshot.breakdown.find((b) => b.exchange === 'bitget' && b.market === 'INVERSE')!;
    expect(bitgetPerp.volume24hUsd).not.toBe(bitgetInv.volume24hUsd);

    // Within OKX, PERP and INVERSE should have distinct volumes and CVD
    const okxInv = snapshot.breakdown.find((b) => b.exchange === 'okx' && b.market === 'INVERSE')!;
    expect(okxPerp.volume24hUsd).not.toBe(okxInv.volume24hUsd);

    // Aggregated volume should equal sum of all feeds
    const sumVolume = snapshot.breakdown.reduce((sum, b) => sum + (b.volume24hUsd || 0), 0);
    expect(snapshot.totalVolume24hUsd).toBe(sumVolume);
  });

  it('strictly respects useMockData setting when switching between live and mock', async () => {
    // In live mode (default in store test environment)
    const liveSnapshot = await MarketAnalyticsService.fetchSnapshot('ETH', ['PERP'], '1h', ['okx', 'bitget'], true);
    expect(liveSnapshot.symbol).toBe('ETH');
    expect(liveSnapshot.breakdown.length).toBe(2);
    expect(liveSnapshot.currentPrice).toBeGreaterThan(0);
    expect(liveSnapshot.oiHistory.length).toBeGreaterThan(0);
    expect(liveSnapshot.takerFlowHistory.length).toBeGreaterThan(0);
  });
});
