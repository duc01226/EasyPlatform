/**
 * Skill Protocol Overlay Test Suite
 *
 * Covers the resolver and reminder builder in lib/skill-protocol-overlay.cjs, which
 * skill-overlay-remind.cjs calls when a skill activates (the real-process tests of the hook are in
 * skill-overlay-remind.test.cjs). TC-PSP-040..043 mirror the normative cases in
 * .claude/skills/project-skill-protocol/references/registry.md §3 one-for-one, so the code
 * resolver and the written algorithm cannot drift apart unnoticed.
 *
 * ENV DISCIPLINE (lessons.md:11 — cost 9 downstream test failures).
 * Every process.env mutation goes through withEnv(), which restores the ORIGINAL value —
 * including "the key was absent" — in a finally block. Temp fixture dirs are likewise removed
 * in finally, so a thrown assertion never leaks state into a later suite.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const LIB_PATH = path.resolve(__dirname, '../../lib/skill-protocol-overlay.cjs');
const {
    readRegistry,
    resolveOverlays,
    resolveOverlayFiles,
    buildOverlayReminder,
    MAX_REMINDER_PATHS
} = require(LIB_PATH);

function assertTrue(condition, message) {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
    }
}

function assertFiles(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

/**
 * Set env vars for the duration of fn, then restore EXACTLY the prior state — a key that was
 * absent before is deleted again, not set to ''. Restores even when fn throws.
 */
