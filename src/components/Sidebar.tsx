import React, { useMemo } from 'react';
import { LayoutDashboard, KeyRound, Settings, Activity, Terminal } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { positions } = useDashboardStore();
  const useMockData = useSettingsStore(state => state.useMockData);

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
    <aside className="w-64 bg-[#151619] border-r border-[#2a2b30] flex flex-col h-full">
      <div className="p-6 border-b border-[#2a2b30]">
        <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#2F6BFF]" />
          Terminal
        </h1>
        <p className="text-xs text-[#8E9299] font-mono mt-1 uppercase tracking-widest">Multi-Exchange</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
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
          onClick={() => setActiveTab('api-keys')}
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
          onClick={() => setActiveTab('api-tester')}
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
          onClick={() => setActiveTab('settings')}
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
