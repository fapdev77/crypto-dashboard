import React, { useState, useMemo } from 'react';
import Big from 'big.js';
import { usePnLBySymbol } from '../../hooks/usePnLBySymbol';
import { Download, ArrowUpDown, ChevronDown, Search, RefreshCw } from 'lucide-react';
import { SymbolPnLRecord } from '../../types';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { exportToCSV, exportToExcel, exportToPDF, ExportConfig } from '../../utils/exportUtils';

import { formatValue, formatCrypto } from '../../utils/formatters';
import { useTokenUsdPrice } from '../../hooks/useTokenUsdPrice';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { usePrivacy } from '../../context/PrivacyContext';
import { SyncBadge } from '../ui/SyncBadge';

type SortField = 'exchange' | 'symbol' | 'instrument' | 'totalPnL' | 'longPnL' | 'shortPnL';
type SortDir = 'asc' | 'desc';

export function PnLBySymbol() {
  const [period, setPeriod] = useState<'today' | '7d' | '14d' | '30d' | '90d'>('7d');
  const [exchange, setExchange] = useState<string>('All');
  const [instrument, setInstrument] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [sortField, setSortField] = useState<SortField>('totalPnL');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { pnlData, isLoading, isSyncing, syncMessage } = usePnLBySymbol(period, exchange, instrument);

  const instrumentsAvailable = useMemo(() => {
    if (exchange === 'bitget') return ['All', 'USDT-M', 'Coin-M', 'USDC-M'];
    if (exchange === 'bybit') return ['All', 'Linear', 'Inverse'];
    if (exchange === 'okx') return ['All', 'USDT-margined', 'Coin-margined', 'USDC-margined'];
    return ['All'];
  }, [exchange]);

  // Handle cross-exchange instrument reset
  React.useEffect(() => {
    if (instrument !== 'All' && !instrumentsAvailable.includes(instrument)) {
      setInstrument('All');
    }
  }, [exchange, instrument, instrumentsAvailable]);

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
    <div className="w-full flex flex-col gap-6 pb-8 h-full bg-[#151619] border border-[#2a2b30] text-white rounded-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 pb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-white">PnL by symbol</h2>
          <SyncBadge isSyncing={isSyncing} syncMessage={syncMessage} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9299]" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#1a1b1e] border border-[#2a2b30] text-sm text-white rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:border-[#2F6BFF] w-36 focus:w-48 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#8E9299] whitespace-nowrap">Exchange:</label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="bg-[#1a1b1e] border border-[#2a2b30] text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2F6BFF] transition-colors"
            >
              <option value="All">All Exchanges</option>
              <option value="bitget">Bitget</option>
              <option value="bybit">Bybit</option>
              <option value="okx">OKX</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-[#8E9299] whitespace-nowrap">Instrument:</label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              disabled={exchange === 'All'}
              className="bg-[#1a1b1e] border border-[#2a2b30] text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2F6BFF] transition-colors disabled:opacity-50"
            >
              {instrumentsAvailable.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-[#8E9299] whitespace-nowrap">Period:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="bg-[#1a1b1e] border border-[#2a2b30] text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#2F6BFF] transition-colors"
            >
              <option value="today">Today</option>
              <option value="7d">7 days</option>
              <option value="14d">14 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
          </div>

          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="p-2 ml-2 bg-[#1a1b1e] border border-[#2a2b30] text-white flex items-center gap-2 rounded-lg hover:bg-[#2a2b30]/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export <ChevronDown className="w-3 h-3" />
            </button>
            {exportMenuOpen && (
              <div className="absolute top-11 right-0 w-32 bg-[#1a1b1e] border border-[#2a2b30] text-white rounded-lg shadow-xl z-50 overflow-hidden text-sm animate-in fade-in slide-in-from-top-1 duration-150">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30] transition-colors">Export CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30] transition-colors">Export Excel</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-[#2a2b30] transition-colors">Export PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto hide-scrollbar px-4 md:px-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#8E9299]">
            <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#8E9299]/70" />
            <div className="text-sm font-medium">{syncMessage || 'Carregando dados...'}</div>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#8E9299] border-b border-[#2a2b30] sticky top-0 bg-[#151619] z-10">
              <tr>
                <th className="py-3 font-normal cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('exchange')}>
                  <div className="flex items-center gap-1">Exchange <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('symbol')}>
                  <div className="flex items-center gap-1">Name <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('instrument')}>
                  <div className="flex items-center gap-1">Instrument <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('totalPnL')}>
                  <div className="flex items-center justify-end gap-1">Total PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('longPnL')}>
                  <div className="flex items-center justify-end gap-1">Long PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('shortPnL')}>
                  <div className="flex items-center justify-end gap-1">Short PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={`${row.exchange}-${row.symbol}-${row.instrument}`} className="border-b border-[#2a2b30]/30 hover:bg-[#2a2b30]/10 transition-colors">
                  <td className="py-4">
                    <div data-theme={row.exchange.toLowerCase()} className="flex items-center gap-2 font-medium">
                      <ExchangeIcon exchange={row.exchange} className="w-5 h-5 rounded-sm shrink-0" />
                      <span className="capitalize text-white">{row.exchange}</span>
                    </div>
                  </td>
                  <td className="py-4 font-bold text-[15px] text-white">
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={row.symbol} className="w-6 h-6 rounded-full shrink-0" />
                      <span>{row.symbol}</span>
                    </div>
                  </td>
                  <td className="py-4 text-[#8E9299]">{row.instrument}</td>
                  {/* TD REFINADO: Fonte pesada, fundo presente e linhas de grade verticais exclusivas */}
                  <td
                    className="py-4 text-right px-4 font-bold text-[15px]
                         bg-[#1c1d22]/40 
                         border-x border-[#2a2b30]/30"
                  >
                    <PnLCell value={row.totalPnL} maxAbs={maxTotal} ccy={row.ccy} />
                  </td>
                  <td className="py-4 text-right">
                    <PnLCell value={row.longPnL} maxAbs={maxLong} ccy={row.ccy} />
                  </td>
                  <td className="py-4 text-right">
                    <PnLCell value={row.shortPnL} maxAbs={maxShort} ccy={row.ccy} />
                  </td>
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#8E9299]">Nenhum dado encontrado para os filtros selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
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
