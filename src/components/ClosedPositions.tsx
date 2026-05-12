import React, { useMemo, useState, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { formatValue } from '../types';
import { usePositionHistory } from '../hooks/usePositionHistory';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ClosedPositionsProps {
  filterText: string;
  exchangeFilter: string;
  period: '1w' | '2w' | '1m' | 'custom';
  customStartDate: string;
  customEndDate: string;
  onCustomDateSearch: () => void;
  triggerSearch: boolean; // Just a dummy prop if needed to re-trigger
}

export function ClosedPositions({ filterText, exchangeFilter, period, customStartDate, customEndDate, triggerSearch }: ClosedPositionsProps) {
  const { positions: closedPositions, isLoading } = usePositionHistory(period, customStartDate, customEndDate, triggerSearch);
  const [error, setError] = useState<string | null>(null);

  const filteredClosedPositions = useMemo(() => {
    let filtered = [...closedPositions];
    
    if (exchangeFilter !== 'all') {
      filtered = filtered.filter(p => p.exchange.toLowerCase() === exchangeFilter.toLowerCase());
    }

    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(p => 
        p.symbol.toLowerCase().includes(lowerFilter) || 
        p.label.toLowerCase().includes(lowerFilter) ||
        p.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered;
  }, [closedPositions, filterText, exchangeFilter]);

  const closedStats = useMemo(() => {
    if (!filteredClosedPositions.length) return null;
    
    let totalPnl = 0;
    let wins = 0;
    let losses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let sumWin = 0;
    let sumLoss = 0;

    filteredClosedPositions.forEach(p => {
      totalPnl += p.realizedPnl;
      if (p.realizedPnl > 0) {
        wins++;
        sumWin += p.realizedPnl;
        if (p.realizedPnl > largestWin) largestWin = p.realizedPnl;
      } else if (p.realizedPnl < 0) {
        losses++;
        sumLoss += p.realizedPnl;
        if (p.realizedPnl < largestLoss) largestLoss = p.realizedPnl;
      }
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? sumWin / wins : 0;
    const avgLoss = losses > 0 ? sumLoss / losses : 0;

    return {
      totalPnl,
      totalTrades,
      winRate,
      wins,
      losses,
      largestWin,
      largestLoss,
      avgWin,
      avgLoss
    };
  }, [filteredClosedPositions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-[#2F6BFF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-[#FF4444] text-sm bg-[#151619] rounded-xl border border-[#2a2b30]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {closedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Total PnL</span>
            <div className={`text-xl font-bold mt-1 ${closedStats.totalPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
              {closedStats.totalPnl >= 0 ? '+' : ''}{closedStats.totalPnl.toFixed(2)} USDT
            </div>
          </div>
          
          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Win Rate</span>
            <div className="text-xl font-bold mt-1 text-white">
              {closedStats.winRate.toFixed(2)}%
            </div>
            <div className="text-xs text-[#8E9299] mt-1">
              {closedStats.wins} W / {closedStats.losses} L
            </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Trades</span>
            <div className="text-xl font-bold mt-1 text-white">
              {closedStats.totalTrades}
            </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Avg Win / Loss</span>
            <div className="text-sm font-medium mt-1">
              <span className="text-[#00C853]">+{closedStats.avgWin.toFixed(2)}</span>
              <span className="text-[#8E9299] mx-1">/</span>
              <span className="text-[#FF4444]">{closedStats.avgLoss.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] p-4 rounded-xl">
            <span className="text-[#8E9299] text-xs font-medium uppercase tracking-wider">Largest W/L</span>
            <div className="text-sm font-medium mt-1">
              <span className="text-[#00C853]">+{closedStats.largestWin.toFixed(2)}</span>
              <span className="text-[#8E9299] mx-1">/</span>
              <span className="text-[#FF4444]">{closedStats.largestLoss.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {filteredClosedPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">Nenhum histórico encontrado para as APIs ativas no período.</p>
        </div>
      ) : (
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="border-b border-[#2a2b30] text-xs text-[#8E9299]">
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Futures</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Open time</th>
                <th className="px-4 py-3 font-normal">
                  <div className="w-max border-b border-dashed border-[#8E9299]/50">Avg. entry price</div>
                  <div className="w-max border-b border-dashed border-[#8E9299]/50 mt-1">Avg. exit price</div>
                </th>
                <th className="px-4 py-3 font-normal">
                  <div className="w-max border-b border-dashed border-[#8E9299]/50">Closed quantity</div>
                  <div className="w-max border-b border-dashed border-[#8E9299]/50 mt-1">Max position size</div>
                </th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Position PnL</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Position ROI</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Closed time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]">
              {filteredClosedPositions.map((p) => {
                const isLong = p.side?.toLowerCase() === 'long' || p.side?.toLowerCase() === 'buy';
                const isShort = p.side?.toLowerCase() === 'short' || p.side?.toLowerCase() === 'sell';
                const sideLabel = isLong ? 'Long' : isShort ? 'Short' : p.side || 'Net';
                const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';
                
                const pnlClass = p.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
                
                const leverage = p.raw?.leverage || p.raw?.lever || '1';
                const marginModeLabel = (p.raw?.marginMode || p.raw?.mgnMode || 'cross').toLowerCase() === 'isolated' ? 'Isolated' : 'Cross';
                const symbolSuffix = p.symbol.replace(/USDT|USDC|USD|-|SWAP/g, '');

                let roiStr = '--';
                let roiValue = 0;
                let hasRoi = false;
                
                // Identify the quote currency for the PnL (e.g. USDT)
                // For USDT/USDC margined, it's usually the part after - or just USDT
                const isUSDT = p.symbol.includes('USDT');
                const isUSDC = p.symbol.includes('USDC');
                const pnlCurrency = isUSDT ? 'USDT' : (isUSDC ? 'USDC' : 'USD');
                
                if (p.raw?.roi !== undefined && p.raw?.roi !== null) {
                   roiValue = parseFloat(p.raw.roi) * 100;
                   hasRoi = true;
                } else if (p.entryPrice && p.closePrice && p.size && leverage) {
                  const numLeverage = parseFloat(leverage);
                  
                  let positionValueUsd = 0;
                  
                  // For OKX, size is in contracts. We can deduce actual coin size from 'pnl' and price diff
                  if (p.exchange === 'okx' && p.raw?.pnl) {
                    const priceDiff = Math.abs(p.closePrice - p.entryPrice);
                    const purePnl = Math.abs(parseFloat(p.raw.pnl));
                    if (priceDiff > 0) {
                      const actualCoinSize = purePnl / priceDiff;
                      positionValueUsd = actualCoinSize * p.entryPrice;
                    } else {
                      // Fallback if price diff is 0 (ROI is 0 anyway)
                      positionValueUsd = p.entryPrice * p.size;
                    }
                  } else if (p.exchange === 'bybit' && p.raw?.cumEntryValue) {
                    positionValueUsd = parseFloat(p.raw.cumEntryValue);
                  } else {
                    // For Bitget and others where size is in base coin
                    positionValueUsd = p.entryPrice * p.size;
                  }
                  
                  const initialMargin = positionValueUsd / numLeverage;
                  
                  if (initialMargin > 0) {
                     roiValue = (p.realizedPnl / initialMargin) * 100;
                     hasRoi = true;
                  }
                }
                
                if (hasRoi && isFinite(roiValue)) {
                   roiStr = `${roiValue > 0 ? '+' : ''}${formatValue(roiValue, 2)}%`;
                }
                
                const roiClass = hasRoi ? (roiValue >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]') : 'text-[#8E9299]';

                return (
                  <tr key={p.id} className="hover:bg-[#2a2b30]/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.symbol}</span>
                        <span className="text-[10px] font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-1.5 py-0.5 rounded capitalize">
                          {p.exchange} ({p.label})
                        </span>
                      </div>
                      <div className={`text-xs mt-1 flex items-center gap-1 ${sideColor}`}>
                        {sideLabel} · {leverage}x · {marginModeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#8E9299]">
                      <div className="text-sm font-mono text-white">--</div>
                      <div className="text-sm font-mono text-white mt-1">--</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm truncate">{formatValue(p.entryPrice, 4)}</div>
                      <div className="font-mono text-white text-sm truncate mt-1">{formatValue(p.closePrice, 4)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm">{p.size ? formatValue(p.size, 4) : '--'} <span className="font-sans text-xs text-[#8E9299]">{p.exchange === 'okx' ? 'Cont.' : symbolSuffix}</span></div>
                      <div className="font-mono text-[#8E9299] text-xs mt-1">{p.size ? formatValue(p.size, 4) : '--'} <span className="font-sans text-xs text-[#8E9299]">{p.exchange === 'okx' ? 'Cont.' : symbolSuffix}</span></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-mono text-sm ${pnlClass}`}>
                        {p.realizedPnl > 0 ? '+' : ''}{formatValue(p.realizedPnl, 4)} <span className="font-sans text-xs text-[#8E9299]">{pnlCurrency}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm ${roiClass}`}>{roiStr}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm">
                        {p.closeTime && !isNaN(p.closeTime) ? format(new Date(p.closeTime), 'yyyy-MM-dd') : '--'}
                      </div>
                      <div className="font-mono text-white text-sm mt-1">
                        {p.closeTime && !isNaN(p.closeTime) ? format(new Date(p.closeTime), 'HH:mm:ss') : '--'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
