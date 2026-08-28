import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { useHedgeData } from '../../../hooks/useHedgeData';
import { useFormatCurrency } from '../../../hooks/useFormatCurrency';
import { FilterBar } from '../../ui/FilterBar';
import { SimulationModeBadge } from '../../ui/SimulationModeBadge';
import { HedgeProKpis } from './HedgeProKpis';
import { HedgeProCoinRows } from './HedgeProCoinRows';
import { HedgeProBreakdownChart } from './HedgeProBreakdownChart';
import { HedgeExposureBar } from './HedgeExposureBar';

/**
 * Hedge Pro — dashboard de acompanhamento de posições em hedge (contratos
 * inversos / Coin-M). Pura derivação desacoplada via hook useHedgeData.
 */
export function HedgeProDashboard() {
  const {
    search,
    setSearch,
    exchange,
    setExchange,
    side,
    setSide,
    exchanges,
    coinSummaries,
    totals,
    filteredSummaries,
    filteredTotals,
    sideOptions,
  } = useHedgeData();

  const formatCurrency = useFormatCurrency();

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Hedge Pro
            </h2>
            <SimulationModeBadge />
          </div>
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
          <span className="text-white font-semibold">{formatCurrency(totals.summaryExposed, 'usd', 2)}</span>
          <span className="text-amber-400 font-semibold">{formatCurrency(totals.totalLeveraged, 'usd', 2)}</span>
        </div>
        <HedgeExposureBar
          protectedPct={totals.protectedPct}
          exposedPct={totals.exposedPct}
          balanceWidthPct={totals.balanceWidthPct}
          leveragedWidthPct={totals.leveragedWidthPct}
        />
        <div className="flex justify-between text-[15px] font-semibold font-mono">
          <span className="text-emerald-500/90">P {totals.protectedPct.toFixed(2)}%</span>
          <span className="text-white font-semibold">E {totals.exposedPct.toFixed(2)}%</span>
          {totals.leveragedPct > 0 && (
            <span className="text-amber-400 font-semibold">L +{totals.leveragedPct.toFixed(2)}%</span>
          )}
        </div>
      </div>

      {/* Filters with Exchange Selection */}
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search coin / account...' }}
        exchange={{ value: exchange, onChange: setExchange, options: exchanges }}
        side={{ value: side, onChange: setSide, options: sideOptions, labelAll: 'All Sides' }}
      />

      {/* Grouped Coin Hedge Section: Breakdown Chart + Per-Coin Hedge Rows */}
      <div
        id="hedge-coins-group"
        className="bg-[#121316]/60 border border-[#26282d] rounded-2xl p-3 sm:p-4 flex flex-col gap-4"
      >
        {/* Protected vs Exposed breakdown per coin (chart) */}
        <HedgeProBreakdownChart summaries={filteredSummaries} formatCurrency={formatCurrency} />

        {/* Per-coin summaries (Row View modeled after Open Orders) */}
        <HedgeProCoinRows summaries={filteredSummaries} formatCurrency={formatCurrency} />
      </div>

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
