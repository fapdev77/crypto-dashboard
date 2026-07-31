import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Download, AlertTriangle, Shield, Check, FileDown, FileUp } from 'lucide-react';
import { useApiKeysStore, ApiCredentials } from '../store/apiKeysStore';
import { encryptData, decryptData } from '../utils/cryptoLib';
import { ExchangeIcon } from './ui/ExchangeIcon';

interface ExportImportKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'export' | 'import' | 'local_security';

export function ExportImportKeysModal({ isOpen, onClose }: ExportImportKeysModalProps) {
  const { keys, isEncrypted, enableEncryption, disableEncryption, importKeys } = useApiKeysStore();
  const [activeTab, setActiveTab] = useState<Tab>('export');

  // Export State
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set(keys.map(k => k.id)));
  
  // Import State
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importedData, setImportedData] = useState<ApiCredentials[] | null>(null);
  const [importError, setImportError] = useState('');
  const [selectedForImport, setSelectedForImport] = useState<Set<string>>(new Set());
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'overwrite' | 'rename'>>({});
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local Security State
  const [localPassphrase, setLocalPassphrase] = useState('');
  const [localSecurityError, setLocalSecurityError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('export');
      setExportPassphrase('');
      setSelectedForExport(new Set(useApiKeysStore.getState().keys.map(k => k.id)));
      
      setImportPassphrase('');
      setImportedData(null);
      setImportError('');
      setSelectedForImport(new Set());
      setConflictResolutions({});
      setCustomNames({});
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setLocalPassphrase('');
      setLocalSecurityError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        // Just store the encrypted string, user needs to provide passphrase to decrypt
        setImportedData(null);
        setImportError('');
      }
    };
    reader.readAsText(file);
  };

  const handleDecryptImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !importPassphrase) return;

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
    } catch (err) {
      setImportError('Invalid passphrase or corrupted file.');
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
    onClose();
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
        onClose();
      } catch (err) {
        setLocalSecurityError('Invalid passphrase');
      }
    } else {
      if (!localPassphrase || localPassphrase.length < 4) {
        setLocalSecurityError('Passphrase must be at least 4 characters');
        return;
      }
      await enableEncryption(localPassphrase);
      setLocalPassphrase('');
      setLocalSecurityError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#2a2b30]">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#2F6BFF]" />
            Security & Backup
          </h2>
          <button onClick={onClose} className="text-[#8E9299] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-[#2a2b30]">
          <button
            onClick={() => setActiveTab('local_security')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'local_security' ? 'text-[#2F6BFF] border-b-2 border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
          >
            Local Security
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'export' ? 'text-[#2F6BFF] border-b-2 border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
          >
            Export Keys
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'import' ? 'text-[#2F6BFF] border-b-2 border-[#2F6BFF]' : 'text-[#8E9299] hover:text-white'}`}
          >
            Import Keys
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {activeTab === 'local_security' && (
            <div className="space-y-6">
              <div className="bg-[#1a1b1e] p-4 rounded-lg border border-[#2a2b30]">
                <h3 className="text-white font-medium mb-2">Local Data Encryption</h3>
                <p className="text-sm text-[#8E9299] mb-4">
                  {isEncrypted 
                    ? "Your API keys are currently encrypted in local storage. You must enter your passphrase to view or use them when opening the app."
                    : "Protect your API keys by encrypting them in your browser's local storage. You will need to enter your passphrase every time you open the app."
                  }
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#8E9299] mb-1">
                      {isEncrypted ? 'Enter Passphrase to Disable' : 'Set Passphrase'}
                    </label>
                    <input
                      type="password"
                      value={localPassphrase}
                      onChange={(e) => setLocalPassphrase(e.target.value)}
                      className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2F6BFF]"
                      placeholder="Enter passphrase"
                    />
                    {localSecurityError && <p className="text-[#FF4444] text-xs mt-1">{localSecurityError}</p>}
                  </div>

                  <button
                    onClick={handleToggleLocalSecurity}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                      isEncrypted 
                        ? 'bg-[#FF4444]/10 text-[#FF4444] hover:bg-[#FF4444]/20 border border-[#FF4444]/20'
                        : 'bg-[#2F6BFF] text-white hover:bg-[#1E56DF]'
                    }`}
                  >
                    {isEncrypted ? 'Disable Local Encryption' : 'Enable Local Encryption'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-[#1a1b1e] p-4 rounded-lg border border-[#2a2b30]">
                <h3 className="text-white font-medium mb-2">Select Keys to Export</h3>
                {keys.length === 0 ? (
                  <p className="text-sm text-[#8E9299]">No API keys available to export.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(
                      keys.reduce((acc, k) => {
                        if (!acc[k.exchange]) acc[k.exchange] = [];
                        acc[k.exchange].push(k);
                        return acc;
                      }, {} as Record<string, ApiCredentials[]>)
                    ).map(([exchange, exchangeKeys]) => (
                      <div key={exchange} className="space-y-1 pb-2">
                        <div className="text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-1 mt-2 first:mt-0 px-2 flex items-center gap-2">
                          <ExchangeIcon exchange={exchange as any} className="w-4 h-4" />
                          {exchange}
                        </div>
                        {exchangeKeys.map(k => (
                          <label key={k.id} className="flex items-center gap-3 p-2 hover:bg-[#202125] rounded-lg cursor-pointer ml-2">
                            <input
                              type="checkbox"
                              checked={selectedForExport.has(k.id)}
                              onChange={() => handleToggleExport(k.id)}
                              className="w-4 h-4 rounded border-[#2a2b30] bg-[#111216] text-[#2F6BFF] focus:ring-[#2F6BFF] focus:ring-offset-0"
                            />
                            <span className="text-white text-sm">{k.label}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-[#8E9299] mb-1">Passphrase (Required for Export)</label>
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2F6BFF]"
                  placeholder="Create a strong passphrase"
                />
                <p className="text-xs text-[#8E9299] mt-1">
                  This passphrase is required to import these keys on another device.
                </p>
              </div>

              <button
                onClick={handleExport}
                disabled={!exportPassphrase || selectedForExport.size === 0}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                <FileDown className="w-4 h-4" />
                Export {selectedForExport.size} Keys
              </button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-6">
              {!importedData ? (
                <>
                  <div>
                    <label className="block text-sm text-[#8E9299] mb-1">Select Backup File</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".enc"
                      className="w-full text-sm text-[#8E9299] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#1a1b1e] file:text-white hover:file:bg-[#202125] file:transition-colors file:cursor-pointer"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-[#8E9299] mb-1">Passphrase</label>
                    <input
                      type="password"
                      value={importPassphrase}
                      onChange={(e) => setImportPassphrase(e.target.value)}
                      className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2F6BFF]"
                      placeholder="Enter the passphrase used during export"
                    />
                    {importError && <p className="text-[#FF4444] text-xs mt-1">{importError}</p>}
                  </div>

                  <button
                    onClick={handleDecryptImport}
                    disabled={!importPassphrase}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    <FileUp className="w-4 h-4" />
                    Decrypt File
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">Found {importedData.length} Keys</h3>
                    <button
                      onClick={() => {
                        setImportedData(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-[#8E9299] hover:text-white transition-colors"
                    >
                      Select different file
                    </button>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {importedData.map(ik => {
                      const resolution = conflictResolutions[ik.id];
                      return (
                        <div key={ik.id} className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b30] flex flex-col gap-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedForImport.has(ik.id)}
                              onChange={() => {
                                const next = new Set(selectedForImport);
                                if (next.has(ik.id)) next.delete(ik.id);
                                else next.add(ik.id);
                                setSelectedForImport(next);
                              }}
                              className="w-4 h-4 rounded border-[#2a2b30] bg-[#111216] text-[#2F6BFF] focus:ring-[#2F6BFF] focus:ring-offset-0"
                            />
                            <ExchangeIcon exchange={ik.exchange} className="w-5 h-5" />
                            <span className="text-white text-sm font-medium">{ik.label}</span>
                          </label>
                          
                          {resolution && (
                            <div className="ml-7 p-2 bg-[#F2C94C]/10 border border-[#F2C94C]/20 rounded text-xs">
                              <p className="text-[#F2C94C] mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                A key with this name already exists.
                              </p>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-[#8E9299]">
                                  <input
                                    type="radio"
                                    name={`resolve-${ik.id}`}
                                    checked={resolution === 'rename'}
                                    onChange={() => setConflictResolutions(prev => ({ ...prev, [ik.id]: 'rename' }))}
                                    className="text-[#2F6BFF]"
                                  />
                                  Rename
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-[#8E9299]">
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
                                <div className="mt-2">
                                  <input
                                    type="text"
                                    value={customNames[ik.id] || ''}
                                    onChange={(e) => setCustomNames(prev => ({ ...prev, [ik.id]: e.target.value }))}
                                    className="w-full bg-[#111216] border border-[#2a2b30] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#2F6BFF]"
                                    placeholder="Enter new name"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={executeImport}
                    disabled={selectedForImport.size === 0}
                    className="w-full py-2 px-4 bg-[#00C853] hover:bg-[#00A844] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                  >
                    Import {selectedForImport.size} Keys
                  </button>
                  {importError && <p className="text-[#FF4444] text-xs text-center mt-2">{importError}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
