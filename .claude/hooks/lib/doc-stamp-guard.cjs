#!/usr/bin/env node
'use strict';

/**
 * Doc Stamp Guard — the single owner of one invariant:
 *
 *   A git-TRACKED doc's bytes change ONLY when its meaning changes.
 *
 * Generated and scanned docs carry volatile tokens — `<!-- Last scanned: -->`,
 * `<!-- Last verified: -->`, `last_updated:`, `Regenerated:` — that move on every
 * regeneration whether or not a single word of content changed. Each such rewrite
 * is an unmergeable line at the top of a file that many branches touch, so two
 * branches that both merely RE-RAN a scan conflict over a date neither of them
 * decided. The churn carries zero information and costs a manual merge.
 *
 * Two writers in this repo already discovered the need and solved it privately:
 * `generate-tech-specs.mjs` masks its date before comparing and skips the write
 * (`normalizeGeneratedContent` + the `changed` gate), and `generate_catalogs.py`
 * masks `last_updated` — but only on its `--check` path, never on its write path.
 * This module lifts that rule to one place every writer consults.
 *
 * Whitespace is NOT meaning: line endings, trailing spaces, and runs of blank
 * lines are normalized away before comparing, so a formatter pass alone never
 * counts as a real change. Indentation INSIDE a line is preserved — it is
 * semantic in code fences and nested lists, and masking it would hide real edits.
 *
 * @module doc-stamp-guard
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

/**
 * Volatile tokens: text whose value is derived from the CLOCK, not from content.
 *
 * Each entry masks the VALUE and keeps the surrounding text, so a doc that gains
 * or loses a stamp line still reads as changed — only a moved value is masked.
 *
 * Content-derived tokens (the AGENTS.md SHA fingerprint, `[[convention:name@hash]]`,
 * `<!-- COUNT:x -->N<!-- /COUNT -->`) are deliberately ABSENT: they change only
 * when the thing they describe changes, so masking them would hide real drift.
 */
const VOLATILE_PATTERNS = [
    // <!-- Last scanned: 2026-09-14 -->
    { name: 'last-scanned', re: /(<!--\s*Last scanned:\s*)\d{4}-\d{2}-\d{2}(\s*-->)/g, replace: '$1<DATE>$2' },
    // <!-- Last verified: 2026-09-16 (docs-manager, impact-scoped) -->
    { name: 'last-verified', re: /(<!--\s*Last verified:\s*)\d{4}-\d{2}-\d{2}/g, replace: '$1<DATE>' },
    // Prose form: "... across 11 indexed categories. Last scanned: 2026-09-14."
    { name: 'last-scanned-prose', re: /(Last scanned:\s*)\d{4}-\d{2}-\d{2}/g, replace: '$1<DATE>' },
    // Generated technical views: "Regenerated: 2026-09-14."
    { name: 'regenerated', re: /(Regenerated:\s*)\d{4}-\d{2}-\d{2}/g, replace: '$1<DATE>' },
];

/**
 * DELIBERATELY NOT MASKED — `last_updated:` and `generated_at:`.
 *
 * They look like sibling clock stamps, and masking them was the first instinct.
 * They are not safe here, for two independent reasons:
 *
 *  1. In business-spec front matter (default root docs/specs; a `specRoots.business.path` entry in docs/project-config.json overrides it), `last_updated:` is the spec-sync SIGNAL —
 *     `doc-sync-gate.cjs` reads it (`LAST_SYNC_RE`) to decide whether a spec is in
 *     sync with its code. A `/spec [mode=sync]` run whose whole point is to bump
 *     that date would be classified as churn and unstaged by the commit guard, so
 *     the marker would never land and the sync warning would never clear. One
 *     framework rule would silently defeat another.
 *  2. `last_updated:` and `generated_at:` are ordinary identifiers in source code —
 *     `code_graph/graph.py` declares a `last_updated: Optional[str]` field and
 *     `codex/sync-hooks.mjs` builds a `generated_at:` property. A line-anchored
 *     mask makes a real one-line code edit look like a no-op.
 *
 * The one writer that genuinely needs `last_updated` treated as volatile —
 * `generate_catalogs.py` — owns that decision locally in
 * `normalize_catalog_for_check`, scoped to the catalogs it generates. That is the
 * right altitude: a token is clock-derived in a FILE, never in the abstract.
 */

