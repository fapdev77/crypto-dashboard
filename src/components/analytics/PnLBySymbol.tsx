import React, { useState, useMemo } from 'react';
import Big from 'big.js';
import { usePnLBySymbol } from '../../hooks/usePnLBySymbol';
import { PositionHistoryPeriod } from '../../hooks/usePositionHistory';
import { Download, ArrowUpDown, ChevronDown, RefreshCw, BarChart2 } from 'lucide-react';
import { SymbolPnLRecord } from '../../types';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../utils/exportUtils';
import { Pagination } from '../ui/Pagination';

import { formatValue, formatCrypto } from '../../utils/formatters';
import { useTokenUsdPrice } from '../../hooks/useTokenUsdPrice';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { usePrivacy } from '../../context/PrivacyContext';
import { StatusAndSyncBadge } from '../ui/StatusAndSyncBadge';
import { FilterBar } from '../ui/FilterBar';
import { usePagination } from '../../hooks/usePagination';

type SortField = 'exchange' | 'symbol' | 'instrument' | 'totalPnL' | 'longPnL' | 'shortPnL';
type SortDir = 'asc' | 'desc';

export function PnLBySymbol() {
  const [period, setPeriod] = useState<PositionHistoryPeriod>('7d');
  const [exchange, setExchange] = useState<string>('All');
  const [instrument, setInstrument] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [sortField, setSortField] = useState<SortField>('totalPnL');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { pnlData, isLoading, isSyncing, syncMessage, isRealPnLSyncing } = usePnLBySymbol(period, exchange, instrument);

  const instrumentsAvailable = useMemo(() => {
    if (exchange === 'bitget') return ['All', 'USDT-M', 'Coin-M', 'USDC-M'];
    if (exchange === 'bybit') return ['All', 'Linear', 'Inverse'];
    if (exchange === 'okx') return ['All', 'USDT-margined', 'Coin-margined', 'USDC-margined'];
    return ['All'];
  }, [exchange]);

  // Dynamic period options: extended periods only when Bybit exchange is selected
  const periodOptions = useMemo(() => {
    const baseOptions = [
      { value: 'today', label: 'Today' },
      { value: '7d', label: '7 Days' },
      { value: '14d', label: '14 Days' },
      { value: '30d', label: '30 Days' },
      { value: '90d', label: '90 Days' },
    ];

    if (exchange === 'bybit') {
      return [
        ...baseOptions,
        { value: '120d', label: '120 Days' },
        { value: '180d', label: '6 Months' },
        { value: '365d', label: '1 Year' },
        { value: 'all', label: 'All Time' },
      ];
    }

    return baseOptions;
  }, [exchange]);

  // Handle cross-exchange instrument reset
  React.useEffect(() => {
    if (instrument !== 'All' && !instrumentsAvailable.includes(instrument)) {
      setInstrument('All');
    }
  }, [exchange, instrument, instrumentsAvailable]);

  // Handle period reset when exchange changes (extended periods only for Bybit)
  React.useEffect(() => {
    const validPeriods = periodOptions.map(o => o.value);
    if (!validPeriods.includes(period)) {
      setPeriod('7d');
    }
  }, [exchange, periodOptions, period]);

  // Finding max absolut values for Intensity bar proportionality
  const { maxTotal, maxLong, maxShort } = useMemo(() => {
    let maxT = new Big(0);
    let maxL = new Big(0);
    let maxS = new Big(0);

    pnlData.forEach(pos => {
      if (pos.totalPnL.abs().gt(maxT)) maxT = pos.totalPnL.abs();
      if (pos.longPnL.abs().gt(maxL)) maxL = pos.longPnL.abs();
      if (pos.shortPnL.abs().gt(maxS)) maxS = pos.shortPnL.abs();
    });

    return { maxTotal: maxT, maxLong: maxL, maxShort: maxS };
  }, [pnlData]);

  const sortedData = useMemo(() => {
    let filtered = [...pnlData];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pos => pos.symbol.toLowerCase().includes(term) || pos.exchange.toLowerCase().includes(term));
    }

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'exchange':
          cmp = a.exchange.localeCompare(b.exchange);
          break;
        case 'symbol':
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case 'instrument':
          cmp = a.instrument.localeCompare(b.instrument);
          break;
        case 'totalPnL':
          cmp = a.totalPnL.cmp(b.totalPnL);
          break;
        case 'longPnL':
          cmp = a.longPnL.cmp(b.longPnL);
          break;
        case 'shortPnL':
          cmp = a.shortPnL.cmp(b.shortPnL);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return filtered;
  }, [pnlData, sortField, sortDir, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const { page: currentPage, setPage: setCurrentPage, paginated: paginatedData, totalItems: sortedTotal } = usePagination(
    sortedData, 50, [pnlData, exchange, instrument, searchTerm]
  );

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setExportMenuOpen(false);

    const headers = ['Symbol', 'Instrument', 'Exchange', 'Total PnL', 'Long PnL', 'Short PnL'];
    const rows = sortedData.map(r => [
      r.symbol,
      r.instrument,
      r.exchange,
      r.totalPnL.toString(),
      r.longPnL.toString(),
      r.shortPnL.toString()
    ]);

    const config: ExportConfig = {
      title: 'PnL By Symbol Report',
      filename: `PnL_by_Symbol_${period}_${Date.now()}`,
      headers,
      rows
    };

    if (format === 'csv') exportToCSV(config);
    if (format === 'excel') exportToExcel(config);
    if (format === 'pdf') exportToPDF(config);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 text-white">
            <BarChart2 className="w-5 h-5 text-[#2F6BFF]" />
            PnL by Symbol
          </h2>
          <StatusAndSyncBadge isSyncing={isSyncing} syncMessage={syncMessage} />
          <span className="text-xs text-[#8E9299] mt-1">To represent the actual PnL, it is calculated based on the real time USD value of the trades, not on the positions value.</span>
          <span className="text-[10px] text-[#8E9299]/70 mt-1">For Bybit, PnL is derived from the transaction-log cache (up to 2 years). PnL for other exchanges is computed from closed positions.</span>
          {isRealPnLSyncing && exchange === 'bybit' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/20 border border-amber-700/30 rounded-lg text-[11px] text-amber-300/80 mt-2">
              <RefreshCw className="w-3 h-3 animate-spin shrink-0" />
              <span>
                Real PnL sync in progress. Values shown are from closed positions and may not reflect exact figures.
              </span>
            </div>
          )}
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
        <FilterBar
          exchange={{
            value: exchange,
            onChange: setExchange,
            labelAll: 'All Exchanges',
          }}
          instrument={{
            value: instrument,
            onChange: setInstrument,
            options: instrumentsAvailable,
            disabled: exchange === 'All',
            labelAll: 'All Instruments',
          }}
          period={{
            value: period,
            onChange: setPeriod,
            options: periodOptions,
          }}
          search={{
            value: searchTerm,
            onChange: setSearchTerm,
            placeholder: 'Search symbol...',
          }}
        />
      </div>

      <div className="flex-1 overflow-auto hide-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8E9299]">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#8E9299]/70" />
            <div className="text-sm font-medium">{syncMessage || 'Carregando dados...'}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTotal > 5 && (
              <Pagination
                id="pnl-symbol-pagination-top"
                currentPage={currentPage}
                totalItems={sortedTotal}
                itemsPerPage={50}
                onPageChange={setCurrentPage}
                refreshKey={`${period}-${exchange}`}
                refreshLabel="Updating"
                refreshDataReady={!isLoading}
              />
            )}
            <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#8E9299] border-b border-[#2a2b30] sticky top-0 bg-[#151619] z-10">
                <tr>
                  <th className="px-4 py-3 font-normal cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('exchange')}>
                    <div className="flex items-center gap-1">Exchange <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-normal cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('symbol')}>
                    <div className="flex items-center gap-1">Name <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-normal cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('instrument')}>
                    <div className="flex items-center gap-1">Instrument <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-normal text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('totalPnL')}>
                    <div className="flex items-center justify-end gap-1">Total PnL <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-normal text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('longPnL')}>
                    <div className="flex items-center justify-end gap-1">Long PnL <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-4 py-3 font-normal text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('shortPnL')}>
                    <div className="flex items-center justify-end gap-1">Short PnL <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={`${row.exchange}-${row.symbol}-${row.instrument}`} className="border-b border-[#2a2b30]/30 hover:bg-[#2a2b30]/10 transition-colors">
                    <td className="px-4 py-4">
                      <div data-theme={row.exchange.toLowerCase()} className="flex items-center gap-2 font-medium">
                        <ExchangeIcon exchange={row.exchange} className="w-5 h-5 rounded-sm shrink-0" />
                        <span className="capitalize text-white">{row.exchange}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-[15px] text-white">
                      <div className="flex items-center gap-2">
                        <CoinIcon symbol={row.symbol} className="w-6 h-6 rounded-full shrink-0" />
                        <span>{row.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[#8E9299]">{row.instrument}</td>
                    {/* TD REFINADO: Fonte pesada, fundo presente e linhas de grade verticais exclusivas */}
                    <td
                      className="px-4 py-4 text-right font-bold text-[15px]
                           bg-[#1c1d22]/40 
                           border-x border-[#2a2b30]/30"
                    >
                      <PnLCell value={row.totalPnL} maxAbs={maxTotal} ccy={row.ccy} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <PnLCell value={row.longPnL} maxAbs={maxLong} ccy={row.ccy} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <PnLCell value={row.shortPnL} maxAbs={maxShort} ccy={row.ccy} />
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#8E9299]">No data or nothing found for selected filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sortedTotal > 0 && (
            <Pagination
              id="pnl-symbol-pagination-bottom"
              currentPage={currentPage}
              totalItems={sortedTotal}
              itemsPerPage={50}
              onPageChange={setCurrentPage}
              refreshKey={`${period}-${exchange}`}
              refreshLabel="Updating"
            />
          )}
        </div>
      )}
      </div>
    </div>
  );
}

