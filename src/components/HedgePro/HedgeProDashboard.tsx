import React, { useState } from 'react';
import { ShieldCheck, Activity, Layers, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHedgeData } from '../../hooks/useHedgeData';
import { useFormatCurrency } from '../../hooks/useFormatCurrency';
import { FilterBar } from '../ui/FilterBar';
import { SimulationModeBadge } from '../ui/SimulationModeBadge';
import { AppTooltip } from '../ui/Tooltip';
import { HedgeProKpis } from './HedgeProKpis';
import { HedgeProCoinRows } from './HedgeProCoinRows';
import { HedgeProBreakdownChart } from './HedgeProBreakdownChart';
import { HedgeExposureBar } from './HedgeExposureBar';
import { HedgeProCapitalExposureChart } from './HedgeProCapitalExposureChart';

export type HedgePnlConceptMode = 'standard' | 'hedge';

/**
 * Hedge Pro — dashboard de acompanhamento de posições em hedge (contratos
 * inversos / Coin-M). Pura derivação desacoplada via hook useHedgeData.
 */
export function HedgeProDashboard() {
  const { t } = useTranslation();
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

  // Toggle for PnL Concept Mode ('standard' = Classic PnL vs 'hedge' = Opportunity Cost / Accumulated Asset)
  const [pnlConceptMode, setPnlConceptMode] = useState<HedgePnlConceptMode>(() => {
    try {
      const saved = localStorage.getItem('hedge_pro_pnl_mode');
      return saved === 'standard' ? 'standard' : 'hedge';
    } catch {
      return 'hedge';
    }
  });

  const handleTogglePnlConcept = (mode: HedgePnlConceptMode) => {
    setPnlConceptMode(mode);
    try {
      localStorage.setItem('hedge_pro_pnl_mode', mode);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Hedge Pro
            </h2>
            <SimulationModeBadge />
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            {t('hedgePro.dashboard.subtitle')}
          </p>
        </div>

        {/* PnL Concept Mode Toggle */}
        <div className="flex items-center bg-surface border border-line p-0.5 rounded-lg text-xs">
          <AppTooltip
            description={t('hedgePro.dashboard.classicPnlTooltip')}
            side="bottom"
          >
            <button
              onClick={() => handleTogglePnlConcept('standard')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${pnlConceptMode === 'standard'
                  ? 'bg-line text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
                }`}
            >
              <Layers className="w-3 h-3" />
              <span>{t('hedgePro.dashboard.classicPnl')}</span>
            </button>
          </AppTooltip>

          <AppTooltip
            description={t('hedgePro.dashboard.hedgeConceptTooltip')}
            side="bottom"
          >
            <button
              onClick={() => handleTogglePnlConcept('hedge')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 ${pnlConceptMode === 'hedge'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-fg-muted hover:text-fg'
                }`}
            >
              <Scale className="w-3 h-3" />
              <span>{t('hedgePro.dashboard.hedgeConcept')}</span>
            </button>
          </AppTooltip>
        </div>
      </div>

      {/* KPIs (unfiltered portfolio totals) */}
      <HedgeProKpis totals={totals} formatCurrency={formatCurrency} />

      {/* Protected vs Exposed vs Leveraged summary bar (portfolio) */}
      <div className="bg-surface border border-line rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {t('hedgePro.dashboard.protected')}
          </span>
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-fg" /> {t('hedgePro.dashboard.exposed')}
          </span>
          <span className="text-xs font-medium text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400/80 inline-block" /> {t('hedgePro.dashboard.leveraged')}
          </span>
        </div>
        <div className="flex justify-between text-[15px] font-semibold font-mono">
          <span className="text-emerald-500/90">{formatCurrency(totals.totalProtected, 'usd', 2)}</span>
          <span className="text-fg font-semibold">{formatCurrency(totals.summaryExposed, 'usd', 2)}</span>
          <span className="text-amber-400 font-semibold">{formatCurrency(totals.totalLeveraged, 'usd', 2)}</span>
        </div>
        <HedgeExposureBar
          protectedPct={totals.protectedPct}
          exposedPct={totals.exposedPct}
          balanceWidthPct={totals.balanceWidthPct}
          leveragedWidthPct={totals.leveragedWidthPct}
          tooltip={
            <div className="text-xs space-y-1.5 p-1 min-w-[230px]">
              <div className="font-semibold text-fg border-b border-line pb-1">
                {t('hedgePro.dashboard.capitalExposureTooltip.title')}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex justify-between items-center gap-4 text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    {t('hedgePro.dashboard.capitalExposureTooltip.hedgeShorts')}
                  </span>
                  <span>{formatCurrency(totals.syntheticHedgeUsd, 'usd', 2)} ({totals.hedgeOfEquityPct.toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between items-center gap-4 text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    {t('hedgePro.dashboard.capitalExposureTooltip.stablecoins')}
                  </span>
                  <span>{formatCurrency(totals.stablecoinsProtectedUsd, 'usd', 2)} ({totals.stablesOfEquityPct.toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between items-center gap-4 text-emerald-300 font-semibold border-t border-line/60 pt-0.5">
                  <span>{t('hedgePro.dashboard.capitalExposureTooltip.totalProtected')}</span>
                  <span>{formatCurrency(totals.totalProtected, 'usd', 2)} ({totals.protectedPct.toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between items-center gap-4 text-fg border-t border-line/60 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white inline-block" />
                    {t('hedgePro.dashboard.capitalExposureTooltip.exposed')}
                  </span>
                  <span>{formatCurrency(totals.summaryExposed, 'usd', 2)} ({totals.exposedPct.toFixed(2)}%)</span>
                </div>
                {totals.totalLeveraged > 0 && (
                  <div className="flex justify-between items-center gap-4 text-amber-400 border-t border-line/60 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      {t('hedgePro.dashboard.capitalExposureTooltip.leveragedLongs')}
                    </span>
                    <span>{formatCurrency(totals.totalLeveraged, 'usd', 2)} (+{totals.leveragedPct.toFixed(2)}%)</span>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <div className="flex justify-between text-[15px] font-semibold font-mono">
          <span className="text-emerald-500/90">P {totals.protectedPct.toFixed(2)}%</span>
          <span className="text-fg font-semibold">E {totals.exposedPct.toFixed(2)}%</span>
          {totals.leveragedPct > 0 && (
            <span className="text-amber-400 font-semibold">L +{totals.leveragedPct.toFixed(2)}%</span>
          )}
        </div>
      </div>

      {/* Capital Exposure Breakdown Card (Recharts) */}
      <HedgeProCapitalExposureChart totals={totals} formatCurrency={formatCurrency} />

      {/* Filters with Exchange Selection */}
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: t('hedgePro.dashboard.searchPlaceholder') }}
        exchange={{ value: exchange, onChange: setExchange, options: exchanges }}
        side={{ value: side, onChange: setSide, options: sideOptions, labelAll: t('hedgePro.dashboard.allSides') }}
      />

      {/* Grouped Coin Hedge Section: Breakdown Chart + Per-Coin Hedge Rows */}
      <div
        id="hedge-coins-group"
        className="bg-canvas/60 border border-line rounded-2xl p-3 sm:p-4 flex flex-col gap-4"
      >
        {/* Protected vs Exposed breakdown per coin (chart) */}
        <HedgeProBreakdownChart summaries={filteredSummaries} formatCurrency={formatCurrency} />

        {/* Per-coin summaries (Row View modeled after Open Orders) */}
        <HedgeProCoinRows
          summaries={filteredSummaries}
          formatCurrency={formatCurrency}
          pnlConceptMode={pnlConceptMode}
        />
      </div>

      {/* Filtered totals footnote */}
      {filteredSummaries.length !== coinSummaries.length && (
        <div className="text-[11px] text-fg-muted -mt-2">
          {t('hedgePro.dashboard.filteredTotals', {
            protected: formatCurrency(filteredTotals.totalProtected, 'usd', 2),
            exposed: formatCurrency(filteredTotals.totalExposed, 'usd', 2),
            leveraged: formatCurrency(filteredTotals.totalLeveraged, 'usd', 2),
          })}
        </div>
      )}
    </div>
  );
}

export default HedgeProDashboard;
