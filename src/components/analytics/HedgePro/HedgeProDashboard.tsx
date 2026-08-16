import React, { useMemo, useState } from 'react';
import Big from 'big.js';
import { ShieldCheck, Activity } from 'lucide-react';
import { usePositionsStore } from '../../../store/positionsStore';
import { useBalancesStore } from '../../../store/balancesStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { getHedgeCoinSummaries, getHedgeTotals } from '../../../utils/hedgeUtils';
import { FilterBar } from '../../ui/FilterBar';
import { HedgeProKpis } from './HedgeProKpis';
import { HedgeProCoinSummary } from './HedgeProCoinSummary';
import { HedgeProBreakdownChart } from './HedgeProBreakdownChart';
import { HedgeProPositionsTable } from './HedgeProPositionsTable';
import { HedgeExposureBar } from './HedgeExposureBar';

/**
 * Hedge Pro — dashboard de acompanhamento de posições em hedge (contratos
 * inversos / Coin-M). Pura derivação: lê as stores já sincronizadas e calcula
 * protegido/exposto/alavancado em memória (sem novas chamadas de API).
 */
export function HedgeProDashboard() {
  const balances = useBalancesStore(state => state.balances);
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const formatCurrency = useFormatCurrency();

  const [search, setSearch] = useState('');
  const [exchange, setExchange] = useState('All');
  const [side, setSide] = useState('All');

  const balancesList = useMemo(() => Object.values(balances), [balances]);
  const positionsList = useMemo(() => Object.values(positions), [positions]);

  const activeBalances = useMemo(() => {
    return useMockData
      ? balancesList.filter(b => b.connectionId.startsWith('mocked-data'))
      : balancesList.filter(b => !b.connectionId.startsWith('mocked-data'));
  }, [balancesList, useMockData]);

  const activePositions = useMemo(() => {
    return useMockData
      ? positionsList.filter(p => p.connectionId.startsWith('mocked-data'))
      : positionsList.filter(p => !p.connectionId.startsWith('mocked-data'));
  }, [positionsList, useMockData]);

  // Same totalEquity source as the main dashboard (Σ balance usdValue).
  const totalEquity = useMemo(() => {
    return Number(activeBalances.reduce((acc, b) => acc.plus(b.usdValue || 0), new Big(0)));
  }, [activeBalances]);

  const coinSummaries = useMemo(
    () => getHedgeCoinSummaries(activePositions, activeBalances),
    [activePositions, activeBalances],
  );

  const totals = useMemo(() => getHedgeTotals(coinSummaries, totalEquity), [coinSummaries, totalEquity]);

  // ── Filters ──
  const exchanges = useMemo(() => Array.from(new Set(coinSummaries.map(c => c.exchange))), [coinSummaries]);

  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coinSummaries.filter(c => {
      if (exchange !== 'All' && c.exchange !== exchange) return false;
      if (side !== 'All') {
        if (side === 'long' && c.longCount === 0) return false;
        if (side === 'short' && c.shortCount === 0) return false;
      }
      if (
        q &&
        !c.baseCoin.toLowerCase().includes(q) &&
        !c.accountLabel.toLowerCase().includes(q) &&
        !c.exchange.toLowerCase().includes(q)
      ) return false;
      return true;
    });
  }, [coinSummaries, exchange, side, search]);

  const filteredLevels = useMemo(() => {
    return filteredSummaries.flatMap(c => c.positions);
  }, [filteredSummaries]);

  const filteredTotals = useMemo(() => getHedgeTotals(filteredSummaries, totalEquity), [filteredSummaries, totalEquity]);

  // Portfolio summary bar (beyond-100% model): the hedge protects the WHOLE capital,
  // so the 100% reference is Total Equity (Σ balance usdValue) — not just the hedged
  // coin balances. Protected + Exposed = 100% of equity; Leveraged (longs) extends
  // beyond. Percentages are of the equity reference.
  const summaryCapital = totals.totalEquity > 0 ? totals.totalEquity : totals.totalProtected;
  const summaryExposed = Math.max(0, summaryCapital - totals.totalProtected);
  const summaryBarTotal = summaryCapital + totals.totalLeveraged;
  const summaryBalanceWidthPct = summaryBarTotal > 0 ? (summaryCapital / summaryBarTotal) * 100 : 0;
  const summaryLeveragedWidthPct = summaryBarTotal > 0 ? (totals.totalLeveraged / summaryBarTotal) * 100 : 0;
  const summaryProtectedPct = summaryCapital > 0 ? (totals.totalProtected / summaryCapital) * 100 : 0;
  const summaryExposedPct = summaryCapital > 0 ? (summaryExposed / summaryCapital) * 100 : 0;
  const summaryLeveragedPct =
    summaryCapital > 0 ? (totals.totalLeveraged / summaryCapital) * 100 : totals.totalLeveraged > 0 ? 100 : 0;

  // Note: the 'All Sides' option is rendered automatically by FilterBar
  // (labelAll) — passing an 'All' entry here would duplicate it in the menu.
  const sideOptions = [
    { value: 'long', label: 'Longs' },
    { value: 'short', label: 'Shorts' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Hedge Pro
          </h2>
          <p className="text-xs text-[#8E9299] mt-0.5">
            Capital protection in inverse (Coin-M) contracts: shorts lock USD at entry; longs and uncovered balance stay exposed.
          </p>
        </div>
      </div>

      {/* KPIs (unfiltered portfolio totals) */}
      <HedgeProKpis totals={totals} formatCurrency={formatCurrency} />

      {/* Protected vs Exposed vs Leveraged summary bar (portfolio) */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Protected
          </span>
          <span className="text-xs font-medium text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-white" /> Exposed
          </span>
          <span className="text-xs font-medium text-[#8E9299] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400/80 inline-block" /> Leveraged
          </span>
        </div>
        <div className="flex justify-between text-[15px] font-semibold font-mono">
          <span className="text-emerald-500/90">{formatCurrency(totals.totalProtected, 'usd', 2)}</span>
          <span className="text-white font-semibold">{formatCurrency(summaryExposed, 'usd', 2)}</span>
          <span className="text-amber-400 font-semibold">{formatCurrency(totals.totalLeveraged, 'usd', 2)}</span>
        </div>
        <HedgeExposureBar
          protectedPct={summaryProtectedPct}
          exposedPct={summaryExposedPct}
          balanceWidthPct={summaryBalanceWidthPct}
          leveragedWidthPct={summaryLeveragedWidthPct}
        />
        <div className="flex justify-between text-[15px] font-semibold font-mono">
          <span className="text-emerald-500/90">P {summaryProtectedPct.toFixed(2)}%</span>
          <span className="text-white font-semibold">E {summaryExposedPct.toFixed(2)}%</span>
          {summaryLeveragedPct > 0 && (
            <span className="text-amber-400 font-semibold">L +{summaryLeveragedPct.toFixed(2)}%</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search coin / account...' }}
        exchange={{ value: exchange, onChange: setExchange, options: exchanges }}
        side={{ value: side, onChange: setSide, options: sideOptions, labelAll: 'All Sides' }}
      />

      {/* Protected vs Exposed breakdown per coin (chart) */}
      <HedgeProBreakdownChart summaries={filteredSummaries} formatCurrency={formatCurrency} />

      {/* Per-coin summaries */}
      <HedgeProCoinSummary summaries={filteredSummaries} formatCurrency={formatCurrency} />

      {/* Per-position levels table */}
      <HedgeProPositionsTable levels={filteredLevels} formatCurrency={formatCurrency} />

      {/* Filtered totals footnote */}
      {filteredSummaries.length !== coinSummaries.length && (
        <div className="text-[11px] text-[#8E9299] -mt-2">
          Filtered totals: Protected {formatCurrency(filteredTotals.totalProtected, 'usd', 2)} · Exposed{' '}
          {formatCurrency(filteredTotals.totalExposed, 'usd', 2)} · Leveraged{' '}
          {formatCurrency(filteredTotals.totalLeveraged, 'usd', 2)}
        </div>
      )}
    </div>
  );
}

export default HedgeProDashboard;
