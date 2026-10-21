import { useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { LogManager } from '../services/LogManager';

/**
 * Monitors user inactivity and automatically locks the API keys vault
 * when the configured timeout expires.
 */
export function useVaultAutoLock() {
  const isUnlocked = useApiKeysStore((state) => state.isUnlocked);
  const encryptedData = useApiKeysStore((state) => state.encryptedData);
  const lock = useApiKeysStore((state) => state.lock);
  const enabled = useSettingsStore((state) => state.vaultAutoLockEnabled);
  const minutes = useSettingsStore((state) => state.vaultAutoLockMinutes);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isUnlocked || !enabled || minutes <= 0 || !encryptedData) {
      return;
    }

    const timeoutMs = minutes * 60 * 1000;
    timerRef.current = setTimeout(() => {
      LogManager.system('Security.Vault', `Auto-lock triggered after ${minutes} minute(s) of inactivity.`);
      lock();
      toast('Vault auto-locked due to inactivity.', {
        icon: '🔒',
        id: 'vault-auto-lock',
        duration: 4000,
      });
    }, timeoutMs);
  }, [isUnlocked, enabled, minutes, encryptedData, lock]);

  useEffect(() => {
    if (!isUnlocked || !enabled || !encryptedData) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    resetTimer();

    // Throttled event listener to avoid overhead on frequent mouse moves
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        resetTimer();
      }, 1000); // Throttle to at most once per second
    };

    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isUnlocked, enabled, minutes, resetTimer]);
}
