import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, KeyRound, FlaskConical, ArrowRight, CheckCircle2, Lock, LayoutDashboard } from 'lucide-react';
import { useApiKeysStore } from '../../store/apiKeysStore';
import { useSettingsStore } from '../../store/settingsStore';
import { isVaultConfigured } from '../../utils/vaultHelpers';
import { ExchangeIcon } from '../ui/ExchangeIcon';

interface StepQuickStartProps {
  onConfigureVaultAndKey: () => void;
  onActivateSimulation: () => void;
  onGoToDashboard: () => void;
}

export function StepQuickStart({
  onConfigureVaultAndKey,
  onActivateSimulation,
  onGoToDashboard,
}: StepQuickStartProps) {
  const { t } = useTranslation();
  const { isInitialized, encryptedData, keys } = useApiKeysStore();
  const useMockData = useSettingsStore((s) => s.useMockData);

  const vaultReady = isVaultConfigured({ isInitialized, encryptedData });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.15fr] gap-6 items-stretch">
      {/* Left Column: Read-Only API Checklist & Current Status */}
      <div className="flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-accent">
              {t('onboarding.step6.kicker', 'First Steps')}
            </p>
            <h3 className="text-lg sm:text-xl font-semibold text-fg tracking-tight text-balance">
              {t('onboarding.step6.title', 'Choose how you want to start')}
            </h3>
            <p className="text-xs text-fg-muted leading-relaxed">
              {t('onboarding.step6.desc', 'Explore immediately with realistic mock data or secure your local vault to connect your Read-Only exchange keys.')}
            </p>
          </div>

          <div className="bg-elevated border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success shrink-0" />
              <h4 className="text-xs font-semibold text-fg">
                {t('onboarding.step6.readOnlyTitle', 'Read-Only Key Checklist')}
              </h4>
            </div>

            <div className="space-y-2 text-xs text-fg-muted leading-relaxed">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                <span>
                  {t('onboarding.step6.readOnlyRule', 'Enable ONLY Read-Only permissions on your exchange. Never enable Withdrawal or Trade permissions.')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  <ExchangeIcon exchange="bitget" className="w-3.5 h-3.5" />
                  <ExchangeIcon exchange="okx" className="w-3.5 h-3.5" />
                </div>
                <span>
                  {t('onboarding.step6.bitgetRule', 'Bitget & OKX require API Key, Secret, and Passphrase.')}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ExchangeIcon exchange="bybit" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {t('onboarding.step6.bybitRule', 'Bybit requires API Key, Secret, and Account Region.')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Local Status Summary */}
        <div className="border-t border-line pt-3 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-fg-muted">
            <Lock className={`w-3.5 h-3.5 shrink-0 ${vaultReady ? 'text-success' : 'text-warning'}`} />
            <span>
              {vaultReady
                ? t('onboarding.step6.vaultStatusConfigured', 'Security Vault is active ({{count}} key(s) saved)', {
                    count: keys.length,
                  })
                : t('onboarding.step6.vaultStatusPending', 'Security Vault not configured yet')}
            </span>
          </div>
          {useMockData && (
            <div className="flex items-center gap-2 text-success font-medium">
              <FlaskConical className="w-3.5 h-3.5 shrink-0" />
              <span>{t('onboarding.step6.simulationActiveTag', 'Simulation Mode is currently ON')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Action Launchpad */}
      <div className="bg-canvas border border-line rounded-xl p-5 flex flex-col justify-center gap-3">
        {/* Primary CTA: Vault & API Key */}
        <button
          type="button"
          onClick={onConfigureVaultAndKey}
          className="w-full p-4 rounded-xl bg-accent hover:bg-accent-hover text-white text-left transition-colors cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
              <KeyRound className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold block">
                {vaultReady
                  ? t('onboarding.step6.ctaManageKeys', 'Go to API Keys Manager')
                  : t('onboarding.step6.ctaVaultAndKey', 'Activate Vault & Add API Key')}
              </span>
              <span className="text-xs text-white/85 block mt-0.5 leading-relaxed">
                PBKDF2 · AES-GCM-256 · Bitget / Bybit / OKX
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </button>

        {/* Secondary CTA: Simulation Mode */}
        <button
          type="button"
          onClick={onActivateSimulation}
          className="w-full p-4 rounded-xl bg-surface border border-line hover:border-accent/50 hover:bg-elevated-hover text-left transition-colors cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-elevated border border-line flex items-center justify-center shrink-0 mt-0.5 text-success">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-fg block">
                {useMockData
                  ? t('onboarding.step6.ctaSimulationActive', 'Continue in Simulation Mode')
                  : t('onboarding.step6.ctaSimulation', 'Explore with Simulation Mode')}
              </span>
              <span className="text-xs text-fg-muted block mt-0.5 leading-relaxed">
                {t('settings.simulationMode.desc', 'Simulate exchange balances, positions and transactions without API keys.')}
              </span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-fg-muted shrink-0" />
        </button>

        {/* Tertiary CTA: Go to Dashboard */}
        <button
          type="button"
          onClick={onGoToDashboard}
          className="w-full px-4 py-2.5 rounded-xl bg-elevated border border-line hover:border-line-strong text-fg-muted hover:text-fg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>{t('onboarding.step6.ctaDashboard', 'Go to Dashboard')}</span>
        </button>
      </div>
    </div>
  );
}
