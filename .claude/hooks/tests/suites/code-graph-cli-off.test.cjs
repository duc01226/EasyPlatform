/**
 * Code-graph CLI `off` guard suite.
 *
 * TC-ADS-057 — a project that sets `hooks.codeGraph.enabled: "off"` gets a refusal from EVERY graph CLI
 * command, even when an old `.code-graph/graph.db` exists: exit status 1, the message
 * `code graph is off for this project (hooks.codeGraph)` (under `--json`: `{"status": "off", "message": ...}`),
 * and the graph database is never opened. With `auto` the same command runs and shows no off message.
 * Business rule (BR-ADS-04): no skill can read stale graph results from a project that switched the graph off.
 *
 * Portable: each case builds its own temp project (config + empty graph.db), runs the real CLI in a child
 * Python process with HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at that temp dir and the inherited
 * Python/graph/project switches removed. Python resolves through `python`, `py -3` (Windows launcher) or
 * `python3` (macOS/Linux), whichever is 3.10+.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolvePythonCommand: findPythonCommand } = require('../lib/python-command.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');

const CLI_DIR = path.resolve(__dirname, '..', '..', '..', 'scripts', 'code_graph');
const OFF_MESSAGE = 'code graph is off for this project (hooks.codeGraph)';

// Inherited keys that could steer the child Python or the graph CLI away from the fixture.
const SCRUBBED_ENV_KEYS = ['PYTHONPATH', 'PYTHONHOME', 'PYTHONSTARTUP', 'PYTHONUSERBASE', 'CRG_PARSE_WORKERS', 'CRG_GIT_TIMEOUT', 'CLAUDE_PROJECT_DIR'];

function isolatedEnv(dir) {
    const overrides = { HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir };
    for (const key of SCRUBBED_ENV_KEYS) overrides[key] = undefined;
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    return childEnv(overrides);
}

let resolvedPython;
function resolvePython(env) {
    if (resolvedPython) return resolvedPython;
    resolvedPython = findPythonCommand({ env, minMinor: 10 });
    return resolvedPython;
}

/** A temp project whose config sets the given graph mode and that holds an empty, never-opened graph.db. */
function withGraphProject(mode, run) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-code-graph-cli-off-'));
    try {
        fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
        fs.mkdirSync(path.join(root, '.code-graph'), { recursive: true });
        fs.writeFileSync(path.join(root, '.code-graph', 'graph.db'), '');
        const config = { project: { name: 'fixture-project' }, hooks: { codeGraph: { enabled: mode } } };
        fs.writeFileSync(path.join(root, 'docs', 'project-config.json'), JSON.stringify(config, null, 2), 'utf8');
        run(root);
    } finally {
        fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
}

function runCli(root, args) {
    const env = isolatedEnv(root);
    const python = resolvePython(env);
    const result = spawnSync(python.command, [...python.baseArgs, CLI_DIR, ...args, '--repo', root], {
        cwd: root,
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
        env
    });
    assert.ifError(result.error);
    return result;
}

const graphDirEntries = root => fs.readdirSync(path.join(root, '.code-graph')).sort();
const graphDbSize = root => fs.statSync(path.join(root, '.code-graph', 'graph.db')).size;

module.exports = {
    name: 'code-graph-cli-off',
    tests: [
        {
            name: '[code-graph-cli-off] TC-ADS-057 off mode: status --json refuses with the off message and never opens graph.db',
            fn: () =>
                withGraphProject('off', root => {
                    // Given a project whose graph mode is off and that still holds a graph.db
                    // When the graph status command runs with --json
                    const result = runCli(root, ['status', '--json']);
                    // Then it fails with status 1 and the machine-readable off message
                    assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`);
                    const payload = JSON.parse(result.stdout);
                    assert.deepEqual(payload, { status: 'off', message: OFF_MESSAGE });
                    // And the graph was never opened: the empty db is untouched and nothing was created beside it
                    assert.equal(graphDbSize(root), 0, 'graph.db was opened in off mode');
                    assert.deepEqual(graphDirEntries(root), ['graph.db']);
                })
        },
        {
            name: '[code-graph-cli-off] TC-ADS-057 off mode: a query command without --json also refuses with the off message',
            fn: () =>
                withGraphProject('off', root => {
                    // Given the same off project
                    // When a data command other than status runs in human-readable mode
                    const result = runCli(root, ['query', 'callers_of', 'anything']);
                    // Then it also fails with status 1, names the setting, and returns no graph results
                    assert.equal(result.status, 1, `expected exit 1, got ${result.status}\n${result.stdout}\n${result.stderr}`);
                    assert.ok(`${result.stdout}${result.stderr}`.includes(OFF_MESSAGE), `off message missing:\n${result.stdout}\n${result.stderr}`);
                    assert.equal(result.stdout.trim(), '', 'off mode must not print graph results');
                    assert.equal(graphDbSize(root), 0, 'graph.db was opened in off mode');
                })
        },
        {
            name: '[code-graph-cli-off] TC-ADS-057 auto mode: the same status command runs and shows no off message',
            fn: () =>
                withGraphProject('auto', root => {
                    // Given a project whose graph mode is auto with a graph.db present
                    // When the graph status command runs with --json
                    const result = runCli(root, ['status', '--json']);
                    // Then it is not refused: no off message, and it reports graph statistics instead
                    const output = `${result.stdout}${result.stderr}`;
                    assert.ok(!output.includes(OFF_MESSAGE), `auto mode printed the off message:\n${output}`);
                    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\n${output}`);
                    assert.notEqual(JSON.parse(result.stdout).status, 'off');
                })
        }
    ]
};
