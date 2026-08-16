import React, { useMemo, useEffect, useState } from 'react';
import { LayoutDashboard, KeyRound, Settings, Activity, Terminal, X, ChevronDown, ChevronsLeft, ChevronsRight, BarChart2, FileText, AlignLeft, ClipboardList, ArrowLeftRight } from 'lucide-react';
import { usePositionsStore } from '../store/positionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOrdersStore } from '../store/ordersStore';
import logo1 from '../assets/CriptoDashboard-logo1.PNG';

interface SubItem {
  id: string;
  label: string;
  badge?: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  subItems?: SubItem[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (isOpen: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, isCollapsed, setIsCollapsed }: SidebarProps) {
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const openOrdersCount = useOrdersStore(state => Object.keys(state.openOrders).length);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const collapsed = isMobile ? false : isCollapsed;

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

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'positions', label: 'Positions', icon: Activity, subItems: [
        { id: 'positions-open', label: 'Open Positions', badge: openCount },
        { id: 'positions-history', label: 'Positions History' }
      ]
    },
    {
      id: 'orders', label: 'Orders', icon: ClipboardList, subItems: [
        { id: 'orders-open', label: 'Open Orders', badge: openOrdersCount },
        { id: 'orders-history', label: 'Orders History' }
      ]
    },
    {
      id: 'trade', label: 'Trade', icon: ArrowLeftRight, subItems: [
        { id: 'trade-history', label: 'Trade History' }
      ]
    },
    {
      id: 'analytics', label: 'Analytics', icon: BarChart2, subItems: [
        { id: 'analytics-pnl-symbol', label: 'PnL by Symbol' },
        { id: 'analytics-bybit-tx', label: 'Bybit Transactions' },
        { id: 'analytics-funding', label: 'Funding Fees' },
        { id: 'analytics-hedge-pro', label: 'Hedge Pro' }
      ]
    },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  // Accordion state management
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navItems.forEach(item => {
      if (item.subItems?.some(sub => sub.id === activeTab)) {
        initial[item.id] = true;
      }
    });
    return initial;
  });

  // Keep accordion open if an active sub-item is selected
  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems?.some(sub => sub.id === activeTab)) {
        setExpandedItems(prev => ({ ...prev, [item.id]: true }));
      }
    });
  }, [activeTab]);

  const toggleAccordion = (item: NavItem) => {
    if (collapsed) {
      // 1. Expand sidebar first so accordion and subitems are visible
      setIsCollapsed?.(false);
      // 2. Open accordion for this section
      setExpandedItems(prev => ({ ...prev, [item.id]: true }));
    } else {
      // Just toggle the accordion state
      setExpandedItems(prev => ({ ...prev, [item.id]: !prev[item.id] }));
    }
  };

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 z-40 ${collapsed ? 'w-20' : 'w-64'} bg-[#151619] border-r border-[#2a2b30] flex flex-col h-full transform transition-all duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`p-4 lg:p-5 border-b border-[#2a2b30] flex items-center ${collapsed ? 'justify-center' : 'justify-between'} relative shrink-0`}>
        {!collapsed ? (
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <img src={logo1} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
                <span className="text-[15px] font-bold leading-tight">
                  Portfolio Manager
                  <span className="block text-[11px] text-[#8E9299] font-normal tracking-wide mt-0.5">Crypto Multi-Exchange</span>
                </span>
              </div>
            </h1>
          </div>
        ) : (
          <img src={logo1} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
        )}

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen?.(false)}
          className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#2a2b30] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#1a1b1e] border border-[#2a2b30] rounded-full items-center justify-center text-gray-400 hover:text-white hover:bg-[#2a2b30] transition-colors z-50"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className={`flex-1 p-3 lg:p-4 space-y-1.5 ${collapsed ? 'px-3 overflow-visible' : 'overflow-y-auto'} hide-scrollbar`}>
        {navItems.map((item) => {
          const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
          const isParentActive = hasSubItems && item.subItems?.some(sub => sub.id === activeTab);
          const isDirectActive = activeTab === item.id;
          const isActive = isDirectActive || isParentActive;
          const isExpanded = Boolean(expandedItems[item.id]);

          return (
            <div key={item.id} className="flex flex-col gap-1 relative group">
              <button
                onClick={() => {
                  if (hasSubItems) {
                    toggleAccordion(item);
                  } else {
                    handleTabClick(item.id);
                  }
                }}
                title={item.label}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center py-3.5' : 'justify-between px-3.5 py-2.5'
                } rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
                    : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#2F6BFF]' : 'text-gray-400'}`} />
                  {!collapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                </div>

                {!collapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {'badge' in item && item.badge !== undefined && (item.badge as number) > 0 && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        isActive ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
                      }`}>
                        {item.badge as number}
                      </span>
                    )}
                    {hasSubItems && (
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    )}
                  </div>
                )}

                {/* Badge indicator on collapsed view */}
                {collapsed && hasSubItems && isParentActive && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2F6BFF]" />
                )}
              </button>

              {/* Submenu inline when expanded */}
              {!collapsed && hasSubItems && isExpanded && (
                <div className="pl-9 pr-1 flex flex-col gap-1 mt-0.5 mb-1 transition-all">
                  {item.subItems!.map((sub) => {
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleTabClick(sub.id)}
                        className={`flex items-center justify-between text-left text-xs lg:text-sm py-2 px-3 rounded-md transition-colors ${
                          isSubActive
                            ? 'text-white bg-[#2a2b30] font-medium'
                            : 'text-gray-400 hover:text-white hover:bg-[#2a2b30]/40'
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span className={`px-2 py-0.5 text-[11px] rounded-full shrink-0 ${
                            isSubActive ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
                          }`}>
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Submenu flyout when collapsed */}
              {collapsed && hasSubItems && (
                <div className="absolute left-full top-0 ml-2 w-52 bg-[#151619] border border-[#2a2b30] rounded-lg shadow-xl hidden group-hover:flex flex-col py-2 z-50 transition-all duration-200">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-[#8E9299] uppercase tracking-wider border-b border-[#2a2b30]/65 mb-1">
                    {item.label}
                  </div>
                  {item.subItems!.map((sub) => {
                    const isSubActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleTabClick(sub.id)}
                        className={`w-full text-left text-xs lg:text-sm py-2 px-3.5 transition-colors flex items-center justify-between ${
                          isSubActive
                            ? 'text-[#2F6BFF] bg-[#2F6BFF]/10 font-semibold'
                            : 'text-gray-400 hover:text-white hover:bg-[#2a2b30]/50'
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full shrink-0 ${
                            isSubActive ? 'bg-[#2F6BFF] text-white' : 'bg-[#2a2b30] text-[#8E9299]'
                          }`}>
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className={`p-3 lg:p-4 border-t border-[#2a2b30] shrink-0 ${collapsed ? 'px-3' : ''}`}>
        {[
          { id: 'api-keys', label: 'API Keys', icon: KeyRound },
          { id: 'logs', label: 'Logs', icon: AlignLeft },
          { id: 'api-tester', label: 'API Tester', icon: Terminal },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            title={item.label}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center py-3.5' : 'gap-3 px-3.5 py-2.5'
            } text-sm font-medium rounded-lg transition-colors mt-1 ${
              activeTab === item.id
                ? 'bg-[#2F6BFF]/10 text-[#2F6BFF]'
                : 'text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50'
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
}

