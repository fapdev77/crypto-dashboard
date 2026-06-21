import { UnifiedInstrumentType, ExchangeName } from '../types';

export function mapInstrumentType(exchange: ExchangeName, rawType: string, ccy?: string): UnifiedInstrumentType {
  const typeStr = (rawType || '').toUpperCase();
  const currency = (ccy || '').toUpperCase();

  if (exchange === 'bybit') {
    if (typeStr === 'LINEAR') return 'PERP';
    if (typeStr === 'INVERSE') return 'INVERSE';
    if (typeStr === 'SPOT') return 'SPOT';
    if (typeStr === 'OPTION') return 'OPTION';
  }

  if (exchange === 'bitget') {
    if (typeStr.includes('USDT-FUTURES') || typeStr.includes('USDC-FUTURES')) return 'PERP';
    if (typeStr.includes('COIN-FUTURES')) return 'INVERSE';
    if (typeStr === 'SPOT') return 'SPOT';
  }

  if (exchange === 'okx') {
    if (typeStr === 'SPOT' || typeStr === 'MARGIN') return 'SPOT';
    if (typeStr === 'OPTION') return 'OPTION';
    if (typeStr === 'SWAP') {
      if (['USDT', 'USDC'].includes(currency)) return 'PERP';
      return 'INVERSE';
    }
    if (typeStr === 'FUTURES') {
      if (['USDT', 'USDC'].includes(currency)) return 'FUTURES';
      return 'INVERSE';
    }
  }

  return 'UNKNOWN';
}
