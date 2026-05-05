import React, { useMemo, useState, useEffect } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { Activity, History, Loader2, ArrowUpDown, Search, X } from 'lucide-react';
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

  const [filterText, setFilterText] = useState('');
  const [openSortConfig, setOpenSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'unrealizedPnl', direction: 'desc' });
  const [closedSortConfig, setClosedSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'closeTime', direction: 'desc' });

  const positionsList = Object.values(positions);

  const activePositions = useMemo(() => {
    let filtered = positionsList.filter(p => Math.abs(p.size) > 0);

    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(p => 
        p.symbol.toLowerCase().includes(lowerFilter) || 
        p.label.toLowerCase().includes(lowerFilter) ||
        p.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    if (openSortConfig !== null) {
      filtered.sort((a: any, b: any) => {
        let valA = a[openSortConfig.key];
        let valB = b[openSortConfig.key];
        
        if (openSortConfig.key === 'side') {
           valA = a.side === 'long' || a.side === 'buy' ? 1 : a.side === 'short' || a.side === 'sell' ? -1 : 0;
           valB = b.side === 'long' || b.side === 'buy' ? 1 : b.side === 'short' || b.side === 'sell' ? -1 : 0;
        }

        if (valA < valB) return openSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return openSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [positionsList, filterText, openSortConfig]);

  const filteredClosedPositions = useMemo(() => {
    let filtered = [...closedPositions];
    
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(p => 
        p.symbol.toLowerCase().includes(lowerFilter) || 
        p.label.toLowerCase().includes(lowerFilter) ||
        p.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    if (closedSortConfig !== null) {
      filtered.sort((a: any, b: any) => {
        let valA = a[closedSortConfig.key];
        let valB = b[closedSortConfig.key];
        
        if (closedSortConfig.key === 'side') {
           valA = a.side === 'long' || a.side === 'buy' ? 1 : a.side === 'short' || a.side === 'sell' ? -1 : 0;
           valB = b.side === 'long' || b.side === 'buy' ? 1 : b.side === 'short' || b.side === 'sell' ? -1 : 0;
        }

        if (valA < valB) return closedSortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return closedSortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [closedPositions, filterText, closedSortConfig]);

  const requestOpenSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (openSortConfig && openSortConfig.key === key && openSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setOpenSortConfig({ key, direction });
  };

  const requestClosedSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (closedSortConfig && closedSortConfig.key === key && closedSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setClosedSortConfig({ key, direction });
  };

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
      
      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
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
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#8E9299]" />
          </div>
          <input
            type="text"
            placeholder="Search positions..."
            className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full sm:w-64"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button 
              onClick={() => setFilterText('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9299] hover:text-white transition-colors"
              title="Clear filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
        {activeTab === 'open' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1b1e] border-b border-[#2a2b30]">
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('symbol')}
                  >
                    <div className="flex items-center gap-1">
                      Symbol <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('label')}
                  >
                    <div className="flex items-center gap-1">
                      Account <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('exchange')}
                  >
                    <div className="flex items-center gap-1">
                      Exchange <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('side')}
                  >
                    <div className="flex items-center gap-1">
                      Side <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('size')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Size
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('entryPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Entry Price
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('markPrice')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Mark Price
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                    onClick={() => requestOpenSort('unrealizedPnl')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> PnL (Unrealized)
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2b30]">
                {activePositions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-[#8E9299] text-sm">
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
                      <th 
                        className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                        onClick={() => requestClosedSort('closeTime')}
                      >
                        <div className="flex items-center gap-1">
                          Time <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                        onClick={() => requestClosedSort('symbol')}
                      >
                        <div className="flex items-center gap-1">
                          Symbol <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                        onClick={() => requestClosedSort('label')}
                      >
                        <div className="flex items-center gap-1">
                          Account <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                        onClick={() => requestClosedSort('exchange')}
                      >
                        <div className="flex items-center gap-1">
                          Exchange <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-pointer hover:bg-[#2a2b30]/50 group"
                        onClick={() => requestClosedSort('side')}
                      >
                        <div className="flex items-center gap-1">
                          Side <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-xs font-medium text-[#8E9299] uppercase tracking-wider text-right cursor-pointer hover:bg-[#2a2b30]/50 group"
                        onClick={() => requestClosedSort('realizedPnl')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /> Realized PnL
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2b30]">
                    {filteredClosedPositions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-[#8E9299] text-sm">
                          No history found for active connected APIs in the last 24h.
                        </td>
                      </tr>
                    ) : (
                      filteredClosedPositions.map((p) => {
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
