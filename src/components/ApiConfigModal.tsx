import React, { useState } from 'react';
import { X, Save, Trash2, Power, Eye, EyeOff } from 'lucide-react';
import { useApiKeysStore, Exchange } from '../store/apiKeysStore';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXCHANGES: { id: Exchange; name: string; requiresPassphrase?: boolean }[] = [
  { id: 'bitget', name: 'Bitget', requiresPassphrase: true },
  { id: 'okx', name: 'OKX', requiresPassphrase: true },
  { id: 'bybit', name: 'Bybit', requiresPassphrase: false },
];

export function ApiConfigModal({ isOpen, onClose }: ApiConfigModalProps) {
  const { keys, setKey, removeKey, toggleKey } = useApiKeysStore();
  const [selectedExchange, setSelectedExchange] = useState<Exchange>('bitget');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setKey(selectedExchange, {
      apiKey,
      apiSecret,
      passphrase,
    });
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
  };

  const handleSelectExchange = (ex: Exchange) => {
    setSelectedExchange(ex);
    const existing = keys[ex];
    if (existing) {
      setApiKey(existing.apiKey);
      setApiSecret(existing.apiSecret);
      setPassphrase(existing.passphrase || '');
    } else {
      setApiKey('');
      setApiSecret('');
      setPassphrase('');
    }
  };

  const activeEx = EXCHANGES.find(e => e.id === selectedExchange)!;
  const existingConfig = keys[selectedExchange];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[#2a2b30] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">API Configuration</h2>
          <button onClick={onClose} className="text-[#8E9299] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Exchange List */}
          <div className="w-1/3 border-r border-[#2a2b30] bg-[#1a1b1e] p-4 space-y-2 overflow-y-auto">
            {EXCHANGES.map((ex) => {
              const isConfigured = !!keys[ex.id];
              const isActive = keys[ex.id]?.isActive;
              return (
                <button
                  key={ex.id}
                  onClick={() => handleSelectExchange(ex.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                    selectedExchange === ex.id
                      ? 'bg-[#2F6BFF] text-white'
                      : 'text-[#8E9299] hover:bg-[#2a2b30]/50'
                  }`}
                >
                  <span className="font-medium text-sm">{ex.name}</span>
                  {isConfigured && (
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00C853]' : 'bg-[#FF4444]'}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-xl font-medium text-white mb-1">{activeEx.name} Setup</h3>
              <p className="text-xs text-[#8E9299]">Keys are stored securely in your browser's localStorage.</p>
            </div>

            {existingConfig ? (
              <div className="space-y-6">
                <div className="p-4 bg-[#2a2b30]/30 border border-[#2a2b30] rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-[#8E9299]">Status</span>
                    <span className={`text-xs font-mono px-2 py-1 rounded bg-[#1a1b1e] border ${existingConfig.isActive ? 'border-[#00C853] text-[#00C853]' : 'border-[#FF4444] text-[#FF4444]'}`}>
                      {existingConfig.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-[#8E9299] uppercase">API Key</p>
                    <p className="font-mono text-sm break-all">{existingConfig.apiKey.substring(0, 8)}...{existingConfig.apiKey.substring(existingConfig.apiKey.length - 4)}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => toggleKey(selectedExchange)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[#2a2b30] hover:bg-[#323339] text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Power className={`w-4 h-4 ${existingConfig.isActive ? 'text-[#FF4444]' : 'text-[#00C853]'}`} />
                    {existingConfig.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => removeKey(selectedExchange)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-[#FF4444]/50 text-[#FF4444] hover:bg-[#FF4444]/10 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2">API Key</label>
                  <input
                    type="text"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
                    placeholder="Enter API Key"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2">API Secret</label>
                  <div className="relative">
                    <input
                      type={showSecret ? "text" : "password"}
                      required
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono pr-10"
                      placeholder="Enter API Secret"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9299] hover:text-white"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {activeEx.requiresPassphrase && (
                  <div>
                    <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2">Passphrase</label>
                    <input
                      type="password"
                      required
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
                      placeholder="Enter Passphrase"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Configuration
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
