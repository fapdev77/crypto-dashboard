import { describe, it, expect } from 'vitest';
import i18n from '../../i18n/config';
import enUS from '../../locales/en-US.json';
import enGB from '../../locales/en-GB.json';
import ptBR from '../../locales/pt-BR.json';
import ptPT from '../../locales/pt-PT.json';
import es419 from '../../locales/es-419.json';
import itIT from '../../locales/it-IT.json';

const locales: Record<string, Record<string, any>> = {
  'en-US': enUS,
  'en-GB': enGB,
  'pt-BR': ptBR,
  'pt-PT': ptPT,
  'es-419': es419,
  'it-IT': itIT,
};

function getDeepKeys(obj: Record<string, any>, prefix = ''): string[] {
  let keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getDeepKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValueByPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

describe('Toasts & Logs Internationalization (i18n) Parity', () => {
  const referenceLocales = ['en-GB', 'pt-BR', 'pt-PT', 'es-419', 'it-IT'];

  it('has identical "toasts" namespace keys across all 6 locales', () => {
    const enUSToastKeys = getDeepKeys(enUS.toasts).sort();
    expect(enUSToastKeys.length).toBeGreaterThan(50);

    for (const localeCode of referenceLocales) {
      const targetKeys = getDeepKeys(locales[localeCode].toasts).sort();
      const missingKeys = enUSToastKeys.filter(k => !targetKeys.includes(k));
      const extraKeys = targetKeys.filter(k => !enUSToastKeys.includes(k));

      expect(missingKeys, `Locale ${localeCode} is missing toast keys`).toEqual([]);
      expect(extraKeys, `Locale ${localeCode} has unexpected extra toast keys`).toEqual([]);
    }
  });

  it('has identical "logs" namespace keys across all 6 locales', () => {
    const enUSLogKeys = getDeepKeys(enUS.logs).sort();
    expect(enUSLogKeys.length).toBeGreaterThan(15);

    for (const localeCode of referenceLocales) {
      const targetKeys = getDeepKeys(locales[localeCode].logs).sort();
      const missingKeys = enUSLogKeys.filter(k => !targetKeys.includes(k));
      const extraKeys = targetKeys.filter(k => !enUSLogKeys.includes(k));

      expect(missingKeys, `Locale ${localeCode} is missing log keys`).toEqual([]);
      expect(extraKeys, `Locale ${localeCode} has unexpected extra log keys`).toEqual([]);
    }
  });

  it('has no empty strings or undefined values in "toasts" and "logs" for any locale', () => {
    const toastKeys = getDeepKeys(enUS.toasts);
    const logKeys = getDeepKeys(enUS.logs);

    for (const [localeCode, localeObj] of Object.entries(locales)) {
      for (const k of toastKeys) {
        const val = getValueByPath(localeObj.toasts, k);
        expect(typeof val, `Locale ${localeCode} toasts.${k} should be string`).toBe('string');
        expect(val.trim().length, `Locale ${localeCode} toasts.${k} should not be empty`).toBeGreaterThan(0);
      }

      for (const k of logKeys) {
        const val = getValueByPath(localeObj.logs, k);
        expect(typeof val, `Locale ${localeCode} logs.${k} should be string`).toBe('string');
        expect(val.trim().length, `Locale ${localeCode} logs.${k} should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it('correctly interpolates parameters in toast messages across languages', async () => {
    // English
    await i18n.changeLanguage('en-US');
    expect(i18n.t('toasts.idbHealth', { version: 12 }))
      .toBe('IndexedDB is healthy (Version 12, 14 stores active)');
    expect(i18n.t('toasts.discoveredModels', { count: 8, provider: 'OpenAI' }))
      .toBe('Discovered 8 online models from OpenAI');

    // Portuguese (pt-BR)
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('toasts.idbHealth', { version: 12 }))
      .toBe('IndexedDB está saudável (Versão 12, 14 tabelas ativas)');
    expect(i18n.t('toasts.discoveredModels', { count: 8, provider: 'OpenAI' }))
      .toBe('Encontrados 8 modelos online em OpenAI');

    // Italian (it-IT)
    await i18n.changeLanguage('it-IT');
    expect(i18n.t('toasts.idbHealth', { version: 12 }))
      .toBe('IndexedDB è integro (Versione 12, 14 archivi attivi)');
    expect(i18n.t('toasts.discoveredModels', { count: 8, provider: 'OpenAI' }))
      .toBe('Trovati 8 modelli online da OpenAI');

    // Spanish (es-419)
    await i18n.changeLanguage('es-419');
    expect(i18n.t('toasts.idbHealth', { version: 12 }))
      .toBe('IndexedDB está en buen estado (Versión 12, 14 almacenes activos)');
    expect(i18n.t('toasts.discoveredModels', { count: 8, provider: 'OpenAI' }))
      .toBe('Se descubrieron 8 modelos en línea de OpenAI');
  });

  it('correctly interpolates parameters in log messages across languages', async () => {
    // English
    await i18n.changeLanguage('en-US');
    expect(i18n.t('logs.messages.vaultUnlocked', { count: 4 }))
      .toBe('Vault unlocked successfully (4 credentials loaded).');
    expect(i18n.t('logs.levelsCount', { count: 3 }))
      .toBe('3 Levels');
    expect(i18n.t('logs.historyCount', { current: 15, max: 10000 }))
      .toBe('15 / 10000 lines');

    // Portuguese (pt-BR)
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('logs.messages.vaultUnlocked', { count: 4 }))
      .toBe('Cofre desbloqueado com sucesso (4 credenciais carregadas).');
    expect(i18n.t('logs.levelsCount', { count: 3 }))
      .toBe('3 Níveis');
    expect(i18n.t('logs.historyCount', { current: 15, max: 10000 }))
      .toBe('15 / 10000 linhas');

    // Italian (it-IT)
    await i18n.changeLanguage('it-IT');
    expect(i18n.t('logs.messages.vaultUnlocked', { count: 4 }))
      .toBe('Cassaforte sbloccata con successo (4 credenziali caricate).');
    expect(i18n.t('logs.levelsCount', { count: 3 }))
      .toBe('3 Livelli');
    expect(i18n.t('logs.historyCount', { current: 15, max: 10000 }))
      .toBe('15 / 10000 righe');

    // Spanish (es-419)
    await i18n.changeLanguage('es-419');
    expect(i18n.t('logs.messages.vaultUnlocked', { count: 4 }))
      .toBe('Bóveda desbloqueada con éxito (4 credenciales cargadas).');
    expect(i18n.t('logs.levelsCount', { count: 3 }))
      .toBe('3 Niveles');
    expect(i18n.t('logs.historyCount', { current: 15, max: 10000 }))
      .toBe('15 / 10000 líneas');
  });
});
