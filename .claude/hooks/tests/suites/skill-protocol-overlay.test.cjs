/**
 * Skill Protocol Overlay Test Suite (Plane 3 accelerator)
 *
 * Covers the resolver and injection builder in lib/skill-protocol-overlay.cjs.
 * TC-PSP-040..043 mirror the normative cases in
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
    parseSkillName,
    readRegistry,
    resolveOverlays,
    buildInjection,
    buildOverlayContext,
    MAX_INJECTION_BYTES
} = require(LIB_PATH);

function assertTrue(condition, message) {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
    }
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
        const refDir = path.join(dir, 'docs', 'project-reference');
        const bodyDir = path.join(dir, 'docs', 'project-protocols');
        fs.mkdirSync(refDir, { recursive: true });
        fs.mkdirSync(bodyDir, { recursive: true });

        if (spec.index !== undefined && spec.index !== null) {
            fs.writeFileSync(path.join(refDir, 'skill-protocols-reference.md'), spec.index, 'utf8');
        }
        for (const [name, content] of Object.entries(spec.bodies || {})) {
            fs.writeFileSync(path.join(bodyDir, `${name}.md`), content, 'utf8');
        }
        return fn(dir);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function indexWith(rows) {
    const header = [
        '# Skill Protocol Overlays — Project Registry',
        '',
        '**Protocols directory:** `docs/project-protocols/`',
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

const tests = [
    {
        // TC-PSP-040
        name: '[skill-protocol-overlay] TC-PSP-040 exact tier wins outright — /plan injects only plan-ctx',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const out = buildOverlayContext('/plan do X', dir);
                assertTrue(out.includes('bounded context'), 'plan-ctx body must be injected');
                assertTrue(!out.includes('file:line'), 'the glob overlay must NOT be injected');
                assertTrue(!out.includes('kebab-case'), 'the `*` overlay must NOT be injected');
            });
        }
    },
    {
        // TC-PSP-041
        name: '[skill-protocol-overlay] TC-PSP-041 glob tier wins — /plan-review injects only review-ev',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const out = buildOverlayContext('/plan-review the auth change', dir);
                assertTrue(out.includes('file:line'), 'review-ev body must be injected');
                assertTrue(!out.includes('bounded context'), 'exact `plan` must NOT match `plan-review`');
                assertTrue(!out.includes('kebab-case'), 'the `*` overlay must NOT be injected');
            });
        }
    },
    {
        // TC-PSP-042
        name: '[skill-protocol-overlay] TC-PSP-042 all tier is the last resort — /commit injects only house-style',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const out = buildOverlayContext('/commit', dir);
                assertTrue(out.includes('kebab-case'), 'the `*` overlay must be injected');
                assertTrue(!out.includes('bounded context') && !out.includes('file:line'), 'no other tier may apply');
            });
        }
    },
    {
        // TC-PSP-043
        name: '[skill-protocol-overlay] TC-PSP-043 no matching tier produces no output at all',
        fn: () => {
            const rows = [{ target: 'plan', scope: 'exact', name: 'plan-ctx' }];
            withFixture({ index: indexWith(rows), bodies: { 'plan-ctx': '## Rules\n\n1. X\n' } }, (dir) => {
                assertEqual(buildOverlayContext('/commit', dir), '', 'An unmatched skill must emit nothing');
            });
        }
    },
    {
        // TC-PSP-044
        name: '[skill-protocol-overlay] TC-PSP-044 a prompt with no leading slash is a no-op',
        fn: () => {
            assertEqual(parseSkillName('fix the auth bug'), null, 'no leading slash -> no skill name');
            assertEqual(parseSkillName('see /plan for details'), null, 'a mid-prompt slash must not trigger');
            assertEqual(parseSkillName('  /plan-review x'), 'plan-review', 'leading whitespace is tolerated');
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                assertEqual(buildOverlayContext('fix the auth bug', dir), '', 'no slash -> no injection');
            });
        }
    },
    {
        // TC-PSP-045
        name: '[skill-protocol-overlay] TC-PSP-045 an absent registry yields no output and no throw',
        fn: () => {
            withFixture({ index: null }, (dir) => {
                assertEqual(readRegistry(dir).length, 0, 'absent index -> empty registry');
                assertEqual(buildOverlayContext('/plan', dir), '', 'absent index -> no injection');
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
                assertEqual(buildOverlayContext('/plan', dir), '', 'sentinel-only -> no injection');
            });
        }
    },
    {
        // TC-PSP-046
        name: '[skill-protocol-overlay] TC-PSP-046 a missing body is named and skipped, never fabricated',
        fn: () => {
            const rows = [
                { target: '*-review', scope: 'glob', name: 'review-ev' },
                { target: 'plan-*', scope: 'glob', name: 'ghost' }
            ];
            withFixture({ index: indexWith(rows), bodies: { 'review-ev': '## Rules\n\n1. Cite file:line.\n' } }, (dir) => {
                const out = buildOverlayContext('/plan-review x', dir);
                assertTrue(out.includes('file:line'), 'the present body must still be injected');
                assertTrue(out.includes('ghost'), 'the missing overlay must be named');
                assertTrue(out.includes('SKIPPED, not reconstructed'), 'the skip must be explicit');
                // Non-fabrication: `ghost` may appear ONLY in the NOTE line, never as an injected
                // overlay section — an injected section is what a fabricated body would look like.
                assertTrue(
                    !out.includes('--- overlay: ghost'),
                    'a missing body must never be emitted as an overlay section (i.e. fabricated)'
                );
                const ghostLines = out.split('\n').filter((l) => l.includes('ghost'));
                assertEqual(ghostLines.length, 1, `ghost must appear exactly once, in the NOTE; got:\n${ghostLines.join('\n')}`);
                assertTrue(ghostLines[0].startsWith('NOTE:'), 'the sole ghost mention must be the skip NOTE');
            });
        }
    },
    {
        // TC-PSP-047
        name: '[skill-protocol-overlay] TC-PSP-047 bodies over the byte cap degrade to paths, never a truncated rule',
        fn: () => {
            const big = '## Rules\n\n1. ' + 'x'.repeat(MAX_INJECTION_BYTES) + '\n';
            const rows = [{ target: '*', scope: 'all', name: 'huge' }];
            withFixture({ index: indexWith(rows), bodies: { huge: big } }, (dir) => {
                const out = buildOverlayContext('/anything', dir);
                assertTrue(out.includes('exceed'), 'the cap notice must be present');
                assertTrue(out.includes('docs/project-protocols/huge.md'), 'the body PATH must be listed');
                assertTrue(!out.includes('xxxxxxxxxx'), 'no body text may be emitted past the cap');
                assertTrue(
                    Buffer.byteLength(out, 'utf8') < MAX_INJECTION_BYTES,
                    'the degraded output must be far under the cap'
                );
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
                assertEqual(buildOverlayContext('/plan', dir), '', 'no injection from a malformed table');
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
        name: '[skill-protocol-overlay] TC-PSP-04A the injection header never triggers the Hook context: prefix',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const out = buildOverlayContext('/plan do X', dir);
                const head = out.trimStart();
                assertTrue(
                    !head.startsWith('{') && !head.startsWith('['),
                    'emitPromptContext (init-prompt-gate.cjs:58-67) prefixes JSON-looking output with ' +
                        '"Hook context:" — the header must not start with { or [, or every exact-output ' +
                        'assertion is written against the wrong string'
                );
                assertTrue(head.startsWith('project-protocol-overlay for /plan'), 'header shape is pinned');
            });
        }
    },
    {
        // Authority carve-out must ride along on EVERY injection — a hostile body is contradicted
        // in the same message rather than in a file the model may not read.
        name: '[skill-protocol-overlay] every injection restates the additive-only + brief-not-authority carve-out',
        fn: () => {
            withFixture({ index: indexWith(THREE_TIER), bodies: THREE_TIER_BODIES }, (dir) => {
                const out = buildOverlayContext('/plan', dir);
                assertTrue(out.includes('ADDITIVE ONLY'), 'additive-only rule must be in the header');
                assertTrue(out.includes('never replace'), 'the non-replacement clause must be present');
                assertTrue(out.includes('NEVER an authority escalation'), 'the authority carve-out must be present');
                assertTrue(out.includes('WORKFLOW-GATE'), 'the gate carve-out must name WORKFLOW-GATE');
            });
        }
    },
    {
        // SECURITY (H1). The index doc is explicitly hand-editable, so its `Body` cell is
        // untrusted input. If resolution followed that link, one plausible-looking table row
        // would turn every skill invocation into an arbitrary file read whose contents are
        // injected AS RULES — file disclosure plus instruction injection. The path must be
        // DERIVED from Name and confined to docs/project-protocols/.
        name: '[skill-protocol-overlay] TC-PSP-04B a Body link pointing outside the protocols dir reads NOTHING',
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
                const canaryDir = path.join(dir, 'canary');
                fs.mkdirSync(canaryDir, { recursive: true });
                fs.writeFileSync(path.join(canaryDir, 'stolen.txt'), 'TOP-SECRET-CANARY\n', 'utf8');

                const out = buildOverlayContext('/plan', dir);
                assertTrue(!out.includes('TOP-SECRET-CANARY'), 'a Body link must NEVER be followed off the protocols dir');
                assertTrue(out.includes('LEGIT-RULE'), 'a legitimate sibling overlay must still resolve');
                // Derived path is docs/project-protocols/evil.md, which does not exist -> reported missing.
                assertTrue(out.includes('`evil`'), 'the rejected row must be reported by name, never silently dropped');
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
                const canaryDir = path.join(dir, 'canary');
                fs.mkdirSync(canaryDir, { recursive: true });
                fs.writeFileSync(path.join(canaryDir, 'stolen.md'), 'TOP-SECRET-CANARY\n', 'utf8');
                fs.writeFileSync(path.join(canaryDir, 'stolen.txt'), 'TOP-SECRET-CANARY\n', 'utf8');

                const out = buildOverlayContext('/plan', dir);
                assertTrue(!out.includes('TOP-SECRET-CANARY'), 'a traversal in Name must not reach the filesystem');
                assertTrue(out.includes('REJECTED as malformed'), 'the row must be reported as malformed, not as merely missing');
            });
        }
    },
    {
        // MUTATION PROBE for TC-PSP-04B/04C: prove the containment guard is what stops the read,
        // rather than the canary happening to be unreachable in the fixture layout.
        name: '[skill-protocol-overlay] TC-PSP-04D containment is non-vacuous — a legal slug in the protocols dir IS read',
        fn: () => {
            const index = indexWith([{ target: 'plan', scope: 'exact', name: 'in-bounds' }]);
            withFixture({ index, bodies: { 'in-bounds': '## Rules\n\n1. TOP-SECRET-CANARY\n' } }, (dir) => {
                const out = buildOverlayContext('/plan', dir);
                assertTrue(
                    out.includes('TOP-SECRET-CANARY'),
                    'the same content IS injected when it lives at the derived in-bounds path — so 04B/04C ' +
                        'are blocked by the containment guard, not by the content being unreadable'
                );
            });
        }
    },
    {
        // SECURITY (B-M1). Glob matching must not backtrack exponentially. A regex-compiled
        // `*` -> `.*` was measured at 136ms / 1.7s / 42.5s / 472s as stars were added, on a
        // UserPromptSubmit hook that declares NO timeout — one crafted row would wedge the
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
        // Deletability contract — asserted, not merely documented.
        name: '[skill-protocol-overlay] the accelerator plane is referenced by exactly one production file',
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
                'Exactly ONE production file may require the accelerator lib, so the plane stays ' +
                    `deletable in 2 files + 1 line. Found: ${production.join(', ') || '(none)'}`
            );
            assertEqual(production[0], '.claude/hooks/init-prompt-gate.cjs', 'the single consumer is the prompt gate');
        }
    }
];

module.exports = {
    name: 'skill-protocol-overlay',
    tests,
    withEnv
};
