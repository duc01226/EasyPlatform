#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Doc⇄Code Sync Gate (Phase 4 of the spec-doc-redesign epic)
 *
 * Doc/code sync guidance. Two matchers, one file:
 *
 *   1. Bash `git commit`  → WARN (exit 0) when the staged set
 *      contains a BEHAVIORAL code change in an ENFORCED area but touches NO
 *      Feature Spec under that area's bucket — `{SPEC_ROOT}/{Area}/`, where the spec root defaults
 *      to `docs/specs` and a `specRoots.business.path` entry in docs/project-config.json overrides
 *      it (resolved by `doc-sync-classify.featureSpecDirForArea`). The model should route to
 *      /spec, /spec [mode=tests], or /docs-manager --mode=update, but the hook must not stop
 *      the user's flow.
 *
 *   2. Write/Edit/MultiEdit (and Codex `apply_patch`) on `src/**` → per-edit
 *      WARN (exit 0, never blocks) when the edited enforced-area code has
 *      drifted past its Feature Spec's last-sync stamp. Iteration is never
 *      interrupted; the commit gate is the reminder.
 *
 * Design constraints (Phase-4 plan):
 *   - Override-proof: fires independent of workflow/quick: state (it's a hook).
 *   - NEVER blocks editing the Feature Spec doc itself (FR-4, no deadlock).
 *   - Fast-exits docs/tooling/test/generated/migration + non-enforced areas.
 *   - Refactor/whitespace/rename noop never false-positive-denies (FR-3a).
 *   - Reuses the spec's last-sync stamp + git drift as the staleness signal (FR-5).
 *     Accepts `last_synced` OR `last_updated` — see LAST_SYNC_RE for why both.
 *   - Fail-open policy on any internal error, with a visible diagnostic (a
 *     broken advisory gate must not halt all commits).
 *
 * This hook intentionally exits 0 for doc/config staleness paths. It guides
 * the AI to repair docs automatically instead of asking the user to unblock it.
 *
 * @hook PreToolUse
 * @matcher Bash | Write | Edit | MultiEdit | apply_patch
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { runPreToolHookSync, isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');
const cls = require('./lib/doc-sync-classify.cjs');

const PROJECT_DIR = cls.PROJECT_DIR;
const COMMIT_RE = /(?:^|&&|\|\||;)\s*git\s+commit\b/m;

/** Run a read-only git command in the repo; advisory errors stay fail-open but visible. */
function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    reportHookInternalError('doc-sync-gate', `git ${args.join(' ')}`, error);
    return '';
  }
}

/** Resolve a numstat path token to its post-change (new) path, handling renames. */
function resolveNumstatPath(token) {
  if (!token.includes('=>')) return token.trim();
  // Brace form: pre{old => new}post
  const brace = token.match(/^(.*)\{(.*?) => (.*?)\}(.*)$/);
  if (brace) {
    return (brace[1] + brace[3] + brace[4]).replace(/\/\//g, '/').trim();
  }
  // Plain form: old => new
  const parts = token.split('=>');
  return parts[parts.length - 1].trim();
}

/**
 * Staged behavioral-change paths (whitespace-ignoring, rename-aware).
 * A path counts only when it has a real non-whitespace add/delete — pure
 * renames and whitespace/format-only edits resolve to 0/0 and are excluded.
 */
function stagedBehavioralPaths() {
  const out = git(['diff', '--cached', '-M', '--numstat', '--ignore-all-space']);
  const paths = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!m) continue;
    const added = m[1];
    const deleted = m[2];
    const changed = added === '-' || deleted === '-' || Number(added) > 0 || Number(deleted) > 0;
    if (changed) paths.push(cls.toRepoRel(resolveNumstatPath(m[3])));
  }
  return paths;
}

/** All staged paths (added/copied/modified/renamed) — used for doc-touched check. */
function stagedNames() {
  const out = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return out.split('\n').map(s => cls.toRepoRel(s)).filter(Boolean);
}

