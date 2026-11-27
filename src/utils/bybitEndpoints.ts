export type ApiEnvironment = 'mainnet' | 'testnet';

export type BybitRegion =
  | 'global'
  | 'global_bytick'
  | 'brazil'
  | 'brazil_int'
  | 'argentina'
  | 'argentina_int'
  | 'netherlands'
  | 'turkey'
  | 'kazakhstan'
  | 'georgia'
  | 'uae'
  | 'eea'
  | 'indonesia'
  | 'japan'
  | 'hongkong';

export interface BybitRegionOption {
  id: BybitRegion;
  name: string;
  badge: string | null;
  mainnetUrl: string;
  testnetUrl: string;
  headers: Record<string, string>;
  description: string;
  notes?: string;
}

export const BYBIT_REGIONS: BybitRegionOption[] = [
  {
    id: 'global',
    name: 'Global (api.bybit.com)',
    badge: 'GLOBAL',
    mainnetUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Standard global Bybit connection',
  },
  {
    id: 'global_bytick',
    name: 'Global / Bytick (api.bytick.com)',
    badge: 'BYTICK',
    mainnetUrl: 'https://api.bytick.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Alternative global Bybit endpoint',
  },
  {
    id: 'brazil',
    name: 'Brazil (Standard / Global)',
    badge: 'BR',
    mainnetUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Standard Bybit Brazil account (global connection)',
  },
  {
    id: 'brazil_int',
    name: 'Brazil - Int (International Account)',
    badge: 'BR-Int',
    mainnetUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: { 'x-site-id': 'BRA_BTL' },
    description: 'Brazil International Account with x-site-id: BRA_BTL header',
  },
  {
    id: 'argentina',
    name: 'Argentina (Standard / Global)',
    badge: 'ARG',
    mainnetUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Standard Bybit Argentina account (global connection)',
  },
  {
    id: 'argentina_int',
    name: 'Argentina - Int (International Account)',
    badge: 'ARG-Int',
    mainnetUrl: 'https://api.bybit.com',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: { 'x-site-id': 'ARG_BTL' },
    description: 'Argentina International Account with x-site-id: ARG_BTL header',
  },
  {
    id: 'netherlands',
    name: 'Netherlands (api.bybit.nl)',
    badge: 'NL',
    mainnetUrl: 'https://api.bybit.nl',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for Netherlands users',
  },
  {
    id: 'turkey',
    name: 'Turkey (api.bybit.tr)',
    badge: 'TR',
    mainnetUrl: 'https://api.bybit.tr',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for Turkey users',
  },
  {
    id: 'kazakhstan',
    name: 'Kazakhstan (api.bybit.kz)',
    badge: 'KZ',
    mainnetUrl: 'https://api.bybit.kz',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for Kazakhstan users',
  },
  {
    id: 'georgia',
    name: 'Georgia (api.bybitgeorgia.ge)',
    badge: 'GE',
    mainnetUrl: 'https://api.bybitgeorgia.ge',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for Georgia users',
  },
  {
    id: 'uae',
    name: 'United Arab Emirates / UAE (api.bybit.ae)',
    badge: 'AE',
    mainnetUrl: 'https://api.bybit.ae',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for UAE users',
  },
  {
    id: 'eea',
    name: 'European Economic Area / EEA (api.bybit.eu)',
    badge: 'EEA',
    mainnetUrl: 'https://api.bybit.eu',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for European Union (EEA) users',
    notes: 'Only supports broker API user features',
  },
  {
    id: 'indonesia',
    name: 'Indonesia (api.bybit.id)',
    badge: 'ID',
    mainnetUrl: 'https://api.bybit.id',
    testnetUrl: 'https://api-testnet.bybit.com',
    headers: {},
    description: 'Dedicated endpoint for Indonesia users',
  },
  {
    id: 'japan',
    name: 'Japan (api.manepa.jp)',
    badge: 'JP',
    mainnetUrl: 'https://api.manepa.jp',
    testnetUrl: 'https://api-testnet.manepa.jp',
    headers: {},
    description: 'Dedicated endpoint for Japan users',
  },
  {
    id: 'hongkong',
    name: 'Hong Kong (api.spark-fintech.com)',
    badge: 'HK',
    mainnetUrl: 'https://api.spark-fintech.com',
    testnetUrl: 'https://api-testnet.spark-fintech.com',
    headers: { 'x-refer-site-id': 'HKG' },
    description: 'Dedicated endpoint for Hong Kong users with x-refer-site-id: HKG header',
  },
];

export function getBybitRegionOption(region?: BybitRegion): BybitRegionOption {
  const target = region || 'global';
  return BYBIT_REGIONS.find(r => r.id === target) || BYBIT_REGIONS[0];
}

export function getBybitBaseUrl(environment?: ApiEnvironment, region?: BybitRegion): string {
  const env = environment || 'mainnet';
  const opt = getBybitRegionOption(region);
  return env === 'testnet' ? opt.testnetUrl : opt.mainnetUrl;
}

export function getBybitCustomHeaders(region?: BybitRegion): Record<string, string> {
  const opt = getBybitRegionOption(region);
  return { ...opt.headers };
}
