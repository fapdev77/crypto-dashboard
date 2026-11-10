import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export type PeriodOption = 'last' | 'day' | 'current_month' | 'last_month' | '3_months';

interface Props {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
}

const PERIODS: { id: PeriodOption; key: string; defaultLabel: string }[] = [
  { id: 'last', key: 'analytics.funding.columns.last', defaultLabel: 'Last' },
  { id: 'day', key: 'analytics.funding.columns.today', defaultLabel: 'Day' },
  { id: 'current_month', key: 'analytics.funding.columns.currentMonth', defaultLabel: 'Current Month' },
  { id: 'last_month', key: 'analytics.funding.columns.lastMonth', defaultLabel: 'Last Month' },
  { id: '3_months', key: 'analytics.funding.columns.last3Months', defaultLabel: 'Last 3 Months' },
];

export const PeriodSegmentedControl: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex bg-[#0e0f11] p-1 rounded-lg border border-[#2a2b30] w-max overflow-x-auto">
      {PERIODS.map((period) => (
        <button
          key={period.id}
          onClick={() => onChange(period.id)}
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
            value === period.id
              ? "bg-[#2a2b30] text-white shadow-sm"
              : "text-[#8E9299] hover:text-white"
          )}
        >
          {t(period.key, period.defaultLabel)}
        </button>
      ))}
    </div>
  );
};
