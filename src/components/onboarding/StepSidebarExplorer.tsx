import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, CheckCircle2, ChevronDown, Loader2, Lock, Play, RefreshCw } from 'lucide-react';
import { getSidebarModules } from './onboardingData';
import logo1 from '../../assets/CriptoDashboard-logo1.PNG';
import { ExchangeIcon } from '../ui/ExchangeIcon';
import { CoinIcon } from '../ui/CoinIcon';
import { Sparkline } from '../ui/Sparkline';

interface StepSidebarExplorerProps {
  onNavigateToTab: (tab: string) => void;
}

const SUB_ITEMS_MAP: Record<string, string[]> = {
  hedgePro: ['Hedge Pro'],
  positions: ['Open Positions', 'Closed Positions'],
  orders: ['Open Orders', 'Orders History'],
  trade: ['Trade History'],
  transactions: ['Consolidated Net Change', 'Bybit', 'Bitget', 'OKX'],
  analytics: ['Portfolio Performance', 'Market Analytics', 'PnL by Symbol', 'Funding Fees'],
};

function ModuleScreenPreview({ moduleId }: { moduleId: string }) {
  switch (moduleId) {
    case 'dashboard':
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-elevated border border-line rounded-lg p-2">
              <span className="text-[9px] text-fg-muted uppercase block">Total Equity</span>
              <span className="text-xs font-mono font-bold text-fg">$24,850</span>
            </div>
            <div className="bg-elevated border border-line rounded-lg p-2">
              <span className="text-[9px] text-fg-muted uppercase block">Unrealized P&L</span>
              <span className="text-xs font-mono font-bold text-emerald-500">+$942.10</span>
            </div>
            <div className="bg-elevated border border-line rounded-lg p-2">
              <span className="text-[9px] text-fg-muted uppercase block">Hedge Coverage</span>
              <span className="text-xs font-mono font-bold text-accent">57.1%</span>
            </div>
          </div>
          <div className="bg-elevated border border-line rounded-lg p-2.5 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <ExchangeIcon exchange="bybit" className="w-3.5 h-3.5" />
              <span className="text-fg">Bybit UTA</span>
            </div>
            <span className="text-fg font-semibold">$10,934.00</span>
          </div>
        </div>
      );
    case 'hedgePro':
      return (
        <div className="space-y-2">
          <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-emerald-500 font-semibold">Protected: $14,200 (57.1%)</span>
              <span className="text-fg-muted">Exposed: $10,650</span>
            </div>
            <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: '57%' }} />
              <div className="h-full bg-fg/75" style={{ width: '43%' }} />
            </div>
          </div>
          <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CoinIcon symbol="BTC" className="w-3.5 h-3.5" />
                <span className="font-semibold text-fg">BTC · 1x Inverse Short</span>
              </div>
              <span className="text-emerald-500">Delta ~0.00</span>
            </div>
            <div className="flex items-center justify-between text-fg-muted text-[10px]">
              <span>Spot 0.145 BTC vs Short 9,800 USD</span>
              <span className="text-fg">Net: $0</span>
            </div>
          </div>
        </div>
      );
    case 'positions':
      return (
        <div className="space-y-2 text-[11px] font-mono">
          {[
            { pair: 'BTCUSD', side: 'SHORT 1x', ex: 'bybit', entry: '68,420', mark: '66,180', pnl: '+$412.80' },
            { pair: 'ETHUSDT', side: 'LONG 3x', ex: 'bitget', entry: '3,140', mark: '3,290', pnl: '+$529.30' },
          ].map((pos) => (
            <div key={pos.pair} className="bg-elevated border border-line rounded-lg p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <CoinIcon symbol={pos.pair} className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-fg">{pos.pair}</span>
                    <span className={pos.side.startsWith('SHORT') ? 'text-danger text-[10px]' : 'text-success text-[10px]'}>
                      {pos.side}
                    </span>
                  </div>
                  <span className="text-[10px] text-fg-muted block">
                    Entry {pos.entry} · Mark {pos.mark}
                  </span>
                </div>
              </div>
              <span className="text-emerald-500 font-semibold shrink-0">{pos.pnl}</span>
            </div>
          ))}
        </div>
      );
    case 'orders':
      return (
        <div className="bg-elevated border border-line rounded-lg overflow-hidden text-[10px] font-mono">
          <div className="grid grid-cols-4 px-2.5 py-1.5 border-b border-line text-fg-muted uppercase">
            <span>Symbol</span>
            <span>Side</span>
            <span className="text-right">Price</span>
            <span className="text-right">Status</span>
          </div>
          <div className="grid grid-cols-4 px-2.5 py-2 border-b border-line items-center">
            <span className="text-fg font-semibold">BTCUSDT</span>
            <span className="text-success">LIMIT BUY</span>
            <span className="text-right text-fg">$64,500</span>
            <span className="text-right text-accent">OPEN</span>
          </div>
          <div className="grid grid-cols-4 px-2.5 py-2 items-center">
            <span className="text-fg font-semibold">SOLUSDT</span>
            <span className="text-danger">TP SELL</span>
            <span className="text-right text-fg">$192.00</span>
            <span className="text-right text-fg-muted">FILLED</span>
          </div>
        </div>
      );
    case 'trade':
      return (
        <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-2 text-[10px] font-mono">
          <div className="flex items-center justify-between text-fg-muted border-b border-line pb-1">
            <span>Latest Execution Fills</span>
            <span>Fee · Net</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg">ETHUSDT · 1.50 ETH @ $3,210</span>
            <span className="text-emerald-500">-$1.44 fee</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg">BTCUSD · 2,000 USD @ $67,100</span>
            <span className="text-emerald-500">-$0.40 fee</span>
          </div>
        </div>
      );
    case 'transactions':
      return (
        <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-2 text-[10px] font-mono">
          <div className="flex items-center justify-between text-fg-muted border-b border-line pb-1">
            <span>Consolidated Net Change</span>
            <span className="text-emerald-500">+$1,248.50</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg">Bybit · Funding Settlement</span>
            <span className="text-emerald-500">+$18.42</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg">OKX · Futures Realized PnL</span>
            <span className="text-emerald-500">+$288.08</span>
          </div>
        </div>
      );
    case 'analytics':
      return (
        <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-fg">Equity Curve · Funding APR</span>
            <span className="font-mono text-emerald-500 font-semibold">+14.8% APR</span>
          </div>
          <Sparkline data={[20, 24, 22, 31, 35, 33, 46, 54, 62]} color="emerald" width={240} height={36} />
          <div className="flex items-center justify-between text-[10px] font-mono text-fg-muted">
            <span>Win Rate: 68.4%</span>
            <span>BTC · ETH · SOL</span>
          </div>
        </div>
      );
    case 'reports':
      return (
        <div className="bg-elevated border border-line rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-fg block truncate">
              Portfolio Evolution Statement
            </span>
            <span className="text-[10px] font-mono text-fg-muted block">
              30D / 90D / YTD · Consolidated PDF & CSV
            </span>
          </div>
          <span className="px-2 py-1 rounded bg-accent/10 border border-accent/30 text-[10px] font-mono text-accent shrink-0">
            EXPORT
          </span>
        </div>
      );
    case 'apiKeys':
      return (
        <div className="space-y-2">
          {[
            { ex: 'bybit', label: 'Bybit Main UTA', badge: 'ACTIVE' },
            { ex: 'bitget', label: 'Bitget Portfolio', badge: 'AES-256' },
          ].map((item) => (
            <div key={item.ex} className="bg-elevated border border-line rounded-lg px-2.5 py-2 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <ExchangeIcon exchange={item.ex} className="w-4 h-4" />
                <span className="font-medium text-fg">{item.label}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-success">
                <Lock className="w-2.5 h-2.5" />
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      );
    case 'logs':
      return (
        <div className="bg-elevated border border-line rounded-lg p-2.5 font-mono text-[10px] space-y-1">
          <div>
            <span className="text-fg-muted">[08:47:14]</span>{' '}
            <span className="text-success">[INFO]</span>{' '}
            <span className="text-fg">BybitV5 equity synced (14 assets)</span>
          </div>
          <div>
            <span className="text-fg-muted">[08:47:15]</span>{' '}
            <span className="text-accent">[DATA]</span>{' '}
            <span className="text-fg">BitgetUTA fetched 3 inverse positions</span>
          </div>
          <div>
            <span className="text-fg-muted">[08:47:18]</span>{' '}
            <span className="text-[#F2C94C]">[WARN]</span>{' '}
            <span className="text-fg-muted">OkxV5 rate backoff 1200ms</span>
          </div>
        </div>
      );
    case 'apiTester':
      return (
        <div className="bg-elevated border border-line rounded-lg p-2.5 font-mono text-[10px] space-y-1.5">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <span className="text-fg">GET /v5/account/wallet-balance</span>
            <span className="inline-flex items-center gap-1 text-success">
              <Play className="w-2.5 h-2.5" />
              200 OK
            </span>
          </div>
          <div className="text-fg-muted truncate">
            {`{ "retCode": 0, "result": { "list": [{ "accountType": "UNIFIED" }] } }`}
          </div>
        </div>
      );
    case 'aiSettings':
      return (
        <div className="bg-elevated border border-line rounded-lg p-2.5 space-y-1.5 text-[10px]">
          <div className="flex items-center justify-between font-semibold text-fg">
            <span>PIKA Quantitative Assistant</span>
            <span className="font-mono text-success">READY</span>
          </div>
          <div className="flex items-center justify-between font-mono text-fg-muted">
            <span>Read-Only Portfolio Context · Tool Audit Log</span>
            <span>Daily Limit</span>
          </div>
        </div>
      );
    case 'settings':
    default:
      return (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-elevated border border-line rounded-lg p-2 space-y-1">
            <span className="font-medium text-fg block">REST Polling</span>
            <div className="flex items-center justify-between font-mono text-success">
              <span className="inline-flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5" /> Auto
              </span>
              <span>5s</span>
            </div>
          </div>
          <div className="bg-elevated border border-line rounded-lg p-2 space-y-1">
            <span className="font-medium text-fg block">Vault & Cache</span>
            <span className="font-mono text-accent block">IndexedDB · .enc</span>
          </div>
        </div>
      );
  }
}

export function StepSidebarExplorer({ onNavigateToTab }: StepSidebarExplorerProps) {
  const { t } = useTranslation();
  const modules = useMemo(() => getSidebarModules(), []);
  const [selectedId, setSelectedId] = useState<string>('dashboard');
  const [isAutoCycling, setIsAutoCycling] = useState(true);

  useEffect(() => {
    if (!isAutoCycling || modules.length === 0) return;
    const timer = window.setInterval(() => {
      setSelectedId((prev) => {
        const idx = modules.findIndex((m) => m.id === prev);
        const nextIdx = (idx + 1) % modules.length;
        return modules[nextIdx].id;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isAutoCycling, modules]);

  const handleSelectModule = (id: string) => {
    setIsAutoCycling(false);
    setSelectedId(id);
  };

  const primaryModules = modules.filter((m) => m.group === 'primary');
  const systemModules = modules.filter((m) => m.group === 'system');
  const activeModule = modules.find((m) => m.id === selectedId) || modules[0];
  const ActiveIcon = activeModule.icon;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-5 items-stretch">
      {/* Left Column: Authentic Sidebar Replica */}
      <div className="flex flex-col gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-accent">
            {t('onboarding.step4.kicker', 'Navigation Architecture')}
          </p>
          <h3 className="text-lg sm:text-xl font-semibold text-fg tracking-tight text-balance">
            {t('onboarding.step4.title', 'Explore Sidebar modules by workflow')}
          </h3>
          <p className="text-xs text-fg-muted leading-relaxed">
            {t(
              'onboarding.step4.desc',
              'The sidebar separates daily trading and analytics tools at the top from technical infrastructure at the bottom.'
            )}
          </p>
        </div>

        {/* Real Sidebar.tsx Miniature */}
        <div className="bg-surface border border-line rounded-xl overflow-hidden flex flex-col">
          {/* Brand Header matching Sidebar.tsx:178-193 */}
          <div className="px-3.5 py-2.5 border-b border-line flex items-center gap-2.5 bg-surface">
            <img src={logo1} alt="Logo" className="w-6 h-6 object-contain shrink-0" />
            <div className="min-w-0 leading-tight">
              <span className="text-xs font-bold text-fg block truncate">Portfolio Manager</span>
              <span className="text-[10px] text-fg-muted block truncate">
                {t('nav.cryptoMultiExchange', 'Crypto Multi-Exchange')}
              </span>
            </div>
          </div>

          {/* Primary Nav Items */}
          <div className="p-2 space-y-0.5">
            {primaryModules.map((mod) => {
              const Icon = mod.icon;
              const isSelected = mod.id === activeModule.id;
              const subList = SUB_ITEMS_MAP[mod.id];
              return (
                <div key={mod.id} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => handleSelectModule(mod.id)}
                    aria-pressed={isSelected}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isSelected
                        ? 'bg-accent/10 text-accent'
                        : 'text-fg-muted hover:text-fg hover:bg-line/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-fg-muted'}`} />
                      <span className="truncate">{t(mod.titleKey, mod.defaultTitle)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && isAutoCycling && (
                        <Loader2 className="w-3 h-3 text-accent/80 animate-spin" aria-hidden="true" />
                      )}
                      {subList && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            isSelected ? 'rotate-180 text-accent' : 'text-fg-muted/60'
                          }`}
                        />
                      )}
                    </div>
                  </button>

                  {isSelected && subList && (
                    <div className="pl-8 pr-2 py-0.5 space-y-0.5">
                      {subList.map((sub, i) => (
                        <div
                          key={sub}
                          className={`text-[11px] px-2 py-1 rounded truncate ${
                            i === 0 ? 'bg-line/80 text-fg font-medium' : 'text-fg-muted'
                          }`}
                        >
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* System / Infrastructure Footer matching Sidebar.tsx:339-363 */}
          <div className="p-2 border-t border-line space-y-0.5">
            {systemModules.map((mod) => {
              const Icon = mod.icon;
              const isSelected = mod.id === activeModule.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleSelectModule(mod.id)}
                  aria-pressed={isSelected}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isSelected
                      ? 'bg-accent/10 text-accent'
                      : 'text-fg-muted hover:text-fg hover:bg-line/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-accent' : 'text-fg-muted'}`} />
                    <span className="truncate">{t(mod.titleKey, mod.defaultTitle)}</span>
                  </div>
                  {isSelected && isAutoCycling && (
                    <Loader2 className="w-3 h-3 text-accent/80 animate-spin shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Dynamic Module Structural Preview */}
      <div className="bg-canvas border border-line rounded-xl p-5 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center text-accent shrink-0">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-fg truncate">
                  {t(activeModule.titleKey, activeModule.defaultTitle)}
                </h4>
                <p className="text-xs text-fg-muted mt-0.5">
                  {activeModule.group === 'primary'
                    ? t('onboarding.step4.groupPrimary', 'Trading & Analytics')
                    : t('onboarding.step4.groupSystem', 'Infrastructure & Controls')}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted shrink-0">
              {isAutoCycling && (
                <Loader2 className="w-3 h-3 text-accent/80 animate-spin" aria-hidden="true" />
              )}
              <span>
                {isAutoCycling
                  ? t('onboarding.autoCycleActive', 'Auto-cycling every 3s · Click to inspect')
                  : t('onboarding.autoCyclePaused', 'Auto-cycle paused')}
              </span>
            </span>
          </div>

          <p className="text-sm text-fg leading-relaxed">
            {t(activeModule.descKey, activeModule.defaultDesc)}
          </p>

          {/* Module-specific Realistic Screen Replica */}
          <div className="bg-surface border border-line rounded-xl p-3.5 space-y-3">
            <ModuleScreenPreview moduleId={activeModule.id} />

            <div className="border-t border-line pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
                {activeModule.subTags.map((tag, idx) => (
                  <React.Fragment key={tag}>
                    {idx > 0 && <span aria-hidden="true">·</span>}
                    <span className="text-fg">{tag}</span>
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                <span>
                  {activeModule.group === 'primary'
                    ? t('onboarding.step4.previewReqKeys', 'Works with API keys or Simulation Mode')
                    : t('onboarding.step4.previewReqConfig', 'System configuration & diagnostics')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-line pt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-fg-muted font-mono truncate">
            /{activeModule.targetTab}
          </span>
          <button
            type="button"
            onClick={() => onNavigateToTab(activeModule.targetTab)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-line hover:border-accent/50 hover:text-accent text-xs font-medium text-fg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span>
              {t('onboarding.openModule', 'Open {{module}}', {
                module: t(activeModule.titleKey, activeModule.defaultTitle),
              })}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
