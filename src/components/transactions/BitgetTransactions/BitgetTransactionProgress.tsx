import React from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { AppTooltip } from '../../ui/Tooltip';
import { useTranslation } from 'react-i18next';

interface BitgetTransactionProgressProps {
  isSyncing: boolean;
  progress: { pct: number; records: number } | null;
}

export function BitgetTransactionProgress({ isSyncing, progress }: BitgetTransactionProgressProps) {
  const { t } = useTranslation();
  if (!isSyncing) return null;

  const pct = progress ? Math.round(progress.pct) : 0;
  const records = progress?.records || 0;

  return (
    <AppTooltip
      description="Progress of the Bitget transaction log backfill. Syncs up to 2 years of data progressively."
      rows={[
        { label: t('transactions.common.filtering', 'Progress'), value: `${pct}%` },
        { label: t('transactions.common.recordsSaved', 'Records Saved'), value: records.toLocaleString() },
        { label: t('transactions.common.status', 'Status'), value: pct >= 100 ? t('transactions.common.complete', 'Complete') : t('transactions.common.inProgress', 'In Progress') },
      ]}
    >
      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-[#2F6BFF]/30 bg-[#2F6BFF]/10 text-[#2F6BFF] font-medium select-none">
        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
        <span>{t('transactions.common.syncing', 'Syncing')}</span>
        <span className="font-mono">{pct}%</span>
        <span className="text-[#4a7bff]/70">·</span>
        <Database className="w-3 h-3 shrink-0" />
        <span className="font-mono">{records.toLocaleString()} {t('transactions.common.rec', 'rec')}</span>
      </div>
    </AppTooltip>
  );
}
