/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ApiKeys } from './components/ApiKeys';
import { WorkSpace } from './components/WorkSpace';
import { Dashboard } from './components/Dashboard';
import { OpenPositions } from './components/OpenPositions';
import { ClosedPositions } from './components/ClosedPositions';
import { Settings } from './components/Settings';
import { ApiTester } from './components/ApiTester';
import { StatusBar } from './components/StatusBar';
import { PositionsTicker } from './components/PositionsTicker';
import { Toaster } from 'react-hot-toast';
import { PnLBySymbol } from './components/analytics/PnLBySymbol';
import { BybitTransactions } from './components/analytics/BybitTransactions/BybitTransactions';
import { FundingDashboard } from './components/analytics/FundingFees/FundingDashboard';
import { ReportsDashboard } from './components/analytics/ReportsDashboard';
import { ConnectionLogTerminal } from './components/ConnectionLogTerminal';
import { PrivacyProvider } from './context/PrivacyContext';
import { PrivacyToggleButton } from './components/PrivacyToggleButton';
import { TooltipProvider } from './components/ui/Tooltip';
import { OpenOrders } from './components/analytics/OrderReports/OpenOrders';
import { OrderHistory } from './components/analytics/OrderReports/OrderHistory';
import { TradeHistory } from './components/trade/TradeHistory';
import { useSettingsStore } from './store/settingsStore';
import { HelpToggleButton } from './components/HelpToggleButton';
import { WelcomeHelpModal } from './components/WelcomeHelpModal';
import { UpdateNotification } from './components/UpdateNotification';
import { useApiKeysStore } from './store/apiKeysStore';
import { GlobalUnlockScreen } from './components/GlobalUnlockScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

  const { isEncrypted, isUnlocked } = useApiKeysStore();

  // Listen for global tab navigation requests
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setActiveTab(customEvent.detail);
      if (customEvent.detail === 'settings') {
        setTimeout(() => {
          const el = document.getElementById('security-settings-card');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-[#2F6BFF]', 'ring-offset-2', 'ring-offset-[#0b0c10]');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-[#2F6BFF]', 'ring-offset-2', 'ring-offset-[#0b0c10]');
            }, 3000);
          }
        }, 150);
      }
    };
    window.addEventListener('navigate-to-tab', handleNavigate);
    return () => window.removeEventListener('navigate-to-tab', handleNavigate);
  }, []);

  // Trigger welcome modal on app load if enabled
  useEffect(() => {
    const shouldShow = useSettingsStore.getState().showWelcomeOnStartup;
    if (shouldShow) {
      setIsWelcomeOpen(true);
    }
  }, []);

  if (isEncrypted && !isUnlocked) {
    return <GlobalUnlockScreen />;
  }

  let activeTabName = activeTab.replace('analytics-', '').replace('-', ' ');
  if (activeTab === 'api-keys') activeTabName = 'API Keys Manager';
  if (activeTab === 'logs') activeTabName = 'Live Connection Logs';
  if (activeTab === 'settings') activeTabName = 'Settings';
  if (activeTab === 'api-tester') activeTabName = 'API Tester';
  if (activeTab.startsWith('positions-')) activeTabName = 'Positions';
  if (activeTab.startsWith('orders-')) activeTabName = 'Orders';
  if (activeTab.startsWith('trade-')) activeTabName = 'Trade';
  if (activeTab.startsWith('analytics-')) activeTabName = 'Analytics';
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
                      className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white hover:bg-[#2a2b30] rounded-lg transition-colors"
                      aria-label="Open menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white capitalize">
                      {activeTabName}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <HelpToggleButton isOpen={isWelcomeOpen} onClick={() => setIsWelcomeOpen(!isWelcomeOpen)} />
                    <PrivacyToggleButton />
                  </div>
                </header>

                <div className="flex-1 overflow-auto hide-scrollbar relative">
                  {activeTab === 'dashboard' && <Dashboard />}
                  {activeTab === 'positions-open' && <OpenPositions />}
                  {activeTab === 'positions-history' && <ClosedPositions />}
                  {activeTab === 'analytics-pnl-symbol' && <PnLBySymbol />}
                  {activeTab === 'analytics-bybit-tx' && <BybitTransactions />}
                  {activeTab === 'analytics-funding' && <FundingDashboard />}
                  {activeTab === 'reports' && <ReportsDashboard />}
                  {activeTab === 'orders-open' && <OpenOrders />}
                  {activeTab === 'orders-history' && <OrderHistory />}
                  {activeTab === 'trade-history' && <TradeHistory />}
                  {activeTab === 'api-keys' && <ApiKeys />}
                  {activeTab === 'logs' && <ConnectionLogTerminal />}
                  {activeTab === 'settings' && <Settings />}
                  {activeTab === 'api-tester' && <ApiTester />}
                </div>
              </main>

              {/* Mobile Overlay */}
              {isMobileMenuOpen && (
                <div
                  className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}
            </div>
            <StatusBar />
          </div>
          <WelcomeHelpModal isOpen={isWelcomeOpen} onClose={() => setIsWelcomeOpen(false)} />
          <UpdateNotification />
        </WorkSpace>
      </TooltipProvider>
    </PrivacyProvider>
  );
}

