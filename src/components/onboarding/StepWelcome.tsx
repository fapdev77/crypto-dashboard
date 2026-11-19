import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Layers, EyeOff, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { ExchangeIcon } from '../ui/ExchangeIcon';

export function StepWelcome() {
  const { t } = useTranslation();

  const pillars = [
    {
      icon: Layers,
      title: t('onboarding.step1.pillar1Title', 'Consolidated Multi-Exchange View'),
      desc: t('onboarding.step1.pillar1Desc', 'Unify equity, open PnL, orders, and historical net-change reports across all accounts.'),
    },
    {
      icon: ShieldCheck,
      title: t('onboarding.step1.pillar2Title', 'Zero-Trust Client-Side Vault'),
      desc: t('onboarding.step1.pillar2Desc', 'API keys stay encrypted in your browser (PBKDF2 + AES-GCM-256). No intermediate server stores your credentials.'),
    },
    {
      icon: EyeOff,
      title: t('onboarding.step1.pillar3Title', 'Privacy Mode & Offline-Ready PWA'),
      desc: t('onboarding.step1.pillar3Desc', 'Mask sensitive balances with one click for screen sharing and install as a native-like desktop or mobile app.'),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.15fr] gap-6 items-stretch">
      {/* Left Column: Value Proposition & Pillars */}
      <div className="flex flex-col justify-center gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-accent">
            {t('onboarding.step1.kicker', 'Unified Multi-Exchange Terminal')}
          </p>
          <h3 className="text-xl sm:text-2xl font-semibold text-fg tracking-tight leading-snug text-balance">
            {t('onboarding.step1.title', 'Your crypto portfolio in one local command center')}
          </h3>
          <p className="text-sm text-fg-muted leading-relaxed">
            {t('onboarding.step1.desc', 'Monitor spot balances, perpetual futures, inverse hedge positions, funding fees, and execution logs across Bitget, Bybit, and OKX directly from your browser.')}
          </p>
        </div>

        <div className="divide-y divide-line border-t border-b border-line">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-elevated border border-line flex items-center justify-center shrink-0 mt-0.5 text-accent">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-medium text-fg">{pillar.title}</h4>
                  <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Visual Local-First Architecture Preview */}
      <div className="bg-canvas border border-line rounded-xl p-5 flex flex-col justify-between gap-5">
        <div>
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-line">
            <div>
              <h4 className="text-sm font-semibold text-fg">
                {t('onboarding.step1.previewHeader', 'Local-First Architecture')}
              </h4>
              <p className="text-xs text-fg-muted mt-0.5">
                {t('onboarding.step1.previewSub', 'Direct browser-to-exchange communication')}
              </p>
            </div>
            <Lock className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
          </div>

          {/* Visual Flow Diagram */}
          <div className="mt-5 space-y-4">
            <div className="bg-surface border border-line rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold text-fg">
                  {t('onboarding.wizardTitle', 'Crypto Portfolio Manager')}
                </span>
                <span className="text-[11px] font-mono text-success">
                  {t('onboarding.step1.previewEncrypted', 'Local AES-256 Vault')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-elevated border border-line rounded-lg p-2.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-xs text-fg font-medium truncate">PBKDF2 · 600k</span>
                </div>
                <div className="bg-elevated border border-line rounded-lg p-2.5 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-success shrink-0" />
                  <span className="text-xs text-fg font-medium truncate">
                    {t('onboarding.step1.previewReadOnly', 'Read-Only API Keys')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-fg-muted">
              <div className="h-px flex-1 bg-line" />
              <ArrowRight className="w-4 h-4 text-accent rotate-90 sm:rotate-90" aria-hidden="true" />
              <div className="h-px flex-1 bg-line" />
            </div>

            <div className="bg-surface border border-line rounded-xl p-4">
              <p className="text-[11px] font-medium text-fg-muted mb-3">
                {t('onboarding.step1.previewExchanges', 'Supported Exchanges')}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'bitget', name: 'Bitget', scope: 'Classic · UTA' },
                  { id: 'bybit', name: 'Bybit', scope: 'V5 Unified' },
                  { id: 'okx', name: 'OKX', scope: 'V5 Account' },
                ].map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-elevated border border-line rounded-lg p-2.5 flex flex-col items-center text-center gap-1.5"
                  >
                    <ExchangeIcon exchange={ex.id} className="w-6 h-6" />
                    <span className="text-xs font-semibold text-fg">{ex.name}</span>
                    <span className="text-[10px] text-fg-muted font-mono">{ex.scope}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-fg-muted border-t border-line pt-3 leading-relaxed">
          {t('onboarding.step1.previewNote', 'Test freely with built-in Simulation Mode before connecting live keys.')}
        </p>
      </div>
    </div>
  );
}
