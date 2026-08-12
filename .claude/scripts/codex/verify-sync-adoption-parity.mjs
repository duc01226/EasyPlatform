#!/usr/bin/env node

// SYNC tag <-> carrier adoption parity — enforcement sensor.
//
// Read-only static verifier closing the last unguarded axis of the SYNC-block system: the
// ADOPTION MATRIX. Until now, which review skill carries which SYNC tag was asserted by nothing.
// 4 of 6 matrix tags had no sensor at all, and the axis had already drifted twice in practice
// (a skill carrying a tag it was never declared for), silently, because a missing or stale
// injected block produces no error anywhere — the skill simply loses a protocol it should have.
//
// DESIGN CONSTRAINT (deliberate): this verifier declares NO adoption list of its own. It PARSES
// the matrix out of the Python injector (`.claude/scripts/inject_review_skill_blocks.py`), which
// is the authoring source of truth for adoption. Hard-coding a Node copy would have created a
// THIRD hand-maintained list across a second language boundary — duplicated knowledge is the
// exact failure this sensor exists to catch, so reproducing it here would be self-defeating.
// Consequence: the injector's lists and this sensor cannot disagree by construction.
//
// Three assertions over every (tag, skill) pair in the parsed matrix:
//   1. DECLARED-BUT-MISSING (FAIL) — a declared carrier MUST contain exactly one main block
//      pair (`<!-- SYNC:tag -->` / `<!-- /SYNC:tag -->`) AND exactly one `:reminder` pair.
//      A declared carrier missing either pair has silently lost the protocol.
//   2. UNDECLARED CARRIER (FAIL) — a skill carrying a matrix tag while absent from that tag's
//      list. This is the drift that already happened twice: the injector will never refresh
//      such a block when canonical changes, so it fossilizes at whatever text it was born with.
//   3. CANONICAL PARITY (FAIL) — an injected main/reminder block body MUST byte-match the
//      canonical body in `.claude/skills/shared/sync-inline-versions.md`. A drifted copy means
//      carriers disagree about a protocol that is supposed to be single-sourced.
//
// Exit non-zero on any violation. Fail-soft (warn + continue) on an unreadable skill file so an
// unexpected file cannot crash the sync pipeline; only a real parity gap is a hard failure.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = process.cwd();
const TAG = '[codex-verify-sync-adoption-parity]';

const INJECTOR = path.join(rootDir, '.claude', 'scripts', 'inject_review_skill_blocks.py');
const CANONICAL = path.join(rootDir, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const SKILLS_DIR = path.join(rootDir, '.claude', 'skills');

const normalizeEol = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

/**
 * Parse the adoption matrix out of the Python injector.
 *
 * Reads the `NAME = [ "skill", ... ]` list literals plus the `MATRIX = [ ("SYNC:tag", NAME), ... ]`
 * pairing, so the Node sensor and the Python injector share ONE declaration. Also resolves the
 * `NAME = list(OTHER)` aliasing form the injector uses for co-paired tags.
 */
export function parseAdoptionMatrix(py) {
    const lists = new Map();

    // Direct list literals: NAME = [ "a", "b", ... ]  (multi-line, comments tolerated)
    for (const m of py.matchAll(/^([A-Z_][A-Z0-9_]*)\s*=\s*\[([^\]]*)\]/gm)) {
        const [, name, body] = m;
        const items = [...body.matchAll(/"([^"]+)"/g)].map((x) => x[1]);
        if (items.length) lists.set(name, items);
    }
    // Alias form: NAME = list(OTHER)
    for (const m of py.matchAll(/^([A-Z_][A-Z0-9_]*)\s*=\s*list\(([A-Z_][A-Z0-9_]*)\)/gm)) {
        const [, name, src] = m;
        if (lists.has(src)) lists.set(name, [...lists.get(src)]);
    }

    const matrixBlock = py.match(/^MATRIX\s*=\s*\[([\s\S]*?)^\]/m);
    if (!matrixBlock) return null;

    const matrix = [];
    for (const m of matrixBlock[1].matchAll(/\(\s*"([^"]+)"\s*,\s*([A-Z_][A-Z0-9_]*)\s*\)/g)) {
        const [, tag, listName] = m;
        const skills = lists.get(listName);
        if (!skills) return { error: `MATRIX references unknown list ${listName}` };
        matrix.push({ tag, listName, skills });
    }
    return matrix.length ? matrix : null;
}

