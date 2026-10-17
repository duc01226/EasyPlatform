#!/usr/bin/env node
/**
 * Convention Merge — stack-agnostic detection of per-file convention classes from
 * EXISTING project-config data, and a merge that never overwrites maintainer work
 * (spec BR-PFCI-12).
 *
 * Detection reads only config keys other setup steps already populate
 * (specRoots, testing, integrationTestVerify, e2eTesting, modules, styling,
 * project.languages, framework docs). A detected group keeps only reference docs
 * that exist on disk and is emitted only if it is still deliverable.
 *
 * CLI (default: dry run, JSON to stdout):
 *   node .claude/hooks/lib/convention-merge.cjs --detect [--merge] [--write] [--enable] [--config <path>]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isInjectable, skillPath, readBoundedContent, UI_UX_GATE, AI_FEATURE_GATE, AI_SDK, CLASS_TRIGGERS, TRIGGER_EDIT } = require('./file-conventions.cjs');
const { getDocsRoot } = require('./project-config-loader.cjs');

// The three spec-authoring reference docs. Only the FILENAMES are fixed; the root resolves from
// the same config the caller already passes: default `docs/project-reference`, relocated by a `docsRoots.projectReference.path` entry in docs/project-config.json.
// Hardcoding the root made every
// `exists()` check in `candidate()` fail in a relocated project, so the feature-spec group lost
// its referenceDocs silently — every SIBLING group here already reads its docs from config.
const SPEC_DOC_NAMES = ['feature-spec-reference.md', 'spec-system-reference.md', 'spec-principles.md'];

function specDocs(cfg) {
    const root = trimSlashes(getDocsRoot('projectReference', cfg));
    return SPEC_DOC_NAMES.map(name => `${root}/${name}`);
}

const LANGUAGE_EXTENSIONS = {
    javascript: ['.js', '.cjs', '.mjs', '.jsx'],
    typescript: ['.ts', '.tsx', '.mts', '.cts'],
    python: ['.py'],
    csharp: ['.cs'],
    'c#': ['.cs'],
    java: ['.java'],
    kotlin: ['.kt', '.kts'],
    go: ['.go'],
    rust: ['.rs'],
    ruby: ['.rb'],
    php: ['.php'],
    swift: ['.swift'],
    scala: ['.scala'],
    dart: ['.dart'],
    cpp: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    'c++': ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
    c: ['.c', '.h']
};

// Dependency/build output plus the framework's disposable generated-output roots (tmp/, temp/).
const GENERAL_EXCLUDES = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/vendor/**', 'tmp/**', 'temp/**'];
const META_FIELDS = new Set(['origin', 'detectedFingerprint']);

// The UI/UX gate class lives in file-conventions.cjs (it is also the built-in fallback when no
// project config exists); detection proposes it only for a project with recorded front-end evidence.

// The AI-feature gate class lives in file-conventions.cjs beside its SDK list (also the built-in
// fallback); detection proposes it only for a project whose dependency manifests name an AI SDK.
const MANIFEST_LIMITS = Object.freeze({ maxDepth: 2, maxDirs: 60, maxManifests: 30, maxBytes: 262144 });
const MANIFEST_SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'build', 'tmp', 'temp', 'target', 'bin', 'obj', 'venv', 'env', '__pycache__']);
const MANIFEST_NAME = /^(?:package\.json|requirements[^/\\]*\.txt|pyproject\.toml|go\.mod|pom\.xml|build\.gradle(?:\.kts)?|[^/\\]+\.csproj)$/i;
// `-`, `_` and `.` are interchangeable in package spellings (import name vs manifest name).
const foldPackage = name => String(name).toLowerCase().replace(/[-_.]/g, '-');
const AI_SDK_EXACT = new Set(AI_SDK.python.map(foldPackage));
const AI_SDK_PREFIXES = AI_SDK.pythonPrefixes.concat(AI_SDK.other, AI_SDK.manifestOnly).map(foldPackage);

/** Manifest files at the project root and up to MANIFEST_LIMITS.maxDepth levels below it (dot and build folders skipped). */
function findManifests(projectDir) {
    const found = [];
    const queue = [[projectDir, 0]];
    let dirs = 0;
    while (queue.length && dirs < MANIFEST_LIMITS.maxDirs && found.length < MANIFEST_LIMITS.maxManifests) {
        const [dir, depth] = queue.shift();
        dirs += 1;
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (entry.isFile() && MANIFEST_NAME.test(entry.name)) {
                found.push(path.join(dir, entry.name));
            } else if (entry.isDirectory() && depth < MANIFEST_LIMITS.maxDepth && !entry.name.startsWith('.') && !MANIFEST_SKIP_DIRS.has(entry.name.toLowerCase())) {
                queue.push([path.join(dir, entry.name), depth + 1]);
            }
        }
    }
    return found.slice(0, MANIFEST_LIMITS.maxManifests);
}

