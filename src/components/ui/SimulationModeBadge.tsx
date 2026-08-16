import React from 'react';
import { Play } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { AppTooltip } from './Tooltip';

interface SimulationModeBadgeProps {
  className?: string;
}

export function SimulationModeBadge({ className = '' }: SimulationModeBadgeProps) {
  const useMockData = useSettingsStore(state => state.useMockData);

  if (!useMockData) return null;

  return (
    <AppTooltip
      description="The application is currently running in Simulation Mode using offline mock data. Real-time API calls are offline."
      rows={[
        { label: 'Mode', value: 'Simulation' },
        { label: 'Engine', value: 'Mock Data' }
      ]}
    >
      <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500 font-medium select-none animate-pulse ${className}`}>
        <Play className="w-3.5 h-3.5 shrink-0 text-amber-500" />
        <span>Simulation Mode</span>
      </div>
    </AppTooltip>
  );
}
