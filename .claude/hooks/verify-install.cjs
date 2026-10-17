#!/usr/bin/env node
'use strict';

try { if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return; } catch { /* Bootstrap diagnoses missing payload below. */ }

/**
 * SessionStart Hook — Install integrity preflight (runs FIRST).
 *
 * Fires: SessionStart (startup|resume|clear|compact)
 * Purpose: Detect a PARTIAL .claude install — the common failure when the folder
 *          was copied with a non-git-aware tool that dropped hook `lib/*.cjs`
 *          files. Without this, the sibling hooks each throw a raw Node
 *          `Cannot find module` stack trace (node:internal/modules/cjs/loader),
 *          producing N confusing errors instead of one actionable message.
 *          Also names a hook set that settings.json registers only in part — the
 *          usual result of keeping a settings file across an upgrade that added a
 *          hook — because the session then loses part of a feature with no error.
 *
 * Design constraints:
 *   - ZERO required local dependencies — shared root discovery is optional;
 *     builtin fallback must survive the missing modules being diagnosed.
 *   - Always non-blocking: exit 0 regardless. Emits at most ONE warning block.
 *
 * Exit Codes: 0 — always (non-blocking).
 */

const fs = require('fs');
const path = require('path');
let projectDir;
let hooksDir;
let bootstrapWarning = '';

