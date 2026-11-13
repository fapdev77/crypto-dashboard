import type { ComponentType } from 'react';
import type { TFunction } from 'i18next';
import {
  LayoutDashboard,
  KeyRound,
  Settings,
  Activity,
  Terminal,
  BarChart2,
  FileText,
  AlignLeft,
  ClipboardList,
  ArrowLeftRight,
  BrainCircuit,
  History,
  ShieldCheck,
} from 'lucide-react';

export type NavIconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

export interface TabHeaderMeta {
  title: string;
  icon: NavIconComponent;
}

export const NAV_SECTION_ICONS = {
  dashboard: LayoutDashboard,
  hedgePro: ShieldCheck,
  positions: Activity,
  orders: ClipboardList,
  trade: ArrowLeftRight,
  transactions: History,
  analytics: BarChart2,
  reports: FileText,
  apiKeys: KeyRound,
  logs: AlignLeft,
  apiTester: Terminal,
  aiSettings: BrainCircuit,
  settings: Settings,
} as const satisfies Record<string, NavIconComponent>;

export function getTabHeaderMeta(activeTab: string, t: TFunction): TabHeaderMeta {
  switch (activeTab) {
    case 'dashboard':
      return {
        title: t('nav.dashboard', 'Dashboard'),
        icon: NAV_SECTION_ICONS.dashboard,
      };
    case 'api-keys':
      return {
        title: t('nav.apiKeys', 'API Keys Manager'),
        icon: NAV_SECTION_ICONS.apiKeys,
      };
    case 'logs':
      return {
        title: t('nav.connectionLogs', 'Live Connection Logs'),
        icon: NAV_SECTION_ICONS.logs,
      };
    case 'settings':
      return {
        title: t('nav.settings', 'Settings'),
        icon: NAV_SECTION_ICONS.settings,
      };
    case 'ai-settings':
      return {
        title: t('nav.aiSettings', 'AI Settings'),
        icon: NAV_SECTION_ICONS.aiSettings,
      };
    case 'api-tester':
      return {
        title: t('nav.apiTester', 'API Tester'),
        icon: NAV_SECTION_ICONS.apiTester,
      };
    case 'positions-open':
      return {
        title: t('nav.openPositions', 'Open Positions'),
        icon: NAV_SECTION_ICONS.positions,
      };
    case 'positions-history':
      return {
        title: t('nav.closedPositions', 'Closed Positions'),
        icon: NAV_SECTION_ICONS.positions,
      };
    case 'orders-open':
      return {
        title: t('nav.openOrders', 'Open Orders'),
        icon: NAV_SECTION_ICONS.orders,
      };
    case 'orders-history':
      return {
        title: t('nav.orderHistory', 'Order History'),
        icon: NAV_SECTION_ICONS.orders,
      };
    case 'trade-history':
      return {
        title: t('nav.trade', 'Trade'),
        icon: NAV_SECTION_ICONS.trade,
      };
    case 'transactions-history-consolidated':
      return {
        title: t('nav.consolidated', 'Consolidated Net Change'),
        icon: NAV_SECTION_ICONS.transactions,
      };
    case 'transactions-history-bybit':
      return {
        title: t('nav.bybitTransactions', 'Bybit Transactions'),
        icon: NAV_SECTION_ICONS.transactions,
      };
    case 'transactions-history-bitget':
      return {
        title: t('nav.bitgetTransactions', 'Bitget Transactions'),
        icon: NAV_SECTION_ICONS.transactions,
      };
    case 'transactions-history-okx':
      return {
        title: t('nav.okxTransactions', 'OKX Transactions'),
        icon: NAV_SECTION_ICONS.transactions,
      };
    case 'analytics-portfolio-performance':
      return {
        title: t('nav.portfolioPerformance', 'Portfolio Performance'),
        icon: NAV_SECTION_ICONS.analytics,
      };
    case 'analytics-hedge-pro':
      return {
        title: t('nav.hedgePro', 'Hedge Pro'),
        icon: NAV_SECTION_ICONS.hedgePro,
      };
    case 'analytics-market-advanced':
      return {
        title: t('nav.marketAnalytics', 'Market Analytics'),
        icon: NAV_SECTION_ICONS.analytics,
      };
    case 'analytics-funding':
    case 'analytics-funding-fees':
      return {
        title: t('nav.fundingDashboard', 'Funding & Fees'),
        icon: NAV_SECTION_ICONS.analytics,
      };
    case 'analytics-pnl-symbol':
      return {
        title: t('nav.pnlBySymbol', 'PnL by Symbol'),
        icon: NAV_SECTION_ICONS.analytics,
      };
    case 'reports':
      return {
        title: t('nav.reports', 'Reports'),
        icon: NAV_SECTION_ICONS.reports,
      };
    default:
      if (activeTab.startsWith('positions-')) {
        return {
          title: t('nav.positions', 'Positions'),
          icon: NAV_SECTION_ICONS.positions,
        };
      }
      if (activeTab.startsWith('orders-')) {
        return {
          title: t('nav.orders', 'Orders'),
          icon: NAV_SECTION_ICONS.orders,
        };
      }
      if (activeTab.startsWith('trade-')) {
        return {
          title: t('nav.trade', 'Trade'),
          icon: NAV_SECTION_ICONS.trade,
        };
      }
      if (activeTab.startsWith('transactions-history-')) {
        return {
          title: t('nav.transactions', 'Transactions History'),
          icon: NAV_SECTION_ICONS.transactions,
        };
      }
      if (activeTab.startsWith('analytics-')) {
        return {
          title: t('nav.analytics', 'Analytics'),
          icon: NAV_SECTION_ICONS.analytics,
        };
      }
      return {
        title: activeTab.replace('analytics-', '').replace('-', ' '),
        icon: NAV_SECTION_ICONS.dashboard,
      };
  }
}
