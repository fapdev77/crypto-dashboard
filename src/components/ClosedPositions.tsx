import React, { useMemo, useState, useEffect } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { formatValue, formatCrypto, formatPrice } from '../utils/formatters';
import { usePositionHistory } from '../hooks/usePositionHistory';
import { usePagination } from '../hooks/usePagination';
import { Loader2, History, Download, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AssetClassifierAggregator } from '../services/AssetClassifierAggregator';
import { extractBaseCoin } from '../utils/unifiers';
import { AppTooltip } from './ui/Tooltip';
import { HistoryLimitWarning } from './ui/HistoryLimitWarning';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { StatusAndSyncBadge } from './ui/StatusAndSyncBadge';
import { getHistoryInverseUsdValues, getHistoryPositionSizeAndValue } from '../utils/inverseUtils';
import { FilterBar } from './ui/FilterBar';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../utils/exportUtils';
import { Pagination } from './ui/Pagination';

export function ClosedPositions() {
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('All');

  const [period, setPeriod] = useState<'today' | '7d' | '14d' | '30d' | '90d'>('7d');

  const { positions: closedPositions, isLoading, isSyncing, syncMessage } = usePositionHistory(period);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const filteredClosedPositions = useMemo(() => {
    let filtered = [...closedPositions];

    if (exchangeFilter.toLowerCase() !== 'all') {
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

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedClosedPositions } = usePagination(
    filteredClosedPositions, 50, [filterText, exchangeFilter, period]
  );

  const handleExport = (formatType: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);
    
    const headers = [
      'Symbol',
      'Exchange',
      'Connection Name',
      'Side',
      'Leverage',
      'Size',
      'Value (USD)',
      'Entry Price',
      'Exit Price',
      'Realized PnL',
      'Currency',
      'Funding Fee',
      'Trading Fee',
      'Open Time',
      'Closed Time'
    ];
    
    const rows = filteredClosedPositions.map(pos => {
      const isLong = pos.side?.toLowerCase() === 'long' || pos.side?.toLowerCase() === 'buy';
      const isShort = pos.side?.toLowerCase() === 'short' || pos.side?.toLowerCase() === 'sell';
      const sideLabel = isLong ? 'Long' : isShort ? 'Short' : pos.side || 'Net';
      const leverage = (pos.raw?.leverage as string) || (pos.raw?.lever as string) || '1';
      
      const pnlCurrency = pos.ccy || pos.baseCoin || 'USDT';
      
      const openTimeStr = pos.createdTime && !isNaN(pos.createdTime) 
        ? format(new Date(pos.createdTime), 'yyyy-MM-dd HH:mm:ss') 
        : '--';
      const closeTimeStr = pos.closeUpdateTime && !isNaN(pos.closeUpdateTime) 
        ? format(new Date(pos.closeUpdateTime), 'yyyy-MM-dd HH:mm:ss') 
        : '--';

      const { actualCoinSize, positionValueUsd } = getHistoryPositionSizeAndValue(pos);

      return [
        pos.symbol,
        pos.exchange.toUpperCase(),
        pos.label,
        sideLabel,
        `${leverage}x`,
        actualCoinSize,
        positionValueUsd,
        pos.entryPrice || 0,
        pos.closePrice || 0,
        pos.realizedPnl || 0,
        pnlCurrency,
        pos.fundingFee || 0,
        pos.tradingFee || 0,
        openTimeStr,
        closeTimeStr
      ];
    });

    const config: ExportConfig = {
      title: 'Positions History Report',
      filename: `Positions_History_${Date.now()}`,
      headers,
      rows
    };

    if (formatType === 'csv') exportToCSV(config);
    if (formatType === 'excel') exportToExcel(config);
    if (formatType === 'pdf') exportToPDF(config);
  };

  const closedStats = useMemo(() => {
    if (!filteredClosedPositions.length) return null;

    let totalPnl = 0;
    let totalTradeFees = 0;
    let totalFundingFees = 0;
    let wins = 0;
    let losses = 0;
    let largestWin = 0;
    let largestLoss = 0;
    let sumWin = 0;
    let sumLoss = 0;
    let longs = 0;
    let shorts = 0;

    filteredClosedPositions.forEach(pos => {
      const { realizedPnl: pnlInUsd, tradingFee: tradingFeeUsd, fundingFee: fundingFeeUsd } = getHistoryInverseUsdValues(pos);

      const isLong = pos.side?.toLowerCase() === 'long' || pos.side?.toLowerCase() === 'buy';
      const isShort = pos.side?.toLowerCase() === 'short' || pos.side?.toLowerCase() === 'sell';
      if (isLong) longs++;
      if (isShort) shorts++;

      if (tradingFeeUsd) totalTradeFees += tradingFeeUsd;
      if (fundingFeeUsd) totalFundingFees += fundingFeeUsd;

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
      totalTradeFees,
      totalFundingFees,
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <History className="w-5 h-5 text-[#2F6BFF]" />
            Positions History
          </h2>
          <StatusAndSyncBadge isSyncing={isSyncing} syncMessage={syncMessage} />
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-2 bg-[#1a1b1e] border border-[#2a2b30] text-white flex items-center gap-2 rounded-lg hover:bg-[#2a2b30]/50 transition-colors text-sm focus:outline-none"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span> <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <div className="absolute top-11 right-0 w-32 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl z-50 overflow-hidden text-sm text-white">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">Export CSV</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">Export Excel</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30]/50 transition-colors">Export PDF</button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center justify-end gap-2 flex-1">
          <FilterBar
            exchange={{
              value: exchangeFilter,
              onChange: setExchangeFilter,
              labelAll: 'All Exchanges',
            }}
            period={{
              value: period,
              onChange: setPeriod,
              options: [
                { value: 'today', label: 'Today' },
                { value: '7d', label: '7 Days' },
                { value: '14d', label: '14 Days' },
                { value: '30d', label: '30 Days' },
                { value: '90d', label: '90 Days' },
              ],
            }}
            search={{
              value: filterText,
              onChange: setFilterText,
              placeholder: 'Search...',
            }}
          />
        </div>
      </div>

      <HistoryLimitWarning period={period} />

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
              <div className="w-full border-t border-dashed border-[#2a2b30] my-3"></div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#8E9299]">Trade Fees:</span>
                  <span className={`${closedStats.totalTradeFees < 0 ? 'text-[#FF4444]' : (closedStats.totalTradeFees > 0 ? 'text-[#00C853]' : 'text-[#8E9299]')}`}>
                    {isPrivateMode ? '$••••' : `${closedStats.totalTradeFees > 0 ? '+' : ''}${formatCurrency(closedStats.totalTradeFees, 'usd')}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#8E9299]">Funding Fees:</span>
                  <span className={`${closedStats.totalFundingFees < 0 ? 'text-[#FF4444]' : (closedStats.totalFundingFees > 0 ? 'text-[#00C853]' : 'text-[#8E9299]')}`}>
                    {isPrivateMode ? '$••••' : `${closedStats.totalFundingFees > 0 ? '+' : ''}${formatCurrency(closedStats.totalFundingFees, 'usd')}`}
                  </span>
                </div>
              </div>
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
          <p className="text-[#8E9299]">No history found for active Exchanges in the selected period.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Top Pagination if filteredClosedPositions.length > 5 */}
          {filteredClosedPositions.length > 5 && (
            <div className="mb-2">
              <Pagination
                id="closed-positions-pagination-top"
                currentPage={currentPage}
                totalItems={filteredClosedPositions.length}
                itemsPerPage={50}
                onPageChange={setCurrentPage}
                refreshKey={`${period}-${exchangeFilter}`}
                refreshLabel="Updating"
                refreshDataReady={!isLoading}
              />
            </div>
          )}

          {paginatedClosedPositions.map((pos) => {
            const isLong = pos.side?.toLowerCase() === 'long' || pos.side?.toLowerCase() === 'buy';
            const isShort = pos.side?.toLowerCase() === 'short' || pos.side?.toLowerCase() === 'sell';
            const sideLabel = isLong ? 'Long' : isShort ? 'Short' : pos.side || 'Net';
            const sideColor = isLong ? 'text-[#00C853]' : isShort ? 'text-[#FF4444]' : 'text-gray-400';

            const pnlClass = pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]';

            const leverage = (pos.raw?.leverage as string) || (pos.raw?.lever as string) || '1';
            const marginModeLabel = ((pos.raw?.marginMode as string) || (pos.raw?.mgnMode as string) || 'cross').toLowerCase() === 'isolated' ? 'Isolated' : 'Cross';
            const symbolSuffix = extractBaseCoin(pos.exchange, pos.symbol);

            let roiStr = '--';
            let roiValue = 0;
            let hasRoi = false;

            const pnlCurrency = pos.ccy || pos.baseCoin || 'USDT';
            const isFiatCcy = pnlCurrency.includes('USD') || pnlCurrency === 'EUR';
            const isFiatPair = pos.symbol.includes('USD') || pos.symbol.includes('EUR');
            const formatCcy = (v: number | undefined | null) => formatCurrency(v, 'crypto', isFiatCcy ? 2 : 8);

            const isInverse = pos.instrumentType === 'INVERSE';

            const { actualCoinSize, positionValueUsd } = getHistoryPositionSizeAndValue(pos);

            if (pos.raw?.roi !== undefined && pos.raw?.roi !== null) {
              roiValue = parseFloat(pos.raw.roi as string) * 100;
              hasRoi = true;
            } else if (pos.entryPrice && pos.closePrice && pos.size && leverage) {
              const numLeverage = parseFloat(leverage);
              const initialMargin = positionValueUsd / numLeverage;

              if (initialMargin > 0) {
                roiValue = (pos.realizedPnl / initialMargin) * 100;
                hasRoi = true;
              }
            }

            const displayQuantity = (actualCoinSize !== undefined && actualCoinSize !== null)
              ? formatCurrency(actualCoinSize, 'crypto', 8)
              : '--';
            const displayUnit = symbolSuffix;
            const displaySecondaryQuantity = (positionValueUsd !== undefined && positionValueUsd !== null)
              ? formatCurrency(positionValueUsd, 'crypto', 2)
              : '--';
            const displaySecondaryUnit = 'USD';

            if (hasRoi && isFinite(roiValue)) {
              roiStr = `${roiValue > 0 ? '+' : ''}${formatCurrency(roiValue, 'crypto', 2)}%`;
            }

            const roiClass = hasRoi ? (roiValue >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]') : 'text-[#8E9299]';
            const category = AssetClassifierAggregator.getGlobalCategorySync(pos.symbol);

            const inverseVals = getHistoryInverseUsdValues(pos);

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
                    <AppTooltip description="The peak size and USD value of this position before it was closed.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Pos Size / Value</span>
                    </AppTooltip>
                    <span className="font-mono text-white text-sm">{displayQuantity} <span className="font-sans text-[10px] text-[#8E9299]">{displayUnit}</span></span>
                    {displaySecondaryQuantity !== '--' && (
                      <span className="text-xs text-[#8E9299] font-mono">≈ {displaySecondaryQuantity} <span className="font-sans text-[10px] text-[#8E9299]">{displaySecondaryUnit}</span></span>
                    )}
                  </div>

                  {/* Entry / Exit Price */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="Average entry price and average exit price of the position.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Entry / Exit Price</span>
                    </AppTooltip>
                    <span className="font-mono text-white text-sm truncate">{formatPrice(pos.entryPrice, isFiatPair)}</span>
                    <span className="font-mono text-white text-xs truncate">{formatPrice(pos.closePrice, isFiatPair)}</span>
                  </div>

                  {/* Realized PnL (ROE) */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip
                      side="top"
                      description={
                        <div className="flex flex-col gap-1 w-full min-w-[180px]">
                           <span className="text-[12px] font-medium text-[#8E9299]">Realized PnL</span>
                           <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                              {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-[#8E9299]">{pnlCurrency}</span>
                           </span>
                        </div>
                      }
                      rows={[
                        { 
                          label: 'Closed PnL', 
                          value: `${(pos.closedPnl || 0) > 0 ? '+' : ''}${formatCcy(pos.closedPnl || 0)} ${pnlCurrency}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.realizedPnl - inverseVals.fundingFee - inverseVals.tradingFee, 'usd', 2)})` : ''}`, 
                          labelClassName: 'text-[11px] font-medium text-[#8E9299]', 
                          valueClassName: `text-[11px] font-mono font-bold ${(pos.closedPnl || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}` 
                        },
                        { 
                          label: 'Funding fee', 
                          value: `${(pos.fundingFee || 0) > 0 ? '+' : ''}${formatCcy(pos.fundingFee || 0)} ${pnlCurrency}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.fundingFee, 'usd', 2)})` : ''}`, 
                          labelClassName: 'text-[11px] font-medium text-[#8E9299]', 
                          valueClassName: `text-[11px] font-mono font-bold ${(pos.fundingFee || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}` 
                        },
                        { 
                          label: 'Trading fee', 
                          value: `${(pos.tradingFee || 0) > 0 ? '+' : ''}${formatCcy(pos.tradingFee || 0)} ${pnlCurrency}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.tradingFee, 'usd', 2)})` : ''}`, 
                          labelClassName: 'text-[11px] font-medium text-[#8E9299]', 
                          valueClassName: `text-[11px] font-mono font-bold ${(pos.tradingFee || 0) >= 0 ? 'text-[#00C853]' : 'text-[#FF4444]'}` 
                        }
                      ]}
                    >
                      <span className="text-[10px] text-[#8E9299] uppercase cursor-help border-b border-dashed border-[#8E9299]/50 w-max mb-1 focus:outline-none">Realized PnL (ROE)</span>
                    </AppTooltip>
                    <span className={`font-mono text-sm ${pnlClass}`}>
                      {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{pnlCurrency}</span>
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`font-mono text-xs ${roiClass}`}>{roiStr}</span>
                      {inverseVals.isInverse && pos.realizedPnl !== undefined ? (
                        <span className={`font-mono text-[10px] ${pnlClass} opacity-80`}>
                          ≈ {pos.realizedPnl > 0 ? '+' : ''}{formatCurrency(Math.abs(inverseVals.realizedPnl), 'usd', 2)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Open Time */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="When the position was first opened.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Open Time</span>
                    </AppTooltip>
                    <span className="font-mono text-white text-sm">
                      {pos.createdTime && !isNaN(pos.createdTime) ? format(new Date(pos.createdTime), 'yyyy-MM-dd') : '--'}
                    </span>
                    <span className="font-mono text-[#8E9299] text-xs">
                      {pos.createdTime && !isNaN(pos.createdTime) ? format(new Date(pos.createdTime), 'HH:mm:ss') : '--'}
                    </span>
                  </div>

                  {/* Close Time */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="When the position was completely closed.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Closed Time</span>
                    </AppTooltip>
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

          {/* Bottom Pagination */}
          <div className="mt-3">
            <Pagination
              id="closed-positions-pagination-bottom"
              currentPage={currentPage}
              totalItems={filteredClosedPositions.length}
              itemsPerPage={50}
              onPageChange={setCurrentPage}
              refreshKey={`${period}-${exchangeFilter}`}
              refreshLabel="Updating"
            />
          </div>
        </div>
      )}
    </div>
  );
}
