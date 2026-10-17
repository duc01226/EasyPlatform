#!/usr/bin/env node
'use strict';
/**
 * doc-impact-map — which project-reference docs and `project-config.json`
 * sections can the CURRENT code changes have made stale?
 *
 * The `/docs-manager --mode=update` skill uses this to run an IMPACT-SCOPED freshness pass
 * instead of a full `/scan-all` + `/project-config` rebuild: the
 * routing is deterministic and derived from `docs/project-config.json`, so the
 * model spends its budget verifying the few docs a diff can actually rot
 * instead of re-deriving every doc from scratch.
 *
 * Modes
 *   map    (default) changed files -> impacted docs + config sections + checks
 *   claims           extract file references from a doc, report the dead ones
 *
 * Usage
 *   node .claude/scripts/doc-impact-map.cjs [--json|--text] [--base=<ref>] [files...]
 *   node .claude/scripts/doc-impact-map.cjs claims [--json] [doc...]
 *
 * With no explicit file list, `map` discovers uncommitted changes, then tries
 * last-commit and branch comparisons, plus untracked files. The docs-manager
 * caller passes its resolved file list explicitly to preserve caller scope.
 *
 * Fail-open by contract: every unreadable config, bad regex, or git failure
 * degrades to "route it anyway / report a warning" — a broken mapper must
 * never let a stale doc pass as fresh, and must never halt the caller.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { resolveProjectRoot } = require('./lib/project-root.cjs');

const PROJECT_DIR = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;

// ---------------------------------------------------------------------------
// Framework wiring (fail-open: fall back to literals if the lib moves)
// ---------------------------------------------------------------------------

const warnings = [];

function requireQuiet(rel) {
    try {
        return require(rel);
    } catch (err) {
        warnings.push(`Could not load ${rel}: ${err.message}`);
        return null;
    }
}

const helpers = requireQuiet('../hooks/lib/session-init-helpers.cjs');
const referenceRegistry = requireQuiet('../hooks/lib/project-reference-registry.cjs');
const loader = requireQuiet('../hooks/lib/project-config-loader.cjs');
const pathUtils = requireQuiet('../hooks/lib/ck-path-utils.cjs');
const fileConventions = requireQuiet('../hooks/lib/file-conventions.cjs');

/**
 * Segment-boundary root match. Shared normalizer when available; the inline fallback
 * keeps the module's fail-open contract if `ck-path-utils.cjs` ever moves, and applies
 * the SAME normalization (backslash -> `/`, trailing slashes stripped, case-folded) so
 * routing cannot differ between the two paths.
 */
const isPathWithinRoot =
    (pathUtils && pathUtils.isPathWithinRoot) ||
    ((candidate, root) => {
        const norm = v =>
            String(v || '')
                .trim()
                .replace(/\\/g, '/')
                .replace(/\/{2,}/g, '/')
                .replace(/^\.\//, '')
                .replace(/\/+$/, '')
                .toLowerCase();
        const c = norm(candidate);
        const r = norm(root);
        if (!c || !r) return false;
        return c === r || c.startsWith(`${r}/`);
    });

/** doc filename -> the scan invocation that fully regenerates it. */
const SCAN_SKILL_MAP = (referenceRegistry && referenceRegistry.SCAN_SKILL_MAP) || (helpers && helpers.SCAN_SKILL_MAP) || {
    'project-structure-reference.md': 'scan --target=project-structure',
    'backend-patterns-reference.md': 'scan --target=backend-patterns',
    'seed-test-data-reference.md': 'scan --target=seed-test-data',
    'frontend-patterns-reference.md': 'scan --target=frontend-patterns',
    'integration-test-reference.md': 'scan --target=integration-tests',
    'performance-test-reference.md': 'scan --target=performance-tests',
    'feature-spec-reference.md': 'scan --target=feature-spec',
    'code-review-rules.md': 'scan --target=code-review-rules',
    'scss-styling-guide.md': 'scan --target=scss-styling',
    'design-system/README.md': 'scan --target=design-system',
    'e2e-test-reference.md': 'scan --target=e2e-tests',
    'domain-entities-reference.md': 'scan --target=domain-entities',
    'docs-index-reference.md': 'scan --target=docs-index'
};

const REFERENCE_DOCS_DIR =
    (helpers && helpers.REFERENCE_DOCS_DIR) || path.join(PROJECT_DIR, 'docs', 'project-reference');

const LAST_SCANNED_RE = (helpers && helpers.LAST_SCANNED_RE) || /<!--\s*Last scanned:\s*(\d{4}-\d{2}-\d{2})\s*-->/;

function loadConfig() {
    if (loader && typeof loader.loadProjectConfig === 'function') {
        try {
            return loader.loadProjectConfig() || {};
        } catch (err) {
            warnings.push(`project-config load failed: ${err.message}`);
        }
    }
    try {
        return JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'docs', 'project-config.json'), 'utf-8'));
    } catch {
        warnings.push('docs/project-config.json missing or unreadable — routing falls back to heuristics only.');
        return {};
    }
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/** Repo-relative POSIX path, no leading ./ or /. */
function toRepoRel(p) {
    if (!p) return '';
    let s = String(p).replace(/\\/g, '/').trim();
    const root = PROJECT_DIR.replace(/\\/g, '/').replace(/\/+$/, '');
    if (root && s.toLowerCase().startsWith(root.toLowerCase() + '/')) s = s.slice(root.length + 1);
    else if (path.isAbsolute(s) && fileConventions) {
        // A differently-spelled absolute path (symlink, macOS /var -> /private/var) is in-project
        // when its filesystem identity is; containment is owned by file-conventions.
        const physical = fileConventions.toRepoRelative(s, PROJECT_DIR);
        if (physical) return physical;
    }
    return s.replace(/^\.\//, '').replace(/^\/+/, '');
}

/** Context-group pathRegexes use slash-prefixed probes; module pathRegexes use repo-relative paths. */
function probePath(relPath) {
    return '/' + relPath;
}

function safeRegex(pattern) {
    try {
        return new RegExp(pattern, 'i');
    } catch {
        warnings.push(`Invalid regex in project-config: ${pattern}`);
        return null;
    }
}

/** Turn a glob-ish or plain path fragment from config into a loose matcher. */
function fragmentMatcher(fragment) {
    if (!fragment || typeof fragment !== 'string') return null;
    const cleaned = fragment.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\*+/g, '');
    const trimmed = cleaned.replace(/\/+$/, '').trim();
    if (!trimmed || trimmed === '.') return null;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i');
}

