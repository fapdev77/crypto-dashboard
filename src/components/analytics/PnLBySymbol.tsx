import React, { useState, useMemo } from 'react';
import Big from 'big.js';
import { usePnLBySymbol } from '../../hooks/usePnLBySymbol';
import { Download, ArrowUpDown, ChevronDown, Search } from 'lucide-react';
import { SymbolPnLRecord } from '../../types';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';

import { formatValue, formatCrypto } from '../../utils/formatters';

type SortField = 'exchange' | 'symbol' | 'instrument' | 'totalPnL' | 'longPnL' | 'shortPnL';
type SortDir = 'asc' | 'desc';

export function PnLBySymbol() {
  const [period, setPeriod] = useState<'today' | '1w' | '2w' | '1m' | '3m' | 'all'>('1m');
  const [exchange, setExchange] = useState<string>('All');
  const [instrument, setInstrument] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortField, setSortField] = useState<SortField>('totalPnL');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { pnlData, isLoading } = usePnLBySymbol(period, '', '', true, exchange, instrument);

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
    let content = "Symbol,Instrument,Exchange,Total PnL,Long PnL,Short PnL\n";
    sortedData.forEach(r => {
      content += `${r.symbol},${r.instrument},${r.exchange},${r.totalPnL.toString()},${r.longPnL.toString()},${r.shortPnL.toString()}\n`;
    });
    
    // Simplification: all formats download CSV for now.
    // In a real prod environment we'd use unirest/xlsx for Excel and jsPDF for PDF
    const extension = format === 'csv' ? 'csv' : format === 'excel' ? 'xls' : 'pdf';
    const mimeType = format === 'csv' ? 'text/csv' : format === 'excel' ? 'application/vnd.ms-excel' : 'application/pdf';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PnL_by_Symbol_${period}_${Date.now()}.${extension}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="w-full flex flex-col gap-6 pb-8 h-full bg-white dark:bg-[#0b0c10] text-gray-900 dark:text-white rounded-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6 pb-2">
        <h2 className="text-xl font-bold tracking-tight">PnL by symbol</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none w-36 focus:w-48 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Exchange:</label>
            <select 
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="All">All Exchanges</option>
              <option value="bitget">Bitget</option>
              <option value="bybit">Bybit</option>
              <option value="okx">OKX</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Instrument:</label>
            <select 
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              disabled={exchange === 'All'}
              className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none disabled:opacity-50"
            >
              {instrumentsAvailable.map(inst => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Period:</label>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] text-sm rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="today">Today</option>
              <option value="1w">Last 7 days</option>
              <option value="2w">Last 14 days</option>
              <option value="1m">Last 30 days</option>
              <option value="3m">Last 90 days</option>
              <option value="all">All</option>
            </select>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="p-2 ml-2 bg-gray-100 dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] flex items-center gap-2 rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2b30] transition-colors"
            >
              <Download className="w-4 h-4" /> 
              Export <ChevronDown className="w-3 h-3" />
            </button>
            {exportMenuOpen && (
              <div className="absolute top-11 right-0 w-32 bg-white dark:bg-[#151619] border border-gray-200 dark:border-[#2a2b30] rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2b30]">Export CSV</button>
                <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2b30]">Export Excel</button>
                <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-[#2a2b30]">Export PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto hide-scrollbar px-4 md:px-6">
        {isLoading ? (
          <div className="text-sm text-gray-500 py-4">Carregando dados...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-[#2a2b30] sticky top-0 bg-white dark:bg-[#0b0c10] z-10">
              <tr>
                <th className="py-3 font-normal cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => handleSort('exchange')}>
                  <div className="flex items-center gap-1">Exchange <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => handleSort('symbol')}>
                  <div className="flex items-center gap-1">Name <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => handleSort('instrument')}>
                  <div className="flex items-center gap-1">Instrument <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => handleSort('totalPnL')}>
                  <div className="flex items-center justify-end gap-1">Total PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => handleSort('longPnL')}>
                  <div className="flex items-center justify-end gap-1">Long PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-3 font-normal text-right cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => handleSort('shortPnL')}>
                  <div className="flex items-center justify-end gap-1">Short PnL <ArrowUpDown className="w-3 h-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={`${row.exchange}-${row.symbol}-${row.instrument}`} className="border-b border-gray-50 dark:border-[#2a2b30]/50 hover:bg-gray-50 dark:hover:bg-[#2a2b30]/20 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <ExchangeIcon exchange={row.exchange} className="w-5 h-5 rounded-sm" />
                      <span className="capitalize">{row.exchange}</span>
                    </div>
                  </td>
                  <td className="py-4 font-bold text-[15px]">
                    <div className="flex items-center gap-2">
                      <CoinIcon symbol={row.symbol} className="w-6 h-6 rounded-full" />
                      <span>{row.symbol}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-500">{row.instrument}</td>
                  <td className="py-4 text-right">
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
                   <td colSpan={6} className="py-10 text-center text-gray-500">Nenhum dado encontrado para os filtros selecionados.</td>
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
  const isPositive = value.gt(0);
  const isZero = value.eq(0);
  const colorTextClass = isZero ? 'text-gray-400' : isPositive ? 'text-[#10B981]' : 'text-pink-500';
  const colorBgClass = isPositive ? 'bg-[#10B981]' : 'bg-pink-500';
  
  const valNum = Number(value);
  const maxNum = Number(maxAbs) === 0 ? 1 : Number(maxAbs);
  const percentage = (Math.abs(valNum) / maxNum) * 100;

  const isFiatCcy = ccy.includes('USD') || ccy === 'EUR';
  const displayCcy = ccy || 'USDT';

  return (
    <div className="flex flex-col items-end gap-2 w-full max-w-[200px] ml-auto">
       <span className={`${colorTextClass} font-mono text-sm`}>
          {isPositive ? '+' : ''}{isFiatCcy ? formatValue(valNum, 2) : formatCrypto(valNum)} <span className="text-xs">{displayCcy}</span>
       </span>
       <div className="w-full h-[3px] bg-gray-100 dark:bg-[#1e1f24] rounded-full flex relative overflow-hidden">
          {/* Middle divider */}
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-[#2a2b30] z-10" />
          
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
