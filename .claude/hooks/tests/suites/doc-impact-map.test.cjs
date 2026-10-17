'use strict';
// doc-impact-map — routing regression net for the impact-scoped freshness pass.
//
// `/docs-manager --mode=update` Phase 1 verifies ONLY the reference docs and project-config
// sections this mapper routes to. Every routing hole therefore becomes a doc
// that is silently assumed fresh, so these tests pin the properties that make
// the narrow scope safe:
//
//   D1  harness edits (.claude/**) route to the glob-derived inventory docs
//       — the classic "tooling-only, fast-exit" hole (fastExit itself: D8/D9)
//   D2  config-derived module paths route to project-structure + `modules`
//   D3  a heuristic-only hit never suppresses the conventions fallback
//   D3b a generic hit stays additive to a distinct selected owner (F1)
//   D4  nothing-matched files land in `unrouted`, and unrouted blocks fastExit
//   D5  every routed doc with a scan target resolves through built-in or generic ownership
//   D6  claims mode ignores command-form backticks and reports real dead paths
//   D7  the CLI is fail-open: it exits 0 and emits JSON even on junk input
//   D8  fastExit is true ONLY when the change set is genuinely empty
//   D9  an impacted change never fast-exits — Phase 1 must still run
//   D10 untracked files reach the mapper as additions (git diff alone hides them)
//   D11 short-form citations are ambiguous, not dead — F1's signal stays readable
//   D12 a malformed config regex warns loudly instead of silently narrowing routing
//   D13 a renamed file is collected under its NEW path, never the dead old one
//   D18 canonical business-spec claims resolve under the configured root, including when untracked
//   D19 same-named repo-root and project-reference files cannot satisfy a business-spec claim
//   D20 missing config uses the default business-spec root
//   D21 invalid business-root config never falls back to the default
//   D22 traversal, absolute, drive-relative, and UNC claims stay unresolved
//   D23 symlink/junction targets outside the business root stay unresolved
//   D24 leading-slash citations resolve repo-root-relative and are never suffix-matched
//   D25 explicit configured-root indexes resolve without weakening bucket claims
//   D26 configured-root index symlinks and traversal still fail closed
//   F1  a specific configured rule still suppresses the conventions fallback
//   F2  task-specific built-in outputs obey the EXACT selected set; always-on
//       docs and direct context-group routes stay separate; an omitted
//       `referenceDocs` still resolves to capability-backed defaults
//   F4  the always-on docs index resolves through its configured path/basename
//
// PORTABILITY: routing tests build synthetic configs from MINIMAL_CONFIG and never read this
// repo's docs/project-config.json, so the suite passes unchanged in any adopting project
// structure. The always-on index name comes from the configured resolver, and CLI/custom-index
// cases run in isolated temporary roots.
//
// All tests here are TECHNICAL-ONLY: they guard the generic impact mapper and do not implement
// any user-facing Feature Spec. The project has business Feature Specs, but none governs this
// utility; the bracket prefix plus this roster is the local technical annotation
// (docs/project-reference/integration-test-reference.md -> New Test Quickstart, 3).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.join(REPO, '.claude', 'scripts', 'doc-impact-map.cjs');
const mapper = require(SCRIPT);

// The always-on docs-index FILENAME is configurable (`.claude/.ck.json` `portability.docsIndexPath`
// or a relocated reference root). Resolve it through the same owner the mapper uses, so these
// assertions hold in ANY adopting project — not only one that keeps the default basename.
const projectLoader = require(path.join(REPO, '.claude', 'hooks', 'lib', 'project-config-loader.cjs'));
const CONFIGURED_INDEX_NAME = (() => {
    try {
        return path.basename(projectLoader.getConfiguredDocsIndexPath()) || 'docs-index-reference.md';
    } catch {
        return 'docs-index-reference.md';
    }
})();

// Portable minimal valid config: only the REQUIRED project identity. Every omitted property
// resolves to a neutral framework default, so this is what a minimal adopting project carries.
// Tests below build their own synthetic configs from it instead of reading this repo's
// docs/project-config.json — the suite must pass unchanged in any project structure.
const MINIMAL_CONFIG = { schemaVersion: 2, project: { name: 'Doc Impact Map Fixture' } };

