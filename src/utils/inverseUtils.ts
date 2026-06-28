import { UnifiedPosition, UnifiedHistoryPosition } from '../types';

export function getBitgetInverseContractVal(symbol: string): number {
  const sym = (symbol || '').toUpperCase();
  if (sym.startsWith('BTC')) return 100;
  return 10;
}

export function getInverseUsdValues(pos: UnifiedPosition, forceConversionRate?: number) {
  const isInverse = pos.instrumentType === 'INVERSE';
  const conversionRate = isInverse ? (forceConversionRate || pos.markPrice || 1) : 1;

  return {
    unrealizedPnl: (pos.unrealizedPnl || 0) * conversionRate,
    realizedPnl: (pos.realizedPnl || 0) * conversionRate,
    closedPnl: (pos.closedPnl || 0) * conversionRate,
    fundingFee: (pos.accumulatedFunding ? parseFloat(pos.accumulatedFunding) : 0) * conversionRate,
    tradingFee: (pos.accumulatedTradingFee ? parseFloat(pos.accumulatedTradingFee) : 0) * conversionRate,
    positionValue: pos.notionalUsd || ((pos.size || 0) * conversionRate),
    conversionRate,
    isInverse
  };
}

export function getHistoryInverseUsdValues(pos: UnifiedHistoryPosition, forceConversionRate?: number) {
  const isInverse = pos.instrumentType === 'INVERSE';
  const conversionRate = isInverse ? (forceConversionRate || pos.closePrice || 1) : 1;

  return {
    realizedPnl: (pos.realizedPnl || 0) * conversionRate,
    closedPnl: (pos.closedPnl || 0) * conversionRate,
    fundingFee: (pos.fundingFee || 0) * conversionRate,
    tradingFee: (pos.tradingFee || 0) * conversionRate,
    conversionRate,
    isInverse
  };
}