/**
 * Normalize a doc for MEANING comparison.
 *
 * Masks every volatile token, then removes whitespace that carries no meaning:
 * CRLF/CR line endings, trailing spaces on a line, runs of blank lines, and
 * leading/trailing whitespace for the file as a whole.
 *
 * @param {string} content - Raw file content
 * @returns {string} Normalized content — compare these, never the raw bytes
 */
function normalizeDocContent(content) {
    if (typeof content !== 'string') return '';
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    for (const { re, replace } of VOLATILE_PATTERNS) {
        normalized = normalized.replace(re, replace);
    }
    return normalized
        .split('\n')
        // Two or more trailing spaces are a markdown hard line break — that IS
        // meaning, so it is normalized to a stable token rather than deleted.
        // A single trailing space or tab is invisible formatting noise.
        .map(line => line.replace(/[ \t]{2,}$/, '<BR>').replace(/[ \t]+$/, ''))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Does replacing `existing` with `next` change the doc's MEANING?
 *
 * The one predicate every doc writer calls before writing. `false` means the
 * write must be SKIPPED entirely — not written with an older stamp, not touched
 * at all — so the file's mtime and git status stay clean.
 *
 * @param {string|null} existing - Current on-disk content, or null when absent
 * @param {string} next - Candidate content
 * @returns {boolean} true when the write is justified
 */
function hasMeaningfulChange(existing, next) {
    if (existing === null || existing === undefined) return true;
    return normalizeDocContent(existing) !== normalizeDocContent(next);
}

/**
 * Is the difference between two versions ONLY volatile stamps and/or whitespace?
 *
 * The commit-side mirror of `hasMeaningfulChange`: given the HEAD version and the
 * staged version of a file, decide whether the diff carries information. Two
 * IDENTICAL versions are not stamp-only churn — there is nothing to report.
 *
 * @param {string} before - Version at HEAD
 * @param {string} after - Staged/working version
 * @returns {boolean} true when the diff is pure churn and should not be committed
 */
function isStampOnlyDiff(before, after) {
    if (before === after) return false;
    return !hasMeaningfulChange(before, after);
}

/**
 * Stable content hash used by the freshness ledger to prove a recorded
 * verification still describes the file currently on disk.
 *
 * Hashes the NORMALIZED form, so a whitespace-only touch does not invalidate a
 * recorded verification.
 *
 * @param {string} content - Raw file content
 * @returns {string} Hex SHA-256 of the normalized content
 */
function contentHash(content) {
    return crypto.createHash('sha256').update(normalizeDocContent(content), 'utf8').digest('hex');
}

function matchesDocBaseline(filePath, baselineContent) {
    let current = null;
    try {
        current = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
    // Raw comparison intentionally protects stamp/format edits too. Null means
    // the output was absent, distinct from an existing empty document.
    return current === baselineContent;
}

/**
 * Write a doc ONLY when it changes meaning.
 *
 * @param {string} filePath - Absolute path to the doc
 * @param {string} nextContent - Candidate content
 * @param {{baselineContent?: string|null}} [options] Exact read baseline; null means absent.
 * @returns {{written: boolean, reason: string}} No-op/conflict leaves live bytes intact.
 * Optimistic check only: callers serialize application; this is not a lock.
 */
function writeDocIfChanged(filePath, nextContent, options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'baselineContent') &&
        !matchesDocBaseline(filePath, options.baselineContent)) {
        return { written: false, reason: 'baseline conflict — reconcile current document' };
    }
    let existing = null;
    try {
        if (fs.existsSync(filePath)) existing = fs.readFileSync(filePath, 'utf-8');
    } catch {
        existing = null;
    }
    if (!hasMeaningfulChange(existing, nextContent)) {
        return { written: false, reason: 'no meaningful change — write skipped' };
    }
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, nextContent, 'utf-8');
    return { written: true, reason: existing === null ? 'created' : 'content changed' };
}

