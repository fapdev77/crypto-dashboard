import React from 'react';

interface HedgeExposureBarProps {
  /** Protected segment as % of the capital reference (emerald). */
  protectedPct: number;
  /** Exposed (uncovered balance) segment as % of the capital reference (white). */
  exposedPct: number;
  /** Width of the balance track as % of the bar (100 = balance fills the whole bar). */
  balanceWidthPct: number;
  /** Width of the leveraged extension as % of the bar (drawn beyond the balance track). */
  leveragedWidthPct: number;
}

/**
 * Unified "beyond 100%" exposure bar used across Hedge Pro.
 *
 * The balance track (Protected emerald + Exposed white) represents exactly 100% of
 * the capital reference; a thin marker shows where 100% ends; Leveraged (amber,
 * inverse longs) extends BEYOND the marker. The caller scales `balanceWidthPct` +
 * `leveragedWidthPct` so the whole bar (balance + leveraged) fills the available
 * width without overflowing.
 */
export function HedgeExposureBar({ protectedPct, exposedPct, balanceWidthPct, leveragedWidthPct }: HedgeExposureBarProps) {
  return (
    <div className="relative h-1.5 rounded-full w-full bg-[#2a2b30]">
      {/* Balance track — exactly 100% of the capital */}
      <div
        className="absolute inset-y-0 left-0 flex overflow-hidden rounded-full transition-all duration-300"
        style={{ width: `${balanceWidthPct}%` }}
      >
        <div className="bg-emerald-500/80 h-full transition-all duration-300" style={{ width: `${protectedPct}%` }} />
        <div className="bg-white h-full transition-all duration-300" style={{ width: `${exposedPct}%` }} />
      </div>
      {/* Leveraged — beyond 100% of the capital */}
      {leveragedWidthPct > 0 && (
        <div
          className="absolute inset-y-0 bg-amber-400/90 rounded-r-full transition-all duration-300"
          style={{ left: `${balanceWidthPct}%`, width: `${leveragedWidthPct}%` }}
        />
      )}
      {/* 100% of capital marker (rendered on top, so it stays visible at the leveraged boundary) */}
      <div className="absolute inset-y-0 w-px bg-[#8E9299]/80" style={{ left: `${balanceWidthPct}%` }} />
    </div>
  );
}

export default HedgeExposureBar;
