import React, { useMemo, useEffect } from 'react';
import { LayoutDashboard, KeyRound, Settings, Activity, Terminal, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, BarChart2, FileText, Beaker, AlignLeft } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { useSettingsStore } from '../store/settingsStore';
import logo1 from '../assets/CriptoDashboard-logo1.PNG';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
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
    return list.filter(pos => 
      (useMockData ? pos.connectionId.startsWith('mocked-data') : !pos.connectionId.startsWith('mocked-data')) && Math.abs(pos.size) > 0
    ).length;
  }, [positions, useMockData]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'positions', label: 'Positions', icon: Activity, subItems: [
      { id: 'positions-open', label: 'Abertas', badge: openCount },
      { id: 'positions-history', label: 'Histórico' }
    ]},
    { id: 'analytics', label: 'Analytics', icon: BarChart2, subItems: [
      { id: 'analytics-overview', label: 'Overview' },
      { id: 'analytics-pnl-symbol', label: 'PnL by Symbol' },
      { id: 'analytics-hedge-pro', label: 'Hedge Pro (Inverse)' }
    ]},
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'testes-mvp', label: 'Testes MVP', icon: Beaker, subItems: [
      { id: 'testes-mvp-main', label: 'Playground Principal' }, // Assuming this was just standard tab? But wait, let's remap it.
      { id: 'mvp-asset-metadata', label: 'Informações de Ativos' }
    ]},
  ];

  return (
    <aside className={`fixed md:static inset-y-0 left-0 z-40 ${isCollapsed ? 'w-20' : 'w-64'} bg-[#151619] border-r border-[#2a2b30] flex flex-col h-full transform transition-all duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`p-4 md:p-6 border-b border-[#2a2b30] flex items-start ${isCollapsed ? 'justify-center' : 'justify-between'} relative`}>
        {!isCollapsed ? (
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <img src={logo1} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
                <span className="text-[15px] font-bold leading-tight">
                  Gerenciador de Portfólio
                  <span className="block text-[11px] text-[#8E9299] font-normal tracking-wide mt-0.5">Crypto Mult-Exchange</span>
                </span>
              </div>
            </h1>
          </div>
        ) : (
          <img src={logo1} alt="Logo" className="w-8 h-8 object-contain shrink-0 mt-1" />
        )}
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen?.(false)}
          className="md:hidden p-1 text-gray-400 hover:text-white rounded-lg hover:bg-[#2a2b30] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-6 w-6 h-6 bg-[#1a1b1e] border border-[#2a2b30] rounded-full items-center justify-center text-gray-400 hover:text-white hover:bg-[#2a2b30] transition-colors z-50"
        >
          {isCollapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className={`flex-1 p-4 space-y-2 ${isCollapsed ? 'px-3 overflow-visible' : 'overflow-y-auto'} hide-scrollbar`}>
        {navItems.map((item) => (
          <div key={item.id} className="flex flex-col gap-1 relative group">
            <button
              onClick={() => {
                if (item.subItems) {
                  // Only expand/collapse if clicking parent, otherwise handleTabClick
                  // But for simplicity, let's just make clicking parent go to its first child
                  handleTabClick(item.subItems[0].id);
                } else {
                  handleTabClick(item.id);
                }
              }}
              title={item.label}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center py-4' : 'gap-3 px-4 py-3'} rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab))
                  ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
                  : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${(activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab))) ? 'text-[#2F6BFF]' : 'text-gray-400'}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {'badge' in item && item.badge !== undefined && (item.badge as number) > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      (activeTab === item.id || (item.subItems && item.subItems.some(sub => sub.id === activeTab))) ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
                    }`}>
                      {item.badge as number}
                    </span>
                  )}
                </>
              )}
            </button>

            {/* Submenu inline when expanded */}
            {!isCollapsed && item.subItems && item.subItems.some(sub => sub.id === activeTab || item.subItems?.some(s => s.id === activeTab)) && (
              <div className="pl-11 pr-2 flex flex-col gap-1 mt-1 transition-all">
                {item.subItems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleTabClick(sub.id)}
                    className={`flex items-center justify-between text-left text-sm py-2 px-3 rounded-md transition-colors ${
                      activeTab === sub.id 
                        ? 'text-white bg-[#2a2b30]/60 font-medium' 
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2b30]/40'
                    }`}
                  >
                    <span>{sub.label}</span>
                    {sub.badge !== undefined && sub.badge > 0 && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        activeTab === sub.id ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
                      }`}>
                        {sub.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Submenu flyout when collapsed */}
            {isCollapsed && item.subItems && (
              <div className="absolute left-full top-0 ml-2 w-48 bg-[#151619] border border-[#2a2b30] rounded-lg shadow-xl hidden group-hover:flex flex-col py-2 z-50 transition-all duration-200">
                <div className="px-3 py-1 text-[11px] font-bold text-[#8E9299] uppercase tracking-wider border-b border-[#2a2b30]/65 mb-1.5">
                  {item.label}
                </div>
                {item.subItems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleTabClick(sub.id)}
                    className={`w-full text-left text-sm py-2 px-3 transition-colors flex items-center justify-between ${
                      activeTab === sub.id
                        ? 'text-[#2F6BFF] bg-[#2F6BFF]/10 font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-[#2a2b30]/50'
                    }`}
                  >
                    <span>{sub.label}</span>
                    {sub.badge !== undefined && sub.badge > 0 && (
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                        activeTab === sub.id ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
                      }`}>
                        {sub.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={`p-4 border-t border-[#2a2b30] ${isCollapsed ? 'px-3' : ''}`}>
        {[
          { id: 'api-keys', label: 'API Keys', icon: KeyRound },
          { id: 'logs', label: 'Logs', icon: AlignLeft },
          { id: 'api-tester', label: 'Execução de Testes', icon: Terminal },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            title={item.label}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center py-4' : 'gap-3 px-4 py-3'} text-sm font-medium rounded-lg transition-colors mt-1 ${
              activeTab === item.id
                ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}
