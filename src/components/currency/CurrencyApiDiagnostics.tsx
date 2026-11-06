import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settingsStore';
import { CurrencyService } from '../../services/currency/CurrencyService';

export function CurrencyApiDiagnostics() {
  const { t } = useTranslation();
  const { apiDiagnostics, usdtRate } = useSettingsStore();
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      await CurrencyService.fetchFiatRates(0);
      toast.success(t('currencyDiagnostics.testSuccess', 'Currency API connectivity verified successfully'), {
        id: 'currency-diag-test',
      });
    } catch {
      toast.error(t('currencyDiagnostics.testError', 'Failed to connect to one or more currency APIs'), {
        id: 'currency-diag-test-err',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const renderStatusBadge = (status: 'connected' | 'cached' | 'error') => {
    if (status === 'connected') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t('currencyDiagnostics.connected', 'Connected')}
        </span>
      );
    }
    if (status === 'cached') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {t('currencyDiagnostics.cached', 'Cached')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {t('currencyDiagnostics.offline', 'Offline')}
      </span>
    );
  };

  const frankfurter = apiDiagnostics?.frankfurter || {
    status: 'connected',
    lastUpdated: null,
    latencyMs: 0,
    endpoint: 'https://api.frankfurter.dev/v2/rates',
  };

  const coingecko = apiDiagnostics?.coingecko || {
    status: 'connected',
    lastUpdated: null,
    latencyMs: 0,
    endpoint: 'https://api.coingecko.com/api/v3/simple/price',
  };

  const formatTimestamp = (ts: number | null) => {
    if (!ts) return t('currencyDiagnostics.never', 'Never');
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      data-testid="currency-api-diagnostics"
      className="bg-[#151619] border border-[#2a2b30] rounded-xl p-4 text-white"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2a2b30]/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2F6BFF]" />
          <div>
            <h4 className="text-xs font-semibold text-white">
              {t('currencyDiagnostics.title', 'Currency API Diagnostics')}
            </h4>
            <p className="text-[10px] text-[#8E9299]">
              {t('currencyDiagnostics.subtitle', 'Live connection health & latency monitor')}
            </p>
          </div>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="px-2.5 py-1 bg-[#1e2024] hover:bg-[#2a2b30] border border-[#2a2b30] text-[11px] font-medium text-white rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-[#2F6BFF]' : 'text-[#8E9299]'}`} />
          <span>{isTesting ? t('currencyDiagnostics.testing', 'Testing...') : t('currencyDiagnostics.testBtn', 'Test Connection')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Frankfurter Diagnostic Card */}
        <div className="bg-[#1a1b1e] border border-[#2a2b30]/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">Frankfurter v2</span>
              <span className="text-[10px] text-[#8E9299] font-mono">(Fiat Rates)</span>
            </div>
            {renderStatusBadge(frankfurter.status)}
          </div>

          <p className="text-[10px] font-mono text-[#8E9299] truncate" title={frankfurter.endpoint}>
            {frankfurter.endpoint}
          </p>

          <div className="pt-2 border-t border-[#2a2b30]/40 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-[#8E9299] flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.lastSync', 'Last Sync')}
              </span>
              <span className="font-mono text-white mt-0.5 block">
                {formatTimestamp(frankfurter.lastUpdated)}
              </span>
            </div>
            <div>
              <span className="text-[#8E9299] flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.latency', 'Latency')}
              </span>
              <span className="font-mono text-white mt-0.5 block">
                {frankfurter.latencyMs !== undefined ? `${frankfurter.latencyMs} ms` : '--'}
              </span>
            </div>
          </div>

          {frankfurter.error && (
            <div className="text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{frankfurter.error}</span>
            </div>
          )}
        </div>

        {/* CoinGecko Diagnostic Card */}
        <div className="bg-[#1a1b1e] border border-[#2a2b30]/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">CoinGecko v3</span>
              <span className="text-[10px] text-[#26a69a] font-mono">(USD/USDT)</span>
            </div>
            {renderStatusBadge(coingecko.status)}
          </div>

          <p className="text-[10px] font-mono text-[#8E9299] truncate" title={coingecko.endpoint}>
            {coingecko.endpoint}
          </p>

          <div className="pt-2 border-t border-[#2a2b30]/40 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-[#8E9299] flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.lastSync', 'Last Sync')}
              </span>
              <span className="font-mono text-white mt-0.5 block">
                {formatTimestamp(coingecko.lastUpdated)}
              </span>
            </div>
            <div>
              <span className="text-[#8E9299] flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.quote', 'Current Quote')}
              </span>
              <span className="font-mono text-[#26a69a] mt-0.5 block">
                1 USDT ≈ ${usdtRate > 0 ? usdtRate.toFixed(4) : '1.0000'}
              </span>
            </div>
          </div>

          {coingecko.error && (
            <div className="text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{coingecko.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

