import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignLeft,
  Settings as SettingsIcon,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownToLine,
  ChevronDown,
  Search,
  Globe,
  Palette,
  FlaskConical,
  Shield,
} from 'lucide-react';

interface StepOpsAndSettingsProps {
  onNavigateToTab: (tab: string) => void;
}

export function StepOpsAndSettings({ onNavigateToTab }: StepOpsAndSettingsProps) {
  const { t } = useTranslation();
  const [previewTab, setPreviewTab] = useState<'logs' | 'settings'>('logs');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-6 items-stretch">
      {/* Left Column: Logs, Settings & Beta Transparency Notice */}
      <div className="flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs font-medium text-accent">
              {t('onboarding.step5.kicker', 'Operations & Reliability')}
            </p>
            <h3 className="text-lg sm:text-xl font-semibold text-fg tracking-tight text-balance">
              {t('onboarding.step5.title', 'Diagnostics, Logs, and Fine-Tuning')}
            </h3>
            <p className="text-xs text-fg-muted leading-relaxed">
              {t(
                'onboarding.step5.desc',
                'Verify every connection in real time and tune refresh rates, caches, and encrypted backups.'
              )}
            </p>
          </div>

          <div className="divide-y divide-line border-t border-b border-line">
            <div className="py-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-elevated border border-line flex items-center justify-center shrink-0 mt-0.5 text-accent">
                <AlignLeft className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-fg">
                  {t('onboarding.step5.logsTitle', 'Live Connection Logs')}
                </h4>
                <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                  {t(
                    'onboarding.step5.logsDesc',
                    'Filter by severity (INFO, WARN, ERROR, DATA, SYSTEM), search messages, isolate specific accounts, and pause auto-scroll while inspecting payloads.'
                  )}
                </p>
              </div>
            </div>

            <div className="py-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-elevated border border-line flex items-center justify-center shrink-0 mt-0.5 text-accent">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-fg">
                  {t('onboarding.step5.settingsTitle', 'Settings & Encrypted Backups')}
                </h4>
                <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                  {t(
                    'onboarding.step5.settingsDesc',
                    'Adjust REST polling (1s–60s), manage IndexedDB history caches, export or import .enc key backups, or run a Factory Reset.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Clean Beta Data Precision Note */}
        <div className="bg-elevated border border-line rounded-xl p-3.5 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-fg block">
              {t('onboarding.step5.betaTitle', 'Beta Data Precision Notice')}
            </span>
            <span className="text-fg-muted">
              {t(
                'onboarding.step5.betaDesc',
                'Each exchange uses specific rounding and margin formulas; minor differences may occur compared to exchange web portals.'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Authentic Logs & Settings Replicas */}
      <div className="bg-canvas border border-line rounded-xl p-5 flex flex-col justify-between gap-4">
        {/* Segmented Control */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-line">
          <div className="inline-flex items-center p-1 bg-elevated border border-line rounded-lg">
            <button
              type="button"
              onClick={() => setPreviewTab('logs')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                previewTab === 'logs'
                  ? 'bg-accent text-white'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t('onboarding.step5.tabLogs', 'Logs Preview')}
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('settings')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                previewTab === 'settings'
                  ? 'bg-accent text-white'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {t('onboarding.step5.tabSettings', 'Settings Preview')}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab(previewTab === 'logs' ? 'logs' : 'settings')}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-hover transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>
              {previewTab === 'logs'
                ? t('onboarding.step5.openLogsBtn', 'Open Logs')
                : t('onboarding.step5.openSettingsBtn', 'Open Settings')}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {previewTab === 'logs' ? (
          /* Authentic ConnectionLogTerminal.tsx Replica */
          <div className="flex flex-col flex-1 bg-surface overflow-hidden rounded-xl border border-line">
            {/* Toolbar */}
            <div className="py-2 px-3 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono text-fg-muted">
                  {t('logs.title', 'Live Connection Log')}
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-success/10 text-success border border-success/30">
                  <ArrowDownToLine className="w-2.5 h-2.5" />
                  <span>{t('logs.auto', 'Auto')}</span>
                </span>
                <div className="h-3 w-px bg-line mx-0.5 hidden sm:block" />
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-accent/20 text-accent border border-accent/40">
                  {t('logs.presets.all', 'All')}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-fg-muted">
                  {t('logs.presets.important', 'Important')}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-fg-muted">
                  {t('logs.presets.errors', 'Errors')}
                </span>
                <span className="text-[10px] font-mono text-fg-muted ml-1">4/12</span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-fg-muted">
                <span className="bg-elevated border border-line rounded px-2 py-0.5 inline-flex items-center gap-1">
                  <span>5 Levels</span>
                  <ChevronDown className="w-2.5 h-2.5" />
                </span>
                <span className="bg-elevated border border-line rounded px-2 py-0.5 inline-flex items-center gap-1 hidden sm:inline-flex">
                  <Search className="w-2.5 h-2.5" />
                  <span>{t('logs.searchPlaceholder', 'Search logs...')}</span>
                </span>
              </div>
            </div>

            {/* Terminal Stream */}
            <div className="flex-1 p-3.5 font-mono text-[11px] space-y-1.5 bg-canvas/70 leading-relaxed">
              <div>
                <span className="text-fg-muted">[08:47:12]</span>{' '}
                <span className="text-fg">[Vault]</span>{' '}
                <span className="text-fg-muted">[SYSTEM]</span>{' '}
                <span className="text-fg-muted">AES-GCM-256 session unlocked</span>
              </div>
              <div>
                <span className="text-fg-muted">[08:47:14]</span>{' '}
                <span className="text-fg">[BybitV5]</span>{' '}
                <span className="text-success">[INFO]</span>{' '}
                <span className="text-fg">Wallet equity synced (14 assets)</span>
              </div>
              <div>
                <span className="text-fg-muted">[08:47:15]</span>{' '}
                <span className="text-fg">[BitgetUTA]</span>{' '}
                <span className="text-accent">[DATA]</span>{' '}
                <span className="text-fg">Fetched 3 active inverse positions</span>
              </div>
              <div>
                <span className="text-fg-muted">[08:47:18]</span>{' '}
                <span className="text-fg">[OkxV5]</span>{' '}
                <span className="text-tone-amber">[WARN]</span>{' '}
                <span className="text-fg-muted">Rate limit backoff 1200ms</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-success font-bold">&gt;</span>
                <span className="w-1.5 h-3.5 bg-success animate-pulse" />
              </div>
            </div>

            {/* Footer */}
            <div className="h-6 bg-elevated border-t border-line flex items-center px-3 justify-between text-[10px] font-mono text-fg-muted">
              <span>{t('logs.allConnections', 'ALL CONNECTIONS')}</span>
              <span>History: 12 / 500 lines</span>
            </div>
          </div>
        ) : (
          /* Authentic Settings.tsx Grid Replica */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
            {/* Card 1: Language & Currency */}
            <div className="bg-surface border border-line rounded-xl p-3 flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{t('settings.languageAndCurrency', 'Language & Currency')}</span>
              </div>
              <div className="space-y-1.5 text-[10px] font-mono">
                <div className="bg-elevated border border-line rounded px-2 py-1 text-fg truncate">
                  {t('settings.languageLabel', 'Language')} · Auto
                </div>
                <div className="bg-elevated border border-line rounded px-2 py-1 text-fg truncate">
                  USD ($) · TTL 30m
                </div>
              </div>
            </div>

            {/* Card 2: Theme Settings */}
            <div className="bg-surface border border-line rounded-xl p-3 flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Palette className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{t('theme.terminalDark', 'Terminal Dark')}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                {[
                  { label: 'Dark', dots: ['#0b0c10', '#161922', '#22c55e'], active: true },
                  { label: 'Wise', dots: ['#0a0a0a', '#171717', '#2b7fff'], active: false },
                ].map((thm) => (
                  <div
                    key={thm.label}
                    className={`px-2 py-1 rounded border flex items-center justify-between ${
                      thm.active ? 'border-accent bg-accent/10 text-fg' : 'border-line bg-elevated text-fg-muted'
                    }`}
                  >
                    <span>{thm.label}</span>
                    <span className="flex items-center gap-0.5">
                      {thm.dots.map((hex) => (
                        <span
                          key={hex}
                          className="w-2 h-2 rounded-full border border-line-strong"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Preferences & Polling */}
            <div className="bg-surface border border-line rounded-xl p-3 flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <FlaskConical className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="truncate">{t('settings.preferencesTesting', 'Preferences & Testing')}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-fg-muted truncate">1s – 60s REST polling</span>
                <span className="font-mono font-semibold text-success">5s</span>
              </div>
              <div className="text-[10px] font-mono text-fg-muted">
                IndexedDB v12 · 1h–24h
              </div>
            </div>

            {/* Card 4: Security & .enc Backup */}
            <div className="bg-surface border border-line rounded-xl p-3 flex flex-col justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-fg">
                <Shield className="w-3.5 h-3.5 text-warning shrink-0" />
                <span className="truncate">{t('apiKeys.importExportBtn', 'API Key Import/Export')}</span>
              </div>
              <span className="text-[11px] text-fg-muted truncate">
                .enc PBKDF2 Encrypted Backup
              </span>
              <span className="text-[10px] font-mono text-fg-muted">
                Export · Import · Factory Reset
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
