import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, AlertTriangle, Shield, Check, FileDown, FileUp, Lock, Unlock, Eye, EyeOff, KeyRound, Clock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useApiKeysStore, ApiCredentials, Exchange } from '../store/apiKeysStore';
import { useSettingsStore } from '../store/settingsStore';
import { encryptData, decryptData } from '../utils/cryptoLib';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AccountTypeBadge } from './ui/AccountTypeBadge';
import toast from 'react-hot-toast';

type Tab = 'local_security' | 'export' | 'import';

export function SecurityBackupCard() {
  const { keys, isEncrypted, isInitialized, isUnlocked, encryptedData, initializeVault, changePassphrase, lock, importKeys } = useApiKeysStore();
  const {
    vaultAutoLockEnabled,
    setVaultAutoLockEnabled,
    vaultAutoLockMinutes,
    setVaultAutoLockMinutes,
    showVaultSetupNoticeOnStartup,
    setShowVaultSetupNoticeOnStartup,
  } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<Tab>('local_security');

  // Export State
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [showExportPassphrase, setShowExportPassphrase] = useState(false);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set(keys.map(k => k.id)));
  
  // Import State
  const [importPassphrase, setImportPassphrase] = useState('');
  const [showImportPassphrase, setShowImportPassphrase] = useState(false);
  const [importedData, setImportedData] = useState<ApiCredentials[] | null>(null);
  const [importError, setImportError] = useState('');
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'overwrite' | 'rename'>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Security & Passphrase Management State
  const [localPassphrase, setLocalPassphrase] = useState('');
  const [showLocalPassphrase, setShowLocalPassphrase] = useState(false);
  const [localSecurityError, setLocalSecurityError] = useState('');

  const [isChangingPassphrase, setIsChangingPassphrase] = useState(false);
  const [oldPassphrase, setOldPassphrase] = useState('');
  const [showOldPassphrase, setShowOldPassphrase] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState('');
  const [showNewPassphrase, setShowNewPassphrase] = useState(false);
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState('');
  const [changeError, setChangeError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Sync selectedForExport when keys list changes
  useEffect(() => {
    setSelectedForExport(new Set(keys.map(k => k.id)));
  }, [keys]);

  const handleToggleExport = (id: string) => {
    const next = new Set(selectedForExport);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedForExport(next);
  };

  const handleExport = async () => {
    if (!exportPassphrase) return;
    const keysToExport = keys.filter(k => selectedForExport.has(k.id));
    try {
      const encrypted = await encryptData(JSON.stringify(keysToExport), exportPassphrase);
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crypto_dashboard_keys_${new Date().toISOString().split('T')[0]}.enc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportPassphrase('');
      toast.success('API keys exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export API keys');
    }
  };

  const handleFileChange = () => {
    setImportedData(null);
    setImportError('');
  };

  const handleDecryptImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setImportError('Please select a backup file first.');
      toast.error('No backup file selected');
      return;
    }
    if (!importPassphrase) {
      setImportError('Please enter the backup passphrase.');
      return;
    }

    try {
      const text = await file.text();
      const decrypted = await decryptData(text, importPassphrase);
      const parsed = JSON.parse(decrypted) as ApiCredentials[];
      setImportedData(parsed);
      setSelectedForImport(new Set(parsed.map(k => k.id)));
      
      // Check for conflicts
      const resolutions: Record<string, 'overwrite' | 'rename'> = {};
      const names: Record<string, string> = {};
      parsed.forEach(importedKey => {
        names[importedKey.id] = importedKey.label;
        const existsLocally = keys.find(k => k.label.trim().toLowerCase() === importedKey.label.trim().toLowerCase() && k.exchange === importedKey.exchange);
        if (existsLocally) {
          resolutions[importedKey.id] = 'rename';
          names[importedKey.id] = `${importedKey.label} (Imported)`;
        }
      });
      setConflictResolutions(resolutions);
      setCustomNames(names);
      setImportError('');
      toast.success('Backup file decrypted successfully!');
    } catch (err) {
      setImportError('Invalid passphrase or corrupted file.');
      toast.error('Failed to decrypt backup file');
    }
  };

  const executeImport = () => {
    if (!importedData) return;
    
    // Validate unique names and length
    for (const ik of importedData) {
      if (!selectedForImport.has(ik.id)) continue;
      
      const res = conflictResolutions[ik.id];
      const finalName = res === 'rename' ? (customNames[ik.id] || `${ik.label} (Imported)`) : (res === 'overwrite' ? ik.label : (customNames[ik.id] || ik.label));
      
      if (finalName.trim().length < 3) {
        setImportError(`The name "${finalName}" must have at least 3 characters.`);
        return;
      }

      if (res === 'rename' || !res) {
        const existsLocally = keys.find(k => k.label.trim().toLowerCase() === finalName.trim().toLowerCase() && k.exchange === ik.exchange);
        if (existsLocally) {
          setImportError(`The name "${finalName}" for ${ik.exchange} is already in use. Please choose a unique name or select Overwrite.`);
          return;
        }
      }
    }
    setImportError('');

    const finalKeys: ApiCredentials[] = [];
    importedData.forEach(ik => {
      if (!selectedForImport.has(ik.id)) return;
      
      const res = conflictResolutions[ik.id];
      const newKey: ApiCredentials = {
        ...ik,
        id: crypto.randomUUID(),
        accountType: ik.exchange === 'bitget' ? (ik.accountType || 'classic') : undefined,
      }; // Always generate new local ID to avoid collision
      
      if (res === 'rename') {
        newKey.label = customNames[ik.id] || `${newKey.label} (Imported)`;
      } else if (res === 'overwrite') {
        // We need to actually overwrite, meaning delete the old one.
        const existing = keys.find(k => k.label.trim().toLowerCase() === ik.label.trim().toLowerCase() && k.exchange === ik.exchange);
        if (existing) {
          useApiKeysStore.getState().removeKey(existing.id);
        }
      } else {
        newKey.label = customNames[ik.id] || newKey.label;
      }
      finalKeys.push(newKey);
    });
    
    importKeys(finalKeys);
    
    // Clear states
    setImportedData(null);
    setImportPassphrase('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('API keys imported successfully!');
  };

  const handleLockNow = () => {
    lock();
    toast.success('Vault locked. Credentials purged from memory.');
  };

  const handleInitializeVault = async () => {
    if (!localPassphrase || localPassphrase.length < 8) {
      setLocalSecurityError('Master passphrase must be at least 8 characters long.');
      return;
    }
    try {
      await initializeVault(localPassphrase);
      setLocalPassphrase('');
      setLocalSecurityError('');
      toast.success('Zero-Trust Vault initialized successfully!');
    } catch (err: any) {
      setLocalSecurityError(err.message || 'Failed to initialize vault');
      toast.error('Failed to initialize vault');
    }
  };

  const handleChangeMasterPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');

    if (!oldPassphrase) {
      setChangeError('Current master passphrase is required.');
      return;
    }
    if (newPassphrase.length < 8) {
      setChangeError('New master passphrase must have at least 8 characters.');
      return;
    }
    if (newPassphrase !== confirmNewPassphrase) {
      setChangeError('New passphrases do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const success = await changePassphrase(oldPassphrase, newPassphrase);
      if (!success) {
        setChangeError('Current passphrase incorrect or vault corrupted.');
        toast.error('Failed to update passphrase.');
      } else {
        setOldPassphrase('');
        setNewPassphrase('');
        setConfirmNewPassphrase('');
        setIsChangingPassphrase(false);
        toast.success('Master passphrase updated successfully!');
      }
    } catch (err: any) {
      setChangeError(err.message || 'Error updating passphrase.');
      toast.error('Error updating passphrase.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div id="security-settings-card" className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full scroll-mt-20">
      <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
        <Shield className="w-4 h-4 text-[#2F6BFF]" />
        Security & Backup
      </h3>
      <p className="text-[#8E9299] text-xs mb-4">Export/import credentials and manage local storage encryption</p>

      {/* Mini Tab Selectors */}
      <div className="flex border-b border-[#2a2b30] mb-4 text-xs">
        <button
          onClick={() => { setActiveTab('local_security'); setImportError(''); setImportPassphrase(''); setExportPassphrase(''); setLocalPassphrase(''); setChangeError(''); }}
          className={`flex-1 pb-2 font-medium transition-colors ${activeTab === 'local_security' ? 'text-[#2F6BFF] border-b border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
        >
          Vault & Auto-Lock
        </button>
        <button
          onClick={() => { setActiveTab('export'); setImportError(''); setImportPassphrase(''); setExportPassphrase(''); setLocalPassphrase(''); setChangeError(''); }}
          className={`flex-1 pb-2 font-medium transition-colors ${activeTab === 'export' ? 'text-[#2F6BFF] border-b border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
        >
          Export Backup
        </button>
        <button
          onClick={() => { setActiveTab('import'); setImportError(''); setImportPassphrase(''); setExportPassphrase(''); setLocalPassphrase(''); setChangeError(''); }}
          className={`flex-1 pb-2 font-medium transition-colors ${activeTab === 'import' ? 'text-[#2F6BFF] border-b border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
        >
          Import Backup
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {activeTab === 'local_security' && (
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[#00C853]">
                  <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                  <span>Zero-Trust Encrypted Vault</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${isUnlocked ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                  {isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
              <p className="text-[#8E9299] leading-relaxed text-[11px]">
                PBKDF2-SHA256 (600,000 iterations) + AES-GCM-256. API keys are decrypted only in memory and never persisted in plain text.
              </p>
              {isUnlocked && encryptedData && (
                <div className="pt-1">
                  <button
                    onClick={handleLockNow}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock Vault Now
                  </button>
                </div>
              )}
            </div>

            {/* Inactivity Auto-Lock Settings (Requested by User) */}
            <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2F6BFF]" />
                  <div>
                    <h4 className="text-white font-medium text-xs">Auto-Lock on Inactivity</h4>
                    <p className="text-[#8E9299] text-[10px]">Locks vault when idle</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={vaultAutoLockEnabled}
                    onChange={(e) => {
                      setVaultAutoLockEnabled(e.target.checked);
                      toast.success(`Vault Auto-Lock ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                    }}
                  />
                  <div className="w-9 h-5 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2F6BFF]"></div>
                </label>
              </div>

              {/* Slider 1 to 60 minutes */}
              <div className={`space-y-1.5 transition-opacity ${vaultAutoLockEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#8E9299]">Lock after inactivity:</span>
                  <span className="text-[#2F6BFF] font-mono font-semibold bg-[#2F6BFF]/10 px-2 py-0.5 rounded border border-[#2F6BFF]/20">
                    {vaultAutoLockEnabled ? `${vaultAutoLockMinutes} min` : 'Disabled'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={vaultAutoLockMinutes}
                  disabled={!vaultAutoLockEnabled}
                  onChange={(e) => setVaultAutoLockMinutes(Number(e.target.value))}
                  onPointerUp={() => toast.success(`Auto-lock interval set to ${vaultAutoLockMinutes} minute(s)`)}
                  className="w-full h-1.5 bg-[#2a2b30] rounded-lg appearance-none cursor-pointer accent-[#2F6BFF]"
                />
                <div className="flex justify-between text-[10px] text-[#8E9299] font-mono">
                  <span>1 min</span>
                  <span>15 min</span>
                  <span>30 min</span>
                  <span>60 min</span>
                </div>
              </div>
            </div>

            {/* Startup Vault Setup Alert Setting */}
            <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <div>
                    <h4 className="text-white font-medium text-xs">Startup Vault Notice</h4>
                    <p className="text-[#8E9299] text-[10px]">5-second notice on launch when vault is uninitialized</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={showVaultSetupNoticeOnStartup}
                    onChange={(e) => {
                      setShowVaultSetupNoticeOnStartup(e.target.checked);
                      toast.success(`Startup Vault Notice ${e.target.checked ? 'Enabled' : 'Disabled'}`);
                    }}
                  />
                  <div className="w-9 h-5 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2F6BFF]"></div>
                </label>
              </div>
              <p className="text-[#8E9299] text-[11px] leading-relaxed">
                Displays a subtle 5-second prompt on application startup if the local vault has not yet been initialized with a master passphrase.
              </p>
            </div>

            {/* Master Passphrase Management */}
            {isInitialized ? (
              <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-medium text-white">
                    <KeyRound className="w-3.5 h-3.5 text-[#2F6BFF]" />
                    <span>Master Passphrase</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassphrase(!isChangingPassphrase);
                      setChangeError('');
                    }}
                    className="text-[11px] text-[#2F6BFF] hover:underline"
                  >
                    {isChangingPassphrase ? 'Cancel' : 'Change Passphrase'}
                  </button>
                </div>

                {isChangingPassphrase && (
                  <form onSubmit={handleChangeMasterPassphrase} className="space-y-2 pt-1 border-t border-[#2a2b30]">
                    <div>
                      <label className="block text-[10px] text-[#8E9299] mb-0.5">Current Master Passphrase</label>
                      <div className="relative">
                        <input
                          type={showOldPassphrase ? 'text' : 'password'}
                          value={oldPassphrase}
                          onChange={(e) => setOldPassphrase(e.target.value)}
                          className="w-full bg-[#111216] border border-[#2a2b30] rounded px-2.5 py-1 pr-8 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                          placeholder="Current passphrase"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassphrase(!showOldPassphrase)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E9299]"
                        >
                          {showOldPassphrase ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#8E9299] mb-0.5">New Master Passphrase (min 8 chars)</label>
                      <div className="relative">
                        <input
                          type={showNewPassphrase ? 'text' : 'password'}
                          value={newPassphrase}
                          onChange={(e) => setNewPassphrase(e.target.value)}
                          className="w-full bg-[#111216] border border-[#2a2b30] rounded px-2.5 py-1 pr-8 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                          placeholder="New passphrase"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassphrase(!showNewPassphrase)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E9299]"
                        >
                          {showNewPassphrase ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#8E9299] mb-0.5">Confirm New Passphrase</label>
                      <input
                        type="password"
                        value={confirmNewPassphrase}
                        onChange={(e) => setConfirmNewPassphrase(e.target.value)}
                        className="w-full bg-[#111216] border border-[#2a2b30] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                        placeholder="Confirm new passphrase"
                      />
                    </div>

                    {changeError && <p className="text-[#FF4444] text-[10px]">{changeError}</p>}

                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className="w-full py-1.5 px-3 rounded text-xs font-semibold bg-[#2F6BFF] hover:bg-[#1E56DF] text-white disabled:opacity-50 transition-colors"
                    >
                      {isUpdatingPassword ? 'Re-encrypting...' : 'Update Passphrase'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs space-y-3">
                <div className="flex items-center gap-1.5 font-medium text-white">
                  <KeyRound className="w-3.5 h-3.5 text-[#2F6BFF]" />
                  <span>Set Master Passphrase</span>
                </div>
                <p className="text-[#8E9299] text-[11px]">
                  Initialize your master vault passphrase (minimum 8 characters) to encrypt your credentials.
                </p>
                <div className="relative">
                  <input
                    type={showLocalPassphrase ? 'text' : 'password'}
                    value={localPassphrase}
                    onChange={(e) => setLocalPassphrase(e.target.value)}
                    className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-1.5 pr-9 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                    placeholder="Enter at least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLocalPassphrase(!showLocalPassphrase)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299]"
                  >
                    {showLocalPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {localSecurityError && <p className="text-[#FF4444] text-[11px]">{localSecurityError}</p>}
                <button
                  onClick={handleInitializeVault}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#2F6BFF] text-white hover:bg-[#1E56DF] transition-colors"
                >
                  Initialize Secure Vault
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs">
              <h4 className="text-white font-semibold mb-1.5">Select Keys to Include</h4>
              {keys.length === 0 ? (
                <p className="text-[#8E9299]">No API keys available to export.</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {Object.entries(
                    keys.reduce((acc, k) => {
                      if (!acc[k.exchange]) acc[k.exchange] = [];
                      acc[k.exchange].push(k);
                      return acc;
                    }, {} as Record<string, ApiCredentials[]>)
                  ).map(([exchange, exchangeKeys]) => (
                    <div key={exchange} className="space-y-1">
                      <div className="text-[10px] font-medium text-[#8E9299] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <ExchangeIcon exchange={exchange as any} className="w-3.5 h-3.5" />
                        {exchange}
                      </div>
                      {exchangeKeys.map(k => (
                        <label key={k.id} className="flex items-center gap-2 p-1 hover:bg-[#202125] rounded cursor-pointer ml-1">
                          <input
                            type="checkbox"
                            checked={selectedForExport.has(k.id)}
                            onChange={() => handleToggleExport(k.id)}
                            className="w-3.5 h-3.5 rounded border-[#2a2b30] bg-[#111216] text-[#2F6BFF] focus:ring-[#2F6BFF] focus:ring-offset-0"
                          />
                          <span className="text-white text-xs truncate flex-1">{k.label}</span>
                          <AccountTypeBadge
                            exchange={k.exchange}
                            accountType={k.accountType}
                            environment={k.environment}
                            bybitRegion={k.bybitRegion}
                          />
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#8E9299] mb-1">Passphrase (Required to Decrypt/Import)</label>
                <div className="relative">
                  <input
                    type={showExportPassphrase ? 'text' : 'password'}
                    value={exportPassphrase}
                    onChange={(e) => setExportPassphrase(e.target.value)}
                    className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-1.5 pr-9 text-sm text-white focus:outline-none focus:border-[#2F6BFF]"
                    placeholder="Strong passphrase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassphrase(!showExportPassphrase)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-[#e1e2e6] transition-colors"
                  >
                    {showExportPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={!exportPassphrase || selectedForExport.size === 0}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export {selectedForExport.size} Keys
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="space-y-4">
            {!importedData ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] text-[#8E9299] mb-1">Select Backup File (.enc)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".enc"
                    className="w-full text-xs text-[#8E9299] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#1a1b1e] file:text-white hover:file:bg-[#202125] file:transition-colors file:cursor-pointer"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] text-[#8E9299] mb-1">Passphrase</label>
                  <div className="relative">
                    <input
                      type={showImportPassphrase ? 'text' : 'password'}
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                      className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-1.5 pr-9 text-sm text-white focus:outline-none focus:border-[#2F6BFF]"
                      placeholder="Backup passphrase"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImportPassphrase(!showImportPassphrase)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-[#e1e2e6] transition-colors"
                    >
                      {showImportPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {importError && <p className="text-[#FF4444] text-xs mt-1">{importError}</p>}
                </div>

                <button
                  onClick={handleDecryptImport}
                  disabled={!importPassphrase}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <FileUp className="w-4 h-4" />
                  Decrypt & Load Backup
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-semibold text-xs">Found {importedData.length} Keys</h4>
                  <button
                    onClick={() => {
                      setImportedData(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-[10px] text-[#8E9299] hover:text-white transition-colors"
                  >
                    Select another file
                  </button>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {importedData.map(ik => {
                    const resolution = conflictResolutions[ik.id];
                    return (
                      <div key={ik.id} className="bg-[#1a1b1e] p-2 rounded border border-[#2a2b30] flex flex-col gap-1.5 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedForImport.has(ik.id)}
                            onChange={() => {
                              const next = new Set(selectedForImport);
                              if (next.has(ik.id)) next.delete(ik.id);
                              else next.add(ik.id);
                              setSelectedForImport(next);
                            }}
                            className="w-3.5 h-3.5 rounded border-[#2a2b30] bg-[#111216] text-[#2F6BFF] focus:ring-[#2F6BFF] focus:ring-offset-0"
                          />
                          <ExchangeIcon exchange={ik.exchange} className="w-4 h-4 shrink-0" />
                          <span className="text-white font-medium truncate flex-1">{ik.label}</span>
                          <AccountTypeBadge
                            exchange={ik.exchange}
                            accountType={ik.accountType}
                            environment={ik.environment}
                            bybitRegion={ik.bybitRegion}
                          />
                        </label>
                        
                        {resolution && (
                          <div className="ml-5 p-1.5 bg-[#F2C94C]/10 border border-[#F2C94C]/20 rounded text-[11px]">
                            <p className="text-[#F2C94C] mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Name collision detected.
                            </p>
                            <div className="flex items-center gap-3 mb-1">
                              <label className="flex items-center gap-1 cursor-pointer text-[#8E9299]">
                                <input
                                  type="radio"
                                  name={`resolve-${ik.id}`}
                                  checked={resolution === 'rename'}
                                  onChange={() => setConflictResolutions(prev => ({ ...prev, [ik.id]: 'rename' }))}
                                  className="text-[#2F6BFF]"
                                />
                                Rename
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer text-[#8E9299]">
                                <input
                                  type="radio"
                                  name={`resolve-${ik.id}`}
                                  checked={resolution === 'overwrite'}
                                  onChange={() => setConflictResolutions(prev => ({ ...prev, [ik.id]: 'overwrite' }))}
                                  className="text-[#FF4444]"
                                />
                                Overwrite
                              </label>
                            </div>
                            {resolution === 'rename' && (
                              <input
                                type="text"
                                value={customNames[ik.id] || ''}
                                onChange={(e) => setCustomNames(prev => ({ ...prev, [ik.id]: e.target.value }))}
                                className="w-full bg-[#111216] border border-[#2a2b30] rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                                placeholder="New name"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {importError && <p className="text-[#FF4444] text-[11px] text-center">{importError}</p>}

                <button
                  onClick={executeImport}
                  disabled={selectedForImport.size === 0}
                  className="w-full py-1.5 bg-[#00C853] hover:bg-[#00A844] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Import {selectedForImport.size} Keys
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