/** Whether one manifest's text names an AI SDK (package.json by dependency key, other manifests by package token). */
function manifestNamesAiSdk(fileName, text) {
    if (/^package\.json$/i.test(fileName)) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            return false;
        }
        const names = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
            .flatMap(section => (isPlainObject(parsed) && isPlainObject(parsed[section]) ? Object.keys(parsed[section]) : []));
        return names.some(name => AI_SDK.js.includes(name) || AI_SDK.jsScopes.some(scope => name.startsWith(scope)));
    }
    const tokens = text.toLowerCase().match(/[a-z0-9@_./-]+/g) || [];
    return tokens.some(token => {
        const folded = foldPackage(token);
        return AI_SDK_EXACT.has(folded) || AI_SDK_PREFIXES.some(prefix => folded.startsWith(prefix));
    });
}

/** AI evidence recorded in the repository's dependency manifests (bounded reads; unreadable files are skipped). */
function hasAiSdkEvidence(projectDir) {
    for (const file of findManifests(projectDir)) {
        const text = readBoundedContent(file, MANIFEST_LIMITS.maxBytes);
        if (text && manifestNamesAiSdk(path.basename(file), text)) return true;
    }
    return false;
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function strings(value) {
    if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
    return Array.isArray(value) ? value.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim()) : [];
}

function unique(list) {
    return Array.from(new Set(list));
}

