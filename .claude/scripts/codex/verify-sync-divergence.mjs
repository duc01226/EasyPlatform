#!/usr/bin/env node

// Codex sync-divergence oracle gate.
//
// Re-runs the REAL mirror transform (migrate-claude-to-codex.mjs > materializeSkillMirror)
// into a throwaway staging dir, then diffs that fresh output against the committed
// .agents/skills mirror. Any difference means the mirror is stale (someone edited
// .claude/skills without running `npm run codex:sync`) or was hand-edited directly.
//
// Oracle design (vs re-implementing the Codex dialect transform): the checker and the
// writer call the SAME materializeSkillMirror, so the "expected" output cannot drift
// from real sync behavior. The intentional dialect rewrites (/skill -> $skill, TaskCreate
// -> task tracking, version: strip, compat-note prepend, project-reference block, etc.)
// are reproduced for free because they ARE the real transform.
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

async function main() {
    if (!(await pathExists(claudeSkillsDir))) {
        console.log('[codex-verify-sync-divergence] PASS (no .claude/skills source to mirror)');
        return;
    }
    if (!(await pathExists(agentsSkillsDir))) {
        console.log('[codex-verify-sync-divergence] PASS (no .agents/skills mirror yet — run npm run codex:sync to create it)');
        return;
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
        const diffs = diffTrees(expected, actual);

        if (diffs.length === 0) {
            console.log(`[codex-verify-sync-divergence] PASS (${expected.size} mirror file(s) in sync)`);
            return;
        }

        console.error('[codex-verify-sync-divergence] FAIL — .agents/skills is out of sync with .claude/skills');
        console.error('Remediation: run `npm run codex:sync` (never hand-edit the .agents/.codex mirror).');
        for (const diff of diffs.slice(0, MAX_REPORTED_DIFFS)) {
            console.error(`- [${diff.kind}] .agents/skills/${diff.relPath}`);
        }
        if (diffs.length > MAX_REPORTED_DIFFS) {
            console.error(`- ... and ${diffs.length - MAX_REPORTED_DIFFS} more`);
        }
        process.exitCode = 1;
    } finally {
        await fs.rm(staging, { recursive: true, force: true });
    }
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
