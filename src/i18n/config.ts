import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enUS from '../locales/en-US.json';
import enGB from '../locales/en-GB.json';
import ptBR from '../locales/pt-BR.json';
import ptPT from '../locales/pt-PT.json';
import es419 from '../locales/es-419.json';
import itIT from '../locales/it-IT.json';
import { SupportedLocale } from '../services/currency/currencyTypes';

export const resources = {
  'en-US': { translation: enUS },
  'en-GB': { translation: enGB },
  'pt-BR': { translation: ptBR },
  'pt-PT': { translation: ptPT },
  'es-419': { translation: es419 },
  'it-IT': { translation: itIT },
} as const;

export function getInitialLocale(): SupportedLocale {
  try {
    const raw = localStorage.getItem('terminal-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const saved = parsed?.state?.locale;
      if (saved && saved in resources) {
        return saved as SupportedLocale;
      }
    }
  } catch {
    // Fallback if localStorage is inaccessible
  }

  // Detect browser language if possible
  if (typeof navigator !== 'undefined') {
    const navLang = navigator.language;
    if (navLang.startsWith('pt')) {
      return navLang.toLowerCase().includes('pt') && !navLang.toLowerCase().includes('br') ? 'pt-PT' : 'pt-BR';
    }
    if (navLang.startsWith('es')) return 'es-419';
    if (navLang.startsWith('it')) return 'it-IT';
    if (navLang === 'en-GB') return 'en-GB';
  }

  return 'en-US';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLocale(),
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Avoid suspense flashing during render
    },
  });

export default i18n;
