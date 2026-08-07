import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, AlertTriangle, Shield, Check, FileDown, FileUp, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { useApiKeysStore, ApiCredentials, Exchange } from '../store/apiKeysStore';
import { encryptData, decryptData } from '../utils/cryptoLib';
import { ExchangeIcon } from './ui/ExchangeIcon';
import toast from 'react-hot-toast';

type Tab = 'local_security' | 'export' | 'import';

export function SecurityBackupCard() {
  const { keys, isEncrypted, enableEncryption, disableEncryption, importKeys } = useApiKeysStore();
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

  // Local Security State
  const [localPassphrase, setLocalPassphrase] = useState('');
  const [showLocalPassphrase, setShowLocalPassphrase] = useState(false);
  const [localSecurityError, setLocalSecurityError] = useState('');

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
      const newKey = { ...ik, id: crypto.randomUUID() }; // Always generate new local ID to avoid collision
      
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

  const handleToggleLocalSecurity = async () => {
    if (isEncrypted) {
      if (!localPassphrase) {
        setLocalSecurityError('Passphrase required to disable encryption');
        return;
      }
      try {
        await disableEncryption(localPassphrase);
        setLocalPassphrase('');
        setLocalSecurityError('');
        toast.success('Encryption disabled! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        setLocalSecurityError('Invalid passphrase');
        toast.error('Failed to disable encryption');
      }
    } else {
      if (!localPassphrase || localPassphrase.length < 4) {
        setLocalSecurityError('Passphrase must be at least 4 characters');
        return;
      }
      try {
        await enableEncryption(localPassphrase);
        setLocalPassphrase('');
        setLocalSecurityError('');
        toast.success('Encryption enabled successfully! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        setLocalSecurityError('Encryption failed');
        toast.error('Failed to enable encryption');
      }
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
          onClick={() => { setActiveTab('local_security'); setImportError(''); setImportPassphrase(''); setExportPassphrase(''); setLocalPassphrase(''); }}
          className={`flex-1 pb-2 font-medium transition-colors ${activeTab === 'local_security' ? 'text-[#2F6BFF] border-b border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
        >
          Encryption
        </button>
        <button
          onClick={() => { setActiveTab('export'); setImportError(''); setImportPassphrase(''); setExportPassphrase(''); setLocalPassphrase(''); }}
          className={`flex-1 pb-2 font-medium transition-colors ${activeTab === 'export' ? 'text-[#2F6BFF] border-b border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
        >
          Export Backup
        </button>
        <button
          onClick={() => { setActiveTab('import'); setImportError(''); setImportPassphrase(''); setExportPassphrase(''); setLocalPassphrase(''); }}
          className={`flex-1 pb-2 font-medium transition-colors ${activeTab === 'import' ? 'text-[#2F6BFF] border-b border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
        >
          Import Backup
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        {activeTab === 'local_security' && (
          <div className="space-y-4">
            <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] text-xs">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                {isEncrypted ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-[#00C853]" />
                    <span className="text-[#00C853]">Storage Encrypted</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-500">Unencrypted Storage</span>
                  </>
                )}
              </div>
              <p className="text-[#8E9299] leading-relaxed">
                {isEncrypted 
                  ? "Your keys are safely encrypted in your browser's LocalStorage. To disable protection, provide your passphrase below."
                  : "Protect your API keys by encrypting them locally. You will be prompted for your passphrase every time the application starts up."
                }
              </p>
            </div>
            
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] text-[#8E9299] mb-1">
                  {isEncrypted ? 'Enter Passphrase to Disable' : 'Set Encryption Passphrase (min. 4 chars)'}
                </label>
                <div className="relative">
                  <input
                    type={showLocalPassphrase ? 'text' : 'password'}
                    value={localPassphrase}
                    onChange={(e) => setLocalPassphrase(e.target.value)}
                    className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-1.5 pr-9 text-sm text-white focus:outline-none focus:border-[#2F6BFF]"
                    placeholder="Passphrase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLocalPassphrase(!showLocalPassphrase)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-[#e1e2e6] transition-colors"
                  >
                    {showLocalPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {localSecurityError && <p className="text-[#FF4444] text-[11px] mt-1">{localSecurityError}</p>}
              </div>

              <button
                onClick={handleToggleLocalSecurity}
                className={`w-full py-2 px-4 rounded-lg text-xs font-semibold transition-colors ${
                  isEncrypted 
                    ? 'bg-[#FF4444]/10 text-[#FF4444] hover:bg-[#FF4444]/20 border border-[#FF4444]/20'
                    : 'bg-[#2F6BFF] text-white hover:bg-[#1E56DF]'
                }`}
              >
                {isEncrypted ? 'Disable Local Encryption' : 'Enable Local Encryption'}
              </button>
            </div>
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
                          <span className="text-white text-xs truncate">{k.label}</span>
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
                          <span className="text-white font-medium truncate">{ik.label}</span>
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