// =============================================================================
// Staged-diff inspection (commit-time verify check)
// =============================================================================

/** Explicit NUL, written as an escape so a formatter cannot silently empty it. */
const NUL = ' ';

/**
 * File types the staged scanner will judge.
 *
 * The masks above are markdown-doc idioms. Restricting the scanner to markdown
 * keeps a stray `Last scanned: <date>` inside source code, a fixture, or a test
 * from ever making a REAL code edit look like churn — the failure mode that
 * matters here is a false positive, because acting on one drops genuine work
 * from a commit.
 */
const SCANNED_EXTENSIONS = new Set(['.md', '.markdown']);

function runGit(args, cwd) {
    return execFileSync('git', args, {
        cwd,
        encoding: 'utf-8',
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
    });
}

/**
 * List staged files whose diff against HEAD is ONLY volatile stamps/whitespace.
 *
 * Read-only: it never stages, unstages, or touches the working tree. The CALLER
 * decides what to do, and must limit itself to `git restore --staged <path>`:
 * reverting the working tree destroys the only copy of an uncommitted edit, and
 * no hook blocks those spellings — the rule is model-behavioral on every host.
 *
 * Added, deleted, renamed, and binary paths are never reported: there is no
 * before/after pair whose difference could be pure churn.
 *
 * @param {object} [options]
 * @param {string} [options.cwd] - Repository directory (default: process.cwd())
 * @returns {{ok: boolean, error?: string, stampOnly: string[], inspected: number}}
 */
function findStampOnlyStagedDocs(options = {}) {
    const cwd = options.cwd || process.cwd();
    const stampOnly = [];
    let inspected = 0;

    let statusOutput;
    try {
        statusOutput = runGit(['diff', '--cached', '--name-status', '--no-renames', '-z', 'HEAD'], cwd);
    } catch (err) {
        return { ok: false, error: `git diff --cached failed: ${err.message}`, stampOnly, inspected };
    }

    // -z output: STATUS \0 PATH \0 STATUS \0 PATH \0 ...
    const fields = statusOutput.split('\0').filter(Boolean);
    for (let i = 0; i + 1 < fields.length; i += 2) {
        const status = fields[i];
        const filePath = fields[i + 1];
        // Only modifications have a before/after pair. Adds/deletes are real by definition.
        if (status !== 'M') continue;
        if (!SCANNED_EXTENSIONS.has(path.extname(filePath).toLowerCase())) continue;
        inspected += 1;

        let before;
        let after;
        try {
            before = runGit(['show', `HEAD:${filePath}`], cwd);
            after = runGit(['show', `:${filePath}`], cwd);
        } catch {
            continue; // Unreadable or binary — never claim it is churn
        }
        if (before.indexOf(NUL) !== -1 || after.indexOf(NUL) !== -1) continue;

        if (isStampOnlyDiff(before, after)) stampOnly.push(filePath);
    }

    return { ok: true, stampOnly, inspected };
}

// =============================================================================
// CLI
// =============================================================================

function printUsage() {
    process.stdout.write(
        [
            'Usage:',
            '  node .claude/hooks/lib/doc-stamp-guard.cjs --staged [--json]',
            '      List staged files whose diff is only volatile stamps/whitespace.',
            '      Exit 0 = nothing to report, exit 3 = stamp-only diffs found.',
            '',
            '  node .claude/hooks/lib/doc-stamp-guard.cjs --check <doc> --candidate <file> [--baseline <file>]',
            '      <doc>       the doc on disk (may not exist yet)',
            '      <candidate> the new content, written to a scratch file first',
            '      Exit 0 = changed, exit 3 = no-op, exit 4 = baseline conflict.',
            '      A missing baseline file records originally absent output.',
            '      Check raw live bytes before no-op evaluation; reconcile on conflict.',
            '',
            '  node .claude/hooks/lib/doc-stamp-guard.cjs --record-verified <doc-filename>',
            '      Record in the untracked local ledger that a reference doc was',
            '      re-verified today with no content change. Writes no tracked file.',
            '      Takes a filename under the configured reference-doc root — the docs',
            '      the 60-day staleness gate tracks. Any other path exits 1.',
            '',
            'This tool NEVER mutates the repository. Act on its output with',
            '`git restore --staged <path>` only — never revert the working tree.',
            '',
        ].join('\n')
    );
}