function PnLCell({ value, maxAbs, ccy }: { value: Big, maxAbs: Big, ccy: string }) {
  const { isPrivateMode } = usePrivacy();
  const formatCurrency = useFormatCurrency();

  const isPositive = value.gt(0);
  const isZero = value.eq(0);
  const colorTextClass = isZero ? 'text-[#8E9299]' : isPositive ? 'text-[#00C853]' : 'text-[#FF4444]';
  const colorBgClass = isPositive ? 'bg-[#00C853]' : 'bg-[#FF4444]';

  const valNum = Number(value);
  const maxNum = Number(maxAbs) === 0 ? 1 : Number(maxAbs);
  const percentage = (Math.abs(valNum) / maxNum) * 100;

  const isFiatCcy = ccy.includes('USD') || ccy === 'EUR' || ccy === 'BRL';
  const displayCcy = ccy || 'USDT';

  const tokenUsdPrice = useTokenUsdPrice(ccy);
  const usdValue = tokenUsdPrice ? valNum * tokenUsdPrice : null;

  return (
    <div className="flex flex-col items-end gap-1.5 w-full pl-4">
      <div className="flex flex-col items-end px-1">
        <span className={`${colorTextClass} font-mono text-sm leading-tight tracking-tight`}>
          {isPrivateMode ? '••••' : `${isPositive ? '+' : ''}${formatCurrency(valNum, 'crypto', isFiatCcy ? 2 : 8)}`} <span className="text-xs ml-0.5 text-[#8E9299]">{displayCcy}</span>
        </span>
        {!isFiatCcy && usdValue !== null && (
          <span className="text-xs text-[#8E9299] font-mono tracking-tight leading-none mt-0.5" title={isPrivateMode ? '' : `~$${formatValue(tokenUsdPrice || 0, 2)} per ${displayCcy}`}>
            ≈ {isPrivateMode ? '$••••' : `${isPositive ? '+' : ''}${formatCurrency(usdValue, 'usd')}`}
          </span>
        )}
      </div>
      <div className="w-full h-[3px] bg-[#2a2b30]/50 rounded-full flex relative overflow-hidden">
        {/* Middle divider */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#2a2b30] z-10" />

        {/* Negative Side */}
        <div className="w-1/2 h-full flex justify-end">
          {!isPositive && !isZero && <div className={`${colorBgClass}`} style={{ width: `${percentage}%` }} />}
        </div>

        {/* Positive Side */}
        <div className="w-1/2 h-full flex justify-start">
          {isPositive && !isZero && <div className={`${colorBgClass}`} style={{ width: `${percentage}%` }} />}
        </div>
      </div>
    </div>
  );
}
