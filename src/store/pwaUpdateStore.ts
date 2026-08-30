import { create } from 'zustand';
import { LogManager } from '../services/LogManager';

interface PwaUpdateState {
  /** Whether an updated Service Worker has installed and is waiting to activate */
  needRefresh: boolean;
  /** Whether the application content has been cached for offline use */
  offlineReady: boolean;
  /** Whether an update reload process is currently executing */
  isUpdating: boolean;
  /** Whether the user dismissed the floating notification toast for this session */
  isDismissed: boolean;
  /** Active ServiceWorkerRegistration instance */
  registration: ServiceWorkerRegistration | null;
  /** Internal updater function provided by virtual:pwa-register */
  updateServiceWorkerFn: ((reloadPage?: boolean) => Promise<void>) | null;

  setNeedRefresh: (needRefresh: boolean) => void;
  setOfflineReady: (offlineReady: boolean) => void;
  setIsDismissed: (isDismissed: boolean) => void;
  setRegistration: (registration: ServiceWorkerRegistration | null) => void;
  setUpdateServiceWorkerFn: (fn: (reloadPage?: boolean) => Promise<void>) => void;
  /**
   * Resiliently activates the waiting service worker and reloads the application.
   * Includes fallback timer and direct controllerchange listeners so the app never hangs.
   */
  triggerUpdate: () => Promise<void>;
}

export const usePwaUpdateStore = create<PwaUpdateState>((set, get) => ({
  needRefresh: false,
  offlineReady: false,
  isUpdating: false,
  isDismissed: false,
  registration: null,
  updateServiceWorkerFn: null,

  setNeedRefresh: (needRefresh: boolean) => set({ needRefresh }),
  setOfflineReady: (offlineReady: boolean) => set({ offlineReady }),
  setIsDismissed: (isDismissed: boolean) => set({ isDismissed }),
  setRegistration: (registration: ServiceWorkerRegistration | null) => set({ registration }),
  setUpdateServiceWorkerFn: (fn) => set({ updateServiceWorkerFn: fn }),

  triggerUpdate: async () => {
    const { isUpdating, updateServiceWorkerFn, registration } = get();
    if (isUpdating) return;

    set({ isUpdating: true });

    try {
      localStorage.setItem('app-updated', 'true');
    } catch {
      // Ignore localStorage access errors
    }

    LogManager.info('PWA', 'Triggering application update and reload...');

    let hasReloaded = false;
    const forceReload = () => {
      if (!hasReloaded) {
        hasReloaded = true;
        LogManager.warn('PWA', 'Executing page reload for new version');
        window.location.reload();
      }
    };

    // Safety timeout: if service worker transition or controllerchange doesn't reload within 800ms, force it
    const fallbackTimer = setTimeout(forceReload, 800);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener(
        'controllerchange',
        () => {
          clearTimeout(fallbackTimer);
          forceReload();
        },
        { once: true }
      );
    }

    try {
      if (updateServiceWorkerFn) {
        await updateServiceWorkerFn(true);
      } else if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else if (reg) {
          await reg.update().catch(() => {});
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            forceReload();
          }
        } else {
          forceReload();
        }
      } else {
        forceReload();
      }
    } catch (err) {
      LogManager.error('PWA', 'Error during updateServiceWorker execution, forcing reload', err);
      forceReload();
    }
  },
}));
