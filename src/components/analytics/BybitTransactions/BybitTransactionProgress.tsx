import React from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { AppTooltip } from '../../ui/Tooltip';

interface BybitTransactionProgressProps {
  isSyncing: boolean;
  progress: { pct: number; records: number } | null;
}

export function BybitTransactionProgress({ isSyncing, progress }: BybitTransactionProgressProps) {
  if (!isSyncing) return null;

  const pct = progress ? Math.round(progress.pct) : 0;
  const records = progress?.records || 0;

  return (
    <AppTooltip
      description="Progress of the Bybit transaction log backfill. Syncs up to 2 years of data progressively."
      rows={[
        { label: 'Progress', value: `${pct}%` },
        { label: 'Records Saved', value: records.toLocaleString() },
        { label: 'Status', value: pct >= 100 ? 'Complete' : 'In Progress' },
      ]}
    >
      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-[#2F6BFF]/30 bg-[#2F6BFF]/10 text-[#2F6BFF] font-medium select-none">
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span>Syncing</span>
        <span className="font-mono">{pct}%</span>
        <span className="text-[#4a7bff]/70">·</span>
        <Database className="w-3 h-3 shrink-0" />
        <span className="font-mono">{records.toLocaleString()} rec</span>
      </div>
    </AppTooltip>
  );
}
