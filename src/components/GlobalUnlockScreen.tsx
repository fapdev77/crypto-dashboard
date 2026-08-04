import React, { useState } from 'react';
import { ShieldAlert, Unlock, HelpCircle, Trash2 } from 'lucide-react';
import { useApiKeysStore } from '../store/apiKeysStore';
import { AppTooltip, TooltipProvider } from './ui/Tooltip';
import { LogManager } from '../services/LogManager';

export function GlobalUnlockScreen() {
  const { unlock } = useApiKeysStore();
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUnlock = async () => {
    if (!unlockPassphrase) return;
    const success = await unlock(unlockPassphrase);
    if (!success) {
      setUnlockError('Incorrect passphrase or corrupted data.');
    } else {
      setUnlockError('');
      setUnlockPassphrase('');
    }
  };

  const handleFactoryReset = () => {
    try {
      window.indexedDB.deleteDatabase('crypto-dashboard-cache');
      if (window.indexedDB.databases) {
        window.indexedDB.databases().then((dbs) => {
          for (const db of dbs) {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          }
        }).catch((e) => {
          LogManager.warn('GlobalUnlockScreen', 'Factory reset — failed to enumerate IndexedDB databases:', e);
        });
      }
    } catch (e) {
      LogManager.warn('GlobalUnlockScreen', 'Factory reset — failed to delete IndexedDB databases:', e);
    }

    window.localStorage.clear();
    window.location.reload();
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10] backdrop-blur-sm">
        <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-8 max-w-sm w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-[#FF4444]/10 rounded-full">
              <ShieldAlert className="w-8 h-8 text-[#FF4444]" />
            </div>
          </div>
          <h2 className="text-xl font-medium text-white text-center mb-2">Encrypted Storage</h2>
          <p className="text-sm text-[#8E9299] text-center mb-6">
            Your API keys are encrypted locally. Please enter your passphrase to unlock them.
          </p>
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={unlockPassphrase}
                onChange={(e) => setUnlockPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2F6BFF]"
                placeholder="Enter passphrase"
              />
              {unlockError && <p className="text-[#FF4444] text-xs mt-1">{unlockError}</p>}
            </div>
            <button
              onClick={handleUnlock}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white font-medium rounded-lg transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Unlock Keys
            </button>
          </div>

          <div className="border-t border-[#2a2b30]/60 my-5 pt-4">
            <div className="flex items-start gap-2 text-xs text-[#8E9299]">
              <div className="flex-1 leading-relaxed">
                Forgot your passphrase? No worries, You can perform a full app reset to clear local data and app will load with default settings.
              </div>
              <AppTooltip
                side="top"
                align="center"
                description={
                  <div className="space-y-1.5 text-left text-xs text-gray-300 leading-relaxed">
                    <p className="font-semibold text-white">What happens upon resetting?</p>
                    <p>A factory reset will permanently delete any API keys stored locally in this browser, custom settings and cache history.</p>
                    <p className="font-semibold text-white mt-1">How to start using again?</p>
                    <p>The app will reload automatically and will be ready to use! To connect your accounts, just register your API keys again or import the API Keys from a previously generated backup file (.enc).</p>
                  </div>
                }
              >
                <button className="text-[#2F6BFF] hover:text-[#1E56DF] p-0.5 rounded focus:outline-none shrink-0" type="button" aria-label="Reset Information">
                  <HelpCircle className="w-4 h-4" />
                </button>
              </AppTooltip>
            </div>

            {showResetConfirm ? (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                <p className="text-xs font-medium text-red-400 leading-tight">
                  Warning: This action is final and will permanently delete all local keys and saved data!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleFactoryReset}
                    className="flex-1 py-1.5 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition-colors"
                  >
                    Yes, Clear Everything
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 px-3 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] hover:text-white text-xs font-semibold rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="mt-3 w-full py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Application (Factory Reset)
              </button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
