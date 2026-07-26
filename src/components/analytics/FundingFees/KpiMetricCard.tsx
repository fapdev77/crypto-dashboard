import React from 'react';
import { AppTooltip } from '../../ui/Tooltip';

export interface KpiMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  tooltip?: string;
  color?: 'green' | 'red' | 'white';
  className?: string;
}

const colorClasses: Record<string, string> = {
  green: 'text-green-400',
  red: 'text-red-400',
  white: 'text-white',
};

const trendIcons: Record<string, { icon: string; cls: string }> = {
  up:    { icon: '↑', cls: 'text-green-400' },
  down:  { icon: '↓', cls: 'text-red-400' },
  neutral: { icon: '→', cls: 'text-[#8E9299]' },
};

export const KpiMetricCard = ({
  icon,
  label,
  value,
  trend,
  tooltip,
  color = 'white',
  className = '',
}: KpiMetricCardProps) => {
  const content = (
    <div className={`bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col gap-1.5 hover:border-[#3a3b40] transition-colors ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#8E9299]">{icon}</span>
          <span className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider">{label}</span>
        </div>
        {trend && (
          <span className={`text-xs font-mono ${trendIcons[trend]?.cls ?? 'text-[#8E9299]'}`}>
            {trendIcons[trend]?.icon}
          </span>
        )}
      </div>
      <span className={`text-xl font-bold font-mono tracking-tight ${colorClasses[color] ?? colorClasses.white}`}>
        {value}
      </span>
    </div>
  );

  if (tooltip) {
    return (
      <AppTooltip description={tooltip} side="top" align="center">
        <span className="cursor-help">{content}</span>
      </AppTooltip>
    );
  }

  return content;
};

export default KpiMetricCard;
