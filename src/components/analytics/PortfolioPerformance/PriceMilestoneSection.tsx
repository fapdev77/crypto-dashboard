import React from 'react';
import { PriceMilestoneItem } from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Milestone, ArrowUpDown, TrendingUp, TrendingDown, Layers } from 'lucide-react';
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
}

export const PriceMilestoneSection = React.memo(function PriceMilestoneSection({
  milestones,
  denomination,
  milestoneStep,
  onStepChange,
  isPrivateMode,
}: Props) {
  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const formatGain = (val: number) => {
    if (isPrivateMode) return '****';
    const sign = val > 0 ? '+' : '';
    const decimals = denomination === 'USD' ? 2 : 4;
    return `${sign}${val.toFixed(decimals)} ${denomination}`;
  };

  // Preset steps based on denomination
  const presetSteps = denomination === 'BTC'
    ? [1000, 2500, 5000, 10000]
    : denomination === 'ETH'
    ? [50, 100, 250, 500]
    : denomination === 'SOL'
    ? [5, 10, 25, 50]
    : [500, 1000, 2500, 5000];

  return (
    <div className="space-y-4">
      {/* Header and Step Interval controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2a2b30]/60">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Milestone className="w-4 h-4 text-[#2F6BFF]" />
            Price Milestone & Range Passage Analysis
          </h3>
          <p className="text-xs text-[#8E9299] mt-0.5">
            Evaluates equity accumulation each time price revisits the same valuation level
          </p>
        </div>

        {/* Step configuration */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8E9299] whitespace-nowrap">Step Interval:</span>
          <div className="flex items-center gap-1 bg-[#1a1b1e] p-1 rounded-lg border border-[#2a2b30]">
            {presetSteps.map((step) => (
              <button
                key={step}
                onClick={() => onStepChange(step)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  milestoneStep === step
                    ? 'bg-[#2F6BFF] text-white shadow-sm'
                    : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/40'
                }`}
              >
                ${step >= 1000 ? `${step / 1000}k` : step}
              </button>
            ))}
            <div className="h-4 w-px bg-[#2a2b30] mx-0.5" />
            <div className="flex items-center gap-1 pl-1">
              <span className="text-xs text-[#8E9299]">$</span>
              <input
                type="number"
                min={1}
                value={milestoneStep}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) onStepChange(val);
                }}
                className="w-16 bg-[#151619] border border-[#2a2b30] rounded px-1.5 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-[#2F6BFF]"
                placeholder="Custom"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 space-y-6 shadow-sm">
        {milestones.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#8E9299]">
            No price milestones recorded for this asset and timeframe. Try adjusting the step interval or date filter.
          </div>
        ) : (
          <>
            {/* Horizontal Bar Chart showing Gain/Loss across Milestones */}
            <div className="bg-[#1a1b1e]/50 border border-[#2a2b30]/60 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8E9299] mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2F6BFF]" />
                Accumulated Volatility Gain / Loss per Price Level
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
                      tickFormatter={(val) => isPrivateMode ? '****' : String(val)}
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
                            <div className="bg-[#1b1c20] border border-[#2a2b30] p-3 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-bold text-white border-b border-[#2a2b30] pb-1">
                                Price Level: {data.formattedMilestone}
                              </p>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Passages / Crossings:</span>
                                <span className="font-mono text-white font-bold">{data.passages}x</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>1st Passage Equity:</span>
                                <span className="font-mono text-white">{maskVal(data.firstPassageEquity.toFixed(4))} {denomination}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299]">
                                <span>Last Passage Equity:</span>
                                <span className="font-mono text-white">{maskVal(data.lastPassageEquity.toFixed(4))} {denomination}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[#8E9299] pt-1 border-t border-[#2a2b30]">
                                <span className="font-bold text-white">Net Volatility Harvest:</span>
                                <span className={`font-mono font-bold ${isGain ? 'text-emerald-400' : 'text-rose-400'}`}>
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
              <table className="w-full text-left text-xs border border-[#2a2b30] rounded-lg overflow-hidden">
                <thead className="bg-[#1b1c20] text-[#8E9299] uppercase text-[10px] tracking-wider border-b border-[#2a2b30]">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Price Milestone</th>
                    <th className="py-2.5 px-4 font-semibold text-center">
                      <AppTooltip description="Number of times trades crossed or oscillated across this price range">
                        <span className="cursor-help border-b border-dashed border-[#8E9299]/50">
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
                <tbody className="divide-y divide-[#2a2b30]/60 font-mono">
                  {milestones.map((m) => {
                    const isGain = m.gainLoss >= 0;
                    return (
                      <tr key={m.milestonePrice} className="hover:bg-[#1a1b1e] transition-colors">
                        <td className="py-2.5 px-4 font-sans font-bold text-white flex items-center gap-2">
                          <span>{m.formattedMilestone}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#2a2b30] text-white">
                            {m.passages}x
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right text-[#8E9299]">
                          {maskVal(m.firstPassageEquity.toFixed(4))} {denomination}
                        </td>
                        <td className="py-2.5 px-4 text-right text-white">
                          {maskVal(m.lastPassageEquity.toFixed(4))} {denomination}
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
