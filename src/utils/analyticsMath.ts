import { UnifiedHistoryPosition } from '../types';

export function calculateWinRate(history: UnifiedHistoryPosition[]): number {
  if (!history || history.length === 0) return 0;
  
  const winningTrades = history.filter(p => p.realizedPnl > 0).length;
  return (winningTrades / history.length) * 100;
}

export function calculateProfitFactor(history: UnifiedHistoryPosition[]): number {
  if (!history || history.length === 0) return 0;
  
  const grossProfit = history.filter(p => p.realizedPnl > 0).reduce((sum, p) => sum + p.realizedPnl, 0);
  const grossLoss = history.filter(p => p.realizedPnl < 0).reduce((sum, p) => sum + Math.abs(p.realizedPnl), 0);
  
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
}

export function calculateFundingEfficiency(history: UnifiedHistoryPosition[]): number {
  if (!history || history.length === 0) return 0;
  
  const fundingReceived = history.filter(p => (p.fundingFee || 0) > 0).reduce((sum, p) => sum + (p.fundingFee || 0), 0);
  const fundingPaid = history.filter(p => (p.fundingFee || 0) < 0).reduce((sum, p) => sum + Math.abs(p.fundingFee || 0), 0);
  
  if (fundingPaid === 0) return fundingReceived > 0 ? Infinity : 0;
  return fundingReceived / fundingPaid;
}

export function calculateTotalFees(history: UnifiedHistoryPosition[]): { tradingFees: number, netFundingFees: number } {
  let tradingFees = 0;
  let netFundingFees = 0;
  
  history.forEach(p => {
    tradingFees += Math.abs(p.tradingFee || 0);
    netFundingFees += (p.fundingFee || 0);
  });
  
  return { tradingFees, netFundingFees };
}

export function calculateDailyROI(history: UnifiedHistoryPosition[]): number {
  if (history.length === 0) return 0;
  const totalPnL = history.reduce((sum, p) => sum + p.realizedPnl + (p.fundingFee || 0) + (p.tradingFee || 0), 0);
  
  const minTime = Math.min(...history.map(p => p.closeTime));
  const maxTime = Math.max(...history.map(p => p.closeTime));
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
  
  history.forEach(p => {
    const d = new Date(p.closeTime);
    const dayName = days[d.getDay()];
    const net = p.realizedPnl + (p.fundingFee || 0) + (p.tradingFee || 0);
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
