import React, { useMemo, useEffect } from 'react';
import { LayoutDashboard, KeyRound, Settings, Activity, Terminal, X } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const { positions } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const openCount = useMemo(() => {
    const list = Object.values(positions);
    return list.filter(p => 
      (useMockData ? p.connectionId === 'mock' : p.connectionId !== 'mock') && Math.abs(p.size) > 0
    ).length;
  }, [positions, useMockData]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'positions', label: 'Positions', icon: Activity, badge: openCount },
  ];

  return (
    <aside className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#151619] border-r border-[#2a2b30] flex flex-col h-full transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-4 md:p-6 border-b border-[#2a2b30] flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#2F6BFF]" />
              <span className="text-lg">Crypto Portfolio Manager</span>
            </div>
          </h1>
          <p className="text-xs text-[#8E9299] font-mono mt-2 uppercase tracking-widest">Multi-Exchange</p>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen?.(false)}
          className="md:hidden p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#2a2b30] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
            }`}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === item.id ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
              }`}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[#2a2b30]">
        <button
          onClick={() => handleTabClick('api-keys')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'api-keys'
              ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
              : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          API Keys
        </button>
        <button
          onClick={() => handleTabClick('api-tester')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors mt-1 ${
            activeTab === 'api-tester'
              ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
              : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Execução de Testes
        </button>
        <button
          onClick={() => handleTabClick('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors mt-1 ${
            activeTab === 'settings'
              ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
              : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}
