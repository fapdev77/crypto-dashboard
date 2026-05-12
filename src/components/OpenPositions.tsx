import React, { useMemo } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { UnifiedPosition, formatValue } from '../types';

interface OpenPositionsProps {
  filterText: string;
  exchangeFilter: string;
}

export function OpenPositions({ filterText, exchangeFilter }: OpenPositionsProps) {
  const { positions } = useDashboardStore();
  const positionsList = Object.values(positions);

  const activePositions = useMemo(() => {
    let filtered = positionsList.filter(p => Math.abs(p.size) > 0);

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
  }, [positionsList, filterText, exchangeFilter]);

  if (activePositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
        <p className="text-[#8E9299]">Nenhuma posição aberta encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activePositions.map((pos) => {
        const isLong = pos.side === 'long' || pos.side === 'buy';
        const isShort = pos.side === 'short' || pos.side === 'sell';
        const sideColor = isLong ? 'text-green-500' : isShort ? 'text-red-500' : 'text-gray-400';
        const sideLabel = isLong ? 'Long' : isShort ? 'Short' : 'Net';
        const marginModeLabel = pos.marginMode === 'isolated' ? 'Isolated' : 'Cross';
        
        const uplColor = pos.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500';
        const roeColor = (pos.roe || 0) >= 0 ? 'text-green-500' : 'text-red-500';

        // Approximations
        const sizeValUsd = pos.size * pos.markPrice; 

        return (
          <div key={pos.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col p-4 gap-4">
            
            {/* Linha 1: Cabeçalho */}
            <div className="flex justify-between items-center pb-2 border-b border-[#2a2b30]">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{pos.symbol}</span>
                <span className={`font-semibold bg-[#2a2b30]/50 px-2 py-0.5 rounded text-sm`}>
                  {marginModeLabel} <span className="mx-1">·</span> <span className={sideColor}>{sideLabel}</span> <span className="mx-1">·</span> {pos.leverage}x
                </span>
                <span className="text-xs font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-2 py-0.5 rounded capitalize">
                  {pos.exchange} ({pos.label})
                </span>
              </div>
            </div>

            {/* Linha 2: Grid 6 colunas */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-xs">Position</span>
                <span className="font-mono text-white mt-1">{formatValue(pos.size, 4)}</span>
                <span className="text-[#8E9299] text-xs mt-0.5">≈ {formatValue(sizeValUsd, 2)} USD</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-xs">Entry Price</span>
                <span className="font-mono text-white mt-1">{formatValue(pos.entryPrice, 4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-xs">Margin</span>
                <span className="font-mono text-white mt-1">{formatValue(pos.margin, 4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-xs">Realized PnL</span>
                <span className="font-mono text-white mt-1">{formatValue(pos.realizedPnl, 4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-xs">Entire TP/SL</span>
                <span className="font-mono text-white mt-1">
                  {pos.tp ? formatValue(pos.tp, 4) : '--'} / {pos.sl ? formatValue(pos.sl, 4) : '--'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299] text-xs">Unrealized PnL</span>
                <span className={`font-mono text-lg font-semibold mt-1 ${uplColor}`}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}{formatValue(pos.unrealizedPnl, 4)}
                </span>
              </div>
            </div>

            {/* Linha 3: Grid 8 colunas - Small Font */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-xs pt-2 border-t border-[#2a2b30]/50">
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Mark Price</span>
                <span className="font-mono text-gray-300 mt-1">{formatValue(pos.markPrice, 4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Tiered MMR</span>
                <span className="font-mono text-gray-300 mt-1">{pos.marginRatio ? formatValue(pos.marginRatio, 2) + '%' : '--'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Breakeven Price</span>
                <span className="font-mono text-gray-300 mt-1">{formatValue(pos.breakEvenPrice, 4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Partial TP/SL</span>
                <span className="font-mono text-gray-300 mt-1">--/--</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">ROE</span>
                <span className={`font-mono mt-1 ${roeColor}`}>
                  {pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Est. liq. price</span>
                <span className="font-mono text-orange-400 mt-1">{formatValue(pos.liquidationPrice, 4)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Placed/Max close</span>
                <span className="font-mono text-gray-300 mt-1">--/--</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#8E9299]">Trailing TP/SL</span>
                <span className="font-mono text-gray-300 mt-1">--/--</span>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
}
