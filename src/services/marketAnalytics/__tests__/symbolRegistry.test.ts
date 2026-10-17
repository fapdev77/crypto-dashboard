import { describe, it, expect } from 'vitest';
import {
  parseExchangeInstruments,
  buildAvailabilityIndex,
  createEmptyRegistry,
  exchangeCoinCatalog,
  SymbolRegistry,
} from '../exchangeCoinCatalog';

describe('parseExchangeInstruments', () => {
  it('parses Bybit listings and maps TradFi symbolType (stock/xstocks/commodity)', () => {
    const spot = parseExchangeInstruments('bybit', 'SPOT', {
      result: {
        list: [
          { symbol: 'BTCUSDT', baseCoin: 'BTC', quoteCoin: 'USDT', symbolType: '' },
          { symbol: 'AAPLXUSDT', baseCoin: 'AAPLX', quoteCoin: 'USDT', symbolType: 'xstocks' },
        ],
      },
    });
    expect(spot.map((e) => e.symbol)).toEqual(['BTC', 'AAPLX']);
    expect(spot.find((e) => e.symbol === 'AAPLX')?.kind).toBe('STOCK');

    const perp = parseExchangeInstruments('bybit', 'PERP', {
      result: {
        list: [
          { baseCoin: 'BTC', symbolType: 'stock' },
          { baseCoin: 'XAU', symbolType: 'commodity' },
          { baseCoin: 'ETH', symbolType: '' },
        ],
      },
    });
    expect(perp.find((e) => e.symbol === 'BTC')?.kind).toBe('STOCK');
    expect(perp.find((e) => e.symbol === 'XAU')?.kind).toBe('COMMODITY');
    expect(perp.find((e) => e.symbol === 'ETH')?.kind).toBe('CRYPTO');

    const inverse = parseExchangeInstruments('bybit', 'INVERSE', {
      result: { list: [{ baseCoin: 'BTC', symbolType: '' }] },
    });
    expect(inverse.map((e) => e.symbol)).toEqual(['BTC']);
  });

  it('separates OKX USDT swaps from USD inverse swaps in the same SWAP listing', () => {
    const payload = {
      data: [
        { instId: 'BTC-USDT-SWAP', instCategory: '1' },
        { instId: 'BTC-USD-SWAP', instCategory: '1' },
        { instId: 'AAPL-USDT-SWAP', instCategory: '3' },
        { instId: 'XAU-USDT-SWAP', instCategory: '4' },
      ],
    };
    const perp = parseExchangeInstruments('okx', 'PERP', payload);
    const inverse = parseExchangeInstruments('okx', 'INVERSE', payload);

    expect(perp.map((e) => e.symbol)).toEqual(['BTC', 'AAPL', 'XAU']);
    expect(inverse.map((e) => e.symbol)).toEqual(['BTC']);
    expect(perp.find((e) => e.symbol === 'AAPL')?.kind).toBe('STOCK');
    expect(perp.find((e) => e.symbol === 'XAU')?.kind).toBe('COMMODITY');
  });

  it('parses OKX spot using baseCcy', () => {
    const spot = parseExchangeInstruments('okx', 'SPOT', {
      data: [
        { instId: 'BTC-USDT', baseCcy: 'BTC', quoteCcy: 'USDT', instCategory: '1' },
        { instId: 'AAPL-USDT', baseCcy: 'AAPL', quoteCcy: 'USDT', instCategory: '3' },
      ],
    });
    expect(spot.map((e) => e.symbol)).toEqual(['BTC', 'AAPL']);
    expect(spot.find((e) => e.symbol === 'AAPL')?.kind).toBe('STOCK');
  });

  it('parses Bitget via baseCoin and derives base when absent', () => {
    const spot = parseExchangeInstruments('bitget', 'SPOT', {
      data: [
        { symbol: 'BTCUSDT', baseCoin: 'BTC', quoteCoin: 'USDT' },
        { symbol: 'XAUUSDT', baseCoin: 'XAU', symbolType: 'commodity' },
      ],
    });
    expect(spot.map((e) => e.symbol)).toEqual(['BTC', 'XAU']);
    expect(spot.find((e) => e.symbol === 'XAU')?.kind).toBe('COMMODITY');

    const inverse = parseExchangeInstruments('bitget', 'INVERSE', {
      data: [{ symbol: 'BTCUSD', baseCoin: 'BTC', quoteCoin: 'USD', symbolType: 'perpetual' }],
    });
    expect(inverse[0].symbol).toBe('BTC');
    expect(inverse[0].kind).toBe('CRYPTO');
  });

  it('returns an empty list for malformed payloads', () => {
    expect(parseExchangeInstruments('bybit', 'SPOT', null)).toEqual([]);
    expect(parseExchangeInstruments('okx', 'PERP', {})).toEqual([]);
    expect(parseExchangeInstruments('bitget', 'SPOT', { data: 'nope' })).toEqual([]);
  });
});

describe('buildAvailabilityIndex', () => {
  it('merges exchanges/markets per symbol and prefers a specific asset kind', () => {
    const registry: SymbolRegistry = createEmptyRegistry();
    registry.bybit.PERP = [{ symbol: 'BTC', name: 'BTC', kind: 'CRYPTO' }];
    registry.okx.PERP = [{ symbol: 'BTC', name: 'BTC', kind: 'CRYPTO' }];
    registry.bitget.SPOT = [{ symbol: 'BTC', name: 'BTC', kind: 'CRYPTO' }];
    registry.bitget.PERP = [{ symbol: 'AAPL', name: 'AAPL', kind: 'STOCK' }];

    const index = buildAvailabilityIndex(registry);
    const btc = index.get('BTC');
    expect(btc?.exchanges).toEqual(expect.arrayContaining(['bybit', 'okx', 'bitget']));
    expect(btc?.markets).toEqual(expect.arrayContaining(['PERP', 'SPOT']));
    expect(index.get('AAPL')?.kind).toBe('STOCK');
  });
});

describe('exchangeCoinCatalog registry accessors', () => {
  it('reports no availability and staleness before any fetch', () => {
    expect(exchangeCoinCatalog.getAvailability('BTC')).toBeNull();
    expect(exchangeCoinCatalog.isStale(1)).toBe(true);
    expect(exchangeCoinCatalog.getRegistryUpdatedAt()).toBeNull();
  });
});