function readFileOrEmpty(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}

function main(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printUsage();
        return 0;
    }

    if (args.includes('--staged')) {
        const result = findStampOnlyStagedDocs({ cwd: process.cwd() });
        if (!result.ok) {
            process.stderr.write(`${result.error}\n`);
            return 1;
        }
        if (args.includes('--json')) {
            process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } else if (result.stampOnly.length === 0) {
            process.stdout.write(`No stamp-only staged diffs (${result.inspected} modified file(s) inspected).\n`);
        } else {
            process.stdout.write(
                `Stamp-only staged diffs — no real content change, safe to unstage:\n${result.stampOnly
                    .map(p => `  ${p}`)
                    .join('\n')}\n`
            );
        }
        return result.stampOnly.length === 0 ? 0 : 3;
    }

    const recordIndex = args.indexOf('--record-verified');
    if (recordIndex !== -1) {
        const filename = args[recordIndex + 1];
        if (!filename) {
            process.stderr.write('--record-verified requires a reference doc filename\n');
            return 1;
        }
        // Lazy require: session-init-helpers consumes this module's contentHash.
        // The CLI entry below runs only after exports are assigned so the cycle sees
        // the complete API.
        const { recordDocVerified } = require('./session-init-helpers.cjs');
        const recorded = recordDocVerified(filename);
        process.stdout.write(
            recorded
                ? `Recorded no-change verification for ${filename} (local ledger only — no git diff).\n`
                : `Could not record verification for ${filename} — the doc was unreadable.\n`
        );
        return recorded ? 0 : 1;
    }

    const checkIndex = args.indexOf('--check');
    const candidateIndex = args.indexOf('--candidate');
    if (checkIndex !== -1 && candidateIndex !== -1) {
        const baselineIndex = args.indexOf('--baseline');
        if (baselineIndex !== -1) {
            const baselinePath = args[baselineIndex + 1];
            if (!baselinePath || baselinePath.startsWith('--')) {
                process.stderr.write('--baseline requires a baseline file path\n');
                return 1;
            }
            // ENOENT is the explicit originally-absent baseline. Other I/O
            // errors must fail visibly rather than authorize an overwrite.
            let baselineContent = null;
            try {
                baselineContent = fs.readFileSync(baselinePath, 'utf8');
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }
            if (!matchesDocBaseline(args[checkIndex + 1], baselineContent)) {
                process.stdout.write('CONFLICT — live document changed; reconcile before application\n');
                return 4;
            }
        }
        const existing = readFileOrEmpty(args[checkIndex + 1]);
        const candidate = readFileOrEmpty(args[candidateIndex + 1]);
        if (candidate === null) {
            process.stderr.write(`Cannot read candidate file: ${args[candidateIndex + 1]}\n`);
            return 1;
        }
        const changed = hasMeaningfulChange(existing, candidate);
        process.stdout.write(changed ? 'CHANGED — write justified\n' : 'NO-OP — skip the write\n');
        return changed ? 0 : 3;
    }

    printUsage();
    return 1;
}

module.exports = {
    VOLATILE_PATTERNS,
    normalizeDocContent,
    hasMeaningfulChange,
    isStampOnlyDiff,
    contentHash,
    writeDocIfChanged,
    matchesDocBaseline,
    findStampOnlyStagedDocs,
};

// Publish the API before direct CLI startup. `--record-verified` loads
// session-init-helpers.cjs, which imports contentHash back from this module.
if (require.main === module) {
    process.exit(main(process.argv));
}
