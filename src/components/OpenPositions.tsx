import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Search, X, AlertTriangle } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { UnifiedPosition } from '../types';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AssetClassifierAggregator } from '../services/AssetClassifierAggregator';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { AppTooltip } from './ui/Tooltip';

export function OpenPositions() {
  const { positions, balances } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const positionsList = Object.values(positions);

  const activePositions = useMemo(() => {
    // First, filter by mock connection rule
    let filtered = useMockData
      ? positionsList.filter(pos => pos.connectionId.startsWith('mocked-data'))
      : positionsList.filter(pos => !pos.connectionId.startsWith('mocked-data'));

    // Then, apply size filter
    filtered = filtered.filter(pos => Math.abs(pos.size) > 0);

    if (exchangeFilter !== 'all') {
      filtered = filtered.filter(pos => pos.exchange.toLowerCase() === exchangeFilter.toLowerCase());
    }

    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(pos =>
        pos.symbol.toLowerCase().includes(lowerFilter) ||
        pos.label.toLowerCase().includes(lowerFilter) ||
        pos.exchange.toLowerCase().includes(lowerFilter)
      );
    }

    return filtered.sort((a, b) => a.id.localeCompare(b.id));
  }, [positionsList, filterText, exchangeFilter, useMockData]);

  const { longs, shorts } = useMemo(() => {
    let longsCount = 0;
    let shortsCount = 0;
    activePositions.forEach(pos => {
      const isLong = pos.side === 'long' || pos.side === 'buy';
      const isShort = pos.side === 'short' || pos.side === 'sell';
      if (isLong) longsCount++;
      if (isShort) shortsCount++;
      if (pos.side === 'net') {
        if (pos.size > 0) longsCount++;
        else if (pos.size < 0) shortsCount++;
      }
    });
    return { longs: longsCount, shorts: shortsCount };
  }, [activePositions]);

  const { totalUnrealizedPnl, totalRealizedPnl } = useMemo(() => {
    let uPnl = 0;
    let rPnl = 0;
    activePositions.forEach(pos => {
      const posCcy = pos.ccy || pos.baseCoin || 'USDT';
      const isFiatCcy = posCcy.includes('USD') || posCcy === 'EUR';
      const multiplier = isFiatCcy ? 1 : (pos.markPrice || 1);
      uPnl += ((pos.unrealizedPnl || 0) * multiplier);
      rPnl += ((pos.realizedPnl || 0) * multiplier);
    });
    return { totalUnrealizedPnl: uPnl, totalRealizedPnl: rPnl };
  }, [activePositions]);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        {/* Exchange Filter */}
        <div className="relative z-20">
          <button
            type="button"
            onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
            className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-3 pr-2 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors flex items-center justify-between min-w-[160px]"
          >
            <div className="flex items-center gap-2">
              {exchangeFilter !== 'all' && (
                <ExchangeIcon exchange={exchangeFilter} className="w-4 h-4" />
              )}
              <span>
                {exchangeFilter === 'all'
                  ? 'Todas Exchanges'
                  : exchangeFilter.charAt(0).toUpperCase() + exchangeFilter.slice(1)}
              </span>
            </div>
            <svg className={`h-4 w-4 ml-2 text-gray-400 transition-transform ${isExchangeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isExchangeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsExchangeDropdownOpen(false)}
              />
              <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setExchangeFilter('all');
                    setIsExchangeDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${exchangeFilter === 'all' ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                    }`}
                >
                  <span>Todas Exchanges</span>
                </button>
                {Array.from(new Set(keys.filter(apiKey => apiKey.isActive).map(apiKey => apiKey.exchange))).map(exchange => (
                  <button
                    key={exchange}
                    type="button"
                    onClick={() => {
                      setExchangeFilter(exchange);
                      setIsExchangeDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${exchangeFilter === exchange ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                      }`}
                  >
                    <ExchangeIcon exchange={exchange} className="w-4 h-4" />
                    <span>{exchange.charAt(0).toUpperCase() + exchange.slice(1)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-[#8E9299]" />
          </div>
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full sm:w-50"
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

      {activePositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">Nenhuma posição aberta encontrada.</p>
        </div>
      ) : (
        <>
          {(() => {
            const POSITIONS_DONUT = [
              { name: 'Long', value: longs, color: '#00C853' },
              { name: 'Short', value: shorts, color: '#FF4444' }
            ];
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
                  <div className='flex flex-col'>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-[#8E9299]">Total Positions: </span>
                      <span className="text-xl font-medium text-white">{activePositions.length}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-medium text-white"></span>
                      {activePositions.length > 0 && (
                        <div className="flex text-xl gap-2 font-mono">
                          <span className="text-[#00C853]">{longs} Longs ({((longs / activePositions.length) * 100).toFixed(0)}%)</span>
                          <span className="text-[#00C853]"> | </span>
                          <span className="text-[#FF4444]">{shorts} Shorts ({((shorts / activePositions.length) * 100).toFixed(0)}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-24 h-24">
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
                  <span className="text-2xl text-[#8E9299] mb-1">Unrealized PnL</span>
                  <span className={`text-xl font-medium ${totalUnrealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                    {isPrivateMode ? '$••••' : `${totalUnrealizedPnl >= 0 ? '+' : ''}${formatCurrency(totalUnrealizedPnl, 'usd')}`}
                  </span>
                </div>

                <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
                  <span className="text-2xl text-[#8E9299] mb-1">Realized PnL</span>
                  <span className={`text-xl font-medium ${totalRealizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                    {isPrivateMode ? '$••••' : `${totalRealizedPnl >= 0 ? '+' : ''}${formatCurrency(totalRealizedPnl, 'usd')}`}
                  </span>
                </div>
              </div>
            );
          })()}

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
              const formatCcy = (v: number | undefined | null) => formatCurrency(v, 'crypto', isFiatCcy ? 2 : 8);

              const category = AssetClassifierAggregator.getGlobalCategorySync(pos.symbol);

              // Inverse Protection / Exposure logic
              const matchingBalance = Object.values(balances).find(
                b => b.connectionId === pos.connectionId && b.ccy.toUpperCase() === posCcy.toUpperCase()
              );
              const totalAssetBal = matchingBalance ? matchingBalance.amount : 0;
              const openPosSize = pos.markPrice > 0 ? (sizeValUsd / pos.markPrice) : Math.abs(pos.size);

              let protectedPct = 0;
              let exposedPct = 100;
              let protectedAmount = 0;
              let exposedAmount = totalAssetBal > 0 ? totalAssetBal : openPosSize;
              
              if (pos.instrumentType === 'INVERSE' && totalAssetBal > 0) {
                 if (isShort) {
                   protectedAmount = Math.min(openPosSize, totalAssetBal);
                   exposedAmount = Math.max(0, totalAssetBal - openPosSize);
                   protectedPct = (protectedAmount / totalAssetBal) * 100;
                   exposedPct = (exposedAmount / totalAssetBal) * 100;
                 } else {
                   const totalExposureAmount = totalAssetBal + openPosSize;
                   protectedAmount = 0;
                   exposedAmount = totalExposureAmount;
                   protectedPct = 0;
                   exposedPct = (totalExposureAmount / totalAssetBal) * 100;
                 }
              }

              return (
                <div key={pos.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col cursor-pointer transition-colors hover:border-[#3a3b40]" onClick={() => toggleRow(pos.id)}>

                  {/* Main Row / Lite Info */}
                  <div className="p-4 grid grid-cols-2 lg:grid-cols-7 gap-4">

                    {/* Asset info */}
                    <div className="flex items-center gap-3 w-full border-b border-[#2a2b30] md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
                      <div className="flex flex-col items-center gap-1.5 shrink-0">
                        <div className="flex items-center relative">
                          <CoinIcon symbol={pos.symbol} size={28} className="w-7 h-7" category={category} />
                          <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                            <ExchangeIcon exchange={pos.exchange} className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        {pos.instrumentType && (
                          <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
                            {pos.instrumentType}
                          </span>
                        )}
                        <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
                          {category}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-sm">{pos.symbol}</span>
                        </div>
                        <span className={`text-xs mt-0.5 font-medium ${sideColor}`}>
                          {sideLabel} <span className="mx-0.5 text-[#8E9299]">·</span> {pos.leverage}x <span className="mx-0.5 text-[#8E9299]">·</span> {marginModeLabel}
                        </span>
                        <span className="w-max text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] mt-2 py-0.5 px-1.5 rounded-[4px] capitalize">
                          {pos.label}
                        </span>
                      </div>
                    </div>

                    {/* Size / Value */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <span className="text-[10px] text-[#8E9299] uppercase">Pos Size / Value</span>
                      <span className="font-mono text-white text-sm">{formatCurrency(pos.size, 'crypto')}</span>
                      <span className="text-xs text-[#8E9299] font-mono">≈ {formatCurrency(sizeValUsd, 'crypto', 2)} USD</span>
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
                        {posCcy && !posCcy.includes('USD') && pos.unrealizedPnl !== undefined && pos.markPrice ? (pos.unrealizedPnl > 0 ? '+' : '') + formatCurrency(Math.abs(pos.unrealizedPnl) * pos.markPrice, 'crypto', 2) + ' USD / ' : ''}
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
                          ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(pos.realizedPnl) * pos.markPrice, 'crypto', 2)} USD
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-0">-</span>
                      )}
                    </div>

                    {/* Inverse - Protected / Exposed */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <span className="text-[10px] text-[#8E9299] uppercase">Hedge / Exposure</span>
                      {pos.instrumentType === 'INVERSE' ? (
                        <>
                          <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                            <span className="text-[#00C853]">{protectedPct.toFixed(1)}%</span>
                            <span className={exposedPct > 0 ? "text-[#FF4444]" : "text-[#8E9299]"}>{exposedPct.toFixed(1)}%</span>
                          </div>
                          <div className="flex h-1.5 rounded-full overflow-hidden w-full bg-[#2a2b30] mt-0.5 mb-0.5">
                            <div className="bg-[#00C853] h-full transition-all duration-300" style={{ width: `${Math.min(100, protectedPct)}%` }} />
                            <div className="bg-[#FF4444] h-full transition-all duration-300" style={{ width: `${Math.min(100, exposedPct)}%` }} />
                          </div>
                          <div className="flex justify-between text-[9px] font-mono text-[#8E9299] leading-none text-opacity-80">
                            <span>Bal: {formatCcy(totalAssetBal)}</span>
                            <span>Pos: {formatCcy(openPosSize)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-1 items-center h-full">
                          <span className="text-[#8E9299] font-mono">—</span>
                        </div>
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
                            <span className="font-mono text-white">{formatCurrency(pos.size, 'crypto')}</span>
                            <span className="text-[#8E9299] text-xs">≈ {formatCurrency(sizeValUsd, 'crypto', 2)} USD</span>
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
                              <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(pos.margin * pos.markPrice, 'crypto', 2)} USD</span>
                            ) : null}
                          </span>
                        </div>
                        <AppTooltip
                          side="top"
                          rows={[
                            { label: 'Realized PnL', value: `${pos.realizedPnl > 0 ? '+' : ''}${formatCcy(pos.realizedPnl)} ${posCcy}`, valueClassName: pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]' },
                            { label: 'Closed PnL', value: `${formatCcy((pos.realizedPnl || 0) + Math.abs(pos.fundingFee || 0) + Math.abs(pos.tradingFee || 0))} ${posCcy}` },
                            { label: 'Funding fee', value: `${formatCcy(-(Math.abs(pos.fundingFee || 0)))} ${posCcy}`, valueClassName: 'text-[#FF4444]' },
                            { label: 'Trading fee', value: `${formatCcy(-(Math.abs(pos.tradingFee || 0)))} ${posCcy}`, valueClassName: 'text-[#FF4444]' }
                          ]}
                        >
                          <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Realized PnL</span>
                            <span className={`font-mono ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                              {posCcy && !posCcy.includes('USD') && pos.realizedPnl && pos.markPrice ? (
                                <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(Math.abs(pos.realizedPnl) * pos.markPrice, 'crypto', 2)} USD</span>
                              ) : null}
                            </span>
                          </div>
                        </AppTooltip>
                        
                        {pos.instrumentType === 'INVERSE' ? (
                          <div className="col-span-2 md:col-span-1 md:row-span-3 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Hedge Pro Details</span>
                              
                              <div className="flex flex-col gap-3 mt-1">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[#8E9299]">Balanço Total:</span>
                                  <span className="font-mono text-white text-[13px]">
                                    {formatCcy(totalAssetBal)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ ${formatCurrency(totalAssetBal * (pos.markPrice || 0), 'usd', 2)} USD</span>
                                  </span>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[#00C853]">Protegido: {protectedPct.toFixed(2)}%</span>
                                  <span className="font-mono text-white text-[13px]">
                                    {formatCcy(protectedAmount)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ ${formatCurrency(protectedAmount * (pos.markPrice || 0), 'usd', 2)} USD</span>
                                  </span>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[#FF4444]">Exposto: {exposedPct.toFixed(2)}%</span>
                                  <span className="font-mono text-white text-[13px]">
                                    {formatCcy(exposedAmount)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ ${formatCurrency(exposedAmount * (pos.markPrice || 0), 'usd', 2)} USD</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {!isShort && (
                              <div className="flex items-start gap-1 py-1.5 px-2 bg-orange-500/10 border border-orange-500/20 rounded">
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                                <span className="text-[9.5px] text-orange-300 font-medium leading-tight">Posição alavancada! Foco no gerenciamento de risco!</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-[#8E9299] text-xs">Entire TP/SL</span>
                            <span className="font-mono text-white">
                              {pos.tp ? formatPrice(pos.tp, isFiatPair) : '--'} / {pos.sl ? formatPrice(pos.sl, isFiatPair) : '--'}
                            </span>
                          </div>
                        )}

                        {/* Linha 2 */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Unrealized PnL</span>
                          <span className={`font-mono ${uplColor}`}>
                            {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="text-[#8E9299] text-[10px] font-sans ml-1">{posCcy}</span>
                            {posCcy && !posCcy.includes('USD') && pos.unrealizedPnl && pos.markPrice ? (
                              <span className="text-[#8E9299] text-[10px] ml-1">≈ {pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(pos.unrealizedPnl) * pos.markPrice, 'crypto', 2)} USD</span>
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
                        <AppTooltip
                          description="At the breakeven price, your total PnL will be zero if you close your remaining position. Note that the breakeven price, which includes the trading fee and funding fee, is updated every second. Your realized PnL is displayed with fixed decimal places."
                          side="top"
                          rows={[
                            { label: 'Realized PnL', value: `${pos.realizedPnl > 0 ? '+' : ''}${formatCcy(pos.realizedPnl)} ${posCcy}`, valueClassName: pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]' },
                            { label: 'Closed PnL', value: `${formatCcy((pos.realizedPnl || 0) + Math.abs(pos.fundingFee || 0) + Math.abs(pos.tradingFee || 0))} ${posCcy}` },
                            { label: 'Funding fee', value: `${formatCcy(-(Math.abs(pos.fundingFee || 0)))} ${posCcy}`, valueClassName: 'text-[#FF4444]' },
                            { label: 'Trading fee', value: `${formatCcy(-(Math.abs(pos.tradingFee || 0)))} ${posCcy}`, valueClassName: 'text-[#FF4444]' }
                          ]}
                        >
                          <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Breakeven price</span>
                            <span className="font-mono text-white">{formatPrice(pos.breakEvenPrice, isFiatPair)}</span>
                          </div>
                        </AppTooltip>
                        {pos.instrumentType !== 'INVERSE' && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Partial TP/SL</span>
                            <span className="font-mono text-[#8E9299]">--</span>
                          </div>
                        )}

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
                        {pos.instrumentType !== 'INVERSE' && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Trailing TP/SL/ MMR SL</span>
                            <span className="font-mono text-[#8E9299]">--/--</span>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
