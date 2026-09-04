import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import { HedgeCoinSummary, getHedgeCoinChartRows, getExchangeDisplayName } from '../../../utils/hedgeUtils';
import { CoinIcon } from '../../ui/CoinIcon';
import { AppTooltip } from '../../ui/Tooltip';

interface HedgeProBreakdownChartProps {
  summaries: HedgeCoinSummary[];
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
}

/**
 * Per-coin hedge breakdown as horizontal bars.
 * ONE row per coin — the aggregate of every account holding that coin in hedge.
 *
 * Model: the Protected (emerald) + Exposed (white) segment is exactly 100% of the
 * coin's balance (percentages are of the coin's balance, so they always sum to
 * 100%). Leveraged (amber, inverse longs) is an EXTRA percentage on top and is
 * drawn beyond the per-coin 100% marker line. The whole bar (balance + leveraged)
 * is scaled against the largest stack, so coins of different sizes still compare
 * and nothing overflows the card.
 */
export function HedgeProBreakdownChart({ summaries, formatCurrency }: HedgeProBreakdownChartProps) {
  const rows = getHedgeCoinChartRows(summaries);
  if (rows.length === 0) return null;

  const maxStack = Math.max(...rows.map(r => r.balanceUsd + r.leveragedUsd), 1);

  const pctOfBalance = (value: number, balance: number) => (balance > 0 ? (value / balance) * 100 : 0);

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Protected vs Exposed vs Leveraged by Coin
        </h3>
        <div className="flex items-center gap-4 text-[10px] text-[#8E9299] uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/80 inline-block" /> Protected
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-white" /> Exposed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-400/80 inline-block" /> Leveraged
          </span>
        </div>
      </div>

      <p className="text-[10px] text-[#8E9299] -mt-1.5">
        Protected + Exposed = 100% of the coin&apos;s balance (marker). Leveraged (inverse longs) extends beyond 100%.
      </p>

      <div className="flex flex-col gap-2.5">
        {rows.map(row => {
        const baseRef = (row.protectedUsd + row.exposedBaseUsd > 0)
          ? (row.protectedUsd + row.exposedBaseUsd)
          : row.balanceUsd;
        const balancePct = pctOfBalance(baseRef, maxStack);
        const leveragedPct = pctOfBalance(row.leveragedUsd, maxStack);
        const protectedPct = pctOfBalance(row.protectedUsd, baseRef);
        const exposedPct = pctOfBalance(row.exposedBaseUsd, baseRef);
        const leveragedOfBalancePct =
          baseRef > 0
            ? pctOfBalance(row.leveragedUsd, baseRef)
            : row.leveragedUsd > 0
              ? 100
              : 0;

          const tooltipRows = [
            {
              label: 'Protected',
              value: `${formatCurrency(row.protectedUsd, 'usd', 2)} · ${protectedPct.toFixed(1)}%`,
              valueClassName: 'text-emerald-400',
            },
            {
              label: 'Exposed',
              value: `${formatCurrency(row.exposedBaseUsd, 'usd', 2)} · ${exposedPct.toFixed(1)}%`,
              valueClassName: 'text-white',
            },
            {
              label: 'Leveraged (longs)',
              value: `${formatCurrency(row.leveragedUsd, 'usd', 2)} · +${leveragedOfBalancePct.toFixed(1)}%`,
              valueClassName: 'text-amber-400',
            },
            ...row.accounts.map(acc => ({
              label: `${getExchangeDisplayName(acc.exchange)} · ${acc.accountLabel}`,
              value: `${formatCurrency(acc.protectedUsd, 'usd', 0)} / ${formatCurrency(acc.exposedBaseUsd, 'usd', 0)} / ${formatCurrency(acc.leveragedUsd, 'usd', 0)}`,
              labelClassName: 'text-[11px] text-[#8E9299]',
              valueClassName: 'text-[11px] text-[#8E9299]',
            })),
          ];

          return (
            <div key={row.baseCoin} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* Coin label */}
              <div className="flex items-center justify-end gap-1.5 w-24 shrink-0">
                <CoinIcon symbol={row.baseCoin} className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold text-white whitespace-nowrap">{row.baseCoin}</span>
              </div>

              {/* Bar — Protected + Exposed = 100% of the coin's balance; Leveraged extends beyond the marker */}
              <AppTooltip
                description="Protected + Exposed = 100% of this coin's balance. Leveraged (inverse longs) extends beyond 100%."
                rows={tooltipRows}
                side="top"
                align="start"
              >
                <div className="relative flex-1 h-6 min-w-[80px] cursor-help">
                  {/* Balance track (100% of this coin's capital), scaled against the largest stack */}
                  <div
                    className="absolute inset-y-0 left-0 flex overflow-hidden rounded"
                    style={{ width: `${balancePct}%` }}
                  >
                    <div className="bg-emerald-500/80 h-full" style={{ width: `${protectedPct}%` }} />
                    <div className="bg-white h-full" style={{ width: `${exposedPct}%` }} />
                  </div>
                  {/* Leveraged — beyond 100% of the coin's balance */}
                  {leveragedPct > 0 && (
                    <div
                      className="absolute inset-y-0 bg-amber-400/90 rounded-r"
                      style={{ left: `${balancePct}%`, width: `${leveragedPct}%` }}
                    />
                  )}
                  {/* 100% of balance marker (on top, so it stays visible at the leveraged boundary) */}
                  <div className="absolute inset-y-0 w-px bg-[#8E9299]/80" style={{ left: `${balancePct}%` }} />
                </div>
              </AppTooltip>

              {/* % labels (of the coin's balance) — full-width line below the bar on
                  mobile; inline right-aligned column from sm up */}
              <div className="w-full sm:w-32 sm:shrink-0 text-[10px] font-mono text-left sm:text-right whitespace-nowrap">
                <span className="text-emerald-400">P {protectedPct.toFixed(0)}%</span>{' '}
                <span className="text-white">E {exposedPct.toFixed(0)}%</span>{' '}
                {leveragedOfBalancePct > 0 && (
                  <span className="text-amber-400">L +{leveragedOfBalancePct.toFixed(0)}%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HedgeProBreakdownChart;