function mapWith(files, config) {
    return mapper.mapChanges(
        files.map(f => (typeof f === 'string' ? { status: 'M', file: f } : f)),
        config
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

const DIRECTORY_LINK_SKIP = (() => {
    const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), `doc-impact-map-link-probe-${process.pid}-`));
    try {
        const target = path.join(probeDir, 'target');
        fs.mkdirSync(target);
        fs.symlinkSync(target, path.join(probeDir, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
        return false;
    } catch (error) {
        if (['EACCES', 'EPERM', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(error && error.code)) {
            return `directory symlink/junction creation is unavailable on ${process.platform}: ${error.code}`;
        }
        throw error;
    } finally {
        cleanupRepo(probeDir);
    }
})();

/** Run `checkClaims` against a throwaway repo — PROJECT_DIR is fixed at module load, so spawn. */
function checkClaimsIn(dir, relDoc) {
    const driver =
        'const m = require(process.argv[1]);' +
        'process.stdout.write(JSON.stringify(m.checkClaims(process.argv[2])));';
    const out = spawnSync('node', ['-e', driver, SCRIPT, relDoc], {
        cwd: dir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
        encoding: 'utf8'
    });
    if (out.status !== 0) throw new Error(`checkClaims driver failed: ${out.stderr}`);
    return JSON.parse(out.stdout);
}

function writeFixtureFile(dir, relativePath, content = '# fixture\n') {
    const absolutePath = path.join(dir, ...relativePath.split('/'));
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, 'utf8');
    return absolutePath;
}

function configuredBusinessSpecConfig(rootPath) {
    return {
        ...MINIMAL_CONFIG,
        specRoots: {
            business: { path: rootPath, authorship: 'authored', m1Policy: 'enforced' }
        }
    };
}

function checkFixtureClaims(dir, claims) {
    writeFixtureFile(dir, 'claims.md', claims.map(claim => `\`${claim}\``).join('\n') + '\n');
    return checkClaimsIn(dir, 'claims.md');
}

function runMapper(dir, args, env = {}) {
    return spawnSync('node', [SCRIPT, ...args], {
        cwd: dir,
        env: { ...process.env, CLAUDE_PROJECT_DIR: dir, ...env },
        encoding: 'utf8'
    });
}

/**
 * Child environment for a fixture that must NOT be a git work tree: repository discovery stops below
 * the fixture (a developer's temp path may sit inside a repository), and a git hook's GIT_DIR /
 * GIT_WORK_TREE redirection is dropped (`undefined` deletes the key).
 */
const noWorkTreeEnv = dir => ({ GIT_CEILING_DIRECTORIES: path.dirname(dir), GIT_DIR: undefined, GIT_WORK_TREE: undefined });

const tests = [
    {
        // Technical contract: selected performance preferences stay fresh after harness/system changes.
        name: '[doc-impact-map] performance guidance routes system and configured harness changes only when selected',
        fn: () => {
            const config = {
                ...MINIMAL_CONFIG,
                testing: { filePatterns: { performance: 'checks/load/**/*.scenario' } },
                referenceDocs: [{ filename: 'performance-test-reference.md', purpose: 'Performance policy' }]
            };
            for (const file of ['src/query.cs', 'deploy/Dockerfile', 'checks/load/api/cases.scenario']) {
                const result = mapWith([file], config);
                const doc = result.docs.find(item => item.doc.endsWith('/performance-test-reference.md'));
                assertTrue(!!doc, `${file} must invalidate the selected performance guide`);
                assertEqual(doc.scanTarget, 'scan --target=performance-tests');
            }
            assertTrue(!mapWith(['src/query.cs'], { ...config, referenceDocs: [] }).docs.some(item => item.doc.endsWith('performance-test-reference.md')));
            assertTrue(!mapWith(['notes/meeting.md'], config).docs.some(item => item.doc.endsWith('performance-test-reference.md')));
        }
    },
    {
        name: '[doc-impact-map] D1 harness edits route to the glob-derived inventory docs',
        fn: () => {
            const result = mapWith(['.claude/skills/example-skill/SKILL.md'], MINIMAL_CONFIG);
            const docs = docNames(result);
            assertTrue(
                docs.some(d => d.endsWith('CLAUDE.md')),
                `A .claude/** edit must route to CLAUDE.md (inventory counts). Got: ${docs.join(', ')}`
            );
            assertTrue(
                docs.some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
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
            const result = mapWith(['.agents/skills/example-skill/SKILL.md'], MINIMAL_CONFIG);
            assertTrue(
                docNames(result).some(d => d.endsWith('CLAUDE.md')),
                'Generated mirror edits carry the same inventory impact as the source.'
            );
        }
    },
    {
        name: '[doc-impact-map] D2 configured module paths route to project-structure + modules',
        fn: () => {
            // A synthetic config proves the routing is driven by CONFIG, not by this repo's
            // layout: the same assertion must hold in any project that declares a module.
            const config = {
                ...MINIMAL_CONFIG,
                modules: [{ name: 'web', pathRegex: '^apps/web/' }],
                referenceDocs: [{ filename: 'project-structure-reference.md', purpose: 'repository map' }]
            };
            const sample = 'apps/web/sample-file.cjs';
            const result = mapWith([sample], config);
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
            // Isolated: both owners selected and NO generic doc, so the only candidates are the
            // heuristic entity route and the conventions fallback. Running this against the live
            // config let its selected generic styling guide mask the fallback and make the test
            // name untrue.
            const result = mapWith(['src/Billing/Entities/Invoice.cs'], {
                project: { name: 'D3 Heuristic Fixture' },
                referenceDocs: [
                    { filename: 'domain-entities-reference.md', purpose: 'domain model' },
                    { filename: 'code-review-rules.md', purpose: 'review rules' }
                ]
            });
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
        name: '[doc-impact-map] D3b a generic hit stays additive to a distinct selected owner',
        fn: () => {
            // A repo-wide generic route says the doc MAY be stale; it is not an ownership
            // declaration for the path. Where no more-specific configured rule owns the source,
            // BOTH the generic doc and the distinct selected conventions owner must route.
            const result = mapWith(['src/app.ts'], {
                project: { name: 'D3b Coexistence Fixture' },
                referenceDocs: [
                    { filename: 'code-review-rules.md', purpose: 'review rules' },
                    { filename: 'guides/arch.md', purpose: 'architecture evidence', scanTarget: 'generic' }
                ]
            });
            const docs = docNames(result);
            assertTrue(
                docs.some(d => d.endsWith('code-review-rules.md')),
                `A generic hit must not suppress a distinct selected owner. Got: ${docs.join(', ')}`
            );
            assertTrue(
                docs.some(d => d.endsWith('/guides/arch.md')),
                `The selected generic doc must remain additive. Got: ${docs.join(', ')}`
            );
        }
    },
    {
        name: '[doc-impact-map] D4 unmatched files are reported unrouted and block fastExit',
        fn: () => {
            // The live config legitimately routes every non-disposable path through its selected
            // generic styling guide, so an input is only genuinely "unmatched" under a config that
            // selects no task-specific doc. Give D4 that exact empty selection.
            const result = mapWith(['some/unknown/place/binary.bin'], {
                project: { name: 'D4 Unrouted Fixture' },
                referenceDocs: []
            });
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
            // Run the CLI in an ISOLATED consumer root whose explicit `referenceDocs: []` is the
            // exact empty selection. Launching against the repo root (`cwd: REPO`) would let the
            // live generic styling selection make `fastExit: false` for an unrelated reason.
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), `doc-impact-map-empty-${process.pid}-`));
            try {
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(
                    path.join(dir, 'docs', 'project-config.json'),
                    JSON.stringify({
                        schemaVersion: 2,
                        project: { name: 'D4b Unrouted CLI Fixture' },
                        // A `modules` declaration would select project-structure-reference.md when
                        // `referenceDocs` is ABSENT — so it proves the explicit `[]` was really read.
                        modules: [{ name: 'src', pathRegex: '^src/' }],
                        referenceDocs: []
                    }),
                    'utf8'
                );

                const out = runMapper(dir, ['--json', 'some/unknown/place/binary.bin']);
                assertEqual(out.status, 0, `Mapper must never block the caller. stderr: ${out.stderr}`);
                const result = JSON.parse(out.stdout);
                assertEqual(result.changedFileCount, 1, 'The CLI must report the one explicit file');
                assertTrue(
                    result.unrouted.includes('some/unknown/place/binary.bin'),
                    `Empty selection must leave the .bin unrouted. Got: ${JSON.stringify(result.unrouted)}`
                );
                assertEqual(result.docs.length, 0, 'No task-specific doc may route under an exact empty selection');
                assertEqual(result.fastExit, false, 'An unrouted file leaves freshness UNKNOWN — never a fast exit');

                // Prove the intended config was loaded: `package.json` would route to
                // project-structure-reference.md if the empty selection had been ignored.
                const loaded = JSON.parse(runMapper(dir, ['--json', 'package.json']).stdout);
                assertTrue(
                    !loaded.docs.some(d => d.doc.endsWith('project-structure-reference.md')),
                    `The empty selection must be the loaded config. Got: ${JSON.stringify(loaded.docs.map(d => d.doc))}`
                );
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[doc-impact-map] D5 routed reference docs resolve to built-in or generic ownership',
        fn: () => {
            const config = {
                ...MINIMAL_CONFIG,
                referenceDocs: [
                    { filename: 'project-structure-reference.md', purpose: 'repository map' },
                    { filename: 'integration-test-reference.md', purpose: 'integration tests' },
                    { filename: 'design-system/README.md', purpose: 'design system' },
                    { filename: 'code-review-rules.md', purpose: 'review rules' },
                    { filename: 'domain-entities-reference.md', purpose: 'domain model' },
                    { filename: 'e2e-test-reference.md', purpose: 'e2e tests' }
                ]
            };
            const result = mapWith(['src/app/styles/theme.scss', '.claude/hooks/example.cjs'], config);
            const targets = Object.values(mapper.SCAN_SKILL_MAP);
            for (const doc of result.docs) {
                if (!doc.scanTarget) continue;
                assertTrue(
                    targets.includes(doc.scanTarget) || /^scan --target=generic-reference-doc --filename="[^"]+"$/.test(doc.scanTarget),
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
            // fastExit is the single boolean /docs-manager --mode=update Phase 1 reads to skip the whole
            // freshness pass, so a wrong `true` silently certifies every doc as fresh.
            // D4b pins the false branch; this pins the true branch it gates against.
            // Real scenario: /docs-manager --mode=update on a branch that has not diverged from its base,
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

                // A developer adds a new file, then runs /docs-manager --mode=update — genuinely back-to-back.
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
        skip: GIT_SKIP,
        fn: () => {
            // checkClaims resolves a short-form citation by suffix against the repo file list
            // and files it under `ambiguous` instead of `missing`. That split is what keeps
            // F1's dead list short enough that people still read it — if suffix resolution
            // regressed, every legitimate short-form citation would fail F1 at once and the
            // gate would be switched off as noise. The list is `git ls-files`; a project with
            // no git work tree (an exported copy) lists its own tree instead and says so,
            // because a live file must not read as dead there either.
            // The short form must NOT resolve from the project root — otherwise checkClaims
            // short-circuits on existsSync and the ambiguous branch is never reached.
            const NESTED = 'packages/tooling/shared/contract.md';
            const SHORT_FORM = 'shared/contract.md';
            const DEAD = 'docs/project-reference/no-such-doc-d11.md';
            const seed = dir => {
                writeFixtureFile(dir, NESTED);
                writeFixtureFile(dir, 'claims.md', `Short form: \`${SHORT_FORM}\`.\nGenuinely dead: \`${DEAD}\`.\n`);
            };
            const claims = (dir, env) => {
                const out = runMapper(dir, ['claims', '--json', 'claims.md'], env);
                const { results, warnings } = JSON.parse(out.stdout);
                return { result: results[0], gitListingFailed: warnings.some(w => w.startsWith('git ls-files failed')) };
            };
            const assertSplit = ({ result }, where) => {
                assertTrue(
                    result.ambiguous.includes(SHORT_FORM),
                    `${where}: short form "${SHORT_FORM}" must be ambiguous. missing=${JSON.stringify(result.missing)} ` +
                        `ambiguous=${JSON.stringify(result.ambiguous)}`
                );
                assertTrue(
                    !result.missing.includes(SHORT_FORM),
                    `${where}: a resolvable short form must NEVER be reported dead — that is a false F1 failure.`
                );
                assertTrue(
                    result.missing.includes(DEAD),
                    `${where}: a genuinely dead path must still be reported. Got: ${JSON.stringify(result.missing)}`
                );
            };

            const { dir, g } = makeRepo();
            let plain;
            try {
                // Given a repository that tracks the nested file
                seed(dir);
                g(['add', '-A']);
                // When its claims are checked, then git's own list resolves the short form
                const tracked = claims(dir);
                assertSplit(tracked, 'git file list');
                assertTrue(!tracked.gitListingFailed, 'A git work tree must be listed by git, not by the tree walk');

                // Given the same tree in a project that is not a git work tree
                plain = fs.mkdtempSync(path.join(os.tmpdir(), `doc-impact-map-${process.pid}-plain-`));
                seed(plain);
                // When its claims are checked, then the project tree resolves the short form, with a warning
                const walked = claims(plain, noWorkTreeEnv(plain));
                assertSplit(walked, 'project tree');
                assertTrue(walked.gitListingFailed, 'A failed git listing must warn instead of passing silently');
            } finally {
                cleanupRepo(dir);
                cleanupRepo(plain);
            }
        }
    },
    {
        name: '[doc-impact-map] D18 canonical business-spec claims resolve under the configured root while untracked',
        skip: GIT_SKIP,
        fn: () => {
            const { dir, g } = makeRepo();
            const claims = ['SampleBucket/INDEX.md', 'SampleBucket/README.Feature.md'];
            const files = claims.map(claim => `custom-specs/${claim}`);
            try {
                // Given: a relocated business-spec root holding both canonical forms, untracked by git.
                writeFixtureFile(dir, 'docs/project-config.json', JSON.stringify(configuredBusinessSpecConfig('custom-specs')));
                for (const relativePath of files) writeFixtureFile(dir, relativePath);

                assertEqual(g(['ls-files', '--', ...files]).trim(), '', 'Configured-root Feature Spec fixtures must remain untracked.');
                // When: a reference doc cites them in their bucket-relative form.
                const result = checkFixtureClaims(dir, claims);
                // Then: both resolve precisely under the configured root — neither dead nor ambiguous.
                assertEqual(result.checked, claims.length, 'Both canonical business-spec claim forms should be checked.');
                for (const claim of claims) {
                    assertTrue(!result.missing.includes(claim), `Configured business root must resolve ${claim}.`);
                    assertTrue(!result.ambiguous.includes(claim), `Configured business root must resolve ${claim} precisely.`);
                }
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D19 repo-root and project-reference collisions cannot satisfy business-spec claims',
        skip: GIT_SKIP,
        fn: () => {
            const claims = ['SampleBucket/INDEX.md', 'SampleBucket/README.Feature.md'];
            for (const collisionRoot of ['repo-root', 'project-reference']) {
                const { dir, g } = makeRepo();
                try {
                    // Given: same-named copies at the repo root (untracked) or under project-reference
                    // (tracked), and nothing under the configured business-spec root.
                    writeFixtureFile(dir, 'docs/project-config.json', JSON.stringify(configuredBusinessSpecConfig('custom-specs')));
                    const files = claims.map(claim =>
                        collisionRoot === 'repo-root' ? claim : `docs/project-reference/${claim}`
                    );
                    for (const relativePath of files) writeFixtureFile(dir, relativePath);
                    if (collisionRoot === 'project-reference') {
                        g(['add', '--', ...files]);
                    } else {
                        assertEqual(g(['ls-files', '--', ...files]).trim(), '', 'Repo-root collision fixtures must be untracked.');
                    }

                    // When: the canonical business-spec claims are checked.
                    const result = checkFixtureClaims(dir, claims);
                    // Then: the collisions satisfy nothing — each claim is dead, never ambiguous.
                    for (const claim of claims) {
                        assertTrue(
                            result.missing.includes(claim),
                            `${collisionRoot} copies must not satisfy the configured business-spec claim ${claim}.`
                        );
                        assertTrue(
                            !result.ambiguous.includes(claim),
                            `${collisionRoot} copies must not turn a canonical business-spec claim into a short-form citation.`
                        );
                    }
                } finally {
                    cleanupRepo(dir);
                }
            }
        }
    },
    {
        name: '[doc-impact-map] D25 explicit configured-root indexes resolve, but missing indexes stay missing',
        skip: GIT_SKIP,
        fn: () => {
            for (const root of ['specs', 'custom-specs', 'custom/specifications']) {
                const { dir } = makeRepo();
                const claim = `${root}/INDEX.md`;
                try {
                    writeFixtureFile(dir, 'docs/project-config.json', JSON.stringify(configuredBusinessSpecConfig(root)));
                    writeFixtureFile(dir, claim);
                    const present = checkFixtureClaims(dir, [claim]);
                    assertEqual(present.checked, 1, 'The explicit root index must be checked.');
                    assertEqual(present.missing.length, 0, `${claim} must resolve to its real configured root.`);
                    assertEqual(present.ambiguous.length, 0, 'Root identity must be exact, not suffix-based.');
                    fs.unlinkSync(path.join(dir, claim));
                    writeFixtureFile(dir, `other/${claim}`);
                    const missing = checkFixtureClaims(dir, [claim]);
                    assertTrue(missing.missing.includes(claim), 'A same-named index elsewhere cannot replace the missing root index.');
                } finally {
                    cleanupRepo(dir);
                }
            }
        }
    },
    {
        name: '[doc-impact-map] D26 a root-index shortcut cannot admit traversal or an escaping root symlink',
        skip: GIT_SKIP || DIRECTORY_LINK_SKIP,
        fn: () => {
            const { dir } = makeRepo();
            const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-impact-index-outside-'));
            try {
                writeFixtureFile(dir, 'docs/project-config.json', JSON.stringify(configuredBusinessSpecConfig('specs')));
                writeFixtureFile(dir, 'specs/INDEX.md');
                const traversal = 'other/../specs/INDEX.md';
                assertTrue(checkFixtureClaims(dir, [traversal]).missing.includes(traversal), 'Traversal cannot reach the root-index shortcut.');
                writeFixtureFile(outside, 'INDEX.md');
                fs.unlinkSync(path.join(dir, 'specs/INDEX.md'));
                fs.rmdirSync(path.join(dir, 'specs'));
                fs.symlinkSync(outside, path.join(dir, 'specs'), process.platform === 'win32' ? 'junction' : 'dir');
                assertTrue(checkFixtureClaims(dir, ['specs/INDEX.md']).missing.includes('specs/INDEX.md'), 'The configured root and its index must remain physically inside the project.');
            } finally {
                cleanupRepo(dir);
                cleanupRepo(outside);
            }
        }
    },
    {
        name: '[doc-impact-map] D20 missing project config uses the default business-spec root',
        skip: GIT_SKIP,
        fn: () => {
            const { dir, g } = makeRepo();
            const claims = ['DefaultBucket/INDEX.md', 'DefaultBucket/README.Feature.md'];
            const files = claims.map(claim => `docs/specs/${claim}`);
            try {
                // Given: no project config and both canonical forms under the default business-spec root.
                for (const relativePath of files) writeFixtureFile(dir, relativePath);
                assertTrue(!fs.existsSync(path.join(dir, 'docs', 'project-config.json')), 'The fixture must have no declared project config.');
                assertEqual(g(['ls-files', '--', ...files]).trim(), '', 'Default-root spec fixtures must remain untracked.');

                // When: the claims are checked.
                const result = checkFixtureClaims(dir, claims);
                // Then: the default root resolves them precisely.
                assertEqual(result.missing.length, 0, `A missing config should use docs/specs. Got ${JSON.stringify(result.missing)}.`);
                assertEqual(result.ambiguous.length, 0, 'Default-root business-spec claims should resolve precisely.');
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D21 invalid business-root config never falls back to default docs/specs',
        skip: GIT_SKIP,
        fn: () => {
            const { dir } = makeRepo();
            const claims = ['InvalidBucket/INDEX.md', 'InvalidBucket/README.Feature.md'];
            try {
                // Given: an escaping (invalid) business root and valid copies under the DEFAULT root.
                writeFixtureFile(
                    dir,
                    'docs/project-config.json',
                    JSON.stringify(configuredBusinessSpecConfig('../outside-specs'))
                );
                for (const claim of claims) writeFixtureFile(dir, `docs/specs/${claim}`);

                // When: the claims are checked.
                const result = checkFixtureClaims(dir, claims);
                // Then: the invalid config is not silently replaced by the default — every claim is dead.
                for (const claim of claims) {
                    assertTrue(
                        result.missing.includes(claim),
                        `Invalid declared config must not use a default-root copy to satisfy ${claim}.`
                    );
                    assertTrue(!result.ambiguous.includes(claim), `${claim} is canonical, not an ambiguous suffix.`);
                }
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D22 traversal, absolute, drive-relative, and UNC claims stay unresolved',
        skip: GIT_SKIP,
        fn: () => {
            const { dir } = makeRepo();
            const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), `doc-impact-map-escape-${process.pid}-`));
            try {
                // Given: real spec files that exist only OUTSIDE the project, and claims that reach
                // them by traversal, absolute, drive, drive-relative, and UNC forms.
                writeFixtureFile(outsideDir, 'EscapeBucket/INDEX.md');
                writeFixtureFile(outsideDir, 'EscapeBucket/README.Feature.md');
                const outsideIndex = path.join(outsideDir, 'EscapeBucket', 'INDEX.md');
                const claims = [
                    path.relative(dir, outsideIndex).replace(/\\/g, '/'),
                    path.resolve(outsideIndex).replace(/\\/g, '/'),
                    '/outside/EscapeBucket/INDEX.md',
                    'C:/outside/EscapeBucket/INDEX.md',
                    'C:relative/EscapeBucket/INDEX.md',
                    '//server/share/EscapeBucket/INDEX.md'
                ];

                // When: the claims are checked.
                const result = checkFixtureClaims(dir, claims);
                // Then: none resolves outside the project; each is dead and none is a short-form suffix.
                for (const claim of claims) {
                    assertTrue(result.missing.includes(claim), `Unsafe path claim must stay unresolved: ${claim}.`);
                }
                assertEqual(result.ambiguous.length, 0, 'Unsafe paths must not be mistaken for short-form citations.');
            } finally {
                cleanupRepo(dir);
                cleanupRepo(outsideDir);
            }
        }
    },
    {
        name: '[doc-impact-map] D23 symlink or junction escapes cannot satisfy a business-spec claim',
        // makeRepo() runs `git init`, so a git-less host must skip exactly like its siblings.
        skip: GIT_SKIP || DIRECTORY_LINK_SKIP,
        fn: () => {
            const { dir } = makeRepo();
            const claims = ['LinkedBucket/INDEX.md', 'LinkedBucket/README.Feature.md'];
            try {
                // Given: the configured business root's bucket is a symlink/junction to a directory
                // outside that root that holds both canonical files.
                writeFixtureFile(dir, 'docs/project-config.json', JSON.stringify(configuredBusinessSpecConfig('custom-specs')));
                const targetDir = path.join(dir, 'outside-specs', 'LinkedBucket');
                writeFixtureFile(dir, 'outside-specs/LinkedBucket/INDEX.md');
                writeFixtureFile(dir, 'outside-specs/LinkedBucket/README.Feature.md');
                const linkPath = path.join(dir, 'custom-specs', 'LinkedBucket');
                fs.mkdirSync(path.dirname(linkPath), { recursive: true });
                fs.symlinkSync(targetDir, linkPath, process.platform === 'win32' ? 'junction' : 'dir');

                // When: the claims are checked.
                const result = checkFixtureClaims(dir, claims);
                // Then: physical containment rejects the link — each claim stays a canonical dead claim.
                for (const claim of claims) {
                    assertTrue(result.missing.includes(claim), `A link outside the configured business root must not satisfy ${claim}.`);
                    assertTrue(!result.ambiguous.includes(claim), `${claim} must remain a canonical missing claim.`);
                }
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] D24 leading-slash citations resolve repo-root-relative, never by suffix',
        skip: GIT_SKIP,
        fn: () => {
            const { dir, g } = makeRepo();
            try {
                // Given: a repo-root file, a nested tracked file whose SUFFIX a rooted claim would
                // match, and a business-spec copy a rooted two-segment claim must not borrow.
                writeFixtureFile(dir, 'docs/guide.md');
                writeFixtureFile(dir, 'plans/INDEX.md');
                writeFixtureFile(dir, 'nested/area/notes.md');
                writeFixtureFile(dir, 'docs/specs/RootedBucket/INDEX.md');
                g(['add', '--', 'nested/area/notes.md']);
                const claims = ['/docs/guide.md', '/plans/INDEX.md', '/area/notes.md', '/RootedBucket/INDEX.md', '/docs/absent.md'];

                // When: the rooted citations are checked.
                const result = checkFixtureClaims(dir, claims);

                // Then: citations naming a real repo-root file resolve; the rest are dead as cited,
                // and a rooted claim is precise, so it never becomes an ambiguous suffix match.
                for (const claim of ['/docs/guide.md', '/plans/INDEX.md']) {
                    assertTrue(!result.missing.includes(claim), `Repo-rooted citation must resolve: ${claim}. missing=${JSON.stringify(result.missing)}`);
                }
                for (const claim of ['/area/notes.md', '/RootedBucket/INDEX.md', '/docs/absent.md']) {
                    assertTrue(result.missing.includes(claim), `Repo-rooted citation with no repo-root file must be dead as cited: ${claim}.`);
                }
                assertEqual(result.ambiguous.length, 0, `Rooted citations are precise, never suffix matches. ambiguous=${JSON.stringify(result.ambiguous)}`);
            } finally {
                cleanupRepo(dir);
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
    },
    {
        name: '[doc-impact-map] D15 typed non-repository path roles are line-scoped and unknown roles stay strict',
        fn: () => {
            const fixture = path.join(REPO, '.claude', 'hooks', 'tests', 'fixtures', 'doc-impact-map-path-roles.tmp.md');
            const rel = '.claude/hooks/tests/fixtures/doc-impact-map-path-roles.tmp.md';
            const generated = '<!' + '-- path-role: generated-output --' + '>';
            const proposed = '<!' + '-- path-role: proposed --' + '>';
            const local = '<!' + '-- path-role: user-local --' + '>';
            const unknown = '<!' + '-- path-role: maybe-external --' + '>';
            fs.writeFileSync(
                fixture,
                [
                    `Generated: \`test-results/playwright-results.json\` ${generated}`,
                    `Proposed: \`tests/helpers/not-yet-d15.ts\` ${proposed}`,
                    `Developer-local: \`apps/web/.env.local\` ${local}`,
                    `Unknown role: \`docs/project-reference/no-such-doc-d15a.md\` ${unknown}`,
                    'Unmarked dead path: `docs/project-reference/no-such-doc-d15b.md`',
                    ''
                ].join('\n'),
                'utf8'
            );
            try {
                const result = mapper.checkClaims(rel);
                assertTrue(!result.missing.includes('test-results/playwright-results.json'), 'generated output must not be required in a fresh checkout');
                assertTrue(!result.missing.includes('tests/helpers/not-yet-d15.ts'), 'proposed destinations must remain valid guidance');
                assertTrue(!result.missing.includes('apps/web/.env.local'), 'per-developer files must not be required in the repository');
                assertTrue(result.missing.includes('docs/project-reference/no-such-doc-d15a.md'), 'unknown role values must not opt out');
                assertTrue(result.missing.includes('docs/project-reference/no-such-doc-d15b.md'), 'unmarked dead paths must still fail');
            } finally {
                if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
            }
        }
    },
    {
        // Self-contained: the workspace packages and target files these claims cite are seeded in a
        // throwaway repo, so the assertion never depends on one adopting project's live tree.
        name: '[doc-impact-map] D16 exported and no-exports workspace package paths resolve only when targets exist',
        skip: GIT_SKIP,
        fn: () => {
            const { dir, g } = makeRepo();
            try {
                const write = (rel, text) => {
                    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
                    fs.writeFileSync(path.join(dir, rel), text, 'utf8');
                };
                write('packages/survey-runner/package.json', JSON.stringify({ name: '@example/survey-runner', exports: { './styles.css': './dist/styles.css' } }));
                write('packages/survey-runner/dist/styles.css', 'body{}\n');
                write('packages/web/package.json', JSON.stringify({ name: '@example/web' }));
                write('packages/web/app/page.tsx', 'export default null;\n');
                write('docs/claims.md', [
                    'Public export: `@example/survey-runner/styles.css`.',
                    'Missing export: `@example/survey-runner/no-such-d15.css`.',
                    'Existing path in package without exports: `@example/web/app/page.tsx`.',
                    'Missing path in package without exports: `@example/web/no-such-d16.ts`.',
                    ''
                ].join('\n'));
                g(['add', '-A']);
                g(['commit', '-qm', 'seed']);

                const result = checkClaimsIn(dir, 'docs/claims.md');
                assertTrue(!result.missing.includes('@example/survey-runner/styles.css'), 'an exported workspace subpath with an existing target is valid');
                assertTrue(result.missing.includes('@example/survey-runner/no-such-d15.css'), 'a missing package export must remain visible');
                assertTrue(!result.missing.includes('@example/web/app/page.tsx'), 'an existing in-package path remains valid when the package has no exports map');
                assertTrue(result.missing.includes('@example/web/no-such-d16.ts'), 'a missing in-package path remains visible when the package has no exports map');
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        // Self-contained for the same reason as D16: the full citation's target is seeded locally.
        name: '[doc-impact-map] D17 ASCII and Unicode path elisions are ignored while full paths still resolve',
        skip: GIT_SKIP,
        fn: () => {
            const { dir, g } = makeRepo();
            try {
                const target = path.join(dir, 'packages', 'platform', 'src', 'jobs', '__tests__', 'idempotency.integration.test.ts');
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.writeFileSync(target, '// fixture\n', 'utf8');
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(path.join(dir, 'docs', 'claims.md'), [
                    'ASCII elision: `packages/.../idempotency.test.ts`.',
                    'Unicode elision: `packages/…/idempotency.test.ts`.',
                    'Full citation: `packages/platform/src/jobs/__tests__/idempotency.integration.test.ts`.',
                    ''
                ].join('\n'), 'utf8');
                g(['add', '-A']);
                g(['commit', '-qm', 'seed']);

                const result = checkClaimsIn(dir, 'docs/claims.md');
                assertEqual(result.missing.length, 0, `Elided examples should be ignored and the full path should resolve: ${JSON.stringify(result)}`);
                assertTrue(result.checked >= 1, 'the checker must still examine at least the full path');
            } finally {
                cleanupRepo(dir);
            }
        }
    },
    {
        name: '[doc-impact-map] selected generic refs receive impact routing; manual refs do not',
        fn: () => {
            const genericConfig = {
                project: { name: 'Generic Reference Fixture' },
                referenceDocs: [{
                    filename: 'guides/architecture.md',
                    purpose: 'Repository architecture evidence',
                    scanTarget: 'generic'
                }]
            };
            const generic = mapper.mapChanges([{ status: 'M', file: 'src/app.ts' }], genericConfig);
            const genericDoc = generic.docs.find(entry => entry.doc.endsWith('/guides/architecture.md'));
            assertTrue(genericDoc, `A selected generic doc must receive conservative source-impact routing: ${JSON.stringify(generic.docs)}`);
            assertEqual(
                genericDoc.scanTarget,
                'scan --target=generic-reference-doc --filename="guides/architecture.md"',
                'Impact output points at the exact configured generic scan target'
            );

            const manual = mapper.mapChanges([{ status: 'M', file: 'src/app.ts' }], {
                project: { name: 'Manual Reference Fixture' },
                referenceDocs: [{ filename: 'guides/operations.md', purpose: 'Curated operator reference' }]
            });
            assertTrue(
                !manual.docs.some(entry => entry.doc.endsWith('/guides/operations.md')),
                'A manually owned reference never receives an automatic freshness claim'
            );

            const disposable = mapper.mapChanges([{ status: 'M', file: 'tmp/run/report.json' }], genericConfig);
            assertTrue(
                !disposable.docs.some(entry => entry.doc.endsWith('/guides/architecture.md')),
                'Run-local disposable output does not stale a generic project reference'
            );
        }
    },
    {
        name: '[doc-impact-map] generic reference routing honors a relocated root and exact selection',
        fn: () => {
            const config = {
                project: { name: 'Relocated Generic Reference Fixture' },
                docsRoots: { projectReference: { path: 'knowledge/references' } },
                referenceDocs: [{
                    filename: 'guides/architecture.md',
                    purpose: 'Repository architecture evidence',
                    scanTarget: 'generic'
                }]
            };
            const out = inFakeProject(config, `
                const mapper = require(REPO + '/.claude/scripts/doc-impact-map.cjs');
                return mapper.mapChanges([{ status: 'M', file: 'src/app.ts' }], ${JSON.stringify(config)});
            `);
            const doc = out.docs.find(entry => entry.doc === 'knowledge/references/guides/architecture.md');
            assertTrue(doc, `The generic output must use the configured root exactly: ${JSON.stringify(out.docs)}`);
            assertEqual(
                doc.scanTarget,
                'scan --target=generic-reference-doc --filename="guides/architecture.md"',
                'The relocated output retains the exact selected generic scan invocation'
            );
        }
    },
    // --- F2: task-specific built-in outputs obey the exact selected set --------------
    {
        name: '[doc-impact-map] F1 a specific configured rule still suppresses the conventions fallback',
        fn: () => {
            // The additive-generic change must not over-relax: a genuinely specific configured
            // rule that OWNS the path still suppresses the generic conventions fallback.
            const config = {
                project: { name: 'Specific Suppression Fixture' },
                modules: [{ name: 'web', pathRegex: '^apps/web/' }],
                referenceDocs: [
                    { filename: 'project-structure-reference.md', purpose: 'repository map' },
                    { filename: 'code-review-rules.md', purpose: 'review rules' }
                ]
            };
            const docs = docNames(mapWith(['apps/web/foo.ts'], config));
            assertTrue(
                docs.some(d => d.endsWith('project-structure-reference.md')),
                `The specific configured owner must route. Got: ${docs.join(', ')}`
            );
            assertTrue(
                !docs.some(d => d.endsWith('code-review-rules.md')),
                `A specific configured owner still suppresses the fallback. Got: ${docs.join(', ')}`
            );
        }
    },
    {
        name: '[doc-impact-map] F2 an omitted referenceDocs resolves to capability-backed defaults',
        fn: () => {
            // The config FILE is required, but individual properties are optional. With
            // `referenceDocs` omitted, the canonical resolver selects capability-backed docs from
            // config evidence — so a project that never writes a custom override still gets its
            // framework default routing.
            const config = {
                project: { name: 'Capability Default Fixture' },
                modules: [{ name: 'web', pathRegex: '^apps/web/' }]
            };
            const docs = docNames(mapWith(['apps/web/foo.ts'], config));
            assertTrue(
                docs.some(d => d.endsWith('project-structure-reference.md')),
                `An omitted referenceDocs must still select the capability-backed doc. Got: ${docs.join(', ')}`
            );
            assertTrue(
                !docs.some(d => d.endsWith('code-review-rules.md')),
                `Only capability-backed docs are selected when referenceDocs is omitted. Got: ${docs.join(', ')}`
            );
        }
    },
    {
        name: '[doc-impact-map] F2 exact empty selection emits no task-specific built-in docs or scan commands',
        fn: () => {
            // An explicit `referenceDocs: []` is the exact task-specific selection. Every static
            // built-in rule must therefore emit NOTHING for these representative route classes —
            // otherwise the map hands /docs-manager --mode=update a scan the exact-selection gate must block.
            const empty = { project: { name: 'Empty Selection Fixture' }, referenceDocs: [] };
            const cases = [
                ['src/app.ts', 'plain source'],
                ['package.json', 'dependency manifest'],
                ['apps/web/app/theme.css', 'stylesheet'],
                ['src/example.test.ts', 'test surface'],
                ['src/Billing/Entities/Invoice.cs', 'heuristic entity path']
            ];
            for (const [file, label] of cases) {
                const result = mapWith([file], empty);
                assertEqual(
                    result.docs.length,
                    0,
                    `${label}: exact empty selection must emit no task-specific doc. Got: ${JSON.stringify(docNames(result))}`
                );
            }
        }
    },
    {
        name: '[doc-impact-map] F2 empty selection preserves always-on docs and drops only task-specific built-ins',
        fn: () => {
            const empty = { ...MINIMAL_CONFIG, referenceDocs: [] };
            const result = mapWith(['.claude/skills/x/SKILL.md'], empty);
            const docs = docNames(result);
            assertTrue(docs.some(d => d.endsWith('CLAUDE.md')), `Root instructions stay always-on. Got: ${docs.join(', ')}`);
            assertTrue(
                result.docs.some(d => d.scanTarget === 'scan --target=docs-index'),
                `The docs index stays always-on and keeps its command. Got: ${JSON.stringify(result.docs.map(d => [d.doc, d.scanTarget]))}`
            );
            assertTrue(
                docs.some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                `The always-on index keeps its configured filename. Got: ${docs.join(', ')}`
            );
            assertTrue(
                !docs.some(d => d.endsWith('project-structure-reference.md')),
                `An unselected task-specific built-in must not route. Got: ${docs.join(', ')}`
            );
        }
    },
    {
        name: '[doc-impact-map] F2 a selected subset emits only its own task-specific docs',
        fn: () => {
            const subset = {
                project: { name: 'Subset Fixture' },
                referenceDocs: [{ filename: 'code-review-rules.md', purpose: 'review rules' }]
            };
            const docs = docNames(mapWith(['src/app.ts', 'package.json'], subset));
            assertTrue(
                docs.some(d => d.endsWith('code-review-rules.md')),
                `The selected owner must route. Got: ${docs.join(', ')}`
            );
            for (const rel of docs) {
                assertTrue(
                    !rel.endsWith('/design-system/README.md') && !rel.endsWith('scss-styling-guide.md') && !rel.endsWith('project-structure-reference.md'),
                    `A subset selection must not fabricate an unselected built-in. Got: ${rel}`
                );
            }
        }
    },
    {
        name: '[doc-impact-map] F2 a generic-only selection leaks no unrelated built-in doc',
        fn: () => {
            const genericOnly = {
                project: { name: 'Generic Only Fixture' },
                referenceDocs: [{ filename: 'guides/arch.md', purpose: 'architecture evidence', scanTarget: 'generic' }]
            };
            const docs = docNames(mapWith(['src/Billing/Entities/Invoice.cs'], genericOnly));
            assertTrue(docs.some(d => d.endsWith('/guides/arch.md')), `The selected generic doc must route. Got: ${docs.join(', ')}`);
            assertTrue(!docs.some(d => d.endsWith('domain-entities-reference.md')), `An unselected heuristic built-in must not leak. Got: ${docs.join(', ')}`);
            assertTrue(!docs.some(d => d.endsWith('code-review-rules.md')), `An unselected conventions owner must not be fabricated. Got: ${docs.join(', ')}`);
        }
    },
    {
        name: '[doc-impact-map] F2 a direct context-group route keeps reader impact but gains no unselected scan command',
        fn: () => {
            const config = {
                project: { name: 'Context Group Fixture' },
                referenceDocs: [],
                contextGroups: [{ name: 'legacy', pathRegexes: ['^/src/'], guideDoc: 'docs/project-reference/code-review-rules.md' }]
            };
            const result = mapWith(['src/app.ts'], config);
            const doc = result.docs.find(d => d.doc.endsWith('code-review-rules.md'));
            assertTrue(
                doc,
                `A directly configured context-group doc remains a reader-impact route. Got: ${JSON.stringify(docNames(result))}`
            );
            assertEqual(
                doc.scanTarget,
                null,
                'An unselected built-in filename must not inherit a scan command from its basename'
            );
        }
    },
    {
        name: '[doc-impact-map] F2 an unselected built-in styling guide is not routed beside a selected generic one',
        fn: () => {
            // Reproduces the concrete consumer mismatch without reading this repo's config: a
            // project that replaced the legacy SCSS guide with a custom generic styling doc must
            // NOT keep routing the now-unselected built-in.
            const config = {
                ...MINIMAL_CONFIG,
                referenceDocs: [
                    { filename: 'design-system/README.md', purpose: 'design system' },
                    { filename: 'guides/styling.md', purpose: 'styling evidence', scanTarget: 'generic' }
                ]
            };
            const docs = docNames(mapWith(['apps/web/app/styles/theme.scss'], config));
            assertTrue(!docs.some(d => d.endsWith('scss-styling-guide.md')), `The unselected legacy SCSS guide must not route. Got: ${docs.join(', ')}`);
            assertTrue(docs.some(d => d.endsWith('/guides/styling.md')), `The selected generic styling doc must still route. Got: ${docs.join(', ')}`);
            assertTrue(docs.some(d => d.endsWith('design-system/README.md')), `The selected design-system doc must still route. Got: ${docs.join(', ')}`);
        }
    },
    // --- F4: the always-on docs index resolves through its configured path -----------
    {
        name: '[doc-impact-map] F4 the always-on docs index routes to its CONFIGURED path, never the default alias',
        fn: () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), `doc-impact-map-index-${process.pid}-`));
            try {
                fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.mkdirSync(path.join(dir, 'knowledge', 'reference'), { recursive: true });
                fs.writeFileSync(
                    path.join(dir, '.claude', '.ck.json'),
                    JSON.stringify({ portability: { enabled: true, docsIndexPath: 'knowledge/reference/project-context-index.md' } }),
                    'utf8'
                );
                fs.writeFileSync(
                    path.join(dir, 'docs', 'project-config.json'),
                    JSON.stringify({ schemaVersion: 2, project: { name: 'Custom Index Fixture' } }),
                    'utf8'
                );
                const configuredRel = 'knowledge/reference/project-context-index.md';
                fs.writeFileSync(path.join(dir, configuredRel), '# configured index\n', 'utf8');

                const harness = runMapper(dir, ['--json', '.claude/skills/x/SKILL.md']);
                assertEqual(harness.status, 0, `mapper must not block: ${harness.stderr}`);
                const harnessOut = JSON.parse(harness.stdout);
                const index = harnessOut.docs.find(d => d.doc === configuredRel);
                assertTrue(index, `The harness route must name the configured index. Got: ${JSON.stringify(harnessOut.docs.map(d => d.doc))}`);
                assertEqual(index.exists, true, 'The configured index exists and must be reported present');
                assertEqual(index.scanTarget, 'scan --target=docs-index', 'The always-on index keeps its docs-index scan target');
                assertTrue(
                    !harnessOut.docs.some(d => d.doc.endsWith('docs-index-reference.md')),
                    `No default-basename sibling may be emitted. Got: ${JSON.stringify(harnessOut.docs.map(d => d.doc))}`
                );
                assertTrue(harnessOut.docs.some(d => d.doc.endsWith('CLAUDE.md')), 'Root instructions remain a separate always-on output');

                const tree = runMapper(dir, ['--json', 'docs/guide.md']);
                const treeOut = JSON.parse(tree.stdout);
                assertTrue(
                    treeOut.docs.some(d => d.doc === configuredRel),
                    `The docs-tree route must also name the configured index. Got: ${JSON.stringify(treeOut.docs.map(d => d.doc))}`
                );
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    }
];

// --- TC-DOCROOT-080..087 — configured roots + segment-boundary matching ------
//
// Phase 08 of `plans/260917-0521-config-driven-docs-spec-roots`. These pin SC-5:
// prefix/regex root matching must NOT fail open on trailing-slash, backslash, or
// case variance, and every CONSTRUCTION of a configured root goes through
// `joinRoot` rather than bare template concatenation.
//
// `doc-sync-classify.cjs` and `project-config-loader.cjs` cache the project config
// at module load, so the cases that need a DIFFERENT config are exercised in a
// spawned child with `CLAUDE_PROJECT_DIR` pointed at a throwaway project — the same
// device D8/D10 above already use. Cases whose function takes an explicit `config`
// argument run in-process.

const CLASSIFY = path.join(REPO, '.claude', 'hooks', 'lib', 'doc-sync-classify.cjs');
const LOADER = path.join(REPO, '.claude', 'hooks', 'lib', 'project-config-loader.cjs');
const PLAN_RESOLVER = path.join(REPO, '.claude', 'hooks', 'lib', 'ck-plan-resolver.cjs');

const classify = require(CLASSIFY);
const loader = require(LOADER);
const planResolver = require(PLAN_RESOLVER);

/**
 * Run `body` in a child process whose project root is a throwaway directory carrying
 * `projectConfig` as its `docs/project-config.json`. `body` is a JS expression source
 * evaluated with `REPO` in scope; its value is JSON-serialised to stdout.
 */
function inFakeProject(projectConfig, body) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `docroot-08-${process.pid}-`));
    try {
        fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
        fs.writeFileSync(
            path.join(dir, 'docs', 'project-config.json'),
            JSON.stringify(projectConfig, null, 2),
            'utf8'
        );
        const script = path.join(dir, 'probe.cjs');
        fs.writeFileSync(
            script,
            [
                "'use strict';",
                `const REPO = ${JSON.stringify(REPO)};`,
                `const out = (() => { ${body} })();`,
                'process.stdout.write(JSON.stringify(out));'
            ].join('\n'),
            'utf8'
        );
        const res = spawnSync(process.execPath, [script], {
            cwd: dir,
            encoding: 'utf8',
            env: { ...process.env, CLAUDE_PROJECT_DIR: dir }
        });
        assertEqual(res.status, 0, `probe failed (${res.status}): ${res.stderr || res.stdout}`);
        return JSON.parse(res.stdout);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const docrootTests = [
    {
        name: '[doc-impact-map] TC-DOCROOT-080 doc-sync-classify honours a configured business spec root',
        fn: () => {
            const out = inFakeProject(
                { specRoots: { business: { path: 'spec-library' } } },
                `
                const cls = require(REPO + '/.claude/hooks/lib/doc-sync-classify.cjs');
                const cfg = { enforcedAreas: [{ name: 'Cap' }] };
                return {
                    dir: cls.featureSpecDirForArea({ name: 'Cap' }),
                    hit: !!cls.areaForFeatureDoc('spec-library/Cap/README.X.md', cfg),
                    oldRootMiss: cls.areaForFeatureDoc('docs/specs/Cap/README.X.md', cfg) === null
                };
                `
            );
            assertEqual(
                out.dir,
                'spec-library/Cap/',
                'A slash-free configured root must build `spec-library/Cap/` — never `spec-libraryCap/`.'
            );
            assertTrue(out.hit, 'A doc under the CONFIGURED spec root must classify as a feature spec.');
            assertTrue(
                out.oldRootMiss,
                'Once the root is relocated, the literal `docs/specs/` tree is no longer the spec root.'
            );
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-081 default config classifies docs/specs exactly as before (SC-11)',
        fn: () => {
            const out = inFakeProject(
                { schemaVersion: 2, project: { name: 'Docroot Default Fixture' } },
                `
                const cls = require(REPO + '/.claude/hooks/lib/doc-sync-classify.cjs');
                const cfg = { enforcedAreas: [{ name: 'Cap' }] };
                return {
                    dir: cls.featureSpecDirForArea({ name: 'Cap' }),
                    hit: !!cls.areaForFeatureDoc('docs/specs/Cap/README.X.md', cfg),
                    otherAreaMiss: cls.areaForFeatureDoc('docs/specs/Other/README.X.md', cfg) === null,
                    siblingMiss: cls.areaForFeatureDoc('docs/specs/CapLegacy/README.X.md', cfg) === null
                };
                `
            );
            assertEqual(
                out.dir,
                'docs/specs/Cap/',
                'The default trailing-slash root must be unchanged.'
            );
            assertTrue(out.hit, 'A default-rooted feature spec must still classify under a valid minimal project config.');
            assertTrue(out.otherAreaMiss, 'A doc outside every enforced bucket must still miss.');
            assertTrue(out.siblingMiss, 'Segment boundary: bucket `Cap` must NOT swallow the sibling `CapLegacy` — the fail-open case.');
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-087 featureSpecDirForArea is a joinRoot construction, never a template',
        fn: () => {
            // The pre-Phase-08 body was `${FEATURE_SPEC_ROOT}${bucket}/` over a constant
            // carrying a TRAILING SLASH. Substituting a slash-free configured root into
            // that template yields `spec-libraryAuth/` — a total mis-classification with
            // no error. Both root FORMS must now produce the same shape.
            assertEqual(classify.featureSpecDirForArea({ name: 'Auth' }, 'spec-library'), 'spec-library/Auth/');
            assertEqual(classify.featureSpecDirForArea({ name: 'Auth' }, 'spec-library/'), 'spec-library/Auth/');
            assertEqual(classify.featureSpecDirForArea({ name: 'Auth' }, 'docs/specs/'), 'docs/specs/Auth/');
            assertEqual(classify.featureSpecDirForArea({ name: 'Auth' }, 'docs/specs'), 'docs/specs/Auth/');
            assertEqual(
                classify.featureSpecDirForArea({ name: 'Auth' }, 'spec-library\\sub'),
                'spec-library/sub/Auth/',
                'A backslashed configured root (a real win32 input) must normalise, not concatenate.'
            );
            assertTrue(
                classify.featureSpecDirForArea({ name: 'Auth' }, 'spec-library') !== 'spec-libraryAuth/',
                'The forbidden bare-template output must be unreachable.'
            );
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-082 a configured root does not prefix-swallow a sibling directory',
        fn: () => {
            const cfg = { specRoots: { business: { path: 'docs/spec' } } };
            const result = mapper.mapChanges([{ status: 'M', file: 'docs/specifications/x.md' }], cfg);
            assertTrue(
                docNames(result).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                `Root \`docs/spec\` must NOT exclude \`docs/specifications/\` from the docs-tree rule. ` +
                    `Got: ${docNames(result).join(', ')}`
            );
            const inside = mapper.mapChanges([{ status: 'M', file: 'docs/spec/x.md' }], cfg);
            assertTrue(
                !docNames(inside).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                'A doc genuinely INSIDE the configured spec root must still be excluded (the /spec chain owns it).'
            );
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-082a live pre-existing over-match is now fixed at DEFAULTS',
        fn: () => {
            // BEFORE Phase 08, doc-impact-map.cjs:368 was
            //   rel.toLowerCase().startsWith(root.toLowerCase())
            // with root = `docs/specs` (this repo's DEFAULT specRoots.business.path). That
            // prefix-matched `docs/specs-technical/**`, so the technical spec tree was
            // ALREADY silently excluded from the docs-tree rule, at defaults, with no
            // config change involved. The assertion below FAILS against that old code —
            // the changed behaviour is the fix, not a regression.
            const cfg = {
                specRoots: { business: { path: 'docs/specs' }, technical: { path: 'docs/specs-technical' } }
            };
            const overMatch = mapper.mapChanges([{ status: 'M', file: 'docs/specs-technical-notes/x.md' }], cfg);
            assertTrue(
                docNames(overMatch).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                `\`docs/specs-technical-notes/\` shares a prefix with BOTH configured roots but is inside ` +
                    `neither, so it must route. Got: ${docNames(overMatch).join(', ')}`
            );
            const business = mapper.mapChanges([{ status: 'M', file: 'docs/specs/x.md' }], cfg);
            assertTrue(
                !docNames(business).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                'A real business-spec path must still be excluded.'
            );
            const technical = mapper.mapChanges([{ status: 'M', file: 'docs/specs-technical/x.md' }], cfg);
            assertTrue(
                !docNames(technical).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                'A real technical-spec path must still be excluded — via its OWN root, not a prefix accident.'
            );
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-083 a backslashed or case-variant configured root still matches',
        fn: () => {
            const backslashed = mapper.mapChanges([{ status: 'M', file: 'docs/specs/x.md' }], {
                specRoots: { business: { path: 'docs\\specs' } }
            });
            assertTrue(
                !docNames(backslashed).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                `A backslashed configured root (\`docs\\\\specs\`) must still match \`docs/specs/x.md\`. ` +
                    `Got: ${docNames(backslashed).join(', ')}`
            );
            const trailing = mapper.mapChanges([{ status: 'M', file: 'docs/specs/x.md' }], {
                specRoots: { business: { path: 'docs/specs/' } }
            });
            assertTrue(
                !docNames(trailing).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                'A trailing-slash configured root must still match.'
            );
            const cased = mapper.mapChanges([{ status: 'M', file: 'docs/specs/x.md' }], {
                specRoots: { business: { path: 'Docs/Specs' } }
            });
            assertTrue(
                !docNames(cased).some(d => d.endsWith(CONFIGURED_INDEX_NAME)),
                'A case-variant configured root must still match.'
            );
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-084 isKnowledgePath derives its root from the configured docs tree',
        fn: () => {
            const cfg = { docsRoots: { projectReference: { path: 'documentation/reference' } } };
            assertEqual(loader.getKnowledgeRoot(cfg), 'documentation/knowledge');
            assertTrue(
                loader.isKnowledgePath('documentation/knowledge/x.md', cfg),
                'A relocated docs tree must still route its knowledge workspace.'
            );
            assertTrue(
                !loader.isKnowledgePath('docs/knowledge/x.md', cfg),
                'Once relocated, the literal `docs/knowledge/` is no longer the workspace.'
            );
            assertTrue(
                !loader.isKnowledgePath('documentation/knowledge-archive/x.md', cfg),
                'Segment boundary: a prefix-sharing sibling must NOT fail open into the workspace.'
            );
            assertTrue(
                loader.isKnowledgePath('documentation\\knowledge\\x.md', cfg),
                'Backslashed input (a real win32 path) must still match.'
            );
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-085 isKnowledgePath default is unchanged on an empty config',
        fn: () => {
            assertEqual(loader.getKnowledgeRoot({}), 'docs/knowledge');
            assertTrue(loader.isKnowledgePath('docs/knowledge/x.md', {}), 'Default workspace must still match.');
            assertTrue(loader.isKnowledgePath('DOCS/KNOWLEDGE/x.md', {}), 'Case variance must still match.');
            assertTrue(!loader.isKnowledgePath('docs/project-reference/x.md', {}), 'A non-knowledge doc must miss.');
            assertTrue(!loader.isKnowledgePath('', {}), 'An empty path must miss.');
        }
    },
    {
        name: '[doc-impact-map] TC-DOCROOT-086 resolvePlansDir precedence: project-config > .ck.json > plans',
        fn: () => {
            assertEqual(
                planResolver.resolvePlansDir({ plans: 'ck-plans' }, { docsRoots: { plans: { path: 'work/plans' } } }),
                'work/plans',
                'Tier 1 — docs/project-config.json `docsRoots.plans.path` WINS.'
            );
            assertEqual(
                planResolver.resolvePlansDir({ plans: 'ck-plans' }, {}),
                'ck-plans',
                'Tier 2 — the LIVE `.ck.json` `paths.plans` consumer must keep working.'
            );
            assertEqual(planResolver.resolvePlansDir({}, {}), 'plans', 'Tier 3 — framework default.');
            // The `.ck.json` tier keeps its PRE-EXISTING `normalizePath` semantics byte for
            // byte (SC-11): trailing separators are stripped, backslashes are preserved, and an
            // ABSOLUTE value stays usable — `sanitizePath` allows it on purpose
            // (ck-path-utils.cjs:104-107) for the consolidated-plans-elsewhere case, so the
            // content-root `escapesRepoRoot` guard must NOT be applied to this tier.
            assertEqual(planResolver.resolvePlansDir({ plans: 'ck-plans/' }, {}), 'ck-plans');
            assertEqual(planResolver.resolvePlansDir({ plans: 'ck\\plans\\' }, {}), 'ck\\plans');
            assertEqual(planResolver.resolvePlansDir({ plans: 'D:\\shared\\plans' }, {}), 'D:\\shared\\plans');
            assertEqual(
                planResolver.resolvePlansDir({ plans: 'ck-plans' }, { docsRoots: { plans: { path: '../escape' } } }),
                'ck-plans',
                'A repo-escaping tier-1 value is rejected and the next tier is used (runtime fail-soft plane).'
            );

            // getReportsPath composition is FROZEN: `${plansDir}/${reportsDir}/`.
            // Only plansDir's SOURCE changed. Exercised through the real call site.
            const out = inFakeProject({ docsRoots: { plans: { path: 'work/plans' } } }, `
                const r = require(REPO + '/.claude/hooks/lib/ck-plan-resolver.cjs');
                return {
                    tier1: r.getReportsPath(null, null, { reportsDir: 'reports' }, { plans: 'ck-plans' }),
                    session: r.getReportsPath('work/plans/260917-x', 'session', { reportsDir: 'reports' }, {})
                };
            `);
            assertEqual(out.tier1, 'work/plans/reports/', 'getReportsPath must compose from the tier-1 plansDir.');
            assertEqual(
                out.session,
                'work/plans/260917-x/reports/',
                'Session-resolved plans keep their plan-specific reports path unchanged.'
            );

            const out2 = inFakeProject({}, `
                const r = require(REPO + '/.claude/hooks/lib/ck-plan-resolver.cjs');
                return {
                    tier2: r.getReportsPath(null, null, { reportsDir: 'reports' }, { plans: 'ck-plans' }),
                    tier3: r.getReportsPath(null, null, {}, {})
                };
            `);
            assertEqual(out2.tier2, 'ck-plans/reports/', 'With no project-config root, `.ck.json` still drives it.');
            assertEqual(out2.tier3, 'plans/reports/', 'With neither source, the default composition is unchanged.');
        }
    }
];

module.exports = {
    name: 'doc-impact-map',
    tests: tests.concat(docrootTests)
};
