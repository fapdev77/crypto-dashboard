import React from 'react';
import { OperationsResultMetrics } from '../../../hooks/usePortfolioPerformance';
import { AppTooltip } from '../../ui/Tooltip';
import { Scale, ArrowUpDown, Percent } from 'lucide-react';

interface Props {
  operations: OperationsResultMetrics;
  denomination: string;
  isPrivateMode: boolean;
}

export const OperationsAndFeesSection = React.memo(function OperationsAndFeesSection({ operations, denomination, isPrivateMode }: Props) {
  const maskVal = (val: string | number) => {
    if (isPrivateMode) return '****';
    return String(val);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'Acceptable':
        return 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30';
      case 'Moderate':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'High':
      default:
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#2a2b30]/60">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#2F6BFF]" />
          Operations Result & Fee Efficiency
        </h3>
        <span className="text-xs text-[#8E9299]">Execution Accounting</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Operations Result (Split Trades vs. Funding) */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 pb-1 border-b border-[#2a2b30]/50 flex items-center justify-between">
            <span>Operations Result</span>
            <span className="text-[10px] text-[#8E9299] font-normal">Gross vs. Net</span>
          </h4>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            {/* Left: Trades */}
            <div className="space-y-2 pr-2 border-r border-[#2a2b30]/40">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                Trades
              </span>
              <div>
                <span className="text-[#8E9299] text-[10px] block">Gross Cash Flow</span>
                <span className="text-white font-medium">{maskVal(operations.grossCashFlow)} {denomination}</span>
              </div>
              <div>
                <span className="text-[#8E9299] text-[10px] block">Fees Paid</span>
                <span className="text-[#FF4444] font-medium">{operations.feesPaid.startsWith('-') ? '' : '-'}{maskVal(operations.feesPaid)} {denomination}</span>
              </div>
              <div className="pt-1 border-t border-[#2a2b30]/50">
                <span className="text-[#8E9299] text-[10px] block">Net Trading P&L</span>
                <span className="text-emerald-400 font-bold">{maskVal(operations.netTradingPnl)} {denomination}</span>
              </div>
            </div>

            {/* Right: Funding Rate */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Funding Rate
              </span>
              <div>
                <span className="text-[#8E9299] text-[10px] block">Received</span>
                <span className="text-emerald-400 font-medium">+{maskVal(operations.fundingReceived)} {denomination}</span>
              </div>
              <div>
                <span className="text-[#8E9299] text-[10px] block">Paid</span>
                <span className="text-[#FF4444] font-medium">{operations.fundingPaid.startsWith('-') ? '' : '-'}{maskVal(operations.fundingPaid)} {denomination}</span>
              </div>
              <div className="pt-1 border-t border-[#2a2b30]/50">
                <span className="text-[#8E9299] text-[10px] block">Net Funding</span>
                <span className="text-emerald-400 font-bold">{maskVal(operations.netFunding)} {denomination}</span>
              </div>
              <div>
                <span className="text-[#8E9299] text-[10px] block">Rec / Paid Ratio</span>
                <span className="text-white font-mono font-bold text-[11px]">{operations.fundingRatio}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Trade Breakdown */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 pb-1 border-b border-[#2a2b30]/50 flex items-center justify-between">
            <span>Trade Breakdown</span>
            <span className="text-[10px] text-[#8E9299] font-normal">Side Distribution</span>
          </h4>

          <div className="flex flex-col gap-2.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-[#2a2b30]/30">
              <span className="text-[#8E9299]">Total Trades</span>
              <span className="text-white font-bold">{operations.totalTrades}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2a2b30]/30">
              <span className="text-[#8E9299]">Buys (BUY)</span>
              <span className="text-[#00C853] font-medium">
                {operations.buysCount} ({operations.buysPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2a2b30]/30">
              <span className="text-[#8E9299]">Sells (SELL)</span>
              <span className="text-[#FF4444] font-medium">
                {operations.sellsCount} ({operations.sellsPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#8E9299]">Daily Average</span>
              <span className="text-gray-300 font-medium">
                {operations.tradesPerDay.toFixed(2)} trades/day
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Fee Analysis & Cost Diagnostics */}
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col justify-between">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-2 pb-1 border-b border-[#2a2b30]/50 flex items-center justify-between">
            <span>Fee Analysis</span>
            <span className="text-[10px] text-[#8E9299] font-normal">Cost Drag</span>
          </h4>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#8E9299] uppercase tracking-wider block">Fee Cost</span>
                <span className="text-2xl font-bold font-mono text-white">
                  {operations.feeCostPct.toFixed(2)}%
                </span>
                <span className="text-[10px] text-[#8E9299] block">of gross profit</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-[#8E9299] uppercase tracking-wider mb-1">Status</span>
                <span className={`px-2.5 py-1 text-xs rounded-md font-semibold border ${getStatusColor(operations.feeStatus)}`}>
                  {operations.feeStatus}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-[#1a1b1e] rounded-lg border border-[#2a2b30]/50 text-xs space-y-1">
              <div className="text-gray-300">
                <span className="text-[#8E9299] font-medium">Interpretation: </span>
                {operations.feeInterpretation}
              </div>
              <div className="text-gray-300">
                <span className="text-[#2F6BFF] font-medium">Recommended Action: </span>
                {operations.feeAction}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