function ext(relPath) {
    return path.posix.extname(relPath).toLowerCase();
}

// ---------------------------------------------------------------------------
// Changed-file collection (standalone fallback; callers may supply exact scope)
// ---------------------------------------------------------------------------

// `git ls-files` on a large monorepo runs to megabytes, well past execFileSync's
// 1MB default. Overflowing it throws ENOBUFS, which the fail-open catch below
// turns into "git could not answer" — and with no file list every short-form
// citation would look DEAD rather than merely imprecise. So the buffer is sized for
// the whole index, a git failure warns instead of passing silently, and the file
// list then comes from the project tree (`projectTreeFiles`): a mapper that reports
// live files as dead is worse than one that admits it could not look.
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

/** git output, or `null` (with a warning) when git could not answer: no work tree, no git, overflow. */
function tryGit(args) {
    try {
        return execFileSync('git', args, {
            cwd: PROJECT_DIR,
            encoding: 'utf-8',
            maxBuffer: GIT_MAX_BUFFER,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (err) {
        warnings.push(`git ${args.join(' ')} failed: ${err.code || err.message}`);
        return null;
    }
}

function git(args) {
    return tryGit(args) || '';
}

/** Parse `git diff --name-status` output into {status, file} records. */
function parseNameStatus(out) {
    const rows = [];
    for (const line of String(out).split('\n')) {
        if (!line.trim()) continue;
        const parts = line.split('\t');
        const status = (parts[0] || '').trim().charAt(0).toUpperCase();
        // Renames carry both old and new path; the new path is what docs describe.
        const file = toRepoRel(parts[parts.length - 1]);
        if (file) rows.push({ status: status || 'M', file });
    }
    return rows;
}

function collectChangedFiles(baseRef) {
    let rows = [];
    let source = '';

    if (baseRef) {
        rows = parseNameStatus(git(['diff', '--name-status', '-M', `${baseRef}...HEAD`]));
        source = `git diff ${baseRef}...HEAD`;
    } else {
        rows = parseNameStatus(git(['diff', '--name-status', '-M', 'HEAD']));
        source = 'git diff HEAD (staged + unstaged)';
        if (rows.length === 0) {
            rows = parseNameStatus(git(['diff', '--name-status', '-M', 'HEAD~1']));
            source = 'git diff HEAD~1 (last commit)';
        }
    }

    // Untracked files never appear in `git diff`, yet a brand-new file is the
    // single most common reason a reference doc is INCOMPLETE rather than wrong.
    const untracked = git(['ls-files', '--others', '--exclude-standard']);
    let untrackedCount = 0;
    for (const line of untracked.split('\n')) {
        const file = toRepoRel(line);
        if (file && !rows.some(r => r.file === file)) {
            rows.push({ status: 'A', file });
            untrackedCount += 1;
        }
    }
    // The label must name every source it actually drew from. Reporting only the `git diff` range
    // while silently folding in untracked files invites a reader to conclude the map is BLIND to
    // new files and to go re-derive them by hand — which is exactly the misread this line caused.
    if (untrackedCount > 0) source += ` + ${untrackedCount} untracked`;

    return { rows, source };
}

// ---------------------------------------------------------------------------
// Routing rules — every rule states WHICH docs/config sections a change class
// can rot, and WHY. Config-derived rules come first; heuristics are flagged.
// ---------------------------------------------------------------------------

function refDoc(name) {
    // design-system/README.md style keys keep their subpath.
    try {
        const abs = helpers && typeof helpers.getReferenceDocPath === 'function'
            ? helpers.getReferenceDocPath(name)
            : path.join(REFERENCE_DOCS_DIR, name);
        return toRepoRel(abs);
    } catch (error) {
        warnings.push(`Unsafe project-reference path ${name}: ${error.message}`);
        return '';
    }
}

/** A doc target that is not a scannable reference doc (e.g. CLAUDE.md). */
function plainDoc(relPath) {
    return toRepoRel(relPath);
}

/**
 * The always-on docs-index document, resolved through its CONFIGURED owner.
 *
 * The index filename is configurable — an explicit `.claude/.ck.json` `portability.docsIndexPath`
 * (a full path to the index FILE) or a relocated `docsRoots.projectReference.path`. Spelling the
 * framework default alias here reaches the WRONG file for a custom-named index: the map would
 * report a missing default sibling while `/docs-manager --mode=update` treats `exists: false` as work to repair,
 * so verification keeps targeting a file the scan owner never writes. `project-config-loader`
 * already owns the precedence; ask it instead of re-deriving the path.
 */
function docsIndexDoc() {
    let filename = 'docs-index-reference.md';
    try {
        if (loader && typeof loader.getConfiguredDocsIndexPath === 'function') {
            const configured = String(loader.getConfiguredDocsIndexPath() || '').replace(/\\/g, '/');
            filename = path.posix.basename(configured) || filename;
        }
    } catch (error) {
        warnings.push(`docs-index path resolution failed: ${error.message}`);
    }
    return refDoc(filename);
}

function buildRules(config) {
    const rules = [];

    // The canonical task-specific selection. `getReferenceDocs` already resolves an ABSENT array
    // to its evidence-backed set and treats an explicit array (including `[]`) as exact, so the
    // mapper consumes that ONE owner instead of re-deriving selection policy.
    let selectionAvailable = !!(helpers && typeof helpers.getReferenceDocs === 'function');
    let selectedFilenames = new Set();
    if (selectionAvailable) {
        try {
            selectedFilenames = new Set(
                (helpers.getReferenceDocs(config) || []).map(doc => doc && doc.filename).filter(Boolean)
            );
        } catch (error) {
            // Fail-open: a broken resolver must not silently erase every task-specific route.
            warnings.push(`reference selection failed: ${error.message}`);
            selectionAvailable = false;
        }
    }

    /**
     * A TASK-SPECIFIC built-in reference output, emitted only when its filename is in the exact
     * selected set. Always-on docs (the docs index through `docsIndexDoc`) and config-owned
     * `contextGroups` paths (`plainDoc`) are separate owners and are deliberately NOT filtered.
     */
    function builtinRefDoc(name) {
        if (selectionAvailable && !selectedFilenames.has(name)) return '';
        return refDoc(name);
    }

    const add = rule => {
        if (!rule || !rule.match) return;
        const docs = (rule.docs || []).filter(Boolean);
        const configSections = rule.configSections || [];
        // A rule that produced no output at all would still MATCH and, when grounded, suppress
        // the conventions fallback while contributing nothing — silently dropping the file from
        // `unrouted`. Drop it instead so unrouted accounting stays honest.
        if (!docs.length && !configSections.length) return;
        rules.push({ ...rule, docs });
    };

    // R1 — contextGroups: the config's own code-area -> guidance-doc mapping.
    for (const group of config.contextGroups || []) {
        const regexes = (group.pathRegexes || []).map(safeRegex).filter(Boolean);
        if (!regexes.length) continue;
        const docs = [group.guideDoc, group.patternsDoc, group.stylingDoc, group.designSystemDoc]
            .filter(d => typeof d === 'string' && d.trim())
            .map(plainDoc);
        add({
            id: `contextGroup:${group.name || 'unnamed'}`,
            reason: `context group "${group.name}" owns this path — its guidance docs describe the patterns and rules here`,
            docs,
            configSections: ['contextGroups'],
            checks: ['claims', 'coverage', 'conventions'],
            match: rel => regexes.some(r => r.test(probePath(rel)))
        });
    }

    // R2 — modules: the module registry + directory map live in project-structure.
    for (const mod of config.modules || []) {
        const re = safeRegex(mod.pathRegex);
        if (!re) continue;
        add({
            id: `module:${mod.name}`,
            reason: `module "${mod.name}" changed — module registry, directory map and description can drift`,
            docs: [builtinRefDoc('project-structure-reference.md')],
            configSections: ['modules'],
            checks: ['claims', 'coverage', 'counts'],
            // modules[].pathRegex follows the repo-relative POSIX contract used by
            // project-config-loader.getModuleForPath(); keep it separate from R1.
            match: rel => re.test(toRepoRel(rel))
        });
    }

    // R3 — testing: integration/unit test surface.
    const testFragments = []
        .concat(Object.values((config.testing && config.testing.filePatterns) || {}))
        .concat(config.integrationTestVerify ? [config.integrationTestVerify.testProjectPattern] : [])
        .filter(Boolean);
    const testMatchers = testFragments.map(fragmentMatcher).filter(Boolean);
    add({
        id: 'testing',
        reason: 'test surface changed — base classes, fixtures, helpers, run commands can drift',
        docs: [builtinRefDoc('integration-test-reference.md')],
        configSections: ['testing', 'integrationTestVerify'],
        checks: ['claims', 'coverage', 'commands'],
        match: rel =>
            testMatchers.some(m => m.test(rel)) ||
            /(^|\/)(tests?|__tests__|spec)\//i.test(rel) ||
            /\.(test|spec)\.[a-z]+$/i.test(rel)
    });

    const performanceMatchers = [].concat(config.testing?.filePatterns?.performance || [])
        .filter(pattern => typeof pattern === 'string')
        .map(pattern => fileConventions && typeof fileConventions.globToRegExp === 'function'
            ? fileConventions.globToRegExp(pattern.includes('/') ? pattern : `**/${pattern}`)
            : fragmentMatcher(pattern))
        .filter(Boolean);
    const performanceDoc = builtinRefDoc('performance-test-reference.md');
    // System and resource changes can invalidate the performance contract as well as scenario edits.
    if (performanceDoc) add({
        id: 'performance-tests',
        reason: 'performance contract can drift after system, harness or resource changes',
        suppressesFallback: false,
        docs: [performanceDoc],
        configSections: ['testing', 'framework'],
        checks: ['claims', 'coverage', 'commands'],
        match: rel => !/^(tmp|temp)\//i.test(rel) &&
            (performanceMatchers.some(matcher => matcher.test(rel)) ||
                /\.(?:cjs|mjs|js|jsx|ts|tsx|py|go|rs|cs|java|kt|sql|rb|php|ex|exs|swift)$/i.test(rel) ||
                MANIFESTS.test(rel) || INFRA.test(rel) ||
                /(^|\/)(?:perf(?:ormance)?|bench(?:marks?)?|load-tests?)(\/|\.)/i.test(rel))
    });

    // R4 — e2e surface.
    const e2e = config.e2eTesting || {};
    const e2eMatchers = [e2e.testsPath, e2e.pageObjectsPath, e2e.fixturesPath, e2e.configFile]
        .map(fragmentMatcher)
        .filter(Boolean);
    if (e2eMatchers.length) {
        add({
            id: 'e2e',
            reason: 'E2E surface changed — page objects, fixtures, config can drift',
            docs: [builtinRefDoc('e2e-test-reference.md')],
            configSections: ['e2eTesting'],
            checks: ['claims', 'coverage'],
            match: rel => e2eMatchers.some(m => m.test(rel))
        });
    }

    // R5 — styling + design system.
    const styleMatchers = []
        .concat(Object.values((config.styling && config.styling.appMap) || {}))
        .concat(((config.designSystem && config.designSystem.appMappings) || []).map(a => a && a.path))
        .concat([config.designSystem && config.designSystem.docsPath])
        .map(fragmentMatcher)
        .filter(Boolean);
    add({
        id: 'styling',
        reason: 'styling/design-system source changed — tokens, BEM conventions, component inventory can drift',
        docs: [builtinRefDoc('scss-styling-guide.md'), builtinRefDoc('design-system/README.md')],
        configSections: ['styling', 'designSystem', 'componentSystem'],
        checks: ['claims', 'coverage', 'conventions'],
        match: rel => ['.scss', '.sass', '.less', '.css'].includes(ext(rel)) || styleMatchers.some(m => m.test(rel))
    });

    // R6 — dependency manifests: tech stack, versions, run commands.
    const MANIFESTS =
        /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|pyproject\.toml|requirements\.txt|go\.mod|pom\.xml|build\.gradle(\.kts)?|Gemfile|Cargo\.toml|[^/]+\.csproj|[^/]+\.sln|global\.json|nx\.json|angular\.json|tsconfig[^/]*\.json)$/i;
    add({
        id: 'manifest',
        reason: 'dependency/build manifest changed — tech stack, versions and run commands can drift',
        docs: [builtinRefDoc('project-structure-reference.md')],
        configSections: ['project', 'framework', 'testing'],
        checks: ['claims', 'versions', 'commands'],
        match: rel => MANIFESTS.test(rel)
    });

    // R7 — infrastructure / CI / environment configuration.
    const INFRA =
        /(^|\/)(docker-compose[^/]*\.ya?ml|Dockerfile[^/]*|\.dockerignore|appsettings[^/]*\.json|\.env[^/]*|Chart\.ya?ml|kustomization\.ya?ml|Jenkinsfile|azure-pipelines\.ya?ml|\.gitlab-ci\.ya?ml|bitbucket-pipelines\.ya?ml)$|(^|\/)(\.github\/workflows|\.circleci|k8s|charts|terraform|ansible|infra)\//i;
    add({
        id: 'infrastructure',
        reason: 'infrastructure/CI/env config changed — ports, deployment stages, environment keys can drift',
        docs: [builtinRefDoc('project-structure-reference.md')],
        configSections: ['infrastructure', 'databases', 'messaging', 'api'],
        checks: ['claims', 'ports', 'commands'],
        match: rel => INFRA.test(rel) || /\.tf(\.json)?$/i.test(rel) || /\.bicep$/i.test(rel)
    });

    // R8 — the AI-harness surface itself. This is the rule that closes the
    // classic ".claude/** is tooling-only, fast-exit" hole: harness edits do not
    // touch product behavior, but they DO invalidate every inventory count and
    // catalog that CLAUDE.md / the docs index derive by globbing `.claude/`.
    add({
        id: 'harness',
        reason: 'AI-harness surface changed — skill/hook/agent/workflow inventory counts and catalogs are glob-derived and drift silently',
        docs: [plainDoc('CLAUDE.md'), docsIndexDoc(), builtinRefDoc('project-structure-reference.md')],
        configSections: ['modules', 'referenceDocs', 'skillConventions'],
        checks: ['counts', 'catalog', 'coverage'],
        match: rel =>
            /^\.claude\//i.test(rel) ||
            /^\.agents\//i.test(rel) ||
            /^\.codex\//i.test(rel) ||
            /^\.github\/(copilot|prompts)/i.test(rel) ||
            /^(CLAUDE|AGENTS)\.md$/i.test(rel)
    });

    // R9 — docs tree (excluding the spec roots, which the /spec chain owns).
    const specRoots = [config.specRoots && config.specRoots.business, config.specRoots && config.specRoots.technical]
        .filter(Boolean)
        .map(r => toRepoRel(r.path || ''))
        .filter(Boolean);

    // The docs TREE is the parent of the reference-doc root, NOT a hardcoded `docs/`.
    // Derived the same way the CLAUDE.md builders derive it, because a second,
    // independently-written derivation is exactly the composition failure
    // TC-DOCROOT-162 exists to catch: two callers disagreeing about one project's
    // docs tree, each passing its own unit test.
    //   defaults: `docs/project-reference` -> `docs`  (byte-identical to the old
    //             `/^docs\//i`, so a zero-config project is unaffected)
    //   relocated: `documentation/reference` -> `documentation`
    // A single-segment root has no parent to climb to; it resolves to ITSELF rather
    // than to the repo root, or this rule would route every changed file in the repo.
    const docsTree = (() => {
        const refRoot = toRepoRel(
            (loader && loader.getDocsRoot && loader.getDocsRoot('projectReference', config)) ||
                'docs/project-reference'
        );
        if (!refRoot) return 'docs';
        const parent = refRoot.replace(/\/+$/, '').split('/').slice(0, -1).join('/');
        return parent || refRoot;
    })();
    add({
        id: 'docs-tree',
        reason: 'documentation tree changed — docs index, categories and cross-links can drift',
        docs: [docsIndexDoc()],
        configSections: ['referenceDocs'],
        checks: ['claims', 'counts', 'links'],
        // `isPathWithinRoot` matches on a SEGMENT BOUNDARY and normalizes both sides.
        // The previous `rel.toLowerCase().startsWith(root.toLowerCase())` failed OPEN in
        // two ways: a slash-free root over-matched every prefix-sharing sibling (at
        // DEFAULTS `docs/specs` swallowed `docs/specs-technical/**`, silently excluding
        // that whole tree from this rule), and a backslashed configured root
        // (`docs\specs`) never matched anything at all.
        match: rel =>
            (isPathWithinRoot(rel, docsTree) && !specRoots.some(root => isPathWithinRoot(rel, root))) ||
            // Root-level prose (README, CONTRIBUTING, …) is part of the documented
            // doc tree; leaving it unrouted reads as "nothing to check".
            /^[^/]+\.(md|mdx)$/i.test(rel)
    });

    // R10 — domain entities (heuristic: no config field declares entity roots).
    add({
        id: 'domain-entities',
        heuristic: true,
        reason: 'entity/domain-model path changed (heuristic) — entity inventory, aggregates and ERD can drift',
        docs: [builtinRefDoc('domain-entities-reference.md')],
        configSections: [],
        checks: ['claims', 'coverage'],
        match: rel => /(^|\/)(entities|entity|domain|models|aggregates)(\/|$)/i.test(rel)
    });

    // R11 — seed data (heuristic).
    add({
        id: 'seed-test-data',
        heuristic: true,
        reason: 'seeder path changed (heuristic) — seeder inventory and conventions can drift',
        docs: [builtinRefDoc('seed-test-data-reference.md')],
        configSections: [],
        checks: ['claims', 'coverage'],
        match: rel => /(^|\/)(seed|seeds|seeders|seeding)(\/|$)/i.test(rel) || /seed[-_.]?data/i.test(rel)
    });

    // Explicit generic docs opt in to conservative repository-wide source impact.
    // Their purpose/sections decide what the scan records; because the config has no
    // path-scope declaration, every non-disposable project change can affect the doc.
    // Curated/manual docs are deliberately excluded from automatic freshness claims.
    const selectedReferenceDocs = helpers && typeof helpers.getReferenceDocs === 'function'
        ? helpers.getReferenceDocs(config)
        : [];
    const disposablePath = /(^|\/)(\.git|node_modules|\.next|dist|build|coverage|tmp|temp|vendor|target)(\/|$)/i;
    for (const doc of selectedReferenceDocs) {
        const target = helpers.getReferenceDocScanTarget(doc);
        if (target.kind !== 'generic') continue;
        const outputDoc = refDoc(doc.filename);
        if (!outputDoc) continue;
        add({
            id: `generic-reference:${doc.filename}`,
            reason: `selected generic reference "${doc.filename}" summarizes repository evidence and may be stale after project changes`,
            docs: [outputDoc],
            configSections: ['referenceDocs'],
            checks: ['claims', 'coverage', 'conventions'],
            // A repo-wide "may be stale" route is NOT proof that it OWNS the conventions for a
            // path. It must stay additive: if a distinct selected owner (e.g. code-review-rules)
            // also applies, that owner must survive. A genuinely specific configured rule still
            // suppresses the fallback through its own grounded status.
            suppressesFallback: false,
            match: rel => toRepoRel(rel) !== outputDoc && !disposablePath.test(toRepoRel(rel))
        });
    }

    // R12 — any source file that reached none of the above still carries
    // conventions. Applied only as a fallback so it never floods the wave.
    const CODE_EXT = new Set([
        '.cs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go',
        '.java', '.kt', '.rb', '.php', '.rs', '.vue', '.svelte'
    ]);
    add({
        id: 'code-conventions',
        fallback: true,
        reason: 'source file changed — naming, structure and review conventions can drift',
        docs: [builtinRefDoc('code-review-rules.md')],
        configSections: [],
        checks: ['conventions'],
        match: rel => CODE_EXT.has(ext(rel))
    });

    return rules;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function referenceFilename(relDocPath) {
    const absolute = path.resolve(PROJECT_DIR, relDocPath);
    const relative = path.relative(REFERENCE_DOCS_DIR, absolute).replace(/\\/g, '/');
    if (!relative || relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) return null;
    return relative;
}

function docMeta(relDocPath, config) {
    const abs = path.join(PROJECT_DIR, relDocPath);
    const exists = fs.existsSync(abs);
    let lastScanned = null;
    let ageDays = null;
    if (exists) {
        try {
            const head = fs.readFileSync(abs, 'utf-8').slice(0, 400);
            const m = head.match(LAST_SCANNED_RE);
            if (m) {
                lastScanned = m[1];
                const t = new Date(m[1] + 'T00:00:00Z').getTime();
                if (!isNaN(t)) ageDays = Math.floor((Date.now() - t) / 86400000);
            }
        } catch {
            /* non-blocking */
        }
    }
    const filename = referenceFilename(relDocPath);
    const scanTarget = resolveDocScanTarget(filename, config);
    return { exists, lastScanned, ageDays, scanTarget };
}

/**
 * The runnable scan command for a routed doc, or null when none is authorized.
 *
 * A command is emitted ONLY for a doc the scan contract actually owns: a member of the exact
 * task-specific selection, or the always-on docs index. A config-owned `contextGroups` route may
 * legitimately NAME an unselected built-in filename, but that must stay a reader-impact route —
 * inheriting a command from its basename would hand `/docs-manager --mode=update` a scan the exact-selection
 * gate is guaranteed to block. Always-on docs are resolved separately from `referenceDocs`.
 */
function resolveDocScanTarget(filename, config) {
    if (!filename) return null;
    if (helpers && typeof helpers.getReferenceDocScanTarget === 'function') {
        const selected = typeof helpers.getReferenceDocs === 'function'
            ? helpers.getReferenceDocs(config).find(doc => doc.filename === filename)
            : null;
        const alwaysOn = !!selected
            || (typeof helpers.getAlwaysOnReferenceDocs === 'function'
                && helpers.getAlwaysOnReferenceDocs().some(doc => doc.filename === filename));
        if (!selected && !alwaysOn) return null;
        const resolved = helpers.getReferenceDocScanTarget(selected || filename);
        return (resolved && resolved.command) || null;
    }
    // Fail-open fallback: legacy literal table when the shared resolver is unavailable.
    return SCAN_SKILL_MAP[filename] || null;
}

function mapChanges(rows, config) {
    const rules = buildRules(config);
    const docs = new Map();
    const sections = new Map();
    const unrouted = [];

    for (const row of rows) {
        const rel = row.file;
        const hits = rules.filter(r => {
            try {
                return r.match(rel);
            } catch {
                return false;
            }
        });
        // A fallback rule (conventions) is suppressed only by a CONFIG-DERIVED hit that actually
        // OWNS a document. A heuristic hit is a guess; a generic repo-wide hit is possible
        // staleness, not ownership (`suppressesFallback: false`); and a rule whose selected docs
        // were all filtered out owns nothing. None of them may shrink the verified surface.
        const suppressors = hits.filter(
            h => !h.fallback && !h.heuristic && h.suppressesFallback !== false && (h.docs || []).length > 0
        );
        const applied = suppressors.length ? hits.filter(h => !h.fallback) : hits;

        if (!applied.length) {
            unrouted.push(rel);
            continue;
        }

        for (const rule of applied) {
            for (const doc of rule.docs) {
                if (!docs.has(doc)) {
                    docs.set(doc, {
                        doc,
                        ...docMeta(doc, config),
                        reasons: new Set(),
                        rules: new Set(),
                        checks: new Set(),
                        changedFiles: new Set(),
                        addedFiles: new Set(),
                        deletedFiles: new Set(),
                        heuristicOnly: true
                    });
                }
                const entry = docs.get(doc);
                entry.reasons.add(rule.reason);
                entry.rules.add(rule.id);
                for (const c of rule.checks || []) entry.checks.add(c);
                entry.changedFiles.add(rel);
                if (row.status === 'A') entry.addedFiles.add(rel);
                if (row.status === 'D') entry.deletedFiles.add(rel);
                if (!rule.heuristic) entry.heuristicOnly = false;
            }
            for (const section of rule.configSections || []) {
                if (!sections.has(section)) {
                    sections.set(section, { section, reasons: new Set(), changedFiles: new Set() });
                }
                sections.get(section).reasons.add(rule.reason);
                sections.get(section).changedFiles.add(rel);
            }
        }
    }

    const setsToArrays = obj => {
        const out = {};
        for (const [k, v] of Object.entries(obj)) out[k] = v instanceof Set ? [...v] : v;
        return out;
    };

    return {
        docs: [...docs.values()].map(setsToArrays).sort((a, b) => a.doc.localeCompare(b.doc)),
        configSections: [...sections.values()].map(setsToArrays).sort((a, b) => a.section.localeCompare(b.section)),
        unrouted
    };
}

// ---------------------------------------------------------------------------
// Claims mode — do the file references inside a doc still resolve?
// ---------------------------------------------------------------------------

const CLAIM_RE = /`([^`\n]*?[\\/][^`\n]*?\.[A-Za-z0-9]{1,6})(?::\d+(?:-\d+)?)?`/g;

/** Line-scoped marker that exempts a DELIBERATELY unresolvable citation from the dead list. */
const CLAIM_OPT_OUT = '<!-- dead-link-ok -->';
/** Line-scoped roles for valid paths that are intentionally not repository source files. */
const CLAIM_ROLE_OPT_OUT = /<!--\s*path-role:\s*(?:generated-output|proposed|user-local)\s*-->/i;

// Without a git file list (a copy with no work tree, no git on the host, an overflowed buffer) the
// project tree itself is the file list, so a live file is never called dead for want of git. The walk
// is bounded, follows no links and skips git's own directory and installed dependencies.
const TREE_WALK_SKIPPED_DIRS = new Set(['.git', 'node_modules']);
const TREE_WALK_MAX_FILES = 200000;

function projectTreeFiles() {
    const files = [];
    const pending = [''];
    while (pending.length && files.length < TREE_WALK_MAX_FILES) {
        const relDir = pending.pop();
        let entries;
        try {
            entries = fs.readdirSync(path.join(PROJECT_DIR, relDir), { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                if (!TREE_WALK_SKIPPED_DIRS.has(entry.name)) pending.push(rel);
            } else {
                files.push(rel);
            }
        }
    }
    if (pending.length) {
        warnings.push(`Project tree walk stopped at ${files.length} files; a short-form citation beyond it reads as dead.`);
    }
    return files;
}

let repoFilesCache = null;
let workspacePackagesCache = null;
/** Repo file list, used to resolve short-form citations before calling one dead. */
function repoFiles() {
    if (repoFilesCache) return repoFilesCache;
    const listed = tryGit(['ls-files']);
    repoFilesCache = listed === null
        ? projectTreeFiles()
        : listed
            .split('\n')
            .map(l => l.trim().replace(/\\/g, '/'))
            .filter(Boolean);
    return repoFilesCache;
}

/**
 * Workspace packages indexed by their public package name. This lets claims mode distinguish
 * a real package export (`@scope/pkg/subpath`) from a repository-relative file reference.
 */
function workspacePackages() {
    if (workspacePackagesCache) return workspacePackagesCache;
    workspacePackagesCache = new Map();
    for (const relative of repoFiles().filter(file => path.posix.basename(file) === 'package.json')) {
        try {
            const manifestPath = path.join(PROJECT_DIR, relative);
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            if (typeof manifest.name !== 'string' || !manifest.name.trim()) continue;
            const entries = workspacePackagesCache.get(manifest.name) || [];
            entries.push({ root: path.dirname(manifestPath), manifest });
            workspacePackagesCache.set(manifest.name, entries);
        } catch {
            // A malformed/unreadable package manifest cannot validate a package citation.
        }
    }
    return workspacePackagesCache;
}

function exportValueForSubpath(exportsField, subpath) {
    if (typeof exportsField === 'string' || Array.isArray(exportsField) || exportsField === null) {
        return subpath === '.' ? { value: exportsField, wildcard: null } : null;
    }
    if (!exportsField || typeof exportsField !== 'object') return null;

    const keys = Object.keys(exportsField);
    const isSubpathMap = keys.some(key => key.startsWith('.'));
    if (!isSubpathMap) return subpath === '.' ? { value: exportsField, wildcard: null } : null;
    if (Object.prototype.hasOwnProperty.call(exportsField, subpath)) {
        return { value: exportsField[subpath], wildcard: null };
    }

    const wildcardKeys = keys.filter(key => key.includes('*'))
        .sort((a, b) => b.length - a.length);
    for (const pattern of wildcardKeys) {
        const [prefix, suffix] = pattern.split('*');
        if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
        const wildcard = subpath.slice(prefix.length, subpath.length - suffix.length);
        return { value: exportsField[pattern], wildcard };
    }
    return null;
}

function exportTargets(value, wildcard) {
    if (typeof value === 'string') return [wildcard === null ? value : value.replace(/\*/g, wildcard)];
    if (Array.isArray(value)) return value.flatMap(item => exportTargets(item, wildcard));
    if (value && typeof value === 'object') return Object.values(value).flatMap(item => exportTargets(item, wildcard));
    return [];
}

/** Return true only when a workspace package reference resolves to a real file. */
function isWorkspacePackageReference(claim) {
    const match = claim.match(/^(@[^/]+\/[^/]+|[^/]+)\/(.+)$/);
    if (!match) return false;
    const [, packageName, subpath] = match;
    const candidates = workspacePackages().get(packageName) || [];
    if (candidates.length !== 1) return false;

    const { root, manifest } = candidates[0];
    const exportsField = Object.prototype.hasOwnProperty.call(manifest, 'exports') ? manifest.exports : undefined;
    const selected = exportsField === undefined
        ? { value: `./${subpath}`, wildcard: null }
        : exportValueForSubpath(exportsField, `./${subpath}`);
    if (!selected) return false;

    return exportTargets(selected.value, selected.wildcard).some(target => {
        const normalized = target.replace(/\\/g, '/');
        if (!normalized.startsWith('./') || normalized.split('/').some(segment => segment === '..')) return false;
        const absolute = path.resolve(root, normalized);
        const relative = path.relative(root, absolute);
        if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return false;
        return fs.existsSync(absolute);
    });
}

function isSafeRelativeClaim(claim) {
    const normalized = String(claim || '').replace(/\\/g, '/');
    return Boolean(normalized) &&
        !normalized.startsWith('/') &&
        !/^[a-zA-Z]:/.test(normalized) &&
        !normalized.includes('\0') &&
        !normalized.split('/').includes('..');
}

/**
 * Absolute-path containment for traversal/symlink guards. Shared canonical predicate when
 * available; the inline fallback keeps the module's fail-open load contract if
 * `ck-path-utils.cjs` ever moves and applies the SAME rule (resolve both sides, compare via
 * `path.relative` on a segment boundary) so containment cannot differ between the two paths.
 */
const isAbsolutePathWithin =
    (pathUtils && pathUtils.isAbsolutePathWithin) ||
    ((root, candidate) => {
        if (typeof root !== 'string' || typeof candidate !== 'string' || !root || !candidate) return false;
        if (root.includes('\0') || candidate.includes('\0')) return false;
        const relative = path.relative(path.resolve(root), path.resolve(candidate));
        return relative === '' ||
            (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
    });

/**
 * Resolve an existing repo-relative claim while keeping both lexical and physical paths
 * inside `rootAbs` and the project root. This rejects traversal and symlink escapes.
 */
function existingPathWithin(rootAbs, relativePath) {
    if (!isSafeRelativeClaim(relativePath)) return false;

    const projectRoot = path.resolve(PROJECT_DIR);
    const root = path.resolve(rootAbs);
    const candidate = path.resolve(root, relativePath);
    if (!isAbsolutePathWithin(projectRoot, root) || !isAbsolutePathWithin(root, candidate)) return false;
    if (!fs.existsSync(candidate)) return false;

    try {
        const realProjectRoot = fs.realpathSync(projectRoot);
        const realRoot = fs.realpathSync(root);
        const realCandidate = fs.realpathSync(candidate);
        return isAbsolutePathWithin(realProjectRoot, realRoot) &&
            isAbsolutePathWithin(realRoot, realCandidate);
    } catch {
        return false;
    }
}

function isCanonicalBusinessSpecClaim(claim) {
    const parts = String(claim || '').split('/');
    if (parts.length !== 2 || !parts[0] || parts[0] === '.' || parts[0] === '..') return false;
    return parts[1] === 'INDEX.md' || /^README\..+\.md$/.test(parts[1]);
}

let businessSpecRootRead = false;
let businessSpecRoot = null;
function getBusinessSpecRoot() {
    if (businessSpecRootRead) return businessSpecRoot;
    businessSpecRootRead = true;

    if (!loader || typeof loader.getProjectConfigStatus !== 'function' || typeof loader.getSpecDocsPath !== 'function') {
        warnings.push('Could not resolve the configured business-spec root for category-relative claims.');
        return null;
    }

    try {
        const status = loader.getProjectConfigStatus();
        if (!status || !['valid', 'missing'].includes(status.state)) {
            warnings.push('Project config is invalid; category-relative business-spec claims cannot use a default root.');
            return null;
        }
        const config = status.state === 'valid' ? status.config : {};
        businessSpecRoot = path.resolve(PROJECT_DIR, loader.getSpecDocsPath(config));
        return businessSpecRoot;
    } catch (error) {
        warnings.push(`Business-spec root resolution failed: ${error.message}`);
        return null;
    }
}

function checkClaims(relDocPath) {
    const abs = path.join(PROJECT_DIR, relDocPath);
    if (!fs.existsSync(abs)) {
        return { doc: relDocPath, exists: false, checked: 0, missing: [], ambiguous: [] };
    }
    const text = fs.readFileSync(abs, 'utf-8');
    const seen = new Set();
    const missing = [];
    // Short-form citations (`shared/contract.md` for `.claude/skills/shared/contract.md`)
    // resolve to a real file by suffix. They are imprecise, not dead — separating
    // them keeps the dead list small enough that people still read it.
    const ambiguous = [];
    // A reference doc sometimes names a file precisely BECAUSE it is gone — a
    // retired artifact, a known-broken link recorded on purpose. Those citations
    // are correct and must stay unresolvable, so the line carries an explicit
    // opt-out instead. Line-scoped and greppable on purpose: a doc-wide switch
    // would silently exempt future rot in the same file.
    const suppressed = new Set();
    text.split('\n').forEach((line, i) => {
        if (line.includes(CLAIM_OPT_OUT) || CLAIM_ROLE_OPT_OUT.test(line)) suppressed.add(i);
    });
    const lineOf = index => text.slice(0, index).split('\n').length - 1;
    let m;
    while ((m = CLAIM_RE.exec(text)) !== null) {
        if (suppressed.has(lineOf(m.index))) continue;
        // A backticked span is often a COMMAND (`node path/to/x.cjs`), so the
        // path is the last whitespace-delimited token, not the whole span.
        let claim = m[1].trim().replace(/\\/g, '/').split(/\s+/).pop();
        // Drop obvious non-paths: globs, placeholders, urls, bare versions.
        if (!claim || claim.includes('*') || claim.includes('{') || claim.includes('<')) continue;
        if (/^[a-z]+:\/\//i.test(claim)) continue;
        // The separator must survive into the LAST token. The span `padding: 0 1.5rem`
        // matches the pattern via the slash in an earlier token, but `1.5rem` is a CSS
        // value, not a path — and a false dead citation is what makes people stop
        // reading the dead list.
        if (!claim.includes('/')) continue;
        // Elided citations (`Client/.../thing.service.ts`) name a real file with the
        // middle cut out: unresolvable BY CONSTRUCTION, so calling them dead is noise.
        if (claim.includes('...') || claim.includes('…')) continue;
        const base = claim.slice(claim.lastIndexOf('/') + 1);
        // `0.5/0.75/1/1.5rem` — a slash-joined value list, not a path. A basename
        // opening with a digit-dot is a number, never a filename in this tree.
        if (/^\d+\./.test(base)) continue;
        // `Module/Shared.Domain` is a DIRECTORY whose last segment happens to
        // carry a dot. File extensions here are lowercase; a PascalCase suffix is a
        // .NET namespace segment, so treat it as a directory reference, not a file.
        if (!/\.[a-z0-9]{1,6}$/.test(base)) continue;
        claim = claim.replace(/^\.\//, '');
        if (seen.has(claim)) continue;
        seen.add(claim);

        // `/docs/x.md` is a REPO-ROOTED citation, not a filesystem-absolute path: resolve it
        // against the project root exactly, never by suffix and never under the spec root.
        // `//server/share/...` stays a UNC path and is rejected below. The claim is reported
        // as cited so the dead list names the text a maintainer has to repoint.
        if (/^\/(?!\/)/.test(claim)) {
            if (existingPathWithin(PROJECT_DIR, claim.slice(1))) continue;
            missing.push(claim);
            continue;
        }

        // An explicit configured-root index is already repo-relative. Treating
        // specs/INDEX.md as a bucket claim would look for specs/specs/INDEX.md.
        // Keep this exact: unrelated bucket collisions and unsafe claims still
        // follow the canonical resolver and its containment checks below.
        if (base === 'INDEX.md') {
            const root = getBusinessSpecRoot();
            const rootClaim = root && `${path.relative(PROJECT_DIR, root).split(path.sep).join('/')}/INDEX.md`;
            if (claim === rootClaim) {
                if (existingPathWithin(root, 'INDEX.md')) continue;
                missing.push(claim);
                continue;
            }
        }

        // Feature Specs and bucket catalogs are authored relative to the configured
        // business-spec root. Resolve only their canonical one-bucket forms here; a
        // generic search across configured roots could bless a same-named file from
        // an unrelated documentation category.
        if (isCanonicalBusinessSpecClaim(claim)) {
            const root = getBusinessSpecRoot();
            if (root && existingPathWithin(root, claim)) continue;
            missing.push(claim);
            continue;
        }

        if (existingPathWithin(PROJECT_DIR, claim)) continue;

        if (!isSafeRelativeClaim(claim)) {
            missing.push(claim);
            continue;
        }
        if (isWorkspacePackageReference(claim)) continue;
        if (repoFiles().some(f => f.toLowerCase().endsWith('/' + claim.toLowerCase()))) {
            ambiguous.push(claim);
            continue;
        }
        missing.push(claim);
    }
    return { doc: relDocPath, exists: true, checked: seen.size, missing, ambiguous };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function renderMapText(result) {
    const lines = [];
    lines.push(`Changed files: ${result.changedFileCount} (${result.source})`);
    if (result.fastExit) {
        lines.push('FAST EXIT — no reference doc and no project-config section is impacted.');
    }
    if (result.docs.length) {
        lines.push('', 'Impacted docs:');
        for (const d of result.docs) {
            const age = d.ageDays === null ? 'no stamp' : `${d.ageDays}d old`;
            lines.push(
                `  - ${d.doc} [${d.exists ? age : 'MISSING'}]${d.heuristicOnly ? ' (heuristic)' : ''}` +
                    `\n      checks: ${d.checks.join(', ')}` +
                    `\n      files:  ${d.changedFiles.slice(0, 6).join(', ')}${d.changedFiles.length > 6 ? ` (+${d.changedFiles.length - 6})` : ''}` +
                    (d.scanTarget ? `\n      rescan: ${d.scanTarget}` : '')
            );
        }
    }
    if (result.configSections.length) {
        lines.push('', 'Impacted project-config.json sections:');
        for (const s of result.configSections) {
            lines.push(`  - ${s.section} (${s.changedFiles.length} file(s))`);
        }
    }
    if (result.unrouted.length) {
        lines.push('', `Unrouted files (${result.unrouted.length}) — confirm manually, do NOT assume fresh:`);
        for (const f of result.unrouted.slice(0, 20)) lines.push(`  - ${f}`);
    }
    if (result.warnings.length) {
        lines.push('', 'Warnings:');
        for (const w of result.warnings) lines.push(`  ! ${w}`);
    }
    return lines.join('\n');
}

function renderClaimsText(results) {
    const lines = [];
    for (const r of results) {
        if (!r.exists) {
            lines.push(`${r.doc}: MISSING`);
            continue;
        }
        lines.push(
            `${r.doc}: ${r.checked} path claim(s), ${r.missing.length} dead, ${(r.ambiguous || []).length} short-form`
        );
        for (const f of r.missing) lines.push(`  x ${f}`);
        for (const f of r.ambiguous || []) lines.push(`  ~ ${f} (resolves by suffix — repo-root it)`);
    }
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/**
 * The doc set the claims check covers when no explicit target is given.
 * Walks `REFERENCE_DOCS_DIR` (default docs/project-reference; a `docsRoots.projectReference.path` entry in docs/project-config.json overrides it)
 * RECURSIVELY so the CLI default matches the set the
 * reference-doc-freshness build gate walks — a flat scan silently skipped nested docs,
 * so the remediation command the failing gate prints could not reproduce the failure.
 * @returns {string[]} repo-relative paths, forward-slashed
 */
function defaultClaimTargets() {
    const out = [];
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.md')) out.push(toRepoRel(full));
        }
    };
    try {
        walk(REFERENCE_DOCS_DIR);
    } catch {
        return [];
    }
    return out.filter(Boolean);
}

function main(argv) {
    const args = argv.slice(2);
    const json = args.includes('--json');
    const text = args.includes('--text');
    const baseArg = args.find(a => a.startsWith('--base='));
    const positional = args.filter(a => !a.startsWith('--'));
    const mode = positional[0] === 'claims' ? 'claims' : 'map';

    if (mode === 'claims') {
        let targets = positional.slice(1).map(toRepoRel);
        if (!targets.length) targets = defaultClaimTargets();
        const results = targets.map(checkClaims);
        process.stdout.write((json || !text ? JSON.stringify({ mode: 'claims', results, warnings }, null, 2) : renderClaimsText(results)) + '\n');
        return 0;
    }

    const config = loadConfig();
    let rows;
    let source;
    if (positional.length) {
        rows = positional.map(f => ({ status: 'M', file: toRepoRel(f) })).filter(r => r.file);
        source = 'explicit file list';
    } else {
        const collected = collectChangedFiles(baseArg ? baseArg.split('=')[1] : null);
        rows = collected.rows;
        source = collected.source;
    }

    const mapped = mapChanges(rows, config);
    const result = {
        mode: 'map',
        source,
        changedFileCount: rows.length,
        fastExit: mapped.docs.length === 0 && mapped.configSections.length === 0 && mapped.unrouted.length === 0,
        ...mapped,
        warnings
    };

    process.stdout.write((text && !json ? renderMapText(result) : JSON.stringify(result, null, 2)) + '\n');
    return 0;
}

if (require.main === module) {
    try {
        // Set the exit code and let the process end by itself: process.exit() drops piped output past the pipe buffer.
        process.exitCode = main(process.argv);
    } catch (err) {
        // Fail-open: a mapper crash must never block the docs-manager --mode=update run.
        process.stdout.write(JSON.stringify({ mode: 'error', error: err.message, warnings }, null, 2) + '\n');
        process.exitCode = 0;
    }
}

module.exports = {
    buildRules,
    mapChanges,
    checkClaims,
    defaultClaimTargets,
    collectChangedFiles,
    toRepoRel,
    probePath,
    SCAN_SKILL_MAP
};
