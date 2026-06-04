#!/usr/bin/env node

// Codex sync-divergence oracle gate.
//
// Guards TWO committed-mirror surfaces against a fresh regeneration:
//   (1) the .agents/skills mirror (materializeSkillMirror), and
//   (2) the CONTEXT mirror — AGENTS.md + .codex/CODEX_CONTEXT.md (runContextSync).
// Each re-runs the REAL writer into a throwaway staging dir, then diffs that fresh output
// against the committed copy. Any difference means the mirror is stale (someone edited
// .claude/** without running `npm run codex:sync`) or was hand-edited directly.
//
// Oracle design (vs re-implementing the transforms): the checker and the writer call the
// SAME functions (materializeSkillMirror / runContextSync), so the "expected" output cannot
// drift from real sync behavior. The intentional dialect rewrites (/skill -> $skill,
// TaskCreate -> task tracking, version: strip, compat-note prepend, project-reference block,
// etc.) are reproduced for free because they ARE the real transform.
//
// Why the CONTEXT check lives HERE rather than in a new standalone file: a new pipeline
// script would itself have to be git-tracked to ship in the portable export (export-claude
// ships `git ls-files .claude`) — adding a fresh untracked-until-staged portability gap to
// close the very gap it fixes. Folding it into this already-tracked, already-wired oracle
// keeps the framework export self-contained with zero new pipeline files.
//
// Failure policy:
//   - Genuine divergence  -> exit 1 (blocks commit; remediation: npm run codex:sync).
//   - Internal gate error -> WARN + exit 0. A freshly-shipped, hard-to-validate gate must
//     not wedge the whole team's commits on its own bugs (fail-open by design).

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkillReferenceMap } from './compat-rewrite.mjs';
import { materializeSkillMirror, claudeSkillsDir, agentsSkillsDir } from './migrate-claude-to-codex.mjs';
import { runContextSync, contextPath, agentsPath } from './sync-context-workflows.mjs';

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
// compare on LF). Excluded basenames are skipped at any depth.
export async function readTreeFiles(dir, { exclude = EXCLUDED_BASENAMES } = {}) {
    const files = new Map();
    async function walk(current) {
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            if (exclude.has(entry.name)) continue;
            const full = path.join(current, entry.name);
            if (entry.isDirectory()) {
                await walk(full);
                continue;
            }
            if (!entry.isFile()) continue;
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

// CONTEXT-mirror idempotency check. Re-renders the two context outputs via the SAME
// runContextSync the writer uses, redirected to a throwaway dir via { outRootDir }, then
// diffs the fresh AGENTS.md + .codex/CODEX_CONTEXT.md against the committed copies. Returns a
// diffTrees-shaped list (keyed by repo-relative POSIX path) so reporting is uniform with the
// skills check. Inputs/baselines are always read from the real repo by runContextSync; only
// the two writes are redirected. Throws on a failed render so the caller's fail-open catch
// handles an internal fault rather than reporting it as divergence.
async function checkContextMirror(rootDir) {
    if (!(await pathExists(path.join(rootDir, 'CLAUDE.md')))) return [];
    if (!(await pathExists(agentsPath)) && !(await pathExists(contextPath))) return [];

    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-context-check-'));
    try {
        await runContextSync({ outRootDir: staging });
        const agentsRel = path.relative(rootDir, agentsPath).replaceAll('\\', '/');
        const contextRel = path.relative(rootDir, contextPath).replaceAll('\\', '/');

        const freshAgents = await readNormalized(path.join(staging, 'AGENTS.md'));
        const freshContext = await readNormalized(path.join(staging, '.codex', 'CODEX_CONTEXT.md'));
        if (freshAgents === null || freshContext === null) {
            throw new Error('fresh context render did not produce AGENTS.md + CODEX_CONTEXT.md');
        }
        const expected = new Map([[agentsRel, freshAgents], [contextRel, freshContext]]);

        const actual = new Map();
        const committedAgents = await readNormalized(agentsPath);
        const committedContext = await readNormalized(contextPath);
        if (committedAgents !== null) actual.set(agentsRel, committedAgents);
        if (committedContext !== null) actual.set(contextRel, committedContext);

        return diffTrees(expected, actual);
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
}

// Reports the .agents/skills mirror diff/fence results. Returns true on any failure.
function reportSkillsResult(diffs, fenceProblems) {
    if (diffs.length === 0 && fenceProblems.length === 0) return false;

    if (diffs.length > 0) {
        console.error('[codex-verify-sync-divergence] FAIL — .agents/skills is out of sync with .claude/skills');
        console.error('Remediation: run `npm run codex:sync` — or, without npm/package.json, the standalone');
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
        console.error('(an indented/dropped `<!-- /SYNC:tag -->` close), then re-run `npm run codex:sync`.');
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
    if (!(await pathExists(claudeSkillsDir))) {
        return { skip: 'no .claude/skills source to mirror' };
    }
    if (!(await pathExists(agentsSkillsDir))) {
        return { skip: 'no .agents/skills mirror yet — run npm run codex:sync to create it' };
    }

    const skillDirNames = (await fs.readdir(claudeSkillsDir, { withFileTypes: true }))
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    const skillReferenceMap = buildSkillReferenceMap(skillDirNames);

    const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sync-check-'));
    try {
        await materializeSkillMirror(staging, skillReferenceMap);
        const expected = await readTreeFiles(staging);
        const actual = await readTreeFiles(agentsSkillsDir);
        // Validate the committed mirror's fence structure too. Equality cannot vouch for
        // structure: a symmetric malformed fence passes the diff but fails here.
        return { diffs: diffTrees(expected, actual), fenceProblems: findFenceImbalances(actual), count: expected.size };
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
}

async function main() {
    const rootDir = process.cwd();
    let failed = false;

    const skills = await checkSkillsMirror();
    if (skills.skip) {
        console.log(`[codex-verify-sync-divergence] skills: PASS (${skills.skip})`);
    } else if (reportSkillsResult(skills.diffs, skills.fenceProblems)) {
        failed = true;
    } else {
        console.log(`[codex-verify-sync-divergence] skills: PASS (${skills.count} mirror file(s) in sync)`);
    }

    const contextDiffs = await checkContextMirror(rootDir);
    if (contextDiffs.length === 0) {
        console.log('[codex-verify-sync-divergence] context: PASS (AGENTS.md + .codex/CODEX_CONTEXT.md in sync)');
    } else {
        failed = true;
        console.error('[codex-verify-sync-divergence] FAIL — context mirror (AGENTS.md / .codex/CODEX_CONTEXT.md) is out of sync');
        console.error('Remediation: run `npm run codex:sync` — or the standalone orchestrator:');
        console.error('`node .claude/skills/sync-codex/scripts/run-codex-sync.mjs` (never hand-edit the managed blocks).');
        for (const diff of contextDiffs.slice(0, MAX_REPORTED_DIFFS)) {
            console.error(`- [${diff.kind}] ${diff.relPath}`);
        }
    }

    if (failed) process.exitCode = 1;
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsScript) {
    try {
        await main();
    } catch (err) {
        // Fail-open: never block commits on the gate's own internal failure.
        console.warn(`[codex-verify-sync-divergence] WARN internal error (not blocking commit): ${err?.stack || err}`);
    }
}
