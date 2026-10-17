'use strict';
// docroot-relocation — the COMPOSED relocation proof (Phase 15, TC-DOCROOT-150..165).
//
// Every other docroot test stubs ONE accessor with ONE relocated value. This suite walks the
// whole resolution chain against a single committed fixture project whose EIGHT relocatable
// roots are all non-default, because the failure this change most plausibly ships is a
// COMPOSITION failure — two surfaces deriving the same answer two different ways, each passing
// its own unit test (TC-DOCROOT-162).
//
// Fixtures:
//   fixtures/relocated-project/      every root relocated; see its README.md for the
//                                    value/default/variance-class table
//   fixtures/escaped-roots-project/  every root declares `../escape…` (TC-DOCROOT-161)
//
// CACHE ISOLATION. `loadProjectConfig()` is fail-SOFT and caches `{}` on any error for the
// process lifetime (project-config-loader.cjs:66-74), and `session-init-helpers.cjs:27-32`
// freezes its doc paths at module load. A second fixture in the same process would therefore
// read the first fixture's cache. Every case that depends on AMBIENT resolution runs in a
// FRESH CHILD PROCESS with `CLAUDE_PROJECT_DIR` pointed at the fixture (`inFixture` below) —
// the same device `doc-impact-map.test.cjs:575` already uses. Cases whose function takes an
// explicit `config` argument are cache-independent and run in-process.
//
// All tests here are TECHNICAL-ONLY: this repo has no canonical Feature Spec registry, so no
// business TC governs them. The bracket prefix plus this header IS the technical annotation
// (docs/project-reference/integration-test-reference.md -> New Test Quickstart, 3).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertEqual, assertDeepEqual, assertTrue, assertContains, assertNotContains } = require('../lib/assertions.cjs');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const FIXTURES = path.join(REPO, '.claude', 'hooks', 'tests', 'fixtures');
const RELOCATED = path.join(FIXTURES, 'relocated-project');
const ESCAPED = path.join(FIXTURES, 'escaped-roots-project');

