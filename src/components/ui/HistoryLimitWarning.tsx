import React, { useMemo } from 'react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LIMITS: Record<string, { days: number; labelKey: string; defaultLabel: string }> = {
  okx: { days: 90, labelKey: 'common.historyLimit.limits.okx', defaultLabel: '3 months (90 days)' },
  bitget: { days: 90, labelKey: 'common.historyLimit.limits.bitget', defaultLabel: '3 months (90 days)' },
  bybit: { days: 730, labelKey: 'common.historyLimit.limits.bybit', defaultLabel: '2 years' }
};

interface HistoryLimitWarningProps {
  period: string;
  className?: string;
}

export function HistoryLimitWarning({ period, className = '' }: HistoryLimitWarningProps) {
  const { t } = useTranslation();
  const keys = useApiKeysStore(state => state.keys);

  const warnings = useMemo(() => {
    if (keys.length === 0) return [];
    
    let daysRequested = 0;
    
    if (period === 'today') {
      daysRequested = 1;
    } else if (period === '7d') {
      daysRequested = 7;
    } else if (period === '14d') {
      daysRequested = 14;
    } else if (period === '30d') {
      daysRequested = 30;
    } else if (period === '90d') {
      daysRequested = 90;
    }

    const warnedExchanges: string[] = [];
    keys.forEach(k => {
      const limit = LIMITS[k.exchange];
      if (limit && daysRequested > limit.days) {
        if (!warnedExchanges.includes(k.exchange)) {
          warnedExchanges.push(k.exchange);
        }
      }
    });

    return warnedExchanges.map(ex => ({
      exchange: ex,
      labelKey: LIMITS[ex].labelKey,
      defaultLabel: LIMITS[ex].defaultLabel
    }));
  }, [keys, period]);

  if (warnings.length === 0) return null;

  return (
    <div className={`bg-[#2A1D0B] border border-[#FFAB00]/30 rounded-xl p-3 flex items-start gap-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-[#FFAB00] mt-0.5 flex-shrink-0" />
      <div className="text-sm text-[#FFAB00]/90">
        <strong>{t('common.historyLimit.title', 'Historical Data Limits:')}</strong>{' '}
        {t('common.historyLimit.desc', 'Some of your active exchanges have API restrictions for retrieving historical data. Records older than these limits cannot be retrieved:')}
        <ul className="list-disc pl-5 mt-2 opacity-80 space-y-1">
          {warnings.map(w => (
            <li key={w.exchange} className="capitalize">
              {w.exchange}: {t('common.historyLimit.max', { limit: t(w.labelKey, w.defaultLabel), defaultValue: `Maximum of ${w.defaultLabel}` })}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
