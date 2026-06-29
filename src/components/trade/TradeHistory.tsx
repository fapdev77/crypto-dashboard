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
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { AssetClassifierAggregator } from '../../services/AssetClassifierAggregator';
import { extractBaseCoin } from '../../utils/unifiers';
import { format } from 'date-fns';
import { Pagination } from '../ui/Pagination';

export function TradeHistory() {
  const [filters, setFilters] = useState<OrderFilters>({
    exchange: 'All',
    instrument: 'All',
    symbols: '',
    type: 'All',
    side: 'All',
    status: 'CLOSED',
    timePeriod: 7 * 24 * 60 * 60 * 1000, // default 7 days
    accountId: 'All'
  });

  const { fetchOrders, orders, loading, isSyncing, error } = useOrderReports(filters);
  const historyCacheInterval = useSettingsStore(state => state.historyCacheInterval);
  const formatCurrency = useFormatCurrency();
  const keys = useApiKeysStore(state => state.keys);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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

  // Filter to trades only (orders that have some filled quantity, representing trades)
  const trades = useMemo(() => {
    return orders.filter(o => o.filledQty > 0);
  }, [orders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, trades]);

  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return trades.slice(startIndex, startIndex + itemsPerPage);
  }, [trades, currentPage]);

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
      let valUsd = 0;
      if (t.category === 'INVERSE') {
        valUsd = t.filledQty; // Qty is in USD for inverse
      } else {
        valUsd = t.value || (p > 0 ? Number(new Big(t.filledQty).times(p)) : 0);
      }
      totalTradedVolume += valUsd;

      if (t.fees) {
        if (t.category === 'INVERSE') {
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
      if (isInverse) {
        const coinVal = filledPrice > 0 ? t.filledQty / filledPrice : 0;
        filledValueStr = `${coinVal.toFixed(8)} ${symbolSuffix}`;
        filledQtyStr = `${t.filledQty} USD`;
      } else {
        const usdVal = t.filledQty * filledPrice;
        filledValueStr = `${usdVal.toFixed(2)} USD`;
        filledQtyStr = `${t.filledQty} ${symbolSuffix}`;
      }

      // Fees
      const feeStr = t.fees
        ? (isInverse ? `${Math.abs(t.fees).toFixed(8)} ${symbolSuffix}` : `${Math.abs(t.fees).toFixed(6)} USDT`)
        : '0.00';

      const timeStr = format(new Date(t.updatedTime || t.createdTime), 'yyyy-MM-dd HH:mm:ss');

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
            <span className="text-[13px] text-[#8E9299] uppercase tracking-wider">Traded Volume</span>
            <span className="text-2xl font-medium text-[#00C853] mt-1">
              {formatCurrency(stats.totalTradedVolume, 'usd')}
            </span>
            <span className="text-xs text-[#8E9299] mt-1">Total traded across active accounts</span>
          </div>

          {/* Paid Fees */}
          <div className="bg-[#161b22] rounded-lg p-4 border border-[#2a2b30] flex flex-col justify-center">
            <span className="text-[13px] text-[#8E9299] uppercase tracking-wider">Est. Trading Fees</span>
            <span className="text-2xl font-medium text-[#FF4444] mt-1">
              {stats.totalFees > 0 ? '-' + formatCurrency(stats.totalFees, 'usd') : '0.00 USD'}
            </span>
            <span className="text-xs text-[#8E9299] mt-1">Paid fees converted to USD</span>
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
          {trades.length > 5 && (
            <div className="mb-2">
              <Pagination
                id="trades-pagination-top"
                currentPage={currentPage}
                totalItems={trades.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
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
            if (isInverse) {
              const coinVal = filledPrice > 0 ? Number(new Big(trade.filledQty).div(filledPrice)) : 0;
              filledValueStr = `${formatCurrency(coinVal, 'crypto', 8)} ${symbolSuffix}`;
              filledQtyStr = `${formatCurrency(trade.filledQty, 'crypto', 2)} USD`;
            } else {
              const usdVal = Number(new Big(trade.filledQty).times(filledPrice));
              filledValueStr = `${formatCurrency(usdVal, 'usd')} USD`;
              filledQtyStr = `${formatCurrency(trade.filledQty, 'crypto')} ${symbolSuffix}`;
            }

            const feeStr = trade.fees
              ? (isInverse ? `${formatCurrency(Math.abs(trade.fees), 'crypto', 8)} ${symbolSuffix}` : `${formatCurrency(Math.abs(trade.fees), 'crypto', 6)} USDT`)
              : '--';

            const d = new Date(trade.updatedTime || trade.createdTime);
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

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
                      <span className="w-max text-[10px] font-semibold text-white bg-[#202226] border border-[#34373c] mt-2 py-0.5 px-1.5 rounded-[4px] capitalize">
                        {trade.exchange}
                      </span>
                      <span className="w-max text-[10px] font-medium text-[#c0c5cc] bg-[#1a1c20] border border-[#2d3036] mt-1 py-0.5 px-1.5 rounded-[4px] truncate max-w-[130px]">
                        {connectionLabel}
                      </span>
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
                    <span className="font-mono text-sm text-[#FF4444]">{feeStr !== '--' ? `-${feeStr}` : feeStr}</span>
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
              totalItems={trades.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
