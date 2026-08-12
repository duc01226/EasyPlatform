// Shared guard for test assertions about the FRAMEWORK REPO'S OWN root files.
//
// WHY THIS EXISTS
// `.claude` is designed to be copied into any project. An adopting project keeps its own root
// `package.json` — or has none at all, since `export-claude` deliberately ships none and PORT-007
// asserts that — and its own `.prettierignore`. So a test asserting what easy-claude's npm scripts or
// prettier config say is a SELF-CHECK of this repo, not part of the portable contract.
//
// Left unconditional, those self-checks aborted the sync pipeline at its OWN test stage (stage 4 of
// 16) in every adopting project — after stages 1-3 had already written `.agents/`, `.codex/` and
// `AGENTS.md`, leaving the target half-synced. Measured on a real `export-claude` payload: 10 failures
// with no root package.json, 9 with a typical adopting project's package.json.
//
// WHAT MUST NOT BE GUARDED
// Runner-side assertions stay UNCONDITIONAL. `run-codex-sync.mjs` lives inside `.claude` and is the
// single source of truth for the pipeline, so it exists in every adopting project — guarding those
// would silently drop the coverage that actually travels with the framework. Guard the npm/prettier
// SURFACE only; keep the runner CONTRACT absolute.
//
// The guard is self-identifying rather than existence-based on purpose: an adopting project usually
// DOES have a package.json, so `if (exists)` would still fail there. `PORT-011` locks the guard to
// resolve true in this repo, so renaming the package fails loudly instead of silently skipping the
// self-checks.
//
// WHY THE NAME IS CONFIGURABLE
// Hard-coding the upstream name here made the guard un-portable in exactly the case it matters most:
// a project that VENDORS this framework, wires the runner into its own npm scripts, and names that
// package after itself. There the guard resolved false, so every self-check it gates silently
// skipped — the framework source was being edited with its own guards disabled, and PORT-011's
// tripwire was the only symptom. The expected name is therefore project data, read from
// `portability.toolingPackageName` in the project config, with the upstream name as the fallback so
// the framework repo itself needs no config to keep working.

import fs from 'node:fs';
import path from 'node:path';

/** The upstream framework repo's own package `name` — the fallback when the project config is silent. */
export const DEFAULT_FRAMEWORK_PACKAGE_NAME = 'easy-claude-tooling';

/** Parse a JSON file, or `null` when it is absent/unreadable/malformed. */
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

/**
 * Locate the project config, honoring `.claude/.ck.json`'s `portability.projectConfigPath` when a
 * project relocated it. Read with a plain `fs` parse rather than `hooks/lib/project-config-loader`
 * on purpose: PORT-001 requires the codex pipeline to import only `node:` built-ins and relative
 * files, so this helper must not reach across into the hook layer.
 */
function projectConfigPath(repoRoot) {
    const configured = readJson(path.join(repoRoot, '.claude', '.ck.json'))?.portability?.projectConfigPath;
    const rel = typeof configured === 'string' && configured.trim() ? configured.trim() : 'docs/project-config.json';
    return path.isAbsolute(rel) ? rel : path.join(repoRoot, rel);
}

/**
 * The package `name` that identifies THIS project's framework-tooling package.
 *
 * Resolution order: `portability.toolingPackageName` in the project config → the upstream default.
 * Deliberately uncached — a test that rewrites the config of a temp repo between calls must observe
 * the new value, and the read costs one small file per call in a test-only helper.
 */
export function frameworkPackageName(repoRoot) {
    const configured = readJson(projectConfigPath(repoRoot))?.portability?.toolingPackageName;
    return typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_FRAMEWORK_PACKAGE_NAME;
}

/**
 * The framework repo's own parsed `package.json`, or `null` when the assertion does not apply —
 * i.e. there is no root package.json, or it belongs to an adopting project.
 */
export function frameworkPkg(repoRoot) {
    const pkgPath = path.join(repoRoot, 'package.json');
    let raw;
    try {
        raw = fs.readFileSync(pkgPath, 'utf8');
    } catch {
        return null; // adopting project with no root package.json
    }

    let pkg;
    try {
        pkg = JSON.parse(raw);
    } catch {
        return null; // an adopting project's malformed package.json is not this suite's business
    }

    return pkg?.name === frameworkPackageName(repoRoot) ? pkg : null;
}

/** True only inside the framework repo itself. */
export function isFrameworkRepo(repoRoot) {
    return frameworkPkg(repoRoot) !== null;
}

/**
 * Read a framework-repo-only root file (e.g. `.prettierignore`), or `null` outside this repo /
 * when absent. Callers `return` early on null — the adopting project's own tooling config is theirs.
 */
export function readFrameworkRootFile(repoRoot, relPath) {
    if (!isFrameworkRepo(repoRoot)) return null;
    try {
        return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
    } catch {
        return null;
    }
}
