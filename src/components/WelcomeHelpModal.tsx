import React, { useState } from 'react';
import { X, LayoutDashboard, KeyRound, EyeOff, RefreshCw, HelpCircle, Globe, ShieldAlert, Compass, AlertTriangle } from 'lucide-react';
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
      privacyWarning: "Your API credentials are saved strictly in your browser's localStorage. Communication with the exchanges occurs directly from your browser (no intermediate servers). Always use READ-ONLY API keys. NEVER use keys that allow trading or withdrawals. You can erase all data instantly using the 'Wipe All Local Client Data' option under Settings.",
      feature0Title: "Getting Started / Try Mock Mode",
      feature0Desc: <>Create <strong>read-only</strong> API keys on Bitget, Bybit, or OKX to load your real account data. To test-drive the application without any credentials first, navigate to the <strong>Settings</strong> tab and toggle on the <strong>Use Mock Data</strong> option.</>,
      feature1Title: "Overview & Analytics",
      feature1Desc: "Track unified balances, positions, margin ratios, and view advanced analytics like realized/unrealized PnL charts.",
      feature2Title: "Secure API Connections",
      feature2Desc: <>Connect exchanges via the <strong>API Keys</strong> page. All credentials are saved strictly in your local browser storage using a zero-trust model.</>,
      feature3Title: "Privacy Mode",
      feature3Desc: <>Click the <strong>Eye Icon</strong> in the header to toggle Privacy Mode. This hides balance, size, and PnL values for safe public sharing or streaming.</>,
      feature4Title: "Automatic Syncing & Cache",
      feature4Desc: <>Position history runs on a background cache. Customize update intervals or trigger a manual sync under the <strong>Settings</strong> page.</>,
      showOnStartup: "Show on startup",
      getStarted: "Get Started",
      disclaimerTitle: "Beta Phase & Data Accuracy Disclaimer",
      disclaimerDesc: "This application is currently in its testing phase. Our initial idea is to simplify the lives of traders by unifying balances from various exchanges in one place to facilitate asset and trade tracking. However, each exchange has different calculation methods and data availability, so the presented data may contain errors or inconsistencies and might not be exactly equal to what is displayed directly by the exchange. If you do not agree with this, we do not recommend using the application."
    },
    pt: {
      title: "Bem-vindo ao Crypto Dashboard",
      subtitle: "Guia de Integração e Início Rápido",
      intro: "Monitore seu desempenho de trading, saldos, posições ativas e histórico de ordens na Bitget, Bybit e OKX em um único terminal unificado.",
      privacyWarning: "Suas chaves de API são salvas estritamente no localStorage do seu navegador. Toda comunicação com as corretoras ocorre de forma direta (sem servidores intermediários). Use apenas chaves de API com permissão de LEITURA (Read-Only). NUNCA use chaves que permitam negociação (Trade) ou saques. Você pode apagar todos os dados do cliente instantaneamente usando a opção 'Wipe All Local Client Data' nas configurações.",
      feature0Title: "Primeiros Passos / Modo Testes",
      feature0Desc: <>Crie chaves de API <strong>apenas leitura (Read-only)</strong> na Bitget, Bybit ou OKX para carregar seus dados reais. Caso queira experimentar a plataforma sem fornecer credenciais primeiro, acesse a aba <strong>Settings</strong> e ative a opção <strong>Use Mock Data</strong>.</>,
      feature1Title: "Visão Geral e Analytics",
      feature1Desc: "Acompanhe saldos unificados, posições, taxas de margem e visualize análises avançadas como gráficos de PnL realizado/não realizado.",
      feature2Title: "Conexões Seguras de API",
      feature2Desc: <>Conecte as corretoras através da página <strong>API Keys</strong>. Todas as credenciais são salvas estritamente no armazenamento local do seu navegador usando um modelo zero-trust.</>,
      feature3Title: "Modo Privacidade",
      feature3Desc: <>Clique no <strong>Ícone de Olho</strong> no cabeçalho para alternar o Modo Privacidade. Isso oculta os valores de saldo, tamanho e PnL para compartilhamento público ou transmissões seguras.</>,
      feature4Title: "Sincronização Automática e Cache",
      feature4Desc: <>O histórico de posições é executado em um cache em segundo plano. Personalize os intervalos de atualização ou acione uma sincronização manual na página <strong>Settings</strong>.</>,
      showOnStartup: "Mostrar ao iniciar",
      getStarted: "Começar",
      disclaimerTitle: "Fase Beta e Aviso sobre Precisão de Dados",
      disclaimerDesc: "Este aplicativo ainda está em fase de testes. Nossa ideia inicial é facilitar a vida dos traders unificando os saldos de várias corretoras no mesmo local para facilitar o controle dos ativos e trades. No entanto, cada corretora tem formas diferentes de cálculos e disponibilização dos dados, então os dados apresentados podem conter erros ou inconsistências e não ser exatos aos que são exibidos diretamente pela corretora. Se você não concordar com isso, não recomendamos que use o aplicativo."
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
      <div className="relative bg-[#151619] border border-[#2a2b30] rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-250 max-h-[90vh] overflow-hidden">

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

          {/* Privacy & Security Warning Banner */}
          <div className="flex gap-3.5 items-start bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-500">
            <div className="w-8 h-8 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            </div>
            <div className="text-xs leading-relaxed text-gray-300">
              <strong className="text-amber-400 block mb-0.5">{lang === 'pt' ? 'Aviso de Segurança & Privacidade' : 'Security & Privacy Notice'}</strong>
              {t.privacyWarning}
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="flex gap-3.5 items-start bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-rose-500">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            </div>
            <div className="text-xs leading-relaxed text-gray-300">
              <strong className="text-rose-400 block mb-0.5">{t.disclaimerTitle}</strong>
              {t.disclaimerDesc}
            </div>
          </div>

          <div className="border-t border-[#2a2b30]/50 my-2" />

          {/* Features Checklist */}
          <div className="grid grid-cols-1 gap-4">

            {/* Feature 0 (Getting Started) */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Compass className="w-4 h-4 text-[#2F6BFF]" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t.feature0Title}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t.feature0Desc}
                </p>
              </div>
            </div>

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
