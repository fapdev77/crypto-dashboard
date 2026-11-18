import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { UserManualModal } from './UserManualModal';
import { ONBOARDING_STEPS } from './onboarding/onboardingData';
import { StepWelcome } from './onboarding/StepWelcome';
import { StepPreferences } from './onboarding/StepPreferences';
import { StepDashboardExplorer } from './onboarding/StepDashboardExplorer';
import { StepSidebarExplorer } from './onboarding/StepSidebarExplorer';
import { StepOpsAndSettings } from './onboarding/StepOpsAndSettings';
import { StepQuickStart } from './onboarding/StepQuickStart';

export interface WelcomeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  onConfigureVaultAndKey?: () => void;
  onActivateSimulation?: () => void;
}

export function WelcomeHelpModal({
  isOpen,
  onClose,
  onNavigateToTab,
  onConfigureVaultAndKey,
  onActivateSimulation,
}: WelcomeHelpModalProps) {
  const { t } = useTranslation();
  const { showWelcomeOnStartup, setShowWelcomeOnStartup, setUseMockData, locale } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isManualOpen, setIsManualOpen] = useState(false);

  const releaseInfo = typeof __APP_RELEASE_INFO__ !== 'undefined' ? __APP_RELEASE_INFO__ : null;
  const version = releaseInfo?.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.50.0');

  const totalSteps = ONBOARDING_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const navigateTab = useCallback(
    (tab: string) => {
      onClose();
      if (onNavigateToTab) {
        onNavigateToTab(tab);
      } else {
        window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: tab }));
      }
    },
    [onClose, onNavigateToTab]
  );

  const handleOpenThemeCustomizer = useCallback(() => {
    onClose();
    window.dispatchEvent(
      new CustomEvent('navigate-to-tab', {
        detail: { tab: 'settings', targetId: 'theme-settings-card' },
      })
    );
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('open-theme-customizer'));
    }, 100);
  }, [onClose]);

  const handleConfigureVaultAndKey = useCallback(() => {
    if (onConfigureVaultAndKey) {
      onConfigureVaultAndKey();
      return;
    }
    onClose();
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'api-keys' }));
  }, [onClose, onConfigureVaultAndKey]);

  const handleActivateSimulation = useCallback(() => {
    if (onActivateSimulation) {
      onActivateSimulation();
      return;
    }
    setUseMockData(true);
    toast.success(t('settings.simulationMode.enabledToast', 'Mock Data Enabled'), {
      id: 'onboarding-mock-toggle',
    });
    navigateTab('dashboard');
  }, [onActivateSimulation, setUseMockData, t, navigateTab]);

  // Keyboard navigation (Escape to close, Left/Right arrows between steps)
  useEffect(() => {
    if (!isOpen || isManualOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormElement =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (isFormElement) return;

      if (e.key === 'ArrowRight') {
        setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentStep((prev) => Math.max(0, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isManualOpen, totalSteps, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-wizard-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Split-View Wizard Shell */}
      <div
        className="relative bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-line bg-surface shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            {/* Brand + Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center shrink-0 text-accent">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="onboarding-wizard-title" className="text-base font-semibold text-fg truncate">
                    {t('onboarding.wizardTitle', 'Crypto Portfolio Manager')}
                  </h2>
                  <span className="text-[11px] font-mono text-fg-muted shrink-0">
                    v{version}
                  </span>
                </div>
                <p className="text-xs text-fg-muted truncate">
                  {t('onboarding.wizardSubtitle', 'Interactive Onboarding & Quick Tour')}
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span className="font-mono">
                    {t('onboarding.stepCounter', 'Step {{current}} of {{total}}', {
                      current: currentStep + 1,
                      total: totalSteps,
                    })}
                  </span>
                </p>
              </div>
            </div>

            {/* Right Actions: Manual & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsManualOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-elevated border border-line hover:border-accent/40 hover:bg-elevated-hover text-xs font-medium text-fg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <BookOpen className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">{t('onboarding.openManual', 'User Manual')}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-elevated-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={t('common.close', 'Close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Clickable 6-Step Navigation Bar (Freely Jumpable) */}
          <nav
            aria-label={t('onboarding.wizardSubtitle', 'Interactive Onboarding & Quick Tour')}
            className="grid grid-cols-3 sm:grid-cols-6 gap-1.5"
          >
            {ONBOARDING_STEPS.map((step) => {
              const isActive = currentStep === step.index;
              const isVisited = step.index < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setCurrentStep(step.index)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    isActive
                      ? 'bg-accent/10 border-accent text-fg'
                      : isVisited
                      ? 'bg-elevated border-line text-fg hover:border-line-strong'
                      : 'bg-canvas border-line text-fg-muted hover:text-fg hover:border-line-strong'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md text-[11px] font-mono font-semibold flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-accent text-white'
                        : isVisited
                        ? 'bg-success/15 text-success'
                        : 'bg-elevated text-fg-muted'
                    }`}
                  >
                    {step.index + 1}
                  </span>
                  <span className="text-xs font-medium truncate">
                    {t(step.labelKey, step.defaultLabel)}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Scrollable Step Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 custom-scrollbar">
          {currentStep === 0 && <StepWelcome />}
          {currentStep === 1 && <StepPreferences onOpenThemeCustomizer={handleOpenThemeCustomizer} />}
          {currentStep === 2 && <StepDashboardExplorer />}
          {currentStep === 3 && <StepSidebarExplorer onNavigateToTab={navigateTab} />}
          {currentStep === 4 && <StepOpsAndSettings onNavigateToTab={navigateTab} />}
          {currentStep === 5 && (
            <StepQuickStart
              onConfigureVaultAndKey={handleConfigureVaultAndKey}
              onActivateSimulation={handleActivateSimulation}
              onGoToDashboard={() => navigateTab('dashboard')}
            />
          )}
        </div>

        {/* Persistent Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-line bg-surface flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Show on Startup Toggle */}
          <div className="flex items-center gap-2.5 select-none">
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showWelcomeOnStartup}
                onChange={(e) => setShowWelcomeOnStartup(e.target.checked)}
                aria-label={t('welcome.showOnStartup', 'Show on startup')}
              />
              <div className="w-9 h-5 bg-line peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success" />
            </label>
            <span className="text-xs text-fg-muted">{t('welcome.showOnStartup', 'Show on startup')}</span>
          </div>

          {/* Stepper Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {!isLastStep && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-xs font-medium text-fg-muted hover:text-fg rounded-lg hover:bg-elevated transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t('onboarding.skipGuide', 'Skip guide')}
              </button>
            )}

            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={isFirstStep}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-elevated border border-line hover:border-line-strong text-xs font-medium text-fg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{t('onboarding.prev', 'Previous')}</span>
            </button>

            {!isLastStep ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span>{t('onboarding.next', 'Next')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span>{t('onboarding.finish', 'Finish')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <UserManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} initialLang={locale} />
    </div>
  );
}
