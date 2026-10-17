/**
 * Code-graph config parity — the hooks (Node) and the graph CLI (Python) read ONE graph mode.
 *
 * Guarded business rule (BR-ADS-04, TC-ADS-057): every graph command refuses in mode `off`, so no skill
 * reads a graph the (correctly off) hooks never refresh. The hooks decide the mode with `codeGraphMode`
 * over the config `project-config-loader.cjs` finds; the CLI decides it in Python. Two readers of one
 * setting must agree on BOTH where the config lives and what it means, or a project that opted out still
 * gets graph answers and a freshly created graph.db from the CLI.
 *
 * Contract pinned here, for the same fixture fed to both sides:
 * - the resolved config path is identical: `.claude/.ck.local.json` > `.claude/.ck.json` >
 *   user `~/.claude/.ck.json` (`portability.projectConfigPath`), else the default; a non-string, blank or
 *   root-escaping relative value falls back to the default, and an absolute value is kept;
 * - the verdict is identical: `off`, a value outside auto|on|off, or a non-object `codeGraph` section is
 *   off; omitted, auto and on are not; a relocated config that does not exist reads as no config (not off).
 * Each case also names its expected verdict, so a change that breaks both sides the same way still fails.
 *
 * Portable: each case builds its own temp tree (project + separate home + temp dir). Both children run with
 * HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed into it and inherited CK_*, PYTHON* and CLAUDE_PROJECT_DIR keys
 * removed; the Node child alone gets CLAUDE_PROJECT_DIR set to the fixture, because that is how hosts tell
 * the hooks their project. Python resolves through `python`, `py -3` (Windows launcher) or `python3`
 * (macOS/Linux), whichever is 3.10+.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePythonCommand: findPythonCommand } = require('../lib/python-command.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');

const HOOKS_LIB = path.resolve(__dirname, '..', '..', 'lib');
const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', '..', 'scripts');
const CLI_DIR = path.join(SCRIPTS_DIR, 'code_graph');
const OFF_MESSAGE = 'code graph is off for this project (hooks.codeGraph)';

/** Clean child env: fixture home and temp dirs, no inherited CK_*, PYTHON* or CLAUDE_PROJECT_DIR keys. */
function isolatedEnv(tree, extra = {}) {
    const overrides = { HOME: tree.home, USERPROFILE: tree.home, TMPDIR: tree.tmp, TEMP: tree.tmp, TMP: tree.tmp, CLAUDE_PROJECT_DIR: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^(CK_|PYTHON)/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, ...extra });
}

let resolvedPython;
function resolvePython(env) {
    if (resolvedPython) return resolvedPython;
    resolvedPython = findPythonCommand({ env, minMinor: 10 });
    return resolvedPython;
}

const writeJson = (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2), 'utf8');
};
const graphConfig = enabled => ({ project: { name: 'fixture-project' }, hooks: { codeGraph: { enabled } } });

/**
 * A temp tree: `<base>/project` (the project, with `.claude/`), `<base>/home` (user home) and `<base>/tmp`.
 * The base is canonicalized so both runtimes see the same spelling of every path.
 */
