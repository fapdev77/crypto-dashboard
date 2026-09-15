import React from 'react';
import { ShieldCheck, Landmark, TrendingUp, Percent, Wallet, Layers } from 'lucide-react';
import { KpiMetricCard } from '../FundingFees/KpiMetricCard';
import { HedgeTotals } from '../../../utils/hedgeUtils';
import { AppTooltip } from '../../ui/Tooltip';

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
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiMetricCard
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        label="Total Protected"
        value={formatCurrency(totals.totalProtected, 'usd', 2)}
        tooltip="USD locked at the entry price by inverse shorts (Coin-M). This value does NOT float with the asset — it is the capital protection leg."
        color="green"
      />
      <KpiMetricCard
        icon={<Landmark className="w-4 h-4 text-white" />}
        label="Total Equity (USD)"
        value={formatCurrency(totals.totalEquity, 'usd', 2)}
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              <span className="text-white font-semibold">Total portfolio capital</span> — the entire equity the
              hedge protects. The hedge covers the whole account, not just the coins holding inverse positions.
            </p>
            <p className="text-[11px] text-[#8E9299]">
              Total Equity = Σ USD value of <em>every</em> balance (all exchanges, all coins, cash and stablecoins
              included) — the same source as the &apos;Total Equity (USD)&apos; card on the main Dashboard, so the
              two reconcile.
            </p>
            <p className="text-[11px] text-[#8E9299]">
              This is the reference for Protected of Equity (Protected ÷ Equity) and Real Hedge Coverage
              ((Protected − Leveraged) ÷ Equity).
            </p>
          </div>
        }
        color="white"
      />
      <KpiMetricCard
        icon={<TrendingUp className="w-4 h-4 text-amber-400" />}
        label="Total Leveraged"
        value={formatCurrency(totals.totalLeveraged, 'usd', 2)}
        tooltip="Sum of the notional (position value) of inverse LONGS. Longs in inverse contracts are leveraged exposure — they do not protect capital, they increase risk."
        color="amber"
      />
      <KpiMetricCard
        icon={<Percent className="w-4 h-4 text-emerald-400" />}
        label="Real Hedge Coverage"
        value={
          <span className={totals.coveragePct < 0 ? 'text-[#FF4444]' : undefined}>
            {totals.coveragePct.toFixed(2)}%
          </span>
        }
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              <span className="text-white font-semibold">Net protection of the portfolio</span> — protected capital
              minus leveraged exposure, relative to total equity. Only the protected leg counts: leveraged longs are
              NOT protected, they only add risk.
            </p>
            <p className="text-[11px] text-[#8E9299]">
              Formula: (Total Protected − Total Leveraged) ÷ Total Equity × 100. The leveraged leg is subtracted
              because it is exposure without protection.
            </p>
            <p className="text-[11px] text-[#8E9299]">
              This can be <span className="text-[#FF4444] font-semibold">negative</span>: if you hold leveraged
              longs with no shorts protecting anything, nothing is shielded while leverage is still running —
              negative coverage means MORE risk, not less. Equal to Protected of Equity only when there are no
              leveraged longs.
            </p>
          </div>
        }
        color="green"
      />
      <KpiMetricCard
        icon={<Wallet className="w-4 h-4 text-white" />}
        label="Protected of Equity"
        value={`${totals.protectedOfEquityPct.toFixed(2)}%`}
        tooltip={
          <div className="flex flex-col gap-2">
            <p>
              Share of the <span className="text-white font-semibold">entire portfolio equity</span> protected by
              inverse shorts — how much of the whole account&apos;s capital is shielded from asset variation.
            </p>
            <p className="text-[11px] text-[#8E9299]">
              Formula: Total Protected ÷ Total Equity × 100. Same denominator as the &apos;Hedge Mode (Inverse)&apos;
              indicator on the main Dashboard, so the two reconcile.
            </p>
            <p className="text-[11px] text-[#8E9299]">
              Difference vs Real Hedge Coverage: this card divides only by Total Equity; Real Hedge Coverage also
              subtracts the leveraged longs from the protected side, so it is always ≤ this card (and can go
              negative when leveraged exceeds protected). The leftover % here is the share of the whole account
              still exposed.
            </p>
          </div>
        }
        color="white"
      />
      <KpiMetricCard
        icon={<Layers className="w-4 h-4 text-white" />}
        label="Active Positions"
        value={
          <span className="font-mono">
            <span className="text-[#00C853]">{totals.inverseLongCount}L</span>
            <span className="text-[#8E9299]"> / </span>
            <span className="text-[#FF4444]">{totals.inverseShortCount}S</span>
          </span>
        }
        tooltip={`Inverse (Coin-M) positions open — Longs: ${totals.inverseLongCount} | Shorts: ${totals.inverseShortCount} | Total: ${totals.inversePositionCount}`}
        color="white"
      />
    </div>
  );
}

export default HedgeProKpis;
