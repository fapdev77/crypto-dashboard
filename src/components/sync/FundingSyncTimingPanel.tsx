import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useLogStore } from '../../store/logStore';
import { useFundingStore } from '../../store/fundingStore';
import { clearFundingSummariesCache } from '../../services/historyCache';
import { AppTooltip } from '../ui/Tooltip';
import { formatTimeOnly as formatTime, formatTimeUTC, timeAgo } from '../../utils/dateTimeHelper';
import {
  Clock, BarChart3, Zap, AlertTriangle,
  RefreshCw, Database, Play, Loader2, Trash2, Info, Bell,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────

interface ExchangeTiming {
  name: string;
  synced: number;
  stale: number;
  totalSec: number;
  avgMs: number;
}

interface OverallTiming {
  fetchSec: number;
  writeSec: number;
  totalSec: number;
  symbols: number;
}

// ── Parsing (fallback when persisted data is stale) ───────────────

function parseExchangeLine(msg: string): ExchangeTiming | null {
  const parts = msg.split(' | ');
  if (parts.length < 4) return null;

  const name = parts[0].trim().toLowerCase();
  const syncedMatch = parts[1].match(/(\d+)\s+synced\s*\/\s*(\d+)\s+stale/);
  const totalMatch = parts[2].match(/([\d.]+)s\s+total/);
  const avgMatch = parts[3].match(/(\d+)ms\s+avg/);

  if (!syncedMatch || !totalMatch || !avgMatch) return null;

  return {
    name,
    synced: parseInt(syncedMatch[1], 10),
    stale: parseInt(syncedMatch[2], 10),
    totalSec: parseFloat(totalMatch[1]),
    avgMs: parseInt(avgMatch[1], 10),
  };
}

function parseOverallLine(msg: string): OverallTiming | null {
  const fetchMatch = msg.match(/Fetch:\s*([\d.]+)s/);
  const writeMatch = msg.match(/Write:\s*([\d.]+)s/);
  const totalMatch = msg.match(/Total:\s*([\d.]+)s/);
  const symMatch = msg.match(/(\d+)\s+symbols/);

  if (!fetchMatch || !writeMatch || !totalMatch || !symMatch) return null;

  return {
    fetchSec: parseFloat(fetchMatch[1]),
    writeSec: parseFloat(writeMatch[1]),
    totalSec: parseFloat(totalMatch[1]),
    symbols: parseInt(symMatch[1], 10),
  };
}

// ── Helpers ───────────────────────────────────────────────────────

const EXCHANGE_COLORS: Record<string, string> = {
  bybit: '#ff9c2e',
  okx: '#fafafa',
  bitget: '#03aac7',
};

// ── Hook: live countdown for next scheduled sync ──────────────────

function useCountdown(target: number): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (target <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (target <= 0) return '—';
  const diff = target - now;
  if (diff <= 0) return 'Agora';
  const min = Math.floor(diff / 60_000);
  const sec = Math.floor((diff % 60_000) / 1000);
  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

// ── Component ─────────────────────────────────────────────────────

export function FundingSyncTimingPanel() {
  const entries = useLogStore(s => s.entries);
  const {
    isSyncing,
    lastSyncPerformance,
    lastExchangeTimings,
    nextFundingTime,
    nextScheduledSyncTime,
  } = useFundingStore();

  const countdown = useCountdown(nextScheduledSyncTime);

  // ── Imminent funding detection ──────────────────────────────────
  // Recomputes on every render (~1s via useCountdown timer)
  const imminentDiff = nextFundingTime - Date.now();
  const isFundingImminent5min = nextFundingTime > 0 && imminentDiff > 0 && imminentDiff < 5 * 60 * 1000;
  const imminent1min = nextFundingTime > 0 && imminentDiff > 0 && imminentDiff < 60 * 1000;

  // Ref to show the 1-minute toast only once per funding cycle
  const fundingToastShownRef = useRef<number>(0);
  useEffect(() => {
    // Reset when nextFundingTime changes to a new cycle
    if (fundingToastShownRef.current !== nextFundingTime) {
      if (imminent1min) {
        fundingToastShownRef.current = nextFundingTime;
        toast(
          `🔔 Funding settlement in less than 1 minute! Auto-sync will trigger shortly at ${formatTime(nextScheduledSyncTime)}.`,
          {
            id: 'funding-imminent',
            duration: 8000,
            icon: '⏰',
            style: {
              background: '#1a1b1e',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.3)',
            },
          },
        );
      }
    }
  }, [nextFundingTime, imminent1min, nextScheduledSyncTime]);

  // ── Local loading state ─────────────────────────────────────────
  const [isClearing, setIsClearing] = useState(false);

  // ── Run sync handler ────────────────────────────────────────────
  const handleRunSync = useCallback(() => {
    toast.success('Starting funding rate sync...', { id: 'funding-sync-start' });
    // Reset the sync guard so forceSync bypasses the interval check.
    useFundingStore.getState().setLastHistoryFetch(0);
    // The useFundingSync hook listens for this event and calls forceSync().
    window.dispatchEvent(new CustomEvent('funding-cache-cleared'));
  }, []);

  // ── Clear cache + sync handler ──────────────────────────────────
  const handleClearAndSync = useCallback(async () => {
    toast.success('Clearing funding cache and starting fresh sync...', { id: 'funding-clear-sync' });
    setIsClearing(true);
    try {
      await clearFundingSummariesCache();
      useFundingStore.getState().setLastHistoryFetch(0);
      window.dispatchEvent(new CustomEvent('funding-cache-cleared'));
    } catch (err: any) {
      toast.error(`Failed to clear funding cache: ${err?.message || 'Unknown error'}`, { id: 'err-funding-clear-sync' });
    } finally {
      setIsClearing(false);
    }
  }, []);

  // ── Merge persisted data (primary) + live log entries (fallback) ──
  const { exchangeTimings, overallTiming, lastSyncTime } = useMemo(() => {
    // 1. Start with persisted data from store (survives page reload)
    const exchanges: ExchangeTiming[] = (lastExchangeTimings || []).map(ex => ({
      name: ex.name,
      synced: ex.synced,
      stale: ex.stale,
      totalSec: ex.totalSec,
      avgMs: ex.avgMs,
    }));

    let overall: OverallTiming | null = null;
    let last: number = 0;

    if (lastSyncPerformance) {
      overall = {
        fetchSec: lastSyncPerformance.fetchSec,
        writeSec: lastSyncPerformance.writeSec,
        totalSec: lastSyncPerformance.totalSec,
        symbols: lastSyncPerformance.symbols,
      };
      last = lastSyncPerformance.timestamp;
    }

    // 2. Override with live log entries if they contain newer data
    //    (log entries are more recent than persisted data during a session)
    const timingEntries = entries.filter(e => e.source === 'FundingTiming');
    const liveExchanges: ExchangeTiming[] = [];
    let liveOverall: OverallTiming | null = null;
    let liveLast: number = 0;

    for (let i = timingEntries.length - 1; i >= 0; i--) {
      const e = timingEntries[i];
      if (e.level === 'INFO') {
        const parsed = parseExchangeLine(e.message);
        if (parsed && !liveExchanges.find(x => x.name === parsed.name)) {
          liveExchanges.push(parsed);
        }
      } else if (e.level === 'SYSTEM' && !liveOverall) {
        liveOverall = parseOverallLine(e.message);
        liveLast = e.timestamp;
      }
      if (liveExchanges.length >= 3 && liveOverall && liveLast > 0) break;
    }

    // 3. Use live data if it has a more recent SYSTEM entry (fresh sync this session)
    if (liveOverall && liveLast > last) {
      overall = liveOverall;
      last = liveLast;
      // Only override exchange timings if we have live data
      if (liveExchanges.length > 0) {
        exchanges.length = 0;
        exchanges.push(...liveExchanges);
      }
    }

    return { exchangeTimings: exchanges, overallTiming: overall, lastSyncTime: last };
  }, [entries, lastSyncPerformance, lastExchangeTimings]);

  const hasData = exchangeTimings.length > 0 || overallTiming;

  return (
    <div className="space-y-3">
      <div className="border-t border-[#2a2b30] pt-4" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-orange-400" />
          <AppTooltip description="Displays real-time and historical performance data for the background synchronization of funding rates.">
            <h4 className="text-white font-medium text-sm cursor-help border-b border-dashed border-[#8E9299]/50">Sync Performance</h4>
          </AppTooltip>
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          {/* Clear Cache + Sync button */}
          <AppTooltip description="Clears the local database of historical funding rates and immediately triggers a fresh synchronization.">
            <button
              onClick={handleClearAndSync}
              disabled={isClearing || isSyncing}
              className="flex items-center gap-1.5 bg-red-400/10 hover:bg-red-400/20 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 border border-red-400/20 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-help"
            >
              {isClearing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3" />
              )}
              {isClearing ? 'Clearing...' : 'Clear + Sync'}
            </button>
          </AppTooltip>
          {/* Run Sync Now button */}
          <AppTooltip description="Manually trigger a background sync of funding rates across all connected exchanges without clearing existing data.">
            <button
              onClick={handleRunSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 bg-orange-400/10 hover:bg-orange-400/20 disabled:opacity-40 disabled:cursor-not-allowed text-orange-400 border border-orange-400/20 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-help"
            >
              {isSyncing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isSyncing ? 'Syncing...' : 'Run Sync'}
            </button>
          </AppTooltip>
          {/* Last sync timestamp */}
          {lastSyncTime > 0 && (
            <span className="text-[10px] font-mono text-[#8E9299] flex items-center gap-1">
              Last Sync:
              <Clock className="w-3 h-3" />
              {formatTime(lastSyncTime)} ({timeAgo(lastSyncTime)})
            </span>
          )}
        </div>
      </div>

      {/* Next funding → auto-sync countdown */}
      {
        nextScheduledSyncTime > 0 && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 border transition-all duration-500 ${isFundingImminent5min
            ? 'bg-amber-400/5 border-amber-400/40 shadow-[0_0_12px_-4px_rgba(251,191,36,0.3)]'
            : 'bg-[#1a1b1e] border-[#2a2b30]/50'
            }`}>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                {isFundingImminent5min ? (
                  <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                )}
                <span className="text-xs text-[#8E9299] truncate">
                  📅 Next funding{' '}
                  <span className={`font-mono ${isFundingImminent5min ? 'text-amber-300' : 'text-white'}`}>
                    {formatTime(nextFundingTime)}
                  </span>
                  {' '}→ Sync{' '}
                  <span className={`font-mono ${isFundingImminent5min ? 'text-amber-300' : 'text-orange-400'}`}>
                    {formatTime(nextScheduledSyncTime)}
                  </span>
                </span>
                <AppTooltip
                  description={isFundingImminent5min
                    ? 'Funding settlement is imminent! The auto-sync will trigger approximately 1 minute after the settlement completes.'
                    : 'Auto-syncs 1 minute after each funding settlement (every 8h) so all exchanges have updated data before fetching.'
                  }
                  rows={[
                    { label: 'Local (BR)', value: `${formatTime(nextFundingTime)} → ${formatTime(nextScheduledSyncTime)}` },
                    { label: 'UTC', value: `${formatTimeUTC(nextFundingTime)} → ${formatTimeUTC(nextScheduledSyncTime)}` },
                  ]}
                  side="top"
                  align="start"
                >
                  <span className="cursor-help shrink-0">
                    <Info className={`w-3 h-3 transition-colors ${isFundingImminent5min ? 'text-amber-400' : 'text-[#8E9299] hover:text-orange-400'}`} />
                  </span>
                </AppTooltip>
              </div>
              {/* UTC secondary display */}
              <div className="flex items-center gap-2 pl-6">
                <span className={`text-[10px] font-mono ${isFundingImminent5min ? 'text-amber-400/60' : 'text-[#6B7280]'}`}>
                  {formatTimeUTC(nextFundingTime)} UTC → {formatTimeUTC(nextScheduledSyncTime)} UTC
                </span>
              </div>
            </div>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-md font-medium shrink-0 ml-2 transition-colors duration-500 ${isFundingImminent5min
              ? 'text-amber-300 bg-amber-400/15'
              : 'text-orange-400 bg-orange-400/10'
              }`}>
              {isSyncing ? 'Syncing now' : isFundingImminent5min ? `Funding in ${countdown}` : `in ${countdown}`}
            </span>
          </div>
        )
      }

      {
        !hasData ? (
          <div className="flex items-center gap-2 bg-[#1a1b1e] rounded-lg px-3 py-2.5 border border-[#2a2b30]/50">
            <RefreshCw className="w-3.5 h-3.5 text-[#8E9299]" />
            <span className="text-xs text-[#8E9299]">
              No sync data yet. Run a Funding sync to see performance metrics.
            </span>
          </div>
        ) : (
          <>
            {/* Overall summary */}
            {overallTiming && (
              <div className="bg-[#1a1b1e] rounded-lg p-3 border border-[#2a2b30]/50">
                <div className="grid grid-cols-3 gap-3">
                  <AppTooltip description="Total time taken for the complete synchronization process, including fetching from all exchanges and saving to the local database.">
                    <div className="text-center cursor-help">
                      <div className="text-lg font-bold text-white font-mono">
                        {overallTiming.totalSec.toFixed(1)}s
                      </div>
                      <div className="text-[10px] text-[#8E9299] font-mono mt-0.5 border-b border-dashed border-[#8E9299]/50 w-fit mx-auto pb-0.5">Total Time</div>
                    </div>
                  </AppTooltip>

                  <AppTooltip description="Time spent actively fetching data from exchange APIs.">
                    <div className="text-center cursor-help">
                      <div className="text-lg font-bold text-orange-400 font-mono">
                        {overallTiming.fetchSec.toFixed(1)}s
                      </div>
                      <div className="text-[10px] text-[#8E9299] font-mono mt-0.5 border-b border-dashed border-[#8E9299]/50 w-fit mx-auto pb-0.5">API Fetch</div>
                    </div>
                  </AppTooltip>

                  <AppTooltip description="Time spent writing the processed data into the local IndexedDB storage.">
                    <div className="text-center cursor-help">
                      <div className="text-lg font-bold text-blue-400 font-mono">
                        {overallTiming.writeSec.toFixed(1)}s
                      </div>
                      <div className="text-[10px] text-[#8E9299] font-mono mt-0.5 border-b border-dashed border-[#8E9299]/50 w-fit mx-auto pb-0.5">DB Write</div>
                    </div>
                  </AppTooltip>
                </div>
                <div className="flex justify-center mt-2">
                  <AppTooltip description="Total number of trading pairs successfully synced across all connected exchanges.">
                    <span className="text-[10px] font-mono text-[#8E9299] bg-[#2a2b30]/50 px-2 py-0.5 rounded cursor-help">
                      {overallTiming.symbols} symbols synced
                    </span>
                  </AppTooltip>
                </div>
              </div>
            )}

            {/* Per-exchange breakdown */}
            {exchangeTimings.length > 0 && (
              <div className="space-y-1.5">
                {exchangeTimings.map(ex => {
                  const color = EXCHANGE_COLORS[ex.name] || '#8E9299';
                  const pct = ex.stale > 0 ? Math.round((ex.synced / ex.stale) * 100) : 0;
                  return (
                    <div key={ex.name} className="flex items-center gap-3 bg-[#1a1b1e] rounded px-3 py-2 border border-[#2a2b30]/30">
                      {/* Exchange indicator */}
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      {/* Name */}
                      <span className="text-xs font-bold uppercase text-white w-14 shrink-0 font-mono">
                        {ex.name}
                      </span>
                      {/* Timing bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8E9299]">
                          <AppTooltip description={`Total time spent fetching from ${ex.name}.`}>
                            <span className="cursor-help border-b border-dashed border-[#8E9299]/50">{ex.totalSec.toFixed(1)}s</span>
                          </AppTooltip>
                          <span className="text-[#8E9299]/50">|</span>
                          <AppTooltip description="Number of symbols successfully synced out of the total stale symbols that needed updates.">
                            <span className="cursor-help border-b border-dashed border-[#8E9299]/50">{ex.synced}/{ex.stale}</span>
                          </AppTooltip>
                          <span className="text-[#8E9299]/50">|</span>
                          <AppTooltip description="Average latency (in milliseconds) per API request batch.">
                            <span className="cursor-help border-b border-dashed border-[#8E9299]/50">{ex.avgMs}ms avg</span>
                          </AppTooltip>
                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-1 h-1 bg-[#2a2b30] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                      {/* Success badge */}
                      <div className="shrink-0">
                        <AppTooltip description={
                          pct >= 80 ? "Healthy sync rate. Most or all stale symbols were successfully updated." :
                            pct >= 50 ? "Degraded sync rate. Some symbols failed to update or hit rate limits." :
                              "Poor sync rate. Many symbols failed to update, possibly due to rate limits or API errors."
                        }>
                          <div className="cursor-help">
                            {pct >= 80 ? (
                              <Zap className="w-3.5 h-3.5 text-[#00C853]" />
                            ) : pct >= 50 ? (
                              <RefreshCw className="w-3.5 h-3.5 text-yellow-400" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            )}
                          </div>
                        </AppTooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legacy entries indicator */}
            {exchangeTimings.length > 0 && exchangeTimings.length < 3 && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#8E9299] font-mono">
                <Database className="w-3 h-3" />
                <span>Showing {exchangeTimings.length}/3 exchanges (recent sync data only)</span>
              </div>
            )}
          </>
        )
      }
    </div >
  );
}
