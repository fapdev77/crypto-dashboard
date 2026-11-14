import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Save, Trash2, Globe, Server, ChevronDown, Check, Info, X, Lock } from 'lucide-react';
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
  const { t } = useTranslation();
  const { addKey, removeKey, isInitialized, initializeVault } = useApiKeysStore();
  
  const [exchange, setExchange] = useState<Exchange>('bitget');
  const [accountType, setAccountType] = useState<AccountType>('classic');
  const [environment, setEnvironment] = useState<ApiEnvironment>('mainnet');
  const [bybitRegion, setBybitRegion] = useState<BybitRegion>('global');
  
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [masterPassphrase, setMasterPassphrase] = useState('');
  const [showMasterPassphrase, setShowMasterPassphrase] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isExchangeDropdownOpen, setIsExchangeDropdownOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  
  const [includeFunding, setIncludeFunding] = useState(true);
  const [isSubAccount, setIsSubAccount] = useState(false);
  
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
        setIncludeFunding(existingKey.includeFunding !== undefined ? existingKey.includeFunding : true);
        setIsSubAccount(existingKey.isSubAccount || false);
      } else {
        setExchange('bitget');
        setAccountType('classic');
        setEnvironment('mainnet');
        setBybitRegion('global');
        setLabel('');
        setApiKey('');
        setApiSecret('');
        setPassphrase('');
        setMasterPassphrase('');
        setShowMasterPassphrase(false);
        setIncludeFunding(true);
        setIsSubAccount(false);
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

  const handleSave = async (e: React.FormEvent) => {
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
      if (!isInitialized) {
        if (!masterPassphrase || masterPassphrase.length < 8) {
          setError('Master Passphrase must be at least 8 characters long to initialize the encrypted vault.');
          return;
        }
        await initializeVault(masterPassphrase);
      }

      await addKey({
        exchange,
        accountType: exchange === 'bitget' ? accountType : undefined,
        environment: exchange === 'bybit' ? environment : undefined,
        bybitRegion: exchange === 'bybit' ? bybitRegion : undefined,
        label,
        apiKey,
        apiSecret,
        passphrase,
        includeFunding,
        isSubAccount,
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
          includeFunding,
          isSubAccount,
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
      <div className="bg-surface border border-line rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-canvas">
          <h3 className="font-semibold text-fg text-base">
            {mode === 'create' ? t('apiKeys.modal.createTitle', 'Add API Connection') : `${t('apiKeys.modal.editTitle', 'Edit Connection')}: ${existingKey?.label}`}
          </h3>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 text-xs text-danger">
              {error}
            </div>
          )}

          <div>
            <AppTooltip description="A friendly name to identify this API connection across the dashboard.">
              <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('apiKeys.modal.labelLabel', 'Connection Label')}</label>
            </AppTooltip>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 text-sm text-fg focus:outline-none focus:border-accent transition-colors"
              placeholder={t('apiKeys.modal.labelPlaceholder', 'e.g., Main Bybit Account, Scalp Bot, etc.')}
            />
          </div>

          <div>
            <AppTooltip description="Select the cryptocurrency exchange platform you are connecting to.">
              <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('apiKeys.modal.exchangeLabel', 'Exchange')}</label>
            </AppTooltip>
            {mode === 'edit' ? (
              <div className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 flex items-center justify-between opacity-80 select-none">
                <div className="flex items-center gap-3">
                  <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                  <span className="text-fg text-sm font-medium">{activeEx.name}</span>
                </div>
              </div>
            ) : (
              <div className="relative" ref={exchangeDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExchangeDropdownOpen(!isExchangeDropdownOpen)}
                  className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 flex items-center justify-between hover:border-line-strong focus:outline-none focus:border-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExchangeIcon exchange={exchange} className="w-5 h-5" />
                    <span className="text-fg text-sm font-medium">{activeEx.name}</span>
                  </div>
                  <ChevronDownIcon isOpen={isExchangeDropdownOpen} />
                </button>

                {isExchangeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-elevated border border-line rounded-lg shadow-xl overflow-hidden z-20">
                    {EXCHANGES.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setExchange(ex.id);
                          setIsExchangeDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-line transition-colors ${
                          exchange === ex.id ? 'bg-accent/10 text-accent' : 'text-fg'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ExchangeIcon exchange={ex.id} className="w-5 h-5" />
                          <span className="text-sm font-medium">{ex.name}</span>
                        </div>
                        {exchange === ex.id && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account Type Selector for Bitget */}
          {exchange === 'bitget' && (
            <div className="bg-elevated/80 border border-line rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <AppTooltip description="Select whether this API Key is for a Bitget Classic account (v2) or Unified Trading Account (UTA / v3).">
                  <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                    {t('apiKeys.modal.accountTypeLabel', 'Account Type / Mode')}
                  </label>
                </AppTooltip>
                <span className="text-[11px] text-fg-muted font-mono">Bitget Architecture</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAccountType('classic')}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    accountType === 'classic'
                      ? 'bg-accent/15 border-accent text-fg shadow-sm'
                      : 'bg-surface border-line text-fg-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <span className={`w-2 h-2 rounded-full ${accountType === 'classic' ? 'bg-accent' : 'bg-fg-muted'}`} />
                    Classic (Standard)
                  </div>
                  <span className="text-[10px] text-fg-muted mt-1 leading-tight">Legacy v2 Account</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('uta')}
                  className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${
                    accountType === 'uta'
                      ? 'bg-accent/15 border-accent text-fg shadow-sm'
                      : 'bg-surface border-line text-fg-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <span className={`w-2 h-2 rounded-full ${accountType === 'uta' ? 'bg-success' : 'bg-fg-muted'}`} />
                    UTA (Unified)
                  </div>
                  <span className="text-[10px] text-fg-muted mt-1 leading-tight">Unified Trading Account (v3)</span>
                </button>
              </div>
            </div>
          )}

          {/* Connection Settings for Bybit (Environment & Region) */}
          {exchange === 'bybit' && (
            <div className="bg-elevated/90 border border-line rounded-xl p-4 space-y-3.5">
              
              {/* Environment Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <AppTooltip description="Select Mainnet for live trading or Testnet for simulated environment.">
                    <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                      {t('apiKeys.modal.environmentLabel', 'Network / Environment')}
                    </label>
                  </AppTooltip>
                  <span className="text-[11px] text-fg-muted font-mono">Bybit v5 REST</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvironment('mainnet')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      environment === 'mainnet'
                        ? 'bg-accent/15 border-accent text-fg shadow-sm'
                        : 'bg-surface border-line text-fg-muted hover:text-fg hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-accent" />
                      <div>
                        <div className="font-medium text-xs text-fg">Mainnet</div>
                        <div className="text-[10px] text-fg-muted">Live Production</div>
                      </div>
                    </div>
                    {environment === 'mainnet' && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnvironment('testnet')}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                      environment === 'testnet'
                        ? 'bg-[#F2C94C]/15 border-[#F2C94C] text-fg shadow-sm'
                        : 'bg-surface border-line text-fg-muted hover:text-fg hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#F2C94C]" />
                      <div>
                        <div className="font-medium text-xs text-[#F2C94C]">Testnet</div>
                        <div className="text-[10px] text-fg-muted">Simulated Network</div>
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
                    <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider cursor-help border-b border-dashed border-fg-muted/50">
                      {t('apiKeys.modal.regionLabel', 'Account Region / Origin')}
                    </label>
                  </AppTooltip>
                  {currentRegionOpt.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent">
                      Badge: {currentRegionOpt.badge}
                    </span>
                  )}
                </div>

                <div className="relative" ref={regionDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                    className="w-full bg-surface border border-line rounded-lg px-3.5 py-2.5 flex items-center justify-between hover:border-line-strong focus:outline-none focus:border-accent transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Globe className="w-4 h-4 text-fg-muted shrink-0" />
                      <div className="flex flex-col items-start truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-fg truncate">{currentRegionOpt.name}</span>
                          {currentRegionOpt.badge && (
                            <span className="text-[9px] font-mono font-bold px-1 rounded bg-line text-fg border border-line-strong">
                              {currentRegionOpt.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-fg-muted font-mono truncate">{resolvedBaseUrl}</span>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-fg-muted shrink-0 transition-transform ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <div className="relative">
                    {isRegionDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-line rounded-lg shadow-2xl max-h-56 overflow-y-auto z-30 divide-y divide-line">
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
                              className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-elevated transition-colors ${
                                isSelected ? 'bg-accent/10' : ''
                              }`}
                            >
                              <div className="flex flex-col gap-0.5 truncate pr-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-fg'}`}>
                                    {reg.name}
                                  </span>
                                  {reg.badge && (
                                    <span className={`text-[9px] font-mono font-bold px-1 rounded border ${
                                      isSelected
                                        ? 'bg-accent/20 text-accent border-accent/40'
                                        : 'bg-line text-fg-muted border-line'
                                    }`}>
                                      {reg.badge}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-fg-muted leading-tight truncate">
                                  {reg.description}
                                </span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* International account note */}
                {(bybitRegion === 'brazil_int' || bybitRegion === 'argentina_int') && (
                  <div className="mt-2 p-2 bg-accent/10 border border-accent/25 rounded-lg flex items-start gap-2 text-[11px] text-[#93C5FD]">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent" />
                    <span>
                      International account configured: The system will automatically inject the <code className="bg-canvas px-1 py-0.5 rounded font-mono text-accent">x-site-id: {currentRegionOpt.headers?.['x-site-id'] || currentRegionOpt.headers?.['X-Site-Id']}</code> header into Bybit v5 REST requests.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <AppTooltip description="Your exchange API key. It is stored securely in your local browser and never sent to our servers.">
              <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-fg-muted/50">API Key</label>
            </AppTooltip>
            {mode === 'edit' ? (
              <div className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 text-sm text-fg-muted font-mono opacity-80 select-none">
                {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
              </div>
            ) : (
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 text-sm text-fg focus:outline-none focus:border-accent transition-colors font-mono"
                placeholder="Enter API Key"
              />
            )}
          </div>
          
          {mode === 'create' && (
             <>
               <div>
                 <AppTooltip description="Your exchange API Secret key. Keep it safe.">
                   <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-fg-muted/50">API Secret</label>
                 </AppTooltip>
                 <div className="relative">
                   <input
                     type={showSecret ? "text" : "password"}
                     required
                     value={apiSecret}
                     onChange={(e) => setApiSecret(e.target.value)}
                     className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 text-sm text-fg focus:outline-none focus:border-accent transition-colors font-mono pr-10"
                     placeholder={t('apiKeys.modal.apiSecretPlaceholder', 'Enter API Secret')}
                   />
                   <button
                     type="button"
                     onClick={() => setShowSecret(!showSecret)}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                   >
                     {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                   </button>
                 </div>
               </div>

               {activeEx.requiresPassphrase && (
                 <div>
                   <AppTooltip description="Required by some exchanges (like Bitget and OKX) as an extra security password for your API key.">
                     <label className="block text-xs font-medium text-fg-muted uppercase tracking-wider mb-2 w-fit cursor-help border-b border-dashed border-fg-muted/50">{t('apiKeys.modal.passphraseLabel', 'Passphrase')}</label>
                   </AppTooltip>
                   <input
                     type="password"
                     required
                     value={passphrase}
                     onChange={(e) => setPassphrase(e.target.value)}
                     className="w-full bg-elevated border border-line rounded-lg px-4 py-2.5 text-sm text-fg focus:outline-none focus:border-accent transition-colors font-mono"
                     placeholder={t('apiKeys.modal.passphrasePlaceholder', 'Enter Passphrase')}
                   />
                 </div>
               )}
             </>
          )}

          {/* Zero-Trust Master Passphrase initialization if not initialized yet */}
          {mode === 'create' && !isInitialized && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-fg font-medium text-xs">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span>{t('apiKeys.vault.setupTitle', 'Zero-Trust Vault Setup (Master Passphrase)')}</span>
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed">
                This is your first API connection. Set a master passphrase (minimum 8 characters) to encrypt all credentials safely in your browser.
              </p>
              <div className="relative">
                <input
                  type={showMasterPassphrase ? "text" : "password"}
                  required
                  value={masterPassphrase}
                  onChange={(e) => setMasterPassphrase(e.target.value)}
                  className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-xs text-fg focus:outline-none focus:border-accent pr-9 font-mono"
                  placeholder={t('apiKeys.vault.passphrasePlaceholder', 'Enter Master Passphrase (min. 8 chars)')}
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassphrase(!showMasterPassphrase)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
                >
                  {showMasterPassphrase ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Account Options (Funding & Sub-account) */}
          <div className="p-3 bg-surface border border-line rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-medium text-fg flex items-center gap-1.5 cursor-pointer">
                  <span>{t('apiKeys.modal.includeFundingLabel', 'Include Funding Account')}</span>
                </label>
                <p className="text-[10px] text-fg-muted">
                  Fetch and display assets held in the Funding/Spot wallet for this account.
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeFunding}
                onChange={(e) => setIncludeFunding(e.target.checked)}
                className="w-4 h-4 rounded bg-elevated border-line text-accent focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line">
              <div>
                <label className="text-xs font-medium text-fg flex items-center gap-1.5 cursor-pointer">
                  <span>{t('apiKeys.modal.subAccountLabel', 'Sub-account')}</span>
                </label>
                <p className="text-[10px] text-fg-muted">
                  Mark this connection as a sub-account under a main master account.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isSubAccount}
                onChange={(e) => setIsSubAccount(e.target.checked)}
                className="w-4 h-4 rounded bg-elevated border-line text-accent focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
             {mode === 'edit' && (
                showDeleteConfirm ? (
                  <div className="flex flex-1 gap-2 border border-danger bg-danger/10 rounded-lg p-1.5 items-center">
                    <span className="text-xs text-danger font-medium px-2">{t('apiKeys.modal.deleteConfirmTitle', 'Are you sure?')}</span>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-1 bg-line hover:bg-line text-fg-muted rounded text-xs transition-colors">{t('apiKeys.modal.cancelBtn', 'Cancel')}</button>
                    <button type="button" onClick={handleDelete} className="flex-1 py-1 bg-danger hover:bg-[#CC0000] text-white rounded text-xs transition-colors">{t('common.confirm', 'Confirm')}</button>
                  </div>
                ) : (
                  <button 
                     type="button" 
                     onClick={() => setShowDeleteConfirm(true)}
                     className="flex-1 py-2.5 border border-danger/50 text-danger hover:bg-danger/10 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                     <Trash2 className="w-4 h-4" />
                     {t('apiKeys.card.delete', 'Remove')}
                  </button>
                )
             )}
            <button
              type="submit"
              className={`py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 flex-1 ${mode === 'edit' && showDeleteConfirm ? 'hidden' : ''}`}
            >
              <Save className="w-4 h-4" />
              {mode === 'create' ? t('apiKeys.modal.saveBtn', 'Save Configuration') : t('apiKeys.modal.saveChangesBtn', 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className={`h-4 w-4 text-fg-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
