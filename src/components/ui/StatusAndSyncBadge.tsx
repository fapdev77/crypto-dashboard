import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { AppTooltip } from './Tooltip';
import { SimulationModeBadge } from './SimulationModeBadge';
import { formatTimeOnly } from '../../utils/dateTimeHelper';
import { useTranslation } from 'react-i18next';

interface StatusAndSyncBadgeProps {
  isSyncing: boolean;
  syncMessage?: string | null;
  syncError?: string | null;
  className?: string;
  /** Override the auto-sync interval in ms. Defaults to historyCacheInterval (minutes) from settingsStore. */
  overrideIntervalMs?: number;
  /** Override the last sync time timestamp */
  overrideLastSyncTime?: number;
  /** Override the next scheduled sync time timestamp */
  overrideNextSyncTime?: number;
  /** Override the manual sync click handler */
  onManualSync?: () => void;
  /** Optional custom handler when clicking the error badge. Defaults to navigating to the 'logs' tab. */
  onErrorClick?: () => void;
}

export function StatusAndSyncBadge({ 
  isSyncing, 
  syncMessage, 
  syncError,
  className = '', 
  overrideIntervalMs,
  overrideLastSyncTime,
  overrideNextSyncTime,
  onManualSync,
  onErrorClick
}: StatusAndSyncBadgeProps) {
  const { t } = useTranslation();
  const {
    historyCacheInterval,
    historyCacheVersion,
    bumpHistoryCacheVersion,
    lastSyncTime,
    setLastSyncTime,
    cooldownEnd,
    setCooldownEnd,
    useMockData
  } = useSettingsStore();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const wasSyncingRef = useRef(isSyncing);

  // Keep current time updated every second for accurate timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update last sync time ONLY when isSyncing actually transitions from true to false
  useEffect(() => {
    if (wasSyncingRef.current && !isSyncing) {
      if (overrideLastSyncTime === undefined && !syncError) {
        setLastSyncTime(Date.now());
      }
    }
    wasSyncingRef.current = isSyncing;
  }, [isSyncing, setLastSyncTime, overrideLastSyncTime, syncError]);

  const now = currentTime;
  
  // Calculate remaining manual sync cooldown
  const cooldownLeft = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));

  // Calculate remaining time until next scheduled background sync
  const intervalMs = overrideIntervalMs ?? historyCacheInterval * 60 * 1000;
  const actualLastSync = overrideLastSyncTime ?? lastSyncTime;
  const nextSyncTime = overrideNextSyncTime ?? (actualLastSync + intervalMs);
  const secondsLeft = Math.max(0, Math.ceil((nextSyncTime - now) / 1000));
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const nextSyncStr = secondsLeft > 0 
    ? `${minutes > 0 ? `${minutes}m ` : ''}${seconds}s`
    : t('common.sync.pending', 'Pending...');

  // Format last sync time safely
  const formattedLastSync = actualLastSync > 0 
    ? formatTimeOnly(actualLastSync)
    : t('common.sync.never', 'Never');

  const handleManualSync = () => {
    if (cooldownLeft > 0 || isSyncing) return;

    // Set cooldown to 1 minute from now
    setCooldownEnd(Date.now() + 60000);
    if (onManualSync) {
      onManualSync();
    } else {
      // Set last sync to 0 to signal a force sync across all active views/hooks
      setLastSyncTime(0);
      // Trigger global historyCacheVersion bump to force all hooks to refresh
      bumpHistoryCacheVersion();
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 mt-1 ${className}`}>
      {/* 1. Status Badge (Always Active) */}
      <AppTooltip
        description={
          isSyncing
            ? t('common.sync.tooltipStatusSyncing', 'Current synchronization status of the cached historical records with the API endpoints of connected exchanges.')
            : syncError
            ? t('common.sync.tooltipStatusError', {
                error: syncError,
                defaultValue: `The last synchronization attempt encountered an issue: "${syncError}". Displayed data may be incomplete or outdated until the next successful update.`
              })
            : t('common.sync.tooltipStatusSuccess', 'Current synchronization status of the cached historical records with the API endpoints of connected exchanges.')
        }
        rows={
          isSyncing
            ? [
                { label: 'Status', value: t('common.sync.syncing', 'Syncing...') },
                { label: 'Signal', value: 'REST API' }
              ]
            : syncError
            ? [
                { label: 'Status', value: t('common.sync.syncWarning', 'Sync Warning') },
                { label: 'Reason', value: syncError },
                { label: 'Action', value: 'Click to open logs' }
              ]
            : [
                { label: 'Status', value: t('common.sync.upToDate', 'Up to Date') },
                { label: 'Signal', value: 'Cache' }
              ]
        }
      >
        {isSyncing ? (
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium transition-all duration-300 select-none bg-accent/10 text-accent border-accent/20">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="truncate max-w-[200px]">{syncMessage || t('common.sync.syncing', 'Syncing...')}</span>
          </div>
        ) : syncError ? (
          <button
            type="button"
            onClick={() => {
              if (onErrorClick) {
                onErrorClick();
              } else {
                window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'logs' }));
              }
            }}
            aria-label="View sync error details in connection logs"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium transition-all duration-200 select-none bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-500/50 cursor-pointer active:scale-95 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>{t('common.sync.syncWarning', 'Sync Warning')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium transition-all duration-300 select-none bg-success/10 text-success border-success/20">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
            <span>{t('common.sync.upToDate', 'Up to Date')}</span>
          </div>
        )}
      </AppTooltip>

      {/* 2. Last Sync & Next Update Countdown Badge */}
      <AppTooltip
        description={t('common.sync.tooltipSyncSchedule', 'Automatic cache renewal schedule. Background worker fetches incremental updates on the configured interval.')}
        rows={[
          { label: 'Interval Settings', value: overrideIntervalMs ? `${Math.round(overrideIntervalMs / 60000)} min` : `${historyCacheInterval} min` },
          { label: 'Last Completed', value: formattedLastSync },
          { label: 'Next Scheduled', value: formatTimeOnly(nextSyncTime) }
        ]}
      >
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-line bg-elevated text-fg-muted select-none">
          <Clock className="w-3.5 h-3.5 shrink-0 text-fg-muted" />
          <span>{t('common.sync.lastSync', 'Last sync:')} <strong className="text-fg font-mono">{formattedLastSync}</strong></span>
          <span className="text-line font-mono">|</span>
          <span>{t('common.sync.nextAuto', 'Next auto:')} <strong className="text-fg font-mono">{nextSyncStr}</strong></span>
        </div>
      </AppTooltip>

      {/* 2b. Simulation Mode Badge */}
      <SimulationModeBadge />

      {/* 3. Manual Sync Trigger Button with 1-min Cooldown */}
      <AppTooltip
        description={
          useMockData
            ? t('common.sync.tooltipManualDisabled', 'Manual synchronization is disabled while running in Simulation Mode.')
            : cooldownLeft > 0 
              ? t('common.sync.tooltipManualCooldown', { seconds: cooldownLeft, defaultValue: `Manual sync is locked to protect exchange API rate-limits. Please wait ${cooldownLeft}s.` })
              : t('common.sync.tooltipManualReady', 'Force-sync historical orders, position records, and PnL metrics immediately.')
        }
        rows={
          useMockData
            ? [
                { label: 'Sync Status', value: t('common.sync.syncDisabled', 'Disabled') },
                { label: 'Reason', value: t('common.sync.simulationMode', 'Simulation Mode') }
              ]
            : [
                { label: 'Global Cooldown', value: '60 seconds' },
                { label: 'Status', value: cooldownLeft > 0 ? 'Locked' : 'Ready' }
              ]
        }
      >
        <button
          onClick={handleManualSync}
          disabled={cooldownLeft > 0 || isSyncing || useMockData}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium transition-all duration-200 select-none ${
            cooldownLeft > 0 || isSyncing || useMockData
              ? 'bg-surface text-fg-muted border-line cursor-not-allowed opacity-60'
              : 'bg-elevated border-line text-fg hover:bg-line hover:text-fg cursor-pointer active:scale-95'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          {useMockData ? (
            <span>{t('common.sync.syncDisabled', 'Sync Disabled')}</span>
          ) : cooldownLeft > 0 ? (
            <span>{t('common.sync.cooldown', 'Cooldown:')} <strong className="font-mono">{cooldownLeft}s</strong></span>
          ) : (
            <span>{t('common.sync.syncNow', 'Sync Now')}</span>
          )}
        </button>
      </AppTooltip>
    </div>
  );
}
