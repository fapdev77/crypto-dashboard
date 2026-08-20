import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { HedgeCoinSummary, getExchangeDisplayName } from '../../../utils/hedgeUtils';
import { CoinIcon } from '../../ui/CoinIcon';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { AccountTypeBadge } from '../../ui/AccountTypeBadge';
import { AppTooltip } from '../../ui/Tooltip';
import { HedgePositionLevelRow } from './HedgeProPositionsTable';
import { HedgeExposureBar } from './HedgeExposureBar';

interface HedgeProCoinSummaryProps {
  summaries: HedgeCoinSummary[];
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
}

/**
 * Per-coin hedge summary cards. Each card shows balance / protected / exposed /
 * leveraged and a coverage bar, and expands to reveal that coin's position levels.
 */
export function HedgeProCoinSummary({ summaries, formatCurrency }: HedgeProCoinSummaryProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (summaries.length === 0) {
    return (
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 text-center">
        <p className="text-sm text-[#8E9299]">No coins with inverse positions.</p>
      </div>
    );
  }

  const toggle = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {summaries.map(coin => {
        const isOpen = !!expanded[coin.key];

        // Beyond-100% bar: Protected + Exposed = 100% of the coin's capital reference
        // (its balance); Leveraged (longs) extends beyond. Percentages are of the
        // capital reference; the track is scaled so balance + leveraged fills the card.
        const exposedBaseUsd = Math.max(0, coin.balanceUsd - coin.protectedUsd);
        const capitalRef = coin.balanceUsd > 0 ? coin.balanceUsd : coin.protectedUsd + exposedBaseUsd;
        const barTotal = capitalRef + coin.leveragedUsd;
        const balanceWidthPct = barTotal > 0 ? (capitalRef / barTotal) * 100 : 0;
        const leveragedWidthPct = barTotal > 0 ? (coin.leveragedUsd / barTotal) * 100 : 0;
        const protectedPct = capitalRef > 0 ? (coin.protectedUsd / capitalRef) * 100 : 0;
        const exposedPct = capitalRef > 0 ? (exposedBaseUsd / capitalRef) * 100 : 0;
        const leveragedOfBalancePct =
          capitalRef > 0 ? (coin.leveragedUsd / capitalRef) * 100 : coin.leveragedUsd > 0 ? 100 : 0;

        return (
          <div
            key={coin.key}
            className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden hover:border-[#3a3b40] transition-colors"
          >
            {/* Header */}
            <button
              type="button"
              onClick={() => toggle(coin.key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-[#1a1b1e] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <CoinIcon symbol={coin.baseCoin} className="w-6 h-6" />
                <div className="flex flex-col">
                  <AppTooltip
                    description="USD locked at the entry price by each inverse position. Shorts lock capital at entry; longs do not lock (they expose)."
                    rows={coin.positions.map(level => ({
                      label: `${level.symbol} · ${level.side.toUpperCase()}`,
                      value: level.isShort ? formatCurrency(level.entryUsd, 'usd', 2) : '—',
                      valueClassName: level.isShort ? 'text-emerald-400' : 'text-[#8E9299]',
                    }))}
                    side="top"
                    align="start"
                  >
                    <span className="text-sm font-medium text-white leading-tight cursor-help">{coin.baseCoin}</span>
                  </AppTooltip>
                  <span className="flex items-center gap-1 text-[10px] text-[#8E9299] min-w-0 flex-wrap">
                    <ExchangeIcon exchange={coin.exchange} className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {getExchangeDisplayName(coin.exchange)} · {coin.accountLabel}
                    </span>
                    <AccountTypeBadge
                      exchange={coin.exchange}
                      accountType={coin.accountType}
                    />
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {coin.overexposedCount > 0 && (
                  <AppTooltip description={`${coin.overexposedCount} leveraged position(s)`}>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </AppTooltip>
                )}
                <span className="text-[10px]">
                  <span className="text-[#00C853]">{coin.longCount}L</span>
                  <span className="text-[#8E9299]"> / </span>
                  <span className="text-[#FF4444]">{coin.shortCount}S</span>
                </span>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-[#8E9299]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#8E9299]" />
                )}
              </div>
            </button>

            {/* Body */}
            <div className="px-4 pb-3 space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="All assets owned by the user in their futures account, without unrealized PnL (fixed wallet = deposit amount + total realized PnL). Net Balance adds the unrealized PnL."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Wallet Balance</span>
                  </AppTooltip>
                  <span className="font-mono text-white truncate">
                    {formatCurrency(coin.walletBalance, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Wallet Balance (USD)</span>
                  <span className="font-mono text-white truncate">{formatCurrency(coin.walletBalanceUsd, 'usd', 2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="Represents the approximated real value of the asset if you close all positions now!"
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Net Balance</span>
                  </AppTooltip>
                  <span className="font-mono text-white truncate">
                    {formatCurrency(coin.netBalance, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Net Balance (USD)</span>
                  <span className="font-mono text-white truncate">{formatCurrency(coin.netBalanceUsd, 'usd', 2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="Sum of the unrealized PnL of every open position on this coin (short + long), in the coin. Unrealized PnL is the current mark price against the entry price — it moves with the market and only becomes real when the position closes. The (USD) row converts it at the mark price."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Total Unrealized PnL</span>
                  </AppTooltip>
                  <span className={`font-mono truncate ${coin.unrealizedPnl > 0 ? 'text-[#00C853]' : coin.unrealizedPnl < 0 ? 'text-[#FF4444]' : 'text-white'}`}>
                    {coin.unrealizedPnl > 0 ? '+' : ''}{formatCurrency(coin.unrealizedPnl, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Total Unrealized PnL (USD)</span>
                  <span className={`font-mono truncate ${coin.unrealizedPnlUsd > 0 ? 'text-[#00C853]' : coin.unrealizedPnlUsd < 0 ? 'text-[#FF4444]' : 'text-white'}`}>
                    {coin.unrealizedPnlUsd > 0 ? '+' : ''}{formatCurrency(coin.unrealizedPnlUsd, 'usd', 2)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="The size of the short (hedge) position(s) in coin. This is the leg that locks USD as protection at the entry price — it does not float with the asset. Protected (USD) values the same leg at the entry price."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Protected Size</span>
                  </AppTooltip>
                  <span className="font-mono text-emerald-400 truncate">
                    {formatCurrency(coin.protectedSize, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Protected (USD)</span>
                  <span className="font-mono text-emerald-400 truncate">{formatCurrency(coin.protectedUsd, 'usd', 2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="The part of this coin at market risk without protection, in coin. With a short (hedge): the uncovered balance (Balance − Protected). With no short (long only): nothing is hedged, so the whole wallet plus the long position is exposed."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Exposed Size</span>
                  </AppTooltip>
                  <span className="font-mono text-white truncate">
                    {formatCurrency(coin.exposedSize, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Exposed (USD)</span>
                  <span className="font-mono text-white truncate">{formatCurrency(coin.exposedBaseUsd, 'usd', 2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="The size of the long position(s) in coin. In inverse (Coin-M) mode, longs are leveraged exposure — they are NOT protected by the hedge and add risk (shown in amber)."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Leveraged Size</span>
                  </AppTooltip>
                  <span className="font-mono text-amber-400 truncate">
                    {formatCurrency(coin.leveragedSize, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Leveraged (USD)</span>
                  <span className="font-mono text-amber-400 truncate">{formatCurrency(coin.leveragedUsd, 'usd', 2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="Total Exposed = the full amount at market risk. With a short (hedge): Exposed (short's uncovered balance) + Leveraged (long position). With no short (long only): the whole wallet plus the long is exposed, and the long is already inside the Exposed — so Total Exposed = Exposed alone (no double count)."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Total Exposed Size</span>
                  </AppTooltip>
                  <span className="font-mono text-white truncate">
                    {formatCurrency(coin.totalExposedSize, 'crypto', /USD|USDT|USDC|EUR|BRL/i.test(coin.baseCoin) ? 2 : 8)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-[#8E9299]">Total Exposed (USD)</span>
                  <span className="font-mono text-white truncate">{formatCurrency(coin.totalExposedUsd, 'usd', 2)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="Share of this coin's balance protected by the hedge: Protected ÷ Balance × 100. It shows how much of the coin's value is shielded at the entry price. Note: leveraged longs are NOT counted here — the portfolio-level 'Real Hedge Coverage' KPI subtracts them to show net protection."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">Coverage</span>
                  </AppTooltip>
                  <span className="font-mono text-emerald-400">{coin.coveragePct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between gap-2">
                  <AppTooltip
                    description="Aggregated ROI of this coin = Total Unrealized PnL ÷ Wallet Balance × 100 (Wallet Balance = fixed assets WITHOUT unrealized PnL). Mirrors the exchange's Assets screen. Positive = unrealized profit; negative = unrealized loss."
                    side="top"
                    align="start"
                  >
                    <span className="text-[#8E9299] cursor-help border-b border-dashed border-[#8E9299]/40">ROI</span>
                  </AppTooltip>
                  <span className={`font-mono truncate ${coin.roiPct > 0 ? 'text-[#00C853]' : coin.roiPct < 0 ? 'text-[#FF4444]' : 'text-white'}`}>
                    {coin.roiPct.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Protected / Exposed / Leveraged bar (beyond-100% model) */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-emerald-400">P {protectedPct.toFixed(1)}%</span>
                  <span className="text-white">E {exposedPct.toFixed(1)}%</span>
                  {leveragedOfBalancePct > 0 && (
                    <span className="text-amber-400">L +{leveragedOfBalancePct.toFixed(1)}%</span>
                  )}
                </div>
                <HedgeExposureBar
                  protectedPct={protectedPct}
                  exposedPct={exposedPct}
                  balanceWidthPct={balanceWidthPct}
                  leveragedWidthPct={leveragedWidthPct}
                />
              </div>

              {isOpen && (
                <div className="mt-1 border-t border-[#2a2b30] divide-y divide-[#2a2b30]">
                  {coin.positions.map(level => (
                    <HedgePositionLevelRow key={level.positionId} level={level} formatCurrency={formatCurrency} variant="card" />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default HedgeProCoinSummary;