// This read-only fallback must not import the payload it is checking. Keep the
// same explicit-root / cwd-ancestor / script-ancestor order as the shared owner.
function bootstrapRoot() {
  const explicit = process.env.CLAUDE_PROJECT_DIR?.trim();
  if (explicit) return path.isAbsolute(explicit) ? path.resolve(explicit) : process.cwd();
  for (const start of [process.cwd(), __dirname]) {
    let current = path.resolve(start);
    while (true) {
      try {
        if (fs.statSync(path.join(current, '.claude')).isDirectory()) return current;
      } catch {}
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return process.cwd();
}

const HOOK_REF = /\.claude[\\/]hooks[\\/]([\w.\-]+(?:[\\/][\w.\-]+)*\.(?:cjs|js))/g;
const REL_REQUIRE = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;

// Hook entries that deliver one feature between them, each registered on its own. Names only: this
// file must not import the payload it checks. Registering none of a set is a choice the scan leaves
// alone; registering part of one is the state it names.
const HOOK_SETS = Object.freeze([
  Object.freeze([
    Object.freeze({ file: 'workflow-route-inject.cjs', carries: 'the workflow route gate' }),
    Object.freeze({ file: 'workflow-catalog-inject.cjs', carries: 'the workflow catalog' })
  ])
]);

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

/** One line per hook set that settings.json registers only in part. */
function partialHookSets(referenced) {
  const lines = [];
  for (const set of HOOK_SETS) {
    const present = set.filter((hook) => referenced.includes(hook.file));
    const absent = set.filter((hook) => !referenced.includes(hook.file));
    if (present.length === 0 || absent.length === 0) continue;
    const names = (hooks) => hooks.map((hook) => hook.file).join(', ');
    const carried = (hooks) => hooks.map((hook) => hook.carries).join(' and ');
    lines.push(`${names(present)} is registered without ${names(absent)}: prompts get ${carried(present)} but not ${carried(absent)}.`);
  }
  return lines;
}

/** The indented lines that report partly registered hook sets; '' when there are none. */
function registrationNote(partial) {
  if (partial.length === 0) return '';
  return (
    partial.map((line) => `     - ${line}`).join('\n') +
    `\n   This usually means .claude/settings.json was kept across a framework upgrade that added a hook.\n` +
    `   Repair: add the missing hook entry from the framework's .claude/settings.json, under the same event.\n`
  );
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

// SessionStart supplies a JSON envelope. Keep this parser built-in-only so a
// partial copy can still diagnose itself. Unknown, empty, or malformed input
// fails closed for startup installation: only an explicit startup event may
// launch the guarded package-manager path.
function sessionSource() {
  let raw;
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    return null;
  }
  if (!raw.trim() || raw.length > 1024 * 1024) return null;
  try {
    const payload = JSON.parse(raw);
    return payload && typeof payload.source === 'string' ? payload.source : null;
  } catch {
    return null;
  }
}

function loadConfigStatus() {
  try {
    return {
      available: true,
      status: require('./lib/project-config-loader.cjs').getProjectConfigStatus()
    };
  } catch {
    return { available: false, status: null };
  }
}

// The verifier owns the integrity boundary. This helper is loaded only after
// that scan has cleared, and every failure remains advisory. The capability
// probe is read-only for all SessionStart sources; only the helper itself may
// start a detached repair worker for an explicit `startup` source.
function runWindowsGitCapability(source, configState) {
  let windowsGit;
  try {
    windowsGit = require('./lib/windows-git.cjs');
  } catch {
    return { capability: null };
  }

  let result;
  try {
    result = windowsGit.ensureWindowsGit({
      source,
      configStatus: configState.available ? configState.status : { state: 'invalid' }
    });
  } catch {
    return { capability: null };
  }

  if (result && result.outcome === windowsGit.OUTCOMES.READY && result.capability) {
    const envFile = process.env.CLAUDE_ENV_FILE;
    if (envFile) {
      try {
        windowsGit.defaultPublishEnvironment({ envFile, capability: result.capability });
      } catch {
        // Environment publication is advisory; child hooks still receive the
        // capability through their host-specific launchers.
      }
    }
  }

  if (configState.available) {
    const diagnostic = windowsGit.formatDiagnostic(result);
    if (diagnostic) process.stderr.write(`${diagnostic}\n`);
  }
  return { capability: result && result.capability ? result.capability : null };
}

async function runGuardedStartupInstall(source, configState, gitCapability) {
  if (source !== 'startup') return;

  let startupInstall;
  try {
    startupInstall = require('./lib/startup-install.cjs');
  } catch {
    return; // A partial bundle was already diagnosed; never emit a raw stack.
  }

  if (!configState.available) {
    // A missing transitive policy helper must not silently become the enabled
    // portable default. Integrity remains non-blocking, but installation fails
    // closed because the adopter's explicit disablement cannot be established.
    const diagnostic = startupInstall.formatDiagnostic({
      outcome: startupInstall.OUTCOMES.SKIP_CONFIG_UNAVAILABLE
    });
    if (diagnostic) process.stderr.write(`${diagnostic}\n`);
    return;
  }

  try {
    // Build and execute only after the integrity scan and explicit startup
    // source gate. The runner owns the private per-project lock and all
    // process-tree cleanup proof; this hook remains the non-blocking boundary.
    const result = await startupInstall.runStartupInstall({
      projectRoot: projectDir,
      source,
      configStatus: configState.status,
      gitCapability
    });
    const diagnostic = startupInstall.formatDiagnostic(result);
    if (diagnostic) process.stderr.write(`${diagnostic}\n`);
  } catch {
    // Startup installation is advisory; a verifier failure must never block a
    // session or leak a manager/module stack trace.
  }
}

async function main() {
  try {
    // Keep root discovery dependency-free. This hook is the integrity owner, so
    // loading project-root (or any transitive helper) before the scan would make
    // the partial-copy diagnostic depend on the very files it is checking.
    projectDir = bootstrapRoot();
  } catch {
    projectDir = path.resolve(process.cwd());
    bootstrapWarning = '   Built-in root discovery unavailable — restore the .claude bundle.\n';
  }
  hooksDir = path.join(projectDir, '.claude', 'hooks');
  const settingsRaw = readSafe(path.join(projectDir, '.claude', 'settings.json'));
  if (!settingsRaw) return; // Not an easy-claude project — nothing to verify.

  const missing = new Set();
  const referenced = referencedHooks(settingsRaw);
  const partial = partialHookSets(referenced);

  for (const rel of referenced) {
    const entry = path.join(hooksDir, rel);
    if (!fs.existsSync(entry)) {
      missing.add(rel);
      continue; // Can't scan deps of a file that isn't there.
    }
    const src = readSafe(entry);
    if (src) for (const dep of relativeRequires(src, path.dirname(entry))) missing.add(dep);
  }

  if (missing.size === 0 && !bootstrapWarning) {
    // Every registered file is present, so the bundle is usable: a partly registered hook set is
    // reported and the startup work below still runs.
    if (partial.length) {
      process.stderr.write(`\n⚠ [easy-claude] Hook registration incomplete in .claude/settings.json.\n${registrationNote(partial)}\n`);
    }
    const source = sessionSource();
    const configState = loadConfigStatus();
    const git = runWindowsGitCapability(source, configState);
    await runGuardedStartupInstall(source, configState, git.capability);
    return;
  }

  const list = [...missing].sort();
  const shown = list.slice(0, 12);
  const extra = list.length - shown.length;

  process.stderr.write(
    `\n⚠ [easy-claude] Install incomplete${list.length ? ` — ${list.length} hook file(s) missing` : ''}.\n` +
      bootstrapWarning +
      `   This usually means .claude was copied with a non-git-aware tool that dropped files.\n` +
      (list.length ? `   Missing:\n` : '') +
      shown.map((f) => `     - .claude/hooks/${f}`).join('\n') +
      (extra > 0 ? `\n     ...and ${extra} more` : '') +
      `\n   Repair: from the consuming project root, re-export from the source repo with\n` +
      `     node .claude/scripts/export-claude.mjs "<project-root>" --force\n` +
      `   (Other SessionStart hooks may still log raw module errors until repaired.)\n` +
      (partial.length ? `   Hook registration is also incomplete:\n${registrationNote(partial)}` : '') +
      `\n`
  );
}

try {
  Promise.resolve(main()).catch(() => {});
} catch {
  // Verifier must never break a session.
}