function trimSlashes(p) {
    return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function isValidRegex(source) {
    try {
        new RegExp(source, 'i');
        return true;
    } catch {
        return false;
    }
}

function makeFileExists(projectDir, fileExists) {
    if (typeof fileExists === 'function') return fileExists;
    return rel => {
        try {
            return fs.existsSync(path.join(projectDir, rel));
        } catch {
            return false;
        }
    };
}

/** Assemble a candidate group; drop missing docs/skills; null if nothing deliverable or no include. */
function candidate(fields, exists) {
    const group = {
        name: fields.name,
        pathRegexes: unique(strings(fields.pathRegexes)),
        priority: fields.priority
    };
    for (const key of ['pathGlobs', 'fileNameRegexes', 'excludePathGlobs', 'fileExtensions', 'contentRegexes', 'contentExtensions']) {
        const list = unique(strings(fields[key]));
        if (list.length) group[key] = list;
    }
    if (typeof fields.contentLabel === 'string' && fields.contentLabel.trim()) group.contentLabel = fields.contentLabel.trim();
    const docs = unique(strings(fields.referenceDocs).map(trimSlashes)).filter(doc => exists(doc));
    if (docs.length) group.referenceDocs = docs;
    const skills = unique(strings(fields.skills)).filter(name => exists(skillPath(name)));
    if (skills.length) group.skills = skills;
    const rules = unique(strings(fields.rules));
    if (rules.length) group.rules = rules;
    if (Number.isInteger(fields.reinjectAfterTokens)) group.reinjectAfterTokens = fields.reinjectAfterTokens;
    const evidenceDocs = unique(strings(fields.evidenceDocs).map(trimSlashes)).filter(doc => exists(doc));
    if (evidenceDocs.length) group.evidenceDocs = evidenceDocs;
    const evidenceSkills = unique(strings(fields.evidenceSkills)).filter(name => exists(skillPath(name)));
    if (evidenceSkills.length) group.evidenceSkills = evidenceSkills;
    // BR-PFCI-19: a detected class that carries reference docs or protocols is authoring context, so
    // it is proposed with the edit trigger (reads stay quiet); a proposal naming its own trigger keeps
    // it, and a rules-only class names none (it behaves as both). The merge below never touches a
    // class it may not refresh, so a maintainer's trigger is never changed (BR-PFCI-12).
    if (CLASS_TRIGGERS.includes(fields.on)) group.on = fields.on;
    else if (group.referenceDocs || group.skills) group.on = TRIGGER_EDIT;
    const hasContentInclude = (group.contentRegexes || []).length && (group.contentExtensions || []).length;
    const hasInclude = group.pathRegexes.length || (group.pathGlobs || []).length || (group.fileNameRegexes || []).length || hasContentInclude;
    return hasInclude && isInjectable(group) ? group : null;
}

function filePatternGlobs(value) {
    return strings(value).map(p => (p.includes('/') ? trimSlashes(p) : `**/${p}`));
}

/**
 * Derive convention classes from existing config data. Order = declaration order
 * used for ties (specific classes first).
 * @returns {object[]} detected groups (without origin/fingerprint)
 */
function detectGroups(config, opts = {}) {
    const cfg = isPlainObject(config) ? config : {};
    const exists = makeFileExists(opts.projectDir || process.cwd(), opts.fileExists);
    const framework = isPlainObject(cfg.framework) ? cfg.framework : {};
    const testing = isPlainObject(cfg.testing) ? cfg.testing : {};
    const filePatterns = isPlainObject(testing.filePatterns) ? testing.filePatterns : {};
    const detected = [];
    const push = group => { if (group) detected.push(group); };

    const business = isPlainObject(cfg.specRoots) && isPlainObject(cfg.specRoots.business) ? cfg.specRoots.business : null;
    if (business && typeof business.path === 'string' && business.path.trim()) {
        push(candidate({
            name: 'feature-spec',
            priority: 100,
            pathGlobs: [`${trimSlashes(business.path)}/**/*.md`],
            referenceDocs: specDocs(cfg),
            skills: ['spec']
        }, exists));
    }

    const itv = isPlainObject(cfg.integrationTestVerify) ? cfg.integrationTestVerify : {};
    const integrationPatternGlobs = filePatternGlobs(filePatterns.integration);
    const integrationGlobs = integrationPatternGlobs
        .concat(strings(itv.testProjects).filter(p => /[\\/]/.test(p)).map(p => `${trimSlashes(p)}/**`));
    const integrationRegexes = strings(itv.testProjectPattern).filter(isValidRegex);
    push(candidate({
        name: 'integration-test',
        priority: 100,
        pathRegexes: integrationRegexes,
        pathGlobs: integrationGlobs,
        referenceDocs: strings(framework.integrationTestDoc).concat(strings(itv.referenceDocs)),
        skills: ['integration-test'],
        rules: strings(testing.integrationRules)
    }, exists));

    push(candidate({
        name: 'performance-test',
        priority: 100,
        pathGlobs: filePatternGlobs(filePatterns.performance),
        referenceDocs: strings(framework.performanceTestDoc),
        skills: ['performance-test']
    }, exists));

    const e2e = isPlainObject(cfg.e2eTesting) ? cfg.e2eTesting : null;
    // strings() accepts a string or an array, so a non-string framework value cannot throw here.
    const e2eFrameworks = e2e ? strings(e2e.framework) : [];
    if (e2eFrameworks.length && !e2eFrameworks.every(name => /^none$/i.test(name))) {
        push(candidate({
            name: 'e2e-test',
            priority: 100,
            pathGlobs: strings(e2e.testsPath).concat(strings(e2e.pageObjectsPath)).map(p => `${trimSlashes(p)}/**`),
            referenceDocs: strings(framework.e2eTestDoc).concat(strings(e2e.guideDoc)),
            skills: ['e2e-test']
        }, exists));
    }

    const integrationSet = new Set(integrationPatternGlobs);
    const otherTestGlobs = Object.entries(filePatterns)
        .filter(([kind]) => kind !== 'integration')
        .flatMap(([, value]) => filePatternGlobs(value))
        .filter(glob => !integrationSet.has(glob));
    push(candidate({
        name: 'test',
        priority: 100,
        pathGlobs: otherTestGlobs,
        referenceDocs: strings(testing.guideDoc)
    }, exists));

    const modules = Array.isArray(cfg.modules) ? cfg.modules.filter(isPlainObject) : [];
    const moduleRegexes = prefix => modules
        .filter(m => typeof m.kind === 'string' && m.kind.toLowerCase().startsWith(prefix))
        .flatMap(m => strings(m.pathRegex))
        .filter(isValidRegex);
    const styling = isPlainObject(cfg.styling) ? cfg.styling : {};

    // Front-end evidence already recorded in the config: a frontend module or styling file types.
    const hasFrontEnd = modules.some(m => typeof m.kind === 'string' && m.kind.toLowerCase().startsWith('frontend')) ||
        strings(styling.fileExtensions).length > 0;
    if (hasFrontEnd) push(candidate({ ...UI_UX_GATE, excludePathGlobs: GENERAL_EXCLUDES.slice() }, exists));
    // AI evidence: an AI SDK named in a dependency manifest (same SDK list the class's content signals use).
    if (hasAiSdkEvidence(opts.projectDir || process.cwd())) push(candidate({ ...AI_FEATURE_GATE }, exists));

    push(candidate({
        name: 'backend',
        priority: 500,
        pathRegexes: moduleRegexes('backend'),
        referenceDocs: strings(framework.backendPatternsDoc)
    }, exists));
    push(candidate({
        name: 'frontend',
        priority: 500,
        pathRegexes: moduleRegexes('frontend'),
        referenceDocs: strings(framework.frontendPatternsDoc)
    }, exists));

    if (strings(styling.fileExtensions).length) {
        push(candidate({
            name: 'styling',
            priority: 500,
            pathGlobs: ['**/*'],
            fileExtensions: styling.fileExtensions,
            excludePathGlobs: GENERAL_EXCLUDES,
            referenceDocs: strings(styling.guideDoc)
        }, exists));
    }

    const project = isPlainObject(cfg.project) ? cfg.project : {};
    const extensions = unique(strings(project.languages).flatMap(lang => LANGUAGE_EXTENSIONS[lang.toLowerCase()] || []));
    if (extensions.length) {
        push(candidate({
            name: 'general-code',
            priority: 900,
            pathGlobs: ['**/*'],
            fileExtensions: extensions,
            excludePathGlobs: GENERAL_EXCLUDES,
            referenceDocs: strings(framework.codeReviewDoc)
        }, exists));
    }
    return detected;
}

function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (isPlainObject(value)) {
        const out = {};
        for (const key of Object.keys(value).sort()) {
            if (!META_FIELDS.has(key)) out[key] = canonical(value[key]);
        }
        return out;
    }
    return value;
}

