import React, { useMemo, useState } from 'react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { formatDateTime, formatIsoDateTime } from '../utils/formatters';
import { DEFAULT_TIME_PERIOD_MS } from '../utils/dateTimeHelper';
import { usePositionHistory, PositionHistoryPeriod } from '../hooks/usePositionHistory';
import { usePagination } from '../hooks/usePagination';
import { Loader2, History, Download, ChevronDown } from 'lucide-react';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AssetClassifierAggregator } from '../services/AssetClassifierAggregator';
import { extractBaseCoin } from '../utils/unifiers';
import { AppTooltip } from './ui/Tooltip';
import { HistoryLimitWarning } from './ui/HistoryLimitWarning';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { StatusAndSyncBadge } from './ui/StatusAndSyncBadge';
import { AccountTypeBadge } from './ui/AccountTypeBadge';
import { getHistoryInverseUsdValues, getHistoryPositionSizeAndValue } from '../utils/inverseUtils';
import { FilterBar } from './ui/FilterBar';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../utils/exportUtils';
import { Pagination } from './ui/Pagination';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { computeClosedPositionsStats } from '../utils/closedPositionsStats';
import { ClosedPositionsSummaryCards } from './ClosedPositionsSummaryCards';

export function ClosedPositions() {
  const { t } = useTranslation();
  const fiatCurrency = useSettingsStore(state => state.fiatCurrency) || 'USD';
  const keys = useApiKeysStore(state => state.keys);
  const formatCurrency = useFormatCurrency();

  const [filterText, setFilterText] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState<string>('All');

  const [period, setPeriod] = useState<PositionHistoryPeriod>(DEFAULT_TIME_PERIOD_MS);
  const [customStartDate, setCustomStartDate] = useState<string | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<string | undefined>(undefined);

  const { positions: closedPositions, isLoading, isSyncing, syncMessage, syncError } = usePositionHistory(
    period,
    undefined,
    undefined,
    customStartDate,
    customEndDate
  );
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
    filteredClosedPositions, 50, [filterText, exchangeFilter, period, customStartDate, customEndDate]
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
      
      const openTimeStr = formatIsoDateTime(pos.createdTime);
      const closeTimeStr = formatIsoDateTime(pos.closeUpdateTime);

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
      title: t('positionsHistory.exportReportTitle', 'Closed Positions Report'),
      filename: `Closed_Positions_${Date.now()}`,
      headers,
      rows
    };

    if (formatType === 'csv') exportToCSV(config);
    if (formatType === 'excel') exportToExcel(config);
    if (formatType === 'pdf') exportToPDF(config);
  };

  const closedStats = useMemo(
    () => computeClosedPositionsStats(filteredClosedPositions),
    [filteredClosedPositions]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-danger text-sm bg-surface rounded-xl border border-line">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-fg">
            <History className="w-5 h-5 text-accent" />
            {t('positionsHistory.title', 'Closed Positions')}
          </h2>
          <StatusAndSyncBadge isSyncing={isSyncing} syncMessage={syncMessage} syncError={syncError} />
        </div>
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-2 bg-elevated border border-line text-fg flex items-center gap-2 rounded-lg hover:bg-line/50 transition-colors text-sm focus:outline-none"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('positionsHistory.export', 'Export')}</span> <ChevronDown className="w-3 h-3" />
          </button>
          {exportMenuOpen && (
            <div className="absolute top-11 right-0 w-32 bg-elevated border border-line rounded-lg shadow-xl z-50 overflow-hidden text-sm text-fg">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-line/50 transition-colors">{t('positionsHistory.exportCsv', 'Export CSV')}</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-line/50 transition-colors">{t('positionsHistory.exportExcel', 'Export Excel')}</button>
              <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-line/50 transition-colors">{t('positionsHistory.exportPdf', 'Export PDF')}</button>
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
              labelAll: t('positionsHistory.allExchanges', 'All Exchanges'),
            }}
            period={{
              value: String(period),
              onChange: (val) => {
                setPeriod(val);
                if (val !== 'custom') {
                  setCustomStartDate(undefined);
                  setCustomEndDate(undefined);
                }
              },
              customStartDate,
              customEndDate,
              onCustomDateChange: (start, end) => {
                setCustomStartDate(start);
                setCustomEndDate(end);
                setPeriod('custom');
              },
            }}
            search={{
              value: filterText,
              onChange: setFilterText,
              placeholder: t('common.search', 'Search...'),
            }}
          />
        </div>
      </div>

      <HistoryLimitWarning
        period={period}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        exchangeFilter={exchangeFilter}
      />

      {closedStats && <ClosedPositionsSummaryCards stats={closedStats} />}

      {filteredClosedPositions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface border border-line rounded-xl">
          <p className="text-fg-muted">
            {t('positionsHistory.noClosedPositions', 'No history found for active Exchanges in the selected period.')}
          </p>
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
                refreshKey={`${period}-${customStartDate || ''}-${customEndDate || ''}-${exchangeFilter}`}
                refreshLabel={t('common.pagination.updating', 'Updating')}
                refreshDataReady={!isLoading}
              />
            </div>
          )}

          {paginatedClosedPositions.map((pos) => {
            const isLong = pos.side?.toLowerCase() === 'long' || pos.side?.toLowerCase() === 'buy';
            const isShort = pos.side?.toLowerCase() === 'short' || pos.side?.toLowerCase() === 'sell';
            const sideLabel = isLong ? t('positions.long', 'Long') : isShort ? t('positions.short', 'Short') : pos.side || t('positions.net', 'Net');
            const sideColor = isLong ? 'text-success' : isShort ? 'text-danger' : 'text-fg-muted';

            const pnlClass = pos.realizedPnl >= 0 ? 'text-success' : 'text-danger';

            const leverage = (pos.raw?.leverage as string) || (pos.raw?.lever as string) || '1';
            const marginModeLabel = ((pos.raw?.marginMode as string) || (pos.raw?.mgnMode as string) || 'cross').toLowerCase() === 'isolated' ? t('positions.isolated', 'Isolated') : t('positions.cross', 'Cross');
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
              ? formatCurrency(positionValueUsd, 'usd', 2)
              : '--';

            if (hasRoi && isFinite(roiValue)) {
              roiStr = `${roiValue > 0 ? '+' : ''}${formatCurrency(roiValue, 'crypto', 2)}%`;
            }

            const roiClass = hasRoi ? (roiValue >= 0 ? 'text-success' : 'text-danger') : 'text-fg-muted';
            const category = AssetClassifierAggregator.getGlobalCategorySync(pos.symbol);

            const inverseVals = getHistoryInverseUsdValues(pos);

            return (
              <div key={pos.id} className="bg-surface border border-line rounded-xl flex flex-col transition-colors hover:border-line-strong">
                <div className="p-4 grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Asset info */}
                  <div className="flex items-center gap-3 w-full border-b border-line md:border-none pb-3 md:pb-0 col-span-2 lg:col-span-1">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="flex items-center relative pr-1">
                        <CoinIcon symbol={pos.baseCoin || pos.symbol} size={28} className="w-7 h-7" category={category} />
                        <div className="bg-surface rounded-full p-0.5 absolute -bottom-1 -right-1">
                          <ExchangeIcon exchange={pos.exchange} className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      {pos.instrumentType && (
                        <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-line border border-line-strong text-fg-muted uppercase">
                          {pos.instrumentType}
                        </span>
                      )}
                      <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-line border border-line-strong text-fg-muted uppercase">
                        {category}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-fg text-sm">{pos.symbol}</span>
                      </div>
                      <span className={`text-xs mt-0.5 font-medium ${sideColor}`}>
                        {sideLabel} <span className="mx-0.5 text-fg-muted">·</span> {leverage}x <span className="mx-0.5 text-fg-muted">·</span> {marginModeLabel}
                      </span>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="w-max text-[10px] font-semibold text-fg bg-elevated border border-line-strong py-0.5 px-1.5 rounded-[4px] capitalize">
                          {pos.label}
                        </span>
                        {(() => {
                          const matchedKey = keys.find(k => k.id === pos.connectionId);
                          return (
                            <AccountTypeBadge
                              exchange={pos.exchange}
                              accountType={pos.accountType || matchedKey?.accountType}
                              environment={matchedKey?.environment}
                              bybitRegion={matchedKey?.bybitRegion}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Size / Value */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
                    <AppTooltip description={t('positions.tooltips.peakSizeValue', { currency: fiatCurrency })}>
                      <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('positions.positionSize', 'Pos Size')} / {t('positions.positionValue', 'Value')}</span>
                    </AppTooltip>
                    <span className="font-mono text-fg text-sm">{displayQuantity} <span className="font-sans text-[10px] text-fg-muted">{displayUnit}</span></span>
                    {displaySecondaryQuantity !== '--' && (
                      <span className="text-xs text-fg-muted font-mono">≈ {displaySecondaryQuantity}</span>
                    )}
                  </div>

                  {/* Entry / Exit Price */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
                    <AppTooltip description={t('positions.tooltips.entryExitPrice')}>
                      <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('positions.entryPrice', 'Entry Price')} / {t('positionsHistory.closePrice', 'Exit Price')}</span>
                    </AppTooltip>
                    <span className="font-mono text-fg text-sm truncate">{formatCurrency(pos.entryPrice, 'priceFiat', isFiatPair)}</span>
                    <span className="font-mono text-fg text-xs truncate">{formatCurrency(pos.closePrice, 'priceFiat', isFiatPair)}</span>
                  </div>

                  {/* Realized PnL (ROE) */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
                    <AppTooltip
                      side="top"
                      description={
                        <div className="flex flex-col gap-1 w-full min-w-[180px]">
                           <span className="text-[12px] font-medium text-fg-muted">{t('positions.realizedPnl', 'Realized PnL')}</span>
                           <span className={`text-[15px] font-mono font-medium ${pos.realizedPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                              {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="text-[11px] font-sans text-fg-muted">{pnlCurrency}</span>
                           </span>
                        </div>
                      }
                      rows={[
                        { 
                          label: t('positions.closedPnl', 'Closed Realized PnL'), 
                          value: `${(pos.closedPnl || 0) > 0 ? '+' : ''}${formatCcy(pos.closedPnl || 0)} ${pnlCurrency}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.realizedPnl - inverseVals.fundingFee - inverseVals.tradingFee, 'usd', 2)})` : ''}`, 
                          labelClassName: 'text-[11px] font-medium text-fg-muted', 
                          valueClassName: `text-[11px] font-mono font-bold ${(pos.closedPnl || 0) >= 0 ? 'text-success' : 'text-danger'}` 
                        },
                        { 
                          label: t('positions.fundingFee', 'Funding fee'), 
                          value: `${(pos.fundingFee || 0) > 0 ? '+' : ''}${formatCcy(pos.fundingFee || 0)} ${pnlCurrency}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.fundingFee, 'usd', 2)})` : ''}`, 
                          labelClassName: 'text-[11px] font-medium text-fg-muted', 
                          valueClassName: `text-[11px] font-mono font-bold ${(pos.fundingFee || 0) >= 0 ? 'text-success' : 'text-danger'}` 
                        },
                        { 
                          label: t('positions.tradingFee', 'Trading fee'), 
                          value: `${(pos.tradingFee || 0) > 0 ? '+' : ''}${formatCcy(pos.tradingFee || 0)} ${pnlCurrency}${inverseVals.isInverse ? ` (≈ ${formatCurrency(inverseVals.tradingFee, 'usd', 2)})` : ''}`, 
                          labelClassName: 'text-[11px] font-medium text-fg-muted', 
                          valueClassName: `text-[11px] font-mono font-bold ${(pos.tradingFee || 0) >= 0 ? 'text-success' : 'text-danger'}` 
                        }
                      ]}
                    >
                      <span className="text-[10px] text-fg-muted uppercase cursor-help border-b border-dashed border-fg-muted/50 w-max mb-1 focus:outline-none">{t('positions.realizedPnl', 'Realized PnL')} ({t('positions.roe', 'ROE')})</span>
                    </AppTooltip>
                    <span className={`font-mono text-sm ${pnlClass}`}>
                      {pos.realizedPnl > 0 ? '+' : ''}{formatCcy(pos.realizedPnl)} <span className="font-sans text-[10px]">{pnlCurrency}</span>
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`font-mono text-xs ${roiClass}`}>{roiStr}</span>
                      {inverseVals.isInverse && pos.realizedPnl !== undefined ? (
                        <span className={`font-mono text-[10px] ${pnlClass} opacity-80`}>
                          ≈ {inverseVals.realizedPnl > 0 ? '+' : ''}{formatCurrency(inverseVals.realizedPnl, 'usd', 2)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Open Time */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
                    <AppTooltip description={t('positions.tooltips.openTime')}>
                      <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('positionsHistory.openTime', 'Open Time')}</span>
                    </AppTooltip>
                    <span className="font-mono text-fg text-sm">
                      {formatDateTime(pos.createdTime).dateStr}
                    </span>
                    <span className="font-mono text-fg-muted text-xs">
                      {formatDateTime(pos.createdTime).timeStr}
                    </span>
                  </div>

                  {/* Close Time */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-line lg:pl-4 col-span-1">
                    <AppTooltip description={t('positions.tooltips.closeTime')}>
                      <span className="text-[10px] text-fg-muted uppercase w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('positionsHistory.closeTime', 'Closed Time')}</span>
                    </AppTooltip>
                    <span className="font-mono text-fg text-sm">
                      {formatDateTime(pos.closeUpdateTime).dateStr}
                    </span>
                    <span className="font-mono text-fg-muted text-xs">
                      {formatDateTime(pos.closeUpdateTime).timeStr}
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
              refreshKey={`${period}-${customStartDate || ''}-${customEndDate || ''}-${exchangeFilter}`}
              refreshLabel={t('common.pagination.updating', 'Updating')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
