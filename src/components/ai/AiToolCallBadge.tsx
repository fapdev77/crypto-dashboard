import React from 'react';
import { Loader2, Database, BarChart2, ShieldAlert, Coins } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AiToolCallBadgeProps {
  toolName: string;
}

export const AiToolCallBadge: React.FC<AiToolCallBadgeProps> = ({ toolName }) => {
  const { t } = useTranslation();

  const getToolInfo = (name: string) => {
    switch (name) {
      case 'aiGetPortfolioBalances':
        return {
          icon: <Database className="w-3.5 h-3.5 text-indigo-400" />,
          label: t('ai.toolBadges.balances', 'Reading consolidated portfolio balances...'),
        };
      case 'aiGetOpenPositions':
        return {
          icon: <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />,
          label: t('ai.toolBadges.openPositions', 'Querying open positions on exchanges...'),
        };
      case 'aiGetHedgeCorrelationSummary':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
          label: t('ai.toolBadges.hedgeCorrelation', 'Calculating hedge correlation and exposure mismatch...'),
        };
      case 'aiGetFundingFeesHistory':
        return {
          icon: <Coins className="w-3.5 h-3.5 text-emerald-400" />,
          label: t('ai.toolBadges.fundingFees', 'Retrieving funding fees history from IndexedDB...'),
        };
      case 'aiGetTradingFeesHistory':
        return {
          icon: <Coins className="w-3.5 h-3.5 text-rose-400" />,
          label: t('ai.toolBadges.tradingFees', 'Scanning historical trading commissions and fees...'),
        };
      case 'aiGetClosedPositionsSummary':
        return {
          icon: <BarChart2 className="w-3.5 h-3.5 text-purple-400" />,
          label: t('ai.toolBadges.closedPositions', 'Analyzing closed positions history...'),
        };
      default:
        return {
          icon: <Database className="w-3.5 h-3.5 text-slate-400" />,
          label: t('ai.toolBadges.default', 'Executing local tool: {{name}}...', { name }),
        };
    }
  };

  const info = getToolInfo(toolName);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-line rounded-xl text-xs text-fg font-mono shadow-md animate-pulse">
      <Loader2 className="w-3 h-3 animate-spin text-accent" />
      {info.icon}
      <span>{info.label}</span>
    </div>
  );
};
