import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LogManager } from '../services/LogManager';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles, ArrowRight, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePwaUpdateStore } from '../store/pwaUpdateStore';

const AUTO_UPDATE_DELAY_MS = 5000;
const TICK_INTERVAL_MS = 50;

export function UpdateNotification() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
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
  const [isCountdownCancelled, setIsCountdownCancelled] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize SW states to global store
  useEffect(() => {
    if (needRefresh) {
      setNeedRefreshStore(true);
    }
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
      toast.success(t('toasts.appUpdated', 'App updated to the latest version!'), {
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

  // Cancel countdown handler
  const cancelCountdown = useCallback(() => {
    if (!isCountdownCancelled) {
      setIsCountdownCancelled(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isCountdownCancelled]);

  // Countdown timer for automatic update
  useEffect(() => {
    if (!needRefresh || isDismissed || isUpdating || isCountdownCancelled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= TICK_INTERVAL_MS) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          triggerUpdate();
          return 0;
        }
        return prev - TICK_INTERVAL_MS;
      });
    }, TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [needRefresh, isDismissed, isUpdating, isCountdownCancelled, triggerUpdate]);

  const handleDismiss = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDismissed(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [setIsDismissed]);

  const handleViewChangelog = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelCountdown();
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
      className="fixed bottom-12 left-4 right-4 md:left-auto md:w-96 bg-elevated border border-line rounded-xl shadow-2xl z-[9999] overflow-hidden shadow-black/80 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 cursor-default"
      onMouseEnter={cancelCountdown}
      onClick={cancelCountdown}
      role="alertdialog"
      aria-labelledby="pwa-update-title"
    >
      <div className="p-4 flex items-start gap-3.5">
        <div className="bg-accent/10 border border-accent/20 p-2.5 rounded-lg text-accent shrink-0">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 id="pwa-update-title" className="text-[14px] font-semibold text-fg tracking-wide">
              {t('updateNotification.title', 'Update Available')}
            </h3>
            {!isCountdownCancelled && (
              <span className="text-[10px] font-mono text-fg-muted">
                {t('updateNotification.countdown', 'in {{seconds}}s', { seconds: secondsRemaining })}
              </span>
            )}
          </div>
          <p className="text-xs text-fg leading-relaxed mb-2">
            {t('updateNotification.description', 'A new version with performance improvements and updates is ready.')}
          </p>
          <button
            onClick={handleViewChangelog}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:text-blue-300 transition-colors cursor-pointer group"
          >
            <span>{t('updateNotification.viewChangelog', 'View Version & Changelog')}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-fg-muted hover:text-fg transition-colors shrink-0 p-1.5 hover:bg-line rounded-md cursor-pointer"
          aria-label={t('updateNotification.dismissAria', 'Dismiss notification')}
          title={t('updateNotification.dismissTitle', 'Dismiss (Do not update now)')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar for Auto-Update (hidden when countdown is cancelled) */}
      {!isCountdownCancelled && (
        <div className="h-1 w-full bg-line/60 relative overflow-hidden">
          <div
            className="h-full bg-accent transition-[width] duration-75 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex border-t border-line divide-x divide-line bg-surface">
        <button
          onClick={handleDismiss}
          className="flex-1 py-2.5 text-xs font-medium text-fg-muted hover:text-fg hover:bg-line/50 transition-colors cursor-pointer"
        >
          {t('updateNotification.notNow', 'Not Now')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerUpdate();
          }}
          disabled={isUpdating}
          className="flex-1 py-2.5 text-xs font-medium text-accent hover:text-blue-300 hover:bg-line/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>
            {isUpdating
              ? t('updateNotification.updating', 'Updating...')
              : t('updateNotification.updateNow', 'Update Now')}
          </span>
        </button>
      </div>
    </div>
  );
}
