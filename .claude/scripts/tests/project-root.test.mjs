import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { resolveProjectRoot, resolveMutationProjectRoot, isInvokedAsScript } = require('../lib/project-root.cjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const writers = [
    '.claude/scripts/codex/sync-hooks.mjs',
    '.claude/scripts/codex/migrate-claude-to-codex.mjs',
    '.claude/scripts/codex/sync-context-workflows.mjs',
    '.claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs',
    '.claude/skills/tech-spec/scripts/generate-tech-specs.mjs',
];

function fixture(fn) {
    // Resolve the OS temp root (macOS: /var -> /private/var) so lexical and module-derived roots share one spelling.
    const dir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'ck-root-test-')));
    try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

function cleanEnv(override) {
    const env = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    return { ...env, ...override };
}

test('mutation root rejects invalid explicit targets while read-only metadata remains available', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    for (const explicit of ['other-project', path.join(dir, 'missing')]) {
        const options = { cwd: dir, env: { CLAUDE_PROJECT_DIR: explicit } };
        assert.match(resolveProjectRoot(options).error, /CLAUDE_PROJECT_DIR/);
        assert.throws(() => resolveMutationProjectRoot(options), /CLAUDE_PROJECT_DIR/);
    }
    assert.equal(resolveMutationProjectRoot({ cwd: dir, env: {} }).rootDir, dir);
    assert.equal(resolveMutationProjectRoot({ cwd: os.tmpdir(), env: { CLAUDE_PROJECT_DIR: dir } }).rootDir, dir);
    const bootstrap = path.join(dir, 'bootstrap');
    fs.mkdirSync(bootstrap);
    const options = { cwd: dir, env: { CLAUDE_PROJECT_DIR: bootstrap } };
    assert.throws(() => resolveMutationProjectRoot(options), /CLAUDE_PROJECT_DIR/);
    assert.equal(resolveMutationProjectRoot({ ...options, allowUnmarkedRoot: true }).rootDir, bootstrap);
}));

// Invariant: rejected explicit targets must stop before ANY writer is called.
// Instrument both fs interfaces in the child; a write attempt fails independently
// of whether later source/config checks would also have rejected this fixture.
for (const writer of writers) {
    test(`${writer}: invalid target causes no output attempt`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        for (const explicit of ['other-project', path.join(dir, 'missing')]) {
            const code = `
                const fs = require('node:fs');
                for (const name of ['mkdirSync', 'writeFileSync', 'appendFileSync', 'renameSync', 'copyFileSync', 'rmSync', 'unlinkSync']) {
                    fs[name] = () => { throw new Error('WRITE_ATTEMPT:' + name); };
                }
                for (const name of ['mkdir', 'writeFile', 'appendFile', 'rename', 'copyFile', 'rm', 'unlink']) {
                    fs.promises[name] = async () => { throw new Error('WRITE_ATTEMPT:' + name); };
                }
                require('node:module').syncBuiltinESMExports();
                import(${JSON.stringify(pathToFileURL(path.join(root, writer)).href)}).catch(error => {
                    console.error(error.message); process.exitCode = 1;
                });
            `;
            const result = spawnSync(process.execPath, ['-e', code], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 1, result.stderr);
            assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
            assert.doesNotMatch(result.stderr, /WRITE_ATTEMPT/);
            assert.deepEqual(fs.readdirSync(dir), ['.claude']);
        }
    }));
}

