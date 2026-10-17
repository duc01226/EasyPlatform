/**
 * project-config refactor keys — schema contract for the optional project switches
 * `contextGroups[].on`, `portability.workflowActivation`, `hooks.codeGraph`,
 * `hooks.tokenBudget`, `commit.fixOriginTrailer`, `pullRequest.targetBranch` and
 * `pullRequest.pushedBranchUpdate`.
 *
 * Guarded business rules:
 * - Every new switch is OPTIONAL: a config that omits them all validates exactly as before,
 *   so an adopter that declares nothing keeps today's behavior.
 * - A declared value outside its allowed set is REJECTED with an error that names the key and
 *   the allowed values (a silently accepted typo would fall back to a default the team did not
 *   choose — e.g. an unknown activation tier would let a workflow auto-start).
 * - `hooks.tokenBudget.checkpointTokens` is bounded (50000..20000000) so a checkpoint cannot
 *   fire on every step or never fire.
 * - Help Mode (`project-config-help.cjs --search=<term>`) lists each switch, because its text is
 *   generated from the schema descriptions.
 *
 * Portable: validation runs in-process on literal fixtures; child processes run from a temp dir
 * with CK_* switches removed and HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at it. The only read of
 * this repository's own config is the guarded self-check (framework-repo signal, synchronous).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { assertTrue, assertFalse, assertContains, assertEqual } = require('../lib/assertions.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const SCHEMA_PATH = path.join(HOOKS_DIR, 'lib', 'project-config-schema.cjs');
const HELP_SCRIPT = path.join(REPO_ROOT, '.claude', 'skills', 'project-config', 'scripts', 'project-config-help.cjs');
const schema = require(SCHEMA_PATH);

// Self-check guard: the shared synchronous CJS guard (an async guard in a CJS suite reports a false
// pass). Its parity with framework-repo.helper.mjs is the content-presence tripwire.
const frameworkRepoGuard = require('../lib/framework-repo-guard.cjs');
function readJsonOrNull(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
const REPO_CONFIG_PATH = frameworkRepoGuard.projectConfigPath(REPO_ROOT);
const IS_FRAMEWORK_REPO = frameworkRepoGuard.isFrameworkRepo(REPO_ROOT);

const base = extra => ({ project: { name: 'fixture-project' }, ...extra });
const errorsFor = config => schema.validateConfig(config).errors;
const onlyErrorFor = (config, key) => {
    const errors = errorsFor(config);
    const hits = errors.filter(e => e.startsWith(key));
    assertEqual(hits.length, 1, `exactly one error for ${key}; got ${JSON.stringify(errors)}`);
    return hits[0];
};

// A clean child environment rooted in a temp dir: no inherited CK_* switch, no real home/temp.
function isolatedEnv(dir) {
    const overrides = {
        HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir,
        CLAUDE_PROJECT_DIR: dir
    };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    return childEnv(overrides);
}

function withTemp(fn) {
    const dir = createTempDir('ck-config-keys-');
    try {
        return fn(dir);
    } finally {
        cleanupTempDir(dir);
    }
}

async function withTempAsync(fn) {
    const dir = createTempDir('ck-config-keys-');
    try {
        return await fn(dir);
    } finally {
        cleanupTempDir(dir);
    }
}

// Run `node <args>` without blocking, resolving { status, stdout, stderr }; a timeout kills the child.
function runNode(args, { cwd, env, timeout }) {
    return new Promise(resolve => {
        const child = spawn(process.execPath, args, { cwd, env, windowsHide: true });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
        child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
        const timer = setTimeout(() => child.kill(), timeout);
        child.on('close', status => { clearTimeout(timer); resolve({ status, stdout, stderr }); });
        child.on('error', error => { clearTimeout(timer); resolve({ status: null, stdout, stderr: String(error) }); });
    });
}

module.exports = {
    name: 'project-config-refactor-keys',
    tests: [
        {
            name: '[project-config-refactor-keys] TC-WFR-008 unknown default activation tier names the key and the allowed tiers',
            fn: () => {
                // Given a config whose default tier is not a tier
                const config = base({ portability: { workflowActivation: { default: 'sometimes' } } });
                // When validated
                const result = schema.validateConfig(config);
                // Then it is invalid and the error names the key, the allowed tiers and the bad value
                assertFalse(result.valid, 'unknown tier must be rejected');
                const error = onlyErrorFor(config, 'portability.workflowActivation.default');
                assertContains(error, 'auto|confirm|manual');
                assertContains(error, '"sometimes"');
            }
        },
        {
            name: '[project-config-refactor-keys] TC-WFR-008 validate CLI exits 1 and prints the tier error',
            fn: () => withTemp(dir => {
                // Given the same invalid config written to a temp project file
                const file = path.join(dir, 'project-config.json');
                fs.writeFileSync(file, JSON.stringify(base({ portability: { workflowActivation: { default: 'sometimes' } } })), 'utf8');
                // When the schema CLI validates it in an isolated environment
                const run = spawnSync(process.execPath, [SCHEMA_PATH, '--validate', file], {
                    cwd: dir, env: isolatedEnv(dir), encoding: 'utf8', timeout: 20000
                });
                // Then the process fails and reports the key and the allowed tiers
                assertEqual(run.status, 1, `exit status (stderr: ${run.stderr})`);
                assertContains(run.stdout, 'Schema validation: FAILED');
                assertContains(run.stdout, 'portability.workflowActivation.default: expected one of auto|confirm|manual');
            })
        },
        {
            name: '[project-config-refactor-keys] workflowActivation accepts every tier and rejects an unknown override tier',
            fn: () => {
                // Given each valid tier as default and as a per-workflow override
                for (const tier of ['auto', 'confirm', 'manual']) {
                    const config = base({ portability: { workflowActivation: { default: tier, overrides: { 'workflow-a': tier } } } });
                    // When validated / Then no error
                    assertEqual(errorsFor(config).length, 0, `tier ${tier}: ${JSON.stringify(errorsFor(config))}`);
                }
                // Given an override with an unknown tier and one with a non-string tier
                const bad = base({ portability: { workflowActivation: { overrides: { 'workflow-a': 'later', 'workflow-b': true } } } });
                // When validated
                const errors = errorsFor(bad);
                // Then each bad entry is named with the allowed tiers
                assertEqual(errors.length, 2, JSON.stringify(errors));
                assertContains(errors.join('\n'), 'portability.workflowActivation.overrides.workflow-a: expected one of auto|confirm|manual, got "later"');
                assertContains(errors.join('\n'), 'portability.workflowActivation.overrides.workflow-b: expected one of auto|confirm|manual, got boolean');
                // And a non-map overrides value is a structural error
                assertTrue(errorsFor(base({ portability: { workflowActivation: { overrides: ['confirm'] } } }))
                    .some(e => e.startsWith('portability.workflowActivation.overrides: expected map')));
            }
        },
        {
            name: '[project-config-refactor-keys] TC-ADS-014 checkpointTokens outside 50000..20000000 is rejected',
            fn: () => {
                // Given checkpointTokens far below the floor
                const config = base({ hooks: { tokenBudget: { checkpointTokens: 10 } } });
                // When validated
                const error = onlyErrorFor(config, 'hooks.tokenBudget.checkpointTokens');
                // Then the error names the key and the range
                assertContains(error, 'expected an integer from 50000 through 20000000');
                assertContains(error, 'got 10');
                // And the bounds are inclusive; just outside and fractional values are rejected
                for (const ok of [50000, 500000, 20000000]) {
                    assertEqual(errorsFor(base({ hooks: { tokenBudget: { enabled: true, checkpointTokens: ok } } })).length, 0, `value ${ok}`);
                }
                for (const out of [49999, 20000001, 500000.5]) {
                    onlyErrorFor(base({ hooks: { tokenBudget: { checkpointTokens: out } } }), 'hooks.tokenBudget.checkpointTokens');
                }
                // And a non-number is a structural error, not silently coerced
                assertContains(onlyErrorFor(base({ hooks: { tokenBudget: { checkpointTokens: '500000' } } }), 'hooks.tokenBudget.checkpointTokens'), 'expected number');
                assertContains(onlyErrorFor(base({ hooks: { tokenBudget: { enabled: 'yes' } } }), 'hooks.tokenBudget.enabled'), 'expected boolean');
            }
        },
        {
            name: '[project-config-refactor-keys] contextGroups[].on accepts read|edit|both and names the group on a bad trigger',
            fn: () => {
                const group = on => ({ name: 'docs-group', pathRegexes: ['\\.md$'], on });
                // Given each allowed trigger
                for (const on of ['read', 'edit', 'both']) {
                    const result = schema.validateConfig(base({ contextGroups: [group(on)] }));
                    // When validated / Then no error and no unknown-field warning for `on`
                    assertEqual(result.errors.length, 0, `on=${on}: ${JSON.stringify(result.errors)}`);
                    assertFalse(result.warnings.some(w => w.includes('.on:')), `on=${on} must be a known field`);
                }
                // Given an unknown trigger
                const error = onlyErrorFor(base({ contextGroups: [group('always')] }), 'contextGroups[0]');
                // Then the error names the group, the key and the allowed triggers
                assertContains(error, 'contextGroups[0] ("docs-group").on');
                assertContains(error, 'read|edit|both');
            }
        },
        {
            name: '[project-config-refactor-keys] hooks.codeGraph.enabled accepts auto|on|off only',
            fn: () => {
                for (const mode of ['auto', 'on', 'off']) {
                    assertEqual(errorsFor(base({ hooks: { codeGraph: { enabled: mode } } })).length, 0, `mode ${mode}`);
                }
                assertContains(onlyErrorFor(base({ hooks: { codeGraph: { enabled: 'yes' } } }), 'hooks.codeGraph.enabled'), 'auto|on|off');
                assertContains(onlyErrorFor(base({ hooks: { codeGraph: { enabled: true } } }), 'hooks.codeGraph.enabled'), 'expected string');
            }
        },
        {
            name: '[project-config-refactor-keys] commit.fixOriginTrailer is an optional boolean section',
            fn: () => {
                assertEqual(errorsFor(base({ commit: { fixOriginTrailer: true } })).length, 0);
                assertEqual(errorsFor(base({ commit: { fixOriginTrailer: false } })).length, 0);
                assertContains(onlyErrorFor(base({ commit: { fixOriginTrailer: 'true' } }), 'commit.fixOriginTrailer'), 'expected boolean');
                // `commit` must not be a known-but-unlisted top-level key, and must never become required
                const result = schema.validateConfig(base({ commit: {} }));
                assertFalse(result.warnings.some(w => w.startsWith('commit:')), 'commit is a schema section');
                assertFalse(schema.getRequiredSections().includes('commit'), 'commit stays optional');
            }
        },
        {
            name: '[project-config-refactor-keys] pullRequest.targetBranch is an optional string section',
            fn: () => {
                assertEqual(errorsFor(base({ pullRequest: { targetBranch: 'develop' } })).length, 0);
                assertEqual(errorsFor(base({ pullRequest: {} })).length, 0);
                assertContains(onlyErrorFor(base({ pullRequest: { targetBranch: 42 } }), 'pullRequest.targetBranch'), 'expected string');
                // An empty or whitespace-only base branch is rejected instead of reaching the skill as a branch name
                for (const blank of ['', '   ']) {
                    assertContains(onlyErrorFor(base({ pullRequest: { targetBranch: blank } }), 'pullRequest.targetBranch'), 'non-empty branch name');
                }
                // `pullRequest` must not be a known-but-unlisted top-level key, and must never become required
                const result = schema.validateConfig(base({ pullRequest: {} }));
                assertFalse(result.warnings.some(w => w.startsWith('pullRequest:')), 'pullRequest is a schema section');
                assertFalse(schema.getRequiredSections().includes('pullRequest'), 'pullRequest stays optional');
            }
        },
        {
            name: '[project-config-refactor-keys] pullRequest.pushedBranchUpdate accepts merge|rebase only, so a typo cannot silently opt into rewriting pushed history',
            fn: () => {
                for (const mode of ['merge', 'rebase']) {
                    assertEqual(errorsFor(base({ pullRequest: { pushedBranchUpdate: mode } })).length, 0, `mode ${mode}`);
                }
                // Omitted keeps the merge default for every adopter
                assertEqual(errorsFor(base({ pullRequest: { targetBranch: 'main' } })).length, 0);
                for (const wrong of ['force', 'Rebase', 'squash']) {
                    assertContains(onlyErrorFor(base({ pullRequest: { pushedBranchUpdate: wrong } }), 'pullRequest.pushedBranchUpdate'), 'merge|rebase');
                }
                assertContains(onlyErrorFor(base({ pullRequest: { pushedBranchUpdate: true } }), 'pullRequest.pushedBranchUpdate'), 'expected string');
            }
        },
        {
            name: '[project-config-refactor-keys] schema regression: a config omitting every new key validates with no errors',
            fn: () => {
                // Given a representative config that declares the neighbouring sections but none of the new keys
                const config = base({
                    contextGroups: [{ name: 'code', pathRegexes: ['\\.cjs$'], priority: 500, rules: ['r1'] }],
                    conventionInjection: { enabled: true, maxChars: 4000 },
                    portability: { workflowAutoDetect: true, inlinePathRules: true },
                    hooks: { startupInstall: { enabled: true, packageManager: 'auto' }, windowsGit: { autoRepair: false } }
                });
                // When validated
                const result = schema.validateConfig(config);
                // Then it is valid with no warning about any new key
                assertEqual(result.errors.length, 0, JSON.stringify(result.errors));
                assertFalse(result.warnings.some(w => /workflowActivation|codeGraph|tokenBudget|fixOriginTrailer|commit|pullRequest|\.on\b/.test(w)), JSON.stringify(result.warnings));
                // And the minimum document stays valid
                assertTrue(schema.validateConfig(base({})).valid, 'minimum config');
            }
        },
        {
            name: '[project-config-refactor-keys] schema regression: this framework repo\'s own config still validates',
            skip: IS_FRAMEWORK_REPO ? false : 'self-check applies only in the framework repo (framework-repo signal)',
            fn: () => {
                // Given the authoring repo's current config / When validated / Then no errors
                const config = readJsonOrNull(REPO_CONFIG_PATH);
                assertTrue(config !== null, `${REPO_CONFIG_PATH} parses`);
                const result = schema.validateConfig(config);
                assertEqual(result.errors.length, 0, JSON.stringify(result.errors));
            }
        },
        {
            name: '[project-config-refactor-keys] Help Mode --search lists every new key from its schema description',
            fn: () => withTempAsync(async dir => {
                // Given the help script / When searched for each new key (searches run concurrently)
                const cases = [
                    ['workflowActivation', ['portability.workflowActivation', 'portability.workflowActivation.default', 'portability.workflowActivation.overrides']],
                    ['codeGraph', ['hooks.codeGraph', 'hooks.codeGraph.enabled']],
                    ['tokenBudget', ['hooks.tokenBudget', 'hooks.tokenBudget.enabled', 'hooks.tokenBudget.checkpointTokens']],
                    ['fixOriginTrailer', ['commit.fixOriginTrailer']],
                    ['targetBranch', ['pullRequest.targetBranch']],
                    ['pushedBranchUpdate', ['pullRequest.pushedBranchUpdate']],
                    ['read | edit | both', ['contextGroups']]
                ];
                const env = isolatedEnv(dir);
                const runs = await Promise.all(cases.map(([term]) =>
                    runNode([HELP_SCRIPT, `--search=${term}`], { cwd: dir, env, timeout: 60000 })));
                cases.forEach(([term, keys], index) => {
                    const run = runs[index];
                    assertEqual(run.status, 0, `--search=${term} exit (stderr: ${run.stderr})`);
                    const options = run.stdout.split(/\n\s*\n?Reference docs/)[0];
                    // Then each key is listed with a non-empty description
                    for (const key of keys) {
                        const line = options.split(/\r?\n/).find(l => l.trim().split(/\s+/)[0] === key);
                        assertTrue(Boolean(line), `--search=${term} lists ${key}\n${options}`);
                        assertTrue(line.trim().length > key.length + 10, `${key} carries a description`);
                    }
                });
            })
        }
    ]
};
