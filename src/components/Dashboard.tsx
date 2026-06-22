import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { useDashboardStore, BalanceItem } from '../store/dashboardStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { DollarSign, Wallet, Search, X, TrendingUp, TrendingDown, ChevronDown, ChevronRight, BarChart2, Eye, EyeOff, Activity } from 'lucide-react';
import { CoinIcon } from './ui/CoinIcon';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { Sparkline } from './ui/Sparkline';
import { MacroCapitalChart } from './analytics/MacroCapitalChart';
import { CrossExchangeAssetsChart } from './analytics/CrossExchangeAssetsChart';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';

export function Dashboard() {
  const { balances, positions } = useDashboardStore();
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [filterText, setFilterText] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(true);
  const [expandedExchanges, setExpandedExchanges] = useState<Record<string, boolean>>({});
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  const balancesList = Object.values(balances);
  const positionsList = Object.values(positions);

  const activeBalances = useMemo(() => {
    return useMockData
      ? balancesList.filter(b => b.connectionId.startsWith('mocked-data'))
      : balancesList.filter(b => !b.connectionId.startsWith('mocked-data'));
  }, [balancesList, useMockData]);

  const activePositions = useMemo(() => {
    return useMockData
      ? positionsList.filter(pos => pos.connectionId.startsWith('mocked-data'))
      : positionsList.filter(pos => !pos.connectionId.startsWith('mocked-data'));
  }, [positionsList, useMockData]);

  const totalEquity = useMemo(() => {
    return Number(activeBalances.reduce((acc, curr) => acc.plus(curr.usdValue || 0), new Big(0)));
  }, [activeBalances]);

  const openPositionsRealizedPnL = useMemo(() => {
    return Number(activePositions.reduce((acc, curr) => {
      const pnl = curr.realizedPnl || 0;
      const usdPnl = curr.instrumentType === 'INVERSE' ? pnl * (curr.markPrice || 0) : pnl;
      return acc.plus(usdPnl);
    }, new Big(0)));
  }, [activePositions]);

  const openPositionsUnrealizedPnL = useMemo(() => {
    return Number(activePositions.reduce((acc, curr) => {
      const pnl = curr.unrealizedPnl || 0;
      const usdPnl = curr.instrumentType === 'INVERSE' ? pnl * (curr.markPrice || 0) : pnl;
      return acc.plus(usdPnl);
    }, new Big(0)));
  }, [activePositions]);

  const openPositionsTotalPnL = useMemo(() => {
    return openPositionsRealizedPnL + openPositionsUnrealizedPnL;
  }, [openPositionsRealizedPnL, openPositionsUnrealizedPnL]);

  const openPositionsTotalPnLPercent = totalEquity > 0 ? (openPositionsTotalPnL / totalEquity) * 100 : 0;
  const realizedPnLPercent = totalEquity > 0 ? (openPositionsRealizedPnL / totalEquity) * 100 : 0;
  const unrealizedPnLPercent = totalEquity > 0 ? (openPositionsUnrealizedPnL / totalEquity) * 100 : 0;
  const openPositionsCount = activePositions.length;

  const longPositions = activePositions.filter(pos => pos.side === 'long' || pos.side === 'buy').length;
  const shortPositions = activePositions.filter(pos => pos.side === 'short' || pos.side === 'sell').length;
  const longPercent = openPositionsCount > 0 ? (longPositions / openPositionsCount) * 100 : 0;
  const shortPercent = openPositionsCount > 0 ? (shortPositions / openPositionsCount) * 100 : 0;

  // Hedge Mode / Inverse calculations
  const inversePositions = activePositions.filter(pos => pos.instrumentType === 'INVERSE');
  const inverseOpenCount = inversePositions.length;
  const inverseLongCount = inversePositions.filter(pos => pos.side === 'long' || pos.side === 'buy').length;
  const inverseShortCount = inversePositions.filter(pos => pos.side === 'short' || pos.side === 'sell').length;

  const totalProtected = Number(inversePositions.reduce((acc, pos) => {
    if (pos.side === 'short' || pos.side === 'sell') {
      return acc.plus(new Big(pos.margin || 0).times(pos.markPrice || 0));
    }
    return acc;
  }, new Big(0)));
  const totalExposed = totalEquity - totalProtected;

  const protectedPercent = totalEquity > 0 ? (totalProtected / totalEquity) * 100 : 0;
  const exposedPercent = totalEquity > 0 ? (totalExposed / totalEquity) * 100 : 0;

  const filteredBalances = useMemo(() => {
    let filtered = activeBalances;
    if (hideSmallBalances) {
      filtered = filtered.filter(b => (b.usdValue || 0) >= 1);
    }
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filtered = filtered.filter(b =>
        b.ccy.toLowerCase().includes(lowerFilter) ||
        b.label.toLowerCase().includes(lowerFilter) ||
        b.exchange.toLowerCase().includes(lowerFilter)
      );
    }
    // Sempre ordenar valor USD descrescente
    filtered.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
    return filtered;
  }, [activeBalances, filterText, hideSmallBalances]);

  // Hierarchical Data: Exchange -> Account -> Balances
  const hierarchy = useMemo(() => {
    const acc: Record<string, { total: Big; accounts: Record<string, { label: string; total: Big; balances: BalanceItem[] }> }> = {};

    filteredBalances.forEach(b => {
      if (!acc[b.exchange]) {
        acc[b.exchange] = { total: new Big(0), accounts: {} };
      }
      if (!acc[b.exchange].accounts[b.connectionId]) {
        acc[b.exchange].accounts[b.connectionId] = { label: b.label, total: new Big(0), balances: [] };
      }
      acc[b.exchange].accounts[b.connectionId].balances.push(b);
      acc[b.exchange].accounts[b.connectionId].total = acc[b.exchange].accounts[b.connectionId].total.plus(b.usdValue || 0);
      acc[b.exchange].total = acc[b.exchange].total.plus(b.usdValue || 0);
    });

    const result: Record<string, { total: number; accounts: Record<string, { label: string; total: number; balances: BalanceItem[] }> }> = {};
    for (const ex in acc) {
      result[ex] = { total: Number(acc[ex].total), accounts: {} };
      for (const conn in acc[ex].accounts) {
        result[ex].accounts[conn] = {
          label: acc[ex].accounts[conn].label,
          total: Number(acc[ex].accounts[conn].total),
          balances: acc[ex].accounts[conn].balances
        };
      }
    }

    return result;
  }, [filteredBalances]);

  const donutData = useMemo(() => {
    const dataMap: Record<string, Big> = {};
    activeBalances.forEach(b => {
      const val = b.usdValue || 0;
      if (val > 1) { // Ignore dust
        if (!dataMap[b.exchange]) dataMap[b.exchange] = new Big(0);
        dataMap[b.exchange] = dataMap[b.exchange].plus(val);
      }
    });
    return Object.entries(dataMap)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value);
  }, [activeBalances]);

  const crossExchangeAssets = useMemo(() => {
    const exchangesMap: Record<string, { total: Big, assetsMap: Record<string, Big> }> = {};
    let globalTotal = new Big(0);

    activeBalances.forEach(b => {
      const val = b.usdValue || 0;
      if (val > 1) { // ignore dust
        if (!exchangesMap[b.exchange]) exchangesMap[b.exchange] = { total: new Big(0), assetsMap: {} };
        exchangesMap[b.exchange].total = exchangesMap[b.exchange].total.plus(val);
        if (!exchangesMap[b.exchange].assetsMap[b.ccy]) exchangesMap[b.exchange].assetsMap[b.ccy] = new Big(0);
        exchangesMap[b.exchange].assetsMap[b.ccy] = exchangesMap[b.exchange].assetsMap[b.ccy].plus(val);
        globalTotal = globalTotal.plus(val);
      }
    });

    const formattedData: any[] = [];
    let maxSegments = 0;

    for (const [exchange, data] of Object.entries(exchangesMap)) {
      const totalNum = Number(data.total);
      const globalTotalNum = Number(globalTotal);

      const sorted = Object.entries(data.assetsMap)
        .map(([ccy, val]) => ({ ccy, val: Number(val) }))
        .sort((a, b) => b.val - a.val);

      let outrosVal = 0;
      const segments: any[] = [];
      const rawAssets: any[] = [];

      sorted.forEach(asset => {
        const percent = totalNum > 0 ? (asset.val / totalNum) * 100 : 0;
        const percentOfGlobal = globalTotalNum > 0 ? (asset.val / globalTotalNum) * 100 : 0;

        rawAssets.push({ name: asset.ccy, value: asset.val, percent, percentOfGlobal });

        if (percentOfGlobal < 10) {
          outrosVal += asset.val;
        } else {
          segments.push({ name: asset.ccy, value: asset.val, percent, percentOfGlobal });
        }
      });

      if (outrosVal > 0) {
        segments.push({
          name: 'Outros',
          value: outrosVal,
          percent: totalNum > 0 ? (outrosVal / totalNum) * 100 : 0,
          percentOfGlobal: globalTotalNum > 0 ? (outrosVal / globalTotalNum) * 100 : 0
        });
      }

      if (segments.length > maxSegments) {
        maxSegments = segments.length;
      }

      const rowData: any = { exchange: exchange.toLowerCase(), total: totalNum, rawAssets };
      segments.forEach((seg: any, idx: number) => {
        rowData[`segment${idx}`] = seg.value;
        rowData[`_meta${idx}`] = { name: seg.name, percent: seg.percent, percentOfGlobal: seg.percentOfGlobal };
      });

      formattedData.push(rowData);
    }

    return {
      data: formattedData.sort((a, b) => b.total - a.total),
      maxSegments
    };
  }, [activeBalances]);

  const toggleExchange = (exchange: string) => {
    setExpandedExchanges(prev => ({ ...prev, [exchange]: !(prev[exchange] ?? false) }));
  };

  const toggleAccount = (connId: string) => {
    setExpandedAccounts(prev => ({ ...prev, [connId]: !(prev[connId] ?? false) }));
  };

  const expandAll = () => {
    const ex: Record<string, boolean> = {};
    const ac: Record<string, boolean> = {};
    Object.keys(hierarchy).forEach(ek => {
      ex[ek] = true;
      Object.keys(hierarchy[ek].accounts).forEach(ak => {
        ac[ak] = true;
      });
    });
    setExpandedExchanges(ex);
    setExpandedAccounts(ac);
  };

  const collapseAll = () => {
    const ex: Record<string, boolean> = {};
    const ac: Record<string, boolean> = {};
    Object.keys(hierarchy).forEach(ek => {
      ex[ek] = false;
      Object.keys(hierarchy[ek].accounts).forEach(ak => {
        ac[ak] = false;
      });
    });
    setExpandedExchanges(ex);
    setExpandedAccounts(ac);
  };

  return (
    <div className="space-y-6">
      {useMockData && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-yellow-500 text-sm font-medium tracking-wide uppercase">Simulation Mode Active - Displaying Mock Data</span>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Patrimonio e P&L */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden p-5 flex flex-col md:flex-row gap-6 md:divide-x divide-[#2a2b30]">
          {/* Lado Esquerdo: Patrimonio */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[#8E9299] text-xs font-medium tracking-wider uppercase">Total Equity (USD)</span>
                <span className={`inline-block w-2 h-2 rounded-full ${openPositionsTotalPnL >= 0 ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.7)]'}`} />
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-3xl font-bold text-white font-mono tracking-tight">
                  {formatCurrency(totalEquity, 'usd')}
                </p>
                {openPositionsTotalPnL >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500/70" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500/70" />
                )}
              </div>
            </div>
            <div className="mt-4 text-xs text-[#8E9299] font-medium">
              Net balance across all connected exchanges
            </div>
          </div>

          {/* Lado Direito: Open Positions P&L */}
          <div className="flex-1 flex flex-col justify-between pt-5 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#8E9299] text-xs font-medium tracking-wider uppercase">Open Positions P&L</span>
              <Activity className="w-5 h-5 text-[#8E9299]/70" />
            </div>

            <div className="space-y-4">
              {/* Unrealized */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#8E9299] uppercase tracking-wider mb-1">Unrealized P&L</div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-xl font-bold font-mono tracking-tight ${openPositionsUnrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPrivateMode ? '$••••' : `${openPositionsUnrealizedPnL >= 0 ? '+' : ''}${formatCurrency(openPositionsUnrealizedPnL, 'usd')}`}
                    </p>
                    <span className={`text-xs font-semibold font-mono ${openPositionsUnrealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPrivateMode ? '(••••%)' : `(${openPositionsUnrealizedPnL >= 0 ? '+' : ''}${unrealizedPnLPercent.toFixed(2)}%)`}
                    </span>
                  </div>
                </div>
                <div className="w-[60px] h-[24px] opacity-90 hidden sm:block">
                  <Sparkline
                    data={[10, 20, 15, 30, 25, 40, 35, 50, openPositionsUnrealizedPnL >= 0 ? 70 : 20]}
                    color={openPositionsUnrealizedPnL >= 0 ? 'emerald' : 'red'}
                    width={60}
                    height={24}
                  />
                </div>
              </div>

              {/* Realized */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#8E9299] uppercase tracking-wider mb-1">Realized P&L</div>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-xl font-bold font-mono tracking-tight ${openPositionsRealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPrivateMode ? '$••••' : `${openPositionsRealizedPnL >= 0 ? '+' : ''}${formatCurrency(openPositionsRealizedPnL, 'usd')}`}
                    </p>
                    <span className={`text-xs font-semibold font-mono ${openPositionsRealizedPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPrivateMode ? '(••••%)' : `(${openPositionsRealizedPnL >= 0 ? '+' : ''}${realizedPnLPercent.toFixed(2)}%)`}
                    </span>
                  </div>
                </div>
                <div className="w-[60px] h-[24px] opacity-90 hidden sm:block">
                  <Sparkline
                    data={[15, 10, 25, 20, 35, 30, 45, 40, openPositionsRealizedPnL >= 0 ? 60 : 30]}
                    color={openPositionsRealizedPnL >= 0 ? 'emerald' : 'red'}
                    width={60}
                    height={24}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Posições e Hedge Mode */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden p-5 flex flex-col md:flex-row gap-1 md:divide-x divide-[#2a2b30]">
          {/* Lado Esquerdo: Posições Ativas */}
          <div className="flex-1 flex flex-col justify-between pr-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#8E9299] text-xs font-medium tracking-wider uppercase">Active Positions</span>
                <BarChart2 className="w-4 h-4 text-[#2F6BFF] opacity-60" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <p className="text-3xl font-bold text-white font-mono">
                  {openPositionsCount}
                </p>
                <span className="text-xs text-[#8E9299] font-semibold">Active</span>
              </div>
            </div>

            {/* Long vs Short Bar */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-[15px] font-semibold">
                <span className="text-emerald-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Longs: {longPositions}
                </span>
                <span className="text-red-500 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Shorts: {shortPositions}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#1a1b1e] rounded-full overflow-hidden flex">
                {openPositionsCount > 0 ? (
                  <>
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${longPercent}%` }} />
                    <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${shortPercent}%` }} />
                  </>
                ) : (
                  <div className="h-full w-full bg-[#2a2b30]" />
                )}
              </div>
              <div className="flex justify-between text-[15px] font-semibold">
                <span className="text-emerald-500 flex items-center gap-1">
                  {longPercent.toFixed(0)}%
                </span>
                <span className="text-red-500 flex items-center gap-1">
                  {shortPercent.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Lado Direito: Hedge Mode (Inverse) */}
          <div className="flex-1 flex flex-col justify-between pt-5 md:pt-0 md:pl-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#8E9299] text-xs font-medium tracking-wider uppercase">Hedge Mode (Inverse)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-500">Longs: {inverseLongCount}</span>
                  <span className="text-xs font-bold ">|</span>
                  <span className="text-xs font-semibold text-red-500">Shorts: {inverseShortCount}</span>
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-bold text-white font-mono">
                  {inverseOpenCount}
                </p>
                <span className="text-xs text-[#8E9299] font-medium">Active Positions</span>
              </div>
            </div>

            {/* Protected vs Exposed Bar */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-[15px] font-semibold font-mono">
                <span className="text-emerald-500/90">Prot: {formatCurrency(totalProtected, 'usd', 2)} </span>
                <span className="text-white font-semibold">Exp: {formatCurrency(totalExposed, 'usd', 2)} </span>
              </div>
              <div className="h-1.5 w-full bg-[#1a1b1e] rounded-full overflow-hidden flex">
                {totalEquity > 0 ? (
                  <>
                    <div className="h-full bg-emerald-500/80 transition-all duration-300" style={{ width: `${protectedPercent}%` }} />
                    <div className="h-full bg-white transition-all duration-300" style={{ width: `${exposedPercent}%` }} />
                  </>
                ) : (
                  <div className="h-full w-full bg-[#2a2b30]" />
                )}
              </div>
              <div className="flex justify-between text-[15px] font-semibold font-mono">
                <span className="text-emerald-500/90"> {protectedPercent.toFixed(2)}%</span>
                <span className="text-white font-semibold"> {exposedPercent.toFixed(2)}%</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      {donutData.length > 0 && crossExchangeAssets.data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MacroCapitalChart data={donutData} />
          <CrossExchangeAssetsChart data={crossExchangeAssets.data} maxSegments={crossExchangeAssets.maxSegments} />
        </div>
      )}

      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-semibold text-white">Balances</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#8E9299]" />
              </div>
              <input
                type="text"
                placeholder="Search asset..."
                className="pl-9 pr-10 py-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors w-full"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#8E9299] hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setHideSmallBalances(!hideSmallBalances)}
              className="flex items-center gap-2 px-3 py-2 bg-[#1a1b1e] border border-[#2a2b30] hover:bg-[#2a2b30]/50 rounded-lg text-sm text-[#8E9299] hover:text-white transition-colors"
            >
              {hideSmallBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">Hide &lt; $1</span>
            </button>

            <div className="flex items-center gap-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-1">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 text-sm text-[#8E9299] hover:text-white hover:bg-[#2a2b30] rounded-md transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 text-sm text-[#8E9299] hover:text-white hover:bg-[#2a2b30] rounded-md transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {Object.keys(hierarchy).length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center bg-[#1a1b1e] rounded-lg border border-[#2a2b30] border-dashed">
            <Wallet className="h-10 w-10 text-[#2a2b30] mb-3" />
            <p className="text-[#8E9299] font-medium">No balances found</p>
            <p className="text-[#8E9299]/60 text-sm mt-1">Connect your accounts to view balances.</p>
          </div>
        ) : (
          <div className="w-full">
            {(() => {
              const hierarchyEntries = Object.entries(hierarchy) as [string, { total: number; accounts: Record<string, { label: string; total: number; balances: BalanceItem[] }> }][];
              const cards = hierarchyEntries.map(([exchange, exData]) => {
                const totalExchangeValue = exData.total;
                const isExExpanded = expandedExchanges[exchange] ?? false;

                return (
                  <div key={exchange} data-theme={exchange.toLowerCase().trim()} className="bg-[#1a1b1e] border border-[#2a2b30] rounded-lg overflow-hidden flex flex-col w-full">
                    {/* Exchange Header */}
                    <button
                      onClick={() => toggleExchange(exchange)}
                      className="w-full flex items-center justify-between p-4 bg-[#1a1b1e] hover:bg-[#2a2b30]/30 transition-colors border-b border-[#2a2b30] group"
                    >
                      <div className="flex items-center gap-3">
                        <ExchangeIcon exchange={exchange} className="w-8 h-8 rounded-md bg-[#2a2b30] p-1" />
                        <div className="text-left">
                          <h4 className="text-base font-bold text-brand-normal capitalize">{exchange}</h4>
                          <div className="text-xs text-[#8E9299] font-medium tracking-wide">
                            Total Balance: <span className="font-mono text-white">{formatCurrency(totalExchangeValue, 'usd')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[#8E9299] group-hover:text-white transition-colors">
                        {isExExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </button>

                    {/* Accounts List */}
                    {isExExpanded && (
                      <div className="flex-1 overflow-hidden flex flex-col bg-[#111216]">
                        {Object.entries(exData.accounts).map(([connId, accData]) => {
                          const isAccExpanded = expandedAccounts[connId] ?? false;

                          // Determistic fake sparkline based on account total
                          const hash = (accData.total * 13) % 100;
                          const isPositive = hash > 50;
                          const sparkData = [
                            hash,
                            (hash * 1.5) % 100,
                            (hash * 0.8) % 100,
                            (hash * 1.2) % 100,
                            isPositive ? hash + 20 : Math.max(10, hash - 20)
                          ];

                          return (
                            <div key={connId} className="border-b border-[#2a2b30] last:border-0">
                              <button
                                onClick={() => toggleAccount(connId)}
                                className="w-full flex items-center justify-between p-3 pl-4 bg-[#151619] hover:bg-[#2a2b30]/30 transition-colors group"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="text-[#8E9299] group-hover:text-white transition-colors">
                                    {isAccExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </div>
                                  <div className="hidden sm:block ml-4 pl-4 border-l border-[#2a2b30] opacity-70 group-hover:opacity-100 transition-opacity">
                                    <Sparkline data={sparkData} color={isPositive ? 'emerald' : 'red'} width={60} height={20} />
                                  </div>
                                  <span className="text-sm font-medium text-gray-300 min-w-[120px] text-left">{accData.label}</span>
                                </div>
                                <span className="text-sm font-bold text-white font-mono">{formatCurrency(accData.total, 'usd')}</span>
                              </button>

                              {/* Assets Table */}
                              {isAccExpanded && (
                                <div className="bg-[#111216]">
                                  <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#111216]">
                                      <tr>
                                        <th className="px-4 py-2 text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">Asset</th>
                                        <th className="px-4 py-2 text-[10px] font-medium text-[#8E9299] uppercase tracking-wider text-right">Amount</th>
                                        <th className="px-4 py-2 text-[10px] font-medium text-[#8E9299] uppercase tracking-wider text-right">Value (≈USD)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#2a2b30]">
                                      {accData.balances.map(b => (
                                        <tr key={b.id} className="hover:bg-[#1a1b1e] transition-colors">
                                          <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                              <CoinIcon symbol={b.ccy} size={20} className="w-5 h-5" />
                                              <span className="text-sm font-bold text-white leading-none mt-0.5">{b.ccy}</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-white font-mono text-right">
                                            {formatCurrency(b.amount, 'crypto', 6)}
                                          </td>
                                          <td className="px-4 py-2.5 whitespace-nowrap text-xs text-white font-mono text-right">
                                            {formatCurrency(b.usdValue, 'usd')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });

              return (
                <>
                  {/* Mobile (1 col) */}
                  <div className="flex xl:hidden flex-col gap-6">
                    {cards}
                  </div>
                  {/* XL (2 cols) */}
                  <div className="hidden xl:flex 2xl:hidden gap-6 items-start">
                    <div className="flex-1 flex flex-col gap-6">
                      {cards.filter((_, i) => i % 2 === 0)}
                    </div>
                    <div className="flex-1 flex flex-col gap-6">
                      {cards.filter((_, i) => i % 2 === 1)}
                    </div>
                  </div>
                  {/* 2XL (3 cols) */}
                  <div className="hidden 2xl:flex gap-6 items-start">
                    <div className="flex-1 flex flex-col gap-6">
                      {cards.filter((_, i) => i % 3 === 0)}
                    </div>
                    <div className="flex-1 flex flex-col gap-6">
                      {cards.filter((_, i) => i % 3 === 1)}
                    </div>
                    <div className="flex-1 flex flex-col gap-6">
                      {cards.filter((_, i) => i % 3 === 2)}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