test('compact generator fallback rejects invalid explicit targets too', () => fixture(dir => {
    const code = `
        const Module = require('node:module');
        const original = Module._load;
        Module._load = function (name, ...args) {
            if (name === '../../../scripts/lib/project-root.cjs') {
                const error = new Error('missing compact dependency'); error.code = 'MODULE_NOT_FOUND'; throw error;
            }
            return original.call(this, name, ...args);
        };
        require(${JSON.stringify(path.join(root, writers[3]))});
    `;
    for (const explicit of ['other-project', path.join(dir, 'missing')]) {
        const result = spawnSync(process.execPath, ['-e', code], {
            cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
        assert.deepEqual(fs.readdirSync(dir), []);
    }
}));

test('hook config and state roots agree with script fallback and explicit/nested controls', () => fixture(dir => {
    const bundle = path.join(dir, 'bundle');
    // OS-temp may live beneath a user's global .claude; the filesystem root
    // has no such ancestor and exercises the actual script-fallback branch.
    const outside = path.parse(dir).root;
    assert.equal(resolveProjectRoot({ cwd: outside, env: {} }).source, 'cwd-fallback');
    const nested = path.join(bundle, 'src');
    fs.mkdirSync(path.join(bundle, '.claude', 'hooks'), { recursive: true });
    fs.mkdirSync(nested);
    fs.cpSync(path.join(root, '.claude', 'hooks', 'lib'), path.join(bundle, '.claude', 'hooks', 'lib'), { recursive: true });
    const lib = path.join(bundle, '.claude', 'hooks', 'lib');
    const code = `
        const resolver = require(${JSON.stringify(path.join(lib, 'project-root.cjs'))});
        const loader = require(${JSON.stringify(path.join(lib, 'project-config-loader.cjs'))});
        const paths = require(${JSON.stringify(path.join(lib, 'ck-paths.cjs'))});
        console.log(JSON.stringify({
            root: resolver.resolveProjectRoot({ scriptPath: ${JSON.stringify(path.join(lib, 'project-root.cjs'))} }).rootDir,
            config: loader.getConfiguredProjectConfigPath(), state: paths.PROJECT_TMP_DIR
        }));
    `;
    for (const [cwd, env] of [[outside, {}], [nested, {}], [outside, { CLAUDE_PROJECT_DIR: bundle }]]) {
        const result = spawnSync(process.execPath, ['-e', code], { cwd, env: cleanEnv(env), encoding: 'utf8', timeout: 15000 });
        assert.equal(result.status, 0, result.stderr);
        assert.deepEqual(JSON.parse(result.stdout), {
            root: bundle, config: path.join(bundle, 'docs', 'project-config.json'), state: path.join(bundle, 'tmp', 'claude-temp'),
        });
    }
}));

test('sync-hooks writes only the valid explicit or discovered target', () => fixture(dir => {
    const bundle = path.join(dir, 'bundle');
    const nested = path.join(bundle, 'src');
    fs.mkdirSync(path.join(bundle, '.claude'), { recursive: true });
    fs.mkdirSync(nested);
    fs.writeFileSync(path.join(bundle, '.claude', 'settings.json'), JSON.stringify({ hooks: {} }));
    for (const [cwd, env] of [[dir, { CLAUDE_PROJECT_DIR: bundle }], [nested, {}]]) {
        const result = spawnSync(process.execPath, [path.join(root, writers[0])], { cwd, env: cleanEnv(env), encoding: 'utf8', timeout: 15000 });
        assert.equal(result.status, 0, result.stderr);
        assert.ok(fs.existsSync(path.join(bundle, '.codex', 'hooks.json')));
        assert.equal(fs.existsSync(path.join(cwd, '.codex')), false);
    }
}));

// R2-09: a rejected explicit root never grants lifecycle mutation authority.
//
// This used to loop over a second lifecycle mutator as well, built on the shared `resolveProjectRoot`
// owner. That duplicate owner is deleted: startup dependency installation now belongs
// to `verify-install.cjs`, which is the install-integrity owner and therefore carries its own
// dependency-free root bootstrap — it must be able to diagnose a partial copy that is MISSING
// `lib/project-root.cjs`, so it cannot import the resolver this file covers. Its root-boundary
// contract (bootstrap precedence, and which roots may reach the guarded install owner at all) is
// owned by `.claude/scripts/tests/install-bootstrap.test.cjs`. Do not re-point this case at it.
for (const hook of ['session-end.cjs']) {
    test(`${hook}: invalid roots skip every mutation; valid roots retain work`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        const code = `
            const Module = require('node:module');
            const original = Module._load;
            const calls = [];
            const record = name => (...args) => { calls.push([name, ...args]); return 0; };
            Module._load = function(name, ...args) {
                if (name === 'child_process') return { execSync: record('shell') };
                if (name === './lib/hook-runner.cjs') return { runHookSync: (_, handler) => handler({ reason: 'exit', session_id: 'synthetic-session', cwd: process.cwd() }) };
                if (name === './lib/debug-log.cjs') return { debug: () => {} };
                if (name === './lib/temp-file-cleanup.cjs') return { cleanupAll: record('cleanup') };
                if (name === './lib/swap-engine.cjs') return { cleanupSwapFiles: record('old-swaps'), deleteSessionSwap: record('delete-swap') };
                if (name === './lib/ck-paths.cjs') return { getSnapshotPath: () => ${JSON.stringify(path.join(dir, 'absent-snapshot'))} };
                if (name === './lib/git-operation-lease.cjs') return { canonicalDirectory: value => value, revokeSessionLeases: record('revoke') };
                return original.call(this, name, ...args);
            };
            require(${JSON.stringify(path.join(root, '.claude/hooks', hook))});
            console.log(JSON.stringify(calls));
        `;
        for (const explicit of ['other-project', path.join(dir, 'missing'), dir, '']) {
            const result = spawnSync(process.execPath, ['-e', code], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 0, result.stderr);
            const calls = JSON.parse(result.stdout);
            if (explicit && explicit !== dir) assert.deepEqual(calls, [], explicit);
            else {
                assert.deepEqual(calls.map(call => call[0]), ['revoke', 'cleanup', 'delete-swap']);
                assert.equal(calls[0][1].projectDir, dir);
                assert.equal(calls[1][1], dir);
            }
        }
    }));
}

