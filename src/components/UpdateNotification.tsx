import React, { useEffect, useState, useRef, useCallback } from 'react';
import { LogManager } from '../services/LogManager';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles, ArrowRight, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePwaUpdateStore } from '../store/pwaUpdateStore';

const AUTO_UPDATE_DELAY_MS = 5000;
const TICK_INTERVAL_MS = 50;

export function UpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      LogManager.info('ServiceWorker', 'Service Worker Registered:', r);
      if (r) {
        usePwaUpdateStore.getState().setRegistration(r);
        // Periodic check every 60 minutes
        setInterval(() => {
          r.update().catch((e) => LogManager.error('ServiceWorker', 'Periodic update check failed', e));
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error: any) {
      LogManager.error('ServiceWorker', 'Service Worker registration error', error);
    },
  });

  const {
    isUpdating,
    isDismissed,
    registration,
    setNeedRefresh: setNeedRefreshStore,
    setOfflineReady: setOfflineReadyStore,
    setIsDismissed,
    setUpdateServiceWorkerFn,
    triggerUpdate,
  } = usePwaUpdateStore();

  const [timeLeftMs, setTimeLeftMs] = useState(AUTO_UPDATE_DELAY_MS);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize SW states to global store
  useEffect(() => {
    setNeedRefreshStore(needRefresh);
  }, [needRefresh, setNeedRefreshStore]);

  useEffect(() => {
    setOfflineReadyStore(offlineReady);
  }, [offlineReady, setOfflineReadyStore]);

  useEffect(() => {
    setUpdateServiceWorkerFn(updateServiceWorker);
  }, [updateServiceWorker, setUpdateServiceWorkerFn]);

  // Tab visibility update check
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && registration) {
        registration.update().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [registration]);

  // Toast confirmation after successful update
  useEffect(() => {
    if (localStorage.getItem('app-updated') === 'true') {
      toast.success('App updated to the latest version!', {
        duration: 5000,
        position: 'bottom-center',
        style: {
          background: '#1a1b1e',
          color: '#e5e7eb',
          border: '1px solid #2a2b30',
        },
      });
      localStorage.removeItem('app-updated');
    }
  }, []);

  // Countdown timer for automatic update
  useEffect(() => {
    if (!needRefresh || isDismissed || isUpdating) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (isPaused) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= TICK_INTERVAL_MS) {
          if (timerRef.current) clearInterval(timerRef.current);
          triggerUpdate();
          return 0;
        }
        return prev - TICK_INTERVAL_MS;
      });
    }, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [needRefresh, isDismissed, isUpdating, isPaused, triggerUpdate]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setNeedRefresh(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [setIsDismissed, setNeedRefresh]);

  const handleViewChangelog = () => {
    window.dispatchEvent(
      new CustomEvent('navigate-to-tab', {
        detail: { tab: 'settings', targetId: 'version-info-card' },
      })
    );
  };

  if (!needRefresh || isDismissed) return null;

  const progressPercent = Math.max(0, Math.min(100, (timeLeftMs / AUTO_UPDATE_DELAY_MS) * 100));
  const secondsRemaining = Math.max(1, Math.ceil(timeLeftMs / 1000));

  return (
    <div
      className="fixed bottom-12 left-4 right-4 md:left-auto md:w-96 bg-[#1a1b1e] border border-[#2a2b30] rounded-xl shadow-2xl z-[9999] overflow-hidden shadow-black/80 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alertdialog"
      aria-labelledby="pwa-update-title"
    >
      <div className="p-4 flex items-start gap-3.5">
        <div className="bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 p-2.5 rounded-lg text-[#2F6BFF] shrink-0">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 id="pwa-update-title" className="text-[14px] font-semibold text-white tracking-wide">
              Update Available
            </h3>
            {isPaused ? (
              <span className="text-[10px] font-mono font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-400/20">
                <Pause className="w-2.5 h-2.5" /> Paused
              </span>
            ) : (
              <span className="text-[10px] font-mono text-gray-400">
                in {secondsRemaining}s
              </span>
            )}
          </div>
          <p className="text-xs text-gray-300 leading-relaxed mb-2">
            A new version with performance improvements and updates is ready.
          </p>
          <button
            onClick={handleViewChangelog}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2F6BFF] hover:text-blue-300 transition-colors cursor-pointer group"
          >
            <span>View Version & Changelog</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white transition-colors shrink-0 p-1.5 hover:bg-[#2a2b30] rounded-md cursor-pointer"
          aria-label="Dismiss notification"
          title="Dismiss (Do not update now)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar for Auto-Update */}
      <div className="h-1 w-full bg-[#2a2b30]/60 relative overflow-hidden">
        <div
          className={`h-full transition-[width] duration-75 ease-linear ${
            isPaused ? 'bg-amber-400' : 'bg-[#2F6BFF]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex border-t border-[#2a2b30] divide-x divide-[#2a2b30] bg-[#16171a]">
        <button
          onClick={handleDismiss}
          className="flex-1 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-[#2a2b30]/50 transition-colors cursor-pointer"
        >
          Not Now
        </button>
        <button
          onClick={() => triggerUpdate()}
          disabled={isUpdating}
          className="flex-1 py-2.5 text-xs font-medium text-[#2F6BFF] hover:text-blue-300 hover:bg-[#2a2b30]/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
        </button>
      </div>
    </div>
  );
}
