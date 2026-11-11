import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Check, Globe, DollarSign, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore';
import {
  SUPPORTED_LOCALES,
  SUPPORTED_FIAT_CURRENCIES,
  SupportedLocale,
  SupportedFiatCurrency,
} from '../../services/currency/currencyTypes';
import { CurrencyService } from '../../services/currency/CurrencyService';
import { FlagIcon } from './FlagIcon';

interface LanguageCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'language' | 'currency';
}

export function LanguageCurrencyModal({
  isOpen,
  onClose,
  initialTab = 'language',
}: LanguageCurrencyModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'language' | 'currency'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  const currentLocale = useSettingsStore(state => state.locale);
  const setLocale = useSettingsStore(state => state.setLocale);
  const currentFiat = useSettingsStore(state => state.fiatCurrency);
  const setFiatCurrency = useSettingsStore(state => state.setFiatCurrency);
  const fiatRates = useSettingsStore(state => state.fiatRates);
  const setFiatRates = useSettingsStore(state => state.setFiatRates);

  // Sync tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery('');
    }
  }, [isOpen, initialTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    try {
      const rates = await CurrencyService.fetchFiatRates();
      setFiatRates(rates);
    } finally {
      setIsRefreshingRates(false);
    }
  };

  const localesList = useMemo(() => Object.values(SUPPORTED_LOCALES), []);
  const currenciesList = useMemo(() => Object.values(SUPPORTED_FIAT_CURRENCIES), []);

  const filteredLocales = useMemo(() => {
    if (!searchQuery.trim()) return localesList;
    const q = searchQuery.toLowerCase().trim();
    return localesList.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.englishName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  }, [localesList, searchQuery]);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return currenciesList;
    const q = searchQuery.toLowerCase().trim();
    return currenciesList.filter(
      c =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.nativeName.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [currenciesList, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-currency-modal-title"
    >
      <div
        className="w-full max-w-lg bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-elevated">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="language-currency-modal-title"
                className="text-lg font-semibold text-fg tracking-tight"
              >
                {t('selector.title', 'Language & Currency')}
              </h2>
              <p className="text-xs text-fg-muted">
                {activeTab === 'language'
                  ? t('selector.selectLanguage', 'Select Interface Language')
                  : t('selector.selectCurrency', 'Select Display Currency')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-fg-muted hover:text-fg hover:bg-line rounded-lg transition-colors"
            aria-label={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center p-1 bg-elevated rounded-xl border border-line">
            <button
              onClick={() => setActiveTab('language')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'language'
                  ? 'bg-accent text-white shadow-md'
                  : 'text-fg-muted hover:text-fg hover:bg-line/50'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{t('selector.tabLanguage', 'Language')}</span>
              <span className="text-xs opacity-75 ml-1">
                ({SUPPORTED_LOCALES[currentLocale]?.name?.split(' ')[0] || currentLocale})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('currency')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'currency'
                  ? 'bg-accent text-white shadow-md'
                  : 'text-fg-muted hover:text-fg hover:bg-line/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{t('selector.tabCurrency', 'Currency')}</span>
              <span className="text-xs opacity-75 ml-1">
                ({currentFiat} {SUPPORTED_FIAT_CURRENCIES[currentFiat]?.symbol})
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-2">
          <div className="relative">
            <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('selector.searchPlaceholder', 'Search language or currency...')}
              className="w-full bg-elevated border border-line rounded-xl pl-10 pr-4 py-2 text-sm text-fg placeholder-fg-muted focus:outline-hidden focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-2 hide-scrollbar">
          {activeTab === 'language' ? (
            <div className="grid grid-cols-1 gap-2">
              {filteredLocales.map((locale) => {
                const isSelected = currentLocale === locale.id;
                return (
                  <button
                    key={locale.id}
                    onClick={() => {
                      setLocale(locale.id);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-accent/10 border-accent text-fg shadow-xs'
                        : 'bg-elevated border-line text-fg hover:bg-elevated-hover hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FlagIcon code={locale.id} className="w-8 h-5.5 rounded-sm shadow-xs shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-fg">{locale.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-line text-fg-muted font-mono">
                            {locale.code}
                          </span>
                        </div>
                        <div className="text-xs text-fg-muted mt-0.5">
                          {locale.englishName}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredLocales.length === 0 && (
                <div className="py-8 text-center text-fg-muted text-sm">
                  {t('common.none', 'No results found.')}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredCurrencies.map((currency) => {
                const isSelected = currentFiat === currency.id;
                const rate = fiatRates?.[currency.id] || 1;
                return (
                  <button
                    key={currency.id}
                    onClick={() => {
                      setFiatCurrency(currency.id);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-accent/10 border-accent text-fg shadow-xs'
                        : 'bg-elevated border-line text-fg hover:bg-elevated-hover hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <FlagIcon code={currency.id} className="w-8 h-5.5 rounded-sm shadow-xs" />
                        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded bg-canvas border border-line text-[9px] font-mono font-bold text-blue-400 leading-none shadow-xs">
                          {currency.symbol}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-fg tracking-wide">
                            {currency.code}
                          </span>
                          <span className="text-sm font-semibold text-blue-400">
                            ({currency.symbol})
                          </span>
                        </div>
                        <div className="text-xs text-fg-muted mt-0.5">
                          {currency.nativeName} · {currency.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-mono text-fg-muted block">
                          1 USD ≈ {rate.toFixed(currency.id === 'USD' ? 2 : 3)} {currency.code}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white shrink-0 shadow-sm">
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
              {filteredCurrencies.length === 0 && (
                <div className="py-8 text-center text-fg-muted text-sm">
                  {t('common.none', 'No results found.')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-line bg-surface flex items-center justify-between text-xs text-fg-muted">
          <span className="line-clamp-1">
            {t('selector.ratesNote', 'Balances and KPIs are converted in real-time from USD/USDT.')}
          </span>
          <button
            onClick={handleRefreshRates}
            disabled={isRefreshingRates}
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors ml-2 shrink-0 disabled:opacity-50"
            title="Atualizar cotações cambiais"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRates ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh', 'Refresh')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
