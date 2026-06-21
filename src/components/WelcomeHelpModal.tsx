import React, { useState } from 'react';
import { X, LayoutDashboard, KeyRound, EyeOff, RefreshCw, HelpCircle, Globe } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface WelcomeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeHelpModal({ isOpen, onClose }: WelcomeHelpModalProps) {
  const { showWelcomeOnStartup, setShowWelcomeOnStartup } = useSettingsStore();
  const [lang, setLang] = useState<'en' | 'pt'>('pt');

  if (!isOpen) return null;

  const texts = {
    en: {
      title: "Welcome to Crypto Dashboard",
      subtitle: "Onboarding & Quick Start Guide",
      intro: "Monitor trading performance, balances, active positions, and order history across Bitget, Bybit, and OKX in one unified terminal.",
      feature1Title: "Overview & Analytics",
      feature1Desc: "Track unified balances, positions, margin ratios, and view advanced analytics like realized/unrealized PnL charts.",
      feature2Title: "Secure API Connections",
      feature2Desc: <>Connect exchanges via the <strong>API Keys</strong> page. All credentials are saved strictly in your local browser storage using a zero-trust model.</>,
      feature3Title: "Privacy Mode",
      feature3Desc: <>Click the <strong>Eye Icon</strong> in the header to toggle Privacy Mode. This hides balance, size, and PnL values for safe public sharing or streaming.</>,
      feature4Title: "Automatic Syncing & Cache",
      feature4Desc: <>Position history runs on a background cache. Customize update intervals or trigger a manual sync under the <strong>Settings</strong> page.</>,
      showOnStartup: "Show on startup",
      getStarted: "Get Started"
    },
    pt: {
      title: "Bem-vindo ao Crypto Dashboard",
      subtitle: "Guia de Integração e Início Rápido",
      intro: "Monitore seu desempenho de trading, saldos, posições ativas e histórico de ordens na Bitget, Bybit e OKX em um único terminal unificado.",
      feature1Title: "Visão Geral e Analytics",
      feature1Desc: "Acompanhe saldos unificados, posições, taxas de margem e visualize análises avançadas como gráficos de PnL realizado/não realizado.",
      feature2Title: "Conexões Seguras de API",
      feature2Desc: <>Conecte as corretoras através da página <strong>API Keys</strong>. Todas as credenciais são salvas estritamente no armazenamento local do seu navegador usando um modelo zero-trust.</>,
      feature3Title: "Modo Privacidade",
      feature3Desc: <>Clique no <strong>Ícone de Olho</strong> no cabeçalho para alternar o Modo Privacidade. Isso oculta os valores de saldo, tamanho e PnL para compartilhamento público ou transmissões seguras.</>,
      feature4Title: "Sincronização Automática e Cache",
      feature4Desc: <>O histórico de posições é executado em um cache em segundo plano. Personalize os intervalos de atualização ou acione uma sincronização manual na página <strong>Settings</strong>.</>,
      showOnStartup: "Mostrar ao iniciar",
      getStarted: "Começar"
    }
  };

  const t = texts[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#151619] border border-[#2a2b30] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-250 max-h-[90vh] overflow-hidden">

        {/* Top Right Actions */}
        <div className="absolute right-4 top-4 flex items-center gap-3">
          {/* Segmented Language Selector */}
          <div className="flex items-center bg-[#1a1b1e] border border-[#2a2b30] rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => setLang('pt')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${lang === 'pt'
                ? 'bg-[#2F6BFF] text-white shadow-md'
                : 'text-[#8E9299] hover:text-white'
                }`}
            >
              PT-BR
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${lang === 'en'
                ? 'bg-[#2F6BFF] text-white shadow-md'
                : 'text-[#8E9299] hover:text-white'
                }`}
            >
              EN-US
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-[#2F6BFF]" />
          </div>
          <div className="pr-40">
            <h3 className="text-lg font-semibold text-white truncate">{t.title}</h3>
            <p className="text-xs text-[#8E9299] mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {/* Body content (scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-6 custom-scrollbar">
          <p className="text-gray-300 text-sm leading-relaxed">
            {t.intro}
          </p>

          <div className="border-t border-[#2a2b30]/50 my-2" />

          {/* Features Checklist */}
          <div className="grid grid-cols-1 gap-4">

            {/* Feature 1 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center shrink-0 mt-0.5">
                <LayoutDashboard className="w-4 h-4 text-[#00C853]" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t.feature1Title}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t.feature1Desc}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t.feature2Title}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t.feature2Desc}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <EyeOff className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t.feature3Title}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t.feature3Desc}
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t.feature4Title}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t.feature4Desc}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2a2b30] pt-4 mt-auto">
          {/* Startup Toggle Slider */}
          <div className="flex items-center gap-2.5 select-none">
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showWelcomeOnStartup}
                onChange={(e) => setShowWelcomeOnStartup(e.target.checked)}
              />
              <div className="w-9 h-5 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00C853]" />
            </label>
            <span className="text-xs text-[#8E9299]">{t.showOnStartup}</span>
          </div>

          {/* Close Action */}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            {t.getStarted}
          </button>
        </div>

      </div>
    </div>
  );
}