const loader = require(path.join(REPO, '.claude', 'hooks', 'lib', 'project-config-loader.cjs'));
const pathUtils = require(path.join(REPO, '.claude', 'hooks', 'lib', 'ck-path-utils.cjs'));
const schema = require(path.join(REPO, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'));
const planResolver = require(path.join(REPO, '.claude', 'hooks', 'lib', 'ck-plan-resolver.cjs'));
const builders = require(path.join(REPO, '.claude', 'skills', 'ai-context-refresh', 'scripts', 'section-builders.cjs'));
const claudeMd = require(path.join(REPO, '.claude', 'skills', 'ai-context-refresh', 'scripts', 'generate-claude-md.cjs'));
const impactMap = require(path.join(REPO, '.claude', 'scripts', 'doc-impact-map.cjs'));

const readConfig = dir => JSON.parse(fs.readFileSync(path.join(dir, 'docs', 'project-config.json'), 'utf8'));
const RELOCATED_CONFIG = readConfig(RELOCATED);
const ESCAPED_CONFIG = readConfig(ESCAPED);

/**
 * The fixture's declared value for every root, paired with the framework default it must
 * DIFFER from. Requirement 3: a fixture root that accidentally equals its default lets a
 * completely unwired accessor pass, so the difference is asserted, never assumed.
 */
const ROOT_MATRIX = [
    { token: 'SPEC_ROOT', configPath: 'specRoots.business.path', value: 'spec-library', variance: 'plain, single segment' },
    { token: 'SPEC_ROOT_TECHNICAL', configPath: 'specRoots.technical.path', value: 'spec-library-derived', variance: 'segment-boundary sibling' },
    { token: 'REF_DOCS_ROOT', configPath: 'docsRoots.projectReference.path', value: 'documentation/reference', variance: 'nested two levels' },
    { token: 'ADR_ROOT', configPath: 'docsRoots.adr.path', value: 'documentation/Decisions', variance: 'CASE' },
    { token: 'TEMPLATES_ROOT', configPath: 'docsRoots.templates.path', value: 'documentation/blueprints', variance: 'BACKSLASH (declared `documentation\\blueprints`)' },
    { token: 'PLANS_ROOT', configPath: 'docsRoots.plans.path', value: 'work-plans', variance: 'plain; beats the `.ck.json` tier' },
    { token: 'TEAM_ARTIFACTS_ROOT', configPath: 'docsRoots.teamArtifacts.path', value: 'artifacts', variance: 'TRAILING SLASH (declared `artifacts/`)' },
    { token: 'PRODUCT_ROADMAP_DOC', configPath: 'docsRoots.productRoadmap.path', value: 'documentation/roadmap.md', variance: 'file, relocated tree' }
];

const DOCS_ROOT_KEYS = ['projectReference', 'adr', 'templates', 'plans', 'teamArtifacts', 'productRoadmap'];
const SPEC_ROOT_KEYS = ['business', 'technical'];

function readDotted(obj, dotted) {
    let node = obj;
    for (const key of dotted.split('.')) {
        if (!node || typeof node !== 'object') return undefined;
        node = node[key];
    }
    return node;
}

/**
 * Evaluate `body` in a FRESH node process rooted at `fixtureDir`. `body` is a function source
 * evaluated with `REPO` and `FIXTURE` in scope; its return value is JSON-serialised to stdout.
 * Required for anything that reads the AMBIENT project config — see the cache note above.
 */
function inFixture(fixtureDir, body) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `docroot-15-${process.pid}-`));
    try {
        const script = path.join(dir, 'probe.cjs');
        fs.writeFileSync(
            script,
            [
                "'use strict';",
                `const REPO = ${JSON.stringify(REPO)};`,
                `const FIXTURE = ${JSON.stringify(fixtureDir)};`,
                `const out = (() => { ${body} })();`,
                'process.stdout.write(JSON.stringify(out));'
            ].join('\n'),
            'utf8'
        );
        const res = spawnSync(process.execPath, [script], {
            cwd: fixtureDir,
            encoding: 'utf8',
            env: { ...process.env, CLAUDE_PROJECT_DIR: fixtureDir }
        });
        assertEqual(res.status, 0, `fixture probe failed (${res.status}): ${res.stderr || res.stdout}`);
        return JSON.parse(res.stdout);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

/** Import the ESM verifier from a CJS suite — Windows needs a file:// URL, not a drive path. */
async function importSdd() {
    const { pathToFileURL } = require('url');
    return import(
        pathToFileURL(path.join(REPO, '.claude', 'scripts', 'codex', 'verify-sdd-semantic-compliance.mjs')).href
    );
}

const tests = [
    // ── SC-1, SC-2 ──────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-150 the all-relocated fixture config VALIDATES with every root declared',
        fn: () => {
            const result = schema.validateConfig(RELOCATED_CONFIG);
            assertTrue(result.valid, `fixture config must validate. errors: ${result.errors.join(' | ')}`);
            assertEqual(result.errors.length, 0, `no errors expected, got: ${result.errors.join(' | ')}`);

            for (const key of DOCS_ROOT_KEYS) {
                assertTrue(
                    typeof readDotted(RELOCATED_CONFIG, `docsRoots.${key}.path`) === 'string',
                    `docsRoots.${key}.path must be declared — a missing key would let an unwired accessor pass`
                );
            }
            assertTrue(!!readDotted(RELOCATED_CONFIG, 'specRoots.business.path'), 'specRoots.business.path must be declared');
            assertTrue(!!readDotted(RELOCATED_CONFIG, 'specRoots.technical.path'), 'specRoots.technical.path must be declared');

            // Requirement 3 — the difference between a real proof and a comfortable one.
            for (const root of ROOT_MATRIX) {
                const declared = pathUtils.normalizeRootPath(readDotted(RELOCATED_CONFIG, root.configPath));
                const dflt = loader.PORTABILITY_TOKENS[root.token].default;
                assertEqual(declared, root.value, `${root.configPath} drifted from the documented fixture value`);
                assertTrue(
                    declared !== dflt,
                    `${root.configPath} equals its DEFAULT (${dflt}) — the fixture would pass with the accessor unwired`
                );
            }
            // Only existence warnings are acceptable: the semantic validator resolves against the
            // REAL repo root (project-config-schema.cjs:1163), so fixture-relative roots are
            // legitimately absent there. Anything else is a genuine config defect.
            for (const warning of result.warnings) {
                assertTrue(
                    warning.includes('does not exist on disk') || warning.includes('unknown top-level key'),
                    `unexpected warning: ${warning}`
                );
            }
        }
    },
    {
        name: '[docroot-relocation] TC-DOCROOT-151 --describe names every docsRoots key, so an AI reading the schema learns them',
        fn: () => {
            // `describeSchema` renders a NESTED, indented tree — not dotted keys — so each block
            // is sliced out and searched inside its own boundaries. Searching the whole document
            // for a bare key name would pass on any unrelated occurrence.
            const blockOf = (text, header) => {
                const start = text.indexOf(header);
                assertTrue(start >= 0, `--describe must surface the ${header.trim()} block`);
                const rest = text.slice(start + header.length);
                const end = rest.search(/\n\S/);
                return end === -1 ? rest : rest.slice(0, end);
            };

            const described = schema.describeSchema();
            const docsRootsBlock = blockOf(described, 'docsRoots (object, optional)');
            for (const key of DOCS_ROOT_KEYS) {
                assertContains(docsRootsBlock, `  ${key} (object, optional)`, `--describe must name docsRoots.${key}`);
            }
            // Every key must teach the AI its DEFAULT, or a relocated project cannot tell what it
            // is overriding. The default is read out of the token table, never restated here.
            for (const root of ROOT_MATRIX.filter(r => r.configPath.startsWith('docsRoots.'))) {
                assertContains(
                    docsRootsBlock,
                    loader.PORTABILITY_TOKENS[root.token].default,
                    `--describe must state the documented default for ${root.configPath}`
                );
            }
            const specRootsBlock = blockOf(described, 'specRoots (object, optional)');
            for (const key of ['business', 'technical']) {
                assertContains(specRootsBlock, `  ${key} (object, optional)`, `--describe must name specRoots.${key}`);
                assertContains(specRootsBlock, 'path (string, required)', `--describe must name specRoots.${key}.path`);
            }

            // The CLI is the surface an AI actually runs; prove it emits the same text.
            const cli = spawnSync(
                process.execPath,
                [path.join(REPO, '.claude', 'hooks', 'lib', 'project-config-schema.cjs'), '--describe'],
                { encoding: 'utf8' }
            );
            assertEqual(cli.status, 0, `--describe must exit 0, got ${cli.status}: ${cli.stderr}`);
            const cliBlock = blockOf(cli.stdout, 'docsRoots (object, optional)');
            for (const key of DOCS_ROOT_KEYS) {
                assertContains(cliBlock, `  ${key} (object, optional)`, `--describe CLI output must name docsRoots.${key}`);
            }
        }
    },

    // ── SC-3 ────────────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-152 the spec accessors resolve from config and KEEP their trailing slash',
        fn: () => {
            assertEqual(loader.getSpecDocsPath(RELOCATED_CONFIG), 'spec-library/');
            assertEqual(loader.getTechnicalSpecDocsPath(RELOCATED_CONFIG), 'spec-library-derived/');
            // SLASH CONTRACT: the accessor and the token are NOT interchangeable. Asserting both
            // forms here is what stops a future "simplification" from collapsing them.
            assertEqual(loader.resolvePortabilityTokens('{SPEC_ROOT}', RELOCATED_CONFIG), 'spec-library');
            assertEqual(loader.resolvePortabilityTokens('{SPEC_ROOT_TECHNICAL}', RELOCATED_CONFIG), 'spec-library-derived');
            // The relocated business root must not swallow its segment-boundary sibling.
            assertTrue(
                !pathUtils.isPathWithinRoot('spec-library-derived/README.md', 'spec-library'),
                '`spec-library` must NOT match `spec-library-derived/` — the fail-open prefix case'
            );
            assertTrue(pathUtils.isPathWithinRoot('spec-library/ContextDelivery/README.SampleFeature.md', 'spec-library'));
        }
    },

    // ── SC-1, SC-5 ──────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-153 getDocsRoot returns the relocated value for all 6 keys, normalized',
        fn: () => {
            const expected = {
                projectReference: 'documentation/reference',
                adr: 'documentation/Decisions',
                templates: 'documentation/blueprints',
                plans: 'work-plans',
                teamArtifacts: 'artifacts',
                productRoadmap: 'documentation/roadmap.md'
            };
            for (const key of DOCS_ROOT_KEYS) {
                assertEqual(loader.getDocsRoot(key, RELOCATED_CONFIG), expected[key], `docsRoots.${key} must resolve relocated`);
            }
            // BACKSLASH variance: declared `documentation\blueprints`, resolved slash-form.
            assertEqual(readDotted(RELOCATED_CONFIG, 'docsRoots.templates.path'), 'documentation\\blueprints');
            assertNotContains(loader.getDocsRoot('templates', RELOCATED_CONFIG), '\\', 'a backslashed root must normalise to slash form');
            // TRAILING-SLASH variance: declared `artifacts/`, resolved slash-FREE so callers can
            // compose `${root}/initiatives` without producing `artifacts//initiatives`.
            assertEqual(readDotted(RELOCATED_CONFIG, 'docsRoots.teamArtifacts.path'), 'artifacts/');
            assertEqual(pathUtils.joinRoot(loader.getDocsRoot('teamArtifacts', RELOCATED_CONFIG), 'initiatives'), 'artifacts/initiatives');
            // CASE variance: the value is case-PRESERVED (it may build a real path on a
            // case-sensitive host) while COMPARISON is case-insensitive.
            assertEqual(loader.getDocsRoot('adr', RELOCATED_CONFIG), 'documentation/Decisions', 'case must be preserved, not folded');
            assertTrue(
                pathUtils.isPathWithinRoot('documentation/decisions/ADR-0001-relocated-roots.md', loader.getDocsRoot('adr', RELOCATED_CONFIG)),
                'comparison must be case-insensitive even though the value keeps its case'
            );
            // NESTED variance: two levels deep, and every declared root really exists in the fixture.
            for (const key of DOCS_ROOT_KEYS) {
                const resolved = loader.getDocsRoot(key, RELOCATED_CONFIG);
                assertTrue(
                    fs.existsSync(path.join(RELOCATED, ...resolved.split('/'))),
                    `resolved root \`${resolved}\` (${key}) does not exist in the fixture — the proof would be vacuous`
                );
            }
            assertEqual(loader.getDocsRoot('nope', RELOCATED_CONFIG), '', 'an unknown key returns "" rather than throwing');
        }
    },

    // ── SC-4, SC-7 ──────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-154 resolvePortabilityTokens emits every relocated path and leaves zero residual braces',
        fn: () => {
            const tokens = Object.keys(loader.PORTABILITY_TOKENS);
            assertEqual(tokens.length, 8, 'the token table must still be the documented 8 roots');
            const injectContext =
                'Specs live in {SPEC_ROOT}/; derived views in {SPEC_ROOT_TECHNICAL}/. Reference docs: ' +
                '{REF_DOCS_ROOT}/. Decisions: {ADR_ROOT}/. Templates: {TEMPLATES_ROOT}/. Plans: ' +
                '{PLANS_ROOT}/{plan-id}/. Tasks: {TEAM_ARTIFACTS_ROOT}/tasks. Roadmap: {PRODUCT_ROADMAP_DOC}.';
            const resolved = loader.resolvePortabilityTokens(injectContext, RELOCATED_CONFIG);

            for (const root of ROOT_MATRIX) {
                assertContains(resolved, root.value, `{${root.token}} must resolve to the relocated ${root.value}`);
                assertNotContains(resolved, `{${root.token}}`, `{${root.token}} must not survive as a bare token`);
            }
            assertNotContains(resolved, 'docs/specs', 'no default spec root may leak into a relocated project');
            assertNotContains(resolved, 'docs/project-reference', 'no default reference root may leak');
            assertNotContains(resolved, 'team-artifacts', 'no default team-artifact root may leak');
            assertContains(resolved, 'work-plans/{plan-id}/', 'a slash-free root must compose without producing `//`');
            assertNotContains(resolved, '//', 'slash-free token resolution must never produce a doubled separator');
            // Unknown braces are AI authoring placeholders and survive ON PURPOSE.
            assertContains(resolved, '{plan-id}', 'unknown braces must survive verbatim');
            assertEqual(
                loader.resolvePortabilityTokens('{Bucket}/{FeatureName}', RELOCATED_CONFIG),
                '{Bucket}/{FeatureName}',
                'only the 8 known tokens are replaced'
            );
        }
    },
    {
        name: '[docroot-relocation] TC-DOCROOT-155 the Codex-side consumers resolve the fixture identically to the loader',
        fn: async () => {
            const mirrorPath = path.join(REPO, '.claude', 'scripts', 'codex', 'sync-context-workflows.mjs');
            const mirrorSource = fs.readFileSync(mirrorPath, 'utf8');

            // 1. The context mirror projects project text only and resolves no token: a second copy of the
            //    token table there could only drift from the loader.
            assertTrue(
                !/PORTABILITY_TOKEN_DEFAULTS|resolvePortabilityTokens/.test(mirrorSource),
                'the context mirror must carry no portability-token resolver or default table'
            );
            const loaderDefaults = Object.fromEntries(
                Object.entries(loader.PORTABILITY_TOKENS).map(([token, spec]) => [token, spec.default])
            );

            // 2. The Codex-side consumer that travels without hooks/lib resolves the same
            //    RELOCATED values as the loader for the same config — the actual parity claim.
            const sdd = await importSdd();
            assertDeepEqual(sdd.PORTABILITY_TOKEN_DEFAULTS, loaderDefaults, 'verify-sdd defaults drifted from the loader');
            const probe = Object.keys(loader.PORTABILITY_TOKENS).map(t => `{${t}}`).join(' | ');
            assertEqual(
                sdd.resolveTokens(probe, RELOCATED_CONFIG),
                loader.resolvePortabilityTokens(probe, RELOCATED_CONFIG),
                'Claude and Codex must resolve a relocated config to byte-identical text'
            );
        }
    },

    // ── SC-6 ────────────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-156 buildDocIndex emits the relocated tree and never returns falsy',
        fn: () => {
            const block = builders.buildDocIndex(RELOCATED_CONFIG, RELOCATED);
            assertTrue(!!block, 'buildDocIndex must never return falsy — falsy deletes the whole SECTION:doc-index block');
            assertContains(block, 'documentation/reference/', 'the relocated reference tree must appear');
            assertContains(block, 'documentation/blueprints/', 'the backslash-declared template tree must appear');
            assertContains(block, 'documentation/roadmap.md', 'the relocated roadmap document must appear');
            assertNotContains(block, 'docs/project-reference', 'the default reference tree must not appear');

            // The miss case is the one that used to delete the markers. It must stay truthy.
            // The absent root is TWO levels so its derived parent (`absent-tree`) is absent too —
            // `documentation/absent` would derive the EXISTING `documentation` tree and prove nothing.
            const missing = builders.buildDocIndex({ docsRoots: { projectReference: { path: 'absent-tree/reference' } } }, RELOCATED);
            assertTrue(!!missing, 'an unresolvable docs tree must still produce a visible note, not falsy');
            assertContains(missing, 'doc-index unavailable', 'the note must say why the tree is missing');

            // A rendered root retains its SECTION:doc-index markers with the relocated content.
            const template = [
                '# Root', '', '<!-- SECTION:doc-index -->', '(placeholder)', '<!-- /SECTION:doc-index -->', ''
            ].join('\n');
            const rendered = claudeMd.updateMarkedSections(template, { 'doc-index': block }, () => {});
            assertContains(rendered, '<!-- SECTION:doc-index -->', 'the OPEN marker must survive');
            assertContains(rendered, '<!-- /SECTION:doc-index -->', 'the CLOSE marker must survive');
            assertContains(rendered, 'documentation/reference/', 'the rendered section must carry the relocated tree');
        }
    },
    {
        name: '[docroot-relocation] TC-DOCROOT-157 buildDocLookup rows point at the relocated roots, never the defaults',
        fn: () => {
            const table = builders.buildDocLookup(RELOCATED_CONFIG);
            assertContains(table, '`spec-library/`', 'the feature-spec row must use the relocated spec root');
            assertContains(table, 'spec-library/ContextDelivery/', 'a module row must compose under the relocated spec root');
            assertContains(table, 'documentation/reference/feature-spec-reference.md', 'reference rows must use the relocated root');
            assertContains(table, 'documentation/reference/spec-system-reference.md');
            assertContains(table, 'documentation/reference/spec-principles.md');
            assertNotContains(table, 'docs/specs', 'no default spec root may appear');
            assertNotContains(table, 'docs/project-reference', 'no default reference root may appear');
            assertNotContains(table, 'spec-libraryContextDelivery', 'a slash-free root must be JOINED, never template-concatenated');
        }
    },

    // ── SC-10 ───────────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-158 buildSkeleton stays minimal under relocated project roots',
        fn: () => {
            const skeleton = inFixture(RELOCATED, `
                const H = require(REPO + '/.claude/hooks/lib/session-init-helpers.cjs');
                return H.buildSkeleton();
            `);
            assertEqual(
                schema.validateConfig(skeleton).valid,
                true,
                'a relocated project can still bootstrap the minimum schema-valid config'
            );
            assertEqual(skeleton.project.name, path.basename(RELOCATED), 'the project-root folder is the evidence-backed identity fallback');
            assertDeepEqual(
                Object.keys(skeleton).sort(),
                ['_description', 'project', 'schemaVersion'],
                'bootstrap emits only required identity plus schema metadata'
            );
            assertEqual(skeleton.framework, undefined, 'a relocated docs root does not prove a backend or frontend stack');
            assertEqual(skeleton.designSystem, undefined, 'a relocated docs root does not prove a design-system capability');
            assertEqual(skeleton.docsRoots, undefined, 'the skeleton does not invent or copy optional relocated roots');
            assertEqual(skeleton.referenceDocs, undefined, 'task-specific reference selection remains absent');
        }
    },

    // ── SC-5 ────────────────────────────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-159 doc-sync-classify and doc-impact-map agree about the relocated spec root',
        fn: () => {
            const out = inFixture(RELOCATED, `
                const cls = require(REPO + '/.claude/hooks/lib/doc-sync-classify.cjs');
                const cfg = { enforcedAreas: [{ name: 'ContextDelivery' }] };
                return {
                    dir: cls.featureSpecDirForArea({ name: 'ContextDelivery' }),
                    hit: !!cls.areaForFeatureDoc('spec-library/ContextDelivery/README.SampleFeature.md', cfg),
                    defaultRootMiss: cls.areaForFeatureDoc('docs/specs/ContextDelivery/README.SampleFeature.md', cfg) === null,
                    siblingMiss: cls.areaForFeatureDoc('spec-library-derived/ContextDelivery/README.SampleFeature.md', cfg) === null
                };
            `);
            assertEqual(out.dir, 'spec-library/ContextDelivery/', 'a slash-free relocated root must JOIN, never concatenate');
            assertTrue(out.hit, 'the fixture spec must classify as a feature spec under the relocated root');
            assertTrue(out.defaultRootMiss, 'once relocated, the default `docs/specs/` tree is no longer the spec root');
            assertTrue(out.siblingMiss, 'the derived sibling tree must not be swallowed by the business root');

            // doc-impact-map's docs-tree EXCLUSION is the config-driven half (doc-impact-map.cjs:397-401):
            // it removes files inside the configured spec roots, because the /spec chain owns them.
            // Its positive match is a separate concern, so the exclusion is exercised through a
            // reachable path while the spec roots themselves stay NON-DEFAULT.
            const relocatedSpecRoots = {
                specRoots: { business: { path: 'docs/spec-library' }, technical: { path: 'docs/spec-library-derived' } }
            };
            const inside = impactMap
                .mapChanges([{ status: 'M', file: 'docs/spec-library/ContextDelivery/README.SampleFeature.md' }], relocatedSpecRoots)
                .docs.map(d => d.doc);
            assertTrue(
                !inside.some(d => d.endsWith('docs-index-reference.md')),
                `a doc inside the configured spec root must be EXCLUDED from the docs-tree rule. got: ${inside.join(', ')}`
            );
            const sibling = impactMap
                .mapChanges([{ status: 'M', file: 'docs/spec-library-notes/README.md' }], relocatedSpecRoots)
                .docs.map(d => d.doc);
            assertTrue(
                sibling.some(d => d.endsWith('docs-index-reference.md')),
                `a prefix-sharing SIBLING must NOT be excluded — that is the fail-open case. got: ${sibling.join(', ')}`
            );
        }
    },
    {
        name: '[docroot-relocation] TC-DOCROOT-160 ck-plan-resolver prefers project-config over the .ck.json plans tier',
        fn: () => {
            const ck = JSON.parse(fs.readFileSync(path.join(RELOCATED, '.claude', '.ck.json'), 'utf8'));
            assertEqual(ck.paths.plans, 'ck-legacy-plans', 'the fixture must declare a DIFFERENT .ck.json plans dir, or precedence is untested');
            assertEqual(
                planResolver.resolvePlansDir(ck.paths, RELOCATED_CONFIG),
                'work-plans',
                'docsRoots.plans.path must WIN over .ck.json paths.plans'
            );
            assertEqual(
                planResolver.resolvePlansDir(ck.paths, {}),
                'ck-legacy-plans',
                'with no project-config root the live .ck.json consumer must keep working'
            );
            assertEqual(planResolver.resolvePlansDir({}, {}), 'plans', 'with neither source the documented default is unchanged');

            // getReportsPath intentionally loads the ambient project config through
            // resolvePlansDir(). The relocated integration fixture has docsRoots.plans.path,
            // so calling it in this process tests the host project's live config instead of the
            // fixture's .ck.json fallback. Use a fresh minimal project with no plans root to
            // prove the legacy tier end-to-end without ambient config leakage.
            const tmpRoot = path.join(REPO, 'tmp');
            fs.mkdirSync(tmpRoot, { recursive: true });
            const isolatedRoot = fs.mkdtempSync(path.join(tmpRoot, `docroot-160-${process.pid}-`));
            try {
                fs.mkdirSync(path.join(isolatedRoot, '.claude'), { recursive: true });
                fs.mkdirSync(path.join(isolatedRoot, 'docs'), { recursive: true });
                fs.writeFileSync(
                    path.join(isolatedRoot, 'docs', 'project-config.json'),
                    JSON.stringify({ schemaVersion: 2, project: { name: 'Docroot Fallback Fixture' } }),
                    'utf8'
                );
                fs.writeFileSync(
                    path.join(isolatedRoot, '.claude', '.ck.json'),
                    JSON.stringify({ paths: { plans: ck.paths.plans } }),
                    'utf8'
                );

                const fallback = inFixture(isolatedRoot, `
                    const resolver = require(REPO + '/.claude/hooks/lib/ck-plan-resolver.cjs');
                    const config = JSON.parse(require('fs').readFileSync(require('path').join(FIXTURE, 'docs', 'project-config.json'), 'utf8'));
                    const legacy = JSON.parse(require('fs').readFileSync(require('path').join(FIXTURE, '.claude', '.ck.json'), 'utf8'));
                    return {
                        configHasNoPlansRoot: !config.docsRoots?.plans?.path,
                        plans: resolver.resolvePlansDir(legacy.paths),
                        reports: resolver.getReportsPath(null, null, { reportsDir: 'reports' }, legacy.paths)
                    };
                `);
                assertTrue(fallback.configHasNoPlansRoot, 'The isolated required config must omit docsRoots.plans.path');
                assertEqual(fallback.plans, 'ck-legacy-plans', 'With no configured content root the live resolver uses .ck.json paths.plans');
                assertEqual(
                    fallback.reports,
                    'ck-legacy-plans/reports/',
                    'getReportsPath composes from the isolated .ck.json fallback rather than the live project config'
                );
            } finally {
                const relative = path.relative(path.resolve(tmpRoot), path.resolve(isolatedRoot));
                if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
                    throw new Error(`Refusing to remove docroot fixture outside repository tmp: ${isolatedRoot}`);
                }
                fs.rmSync(isolatedRoot, { recursive: true, force: true });
            }
        }
    },

    // ── SC-2 — the negative fixture ─────────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-161 a ../escape value is rejected for ALL 8 roots and the default is used',
        fn: () => {
            // Given every relocatable content root declares ../escape in the fixture.
            // When runtime accessors and the config validator inspect those declarations.
            // Then each accessor uses its default, while schema validation rejects all 8 roots.
            // RUNTIME PLANE — 8 assertions, one per root. This is the half that decides what the
            // AI is actually told, and it must hold for every root, not only for specRoots.
            const runtime = {
                SPEC_ROOT: pathUtils.normalizeRootPath(loader.getSpecDocsPath(ESCAPED_CONFIG)),
                SPEC_ROOT_TECHNICAL: pathUtils.normalizeRootPath(loader.getTechnicalSpecDocsPath(ESCAPED_CONFIG)),
                REF_DOCS_ROOT: loader.getDocsRoot('projectReference', ESCAPED_CONFIG),
                ADR_ROOT: loader.getDocsRoot('adr', ESCAPED_CONFIG),
                TEMPLATES_ROOT: loader.getDocsRoot('templates', ESCAPED_CONFIG),
                PLANS_ROOT: loader.getDocsRoot('plans', ESCAPED_CONFIG),
                TEAM_ARTIFACTS_ROOT: loader.getDocsRoot('teamArtifacts', ESCAPED_CONFIG),
                PRODUCT_ROADMAP_DOC: loader.getDocsRoot('productRoadmap', ESCAPED_CONFIG)
            };
            for (const root of ROOT_MATRIX) {
                const declared = readDotted(ESCAPED_CONFIG, root.configPath);
                assertTrue(
                    pathUtils.escapesRepoRoot(declared),
                    `${root.configPath} must actually declare an escaping value, got "${declared}"`
                );
                assertEqual(
                    runtime[root.token],
                    loader.PORTABILITY_TOKENS[root.token].default,
                    `${root.configPath}: an escaping value must be REJECTED and the documented default used`
                );
            }
            // No escaping value may reach injected text either.
            const probe = ROOT_MATRIX.map(r => `{${r.token}}`).join(' ');
            assertNotContains(loader.resolvePortabilityTokens(probe, ESCAPED_CONFIG), '..', 'no `..` segment may survive resolution');

            // VALIDATION PLANE — fail-CLOSED for every declared docsRoots and specRoots path.
            const result = schema.validateConfig(ESCAPED_CONFIG);
            assertTrue(!result.valid, 'a config whose roots all escape must not validate');
            for (const key of DOCS_ROOT_KEYS) {
                assertTrue(
                    result.errors.some(e => e.startsWith(`docsRoots.${key}.path:`) && e.includes('escapes the repository root')),
                    `docsRoots.${key}.path must raise a traversal ERROR. errors: ${result.errors.join(' | ')}`
                );
            }
            for (const key of SPEC_ROOT_KEYS) {
                assertTrue(
                    result.errors.some(e => e.startsWith(`specRoots.${key}.path:`) && e.includes('escapes the repository root')),
                    `specRoots.${key}.path must raise a traversal ERROR. errors: ${result.errors.join(' | ')}`
                );
            }
        }
    },
    {
        name: '[docroot-relocation] TC-DOCROOT-167 a Windows drive-relative value (C:foo) escapes for ALL 8 roots',
        fn: () => {
            // INTENT: `C:foo` carries no `/` after the colon, so it is neither absolute nor `..` by a
            // slash-anchored test, yet `path.resolve(repo, 'C:foo')` lands in drive C's current
            // directory — outside the repository. It must be rejected on BOTH planes, on every host.
            // Given: the escaped fixture with every root rewritten to a drive-relative value.
            const driveRelative = JSON.parse(JSON.stringify(ESCAPED_CONFIG));
            for (const root of ROOT_MATRIX) {
                const [section, key] = root.configPath.split('.');
                driveRelative[section][key].path = `C:drive-relative-${key}`;
            }

            // When: the runtime accessors and the config validator inspect those declarations.
            const runtime = {
                SPEC_ROOT: pathUtils.normalizeRootPath(loader.getSpecDocsPath(driveRelative)),
                SPEC_ROOT_TECHNICAL: pathUtils.normalizeRootPath(loader.getTechnicalSpecDocsPath(driveRelative)),
                REF_DOCS_ROOT: loader.getDocsRoot('projectReference', driveRelative),
                ADR_ROOT: loader.getDocsRoot('adr', driveRelative),
                TEMPLATES_ROOT: loader.getDocsRoot('templates', driveRelative),
                PLANS_ROOT: loader.getDocsRoot('plans', driveRelative),
                TEAM_ARTIFACTS_ROOT: loader.getDocsRoot('teamArtifacts', driveRelative),
                PRODUCT_ROADMAP_DOC: loader.getDocsRoot('productRoadmap', driveRelative)
            };
            const result = schema.validateConfig(driveRelative);

            // Then: the guard flags every value, each accessor uses its default, and validation fails
            // closed with a per-root escape error for every docsRoots and specRoots key.
            for (const root of ROOT_MATRIX) {
                const declared = readDotted(driveRelative, root.configPath);
                assertTrue(pathUtils.escapesRepoRoot(declared), `escapesRepoRoot must flag the drive-relative ${root.configPath} "${declared}"`);
                assertEqual(
                    runtime[root.token],
                    loader.PORTABILITY_TOKENS[root.token].default,
                    `${root.configPath}: a drive-relative value must be REJECTED and the documented default used`
                );
            }
            assertTrue(!result.valid, 'a config whose roots are all drive-relative must not validate');
            for (const key of DOCS_ROOT_KEYS) {
                assertTrue(
                    result.errors.some(e => e.startsWith(`docsRoots.${key}.path:`) && e.includes('escapes the repository root')),
                    `docsRoots.${key}.path "C:…" must raise an escape ERROR. errors: ${result.errors.join(' | ')}`
                );
            }
            for (const key of SPEC_ROOT_KEYS) {
                assertTrue(
                    result.errors.some(e => e.startsWith(`specRoots.${key}.path:`) && e.includes('escapes the repository root')),
                    `specRoots.${key}.path "C:…" must raise an escape ERROR. errors: ${result.errors.join(' | ')}`
                );
            }
            // A repo-relative directory whose name merely CONTAINS a colon later is not drive-relative.
            assertTrue(!pathUtils.escapesRepoRoot('docs/c:notes'), 'only a leading drive letter + colon marks a drive-relative value');
        }
    },

    // ── SC-6 — the A1 composition failure ───────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-162 every derivation of the docs tree agrees for the same project',
        fn: () => {
            // The A1 failure: `buildDocIndex` derives the docs tree from `projectReference`'s
            // dirname while `session-init-helpers` derives it from `docsIndexPath`'s dirname. Two
            // answers for one project, each passing its own unit test. They must be EQUAL.
            const out = inFixture(RELOCATED, `
                const path = require('path');
                const L = require(REPO + '/.claude/hooks/lib/project-config-loader.cjs');
                const B = require(REPO + '/.claude/skills/ai-context-refresh/scripts/section-builders.cjs');
                const cfg = JSON.parse(require('fs').readFileSync(FIXTURE + '/docs/project-config.json', 'utf8'));
                const refDir = path.dirname(L.getConfiguredDocsIndexPath());
                const rel = p => path.relative(FIXTURE, p).replace(/\\\\/g, '/');
                return {
                    fromDocsIndexPath_reference: rel(refDir),
                    fromDocsIndexPath_tree: rel(path.dirname(refDir)),
                    fromGetDocsRoot_reference: L.getDocsRoot('projectReference', cfg),
                    fromBuildDocIndex_lines: B.buildDocIndex(cfg, FIXTURE).split('\\n').filter(l => l && l !== '\\u0060\\u0060\\u0060')
                };
            `);

            assertEqual(
                out.fromDocsIndexPath_reference,
                out.fromGetDocsRoot_reference,
                'the `.ck.json` docsIndexPath derivation and `getDocsRoot(projectReference)` must name the SAME reference root'
            );
            assertEqual(out.fromDocsIndexPath_tree, 'documentation', 'the docs TREE is the parent of the reference root');
            for (const line of out.fromBuildDocIndex_lines) {
                assertTrue(
                    line.startsWith('documentation/'),
                    `buildDocIndex emitted "${line}" — every entry must sit under the same docs tree the other derivations name`
                );
            }
            // And the buildDocLookup derivation agrees with getDocsRoot as well.
            assertContains(
                builders.buildDocLookup(RELOCATED_CONFIG),
                `${out.fromGetDocsRoot_reference}/feature-spec-reference.md`,
                'buildDocLookup must compose from the same reference root the other surfaces derive'
            );
        }
    },

    // ── SC-6b — ONE knob must be enough ─────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-166 the DOCUMENTED knob alone relocates the reference root',
        fn: () => {
            // TC-DOCROOT-162 proves the two derivations AGREE — but its fixture sets BOTH knobs, so
            // it cannot see the failure this guards: a project that relocates only
            // `docsRoots.projectReference.path` (the knob CLAUDE.md, the schema and the codex
            // residue verifier all document) while leaving `.ck.json` alone.
            //
            // `getConfiguredDocsIndexPath` used to read ONLY `.ck.json`'s `portability.docsIndexPath`,
            // so such a project resolved to the DEFAULT root here. `session-init-helpers` derives
            // `REFERENCE_DOCS_DIR` from this value, so it then scaffolded a full 18-file stub tree at
            // `docs/project-reference/` beside the project's real docs, and every consumer read the
            // stubs. Two sources of truth for one root; following the documented one half-worked.
            const mk = (ck) => {
                const dir = fs.mkdtempSync(path.join(os.tmpdir(), `docroot-164-${process.pid}-`));
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.writeFileSync(
                    path.join(dir, 'docs', 'project-config.json'),
                    JSON.stringify({ docsRoots: { projectReference: { path: 'handbook/reference' } } }),
                    'utf8'
                );
                if (ck) {
                    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
                    fs.writeFileSync(path.join(dir, '.claude', '.ck.json'), JSON.stringify(ck), 'utf8');
                }
                return dir;
            };

            const probe = `
                const path = require('path');
                const L = require(REPO + '/.claude/hooks/lib/project-config-loader.cjs');
                const cfg = JSON.parse(require('fs').readFileSync(FIXTURE + '/docs/project-config.json', 'utf8'));
                const rel = p => path.relative(FIXTURE, p).replace(/\\\\/g, '/');
                return {
                    referenceRoot: rel(path.dirname(L.getConfiguredDocsIndexPath())),
                    fromGetDocsRoot: L.getDocsRoot('projectReference', cfg)
                };
            `;

            // (a) docsRoots alone relocates the root, and the TC-DOCROOT-162 invariant still holds.
            const soloDir = mk(null);
            try {
                const solo = inFixture(soloDir, probe);
                assertEqual(
                    solo.referenceRoot,
                    'handbook/reference',
                    'the documented `docsRoots.projectReference.path` alone must relocate the docs-index root'
                );
                assertEqual(
                    solo.referenceRoot,
                    solo.fromGetDocsRoot,
                    'both derivations must name the SAME reference root when only the documented knob is set'
                );
            } finally {
                fs.rmSync(soloDir, { recursive: true, force: true });
            }

            // (a2) A repo-ESCAPING docsRoots value falls back to the default instead of resolving
            //      outside the project. The schema plane already errors on such a value
            //      (`validateDocsRootsSemantics`), but the runtime plane is fail-SOFT by contract
            //      (ADR-0003), so it must degrade rather than trust it. Guarding the ABSOLUTE form
            //      specifically: `resolveConfiguredPath` honours absolute paths verbatim, so a
            //      `..`-only check would let this one through and scaffold stubs outside the repo.
            for (const escaping of ['/etc/reference', 'C:/elsewhere/reference', '../outside']) {
                const escDir = fs.mkdtempSync(path.join(os.tmpdir(), `docroot-166e-${process.pid}-`));
                fs.mkdirSync(path.join(escDir, 'docs'), { recursive: true });
                fs.writeFileSync(
                    path.join(escDir, 'docs', 'project-config.json'),
                    JSON.stringify({ docsRoots: { projectReference: { path: escaping } } }),
                    'utf8'
                );
                try {
                    assertEqual(
                        inFixture(escDir, probe).referenceRoot,
                        'docs/project-reference',
                        `a repo-escaping docsRoots value (${escaping}) must fall back to the default root`
                    );
                } finally {
                    fs.rmSync(escDir, { recursive: true, force: true });
                }
            }

            // (b) An EXPLICIT `.ck.json` tier still wins, so no project that already pinned its
            //     docs index moves underneath it.
            const pinnedDir = mk({ portability: { docsIndexPath: 'pinned/elsewhere/docs-index-reference.md' } });
            try {
                const pinned = inFixture(pinnedDir, probe);
                assertEqual(
                    pinned.referenceRoot,
                    'pinned/elsewhere',
                    'an explicit `.ck.json` portability.docsIndexPath must keep precedence over docsRoots'
                );
            } finally {
                fs.rmSync(pinnedDir, { recursive: true, force: true });
            }
        }
    },

    // ── SC-9 — the build-gating verifier ────────────────────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-163 verify-sdd resolves its roots under relocation and its anti-R6 guard is live',
        fn: async () => {
            const sdd = await importSdd();

            // (a) The teamArtifacts probes target the CONFIGURED root, not the default.
            const resolved = await sdd.resolveChecks(
                RELOCATED,
                sdd.CHECKS.filter(c => c.code === 'SDD003' || c.code === 'SDD004'),
                {}
            );
            const terms = resolved.flatMap(c => [...(c.requireAll ?? []), ...(c.requireAny ?? []), ...(c.forbidAny ?? [])]);
            for (const expected of ['artifacts/initiatives', 'artifacts/tasks']) {
                assertTrue(terms.includes(expected), `a probe must target the configured \`${expected}\`. got: ${terms.join(', ')}`);
            }
            assertTrue(
                !terms.some(t => typeof t === 'string' && t.startsWith('team-artifacts/')),
                `no probe may still target the DEFAULT team-artifacts tree. got: ${terms.join(', ')}`
            );

            // (b) ROADMAP_PATH_PATTERN follows the relocated roadmap document.
            const patterns = sdd.buildRoadmapPatterns(sdd.resolveTokens('{PRODUCT_ROADMAP_DOC}', RELOCATED_CONFIG));
            assertTrue(patterns.pathPattern.test('documentation/roadmap.md'), 'the roadmap pattern must match the relocated document');
            assertTrue(!patterns.pathPattern.test('docs/product-roadmap.md'), 'the roadmap pattern must no longer match the default document');

            // (c) NO probe reports zero candidate files under relocation.
            const run = await sdd.runChecks(RELOCATED, [], {});
            const hard = run.failures.filter(f => f.severity !== 'warn');
            assertEqual(
                run.sddMetrics.emptyDeclaredRootFindings,
                0,
                `a declared root matched zero files under relocation: ${JSON.stringify(run.failures.filter(f => f.code === 'SDD025'))}`
            );
            assertTrue(
                run.sddMetrics.declaredRootsProbed >= 2,
                `both declared roots must actually be PROBED, got ${run.sddMetrics.declaredRootsProbed} — a zero here makes (c) vacuous`
            );
            assertEqual(hard.length, 0, `relocated fixture must produce no hard failure: ${JSON.stringify(hard)}`);

            // (d) The guard is CAPABLE of firing — otherwise (c) proves nothing. A declared root
            //     with no candidate files must be a hard SDD025 failure.
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), `docroot-15-r6-${process.pid}-`));
            try {
                fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
                fs.mkdirSync(path.join(dir, 'empty-specs'), { recursive: true });
                fs.writeFileSync(
                    path.join(dir, 'docs', 'project-config.json'),
                    JSON.stringify({ specRoots: { business: { path: 'empty-specs' } } }),
                    'utf8'
                );
                const bad = await sdd.runChecks(dir, [], {});
                assertTrue(
                    bad.failures.some(f => f.code === 'SDD025' && f.severity !== 'warn'),
                    `the anti-R6 guard must HARD-FAIL a declared root with zero candidates: ${JSON.stringify(bad.failures)}`
                );
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[docroot-relocation] TC-DOCROOT-164 SDD004 accepts the default literal inside a form-(b) sentence under relocation',
        fn: async () => {
            const sdd = await importSdd();
            const [check] = await sdd.resolveChecks(RELOCATED, sdd.CHECKS.filter(c => c.code === 'SDD004'), {});
            assertTrue(!!check.rootTerms, 'SDD004 must carry a rootTerms map once its tokens resolve');
            assertEqual(check.rootTerms.get('artifacts/tasks'), 'team-artifacts/tasks', 'the resolved term must remember its default literal');

            const formB =
                'Route task/initiative artifacts to the configured task/initiative artifact roots — default ' +
                '`team-artifacts/tasks`; a `docsRoots.teamArtifacts.path` entry in ' +
                '`docs/project-config.json` overrides the path. detection/delegation only.';
            assertDeepEqual(
                sdd.evaluateCheck(check, formB),
                [],
                'a form-(b) sentence naming the DEFAULT literal is the documented idiom and must CLEAR, ' +
                    'even though the configured root is `artifacts`'
            );
            assertTrue(sdd.isFormBOverrideSentence(formB), 'the shared form-(b) predicate must recognise the sentence');
            assertTrue(!sdd.hasBareOccurrence(formB, 'team-artifacts/tasks'), 'the default literal has no BARE occurrence here');

            // The other half of the contract: a BARE occurrence is still a violation.
            const bare = formB + '\nWrite the task to team-artifacts/tasks and stop.';
            assertTrue(
                sdd.evaluateCheck(check, bare).some(f => f.includes('forbidden text found')),
                'a bare hardcoded artifact path must still fail, or the exemption would swallow the rule'
            );
            // ...and so is a bare occurrence of the RESOLVED root.
            const bareResolved = formB + '\nWrite the task to artifacts/tasks and stop.';
            assertTrue(
                sdd.evaluateCheck(check, bareResolved).some(f => f.includes('forbidden text found')),
                'a bare occurrence of the CONFIGURED root must fail too'
            );
        }
    },

    // ── SC-6 — the single-segment guard, in composition ─────────────────────
    {
        name: '[docroot-relocation] TC-DOCROOT-165 the docs tree never degenerates to the project root',
        fn: () => {
            // `docsRoots.projectReference.path = "reference"` is a legal value whose `path.dirname`
            // is `.` — the PROJECT ROOT. Scanning that would walk every sibling tree in the repo
            // and emit the result into the generated root file.
            const block = builders.buildDocIndex({ docsRoots: { projectReference: { path: 'reference' } } }, RELOCATED);
            assertTrue(!!block, 'the single-segment variant must still produce content');
            assertContains(block, 'reference/docs-index-reference.md', 'a single-segment root must resolve to ITSELF');

            const siblings = ['documentation/', 'spec-library', 'work-plans', 'artifacts', '.claude', 'docs/'];
            for (const sibling of siblings) {
                assertNotContains(
                    block,
                    sibling,
                    `the docs tree degenerated to the project root — \`${sibling}\` leaked into the doc index`
                );
            }
            // The nested variant is unaffected: it resolves to its PARENT, as designed.
            const nested = builders.buildDocIndex(RELOCATED_CONFIG, RELOCATED);
            assertContains(nested, 'documentation/reference/', 'a nested root still resolves to its parent tree');
            assertNotContains(nested, 'spec-library', 'and still never walks the project root');
        }
    }
];

module.exports = {
    name: 'docroot-relocation',
    tests
};
