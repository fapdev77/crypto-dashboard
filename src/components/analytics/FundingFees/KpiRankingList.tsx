import React from 'react';
import clsx from 'clsx';
import { AppTooltip } from '../../ui/Tooltip';
import { ExchangeIcon } from '../../ui/ExchangeIcon';
import { ExchangeName } from '../../../types';

interface RankingItem {
  symbol: string;
  rate: number;
  exchange?: ExchangeName;
}

interface KpiRankingListProps {
  title: string;
  icon: React.ReactNode;
  items: RankingItem[];
  color: 'green' | 'red';
  tooltip?: string;
}

const formatRate = (rate: number): string => {
  const sign = rate > 0 ? '+' : '';
  return `${sign}${(rate * 100).toFixed(4)}%`;
};

export const KpiRankingList = ({
  title,
  icon,
  items,
  color,
  tooltip,
}: KpiRankingListProps) => {
  const borderColor = color === 'green' ? 'border-green-500/20' : 'border-red-500/20';
  const textColor = color === 'green' ? 'text-green-400' : 'text-red-400';
  const bgColor = color === 'green' ? 'bg-green-500/5' : 'bg-red-500/5';

  const list = (
    <div className={`bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-2 hover:border-[#3a3b40] transition-colors ${borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[#8E9299]">{icon}</span>
        <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-[#8E9299] ml-auto">({items.length})</span>
      </div>

      {items.length === 0 ? (
        <span className="text-xs text-[#8E9299] italic">No data</span>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item, idx) => {
            const rankColor = idx === 0 ? textColor : 'text-[#8E9299]';
            return (
              <div
                key={`${item.symbol}-${item.exchange || 'unknown'}`}
                className={`flex items-center justify-between px-2 py-1 rounded ${idx % 2 === 0 ? bgColor : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-mono font-bold ${rankColor} w-4 shrink-0`}>
                    {idx + 1}.
                  </span>
                  <span className="text-xs text-white font-medium truncate">{item.symbol}</span>
                  {item.exchange && (
                    <span className={clsx(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium capitalize shrink-0",
                      item.exchange === 'bitget' ? "bg-[#03aac7]/10 text-[#03aac7] border-[#03aac7]/20" :
                      item.exchange === 'bybit' ? "bg-[#ff9c2e]/10 text-[#ff9c2e] border-[#ff9c2e]/20" :
                      item.exchange === 'okx' ? "bg-white/10 text-white border-white/20" :
                      "bg-[#2a2b30] text-[#8E9299] border-[#2a2b30]"
                    )}>
                      <ExchangeIcon exchange={item.exchange} className="w-2.5 h-2.5" />
                      {item.exchange}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-mono font-medium ${textColor} shrink-0 ml-2`}>
                  {formatRate(item.rate)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <AppTooltip description={tooltip} side="top" align="center">
        <span className="cursor-help block">{list}</span>
      </AppTooltip>
    );
  }

  return list;
};

export default KpiRankingList;
