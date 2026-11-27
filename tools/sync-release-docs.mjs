#!/usr/bin/env node
/**
 * sync-release-docs.mjs
 *
 * semantic-release `prepare` plugin. The npm plugin bumps `package.json` on
 * `main`; this plugin rewrites the application version claimed by the
 * hand-written documents in the same release commit, so the next release does
 * not start out with the docs already stale.
 *
 * The claims are matched with the exact patterns `verify-docs.mjs` guards
 * (`VERSION_RULES`), never with a blanket search-and-replace: historical
 * mentions written between backticks and dependency versions such as
 * `(v1.29.0)` must survive untouched.
 *
 * Only the version is rewritten here. Test and i18n key counts depend on the
 * code, so they stay with the pull request that changes the code, where
 * `npm run verify:docs` can measure them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findViolations, listDocFiles, VERSION_RULES } from './verify-docs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Rewrites the version claims of a single line. */
function rewriteLine(line, version) {
  let changed = false;
  let next = line;

  for (const rule of VERSION_RULES) {
    next = next.replace(rule.re, (match, claimed) => {
      if (claimed === version) return match;
      changed = true;
      // The capture group is the only version in each match, so replacing its
      // text keeps the surrounding claim (badge, header, footer) intact.
      return match.replace(claimed, version);
    });
  }

  return { line: next, changed };
}

/**
 * Rewrites every version claim under `root`.
 * @returns {string[]} the documents that actually changed, relative to `root`.
 */
export function syncVersionInDocs({ root = ROOT, version }) {
  const changedFiles = [];

  for (const doc of listDocFiles(root)) {
    const abs = path.join(root, doc);
    if (!fs.existsSync(abs)) continue;

    const original = fs.readFileSync(abs, 'utf8');
    // Keep the file's own line endings; rewriting CRLF files as LF would turn
    // a one-character change into a whole-file diff.
    const eol = original.includes('\r\n') ? '\r\n' : '\n';

    let changed = false;
    const updated = original
      .split(/\r?\n/)
      .map((line) => {
        const result = rewriteLine(line, version);
        if (result.changed) changed = true;
        return result.line;
      })
      .join(eol);

    if (!changed) continue;

    const remaining = findViolations(updated, doc, { version }).filter(
      (violation) => violation.metric === 'version',
    );
    if (remaining.length > 0) {
      const detail = remaining
        .map((violation) => `${violation.file}:${violation.line} — ${violation.message}`)
        .join('; ');
      throw new Error(`versão ${version} não pôde ser aplicada por completo: ${detail}`);
    }

    fs.writeFileSync(abs, updated);
    changedFiles.push(doc);
  }

  return changedFiles;
}

/**
 * semantic-release calls this after `@semantic-release/npm` has written the new
 * version into package.json and before `@semantic-release/git` commits the
 * assets listed in `.releaserc.json`.
 */
export async function prepare(_pluginConfig, { cwd = ROOT, nextRelease, logger }) {
  const version = nextRelease?.version;
  if (!version) throw new Error('nextRelease.version ausente: nada a sincronizar');

  const changedFiles = syncVersionInDocs({ root: cwd, version });

  if (changedFiles.length === 0) {
    logger?.log(`Documentação já declarava a versão ${version}.`);
    return;
  }

  logger?.log(
    `Versão ${version} propagada para ${changedFiles.length} documento(s): ${changedFiles.join(', ')}`,
  );
}
