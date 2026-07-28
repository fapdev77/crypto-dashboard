import React from 'react';
import clsx from 'clsx';

export type PeriodOption = 'last' | 'day' | 'current_month' | 'last_month' | '3_months';

interface Props {
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
}

const PERIODS: { id: PeriodOption; label: string }[] = [
  { id: 'last', label: 'Last' },
  { id: 'day', label: 'Day' },
  { id: 'current_month', label: 'Current Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: '3_months', label: 'Last 3 Months' },
];

export const PeriodSegmentedControl: React.FC<Props> = ({ value, onChange }) => {
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
          {period.label}
        </button>
      ))}
    </div>
  );
};