function withEnv(vars, fn) {
    const saved = new Map();
    for (const key of Object.keys(vars)) {
        saved.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    }
    try {
        for (const [key, value] of Object.entries(vars)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
        return fn();
    } finally {
        for (const [key, value] of saved.entries()) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    }
}

/** Build a throwaway project dir, run fn(dir), remove it in finally. */
function withFixture(spec, fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psp-overlay-'));
    try {
        const refDir = path.join(dir, ...(spec.referenceRoot || 'docs/project-reference').split(/[\\/]/));
        const bodyDir = path.join(dir, ...(spec.bodyRoot || 'docs/project-protocols').split(/[\\/]/));
        fs.mkdirSync(refDir, { recursive: true });
        fs.mkdirSync(bodyDir, { recursive: true });

        if (spec.index !== undefined && spec.index !== null) {
            const indexPath = path.join(refDir, ...(spec.indexFilename || 'skill-protocols-reference.md').split(/[\\/]/));
            fs.mkdirSync(path.dirname(indexPath), { recursive: true });
            fs.writeFileSync(indexPath, spec.index, 'utf8');
        }
        for (const [name, content] of Object.entries(spec.bodies || {})) {
            fs.writeFileSync(path.join(bodyDir, `${name}.md`), content, 'utf8');
        }
        for (const [relativePath, content] of Object.entries(spec.extraFiles || {})) {
            const targetPath = path.join(dir, ...relativePath.split(/[\\/]/));
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, content, 'utf8');
        }
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function indexWith(rows, protocolsDirectory = 'docs/project-protocols/') {
    const header = [
        '# Skill Protocol Overlays — Project Registry',
        '',
        `**Protocols directory:** \`${protocolsDirectory}\``,
        '',
        '## Registry',
        '',
        '| Target | Scope | Name | Description | Updated | Body |',
        '| --- | --- | --- | --- | --- | --- |'
    ];
    const body = rows.map(
        (r) => `| ${r.target} | ${r.scope} | ${r.name} | Use when ${r.name} applies. | 2026-08-17 | [${r.name}.md](../project-protocols/${r.name}.md) |`
    );
    return [...header, ...body, ''].join('\n');
}

/** The three-tier registry used by TC-PSP-040..042, straight from registry.md §3's worked example. */
const THREE_TIER = [
    { target: 'plan', scope: 'exact', name: 'plan-ctx' },
    { target: '*-review', scope: 'glob', name: 'review-ev' },
    { target: '*', scope: 'all', name: 'house-style' }
];

const THREE_TIER_BODIES = {
    'plan-ctx': '## Rules\n\n1. Name the bounded context in every plan phase.\n',
    'review-ev': '## Rules\n\n1. Cite file:line for every finding.\n',
    'house-style': '## Rules\n\n1. Prefer kebab-case filenames.\n'
};

const DEFAULT_BODY_ROOT = 'docs/project-protocols';

const tests = [
    {
        // P13: task-specific referenceDocs selection cannot disable the independent overlay registry.
        name: '[skill-protocol-overlay] TC-PSP-050 docsRoots relocates the registry and explicit referenceDocs [] keeps default lookup',
        fn: () => {
            const config = {
                docsRoots: { projectReference: { path: 'portable/reference' } },
                referenceDocs: []
            };
            withFixture({
                referenceRoot: 'portable/reference',
                index: indexWith([THREE_TIER[0]]),
                bodies: { 'plan-ctx': THREE_TIER_BODIES['plan-ctx'] }
            }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, config), [`${DEFAULT_BODY_ROOT}/plan-ctx.md`],
                    'the registry under configured docsRoots must resolve even when referenceDocs is explicitly empty');
            });
        }
    },
    {
        name: '[skill-protocol-overlay] TC-PSP-051 a matching referenceDocs filename relocates the registry beneath docsRoots',
        fn: () => {
            const config = {
                docsRoots: { projectReference: { path: 'handbook/reference' } },
                referenceDocs: [{ filename: 'registries/skill-protocols-reference.md', purpose: 'Skill protocol registry.' }]
            };
            withFixture({
                referenceRoot: 'handbook/reference',
                indexFilename: 'registries/skill-protocols-reference.md',
                index: indexWith([THREE_TIER[0]]),
                bodies: { 'plan-ctx': THREE_TIER_BODIES['plan-ctx'] }
            }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, config), [`${DEFAULT_BODY_ROOT}/plan-ctx.md`], 'the matching configured index file must be read');
            });
        }
    },
    {
        name: '[skill-protocol-overlay] TC-PSP-052 the registry header selects a project-relative body directory',
        fn: () => {
            const bodyRoot = 'project-rules/skill-overlays';
            withFixture({
                bodyRoot,
                index: indexWith([THREE_TIER[0]], `${bodyRoot}/`),
                bodies: { 'plan-ctx': '## Rules\n\n1. CUSTOM-BODY-ROOT-RULE\n' }
            }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, {}), [`${bodyRoot}/plan-ctx.md`], 'the body must be derived inside the configured project-relative directory');
            });
        }
    },
    {
        name: '[skill-protocol-overlay] TC-PSP-053 an unsafe configured registry filename is rejected without reading it',
        fn: () => {
            const config = {
                docsRoots: { projectReference: { path: 'docs/project-reference' } },
                referenceDocs: [{ filename: '../outside/skill-protocols-reference.md', purpose: 'Unsafe test fixture.' }]
            };
            withFixture({
                index: null,
                extraFiles: {
                    'outside/skill-protocols-reference.md': indexWith([THREE_TIER[0]], 'outside/bodies'),
                    'outside/bodies/plan-ctx.md': '## Rules\n\n1. TOP-SECRET-CANARY\n'
                }
            }, (dir) => {
                // The traversal target exists: only the rejection keeps it out of the result.
                assertFiles(resolveOverlayFiles('plan', dir, config), [], 'the traversal target must not be read or named');
                assertEqual(buildOverlayReminder('plan', dir, config), '', 'no reminder for an unsafe registry filename');
            });
        }
    },
    {
        name: '[skill-protocol-overlay] TC-PSP-054 an unsafe protocols-directory header refuses all body reads',
        fn: () => {
            const unsafeIndex = indexWith([THREE_TIER[0]], '../../canary');
            withFixture({
                index: unsafeIndex,
                bodies: { 'plan-ctx': '## Rules\n\n1. TOP-SECRET-CANARY\n' }
            }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, {}), [], 'no body may be named under an unsafe header');
            });
        }
    },
    {
        name: '[skill-protocol-overlay] TC-PSP-055 an unavailable required config blocks overlay reads',
        fn: () => {
            withFixture({ index: indexWith([THREE_TIER[0]]), bodies: { 'plan-ctx': THREE_TIER_BODIES['plan-ctx'] } }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, null), [], 'a missing or invalid required config must read no registry');
                assertEqual(buildOverlayReminder('plan', dir, null), '', 'and emit no reminder');
                // Boundary: a valid (here empty) config resolves the same registry, so the silence above was not vacuous.
                assertFiles(resolveOverlayFiles('plan', dir, {}), [`${DEFAULT_BODY_ROOT}/plan-ctx.md`], 'the registry resolves with a usable config');
            });
        }
    },
    {
        // TC-PSP-040
        name: '[skill-protocol-overlay] TC-PSP-040 exact tier wins outright — plan resolves only plan-ctx',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, {}), [`${DEFAULT_BODY_ROOT}/plan-ctx.md`], 'only the exact overlay applies');
            });
        }
    },
    {
        // TC-PSP-041
        name: '[skill-protocol-overlay] TC-PSP-041 glob tier wins — plan-design-review resolves only review-ev',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                assertFiles(resolveOverlayFiles('plan-design-review', dir, {}), [`${DEFAULT_BODY_ROOT}/review-ev.md`],
                    'exact `plan` must NOT match `plan-design-review`, and the `*` overlay must NOT apply');
            });
        }
    },
    {
        // TC-PSP-042
        name: '[skill-protocol-overlay] TC-PSP-042 all tier is the last resort — commit resolves only house-style',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                assertFiles(resolveOverlayFiles('commit', dir, {}), [`${DEFAULT_BODY_ROOT}/house-style.md`], 'no other tier may apply');
            });
        }
    },
    {
        // TC-PSP-043
        name: '[skill-protocol-overlay] TC-PSP-043 no matching tier produces no output at all',
        fn: () => {
            const rows = [{ target: 'plan', scope: 'exact', name: 'plan-ctx' }];
            withFixture({ index: indexWith(rows), bodies: { 'plan-ctx': '## Rules\n\n1. X\n' } }, (dir) => {
                assertFiles(resolveOverlayFiles('commit', dir, {}), [], 'An unmatched skill must resolve nothing');
                assertEqual(buildOverlayReminder('commit', dir, {}), '', 'An unmatched skill must emit nothing');
            });
        }
    },
    {
        // TC-PSP-044
        name: '[skill-protocol-overlay] TC-PSP-044 a skill name that is not a bare slug resolves nothing',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                for (const name of ['', '../plan', 'Plan', 'plan review', '/plan', null, undefined, 7]) {
                    assertFiles(resolveOverlayFiles(name, dir, {}), [], `name ${JSON.stringify(name)} must resolve nothing`);
                }
                assertFiles(resolveOverlayFiles('plan-design-review', dir, {}), [`${DEFAULT_BODY_ROOT}/review-ev.md`], 'a bare slug with hyphens resolves');
            });
        }
    },
    {
        // TC-PSP-045
        name: '[skill-protocol-overlay] TC-PSP-045 an absent registry yields no output and no throw',
        fn: () => {
            withFixture({ index: null }, (dir) => {
                assertEqual(readRegistry(dir).length, 0, 'absent index -> empty registry');
                assertEqual(buildOverlayReminder('plan', dir, {}), '', 'absent index -> no reminder');
            });
            // A directory that does not exist at all must behave identically.
            assertEqual(readRegistry(path.join(os.tmpdir(), 'psp-does-not-exist-xyz')).length, 0, 'missing dir -> []');
        }
    },
    {
        // TC-PSP-045b — the shipped sentinel-only registry must resolve to EMPTY, not to a match.
        name: '[skill-protocol-overlay] a sentinel-only registry resolves to zero overlays',
        fn: () => {
            const sentinel = [
                '## Registry',
                '',
                '| Target | Scope | Name | Description | Updated | Body |',
                '| --- | --- | --- | --- | --- | --- |',
                '| _(none yet)_ | — | _(none yet)_ | Run `/project-skill-protocol add …`. | — | — |',
                ''
            ].join('\n');
            withFixture({ index: sentinel }, (dir) => {
                assertEqual(readRegistry(dir).length, 0, 'the sentinel row is not an overlay');
                assertEqual(buildOverlayReminder('plan', dir, {}), '', 'sentinel-only -> no reminder');
            });
        }
    },
    {
        // TC-PSP-046
        name: '[skill-protocol-overlay] TC-PSP-046 a missing body is skipped, never named or fabricated',
        fn: () => {
            const rows = [
                { target: '*-review', scope: 'glob', name: 'review-ev' },
                { target: 'plan-*', scope: 'glob', name: 'ghost' }
            ];
            withFixture({ index: indexWith(rows), bodies: { 'review-ev': '## Rules\n\n1. Cite file:line.\n' } }, (dir) => {
                // `plan-design-review` matches both globs; only the body that exists is named.
                assertFiles(resolveOverlayFiles('plan-design-review', dir, {}), [`${DEFAULT_BODY_ROOT}/review-ev.md`], 'the present body is named, the missing one is not');
                const reminder = buildOverlayReminder('plan-design-review', dir, {});
                assertTrue(!reminder.includes('ghost'), 'a missing body must never be named in the reminder');
                // A skill whose only matching body is missing gets no reminder at all.
                assertEqual(buildOverlayReminder('plan-other', dir, {}), '', 'only a missing body -> no reminder');
            });
        }
    },
    {
        // TC-PSP-047
        name: '[skill-protocol-overlay] TC-PSP-047 the reminder names at most eight files and counts the rest',
        fn: () => {
            assertEqual(MAX_REMINDER_PATHS, 8, 'the bound is eight');
            const rows = Array.from({ length: 10 }, (_, i) => ({ target: '*', scope: 'all', name: `rule-${i}` }));
            const bodies = Object.fromEntries(rows.map((r) => [r.name, '## Rules\n\n1. X\n']));
            withFixture({ index: indexWith(rows), bodies }, (dir) => {
                const reminder = buildOverlayReminder('anything', dir, {});
                const named = reminder.match(/docs\/project-protocols\/rule-\d\.md/g) || [];
                assertEqual(named.length, 8, 'eight paths are named');
                assertTrue(reminder.includes('(+2 more in the overlay registry)'), 'the rest is counted');
                assertEqual(resolveOverlayFiles('anything', dir, {}).length, 10, 'the resolver still returns every file');
            });
        }
    },
    {
        // TC-PSP-048
        name: '[skill-protocol-overlay] TC-PSP-048 a malformed registry table returns [] without throwing',
        fn: () => {
            const malformed = [
                '## Registry',
                '',
                '| Target | Scope | Name | Description | Updated | Body |',
                '| --- | --- | --- | --- | --- | --- |',
                '| plan | exact | broken | missing columns |',
                ''
            ].join('\n');
            withFixture({ index: malformed }, (dir) => {
                assertEqual(readRegistry(dir).length, 0, 'a short data row is dropped, not parsed');
                assertEqual(buildOverlayReminder('plan', dir, {}), '', 'no reminder from a malformed table');
            });

            // Garbage that is not a table at all must also be tolerated.
            withFixture({ index: 'not a table at all\n\njust prose\n' }, (dir) => {
                assertEqual(readRegistry(dir).length, 0, 'prose-only index -> []');
            });
        }
    },
    {
        // TC-PSP-049
        name: '[skill-protocol-overlay] TC-PSP-049 withEnv restores env exactly, including absent keys',
        fn: () => {
            const KEY = 'PSP_OVERLAY_ENV_PROBE';
            delete process.env[KEY];

            withEnv({ [KEY]: 'set-inside' }, () => {
                assertEqual(process.env[KEY], 'set-inside', 'value applies inside the block');
            });
            assertTrue(
                !Object.prototype.hasOwnProperty.call(process.env, KEY),
                'a key absent before must be DELETED after, not left as an empty string'
            );

            process.env[KEY] = 'original';
            try {
                withEnv({ [KEY]: 'temp' }, () => {
                    throw new Error('intentional');
                });
            } catch (e) {
                if (e.message !== 'intentional') throw e;
            }
            assertEqual(process.env[KEY], 'original', 'restore must happen even when fn throws');
            delete process.env[KEY];
        }
    },
    {
        // TC-PSP-04A
        name: '[skill-protocol-overlay] TC-PSP-04A the reminder is two plain lines that never open with a JSON bracket',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const reminder = buildOverlayReminder('plan', dir, {});
                assertTrue(!reminder.startsWith('{') && !reminder.startsWith('['), 'plain text, never JSON-looking');
                assertEqual(reminder.split('\n').length, 2, 'two lines');
                assertEqual(reminder.split('\n')[0], `Before executing skill plan: read these project overlay files: ${DEFAULT_BODY_ROOT}/plan-ctx.md.`, 'line one names the skill and the files');
            });
        }
    },
    {
        // The authority carve-out must ride along on EVERY reminder — a hostile body is contradicted
        // in the same message rather than in a file the model may not read.
        name: '[skill-protocol-overlay] every reminder restates the additive-only carve-out',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const reminder = buildOverlayReminder('plan', dir, {});
                assertTrue(reminder.includes('ADDITIVE ONLY'), 'additive-only rule must be stated');
                for (const gate of ['workflow route rules', 'git discipline', 'a review gate', 'a user-confirmation gate']) {
                    assertTrue(reminder.includes(gate), `the carve-out must name ${gate}`);
                }
            });
        }
    },
    {
        // SECURITY (H1). The index doc is explicitly hand-editable, so its `Body` cell is
        // untrusted input. If resolution followed that link, one plausible-looking table row
        // would turn every skill activation into an arbitrary file path the model is told to read
        // as rules. The path must be DERIVED from Name and confined to the protocols directory.
        name: '[skill-protocol-overlay] TC-PSP-04B a Body link pointing outside the protocols dir is never followed',
        fn: () => {
            const rows = [
                { target: 'plan', scope: 'exact', name: 'good' },
                { target: 'plan', scope: 'exact', name: 'evil' }
            ];
            // Hand-craft the evil row so its Body link escapes, while its Name stays a legal slug.
            const index = indexWith(rows).replace(
                '[evil.md](../project-protocols/evil.md)',
                '[evil.md](../../canary/stolen.txt)'
            );
            withFixture({ index, bodies: { good: '## Rules\n\n1. LEGIT-RULE\n' } }, (dir) => {
                fs.mkdirSync(path.join(dir, 'canary'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'canary', 'stolen.txt'), 'TOP-SECRET-CANARY\n', 'utf8');

                // The derived path docs/project-protocols/evil.md does not exist -> skipped; the canary is never named.
                assertFiles(resolveOverlayFiles('plan', dir, {}), [`${DEFAULT_BODY_ROOT}/good.md`], 'only the legitimate sibling overlay resolves');
                assertTrue(!buildOverlayReminder('plan', dir, {}).includes('canary'), 'a Body link must NEVER be followed off the protocols dir');
            });
        }
    },
    {
        // SECURITY (H1), second vector: the Name itself carries the traversal. This must be
        // rejected BEFORE any filesystem access — not merely resolved to a missing file.
        name: '[skill-protocol-overlay] TC-PSP-04C a traversal in the Name is rejected as malformed with no read',
        fn: () => {
            const index = indexWith([{ target: 'plan', scope: 'exact', name: '../../canary/stolen' }]);
            withFixture({ index }, (dir) => {
                fs.mkdirSync(path.join(dir, 'canary'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'canary', 'stolen.md'), 'TOP-SECRET-CANARY\n', 'utf8');
                fs.writeFileSync(path.join(dir, 'canary', 'stolen.txt'), 'TOP-SECRET-CANARY\n', 'utf8');

                assertFiles(resolveOverlayFiles('plan', dir, {}), [], 'a traversal in Name must not reach the filesystem or be named');
                assertEqual(buildOverlayReminder('plan', dir, {}), '', 'and no reminder is emitted for it');
            });
        }
    },
    {
        // MUTATION PROBE for TC-PSP-04B/04C: prove the containment guard is what stops the read,
        // rather than the canary happening to be unreachable in the fixture layout.
        name: '[skill-protocol-overlay] TC-PSP-04D containment is non-vacuous — a legal slug in the protocols dir IS named',
        fn: () => {
            const index = indexWith([{ target: 'plan', scope: 'exact', name: 'in-bounds' }]);
            withFixture({ index, bodies: { 'in-bounds': '## Rules\n\n1. TOP-SECRET-CANARY\n' } }, (dir) => {
                assertFiles(resolveOverlayFiles('plan', dir, {}), [`${DEFAULT_BODY_ROOT}/in-bounds.md`],
                    'the same file IS named when it lives at the derived in-bounds path — so 04B/04C ' +
                        'are blocked by the containment guard, not by the file being unreachable');
            });
        }
    },
    {
        // SECURITY (B-M1). Glob matching must not backtrack exponentially. A regex-compiled
        // `*` -> `.*` was measured at 136ms / 1.7s / 42.5s / 472s as stars were added, on a
        // hook that may run on every skill activation — one crafted row would wedge the
        // session. Budget is generous so the test measures the complexity class, not the CPU.
        name: '[skill-protocol-overlay] TC-PSP-04E a pathological glob cannot wedge the hook',
        fn: () => {
            const pattern = 'a' + '*a'.repeat(24) + '*b';
            const rows = [{ name: 'evil', target: pattern, scope: 'glob', bodyPath: null }];
            const started = Date.now();
            resolveOverlays('a'.repeat(60), rows);
            const elapsed = Date.now() - started;
            assertTrue(
                elapsed < 1000,
                `A 24-star glob took ${elapsed}ms. Exponential backtracking is back — glob matching ` +
                    'must stay linear (no regex compilation of `*`).'
            );
        }
    },
    {
        // B-M2. `scope` is STORED rather than inferred (registry.md §2) — but stored is not
        // trusted. Because resolution is winner-tier-takes-all, a `*` target mislabeled
        // `scope: glob` lands in the glob tier and SUPPRESSES every legitimate `all` overlay
        // while still matching every skill. That is a silent overlay hijack, not a typo.
        name: '[skill-protocol-overlay] TC-PSP-04F a scope that contradicts its target shape cannot hijack a tier',
        fn: () => {
            const rows = [
                { name: 'sneaky', target: '*', scope: 'glob', bodyPath: null },
                { name: 'legit', target: '*', scope: 'all', bodyPath: null }
            ];
            const winners = resolveOverlays('plan', rows).map((r) => r.name);
            assertEqual(
                winners.join(','),
                'legit',
                'A `*` target declared `scope: glob` must be rejected, not promoted into the glob ' +
                    `tier where it outranks the real all-tier overlay. Got: ${winners.join(',') || '(none)'}`
            );

            // The other two directions of the cross-check.
            const globNoStar = resolveOverlays('plan', [{ name: 'x', target: 'plan', scope: 'glob', bodyPath: null }]);
            assertEqual(globNoStar.length, 0, 'a `glob` scope with no `*` in its target is malformed');
            const exactWithStar = resolveOverlays('plan', [{ name: 'x', target: 'pl*', scope: 'exact', bodyPath: null }]);
            assertEqual(exactWithStar.length, 0, 'an `exact` scope whose target contains `*` is malformed');
        }
    },
    {
        // One mechanism: the reminder hook is the only production consumer of the lib, and the
        // prompt gate no longer injects overlay bodies.
        name: '[skill-protocol-overlay] the overlay lib has exactly one production consumer: the reminder hook',
        fn: () => {
            const repoRoot = path.resolve(__dirname, '../../../..');
            const hits = [];
            (function walk(dir) {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    if (entry.name === 'node_modules' || entry.name === '.git') continue;
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) walk(full);
                    else if (entry.isFile() && entry.name.endsWith('.cjs')) {
                        const text = fs.readFileSync(full, 'utf8');
                        if (text.includes('skill-protocol-overlay.cjs')) {
                            hits.push(path.relative(repoRoot, full).split(path.sep).join('/'));
                        }
                    }
                }
            })(path.join(repoRoot, '.claude', 'hooks'));

            const production = hits.filter((h) => !h.includes('/tests/') && !h.endsWith('lib/skill-protocol-overlay.cjs'));
            assertEqual(
                production.length,
                1,
                `Exactly ONE production file may require the overlay lib. Found: ${production.join(', ') || '(none)'}`
            );
            assertEqual(production[0], '.claude/hooks/skill-overlay-remind.cjs', 'the single consumer is the reminder hook');
            assertTrue(!fs.readFileSync(path.join(repoRoot, '.claude', 'hooks', 'init-prompt-gate.cjs'), 'utf8').includes('verlay'),
                'the prompt gate carries no overlay injection');
        }
    }
];

module.exports = {
    name: 'skill-protocol-overlay',
    tests,
    withEnv
};
