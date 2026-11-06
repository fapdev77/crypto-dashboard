import React, { useState } from 'react';
import { X, LayoutDashboard, KeyRound, EyeOff, RefreshCw, HelpCircle, ShieldAlert, Compass, AlertTriangle, BookOpen, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { UserManualModal } from './UserManualModal';
import { LanguageCurrencyButton } from './ui/LanguageCurrencyButton';

interface WelcomeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeHelpModal({ isOpen, onClose }: WelcomeHelpModalProps) {
  const { t } = useTranslation();
  const { showWelcomeOnStartup, setShowWelcomeOnStartup, locale } = useSettingsStore();
  const [isManualOpen, setIsManualOpen] = useState(false);

  const releaseInfo = typeof __APP_RELEASE_INFO__ !== 'undefined' ? __APP_RELEASE_INFO__ : null;
  const version = releaseInfo?.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.13.0');

  if (!isOpen) return null;

  const currentManualLang: 'en' | 'pt' = locale.startsWith('pt') ? 'pt' : 'en';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#151619] border border-[#2a2b30] rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col p-6 animate-in fade-in zoom-in-95 duration-250 max-h-[90vh] overflow-hidden">

        {/* Header Area */}
        <div className="flex flex-col gap-4 mb-6">
          {/* Top Row: Language Selector and Close Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Multi-language & Currency Selector Button */}
              <LanguageCurrencyButton />

              {/* User Manual Button */}
              <button
                onClick={() => setIsManualOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#1c1d21] border border-[#2d2f34] hover:bg-[#2F6BFF]/10 hover:border-[#2F6BFF]/30 text-[#2F6BFF] rounded-lg text-[10px] font-semibold transition-all shadow-sm"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{currentManualLang === 'pt' ? 'MANUAL DO USUÁRIO' : 'USER MANUAL'}</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Title Row with Icon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center shrink-0">
              <HelpCircle className="w-6 h-6 text-[#2F6BFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-semibold text-white">{t('welcome.title', 'Welcome to Crypto Portfolio Manager')}</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#2F6BFF]/10 text-[#2F6BFF] border border-[#2F6BFF]/20">
                  v{version}
                </span>
              </div>
              <p className="text-xs text-[#8E9299] mt-0.5">{t('welcome.subtitle', 'Onboarding & Quick Start Guide')}</p>
            </div>
          </div>
        </div>

        {/* Body content (scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-6 custom-scrollbar">
          <p className="text-gray-300 text-sm leading-relaxed">
            {t('welcome.intro')}
          </p>

          {/* Privacy & Security Warning Banner */}
          <div className="flex gap-3.5 items-start bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-500">
            <div className="w-8 h-8 rounded-lg bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
            </div>
            <div className="text-xs leading-relaxed text-gray-300">
              <strong className="text-amber-400 block mb-0.5">{currentManualLang === 'pt' ? 'Aviso de Segurança & Privacidade' : 'Security & Privacy Notice'}</strong>
              {t('welcome.privacyWarning')}
            </div>
          </div>

          {/* Disclaimer Banner */}
          <div className="flex gap-3.5 items-start bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl text-rose-500">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            </div>
            <div className="text-xs leading-relaxed text-gray-300">
              <strong className="text-rose-400 block mb-0.5">{t('welcome.disclaimerTitle')}</strong>
              {t('welcome.disclaimerDesc')}
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
                <h4 className="text-white font-medium text-sm">{t('welcome.feature0Title')}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t('welcome.feature0Desc')}
                </p>
              </div>
            </div>

            {/* Feature 1 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center shrink-0 mt-0.5">
                <LayoutDashboard className="w-4 h-4 text-[#00C853]" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t('welcome.feature1Title')}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t('welcome.feature1Desc')}
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t('welcome.feature2Title')}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t('welcome.feature2Desc')}
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <EyeOff className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t('welcome.feature3Title')}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t('welcome.feature3Desc')}
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t('welcome.feature4Title')}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t('welcome.feature4Desc')}
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">{t('welcome.feature5Title')}</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  {t('welcome.feature5Desc')}
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
            <span className="text-xs text-[#8E9299]">{t('welcome.showOnStartup', 'Show on startup')}</span>
          </div>

          {/* Close Action */}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            {t('welcome.getStarted', 'Get Started')}
          </button>
        </div>

      </div>
      <UserManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} initialLang={currentManualLang} />
    </div>
  );
}
