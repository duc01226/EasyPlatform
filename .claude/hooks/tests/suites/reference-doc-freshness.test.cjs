'use strict';
// reference-doc-freshness — turn documentation rot into a FAILING TEST.
//
// `docs/project-reference/**` is injected into every downstream AI context, so a
// dead citation there is not cosmetic: it teaches every later agent a file that
// no longer exists. Time-based staleness (the 60-day `.scan-stale` gate) cannot
// see this — a doc scanned yesterday and invalidated today still reads "fresh".
// These assertions are content-based, so they fire the moment a referenced path
// disappears, regardless of when the doc was last scanned.
//
// Asserts:
//   F1  no reference doc cites a path that resolves nowhere in the repo
//   F2  every doc registered in project-config `referenceDocs` exists on disk
//   F3  the checker is non-vacuous (a deliberately dead citation IS caught)
//   F4  no `Last scanned` stamp hides beyond the reader window that drives the 60-day gate
//   F5  the claims-mode CLI default doc set is exactly the set F1 walks

const fs = require('fs');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const {
    checkClaims,
    defaultClaimTargets,
    SCAN_SKILL_MAP
} = require(path.join(REPO, '.claude', 'scripts', 'doc-impact-map.cjs'));
const {
    parseLastScannedDate,
    REFERENCE_DOCS_DIR
} = require(path.join(REPO, '.claude', 'hooks', 'lib', 'session-init-helpers.cjs'));

const REF_DIR = path.join(REPO, 'docs', 'project-reference');
const LAST_SCANNED_ANYWHERE = /<!--\s*Last scanned:\s*(\d{4}-\d{2}-\d{2})/;

function referenceDocs() {
    const out = [];
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.md')) out.push(path.relative(REPO, full).replace(/\\/g, '/'));
        }
    };
    if (fs.existsSync(REF_DIR)) walk(REF_DIR);
    return out;
}

const tests = [
    {
        name: '[reference-doc-freshness] F1 no reference doc cites a path that no longer exists',
        fn: () => {
            const dead = [];
            for (const doc of referenceDocs()) {
                const result = checkClaims(doc);
                for (const missing of result.missing) dead.push(`${doc} -> ${missing}`);
            }
            assertTrue(
                dead.length === 0,
                'Reference docs cite paths that resolve nowhere (dead citation = stale doc):\n' +
                    dead.map(d => `  x ${d}`).join('\n') +
                    '\nFix: repoint the citation, remove it, or make it an explicit <placeholder>.' +
                    '\nInspect with: node .claude/scripts/doc-impact-map.cjs claims --text'
            );
        }
    },
    {
        name: '[reference-doc-freshness] F2 every registered reference doc exists on disk',
        fn: () => {
            let registered = [];
            try {
                registered = JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'project-config.json'), 'utf8'))
                    .referenceDocs || [];
            } catch {
                registered = [];
            }
            const absent = registered
                .map(d => d && d.filename)
                .filter(Boolean)
                .filter(f => !fs.existsSync(path.join(REF_DIR, f)));
            assertTrue(
                absent.length === 0,
                `project-config.json registers reference docs that do not exist: ${absent.join(', ')}.\n` +
                    'Fix: run the doc\'s scan (/scan --target=<key>) or drop the stale registration via /project-config.'
            );
        }
    },
    {
        name: '[reference-doc-freshness] F3 GUARD the citation checker is non-vacuous',
        fn: () => {
            const fixture = path.join(REPO, '.claude', 'hooks', 'tests', 'fixtures', 'reference-doc-freshness.tmp.md');
            const rel = '.claude/hooks/tests/fixtures/reference-doc-freshness.tmp.md';
            fs.writeFileSync(fixture, 'Cites `docs/project-reference/no-such-doc-xyz.md` which does not exist.\n', 'utf8');
            try {
                const result = checkClaims(rel);
                assertEqual(
                    result.missing.length,
                    1,
                    'The checker must detect a deliberately dead citation — otherwise F1 passes vacuously'
                );
            } finally {
                if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
            }
        }
    },
    {
        name: '[reference-doc-freshness] F4 no Last scanned stamp hides beyond its reader window',
        fn: () => {
            // Conditional invariant on purpose: a doc is NOT required to carry a stamp —
            // getStaleReferenceDocs deliberately skips undated docs ("never block incorrectly") and
            // 3 SCAN_SKILL_MAP entries legitimately have none. But a stamp that EXISTS must be
            // readable by parseLastScannedDate, which reads only the first 200 bytes. Placing the
            // stamp below a Goal blockquote leaves it visible to a human and invisible to the
            // 60-day rescan gate — silently disabling that gate for the doc.
            const hidden = [];
            for (const filename of Object.keys(SCAN_SKILL_MAP)) {
                if (!filename.endsWith('.md')) continue;
                const abs = path.join(REFERENCE_DOCS_DIR, filename);
                if (!fs.existsSync(abs)) continue;
                const stamped = LAST_SCANNED_ANYWHERE.test(fs.readFileSync(abs, 'utf8'));
                if (stamped && !parseLastScannedDate(abs)) hidden.push(filename);
            }
            assertTrue(
                hidden.length === 0,
                'Reference docs carry a Last scanned stamp their reader cannot see, so the 60-day ' +
                    'rescan gate silently skips them:\n' +
                    hidden.map(d => `  x ${d}`).join('\n') +
                    '\nFix: move the stamp directly under the H1, above any blockquote ' +
                    '(see backend-patterns-reference.md for the convention).'
            );
        }
    },
    {
        name: '[reference-doc-freshness] F5 the claims CLI default doc set equals the set F1 walks',
        fn: () => {
            // Without this, the CLI default and this gate can drift apart again — and the
            // remediation command F1 prints would report 0 dead for a doc F1 itself flagged.
            const cli = defaultClaimTargets().slice().sort();
            const gate = referenceDocs().slice().sort();
            const gateOnly = gate.filter(d => !cli.includes(d));
            const cliOnly = cli.filter(d => !gate.includes(d));
            assertTrue(
                gateOnly.length === 0 && cliOnly.length === 0,
                'The claims-mode CLI default and this gate disagree on which docs are covered, so ' +
                    'the remediation command F1 prints cannot reproduce an F1 failure:\n' +
                    gateOnly.map(d => `  x gate-only: ${d}`).join('\n') +
                    cliOnly.map(d => `  x cli-only: ${d}`).join('\n') +
                    '\nFix: keep defaultClaimTargets() in doc-impact-map.cjs and referenceDocs() here ' +
                    'walking the same tree.'
            );
        }
    }
];

module.exports = {
    name: 'reference-doc-freshness',
    tests
};
