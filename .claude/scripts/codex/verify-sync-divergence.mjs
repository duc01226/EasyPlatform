#!/usr/bin/env node

// Codex sync-divergence oracle gate.
//
// Guards FOUR committed-mirror surfaces against a fresh regeneration:
//   (1) the .agents/skills mirror (materializeSkillMirror),
//   (2) the CONTEXT mirror — AGENTS.md, the project-information projection of CLAUDE.md
//       (runContextSync); a leftover .codex/CODEX_CONTEXT.md is reported as an orphan,
//   (3) the .codex/agents TOML mirror (materializeAgentMirror) — the ENTIRE Codex sub-agent
//       surface, which until now was the one committed mirror with no gate at all: 23 files
//       that could be hand-edited or left stale with nothing to catch it, and
//   (4) .codex/hooks.json (materializeHookMirror) — which decides which hooks a Codex
//       session actually RUNS, so a stale copy silently downgrades the safety gates
//       rather than merely serving stale guidance.
// Each re-runs the REAL writer into a throwaway staging dir, then diffs that fresh output
// against the committed copy. Any difference means the mirror is stale (someone edited
// .claude/** without running `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`) or was hand-edited directly.
//
// Oracle design (vs re-implementing the transforms): the checker and the writer call the
// SAME functions (materializeSkillMirror / runContextSync), so the "expected" output cannot
// drift from real sync behavior. The intentional dialect rewrites (/skill -> $skill,
// TaskCreate -> task tracking, version: strip, compat-note prepend, etc.) are reproduced for free because they ARE the real transform.
//
// Why the CONTEXT check lives HERE rather than in a new standalone file: a new pipeline
// script would have to be present in the portable export (export-claude ships tracked and
// unignored working-tree `.claude` files) — adding a fresh unexported gap to
// close the very gap it fixes. Folding it into this already-tracked, already-wired oracle
// keeps the framework export self-contained with zero new pipeline files.
//
// Failure policy:
//   - Genuine divergence  -> exit 1 (blocks commit; remediation: node .claude/skills/sync-codex/scripts/run-codex-sync.mjs).
//   - Internal gate error -> WARN + exit 0. A freshly-shipped, hard-to-validate gate must
//     not wedge the whole team's commits on its own bugs (fail-open by design).

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { buildSkillReferenceMap } from './compat-rewrite.mjs';
import { isOsMetadataFileName } from '../lib/os-metadata-files.mjs';

// The three sync modules below resolve the project root at MODULE SCOPE
// (`migrate-claude-to-codex.mjs:12`, `sync-context-workflows.mjs`,
// `sync-hooks.mjs:10`) and throw when it cannot be resolved. That eager throw is
// correct for their primary role — they are mutation scripts and genuinely
// cannot run without a root — but a STATIC import here hoists it above this
// file's try/catch, so the fail-open promise documented below was a lie for the
// most likely failure of all: with CLAUDE_PROJECT_DIR pointing at a directory
// without `.claude`, the gate died with a raw stack trace and exit 1 instead of
// WARNing and letting the commit through.
//
// Loading them dynamically INSIDE main() puts their evaluation under that catch,
// where every other internal fault already lives. Fixing it in the modules
// instead would mean making their root resolution lazy and turning their path
// exports into getters — a wider change to three mutation scripts to serve one
// read-only consumer, when the consumer is the party making the fail-open
// promise. `compat-rewrite.mjs` and `../lib/os-metadata-files.mjs` stay static: they resolve no root
// and cannot throw here.
let sync = null;
async function loadSyncModules() {
    if (sync) return sync;
    const [migrate, context, hooks] = await Promise.all([
        import('./migrate-claude-to-codex.mjs'),
        import('./sync-context-workflows.mjs'),
        import('./sync-hooks.mjs')
    ]);
    sync = {
        materializeSkillMirror: migrate.materializeSkillMirror,
        isLocalInstallArtifact: migrate.isLocalInstallArtifact,
        materializeAgentMirror: migrate.materializeAgentMirror,
        claudeSkillsDir: migrate.claudeSkillsDir,
        agentsSkillsDir: migrate.agentsSkillsDir,
        claudeAgentsDir: migrate.claudeAgentsDir,
        codexAgentsDir: migrate.codexAgentsDir,
        runContextSync: context.runContextSync,
        contextPath: context.contextPath,
        agentsPath: context.agentsPath,
        materializeHookMirror: hooks.materializeHookMirror,
        claudeSettingsPath: hooks.claudeSettingsPath
    };
    return sync;
}

