import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, X, ArrowRight, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { useApiKeysStore } from '../store/apiKeysStore';
import toast from 'react-hot-toast';

interface VaultSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reason?: string;
}

export function VaultSetupModal({ isOpen, onClose, onSuccess, reason }: VaultSetupModalProps) {
  const { initializeVault } = useApiKeysStore();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassphrase('');
      setConfirmPassphrase('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passphrase || passphrase.length < 8) {
      setError('Master Passphrase must be at least 8 characters long.');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match. Please verify both fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await initializeVault(passphrase);
      toast.success('Security Vault activated and unlocked!', {
        icon: '🛡️',
        duration: 3500,
      });
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize security vault.');
      toast.error('Vault setup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col gap-4">
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2F6BFF] via-emerald-500 to-[#2F6BFF]" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#2F6BFF]/10 border border-[#2F6BFF]/25 flex items-center justify-center text-[#2F6BFF] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Activate Security Vault</h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Zero-Trust
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">Client-side PBKDF2 + AES-GCM-256</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8E9299] hover:text-white hover:bg-[#202125] rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason Banner if triggered from specific action */}
        {reason && (
          <div className="p-3 bg-[#2F6BFF]/10 border border-[#2F6BFF]/25 rounded-xl text-xs text-[#93C5FD] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block text-white mb-0.5">Setup Required</span>
              {reason}
            </div>
          </div>
        )}

        {/* Informative text */}
        <p className="text-xs text-[#8E9299] leading-relaxed">
          To ensure maximum safety, real API keys and the PIKA AI auditor require an active vault. Your master passphrase encrypts all sensitive data strictly within your local browser memory and storage.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-1.5">
              Create Master Passphrase <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassphrase ? 'text' : 'password'}
                required
                minLength={8}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase (min. 8 characters)"
                className="w-full bg-[#111216] border border-[#2a2b30] rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-1.5">
              Confirm Master Passphrase <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassphrase ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Confirm your passphrase"
                className="w-full bg-[#111216] border border-[#2a2b30] rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassphrase(!showConfirmPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white transition-colors"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 border border-[#2a2b30] hover:bg-[#202125] text-[#8E9299] hover:text-white rounded-xl text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !passphrase || passphrase.length < 8 || passphrase !== confirmPassphrase}
              className="flex-1 py-2.5 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#2F6BFF]/20 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Encrypting Vault...' : 'Activate Vault & Continue'}</span>
              <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
