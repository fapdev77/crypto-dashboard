import { UnifiedPosition, UnifiedHistoryPosition } from '../types';

/**
 * Detecta se a quantidade de uma ordem/trade está representada em coins (ex: 0.30 ETH)
 * ou em contratos USD (ex: 100 USD). Essencial para contratos inverse onde a
 * representação varia por exchange.
 *
 * Regras:
 * - Bitget: sempre qtyIsCoin = true
 * - OKX/Bybit inverse: sempre qtyIsCoin = false (qty em USD contracts)
 * - Outras: heurística — compara distância entre valor estimado vs valor real
 */
export function detectQtyIsCoin(params: {
  exchange: string;
  qty: number;
  price: number;
  value?: number;
}): boolean {
  const { exchange, qty, price, value } = params;
  if (price <= 0) return false;

  if (exchange === 'bitget') {
    return true;
  }
  if (exchange === 'okx' || exchange === 'bybit') {
    return false;
  }

  // Heurística genérica para exchanges desconhecidas ou mock data
  const estValIfQtyIsCoin = qty * price;
  const estValIfQtyIsUsd = qty;
  const actualVal = value || 0;

  if (actualVal > 0) {
    const distToCoin = Math.abs(actualVal - estValIfQtyIsCoin);
    const distToUsd = Math.abs(actualVal - estValIfQtyIsUsd);
    return distToCoin < distToUsd;
  }

  return qty < 2 && qty * price >= 10;
}

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

export function getOpenPositionSizeAndValue(pos: UnifiedPosition) {
  const inverseVals = getInverseUsdValues(pos);
  const positionValueUsd = pos.notionalUsd || inverseVals.positionValue || ((pos.size || 0) * (pos.markPrice || 0));
  const actualCoinSize = pos.size || 0;

  return {
    actualCoinSize,
    positionValueUsd
  };
}

export function getHistoryPositionSizeAndValue(pos: UnifiedHistoryPosition) {
  const isInverse = pos.instrumentType === 'INVERSE';
  let positionValueUsd = pos.notionalUsd || 0;
  let actualCoinSize = pos.size || 0;

  if (pos.exchange === 'okx' && (pos.raw?.pnl as string | undefined)) {
    const priceDiff = Math.abs((pos.closePrice || 0) - (pos.entryPrice || 0));
    const purePnl = Math.abs(parseFloat(pos.raw.pnl as string));
    if (priceDiff > 0) {
      actualCoinSize = purePnl / priceDiff;
      positionValueUsd = actualCoinSize * (pos.entryPrice || 0);
    } else {
      positionValueUsd = (pos.entryPrice || 0) * (pos.size || 0);
      actualCoinSize = pos.size || 0;
    }
  } else if (pos.exchange === 'bybit') {
    if (isInverse) {
      // For Bybit Inverse:
      // - cumEntryValue is in COIN (e.g. 0.00021896 BTC)
      // - size is the contract value in USD (e.g. 13 USD)
      actualCoinSize = parseFloat((pos.raw?.cumEntryValue as string | undefined) || '0') || (pos.entryPrice ? (pos.size || 0) / pos.entryPrice : 0);
      positionValueUsd = pos.size || 0;
    } else {
      // For Bybit Linear:
      // - cumEntryValue is in USD/USDT (e.g. 5588.88 USDT)
      // - size is the coin size (e.g. 0.2 BTC)
      positionValueUsd = parseFloat((pos.raw?.cumEntryValue as string | undefined) || '0') || ((pos.size || 0) * (pos.entryPrice || 0));
      actualCoinSize = pos.size || 0;
    }
  } else if (pos.exchange === 'bitget') {
    // For Bitget, whether inverse or not, pos.size is already the coin size!
    actualCoinSize = pos.size || 0;
    positionValueUsd = (pos.size || 0) * (pos.entryPrice || 0);
  } else if (isInverse) {
    let sizeIsCoin = false;
    if (pos.entryPrice && pos.entryPrice > 0) {
      if ((pos.raw?.mockData as boolean | undefined) || ((pos.size || 0) < 5 && (pos.size || 0) * pos.entryPrice >= 10)) {
        sizeIsCoin = true;
      }
    }
    if (sizeIsCoin) {
      actualCoinSize = pos.size || 0;
      positionValueUsd = (pos.size || 0) * (pos.entryPrice || 0);
    } else {
      positionValueUsd = pos.size || 0;
      actualCoinSize = pos.entryPrice ? (pos.size || 0) / pos.entryPrice : 0;
    }
  } else {
    positionValueUsd = (pos.entryPrice || 0) * (pos.size || 0);
    actualCoinSize = pos.size || 0;
  }

  return {
    actualCoinSize,
    positionValueUsd
  };
}