for (const standalone of [false, true]) {
    test(`skill validator ${standalone ? 'standalone' : 'shared'}: reject invalid --fix roots without writes`, () => fixture(dir => {
        const script = standalone ? path.join(dir, 'validate-skills.cjs') : path.join(root, '.claude/skills/skill-creator/scripts/validate-skills.cjs');
        if (standalone) fs.copyFileSync(path.join(root, '.claude/skills/skill-creator/scripts/validate-skills.cjs'), script);
        const skillDir = path.join(dir, '.claude/skills/example');
        fs.mkdirSync(skillDir, { recursive: true });
        const skill = path.join(skillDir, 'SKILL.md');
        const original = '---\nname: example\ndescription: "[Test] fixture"\ntools: Read\n---\n## Quick Summary\nFixture.\n';
        fs.writeFileSync(skill, original);
        for (const explicit of ['other-project', path.join(dir, 'missing')]) {
            const result = spawnSync(process.execPath, [script, '--fix'], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(fs.readFileSync(skill, 'utf8'), original, explicit);
            assert.equal(result.status, 2, result.stderr);
            assert.match(result.stderr, /CLAUDE_PROJECT_DIR/);
        }
        const readOnly = spawnSync(process.execPath, [script], {
            cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: 'other-project' }), encoding: 'utf8', timeout: 15000,
        });
        assert.equal(readOnly.status, 0, readOnly.stderr);
        assert.equal(fs.readFileSync(skill, 'utf8'), original);
        const valid = spawnSync(process.execPath, [script, '--fix'], {
            cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: dir }), encoding: 'utf8', timeout: 15000,
        });
        assert.equal(valid.status, 0, valid.stderr);
        assert.equal(fs.readFileSync(skill, 'utf8'), original.replace('tools:', 'allowed-tools:'));
    }));
}

test('SessionEnd real runner cannot mutate files for rejected explicit roots', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    const code = `
        const fs = require('node:fs');
        const calls = [];
        for (const name of ['mkdirSync', 'writeFileSync', 'appendFileSync', 'renameSync', 'copyFileSync', 'rmSync', 'unlinkSync', 'rmdirSync']) {
            fs[name] = () => { calls.push(name); throw new Error('WRITE_ATTEMPT:' + name); };
        }
        process.on('exit', () => console.log(JSON.stringify(calls)));
        require(${JSON.stringify(path.join(root, '.claude/hooks/session-end.cjs'))});
    `;
    for (const explicit of ['other-project', path.join(dir, 'missing')]) {
        for (const reason of ['exit', 'clear', 'compact']) {
            const result = spawnSync(process.execPath, ['-e', code], {
                cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit, CLAUDE_HOOK_DEBUG: '0' }),
                input: JSON.stringify({ reason, session_id: 'synthetic-root-session', cwd: dir }),
                encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 0, result.stderr);
            assert.deepEqual(JSON.parse(result.stdout), [], `${explicit}: ${reason}`);
        }
    }
}));

test('standalone validator can fix an explicitly selected existing unmarked directory', () => fixture(dir => {
    const script = path.join(dir, 'validate-skills.cjs');
    fs.copyFileSync(path.join(root, '.claude/skills/skill-creator/scripts/validate-skills.cjs'), script);
    const skill = path.join(dir, 'SKILL.md');
    fs.writeFileSync(skill, '---\nname: fixture\ndescription: "[Test] fixture"\ntools: Read\n---\n## Quick Summary\nFixture.\n');
    const result = spawnSync(process.execPath, [script, '--fix', '--path', '.'], {
        cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: dir }), encoding: 'utf8', timeout: 15000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(fs.readFileSync(skill, 'utf8'), /^allowed-tools: Read$/m);
    assert.equal(fs.existsSync(path.join(dir, '.claude')), false);
}));

