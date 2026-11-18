import React from 'react';
import { useTranslation } from 'react-i18next';
import { PriceMilestoneItem } from '../../../hooks/usePortfolioPerformance';
import {
  getDenominationDecimals,
  getPresetMilestoneStepsForAsset,
} from '../../../utils/portfolioPerformanceEngine';
import { AppTooltip } from '../../ui/Tooltip';
import { Milestone, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';

interface Props {
  milestones: PriceMilestoneItem[];
  denomination: string;
  milestoneStep: number;
  onStepChange: (step: number) => void;
  isPrivateMode: boolean;
  resolvedMilestoneAsset?: string;
  availableMilestoneAssets?: string[];
  onAssetChange?: (asset: string) => void;
}

export const PriceMilestoneSection = React.memo(function PriceMilestoneSection({
  milestones,
  denomination,
  milestoneStep,
  onStepChange,
  isPrivateMode,
  resolvedMilestoneAsset,
  availableMilestoneAssets = [],
  onAssetChange,
}: Props) {
  const { t } = useTranslation();
  const decimals = getDenominationDecimals(denomination);
  const activeAsset = (
    resolvedMilestoneAsset ||
    (denomination.toUpperCase() === 'USD' ? 'BTC' : denomination.toUpperCase())
  ).toUpperCase();

  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const formatGain = (val: number) => {
    if (isPrivateMode) return '****';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(decimals)} ${denomination}`;
  };

  const presetSteps = getPresetMilestoneStepsForAsset(activeAsset);

  return (
    <div className="space-y-4">
      {/* Header and Step Interval controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line/60">
        <div>
          <h3 className="text-base font-bold text-fg flex items-center gap-2">
            <Milestone className="w-4 h-4 text-accent" />
            {t('analytics.portfolio.milestones.title', 'Price Milestone & Range Passage Analysis')}
          </h3>
          <p className="text-xs text-fg-muted mt-0.5">
            Evaluates consolidated equity each time {activeAsset} price revisits the same valuation level
          </p>
        </div>

        {/* Reference Asset & Step configuration */}
        <div className="flex flex-wrap items-center gap-2">
          {availableMilestoneAssets.length > 0 && onAssetChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-fg-muted whitespace-nowrap">
                {t('analytics.portfolio.milestones.referenceAsset', 'Asset')}:
              </span>
              <select
                aria-label="Reference Asset"
                value={activeAsset}
                onChange={(e) => onAssetChange(e.target.value)}
                className="bg-elevated border border-line rounded-lg px-2 py-1 text-xs font-mono font-medium text-fg focus:outline-none focus:border-accent"
              >
                {availableMilestoneAssets.map((asset) => (
                  <option key={asset} value={asset}>
                    {asset}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs text-fg-muted whitespace-nowrap">
            {t('analytics.portfolio.milestones.intervalStep', 'Step Interval')}:
          </span>
          <div className="flex items-center gap-1 bg-elevated p-1 rounded-lg border border-line">
            {presetSteps.map((step) => (
              <button
                key={step}
                onClick={() => onStepChange(step)}
                className={`px-2.5 py-1 rounded text-xs font-mono tabular-nums font-medium transition-all ${
                  milestoneStep === step
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-fg-muted hover:text-fg hover:bg-line/40'
                }`}
              >
                ${step >= 1000 ? `${step / 1000}k` : step}
              </button>
            ))}
            <div className="h-4 w-px bg-line mx-0.5" />
            <div className="flex items-center gap-1 pl-1">
              <span className="text-xs text-fg-muted">$</span>
              <input
                type="number"
                aria-label="Custom step interval"
                min={0.01}
                step="any"
                value={milestoneStep}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) onStepChange(val);
                }}
                className="w-16 bg-surface border border-line rounded px-1.5 py-0.5 text-xs font-mono tabular-nums text-fg focus:outline-none focus:border-accent"
                placeholder="Custom"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-6 shadow-sm">
        {milestones.length === 0 ? (
          <div className="py-12 text-center text-sm text-fg-muted">
            No price milestones recorded for {activeAsset} in this timeframe. Try adjusting the step interval, reference asset, or date filter.
          </div>
        ) : (
          <>
            {/* Horizontal Bar Chart showing Gain/Loss across Milestones */}
            <div className="bg-elevated/50 border border-line/60 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-muted mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-accent" />
                Accumulated Volatility Gain / Loss per {activeAsset} Price Level
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={milestones}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <XAxis
                      type="number"
                      stroke="#8E9299"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2b30' }}
                      tickFormatter={(val) => (isPrivateMode ? '****' : String(val))}
                    />
                    <YAxis
                      dataKey="formattedMilestone"
                      type="category"
                      stroke="#8E9299"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#2a2b30' }}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as PriceMilestoneItem;
                          const isGain = data.gainLoss >= 0;
                          return (
                            <div className="bg-[#1b1c20] border border-line p-3 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-fg border-b border-line pb-1">
                                {activeAsset} Price Level: {data.formattedMilestone}
                              </p>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Passages / Crossings:</span>
                                <span className="font-mono tabular-nums text-fg font-bold">{data.passages}x</span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>1st Passage Equity:</span>
                                <span className="font-mono tabular-nums text-fg">
                                  {maskVal(data.firstPassageEquity.toFixed(decimals))} {denomination}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted">
                                <span>Last Passage Equity:</span>
                                <span className="font-mono tabular-nums text-fg">
                                  {maskVal(data.lastPassageEquity.toFixed(decimals))} {denomination}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-fg-muted pt-1 border-t border-line">
                                <span className="font-bold text-fg">Net Volatility Harvest:</span>
                                <span className={`font-mono tabular-nums font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatGain(data.gainLoss)} ({isGain ? '+' : ''}{data.gainLossPct.toFixed(2)}%)
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="gainLoss" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {milestones.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.gainLoss >= 0 ? '#10B981' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Milestones Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-line rounded-lg overflow-hidden">
                <thead className="bg-[#1b1c20] text-fg-muted uppercase text-[10px] tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Price Milestone ({activeAsset})</th>
                    <th className="py-2.5 px-4 font-semibold text-center">
                      <AppTooltip description="Number of times trades crossed or oscillated across this price range">
                        <span className="cursor-help border-b border-dashed border-fg-muted/50">
                          Passages
                        </span>
                      </AppTooltip>
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-right">1st Passage Equity</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Last Passage Equity</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Accumulated Gain / Loss</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Return (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60 font-mono tabular-nums">
                  {milestones.map((m) => {
                    const isGain = m.gainLoss >= 0;
                    return (
                      <tr key={m.milestonePrice} className="hover:bg-elevated transition-colors">
                        <td className="py-2.5 px-4 font-sans font-bold text-fg flex items-center gap-2">
                          <span>{m.formattedMilestone}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-line text-fg">
                            {m.passages}x
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-fg-muted">
                          {maskVal(m.firstPassageEquity.toFixed(decimals))} {denomination}
                        </td>
                        <td className="py-2.5 px-4 text-right text-fg">
                          {maskVal(m.lastPassageEquity.toFixed(decimals))} {denomination}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatGain(m.gainLoss)}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isGain ? '+' : ''}{m.gainLossPct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
