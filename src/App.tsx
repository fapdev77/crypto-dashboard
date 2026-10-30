/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, Suspense } from 'react';
import { Menu, Bot, Sparkles } from 'lucide-react';
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
  const [isVaultNoticeOpen, setIsVaultNoticeOpen] = useState(false);
  const [isVaultSetupModalOpen, setIsVaultSetupModalOpen] = useState(false);
  const [legacyKeys, setLegacyKeys] = useState<ApiCredentials[]>(() => detectLegacyUnencryptedKeys());

  // Activate Zero-Trust Inactivity Auto-Lock hook
  useVaultAutoLock();

  const { isEncrypted, isUnlocked, encryptedData, isInitialized } = useApiKeysStore();
  const isAiFeatureEnabled = isAiChatbotFeatureEnabled();
  const isAiEnabled = useAiSettingsStore((state) => state.globalSettings.isEnabled);
  const openChatDrawer = useAiChatStore((state) => state.openDrawer);
  const mainContentRef = useRef<HTMLDivElement>(null);

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
            el.classList.add('ring-2', 'ring-[#2F6BFF]', 'ring-offset-2', 'ring-offset-[#0b0c10]', 'animate-pulse');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-[#2F6BFF]', 'ring-offset-2', 'ring-offset-[#0b0c10]', 'animate-pulse');
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

  let activeTabName = activeTab.replace('analytics-', '').replace('-', ' ');
  if (activeTab === 'api-keys') activeTabName = 'API Keys Manager';
  if (activeTab === 'logs') activeTabName = 'Live Connection Logs';
  if (activeTab === 'settings') activeTabName = 'Settings';
  if (activeTab === 'ai-settings') activeTabName = 'AI Settings';
  if (activeTab === 'api-tester') activeTabName = 'API Tester';
  if (activeTab.startsWith('positions-')) activeTabName = 'Positions';
  if (activeTab.startsWith('orders-')) activeTabName = 'Orders';
  if (activeTab.startsWith('trade-')) activeTabName = 'Trade';
  if (activeTab === 'transactions-history-consolidated') activeTabName = 'Consolidated Net Change';
  else if (activeTab.startsWith('transactions-history-')) activeTabName = 'Transactions History';
  if (activeTab === 'analytics-portfolio-performance') activeTabName = 'Portfolio Performance';
  else if (activeTab === 'analytics-hedge-pro') activeTabName = 'Hedge Pro';
  else if (activeTab === 'analytics-market-advanced') activeTabName = 'Market Analytics';
  else if (activeTab.startsWith('analytics-')) activeTabName = 'Analytics';
  if (activeTab === 'reports') activeTabName = 'Reports';

  return (
    <PrivacyProvider>
      <TooltipProvider>
        <WorkSpace>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1b1e',
                color: '#fff',
                border: '1px solid #2a2b30',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#1a1b1e',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#1a1b1e',
                },
              },
            }}
          />
          <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
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

              <main className="flex-1 overflow-hidden bg-[#0b0c10] p-4 md:p-6 flex flex-col min-w-0">
                <header className="mb-4 md:mb-6 shrink-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-[#2a2b30] rounded-lg transition-colors"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl lg:text-2xl font-semibold tracking-tight text-white capitalize">
                      {activeTabName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAiFeatureEnabled && <AiPikaChatButton onClick={openChatDrawer} isEnabled={isAiEnabled} />}
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