// R3-R02: execute actual entrypoints, replacing effects only. The invalid case
// must not reach an effect; valid controls prove the fixture reaches real work.
for (const hook of ['init-prompt-gate.cjs', 'session-init.cjs', 'session-init-docs.cjs']) {
    test(`${hook}: rejected roots preserve all files and processes`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        fs.mkdirSync(path.join(dir, 'src'));
        fs.mkdirSync(path.join(dir, 'docs'));
        fs.writeFileSync(
            path.join(dir, 'docs', 'project-config.json'),
            JSON.stringify({ project: { name: 'Root Guard Fixture' } })
        );
        const script = path.join(root, '.claude/hooks', hook);
        const code = `
            const fs = require('node:fs'), Module = require('node:module');
            const calls = [], original = Module._load;
            if (process.argv[1] === 'mutant') {
                const compile = Module._extensions['.cjs'] || Module._extensions['.js'];
                Module._extensions['.cjs'] = function(mod, filename) {
                    if (filename !== ${JSON.stringify(script)}) return compile(mod, filename);
                    const source = fs.readFileSync(filename, 'utf8');
                    if (source.split('if (rootResolution.error) {').length !== 2) throw Error('mutation anchor missing');
                    mod._compile(source.replace('if (rootResolution.error) {', 'if (false) {'), filename);
                };
            }
            for (const name of ['mkdirSync','writeFileSync','appendFileSync','renameSync','copyFileSync','rmSync','unlinkSync','rmdirSync']) {
                fs[name] = (...args) => { calls.push([name, String(args[0])]); };
            }
            Module._load = function(name, ...args) {
                if (name === './lib/temp-file-cleanup.cjs') return { cleanupAll: target => calls.push(['cleanup', target]) };
                if (name === 'child_process') return {
                    execSync: () => { calls.push(['execSync']); return ''; },
                    execFileSync: () => { calls.push(['execFileSync']); return ''; }
                };
                return original.call(this, name, ...args);
            };
            process.on('exit', () => console.log('ROOT_EFFECTS:' + JSON.stringify(calls)));
            process.argv[1] = ${JSON.stringify(script)};
            Module.runMain(${JSON.stringify(script)});
        `;
        for (const [explicit, mutant] of [['relative-root', false], [path.join(dir, 'missing'), false], [dir, false], ['', false], ['relative-root', true]]) {
            const result = spawnSync(process.execPath, ['-e', code, mutant ? 'mutant' : 'control'], {
                cwd: explicit === dir || explicit === '' ? path.join(dir, 'src') : dir,
                env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit, CLAUDE_HOOK_DEBUG: '0', CLAUDE_ENV_FILE: path.join(dir, 'session.env') }),
                input: JSON.stringify({ prompt: hook === 'init-prompt-gate.cjs' ? 'skip graph' : 'skip init', session_id: 'root-fixture', source: 'startup' }), encoding: 'utf8', timeout: 15000,
            });
            assert.equal(result.status, 0, result.stderr);
            const calls = JSON.parse(result.stdout.match(/ROOT_EFFECTS:(.*)/)?.[1] || 'null');
            if (mutant) {
                assert.doesNotMatch(result.stderr, /CLAUDE_PROJECT_DIR/);
                if (hook === 'init-prompt-gate.cjs') {
                    assert.match(result.stdout, /Graph build skipped/, 'deleting the root guard must reach prompt handling');
                } else {
                    assert.ok(calls.length > 0, 'main guard deletion must reach effects');
                }
            } else if (explicit && explicit !== dir) {
                const diagnostic = hook === 'init-prompt-gate.cjs' ? result.stdout : result.stderr;
                assert.match(diagnostic, /CLAUDE_PROJECT_DIR/);
                if (hook === 'init-prompt-gate.cjs') {
                    assert.doesNotMatch(result.stdout, /"decision":"block"/, 'root-resolution errors must report and allow');
                }
                assert.deepEqual(calls, [], explicit);
            } else {
                assert.doesNotMatch(result.stderr, /CLAUDE_PROJECT_DIR/);
                if (hook === 'session-init.cjs') {
                    assert.ok(calls.some(call => call[0] === 'cleanup' && call[1] === dir), JSON.stringify(calls));
                } else if (hook === 'init-prompt-gate.cjs') {
                    assert.ok(calls.some(call => call[0] === 'writeFileSync' && call[1] === path.join(dir, 'tmp/claude-temp/.graph-dismissed')), JSON.stringify(calls));
                } else {
                    const referenceRoot = path.join(dir, 'docs', 'project-reference');
                    assert.ok(calls.some(call => call[0] === 'writeFileSync' && call[1].startsWith(referenceRoot)), JSON.stringify(calls));
                }
            }
            assert.deepEqual(fs.readdirSync(dir).sort(), ['.claude', 'docs', 'src']);
        }
    }));
}

