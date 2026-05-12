import React, { useState, useEffect, useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { RestClient } from '../services/RestClient';
import { UnifiedHistoryPosition, formatValue } from '../types';
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
  const keys = useApiKeysStore(state => state.keys);
  
  const [closedPositions, setClosedPositions] = useState<UnifiedHistoryPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = () => {
    const end = Date.now();
    if (period === '1w') return { start: end - 7 * 24 * 60 * 60 * 1000, end };
    if (period === '2w') return { start: end - 14 * 24 * 60 * 60 * 1000, end };
    if (period === '1m') return { start: end - 30 * 24 * 60 * 60 * 1000, end };
    
    if (period === 'custom' && customStartDate && customEndDate) {
      return { 
        start: new Date(customStartDate).getTime(), 
        end: new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000 - 1
      };
    }
    return { start: end - 7 * 24 * 60 * 60 * 1000, end };
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    let allHistory: UnifiedHistoryPosition[] = [];
    const { start, end } = getDateRange();
    
    try {
      const activeKeys = keys.filter(k => k.isActive);

      for (const k of activeKeys) {
        if (k.exchange === 'okx') {
          try {
            const res = await RestClient.getHistoryOkx(k.apiKey, k.apiSecret, k.passphrase || '', start, end);
            const mapped: UnifiedHistoryPosition[] = res.map((p: any) => ({
              id: `${k.id}-${p.instId}-${p.cTime}`,
              connectionId: k.id,
              exchange: k.exchange,
              label: k.label,
              symbol: p.instId,
              side: p.posSide || p.direction,
              realizedPnl: parseFloat(p.realizedPnl || p.pnl || '0'),
              closeTime: parseInt(p.uTime || p.cTime),
              raw: p
            }));
            allHistory = [...allHistory, ...mapped];
          } catch (e: any) {
            console.error(`OKX History Error (${k.label}):`, e);
          }
        }
        else if (k.exchange === 'bitget') {
           try {
            const res = await RestClient.getHistoryBitget(k.apiKey, k.apiSecret, k.passphrase || '', start, end);
            const mapped: UnifiedHistoryPosition[] = res.map((p: any) => ({
              id: `${k.id}-${p.posId}-${p.cTime}`,
              connectionId: k.id,
              exchange: k.exchange,
              label: k.label,
              symbol: p.instId,
              side: p.holdSide || p.posSide,
              realizedPnl: parseFloat(p.achievedProfits || p.netProfit || '0'),
              closeTime: parseInt(p.uTime),
              raw: p
            }));
            allHistory = [...allHistory, ...mapped];
          } catch (e: any) {
             console.error(`Bitget History Error (${k.label}):`, e);
          }
        }
        else if (k.exchange === 'bybit') {
           try {
            const res = await RestClient.getHistoryBybit(k.apiKey, k.apiSecret, start, end);
            const mapped: UnifiedHistoryPosition[] = res.map((p: any) => ({
              id: `${k.id}-${p.orderId}`,
              connectionId: k.id,
              exchange: k.exchange,
              label: k.label,
              symbol: p.symbol,
              side: p.side,
              realizedPnl: parseFloat(p.closedPnl || '0'),
              closeTime: parseInt(p.updatedTime),
              raw: p
            }));
            allHistory = [...allHistory, ...mapped];
          } catch (e: any) {
            console.error(`Bybit History Error (${k.label}):`, e);
          }
        }
      }

      allHistory.sort((a, b) => b.closeTime - a.closeTime);
      setClosedPositions(allHistory);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [period, triggerSearch]);

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
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1b1e] border-b border-[#2a2b30]">
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Exchange</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Side</th>
                <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Realized PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]">
              {filteredClosedPositions.map((p) => {
                const isLong = p.side?.toLowerCase() === 'long' || p.side?.toLowerCase() === 'buy';
                const isShort = p.side?.toLowerCase() === 'short' || p.side?.toLowerCase() === 'sell';
                const sideLabel = isLong ? 'Long' : isShort ? 'Short' : p.side || 'Net';
                const sideClass = isLong ? 'text-[#00C853] bg-[#00C853]/10' : isShort ? 'text-[#FF4444] bg-[#FF4444]/10' : 'text-[#8E9299] bg-[#8E9299]/10';
                
                const pnlClass = p.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';

                return (
                  <tr key={p.id} className="hover:bg-[#2a2b30]/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8E9299]">
                      {p.closeTime && !isNaN(p.closeTime) ? format(new Date(p.closeTime), 'MM/dd/yy HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-white">{p.symbol}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">{p.label}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-2 py-1 rounded capitalize">
                        {p.exchange}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${sideClass}`}>
                        {sideLabel}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-right ${pnlClass}`}>
                      {p.realizedPnl >= 0 ? '+' : ''}{p.realizedPnl.toFixed(2)}
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