function withTree(arrange, run) {
    const base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'ck-code-graph-parity-')));
    const tree = { base, root: path.join(base, 'project'), home: path.join(base, 'home'), tmp: path.join(base, 'tmp') };
    try {
        for (const dir of [path.join(tree.root, '.claude'), tree.home, tree.tmp]) fs.mkdirSync(dir, { recursive: true });
        arrange(tree);
        run(tree);
    } finally {
        fs.rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

/** Hook side: the config path the loader resolved and the mode `codeGraphMode` derives from it. */
function hookView(tree) {
    const script = [
        `const loader = require(${JSON.stringify(path.join(HOOKS_LIB, 'project-config-loader.cjs'))});`,
        `const { codeGraphMode } = require(${JSON.stringify(path.join(HOOKS_LIB, 'graph-utils.cjs'))});`,
        'process.stdout.write(JSON.stringify({ configPath: loader.CONFIG_PATH, mode: codeGraphMode({ config: loader.loadProjectConfig() }) }));'
    ].join('\n');
    const result = spawnSync(process.execPath, ['-e', script], {
        cwd: tree.root,
        encoding: 'utf8',
        timeout: 30000,
        windowsHide: true,
        env: isolatedEnv(tree, { CLAUDE_PROJECT_DIR: tree.root })
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `hook probe failed:\n${result.stderr}`);
    const view = JSON.parse(result.stdout);
    return { configPath: view.configPath, off: view.mode === 'off', mode: view.mode };
}

/** CLI side: the config path the Python finder resolves, and whether the real CLI refuses a command. */
function cliView(tree) {
    const env = isolatedEnv(tree);
    const python = resolvePython(env);
    const probe = [
        'import json, sys',
        'from pathlib import Path',
        'sys.path.insert(0, sys.argv[1])',
        'from code_graph.incremental import configured_project_config_path',
        'print(json.dumps({"configPath": str(configured_project_config_path(Path(sys.argv[2])))}))'
    ].join('\n');
    const located = spawnSync(python.command, [...python.baseArgs, '-c', probe, SCRIPTS_DIR, tree.root], {
        cwd: tree.root, encoding: 'utf8', timeout: 30000, windowsHide: true, env
    });
    assert.ifError(located.error);
    assert.equal(located.status, 0, `CLI config probe failed:\n${located.stderr}`);
    const status = spawnSync(python.command, [...python.baseArgs, CLI_DIR, 'status', '--json', '--repo', tree.root], {
        cwd: tree.root, encoding: 'utf8', timeout: 60000, windowsHide: true, env
    });
    assert.ifError(status.error);
    const output = `${status.stdout}${status.stderr}`;
    const off = status.status === 1 && output.includes(OFF_MESSAGE);
    // A command that is not refused never mentions the off state.
    if (!off) assert.ok(!output.includes(OFF_MESSAGE), `CLI printed the off message without refusing:\n${output}`);
    return { configPath: JSON.parse(located.stdout).configPath, off, output };
}

const samePath = (a, b) => {
    const norm = p => {
        const resolved = path.resolve(p);
        return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    };
    return norm(a) === norm(b);
};

/**
 * @param {string} label
 * @param {(tree: object) => void} arrange - writes the fixture
 * @param {{ off: boolean, configPath: (tree: object) => string }} expected
 */
function parityCase(label, arrange, expected) {
    return {
        name: `[code-graph-config-agreement] BR-ADS-04 ${label}`,
        fn: () =>
            withTree(arrange, tree => {
                // Given the fixture above, fed unchanged to both readers
                // When the hooks and the CLI each resolve the project config and the graph mode
                const hooks = hookView(tree);
                const cli = cliView(tree);
                // Then both find the config at the expected path
                const wantPath = expected.configPath(tree);
                assert.ok(samePath(hooks.configPath, wantPath), `hooks resolved ${hooks.configPath}, expected ${wantPath}`);
                assert.ok(samePath(cli.configPath, wantPath), `CLI resolved ${cli.configPath}, expected ${wantPath}`);
                // And both reach the expected verdict: the CLI refuses exactly when the hooks are off
                assert.equal(hooks.off, expected.off, `hooks mode ${hooks.mode}, expected off=${expected.off}`);
                assert.equal(cli.off, expected.off, `CLI off=${cli.off}, expected off=${expected.off}; output:\n${cli.output}`);
            })
    };
}

const defaultPath = tree => path.join(tree.root, 'docs', 'project-config.json');
const relocatedPath = tree => path.join(tree.root, 'cfg', 'project-config.json');
const ckJson = (tree, file, projectConfigPath) => writeJson(path.join(tree.root, '.claude', file), { portability: { projectConfigPath } });

module.exports = {
    name: 'code-graph-config-agreement',
    tests: [
        parityCase('setting omitted: not off on either side',
            tree => writeJson(defaultPath(tree), { project: { name: 'fixture-project' } }),
            { off: false, configPath: defaultPath }),
        parityCase('auto: not off on either side',
            tree => writeJson(defaultPath(tree), graphConfig('auto')),
            { off: false, configPath: defaultPath }),
        parityCase('on: not off on either side',
            tree => writeJson(defaultPath(tree), graphConfig('on')),
            { off: false, configPath: defaultPath }),
        parityCase('off: off on both sides',
            tree => writeJson(defaultPath(tree), graphConfig('off')),
            { off: true, configPath: defaultPath }),
        parityCase('a value outside auto|on|off is off on both sides',
            tree => writeJson(defaultPath(tree), graphConfig('no')),
            { off: true, configPath: defaultPath }),
        parityCase('a non-object codeGraph section is off on both sides',
            tree => writeJson(defaultPath(tree), { project: { name: 'fixture-project' }, hooks: { codeGraph: 'on' } }),
            { off: true, configPath: defaultPath }),
        parityCase('a config relocated by .claude/.ck.json that says off is off on both sides',
            tree => {
                writeJson(defaultPath(tree), graphConfig('auto')); // decoy at the default path
                writeJson(relocatedPath(tree), graphConfig('off'));
                ckJson(tree, '.ck.json', 'cfg/project-config.json');
            },
            { off: true, configPath: relocatedPath }),
        parityCase('a relocated config that does not exist reads as no config, never the default file',
            tree => {
                writeJson(defaultPath(tree), graphConfig('off')); // decoy: must NOT be read
                ckJson(tree, '.ck.json', 'cfg/project-config.json');
            },
            { off: false, configPath: relocatedPath }),
        parityCase('.claude/.ck.local.json outranks .claude/.ck.json',
            tree => {
                writeJson(path.join(tree.root, 'cfg', 'shared.json'), graphConfig('auto'));
                writeJson(relocatedPath(tree), graphConfig('off'));
                ckJson(tree, '.ck.json', 'cfg/shared.json');
                ckJson(tree, '.ck.local.json', 'cfg/project-config.json');
            },
            { off: true, configPath: relocatedPath }),
        parityCase('the user ~/.claude/.ck.json applies when the project declares nothing',
            tree => {
                writeJson(defaultPath(tree), graphConfig('auto'));
                writeJson(relocatedPath(tree), graphConfig('off'));
                writeJson(path.join(tree.home, '.claude', '.ck.json'), { portability: { projectConfigPath: 'cfg/project-config.json' } });
            },
            { off: true, configPath: relocatedPath }),
        parityCase('an absolute relocation is kept as given',
            tree => {
                const outside = path.join(tree.base, 'shared-config', 'project-config.json');
                writeJson(outside, graphConfig('off'));
                writeJson(defaultPath(tree), graphConfig('auto'));
                ckJson(tree, '.ck.json', outside);
            },
            { off: true, configPath: tree => path.join(tree.base, 'shared-config', 'project-config.json') }),
        parityCase('a relative relocation escaping the project root falls back to the default',
            tree => {
                writeJson(path.join(tree.base, 'escaped', 'project-config.json'), graphConfig('off'));
                writeJson(defaultPath(tree), graphConfig('auto'));
                ckJson(tree, '.ck.json', '../escaped/project-config.json');
            },
            { off: false, configPath: defaultPath }),
        parityCase('a non-object portability in a higher layer drops a lower-layer relocation',
            tree => {
                writeJson(defaultPath(tree), graphConfig('auto'));
                writeJson(relocatedPath(tree), graphConfig('off'));
                ckJson(tree, '.ck.json', 'cfg/project-config.json');
                writeJson(path.join(tree.root, '.claude', '.ck.local.json'), { portability: 'none' });
            },
            { off: false, configPath: defaultPath })
    ]
};