test('graph root rejection blocks every side-effect owner with valid controls', () => fixture(dir => {
    fs.mkdirSync(path.join(dir, '.claude'));
    const code = `
        const fs = require('node:fs'), Module = require('node:module');
        const calls = [], original = Module._load;
        for (const name of ['mkdirSync','writeFileSync','rmdirSync']) fs[name] = (...args) => calls.push([name, String(args[0])]);
        const stat = fs.statSync;
        fs.statSync = target => String(target).endsWith('.claude') ? stat(target) : ({ isDirectory: () => true, mtimeMs: 0 });
        fs.existsSync = () => true;
        Module._load = function(name, ...args) {
            if (name === './debug-log.cjs') return { debug() {}, debugError() {} };
            if (name === 'child_process') return { execFileSync: (bin, args) => {
                calls.push(['exec', bin, args]); return args.includes('--version') ? 'Python 3.12.0' : '{}';
            } };
            return original.call(this, name, ...args);
        };
        const graph = require(${JSON.stringify(path.join(root, '.claude/hooks/lib/graph-utils.cjs'))});
        const result = { python: graph.findPython(), deps: graph.ensurePythonDeps(), recent: graph.wasRecentlyUpdated(), lock: graph.acquireUpdateLock(), invoke: graph.invokeGraph('sync') };
        graph.releaseUpdateLock(); graph.writeLastSeenHead('fixture-head');
        console.log(JSON.stringify({ result, calls }));
    `;
    for (const explicit of ['relative-root', path.join(dir, 'missing'), dir, '']) {
        const child = spawnSync(process.execPath, ['-e', code], { cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000 });
        assert.equal(child.status, 0, child.stderr);
        const { result, calls } = JSON.parse(child.stdout);
        if (explicit && explicit !== dir) {
            assert.equal(result.python, null);
            assert.equal(result.deps.ok, false);
            assert.match(result.deps.message, /CLAUDE_PROJECT_DIR/);
            assert.equal(result.recent, true);
            assert.equal(result.lock, false);
            assert.equal(result.invoke, null);
            assert.deepEqual(calls, []);
        } else {
            assert.equal(result.deps.ok, true);
            assert.equal(result.recent, false);
            assert.equal(result.lock, true);
            assert.deepEqual(result.invoke, {});
            assert.ok(calls.some(call => call[0] === 'writeFileSync' && call[1] === path.join(dir, '.code-graph/.last-seen-head')));
            assert.ok(calls.some(call => call[0] === 'mkdirSync' && call[1] === path.join(dir, '.code-graph/.update-lock')));
        }
    }
}));

for (const hook of ['graph-session-init.cjs', 'graph-prompt-sync.cjs', 'graph-auto-update.cjs']) {
    test(`${hook}: real graph consumer rejects mutation roots and keeps valid work`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        const script = path.join(root, '.claude/hooks', hook);
        const code = `
            const fs = require('node:fs'), Module = require('node:module');
            const calls = [], original = Module._load, stat = fs.statSync;
            fs.statSync = target => String(target).endsWith('.claude') ? stat(target) : ({ mtimeMs: 0 });
            fs.existsSync = () => true;
            for (const name of ['mkdirSync','writeFileSync','rmdirSync']) fs[name] = (...args) => calls.push([name, String(args[0])]);
            Module._load = function(name, ...args) {
                if (name.endsWith('/hook-runner.cjs')) return { ...original.call(this, name, ...args), runHook: (_, action) => action() };
                if (name.endsWith('/debug-log.cjs')) return { debug() {}, debugError() {} };
                if (name.endsWith('/project-config-loader.cjs')) return { isConfigPopulated: () => true, loadProjectConfig: () => ({}) };
                if (name === 'child_process') return { execFileSync: (bin, argv, options) => {
                    calls.push(['exec', bin, argv, options.cwd]);
                    return bin === 'git' ? 'fixture-head' : argv.includes('--version') ? 'Python 3.12.0' : '{}';
                } };
                return original.call(this, name, ...args);
            };
            process.on('exit', () => console.log(JSON.stringify(calls)));
            require(${JSON.stringify(script)});
        `;
        for (const explicit of ['relative-root', path.join(dir, 'missing'), dir, '']) {
            const child = spawnSync(process.execPath, ['-e', code], { cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit }), encoding: 'utf8', timeout: 15000 });
            assert.equal(child.status, 0, child.stderr);
            const calls = JSON.parse(child.stdout);
            if (explicit && explicit !== dir) assert.deepEqual(calls.filter(call => !(call[0] === 'exec' && call[1] === 'git')), []);
            else assert.ok(calls.some(call => call[0] === 'exec' && call[2].includes(hook === 'graph-auto-update.cjs' ? 'update' : 'sync') && call[3] === dir), JSON.stringify(calls));
        }
    }));
}

