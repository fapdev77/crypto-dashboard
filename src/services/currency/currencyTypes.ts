export type SupportedLocale = 'en-US' | 'en-GB' | 'it-IT' | 'es-419' | 'pt-BR' | 'pt-PT';

export type SupportedFiatCurrency = 'USD' | 'EUR' | 'GBP' | 'BRL';

export interface LocaleConfig {
  id: SupportedLocale;
  code: string;
  name: string;        // Native name
  englishName: string; // International name
  flag: string;
  defaultCurrency: SupportedFiatCurrency;
  dateFormat: string;
  numberLocale: string;
}

export interface FiatCurrencyConfig {
  id: SupportedFiatCurrency;
  code: string;
  symbol: string;
  name: string;        // Name in English
  nativeName: string;  // Name in localized form
  flag: string;
  defaultLocale: SupportedLocale;
  decimals: number;
}

export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleConfig> = {
  'en-US': {
    id: 'en-US',
    code: 'en-US',
    name: 'English (US)',
    englishName: 'English (US)',
    flag: '🇺🇸',
    defaultCurrency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    numberLocale: 'en-US',
  },
  'en-GB': {
    id: 'en-GB',
    code: 'en-GB',
    name: 'English (UK)',
    englishName: 'English (UK)',
    flag: '🇬🇧',
    defaultCurrency: 'GBP',
    dateFormat: 'dd/MM/yyyy',
    numberLocale: 'en-GB',
  },
  'it-IT': {
    id: 'it-IT',
    code: 'it-IT',
    name: 'Italiano',
    englishName: 'Italian',
    flag: '🇮🇹',
    defaultCurrency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberLocale: 'it-IT',
  },
  'es-419': {
    id: 'es-419',
    code: 'es-419',
    name: 'Español (Latinoamérica)',
    englishName: 'Spanish (Latin America)',
    flag: '🌎',
    defaultCurrency: 'USD',
    dateFormat: 'dd/MM/yyyy',
    numberLocale: 'es-419',
  },
  'pt-BR': {
    id: 'pt-BR',
    code: 'pt-BR',
    name: 'Português (Brasil)',
    englishName: 'Portuguese (Brazil)',
    flag: '🇧🇷',
    defaultCurrency: 'BRL',
    dateFormat: 'dd/MM/yyyy',
    numberLocale: 'pt-BR',
  },
  'pt-PT': {
    id: 'pt-PT',
    code: 'pt-PT',
    name: 'Português (Portugal)',
    englishName: 'Portuguese (Portugal)',
    flag: '🇵🇹',
    defaultCurrency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberLocale: 'pt-PT',
  },
};

export const SUPPORTED_FIAT_CURRENCIES: Record<SupportedFiatCurrency, FiatCurrencyConfig> = {
  USD: {
    id: 'USD',
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    nativeName: 'Dólar Americano',
    flag: '🇺🇸',
    defaultLocale: 'en-US',
    decimals: 2,
  },
  EUR: {
    id: 'EUR',
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    nativeName: 'Euro',
    flag: '🇪🇺',
    defaultLocale: 'it-IT',
    decimals: 2,
  },
  GBP: {
    id: 'GBP',
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    nativeName: 'Libra Esterlina',
    flag: '🇬🇧',
    defaultLocale: 'en-GB',
    decimals: 2,
  },
  BRL: {
    id: 'BRL',
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    nativeName: 'Real Brasileiro',
    flag: '🇧🇷',
    defaultLocale: 'pt-BR',
    decimals: 2,
  },
};

export const DEFAULT_FIAT_RATES: Record<SupportedFiatCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.65,
};
