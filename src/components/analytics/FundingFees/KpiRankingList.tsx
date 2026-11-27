import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const borderColor = color === 'green' ? 'border-success/20' : 'border-danger/20';
  const textColor = color === 'green' ? 'text-success' : 'text-danger';
  const bgColor = color === 'green' ? 'bg-success/5' : 'bg-danger/5';

  const list = (
    <div className={`bg-surface border border-line rounded-xl p-4 flex flex-col gap-2 hover:border-line-strong transition-colors ${borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-fg-muted">{icon}</span>
        <span className="text-[10px] font-medium text-fg-muted uppercase tracking-wider">{title}</span>
        <span className="text-[10px] text-fg-muted ml-auto">({items.length})</span>
      </div>

      {items.length === 0 ? (
        <span className="text-xs text-fg-muted italic">{t('common.noData', 'No data')}</span>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item, idx) => {
            const rankColor = idx === 0 ? textColor : 'text-fg-muted';
            return (
              <div
                key={`${item.symbol}-${item.exchange || 'unknown'}`}
                className={`flex items-center justify-between px-2 py-1 rounded ${idx % 2 === 0 ? bgColor : ''}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-mono font-bold ${rankColor} w-4 shrink-0`}>
                    {idx + 1}.
                  </span>
                  <span className="text-xs text-fg font-medium truncate">{item.symbol}</span>
                  {item.exchange && (
                    <span className={[
                      'flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-medium capitalize shrink-0',
                      item.exchange === 'bitget' ? 'bg-tone-cyan/10 text-tone-cyan border-tone-cyan/25' :
                      item.exchange === 'bybit' ? 'bg-tone-orange/10 text-tone-orange border-tone-orange/25' :
                      item.exchange === 'okx' ? 'bg-fg/10 text-fg border-fg/20' :
                      'bg-line text-fg-muted border-line'
                    ].join(' ')}>
                      <ExchangeIcon exchange={item.exchange} className="w-2.5 h-2.5" />
                      {item.exchange}
                    </span>
                  )}
                </div>
                <span className={`text-xs font-mono font-medium shrink-0 ml-2 ${item.rate > 0 ? 'text-success' : item.rate < 0 ? 'text-danger' : 'text-fg-muted'}`}>
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
