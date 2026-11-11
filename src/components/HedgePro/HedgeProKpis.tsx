import React from 'react';
import { ShieldCheck, Landmark, TrendingUp, Percent, Wallet, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KpiMetricCard } from '../analytics/FundingFees/KpiMetricCard';
import { HedgeTotals } from '../../utils/hedgeUtils';
import { useSettingsStore } from '../../store/settingsStore';

interface HedgeProKpisProps {
  totals: HedgeTotals;
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
}

/**
 * KPI row for the Hedge Pro dashboard. Every USD value goes through
 * `formatCurrency` so Privacy Mode masking is automatic.
 *
 * The hedge protects the WHOLE capital (total equity), so:
 *  - Total Equity (USD) is the reference the user hedges against.
 *  - Protected of Equity = Total Protected ÷ Total Equity.
 *  - Real Hedge Coverage = (Total Protected − Total Leveraged) ÷ Total Equity —
 *    net protection: only the protected leg counts; the leveraged leg is NOT protected
 *    (it only adds risk), so it subtracts from the protected side. Negative when
 *    leveraged exceeds protected (risk with no hedge to offset it).
 */
export function HedgeProKpis({ totals, formatCurrency }: HedgeProKpisProps) {
  const { t } = useTranslation();
  const fiatCurrency = useSettingsStore(state => state.fiatCurrency) || 'USD';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiMetricCard
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        label={t('hedgePro.kpis.totalProtected')}
        value={formatCurrency(totals.totalProtected, 'usd', 2)}
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              {t('hedgePro.kpis.totalProtectedTooltip.title')}
            </p>
            <div className="text-xs space-y-1 py-1.5 px-2.5 bg-elevated rounded border border-line font-mono">
              <div className="text-emerald-400">
                {t('hedgePro.kpis.totalProtectedTooltip.hedge')} {formatCurrency(totals.syntheticHedgeUsd, 'usd', 2)} ({totals.hedgeOfProtectedPct.toFixed(2)}%)
              </div>
              <div className="text-blue-400">
                {t('hedgePro.kpis.totalProtectedTooltip.stablecoins')} {formatCurrency(totals.stablecoinsProtectedUsd, 'usd', 2)} ({totals.stablesOfProtectedPct.toFixed(2)}%)
              </div>
            </div>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.totalProtectedTooltip.hedgeDesc')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.totalProtectedTooltip.stablecoinsDesc')}
            </p>
          </div>
        }
        color="green"
      />
      <KpiMetricCard
        icon={<Landmark className="w-4 h-4 text-fg" />}
        label={t('hedgePro.kpis.totalEquity', { currency: fiatCurrency })}
        value={formatCurrency(totals.totalEquity, 'usd', 2)}
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              {t('hedgePro.kpis.totalEquityTooltip.title')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.totalEquityTooltip.formula')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.totalEquityTooltip.reference')}
            </p>
          </div>
        }
        color="white"
      />
      <KpiMetricCard
        icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
        label={t('hedgePro.kpis.totalLeveraged')}
        value={formatCurrency(totals.totalLeveraged, 'usd', 2)}
        tooltip={t('hedgePro.kpis.totalLeveragedTooltip')}
        color="amber"
      />
      <KpiMetricCard
        icon={<Percent className="w-4 h-4 text-emerald-400" />}
        label={t('hedgePro.kpis.realHedgeCoverage')}
        value={
          <span className={totals.coveragePct < 0 ? 'text-danger' : undefined}>
            {totals.coveragePct.toFixed(2)}%
          </span>
        }
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              {t('hedgePro.kpis.realHedgeCoverageTooltip.title')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.realHedgeCoverageTooltip.formula')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.realHedgeCoverageTooltip.negativeNote')}
            </p>
          </div>
        }
        color="green"
      />
      <KpiMetricCard
        icon={<Wallet className="w-4 h-4 text-fg" />}
        label={t('hedgePro.kpis.protectedOfEquity')}
        value={`${totals.protectedOfEquityPct.toFixed(2)}%`}
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              {t('hedgePro.kpis.protectedOfEquityTooltip.title')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.protectedOfEquityTooltip.formula')}
            </p>
            <p className="text-[11px] text-fg-muted">
              {t('hedgePro.kpis.protectedOfEquityTooltip.difference')}
            </p>
          </div>
        }
        color="white"
      />
      <KpiMetricCard
        icon={<Layers className="w-4 h-4 text-fg" />}
        label={t('hedgePro.kpis.activePositions')}
        value={
          <span className="font-mono">
            <span className="text-success">{totals.inverseLongCount}L</span>
            <span className="text-fg-muted"> / </span>
            <span className="text-danger">{totals.inverseShortCount}S</span>
          </span>
        }
        tooltip={t('hedgePro.kpis.activePositionsTooltip', {
          longs: totals.inverseLongCount,
          shorts: totals.inverseShortCount,
          total: totals.inversePositionCount,
        })}
        color="white"
      />
    </div>
  );
}

export default HedgeProKpis;

