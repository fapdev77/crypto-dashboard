import { describe, expect, it } from 'vitest';

import { countI18nKeys, findViolations, normalizeCount } from '../verify-docs.mjs';

const CURRENT = {
  version: '2.38.0',
  testFiles: 104,
  testCount: 864,
  i18nKeys: 1656,
};

describe('normalizeCount', () => {
  it('normaliza separadores de milhar nos três formatos usados na documentação', () => {
    expect(normalizeCount('1.624')).toBe(1624);
    expect(normalizeCount('1,624')).toBe(1624);
    expect(normalizeCount('1624')).toBe(1624);
  });
});

describe('countI18nKeys', () => {
  it('conta folhas aninhadas e trata listas como uma única chave', () => {
    const dictionary = {
      nav: { dashboard: 'Dashboard', settings: 'Settings' },
      list: ['a', 'b', 'c'],
      title: 'CPM',
    };

    expect(countI18nKeys(dictionary)).toBe(4);
  });

  it('retorna zero para dicionário vazio', () => {
    expect(countI18nKeys({})).toBe(0);
  });
});

describe('findViolations', () => {
  it('aceita documentos sincronizados', () => {
    const text = [
      '> **Application Version:** 2.38.0',
      'Suíte com 104 arquivos de teste e 864 testes.',
      'Paridade em 1.656 chaves.',
    ].join('\n');

    expect(findViolations(text, 'doc.md', CURRENT)).toEqual([]);
  });

  it('sinaliza versão defasada com o número da linha', () => {
    const text = ['# Título', '', '> **Application Version:** 2.35.0'].join('\n');
    const violations = findViolations(text, 'doc.md', CURRENT);

    expect(violations).toHaveLength(1);
    expect(violations[0].line).toBe(3);
    expect(violations[0].message).toContain('2.35.0');
  });

  it('sinaliza contagens de teste e de chaves defasadas', () => {
    const violations = findViolations(
      '99 arquivos de teste, 835 testes passando, 1.624 chaves por idioma.',
      'doc.md',
      CURRENT,
    );

    expect(violations).toHaveLength(3);
  });

  it('não confunde "99 test files" com uma contagem de casos de teste', () => {
    const violations = findViolations(
      'Test Coverage: 104 test files, 864 passing tests.',
      'doc.md',
      CURRENT,
    );

    expect(violations).toEqual([]);
  });

  it('não trata a versão de uma dependência citada no texto como versão do documento', () => {
    const text =
      '- **AI Subsystem:** `@google/genai` (v1.29.0) para integração direta com Gemini Cloud.';

    expect(findViolations(text, 'doc.md', CURRENT)).toEqual([]);
  });

  it('ignora faixas históricas de versão escritas entre crases', () => {
    const text = '### Motor de Temas (`v2.33.0`–`v2.35.0`)';

    expect(findViolations(text, 'doc.md', CURRENT)).toEqual([]);
  });
});