const require = createRequire(import.meta.url);
const { resolveProjectRoot, isInvokedAsScript } = require('../lib/project-root.cjs');
const rootResolution = resolveProjectRoot({
    cwd: process.cwd(),
    scriptPath: fileURLToPath(import.meta.url),
    env: process.env,
});

// Files present in the committed mirror but NOT produced by materializeSkillMirror.
// The sentinel is written separately by the writer (writeAgentsSkillsMirrorSentinel);
// excluding it keeps the staging-vs-committed comparison apples-to-apples.
const EXCLUDED_BASENAMES = new Set(['.codex-mirror.json']);
const MAX_REPORTED_DIFFS = 50;

async function pathExists(target) {
    try {
        await fs.access(target);
        return true;
    } catch {
        return false;
    }
}

// Read every file under `dir` into Map<relPosixPath, contentLF>. CRLF is normalized so a
// line-ending-only difference never registers as divergence (the real sync emits LF; we
// compare on LF). Excluded basenames are skipped at any depth, and so is any relative path
// `skip` accepts (used for local install artifacts the mirror's .gitignore already ignores).
// OS metadata files (a file browser recreates them seconds after deletion, so counting them fails
// the gate on a tree that is in sync) are dropped here, in the one walk every compared tree goes
// through, rather than through `exclude`: fresh staging and committed mirror both ignore them and
// no caller can switch the rule off. Files only — a directory by one of those names is still
// walked, so it hides nothing.
export async function readTreeFiles(dir, { exclude = EXCLUDED_BASENAMES, skip = () => false } = {}) {
    const files = new Map();
    async function walk(current) {
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            if (exclude.has(entry.name)) continue;
            const full = path.join(current, entry.name);
            if (skip(path.relative(dir, full))) continue;
            if (entry.isDirectory()) {
                await walk(full);
                continue;
            }
            if (!entry.isFile()) continue;
            if (isOsMetadataFileName(entry.name)) continue;
            const rel = path.relative(dir, full).replaceAll('\\', '/');
            const raw = await fs.readFile(full, 'utf8');
            files.set(rel, raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
        }
    }
    await walk(dir);
    return files;
}

// Pure diff of two Map<relPath, content>. Returns a stable-sorted list of differences.
//   - 'content'           : present in both, bodies differ (stale/hand-edited mirror file)
//   - 'missing-in-mirror' : source produced a file the mirror lacks (forgot to sync)
//   - 'extra-in-mirror'   : mirror has a file with no source counterpart (orphan/hand-add)
export function diffTrees(expected, actual) {
    const diffs = [];
    for (const [rel, content] of expected) {
        if (!actual.has(rel)) {
            diffs.push({ relPath: rel, kind: 'missing-in-mirror' });
        } else if (actual.get(rel) !== content) {
            diffs.push({ relPath: rel, kind: 'content' });
        }
    }
    for (const rel of actual.keys()) {
        if (!expected.has(rel)) {
            diffs.push({ relPath: rel, kind: 'extra-in-mirror' });
        }
    }
    return diffs.sort((a, b) => a.relPath.localeCompare(b.relPath) || a.kind.localeCompare(b.kind));
}

