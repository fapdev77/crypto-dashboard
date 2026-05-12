import React, { useState, useEffect, useMemo } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
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
  const useMockData = useSettingsStore(state => state.useMockData);
  
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
      if (useMockData) {
        // Generate mock history data
        allHistory = [
          {
            id: 'mock-hist-1',
            connectionId: 'mock',
            exchange: 'bybit',
            label: 'Mock Account',
            symbol: 'BTCUSDT',
            side: 'long',
            realizedPnl: 150.25,
            closeTime: Date.now() - 3600000, // 1 hour ago
            entryPrice: 60100.5,
            closePrice: 60500.0,
            size: 0.375,
            raw: { leverage: 10, marginMode: 'cross' }
          },
          {
            id: 'mock-hist-2',
            connectionId: 'mock',
            exchange: 'okx',
            label: 'Mock Account',
            symbol: 'ETH-USDT-SWAP',
            side: 'short',
            realizedPnl: -45.50,
            closeTime: Date.now() - 86400000, // 1 day ago
            entryPrice: 3100.25,
            closePrice: 3150.75,
            size: 0.9,
            raw: { leverage: 5, marginMode: 'isolated' }
          },
          {
            id: 'mock-hist-3',
            connectionId: 'mock',
            exchange: 'bitget',
            label: 'Mock Account',
            symbol: 'SOLUSDT',
            side: 'long',
            realizedPnl: 320.75,
            closeTime: Date.now() - 172800000, // 2 days ago
            entryPrice: 140.5,
            closePrice: 152.0,
            size: 27.8,
            raw: { leverage: 20, marginMode: 'cross' }
          }
        ];
        
        setClosedPositions(allHistory);
        return;
      }

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
              entryPrice: parseFloat(p.openAvgPx || '0'),
              closePrice: parseFloat(p.avgPx || p.closeAvgPx || '0'),
              size: parseFloat(p.closeVol || p.closeTotalPos || '0'),
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
              entryPrice: parseFloat(p.openPriceAvg || p.openAvgPx || '0'),
              closePrice: parseFloat(p.closePriceAvg || p.closeAvgPx || '0'),
              size: parseFloat(p.closeSize || p.closeVol || '0'),
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
              entryPrice: parseFloat(p.avgEntryPrice || '0'),
              closePrice: parseFloat(p.avgExitPrice || '0'),
              size: parseFloat(p.closedSize || '0'),
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
  }, [period, triggerSearch, useMockData]);

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
