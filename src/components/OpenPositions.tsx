import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { UnifiedPosition } from '../types';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';

interface OpenPositionsProps {
  filterText: string;
  exchangeFilter: string;
}

export function OpenPositions({ filterText, exchangeFilter }: OpenPositionsProps) {
  const { positions } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  const { totalUnrealizedPnl, totalRealizedPnl } = useMemo(() => {
    let uPnl = 0;
    let rPnl = 0;
    activePositions.forEach(p => {
      const posCcy = p.ccy || p.baseCoin || 'USDT';
      const isFiatCcy = posCcy.includes('USD') || posCcy === 'EUR';
      const multiplier = isFiatCcy ? 1 : (p.markPrice || 1);
      
      uPnl += ((p.unrealizedPnl || 0) * multiplier);
      rPnl += ((p.realizedPnl || 0) * multiplier);
    });
    return { totalUnrealizedPnl: uPnl, totalRealizedPnl: rPnl };
  }, [activePositions]);

  if (activePositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
        <p className="text-[#8E9299]">Nenhuma posição aberta encontrada.</p>
      </div>
    );
  }

  const POSITIONS_DONUT = [
    { name: 'Long', value: longs, color: '#00C853' },
    { name: 'Short', value: shorts, color: '#FF4444' }
  ];

  return (
    <div className="space-y-4">
      {/* Header Controls */}

      {/* 3 Columns Sub-cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-xs text-[#8E9299]">Total Positions</span>
             <div className="flex items-baseline gap-2">
               <span className="text-xl font-medium text-white">{activePositions.length}</span>
               {activePositions.length > 0 && (
                 <div className="flex text-[10px] gap-2 font-mono">
                   <span className="text-[#00C853]">{longs}L ({((longs / activePositions.length) * 100).toFixed(0)}%)</span>
                   <span className="text-[#FF4444]">{shorts}S ({((shorts / activePositions.length) * 100).toFixed(0)}%)</span>
                 </div>
               )}
             </div>
           </div>
           <div className="w-12 h-12">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie data={POSITIONS_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                     {POSITIONS_DONUT.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
        
        <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
          <span className="text-xs text-[#8E9299] mb-1">Unrealized PnL</span>
          <span className={`text-lg font-medium ${totalUnrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}${formatValue(totalUnrealizedPnl, 2)}
          </span>
        </div>

        <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
          <span className="text-xs text-[#8E9299] mb-1">Realized PnL</span>
          <span className={`text-lg font-medium ${totalRealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
            {totalRealizedPnl >= 0 ? '+' : ''}${formatValue(totalRealizedPnl, 2)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
      {activePositions.map((pos) => {
        const isExpanded = expandedRows[pos.id];
        const isLong = pos.side === 'long' || pos.side === 'buy';
        const isShort = pos.side === 'short' || pos.side === 'sell';
        const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';
        const sideLabel = isLong ? 'Long' : isShort ? 'Short' : 'Net';
        const marginModeLabel = pos.marginMode === 'isolated' ? 'Isolated' : 'Cross';
        
        const uplColor = pos.unrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
        const roeColor = (pos.roe || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';
        const realizedPnlColor = pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';

        // Approximations
        const sizeValUsd = pos.notionalUsd || (pos.size * pos.markPrice); 
        const posCcy = pos.ccy || pos.baseCoin || 'USDT';

        const isFiatPair = pos.symbol.includes('USD') || pos.symbol.includes('EUR');
        const isFiatCcy = posCcy.includes('USD') || posCcy === 'EUR';
        const formatCcy = (v: number | undefined | null) => isFiatCcy ? formatValue(v, 2) : formatCrypto(v);

        return (
          <div key={pos.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40]" onClick={() => toggleRow(pos.id)}>
            
            {/* Main Row / Lite Info */}
            <div className="p-4 grid grid-cols-2 lg:grid-cols-6 gap-4">
              
              {/* Asset info */}
              <div className="flex items-center gap-3 w-full border-b border-[#2a2b30] md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
                <div className="flex items-center relative">
                  <CoinIcon symbol={pos.symbol} size={28} className="w-7 h-7" />
                  <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                    <ExchangeIcon exchange={pos.exchange} className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-white text-sm">{pos.symbol}</span>
                    <span className="text-[10px] font-medium text-[#8E9299] bg-[#1a1b1e] border border-[#2a2b30] px-1.5 py-0.5 rounded capitalize">
                      {pos.exchange} ({pos.label})
                    </span>
                  </div>
                  <span className={`text-xs mt-0.5 font-medium ${sideColor}`}>
                    {sideLabel} <span className="mx-0.5 text-[#8E9299]">·</span> {pos.leverage}x <span className="mx-0.5 text-[#8E9299]">·</span> {marginModeLabel}
                  </span>
                </div>
              </div>

              {/* Size / Value */}
              <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                <span className="text-[10px] text-[#8E9299] uppercase">Pos Size / Value</span>
                <span className="font-mono text-white text-sm">{formatCrypto(pos.size)}</span>
                <span className="text-xs text-[#8E9299] font-mono">≈ {formatValue(sizeValUsd, 2)} USD</span>
              </div>

              {/* Prices */}
              <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                <span className="text-[10px] text-[#8E9299] uppercase">Entry / Mark Price</span>
                <span className="font-mono text-white text-sm">{formatPrice(pos.entryPrice, isFiatPair)}</span>
                <span className="font-mono text-white text-xs">{formatPrice(pos.markPrice, isFiatPair)}</span>
              </div>

              {/* Margin & Liq Price */}
              <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                <span className="text-[10px] text-[#8E9299] uppercase">Liq Price / Margin</span>
                <span className="font-mono text-orange-400 text-sm whitespace-nowrap">{formatPrice(pos.liquidationPrice, isFiatPair)}</span>
                <span className="font-mono text-white text-xs">
                  {formatCcy(pos.margin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                </span>
              </div>

              {/* Unrealized PnL (ROE) */}
              <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                <span className="text-[10px] text-[#8E9299] uppercase">Unrealized PnL (ROE)</span>
                <span className={`font-mono text-sm ${uplColor}`}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                </span>
                <span className={`font-mono text-xs ${roeColor}`}>
                  {pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'}
                </span>
              </div>

              {/* Realized PnL */}
              <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                <span className="text-[10px] text-[#8E9299] uppercase">Realized PnL</span>
                <span className={`font-mono text-sm ${realizedPnlColor}`}>
                  {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                </span>
                {posCcy && !posCcy.includes('USD') && pos.realizedPnl && pos.markPrice ? (
                  <span className={`font-mono text-xs ${realizedPnlColor} opacity-80`}>
                    ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatValue(Math.abs(pos.realizedPnl) * pos.markPrice, 2)} USD
                  </span>
                ) : (
                  <span className="text-[10px] opacity-0">-</span>
                )}
              </div>

            </div>

            {/* Detalhes Expandidos: Grid de 5 colunas x 3 linhas */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 bg-[#12131a] border-t border-[#2a2b30] animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-y-5 gap-x-4 text-sm mt-4">
              
              {/* Linha 1 */}
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Position</span>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-white">{formatCrypto(pos.size)}</span>
                  <span className="text-[#8E9299] text-xs">≈ {formatValue(sizeValUsd, 2)} USD</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Entry price</span>
                <span className="font-mono text-white">{formatPrice(pos.entryPrice, isFiatPair)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Margin</span>
                <span className="font-mono text-white">
                  {formatCcy(pos.margin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                  {posCcy && !posCcy.includes('USD') && pos.margin && pos.markPrice ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatValue(pos.margin * pos.markPrice, 2)} USD</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Realized PnL</span>
                <span className={`font-mono ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                  {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                  {posCcy && !posCcy.includes('USD') && pos.realizedPnl && pos.markPrice ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatValue(Math.abs(pos.realizedPnl) * pos.markPrice, 2)} USD</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs">Entire TP/SL</span>
                <span className="font-mono text-white">
                  {pos.tp ? formatPrice(pos.tp, isFiatPair) : '--'} / {pos.sl ? formatPrice(pos.sl, isFiatPair) : '--'}
                </span>
              </div>

              {/* Linha 2 */}
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Unrealized PnL</span>
                <span className={`font-mono ${uplColor}`}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="text-[#8E9299] text-[10px] font-sans ml-1">{posCcy}</span>
                  {posCcy && !posCcy.includes('USD') && pos.unrealizedPnl && pos.markPrice ? (
                    <span className="text-[#8E9299] text-[10px] ml-1">≈ {pos.unrealizedPnl > 0 ? '+' : ''}{formatValue(Math.abs(pos.unrealizedPnl) * pos.markPrice, 2)} USD</span>
                  ) : null}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Mark price</span>
                <span className="font-mono text-white">{formatPrice(pos.markPrice, isFiatPair)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Tiered maintenance margin rate</span>
                <span className="font-mono text-white">{pos.marginRatio ? formatValue(pos.marginRatio, 2) + '%' : '--'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Breakeven price</span>
                <span className="font-mono text-white">{formatPrice(pos.breakEvenPrice, isFiatPair)}</span>
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
                <span className="font-mono text-orange-400">{formatPrice(pos.liquidationPrice, isFiatPair)}</span>
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
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}