/** Canonical body for `## SYNC:tag` in sync-inline-versions.md (stops at the next `## SYNC:` heading). */
export function canonicalBody(canonicalMd, tag) {
    const lines = canonicalMd.split('\n');
    const start = lines.findIndex((l) => l.trim() === `## ${tag}`);
    if (start === -1) return null;
    const rest = lines.slice(start + 1);
    let end = rest.findIndex((l) => /^## SYNC:/.test(l.trim()));
    if (end === -1) end = rest.length;
    return rest
        .slice(0, end)
        .join('\n')
        .replace(/^\s*\n/, '')
        .replace(/\n---\s*$/, '')
        .trim();
}

/** All occurrences of the exact main-block pair for `tag` (never matching `tag:reminder`). */
export function blockPairs(md, tag) {
    const open = `<!-- ${tag} -->`;
    const close = `<!-- /${tag} -->`;
    const bodies = [];
    let idx = 0;
    for (;;) {
        const o = md.indexOf(open, idx);
        if (o === -1) break;
        // Guard the `tag` vs `tag:reminder` ambiguity: the literal open string already ends in
        // ` -->` so `SYNC:x -->` cannot match `SYNC:x:reminder -->`. Nothing further needed.
        const c = md.indexOf(close, o + open.length);
        if (c === -1) {
            bodies.push({ unterminated: true });
            break;
        }
        bodies.push({ body: md.slice(o + open.length, c).trim() });
        idx = c + close.length;
    }
    return bodies;
}

/**
 * PURE parity check — all three assertions, no I/O.
 *
 * @param {{matrix: Array, canonicalMd: string, skillText: Map<string,string>}} input
 * @returns {{missing: string[], undeclared: string[], drifted: string[], warnings: string[], pairsChecked: number}}
 */
export function findParityViolations({ matrix, canonicalMd, skillText }) {
    const missing = [];
    const undeclared = [];
    const drifted = [];
    const warnings = [];
    let pairsChecked = 0;

    for (const { tag, listName, skills } of matrix) {
        const reminderTag = `${tag}:reminder`;
        const wantMain = canonicalBody(canonicalMd, tag);
        const wantReminder = canonicalBody(canonicalMd, reminderTag);
        if (wantMain === null) {
            warnings.push(`canonical source has no '## ${tag}' section — parity unverifiable for this tag`);
        }
        if (wantReminder === null) {
            warnings.push(`canonical source has no '## ${reminderTag}' section — reminder parity unverifiable`);
        }

        const declared = new Set(skills);

        // 1 + 3: declared carriers must carry both pairs, byte-matching canonical.
        for (const skill of skills) {
            const md = skillText.get(skill);
            if (md === undefined) {
                warnings.push(`declared carrier '${skill}' has no readable SKILL.md — skipped`);
                continue;
            }
            pairsChecked += 1;
            for (const [t, want] of [[tag, wantMain], [reminderTag, wantReminder]]) {
                const found = blockPairs(md, t);
                if (found.length !== 1 || found[0].unterminated) {
                    missing.push(
                        `${skill} :: ${t} — expected exactly 1 complete block, found ${found.length}` +
                        `${found[0]?.unterminated ? ' (unterminated)' : ''}  [declared in ${listName}]`,
                    );
                    continue;
                }
                if (want !== null && found[0].body !== want) {
                    drifted.push(`${skill} :: ${t} — injected body differs from canonical (re-run the injector)`);
                }
            }
        }

        // 2: a skill carrying the tag while absent from its list.
        for (const [skill, md] of skillText) {
            if (declared.has(skill)) continue;
            if (blockPairs(md, tag).length > 0) {
                undeclared.push(`${skill} :: ${tag} — carries the block but is ABSENT from ${listName}`);
            }
        }
    }

    return { missing, undeclared, drifted, warnings, pairsChecked };
}

async function readIfExists(p) {
    try {
        return normalizeEol(await fs.readFile(p, 'utf8'));
    } catch {
        return null;
    }
}

async function main() {
    const py = await readIfExists(INJECTOR);
    if (!py) {
        console.error(`${TAG} FAIL — cannot read injector: ${path.relative(rootDir, INJECTOR)}`);
        return 1;
    }
    const canonicalMd = await readIfExists(CANONICAL);
    if (!canonicalMd) {
        console.error(`${TAG} FAIL — cannot read canonical source: ${path.relative(rootDir, CANONICAL)}`);
        return 1;
    }

    const matrix = parseAdoptionMatrix(py);
    if (!matrix || matrix.error) {
        console.error(`${TAG} FAIL — could not parse the adoption matrix (${matrix?.error ?? 'no MATRIX found'}).`);
        console.error(`${TAG} The injector's MATRIX/list shape changed; update the parser rather than adding a second list here.`);
        return 1;
    }

    // Enumerate every skill dir once so undeclared carriers are discoverable.
    let allSkills = [];
    try {
        allSkills = (await fs.readdir(SKILLS_DIR, { withFileTypes: true }))
            .filter((d) => d.isDirectory())
            .map((d) => d.name);
    } catch {
        console.error(`${TAG} FAIL — cannot enumerate ${path.relative(rootDir, SKILLS_DIR)}`);
        return 1;
    }

    const skillText = new Map();
    for (const name of allSkills) {
        const md = (await readIfExists(path.join(SKILLS_DIR, name, 'SKILL.md')))
            ?? (await readIfExists(path.join(SKILLS_DIR, name, 'skill.md')));
        if (md !== null) skillText.set(name, md);
    }

    const { missing, undeclared, drifted, warnings, pairsChecked } =
        findParityViolations({ matrix, canonicalMd, skillText });

    for (const w of warnings) console.warn(`${TAG} WARN — ${w}`);

    const fail = missing.length || undeclared.length || drifted.length;
    if (!fail) {
        console.log(
            `${TAG} PASS (${matrix.length} tag(s), ${pairsChecked} declared carrier(s) checked; ` +
            `adoption matrix parsed from the injector — no second list maintained here)`,
        );
        return 0;
    }

    if (missing.length) {
        console.error(`${TAG} FAIL — declared carrier missing its block (${missing.length}):`);
        for (const m of missing) console.error(`  - ${m}`);
    }
    if (undeclared.length) {
        console.error(`${TAG} FAIL — undeclared carrier, injector will never refresh it (${undeclared.length}):`);
        for (const u of undeclared) console.error(`  - ${u}`);
        console.error(`${TAG} Fix by EITHER adding the skill to the tag's list in inject_review_skill_blocks.py`);
        console.error(`${TAG} (if it should carry the tag) OR removing the stale block from the skill (if it should not).`);
    }
    if (drifted.length) {
        console.error(`${TAG} FAIL — injected body drifted from canonical (${drifted.length}):`);
        for (const d of drifted) console.error(`  - ${d}`);
        console.error(`${TAG} Remediation: python .claude/scripts/inject_review_skill_blocks.py`);
    }
    return 1;
}

// Run ONLY when invoked directly. Importing this module (tests reuse the pure helpers above)
// must not execute the verification — matches verify-review-validate-coverage.mjs.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    await main().then(
        (code) => process.exit(code),
        (err) => {
            console.error(`${TAG} FAIL — unexpected error: ${err?.stack ?? err}`);
            process.exit(1);
        },
    );
}
