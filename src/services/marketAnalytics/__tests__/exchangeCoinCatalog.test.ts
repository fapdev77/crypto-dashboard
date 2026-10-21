import { describe, it, expect } from 'vitest';
import { exchangeCoinCatalog } from '../exchangeCoinCatalog';

describe('exchangeCoinCatalog', () => {
  it('should initialize with top 100+ coins in seed catalog', () => {
    const allCoins = exchangeCoinCatalog.getAllCoins();
    expect(allCoins.length).toBeGreaterThanOrEqual(60);

    const symbols = allCoins.map((c) => c.symbol);
    expect(symbols).toContain('BTC');
    expect(symbols).toContain('ETH');
    expect(symbols).toContain('SOL');
    expect(symbols).toContain('PEPE');
    expect(symbols).toContain('NEAR');
    expect(symbols).toContain('TAO');
    expect(symbols).toContain('ARB');
  });

  it('should filter coins by query', () => {
    const { results } = exchangeCoinCatalog.searchCoins({ query: 'PEPE' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].symbol).toBe('PEPE');
  });

  it('should filter coins by category', () => {
    const { results: memeCoins } = exchangeCoinCatalog.searchCoins({ category: 'Meme' });
    expect(memeCoins.length).toBeGreaterThan(0);
    expect(memeCoins.every((c) => c.category === 'Meme')).toBe(true);
    expect(memeCoins.map((c) => c.symbol)).toContain('DOGE');
    expect(memeCoins.map((c) => c.symbol)).toContain('PEPE');
  });

  it('should filter coins by exchange', () => {
    const { results: okxCoins } = exchangeCoinCatalog.searchCoins({ exchange: 'okx' });
    expect(okxCoins.length).toBeGreaterThan(0);
    expect(okxCoins.every((c) => c.exchanges.includes('okx'))).toBe(true);
  });

  it('should provide customOption for unknown valid tickers', () => {
    const { customOption } = exchangeCoinCatalog.searchCoins({ query: 'NEWTOKEN' });
    expect(customOption).toBeDefined();
    expect(customOption?.symbol).toBe('NEWTOKEN');
    expect(customOption?.markets).toContain('PERP');
  });
});
