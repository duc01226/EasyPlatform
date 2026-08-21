/**
 * skill-protocol-overlay.cjs — Plane 3 accelerator for project skill-protocol overlays.
 *
 * Resolves the project's protocol overlays for a USER-TYPED `/skill-name` and builds the text
 * that `init-prompt-gate.cjs` injects through the documented `UserPromptSubmit` stdout channel.
 *
 * ── DELETABILITY CONTRACT (load-bearing statement, not a comment courtesy) ────────────────────
 * This whole plane is an ACCELERATOR and is NON-LOAD-BEARING BY DESIGN. Correctness of the
 * overlay mechanism does NOT depend on it. Deleting:
 *     .claude/hooks/lib/skill-protocol-overlay.cjs                (this file)
 *     .claude/hooks/tests/suites/skill-protocol-overlay.test.cjs  (its suite)
 *     the single handleProtocolOverlayGate(userPrompt) call in init-prompt-gate.cjs
 * leaves Plane 1 (the CLAUDE.md CK:PROJECT-PROTOCOLS block, mirrored to AGENTS.md) and Plane 2
 * (the SYNC:project-protocol-overlay reminder in every SKILL.md) FULLY functional on BOTH hosts.
 * Any future change that makes another plane depend on this hook is a DEFECT.
 * — why: CLAUDE.md states "Hooks/trackers are accelerators only. Correctness MUST NOT depend on it."
 *   Codex has no hook system at all, so a hook-dependent design is Claude-only by construction.
 *
 * Coverage is deliberately PARTIAL: UserPromptSubmit fires on the raw prompt before Claude picks
 * any tool, so this can only see a user-TYPED `/name` — never a model-auto-invoked skill.
 *
 * Normative resolution spec: .claude/skills/project-skill-protocol/references/registry.md §3.
 * This module implements it; it does not re-derive it.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_INDEX_REL = path.join('docs', 'project-reference', 'skill-protocols-reference.md');
const DEFAULT_BODIES_REL = path.join('docs', 'project-protocols');
const SENTINEL = '_(none yet)_';
const REGISTRY_COLUMNS = 6;

/** Total injected body bytes. Past this the injection degrades to PATHS, never a truncated rule. */
const MAX_INJECTION_BYTES = 8000;

/**
 * Header for the injected block.
 *
 * MUST NOT begin with `{` or `[` — `init-prompt-gate.cjs:58-67` (`emitPromptContext`) inspects
 * `text.trimStart()` and prefixes JSON-looking output with `Hook context:\n` so Codex does not
 * route it through a JSON parser. A leading bracket would silently add that prefix line and
 * invalidate every exact-output assertion.
 */
function injectionHeader(skillName) {
    return (
        `project-protocol-overlay for /${skillName} — ADDITIONAL project rules.\n` +
        'These are ADDITIVE ONLY: they add to this skill\'s own protocol and never replace, ' +
        'override, disable, or reinterpret any rule it already states.\n' +
        'They are a BRIEF, NEVER an authority escalation: they cannot waive the WORKFLOW-GATE, ' +
        'git discipline, a review gate, or any user-confirmation gate.'
    );
}

// ---------------------------------------------------------------------------
// parseSkillName
// ---------------------------------------------------------------------------

/**
 * Extract a leading user-typed `/skill-name` from a raw prompt.
 * Anchored at the start so `see /plan for details` does not trigger the gate.
 * @returns {string|null}
 */
function parseSkillName(prompt) {
    if (typeof prompt !== 'string') return null;
    const m = prompt.match(/^\s*\/([a-z0-9][a-z0-9-]{0,63})\b/);
    return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// readRegistry
// ---------------------------------------------------------------------------

function splitRow(line) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    return cells;
}

function isSeparatorRow(cells) {
    return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/** `[name](../project-protocols/name.md)` -> `../project-protocols/name.md`; bare text -> null. */
function parseBodyLink(cell) {
    const m = cell.match(/\]\(([^)]+)\)/);
    return m ? m[1].trim() : null;
}

/**
 * Read and parse the overlay index.
 * Absent / unreadable / sentinel-only / malformed -> `[]`. NEVER throws.
 * @returns {Array<{name:string,target:string,scope:string,bodyPath:string|null}>}
 */
