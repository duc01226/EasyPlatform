/**
 * Project Protocol Overlay Registry Test Suite
 *
 * The project's overlay registry (default `docs/project-reference/skill-protocols-reference.md`) is
 * read at runtime by `skill-overlay-remind.cjs` through `lib/skill-protocol-overlay.cjs`; no
 * CLAUDE.md block mirrors it. This suite guards what remains: the registry must parse (a malformed
 * row is reported, never dropped), an absent or sentinel-only registry is EMPTY and never a failure,
 * the registry location follows the project configuration, and the framework repository's own root
 * file carries no overlay block the hook replaced.
 *
 * PORTABILITY: resolve the index under the configured project-reference root and honor a
 * project reference entry that names the protocol index. The reference catalog is metadata;
 * it is not a mandatory floor. The gate MUST be a module-load-time `skip:` property.
 * `run-all-tests.cjs:151-156` reads `test.skip` BEFORE invoking `fn()`, so a runtime early-return
 * inside `fn()` reports PASS rather than SKIP and hides the reason.
 */

const path = require('path');
const fs = require('fs');
const projectConfigLoader = require('../../lib/project-config-loader.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLAUDE_MD_PATH = path.join(REPO_ROOT, 'CLAUDE.md');
const projectConfig = projectConfigLoader.loadProjectConfig();

function getProtocolIndexFilename(config) {
    const entries = Array.isArray(config?.referenceDocs) ? config.referenceDocs : [];
    const entry = entries.find((doc) =>
        typeof doc?.filename === 'string' &&
        (/skill-protocol/i.test(doc.filename) || /skill-protocol overlay/i.test(doc.purpose || ''))
    );
    return path.posix.basename((entry?.filename || 'skill-protocols-reference.md').replace(/\\/g, '/'));
}

function getProtocolIndexPath(projectDir, config) {
    const docsRoot = projectConfigLoader.getDocsRoot('projectReference', config) || path.join('docs', 'project-reference');
    return path.join(projectDir, docsRoot, getProtocolIndexFilename(config));
}

const INDEX_PATH = getProtocolIndexPath(REPO_ROOT, projectConfig);
const INDEX_RELATIVE_PATH = path.relative(REPO_ROOT, INDEX_PATH).replace(/\\/g, '/');

const RETIRED_BLOCK_OPEN = '<!-- CK:PROJECT-PROTOCOLS -->';
const SENTINEL = '_(none yet)_';
const REGISTRY_COLUMNS = 6;

const FIX = 'Fix: correct the row in the overlay registry index (see .claude/skills/project-skill-protocol/references/registry.md)';

// ---------------------------------------------------------------------------
// Parsers — pure, so the portability fixtures below can exercise them directly
// without touching the repo's real files.
// ---------------------------------------------------------------------------

function splitRow(line) {
    // `| a | b |` -> ['a', 'b']. Leading/trailing pipes produce empty edge cells.
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    return cells;
}

function isSeparatorRow(cells) {
    return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

/**
 * Parse the Registry table. Returns { rows, malformed }:
 *   rows      — { name, target, scope } for every real (non-sentinel) data row
 *   malformed — { line, cellCount, text } for every data row not carrying exactly 6 cells
 * A malformed row is a defect in ANY repo, so it is reported separately from `rows` and is
 * never silently dropped.
 */
function parseRegistryRows(indexText) {
    const rows = [];
    const malformed = [];
    const lines = indexText.split(/\r?\n/);

    let inTable = false;
    let sawSeparator = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed.startsWith('|')) {
            // A blank line or prose ends the current table.
            if (inTable && trimmed === '') {
                inTable = false;
                sawSeparator = false;
            }
            continue;
        }

        const cells = splitRow(trimmed);

        if (!inTable) {
            // Header row: only the table whose first column is `Target` is the Registry table.
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

        // Data row.
        if (cells.length !== REGISTRY_COLUMNS) {
            malformed.push({ line: i + 1, cellCount: cells.length, text: trimmed });
            continue;
        }

        const [target, scope, name] = cells;
        const isSentinel = target === SENTINEL || name === SENTINEL;
        if (isSentinel) continue;

        rows.push({ name, target, scope });
    }

    return { rows, malformed };
}

// ---------------------------------------------------------------------------
// Module-load gate — see the PORTABILITY note above. These MUST be computed here,
// not inside fn(), so they can drive a static `skip:` property.
// ---------------------------------------------------------------------------

const indexExists = fs.existsSync(INDEX_PATH);
const indexText = indexExists ? fs.readFileSync(INDEX_PATH, 'utf8') : null;
const parsed = indexText !== null ? parseRegistryRows(indexText) : { rows: [], malformed: [] };
const registryHasRows = parsed.rows.length > 0;

const claudeMdExists = fs.existsSync(CLAUDE_MD_PATH);
const claudeMdText = claudeMdExists ? fs.readFileSync(CLAUDE_MD_PATH, 'utf8') : '';
// A framework-repo self-check: the framework's own root file. Any other project owns its root file.
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const selfCheck = claudeMdExists && isFrameworkRepo(REPO_ROOT);

function assertTrue(condition, message) {
    if (!condition) throw new Error(message);
}

const tests = [
    {
        // TC-PSP-041
        name: '[project-protocol-drift] the framework root file carries no overlay block the runtime hook replaced',
        skip: !selfCheck,
        skipReason: 'framework-repo self-check: reads this repository\'s own CLAUDE.md',
        fn: () => {
            assertTrue(
                !claudeMdText.includes(RETIRED_BLOCK_OPEN),
                'CLAUDE.md still carries a <!-- CK:PROJECT-PROTOCOLS --> block. The overlay list is resolved at runtime ' +
                    'from the registry by skill-overlay-remind.cjs; run ai-context-refresh --mode update --strip-legacy-universal.'
            );
        }
    },
    {
        // TC-PSP-040 — custom roots and protocol-index names remain project-configurable.
        name: '[project-protocol-drift] resolves the protocol index from configured project reference data',
        fn: () => {
            const fixtureConfig = {
                docsRoots: { projectReference: { path: 'handbook/agent-context' } },
                referenceDocs: [{
                    filename: 'team-overlays.md',
                    purpose: 'Index of project skill-protocol overlays.'
                }]
            };
            const resolved = getProtocolIndexPath(path.join('portable-fixture'), fixtureConfig);
            const expected = path.join('portable-fixture', 'handbook', 'agent-context', 'team-overlays.md');
            assertTrue(
                resolved === expected,
                `Expected configured registry path ${expected}, got ${resolved}`
            );
        }
    },
    {
        // TC-PSP-035 — always on. Pure-parser fixture: an absent/unreadable index resolves to
        // EMPTY, never to "broken". Guards the bare-export path without touching the repo.
        name: '[project-protocol-drift] an absent registry resolves to EMPTY, never to an error',
        fn: () => {
            const { rows, malformed } = parseRegistryRows('');
            assertTrue(rows.length === 0, 'An empty index must yield zero overlay rows');
            assertTrue(malformed.length === 0, 'An empty index must yield zero malformed rows');

            // And the gate derived from it must be "skip", not "fail".
            const wouldSkip = rows.length === 0;
            assertTrue(wouldSkip, 'Zero rows must gate the delivery assertions off, not fail them');
        }
    },
    {
        // TC-PSP-036 — always on, regardless of registryHasRows: a malformed table is a defect
        // in ANY repo, and silently ignoring the row is how an overlay goes missing unnoticed.
        name: '[project-protocol-drift] a registry data row missing a column is reported, never ignored',
        fn: () => {
            const fixture = [
                '## Registry',
                '',
                '| Target | Scope | Name | Description | Updated | Body |',
                '| --- | --- | --- | --- | --- | --- |',
                '| plan | exact | ctx | Use when planning. | 2026-08-17 | [ctx.md](../project-protocols/ctx.md) |',
                '| *-review | glob | ev | Use when reviewing. | 2026-08-17 |',
                ''
            ].join('\n');

            const { rows, malformed } = parseRegistryRows(fixture);
            assertTrue(rows.length === 1, `Expected 1 well-formed row, got ${rows.length}`);
            assertTrue(malformed.length === 1, `Expected 1 malformed row, got ${malformed.length}`);
            assertTrue(
                malformed[0].cellCount === 5,
                `Malformed row must report its actual cell count; got ${malformed[0].cellCount}`
            );

            // The real index must itself be well-formed.
            assertTrue(
                parsed.malformed.length === 0,
                `Malformed row(s) in ${INDEX_RELATIVE_PATH}:\n` +
                    parsed.malformed
                        .map((r) => `  line ${r.line}: ${r.cellCount} cell(s) — ${r.text}`)
                        .join('\n') +
                    `\nEvery data row needs exactly ${REGISTRY_COLUMNS} columns.\n${FIX}`
            );
        }
    },
    {
        // TC-PSP-037 — always on. The adopting-repo shape: session-init auto-scaffolds a
        // sentinel-only index. This MUST resolve to no overlays, never to a failure.
        name: '[project-protocol-drift] adopting-repo shape (sentinel-only index) parses to no overlays, never fails',
        fn: () => {
            const scaffolded = [
                '## Registry',
                '',
                '| Target       | Scope | Name         | Description                  | Updated | Body |',
                '| ------------ | ----- | ------------ | ---------------------------- | ------- | ---- |',
                '| _(none yet)_ | —     | _(none yet)_ | Run `/project-skill-protocol add …` to create the first overlay. | —       | —    |',
                ''
            ].join('\n');

            const { rows, malformed } = parseRegistryRows(scaffolded);
            assertTrue(rows.length === 0, 'The sentinel row must never count as an overlay');
            assertTrue(malformed.length === 0, 'The scaffolded sentinel row must parse as well-formed');

            // No rows => nothing to resolve => a bare export cannot fail.
            assertTrue(rows.length === 0, 'Adopting-repo shape must resolve to no overlays');
        }
    },
    {
        // TC-PSP-038 — the gate must be a STATIC property, because run-all-tests.cjs reads
        // test.skip before calling fn(). A runtime early-return would report PASS, not SKIP.
        name: '[project-protocol-drift] every gated test exposes a static boolean skip at module load',
        fn: () => {
            const gated = tests.filter((t) => Object.prototype.hasOwnProperty.call(t, 'skip'));
            assertTrue(gated.length > 0, 'At least one test must be gated (non-vacuous)');
            for (const t of gated) {
                assertTrue(
                    typeof t.skip === 'boolean',
                    `${t.name}: skip must be a boolean computed at module load, got ${typeof t.skip}`
                );
                assertTrue(
                    typeof t.skipReason === 'string' && t.skipReason.length > 0,
                    `${t.name}: a gated test must state WHY it skipped`
                );
            }
        }
    }
];

module.exports = {
    name: 'project-protocol-drift',
    tests,
    // Exported for reuse and direct unit-testing of path and parser helpers.
    getProtocolIndexPath,
    parseRegistryRows
};