function appendAuditLog(cfg, message) {
  try {
    const rel = cfg.auditLogRelPath || 'tmp/claude-temp/doc-sync-override.log';
    const abs = path.join(PROJECT_DIR, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.appendFileSync(abs, message + '\n');
  } catch (error) {
    reportHookInternalError('doc-sync-gate', 'audit log write failed', error);
  }
}

/** ISO-ish timestamp without Date.now in a way that survives sandboxes. */
function stamp() {
  try {
    return new Date().toISOString();
  } catch (error) {
    reportHookInternalError('doc-sync-gate', `timestamp failed`, error);
    return 'unknown-time';
  }
}

// ---------------------------------------------------------------------------
// Commit-time WARN path
// ---------------------------------------------------------------------------
function handleCommit(cfg) {
  const behavioral = stagedBehavioralPaths();
  if (behavioral.length === 0) return undefined; // pure rename/format/noop or nothing staged

  // Bucket behavioral code hits by enforced area.
  const hitsByArea = new Map(); // areaName -> {area, files: []}
  for (const rel of behavioral) {
    const hit = cls.behavioralCodeHit(rel, cfg);
    if (!hit) continue;
    const key = hit.area.name;
    if (!hitsByArea.has(key)) hitsByArea.set(key, { area: hit.area, files: [] });
    hitsByArea.get(key).files.push(rel);
  }
  if (hitsByArea.size === 0) return undefined; // no enforced behavioral code → allow

  // Which areas had a Feature Spec touched in this same commit?
  const staged = stagedNames();
  const docTouchedAreas = new Set();
  for (const rel of staged) {
    const area = cls.areaForFeatureDoc(rel, cfg);
    if (area) docTouchedAreas.add(area.name);
  }

  const violations = [...hitsByArea.values()].filter(h => !docTouchedAreas.has(h.area.name));
  if (violations.length === 0) return undefined; // every enforced area's doc was touched → allow

  // Audited emergency escape.
  if (process.env.DOC_SYNC_OVERRIDE === '1') {
    appendAuditLog(
      cfg,
      `${stamp()} OVERRIDE git-commit doc-sync gate | areas=${violations
        .map(v => v.area.name)
        .join(',')} | files=${violations.flatMap(v => v.files).join(',')}`
    );
    return undefined;
  }

  const lines = ['[doc-sync] Behavioral code is staged without a Feature Spec update.', ''];
  for (const v of violations) {
    lines.push(`Area "${v.area.name}": ${v.files.length} behavioral file(s) changed, but no Feature Spec under`);
    lines.push(`  ${cls.featureSpecDirForArea(v.area)}  was staged.`);
    for (const f of v.files.slice(0, 8)) lines.push(`    • ${f}`);
    if (v.files.length > 8) lines.push(`    • …and ${v.files.length - 8} more`);
  }
  lines.push('');
  lines.push('Auto-route before or immediately after this commit when behavior changed:');
  lines.push('  1. Update the matching README.{Feature}.md — §3 Acceptance Criteria, §4 Business Rules,');
  lines.push('     and/or §8 Test Specifications — for the behavior you changed, then stage it.');
  lines.push('  2. Run /spec [mode=amend], /spec [mode=tests], or /docs-manager --mode=update for the touched module.');
  lines.push('  3. If the change is doc-neutral, mention that in the final review evidence.');
  return { stderr: `${lines.join('\n')}\n`, decision: 'advisory-warning' };
}

// ---------------------------------------------------------------------------
// Per-edit WARN path (never blocks)
// ---------------------------------------------------------------------------
function listMarkdownDeep(dir, depth, acc) {
  if (depth < 0) return acc;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code !== 'ENOENT') reportHookInternalError('doc-sync-gate', `cannot read ${dir}`, error);
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listMarkdownDeep(full, depth - 1, acc);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) acc.push(full);
  }
  return acc;
}

/**
 * Frontmatter keys carrying a spec's last-sync date, newest wins.
 *
 * BOTH keys are accepted deliberately. `last_synced` is what /spec [mode=sync]
 * was specified to stamp (FR-5), but the Feature Spec TEMPLATE this framework
 * ships — `detailed-feature-spec-template.md:8` under the template root (default docs/templates; a `docsRoots.templates.path` entry in docs/project-config.json overrides it)
 * and its `.claude/templates/` source — writes `last_updated`, and so does every real spec under
 * the business spec root (default docs/specs; `specRoots.business.path` in docs/project-config.json overrides it).
 * Matching only `last_synced` made areaLastSynced() return null for every doc
 * the framework itself produces, which silently disabled the per-edit warn at
 * its first branch. Accept both rather than force a repo-wide frontmatter
 * rename that would break every adopting project's existing specs.
 */
