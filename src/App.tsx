/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import { Menu } from 'lucide-react';
import { getTabHeaderMeta } from './config/navigationConfig';
import { Sidebar } from './components/Sidebar';
import { ApiKeys } from './components/ApiKeys';
import { WorkSpace } from './components/WorkSpace';
import { Dashboard } from './components/Dashboard';
import { OpenPositions } from './components/OpenPositions';
import { StatusBar } from './components/StatusBar';
import { PositionsTicker } from './components/PositionsTicker';
import { Toaster } from 'react-hot-toast';
import { PrivacyProvider } from './context/PrivacyContext';
import { PrivacyToggleButton } from './components/PrivacyToggleButton';
import { TooltipProvider } from './components/ui/Tooltip';
import { useSettingsStore } from './store/settingsStore';
import { HelpToggleButton } from './components/HelpToggleButton';
import { DonationToggleButton } from './components/DonationToggleButton';
import { DonationModal } from './components/DonationModal';
import { WelcomeHelpModal } from './components/WelcomeHelpModal';
import { UpdateNotification } from './components/UpdateNotification';
import { useApiKeysStore } from './store/apiKeysStore';
import { GlobalUnlockScreen } from './components/GlobalUnlockScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AiChatDrawer } from './components/ai/AiChatDrawer';
import { AiPikaChatButton } from './components/ai/AiPikaChatButton';
import { useAiSettingsStore } from './store/aiSettingsStore';
import { useAiChatStore } from './store/aiChatStore';
import { isAiChatbotFeatureEnabled } from './utils/aiFeatureFlag';
import { useVaultAutoLock } from './hooks/useVaultAutoLock';
import { TabLoadingSkeleton } from './components/ui/TabLoadingSkeleton';
import { VaultSetupNoticeModal } from './components/VaultSetupNoticeModal';
import { VaultSetupModal } from './components/VaultSetupModal';
import { MandatoryVaultMigrationScreen } from './components/MandatoryVaultMigrationScreen';
import { detectLegacyUnencryptedKeys } from './utils/vaultHelpers';
import { ApiCredentials } from './store/apiKeysStore';
import { LanguageCurrencyButton } from './components/ui/LanguageCurrencyButton';
import { ThemeModeButton } from './components/ui/ThemeModeButton';
import { CurrencyService } from './services/currency/CurrencyService';
import { useTranslation } from 'react-i18next';

