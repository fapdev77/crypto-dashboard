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

  it('maintains 100% leaf key parity and non-empty strings across all 6 locales', () => {
    const flatten = (obj: Record<string, unknown>, prefix = '', out: Record<string, unknown> = {}) => {
      for (const [k, v] of Object.entries(obj)) {
        const keyPath = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          flatten(v as Record<string, unknown>, keyPath, out);
        } else {
          out[keyPath] = v;
        }
      }
      return out;
    };

    const enFlat = flatten(resources['en-US'].translation as Record<string, unknown>);
    const enKeys = Object.keys(enFlat).sort();

    supportedLocales.forEach((locale) => {
      const flat = flatten(resources[locale].translation as Record<string, unknown>);
      expect(Object.keys(flat).sort(), `Key parity mismatch in ${locale}`).toEqual(enKeys);
      for (const key of enKeys) {
        const val = flat[key];
        expect(typeof val, `${locale}.${key} should be a string`).toBe('string');
        expect((val as string).trim().length, `${locale}.${key} should not be empty`).toBeGreaterThan(0);
      }
    });
  });

  it('preserves matching interpolation placeholders across all 6 locales', () => {
    const extractVars = (text: string) =>
      [...text.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1].trim()).sort();

    const flatten = (obj: Record<string, unknown>, prefix = '', out: Record<string, string> = {}) => {
      for (const [k, v] of Object.entries(obj)) {
        const keyPath = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          flatten(v as Record<string, unknown>, keyPath, out);
        } else if (typeof v === 'string') {
          out[keyPath] = v;
        }
      }
      return out;
    };

    const enFlat = flatten(resources['en-US'].translation as Record<string, unknown>);

    supportedLocales.slice(1).forEach((locale) => {
      const flat = flatten(resources[locale].translation as Record<string, unknown>);
      for (const [key, enVal] of Object.entries(enFlat)) {
        expect(extractVars(flat[key]), `Placeholder mismatch in ${locale}.${key}`).toEqual(
          extractVars(enVal)
        );
      }
    });
  });

  it('prevents cross-language leakage and preserves locale-specific variants', () => {
    const es = resources['es-419'].translation as any;
    expect(es.analytics.funding.tooltips.oneYear).not.toContain('Soma acumulada');
    expect(es.analytics.fundingTooltips.lastMonth).not.toContain('Soma acumulada');
    expect(es.settings.fundingTiming.totalTimeTooltip).not.toContain('base de dados');
    expect(es.analytics.inverseTooltips.priceRangeDesc).not.toContain('intradiária');

    const itLocale = resources['it-IT'].translation as any;
    expect(itLocale.settings.theme.presetsDesc).not.toContain('combinaciones');
    expect(itLocale.common.historyLimit.limits.okx).toContain('giorni');
    expect(itLocale.common.historyLimit.limits.bitget).toContain('giorni');
    expect(itLocale.dashboardExtra.crossExchangeAssetComposition).not.toContain('Composição');
    expect(itLocale.transactions.table.time).toBe('Data e Ora');
    expect(itLocale.transactions.bitget.noData).not.toContain('para sincronizzare');
    expect(itLocale.settings.fundingTiming.fundingIn).toBe('Funding tra');

    const ptBr = resources['pt-BR'].translation as any;
    const ptPt = resources['pt-PT'].translation as any;
    expect(ptBr.positions.title).toBe('Posições Abertas');
    expect(ptPt.positions.title).toBe('Posições Abertas');
    expect(ptPt.toasts.idbSyncAllSuccess).not.toContain('plataformas de câmbio');

    const enGb = resources['en-GB'].translation as any;
    expect(enGb.settings.catalog.title).toContain('Catalogue');
    expect(enGb.dashboardExtra.unrealizedPnlLabel).toContain('Unrealised');
    expect(enGb.dashboardExtra.realizedPnlLabel).toContain('Realised');
    expect(enGb.transactions.consolidated.noDataDesc).toContain('synchronisation');
    expect(enGb.apiKeys.vault.legacyDetectedDesc).toContain('unauthorised');
    expect(enGb.ai.settings.obfuscationDesc).toContain('Normalise');
    expect(enGb.ai.toolBadges.closedPositions).toContain('Analysing');

    supportedLocales.forEach((locale) => {
      const tr = resources[locale].translation as any;
      expect(tr.sentiment?.advice?.extremeGreed).toBeTruthy();
      expect(tr.sentiment?.advice?.greed).toBeTruthy();
      expect(tr.sentiment?.advice?.extremeFear).toBeTruthy();
      expect(tr.sentiment?.advice?.fear).toBeTruthy();
      expect(tr.sentiment?.advice?.neutral).toBeTruthy();
    });
  });
});

