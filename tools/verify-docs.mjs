#!/usr/bin/env node
/**
 * verify-docs.mjs
 *
 * Guards the hand-written documentation against drifting from the code it
 * describes. Every version number, test count and i18n key count claimed by a
 * document is compared against the value measured from the repository itself.
 *
 * Usage: npm run verify:docs
 *
 * The test count comes from `.quality/test-suite.json`, written by `npm test`.
 * When that artifact is absent the count check is skipped with a warning so a
 * fresh clone can still verify versions, file counts and locale parity.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = 'src/locales';
/** Directories that never hold application sources. */
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'dev-dist', '.git', '.agent', '.quality', 'tmp', '.freebuff', '.trae', '.kiro']);
const SUITE_REPORT = '.quality/test-suite.json';

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

/** Documentation that states facts about the codebase. History files such as
 *  CHANGELOG.md are intentionally excluded: they describe past releases. */
const DOC_FILES = [
  'README.md',
  'index.html',
  'metadata.json',
  'specs/ARCHITECTURE.md',
  'specs/PRD.md',
  ...fs
    .readdirSync(path.join(ROOT, 'user_manual'))
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => `user_manual/${file}`),
];

/**
 * Claim patterns. Each match must agree with the measured value of its metric.
 * `valueIndex` points at the capture group holding the number.
 */