/** Fingerprint of a group's content, ignoring setup-owned metadata. */
function fingerprintGroup(group) {
    return crypto.createHash('sha256').update(JSON.stringify(canonical(group))).digest('hex').slice(0, 16);
}

/**
 * BR-PFCI-12 merge:
 *   no group with that name            → ADD (origin detected + fingerprint)
 *   origin !== 'detected'               → KEEP
 *   detected but edited since detection → KEEP
 *   detected and unedited               → REFRESH (identical content ⇒ reported kept)
 * Never removes a group; order of existing groups preserved, additions appended.
 */
function mergeDetected(existing, detected) {
    const groups = (Array.isArray(existing) ? existing : []).slice();
    const added = [];
    const refreshed = [];
    const kept = [];
    for (const incoming of Array.isArray(detected) ? detected : []) {
        if (!isPlainObject(incoming) || typeof incoming.name !== 'string') continue;
        const fingerprint = fingerprintGroup(incoming);
        const stamped = { ...incoming, origin: 'detected', detectedFingerprint: fingerprint };
        // Case-insensitive: a maintainer "Backend" and a detected "backend" are the same class, not two.
        const key = incoming.name.trim().toLowerCase();
        const index = groups.findIndex(g => isPlainObject(g) && typeof g.name === 'string' && g.name.trim().toLowerCase() === key);
        if (index < 0) {
            groups.push(stamped);
            added.push(incoming.name);
            continue;
        }
        const current = groups[index];
        const unedited = current.origin === 'detected' && current.detectedFingerprint === fingerprintGroup(current);
        if (!unedited || current.detectedFingerprint === fingerprint) {
            kept.push(incoming.name);
            continue;
        }
        groups[index] = stamped;
        refreshed.push(incoming.name);
    }
    return { groups, added, refreshed, kept };
}

