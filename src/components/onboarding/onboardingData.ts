import { NAV_SECTION_ICONS, type NavIconComponent } from '../../config/navigationConfig';
import { isAiChatbotFeatureEnabled } from '../../utils/aiFeatureFlag';

export type OnboardingStepId = 'welcome' | 'preferences' | 'dashboard' | 'navigation' | 'operations' | 'start';

export interface OnboardingStepMeta {
  index: number;
  id: OnboardingStepId;
  labelKey: string;
  defaultLabel: string;
}

export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  { index: 0, id: 'welcome', labelKey: 'onboarding.steps.welcome', defaultLabel: 'Welcome' },
  { index: 1, id: 'preferences', labelKey: 'onboarding.steps.preferences', defaultLabel: 'Preferences' },
  { index: 2, id: 'dashboard', labelKey: 'onboarding.steps.dashboard', defaultLabel: 'Dashboard' },
  { index: 3, id: 'navigation', labelKey: 'onboarding.steps.navigation', defaultLabel: 'Sidebar' },
  { index: 4, id: 'operations', labelKey: 'onboarding.steps.operations', defaultLabel: 'Logs & Settings' },
  { index: 5, id: 'start', labelKey: 'onboarding.steps.start', defaultLabel: 'Get Started' },
];

export type DashboardZoneId = 'kpis' | 'charts' | 'hierarchy' | 'controls';

export interface DashboardZoneMeta {
  id: DashboardZoneId;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  metricKey: string;
  defaultMetric: string;
}

export const DASHBOARD_ZONES: DashboardZoneMeta[] = [
  {
    id: 'controls',
    titleKey: 'onboarding.step3.zones.controls.title',
    defaultTitle: 'Top Toolbar & Status Bar',
    descKey: 'onboarding.step3.zones.controls.desc',
    defaultDesc: 'Quick-switch Language, Currency, Theme, Privacy Eye, and live connection status in the footer.',
    metricKey: 'onboarding.step3.zones.controls.metric',
    defaultMetric: 'Privacy Eye · Status Bar',
  },
  {
    id: 'kpis',
    titleKey: 'onboarding.step3.zones.kpis.title',
    defaultTitle: 'Top 4 KPI Cards',
    descKey: 'onboarding.step3.zones.kpis.desc',
    defaultDesc: 'Real-time Total Equity, Open Positions P&L, Long vs. Short ratio, and Inverse Hedge coverage.',
    metricKey: 'onboarding.step3.zones.kpis.metric',
    defaultMetric: '4 Core Metrics · Auto-polled',
  },
  {
    id: 'charts',
    titleKey: 'onboarding.step3.zones.charts.title',
    defaultTitle: 'Macro & Cross-Exchange Charts',
    descKey: 'onboarding.step3.zones.charts.desc',
    defaultDesc: 'Visual breakdown of capital distribution per exchange alongside asset concentration.',
    metricKey: 'onboarding.step3.zones.charts.metric',
    defaultMetric: 'Capital & Asset Composition',
  },
  {
    id: 'hierarchy',
    titleKey: 'onboarding.step3.zones.hierarchy.title',
    defaultTitle: 'Hierarchical Balance Table',
    descKey: 'onboarding.step3.zones.hierarchy.desc',
    defaultDesc: 'Drill down by Exchange → Account → Asset with dust filtering (< $1) and instant search.',
    metricKey: 'onboarding.step3.zones.hierarchy.metric',
    defaultMetric: 'Exchange → Account → Coin',
  },
];

export interface SidebarModuleMeta {
  id: string;
  group: 'primary' | 'system';
  targetTab: string;
  icon: NavIconComponent;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
  subTags: string[];
}

