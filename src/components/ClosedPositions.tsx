import React, { useMemo, useState, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';
import { usePositionHistory } from '../hooks/usePositionHistory';
import { Search, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AssetClassifierAggregator } from '../services/AssetClassifierAggregator';
import { AppTooltip } from './ui/Tooltip';
import { HistoryLimitWarning } from './ui/HistoryLimitWarning';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { SyncBadge } from './ui/SyncBadge';

export function ClosedPositions() {
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('all');
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);

  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [triggerSearch, setTriggerSearch] = useState(false);

  const handleCustomDateSearch = () => {
    setTriggerSearch(!triggerSearch);
  };

  const { positions: closedPositions, isLoading, isSyncing } = usePositionHistory(period, customStartDate, customEndDate, triggerSearch);
  const [error, setError] = useState<string | null>(null);

  const filteredClosedPositions = useMemo(() => {
    let filtered = [...closedPositions];

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
    let longs = 0;
    let shorts = 0;

    filteredClosedPositions.forEach(pos => {
      const pnlCurrency = pos.ccy || pos.baseCoin || 'USDT';
      const isFiatCcy = pnlCurrency.includes('USD') || pnlCurrency === 'EUR';
      let pnlInUsd = pos.realizedPnl;
      if (!isFiatCcy && pos.closePrice) {
        pnlInUsd = pos.realizedPnl * pos.closePrice;
      }

      const isLong = pos.side?.toLowerCase() === 'long' || pos.side?.toLowerCase() === 'buy';
      const isShort = pos.side?.toLowerCase() === 'short' || pos.side?.toLowerCase() === 'sell';
      if (isLong) longs++;
      if (isShort) shorts++;

      totalPnl += pnlInUsd;
      if (pnlInUsd > 0) {
        wins++;
        sumWin += pnlInUsd;
        if (pnlInUsd > largestWin) largestWin = pnlInUsd;
      } else if (pnlInUsd < 0) {
        losses++;
        sumLoss += pnlInUsd;
        if (pnlInUsd < largestLoss) largestLoss = pnlInUsd;
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
      avgLoss,
      longs,
      shorts
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

      {/* Filters Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center">
          <SyncBadge isSyncing={isSyncing} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
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
                {Array.from(new Set(keys.filter((apiKey: any) => apiKey.isActive).map((apiKey: any) => apiKey.exchange))).map(exchange => (
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

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors"
        >
          <option value="today">Hoje</option>
          <option value="7d">7 Days</option>
          <option value="30d">30 Days</option>
          <option value="90d">90 Days</option>
          <option value="custom">Personalizado</option>
        </select>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-[#8E9299] focus:outline-none focus:border-[#2F6BFF]"
            />
            <span className="text-[#8E9299]">até</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2 text-sm text-[#8E9299] focus:outline-none focus:border-[#2F6BFF]"
            />
            <button
              onClick={handleCustomDateSearch}
              className="bg-[#2a2b30] hover:bg-[#323339] text-white p-2 rounded-lg transition-colors border border-[#2a2b30] focus:outline-none focus:border-[#2F6BFF]"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}

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
      </div>

      <HistoryLimitWarning period={period} customStartDate={customStartDate} customEndDate={customEndDate} />

      {closedStats && (() => {
        const POSITIONS_DONUT = [
          { name: 'Long', value: closedStats.longs, color: '#00C853' },
          { name: 'Short', value: closedStats.shorts, color: '#FF4444' }
        ];

        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
              <span className="text-2xl text-[#8E9299] mb-1">Total PnL</span>
              <span className={`text-xl font-medium ${closedStats.totalPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                {isPrivateMode ? '$••••' : `${closedStats.totalPnl >= 0 ? '+' : ''}${formatCurrency(closedStats.totalPnl, 'usd')}`}
              </span>
            </div>

            <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
              <div className="flex flex-col">
                <div className='flex items-center gap-2'>
                  <span className="text-2xl text-[#8E9299]">Total Trades:</span>
                  <span className="text-xl font-medium text-white">{closedStats.totalTrades}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  {closedStats.totalTrades > 0 && (
                    <div className="flex text-xm gap-2 font-mono">
                      <span className="text-[#00C853]">{closedStats.longs} Longs ({((closedStats.longs / closedStats.totalTrades) * 100).toFixed(0)}%)</span>
                      <span className="text-[#8E9299]">|</span>
                      <span className="text-[#FF4444]">{closedStats.shorts} Shorts ({((closedStats.shorts / closedStats.totalTrades) * 100).toFixed(0)}%)</span>
                    </div>
                  )}
                </div>
              </div>
              {closedStats.totalTrades > 0 && (
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
              )}
            </div>

            <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2 items-center">
                  <span className="text-2xl text-[#8E9299]">Win Rate: </span>
                  <span className="text-xl font-medium text-white">{closedStats.winRate.toFixed(2)}%</span>
                </div>
                <div className="flex gap-2 text-xl font-mono">
                  <span className="text-[#00C853]">{closedStats.wins} Wins</span>
                  <span className="text-[#3f4046]">|</span>
                  <span className="text-[#FF4444]">{closedStats.losses} Losses</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col bg-[#111216] p-2 rounded justify-center items-center">
                  <span className="text-xl text-[#8E9299]">Avg W/L</span>
                  <div className="text-[15px] font-mono mt-0.5 whitespace-nowrap">
                    <span className="text-[#00C853]">+{formatCurrency(closedStats.avgWin, 'crypto', 2)}</span>
                    <span className="text-[#3f4046] mx-0.5">/</span>
                    <span className="text-[#FF4444]">{formatCurrency(closedStats.avgLoss, 'crypto', 2)}</span>
                  </div>
                </div>
                <div className="flex flex-col bg-[#111216] p-2 rounded justify-center items-center">
                  <span className="text-xl text-[#8E9299]">Largest W/L</span>
                  <div className="text-[15px] font-mono mt-0.5 whitespace-nowrap">
                    <span className="text-[#00C853]">+{formatCurrency(closedStats.largestWin, 'crypto', 2)}</span>
                    <span className="text-[#3f4046] mx-0.5">/</span>
                    <span className="text-[#FF4444]">{formatCurrency(closedStats.largestLoss, 'crypto', 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {filteredClosedPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">Nenhum histórico encontrado para as APIs ativas no período.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredClosedPositions.map((pos) => {
            const isLong = pos.side?.toLowerCase() === 'long' || pos.side?.toLowerCase() === 'buy';
            const isShort = pos.side?.toLowerCase() === 'short' || pos.side?.toLowerCase() === 'sell';
            const sideLabel = isLong ? 'Long' : isShort ? 'Short' : pos.side || 'Net';
            const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';

            const pnlClass = pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';

            const leverage = pos.raw?.leverage || pos.raw?.lever || '1';
            const marginModeLabel = (pos.raw?.marginMode || pos.raw?.mgnMode || 'cross').toLowerCase() === 'isolated' ? 'Isolated' : 'Cross';
            const symbolSuffix = pos.symbol.replace(/USDT|USDC|USD|-|SWAP/g, '');

            let roiStr = '--';
            let roiValue = 0;
            let hasRoi = false;

            const pnlCurrency = pos.ccy || pos.baseCoin || 'USDT';
            const isFiatCcy = pnlCurrency.includes('USD') || pnlCurrency === 'EUR';
            const isFiatPair = pos.symbol.includes('USD') || pos.symbol.includes('EUR');
            const formatCcy = (v: number | undefined | null) => formatCurrency(v, 'crypto', isFiatCcy ? 2 : 8);

            const isInverse = pos.instrumentType === 'INVERSE';

            let positionValueUsd = 0;
            let actualCoinSize = pos.size || 0;

            if (pos.exchange === 'okx' && pos.raw?.pnl) {
              const priceDiff = Math.abs((pos.closePrice || 0) - (pos.entryPrice || 0));
              const purePnl = Math.abs(parseFloat(pos.raw.pnl));
              if (priceDiff > 0) {
                actualCoinSize = purePnl / priceDiff;
                positionValueUsd = actualCoinSize * (pos.entryPrice || 0);
              } else {
                positionValueUsd = (pos.entryPrice || 0) * (pos.size || 0);
              }
            } else if (pos.exchange === 'bybit' && pos.raw?.cumEntryValue) {
              positionValueUsd = parseFloat(pos.raw.cumEntryValue);
              actualCoinSize = pos.entryPrice ? positionValueUsd / pos.entryPrice : 0;
            } else if (isInverse) {
              positionValueUsd = pos.size || 0;
              actualCoinSize = pos.entryPrice ? positionValueUsd / pos.entryPrice : 0;
            } else {
              positionValueUsd = (pos.entryPrice || 0) * (pos.size || 0);
              actualCoinSize = pos.size || 0;
            }

            if (pos.raw?.roi !== undefined && pos.raw?.roi !== null) {
              roiValue = parseFloat(pos.raw.roi) * 100;
              hasRoi = true;
            } else if (pos.entryPrice && pos.closePrice && pos.size && leverage) {
              const numLeverage = parseFloat(leverage);
              const initialMargin = positionValueUsd / numLeverage;

              if (initialMargin > 0) {
                roiValue = (pos.realizedPnl / initialMargin) * 100;
                hasRoi = true;
              }
            }

            let displayQuantity = '--';
            let displayUnit = '';
            let displaySecondaryQuantity = '--';
            let displaySecondaryUnit = '';

            if (isInverse) {
              displayQuantity = pos.size ? formatCurrency(pos.size, 'crypto', 2) : '--';
              displayUnit = 'USD';
              displaySecondaryQuantity = actualCoinSize ? formatCurrency(actualCoinSize, 'crypto', 8) : '--';
              displaySecondaryUnit = symbolSuffix;
            } else if (pos.exchange === 'okx') {
              displayQuantity = positionValueUsd ? formatCurrency(positionValueUsd, 'crypto', 2) : '--';
              displayUnit = 'USD';
              displaySecondaryQuantity = actualCoinSize ? formatCurrency(actualCoinSize, 'crypto', 8) : '--';
              displaySecondaryUnit = symbolSuffix;
            } else {
              displayQuantity = pos.size ? formatCurrency(pos.size, 'crypto', 8) : '--';
              displayUnit = symbolSuffix;
              displaySecondaryQuantity = positionValueUsd ? formatCurrency(positionValueUsd, 'crypto', 2) : '--';
              displaySecondaryUnit = 'USD';
            }

            if (hasRoi && isFinite(roiValue)) {
              roiStr = `${roiValue > 0 ? '+' : ''}${formatCurrency(roiValue, 'crypto', 2)}%`;
            }

            const roiClass = hasRoi ? (roiValue >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]') : 'text-[#8E9299]';
            const category = AssetClassifierAggregator.getGlobalCategorySync(pos.symbol);

            return (
              <div key={pos.id} className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col transition-colors hover:border-[#3a3b40]">
                <div className="p-4 grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Asset info */}
                  <div className="flex items-center gap-3 w-full border-b border-[#2a2b30] md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="flex items-center relative pr-1">
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
                        {sideLabel} <span className="mx-0.5 text-[#8E9299]">·</span> {leverage}x <span className="mx-0.5 text-[#8E9299]">·</span> {marginModeLabel}
                      </span>
                      <span className="w-max text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] mt-2 py-0.5 px-1.5 rounded-[4px] capitalize">
                        {pos.label}
                      </span>
                    </div>
                  </div>

                  {/* Size / Value */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <span className="text-[10px] text-[#8E9299] uppercase">Pos Size / Value</span>
                    <span className="font-mono text-white text-sm">{displayQuantity} <span className="font-sans text-[10px] text-[#8E9299]">{displayUnit}</span></span>
                    {displaySecondaryQuantity !== '--' && (
                      <span className="text-xs text-[#8E9299] font-mono">{displaySecondaryQuantity} <span className="font-sans text-[10px] text-[#8E9299]">{displaySecondaryUnit}</span></span>
                    )}
                  </div>

                  {/* Entry / Exit Price */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <span className="text-[10px] text-[#8E9299] uppercase">Entry / Exit Price</span>
                    <span className="font-mono text-white text-sm truncate">{formatPrice(pos.entryPrice, isFiatPair)}</span>
                    <span className="font-mono text-white text-xs truncate">{formatPrice(pos.closePrice, isFiatPair)}</span>
                  </div>

                  {/* Realized PnL (ROE) */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip
                      side="top"
                      rows={[
                        { label: 'Realized PnL', value: `${pos.realizedPnl > 0 ? '+' : ''}${formatCcy(pos.realizedPnl)} ${pnlCurrency}`, valueClassName: pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]' },
                        { label: 'Closed PnL', value: `${formatCcy((pos.realizedPnl || 0) + Math.abs(pos.fundingFee || 0) + Math.abs(pos.tradingFee || 0))} ${pnlCurrency}` },
                        { label: 'Funding fee', value: `${formatCcy(-(Math.abs(pos.fundingFee || 0)))} ${pnlCurrency}`, valueClassName: 'text-[#FF4444]' },
                        { label: 'Trading fee', value: `${formatCcy(-(Math.abs(pos.tradingFee || 0)))} ${pnlCurrency}`, valueClassName: 'text-[#FF4444]' }
                      ]}
                    >
                      <span className="text-[10px] text-[#8E9299] uppercase cursor-help border-b border-dashed border-[#8E9299]/50 w-max mb-1 focus:outline-none">Realized PnL (ROE)</span>
                    </AppTooltip>
                    <span className={`font-mono text-sm ${pnlClass}`}>
                      {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{pnlCurrency}</span>
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`font-mono text-xs ${roiClass}`}>{roiStr}</span>
                      {!isFiatCcy && pos.closePrice ? (
                        <span className={`font-mono text-[10px] ${pnlClass} opacity-80`}>
                          ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(pos.realizedPnl) * pos.closePrice, 'crypto', 2)} USD
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Open Time */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <span className="text-[10px] text-[#8E9299] uppercase">Open Time</span>
                    <span className="font-mono text-white text-sm">
                      {pos.createdTime && !isNaN(pos.createdTime) ? format(new Date(pos.createdTime), 'yyyy-MM-dd') : '--'}
                    </span>
                    <span className="font-mono text-[#8E9299] text-xs">
                      {pos.createdTime && !isNaN(pos.createdTime) ? format(new Date(pos.createdTime), 'HH:mm:ss') : '--'}
                    </span>
                  </div>

                  {/* Close Time */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <span className="text-[10px] text-[#8E9299] uppercase">Closed Time</span>
                    <span className="font-mono text-white text-sm">
                      {pos.closeUpdateTime && !isNaN(pos.closeUpdateTime) ? format(new Date(pos.closeUpdateTime), 'yyyy-MM-dd') : '--'}
                    </span>
                    <span className="font-mono text-[#8E9299] text-xs">
                      {pos.closeUpdateTime && !isNaN(pos.closeUpdateTime) ? format(new Date(pos.closeUpdateTime), 'HH:mm:ss') : '--'}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
