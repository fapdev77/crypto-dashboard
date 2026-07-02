import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, X, Trash2 } from 'lucide-react';
import { useApiKeysStore, Exchange, ApiCredentials } from '../store/apiKeysStore';
import { ExchangeIcon } from './ui/ExchangeIcon';
import { AppTooltip } from './ui/Tooltip';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  existingKey?: ApiCredentials;
}

const EXCHANGES: { id: Exchange; name: string; requiresPassphrase?: boolean }[] = [
  { id: 'bitget', name: 'Bitget', requiresPassphrase: true },
  { id: 'okx', name: 'OKX', requiresPassphrase: true },
  { id: 'bybit', name: 'Bybit', requiresPassphrase: false },
];

export function ApiKeyModal({ isOpen, onClose, mode, existingKey }: ApiKeyModalProps) {
  const { addKey, removeKey } = useApiKeysStore();
  
  const [exchange, setExchange] = useState<Exchange>('bitget');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingKey) {
        setExchange(existingKey.exchange);
        setLabel(existingKey.label);
        setApiKey(existingKey.apiKey);
        setApiSecret(''); 
        setPassphrase('');
      } else {
        setExchange('bitget');
        setLabel('');
        setApiKey('');
        setApiSecret('');
        setPassphrase('');
      }
      setShowDeleteConfirm(false);
      setShowSecret(false);
    }
  }, [isOpen, mode, existingKey]);

  if (!isOpen) return null;

  const activeEx = EXCHANGES.find(e => e.id === exchange)!;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      addKey({
        exchange,
        label,
        apiKey,
        apiSecret,
        passphrase,
      });
    } else if (mode === 'edit' && existingKey) {
      const keys = useApiKeysStore.getState().keys;
      useApiKeysStore.setState({
        keys: keys.map(k => k.id === existingKey.id ? { ...k, label } : k)
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingKey) {
       removeKey(existingKey.id);
       onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#151619] border border-[#2a2b30] rounded-xl shadow-2xl w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-[#2a2b30]">
          <h3 className="text-lg font-medium text-white">
            {mode === 'create' ? 'New API Connection' : 'Edit Connection'}
          </h3>
          <button onClick={onClose} className="text-[#8E9299] hover:text-white transition-colors">
             <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2">Exchange</label>
              {mode === 'edit' ? (
                 <div className="flex items-center gap-2 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-3 py-2.5 opacity-70">
                    <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                    <span className="text-sm text-white">{activeEx.name}</span>
                 </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors appearance-none text-left flex items-center justify-between"
                  >
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                    </div>
                    <span>{activeEx.name}</span>
                    <ChevronDownIcon isOpen={isDropdownOpen} />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
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
              )}
            </div>

            <div>
              <AppTooltip description="A custom name to identify this connection (e.g. 'Main Account', 'Scalp Bot').">
                <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Label</label>
              </AppTooltip>
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
            <AppTooltip description="Your exchange API key. It is stored securely in your local browser and never sent to our servers.">
              <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-[#8E9299]/50">API Key</label>
            </AppTooltip>
            {mode === 'edit' ? (
              <div className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-[#8E9299] font-mono opacity-80 select-none">
                {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
              </div>
            ) : (
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors font-mono"
                placeholder="Enter API Key"
              />
            )}
          </div>
          
          {mode === 'create' && (
             <>
               <div>
                 <AppTooltip description="Your exchange API Secret key. Keep it safe.">
                   <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-[#8E9299]/50">API Secret</label>
                 </AppTooltip>
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
                   <AppTooltip description="Required by some exchanges (like Bitget and OKX) as an extra security password for your API key.">
                     <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Passphrase</label>
                   </AppTooltip>
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
             </>
          )}

          <div className="pt-4 flex gap-3">
             {mode === 'edit' && (
                showDeleteConfirm ? (
                  <div className="flex flex-1 gap-2 border border-[#FF4444] bg-[#FF4444]/10 rounded-lg p-1.5 items-center">
                    <span className="text-xs text-[#FF4444] font-medium px-2">Are you sure?</span>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-1 bg-[#2a2b30] hover:bg-[#323339] text-[#8E9299] rounded text-xs transition-colors">Cancel</button>
                    <button type="button" onClick={handleDelete} className="flex-1 py-1 bg-[#FF4444] hover:bg-[#CC0000] text-white rounded text-xs transition-colors">Confirm</button>
                  </div>
                ) : (
                  <button 
                     type="button" 
                     onClick={() => setShowDeleteConfirm(true)}
                     className="flex-1 py-2.5 border border-[#FF4444]/50 text-[#FF4444] hover:bg-[#FF4444]/10 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                     <Trash2 className="w-4 h-4" />
                     Remove
                  </button>
                )
             )}
            <button
              type="submit"
              className={`py-2.5 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 flex-1 ${mode === 'edit' && showDeleteConfirm ? 'hidden' : ''}`}
            >
              <Save className="w-4 h-4" />
              {mode === 'create' ? 'Save Configuration' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`h-4 w-4 text-[#8E9299] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
