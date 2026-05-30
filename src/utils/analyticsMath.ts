import { UnifiedHistoryPosition } from '../types';

export function calculateWinRate(history: UnifiedHistoryPosition[]): number {
  if (!history || history.length === 0) return 0;
  
  const winningTrades = history.filter(pos => pos.realizedPnl > 0).length;
  return (winningTrades / history.length) * 100;
}

export function calculateProfitFactor(history: UnifiedHistoryPosition[]): number {
  if (!history || history.length === 0) return 0;
  
  const grossProfit = history.filter(pos => pos.realizedPnl > 0).reduce((sum, pos) => sum + pos.realizedPnl, 0);
  const grossLoss = history.filter(pos => pos.realizedPnl < 0).reduce((sum, pos) => sum + Math.abs(pos.realizedPnl), 0);
  
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

export function calculateFundingEfficiency(history: UnifiedHistoryPosition[]): number {
  if (!history || history.length === 0) return 0;
  
  const fundingReceived = history.filter(pos => (pos.fundingFee || 0) > 0).reduce((sum, pos) => sum + (pos.fundingFee || 0), 0);
  const fundingPaid = history.filter(pos => (pos.fundingFee || 0) < 0).reduce((sum, pos) => sum + Math.abs(pos.fundingFee || 0), 0);
  
  if (fundingPaid === 0) return fundingReceived > 0 ? Infinity : 0;
  return fundingReceived / fundingPaid;
}

export function calculateTotalFees(history: UnifiedHistoryPosition[]): { tradingFees: number, netFundingFees: number } {
  let tradingFees = 0;
  let netFundingFees = 0;
  
  history.forEach(pos => {
    tradingFees += Math.abs(pos.tradingFee || 0);
    netFundingFees += (pos.fundingFee || 0);
  });
  
  return { tradingFees, netFundingFees };
}

export function calculateDailyROI(history: UnifiedHistoryPosition[]): number {
  if (history.length === 0) return 0;
  const totalPnL = history.reduce((sum, pos) => sum + pos.realizedPnl + (pos.fundingFee || 0) + (pos.tradingFee || 0), 0);
  
  const minTime = Math.min(...history.map(pos => pos.closeUpdateTime));
  const maxTime = Math.max(...history.map(pos => pos.closeUpdateTime));
  const daysActive = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24));
  
  return totalPnL / daysActive;
}

export function getSeasonalityData(history: UnifiedHistoryPosition[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap: Record<string, number> = {};
  days.forEach(d => dayMap[d] = 0);
  
  const hourWindows = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];
  const hourMap: Record<string, number> = {};
  hourWindows.forEach(h => hourMap[h] = 0);
  
  history.forEach(pos => {
    const d = new Date(pos.closeUpdateTime);
    const dayName = days[d.getDay()];
    const net = pos.realizedPnl + (pos.fundingFee || 0) + (pos.tradingFee || 0);
    dayMap[dayName] += net;
    
    const h = d.getHours();
    const windowIdx = Math.floor(h / 4);
    const windowName = hourWindows[windowIdx];
    hourMap[windowName] += net;
  });
  
  const dayData = Object.keys(dayMap).map(k => ({ name: k.substring(0, 3), PnL: dayMap[k] }));
  const hourData = Object.keys(hourMap).map(k => ({ name: k, PnL: hourMap[k] }));
  
  return { dayData, hourData };
}
