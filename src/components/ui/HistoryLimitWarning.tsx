import React, { useMemo } from 'react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { estimateRequestedPeriodDays } from '../../utils/dateTimeHelper';

const LIMITS: Record<string, { days: number; labelKey: string; defaultLabel: string }> = {
  okx: { days: 90, labelKey: 'common.historyLimit.limits.okx', defaultLabel: '3 months (90 days)' },
  bitget: { days: 90, labelKey: 'common.historyLimit.limits.bitget', defaultLabel: '3 months (90 days)' },
  bybit: { days: 730, labelKey: 'common.historyLimit.limits.bybit', defaultLabel: '2 years' }
};

interface HistoryLimitWarningProps {
  period: string | number;
  customStartDate?: string;
  customEndDate?: string;
  exchangeFilter?: string;
  className?: string;
}

export function HistoryLimitWarning({
  period,
  customStartDate,
  customEndDate,
  exchangeFilter,
  className = '',
}: HistoryLimitWarningProps) {
  const { t } = useTranslation();
  const keys = useApiKeysStore(state => state.keys);

  const warnings = useMemo(() => {
    const activeKeys = keys.filter(k => {
      if (!k.isActive) return false;
      if (exchangeFilter && exchangeFilter.toLowerCase() !== 'all') {
        return k.exchange.toLowerCase() === exchangeFilter.toLowerCase();
      }
      return true;
    });

    if (activeKeys.length === 0) return [];

    const daysRequested = estimateRequestedPeriodDays(period, customStartDate, customEndDate);
    if (daysRequested <= 0) return [];

    const warnedExchanges: string[] = [];
    activeKeys.forEach(k => {
      const ex = k.exchange.toLowerCase();
      const limit = LIMITS[ex];
      if (limit && daysRequested > limit.days) {
        if (!warnedExchanges.includes(ex)) {
          warnedExchanges.push(ex);
        }
      }
    });

    return warnedExchanges.map(ex => ({
      exchange: ex,
      labelKey: LIMITS[ex].labelKey,
      defaultLabel: LIMITS[ex].defaultLabel
    }));
  }, [keys, period, customStartDate, customEndDate, exchangeFilter]);

  if (warnings.length === 0) return null;

  return (
    <div
      role="status"
      className={`history-limit-banner border rounded-xl p-3 flex items-start gap-3 ${className}`}
    >
      <AlertCircle className="w-5 h-5 history-limit-banner-icon mt-0.5 flex-shrink-0" />
      <div className="text-sm">
        <strong>{t('common.historyLimit.title', 'Historical Data Limits:')}</strong>{' '}
        {t('common.historyLimit.desc', 'Some of your active exchanges have API restrictions for retrieving historical data. Records older than these limits cannot be retrieved:')}
        <ul className="list-disc pl-5 mt-2 opacity-90 space-y-1">
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
