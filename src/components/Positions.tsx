import React, { useMemo, useState, useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { Activity, History, Loader2 } from 'lucide-react';
import { RestClient } from '../services/RestClient';
import { useApiKeysStore } from '../store/apiKeysStore';
import { format } from 'date-fns';

interface ClosedPosition {
  id: string;
  exchange: string;
  label: string;
  symbol: string;
  side: string;
  realizedPnl: number;
  closeTime: number;
}

export function Positions() {
  const { positions } = useDashboardStore();
  const keys = useApiKeysStore(state => state.keys);
  
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const positionsList = Object.values(positions);

  const activePositions = useMemo(() => {
    return positionsList.filter(p => Math.abs(p.size) > 0);
  }, [positionsList]);

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    let allHistory: ClosedPosition[] = [];
    
    try {
      const activeKeys = keys.filter(k => k.isActive);

      for (const k of activeKeys) {
        if (k.exchange === 'okx') {
          try {
            const res = await RestClient.getHistoryOkx(k.apiKey, k.apiSecret, k.passphrase || '');
            const mapped = res.map((p: any) => ({
              id: `${k.id}-${p.instId}-${p.cTime}`,
              exchange: k.exchange,
              label: k.label,
              symbol: p.instId,
              side: p.posSide || p.direction,
              realizedPnl: parseFloat(p.realizedPnl || p.pnl || '0'),
              closeTime: parseInt(p.uTime || p.cTime),
            }));
            allHistory = [...allHistory, ...mapped];
          } catch (e: any) {
            console.error(`OKX History Error (${k.label}):`, e);
          }
        }
        else if (k.exchange === 'bitget') {
           try {
            const res = await RestClient.getHistoryBitget(k.apiKey, k.apiSecret, k.passphrase || '');
            const mapped = res.map((p: any) => ({
              id: `${k.id}-${p.posId}-${p.cTime}`,
              exchange: k.exchange,
              label: k.label,
              symbol: p.instId,
              side: p.holdSide,
              realizedPnl: parseFloat(p.achievedProfits || p.netProfit || '0'),
              closeTime: parseInt(p.uTime),
            }));
            allHistory = [...allHistory, ...mapped];
          } catch (e: any) {
             console.error(`Bitget History Error (${k.label}):`, e);
          }
        }
        else if (k.exchange === 'bybit') {
           try {
            const res = await RestClient.getHistoryBybit(k.apiKey, k.apiSecret);
            const mapped = res.map((p: any) => ({
              id: `${k.id}-${p.orderId}`,
              exchange: k.exchange,
              label: k.label,
              symbol: p.symbol,
              side: p.side,
              realizedPnl: parseFloat(p.closedPnl || '0'),
              closeTime: parseInt(p.updatedTime),
            }));
            allHistory = [...allHistory, ...mapped];
          } catch (e: any) {
            console.error(`Bybit History Error (${k.label}):`, e);
          }
        }
      }

      // Sort by recency
      allHistory.sort((a, b) => b.closeTime - a.closeTime);
      setClosedPositions(allHistory);
    } catch (e: any) {
      setError(e.message || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'closed') {
      fetchHistory();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      
      {/* Tabs */}
      <div className="flex bg-[#151619] p-1 rounded-lg border border-[#2a2b30] w-max">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'open' ? 'bg-[#2a2b30] text-white' : 'text-[#8E9299] hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Abertas
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'closed' ? 'bg-[#2a2b30] text-white' : 'text-[#8E9299] hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Fechadas (Histórico)
        </button>
      </div>

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
        {activeTab === 'open' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1b1e] border-b border-[#2a2b30]">
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Side</th>
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Size</th>
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Entry Price</th>
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Mark Price</th>
                  <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">PnL (Unrealized)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2b30]">
                {activePositions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[#8E9299] text-sm">
                      No active positions found.
                    </td>
                  </tr>
                ) : (
                  activePositions.map((p) => {
                    const isLong = p.side === 'long' || p.side === 'buy';
                    const isShort = p.side === 'short' || p.side === 'sell';
                    const sideLabel = isLong ? 'Long' : isShort ? 'Short' : 'Net';
                    const sideClass = isLong ? 'text-[#00C853] bg-[#00C853]/10' : isShort ? 'text-[#FF4444] bg-[#FF4444]/10' : 'text-[#8E9299] bg-[#8E9299]/10';
                    
                    const pnlClass = p.unrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';

                    return (
                      <tr key={p.id} className="hover:bg-[#2a2b30]/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{p.symbol}</span>
                            <span className="text-xs font-medium text-[#8E9299] bg-[#2a2b30] px-1.5 py-0.5 rounded">
                              {p.leverage}x
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-white mr-2">{p.label}</span>
                          <span className="text-xs font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-2 py-1 rounded capitalize">
                            {p.exchange}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${sideClass}`}>
                            {sideLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono text-right">
                          {p.size.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8E9299] font-mono text-right">
                          {p.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono text-right">
                          {p.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-right ${pnlClass}`}>
                          {p.unrealizedPnl >= 0 ? '+' : ''}{p.unrealizedPnl.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[300px]">
             {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-8 h-8 text-[#2F6BFF] animate-spin" />
                </div>
             ) : error ? (
                <div className="p-8 text-center text-[#FF4444] text-sm">
                  {error}
                </div>
             ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a1b1e] border-b border-[#2a2b30]">
                      <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Time</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Symbol</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Account</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider">Side</th>
                      <th className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right">Realized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2b30]">
                    {closedPositions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-[#8E9299] text-sm">
                          No history found for active connected APIs in the last 24h.
                        </td>
                      </tr>
                    ) : (
                      closedPositions.map((p) => {
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
                              <span className="text-sm font-medium text-white mr-2">{p.label}</span>
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
                      })
                    )}
                  </tbody>
                </table>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
