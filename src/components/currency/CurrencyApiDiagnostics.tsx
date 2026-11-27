import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, RefreshCw, CheckCircle2, AlertCircle, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../../store/settingsStore';
import { CurrencyService } from '../../services/currency/CurrencyService';

export function CurrencyApiDiagnostics() {
  const { t, i18n } = useTranslation();
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success border border-success/20">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          {t('currencyDiagnostics.connected', 'Connected')}
        </span>
      );
    }
    if (status === 'cached') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-tone-amber border border-warning/20">
          <span className="w-1.5 h-1.5 rounded-full bg-warning" />
          {t('currencyDiagnostics.cached', 'Cached')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-danger/10 text-danger border border-danger/20">
        <span className="w-1.5 h-1.5 rounded-full bg-danger" />
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
    return new Date(ts).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div
      data-testid="currency-api-diagnostics"
      className="bg-surface border border-line rounded-xl p-4 text-fg"
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-line/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <div>
            <h4 className="text-xs font-semibold text-fg">
              {t('currencyDiagnostics.title', 'Currency API Diagnostics')}
            </h4>
            <p className="text-[10px] text-fg-muted">
              {t('currencyDiagnostics.subtitle', 'Live connection health & latency monitor')}
            </p>
          </div>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="px-2.5 py-1 bg-elevated hover:bg-line border border-line text-[11px] font-medium text-fg rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-accent' : 'text-fg-muted'}`} />
          <span>{isTesting ? t('currencyDiagnostics.testing', 'Testing...') : t('currencyDiagnostics.testBtn', 'Test Connection')}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Frankfurter Diagnostic Card */}
        <div className="bg-elevated border border-line/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-fg">Frankfurter v2</span>
              <span className="text-[10px] text-fg-muted font-mono">({t('currencyDiagnostics.fiatRates', 'Fiat Rates')})</span>
            </div>
            {renderStatusBadge(frankfurter.status)}
          </div>

          <p className="text-[10px] font-mono text-fg-muted truncate" title={frankfurter.endpoint}>
            {frankfurter.endpoint}
          </p>

          <div className="pt-2 border-t border-line/40 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-fg-muted flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.lastSync', 'Last Sync')}
              </span>
              <span className="font-mono text-fg mt-0.5 block">
                {formatTimestamp(frankfurter.lastUpdated)}
              </span>
            </div>
            <div>
              <span className="text-fg-muted flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.latency', 'Latency')}
              </span>
              <span className="font-mono text-fg mt-0.5 block">
                {frankfurter.latencyMs !== undefined ? `${frankfurter.latencyMs} ms` : '--'}
              </span>
            </div>
          </div>

          {frankfurter.error && (
            <div className="text-[10px] text-danger bg-danger/10 p-1.5 rounded border border-danger/20 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{frankfurter.error}</span>
            </div>
          )}
        </div>

        {/* CoinGecko Diagnostic Card */}
        <div className="bg-elevated border border-line/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-fg">CoinGecko v3</span>
              <span className="text-[10px] text-tone-cyan font-mono">(USD/USDT)</span>
            </div>
            {renderStatusBadge(coingecko.status)}
          </div>

          <p className="text-[10px] font-mono text-fg-muted truncate" title={coingecko.endpoint}>
            {coingecko.endpoint}
          </p>

          <div className="pt-2 border-t border-line/40 grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-fg-muted flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.lastSync', 'Last Sync')}
              </span>
              <span className="font-mono text-fg mt-0.5 block">
                {formatTimestamp(coingecko.lastUpdated)}
              </span>
            </div>
            <div>
              <span className="text-fg-muted flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {t('currencyDiagnostics.quote', 'Current Quote')}
              </span>
              <span className="font-mono text-tone-cyan mt-0.5 block">
                1 USDT ≈ ${usdtRate > 0 ? usdtRate.toFixed(4) : '1.0000'}
              </span>
            </div>
          </div>

          {coingecko.error && (
            <div className="text-[10px] text-danger bg-danger/10 p-1.5 rounded border border-danger/20 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{coingecko.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

