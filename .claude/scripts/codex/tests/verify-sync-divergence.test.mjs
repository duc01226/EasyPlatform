import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isFrameworkRepo } from './framework-repo.helper.mjs';

const execFileAsync = promisify(execFile);

// Importing the gate transitively imports migrate-claude-to-codex.mjs + sync-context-workflows.mjs.
// All three guard their main()/script-entry behind an invoked-as-script check, so this import must
// NOT trigger a real (destructive) sync. If that guard regresses, these tests would wipe
// .agents/skills — the assertions below stay purely on diffTrees/readTreeFiles over tmp dirs (the
// one live end-to-end case spawns the gate as a SUBPROCESS, which only writes to a tmp dir).
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const gatePath = path.resolve(thisDir, '..', 'verify-sync-divergence.mjs');
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const { diffTrees, readTreeFiles } = await import(pathToFileURL(gatePath).href);

// TC-SKILLFIX-020 — identical trees → no divergence (the in-sync PASS case).
test('TC-SKILLFIX-020: identical maps produce no diffs', () => {
    const a = new Map([['skill/SKILL.md', 'x\n'], ['skill/extra.md', 'y\n']]);
    const b = new Map([['skill/SKILL.md', 'x\n'], ['skill/extra.md', 'y\n']]);
    assert.deepEqual(diffTrees(a, b), []);
});