const RULES = [
  {
    metric: 'version',
    source: 'badge de versão',
    re: /version-(\d+\.\d+\.\d+)-blue/g,
  },
  {
    metric: 'version',
    source: 'cabeçalho do documento',
    re: /\*\*(?:Document Version|Versão do Documento|Application Version|Versão da Aplicação|Versión de la Aplicación|Versione dell['’]Applicazione)\s*:\*\*\s*(\d+\.\d+\.\d+)/g,
  },
  {
    metric: 'version',
    source: 'descrição de metadata',
    re: /Version (\d+\.\d+\.\d+) featuring/g,
  },
  {
    metric: 'version',
    source: 'rodapé do documento',
    re: /\((?:PRD|ARCHITECTURE|Architecture)\s+v(\d+\.\d+\.\d+)\)/g,
  },
  {
    metric: 'version',
    source: 'rodapé do documento',
    // Only a line-final "(v2.38.0).*" footer. Inline mentions such as the SDK
    // "(v1.29.0)" are not document versions, and historical ranges are written
    // between backticks as `v2.33.0`–`v2.35.0`.
    re: /(?<![\w`])\(v(\d+\.\d+\.\d+)\)\.\*?$/g,
  },
  {
    metric: 'testFiles',
    source: 'contagem de arquivos de teste',
    re: /(\d+)\s+(?:arquivos de teste|test files|archivos de prueba|file di test)/gi,
  },
  {
    metric: 'testCount',
    source: 'contagem de testes',
    // "99 test files" is a file count, not a case count.
    re: /(\d+)\s+(?:testes|tests|pruebas|test)\b(?!\s+(?:files|file|archivos|arquivos|fixtures))/gi,
  },
  {
    metric: 'testCount',
    source: 'contagem de testes',
    re: /(\d+)\s+(?:passing tests|unit and integration tests|automated tests)/gi,
  },
  {
    metric: 'testCount',
    source: 'badge de testes',
    re: /tests-(\d+)%20passed/g,
  },
  {
    metric: 'i18nKeys',
    source: 'contagem de chaves i18n',
    re: /([\d.,]+)\s+(?:chaves|keys|claves|chiavi)/gi,
  },
];

/** Leaf count of a locale dictionary. Arrays count as one key, matching how
 *  i18next exposes them (`t('key.0')` is unusual). */
export function countI18nKeys(node) {
  if (node === null || typeof node !== 'object') return 0;
  if (Array.isArray(node)) return 1;
  let total = 0;
  for (const value of Object.values(node)) {
    total += typeof value === 'object' && value !== null ? countI18nKeys(value) : 1;
  }
  return total;
}

/** Turns "1.624", "1,624" and "1624" into 1624. */
export function normalizeCount(raw) {
  return Number(String(raw).replace(/[.,]/g, ''));
}

/**
 * Compares one document against the measured metrics.
 * @returns {{file: string, line: number, message: string}[]}
 */
export function findViolations(text, file, metrics) {
  const violations = [];
  const lines = text.split(/\r?\n/);

  for (const rule of RULES) {
    const expected = metrics[rule.metric];
    if (expected === undefined) continue;

    lines.forEach((line, index) => {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(line)) !== null) {
        const raw = match[1];
        const actual =
          rule.metric === 'version' ? raw : normalizeCount(raw);
        if (String(actual) !== String(expected)) {
          violations.push({
            file,
            line: index + 1,
            message: `${rule.source} afirma ${raw}, esperado ${expected}`,
          });
        }
      }
    });
  }

  return violations;
}

function walk(dir) {
  const entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = dir ? path.posix.join(dir, entry.name) : entry.name;
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      files.push(...walk(rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

/** Counts exactly what `npm test` discovers, so the documented number matches
 *  the suite output rather than an approximation. */
function countTestFiles() {
  return walk('').filter((file) => TEST_FILE_PATTERN.test(file)).length;
}

function readSuiteReport() {
  const abs = path.join(ROOT, SUITE_REPORT);
  if (!fs.existsSync(abs)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    return undefined;
  }
}

export function measure() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

  const localeKeyCounts = {};
  for (const file of fs.readdirSync(path.join(ROOT, LOCALES_DIR)).sort()) {
    if (!file.endsWith('.json')) continue;
    localeKeyCounts[file] = countI18nKeys(
      JSON.parse(fs.readFileSync(path.join(ROOT, LOCALES_DIR, file), 'utf8')),
    );
  }

  const distinctKeyCounts = [...new Set(Object.values(localeKeyCounts))];
  const report = readSuiteReport();

  return {
    version: pkg.version,
    testFiles: countTestFiles(),
    testCount: report?.numTotalTests,
    i18nKeys: distinctKeyCounts.length === 1 ? distinctKeyCounts[0] : undefined,
    localeKeyCounts,
    localeParity: distinctKeyCounts.length === 1,
  };
}

function main() {
  const metrics = measure();
  const violations = [];

  if (!metrics.localeParity) {
    violations.push({
      file: LOCALES_DIR,
      line: 0,
      message: `locales com contagens de chaves divergentes: ${JSON.stringify(metrics.localeKeyCounts)}`,
    });
  }

  for (const doc of DOC_FILES) {
    const abs = path.join(ROOT, doc);
    if (!fs.existsSync(abs)) {
      violations.push({ file: doc, line: 0, message: 'arquivo de documentação ausente' });
      continue;
    }
    violations.push(...findViolations(fs.readFileSync(abs, 'utf8'), doc, metrics));
  }

  const summary = [
    `versão ${metrics.version}`,
    `${metrics.testFiles} arquivos de teste`,
    metrics.testCount === undefined
      ? 'contagem de testes não verificada'
      : `${metrics.testCount} testes`,
    metrics.i18nKeys === undefined ? 'chaves i18n divergentes' : `${metrics.i18nKeys} chaves i18n`,
  ].join(' · ');

  console.log(`Verificando documentação contra: ${summary}`);

  if (metrics.testCount === undefined) {
    console.log(
      `Aviso: ${SUITE_REPORT} ausente; rode "npm test" para gerar a contagem real antes de conferir os testes.`,
    );
  }

  if (violations.length === 0) {
    console.log('OK: toda a documentação está sincronizada com o código.');
    return;
  }

  console.error(`\n${violations.length} divergência(s) encontrada(s):\n`);
  for (const violation of violations) {
    const where = violation.line ? `${violation.file}:${violation.line}` : violation.file;
    console.error(`  ${where} — ${violation.message}`);
  }
  console.error('\nAtualize os documentos acima e rode novamente: npm run verify:docs');
  process.exitCode = 1;
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) main();
