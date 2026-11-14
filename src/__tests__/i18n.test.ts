import { describe, it, expect } from 'vitest';
import i18n, { resources } from '../i18n/config';

describe('i18n configuration and locale dictionaries', () => {
  const supportedLocales = ['en-US', 'en-GB', 'it-IT', 'es-419', 'pt-BR', 'pt-PT'] as const;

  it('contains all 6 required locales in resources', () => {
    supportedLocales.forEach((locale) => {
      expect(resources[locale]).toBeDefined();
      expect(resources[locale].translation).toBeDefined();
    });
  });

  it('has essential common keys present in all locales', () => {
    const requiredCommonKeys = ['save', 'cancel', 'close', 'search', 'privacy', 'help'];

    supportedLocales.forEach((locale) => {
      const trans = resources[locale].translation as any;
      expect(trans.common).toBeDefined();
      requiredCommonKeys.forEach((key) => {
        expect(trans.common[key], `Missing common.${key} in ${locale}`).toBeDefined();
        expect(typeof trans.common[key]).toBe('string');
      });
    });
  });

  it('has essential navigation keys present in all locales', () => {
    const requiredNavKeys = ['dashboard', 'openPositions', 'trade', 'orders', 'analytics', 'settings'];

    supportedLocales.forEach((locale) => {
      const trans = resources[locale].translation as any;
      expect(trans.nav).toBeDefined();
      requiredNavKeys.forEach((key) => {
        expect(trans.nav[key], `Missing nav.${key} in ${locale}`).toBeDefined();
      });
    });
  });

  it('has selector and currency keys present in all locales', () => {
    supportedLocales.forEach((locale) => {
      const trans = resources[locale].translation as any;
      expect(trans.selector).toBeDefined();
      expect(trans.selector.title).toBeDefined();
      expect(trans.selector.tabLanguage).toBeDefined();
      expect(trans.selector.tabCurrency).toBeDefined();
    });
  });

  it('switches languages dynamically via i18n.changeLanguage', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('common.save')).toBe('Salvar');

    await i18n.changeLanguage('en-US');
    expect(i18n.t('common.save')).toBe('Save');

    await i18n.changeLanguage('it-IT');
    expect(i18n.t('common.save')).toBe('Salva');

    await i18n.changeLanguage('es-419');
    expect(i18n.t('common.save')).toBe('Guardar');
  });
});
