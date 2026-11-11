import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, TrendingUp, HelpCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settingsStore';
import { CurrencyService } from '../../services/currency/CurrencyService';
import {
  SUPPORTED_FIAT_CURRENCIES,
  SupportedFiatCurrency,
} from '../../services/currency/currencyTypes';
import { AppTooltip } from '../ui/Tooltip';
import { FlagIcon } from '../ui/FlagIcon';

export function CurrencyRatesWidget() {
  const { t } = useTranslation();
  const {
    fiatCurrency,
    setFiatCurrency,
    fiatRates,
    fiatRatesLastUpdated,
    fiatRatesSource,
    fiatRatesStatus,
    fiatRatesTtlMinutes,
    usdtRate,
    usdtRateStatus,
  } = useSettingsStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  // Trigger pulse/fade-in animation whenever rates update
  useEffect(() => {
    if (fiatRatesLastUpdated) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 700);
      return () => clearTimeout(timer);
    }
  }, [fiatRatesLastUpdated]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setIsPulsing(true);
    try {
      // Force fetch by passing 0 TTL
      await CurrencyService.fetchFiatRates(0);
      toast.success(t('currencyWidget.refreshedSuccess', 'Currency rates refreshed successfully'), { id: 'rates-refresh-widget' });
    } catch {
      toast.error(t('currencyWidget.refreshedError', 'Could not refresh live rates. Using cached rates.'), { id: 'rates-refresh-err' });
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setIsPulsing(false), 700);
    }
  };

  const formattedTime = fiatRatesLastUpdated
    ? new Date(fiatRatesLastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  const statusBadge = () => {
    if (fiatRatesStatus === 'live' && usdtRateStatus === 'live') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t('currencyWidget.statusLive', 'Live')}: Frankfurter & CoinGecko
        </span>
      );
    }
    if (fiatRatesStatus === 'cached' || usdtRateStatus === 'cached') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {t('currencyWidget.statusCached', 'Cached')} ({fiatRatesTtlMinutes}m TTL)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {t('currencyWidget.statusFallback', 'Safety Mode')}
      </span>
    );
  };

  const currenciesList = Object.values(SUPPORTED_FIAT_CURRENCIES);
  const usdtRateSafe = usdtRate > 0 ? usdtRate : 1.0;
  const usdToUsdt = 1 / usdtRateSafe;

  return (
    <div
      data-testid="currency-rates-widget"
      className="bg-surface border border-line rounded-xl p-5 mb-6 text-fg transition-all shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-fg tracking-wide">
                {t('currencyWidget.title', 'Global Currency Rates')}
              </h3>
              <AppTooltip description={t('settings.fallbackExplanation', 'If external rate providers become unreachable, the terminal uses your most recent cached rates, with static safety defaults as ultimate protection.')}>
                <HelpCircle className="w-3.5 h-3.5 text-fg-muted hover:text-fg cursor-help transition-colors" />
              </AppTooltip>
            </div>
            <p className="text-[11px] text-fg-muted mt-0.5">
              {t('currencyWidget.subtitle', 'Real-time reference exchange rates against USD')} • {t('currencyWidget.base', 'Base: 1 USD')}
            </p>
          </div>
        </div>

        {/* Status Badge & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {statusBadge()}

          <span className="text-[11px] font-mono text-fg-muted">
            {t('currencyWidget.lastUpdated', { time: formattedTime })}
          </span>

          <AppTooltip description={t('currencyWidget.refreshTooltip', 'Refresh rates now')}>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-elevated hover:bg-line border border-line text-fg-muted hover:text-fg transition-colors disabled:opacity-50"
              aria-label="Refresh rates"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            </button>
          </AppTooltip>
        </div>
      </div>

      {/* Grid of Currencies (Fiat + USDT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
        {currenciesList.map((curr) => {
          const rate = fiatRates?.[curr.id] || 1;
          const isSelected = fiatCurrency === curr.id;
          const inverseRate = rate > 0 ? (1 / rate) : 1;

          return (
            <div
              key={curr.id}
              onClick={() => {
                if (!isSelected) {
                  setFiatCurrency(curr.id as SupportedFiatCurrency);
                  toast.success(t('toasts.quickCurrencySet', 'Active currency set to {{currency}}', { currency: curr.code }), { id: 'quick-curr-change' });
                }
              }}
              className={`p-3.5 rounded-xl border select-none relative group transition-all duration-500 ease-out cursor-pointer ${
                isPulsing ? 'scale-[1.015] ring-1 ring-accent/40 bg-[#1e222a]' : ''
              } ${
                isSelected
                  ? 'bg-accent/10 border-accent/40 shadow-sm'
                  : 'bg-elevated border-line/60 hover:border-[#3d4047] hover:bg-[#1f2025]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FlagIcon code={curr.id} className="w-6 h-4.5 rounded-xs shadow-xs" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs tracking-wider text-fg">
                        {curr.code}
                      </span>
                      <span className="text-[10px] text-fg-muted font-mono">
                        ({curr.symbol})
                      </span>
                    </div>
                    <span className="text-[10px] text-fg-muted block line-clamp-1">
                      {curr.nativeName}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded border border-accent/20">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('currencyWidget.activeBadge', 'Active')}
                  </span>
                ) : (
                  <span className="text-[10px] text-fg-muted group-hover:text-fg-muted transition-colors">
                    Click to select
                  </span>
                )}
              </div>

              {/* Rate Metrics */}
              <div className="pt-2 border-t border-line/40 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-fg-muted block">1 USD =</span>
                  <span className="text-sm font-semibold font-mono text-fg">
                    {curr.id === 'USD' ? '1.0000' : rate.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-fg-muted ml-1 font-mono">{curr.code}</span>
                </div>

                {curr.id !== 'USD' && (
                  <div className="text-right">
                    <span className="text-[10px] text-fg-muted block">1 {curr.code} =</span>
                    <span className="text-xs font-medium font-mono text-fg-muted">
                      ${inverseRate.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* USDT Stablecoin Card */}
        <div
          data-testid="currency-card-usdt"
          className={`p-3.5 rounded-xl border select-none relative group transition-all duration-500 ease-out bg-elevated border-line/60 hover:border-[#26a69a]/40 hover:bg-[#1a2123] ${
            isPulsing ? 'scale-[1.015] ring-1 ring-[#26a69a]/40 bg-[#162224]' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#26a69a]/20 border border-[#26a69a]/40 text-[#26a69a] flex items-center justify-center font-bold text-xs">
                ₮
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs tracking-wider text-fg">
                    USDT
                  </span>
                  <span className="text-[10px] text-[#26a69a] font-mono">
                    (USD/USDT)
                  </span>
                </div>
                <span className="text-[10px] text-fg-muted block line-clamp-1">
                  Tether USD
                </span>
              </div>
            </div>

            <span className="text-[9px] font-mono text-[#26a69a] bg-[#26a69a]/10 px-1.5 py-0.5 rounded border border-[#26a69a]/20">
              CoinGecko
            </span>
          </div>

          {/* Rate Metrics */}
          <div className="pt-2 border-t border-line/40 flex items-baseline justify-between">
            <div>
              <span className="text-[10px] text-fg-muted block">1 USD =</span>
              <span className="text-sm font-semibold font-mono text-[#26a69a]">
                {usdToUsdt.toFixed(4)}
              </span>
              <span className="text-[10px] text-fg-muted ml-1 font-mono">USDT</span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-fg-muted block">1 USDT =</span>
              <span className="text-xs font-medium font-mono text-fg">
                ${usdtRateSafe.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
