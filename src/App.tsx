/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { PnLBySymbol } from './components/analytics/PnLBySymbol';
import { ReportsDashboard } from './components/analytics/ReportsDashboard';
import { HedgeProDashboard } from './components/analytics/HedgeProDashboard';
import { MvpTestsDashboard } from './components/MvpTestsDashboard';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  let activeTabName = activeTab.replace('analytics-', '').replace('-', ' ');
  if (activeTab === 'api-keys') activeTabName = 'API Keys';
  if (activeTab === 'settings') activeTabName = 'Settings';
  if (activeTab === 'testes-mvp') activeTabName = 'Testes MVP';
  if (activeTab === 'api-tester') activeTabName = 'Execução de Testes';
  if (activeTab === 'analytics-pnl-symbol') activeTabName = 'PnL by Symbol';
  if (activeTab === 'analytics-hedge-pro') activeTabName = 'Hedge Pro';

  return (
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
            <header className="mb-4 md:mb-6 shrink-0 flex items-center gap-3">
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
            </header>

            <div className="flex-1 overflow-auto hide-scrollbar">
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'positions-open' && <OpenPositions />}
              {activeTab === 'positions-history' && <ClosedPositions />}
              {(activeTab === 'analytics' || activeTab === 'analytics-overview') && <AnalyticsDashboard />}
              {activeTab === 'analytics-pnl-symbol' && <PnLBySymbol />}
              {activeTab === 'analytics-hedge-pro' && <HedgeProDashboard />}
              {activeTab === 'reports' && <ReportsDashboard />}
              {activeTab === 'testes-mvp' && <MvpTestsDashboard />}
              {activeTab === 'api-keys' && <ApiKeys />}
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
    </WorkSpace>
  );
}

