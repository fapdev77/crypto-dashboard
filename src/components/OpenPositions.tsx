import React, { useMemo, useState } from 'react';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { UnifiedPosition } from '../types';
import { formatValue } from '../utils/formatters';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';

interface OpenPositionsProps {
  filterText: string;
  exchangeFilter: string;
}

export function OpenPositions({ filterText, exchangeFilter }: OpenPositionsProps) {
  const { positions } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  const [viewMode, setViewMode] = useState<'detailed' | 'lite'>('lite');
  
  const positionsList = Object.values(positions);

  const activePositions = useMemo(() => {
    // First, filter by mock connection rule
    let filtered = useMockData 
      ? positionsList.filter(p => p.connectionId.startsWith('mocked-data'))
      : positionsList.filter(p => !p.connectionId.startsWith('mocked-data'));

    // Then, apply size filter
    filtered = filtered.filter(p => Math.abs(p.size) > 0);

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
  }, [positionsList, filterText, exchangeFilter, useMockData]);

  const { longs, shorts } = useMemo(() => {
    let longsCount = 0;
    let shortsCount = 0;
    activePositions.forEach(p => {
      const isLong = p.side === 'long' || p.side === 'buy';
      const isShort = p.side === 'short' || p.side === 'sell';
      if (isLong) longsCount++;
      if (isShort) shortsCount++;
      if (p.side === 'net') {
         if (p.size > 0) longsCount++;
         else if (p.size < 0) shortsCount++;
      }
    });
    return { longs: longsCount, shorts: shortsCount };
  }, [activePositions]);

  if (activePositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
        <p className="text-[#8E9299]">Nenhuma posição aberta encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-[#1a1b1e] rounded-lg p-2 gap-4">
        {/* Toggle View Mode */}
        <div className="flex bg-[#12131a] rounded-lg p-1 w-full sm:w-max">
          <button 
            onClick={() => setViewMode('lite')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'lite' ? 'bg-[#2a2b30] text-white' : 'text-[#8E9299] hover:text-white'}`}
          >
            Lite
          </button>
          <button 
            onClick={() => setViewMode('detailed')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'detailed' ? 'bg-[#2a2b30] text-white' : 'text-[#8E9299] hover:text-white'}`}
          >
            Detailed
          </button>
        </div>

        {/* Position Stats */}
        <div className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap px-2">
          <span className="text-[#8E9299]">Positions:</span>
          <span className="text-[#2F6BFF] ml-1">{activePositions.length}</span>
          <span className="text-[#3f4046] mx-1">-</span>
          <span className="text-[#8E9299]">Longs</span>
          <span className="text-[#00C853] ml-0.5">({longs})</span>
          <span className="text-[#3f4046] mx-1">/</span>
          <span className="text-[#8E9299]">Shorts</span>
          <span className="text-[#FF4444] ml-0.5">({shorts})</span>
        </div>
      </div>

      {viewMode === 'detailed' && activePositions.map((pos) => {
        const isLong = pos.side === 'long' || pos.side === 'buy';
        const isShort = pos.side === 'short' || pos.side === 'sell';
        const sideColor = isLong ? 'text-green-500' : isShort ? 'text-red-500' : 'text-gray-400';
        const sideLabel = isLong ? 'Long' : isShort ? 'Short' : 'Net';
        const marginModeLabel = pos.marginMode === 'isolated' ? 'Isolated' : 'Cross';
        
        const uplColor = pos.unrealizedPnl >= 0 ? 'text-green-500' : 'text-red-500';
        const roeColor = (pos.roe || 0) >= 0 ? 'text-green-500' : 'text-red-500';

        // Approximations
        const sizeValUsd = pos.notionalUsd || (pos.size * pos.markPrice); 

        return (
          <div key={pos.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col p-4 gap-4">
            
            {/* Linha 1: Cabeçalho */}
            <div className="flex justify-between items-center pb-2 border-b border-[#2a2b30]">
              <div className="flex items-center gap-2">
                <div className="flex items-center relative">
                  <CoinIcon symbol={pos.symbol} size={28} className="w-7 h-7" />
                  <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                    <ExchangeIcon exchange={pos.exchange} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <span className="font-bold text-white text-lg ml-1">{pos.symbol}</span>
                <span className={`font-semibold bg-[#2a2b30]/50 px-2 py-0.5 rounded text-sm`}>
                  {marginModeLabel} <span className="mx-1">·</span> <span className={sideColor}>{sideLabel}</span> <span className="mx-1">·</span> {pos.leverage}x
                </span>
                <span className="text-xs font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-2 py-0.5 rounded capitalize">
                  {pos.exchange} ({pos.label})
                </span>
              </div>
            </div>

            {/* Detalhes: Grid de 5 colunas x 3 linhas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-y-5 gap-x-4 text-sm mt-2">
              
              {/* Linha 1 */}
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Position</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-white">{formatValue(pos.size, 4)}</span>
                  <span className="text-[#8E9299] text-xs">≈ {formatValue(sizeValUsd, 2)} USD</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Entry price</span>
                <span className="font-mono text-white">{formatValue(pos.entryPrice, 4)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Margin</span>
                <span className="font-mono text-white">
                  {formatValue(pos.margin, 2)} <span className="font-sans text-[10px] text-[#8E9299]">{pos.ccy || 'USDT'}</span>
                  {pos.ccy && !pos.ccy.includes('USD') && pos.margin && pos.markPrice ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatValue(pos.margin * pos.markPrice, 2)} USD</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Realized PnL</span>
                <span className={`font-mono ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                  {pos.realizedPnl > 0 ? '+' : ''}{formatValue(pos.realizedPnl, 2)} <span className="font-sans text-[10px]">{pos.ccy || 'USDT'}</span>
                  {pos.ccy && !pos.ccy.includes('USD') && pos.realizedPnl && pos.markPrice ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatValue(Math.abs(pos.realizedPnl) * pos.markPrice, 2)} USD</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Entire TP/SL</span>
                <span className="font-mono text-white">
                  {pos.tp ? formatValue(pos.tp, 4) : '--'} / {pos.sl ? formatValue(pos.sl, 4) : '--'}
                </span>
              </div>

              {/* Linha 2 */}
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Unrealized PnL</span>
                <span className={`font-mono ${uplColor}`}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}{formatValue(pos.unrealizedPnl, 2)} <span className="text-[#8E9299] text-[10px] font-sans ml-1">{pos.ccy || 'USDT'}</span>
                  {pos.ccy && !pos.ccy.includes('USD') && pos.unrealizedPnl && pos.markPrice ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {pos.unrealizedPnl > 0 ? '+' : ''}{formatValue(Math.abs(pos.unrealizedPnl) * pos.markPrice, 2)} USD</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Mark price</span>
                <span className="font-mono text-white">{formatValue(pos.markPrice, 4)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Tiered maintenance margin rate</span>
                <span className="font-mono text-white">{pos.marginRatio ? formatValue(pos.marginRatio, 2) + '%' : '--'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Breakeven price</span>
                <span className="font-mono text-white">{formatValue(pos.breakEvenPrice, 4)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Partial TP/SL</span>
                <span className="font-mono text-[#8E9299]">--</span>
              </div>

              {/* Linha 3 */}
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">ROE</span>
                <span className={`font-mono ${roeColor}`}>
                  {pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Est. liq. price</span>
                <span className="font-mono text-orange-400">{formatValue(pos.liquidationPrice, 4)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Placed/ Max close</span>
                <span className="font-mono text-[#8E9299]">--/--</span>
              </div>
              <div className="hidden md:block"></div> {/* Espaço vazio na coluna 4 */}
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Trailing TP/SL/ MMR SL</span>
                <span className="font-mono text-[#8E9299]">--/--</span>
              </div>

            </div>

          </div>
        );
      })}

      {viewMode === 'lite' && (
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="border-b border-[#2a2b30] text-xs text-[#8E9299]">
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Futures</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Position | Placed</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Position value</th>
                <th className="px-4 py-3 font-normal">
                  <div className="w-max border-b border-dashed border-[#8E9299]/50">Entry price</div>
                  <div className="w-max border-b border-dashed border-[#8E9299]/50 mt-1">Mark price</div>
                </th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Est. liquidation price</th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Margin</th>
                <th className="px-4 py-3 font-normal">
                  <div className="w-max border-b border-dashed border-[#8E9299]/50">Unrealized PnL</div>
                  <div className="text-[10px] mt-0.5">(ROE)</div>
                </th>
                <th className="px-4 py-3 font-normal w-max border-b border-dashed border-[#8E9299]/50">Realized PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2b30]">
              {activePositions.map((pos) => {
                const isLong = pos.side === 'long' || pos.side === 'buy';
                const isShort = pos.side === 'short' || pos.side === 'sell';
                const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';
                const sideBorderColor = isLong ? 'border-l-[#00C853]' : isShort ? 'border-l-[#FF4444]' : 'border-l-gray-400';
                const sideLabel = isLong ? 'Long' : isShort ? 'Short' : 'Net';
                const marginModeLabel = pos.marginMode === 'isolated' ? 'Isolated' : 'Cross';
                
                const uplColor = pos.unrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
                const realizedPnlColor = pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
                
                const sizeValUsd = pos.notionalUsd || (pos.size * pos.markPrice); 

                return (
                  <tr key={pos.id} className="hover:bg-[#2a2b30]/30 transition-colors">
                    <td className={`px-4 py-3 border-l-2 ${sideBorderColor}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center relative">
                          <CoinIcon symbol={pos.symbol} size={24} className="w-6 h-6" />
                          <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                            <ExchangeIcon exchange={pos.exchange} className="w-3 h-3" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white text-sm">{pos.symbol}</span>
                        </div>
                        <span className="text-[10px] font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-1.5 py-0.5 rounded capitalize ml-1">
                          {pos.exchange} ({pos.label})
                        </span>
                      </div>
                      <div className={`text-xs mt-1.5 ${sideColor}`}>
                        {sideLabel} · {pos.leverage}x · {marginModeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm">{formatValue(pos.size, 4)}</div>
                      <div className="font-mono text-white text-sm mt-1">0</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm">{formatValue(sizeValUsd, 2)} USD</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm truncate">{formatValue(pos.entryPrice, 4)}</div>
                      <div className="font-mono text-white text-sm truncate mt-1">{formatValue(pos.markPrice, 4)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-orange-400 text-sm whitespace-nowrap">{formatValue(pos.liquidationPrice, 4)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-white text-sm flex items-center gap-1">
                        {formatValue(pos.margin, 2)} <span className="font-sans text-xs text-[#8E9299]">{pos.ccy || 'USDT'}</span>
                      </div>
                      {pos.ccy && !pos.ccy.includes('USD') && pos.margin && pos.markPrice ? (
                        <div className="font-mono text-xs mt-1 text-[#8E9299]">
                          ≈ {formatValue(pos.margin * pos.markPrice, 2)} USD
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-mono text-sm flex items-center gap-1 ${uplColor}`}>
                        {pos.unrealizedPnl > 0 ? '+' : ''}{formatValue(pos.unrealizedPnl, 2)} <span className="font-sans text-xs">{pos.ccy || 'USDT'} ({pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'})</span>
                      </div>
                      {pos.ccy && !pos.ccy.includes('USD') ? (
                        <div className={`font-mono text-xs mt-1 ${uplColor}`}>
                          ≈ {pos.unrealizedPnl > 0 ? '+' : ''}{formatValue(Math.abs(pos.unrealizedPnl || 0) * pos.markPrice, 2)} USD
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`font-mono text-sm flex items-center gap-1 ${realizedPnlColor}`}>
                        {pos.realizedPnl > 0 ? '+' : ''}{formatValue(pos.realizedPnl, 2)} <span className="font-sans text-xs">{pos.ccy || 'USDT'}</span>
                      </div>
                      {pos.ccy && !pos.ccy.includes('USD') ? (
                        <div className={`font-mono text-xs mt-1 ${realizedPnlColor}`}>
                          ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatValue(Math.abs(pos.realizedPnl || 0) * pos.markPrice, 2)} USD
                        </div>
                      ) : null}
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