function parseArgs(argv) {
    const get = flag => {
        const i = argv.indexOf(flag);
        return i >= 0 ? argv[i + 1] : undefined;
    };
    return {
        detect: argv.includes('--detect'),
        merge: argv.includes('--merge'),
        write: argv.includes('--write'),
        enable: argv.includes('--enable'),
        config: get('--config')
    };
}

/**
 * Replace a file via a sibling temp file + rename, so an interrupted run never leaves the
 * project configuration half-written. The temp file is removed when the write fails.
 */
function writeTextAtomic(file, text) {
    const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    try {
        fs.writeFileSync(temp, text);
        fs.renameSync(temp, file);
    } catch (err) {
        try {
            fs.unlinkSync(temp);
        } catch {
            /* temp never created or already moved */
        }
        throw err;
    }
}

function runCli(argv) {
    const args = parseArgs(argv);
    if (!args.detect) {
        process.stdout.write('Usage: node .claude/hooks/lib/convention-merge.cjs --detect [--merge] [--write] [--enable] [--config <path>]\n');
        return 2;
    }
    const { resolveProjectRoot } = require('./project-root.cjs');
    const { getConfiguredProjectConfigPath } = require('./project-config-loader.cjs');
    const projectDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
    const configPath = args.config ? path.resolve(process.cwd(), args.config) : getConfiguredProjectConfigPath();
    // The project config is OPTIONAL. Detection is pure inspection of the repository, and
    // `detectGroups` already tolerates an empty config, so a project without one gets its
    // detected groups instead of a raw ENOENT. Writing is different: merging into a file that
    // does not exist would fabricate a project config as a side effect of an inspection
    // command, so that path stops and names the skill that owns creating it.
    const configMissing = !fs.existsSync(configPath);
    if (configMissing && (args.merge || args.write)) {
        process.stderr.write(
            `convention-merge: no project config at ${configPath}. The config is optional, but ` +
            `--merge/--write need one to merge into. Run /project-config to create it, then re-run.\n`
        );
        return 1;
    }
    const config = configMissing ? {} : JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const detected = detectGroups(config, { projectDir });
    if (!args.merge) {
        process.stdout.write(JSON.stringify({ configPath, configMissing, detected }, null, 2) + '\n');
        return 0;
    }
    const result = mergeDetected(config.contextGroups, detected);
    const summary = { configPath, added: result.added, refreshed: result.refreshed, kept: result.kept, written: false };
    if (args.write) {
        const next = { ...config, contextGroups: result.groups };
        const current = isPlainObject(config.conventionInjection) ? config.conventionInjection : {};
        // `--enable` switches delivery on for an explicit setup run, but never overrides a
        // maintainer's explicit `enabled: false` (spec §7: only the maintainer switches it).
        const switchOn = args.enable && current.enabled !== true && current.enabled !== false;
        if (switchOn) next.conventionInjection = { ...current, enabled: true };
        if (args.enable && current.enabled === false) summary.enableSkipped = 'explicitly disabled by maintainer';
        const changed = result.added.length || result.refreshed.length || switchOn;
        if (changed) {
            writeTextAtomic(configPath, JSON.stringify(next, null, 2) + '\n');
            summary.written = true;
        }
    } else {
        summary.groups = result.groups;
    }
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    return 0;
}

module.exports = { detectGroups, fingerprintGroup, mergeDetected, hasAiSdkEvidence, LANGUAGE_EXTENSIONS, UI_UX_GATE, AI_FEATURE_GATE };

// Launcher-aware entry: Codex runs hooks via `node -e … require()`, where require.main is undefined.
// hook-runner.cjs isHookEntryPoint (twin of scripts/lib/project-root.cjs isInvokedAsScript)
// canonicalizes a symlinked launch path; it is loaded only when require.main is undefined.
function isLauncherEntry() {
    try {
        return require('./hook-runner.cjs').isHookEntryPoint(module);
    } catch (err) {
        // Only a missing hook-runner means "not a launcher entry"; a broken one must surface.
        if (err && err.code === 'MODULE_NOT_FOUND' && String(err.message).includes("'./hook-runner.cjs'")) return false;
        throw err;
    }
}

if (require.main === module || (!require.main && isLauncherEntry())) {
    try {
        process.exitCode = runCli(process.argv.slice(2));
    } catch (err) {
        process.stderr.write(`convention-merge: ${err && err.message ? err.message : err}\n`);
        process.exitCode = 1;
    }
}
