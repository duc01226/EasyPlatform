'use strict';
// doc-impact-map — routing regression net for the impact-scoped freshness pass.
//
// `/docs-update` Phase 1 verifies ONLY the reference docs and project-config
// sections this mapper routes to. Every routing hole therefore becomes a doc
// that is silently assumed fresh, so these tests pin the properties that make
// the narrow scope safe:
//
//   D1  harness edits (.claude/**) route to the glob-derived inventory docs
//       — the classic "tooling-only, fast-exit" hole (fastExit itself: D8/D9)
//   D2  config-derived module paths route to project-structure + `modules`
//   D3  a heuristic-only hit never suppresses the conventions fallback
//   D4  nothing-matched files land in `unrouted`, and unrouted blocks fastExit
//   D5  every routed doc that maps to a scan target resolves to SCAN_SKILL_MAP
//   D6  claims mode ignores command-form backticks and reports real dead paths
//   D7  the CLI is fail-open: it exits 0 and emits JSON even on junk input
//   D8  fastExit is true ONLY when the change set is genuinely empty
//   D9  an impacted change never fast-exits — Phase 1 must still run
//   D10 untracked files reach the mapper as additions (git diff alone hides them)
//   D11 short-form citations are ambiguous, not dead — F1's signal stays readable
//   D12 a malformed config regex warns loudly instead of silently narrowing routing
//   D13 a renamed file is collected under its NEW path, never the dead old one
//
// All tests here are TECHNICAL-ONLY: this repo has no canonical Feature Spec
// registry (no docs/specs/, no docs/specs-technical/), so no business TC governs
// them. The bracket prefix plus this roster IS the project's technical annotation
// (docs/project-reference/integration-test-reference.md -> New Test Quickstart, 3).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.join(REPO, '.claude', 'scripts', 'doc-impact-map.cjs');
const mapper = require(SCRIPT);

const CONFIG = (() => {
    try {
        return JSON.parse(fs.readFileSync(path.join(REPO, 'docs', 'project-config.json'), 'utf8'));
    } catch {
        return {};
    }
})();

function mapFiles(files) {
    return mapper.mapChanges(
        files.map(f => (typeof f === 'string' ? { status: 'M', file: f } : f)),
        CONFIG
    );
}

const docNames = result => result.docs.map(d => d.doc);
const sectionNames = result => result.configSections.map(s => s.section);

// --- repo-scoped fixtures (D8, D10) -----------------------------------------
// PROJECT_DIR is resolved once at module load (doc-impact-map.cjs:33), so any
// behavior that reads a DIFFERENT repo must be exercised through a spawned child
// with CLAUDE_PROJECT_DIR set — never an in-process require.

const GIT_SKIP = (() => {
    try {
        execFileSync('git', ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] });
        return false;
    } catch {
        return 'git is not available on this host';
    }
})();

let repoCounter = 0;
function makeRepo() {
    repoCounter += 1;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `doc-impact-map-${process.pid}-${repoCounter}-`));
    const g = args => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    g(['init', '-q']);
    g(['config', 'user.email', 'test@test.local']);
    g(['config', 'user.name', 'doc-impact-map-test']);
    g(['config', 'commit.gpgsign', 'false']);
    return { dir, g };
}