// Code Splitting: Lazy-loaded secondary & heavy tabs with named exports
const ClosedPositions = React.lazy(() => import('./components/ClosedPositions').then(m => ({ default: m.ClosedPositions })));
const MarketAnalyticsDashboard = React.lazy(() => import('./components/analytics/MarketAnalytics/MarketAnalyticsDashboard').then(m => ({ default: m.MarketAnalyticsDashboard })));
const PnLBySymbol = React.lazy(() => import('./components/analytics/PnLBySymbol').then(m => ({ default: m.PnLBySymbol })));
const BybitTransactions = React.lazy(() => import('./components/transactions/BybitTransactions/BybitTransactions').then(m => ({ default: m.BybitTransactions })));
const BitgetTransactions = React.lazy(() => import('./components/transactions/BitgetTransactions/BitgetTransactions').then(m => ({ default: m.BitgetTransactions })));
const OkxTransactions = React.lazy(() => import('./components/transactions/OkxTransactions/OkxTransactions').then(m => ({ default: m.OkxTransactions })));
const ConsolidatedTransactions = React.lazy(() => import('./components/transactions/ConsolidatedTransactions/ConsolidatedTransactions').then(m => ({ default: m.ConsolidatedTransactions })));
const PortfolioPerformance = React.lazy(() => import('./components/analytics/PortfolioPerformance/PortfolioPerformance').then(m => ({ default: m.PortfolioPerformance })));
const FundingDashboard = React.lazy(() => import('./components/analytics/FundingFees/FundingDashboard').then(m => ({ default: m.FundingDashboard })));
const HedgeProDashboard = React.lazy(() => import('./components/HedgePro/HedgeProDashboard').then(m => ({ default: m.HedgeProDashboard })));
const ReportsDashboard = React.lazy(() => import('./components/analytics/ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const OpenOrders = React.lazy(() => import('./components/analytics/OrderReports/OpenOrders').then(m => ({ default: m.OpenOrders })));
const OrderHistory = React.lazy(() => import('./components/analytics/OrderReports/OrderHistory').then(m => ({ default: m.OrderHistory })));
const TradeHistory = React.lazy(() => import('./components/trade/TradeHistory').then(m => ({ default: m.TradeHistory })));
const ConnectionLogTerminal = React.lazy(() => import('./components/ConnectionLogTerminal').then(m => ({ default: m.ConnectionLogTerminal })));
const AiSettings = React.lazy(() => import('./components/ai/AiSettings').then(m => ({ default: m.AiSettings })));
const Settings = React.lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const ApiTester = React.lazy(() => import('./components/ApiTester').then(m => ({ default: m.ApiTester })));

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [isVaultNoticeOpen, setIsVaultNoticeOpen] = useState(false);
  const [isVaultSetupModalOpen, setIsVaultSetupModalOpen] = useState(false);
  const [legacyKeys, setLegacyKeys] = useState<ApiCredentials[]>(() => detectLegacyUnencryptedKeys());

  // Activate Zero-Trust Inactivity Auto-Lock hook
  useVaultAutoLock();

  const { isEncrypted, isUnlocked, encryptedData, isInitialized } = useApiKeysStore();
  const { t } = useTranslation();
  const isAiFeatureEnabled = isAiChatbotFeatureEnabled();
  const isAiEnabled = useAiSettingsStore((state) => state.globalSettings.isEnabled);
  const openChatDrawer = useAiChatStore((state) => state.openDrawer);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Fetch live fiat rates on mount to keep conversions up to date
  useEffect(() => {
    CurrencyService.fetchFiatRates().then((rates) => {
      useSettingsStore.getState().setFiatRates(rates);
    });
  }, []);

  // Instantly reset scroll position to the top of the container and window whenever navigating to a new tab
  useLayoutEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
      mainContentRef.current.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeTab]);

  useEffect(() => {
    if (!isAiFeatureEnabled && activeTab === 'ai-settings') {
      setActiveTab('dashboard');
    }
  }, [isAiFeatureEnabled, activeTab]);

  // Listen for global tab navigation requests
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string | { tab: string; targetId?: string }>;
      let tab = '';
      let targetId = '';

      if (typeof customEvent.detail === 'string') {
        if (customEvent.detail === 'settings-version') {
          tab = 'settings';
          targetId = 'version-info-card';
        } else if (customEvent.detail === 'settings-theme') {
          tab = 'settings';
          targetId = 'theme-settings-card';
        } else if (customEvent.detail === 'settings') {
          tab = 'settings';
          targetId = 'security-settings-card';
        } else {
          tab = customEvent.detail;
        }
      } else if (customEvent.detail && typeof customEvent.detail === 'object') {
        tab = customEvent.detail.tab;
        targetId = customEvent.detail.targetId || '';
      }

      if (tab) {
        setActiveTab(tab);
      }

      if (targetId) {
        setTimeout(() => {
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-accent', 'ring-offset-2', 'ring-offset-canvas', 'animate-pulse');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-accent', 'ring-offset-2', 'ring-offset-canvas', 'animate-pulse');
            }, 2000);
          }
        }, 150);
      }
    };
    window.addEventListener('navigate-to-tab', handleNavigate);
    return () => window.removeEventListener('navigate-to-tab', handleNavigate);
  }, []);

  // Listen for global request to open vault setup modal
  useEffect(() => {
    const handleOpenVaultSetup = () => setIsVaultSetupModalOpen(true);
    window.addEventListener('open-vault-setup', handleOpenVaultSetup);
    return () => window.removeEventListener('open-vault-setup', handleOpenVaultSetup);
  }, []);

  // Handle responsive layout transitions for mobile, tablet, and desktop/wide screens
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1024) {
        setIsMobileMenuOpen(false);
      } else {
        // Expand on large screens by default for optimal navigation
        setIsSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkAndTriggerVaultNotice = () => {
    const { isInitialized: initialized, encryptedData: data } = useApiKeysStore.getState();
    const shouldShowNotice = useSettingsStore.getState().showVaultSetupNoticeOnStartup;
    if ((!initialized || !data) && shouldShowNotice) {
      setTimeout(() => {
        setIsVaultNoticeOpen(true);
      }, 300);
    }
  };

  // Trigger welcome modal or vault setup notice on app load
  useEffect(() => {
    const shouldShowWelcome = useSettingsStore.getState().showWelcomeOnStartup;
    if (shouldShowWelcome) {
      setIsWelcomeOpen(true);
    } else {
      checkAndTriggerVaultNotice();
    }
  }, []);

  const handleCloseWelcome = () => {
    setIsWelcomeOpen(false);
    checkAndTriggerVaultNotice();
  };

  const handleConfigureVaultNow = () => {
    setIsVaultNoticeOpen(false);
    setIsVaultSetupModalOpen(true);
  };

  // 1. Mandatory lockout for users with unencrypted legacy keys
  if (legacyKeys.length > 0 && (!isInitialized || !encryptedData)) {
    return (
      <MandatoryVaultMigrationScreen
        legacyKeys={legacyKeys}
        onMigrated={() => setLegacyKeys([])}
      />
    );
  }

  // 2. Global unlock screen for locked vault
  if (isEncrypted && encryptedData && !isUnlocked) {
    return <GlobalUnlockScreen />;
  }

  const { title: activeTabName, icon: ActiveTabIcon } = getTabHeaderMeta(activeTab, t);

  return (
    <PrivacyProvider>
      <TooltipProvider>
        <WorkSpace>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--success)',
                  secondary: 'var(--surface)',
                },
              },
              error: {
                iconTheme: {
                  primary: 'var(--danger)',
                  secondary: 'var(--surface)',
                },
              },
            }}
          />
          <div className="flex flex-col h-screen bg-canvas overflow-hidden">
            <PositionsTicker />
            <div className="flex flex-1 overflow-hidden relative">
              <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isCollapsed={isSidebarCollapsed}
                setIsCollapsed={setIsSidebarCollapsed}
              />

              <main className="flex-1 overflow-hidden bg-canvas p-4 md:p-6 flex flex-col min-w-0">
                <header className="mb-4 md:mb-6 shrink-0 flex items-center justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="lg:hidden w-9 h-9 -ml-1.5 shrink-0 inline-flex items-center justify-center text-fg-muted hover:text-fg hover:bg-elevated-hover rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
                      <ActiveTabIcon
                        className="w-[18px] h-[18px] sm:w-5 sm:h-5 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                      <h2
                        title={activeTabName}
                        className="text-base sm:text-xl lg:text-2xl font-semibold tracking-tight text-fg truncate whitespace-nowrap capitalize"
                      >
                        {activeTabName}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <LanguageCurrencyButton compactOnMobile />
                    <ThemeModeButton compactOnMobile />
                    {isAiFeatureEnabled && (
                      <AiPikaChatButton
                        onClick={openChatDrawer}
                        isEnabled={isAiEnabled}
                        compactOnMobile
                      />
                    )}
                    <DonationToggleButton isOpen={isDonationOpen} onClick={() => setIsDonationOpen(!isDonationOpen)} />
                    <HelpToggleButton isOpen={isWelcomeOpen} onClick={() => setIsWelcomeOpen(!isWelcomeOpen)} />
                    <PrivacyToggleButton />
                  </div>
                </header>

                <div ref={mainContentRef} className="flex-1 overflow-auto hide-scrollbar relative">
                  <ErrorBoundary isolateScope={activeTabName} key={activeTab}>
                    <Suspense fallback={<TabLoadingSkeleton />}>
                      {activeTab === 'dashboard' && <Dashboard />}
                      {activeTab === 'positions-open' && <OpenPositions />}
                      {activeTab === 'positions-history' && <ClosedPositions />}
                      {activeTab === 'analytics-portfolio-performance' && <PortfolioPerformance />}
                      {activeTab === 'analytics-market-advanced' && <MarketAnalyticsDashboard />}
                      {activeTab === 'analytics-pnl-symbol' && <PnLBySymbol />}
                      {activeTab === 'transactions-history-consolidated' && <ConsolidatedTransactions />}
                      {activeTab === 'transactions-history-bybit' && <BybitTransactions />}
                      {activeTab === 'transactions-history-bitget' && <BitgetTransactions />}
                      {activeTab === 'transactions-history-okx' && <OkxTransactions />}
                      {activeTab === 'analytics-funding' && <FundingDashboard />}
                      {activeTab === 'analytics-hedge-pro' && <HedgeProDashboard />}
                      {activeTab === 'reports' && <ReportsDashboard />}
                      {activeTab === 'orders-open' && <OpenOrders />}
                      {activeTab === 'orders-history' && <OrderHistory />}
                      {activeTab === 'trade-history' && <TradeHistory />}
                      {activeTab === 'api-keys' && <ApiKeys />}
                      {activeTab === 'logs' && <ConnectionLogTerminal />}
                      {isAiFeatureEnabled && activeTab === 'ai-settings' && <AiSettings />}
                      {activeTab === 'settings' && <Settings />}
                      {activeTab === 'api-tester' && <ApiTester />}
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </main>

              {/* Mobile Overlay */}
              {isMobileMenuOpen && (
                <div
                  className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}
            </div>
            <StatusBar />
          </div>
          <WelcomeHelpModal isOpen={isWelcomeOpen} onClose={handleCloseWelcome} />
          <DonationModal isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
          <VaultSetupNoticeModal
            isOpen={isVaultNoticeOpen}
            onClose={() => setIsVaultNoticeOpen(false)}
            onConfigureNow={handleConfigureVaultNow}
          />
          <VaultSetupModal
            isOpen={isVaultSetupModalOpen}
            onClose={() => setIsVaultSetupModalOpen(false)}
            reason="Activate client-side vault protection to securely store your exchange credentials."
          />
          <UpdateNotification />
          {isAiFeatureEnabled && <AiChatDrawer onNavigateToSettings={() => setActiveTab('ai-settings')} />}
        </WorkSpace>
      </TooltipProvider>
    </PrivacyProvider>
  );
}

