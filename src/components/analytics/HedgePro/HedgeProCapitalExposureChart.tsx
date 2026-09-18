import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { ShieldCheck, Activity, DollarSign, TrendingUp, Shield } from 'lucide-react';
import { AppTooltip } from '../../ui/Tooltip';
import { HedgeTotals } from '../../../utils/hedgeUtils';

interface HedgeProCapitalExposureChartProps {
  totals: HedgeTotals;
  formatCurrency: (
    value: number | undefined | null,
    type?: 'usd' | 'crypto' | 'price' | 'compact',
    decimalsOrSymbol?: number | string,
  ) => string;
}

interface ExposureDataPoint {
  id: string;
  name: string;
  shortName: string;
  category: 'Protected' | 'Exposed' | 'Leveraged';
  usd: number;
  equityPct: number;
  subPct?: number;
  color: string;
  fillOpacity?: number;
  description: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  formatCurrency: (value: number | undefined | null, type?: 'usd' | 'crypto' | 'price' | 'compact', decimalsOrSymbol?: number | string) => string;
  totals: HedgeTotals;
}

const CustomTooltip = ({ active, payload, formatCurrency, totals }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload as ExposureDataPoint;
  if (!data) return null;

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-3.5 shadow-2xl z-50 min-w-[240px] text-xs space-y-2.5">
      <div className="flex items-center justify-between gap-3 border-b border-[#2a2b30] pb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-semibold text-white">{data.name}</span>
        </div>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            data.category === 'Protected'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : data.category === 'Leveraged'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          {data.category}
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between items-center text-white">
          <span className="text-[#8E9299]">Capital Value:</span>
          <span className="font-bold">{formatCurrency(data.usd, 'usd', 2)}</span>
        </div>
        <div className="flex justify-between items-center text-white">
          <span className="text-[#8E9299]">Share of Equity:</span>
          <span className="font-semibold">{data.equityPct.toFixed(2)}%</span>
        </div>
        {data.subPct !== undefined && (
          <div className="flex justify-between items-center text-emerald-400 border-t border-[#2a2b30]/60 pt-1">
            <span className="text-[#8E9299]">Share of Protected:</span>
            <span className="font-semibold">{data.subPct.toFixed(2)}%</span>
          </div>
        )}
      </div>

      <p className="text-[10px] text-[#8E9299] border-t border-[#2a2b30] pt-2 leading-relaxed">
        {data.description}
      </p>

      <div className="text-[10px] text-[#8E9299]/70 pt-0.5 flex justify-between font-mono">
        <span>Portfolio Equity:</span>
        <span>{formatCurrency(totals.totalEquity, 'usd', 2)}</span>
      </div>
    </div>
  );
};

const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const data = props.chartData?.find((d: ExposureDataPoint) => d.name === payload.value) as ExposureDataPoint | undefined;
  if (!data) return null;

  return (
    <g transform={`translate(${x - 145}, ${y - 10})`}>
      <foreignObject width={140} height={20}>
        <div className="flex items-center justify-end w-full h-full pr-2 gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span className="text-xs font-semibold text-white truncate text-right">
            {data.shortName || data.name}
          </span>
        </div>
      </foreignObject>
    </g>
  );
};

/**
 * Capital Exposure Breakdown Card — Recharts-powered visualization
 * showing the granular composition of protected capital (Hedge Shorts vs Stablecoins)
 * alongside uncovered volatile exposure and leveraged risk.
 */
