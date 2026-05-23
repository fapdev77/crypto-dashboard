import React, { useState } from 'react';
import { Save, Trash2, Power, Eye, EyeOff, Plus, Activity, AlertCircle } from 'lucide-react';
import { useApiKeysStore, Exchange } from '../store/apiKeysStore';
import { useDashboardStore } from '../store/dashboardStore';
import { ExchangeIcon } from './ui/ExchangeIcon';

const EXCHANGES: { id: Exchange; name: string; requiresPassphrase?: boolean }[] = [
  { id: 'bitget', name: 'Bitget', requiresPassphrase: true },
  { id: 'okx', name: 'OKX', requiresPassphrase: true },
  { id: 'bybit', name: 'Bybit', requiresPassphrase: false },
];

export function ApiKeys() {
  const { keys, addKey, removeKey, toggleKey } = useApiKeysStore();
  const { clearConnectionData, statuses, errors } = useDashboardStore(state => state);
  const [selectedKeyId, setSelectedKeyId] = useState<string | 'new'>('new');
  
  // Form State for new key
  const [exchange, setExchange] = useState<Exchange>('bitget');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addKey({
      exchange,
      label,
      apiKey,
      apiSecret,
      passphrase,
    });
    setLabel('');
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setSelectedKeyId('new');
  };

  const activeEx = EXCHANGES.find(e => e.id === exchange)!;
  const existingKey = keys.find(k => k.id === selectedKeyId);

  return (
    <div className="flex flex-col md:flex-row h-full gap-6">
      {/* Key List */}
      <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 bg-[#151619] border border-[#2a2b30] rounded-xl flex flex-col p-4 overflow-y-auto">
        <h2 className="text-lg font-medium text-white mb-4">Connections</h2>
        <div className="space-y-2 flex-1">
          {keys.map((k) => {
            const status = statuses[k.id] || 'disconnected';
            const isActive = k.isActive;
            const dotClass = 
              !isActive ? 'bg-[#8E9299]' :
              status === 'connected' ? 'bg-[#00C853]' : 
              status === 'connecting' ? 'bg-[#F2C94C] animate-pulse' : 
              status === 'error' ? 'bg-[#FF4444]' : 'bg-[#8E9299]';

            return (
              <button
                key={k.id}
                onClick={() => setSelectedKeyId(k.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors ${
                  selectedKeyId === k.id
                    ? 'bg-[#2a2b30] text-white'
                    : 'text-[#8E9299] hover:bg-[#2a2b30]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ExchangeIcon exchange={k.exchange} className="w-6 h-6" />
                  <div>
                    <span className="font-medium text-sm block">{k.label}</span>
                    <span className="text-xs opacity-70 uppercase tracking-wider">{k.exchange}</span>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${dotClass}`} />
              </button>
            );
          })}

          <button
            onClick={() => setSelectedKeyId('new')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-2 transition-colors mt-2 ${
              selectedKeyId === 'new'
                ? 'bg-[#2F6BFF] text-white'
                : 'text-[#2F6BFF] border border-[#2F6BFF]/30 hover:bg-[#2F6BFF]/10'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium text-sm">Add New API Key</span>
          </button>
        </div>
      </div>

      {/* Details / Form */}
      <div className="flex-1 bg-[#151619] border border-[#2a2b30] rounded-xl p-6 overflow-y-auto">
        {existingKey ? (
          <div className="space-y-6 max-w-3xl w-full">
             <div className="mb-6 flex gap-3 items-center">
              <ExchangeIcon exchange={existingKey.exchange} className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-medium text-white mb-1">{existingKey.label}</h3>
                <p className="text-xs text-[#8E9299] uppercase">{existingKey.exchange}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-[#2a2b30]/30 border border-[#2a2b30] rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-white">API Key Configuration</span>
                  <span className={`text-xs font-mono px-2 py-1 rounded bg-[#1a1b1e] border ${existingKey.isActive ? 'border-[#00C853] text-[#00C853]' : 'border-[#FF4444] text-[#FF4444]'}`}>
                    {existingKey.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-[#8E9299] uppercase">API Key Snippet</p>
                  <p className="font-mono text-sm break-all">{existingKey.apiKey.substring(0, 8)}...{existingKey.apiKey.substring(existingKey.apiKey.length - 4)}</p>
                </div>
              </div>

              {existingKey.isActive && (
                <div className="p-4 bg-[#2a2b30]/30 border border-[#2a2b30] rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-[#8E9299]" />
                    <span className="text-sm font-medium text-white">Connection Details</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#8E9299] uppercase mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          statuses[existingKey.id] === 'connected' ? 'bg-[#00C853]' : 
                          statuses[existingKey.id] === 'connecting' ? 'bg-[#F2C94C] animate-pulse' : 
                          statuses[existingKey.id] === 'error' ? 'bg-[#FF4444]' : 'bg-[#8E9299]'
                        }`} />
                        <span className="text-sm text-white capitalize break-all">
                          {statuses[existingKey.id] || 'Disconnected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {errors[existingKey.id] && (
                    <div className="mt-4 p-3 bg-[#FF4444]/10 border border-[#FF4444]/20 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-[#FF4444] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-[#FF4444]">Connection Error</p>
                        <p className="text-xs text-[#FF4444]/80 mt-1 break-words">{errors[existingKey.id]}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (existingKey.isActive) {
                    clearConnectionData(existingKey.id);
                  }
                  toggleKey(existingKey.id);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-[#2a2b30] hover:bg-[#323339] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Power className={`w-4 h-4 ${existingKey.isActive ? 'text-[#FF4444]' : 'text-[#00C853]'}`} />
                {existingKey.isActive ? 'Disable' : 'Enable'}
              </button>
              {keyToDelete === existingKey.id ? (
                <div className="flex-1 flex flex-col items-center justify-center p-2 border border-[#FF4444] rounded-lg bg-[#FF4444]/10">
                  <span className="text-xs text-[#FF4444] font-medium mb-2">Are you sure?</span>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => setKeyToDelete(null)}
                      className="flex-1 text-white hover:text-[#8E9299] text-xs font-medium py-1.5 bg-[#2a2b30] hover:bg-[#323339] rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        clearConnectionData(existingKey.id);
                        removeKey(existingKey.id);
                        setKeyToDelete(null);
                        setSelectedKeyId('new');
                      }}
                      className="flex-1 text-white text-xs font-medium py-1.5 bg-[#FF4444] hover:bg-[#CC0000] rounded transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setKeyToDelete(existingKey.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-[#FF4444]/50 text-[#FF4444] hover:bg-[#FF4444]/10 text-sm font-medium rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 max-w-3xl w-full">
            <div className="mb-6">
              <h3 className="text-xl font-medium text-white mb-1">New API Connection</h3>
              <p className="text-xs text-[#8E9299]">Keys are stored securely in your browser's localStorage.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2">Exchange</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors appearance-none text-left flex items-center justify-between"
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                    </div>
                    <span>{EXCHANGES.find(ex => ex.id === exchange)?.name}</span>
                    <svg className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-lg overflow-hidden">
                        {EXCHANGES.map(ex => (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => {
                              setExchange(ex.id as Exchange);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              exchange === ex.id ? 'bg-[#2F6BFF] text-white' : 'text-[#8E9299] hover:bg-[#2a2b30]/50 hover:text-white'
                            }`}
                          >
                            <ExchangeIcon exchange={ex.id} className="w-5 h-5" />
                            <span>{ex.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2">Label</label>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors"
                  placeholder="e.g. Scalp Bot"
                />
              </div>
            </div>

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
  );
}
