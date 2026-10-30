import React, { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Lock, Eye, EyeOff, KeyRound, AlertTriangle, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { clearLegacyUnencryptedStorage } from '../utils/vaultHelpers';
import { ExchangeIcon } from './ui/ExchangeIcon';
import toast from 'react-hot-toast';

interface MandatoryVaultMigrationScreenProps {
  legacyKeys: ApiCredentials[];
  onMigrated: () => void;
}

export function MandatoryVaultMigrationScreen({ legacyKeys, onMigrated }: MandatoryVaultMigrationScreenProps) {
  const { migrateUnencryptedKeys } = useApiKeysStore();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showConfirmPassphrase, setShowConfirmPassphrase] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const releaseInfo = typeof __APP_RELEASE_INFO__ !== 'undefined' ? __APP_RELEASE_INFO__ : null;
  const version = releaseInfo?.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.14.0');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleMigrate = async (e: React.FormEvent) => {
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
      await migrateUnencryptedKeys(passphrase, legacyKeys);
      clearLegacyUnencryptedStorage();
      toast.success(`Successfully secured ${legacyKeys.length} API connections in your local vault!`, {
        icon: '🛡️',
        duration: 4000,
      });
      onMigrated();
    } catch (err: any) {
      setError(err?.message || 'Failed to encrypt legacy credentials.');
      toast.error('Encryption migration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardLegacyKeys = () => {
    clearLegacyUnencryptedStorage();
    // Also clear keys from state if present
    useApiKeysStore.setState({ keys: [] });
    toast.success('Legacy unencrypted credentials discarded.', { icon: '🗑️' });
    setShowDiscardConfirm(false);
    onMigrated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10] overflow-y-auto">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl my-8 relative">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-amber-500 via-[#2F6BFF] to-emerald-500" />

        {/* Top Icon & Badge */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Action Required • Security Upgrade
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-1">
                Mandatory Vault Encryption
              </h2>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#8E9299] px-2 py-1 rounded bg-[#1a1b1e] border border-[#2a2b30]">
            v{version}
          </span>
        </div>

        {/* Informative Security Banner */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5 space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Legacy Plaintext Credentials Detected</span>
          </div>
          <p className="text-[#D1D5DB] text-[11px] leading-relaxed">
            We detected <strong className="text-white">{legacyKeys.length}</strong> API key connection(s) stored without encryption from a prior version. To guarantee zero-trust security and prevent unauthorized access by browser scripts or extensions, you must set a Master Passphrase to encrypt your credentials with military-grade PBKDF2 (600,000 iterations) and AES-GCM-256 before accessing the terminal.
          </p>
        </div>

        {/* Detected Keys Summary */}
        <div className="mb-5 space-y-2">
          <label className="text-xs font-medium text-[#8E9299] uppercase tracking-wider block">
            Detected Connections to Secure ({legacyKeys.length}):
          </label>
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#202125] bg-[#111216] border border-[#2a2b30] rounded-xl p-2.5">
            {legacyKeys.map((k, idx) => (
              <div key={k.id || idx} className="flex items-center justify-between pt-1.5 first:pt-0">
                <div className="flex items-center gap-2 min-w-0">
                  <ExchangeIcon exchange={k.exchange} className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold text-white truncate">{k.label || 'Unnamed Key'}</span>
                  <span className="text-[10px] font-mono text-[#8E9299] uppercase">({k.exchange})</span>
                </div>
                <span className="text-[10px] font-mono text-[#8E9299] shrink-0">
                  {k.apiKey ? `${k.apiKey.substring(0, 4)}...${k.apiKey.substring(Math.max(0, k.apiKey.length - 4))}` : '••••••••'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Passphrase Setup Form */}
        <form onSubmit={handleMigrate} className="space-y-4">
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
                placeholder="Enter master passphrase (min. 8 characters)"
                className="w-full bg-[#111216] border border-[#2a2b30] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
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
                placeholder="Repeat master passphrase"
                className="w-full bg-[#111216] border border-[#2a2b30] rounded-xl px-3.5 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
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

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !passphrase || passphrase.length < 8 || passphrase !== confirmPassphrase}
              className="w-full flex-1 py-3 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-[#2F6BFF]/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Encrypting Credentials...' : 'Encrypt Keys & Unlock Terminal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Secondary Option: Discard Old Keys */}
        <div className="mt-6 pt-4 border-t border-[#2a2b30]/80 flex items-center justify-between text-xs">
          <span className="text-[#8E9299]">Don&apos;t need these credentials?</span>
          <button
            type="button"
            onClick={() => setShowDiscardConfirm(true)}
            className="text-[#8E9299] hover:text-rose-400 transition-colors flex items-center gap-1.5 underline"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Discard keys & start fresh</span>
          </button>
        </div>

        {/* Discard Confirmation Dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 rounded-2xl animate-in fade-in-0">
            <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-5 max-w-xs w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Discard Legacy Credentials?</h3>
                <p className="text-xs text-[#8E9299] mt-1 leading-relaxed">
                  This will permanently delete the {legacyKeys.length} unencrypted API keys from your browser storage. You will need to re-add them after setting up a vault.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2 bg-[#1e1f24] hover:bg-[#2a2b30] text-gray-300 rounded-lg text-xs font-semibold border border-[#2a2b30] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDiscardLegacyKeys}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  Yes, Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
