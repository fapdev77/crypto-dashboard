import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, Activity } from 'lucide-react';
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
import { getInverseUsdValues } from '../utils/inverseUtils';
import { FilterBar } from './ui/FilterBar';

export function OpenPositions() {
  const { positions, balances } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');

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
    let uPnl = new Big(0);
    let rPnl = new Big(0);
    activePositions.forEach(pos => {
      const { unrealizedPnl, realizedPnl } = getInverseUsdValues(pos);

      const uVal = new Big(unrealizedPnl || 0);
      const rVal = new Big(realizedPnl || 0);

      uPnl = uPnl.plus(uVal);
      rPnl = rPnl.plus(rVal);
    });
    return { totalUnrealizedPnl: Number(uPnl), totalRealizedPnl: Number(rPnl) };
  }, [activePositions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
          <Activity className="w-5 h-5 text-[#2F6BFF]" />
          Open Positions
        </h2>
      </div>

      {/* Header Controls */}
      <FilterBar
        exchange={{
          value: exchangeFilter,
          onChange: setExchangeFilter,
          labelAll: 'All Exchanges',
        }}
        search={{
          value: filterText,
          onChange: setFilterText,
          placeholder: 'Search...',
        }}
      />

      {activePositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">No open positions found.</p>
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

              const fundingFee = pos.accumulatedFunding ? parseFloat(pos.accumulatedFunding) : 0;
              const tradingFee = pos.accumulatedTradingFee ? parseFloat(pos.accumulatedTradingFee) : 0;
              const closedPnl = pos.closedPnl !== undefined ? pos.closedPnl : 0;

              // Normalize inverse PnL to USD values
              const inverseVals = getInverseUsdValues(pos);

              // Approximations using normalized USD values where helpful
              const sizeValUsd = pos.notionalUsd || inverseVals.positionValue || (pos.size * pos.markPrice);
              const posCcy = pos.ccy || pos.baseCoin || 'USDT';

              const isFiatPair = pos.symbol.toUpperCase().includes('USD') || pos.symbol.toUpperCase().includes('EUR') || pos.symbol.toUpperCase().includes('BRL');
              const isFiatCcy = posCcy.toUpperCase().includes('USD') || posCcy.toUpperCase() === 'EUR' || posCcy.toUpperCase() === 'BRL';
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

              const posTypeStr = pos.instrumentType === 'INVERSE' ? 'CM Perpetual Inverse' :
                (pos.instrumentType && pos.instrumentType !== 'SWAP' && pos.instrumentType !== 'PERPETUAL') ?
                  pos.instrumentType.charAt(0).toUpperCase() + pos.instrumentType.slice(1).toLowerCase() :
                  'Perpetual';
              const posTitle = `${pos.symbol} ${posTypeStr}`;
              const baseCoinClean = pos.baseCoin || pos.symbol.replace(/USDT|USDC|USD|EUR|BUSD|BTC$/i, '');

              const entryPriceTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-1 w-full max-w-[250px]">
                    <span className="text-[13px] font-medium text-white tracking-wide font-sans">
                      Entry Price
                    </span>
                    <p className="text-[12px] text-[#8E9299] leading-snug">
                      Current position average price.
                    </p>
                  </div>
                )
              };

              const markPriceTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-1 w-full max-w-[280px]">
                    <span className="text-[13px] font-medium text-white tracking-wide font-sans">
                      Mark Price
                    </span>
                    <p className="text-[12px] text-[#8E9299] leading-snug">
                      The mark price is determined by the real-time index price and the upcoming funding rate, reflecting the current fair price of the futures. The mark price is used to calculate the unrealized PnL of the position and trigger liquidations.
                    </p>
                  </div>
                )
              };

              const unrealizedPnlTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-1 w-full max-w-[280px]">
                    <span className="text-[13px] font-medium text-white tracking-wide font-sans">
                      Unrealized PnL
                    </span>
                    <p className="text-[12px] text-[#8E9299] leading-snug">
                      Unrealized PnL calculation.
                    </p>
                  </div>
                )
              };

              const liqPriceTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-1 w-full max-w-[280px]">
                    <span className="text-[13px] font-medium text-white tracking-wide font-sans">
                      Est. Liq. Price
                    </span>
                    <p className="text-[12px] text-[#8E9299] leading-snug">
                      The estimated price at which an open position will be liquidated. This price is for reference only. The actual liquidation price is determined when your maintenance margin ratio drops to 100% or lower and your position is liquidated or reduced.
                    </p>
                  </div>
                )
              };

              const marginTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-1 w-full max-w-[280px]">
                    <span className="text-[13px] font-medium text-white tracking-wide font-sans">
                      Margin
                    </span>
                    <p className="text-[12px] text-[#8E9299] leading-snug">
                      The margin allocated to your open position.
                    </p>
                  </div>
                )
              };

              const maintenanceMarginTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-1 w-full max-w-[280px]">
                    <span className="text-[13px] font-medium text-white tracking-wide font-sans">
                      {pos.exchange === 'okx' ? 'Maintenance Margin Ratio (MMR)' : 'Maintenance Margin'}
                    </span>
                    <p className="text-[12px] text-[#8E9299] leading-snug">
                      {pos.exchange === 'okx'
                        ? 'Maintenance margin ratio (MMR) is a risk metric for your positions. The lower the maintenance margin ratio, the higher the risk. When the maintenance margin ratio reaches or drops below 100%, your positions will be reduced or liquidated.'
                        : 'The minimum amount of margin that must be maintained to keep the position open. If the margin drops below this value, the position will be liquidated.'}
                    </p>
                  </div>
                )
              };

              const sizeTooltipProps = {
                side: "top" as const,
                description: (
                  <div className="flex flex-col gap-2 w-full min-w-[220px]">
                    <div className="text-[13px] font-medium text-white border-b border-[#2a2b30] pb-2 tracking-wide font-sans">
                      {posTitle}
                    </div>
                  </div>
                ),
                rows: [
                  {
                    label: 'Side',
                    value: sideLabel,
                    labelClassName: 'text-[12px] text-[#8E9299]',
                    valueClassName: `text-[12px] font-medium ${sideColor}`
                  },
                  {
                    label: 'Number of contracts',
                    value: `${formatCurrency(Math.abs(pos.size), 'crypto')} contracts`,
                    labelClassName: 'text-[12px] text-[#8E9299]',
                    valueClassName: 'text-[12px] font-mono text-white'
                  },
                  {
                    label: 'Total crypto',
                    value: `${pos.instrumentType === 'INVERSE' ? formatCurrency(openPosSize, 'crypto', 8) : formatCurrency(Math.abs(pos.size), 'crypto')} ${baseCoinClean}`,
                    labelClassName: 'text-[12px] text-[#8E9299]',
                    valueClassName: 'text-[12px] font-mono text-white'
                  },
                  {
                    label: 'Total value',
                    value: `${formatCurrency(sizeValUsd, 'usd', 2)} USD`,
                    labelClassName: 'text-[12px] text-[#8E9299]',
                    valueClassName: 'text-[12px] font-mono text-white'
                  }
                ]
              };

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
                      <AppTooltip {...sizeTooltipProps}>
                        <div className="flex flex-col gap-0.5 cursor-help w-max focus:outline-none">
                          <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max">Pos Size / Value</span>
                          <span className="font-mono text-white text-sm">{formatCurrency(pos.size, 'crypto')} {baseCoinClean}</span>
                          <span className="text-xs text-[#8E9299] font-mono">≈ {formatCurrency(sizeValUsd, 'crypto', 2)} USD</span>
                        </div>
                      </AppTooltip>
                    </div>

                    {/* Prices */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <div className="flex items-center gap-1">
                        <AppTooltip {...entryPriceTooltipProps}>
                          <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Entry</span>
                        </AppTooltip>
                        <span className="text-[10px] text-[#8E9299] uppercase">/</span>
                        <AppTooltip {...markPriceTooltipProps}>
                          <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Mark</span>
                        </AppTooltip>
                      </div>
                      <span className="font-mono text-white text-sm">{formatPrice(pos.entryPrice, isFiatPair)}</span>
                      <span className="font-mono text-white text-xs">{formatPrice(pos.markPrice, isFiatPair)}</span>
                    </div>

                    {/* Margin & Liq Price */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <div className="flex items-center gap-1">
                        <AppTooltip {...liqPriceTooltipProps}>
                          <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Liq Price</span>
                        </AppTooltip>
                        <span className="text-[10px] text-[#8E9299] uppercase">/</span>
                        <AppTooltip {...marginTooltipProps}>
                          <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Margin</span>
                        </AppTooltip>
                      </div>
                      <span className="font-mono text-orange-400 text-sm whitespace-nowrap">{formatPrice(pos.liquidationPrice, isFiatPair)}</span>
                      <span className="font-mono text-white text-xs">
                        {formatCcy(pos.margin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                      </span>
                    </div>

                    {/* Unrealized PnL (ROE) */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <AppTooltip {...unrealizedPnlTooltipProps}>
                        <span className="text-[10px] text-[#8E9299] uppercase border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Unrealized PnL (ROE)</span>
                      </AppTooltip>
                      <span className={`font-mono text-sm ${uplColor}`}>
                        {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                      </span>
                      <AppTooltip description="Return on Equity (ROE) based on Unrealized PnL.">
                        <span className={`font-mono text-xs w-max cursor-help border-b border-dashed border-[#8E9299]/50 ${roeColor}`}>
                          {inverseVals.isInverse && pos.unrealizedPnl !== undefined ? (pos.unrealizedPnl > 0 ? '+' : '') + formatCurrency(Math.abs(inverseVals.unrealizedPnl), 'usd', 2) + ' / ' : ''}
                          {pos.roe !== undefined ? (pos.roe > 0 ? '+' : '') + formatValue(pos.roe, 2) + '%' : '--'}
                        </span>
                      </AppTooltip>
                    </div>

                    {/* Realized PnL */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <AppTooltip
                        side="top"
                        description={
                          <div className="flex flex-col gap-1 w-full min-w-[180px]">
                            <span className="text-[12px] font-medium text-white">Realized PnL</span>
                            <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{posCcy}</span>
                            </span>
                          </div>
                        }
                        rows={[
                          {
                            label: 'Closed PnL',
                            value: `${closedPnl > 0 ? '+' : ''}${formatCcy(closedPnl)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.closedPnl, 'usd', 2)})` : ''}`,
                            labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                            valueClassName: `text-[11px] font-mono font-bold ${closedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                          },
                          {
                            label: 'Funding fee',
                            value: `${fundingFee > 0 ? '+' : ''}${formatCcy(fundingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.fundingFee, 'usd', 2)})` : ''}`,
                            labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                            valueClassName: `text-[11px] font-mono font-bold ${fundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                          },
                          {
                            label: 'Trading fee',
                            value: `${tradingFee > 0 ? '+' : ''}${formatCcy(tradingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.tradingFee, 'usd', 2)})` : ''}`,
                            labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                            valueClassName: `text-[11px] font-mono font-bold ${tradingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                          }
                        ]}
                      >
                        <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Realized PnL</span>
                      </AppTooltip>
                      <span className={`font-mono text-sm ${realizedPnlColor}`}>
                        {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                      </span>
                      {inverseVals.isInverse && pos.realizedPnl !== undefined ? (
                        <span className={`font-mono text-xs ${realizedPnlColor} opacity-80`}>
                          ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(inverseVals.realizedPnl), 'usd', 2)} USD
                        </span>
                      ) : (
                        <span className="text-[10px] opacity-0">-</span>
                      )}
                    </div>

                    {/* Inverse - Protected / Exposed */}
                    <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                      <AppTooltip description="Position hedge/exposure level">
                        <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Hedge / Exposure</span>
                      </AppTooltip>
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
                          <AppTooltip {...sizeTooltipProps}>
                            <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                              <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max">Position</span>
                              <div className="flex items-baseline gap-1">
                                <span className="font-mono text-white">{formatCurrency(pos.size, 'crypto')}</span>
                                <span className="text-[#8E9299] text-xs">≈ {formatCurrency(sizeValUsd, 'crypto', 2)} USD</span>
                              </div>
                            </div>
                          </AppTooltip>
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppTooltip {...entryPriceTooltipProps}>
                            <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Entry price</span>
                          </AppTooltip>
                          <span className="font-mono text-white">{formatPrice(pos.entryPrice, isFiatPair)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppTooltip {...marginTooltipProps}>
                            <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Margin</span>
                          </AppTooltip>
                          <span className="font-mono text-white">
                            {formatCcy(pos.margin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                            {posCcy && !posCcy.includes('USD') && pos.margin && pos.markPrice ? (
                              <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(pos.margin * pos.markPrice, 'crypto', 2)} USD</span>
                            ) : null}
                          </span>
                        </div>
                        <AppTooltip
                          side="top"
                          description={
                            <div className="flex flex-col gap-1 w-full min-w-[180px]">
                              <span className="text-[12px] font-medium text-white">Realized PnL</span>
                              <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{posCcy}</span>
                              </span>
                            </div>
                          }
                          rows={[
                            {
                              label: 'Closed PnL',
                              value: `${closedPnl > 0 ? '+' : ''}${formatCcy(closedPnl)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.closedPnl, 'usd', 2)})` : ''}`,
                              labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                              valueClassName: `text-[11px] font-mono font-bold ${closedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                            },
                            {
                              label: 'Funding fee',
                              value: `${fundingFee > 0 ? '+' : ''}${formatCcy(fundingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.fundingFee, 'usd', 2)})` : ''}`,
                              labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                              valueClassName: `text-[11px] font-mono font-bold ${fundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                            },
                            {
                              label: 'Trading fee',
                              value: `${tradingFee > 0 ? '+' : ''}${formatCcy(tradingFee)} ${posCcy}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.tradingFee, 'usd', 2)})` : ''}`,
                              labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                              valueClassName: `text-[11px] font-mono font-bold ${tradingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                            }
                          ]}
                        >
                          <div className="flex flex-col gap-1 cursor-help w-max focus:outline-none">
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50">Realized PnL</span>
                            <span className={`font-mono ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{posCcy}</span>
                              {inverseVals.isInverse && pos.realizedPnl !== undefined ? (
                                <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(Math.abs(inverseVals.realizedPnl), 'usd', 2)}</span>
                              ) : null}
                            </span>
                          </div>
                        </AppTooltip>

                        {pos.instrumentType === 'INVERSE' ? (
                          <div className="col-span-2 md:col-span-1 md:row-span-3 flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                              <AppTooltip description="Hedge position details">
                                <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help">Hedge Pro Details</span>
                              </AppTooltip>

                              <div className="flex flex-col gap-3 mt-1">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[#8E9299]">Balanço Total:</span>
                                  <span className="font-mono text-white text-[13px]">
                                    {formatCcy(totalAssetBal)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(totalAssetBal * (pos.markPrice || 0), 'usd', 2)} USD</span>
                                  </span>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[#00C853]">Protegido: {protectedPct.toFixed(2)}%</span>
                                  <span className="font-mono text-white text-[13px]">
                                    {formatCcy(protectedAmount)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(protectedAmount * (pos.markPrice || 0), 'usd', 2)} USD</span>
                                  </span>
                                </div>

                                <div className="flex flex-col">
                                  <span className="text-[10px] text-[#FF4444]">Exposto: {exposedPct.toFixed(2)}%</span>
                                  <span className="font-mono text-white text-[13px]">
                                    {formatCcy(exposedAmount)} {posCcy} <span className="text-[#8E9299] text-[11px] font-sans">/ {formatCurrency(exposedAmount * (pos.markPrice || 0), 'usd', 2)} USD</span>
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
                          <AppTooltip {...unrealizedPnlTooltipProps}>
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help focus:outline-none">Unrealized PnL</span>
                          </AppTooltip>
                          <span className={`font-mono ${uplColor}`}>
                            {pos.unrealizedPnl > 0 ? '+' : ''}{formatCcy(pos.unrealizedPnl)} <span className="text-[#8E9299] text-[10px] font-sans ml-1">{posCcy}</span>
                            {posCcy && !posCcy.includes('USD') && pos.unrealizedPnl && pos.markPrice ? (
                              <span className="text-[#8E9299] text-[10px] ml-1">≈ {pos.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(pos.unrealizedPnl) * pos.markPrice, 'crypto', 2)} USD</span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppTooltip {...markPriceTooltipProps}>
                            <span className="text-[#8E9299] text-xs border-b border-dashed border-[#8E9299]/50 w-max cursor-help focus:outline-none">Mark price</span>
                          </AppTooltip>
                          <span className="font-mono text-white">{formatPrice(pos.markPrice, isFiatPair)}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppTooltip {...maintenanceMarginTooltipProps}>
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help focus:outline-none">{pos.exchange === 'okx' ? 'Maint. Margin / MMR' : 'Maintenance Margin'}</span>
                          </AppTooltip>
                          <span className="font-mono text-white">
                            {pos.maintenanceMargin !== undefined ? (
                              <>
                                {formatCcy(pos.maintenanceMargin)} <span className="font-sans text-[10px] text-[#8E9299]">{posCcy}</span>
                                {posCcy && !posCcy.includes('USD') && pos.maintenanceMargin && pos.markPrice ? (
                                  <span className="text-[#8E9299] text-[10px] ml-1">≈ {formatCurrency(pos.maintenanceMargin * pos.markPrice, 'crypto', 2)} USD</span>
                                ) : null}
                                {pos.marginRatio !== undefined && (
                                  <span className="text-orange-400 text-[10px] ml-1">({formatValue(pos.marginRatio, 2)}%)</span>
                                )}
                              </>
                            ) : (
                              pos.marginRatio !== undefined ? `${formatValue(pos.marginRatio, 2)}%` : '--'
                            )}
                          </span>
                        </div>
                        <AppTooltip
                          description={
                            <div className="flex flex-col gap-2 w-full">
                              <div className="text-[12px] leading-relaxed text-[#c9cbcf] whitespace-normal border-b border-dashed border-[#8E9299]/50 pb-2">
                                At the breakeven price, your total PnL will be zero if you close your remaining position. Note that the breakeven price, which includes the trading fee and funding fee, is updated every second.
                              </div>
                              <div className="flex flex-col gap-1 w-full min-w-[180px] pt-1">
                                <span className="text-[12px] font-medium text-white">Realized PnL</span>
                                <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                                  {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{posCcy}</span>
                                </span>
                              </div>
                            </div>
                          }
                          side="top"
                          rows={[
                            {
                              label: 'Closed PnL',
                              value: `${closedPnl > 0 ? '+' : ''}${formatCcy(closedPnl)} ${posCcy}`,
                              labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                              valueClassName: `text-[11px] font-mono font-bold ${closedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                            },
                            {
                              label: 'Funding fee',
                              value: `${fundingFee > 0 ? '+' : ''}${formatCcy(fundingFee)} ${posCcy}`,
                              labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                              valueClassName: `text-[11px] font-mono font-bold ${fundingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                            },
                            {
                              label: 'Trading fee',
                              value: `${tradingFee > 0 ? '+' : ''}${formatCcy(tradingFee)} ${posCcy}`,
                              labelClassName: 'text-[11px] font-medium text-[#8E9299]',
                              valueClassName: `text-[11px] font-mono font-bold ${tradingFee >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`
                            }
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
                          <AppTooltip {...liqPriceTooltipProps}>
                            <span className="text-[#8E9299] text-xs w-max border-b border-dashed border-[#8E9299]/50 cursor-help focus:outline-none">Est. liq. price</span>
                          </AppTooltip>
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