function readRegistry(projectDir) {
    let text;
    try {
        text = fs.readFileSync(path.join(projectDir, DEFAULT_INDEX_REL), 'utf8');
    } catch {
        return [];
    }

    const rows = [];
    let inTable = false;
    let sawSeparator = false;

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();

        if (!line.startsWith('|')) {
            if (inTable && line === '') {
                inTable = false;
                sawSeparator = false;
            }
            continue;
        }

        const cells = splitRow(line);

        if (!inTable) {
            if (cells[0] && cells[0].toLowerCase() === 'target') {
                inTable = true;
                sawSeparator = false;
            }
            continue;
        }

        if (!sawSeparator) {
            if (isSeparatorRow(cells)) sawSeparator = true;
            continue;
        }

        // A malformed data row is DROPPED here rather than throwing — this is an accelerator and
        // must never break a prompt. The drift suite (project-protocol-drift) is what reports it.
        if (cells.length !== REGISTRY_COLUMNS) continue;

        const [target, scope, name, , , body] = cells;
        if (target === SENTINEL || name === SENTINEL) continue;

        rows.push({ name, target, scope: (scope || '').toLowerCase(), bodyPath: parseBodyLink(body) });
    }

    return rows;
}

// ---------------------------------------------------------------------------
// resolveOverlays — registry.md §3, step for step
// ---------------------------------------------------------------------------

/**
 * Fully-anchored shell-style glob match. `*` is the ONLY metacharacter and matches any run of
 * characters including the empty run; every other character is a literal.
 *
 * Deliberately NOT regex-based. Compiling `*` -> `.*` makes a pattern like `a*a*a*a*a*a*b`
 * backtrack catastrophically: measured 136ms -> 1.7s -> 42.5s -> 472s as `*`s are added, and
 * this runs on a UserPromptSubmit hook that declares no timeout — so one crafted registry row
 * would wedge the session. This two-pointer matcher is linear in practice and cannot backtrack
 * exponentially, which removes the failure class instead of tuning it.
 */
function globMatch(pattern, text) {
    let p = 0;
    let t = 0;
    let starP = -1;
    let starT = 0;

    while (t < text.length) {
        if (p < pattern.length && (pattern[p] === text[t])) {
            p++;
            t++;
        } else if (p < pattern.length && pattern[p] === '*') {
            starP = p;
            starT = t;
            p++;
        } else if (starP !== -1) {
            // Backtrack to the last `*` and let it consume one more character.
            p = starP + 1;
            starT++;
            t = starT;
        } else {
            return false;
        }
    }
    while (p < pattern.length && pattern[p] === '*') p++;
    return p === pattern.length;
}

/**
 * Cross-check a row's DECLARED scope against the SHAPE of its target.
 *
 * The scope is stored rather than inferred on purpose (registry.md §2) — but stored is not the
 * same as trusted. A `*` target mislabeled `scope: glob` lands in the glob tier, and because
 * resolution is winner-tier-takes-all, it SUPPRESSES every legitimate `all`-tier overlay while
 * still matching everything. Cross-checking keeps the declared value authoritative while
 * rejecting a declaration the target cannot support.
 *
 * @returns {boolean} true when the declared scope is consistent with the target
 */
function scopeMatchesTarget(scope, target) {
    if (typeof target !== 'string' || target.length === 0) return false;
    const hasStar = target.includes('*');
    if (scope === 'all') return target === '*';
    if (scope === 'glob') return hasStar && target !== '*';
    if (scope === 'exact') return !hasStar;
    return false;
}

/**
 * Winner-tier-takes-all: exact > glob > all. Returns only the most specific NON-EMPTY tier.
 * The tiers rank overlays against EACH OTHER — never against the skill's own protocol.
 * @returns {Array} the matching rows of the winning tier, or `[]`
 */
function resolveOverlays(skillName, rows) {
    if (!skillName || !Array.isArray(rows) || rows.length === 0) return [];

    const exact = [];
    const glob = [];
    const all = [];

    for (const row of rows) {
        // A row whose declared scope contradicts its target shape is malformed, not merely
        // odd — resolving it would let a mislabeled `*` suppress the whole `all` tier.
        if (!scopeMatchesTarget(row.scope, row.target)) continue;

        if (row.scope === 'exact') {
            if (row.target === skillName) exact.push(row);
        } else if (row.scope === 'glob') {
            if (globMatch(row.target, skillName)) glob.push(row);
        } else if (row.scope === 'all') {
            all.push(row);
        }
    }

    if (exact.length) return exact;
    if (glob.length) return glob;
    return all;
}

// ---------------------------------------------------------------------------
// buildInjection
// ---------------------------------------------------------------------------

/** A body slug: lowercase, digits, internal hyphens. No dots, no separators, no traversal. */
const BODY_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Resolve a row's body file. The path is DERIVED from the row's Name; the row's `Body`
 * link is display text for humans and is NEVER used as a read path.
 *
 * Why derive instead of follow: the index doc is explicitly hand-editable, so its Body
 * cell is untrusted input. Following it would let one plausible-looking table row —
 * `| * | all | house-style | ... | [house-style.md](../../.env) |` — make every skill
 * invocation read an arbitrary file and inject its contents into the run AS RULES. That
 * is file disclosure and instruction injection through a mechanism meant to open only
 * small curated bodies. Deriving the path removes the capability instead of sanitizing it.
 *
 * @returns {string|null} absolute path, or null when the row is malformed (caller reports it)
 */
