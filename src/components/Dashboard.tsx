import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { BalanceItem } from '../store/balancesStore';
import { useBalancesStore } from '../store/balancesStore';
import { usePositionsStore } from '../store/positionsStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { DollarSign, TrendingUp, TrendingDown, BarChart2, Activity } from 'lucide-react';
import { Sparkline } from './ui/Sparkline';
import { MacroCapitalChart } from './analytics/MacroCapitalChart';
import { CrossExchangeAssetsChart } from './analytics/CrossExchangeAssetsChart';
import { ExchangeHierarchyTable } from './ExchangeHierarchyTable';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { usePrivacy } from '../context/PrivacyContext';
import { getInverseUsdValues } from '../utils/inverseUtils';

export function Dashboard() {
  const balances = useBalancesStore(state => state.balances);
  const positions = usePositionsStore(state => state.positions);
  const keys = useApiKeysStore(state => state.keys);
  const useMockData = useSettingsStore(state => state.useMockData);
  const formatCurrency = useFormatCurrency();
  const { isPrivateMode } = usePrivacy();

  const [filterText, setFilterText] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(true);
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
      const { realizedPnl } = getInverseUsdValues(curr, curr.markPrice);
      return acc.plus(realizedPnl || 0);
    }, new Big(0)));
  }, [activePositions]);

  const openPositionsUnrealizedPnL = useMemo(() => {
    return Number(activePositions.reduce((acc, curr) => {
      const { unrealizedPnl } = getInverseUsdValues(curr, curr.markPrice);
      return acc.plus(unrealizedPnl || 0);
    }, new Big(0)));
  }, [activePositions]);

  const openPositionsTotalPnL = useMemo(() => {
    return openPositionsRealizedPnL + openPositionsUnrealizedPnL;
  }, [openPositionsRealizedPnL, openPositionsUnrealizedPnL]);

  const openPositionsTotalPnLPercent = totalEquity > 0 ? (openPositionsTotalPnL / totalEquity) * 100 : 0;
  const realizedPnLPercent = totalEquity > 0 ? (openPositionsRealizedPnL / totalEquity) * 100 : 0;
  const unrealizedPnLPercent = totalEquity > 0 ? (openPositionsUnrealizedPnL / totalEquity) * 100 : 0;
  const openPositionsCount = activePositions.length;

  const longPositions = activePositions.filter(pos => pos.side === 'long').length;
  const shortPositions = activePositions.filter(pos => pos.side === 'short').length;
  const longPercent = openPositionsCount > 0 ? (longPositions / openPositionsCount) * 100 : 0;
  const shortPercent = openPositionsCount > 0 ? (shortPositions / openPositionsCount) * 100 : 0;

  // Hedge Mode / Inverse calculations
  const inversePositions = activePositions.filter(pos => pos.instrumentType === 'INVERSE');
  const inverseOpenCount = inversePositions.length;
  const inverseLongCount = inversePositions.filter(pos => pos.side === 'long').length;
  const inverseShortCount = inversePositions.filter(pos => pos.side === 'short').length;

  const totalProtected = Number(inversePositions.reduce((acc, pos) => {
    if (pos.side === 'short') {
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

      <ExchangeHierarchyTable
        hierarchy={hierarchy}
        formatCurrency={formatCurrency}
        filterText={filterText}
        setFilterText={setFilterText}
        hideSmallBalances={hideSmallBalances}
        setHideSmallBalances={setHideSmallBalances}
      />
    </div>
  );
}

