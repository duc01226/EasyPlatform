/**
 * skill-protocol-overlay.cjs — resolves the project's skill-protocol overlays for a skill that is
 * about to run and builds the short reminder `skill-overlay-remind.cjs` injects.
 *
 * The overlay rules themselves live in the universal protocol `project-protocol-overlay`
 * (`.claude/skills/shared/sync-inline-versions.md`): the model resolves and reads the overlays. This
 * module only finds the matching body files, so the hook can name them when a skill activates.
 * Nothing is reproduced: the reminder lists paths, never bodies, and stays silent when the registry is
 * absent or empty, no row matches, or any read fails.
 *
 * Normative resolution spec: .claude/skills/project-skill-protocol/references/registry.md §3.
 * This module implements it; it does not re-derive it.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_REFERENCE_ROOT_REL = path.join('docs', 'project-reference');
const DEFAULT_INDEX_FILENAME = 'skill-protocols-reference.md';
const DEFAULT_INDEX_REL = path.join(DEFAULT_REFERENCE_ROOT_REL, DEFAULT_INDEX_FILENAME);
const DEFAULT_BODIES_REL = path.join('docs', 'project-protocols');
const SENTINEL = '_(none yet)_';
const REGISTRY_COLUMNS = 6;
/** The most overlay paths one reminder names; the rest stay in the registry. */
const MAX_REMINDER_PATHS = 8;

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

/** Return a normalized project-relative path, or null for absolute/traversing/ambiguous input. */
function normalizeProjectRelative(value) {
    if (typeof value !== 'string' || !value.trim() || value.includes('\0')) return null;
    const slashPath = value.trim().replace(/\\/g, '/');
    if (slashPath.startsWith('/') || /^[a-z]:/i.test(slashPath)) return null;
    const withoutTrailingSlash = slashPath.replace(/\/+$/, '');
    const parts = withoutTrailingSlash.split('/');
    if (parts.length === 0 || parts.some((part) => !part || part === '.' || part === '..')) return null;
    return parts.join(path.sep);
}

function isInside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Lexical and symlink containment for paths that may be read by the overlay accelerator.
 * Missing paths are allowed through so the normal missing-registry/body behavior can report
 * them; an existing path whose real target escapes the project or its declared root is refused.
 */
function isSafelyContainedOnDisk(projectDir, boundaryAbs, targetAbs) {
    const projectAbs = path.resolve(projectDir);
    if (!isInside(projectAbs, boundaryAbs) || !isInside(boundaryAbs, targetAbs)) return false;
    try {
        const projectReal = fs.realpathSync.native(projectAbs);
        let boundaryReal;
        try {
            boundaryReal = fs.realpathSync.native(boundaryAbs);
        } catch (error) {
            return error && error.code === 'ENOENT';
        }
        if (!isInside(projectReal, boundaryReal)) return false;
        let targetReal;
        try {
            targetReal = fs.realpathSync.native(targetAbs);
        } catch (error) {
            return error && error.code === 'ENOENT';
        }
        return isInside(projectReal, targetReal) && isInside(boundaryReal, targetReal);
    } catch {
        return false;
    }
}

/** Resolve the independent overlay registry beneath the configured project-reference root. */
function resolveRegistryPath(projectDir, config) {
    if (config === null) return { path: null, invalid: true };
    const cfg = config && typeof config === 'object' ? config : {};

    const declaredRoot = cfg.docsRoots?.projectReference?.path;
    const referenceRootRel = declaredRoot === undefined
        ? normalizeProjectRelative(DEFAULT_REFERENCE_ROOT_REL)
        : normalizeProjectRelative(declaredRoot);
    if (!referenceRootRel) return { path: null, invalid: true };

    let filenameRel = DEFAULT_INDEX_FILENAME;
    if (cfg.referenceDocs !== undefined) {
        if (!Array.isArray(cfg.referenceDocs)) return { path: null, invalid: true };
        if (cfg.referenceDocs.some((entry) => !entry || typeof entry !== 'object' || typeof entry.filename !== 'string')) {
            return { path: null, invalid: true };
        }
        const candidates = cfg.referenceDocs.filter((entry) => {
            return entry.filename.trim().replace(/\\/g, '/').split('/').filter(Boolean).pop() === DEFAULT_INDEX_FILENAME;
        });
        if (candidates.length > 1) return { path: null, invalid: true };
        if (candidates.length === 1) {
            filenameRel = normalizeProjectRelative(candidates[0].filename);
            if (!filenameRel) return { path: null, invalid: true };
        }
    }

    const referenceRootAbs = path.resolve(projectDir, referenceRootRel);
    const indexAbs = path.resolve(referenceRootAbs, filenameRel);
    if (!isInside(referenceRootAbs, indexAbs) || !isSafelyContainedOnDisk(projectDir, referenceRootAbs, indexAbs)) {
        return { path: null, invalid: true };
    }
    return { path: indexAbs, invalid: false };
}

