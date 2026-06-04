#!/usr/bin/env node
'use strict';
/**
 * SessionStart Hook — Install integrity preflight (runs FIRST).
 *
 * Fires: SessionStart (startup|resume|clear|compact)
 * Purpose: Detect a PARTIAL .claude install — the common failure when the folder
 *          was copied with a non-git-aware tool that dropped hook `lib/*.cjs`
 *          files. Without this, the sibling hooks each throw a raw Node
 *          `Cannot find module` stack trace (node:internal/modules/cjs/loader),
 *          producing N confusing errors instead of one actionable message.
 *
 * Design constraints:
 *   - ZERO local dependencies (builtins only) — a verifier that requires ./lib
 *     would itself crash on the very failure it is meant to report.
 *   - Always non-blocking: exit 0 regardless. Emits at most ONE warning block.
 *
 * Exit Codes: 0 — always (non-blocking).
 */

const fs = require('fs');
const path = require('path');

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const hooksDir = path.join(projectDir, '.claude', 'hooks');
const settingsPath = path.join(projectDir, '.claude', 'settings.json');

const HOOK_REF = /\.claude[\\/]hooks[\\/]([\w.\-]+(?:[\\/][\w.\-]+)*\.(?:cjs|js))/g;
const REL_REQUIRE = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function readSafe(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** Hook entry files referenced by settings.json (relative to hooks dir). */
function referencedHooks(settingsRaw) {
  const refs = new Set();
  let m;
  while ((m = HOOK_REF.exec(settingsRaw)) !== null) {
    refs.add(m[1].replace(/\\/g, '/'));
  }
  return [...refs];
}

/** Direct relative require targets of a hook source (one level deep). */
function relativeRequires(src, fromDir) {
  const missing = [];
  let m;
  while ((m = REL_REQUIRE.exec(src)) !== null) {
    let target = m[1];
    if (!/\.(cjs|js|json)$/.test(target)) target += '.cjs';
    const resolved = path.resolve(fromDir, target);
    if (!fs.existsSync(resolved)) {
      missing.push(path.relative(hooksDir, resolved).replace(/\\/g, '/'));
    }
  }
  return missing;
}

function main() {
  const settingsRaw = readSafe(settingsPath);
  if (!settingsRaw) return; // Not an easy-claude project — nothing to verify.

  const missing = new Set();

  for (const rel of referencedHooks(settingsRaw)) {
    const entry = path.join(hooksDir, rel);
    if (!fs.existsSync(entry)) {
      missing.add(rel);
      continue; // Can't scan deps of a file that isn't there.
    }
    const src = readSafe(entry);
    if (src) for (const dep of relativeRequires(src, path.dirname(entry))) missing.add(dep);
  }

  if (missing.size === 0) return;

  const list = [...missing].sort();
  const shown = list.slice(0, 12);
  const extra = list.length - shown.length;

  process.stderr.write(
    `\n⚠ [easy-claude] Install incomplete — ${list.length} hook file(s) missing.\n` +
      `   This usually means .claude was copied with a non-git-aware tool that dropped files.\n` +
      `   Missing:\n` +
      shown.map((f) => `     - .claude/hooks/${f}`).join('\n') +
      (extra > 0 ? `\n     ...and ${extra} more` : '') +
      `\n   Repair: re-export from the source repo with\n` +
      `     node .claude/scripts/export-claude.mjs "${projectDir}" --force\n` +
      `   (Other SessionStart hooks may still log raw module errors until repaired.)\n\n`
  );
}

try {
  main();
} catch {
  // Verifier must never break a session.
}
