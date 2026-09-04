import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Save, Trash2, Globe, Server, ChevronDown, Check, Info, X } from 'lucide-react';
import { useApiKeysStore, Exchange, AccountType, ApiEnvironment, BybitRegion, ApiCredentials } from '../store/apiKeysStore';
import { LogManager } from '../services/LogManager';
import { BYBIT_REGIONS, getBybitRegionOption, getBybitBaseUrl } from '../utils/bybitEndpoints';
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
  const [accountType, setAccountType] = useState<AccountType>('classic');
  const [environment, setEnvironment] = useState<ApiEnvironment>('mainnet');
  const [bybitRegion, setBybitRegion] = useState<BybitRegion>('global');
  
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const regionDropdownRef = useRef<HTMLDivElement>(null);
  const exchangeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setIsRegionDropdownOpen(false);
      }
      if (exchangeDropdownRef.current && !exchangeDropdownRef.current.contains(event.target as Node)) {
        setIsExchangeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingKey) {
        setExchange(existingKey.exchange);
        setAccountType(existingKey.accountType || 'classic');
        setEnvironment(existingKey.environment || 'mainnet');
        setBybitRegion(existingKey.bybitRegion || 'global');
        setLabel(existingKey.label);
        setApiKey(existingKey.apiKey);
        setApiSecret(''); 
        setPassphrase('');
      } else {
        setExchange('bitget');
        setAccountType('classic');
        setEnvironment('mainnet');
        setBybitRegion('global');
        setLabel('');
        setApiKey('');
        setApiSecret('');
        setPassphrase('');
      }
      setShowDeleteConfirm(false);
      setShowSecret(false);
      setIsExchangeDropdownOpen(false);
      setIsRegionDropdownOpen(false);
      setError('');
    }
  }, [isOpen, mode, existingKey]);

  if (!isOpen) return null;

  const activeEx = EXCHANGES.find(e => e.id === exchange)!;
  const currentRegionOpt = getBybitRegionOption(bybitRegion);
  const resolvedBaseUrl = getBybitBaseUrl(environment, bybitRegion);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (label.trim().length < 3) {
      setError('The connection label must have at least 3 characters.');
      return;
    }

    // Check for duplicate names
    const { keys } = useApiKeysStore.getState();
    const isDuplicate = keys.some(k => 
      k.label.trim().toLowerCase() === label.trim().toLowerCase() && 
      k.exchange === exchange &&
      (mode === 'create' || k.id !== existingKey?.id)
    );

    if (isDuplicate) {
      setError('An API connection with this label already exists for this exchange.');
      return;
    }
    
    setError('');

    if (mode === 'create') {
      addKey({
        exchange,
        accountType: exchange === 'bitget' ? accountType : undefined,
        environment: exchange === 'bybit' ? environment : undefined,
        bybitRegion: exchange === 'bybit' ? bybitRegion : undefined,
        label,
        apiKey,
        apiSecret,
        passphrase,
      });
      const extraMeta = exchange === 'bitget' 
        ? ` - ${accountType.toUpperCase()}` 
        : exchange === 'bybit' 
          ? ` - ${environment.toUpperCase()} / ${currentRegionOpt.name}${currentRegionOpt.badge ? ` [${currentRegionOpt.badge}]` : ''}` 
          : '';
      LogManager.info('ApiKeys', `New API key added: ${label} (${exchange}${extraMeta})`);
    } else if (mode === 'edit' && existingKey) {
      const allKeys = useApiKeysStore.getState().keys;
      useApiKeysStore.setState({
        keys: allKeys.map(k => k.id === existingKey.id ? {
          ...k,
          label,
          accountType: k.exchange === 'bitget' ? accountType : k.accountType,
          environment: k.exchange === 'bybit' ? environment : k.environment,
          bybitRegion: k.exchange === 'bybit' ? bybitRegion : k.bybitRegion,
        } : k)
      });
      const extraMeta = existingKey.exchange === 'bitget' 
        ? ` - ${accountType.toUpperCase()}` 
        : existingKey.exchange === 'bybit' 
          ? ` - ${environment.toUpperCase()} / ${currentRegionOpt.name}${currentRegionOpt.badge ? ` [${currentRegionOpt.badge}]` : ''}` 
          : '';
      LogManager.info('ApiKeys', `API key edited: ${label} (${existingKey.exchange}${extraMeta})`);
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingKey) {
       LogManager.info('ApiKeys', `API key deleted: ${existingKey.label} (${existingKey.exchange})`);
       removeKey(existingKey.id);
       onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2b30] bg-[#111216]">
          <h3 className="font-semibold text-white text-base">
            {mode === 'create' ? 'Add API Connection' : `Edit Connection: ${existingKey?.label}`}
          </h3>
          <button
            onClick={onClose}
            className="text-[#8E9299] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-[#FF4444]/10 border border-[#FF4444]/20 rounded-lg p-3 text-xs text-[#FF4444]">
              {error}
            </div>
          )}

          <div>
            <AppTooltip description="A friendly name to identify this API connection across the dashboard.">
              <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Connection Label</label>
            </AppTooltip>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#2F6BFF] transition-colors"
              placeholder="e.g., Main Bybit Account, Scalp Bot, etc."
            />
          </div>

          <div>
            <AppTooltip description="Select the cryptocurrency exchange platform you are connecting to.">
              <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-[#8E9299]/50">Exchange</label>
            </AppTooltip>
            {mode === 'edit' ? (
              <div className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 flex items-center justify-between opacity-80 select-none">
                <div className="flex items-center gap-3">
                  <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                  <span className="text-white text-sm font-medium">{activeEx.name}</span>
                </div>
              </div>
            ) : (
              <div className="relative" ref={exchangeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
                  className="w-full bg-[#1a1b1e] border border-[#2a2b30] rounded-lg px-4 py-2.5 flex items-center justify-between hover:border-[#3a3b40] focus:outline-none focus:border-[#2F6BFF] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                    <span className="text-white text-sm font-medium">{activeEx.name}</span>
                  </div>
                  <ChevronDownIcon isOpen={isExchangeDropdownOpen} />
                </button>

                {isExchangeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1b1e] border border-[#2a2b30] rounded-lg shadow-xl overflow-hidden z-20">
                    {EXCHANGES.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setExchange(ex.id);
                          setIsExchangeDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-[#202125] transition-colors ${
                          exchange === ex.id ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]' : 'text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ExchangeIcon exchange={ex.id} className="w-5 h-5" />
                          <span className="text-sm font-medium">{ex.name}</span>
                        </div>
                        {exchange === ex.id && <div className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Type Selector for Bitget */}
          {exchange === 'bitget' && (
            <div className="bg-[#1a1b1e]/80 border border-[#2a2b30] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <AppTooltip description="Select whether this API Key is for a Bitget Classic account (v2) or Unified Trading Account (UTA / v3).">
                  <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                    Account Type / Mode
                  </label>
                </AppTooltip>
                <span className="text-[11px] text-[#8E9299] font-mono">Bitget Architecture</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAccountType('classic')}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    accountType === 'classic'
                      ? 'bg-[#2F6BFF]/15 border-[#2F6BFF] text-white shadow-sm'
                      : 'bg-[#151619] border-[#2a2b30] text-[#8E9299] hover:text-white hover:border-[#3a3b40]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <span className={`w-2 h-2 rounded-full ${accountType === 'classic' ? 'bg-[#2F6BFF]' : 'bg-[#8E9299]'}`} />
                    Classic (Standard)
                  </div>
                  <span className="text-[10px] text-[#8E9299] mt-1 leading-tight">Legacy v2 Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('uta')}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    accountType === 'uta'
                      ? 'bg-[#2F6BFF]/15 border-[#2F6BFF] text-white shadow-sm'
                      : 'bg-[#151619] border-[#2a2b30] text-[#8E9299] hover:text-white hover:border-[#3a3b40]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <span className={`w-2 h-2 rounded-full ${accountType === 'uta' ? 'bg-[#00C853]' : 'bg-[#8E9299]'}`} />
                    UTA (Unified)
                  </div>
                  <span className="text-[10px] text-[#8E9299] mt-1 leading-tight">Unified Trading Account (v3)</span>
                </button>
              </div>
            </div>
          )}

          {/* Connection Settings for Bybit (Environment & Region) */}
          {exchange === 'bybit' && (
            <div className="bg-[#1a1b1e]/90 border border-[#2a2b30] rounded-xl p-4 space-y-3.5">
              
              {/* Environment Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <AppTooltip description="Select Mainnet for live trading or Testnet for simulated environment.">
                    <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                      Network / Environment
                    </label>
                  </AppTooltip>
                  <span className="text-[11px] text-[#8E9299] font-mono">Bybit v5 REST</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment('mainnet')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      environment === 'mainnet'
                        ? 'bg-[#2F6BFF]/15 border-[#2F6BFF] text-white shadow-sm'
                        : 'bg-[#151619] border-[#2a2b30] text-[#8E9299] hover:text-white hover:border-[#3a3b40]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#2F6BFF]" />
                      <div>
                        <div className="font-medium text-xs text-white">Mainnet</div>
                        <div className="text-[10px] text-[#8E9299]">Live Production</div>
                      </div>
                    </div>
                    {environment === 'mainnet' && <div className="w-1.5 h-1.5 rounded-full bg-[#2F6BFF]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('testnet')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      environment === 'testnet'
                        ? 'bg-[#F2C94C]/15 border-[#F2C94C] text-white shadow-sm'
                        : 'bg-[#151619] border-[#2a2b30] text-[#8E9299] hover:text-white hover:border-[#3a3b40]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#F2C94C]" />
                      <div>
                        <div className="font-medium text-xs text-[#F2C94C]">Testnet</div>
                        <div className="text-[10px] text-[#8E9299]">Simulated Network</div>
                      </div>
                    </div>
                    {environment === 'testnet' && <div className="w-1.5 h-1.5 rounded-full bg-[#F2C94C]" />}
                  </button>
                </div>
              </div>

              {/* Region / Origin Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <AppTooltip description="Select the origin or region for your Bybit account. For international accounts from Brazil or Argentina, the appropriate X-Site-Id header is automatically applied. For regions with dedicated regulatory domains (NL, TR, KZ, etc.), the official local endpoint is used.">
                    <label className="block text-xs font-medium text-[#8E9299] uppercase tracking-wider cursor-help border-b border-dashed border-[#8E9299]/50">
                      Account Region / Origin
                    </label>
                  </AppTooltip>
                  {currentRegionOpt.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#2F6BFF]/40 bg-[#2F6BFF]/10 text-[#60A5FA]">
                      Badge: {currentRegionOpt.badge}
                    </span>
                  )}
                </div>

                <div className="relative" ref={regionDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                    className="w-full bg-[#151619] border border-[#2a2b30] rounded-lg px-3.5 py-2.5 flex items-center justify-between hover:border-[#3a3b40] focus:outline-none focus:border-[#2F6BFF] transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Globe className="w-4 h-4 text-[#8E9299] shrink-0" />
                      <div className="flex flex-col items-start truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white truncate">{currentRegionOpt.name}</span>
                          {currentRegionOpt.badge && (
                            <span className="text-[9px] font-mono font-bold px-1 rounded bg-[#2a2b30] text-[#D1D5DB] border border-[#3a3b40]">
                              {currentRegionOpt.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#8E9299] font-mono truncate">{resolvedBaseUrl}</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[#8E9299] shrink-0 transition-transform ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div className="relative">
                    {isRegionDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#151619] border border-[#2a2b30] rounded-lg shadow-2xl max-h-56 overflow-y-auto z-30 divide-y divide-[#202125]">
                        {BYBIT_REGIONS.map((reg) => {
                          const isSelected = bybitRegion === reg.id;
                          return (
                            <button
                              key={reg.id}
                              type="button"
                              onClick={() => {
                                setBybitRegion(reg.id);
                                setIsRegionDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#1a1b1e] transition-colors ${
                                isSelected ? 'bg-[#2F6BFF]/10' : ''
                              }`}
                            >
                              <div className="flex flex-col gap-0.5 truncate pr-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${isSelected ? 'text-[#2F6BFF]' : 'text-white'}`}>
                                    {reg.name}
                                  </span>
                                  {reg.badge && (
                                    <span className={`text-[9px] font-mono font-bold px-1 rounded border ${
                                      isSelected
                                        ? 'bg-[#2F6BFF]/20 text-[#60A5FA] border-[#2F6BFF]/40'
                                        : 'bg-[#202125] text-[#8E9299] border-[#2a2b30]'
                                    }`}>
                                      {reg.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[#8E9299] leading-tight truncate">
                                  {reg.description}
                                </span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#2F6BFF] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* International account note */}
                {(bybitRegion === 'brazil_int' || bybitRegion === 'argentina_int') && (
                  <div className="mt-2 p-2 bg-[#2F6BFF]/10 border border-[#2F6BFF]/25 rounded-lg flex items-start gap-2 text-[11px] text-[#93C5FD]">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#60A5FA]" />
                    <span>
                      International account configured: The system will automatically inject the <code className="bg-[#111216] px-1 py-0.5 rounded font-mono text-[#60A5FA]">x-site-id: {currentRegionOpt.headers?.['x-site-id'] || currentRegionOpt.headers?.['X-Site-Id']}</code> header into Bybit v5 REST requests.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