export function HedgeProCapitalExposureChart({
  totals,
  formatCurrency,
}: HedgeProCapitalExposureChartProps) {
  const hasLeveraged = totals.totalLeveraged > 0;

  const chartData: ExposureDataPoint[] = [
    {
      id: 'hedge',
      name: 'Hedge (Shorts)',
      shortName: 'Hedge (Shorts)',
      category: 'Protected',
      usd: totals.syntheticHedgeUsd,
      equityPct: totals.hedgeOfEquityPct,
      subPct: totals.hedgeOfProtectedPct,
      color: '#10b981', // emerald-500
      description: 'USD value locked at entry price via inverse short (Coin-M) positions.',
    },
    {
      id: 'stablecoins',
      name: 'Stablecoins',
      shortName: 'Stablecoins',
      category: 'Protected',
      usd: totals.stablecoinsProtectedUsd,
      equityPct: totals.stablesOfEquityPct,
      subPct: totals.stablesOfProtectedPct,
      color: '#3b82f6', // blue-500
      description: 'Liquid assets natively pegged to USD (USDT, USDC, DAI, etc.).',
    },
    {
      id: 'exposed',
      name: 'Exposed (Volatile)',
      shortName: 'Exposed',
      category: 'Exposed',
      usd: totals.summaryExposed,
      equityPct: totals.exposedPct,
      color: '#ffffff', // white
      description: 'Uncovered volatile coin balance exposed to market price movements.',
    },
    ...(hasLeveraged
      ? [
          {
            id: 'leveraged',
            name: 'Leveraged (Longs)',
            shortName: 'Leveraged',
            category: 'Leveraged' as const,
            usd: totals.totalLeveraged,
            equityPct: totals.leveragedPct,
            color: '#f59e0b', // amber-400
            description: 'Inverse long positions adding directional leveraged market risk.',
          },
        ]
      : []),
  ];

  // Maximum value for horizontal bar domain
  const maxUsd = Math.max(
    ...chartData.map(d => d.usd),
    totals.totalEquity > 0 ? totals.totalEquity * 0.5 : 1000,
    1,
  );

  // Stack data for 100% allocation bar
  const stackData = [
    {
      name: 'Allocation',
      hedge: totals.syntheticHedgeUsd,
      stablecoins: totals.stablecoinsProtectedUsd,
      exposed: totals.summaryExposed,
      leveraged: totals.totalLeveraged,
    },
  ];

  const totalBase = totals.syntheticHedgeUsd + totals.stablecoinsProtectedUsd + totals.summaryExposed;

  return (
    <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-3.5">
      {/* Header with Title and Legend */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Capital Exposure Breakdown
        </h3>
        <div className="flex items-center gap-3.5 text-[10px] text-[#8E9299] uppercase tracking-wider flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500/90 inline-block" /> Hedge (Shorts)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500/90 inline-block" /> Stablecoins
          </span>
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-white" /> Exposed
          </span>
          {hasLeveraged && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400/90 inline-block" /> Leveraged
            </span>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[#8E9299] -mt-1.5">
        Capital protection allocation (Synthetic Shorts + Native Stablecoins) compared to uncovered volatile exposure.
      </p>

      {/* Portfolio Composition Overview Stacked Bar (Recharts) */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono text-[#8E9299]">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-semibold">
              Protected: {totals.protectedPct.toFixed(2)}%
            </span>
            <span className="text-[10px] text-[#8E9299]">
              ({formatCurrency(totals.totalProtected, 'usd', 2)})
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-white font-semibold">
              Exposed: {totals.exposedPct.toFixed(2)}%
            </span>
            <span className="text-[10px] text-[#8E9299]">
              ({formatCurrency(totals.summaryExposed, 'usd', 2)})
            </span>
          </span>
        </div>

        {/* Stacked Recharts Visual Bar with Portal-based AppTooltip */}
        <AppTooltip
          side="top"
          align="center"
          description={
            <div className="text-xs space-y-1.5 p-1 min-w-[240px]">
              <div className="font-semibold text-white border-b border-[#2a2b30] pb-1">
                Capital Allocation Breakdown
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Hedge (Shorts):
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(totals.syntheticHedgeUsd, 'usd', 2)} ({totals.hedgeOfEquityPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center text-blue-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    Stablecoins:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(totals.stablecoinsProtectedUsd, 'usd', 2)} ({totals.stablesOfEquityPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center text-white">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-white inline-block" />
                    Exposed:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(totals.summaryExposed, 'usd', 2)} ({totals.exposedPct.toFixed(2)}%)
                  </span>
                </div>
                {hasLeveraged && (
                  <div className="flex justify-between items-center text-amber-400 border-t border-[#2a2b30]/60 pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      Leveraged (Longs):
                    </span>
                    <span className="font-semibold">
                      +{formatCurrency(totals.totalLeveraged, 'usd', 2)} (+{totals.leveragedPct.toFixed(2)}%)
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-white border-t border-[#2a2b30] pt-1 font-semibold">
                  <span className="text-[#8E9299]">Total Equity:</span>
                  <span>{formatCurrency(totals.totalEquity, 'usd', 2)}</span>
                </div>
              </div>
            </div>
          }
        >
          <div className="w-full h-5 relative rounded-md overflow-hidden bg-[#1a1b1e] border border-[#2a2b30]/80 cursor-help hover:border-[#3a3b42] transition-colors">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart
                layout="vertical"
                data={stackData}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis type="number" domain={[0, totalBase + (totals.totalLeveraged || 0)]} hide />
                <YAxis type="category" dataKey="name" hide />
                <Bar dataKey="hedge" stackId="alloc" fill="#10b981" isAnimationActive={false} />
                <Bar dataKey="stablecoins" stackId="alloc" fill="#3b82f6" isAnimationActive={false} />
                <Bar dataKey="exposed" stackId="alloc" fill="#ffffff" isAnimationActive={false} />
                {hasLeveraged && (
                  <Bar dataKey="leveraged" stackId="alloc" fill="#f59e0b" isAnimationActive={false} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AppTooltip>
      </div>

      {/* Granular Categories Comparison Chart (Recharts) */}
      <div className="w-full relative pt-1">
        <ResponsiveContainer
          width="100%"
          height={chartData.length * 36 + 10}
          minWidth={1}
          minHeight={1}
        >
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 140, left: 10, bottom: 4 }}
            barSize={18}
          >
            <XAxis type="number" domain={[0, maxUsd]} hide />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={<CustomYAxisTick chartData={chartData} />}
              width={140}
            />
            <RechartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={<CustomTooltip formatCurrency={formatCurrency} totals={totals} />}
              isAnimationActive={false}
              wrapperStyle={{ zIndex: 50 }}
            />
            <Bar dataKey="usd" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Value and Percentage Labels on the Right Side */}
        <div
          className="absolute right-0 top-1 flex flex-col justify-around pointer-events-none"
          style={{ height: chartData.length * 36 + 10 }}
        >
          {chartData.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-end gap-2 text-xs font-mono pr-1 h-[36px]"
            >
              <span className="text-white font-semibold whitespace-nowrap">
                {formatCurrency(item.usd, 'usd', 2)}
              </span>
              <span
                className="text-[11px] font-medium whitespace-nowrap min-w-[54px] text-right"
                style={{ color: item.color }}
              >
                {item.equityPct.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HedgeProCapitalExposureChart;
