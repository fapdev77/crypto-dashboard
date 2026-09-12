import React, { useState, useEffect, useMemo } from 'react';
import { useOrderReports, OrderFilters } from '../../hooks/useOrderReports';
import { OrderFilters as OrderFiltersUI } from '../analytics/OrderReports/OrderFilters';
import { Download, ChevronDown, ArrowLeftRight, Calendar, Tag, Shield, Info, Clock, Hash, Percent, Award, AlertCircle } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { StatusAndSyncBadge } from '../ui/StatusAndSyncBadge';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import Big from 'big.js';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../utils/exportUtils';
import { AppTooltip } from '../ui/Tooltip';
import { detectQtyIsCoin } from '../../utils/inverseUtils';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { AccountTypeBadge } from '../ui/AccountTypeBadge';
import { AssetClassifierAggregator } from '../../services/AssetClassifierAggregator';
import { extractBaseCoin } from '../../utils/unifiers';
import { formatIsoDateTime, formatDateTime } from '../../utils/formatters';
import { Pagination } from '../ui/Pagination';
import { usePagination } from '../../hooks/usePagination';

export function TradeHistory() {
  const [filters, setFilters] = useState<OrderFilters>({
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'CLOSED',
    timePeriod: 7 * 24 * 60 * 60 * 1000, // default 7 days
    accountId: 'All',
    historyStatus: 'All'
  });

  const { fetchOrders, orders, loading, isSyncing, error } = useOrderReports(filters);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);
  const formatCurrency = useFormatCurrency();
  const keys = useApiKeysStore(state => state.keys);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Initial Fetch
  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOrders]);

  // Silent polling
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, historyCacheInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [historyCacheInterval, fetchOrders]);

  const useMockData = useSettingsStore(state => state.useMockData);

  // Filter to trades only (orders that have some filled quantity, representing trades)
  const trades = useMemo(() => {
    return orders.filter(o => o.filledQty > 0);
  }, [orders]);

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedTrades, totalItems: tradesTotal } = usePagination(
    trades, 50, [filters]
  );

  // Stats
  const stats = useMemo(() => {
    let buyCount = 0;
    let sellCount = 0;
    let totalTradedVolume = 0;
    let totalFees = 0;

    trades.forEach(t => {
      if (t.side === 'buy') buyCount++;
      else if (t.side === 'sell') sellCount++;

      const p = t.avgPrice > 0 ? t.avgPrice : t.price || 0;
      const isInverse = t.category === 'INVERSE';

      const qtyIsCoin = isInverse && detectQtyIsCoin({ exchange: t.exchange, qty: t.qty, price: p, value: t.value });

      let valUsd = 0;
      if (t.exchange === 'bybit') {
        if (isInverse) {
          // Bybit inverse: t.value (cumExecValue) is in COIN. Multiply by avg price to get USD value
          valUsd = t.value && t.value > 0 && p > 0 ? Number(new Big(t.value).times(p)) : t.filledQty;
        } else {
          // Bybit linear: t.value is already in USD
          valUsd = t.value && t.value > 0 ? t.value : (p > 0 ? Number(new Big(t.filledQty).times(p)) : 0);
        }
      } else if (t.value && t.value > 0 && t.exchange !== 'bitget') {
        // Prefer exact value if available, except for bitget where it might be inaccurate for partial fills
        valUsd = t.filledQty > 0 && t.filledQty !== t.qty ? (p > 0 ? Number(new Big(t.filledQty).times(p)) : 0) : t.value;
      } else if (isInverse && !qtyIsCoin) {
        valUsd = t.filledQty;
      } else {
        valUsd = p > 0 ? Number(new Big(t.filledQty).times(p)) : 0;
      }
      totalTradedVolume += valUsd;

      if (t.fees) {
        if (isInverse) {
          totalFees += Math.abs(t.fees) * p;
        } else {
          totalFees += Math.abs(t.fees);
        }
      }
    });

    return { buyCount, sellCount, totalTradedVolume, totalFees };
  }, [trades]);

  const SIDE_DONUT = [
    { name: 'Buy', value: stats.buyCount, color: '#00C853' },
    { name: 'Sell', value: stats.sellCount, color: '#FF4444' }
  ];

  const handleExport = (formatType: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);

    const headers = [
      'Market',
      'Exchange',
      'Instrument',
      'Order Type',
      'Direction',
      'Filled Value',
      'Filled Price',
      'Filled Qty',
      'Filled Type',
      'Trading Fees',
      'Transaction Time',
      'Transaction ID'
    ];

    const rows = trades.map(t => {
      const isBuy = t.side === 'buy';
      const isInverse = t.category === 'INVERSE';
      const symbolSuffix = extractBaseCoin(t.exchange, t.symbol);

      // Instrument mapping
      let instrumentLabel = 'Linear Perpetuals';
      if (t.category === 'INVERSE') instrumentLabel = 'Inverse Perpetuals';
      else if (t.category === 'SPOT') instrumentLabel = 'Spot';
      else if (t.category === 'FUTURES') instrumentLabel = 'Futures';
      else if (t.category === 'OPTION') instrumentLabel = 'Option';

      // Direction
      let direction = isBuy ? 'Buy' : 'Sell';
      if (t.category !== 'SPOT') {
        if (isBuy) {
          direction = t.positionSide === 'short' ? 'Close Short' : 'Open Long';
        } else {
          direction = t.positionSide === 'long' ? 'Close Long' : 'Open Short';
        }
      }

      // Filled Price
      const filledPrice = t.avgPrice > 0 ? t.avgPrice : t.price || 0;

      // Filled Value and Qty calculations
      let filledValueStr = '';
      let filledQtyStr = '';

      const qtyIsCoin = isInverse && detectQtyIsCoin({ exchange: t.exchange, qty: t.qty, price: filledPrice, value: t.value });

      let actualFilledCoinSize = 0;
      let filledValUsd = 0;

      if (t.exchange === 'bybit') {
        if (isInverse) {
          filledValUsd = t.value && t.value > 0 && filledPrice > 0 ? t.value * filledPrice : t.filledQty;
          actualFilledCoinSize = t.value && t.value > 0 ? t.value : (filledPrice > 0 ? t.filledQty / filledPrice : 0);
        } else {
          filledValUsd = t.value && t.value > 0 ? t.value : (filledPrice > 0 ? t.filledQty * filledPrice : 0);
          actualFilledCoinSize = t.filledQty;
        }
      } else if (isInverse && !qtyIsCoin) {
        filledValUsd = t.filledQty;
        actualFilledCoinSize = filledPrice > 0 ? t.filledQty / filledPrice : 0;
      } else {
        filledValUsd = t.filledQty > 0 ? (t.filledQty * filledPrice) : 0;
        actualFilledCoinSize = t.filledQty;
      }

      filledQtyStr = `${actualFilledCoinSize.toFixed(8)} ${symbolSuffix}`;
      filledValueStr = `${filledValUsd.toFixed(2)} USD`;

      // Fees
      const feeStr = t.fees
        ? (isInverse ? `${Math.abs(t.fees).toFixed(8)} ${symbolSuffix}` : `${Math.abs(t.fees).toFixed(6)} USDT`)
        : '0.00';

      const timeStr = formatIsoDateTime(t.updatedTime || t.createdTime);

      return [
        t.symbol,
        t.exchange.toUpperCase(),
        instrumentLabel,
        t.type,
        direction,
        filledValueStr,
        filledPrice,
        filledQtyStr,
        'Trade',
        feeStr,
        timeStr,
        t.exchangeOrderId || t.id
      ];
    });

    const config: ExportConfig = {
      title: 'Trade History Report',
      filename: `Trade_History_${Date.now()}`,
      headers,
      rows
    };

    if (formatType === 'csv') exportToCSV(config);
    if (formatType === 'excel') exportToExcel(config);
    if (formatType === 'pdf') exportToPDF(config);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <ArrowLeftRight className="w-5 h-5 text-[#2F6BFF]" />
            Trade History
          </h2>
          <StatusAndSyncBadge isSyncing={isSyncing} syncMessage={isSyncing ? 'Syncing trade history...' : null} />
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

      <div className="px-0">
        <OrderFiltersUI filters={filters} setFilters={setFilters} showPeriod={true} />
      </div>

      {trades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Total Trades Stats */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] text-[#8E9299] uppercase tracking-wider">Total Trades</span>
              <span className="text-2xl font-medium text-white mt-1">{trades.length}</span>
              <span className="text-xs text-[#8E9299] mt-1 font-mono">
                {stats.buyCount} Buy | {stats.sellCount} Sell
              </span>
            </div>
            <div className="w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', border: '1px solid #2a2b30', borderRadius: '8px', fontSize: '11px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Pie data={SIDE_DONUT} cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" dataKey="value" stroke="none">
                    {SIDE_DONUT.map((entry, index) => <Cell key={`side-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trade Volume */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <AppTooltip description="The total estimated USD value of all executed trades in the selected period.">
              <span className="text-[13px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">Traded Volume</span>
            </AppTooltip>
            <span className="text-2xl font-medium text-[#00C853] mt-1">
              {formatCurrency(stats.totalTradedVolume, 'usd')}
            </span>
            <span className="text-xs text-[#8E9299] mt-1">Total traded across active accounts</span>
          </div>

          {/* Est. Trading Fees */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <AppTooltip description="The total estimated USD value of trading fees paid for these orders.">
              <span className="text-[13px] text-[#8E9299] uppercase tracking-wider w-max cursor-help border-b border-dashed border-[#8E9299]/50">Est. Trading Fees</span>
            </AppTooltip>
            <span className="text-2xl font-medium text-[#FF4444] mt-1">
              {stats.totalFees > 0 ? '-' + formatCurrency(stats.totalFees, 'usd') : '0.00 USD'}
            </span>
            <span className="text-xs text-[#8E9299] mt-1">
              Paid fees converted to USD
              {stats.totalTradedVolume > 0 && ` (${((stats.totalFees / stats.totalTradedVolume) * 100).toFixed(3)}% of volume)`}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      {loading && trades.length === 0 ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6BFF]"></div>
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-[#151619] border border-[#2a2b30] rounded-xl">
          <p className="text-[#8E9299]">No trades found for selected filters in this period.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {/* Top Pagination if trades.length > 5 */}
          {tradesTotal > 5 && (
            <div className="mb-2">
              <Pagination
                id="trades-pagination-top"
                currentPage={currentPage}
                totalItems={tradesTotal}
                itemsPerPage={50}
                onPageChange={setCurrentPage}
                refreshKey={`${filters.exchange}-${filters.instrument}-${filters.type}-${filters.side}-${filters.status}-${filters.timePeriod}-${filters.accountId}-${filters.historyStatus}`}
                refreshLabel="Updating"
                refreshDataReady={!loading}
              />
            </div>
          )}

          {paginatedTrades.map(trade => {
            const isBuy = trade.side === 'buy';
            const isInverse = trade.category === 'INVERSE';
            const symbolSuffix = extractBaseCoin(trade.exchange, trade.symbol);
            const globalCategory = AssetClassifierAggregator.getGlobalCategorySync(trade.symbol);

            const connectionLabel = keys.find(k => k.id === trade.connectionId)?.label || trade.connectionId;

            // Instrument mapping
            let instrumentLabel = 'Linear';
            if (trade.category === 'INVERSE') instrumentLabel = 'Inverse';
            else if (trade.category === 'SPOT') instrumentLabel = 'Spot';
            else if (trade.category === 'FUTURES') instrumentLabel = 'Futures';
            else if (trade.category === 'OPTION') instrumentLabel = 'Option';

            // Direction Label and style
            let directionLabel = isBuy ? 'Buy' : 'Sell';
            let directionColorClass = isBuy ? 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20' : 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20';

            if (trade.category !== 'SPOT') {
              if (isBuy) {
                const isClose = trade.positionSide === 'short';
                directionLabel = isClose ? 'Close Short' : 'Open Long';
                directionColorClass = isClose ? 'text-teal-400 bg-teal-400/10 border-teal-400/20' : 'text-[#00C853] bg-[#00C853]/10 border-[#00C853]/20';
              } else {
                const isClose = trade.positionSide === 'long';
                directionLabel = isClose ? 'Close Long' : 'Open Short';
                directionColorClass = isClose ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' : 'text-[#FF4444] bg-[#FF4444]/10 border-[#FF4444]/20';
              }
            }

            // Price calculation
            const filledPrice = trade.avgPrice > 0 ? trade.avgPrice : trade.price || 0;

            // Filled Value and Qty calculations using big.js and formatCurrency
            let filledValueStr = '';
            let filledQtyStr = '';

      const qtyIsCoin = isInverse && detectQtyIsCoin({ exchange: trade.exchange, qty: trade.qty, price: filledPrice, value: trade.value });

            let actualFilledCoinSize = 0;
            let filledValUsd = 0;

            if (trade.exchange === 'bybit') {
              if (isInverse) {
                filledValUsd = trade.value && trade.value > 0 && filledPrice > 0 ? Number(new Big(trade.value).times(filledPrice)) : trade.filledQty;
                actualFilledCoinSize = trade.value && trade.value > 0 ? trade.value : (filledPrice > 0 ? trade.filledQty / filledPrice : 0);
              } else {
                filledValUsd = trade.value && trade.value > 0 ? trade.value : (filledPrice > 0 ? Number(new Big(trade.filledQty).times(filledPrice)) : 0);
                actualFilledCoinSize = trade.filledQty;
              }
            } else if (isInverse && !qtyIsCoin) {
              filledValUsd = trade.filledQty;
              actualFilledCoinSize = filledPrice > 0 ? trade.filledQty / filledPrice : 0;
            } else {
              filledValUsd = trade.filledQty > 0 ? (trade.filledQty * filledPrice) : 0;
              actualFilledCoinSize = trade.filledQty;
            }

            filledQtyStr = `${formatCurrency(actualFilledCoinSize, 'crypto')} ${symbolSuffix}`;
            filledValueStr = `${formatCurrency(filledValUsd, 'usd')} USD`;
            const dtFormatted = formatDateTime(trade.updatedTime || trade.createdTime);
            const timeStr = dtFormatted.timeStr;
            const dateStr = dtFormatted.dateStr;

            return (
              <div
                key={trade.id}
                className="bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col overflow-hidden"
              >
                {/* Compact Row */}
                <div className="p-4 grid grid-cols-2 lg:grid-cols-7 gap-4">
                  {/* Col 1: Asset Info & Badges */}
                  <div className="flex items-center gap-3 w-full border-b border-[#2a2b30] lg:border-none pb-3 lg:pb-0 col-span-2 lg:col-span-1">
                    <div className="flex flex-col items-center gap-1.5 shrink-0">
                      <div className="flex items-center relative">
                        <CoinIcon symbol={trade.symbol} size={28} className="w-7 h-7" category={globalCategory} />
                        <div className="bg-[#151619] rounded-full p-0.5 absolute -bottom-1 -right-1">
                          <ExchangeIcon exchange={trade.exchange} className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
                        {instrumentLabel}
                      </span>
                      <span className="text-[9px] font-bold tracking-wider px-1 py-0.5 rounded bg-[#2a2b30] border border-[#3a3b40] text-[#a0a5ad] uppercase">
                        {globalCategory}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white text-sm">{trade.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="w-max text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] py-0.5 px-1.5 rounded-[4px] capitalize">
                          {trade.exchange}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="w-max text-[10px] font-medium text-[#c0c5cc] bg-[#1a1c20] border border-[#2d3036] py-0.5 px-1.5 rounded-[4px] truncate max-w-[130px]" title={connectionLabel}>
                          {connectionLabel}
                        </span>
                        <AccountTypeBadge
                          exchange={trade.exchange}
                          accountType={trade.accountType || keys.find(k => k.id === trade.connectionId)?.accountType}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Col 2: Direction & Type */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="Indicates trade direction, margin mode and order type.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Direction / Margin Mode & Type</span>
                    </AppTooltip>
                    <span className={`font-mono text-sm ${isBuy ? 'text-[#00C853]' : 'text-[#FF4444]'}`}>
                      {directionLabel}·{trade.positionSide !== 'net' ? `${trade.raw?.leverage || trade.raw?.lever || '1'}x` : '1x'}
                    </span>
                    <span className="text-xs text-[#8E9299] font-mono mt-0.5">{trade.type}</span>
                  </div>

                  {/* Col 3: Filled Qty / Value */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="Quantity filled and total USD value of this trade.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Filled Qty / Value</span>
                    </AppTooltip>
                    <span className="font-mono text-white text-sm">{filledQtyStr}</span>
                    <span className="text-xs text-[#8E9299] font-mono">≈ {filledValueStr}</span>
                  </div>

                  {/* Col 4: Filled Price */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="The price at which the trade was executed.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Filled Price</span>
                    </AppTooltip>
                    <span className="font-mono text-white text-sm">
                      {filledPrice > 0 ? formatCurrency(filledPrice, 'crypto', 8) : '--'}
                    </span>
                  </div>

                  {/* Col 5: Trading Fees */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-1">
                    <AppTooltip description="Trading fees charged for this trade.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Trading Fees</span>
                    </AppTooltip>
                    {(() => {
                      const hasFees = trade.fees !== undefined && trade.fees !== null && trade.fees !== 0;
                      let mainFeeStr = '--';
                      let subFeeStr: string | null = null;
                      let isFeeNegative = false;

                      if (hasFees) {
                        const rawFee = trade.fees!;
                        const isCost = (trade.exchange === 'okx' || trade.exchange === 'bitget') ? rawFee < 0 : rawFee > 0;
                        isFeeNegative = isCost;

                        const absFee = Math.abs(rawFee);

                        if (isInverse) {
                          mainFeeStr = `${isCost ? '-' : ''}${formatCurrency(absFee, 'crypto', 8)} ${symbolSuffix}`;
                          const feeUsd = absFee * filledPrice;
                          subFeeStr = `≈ ${isCost ? '-' : ''}${formatCurrency(feeUsd, 'usd')} USD`;
                        } else {
                          mainFeeStr = `${isCost ? '-' : ''}${formatCurrency(absFee, 'crypto', 6)} USDT`;
                        }
                      }

                      return (
                        <div className="flex flex-col">
                          <span className={`font-mono text-sm ${isFeeNegative ? 'text-[#FF4444]' : hasFees ? 'text-[#00C853]' : 'text-white'}`}>
                            {mainFeeStr}
                          </span>
                          {subFeeStr && (
                            <span className={`font-mono text-xs ${isFeeNegative ? 'text-[#FF4444]/80' : 'text-[#00C853]/80'} mt-0.5`}>
                              {subFeeStr}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Col 6: Transaction Time & ID */}
                  <div className="flex flex-col justify-center gap-0.5 lg:border-l border-[#2a2b30] lg:pl-4 col-span-2">
                    <AppTooltip description="The timestamp when this transaction took place and its unique transaction ID.">
                      <span className="text-[10px] text-[#8E9299] uppercase w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Transaction Time & ID</span>
                    </AppTooltip>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-white text-sm font-sans">{dateStr}</span>
                      <span className="text-xs text-[#8E9299] font-mono">{timeStr}</span>
                    </div>
                    <span className="text-[10px] text-[#8E9299] font-mono select-all mt-1 truncate max-w-xs" title={trade.exchangeOrderId || trade.id}>
                      ID: {trade.exchangeOrderId || trade.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Pagination */}
          <div className="mt-3">
            <Pagination
              id="trades-pagination-bottom"
              currentPage={currentPage}
              totalItems={tradesTotal}
              itemsPerPage={50}
              onPageChange={setCurrentPage}
              refreshKey={`${filters.exchange}-${filters.instrument}-${filters.type}-${filters.side}-${filters.status}-${filters.timePeriod}-${filters.accountId}-${filters.historyStatus}`}
              refreshLabel="Updating"
            />
          </div>
        </div>
      )}
    </div>
  );
}