function cleanupRepo(dir) {
    if (dir && dir.startsWith(os.tmpdir())) {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

function runMapper(dir, args) {
    return spawnSync('node', [SCRIPT, ...args], {
        cwd: dir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
        encoding: 'utf8'
    });
}

/**
 * A real short-form citation, derived from the live file list rather than
 * hardcoded, so the test does not rot when that one file moves. Requirements:
 * nested (>=3 segments) so a 2-segment suffix exists, and that suffix must NOT
 * resolve from the repo root — otherwise checkClaims short-circuits on existsSync
 * and the ambiguous branch is never reached.
 */
function deriveShortFormCitation() {
    let tracked = [];
    try {
        tracked = execFileSync('git', ['ls-files', '*.md'], { cwd: REPO, encoding: 'utf8' })
            .split('\n')
            .map(l => l.trim().replace(/\\/g, '/'))
            .filter(Boolean);
    } catch {
        return null;
    }
    for (const f of tracked) {
        const segs = f.split('/');
        if (segs.length < 3) continue;
        const short = segs.slice(-2).join('/');
        if (fs.existsSync(path.join(REPO, short))) continue;
        return short;
    }
    return null;
}

const tests = [
    {
        name: '[doc-impact-map] D1 harness edits route to the glob-derived inventory docs',
        fn: () => {
            const result = mapFiles(['.claude/skills/example-skill/SKILL.md']);
            const docs = docNames(result);
            assertTrue(
                docs.some(d => d.endsWith('CLAUDE.md')),
                `A .claude/** edit must route to CLAUDE.md (inventory counts). Got: ${docs.join(', ')}`
            );
            assertTrue(
                docs.some(d => d.endsWith('docs-index-reference.md')),
                `A .claude/** edit must route to the docs index. Got: ${docs.join(', ')}`
            );
            // The third assertion here used to be `assertTrue(!result.fastExit, ...)`.
            // mapChanges returns {docs, configSections, unrouted} and never a fastExit
            // field, so it read `!undefined` and could not fail. Its claim — "a .claude/**
            // edit must not fast-exit" — belongs at the CLI boundary where fastExit is
            // actually assembled (doc-impact-map.cjs:662), and D9 asserts it there.
            // Re-stating it here as `unrouted.length === 0` would be no better: for a
            // single-file input, routing and unrouted are mutually exclusive, so the two
            // assertions above already imply it.
        }
    },
    {
        name: '[doc-impact-map] D1b generated mirrors route like their source',
        fn: () => {
            const result = mapFiles(['.agents/skills/example-skill/SKILL.md']);
            assertTrue(
                docNames(result).some(d => d.endsWith('CLAUDE.md')),
                'Generated mirror edits carry the same inventory impact as the source.'
            );
        }
    },
    {
        name: '[doc-impact-map] D2 configured module paths route to project-structure + modules',
        fn: () => {
            const mod = (CONFIG.modules || [])[0];
            assertTrue(!!mod, 'project-config.json must declare at least one module for this project.');
            // Derive a concrete path from the module regex rather than hardcoding one.
            const sample = mod.pathRegex
                .replace(/\[\\\\\/\]/g, '/')
                .replace(/\\\./g, '.')
                .replace(/^\//, '') + 'sample-file.cjs';
            const result = mapFiles([sample]);
            assertTrue(
                docNames(result).some(d => d.endsWith('project-structure-reference.md')),
                `Module path ${sample} must route to project-structure-reference.md. Got: ${docNames(result).join(', ')}`
            );
            assertTrue(
                sectionNames(result).includes('modules'),
                `Module path ${sample} must flag the "modules" config section. Got: ${sectionNames(result).join(', ')}`
            );
        }
    },
    {
        name: '[doc-impact-map] D3 a heuristic hit does not suppress the conventions fallback',
        fn: () => {
            const result = mapFiles(['src/Billing/Entities/Invoice.cs']);
            const docs = docNames(result);
            assertTrue(
                docs.some(d => d.endsWith('domain-entities-reference.md')),
                `Entity path must route to domain-entities-reference.md. Got: ${docs.join(', ')}`
            );
            assertTrue(
                docs.some(d => d.endsWith('code-review-rules.md')),
                `A heuristic-only hit must NOT silence the conventions fallback. Got: ${docs.join(', ')}`
            );
            const entities = result.docs.find(d => d.doc.endsWith('domain-entities-reference.md'));
            assertTrue(entities.heuristicOnly === true, 'Heuristic-only routing must be labelled as such.');
        }
    },
    {
        name: '[doc-impact-map] D4 unmatched files are reported unrouted and block fastExit',
        fn: () => {
            const result = mapFiles(['some/unknown/place/binary.bin']);
            assertEqual(result.docs.length, 0, 'An unmatched file must not invent a doc impact');
            assertTrue(
                result.unrouted.includes('some/unknown/place/binary.bin'),
                `Unmatched files must be surfaced, never dropped. Got: ${JSON.stringify(result.unrouted)}`
            );
        }
    },
    {
        name: '[doc-impact-map] D4b CLI marks fastExit only when nothing at all is impacted',
        fn: () => {
            const out = spawnSync('node', [SCRIPT, '--json', 'some/unknown/place/binary.bin'], {
                cwd: REPO,
                encoding: 'utf8'
            });
            const result = JSON.parse(out.stdout);
            assertEqual(result.fastExit, false, 'An unrouted file leaves freshness UNKNOWN — never a fast exit');
        }
    },
    {
        name: '[doc-impact-map] D5 routed reference docs resolve to a real scan target',
        fn: () => {
            const result = mapFiles(['src/app/styles/theme.scss', '.claude/hooks/example.cjs']);
            const targets = Object.values(mapper.SCAN_SKILL_MAP);
            for (const doc of result.docs) {
                if (!doc.scanTarget) continue;
                assertTrue(
                    targets.includes(doc.scanTarget),
                    `${doc.doc} routed to unknown scan target "${doc.scanTarget}"`
                );
            }
        }
    },
    {
        name: '[doc-impact-map] D6 claims mode ignores command spans and finds real dead paths',
        fn: () => {
            const fixture = path.join(REPO, '.claude', 'hooks', 'tests', 'fixtures', 'doc-impact-map-claims.tmp.md');
            const rel = '.claude/hooks/tests/fixtures/doc-impact-map-claims.tmp.md';
            fs.writeFileSync(
                fixture,
                [
                    '# fixture',
                    '',
                    'Run `node .claude/scripts/doc-impact-map.cjs` to map impact.',
                    'Live reference: `docs/project-config.json`.',
                    'Dead reference: `docs/project-reference/definitely-not-here.md:42`.',
                    'Glob (must be ignored): `docs/**/*.md`.',
                    ''
                ].join('\n'),
                'utf8'
            );
            try {
                const result = mapper.checkClaims(rel);
                assertTrue(result.exists, 'fixture doc should be readable');
                assertTrue(
                    result.missing.includes('docs/project-reference/definitely-not-here.md'),
                    `Dead path must be reported. Got: ${JSON.stringify(result.missing)}`
                );
                assertTrue(
                    !result.missing.some(m => m.includes('node ')),
                    `Command spans must not be treated as paths. Got: ${JSON.stringify(result.missing)}`
                );
                assertTrue(
                    !result.missing.some(m => m.includes('*')),
                    `Globs must not be treated as paths. Got: ${JSON.stringify(result.missing)}`
                );
            } finally {
                if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
            }
        }
    },
    {
        name: '[doc-impact-map] D7 CLI is fail-open on junk input',
        fn: () => {
            const out = spawnSync('node', [SCRIPT, '--json', '--base=definitely-not-a-ref'], {
                cwd: REPO,
                encoding: 'utf8'
            });
            assertEqual(out.status, 0, `Mapper must never block the caller. stderr: ${out.stderr}`);
            const parsed = JSON.parse(out.stdout);
            assertTrue(!!parsed.mode, 'Output must stay machine-readable even when git resolves nothing');
        }
    },
    {
        name: '[doc-impact-map] D8 fastExit is true only when the change set is genuinely empty',
        skip: GIT_SKIP,
        fn: () => {
            // fastExit is the single boolean /docs-update Phase 1 reads to skip the whole
            // freshness pass, so a wrong `true` silently certifies every doc as fresh.
            // D4b pins the false branch; this pins the true branch it gates against.
            // Real scenario: /docs-update on a branch that has not diverged from its base,
            // with a clean tree -> nothing changed -> nothing can have rotted.
            const { dir, g } = makeRepo();
            try {
                fs.writeFileSync(path.join(dir, 'seed.md'), '# seed\n', 'utf8');
                g(['add', '-A']);
                g(['commit', '-qm', 'seed']);
                const branch = g(['rev-parse', '--abbrev-ref', 'HEAD']).trim();

                const out = runMapper(dir, ['--json', `--base=${branch}`]);
                const result = JSON.parse(out.stdout);

                assertEqual(result.changedFileCount, 0, 'An undiverged clean tree has no changed files');
                assertEqual(
                    result.fastExit,
                    true,
                    `Empty change set must fast-exit. Got docs=${result.docs.length} ` +
                        `sections=${result.configSections.length} unrouted=${JSON.stringify(result.unrouted)}`
                );
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D9 an impacted change never fast-exits',
        fn: () => {
            // The claim D1 used to make against mapChanges (which never carries fastExit).
            // Asserted here at the CLI boundary, where fastExit is actually assembled.
            // A real, existing .claude/** file: `main()` stamps positionals as status 'M',
            // and a modified file always exists in production, so a non-existent path here
            // would be a state the caller can never actually pass.
            const out = spawnSync('node', [SCRIPT, '--json', '.claude/scripts/doc-impact-map.cjs'], {
                cwd: REPO,
                encoding: 'utf8'
            });
            const result = JSON.parse(out.stdout);
            assertTrue(
                result.docs.length > 0,
                `A .claude/** edit must impact at least one doc. Got: ${JSON.stringify(result.docs)}`
            );
            assertEqual(
                result.fastExit,
                false,
                'A change with impacted docs must NEVER fast-exit — Phase 1 would skip verifying them.'
            );
        }
    },
    {
        name: '[doc-impact-map] D10 untracked files reach the mapper as additions',
        skip: GIT_SKIP,
        fn: () => {
            // `git diff` never lists untracked files, yet a brand-new file is the top
            // source of doc COVERAGE gaps (doc-impact-map.cjs:179-181). If the ls-files
            // pass regressed, every new file would become invisible to the freshness
            // pass and fail SILENTLY — the exact staleness class this script prevents.
            const { dir, g } = makeRepo();
            try {
                fs.writeFileSync(path.join(dir, 'seed.md'), '# seed\n', 'utf8');
                g(['add', '-A']);
                g(['commit', '-qm', 'seed']);

                // A developer adds a new file, then runs /docs-update — genuinely back-to-back.
                const NEW_FILE = 'docs/project-reference/brand-new-doc.md';
                fs.mkdirSync(path.join(dir, 'docs', 'project-reference'), { recursive: true });
                fs.writeFileSync(path.join(dir, NEW_FILE), '# new\n', 'utf8');

                const driver =
                    'const m = require(process.argv[1]);' +
                    'process.stdout.write(JSON.stringify(m.collectChangedFiles(null)));';
                const out = spawnSync('node', ['-e', driver, SCRIPT], {
                    cwd: dir,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
                    encoding: 'utf8'
                });
                const collected = JSON.parse(out.stdout);
                const row = collected.rows.find(r => r.file === NEW_FILE);

                assertTrue(
                    !!row,
                    `An untracked file must be collected, not dropped. Got: ${JSON.stringify(collected.rows)}`
                );
                assertEqual(row.status, 'A', 'An untracked file is an ADDITION, so coverage gaps are reported as such');
                assertEqual(
                    collected.rows.filter(r => r.file === NEW_FILE).length,
                    1,
                    'A file present in both the diff and the untracked list must not be double-counted'
                );
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D11 short-form citations are ambiguous, not dead',
        fn: () => {
            // checkClaims resolves a short-form citation by suffix against `git ls-files`
            // and files it under `ambiguous` instead of `missing`. That split is what keeps
            // F1's dead list short enough that people still read it — if suffix resolution
            // regressed, every legitimate short-form citation would fail F1 at once and the
            // gate would be switched off as noise.
            const shortForm = deriveShortFormCitation();
            assertTrue(!!shortForm, 'Repo must contain a nested tracked .md file to derive a short-form citation');

            const fixture = path.join(REPO, '.claude', 'hooks', 'tests', 'fixtures', 'doc-impact-map-ambiguous.tmp.md');
            const rel = '.claude/hooks/tests/fixtures/doc-impact-map-ambiguous.tmp.md';
            fs.writeFileSync(
                fixture,
                [
                    '# fixture',
                    '',
                    `Short form (resolvable by suffix): \`${shortForm}\`.`,
                    'Genuinely dead: `docs/project-reference/no-such-doc-d11.md`.',
                    ''
                ].join('\n'),
                'utf8'
            );
            try {
                const result = mapper.checkClaims(rel);
                assertTrue(
                    result.ambiguous.includes(shortForm),
                    `Short form "${shortForm}" must be ambiguous. missing=${JSON.stringify(result.missing)} ` +
                        `ambiguous=${JSON.stringify(result.ambiguous)}`
                );
                assertTrue(
                    !result.missing.includes(shortForm),
                    `A resolvable short form must NEVER be reported dead — that is a false F1 failure.`
                );
                assertTrue(
                    result.missing.includes('docs/project-reference/no-such-doc-d11.md'),
                    `A genuinely dead path must still be reported. Got: ${JSON.stringify(result.missing)}`
                );
            } finally {
                if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
            }
        }
    },
    {
        name: '[doc-impact-map] D12 a malformed config regex warns loudly and never shrinks impact to nothing',
        skip: GIT_SKIP,
        fn: () => {
            // The dangerous failure: a typo in a project-config `pathRegex` makes safeRegex
            // return null (doc-impact-map.cjs:113-121) and buildRules SKIPS that rule — so the
            // docs that module owns stop being flagged as impacted, with no error and no
            // non-zero exit. Fail-open is correct here, but it must fail open LOUDLY: the
            // warning is the only signal, and nothing may collapse the run into a fast exit.
            const { dir, g } = makeRepo();
            try {
                const BAD = '[unclosed(';
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(
                    path.join(dir, 'docs', 'project-config.json'),
                    JSON.stringify({ modules: [{ name: 'Broken', pathRegex: BAD }] }),
                    'utf8'
                );
                fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'src', 'thing.cjs'), '// x\n', 'utf8');
                g(['add', '-A']);
                g(['commit', '-qm', 'seed']);

                const out = runMapper(dir, ['--json', 'src/thing.cjs']);
                assertEqual(out.status, 0, `A bad config regex must never block the caller. stderr: ${out.stderr}`);
                const result = JSON.parse(out.stdout);

                assertTrue(
                    result.warnings.some(w => w.includes(BAD)),
                    `The dropped rule must be named in warnings — it is the only signal that routing ` +
                        `silently narrowed. Got: ${JSON.stringify(result.warnings)}`
                );
                assertEqual(
                    result.fastExit,
                    false,
                    'A broken config must NEVER collapse into a fast exit — that would skip verifying every doc.'
                );
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D13 a renamed file is collected under its NEW path',
        skip: GIT_SKIP,
        fn: () => {
            // `git diff --name-status -M` emits "R100<TAB>old<TAB>new"; parseNameStatus takes the
            // LAST field on purpose (doc-impact-map.cjs:158-160) because docs describe where the
            // file now LIVES. Taking the old path instead would route the change to a path that no
            // longer exists, so the renamed file's real doc impact would be missed silently.
            const { dir, g } = makeRepo();
            try {
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'old-name.md'), '# stable content\n'.repeat(5), 'utf8');
                g(['add', '-A']);
                g(['commit', '-qm', 'seed']);
                g(['mv', 'docs/old-name.md', 'docs/new-name.md']);
                g(['commit', '-qm', 'rename']);

                const driver =
                    'const m = require(process.argv[1]);' +
                    'process.stdout.write(JSON.stringify(m.collectChangedFiles(null)));';
                const out = spawnSync('node', ['-e', driver, SCRIPT], {
                    cwd: dir,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
                    encoding: 'utf8'
                });
                const collected = JSON.parse(out.stdout);
                const files = collected.rows.map(r => r.file);

                assertTrue(
                    files.includes('docs/new-name.md'),
                    `A rename must be collected under its NEW path. Got: ${JSON.stringify(collected.rows)}`
                );
                assertTrue(
                    !files.includes('docs/old-name.md'),
                    `The pre-rename path must NOT be collected — it no longer exists, so routing it is a dead end. ` +
                        `Got: ${JSON.stringify(collected.rows)}`
                );
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D14 the dead-link opt-out is line-scoped, never doc-wide',
        fn: () => {
            // A reference doc sometimes names a file BECAUSE it was retired. The marker
            // lets that citation stay honest without failing F1 — but it must exempt only
            // ITS OWN line. A doc-wide switch would silently absolve every future dead
            // citation in the same file, which is how a gate quietly stops gating.
            const fixture = path.join(REPO, '.claude', 'hooks', 'tests', 'fixtures', 'doc-impact-map-optout.tmp.md');
            const rel = '.claude/hooks/tests/fixtures/doc-impact-map-optout.tmp.md';
            const marker = '<!' + '-- dead-link-ok --' + '>';
            fs.writeFileSync(
                fixture,
                [
                    '# fixture',
                    '',
                    `Retired on purpose: \`docs/project-reference/no-such-doc-d14a.md\` ${marker}`,
                    'Genuinely dead: `docs/project-reference/no-such-doc-d14b.md`',
                    ''
                ].join('\n'),
                'utf8'
            );
            try {
                const result = mapper.checkClaims(rel);
                assertTrue(
                    !result.missing.includes('docs/project-reference/no-such-doc-d14a.md'),
                    `A marked line must be exempt. Got: ${JSON.stringify(result.missing)}`
                );
                assertTrue(
                    result.missing.includes('docs/project-reference/no-such-doc-d14b.md'),
                    `An UNMARKED dead citation in the same doc must still fail — otherwise the marker ` +
                        `is a doc-wide off switch. Got: ${JSON.stringify(result.missing)}`
                );
            } finally {
                if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
            }
        }
    }
];

module.exports = {
    name: 'doc-impact-map',
    tests
};
