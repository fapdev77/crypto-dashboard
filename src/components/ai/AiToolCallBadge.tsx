import React from 'react';
import { Loader2, Database, BarChart2, ShieldAlert, Coins } from 'lucide-react';

interface AiToolCallBadgeProps {
  toolName: string;
}

export const AiToolCallBadge: React.FC<AiToolCallBadgeProps> = ({ toolName }) => {
  const getToolInfo = (name: string) => {
    switch (name) {
      case 'aiGetPortfolioBalances':
        return {
          icon: <Database className="w-3.5 h-3.5 text-indigo-400" />,
          label: 'Reading consolidated portfolio balances...',
        };
      case 'aiGetOpenPositions':
        return {
          icon: <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />,
          label: 'Querying open positions on exchanges...',
        };
      case 'aiGetHedgeCorrelationSummary':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
          label: 'Calculating hedge correlation and exposure mismatch...',
        };
      case 'aiGetFundingFeesHistory':
        return {
          icon: <Coins className="w-3.5 h-3.5 text-emerald-400" />,
          label: 'Retrieving funding fees history from IndexedDB...',
        };
      case 'aiGetTradingFeesHistory':
        return {
          icon: <Coins className="w-3.5 h-3.5 text-rose-400" />,
          label: 'Scanning historical trading commissions and fees...',
        };
      case 'aiGetClosedPositionsSummary':
        return {
          icon: <BarChart2 className="w-3.5 h-3.5 text-purple-400" />,
          label: 'Analyzing closed positions history...',
        };
      default:
        return {
          icon: <Database className="w-3.5 h-3.5 text-slate-400" />,
          label: `Executing local tool: ${name}...`,
        };
    }
  };

  const info = getToolInfo(toolName);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#151619] border border-[#2a2b30] rounded-xl text-xs text-gray-300 font-mono shadow-md animate-pulse">
      <Loader2 className="w-3 h-3 animate-spin text-[#2F6BFF]" />
      {info.icon}
      <span>{info.label}</span>
    </div>
  );
};
