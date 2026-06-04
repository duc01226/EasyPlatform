#!/usr/bin/env node
'use strict';
/**
 * Doc⇄Code Sync Gate (Phase 4 of the spec-doc-redesign epic)
 *
 * Doc/code sync guidance. Two matchers, one file:
 *
 *   1. Bash `git commit`  → WARN (process.exit(0)) when the staged set
 *      contains a BEHAVIORAL code change in an ENFORCED area but touches NO
 *      Feature Spec under that area's fixed docs/specs/{Area}/ bucket. The model should route to
 *      /spec, /spec [mode=tests], or /docs-update, but the hook must not stop
 *      the user's flow.
 *
 *   2. Write/Edit/MultiEdit on `src/**` → per-edit WARN (exit 0, never blocks)
 *      when the edited enforced-area code has drifted past its Feature Spec's
 *      `last_synced`. Iteration is never interrupted; the commit gate is the
 *      reminder.
 *
 * Design constraints (Phase-4 plan):
 *   - Override-proof: fires independent of workflow/quick: state (it's a hook).
 *   - NEVER blocks editing the Feature Spec doc itself (FR-4, no deadlock).
 *   - Fast-exits docs/tooling/test/generated/migration + non-enforced areas.
 *   - Refactor/whitespace/rename noop never false-positive-denies (FR-3a).
 *   - Reuses spec [mode=sync] `last_synced` + git drift as the staleness signal (FR-5).
 *   - Fail-OPEN on any internal error (a broken gate must not halt all commits).
 *   - Composes after git-commit-block.cjs: that hook denies unauthorised
 *     commits first; this gate only runs once a commit is authorised.
 *
 * This hook intentionally exits 0 for doc/config staleness paths. It guides
 * the AI to repair docs automatically instead of asking the user to unblock it.
 *
 * @hook PreToolUse
 * @matcher Bash | Write | Edit | MultiEdit
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseHookEvent } = require('./lib/stdin-parser.cjs');
const cls = require('./lib/doc-sync-classify.cjs');

const PROJECT_DIR = cls.PROJECT_DIR;
const COMMIT_RE = /(?:^|&&|\|\||;)\s*git\s+commit\b/m;

/** Run a read-only git command in the repo; return stdout or '' on any error. */
function git(args) {
  try {
    return execFileSync('git', args, {
      cwd: PROJECT_DIR,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch {
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
  } catch {
    /* audit is best-effort; never block on log failure */
  }
}

/** ISO-ish timestamp without Date.now in a way that survives sandboxes. */
function stamp() {
  try {
    return new Date().toISOString();
  } catch {
    return 'unknown-time';
  }
}

// ---------------------------------------------------------------------------
// Commit-time WARN path
// ---------------------------------------------------------------------------
function handleCommit(cfg) {
  const behavioral = stagedBehavioralPaths();
  if (behavioral.length === 0) process.exit(0); // pure rename/format/noop or nothing staged

  // Bucket behavioral code hits by enforced area.
  const hitsByArea = new Map(); // areaName -> {area, files: []}
  for (const rel of behavioral) {
    const hit = cls.behavioralCodeHit(rel, cfg);
    if (!hit) continue;
    const key = hit.area.name;
    if (!hitsByArea.has(key)) hitsByArea.set(key, { area: hit.area, files: [] });
    hitsByArea.get(key).files.push(rel);
  }
  if (hitsByArea.size === 0) process.exit(0); // no enforced behavioral code → allow

  // Which areas had a Feature Spec touched in this same commit?
  const staged = stagedNames();
  const docTouchedAreas = new Set();
  for (const rel of staged) {
    const area = cls.areaForFeatureDoc(rel, cfg);
    if (area) docTouchedAreas.add(area.name);
  }

  const violations = [...hitsByArea.values()].filter(h => !docTouchedAreas.has(h.area.name));
  if (violations.length === 0) process.exit(0); // every enforced area's doc was touched → allow

  // Audited emergency escape.
  if (process.env.DOC_SYNC_OVERRIDE === '1') {
    appendAuditLog(
      cfg,
      `${stamp()} OVERRIDE git-commit doc-sync gate | areas=${violations
        .map(v => v.area.name)
        .join(',')} | files=${violations.flatMap(v => v.files).join(',')}`
    );
    process.exit(0);
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
  lines.push('  2. Run /spec [mode=amend], /spec [mode=tests], or /docs-update for the touched module.');
  lines.push('  3. If the change is doc-neutral, mention that in the final review evidence.');
  console.log(lines.join('\n'));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Per-edit WARN path (never blocks)
// ---------------------------------------------------------------------------
function listMarkdownDeep(dir, depth, acc) {
  if (depth < 0) return acc;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) listMarkdownDeep(full, depth - 1, acc);
    else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) acc.push(full);
  }
  return acc;
}

/** Max `last_synced` date across an area's feature docs, or null. */
function areaLastSynced(area) {
  const dir = path.join(PROJECT_DIR, cls.featureSpecDirForArea(area));
  const files = listMarkdownDeep(dir, 3, []);
  let max = null;
  for (const f of files) {
    try {
      const head = fs.readFileSync(f, 'utf-8').slice(0, 1500);
      const m = head.match(/last_synced:\s*['"]?(\d{4}-\d{2}-\d{2})/);
      if (m && (!max || m[1] > max)) max = m[1];
    } catch {
      /* skip unreadable */
    }
  }
  return max;
}

function handleEdit(cfg, toolInput) {
  const rel = cls.toRepoRel(toolInput.file_path || toolInput.path || '');
  if (!rel) process.exit(0);

  // FR-4: never warn/block on the Feature Spec doc itself.
  if (cls.areaForFeatureDoc(rel, cfg)) process.exit(0);

  const hit = cls.behavioralCodeHit(rel, cfg);
  if (!hit) process.exit(0);

  // Drift signal: code changed since the area's docs were last synced.
  const lastSynced = areaLastSynced(hit.area);
  if (!lastSynced) process.exit(0); // no signal → stay silent

  const drift = git(['log', '-1', `--since=${lastSynced}`, '--format=%h', '--', ...hit.area.codePathPrefixes]);
  if (!drift.trim()) process.exit(0); // no commits since last sync → no drift

  console.log(
    [
      `[doc-sync] Heads-up: "${hit.area.name}" code has changed since its Feature Spec was last synced (${lastSynced}).`,
      `Before you commit, update the matching README.{Feature}.md (§3 AC / §4 BR / §8 TC) for any behavior change —`,
      `the commit-time check repeats this reminder with auto-route steps (it never blocks). Your edit proceeds.`
    ].join('\n')
  );
  process.exit(0); // WARN only — never blocks the edit
}

// ---------------------------------------------------------------------------
function main() {
  try {
    const { toolName, toolInput } = parseHookEvent({ context: 'doc-sync-gate' });
    const cfg = cls.loadConfig();
    if (!cfg.enabled) process.exit(0);

    if (toolName === 'Bash') {
      const command = toolInput?.command || '';
      if (!COMMIT_RE.test(command)) process.exit(0);
      handleCommit(cfg);
      return; // handleCommit always exits
    }

    if (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') {
      handleEdit(cfg, toolInput || {});
      return;
    }

    process.exit(0);
  } catch (error) {
    // Fail-open: a broken gate must never halt the developer.
    console.error(`doc-sync-gate error (fail-open): ${error.message}`);
    process.exit(0);
  }
}

main();
