import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, CheckCircle2, Clock, Play } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { AppTooltip } from './Tooltip';
import { formatTimeOnly } from '../../utils/dateTimeHelper';

interface StatusAndSyncBadgeProps {
  isSyncing: boolean;
  syncMessage?: string | null;
  className?: string;
  /** Override the auto-sync interval in ms. Defaults to historyCacheInterval (minutes) from settingsStore. */
  overrideIntervalMs?: number;
  /** Override the last sync time timestamp */
  overrideLastSyncTime?: number;
  /** Override the next scheduled sync time timestamp */
  overrideNextSyncTime?: number;
  /** Override the manual sync click handler */
  onManualSync?: () => void;
}

export function StatusAndSyncBadge({ 
  isSyncing, 
  syncMessage, 
  className = '', 
  overrideIntervalMs,
  overrideLastSyncTime,
  overrideNextSyncTime,
  onManualSync
}: StatusAndSyncBadgeProps) {
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
      if (overrideLastSyncTime === undefined) {
        setLastSyncTime(Date.now());
      }
    }
    wasSyncingRef.current = isSyncing;
  }, [isSyncing, setLastSyncTime, overrideLastSyncTime]);

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
    : 'Pending...';

  // Format last sync time safely
  const formattedLastSync = actualLastSync > 0 
    ? formatTimeOnly(actualLastSync)
    : 'Never';

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
        description="Current synchronization status of the cached historical records with the API endpoints of connected exchanges."
        rows={[
          { label: 'Status', value: isSyncing ? 'Synchronizing...' : 'SWR Cache Loaded' },
          { label: 'Signal', value: isSyncing ? 'Fetching REST' : 'Up to Date' }
        ]}
      >
        <div 
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium transition-all duration-300 select-none ${
            isSyncing 
              ? 'bg-[#2F6BFF]/10 text-[#2F6BFF] border-[#2F6BFF]/20' 
              : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
          }`}
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="truncate max-w-[200px]">{syncMessage || 'Syncing...'}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#10B981]" />
              <span>Up to Date</span>
            </>
          )}
        </div>
      </AppTooltip>

      {/* 2. Last Sync & Next Update Countdown Badge */}
      <AppTooltip
        description="Automatic cache renewal schedule. Background worker fetches incremental updates on the configured interval."
        rows={[
          { label: 'Interval Settings', value: overrideIntervalMs ? `${Math.round(overrideIntervalMs / 60000)} min` : `${historyCacheInterval} min` },
          { label: 'Last Completed', value: formattedLastSync },
          { label: 'Next Scheduled', value: formatTimeOnly(nextSyncTime) }
        ]}
      >
        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-[#2a2b30] bg-[#1a1b1e] text-[#8E9299] select-none">
          <Clock className="w-3.5 h-3.5 shrink-0 text-[#8E9299]" />
          <span>Last sync: <strong className="text-gray-300 font-mono">{formattedLastSync}</strong></span>
          <span className="text-[#2a2b30] font-mono">|</span>
          <span>Next auto: <strong className="text-gray-300 font-mono">{nextSyncStr}</strong></span>
        </div>
      </AppTooltip>

      {/* 2b. Simulation Mode Badge */}
      {useMockData && (
        <AppTooltip
          description="The application is currently running in Simulation Mode using offline mock data. Real-time API calls are offline."
          rows={[
            { label: 'Mode', value: 'Simulation' },
            { label: 'Engine', value: 'Mock Data' }
          ]}
        >
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-500 font-medium select-none animate-pulse">
            <Play className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span>Simulation Mode</span>
          </div>
        </AppTooltip>
      )}

      {/* 3. Manual Sync Trigger Button with 1-min Cooldown */}
      <AppTooltip
        description={
          useMockData
            ? "Manual synchronization is disabled while running in Simulation Mode."
            : cooldownLeft > 0 
              ? `Manual sync is locked to protect exchange API rate-limits. Please wait ${cooldownLeft}s.`
              : "Force-sync historical orders, position records, and PnL metrics immediately."
        }
        rows={
          useMockData
            ? [
                { label: 'Sync Status', value: 'Disabled' },
                { label: 'Reason', value: 'Simulation Mode' }
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
              ? 'bg-[#151619] text-gray-500 border-[#2a2b30] cursor-not-allowed opacity-60'
              : 'bg-[#1a1b1e] border-[#2a2b30] text-gray-300 hover:bg-[#2a2b30] hover:text-white cursor-pointer active:scale-95'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
          {useMockData ? (
            <span>Sync Disabled</span>
          ) : cooldownLeft > 0 ? (
            <span>Cooldown: <strong className="font-mono">{cooldownLeft}s</strong></span>
          ) : (
            <span>Sync Now</span>
          )}
        </button>
      </AppTooltip>
    </div>
  );
}
