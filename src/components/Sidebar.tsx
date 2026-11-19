import React, { useMemo, useEffect, useState } from 'react';
import { X, ChevronDown, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NAV_SECTION_ICONS } from '../config/navigationConfig';
import { usePositionsStore } from '../store/positionsStore';
import { useSettingsStore } from '../store/settingsStore';
import { useOrdersStore } from '../store/ordersStore';
import { useApiKeysStore } from '../store/apiKeysStore';
import { useAiSettingsStore } from '../store/aiSettingsStore';
import { isAiChatbotFeatureEnabled } from '../utils/aiFeatureFlag';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const positions = usePositionsStore(state => state.positions);
  const useMockData = useSettingsStore(state => state.useMockData);
  const openOrders = useOrdersStore(state => state.openOrders);
  const keys = useApiKeysStore(state => state.keys);

  const [isMobile, setIsMobile] = useState(false);

  const activeKeyIds = useMemo(() => new Set(keys.filter(k => k.isActive).map(k => k.id)), [keys]);
  const activeExchanges = useMemo(() => new Set(keys.filter(k => k.isActive).map(k => k.exchange.toLowerCase())), [keys]);

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
    if (!useMockData && activeKeyIds.size === 0) return 0;
    const list = Object.values(positions);
    return list.filter(pos =>
      (useMockData
        ? pos.connectionId.startsWith('mocked-data')
        : !pos.connectionId.startsWith('mocked-data') && activeKeyIds.has(pos.connectionId)
      ) && Math.abs(pos.size) > 0
    ).length;
  }, [positions, useMockData, activeKeyIds]);

  const openOrdersCount = useMemo(() => {
    if (!useMockData && activeKeyIds.size === 0) return 0;
    const list = Object.values(openOrders);
    return list.filter(o =>
      useMockData
        ? o.connectionId.startsWith('mocked-data')
        : !o.connectionId.startsWith('mocked-data') && activeKeyIds.has(o.connectionId)
    ).length;
  }, [openOrders, useMockData, activeKeyIds]);

  // Transaction history entries are only offered for exchanges that actually hold data:
  // an active API key, or the Simulation Mode mock logs (which cover every exchange).
  const transactionHistoryItems = useMemo<SubItem[]>(() => {
    const exchanges = [
      { id: 'transactions-history-bybit', label: t('nav.bybitTransactions', 'Bybit Transactions'), exchange: 'bybit' },
      { id: 'transactions-history-bitget', label: t('nav.bitgetTransactions', 'Bitget Transactions'), exchange: 'bitget' },
      { id: 'transactions-history-okx', label: t('nav.okxTransactions', 'OKX Transactions'), exchange: 'okx' },
    ];
    const available = exchanges.filter(({ exchange }) => useMockData || activeExchanges.has(exchange));
    if (available.length === 0) return [];

    return [
      { id: 'transactions-history-consolidated', label: t('nav.consolidated', 'Consolidated Net Change') },
      ...available.map(({ id, label }) => ({ id, label })),
    ];
  }, [activeExchanges, useMockData, t]);

  const navItems: NavItem[] = useMemo(() => [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: NAV_SECTION_ICONS.dashboard },
    {
      id: 'hedge-pro', label: t('nav.hedgePro', 'Hedge Pro'), icon: NAV_SECTION_ICONS.hedgePro, subItems: [
        { id: 'analytics-hedge-pro', label: t('nav.hedgePro', 'Hedge Pro') }
      ]
    },
    {
      id: 'positions', label: t('nav.positions', 'Positions'), icon: NAV_SECTION_ICONS.positions, subItems: [
        { id: 'positions-open', label: t('nav.openPositions', 'Open Positions'), badge: openCount },
        { id: 'positions-history', label: t('nav.closedPositions', 'Positions History') }
      ]
    },
    {
      id: 'orders', label: t('nav.orders', 'Orders'), icon: NAV_SECTION_ICONS.orders, subItems: [
        { id: 'orders-open', label: t('nav.openOrders', 'Open Orders'), badge: openOrdersCount },
        { id: 'orders-history', label: t('nav.orderHistory', 'Orders History') }
      ]
    },
    {
      id: 'trade', label: t('nav.trade', 'Trade'), icon: NAV_SECTION_ICONS.trade, subItems: [
        { id: 'trade-history', label: t('nav.trade', 'Trade History') }
      ]
    },
    ...(transactionHistoryItems.length > 0
      ? [{
          id: 'transactions-history', label: t('nav.transactions', 'Transactions History'), icon: NAV_SECTION_ICONS.transactions, subItems: transactionHistoryItems
        }]
      : []),
    {
      id: 'analytics', label: t('nav.analytics', 'Analytics'), icon: NAV_SECTION_ICONS.analytics, subItems: [
        { id: 'analytics-portfolio-performance', label: t('nav.portfolioPerformance', 'Portfolio Performance') },
        { id: 'analytics-market-advanced', label: t('nav.marketAnalytics', 'Market Analytics') },
        { id: 'analytics-pnl-symbol', label: t('nav.pnlBySymbol', 'PnL by Symbol') },
        { id: 'analytics-funding', label: t('nav.fundingDashboard', 'Funding Fees') }
      ]
    },
    { id: 'reports', label: t('nav.reports', 'Reports'), icon: NAV_SECTION_ICONS.reports },
  ], [t, openCount, openOrdersCount, transactionHistoryItems]);

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
    <aside className={`fixed lg:static inset-y-0 left-0 z-40 ${collapsed ? 'w-20' : 'w-64'} bg-surface border-r border-line flex flex-col h-full transform transition-all duration-300 ease-in-out lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className={`p-4 lg:p-5 border-b border-line flex items-center ${collapsed ? 'justify-center' : 'justify-between'} relative shrink-0`}>
        {!collapsed ? (
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-fg flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <img src={logo1} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
                <span className="text-[15px] font-bold leading-tight">
                  Portfolio Manager
                  <span className="block text-[11px] text-fg-muted font-normal tracking-wide mt-0.5">{t('nav.cryptoMultiExchange', 'Crypto Multi-Exchange')}</span>
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
          className="lg:hidden p-2 text-fg-muted hover:text-fg rounded-lg hover:bg-line transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed?.(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-elevated border border-line rounded-full items-center justify-center text-fg-muted hover:text-fg hover:bg-line transition-colors z-50"
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
                    ? 'bg-accent/10 text-accent'
                    : 'text-fg-muted hover:text-fg hover:bg-line/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-accent' : 'text-fg-muted'}`} />
                  {!collapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                </div>

                {!collapsed && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {'badge' in item && item.badge !== undefined && (item.badge as number) > 0 && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        isActive ? 'bg-accent text-white' : 'bg-line text-fg-muted'
                      }`}>
                        {item.badge as number}
                      </span>
                    )}
                    {hasSubItems && (
                      <ChevronDown
                        className={`w-4 h-4 text-fg-muted transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-fg' : ''
                        }`}
                      />
                    )}
                  </div>
                )}

                {/* Badge indicator on collapsed view */}
                {collapsed && hasSubItems && isParentActive && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-accent" />
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
                            ? 'text-fg bg-line font-medium'
                            : 'text-fg-muted hover:text-fg hover:bg-line/40'
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span className={`px-2 py-0.5 text-[11px] rounded-full shrink-0 ${
                            isSubActive ? 'bg-accent text-white' : 'bg-line text-fg-muted'
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
                <div className="absolute left-full top-0 ml-2 w-52 bg-surface border border-line rounded-lg shadow-xl hidden group-hover:flex flex-col py-2 z-50 transition-all duration-200">
                  <div className="px-3.5 py-1.5 text-[11px] font-bold text-fg-muted uppercase tracking-wider border-b border-line/65 mb-1">
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
                            ? 'text-accent bg-accent/10 font-semibold'
                            : 'text-fg-muted hover:text-fg hover:bg-line/50'
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span className={`px-1.5 py-0.5 text-[10px] rounded-full shrink-0 ${
                            isSubActive ? 'bg-accent text-white' : 'bg-line text-fg-muted'
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

      <div className={`p-3 lg:p-4 border-t border-line shrink-0 ${collapsed ? 'px-3' : ''}`}>
        {[
          { id: 'api-keys', label: t('nav.apiKeys', 'API Keys'), icon: NAV_SECTION_ICONS.apiKeys },
          { id: 'logs', label: t('nav.connectionLogs', 'Logs'), icon: NAV_SECTION_ICONS.logs },
          { id: 'api-tester', label: t('nav.apiTester', 'API Tester'), icon: NAV_SECTION_ICONS.apiTester },
          ...(isAiChatbotFeatureEnabled() ? [{ id: 'ai-settings', label: t('nav.aiSettings', 'AI Settings'), icon: NAV_SECTION_ICONS.aiSettings }] : []),
          { id: 'settings', label: t('nav.settings', 'Settings'), icon: NAV_SECTION_ICONS.settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabClick(item.id)}
            title={item.label}
            className={`w-full flex items-center ${
              collapsed ? 'justify-center py-3' : 'gap-3 px-3.5 py-2'
            } text-sm font-medium rounded-lg transition-colors mt-0.5 relative ${
              activeTab === item.id
                ? 'bg-accent/10 text-accent'
                : 'text-fg-muted hover:text-fg hover:bg-line/50'
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

