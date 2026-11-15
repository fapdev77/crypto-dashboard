import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { prepare, syncVersionInDocs } from '../sync-release-docs.mjs';

/** One fixture document containing every version claim shape the guard checks,
 *  plus the two shapes it must never touch: a historical range between
 *  backticks and a dependency version in parentheses. */
const FIXTURE = [
  '# Fixture',
  '',
  '> **Application Version:** 2.41.0',
  '> **Versão da Aplicação:** 2.41.0',
  '',
  '![Version](https://img.shields.io/badge/version-2.41.0-blue)',
  '',
  '{"description": "Version 2.41.0 featuring the dashboard"}',
  '',
  '### Motor de Temas (`v2.33.0`–`v2.35.0`)',
  '- **AI Subsystem:** `@google/genai` (v1.29.0) para integração direta.',
  '',
  'Histórico do PRD.',
  '',
  '(PRD v2.41.0)',
  '',
  '*Crypto Portfolio Manager — Architecture (v2.41.0).*',
  '',
].join('\n');

let root: string;

function writeDoc(relativePath: string, content: string) {
  const abs = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function readDoc(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-sync-docs-'));
  fs.mkdirSync(path.join(root, 'user_manual'));
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('syncVersionInDocs', () => {
  it('reescreve todas as formas de declaração de versão que o guard verifica', () => {
    writeDoc('README.md', FIXTURE);

    expect(syncVersionInDocs({ root, version: '2.42.0' })).toEqual(['README.md']);

    const updated = readDoc('README.md');
    expect(updated).toContain('**Application Version:** 2.42.0');
    expect(updated).toContain('**Versão da Aplicação:** 2.42.0');
    expect(updated).toContain('badge/version-2.42.0-blue');
    expect(updated).toContain('"Version 2.42.0 featuring');
    expect(updated).toContain('(PRD v2.42.0)');
    expect(updated).toContain('Architecture (v2.42.0).*');
    expect(updated).not.toContain('2.41.0');
  });

  it('preserva faixas históricas e versões de dependências', () => {
    writeDoc('README.md', FIXTURE);

    syncVersionInDocs({ root, version: '2.42.0' });

    const updated = readDoc('README.md');
    expect(updated).toContain('(`v2.33.0`–`v2.35.0`)');
    expect(updated).toContain('`@google/genai` (v1.29.0) para integração direta.');
  });

  it('não reescreve documento que já declara a versão pedida', () => {
    writeDoc('README.md', '> **Application Version:** 2.42.0');
    const before = readDoc('README.md');

    expect(syncVersionInDocs({ root, version: '2.42.0' })).toEqual([]);
    expect(readDoc('README.md')).toBe(before);
  });

  it('é idempotente: a segunda execução não altera nada', () => {
    writeDoc('README.md', FIXTURE);
    writeDoc('user_manual/cpm_user_manual_pt-pt.md', '**Versão do Documento:** 2.41.0');

    const first = syncVersionInDocs({ root, version: '2.42.0' });
    const second = syncVersionInDocs({ root, version: '2.42.0' });

    expect(first).toEqual(['README.md', 'user_manual/cpm_user_manual_pt-pt.md']);
    expect(second).toEqual([]);
  });

  it('mantém as quebras de linha CRLF do documento', () => {
    writeDoc('README.md', '> **Application Version:** 2.41.0\r\nTexto final.\r\n');

    syncVersionInDocs({ root, version: '2.42.0' });

    const updated = readDoc('README.md');
    expect(updated).toBe('> **Application Version:** 2.42.0\r\nTexto final.\r\n');
  });

  it('ignora documentos ausentes em vez de falhar', () => {
    writeDoc('README.md', '> **Application Version:** 2.41.0');

    expect(syncVersionInDocs({ root, version: '2.42.0' })).toEqual(['README.md']);
  });
});

describe('prepare', () => {
  it('propaga a versão do próximo release e registra o que mudou', async () => {
    writeDoc('README.md', '> **Application Version:** 2.41.0');
    const log = vi.fn();

    await prepare({}, { cwd: root, nextRelease: { version: '2.42.0' }, logger: { log } });

    expect(readDoc('README.md')).toContain('2.42.0');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('2.42.0'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('README.md'));
  });

  it('avisa quando a documentação já estava sincronizada', async () => {
    writeDoc('README.md', '> **Application Version:** 2.42.0');
    const log = vi.fn();

    await prepare({}, { cwd: root, nextRelease: { version: '2.42.0' }, logger: { log } });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('já declarava'));
  });

  it('recusa rodar sem a versão do próximo release', async () => {
    await expect(prepare({}, { cwd: root, nextRelease: {} })).rejects.toThrow(
      /nextRelease\.version/,
    );
  });
});
