'use strict';

/**
 * Synchronous framework-repo signal for the CommonJS test suites.
 *
 * A self-check that asserts this framework repository's own files (its registry, skill defaults or
 * project config) must skip in an adopting project, or that project's own content fails it. CJS
 * suites need the answer while their test list is built, so the guard is synchronous: an async
 * guard there reports a false pass.
 *
 * Resolution is identical to `.claude/scripts/codex/tests/framework-repo.helper.mjs` (the ESM
 * helper the codex suites use; PORT-011 locks it active in the framework repo):
 * 1. the project config path is `portability.projectConfigPath` in `.claude/.ck.json`, else
 *    `docs/project-config.json`;
 * 2. the expected package name is `portability.toolingPackageName` in that config, else the
 *    upstream framework package name;
 * 3. the root `package.json` `name` must equal it.
 * The content-presence suite carries the parity tripwire that asserts both helpers agree.
 */

const fs = require('fs');
const path = require('path');

/** The upstream framework repo's package `name`, used when the project config names none. */
const DEFAULT_FRAMEWORK_PACKAGE_NAME = 'easy-claude-tooling';

/** Repo-relative path of the ESM helper this module must agree with. */
const FRAMEWORK_REPO_HELPER_REL = path.join('.claude', 'scripts', 'codex', 'tests', 'framework-repo.helper.mjs');

/** Parse a JSON file, or `null` when it is absent, unreadable or malformed. */
function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

/** The project config path, honoring a relocation in `.claude/.ck.json`. */
function projectConfigPath(repoRoot) {
    const configured = readJson(path.join(repoRoot, '.claude', '.ck.json'))?.portability?.projectConfigPath;
    const rel = typeof configured === 'string' && configured.trim() ? configured.trim() : 'docs/project-config.json';
    return path.isAbsolute(rel) ? rel : path.join(repoRoot, rel);
}

/** The package `name` that identifies this project's framework-tooling package. Uncached. */
function frameworkPackageName(repoRoot) {
    const configured = readJson(projectConfigPath(repoRoot))?.portability?.toolingPackageName;
    return typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_FRAMEWORK_PACKAGE_NAME;
}

/** True only inside the framework repo itself. */
function isFrameworkRepo(repoRoot) {
    const pkg = readJson(path.join(repoRoot, 'package.json'));
    return pkg !== null && pkg?.name === frameworkPackageName(repoRoot);
}

/** Absolute path of the ESM helper under `repoRoot`, for the parity tripwire. */
function frameworkRepoHelperPath(repoRoot) {
    return path.join(repoRoot, FRAMEWORK_REPO_HELPER_REL);
}

module.exports = {
    DEFAULT_FRAMEWORK_PACKAGE_NAME,
    FRAMEWORK_REPO_HELPER_REL,
    frameworkPackageName,
    frameworkRepoHelperPath,
    isFrameworkRepo,
    projectConfigPath
};