/** The body root is project-relative and comes from the index header, never from a row link. */
function resolveProtocolsDirectory(text) {
    const lines = text.split(/\r?\n/).filter((line) => /^\s*\*\*Protocols directory:\*\*/i.test(line));
    if (lines.length === 0) return { path: DEFAULT_BODIES_REL, invalid: false };
    if (lines.length !== 1) return { path: null, invalid: true };
    const match = lines[0].match(/^\s*\*\*Protocols directory:\*\*\s*`([^`]+)`\s*$/i);
    const relative = match && normalizeProjectRelative(match[1]);
    return relative ? { path: relative, invalid: false } : { path: null, invalid: true };
}

function loadRegistry(projectDir, config) {
    const location = resolveRegistryPath(projectDir, config);
    if (location.invalid) return { rows: [] };

    let text;
    try {
        text = fs.readFileSync(location.path, 'utf8');
    } catch {
        return { rows: [] };
    }

    const protocolsDirectory = resolveProtocolsDirectory(text);
    if (protocolsDirectory.invalid || !isSafelyContainedOnDisk(
        projectDir,
        path.resolve(projectDir),
        path.resolve(projectDir, protocolsDirectory.path || '.')
    )) {
        return { rows: [] };
    }

    return { rows: parseRegistryRows(text, protocolsDirectory.path) };
}

/**
 * Read and parse the overlay index.
 * Absent / unreadable / sentinel-only / malformed -> `[]`. NEVER throws.
 * @returns {Array<{name:string,target:string,scope:string,bodyPath:string|null}>}
 */
function parseRegistryRows(text, bodyRootRel) {
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

        rows.push({
            name,
            target,
            scope: (scope || '').toLowerCase(),
            bodyPath: parseBodyLink(body),
            bodyRootRel
        });
    }

    return rows;
}

function readRegistry(projectDir, config = {}) {
    return loadRegistry(projectDir, config).rows;
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
// overlay files and the reminder
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

    const bodyRootRel = normalizeProjectRelative(row.bodyRootRel || DEFAULT_BODIES_REL);
    if (!bodyRootRel) return null;
    const projectAbs = path.resolve(projectDir);
    const bodiesRoot = path.resolve(projectAbs, bodyRootRel);
    const abs = path.resolve(bodiesRoot, `${row.name}.md`);

    // Belt-and-braces containment: never follow a lexical traversal or a symlink outside the
    // project/configured body root, even though the slug and header path were already checked.
    if (!isInside(projectAbs, bodiesRoot) || !isInside(bodiesRoot, abs)) return null;
    if (!isSafelyContainedOnDisk(projectDir, bodiesRoot, abs)) return null;

    return abs;
}

function relFromRepo(projectDir, abs) {
    return path.relative(projectDir, abs).split(path.sep).join('/');
}

/** True for a readable regular file. */
function isFile(abs) {
    try {
        return fs.statSync(abs).isFile();
    } catch {
        return false;
    }
}

/**
 * Project-relative paths of the overlay bodies that apply to `skillName`, in registry order: the
 * winning tier's rows whose derived body path is a bare-slug file inside the protocols directory and
 * exists. A malformed row or a missing body is skipped and never read or reconstructed. Never throws.
 * @returns {string[]}
 */
function resolveOverlayFiles(skillName, projectDir, config) {
    try {
        if (typeof skillName !== 'string' || !BODY_NAME_RE.test(skillName)) return [];
        const rows = loadRegistry(projectDir, config).rows;
        if (rows.length === 0) return [];
        const files = [];
        for (const row of resolveOverlays(skillName, rows)) {
            const abs = resolveBodyAbsPath(projectDir, row);
            if (abs !== null && isFile(abs)) files.push(relFromRepo(projectDir, abs));
        }
        return files;
    } catch {
        return [];
    }
}

/**
 * Resolve the full matched path list and its short reminder from one registry snapshot. The hook
 * needs all paths to recognize a changed set even when the display omits paths beyond its limit.
 */
function resolveOverlayReminder(skillName, projectDir, config) {
    const files = resolveOverlayFiles(skillName, projectDir, config);
    if (files.length === 0) return { files, text: '' };
    const shown = files.slice(0, MAX_REMINDER_PATHS).join(', ');
    const more = files.length > MAX_REMINDER_PATHS ? ` (+${files.length - MAX_REMINDER_PATHS} more in the overlay registry)` : '';
    const text = [
        `Before executing skill ${skillName}: read these project overlay files: ${shown}${more}.`,
        'Overlays are ADDITIVE ONLY: they never waive the workflow route rules, git discipline, a review gate or a user-confirmation gate.'
    ].join('\n');
    return { files, text };
}

/** Two short additive-only reminder lines, or '' when no overlay applies. Never throws. */
function buildOverlayReminder(skillName, projectDir, config) {
    return resolveOverlayReminder(skillName, projectDir, config).text;
}

module.exports = {
    readRegistry,
    resolveOverlays,
    resolveOverlayFiles,
    resolveOverlayReminder,
    buildOverlayReminder,
    MAX_REMINDER_PATHS,
    DEFAULT_INDEX_REL,
    DEFAULT_BODIES_REL
};
