import type { UnifiedHistoryPosition } from '../types';
import { getHistoryInverseUsdValues, getHistoryPositionSizeAndValue } from './inverseUtils';

export type SideBias = 'buyer' | 'seller' | 'balanced';

export interface ClosedPositionsStats {
  totalPositions: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  totalPnl: number;
  totalGrossPnl: number;
  totalTradeFees: number;
  totalFundingFees: number;
  totalOperationalCost: number;
  operationalCostPct: number | null;
  totalInitialMargin: number;
  roiPct: number | null;
  profitFactor: number | null;
  expectancy: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number | null;
  longs: number;
  shorts: number;
  neutralSideCount: number;
  longPct: number;
  shortPct: number;
  longWins: number;
  shortWins: number;
  longWinRate: number | null;
  shortWinRate: number | null;
  sideBias: SideBias;
  cumulativePnlSeries: number[];
}

function resolveLeverage(pos: UnifiedHistoryPosition): number {
  if (typeof pos.leverage === 'number' && isFinite(pos.leverage) && pos.leverage > 0) {
    return pos.leverage;
  }
  const rawLev = pos.raw?.leverage ?? pos.raw?.lever;
  const parsed = typeof rawLev === 'number' ? rawLev : parseFloat(String(rawLev ?? '0'));
  return isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function computeClosedPositionsStats(
  positions: UnifiedHistoryPosition[]
): ClosedPositionsStats | null {
  if (!positions || positions.length === 0) return null;

  let totalPnl = 0;
  let totalGrossPnl = 0;
  let totalTradeFees = 0;
  let totalFundingFees = 0;
  let totalInitialMargin = 0;
  let pnlWithMargin = 0;

  let wins = 0;
  let losses = 0;
  let breakevens = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let sumWin = 0;
  let sumLoss = 0;

  let longs = 0;
  let shorts = 0;
  let neutralSideCount = 0;
  let longWins = 0;
  let shortWins = 0;

  for (const pos of positions) {
    const {
      realizedPnl: pnlInUsd,
      tradingFee: tradingFeeUsd,
      fundingFee: fundingFeeUsd,
    } = getHistoryInverseUsdValues(pos);

    const safePnl = isFinite(pnlInUsd) ? pnlInUsd : 0;
    const safeTradeFee = isFinite(tradingFeeUsd) ? tradingFeeUsd : 0;
    const safeFundingFee = isFinite(fundingFeeUsd) ? fundingFeeUsd : 0;
    const grossPnlUsd = safePnl - safeTradeFee - safeFundingFee;

    totalPnl += safePnl;
    totalGrossPnl += grossPnlUsd;
    totalTradeFees += safeTradeFee;
    totalFundingFees += safeFundingFee;

    const leverage = resolveLeverage(pos);
    const { positionValueUsd } = getHistoryPositionSizeAndValue(pos);
    if (isFinite(positionValueUsd) && positionValueUsd > 0 && leverage > 0) {
      totalInitialMargin += positionValueUsd / leverage;
      pnlWithMargin += safePnl;
    }

    const sideLower = (pos.side || '').toLowerCase();
    const isLong = sideLower === 'long' || sideLower === 'buy';
    const isShort = sideLower === 'short' || sideLower === 'sell';

    if (isLong) {
      longs++;
      if (safePnl > 0) longWins++;
    } else if (isShort) {
      shorts++;
      if (safePnl > 0) shortWins++;
    } else {
      neutralSideCount++;
    }

    if (safePnl > 0) {
      wins++;
      sumWin += safePnl;
      if (safePnl > largestWin) largestWin = safePnl;
    } else if (safePnl < 0) {
      losses++;
      sumLoss += safePnl;
      if (safePnl < largestLoss) largestLoss = safePnl;
    } else {
      breakevens++;
    }
  }

  const totalPositions = positions.length;
  const decidedTrades = wins + losses;
  const winRate = decidedTrades > 0 ? (wins / decidedTrades) * 100 : 0;
  const avgWin = wins > 0 ? sumWin / wins : 0;
  const avgLoss = losses > 0 ? sumLoss / losses : 0;

  const totalOperationalCost = totalTradeFees + totalFundingFees;
  const operationalCostPct =
    totalGrossPnl !== 0
      ? (Math.abs(totalOperationalCost) / Math.abs(totalGrossPnl)) * 100
      : null;

  const roiPct = totalInitialMargin > 0 ? (pnlWithMargin / totalInitialMargin) * 100 : null;

  let profitFactor: number | null = 0;
  if (sumLoss < 0) {
    profitFactor = sumWin / Math.abs(sumLoss);
  } else if (sumWin > 0) {
    profitFactor = Infinity;
  } else {
    profitFactor = null;
  }

  const expectancy = totalPositions > 0 ? totalPnl / totalPositions : 0;
  const riskRewardRatio = avgLoss < 0 ? avgWin / Math.abs(avgLoss) : null;

  const sideTotal = longs + shorts;
  const longPct = sideTotal > 0 ? (longs / sideTotal) * 100 : 0;
  const shortPct = sideTotal > 0 ? (shorts / sideTotal) * 100 : 0;
  const longWinRate = longs > 0 ? (longWins / longs) * 100 : null;
  const shortWinRate = shorts > 0 ? (shortWins / shorts) * 100 : null;

  let sideBias: SideBias = 'balanced';
  if (sideTotal > 0) {
    if (longPct >= 55) sideBias = 'buyer';
    else if (shortPct >= 55) sideBias = 'seller';
  }

  const sortedForSeries = [...positions].sort((a, b) => {
    const timeA = a.closeUpdateTime || a.createdTime || 0;
    const timeB = b.closeUpdateTime || b.createdTime || 0;
    return timeA - timeB;
  });

  const cumulativePnlSeries: number[] = [0];
  let runningPnl = 0;
  for (const pos of sortedForSeries) {
    const { realizedPnl } = getHistoryInverseUsdValues(pos);
    runningPnl += isFinite(realizedPnl) ? realizedPnl : 0;
    cumulativePnlSeries.push(runningPnl);
  }

  return {
    totalPositions,
    totalTrades: totalPositions,
    wins,
    losses,
    breakevens,
    winRate,
    totalPnl,
    totalGrossPnl,
    totalTradeFees,
    totalFundingFees,
    totalOperationalCost,
    operationalCostPct,
    totalInitialMargin,
    roiPct,
    profitFactor,
    expectancy,
    largestWin,
    largestLoss,
    avgWin,
    avgLoss,
    riskRewardRatio,
    longs,
    shorts,
    neutralSideCount,
    longPct,
    shortPct,
    longWins,
    shortWins,
    longWinRate,
    shortWinRate,
    sideBias,
    cumulativePnlSeries,
  };
}