// The exported APIs can be called without main(). Kill one guard deletion at a
// time in memory; never alter the checkout or allow an observed effect to run.
const guardedApis = [
    ['init-prompt-gate.cjs', 'writeDismissFlag', '', 'return;'],
    ['init-prompt-gate.cjs', 'writeScanDismissFlag', '', 'return;'],
    ['init-prompt-gate.cjs', 'writeGraphDismissFlag', '', 'return;'],
    ['lib/agent-files-state.cjs', 'writeAgentFilesDismissFlag', '', 'return;'],
    ['lib/session-init-helpers.cjs', 'initDesignSystemAppDocs', '', 'return [];'],
    ['lib/session-init-helpers.cjs', 'refreshScanStaleFlag', 'staleDays = 60', 'return;'],
    ['lib/graph-utils.cjs', 'findPython', '', 'return null;'],
    ['lib/graph-utils.cjs', 'ensurePythonDeps', '', 'return { ok: false, message: `[code-graph] Skipped: ${rootResolution.error}` };'],
    ['lib/graph-utils.cjs', 'wasRecentlyUpdated', '', 'return true;'],
    ['lib/graph-utils.cjs', 'acquireUpdateLock', '', 'return false;'],
    ['lib/graph-utils.cjs', 'releaseUpdateLock', '', 'return;'],
    ['lib/graph-utils.cjs', 'writeLastSeenHead', 'head', 'return;', 'fixture-head'],
];
for (const [file, method, parameters, returnStatement, argument] of guardedApis) {
    test(`${method}: standalone mutation guard has a discriminating effect oracle`, () => fixture(dir => {
        fs.mkdirSync(path.join(dir, '.claude'));
        const script = path.join(root, '.claude/hooks', file);
        const code = `
            const fs = require('node:fs'), Module = require('node:module');
            const calls = [], original = Module._load, read = fs.readFileSync, stat = fs.statSync;
            const child = new Module(${JSON.stringify(script)}); child.filename = ${JSON.stringify(script)};
            child.paths = Module._nodeModulePaths(require('node:path').dirname(child.filename));
            let source = read(child.filename, 'utf8');
            if (process.argv[1] === 'mutant') {
                const from = ${JSON.stringify(`function ${method}(${parameters}) {
    if (rootResolution.error) ${returnStatement}`)};
                if (source.replaceAll('\\r\\n','\\n').split(from).length !== 2) throw Error('mutation anchor missing');
                source = source.replaceAll('\\r\\n','\\n').replace(from, ${JSON.stringify(`function ${method}(${parameters}) {`)});
            }
            for (const name of ['mkdirSync','writeFileSync','appendFileSync','rmdirSync','unlinkSync']) fs[name] = (...args) => calls.push([name, String(args[0])]);
            fs.existsSync = target => !String(target).endsWith('fixture.md');
            fs.statSync = target => String(target).endsWith('.claude') ? stat(target) : ({ isDirectory: () => true, mtimeMs: 0 });
            Module._load = function(name, ...args) {
                if (name.endsWith('/debug-log.cjs')) return { debug() {}, debugError() {} };
                if (name.endsWith('/agent-files-state.cjs')) return {
                    getAgentFileIssues: () => ['missing'], isAgentFilesDismissed: () => false,
                    isAgentFilesDismissRequest: () => true, writeAgentFilesDismissFlag: () => calls.push(['agent-dismiss']), buildOfferMessage: () => ''
                };
                if (name.endsWith('/project-config-loader.cjs')) return {
                    loadProjectConfig: () => ({ designSystem: { appMappings: [{ docFile: 'fixture.md' }] } }),
                    getConfiguredProjectConfigPath: () => ${JSON.stringify(path.join(dir, 'docs/project-config.json'))},
                    getConfiguredDocsIndexPath: () => ${JSON.stringify(path.join(dir, 'docs/project-reference/docs-index-reference.md'))}, isConfigPopulated: () => true
                };
                if (name === 'child_process') return { execFileSync: () => { calls.push(['exec']); return 'Python 3.12.0'; } };
                return original.call(this, name, ...args);
            };
            process.on('exit', () => console.log('ROOT_EFFECTS:' + JSON.stringify(calls)));
            child._compile(source, child.filename);
            child.exports[${JSON.stringify(method)}](${JSON.stringify(argument)});
        `;
        for (const variant of ['control', 'missing', 'mutant', 'valid']) {
            const explicit = variant === 'valid' ? dir : variant === 'missing' ? path.join(dir, 'missing') : 'relative-root';
            const result = spawnSync(process.execPath, ['-e', code, variant], { cwd: dir, env: cleanEnv({ CLAUDE_PROJECT_DIR: explicit, CLAUDE_HOOK_DEBUG: '0' }), encoding: 'utf8', timeout: 15000 });
            assert.equal(result.status, 0, result.stderr);
            const calls = JSON.parse(result.stdout.match(/ROOT_EFFECTS:(.*)/)?.[1] || 'null');
            if (variant === 'control' || variant === 'missing') assert.deepEqual(calls, []);
            else assert.ok(calls.length > 0, `${method}: deletion survived`);
        }
    }));
}

// --- Script entry-point detection through symlinked paths -------------------------------------
// Intent: a framework CLI launched through ANY path that resolves to its own file runs its main.
// Node records the main module's REAL path in `import.meta.url`, while `process.argv[1]` keeps the
// path as typed. macOS's os.tmpdir() sits behind `/var -> /private/var`, so a lexical comparison
// made every copied or temp-launched script exit 0 with no output — a silent false pass.
// Directory links need no privilege on Windows (junction) or POSIX (symlink); a host that still
// refuses one skips the link-dependent cases instead of failing.
function linkedFixture(t, fn) {
    fixture(dir => {
        // Canonicalize the fixture root so the ONLY link on the launch path is the one made here.
        const base = fs.realpathSync.native(dir);
        const real = path.join(base, 'real');
        const link = path.join(base, 'link');
        fs.mkdirSync(real);
        try {
            fs.symlinkSync(real, link, process.platform === 'win32' ? 'junction' : 'dir');
        } catch (error) {
            if (['EACCES', 'EPERM', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP'].includes(error && error.code)) {
                t.skip(`directory symlink/junction creation is unavailable on ${process.platform}: ${error.code}`);
                return;
            }
            throw error;
        }
        fn({ real, link });
    });
}

test('isInvokedAsScript matches the same file through a symlink/junction and nothing else', t => linkedFixture(t, ({ real, link }) => {
    const self = path.join(real, 'entry.mjs');
    const other = path.join(real, 'other.mjs');
    fs.writeFileSync(self, '');
    fs.writeFileSync(other, '');
    assert.equal(isInvokedAsScript(path.join(link, 'entry.mjs'), self), true, 'linked launch path is the same file');
    assert.equal(isInvokedAsScript(self, self), true, 'direct launch path');
    assert.equal(isInvokedAsScript(path.relative(process.cwd(), self), self), true, 'relative argv resolves against cwd');
    assert.equal(isInvokedAsScript(path.join(link, 'other.mjs'), self), false, 'a different file never matches');
    for (const empty of [undefined, null, '']) assert.equal(isInvokedAsScript(empty, self), false, `argv[1]=${empty}`);
    // The canonical comparison must be what makes the linked case match: an identity "realpath"
    // (the pre-fix lexical comparison) must fail it.
    assert.equal(isInvokedAsScript(path.join(link, 'entry.mjs'), self, { realpath: p => p }), false);
    // Both sides are canonicalized: Windows keeps 8.3 short names in import.meta.url while argv may
    // carry the long form, so resolving only argv would still miss.
    assert.equal(isInvokedAsScript(self, path.join(link, 'entry.mjs')), true, 'linked self path is the same file');
    const short = path.resolve('/USERNA~1/entry.mjs');
    const long = path.resolve('/username.long/entry.mjs');
    const expandShortName = p => (p === short ? long : p);
    assert.equal(isInvokedAsScript(long, short, { realpath: expandShortName }), true, 'self side is canonicalized');
    assert.equal(isInvokedAsScript(short, long, { realpath: expandShortName }), true, 'argv side is canonicalized');
}));

test('isInvokedAsScript compares case-insensitively only on Windows when paths cannot be resolved', () => {
    const unresolvable = () => { throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' }); };
    const upper = path.resolve('/Missing/Dir/Entry.mjs');
    const lower = upper.toLowerCase();
    assert.equal(isInvokedAsScript(upper, lower, { platform: 'win32', realpath: unresolvable }), true);
    assert.equal(isInvokedAsScript(upper, lower, { platform: 'linux', realpath: unresolvable }), false);
});

// End-to-end: a real framework CLI copied into a temp tree and launched through a linked path must
// produce its output. Pre-fix, this exact shape printed nothing and exited 0.
test('a copied framework CLI launched through a symlinked path runs its main', t => linkedFixture(t, ({ real, link }) => {
    const files = [
        '.claude/scripts/codex/read-workflow-entry.mjs',
        '.claude/scripts/lib/workflow-manifest.cjs',
        '.claude/scripts/lib/project-root.cjs',
    ];
    for (const file of files) {
        fs.mkdirSync(path.dirname(path.join(real, file)), { recursive: true });
        fs.copyFileSync(path.join(root, file), path.join(real, file));
    }
    fs.mkdirSync(path.join(real, '.claude', 'skills', 'investigate'), { recursive: true });
    fs.writeFileSync(path.join(real, '.claude', 'skills', 'investigate', 'SKILL.md'), '# investigate\n');
    fs.writeFileSync(path.join(real, '.claude', 'workflows.json'), `${JSON.stringify({
        version: '1.0.0',
        workflows: {
            'wf-linked': {
                name: 'Linked Launch Sentinel', description: 'fixture', whenToUse: 'fixture',
                preActions: { injectContext: 'fixture context' }, sequence: ['investigate'],
            },
        },
    }, null, 2)}\n`);
    const entry = path.join(link, '.claude', 'scripts', 'codex', 'read-workflow-entry.mjs');
    const result = spawnSync(process.execPath, [entry, 'wf-linked'], { cwd: link, env: cleanEnv(), encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    assert.notEqual(result.stdout.trim(), '', 'the CLI skipped its main: entry detection missed the linked launch path');
    assert.equal(JSON.parse(result.stdout).name, 'Linked Launch Sentinel');
}));

// Structural sensor: every framework CLI gates its entry through a canonical helper
// (`isInvokedAsScript` for scripts, `isHookEntryPoint` for hooks). A hand-written equality between
// argv and the module's own path reintroduces the silent no-op on any symlinked launch path.
test('no framework source compares its own module path by equality', () => {
    // Every spelling of "my own path": each is a REAL path, so `===` against argv misses a symlinked
    // launch. Use isInvokedAsScript (scripts) or isHookEntryPoint (hooks) instead. Line-based: an
    // alias variable or a comparison split across lines is out of reach and left to review.
    const selfPath = String.raw`(?:(?:url\.)?fileURLToPath\(import\.meta\.url\)|\bimport\.meta\.(?:url|filename)\b|\b__filename\b)`;
    const ownPathEquality = new RegExp(String.raw`[!=]==?\s*${selfPath}|${selfPath}\s*[!=]==?`);
    // Framework source only: vendored dependencies and host-local dot-directories (a skill's
    // gitignored `.venv`) are not ours and would make the sensor depend on the developer's machine;
    // test code compares fixture paths on purpose and never decides whether a CLI runs its main.
    const skipDirs = new Set(['node_modules', 'tests', '__tests__']);
    const offenders = [];
    let scanned = 0;
    const walk = dir => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!skipDirs.has(entry.name) && !entry.name.startsWith('.')) walk(full);
            } else if (/\.(?:mjs|cjs|js)$/.test(entry.name)) {
                scanned++;
                fs.readFileSync(full, 'utf8').split(/\r?\n/).forEach((line, index) => {
                    if (ownPathEquality.test(line)) offenders.push(`${path.relative(root, full)}:${index + 1}: ${line.trim()}`);
                });
            }
        }
    };
    for (const area of ['scripts', 'hooks', 'skills']) walk(path.join(root, '.claude', area));
    assert.ok(scanned > 100, `sensor scanned only ${scanned} files; the walk is not reaching the framework`);
    assert.deepEqual(offenders, []);
});
