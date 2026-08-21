#!/usr/bin/env node
'use strict';
/**
 * doc-impact-map — which project-reference docs and `project-config.json`
 * sections can the CURRENT code changes have made stale?
 *
 * The `/docs-update` skill uses this to run an IMPACT-SCOPED freshness pass
 * (Phase 1) instead of a full `/scan-all` + `/project-config` rebuild: the
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
 * With no explicit file list, `map` collects the changed set exactly the way
 * docs-update Phase 0 does: uncommitted -> last commit -> branch diff, plus
 * untracked files (new files are the top source of doc COVERAGE gaps).
 *
 * Fail-open by contract: every unreadable config, bad regex, or git failure
 * degrades to "route it anyway / report a warning" — a broken mapper must
 * never let a stale doc pass as fresh, and must never halt the caller.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

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
const loader = requireQuiet('../hooks/lib/project-config-loader.cjs');

/** doc filename -> the scan invocation that fully regenerates it. */
const SCAN_SKILL_MAP = (helpers && helpers.SCAN_SKILL_MAP) || {
    'project-structure-reference.md': 'scan --target=project-structure',
    'backend-patterns-reference.md': 'scan --target=backend-patterns',
    'seed-test-data-reference.md': 'scan --target=seed-test-data',
    'frontend-patterns-reference.md': 'scan --target=frontend-patterns',
    'integration-test-reference.md': 'scan --target=integration-tests',
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
    return s.replace(/^\.\//, '').replace(/^\/+/, '');
}

/**
 * Config `pathRegex` values are authored against absolute-ish paths and start
 * with a `[\\/]` separator class, so a repo-relative path must be probed with a
 * leading slash or every module regex silently misses.
 */
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
// Changed-file collection (mirrors docs-update Phase 0, Step 0.1)
// ---------------------------------------------------------------------------

// `git ls-files` on a large monorepo runs to megabytes, well past execFileSync's
// 1MB default. Overflowing it throws ENOBUFS, which the fail-open catch below
// turns into an empty file list — and an empty list makes every short-form
// citation look DEAD rather than merely imprecise. So the buffer is sized for
// the whole index, and a git failure warns instead of passing silently: a mapper
// that reports live files as dead is worse than one that admits it could not look.
const GIT_MAX_BUFFER = 64 * 1024 * 1024;

function git(args) {
    try {
        return execFileSync('git', args, {
            cwd: PROJECT_DIR,
            encoding: 'utf-8',
            maxBuffer: GIT_MAX_BUFFER,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (err) {
        warnings.push(`git ${args.join(' ')} failed: ${err.code || err.message}`);
        return '';
    }
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
    for (const line of untracked.split('\n')) {
        const file = toRepoRel(line);
        if (file && !rows.some(r => r.file === file)) rows.push({ status: 'A', file });
    }

    return { rows, source };
}

// ---------------------------------------------------------------------------
// Routing rules — every rule states WHICH docs/config sections a change class
// can rot, and WHY. Config-derived rules come first; heuristics are flagged.
// ---------------------------------------------------------------------------

function refDoc(name) {
    // design-system/README.md style keys keep their subpath.
    return toRepoRel(path.join(REFERENCE_DOCS_DIR, name));
}

/** A doc target that is not a scannable reference doc (e.g. CLAUDE.md). */
function plainDoc(relPath) {
    return toRepoRel(relPath);
}

function buildRules(config) {
    const rules = [];
    const add = rule => {
        if (rule && rule.match) rules.push(rule);
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
            docs: [refDoc('project-structure-reference.md')],
            configSections: ['modules'],
            checks: ['claims', 'coverage', 'counts'],
            match: rel => re.test(probePath(rel))
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
        docs: [refDoc('integration-test-reference.md')],
        configSections: ['testing', 'integrationTestVerify'],
        checks: ['claims', 'coverage', 'commands'],
        match: rel =>
            testMatchers.some(m => m.test(rel)) ||
            /(^|\/)(tests?|__tests__|spec)\//i.test(rel) ||
            /\.(test|spec)\.[a-z]+$/i.test(rel)
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
            docs: [refDoc('e2e-test-reference.md')],
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
        docs: [refDoc('scss-styling-guide.md'), refDoc('design-system/README.md')],
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
        docs: [refDoc('project-structure-reference.md')],
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
        docs: [refDoc('project-structure-reference.md')],
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
        docs: [plainDoc('CLAUDE.md'), refDoc('docs-index-reference.md'), refDoc('project-structure-reference.md')],
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
    add({
        id: 'docs-tree',
        reason: 'documentation tree changed — docs index, categories and cross-links can drift',
        docs: [refDoc('docs-index-reference.md')],
        configSections: ['referenceDocs'],
        checks: ['claims', 'counts', 'links'],
        match: rel =>
            (/^docs\//i.test(rel) && !specRoots.some(root => rel.toLowerCase().startsWith(root.toLowerCase()))) ||
            // Root-level prose (README, CONTRIBUTING, …) is part of the documented
            // doc tree; leaving it unrouted reads as "nothing to check".
            /^[^/]+\.(md|mdx)$/i.test(rel)
    });

    // R10 — domain entities (heuristic: no config field declares entity roots).
    add({
        id: 'domain-entities',
        heuristic: true,
        reason: 'entity/domain-model path changed (heuristic) — entity inventory, aggregates and ERD can drift',
        docs: [refDoc('domain-entities-reference.md')],
        configSections: [],
        checks: ['claims', 'coverage'],
        match: rel => /(^|\/)(entities|entity|domain|models|aggregates)(\/|$)/i.test(rel)
    });

    // R11 — seed data (heuristic).
    add({
        id: 'seed-test-data',
        heuristic: true,
        reason: 'seeder path changed (heuristic) — seeder inventory and conventions can drift',
        docs: [refDoc('seed-test-data-reference.md')],
        configSections: [],
        checks: ['claims', 'coverage'],
        match: rel => /(^|\/)(seed|seeds|seeders|seeding)(\/|$)/i.test(rel) || /seed[-_.]?data/i.test(rel)
    });

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
        docs: [refDoc('code-review-rules.md')],
        configSections: [],
        checks: ['conventions'],
        match: rel => CODE_EXT.has(ext(rel))
    });

    return rules;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

function docMeta(relDocPath) {
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
    const base = toRepoRel(relDocPath);
    const key = Object.keys(SCAN_SKILL_MAP).find(k => base.endsWith(k));
    return { exists, lastScanned, ageDays, scanTarget: key ? SCAN_SKILL_MAP[key] : null };
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
        // A fallback rule (conventions) is suppressed only by a CONFIG-DERIVED
        // hit. A heuristic-only hit is a guess, so it must not silence the
        // fallback — otherwise a guess would shrink the verified surface.
        const grounded = hits.filter(h => !h.fallback && !h.heuristic);
        const applied = grounded.length ? hits.filter(h => !h.fallback) : hits;

        if (!applied.length) {
            unrouted.push(rel);
            continue;
        }

        for (const rule of applied) {
            for (const doc of rule.docs) {
                if (!docs.has(doc)) {
                    docs.set(doc, {
                        doc,
                        ...docMeta(doc),
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

let trackedFilesCache = null;
/** Repo file list, used to resolve short-form citations before calling one dead. */
function trackedFiles() {
    if (trackedFilesCache) return trackedFilesCache;
    trackedFilesCache = git(['ls-files'])
        .split('\n')
        .map(l => l.trim().replace(/\\/g, '/'))
        .filter(Boolean);
    return trackedFilesCache;
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
        if (line.includes(CLAIM_OPT_OUT)) suppressed.add(i);
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
        if (claim.includes('...')) continue;
        const base = claim.slice(claim.lastIndexOf('/') + 1);
        // `0.5/0.75/1/1.5rem` — a slash-joined value list, not a path. A basename
        // opening with a digit-dot is a number, never a filename in this tree.
        if (/^\d+\./.test(base)) continue;
        // `bravoTALENTS/Shared.Domain` is a DIRECTORY whose last segment happens to
        // carry a dot. File extensions here are lowercase; a PascalCase suffix is a
        // .NET namespace segment, so treat it as a directory reference, not a file.
        if (!/\.[a-z0-9]{1,6}$/.test(base)) continue;
        claim = claim.replace(/^\.\//, '').replace(/^\/+/, '');
        if (seen.has(claim)) continue;
        seen.add(claim);
        if (fs.existsSync(path.join(PROJECT_DIR, claim))) continue;
        if (trackedFiles().some(f => f.toLowerCase().endsWith('/' + claim.toLowerCase()))) {
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
 * Walks `docs/project-reference/**` RECURSIVELY so the CLI default matches the set the
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
        process.exit(main(process.argv));
    } catch (err) {
        // Fail-open: a mapper crash must never block the docs-update run.
        process.stdout.write(JSON.stringify({ mode: 'error', error: err.message, warnings }, null, 2) + '\n');
        process.exit(0);
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