export function getSidebarModules(): SidebarModuleMeta[] {
  const modules: SidebarModuleMeta[] = [
    {
      id: 'dashboard',
      group: 'primary',
      targetTab: 'dashboard',
      icon: NAV_SECTION_ICONS.dashboard,
      titleKey: 'onboarding.step4.modules.dashboard.title',
      defaultTitle: 'Dashboard',
      descKey: 'onboarding.step4.modules.dashboard.desc',
      defaultDesc: 'Consolidated equity KPIs, capital charts, hierarchical balances, market sentiment, and live FX rates.',
      subTags: ['KPIs', 'Charts', 'Balances'],
    },
    {
      id: 'hedgePro',
      group: 'primary',
      targetTab: 'analytics-hedge-pro',
      icon: NAV_SECTION_ICONS.hedgePro,
      titleKey: 'onboarding.step4.modules.hedgePro.title',
      defaultTitle: 'Hedge Pro',
      descKey: 'onboarding.step4.modules.hedgePro.desc',
      defaultDesc: 'Delta-neutral and inverse contract risk engine measuring protected vs. exposed capital per coin.',
      subTags: ['Inverse', 'Delta-Neutral', 'Risk'],
    },
    {
      id: 'positions',
      group: 'primary',
      targetTab: 'positions-open',
      icon: NAV_SECTION_ICONS.positions,
      titleKey: 'onboarding.step4.modules.positions.title',
      defaultTitle: 'Positions',
      descKey: 'onboarding.step4.modules.positions.desc',
      defaultDesc: 'Monitor active Open Positions with live mark prices or audit Closed Positions history.',
      subTags: ['Open', 'Closed', 'Detailed / Lite'],
    },
    {
      id: 'orders',
      group: 'primary',
      targetTab: 'orders-open',
      icon: NAV_SECTION_ICONS.orders,
      titleKey: 'onboarding.step4.modules.orders.title',
      defaultTitle: 'Orders',
      descKey: 'onboarding.step4.modules.orders.desc',
      defaultDesc: 'Inspect active Open Orders and filter historical filled or cancelled orders across accounts.',
      subTags: ['Open Orders', 'Order History'],
    },
    {
      id: 'trade',
      group: 'primary',
      targetTab: 'trade-history',
      icon: NAV_SECTION_ICONS.trade,
      titleKey: 'onboarding.step4.modules.trade.title',
      defaultTitle: 'Trade History',
      descKey: 'onboarding.step4.modules.trade.desc',
      defaultDesc: 'Detailed execution fills, fees, and trade-by-trade reconciliation.',
      subTags: ['Fills', 'Fees', 'Executions'],
    },
    {
      id: 'transactions',
      group: 'primary',
      targetTab: 'transactions-history-consolidated',
      icon: NAV_SECTION_ICONS.transactions,
      titleKey: 'onboarding.step4.modules.transactions.title',
      defaultTitle: 'Transactions History',
      descKey: 'onboarding.step4.modules.transactions.desc',
      defaultDesc: 'Consolidated Net Change ledger plus exchange-specific logs.',
      subTags: ['Consolidated', 'Bybit', 'Bitget', 'OKX'],
    },
    {
      id: 'analytics',
      group: 'primary',
      targetTab: 'analytics-portfolio-performance',
      icon: NAV_SECTION_ICONS.analytics,
      titleKey: 'onboarding.step4.modules.analytics.title',
      defaultTitle: 'Analytics',
      descKey: 'onboarding.step4.modules.analytics.desc',
      defaultDesc: 'Portfolio Performance, Market Analytics, PnL by Symbol, and Funding Fees optimization.',
      subTags: ['Performance', 'Market', 'PnL', 'Funding'],
    },
    {
      id: 'reports',
      group: 'primary',
      targetTab: 'reports',
      icon: NAV_SECTION_ICONS.reports,
      titleKey: 'onboarding.step4.modules.reports.title',
      defaultTitle: 'Reports',
      descKey: 'onboarding.step4.modules.reports.desc',
      defaultDesc: 'Exportable portfolio evolution summaries and multi-period performance reporting.',
      subTags: ['PDF / CSV', 'Evolution'],
    },
    {
      id: 'apiKeys',
      group: 'system',
      targetTab: 'api-keys',
      icon: NAV_SECTION_ICONS.apiKeys,
      titleKey: 'onboarding.step4.modules.apiKeys.title',
      defaultTitle: 'API Keys',
      descKey: 'onboarding.step4.modules.apiKeys.desc',
      defaultDesc: 'Add, edit, toggle, or remove exchange credentials inside your encrypted Zero-Trust Vault.',
      subTags: ['AES-256', 'Read-Only'],
    },
    {
      id: 'logs',
      group: 'system',
      targetTab: 'logs',
      icon: NAV_SECTION_ICONS.logs,
      titleKey: 'onboarding.step4.modules.logs.title',
      defaultTitle: 'Live Connection Logs',
      descKey: 'onboarding.step4.modules.logs.desc',
      defaultDesc: 'Real-time diagnostic terminal tracking WebSocket, REST polling, sync, and error events.',
      subTags: ['INFO', 'WARN', 'ERROR'],
    },
    {
      id: 'apiTester',
      group: 'system',
      targetTab: 'api-tester',
      icon: NAV_SECTION_ICONS.apiTester,
      titleKey: 'onboarding.step4.modules.apiTester.title',
      defaultTitle: 'API Tester',
      descKey: 'onboarding.step4.modules.apiTester.desc',
      defaultDesc: 'Test signed exchange endpoints directly to verify permissions and raw payloads.',
      subTags: ['Endpoints', 'Payloads'],
    },
  ];

  if (isAiChatbotFeatureEnabled()) {
    modules.push({
      id: 'aiSettings',
      group: 'system',
      targetTab: 'ai-settings',
      icon: NAV_SECTION_ICONS.aiSettings,
      titleKey: 'onboarding.step4.modules.aiSettings.title',
      defaultTitle: 'AI Settings',
      descKey: 'onboarding.step4.modules.aiSettings.desc',
      defaultDesc: 'Configure the PIKA quantitative assistant, models, rate limits, and audit trail.',
      subTags: ['PIKA', 'Audit Log'],
    });
  }

  modules.push({
    id: 'settings',
    group: 'system',
    targetTab: 'settings',
    icon: NAV_SECTION_ICONS.settings,
    titleKey: 'onboarding.step4.modules.settings.title',
    defaultTitle: 'Settings',
    descKey: 'onboarding.step4.modules.settings.desc',
    defaultDesc: 'Control polling intervals, IndexedDB caches, custom themes, .enc backups, and Simulation Mode.',
    subTags: ['Themes', 'Cache', 'Backup'],
  });

  return modules;
}
