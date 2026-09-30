import { describe, it, expect } from 'vitest';
import { getCleanCoinSymbol } from '../CoinIcon';

describe('getCleanCoinSymbol', () => {
  it('should clean Bitget Coin-M symbols with _CM suffix', () => {
    expect(getCleanCoinSymbol('ETHUSD_CM')).toBe('eth');
    expect(getCleanCoinSymbol('BTCUSD_CM')).toBe('btc');
    expect(getCleanCoinSymbol('SOLUSD_CM')).toBe('sol');
    expect(getCleanCoinSymbol('XRPUSD_CM')).toBe('xrp');
  });

  it('should clean Bitget Classic symbols with _UMCBL, _DMCBL, _SPBL suffixes', () => {
    expect(getCleanCoinSymbol('BTCUSDT_UMCBL')).toBe('btc');
    expect(getCleanCoinSymbol('ETHUSDC_DMCBL')).toBe('eth');
    expect(getCleanCoinSymbol('SOLUSDT_SPBL')).toBe('sol');
  });

  it('should clean OKX symbols with hyphen separators', () => {
    expect(getCleanCoinSymbol('BTC-USD-SWAP')).toBe('btc');
    expect(getCleanCoinSymbol('ETH-USDT-SWAP')).toBe('eth');
    expect(getCleanCoinSymbol('PEPE-USDT-SWAP')).toBe('pepe');
  });

  it('should clean Bybit and standard pair symbols', () => {
    expect(getCleanCoinSymbol('BTCUSD')).toBe('btc');
    expect(getCleanCoinSymbol('ETHUSD')).toBe('eth');
    expect(getCleanCoinSymbol('BTCUSDT')).toBe('btc');
    expect(getCleanCoinSymbol('SOLPERP')).toBe('sol');
  });

  it('should preserve base currencies like USDT, USD, USDC', () => {
    expect(getCleanCoinSymbol('USDT')).toBe('usdt');
    expect(getCleanCoinSymbol('USD')).toBe('usd');
    expect(getCleanCoinSymbol('USDC')).toBe('usdc');
  });

  it('should handle empty or whitespace inputs safely', () => {
    expect(getCleanCoinSymbol('')).toBe('');
    expect(getCleanCoinSymbol('  ')).toBe('');
  });
});