const LAST_SYNC_RE = /(?:last_synced|last_updated):\s*['"]?(\d{4}-\d{2}-\d{2})/g;

/** Max last-sync date across an area's feature docs, or null. */
function areaLastSynced(area) {
  const dir = path.join(PROJECT_DIR, cls.featureSpecDirForArea(area));
  const files = listMarkdownDeep(dir, 3, []);
  let max = null;
  for (const f of files) {
    try {
      const head = fs.readFileSync(f, 'utf-8').slice(0, 1500);
      LAST_SYNC_RE.lastIndex = 0;
      let m;
      while ((m = LAST_SYNC_RE.exec(head)) !== null) {
        if (!max || m[1] > max) max = m[1];
      }
    } catch (error) {
      if (error.code !== 'ENOENT') reportHookInternalError('doc-sync-gate', `cannot read ${f}`, error);
    }
  }
  return max;
}

/**
 * Repo-relative paths this edit touches.
 *
 * Claude's Write/Edit/MultiEdit carry the path directly. Codex's `apply_patch`
 * carries it inside the patch body, so that grammar is delegated to the ONE
 * parser that already owns it (lib/file-conventions.cjs extractTargets) rather
 * than transcribed a second time here — the grammar is INFERRED, and two
 * independent copies of a guess drift apart.
 */
function editTargets(input, toolInput) {
  if (input?.tool_name === 'apply_patch') {
    try {
      // Lazy: only Codex runs this path, and the module is only needed for it.
      const { extractTargets } = require('./lib/file-conventions.cjs');
      return extractTargets(input, PROJECT_DIR);
    } catch (error) {
      reportHookInternalError('doc-sync-gate', 'apply_patch target extraction', error);
      return [];
    }
  }
  const rel = cls.toRepoRel(toolInput.file_path || toolInput.path || '');
  return rel ? [rel] : [];
}

function handleEdit(cfg, input) {
  const toolInput = input?.tool_input || {};
  for (const rel of editTargets(input, toolInput)) {
    const warning = warnForPath(cfg, rel);
    if (warning) return warning;
  }
  return undefined;
}

function warnForPath(cfg, rel) {
  if (!rel) return undefined;

  // FR-4: never warn/block on the Feature Spec doc itself.
  if (cls.areaForFeatureDoc(rel, cfg)) return undefined;

  const hit = cls.behavioralCodeHit(rel, cfg);
  if (!hit) return undefined;

  // Drift signal: code changed since the area's docs were last synced.
  const lastSynced = areaLastSynced(hit.area);
  if (!lastSynced) return undefined; // no signal → stay silent

  const drift = git(['log', '-1', `--since=${lastSynced}`, '--format=%h', '--', ...hit.area.codePathPrefixes]);
  if (!drift.trim()) return undefined; // no commits since last sync → no drift

  return {
    stderr: `${[
      `[doc-sync] Heads-up: "${hit.area.name}" code has changed since its Feature Spec was last synced (${lastSynced}).`,
      `Before you commit, update the matching README.{Feature}.md (§3 AC / §4 BR / §8 TC) for any behavior change —`,
      `the commit-time check repeats this reminder with auto-route steps (it never blocks). Your edit proceeds.`
    ].join('\n')}\n`,
    decision: 'advisory-warning'
  }; // WARN only — never blocks the edit
}

// ---------------------------------------------------------------------------
function evaluate(input) {
  const toolName = input?.tool_name || '';
  const toolInput = input?.tool_input || {};
  const cfg = cls.loadConfig();
  if (!cfg.enabled) return undefined;

  if (toolName === 'Bash') {
    const command = typeof toolInput.command === 'string' ? toolInput.command : '';
    if (!COMMIT_RE.test(command)) return undefined;
    return handleCommit(cfg);
  }

  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit' || toolName === 'apply_patch') {
    return handleEdit(cfg, input);
  }

  return undefined;
}

// Entry-point check covers the Codex `node -e … require(hook)` launcher too (require.main is undefined there).
if (isHookEntryPoint(module)) {
  runPreToolHookSync('doc-sync-gate', evaluate, {
    inputErrorCode: 0,
    errorExitCode: 0
  });
}

module.exports = { evaluate, handleCommit, handleEdit };
