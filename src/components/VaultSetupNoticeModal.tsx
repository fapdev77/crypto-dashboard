import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, X, ArrowRight, Lock } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface VaultSetupNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigureNow: () => void;
}

export function VaultSetupNoticeModal({ isOpen, onClose, onConfigureNow }: VaultSetupNoticeModalProps) {
  const { showVaultSetupNoticeOnStartup, setShowVaultSetupNoticeOnStartup } = useSettingsStore();
  const [timeLeft, setTimeLeft] = useState(5);
  const isPausedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(5);
      return;
    }

    setTimeLeft(5);
    const interval = setInterval(() => {
      if (!isPausedRef.current) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col gap-4"
        onMouseEnter={() => { isPausedRef.current = true; }}
        onMouseLeave={() => { isPausedRef.current = false; }}
      >
        {/* Progress bar line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2a2b30]">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-[#2F6BFF] transition-all duration-1000 ease-linear"
            style={{ width: `${(timeLeft / 5) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">Local Vault Not Initialized</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {timeLeft}s
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">Recommended Zero-Trust Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#202125] rounded-lg transition-colors"
            aria-label="Close notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-xs text-[#8E9299] leading-relaxed">
          Your key vault does not have a master passphrase configured yet. Enable local encryption (PBKDF2 600k iterations + AES-GCM-256) to protect your credentials against unauthorized local access.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={() => {
              onClose();
              onConfigureNow();
            }}
            className="flex-1 py-2 px-3.5 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-[#2F6BFF]/20"
          >
            <Lock className="w-3.5 h-3.5" />
            Configure Vault Now
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
          <button
            onClick={onClose}
            className="py-2 px-3 border border-[#2a2b30] hover:bg-[#202125] text-[#8E9299] hover:text-white rounded-lg text-xs font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>

        {/* Footer Toggle */}
        <div className="flex items-center justify-between border-t border-[#2a2b30] pt-3 mt-1 select-none">
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showVaultSetupNoticeOnStartup}
                onChange={(e) => setShowVaultSetupNoticeOnStartup(e.target.checked)}
              />
              <div className="w-8 h-4 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#2F6BFF]" />
            </label>
            <span className="text-[11px] text-[#8E9299]">Show notice on startup</span>
          </div>
          <span className="text-[10px] text-[#8E9299]/70">Can be re-enabled in Settings</span>
        </div>
      </div>
    </div>
  );
}