// STRUCTURAL guard the content-equality diff above is blind to: a malformed SYNC
// fence (e.g. an indented or dropped close) present IDENTICALLY in source and
// mirror is "in sync" by equality yet still broken — exactly the symmetric defect
// class that slips past an oracle which only compares bytes. Count ONLY column-0
// fences (`^<!-- /?SYNC:`, line-anchored) — same invariant as the hook suite's
// TC-UAR-006/008; backtick-wrapped fence examples in prose sit mid-line and are
// correctly ignored. Returns one entry per file whose open/close counts differ.
export function findFenceImbalances(files) {
    const problems = [];
    for (const [rel, content] of files) {
        const opens = (content.match(/^<!-- SYNC:/gm) || []).length;
        const closes = (content.match(/^<!-- \/SYNC:/gm) || []).length;
        if (opens !== closes) problems.push({ relPath: rel, opens, closes });
    }
    return problems.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

// CRLF-normalized read; a missing file returns null (surfaced as a divergence by the caller's
// diff, never a crash). The real sync emits LF, so normalization keeps a line-ending-only
// difference from registering as drift — same policy as readTreeFiles.
async function readNormalized(target) {
    try {
        const raw = await fs.readFile(target, 'utf8');
        return raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    } catch {
        return null;
    }
}

// CONTEXT-mirror idempotency check. Re-renders AGENTS.md via the SAME runContextSync the writer
// uses, redirected to a throwaway dir via { outRootDir }, then diffs it against the committed copy.
// The retired .codex/CODEX_CONTEXT.md is never rendered, so a committed one surfaces as an
// 'extra-in-mirror' orphan. Returns a diffTrees-shaped list (keyed by repo-relative POSIX path) so
// reporting is uniform with the skills check. Inputs/baselines are always read from the real repo by
// runContextSync; only the write is redirected. Throws on a failed render so the caller's fail-open catch
// handles an internal fault rather than reporting it as divergence.
// Skips return a `{ skip }` reason like the three sibling checks, NOT an empty
// diff list. Returning `[]` made "nothing to compare" indistinguishable from
// "compared and identical", so the gate printed
// `context: PASS (AGENTS.md in sync)` for a file that
// does not exist — the one sentence a reader would quote as proof they DO. A gate
// may decline to check; it may not report a check it never ran.
async function checkContextMirror(rootDir) {
    const { runContextSync, contextPath, agentsPath } = await loadSyncModules();
    if (!(await pathExists(path.join(rootDir, 'CLAUDE.md')))) {
        return { skip: 'no CLAUDE.md source to mirror' };
    }
    if (!(await pathExists(agentsPath)) && !(await pathExists(contextPath))) {
        return { skip: 'no AGENTS.md mirror yet — run the standalone runner to create it' };
    }

    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-context-check-'));
    try {
        await runContextSync({ outRootDir: staging });
        const agentsRel = path.relative(rootDir, agentsPath).replaceAll('\\', '/');
        const contextRel = path.relative(rootDir, contextPath).replaceAll('\\', '/');

        const freshAgents = await readNormalized(path.join(staging, 'AGENTS.md'));
        if (freshAgents === null) {
            throw new Error('fresh context render did not produce AGENTS.md');
        }
        const expected = new Map([[agentsRel, freshAgents]]);

        const actual = new Map();
        const committedAgents = await readNormalized(agentsPath);
        const committedContext = await readNormalized(contextPath);
        if (committedAgents !== null) actual.set(agentsRel, committedAgents);
        if (committedContext !== null) actual.set(contextRel, committedContext);

        return { diffs: diffTrees(expected, actual) };
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
}

// Reports the .agents/skills mirror diff/fence results. Returns true on any failure.
function reportSkillsResult(diffs, fenceProblems) {
    if (diffs.length === 0 && fenceProblems.length === 0) return false;

    if (diffs.length > 0) {
        console.error('[codex-verify-sync-divergence] FAIL — .agents/skills is out of sync with .claude/skills');
        console.error('Remediation: run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` — or, without npm/package.json, the standalone');
        console.error('orchestrator it delegates to: `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`');
        console.error('(never hand-edit the .agents/.codex mirror).');
        for (const diff of diffs.slice(0, MAX_REPORTED_DIFFS)) {
            console.error(`- [${diff.kind}] .agents/skills/${diff.relPath}`);
        }
        if (diffs.length > MAX_REPORTED_DIFFS) {
            console.error(`- ... and ${diffs.length - MAX_REPORTED_DIFFS} more`);
        }
    }

    if (fenceProblems.length > 0) {
        console.error('[codex-verify-sync-divergence] FAIL — malformed SYNC fences in .agents/skills (structural; equality-blind)');
        console.error('Remediation: fix the column-0 SYNC fence balance in the SOURCE .claude/skills SKILL.md');
        console.error('(an indented/dropped `<!-- /SYNC:tag -->` close), then re-run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs`.');
        for (const problem of fenceProblems.slice(0, MAX_REPORTED_DIFFS)) {
            console.error(`- [fence-imbalance] .agents/skills/${problem.relPath}: ${problem.opens} open / ${problem.closes} close`);
        }
        if (fenceProblems.length > MAX_REPORTED_DIFFS) {
            console.error(`- ... and ${fenceProblems.length - MAX_REPORTED_DIFFS} more`);
        }
    }
    return true;
}

async function checkSkillsMirror() {
    const { materializeSkillMirror, isLocalInstallArtifact, claudeSkillsDir, agentsSkillsDir } = await loadSyncModules();
    if (!(await pathExists(claudeSkillsDir))) {
        return { skip: 'no .claude/skills source to mirror' };
    }
    if (!(await pathExists(agentsSkillsDir))) {
        return { skip: 'no .agents/skills mirror yet — run the standalone runner to create it' };
    }

    const skillDirNames = (await fs.readdir(claudeSkillsDir, { withFileTypes: true }))
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    const skillReferenceMap = buildSkillReferenceMap(skillDirNames);

    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-check-'));
    try {
        await materializeSkillMirror(staging, skillReferenceMap);
        const expected = await readTreeFiles(staging);
        // A local npm/pip install inside the mirror is git-ignored (.agents/.gitignore), so it is
        // not divergence; the writer never produces those paths either.
        const actual = await readTreeFiles(agentsSkillsDir, { skip: isLocalInstallArtifact });
        // Validate the committed mirror's fence structure too. Equality cannot vouch for
        // structure: a symmetric malformed fence passes the diff but fails here.
        return { diffs: diffTrees(expected, actual), fenceProblems: findFenceImbalances(actual), count: expected.size };
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
}

// Codex sub-agent mirror check. Same oracle design as the skills check: re-run the REAL
// writer (materializeAgentMirror) into a throwaway dir and diff against the committed
// .codex/agents tree, so the "expected" output cannot drift from real sync behavior.
// No fence check here — a TOML agent file carries no column-0 SYNC fences; the fence
// invariant is enforced on the Markdown SOURCE under .claude/agents by TC-UAR-006.
async function checkAgentMirror() {
    const { materializeAgentMirror, claudeAgentsDir, codexAgentsDir } = await loadSyncModules();
    if (!(await pathExists(claudeAgentsDir))) {
        return { skip: 'no .claude/agents source to mirror' };
    }
    if (!(await pathExists(codexAgentsDir))) {
        return { skip: 'no .codex/agents mirror yet — run the standalone runner to create it' };
    }

    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-agents-check-'));
    try {
        await materializeAgentMirror(staging);
        const expected = await readTreeFiles(staging);
        const actual = await readTreeFiles(codexAgentsDir);
        return { diffs: diffTrees(expected, actual), count: expected.size };
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
}

// The FOURTH mirror: .codex/hooks.json, generated from .claude/settings.json.
//
// This is the highest-consequence of the four. The other three carry guidance a
// stale copy merely makes wrong; this one decides WHICH HOOKS A CODEX SESSION
// RUNS. A settings.json change that adds or tightens a safety gate leaves the
// Codex host running the OLD gate set until someone re-syncs, and nothing said
// so. Only hooks.json is diffed — the sibling report embeds a `generated_at`
// timestamp, so diffing it would report drift on every run and train readers to
// ignore this gate.
async function checkHookMirror(rootDir) {
    const { materializeHookMirror, claudeSettingsPath } = await loadSyncModules();
    const committed = path.join(rootDir, '.codex', 'hooks.json');
    if (!(await pathExists(claudeSettingsPath))) {
        return { skip: 'no .claude/settings.json source to mirror' };
    }
    if (!(await pathExists(committed))) {
        return { skip: 'no .codex/hooks.json mirror yet — run the standalone runner to create it' };
    }

    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-hooks-check-'));
    try {
        const report = await materializeHookMirror(staging);
        const expected = await fs.readFile(path.join(staging, 'hooks.json'), 'utf8');
        const actual = await fs.readFile(committed, 'utf8');
        const normalize = value => value.replace(/\r\n/g, '\n');
        return {
            inSync: normalize(expected) === normalize(actual),
            unexpectedSkips: unexpectedHookSkips(report)
        };
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
}

// Hooks that the renderer DROPS are invisible to a byte-diff of hooks.json:
// register a hook under an event Codex does not support and the mirror comes out
// byte-identical, this gate says PASS, and a Codex session simply runs fewer
// safety gates than the project configures. That is the same class of silent
// downgrade the hooks check exists to catch, arriving through the one door the
// check does not watch — and it is not guarded anywhere else either, because the
// sibling report that records it is gitignored (`.gitignore:15`), so it is not a
// committed surface any diff could compare.
//
// The baseline is LITERAL and MEASURED, not derived from the renderer: asking
// materializeHookMirror which events it skips would only confirm it skips what it
// skips. A NEW skip, a changed reason, or an UNREVIEWED skipped group is an
// unreviewed loss of coverage and fails the gate until a human either restores
// the hook or moves the entry here on purpose.
//
// REVISED 2026-09-17 against the official Codex hook reference
// (https://learn.chatgpt.com/docs/hooks). The previous baseline asserted that
// "Notification and SessionEnd have no Codex equivalent" and that SessionStart was
// deliberately omitted. Two of those three were wrong, and being wrong HERE is not
// inert — this list is what makes a dropped hook look reviewed:
//   - SessionEnd IS supported by Codex (matcher `other` only). It now mirrors.
//   - SessionStart IS supported (startup|resume|clear|compact). The event-level
//     skip is replaced by a per-hook allowlist (sync-hooks.mjs
//     codexSessionStartMirrors), so producers whose consumers are mirrored are no
//     longer silently unreachable on Codex.
//   - Notification remains absent from the Codex reference, so its skip stands.
// Verify against that doc before editing this map; do not infer an event's
// existence from this repo's own history.
const EXPECTED_SKIPPED_EVENTS = new Map([
    ['Notification', 'unsupported-by-codex'],
    // Reviewed 2026-09-25 (protocol delivery). Codex has no UserPromptExpansion event;
    // an explicit `$skill` on UserPromptSubmit injects the skill with no tool call, so
    // the protocol entries registered on UserPromptExpansion render on UserPromptSubmit
    // instead. Not a drop: the reason records where they went. SubagentStart is NOT
    // here — Codex supports it and it mirrors (a skip of it is a real loss).
    ['UserPromptExpansion', 'remapped-to-user-prompt-submit'],
    // Claude's native failure event is absent from the Codex hook contract
    // (https://learn.chatgpt.com/docs/hooks). The failure reminder keeps its
    // conditional shell PreToolUse path and compact/clear reset on Codex;
    // only the native accelerator is omitted, never a promised failure detector.
    ['PostToolUseFailure', 'unsupported-by-codex']
]);

// Group-level skips that ARE reviewed. Keyed by `${event}:${reason}` rather than
// group_index, which renumbers whenever settings.json gains or loses a group and
// would turn an unrelated edit into a gate failure. Any group skip NOT listed here
// still fails — the point of the gate is that a hook may not quietly stop
// mirroring, and the reasons below are the only ways that is currently intended.
const EXPECTED_SKIPPED_GROUPS = new Set([
    // A SessionStart group carrying no allowlisted producer. Intended: the
    // static-startup-context rationale still governs everything off the allowlist.
    'SessionStart:session-start-not-on-mirror-allowlist',
    // Claude's SessionEnd matcher (clear|exit|compact) has no Codex counterpart —
    // Codex accepts only `other` — so the hook mirrors UNSCOPED rather than not at
    // all. Recorded because running unscoped is a real semantic difference.
    'SessionEnd:matcher-unsupported-on-codex-hook-runs-unscoped',
    // Reviewed 2026-09-25 (protocol delivery). A protocol-entry group keyed only to
    // Claude's Read or Skill tool, neither of which Codex has, so it could never fire
    // there. Codex covers those loads elsewhere: `$skill` on UserPromptSubmit, and the
    // Read group's entries re-rendered on the shell tool (`Bash`). Scoped to protocol
    // entries by the renderer; any other hook keeps its verbatim render.
    'PostToolUse:matcher-names-no-codex-tool'
]);

// Exported so the guard can be tested on SYNTHETIC reports. Driving it only from
// the live renderer would test one arrangement — today's — and could never show
// what it does when a skip actually appears, which is the only case it exists for.
export function unexpectedHookSkips(report) {
    const problems = [];
    for (const entry of report?.skipped_events ?? []) {
        const allowed = EXPECTED_SKIPPED_EVENTS.get(entry.event);
        if (allowed === undefined) {
            problems.push(`event ${entry.event} is now skipped (${entry.reason}) — it was not before`);
        } else if (allowed !== entry.reason) {
            problems.push(`event ${entry.event} is skipped for a new reason: ${entry.reason} (expected ${allowed})`);
        }
    }
    for (const expectedEvent of EXPECTED_SKIPPED_EVENTS.keys()) {
        if (!(report?.skipped_events ?? []).some(entry => entry.event === expectedEvent)) {
            // Not a failure of safety — this direction means MORE is mirrored than
            // before — but the baseline above is now stale and must be re-reviewed.
            problems.push(`event ${expectedEvent} is no longer skipped — update EXPECTED_SKIPPED_EVENTS`);
        }
    }
    for (const group of report?.skipped_groups ?? []) {
        if (EXPECTED_SKIPPED_GROUPS.has(`${group.event}:${group.reason}`)) continue;
        problems.push(`group ${group.event}[${group.group_index}] (matcher ${group.matcher ?? 'none'}) dropped: ${group.reason}`);
    }
    return problems;
}

async function main() {
    const rootDir = rootResolution.rootDir;
    // Record the verdict THE MOMENT a divergence is found, not after every check
    // has run. The caller wraps main() in a fail-open catch, so a throw anywhere
    // downstream — checkHookMirror alone adds mkdtemp/readFile plus an fs.rm in a
    // `finally` — used to discard a divergence that had already been printed,
    // leaving "FAIL — out of sync" on stderr and exit 0. A gate that reports a
    // failure and exits clean is worse than no gate: the commit sails through
    // while the message scrolls past.
    const markFailed = () => { process.exitCode = 1; };

    const skills = await checkSkillsMirror();
    if (skills.skip) {
        console.log(`[codex-verify-sync-divergence] skills: PASS (${skills.skip})`);
    } else if (reportSkillsResult(skills.diffs, skills.fenceProblems)) {
        markFailed();
    } else {
        console.log(`[codex-verify-sync-divergence] skills: PASS (${skills.count} mirror file(s) in sync)`);
    }

    const agents = await checkAgentMirror();
    if (agents.skip) {
        console.log(`[codex-verify-sync-divergence] agents: PASS (${agents.skip})`);
    } else if (agents.diffs.length === 0) {
        console.log(`[codex-verify-sync-divergence] agents: PASS (${agents.count} mirror file(s) in sync)`);
    } else {
        markFailed();
        console.error('[codex-verify-sync-divergence] FAIL — .codex/agents is out of sync with .claude/agents');
        console.error('Remediation: run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` — or the standalone orchestrator:');
        console.error('`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` (never hand-edit the mirror).');
        for (const diff of agents.diffs.slice(0, MAX_REPORTED_DIFFS)) {
            console.error(`- [${diff.kind}] .codex/agents/${diff.relPath}`);
        }
        if (agents.diffs.length > MAX_REPORTED_DIFFS) {
            console.error(`- ... and ${agents.diffs.length - MAX_REPORTED_DIFFS} more`);
        }
    }

    const hooks = await checkHookMirror(rootDir);
    const hookSkipProblems = hooks.unexpectedSkips ?? [];
    if (hooks.skip) {
        console.log(`[codex-verify-sync-divergence] hooks: PASS (${hooks.skip})`);
    } else {
        if (!hooks.inSync) {
            markFailed();
            console.error('[codex-verify-sync-divergence] FAIL — .codex/hooks.json is out of sync with .claude/settings.json');
            console.error('A Codex session is running a DIFFERENT hook set than this project configures.');
            console.error('Remediation: run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` — or the standalone orchestrator:');
            console.error('`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` (never hand-edit the mirror).');
        }
        // Reported SEPARATELY from the byte-diff, and reported even when the diff is
        // clean: a dropped hook leaves hooks.json byte-identical, so "in sync" and
        // "complete" are different claims and only one of them the diff can make.
        if (hookSkipProblems.length > 0) {
            markFailed();
            console.error('[codex-verify-sync-divergence] FAIL — the hook mirror DROPS hooks that .claude/settings.json configures');
            console.error('.codex/hooks.json may be byte-identical and still run fewer gates than this project expects:');
            for (const problem of hookSkipProblems) {
                console.error(`- ${problem}`);
            }
            console.error('Remediation: move the hook to an event Codex supports, or — if the drop is deliberate —');
            console.error('record it in EXPECTED_SKIPPED_EVENTS in this file so the next reader sees it was reviewed.');
        }
        if (hooks.inSync && hookSkipProblems.length === 0) {
            console.log('[codex-verify-sync-divergence] hooks: PASS (.codex/hooks.json in sync, no hooks dropped)');
        }
    }

    const context = await checkContextMirror(rootDir);
    const contextDiffs = context.skip ? [] : context.diffs;
    if (context.skip) {
        console.log(`[codex-verify-sync-divergence] context: PASS (${context.skip})`);
    } else if (contextDiffs.length === 0) {
        console.log('[codex-verify-sync-divergence] context: PASS (AGENTS.md in sync)');
    } else {
        markFailed();
        console.error('[codex-verify-sync-divergence] FAIL — context mirror (AGENTS.md, or a leftover .codex/CODEX_CONTEXT.md) is out of sync');
        console.error('Remediation: run `node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` — or the standalone orchestrator:');
        console.error('`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` (never hand-edit the managed blocks).');
        for (const diff of contextDiffs.slice(0, MAX_REPORTED_DIFFS)) {
            console.error(`- [${diff.kind}] ${diff.relPath}`);
        }
    }

}

const invokedAsScript = isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));
if (invokedAsScript) {
    try {
        await main();
    } catch (err) {
        // Fail-open on the gate's OWN internal failure — but never downgrade a
        // verdict already reached. markFailed() sets process.exitCode at the
        // point of detection, so an exit code set before this throw survives it;
        // this handler only avoids ADDING a failure of its own.
        console.warn(`[codex-verify-sync-divergence] WARN internal error (not blocking commit): ${err?.stack || err}`);
    }
}