// TC-SKILLFIX-021 — content drift (stale mirror body) is flagged as 'content'.
test('TC-SKILLFIX-021: differing content is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'fresh\n']]);
    const actual = new Map([['a/SKILL.md', 'stale\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'a/SKILL.md', kind: 'content' }]);
});

// TC-SKILLFIX-022 — source produced a file the mirror lacks (new skill, forgot to sync).
test('TC-SKILLFIX-022: file missing from mirror is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'x\n'], ['b/SKILL.md', 'y\n']]);
    const actual = new Map([['a/SKILL.md', 'x\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'b/SKILL.md', kind: 'missing-in-mirror' }]);
});

// TC-SKILLFIX-023 — mirror has an orphan/hand-added file with no source counterpart.
test('TC-SKILLFIX-023: extra mirror file is flagged', () => {
    const expected = new Map([['a/SKILL.md', 'x\n']]);
    const actual = new Map([['a/SKILL.md', 'x\n'], ['a/hand-edit.md', 'z\n']]);
    assert.deepEqual(diffTrees(expected, actual), [{ relPath: 'a/hand-edit.md', kind: 'extra-in-mirror' }]);
});

// A local install inside the committed mirror (git-ignored by .agents/.gitignore) is not
// divergence, but a stray non-install file still is.
test('readTreeFiles skip predicate drops local install artifacts but keeps stray files reportable', async () => {
    const expectedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-exp-'));
    const actualDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-act-'));
    const skip = rel => /(^|[\\/])(node_modules)([\\/]|$)|(^|[\\/])package-lock\.json$/.test(rel);
    try {
        await fs.mkdir(path.join(expectedDir, 'a'), { recursive: true });
        await fs.mkdir(path.join(actualDir, 'a', 'node_modules', 'dep'), { recursive: true });
        await fs.writeFile(path.join(expectedDir, 'a', 'SKILL.md'), 'x\n');
        await fs.writeFile(path.join(actualDir, 'a', 'SKILL.md'), 'x\n');
        await fs.writeFile(path.join(actualDir, 'a', 'package-lock.json'), '{}\n');
        await fs.writeFile(path.join(actualDir, 'a', 'node_modules', 'dep', 'index.js'), 'module.exports = 1;\n');
        await fs.writeFile(path.join(actualDir, 'a', 'stray.md'), 'hand-added\n');

        const diffs = diffTrees(await readTreeFiles(expectedDir), await readTreeFiles(actualDir, { skip }));
        assert.deepEqual(diffs, [{ relPath: 'a/stray.md', kind: 'extra-in-mirror' }]);
    } finally {
        await fs.rm(expectedDir, { recursive: true, force: true });
        await fs.rm(actualDir, { recursive: true, force: true });
    }
});

// TC-SKILLFIX-024 — readTreeFiles excludes the sentinel and CRLF-normalizes, so a
// line-ending-only or sentinel-only difference does NOT register as divergence.
test('TC-SKILLFIX-024: readTreeFiles excludes sentinel and normalizes CRLF', async () => {
    const expectedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-exp-'));
    const actualDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-act-'));
    try {
        await fs.mkdir(path.join(expectedDir, 'a'), { recursive: true });
        await fs.mkdir(path.join(actualDir, 'a'), { recursive: true });
        await fs.writeFile(path.join(expectedDir, 'a', 'SKILL.md'), 'line1\nline2\n');
        await fs.writeFile(path.join(actualDir, 'a', 'SKILL.md'), 'line1\r\nline2\r\n');
        // Sentinel exists only in the committed mirror; it must be excluded from comparison.
        await fs.writeFile(path.join(actualDir, '.codex-mirror.json'), '{"managedBy":"codex-sync"}\n');

        const expected = await readTreeFiles(expectedDir);
        const actual = await readTreeFiles(actualDir);

        assert.ok(!actual.has('.codex-mirror.json'), 'sentinel must be excluded from the tree map');
        assert.deepEqual(diffTrees(expected, actual), [], 'CRLF-only difference must not be divergence');
    } finally {
        await fs.rm(expectedDir, { recursive: true, force: true });
        await fs.rm(actualDir, { recursive: true, force: true });
    }
});

// Determinism guard: diffTrees output ordering is stable (sorted by relPath then kind),
// so CI failure lists don't churn between runs.
test('TC-SKILLFIX-024b: diff ordering is stable and sorted', () => {
    const expected = new Map([['z/SKILL.md', '1\n'], ['a/SKILL.md', '1\n'], ['m/SKILL.md', 'fresh\n']]);
    const actual = new Map([['m/SKILL.md', 'stale\n'], ['a/SKILL.md', '1\n']]);
    const diffs = diffTrees(expected, actual);
    assert.deepEqual(diffs.map(d => d.relPath), ['m/SKILL.md', 'z/SKILL.md']);
    assert.deepEqual(diffs.map(d => d.kind), ['content', 'missing-in-mirror']);
});

// TC-SKILLFIX-025 — OS metadata a desktop file browser writes on its own (macOS .DS_Store, Windows
// Thumbs.db / desktop.ini) is never mirror content, and it reappears seconds after deletion while
// the folder is open. Neither tree may count it: not as an orphan in the committed mirror, not as a
// file the source "produced". A real stray file beside it must still fail the gate.
test('TC-SKILLFIX-025: OS metadata files in either tree are not divergence; a real extra mirror file still is', async () => {
    const expectedDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-exp-'));
    const actualDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-div-act-'));
    const describe = diffs => diffs.map(diff => `${diff.kind} ${diff.relPath}`).sort();
    try {
        await fs.mkdir(path.join(expectedDir, 'a'), { recursive: true });
        await fs.mkdir(path.join(actualDir, 'a'), { recursive: true });
        await fs.writeFile(path.join(expectedDir, 'a', 'SKILL.md'), 'x\n');
        await fs.writeFile(path.join(actualDir, 'a', 'SKILL.md'), 'x\n');

        // Mirror side: at the mirror root (the observed failure) and nested, in both OS dialects.
        await fs.writeFile(path.join(actualDir, '.DS_Store'), Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31]));
        await fs.writeFile(path.join(actualDir, 'a', '.DS_Store'), Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31]));
        await fs.writeFile(path.join(actualDir, 'a', 'Thumbs.db'), Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
        await fs.writeFile(path.join(actualDir, 'a', 'Desktop.ini'), '[.ShellClassInfo]\r\n');
        // Source side: staging is copied from the source tree, so it inherits whatever a file
        // browser left there. Different bytes on purpose — these files are never compared.
        await fs.writeFile(path.join(expectedDir, '.DS_Store'), Buffer.from([0, 0, 0, 1, 0x42, 0x75, 0x64, 0x31, 0xff]));
        await fs.writeFile(path.join(expectedDir, 'a', 'desktop.ini'), '[.ShellClassInfo]\r\nIconResource=x\r\n');

        const expected = await readTreeFiles(expectedDir);
        assert.deepEqual(describe(diffTrees(expected, await readTreeFiles(actualDir))), [],
            'OS metadata must not register as extra-in-mirror, missing-in-mirror or content drift');
        // The rule belongs to the walk, not to the `exclude` default: a caller that supplies its
        // own exclusions must not switch it off.
        assert.deepEqual(describe(diffTrees(expected, await readTreeFiles(actualDir, { exclude: new Set(), skip: () => false }))), [],
            'a caller-supplied exclude/skip must not re-admit OS metadata');

        // Genuine extras stay reportable: a hand-added file, a file whose name merely CONTAINS a
        // metadata name, and content under a DIRECTORY named like one (only files are metadata).
        await fs.mkdir(path.join(actualDir, 'Thumbs.db'), { recursive: true });
        await fs.writeFile(path.join(actualDir, 'a', 'stray.md'), 'hand-added\n');
        await fs.writeFile(path.join(actualDir, 'a', 'notes.DS_Store.md'), 'hand-added\n');
        await fs.writeFile(path.join(actualDir, 'Thumbs.db', 'hidden.md'), 'hand-added\n');

        assert.deepEqual(describe(diffTrees(expected, await readTreeFiles(actualDir))), [
            'extra-in-mirror Thumbs.db/hidden.md',
            'extra-in-mirror a/notes.DS_Store.md',
            'extra-in-mirror a/stray.md'
        ].sort());
    } finally {
        await fs.rm(expectedDir, { recursive: true, force: true });
        await fs.rm(actualDir, { recursive: true, force: true });
    }
});

// ── CONTEXT-mirror idempotency (folded into this gate) ─────────────────────────────────────────────
// checkContextMirror() compares a fresh render of AGENTS.md (keyed by repo-relative path) against the
// committed copy using the SAME diffTrees. The retired .codex/CODEX_CONTEXT.md is never rendered, so a
// committed one is an orphan the gate reports. These cases lock that surface; the diffTrees verdicts
// themselves are already covered above.

// TC-CTXMIRROR-001 — an in-sync context mirror (AGENTS.md identical, no context file) yields no divergence.
test('TC-CTXMIRROR-001: identical AGENTS.md maps and no context file → no diffs', () => {
    const fresh = new Map([['AGENTS.md', 'a\n']]);
    const committed = new Map([['AGENTS.md', 'a\n']]);
    assert.deepEqual(diffTrees(fresh, committed), []);
});

// TC-CTXMIRROR-002 — a stale committed AGENTS.md (the Finding-1 failure mode) is flagged 'content'.
test('TC-CTXMIRROR-002: a stale committed AGENTS.md is flagged as content drift', () => {
    const fresh = new Map([['AGENTS.md', 'fresh\n']]);
    const committed = new Map([['AGENTS.md', 'stale\n']]);
    assert.deepEqual(diffTrees(fresh, committed), [{ relPath: 'AGENTS.md', kind: 'content' }]);
});

// TC-CTXMIRROR-004 — a committed .codex/CODEX_CONTEXT.md no longer has a source: it is reported as an orphan.
test('TC-CTXMIRROR-004: a leftover .codex/CODEX_CONTEXT.md is flagged as an orphan', () => {
    const fresh = new Map([['AGENTS.md', 'a\n']]);
    const committed = new Map([['AGENTS.md', 'a\n'], ['.codex/CODEX_CONTEXT.md', 'c\n']]);
    assert.deepEqual(diffTrees(fresh, committed), [{ relPath: '.codex/CODEX_CONTEXT.md', kind: 'extra-in-mirror' }]);
});

// TC-CTXMIRROR-003 — committed == fresh, live against this repo. Spawns the gate as a SUBPROCESS
// (non-destructive: renders into a tmp dir) and asserts both surfaces are in sync. This is the
// idempotency assertion — if a context generator's text was edited without a full re-sync, the
// committed AGENTS.md would diverge from a fresh render and this fails.
test('TC-CTXMIRROR-003: gate passes against the committed repo (skills + context both in sync)', async () => {
    const { stdout } = await execFileAsync(process.execPath, [gatePath], { cwd: repoRoot });
    assert.match(stdout, /skills: PASS/, 'committed .agents/skills mirror must equal a fresh render');
    assert.match(stdout, /context: PASS/, 'committed AGENTS.md must equal a fresh render and no context file may remain');
});

// --- TC-HOOKMIRROR-001..003 — the FOURTH guarded surface: .codex/hooks.json ---
//
// This mirror decides which hooks a Codex session RUNS, so a stale copy silently
// downgrades the safety gates instead of merely serving stale guidance. The oracle
// must call the REAL writer (materializeHookMirror), never a second derivation.

const syncHooksPath = path.resolve(thisDir, '..', 'sync-hooks.mjs');
// `mapMatcherForCodex` is deliberately NOT imported here: this oracle must not check
// the renderer against its own translator. Matcher translation is unit-tested in
// tests/sync-hooks.test.mjs; here only the literal table and the prefix property judge it.
const { materializeHookMirror, claudeSettingsPath } = await import(pathToFileURL(syncHooksPath).href);
const { unexpectedHookSkips } = await import(pathToFileURL(gatePath).href);

// The three mutation scripts the gate imports for its oracles. Each one writes the
// real mirrors when run as a script, so each must stay inert on import.
const SYNC_MODULES = ['sync-hooks.mjs', 'sync-context-workflows.mjs', 'migrate-claude-to-codex.mjs'];

// TC-HOOKMIRROR-001 — importing a sync module must NOT write the real mirrors.
// Without the invoked-as-script guard, merely importing one for the oracle would
// regenerate the committed mirrors as a side effect of *checking* them.
//
// The oracle has to run in a SUBPROCESS. This file already imported all three
// modules at load time (:20, :120), so any import-time write happened before a
// stat taken here could observe it — an in-process before/after comparison is
// taken after the event it claims to detect, and passes whether or not the guard
// exists. The child below performs the import for the first time in its own
// process, so the window is genuinely open across the measurement.
//
// Two oracles, because either alone is blind: content catches a regenerating
// write (the mirrors need only be momentarily stale for the bytes to differ) and
// mtime catches a rewrite that happens to reproduce identical bytes.
test('TC-HOOKMIRROR-001: importing a sync module in a fresh process does not write the committed mirrors', async () => {
    const MIRRORS = [
        path.join(repoRoot, '.codex', 'hooks.json'),
        path.join(repoRoot, 'AGENTS.md'),
        path.join(repoRoot, '.agents', 'skills', 'why-review', 'SKILL.md')
    ];

    const snapshot = async () => {
        const state = new Map();
        for (const file of MIRRORS) {
            const [body, stat] = await Promise.all([fs.readFile(file), fs.stat(file)]);
            state.set(file, { hash: createHash('sha256').update(body).digest('hex'), mtimeMs: stat.mtimeMs });
        }
        return state;
    };

    const probeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-import-'));
    const probe = path.join(probeDir, 'import-only.mjs');
    const importLines = SYNC_MODULES
        .map(name => `await import(${JSON.stringify(pathToFileURL(path.resolve(thisDir, '..', name)).href)});`)
        .join('\n');
    await fs.writeFile(probe, `${importLines}\n`);

    try {
        const before = await snapshot();
        // cwd is the repo root on purpose: a regressed guard would resolve the real
        // project from here, which is exactly the destructive case under test.
        await execFileAsync(process.execPath, [probe], { cwd: repoRoot });
        const after = await snapshot();

        for (const file of MIRRORS) {
            const rel = path.relative(repoRoot, file);
            assert.equal(after.get(file).hash, before.get(file).hash, `importing a sync module rewrote ${rel}`);
            assert.equal(after.get(file).mtimeMs, before.get(file).mtimeMs, `importing a sync module touched ${rel}`);
        }
    } finally {
        await fs.rm(probeDir, { recursive: true, force: true });
    }
});

// TC-HOOKMIRROR-001b — the guard itself, named. TC-HOOKMIRROR-001 proves no write
// happened; it cannot say WHY, so a module that stopped writing for an unrelated
// reason (an early return, a main() that moved) would keep it green while the guard
// was gone. Each module must still gate its script entry on being argv[1].
test('TC-HOOKMIRROR-001b: every sync module gates its script entry on invoked-as-script', async () => {
    for (const name of SYNC_MODULES) {
        const source = await fs.readFile(path.resolve(thisDir, '..', name), 'utf8');
        assert.match(
            source,
            /const invokedAsScript =[\s\S]{0,120}?process\.argv\[1\][\s\S]{0,160}?fileURLToPath\(import\.meta\.url\)/,
            `${name} must derive invokedAsScript from process.argv[1] vs its own module URL`
        );
        assert.match(source, /if \(invokedAsScript\) \{/, `${name} must run its script entry only when invoked as a script`);
    }
});

// TC-HOOKMIRROR-002 — the writer is deterministic for hooks.json, so a diff against
// the committed copy means real drift, never run-to-run noise. (The sibling report is
// NOT deterministic — it embeds generated_at — which is why the gate diffs only hooks.json.)
test('TC-HOOKMIRROR-002: hooks.json materializes deterministically; the report does not', async () => {
    const first = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-a-'));
    const second = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-b-'));
    try {
        await materializeHookMirror(first);
        await new Promise(resolve => setTimeout(resolve, 5));
        await materializeHookMirror(second);
        const readHooks = dir => fs.readFile(path.join(dir, 'hooks.json'), 'utf8');
        assert.equal(await readHooks(first), await readHooks(second));

        const report = JSON.parse(await fs.readFile(path.join(first, 'hooks.sync.report.json'), 'utf8'));
        assert.ok(report.generated_at, 'the report carries a timestamp, so it is not byte-comparable');
    } finally {
        await fs.rm(first, { recursive: true, force: true });
        await fs.rm(second, { recursive: true, force: true });
    }
});

// TC-HOOKMIRROR-003 — the gate is non-vacuous: a fresh render of the CURRENT settings
// must produce exactly this hook surface. A render that silently dropped a group, or
// emptied one down to a single hook, would let the gate report PASS while the Codex
// host ran fewer hooks than this project configures.
//
// The expectation is a LITERAL table, MEASURED from a fresh render (2026-09-08), not
// re-derived from settings.json. The previous version rebuilt the expected set by
// applying `matcher && matcher !== '*'` — the renderer's own rule (sync-hooks.mjs:184)
// — to settings.json, so it could only ever check that the renderer applied the rule
// the test had already assumed. It also asserted PreToolUse membership only: an event
// dropped whole, a group lost, or a group thinned from four hooks to one all left it
// green. Anything below is a real change to what a Codex session runs, and updating
// this table is the deliberate act that records the decision.
//
// Rows are `[event, matcher-or-null, hook-count]`; null means the group carries no
// matcher (the renderer omits `*`, so the group still applies to everything).
// Matcher translation (2026-09-16): every matcher naming a Claude MUTATION tool is
// widened with `apply_patch`, the tool Codex performs ALL file mutation through.
// Rendering the Claude names verbatim gated these groups on tools that host never
// emits, so on Codex they could not fire at all — silently, since presence in
// hooks.json looks like parity.
//
// WHAT THE WIDENING DOES, AND WHAT IT DOES NOT DO — measured, not inferred.
// It makes the event REACH the hook. It does not make the hook handle it. A hook acts
// only on tool names its own code parses, so a matcher can name `apply_patch` while
// the hook behind it ignores every such event.
//   * GAINED: `file-convention-inject` — the original registered consumer that names
//     `apply_patch` in its own trigger set when widening was added (`file-convention-inject.cjs:25`). Its
//     per-file convention reminder now fires on Codex edits.
//   * ui-reuse-remind also explicitly handles apply_patch targets before frontend changes.
// A matcher in this mirror only routes events to hooks that must still learn the
// tool to act on it, so do not read a widened matcher as new coverage.
// Matchers with no Claude mutation tool (`Bash`, `TodoWrite|…|update_plan`, `mcp__*`)
// are untouched, as are matchers naming only read tools.
const EXPECTED_RENDERED_GROUPS = [
    ['PostToolUse', 'Edit|Write|MultiEdit|apply_patch', 1],
    ['PostToolUse', 'Edit|Write|MultiEdit|apply_patch', 1],
    // file-convention-inject (2026-09-16): per-file convention reminder. Its SessionStart
    // compact|clear group DOES render a Codex row as of 2026-09-17 — see below.
    ['PostToolUse', 'Read|Edit|Write|MultiEdit|NotebookEdit|apply_patch', 1],
    // prompt-ledger (2026-09-16): task-checkpoint goal re-anchor. Its SessionStart
    // compact|resume|clear group DOES render a Codex row as of 2026-09-17 — see below.
    // Already carries Codex's own `update_plan`, so no file-tool widening applies.
    ['PostToolUse', 'TodoWrite|TaskCreate|TaskUpdate|update_plan', 1],
    // token-budget-checkpoint (2026-09-25): advisory note each time the session's non-cached
    // tokens cross the next hooks.tokenBudget.checkpointTokens multiple. Its own group on the
    // prompt-ledger matcher, so the prompt-ledger group above renders byte-identical.
    ['PostToolUse', 'TodoWrite|TaskCreate|TaskUpdate|update_plan', 1],
    // core-principles-inject (2026-09-29): re-delivers the SYNC:core-engineering-principles gate
    // (easy to change / scale / maintain) at task-step boundaries, ledger-deduplicated to about
    // once per 100k tokens. Its own group on the prompt-ledger matcher, like token-budget-checkpoint.
    ['PostToolUse', 'TodoWrite|TaskCreate|TaskUpdate|update_plan', 1],
    // Protocol delivery: the five protocol-inject-<group> entries plus skill-overlay-remind. Their
    // Claude `Skill` and `Read` groups are not mirrored — Codex has neither tool — and are reported
    // as `matcher-names-no-codex-tool`. Codex reads a skill file implicitly through its shell,
    // so the Read group's entries render here, in that group's place, on `Bash`; their
    // in-process early exit ends every command that does not name SKILL.md.
    ['PostToolUse', 'Bash', 6],
    // Advisory tracking observer preserves the source edit-tool matcher and Codex alias.
    ['PostToolUse', 'Edit|Write|MultiEdit|NotebookEdit|apply_patch', 1],
    // quality-skill-remind (2026-10-14): the review/test/failure skill digest after any tool result,
    // ~150K-token dedup per scope. The source `*` matcher renders matcherless (every tool).
    ['PostToolUse', null, 1],
    // Conditional diagnostic reminder before shell commands; native failure events remain unsupported.
    ['PreToolUse', 'Bash|exec_command', 1],
    ['PreToolUse', 'AskUserQuestion', 1],
    // The Bash PreToolUse chain, in settings.json order: doc-sync-gate,
    // review-commit-gate (2026-09-19, the review-before-commit receipt gate).
    ['PreToolUse', 'Bash', 2],
    ['PreToolUse', 'Write|Edit|MultiEdit|apply_patch', 1],
    // UI reuse discovery reminder before matching file operations, shell hints and plan loads.
    ['PreToolUse', 'Read|Edit|Write|MultiEdit|NotebookEdit|apply_patch|Bash|exec_command|Skill', 1],
    // SessionEnd (2026-09-17): Codex DOES support this event. Its matcher vocabulary is
    // only `other`, so the legacy clear|exit|compact cleanup hook mirrors UNSCOPED.
    ['SessionEnd', null, 1],
    // The separate matcherless notification group also mirrors; its configured timeout
    // is asserted against the output below.
    ['SessionEnd', null, 1],
    // SessionStart (2026-09-17): Codex supports startup|resume|clear|compact. The event
    // is no longer skipped wholesale; sync-hooks.mjs codexSessionStartMirrors mirrors
    // exactly the hooks whose output a MIRRORED non-SessionStart hook consumes, because
    // dropping a producer while keeping its consumer leaves the consumer registered and
    // permanently unreachable. Everything off that allowlist is still skipped under the
    // original static-startup-context rationale. Runtime producers, in settings.json order:
    //   verify-install         — startup dependency-integrity check (2026-09-22)
    //   session-init-docs      — sole writer of .scan-stale, read by init-prompt-gate
    //   file-convention-inject — compaction re-arm for per-file convention delivery
    //   prompt-ledger          — goal/prompt re-anchor after compact or resume
    //   protocol-inject-universal-1..4 — the universal bundle after a compaction or clear (compact|clear)
    // Failure reminder's private compact/clear reset precedes the existing startup producers.
    ['SessionStart', 'compact|clear', 1],
    ['SessionStart', 'startup|resume|clear|compact', 1],
    ['SessionStart', 'startup', 1],
    ['SessionStart', 'compact|clear', 1],
    ['SessionStart', 'compact|resume|clear', 1],
    ['SessionStart', 'compact|clear', 4],
    // Runtime skill selection policy survives recovery and observes personal preferences.
    ['SessionStart', 'startup|resume|compact|clear', 1],
    // Private UI reminder generation reset preserves sibling universal/full-protocol records.
    ['SessionStart', 'compact|clear', 1],
    // Compaction re-delivery (2026-10-14): core principles, judgement and AI-feature directives (latest
    // recorded prompt), workflow route and catalog — a long run has no following prompt.
    ['SessionStart', 'compact', 5],
    ['Stop', null, 1],
    // SubagentStart: Codex supports it and it mirrors — the five group entries and the four universal
    // bins, registered without an agent-type matcher so every agent type (skill preloaders,
    // general-purpose, custom agents) reaches the hooks; each hook decides per agent whether it
    // delivers. A matcherless source group renders matcherless (an agent-name list would render
    // anchored, because Codex matchers are unanchored regexes).
    ['SubagentStart', null, 9],
    ['SubagentStart', null, 1],
    // Prompt-time context for delegated agents (2026-10-14): core principles, UI reuse reminder, and the
    // judgement and AI-feature directives classified from the session's latest recorded prompt.
    ['SubagentStart', null, 4],
    // The universal bundle: one entry per bin, first on every prompt so its ledger records predate
    // every other prompt hook.
    ['UserPromptSubmit', null, 4],
    ['UserPromptSubmit', null, 1],
    ['UserPromptSubmit', null, 1],
    ['UserPromptSubmit', null, 1],
    // workflow-route-inject: default-on, configurable runtime workflow router.
    ['UserPromptSubmit', null, 1],
    // workflow-catalog-inject (2026-10-08): the route's second output, so the catalog keeps its form whatever the gate's length.
    ['UserPromptSubmit', null, 1],
    // commit-skill-route (2026-09-24): routes a commit request to the `commit` skill ($commit on Codex).
    ['UserPromptSubmit', null, 1],
    // judgement-integrity-route (2026-09-24): anti-confirmation-bias answer why-review on verdict prompts.
    ['UserPromptSubmit', null, 1],
    // ai-feature-route (2026-09-30): AI-engineering gate reminder and review routing on prompts about AI features.
    ['UserPromptSubmit', null, 1],
    // task-tracking-route (2026-10-06): advisory work-tracking purpose and concern notice on eligible work prompts;
    // silent when tracking is off, unavailable, quoted or unrelated.
    ['UserPromptSubmit', null, 1],
    // core-principles-inject (2026-09-29): the same gate on prompts, sharing the step group's ledger record.
    ['UserPromptSubmit', null, 1],
    // prompt-ledger (2026-09-16): records every prompt and re-anchors the original goal.
    ['UserPromptSubmit', null, 1],
    // Concise UI reuse reminder shares its100K window with the pre-tool trigger.
    ['UserPromptSubmit', null, 1],
    // Protocol delivery: the five group entries and skill-overlay-remind, which Claude registers on
    // UserPromptExpansion, which Codex lacks. An explicit `$skill` on UserPromptSubmit is the Codex load path, so
    // they render here, after every native UserPromptSubmit group (reported as
    // `remapped-to-user-prompt-submit`).
    ['UserPromptSubmit', null, 6]
];

test('TC-HOOKMIRROR-003: a fresh render produces exactly the expected hook surface', async () => {
    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-c-'));
    try {
        await materializeHookMirror(staging);
        const rendered = JSON.parse(await fs.readFile(path.join(staging, 'hooks.json'), 'utf8'));

        const actual = Object.entries(rendered.hooks)
            .flatMap(([event, groups]) => groups.map(group => [event, group.matcher ?? null, group.hooks.length]));

        assert.deepEqual(
            actual,
            EXPECTED_RENDERED_GROUPS,
            'the Codex hook surface changed — a Codex session now runs a different hook set than this table records'
        );

        // Every matcher the source configures still has to survive. The table above
        // would also catch this, but only as an opaque array diff; this names the
        // matcher, which is the sentence a reader needs when it fails.
        //
        // Checked against an INDEPENDENT property, never by calling the renderer's own
        // `mapMatcherForCodex`: re-deriving the expectation from the implementation
        // asserts only that the implementation agrees with itself, which no bug can
        // fail. The property instead: translation may only APPEND Codex aliases, so a
        // configured matcher must still appear as the literal PREFIX of some rendered
        // matcher — every tool present, in order, same `|` separator. A dropped,
        // reordered, renamed, or re-separated tool fails this; a widening does not.
        const settings = JSON.parse(await fs.readFile(claudeSettingsPath, 'utf8'));
        const observerSource = (settings.hooks.PostToolUse || [])
            .flatMap(group => group.hooks || [])
            .find(hook => hook.command?.includes('/task-tracking-observer.cjs'));
        const observerMirror = (rendered.hooks.PostToolUse || [])
            .flatMap(group => group.hooks || [])
            .find(hook => hook.command?.includes('/task-tracking-observer.cjs'));
        assert.ok(observerSource && observerMirror, 'Both hosts retain the advisory task-tracking observer');
        assert.equal(observerSource.timeout, 3, 'The advisory observer retains its three-second source budget');
        assert.equal(observerMirror.timeout, observerSource.timeout, 'Codex preserves the advisory observer budget');
        const renderedMatchers = actual.map(([, matcher]) => matcher).filter(Boolean);
        for (const group of settings.hooks.PreToolUse || []) {
            if (!group.matcher || group.matcher === '*') continue;
            assert.ok(
                renderedMatchers.some(
                    rendered => rendered === group.matcher || rendered.startsWith(`${group.matcher}|`)
                ),
                `PreToolUse matcher "${group.matcher}" is configured in settings.json but no rendered Codex matcher preserves it as a prefix (rendered: ${renderedMatchers.join(', ')})`
            );
        }

        const sessionEndAlertSource = (settings.hooks.SessionEnd || [])
            .flatMap(group => Array.isArray(group.hooks) ? group.hooks : [])
            .find(hook => hook.command?.includes('/notifications/notify.cjs'));
        assert.ok(sessionEndAlertSource, 'settings.json must register the SessionEnd notification hook');
        assert.equal(sessionEndAlertSource.timeout, 3, 'the SessionEnd notification timeout must stay within Codex’s 3-second budget');

        const sessionEndAlertMirror = (rendered.hooks.SessionEnd || [])
            .flatMap(group => group.hooks || [])
            .find(hook => hook.command?.includes('notifications/notify.cjs'));
        assert.ok(sessionEndAlertMirror, 'Codex must render the SessionEnd notification handler');
        assert.equal(
            sessionEndAlertMirror.timeout,
            sessionEndAlertSource.timeout,
            'Codex must preserve the SessionEnd notification timeout configured in Claude settings'
        );
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
});

// TC-HOOKMIRROR-004 — the skip guard, on SYNTHETIC reports. The gate's byte-diff of
// hooks.json cannot see a dropped hook at all: move a hook to an event Codex does not
// support and the mirror is byte-identical while Codex runs one gate fewer. Only the
// renderer's skip report records it, and that report is gitignored, so nothing else
// compares it. These cases drive the guard through the states that matter — today's
// baseline, a new drop, a changed reason, a dropped group, and a baseline gone stale.
test('TC-HOOKMIRROR-004: the skip guard accepts the reviewed baseline and rejects every drift', () => {
    // Codex omits Notification and Claude's native failure accelerator. Protocol
    // entries on UserPromptExpansion render on UserPromptSubmit instead of dropping.
    const BASELINE = [
        { event: 'Notification', reason: 'unsupported-by-codex' },
        { event: 'UserPromptExpansion', reason: 'remapped-to-user-prompt-submit' },
        { event: 'PostToolUseFailure', reason: 'unsupported-by-codex' }
    ];

    assert.deepEqual(
        unexpectedHookSkips({ skipped_events: BASELINE, skipped_groups: [] }),
        [],
        'the reviewed baseline must not fail the gate'
    );

    const newSkip = unexpectedHookSkips({
        skipped_events: [...BASELINE, { event: 'PreToolUse', reason: 'unsupported-by-codex' }],
        skipped_groups: []
    });
    assert.equal(newSkip.length, 1);
    assert.match(newSkip[0], /PreToolUse is now skipped/);

    const changedReason = unexpectedHookSkips({
        skipped_events: BASELINE.map(entry =>
            entry.event === 'Notification' ? { ...entry, reason: 'no-compatible-groups-after-filtering' } : entry),
        skipped_groups: []
    });
    assert.equal(changedReason.length, 1);
    assert.match(changedReason[0], /Notification is skipped for a new reason/);

    const nativeFailureBaselineStale = unexpectedHookSkips({
        skipped_events: BASELINE.filter(entry => entry.event !== 'PostToolUseFailure'),
        skipped_groups: []
    });
    assert.equal(nativeFailureBaselineStale.length, 1);
    assert.match(nativeFailureBaselineStale[0], /PostToolUseFailure is no longer skipped/);
    const lostPostToolPath = unexpectedHookSkips({
        skipped_events: [...BASELINE, { event: 'PostToolUse', reason: 'unsupported-by-codex' }],
        skipped_groups: []
    });
    assert.equal(lostPostToolPath.length, 1);
    assert.match(lostPostToolPath[0], /PostToolUse is now skipped/);

    const droppedGroup = unexpectedHookSkips({
        skipped_events: BASELINE,
        skipped_groups: [{ event: 'PreToolUse', group_index: 3, matcher: 'Bash', reason: 'no-command-hooks' }]
    });
    assert.equal(droppedGroup.length, 1);
    assert.match(droppedGroup[0], /PreToolUse\[3\].*Bash.*no-command-hooks/);

    // The opposite direction is not a safety loss — MORE is mirrored than before — but
    // it makes the recorded baseline a lie, so it still has to be re-reviewed.
    const staleBaseline = unexpectedHookSkips({
        skipped_events: [],
        skipped_groups: []
    });
    assert.equal(staleBaseline.length, BASELINE.length);
    assert.match(staleBaseline[0], /Notification is no longer skipped/);
    assert.match(staleBaseline[1], /UserPromptExpansion is no longer skipped/);
    assert.match(staleBaseline[2], /PostToolUseFailure is no longer skipped/);

    // The REVIEWED group skips pass. They are the only intended ways a group stops
    // mirroring: a SessionStart group carrying no allowlisted producer, SessionEnd's
    // matcher, which names nothing Codex emits and so is dropped to let the hook run, and
    // (2026-09-25) a protocol-entry PostToolUse group keyed only to Read or Skill.
    assert.deepEqual(
        unexpectedHookSkips({
            skipped_events: BASELINE,
            skipped_groups: [
                { event: 'SessionStart', group_index: 0, matcher: 'startup|resume', reason: 'session-start-not-on-mirror-allowlist' },
                { event: 'SessionEnd', group_index: 0, matcher: 'clear|exit|compact', reason: 'matcher-unsupported-on-codex-hook-runs-unscoped' },
                { event: 'PostToolUse', group_index: 5, matcher: 'Skill', reason: 'matcher-names-no-codex-tool' }
            ]
        }),
        [],
        'the reviewed group skips must not fail the gate'
    );

    // …but the allowance is keyed on event AND reason, so a reviewed reason appearing on
    // an event it was never reviewed for still fails. Otherwise "SessionStart is allowed
    // to drop groups" would quietly license every event to drop them.
    const reasonOnWrongEvent = unexpectedHookSkips({
        skipped_events: BASELINE,
        skipped_groups: [{ event: 'PreToolUse', group_index: 1, matcher: 'Bash', reason: 'session-start-not-on-mirror-allowlist' }]
    });
    assert.equal(reasonOnWrongEvent.length, 1);
    assert.match(reasonOnWrongEvent[0], /PreToolUse\[1\]/);

    // A renderer that returned no skip fields at all must not read as "nothing skipped":
    // the baseline events are still expected, so their absence is reported.
    assert.equal(unexpectedHookSkips({}).length, BASELINE.length);
});

// TC-PDL-069 — the protocol delivery rows on the Codex surface. The live render (TC-HOOKMIRROR-003
// and -005) now carries the UserPromptSubmit, PostToolUse `Bash` and SubagentStart protocol rows
// and only the reviewed skips. This case pins the one that is easiest to lose silently: Codex DOES
// support SubagentStart, so a render that skipped it as `unsupported-by-codex` (a wrong
// `supportedEvents` row) would drop agent-start delivery while every table still looked reviewed.
test('TC-PDL-069: the skip guard rejects SubagentStart skipped as unsupported and a wrong protocol reason', () => {
    // Given the reviewed baseline events
    const baseline = [
        { event: 'Notification', reason: 'unsupported-by-codex' },
        { event: 'UserPromptExpansion', reason: 'remapped-to-user-prompt-submit' },
        { event: 'PostToolUseFailure', reason: 'unsupported-by-codex' }
    ];

    // When a report skips SubagentStart as unsupported-by-codex
    const subagentDropped = unexpectedHookSkips({
        skipped_events: [...baseline, { event: 'SubagentStart', reason: 'unsupported-by-codex' }],
        skipped_groups: []
    });
    // Then the guard reports it
    assert.equal(subagentDropped.length, 1);
    assert.match(subagentDropped[0], /SubagentStart is now skipped \(unsupported-by-codex\)/);

    // When UserPromptExpansion is reported as unsupported instead of remapped (its entries lost)
    const expansionDropped = unexpectedHookSkips({
        skipped_events: [baseline[0], { event: 'UserPromptExpansion', reason: 'unsupported-by-codex' }, baseline[2]],
        skipped_groups: []
    });
    // Then the guard reports the changed reason
    assert.equal(expansionDropped.length, 1);
    assert.match(expansionDropped[0], /UserPromptExpansion is skipped for a new reason: unsupported-by-codex/);

    // When the no-Codex-tool reason appears on an event it was never reviewed for, or a
    // non-protocol handler is dropped from the remapped event
    const wrongPlaces = unexpectedHookSkips({
        skipped_events: baseline,
        skipped_groups: [
            { event: 'PreToolUse', group_index: 0, matcher: 'Read', reason: 'matcher-names-no-codex-tool' },
            { event: 'UserPromptExpansion', group_index: 0, matcher: null, reason: 'remap-limited-to-protocol-entries' }
        ]
    });
    // Then both are reported
    assert.equal(wrongPlaces.length, 2);
    assert.match(wrongPlaces[0], /PreToolUse\[0\].*matcher-names-no-codex-tool/);
    assert.match(wrongPlaces[1], /UserPromptExpansion\[0\].*remap-limited-to-protocol-entries/);
});

// TC-HOOKMIRROR-005 — the guard, wired. TC-HOOKMIRROR-004 proves the function's logic
// on synthetic input; this proves the LIVE renderer's report still satisfies it, so the
// baseline in the gate is the repo's actual state and not an aspiration.
test('TC-HOOKMIRROR-005: the live renderer skips exactly the reviewed set', async () => {
    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'hookmirror-d-'));
    try {
        const report = await materializeHookMirror(staging);
        assert.deepEqual(unexpectedHookSkips(report), [], 'the live hook render drops hooks the gate has not reviewed');
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
});

// TC-CODEXSYNC-001 — the gate's own remediation sentence, verified. Every FAIL branch tells the
// reader to run `npm run codex:sync` — or, verbatim, the standalone orchestrator it delegates to,
// `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` — and nothing checked that the command
// still regenerates all four surfaces this gate compares. Add a fifth mirror (or drop a generator from
// the roster) and the gate would keep failing while its documented fix no longer repairs what it flags
// — the most expensive kind of stale instruction, because it is followed.
//
// The roster asserted is the RUNNER's `stages` array, NOT package.json's script string. The runner
// lives inside `.claude`, so it is the one roster that exists in every adopting project — PORT-007
// ships no package.json at all — and framework-repo.helper.mjs draws exactly that line: guard the npm
// SURFACE, keep the runner CONTRACT absolute. An earlier version of this test asserted an
// `npm run a && npm run b` chain that `codex:sync` had already stopped being, so it could never pass;
// the npm alias is now checked separately, as the repo self-check it is (TC-CODEXSYNC-002).
//
// The mapping below is keyed by the surfaces checkSkillsMirror / checkAgentMirror / checkHookMirror /
// checkContextMirror actually compare, so it is derived from the gate's coverage, not from the runner
// restating itself.
test('TC-CODEXSYNC-001: the remediation command regenerates every surface this gate checks', async () => {
    const runnerPath = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    const runner = await fs.readFile(runnerPath, 'utf8');

    // Slice the literal roster out of the SOURCE instead of importing it: importing the runner would
    // execute the pipeline, and its four mutating stages would rewrite the real tree from a test.
    const open = runner.indexOf('const stages = [');
    assert.notEqual(open, -1, 'run-codex-sync.mjs must define a `stages` roster — it is the remediation every FAIL branch prints');
    const close = runner.indexOf('\n];', open);
    assert.notEqual(close, -1, 'the `stages` roster has no closing `];` — the extraction below cannot be trusted');
    const stages = [...runner.slice(open, close).matchAll(/\{\s*id:\s*"([^"]+)"[^\n]*/g)].map(match => ({ id: match[1], entry: match[0] }));
    assert.ok(stages.length > 0, 'the `stages` roster parsed empty — the runner changed shape and this extraction no longer matches it');

    const GENERATOR_FOR_SURFACE = [
        ['.agents/skills (checkSkillsMirror)', 'migrate', 'migrate-claude-to-codex.mjs'],
        ['.codex/agents (checkAgentMirror)', 'migrate', 'migrate-claude-to-codex.mjs'],
        ['.codex/hooks.json (checkHookMirror)', 'hooks', 'sync-hooks.mjs'],
        ['AGENTS.md + .codex/CODEX_CONTEXT.md (checkContextMirror)', 'context', 'sync-context-workflows.mjs']
    ];

    for (const [surface, id, script] of GENERATOR_FOR_SURFACE) {
        const stage = stages.find(entry => entry.id === id);
        assert.ok(stage, `codex:sync no longer runs the '${id}' stage, so it cannot regenerate ${surface} — the gate's remediation is now wrong`);
        assert.match(
            stage.entry,
            new RegExp(script.replaceAll('.', '\\.')),
            `the '${id}' stage no longer invokes ${script}, so ${surface} is not regenerated by the remediation`
        );
        // `mutate: true` is the marker that classifies a stage as a REGENERATOR: PORT-008
        // (portability-no-package-json.test.mjs) derives the read-only verify set as every stage
        // WITHOUT it. A generator that loses the marker is reclassified as read-only and lands in the
        // `verify:all --only=` allowlist, so the npm verify path would run it as if it regenerated
        // nothing.
        assert.match(stage.entry, /mutate:\s*true/, `the '${id}' stage is no longer a mutating stage, so it regenerates nothing for ${surface}`);
    }

    // Verification runs LAST on purpose: a sync that regenerates without re-verifying reports success
    // on output nothing checked. THIS gate is that last stage, so the remediation it prints is never
    // judged against the stale tree it was printed about.
    const gateIndex = stages.findIndex(entry => entry.id === 'sync-divergence');
    assert.notEqual(gateIndex, -1, "the roster must end by re-running this gate ('sync-divergence')");
    assert.equal(
        gateIndex,
        stages.length - 1,
        'verify-sync-divergence must be the LAST stage — verification before the final generator proves nothing'
    );
    const lastGeneratorIndex = Math.max(...GENERATOR_FOR_SURFACE.map(([, id]) => stages.findIndex(entry => entry.id === id)));
    assert.ok(lastGeneratorIndex < gateIndex, 'every generator must run BEFORE the verification stage, or the gate verifies output it has not regenerated');
});

// TC-CODEXSYNC-002 — the command every FAIL branch prints must be one an adopter can actually run.
// It used to name `npm run codex:sync`; that script is gone, because the framework is portable and a
// remediation naming a host npm script is un-runnable in a project with no package.json — the exact
// reader most likely to hit this gate. The remediation now names the in-bundle runner path, and this
// asserts the file it names exists. UNCONDITIONAL: the runner ships in every adopting project.
test('TC-CODEXSYNC-002: the printed remediation names a command that exists inside the bundle', async () => {
    const source = await fs.readFile(path.join(repoRoot, '.claude', 'scripts', 'codex', 'verify-sync-divergence.mjs'), 'utf8');
    assert.match(source, /run-codex-sync\.mjs/, 'the remediation must name the standalone runner');
    assert.doesNotMatch(source, /npm run codex:sync/,
        'the remediation must not name a host npm script — it does not exist in an adopting project');
    const runner = path.join(repoRoot, '.claude', 'skills', 'sync-codex', 'scripts', 'run-codex-sync.mjs');
    assert.ok(await fs.access(runner).then(() => true, () => false), 'the named runner must exist on disk');
});
