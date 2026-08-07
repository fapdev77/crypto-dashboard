import { ExchangeName, PositionSide, UnifiedMarginMode } from '../types';

export function mapPositionSide(exchange: ExchangeName, side: string | undefined, posSide?: string | undefined): PositionSide {
  const lSide = (posSide || side || '').toLowerCase();
  const ex = (exchange || '').toLowerCase();
  
  if (ex === 'bybit') {
    if (lSide === 'buy') return 'long';
    if (lSide === 'sell') return 'short';
  }
  
  if (lSide === 'long' || lSide === 'buy') return 'long';
  if (lSide === 'short' || lSide === 'sell') return 'short';
  
  return 'net';
}

export function mapMarginMode(exchange: ExchangeName, rawMode: string | number | undefined): UnifiedMarginMode {
  if (rawMode === undefined || rawMode === null) return 'unknown';
  
  const modeStr = rawMode.toString().toLowerCase();
  const ex = (exchange || '').toLowerCase();

  // Bybit uses 0 for cross, 1 for isolated
  if (ex === 'bybit') {
    if (modeStr === '0') return 'cross';
    if (modeStr === '1') return 'isolated';
  }
  
  if (modeStr.includes('cross')) return 'cross';
  if (modeStr.includes('fixed') || modeStr.includes('isolated')) return 'isolated';
  
  return 'unknown';
}

export function extractBaseCoin(exchange: ExchangeName, symbol: string): string {
  if (!symbol) return '';
  let cleanSymbol = symbol.toUpperCase();
  const ex = (exchange || '').toLowerCase();

  if (ex === 'okx') {
    // BTC-USDT-SWAP -> BTC
    return cleanSymbol.split('-')[0];
  }

  if (ex === 'bitget' || ex === 'bybit') {
    if (cleanSymbol.includes('_')) cleanSymbol = cleanSymbol.split('_')[0]; // Bitget UMCBL etc.

    if (cleanSymbol.endsWith('USDT') && cleanSymbol !== 'USDT') return cleanSymbol.slice(0, -4);
    if (cleanSymbol.endsWith('USDC') && cleanSymbol !== 'USDC') return cleanSymbol.slice(0, -4);
    if (cleanSymbol.endsWith('USD') && cleanSymbol !== 'USD') return cleanSymbol.slice(0, -3);
    if (cleanSymbol.endsWith('PERP')) return cleanSymbol.slice(0, -4);
    
    return cleanSymbol;
  }

  return cleanSymbol;
}

export function extractQuoteCoin(exchange: ExchangeName, symbol: string): string {
  if (!symbol) return '';
  let cleanSymbol = symbol.toUpperCase();
  const ex = (exchange || '').toLowerCase();

  if (ex === 'okx') {
    // BTC-USDT-SWAP -> USDT
    const parts = cleanSymbol.split('-');
    if (parts.length > 1) return parts[1];
    return 'USD';
  }

  if (ex === 'bitget' || ex === 'bybit') {
    cleanSymbol = cleanSymbol.split('_')[0];
    if (cleanSymbol.endsWith('USDT')) return 'USDT';
    if (cleanSymbol.endsWith('USDC')) return 'USDC';
    if (cleanSymbol.endsWith('USD')) return 'USD';
    return 'USD';
  }

  return 'USD'; // safe default
}

export function extractCcy(exchange: ExchangeName, rawCcy: string | undefined, settleCoin: string | undefined, coin: string | undefined, symbol: string): string {
  const possible = (rawCcy || settleCoin || coin || '').toUpperCase();
  if (possible) return possible;
  return extractQuoteCoin(exchange, symbol);
}