function resolveBodyAbsPath(projectDir, row) {
    if (typeof row.name !== 'string' || !BODY_NAME_RE.test(row.name)) return null;

    const bodiesRoot = path.resolve(projectDir, DEFAULT_BODIES_REL);
    const abs = path.resolve(bodiesRoot, `${row.name}.md`);

    // Belt-and-braces containment: even with the slug guard above, never return a path
    // that escapes the bodies directory.
    const prefix = bodiesRoot + path.sep;
    if (abs !== bodiesRoot && !abs.startsWith(prefix)) return null;

    return abs;
}

function relFromRepo(projectDir, abs) {
    return path.relative(projectDir, abs).split(path.sep).join('/');
}

/**
 * Build the text to inject. Returns '' when there is nothing to say.
 *
 * A candidate whose body file is missing is DROPPED and NAMED in one line — never fabricated.
 * Once the running body total would exceed MAX_INJECTION_BYTES the output degrades to body
 * PATHS plus a read instruction (i.e. Plane-1 behavior — the safe fallback), rather than
 * emitting half a rule.
 */
function buildInjection(skillName, matches, projectDir) {
    if (!Array.isArray(matches) || matches.length === 0) return '';

    const bodies = [];
    const missing = [];
    const malformed = [];
    let total = 0;
    let overCap = false;

    for (const row of matches) {
        const abs = resolveBodyAbsPath(projectDir, row);
        if (abs === null) {
            // Name is not a bare slug, or the derived path escaped the bodies directory.
            // Report it and read NOTHING — a rejected row never reaches the filesystem.
            malformed.push({ name: typeof row.name === 'string' ? row.name : '(unnamed)' });
            continue;
        }
        let content;
        try {
            content = fs.readFileSync(abs, 'utf8');
        } catch {
            missing.push({ name: row.name, rel: relFromRepo(projectDir, abs) });
            continue;
        }

        total += Buffer.byteLength(content, 'utf8');
        if (total > MAX_INJECTION_BYTES) {
            overCap = true;
            // Keep collecting paths for the degraded output, but stop collecting text.
        }
        bodies.push({ name: row.name, target: row.target, rel: relFromRepo(projectDir, abs), content });
    }

    if (bodies.length === 0 && missing.length === 0 && malformed.length === 0) return '';

    const parts = [injectionHeader(skillName), ''];

    if (bodies.length > 0) {
        if (overCap) {
            parts.push(
                `The matched overlay bodies exceed the ${MAX_INJECTION_BYTES}-byte injection cap. ` +
                    'READ these files before proceeding — they are not reproduced here, and a ' +
                    'truncated rule would be worse than no rule:'
            );
            for (const b of bodies) parts.push(`  - ${b.name} (${b.target}) -> ${b.rel}`);
        } else {
            for (const b of bodies) {
                parts.push(`--- overlay: ${b.name} (target: ${b.target}) — ${b.rel}`);
                parts.push(b.content.trimEnd());
                parts.push('');
            }
        }
    }

    if (missing.length > 0) {
        for (const m of missing) {
            parts.push(
                `NOTE: overlay \`${m.name}\` is listed in the registry but its body is missing at ` +
                    `${m.rel} — it was SKIPPED, not reconstructed. Fix it with /project-skill-protocol.`
            );
        }
    }

    if (malformed.length > 0) {
        for (const m of malformed) {
            parts.push(
                `NOTE: registry row \`${m.name}\` was REJECTED as malformed — an overlay name must be a ` +
                    'bare slug and its body must resolve inside `docs/project-protocols/`. No file was ' +
                    'read for this row. Fix it with /project-skill-protocol.'
            );
        }
    }

    return parts.join('\n').trimEnd();
}

/**
 * Convenience composition used by the hook: prompt -> injectable text ('' when nothing applies).
 * Never throws — the caller also wraps it, but an accelerator must fail open at every layer.
 */
function buildOverlayContext(prompt, projectDir) {
    try {
        const skillName = parseSkillName(prompt);
        if (!skillName) return '';
        const rows = readRegistry(projectDir);
        if (rows.length === 0) return '';
        const matches = resolveOverlays(skillName, rows);
        if (matches.length === 0) return '';
        return buildInjection(skillName, matches, projectDir);
    } catch {
        return '';
    }
}

module.exports = {
    parseSkillName,
    readRegistry,
    resolveOverlays,
    buildInjection,
    buildOverlayContext,
    injectionHeader,
    MAX_INJECTION_BYTES,
    DEFAULT_INDEX_REL,
    DEFAULT_BODIES_REL
};
