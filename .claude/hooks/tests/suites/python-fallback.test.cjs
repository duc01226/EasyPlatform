/**
 * Python Fallback Ordering Test Suite
 *
 * Guards the platform-ordered python fallback in session-init.cjs
 * (`pythonFallbackOrder` / `resolvePythonFallback`).
 *
 * Intent under test (fix #2A — see tmp/reports/debug-investigate-260711-lifecycle-timeouts.md, F2/E1):
 *  - Windows probes real `python` BEFORE the wasteful MS-Store `python3` alias (cost optimization).
 *  - Off-Windows still probes `python3` FIRST (E1: `python3` is canonical on Linux/macOS; `python` often absent).
 *  - `python3` is ALWAYS in the list — the reorder is a cost optimization, never a coverage reduction,
 *    so a host where ONLY `python3` resolves still detects a version on every platform.
 *
 * Deterministic on any host: uses an injected recording runner, never a real interpreter.
 */

const path = require('path');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const vm = require('node:vm');
const { resolvePythonCommand, preparePythonYaml } = require('../lib/python-command.cjs');
const { assertEqual, assertDeepEqual, assertTrue, assertNullish } = require('../lib/assertions.cjs');

const {
  pythonFallbackOrder,
  resolvePythonFallback
} = require(path.resolve(__dirname, '../../session-init.cjs'));

// A runner factory: succeeds (returns a version string) ONLY for the named commands,
// and records the order in which commands were probed.
function recordingRunner(succeedFor) {
  const calls = [];
  const succeed = new Set(succeedFor);
  const run = (binary /* , args */) => {
    calls.push(binary);
    return succeed.has(binary) ? `Python 3.x (${binary})` : null;
  };
  return { run, calls };
}

const orderingTests = [
  {
    name: 'TC-PYFB-001: win32 probes python BEFORE python3 (skip MS-Store alias first)',
    fn() {
      assertDeepEqual(
        pythonFallbackOrder('win32'),
        ['python', 'python3'],
        'Windows fallback must try real python before the python3 alias'
      );
    }
  },
  {
    name: 'TC-PYFB-002: linux probes python3 FIRST (E1 — canonical off-Windows)',
    fn() {
      assertDeepEqual(
        pythonFallbackOrder('linux'),
        ['python3', 'python'],
        'Linux fallback must try python3 first'
      );
    }
  },
  {
    name: 'TC-PYFB-003: darwin probes python3 FIRST (E1 — canonical off-Windows)',
    fn() {
      assertDeepEqual(
        pythonFallbackOrder('darwin'),
        ['python3', 'python'],
        'macOS fallback must try python3 first'
      );
    }
  },
  {
    name: 'TC-PYFB-004: python3 is present in the list on EVERY platform (no coverage loss)',
    fn() {
      for (const platform of ['win32', 'linux', 'darwin', 'freebsd', 'aix']) {
        assertTrue(
          pythonFallbackOrder(platform).includes('python3'),
          `python3 must remain probeable on ${platform}`
        );
        assertTrue(
          pythonFallbackOrder(platform).includes('python'),
          `python must remain probeable on ${platform}`
        );
      }
    }
  }
];

const resolutionTests = [
  {
    name: 'TC-PYFB-010: E1 core — host where ONLY python3 resolves still detects a version (linux)',
    fn() {
      const { run, calls } = recordingRunner(['python3']);
      const result = resolvePythonFallback('linux', run);
      assertTrue(result !== null, 'only-python3 host must still resolve a version');
      assertEqual(calls[0], 'python3', 'linux must probe python3 first');
    }
  },
  {
    name: 'TC-PYFB-011: win32 real-python host resolves via python (alias never needed)',
    fn() {
      const { run, calls } = recordingRunner(['python']);
      const result = resolvePythonFallback('win32', run);
      assertTrue(result !== null, 'Windows real-python host must resolve');
      assertEqual(calls[0], 'python', 'win32 must probe python first');
      assertEqual(calls.length, 1, 'win32 must NOT probe python3 once python succeeds');
    }
  },
  {
    name: 'TC-PYFB-012: win32-alias safety — python fails, python3 succeeds, still resolves',
    fn() {
      const { run, calls } = recordingRunner(['python3']);
      const result = resolvePythonFallback('win32', run);
      assertTrue(result !== null, 'win32 must fall through to python3 when python fails');
      assertDeepEqual(calls, ['python', 'python3'], 'win32 must probe python then python3');
    }
  },
  {
    name: 'TC-PYFB-013: graceful degradation — no interpreter resolves returns null',
    fn() {
      const { run, calls } = recordingRunner([]); // nothing succeeds
      const result = resolvePythonFallback('linux', run);
      assertNullish(result, 'must return null when no interpreter resolves');
      assertDeepEqual(calls, ['python3', 'python'], 'must exhaust the full ordered list before giving up');
    }
  }
];

// Test-runner contract: launcher discovery validates Python, while readiness uses
// the framework's existing installer. The recording process seam never installs.
const launcherTests = ['darwin', 'linux'].map(platform => ({
  name: `[python-command] ${platform} works when only python3 exists`,
  fn() {
    const calls = [];
    const result = resolvePythonCommand({ platform, probe(command) {
      calls.push(command);
      return command === 'python3' ? { status: 0, stdout: '3.14\n' } : { error: { code: 'ENOENT' } };
    } });
    assert.equal(result.command, 'python3');
    assert.deepEqual(calls, ['python3']);
  }
}));

// Load the real caller with recording dependency/process boundaries. Filesystem
// probes see an empty adopter project; no authoring-repo docs or Git state is used.
function loadCatalogCaller(preparePythonYaml, spawnSync) {
  const source = fs.readFileSync(path.join(__dirname, 'count-drift.test.cjs'), 'utf8');
  const module = { exports: {} };
  const dependencies = {
    path,
    fs: { existsSync: () => false },
    child_process: { spawnSync },
    '../lib/python-command.cjs': { resolvePythonCommand: () => ({ command: 'python3', baseArgs: [] }), preparePythonYaml },
    '../lib/framework-repo-guard.cjs': { isFrameworkRepo: () => false }
  };
  vm.runInNewContext(source, { module, __dirname, process: { env: {} }, require(name) {
    if (!(name in dependencies)) throw new Error(`Unexpected caller dependency: ${name}`);
    return dependencies[name];
  } });
  return module.exports.tests.find(test => test.name.includes('regenerated skills catalog')).fn;
}

launcherTests.push(
  {
    name: '[python-command] catalog readiness precedes bounded operations and propagates the recovered package',
    fn() {
      const events = [];
      const modulePath = path.resolve(os.tmpdir(), 'catalog-python-packages');
      const run = loadCatalogCaller((_python, options) => {
        events.push('ready');
        assert.equal(path.basename(options.scriptsDir), 'scripts');
        return modulePath;
      }, (_command, _args, options) => {
        events.push('catalog');
        assert.equal(options.timeout, 30000);
        assert.equal(options.env.PYTHONPATH, modulePath);
        return { status: 0 };
      });
      run(); run();
      assert.deepEqual(events, ['ready', 'catalog', 'catalog']);
    }
  },
  {
    name: '[python-command] failed catalog readiness stays failed without retrying installs or starting operations',
    fn() {
      let attempts = 0;
      const failure = new Error('automatic recovery exhausted');
      const run = loadCatalogCaller(() => { attempts++; throw failure; }, () => assert.fail('Catalog must not start before readiness'));
      assert.throws(run, error => error === failure);
      assert.throws(run, error => error === failure);
      assert.equal(attempts, 1);
    }
  },
  {
    name: '[python-command] an available dependency remains usable with automatic installation disabled',
    fn() {
      const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'python-command-ready-'));
      try {
        fs.mkdirSync(path.join(fixture, 'lib'));
        fs.mkdirSync(path.join(fixture, 'yaml'));
        fs.copyFileSync(path.resolve(__dirname, '../../../scripts/lib/python_dependencies.py'), path.join(fixture, 'lib', 'python_dependencies.py'));
        // The process boundary only needs import availability; YAML semantics belong
        // to the catalog suite. A fixture package avoids depending on host PyYAML.
        fs.writeFileSync(path.join(fixture, 'yaml', '__init__.py'), '__version__ = "6.0"\n');
        const env = { ...process.env };
        for (const key of Object.keys(env)) if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|PYTHON)|TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)) delete env[key];
        Object.assign(env, { CK_AUTO_INSTALL_DEPENDENCIES: '0', HOME: fixture, USERPROFILE: fixture, TMPDIR: fixture, TEMP: fixture, TMP: fixture });
        const python = resolvePythonCommand({ cwd: fixture, env });
        assert.equal(preparePythonYaml(python, { scriptsDir: fixture, cwd: fixture, env }), fixture);
      } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
      }
    }
  },
  {
    name: '[python-command] a broken installed YAML package reports its transitive import without attempting recovery',
    fn() {
      const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'python-command-broken-'));
      const recoveryMarker = path.join(fixture, 'recovery-attempted');
      try {
        fs.mkdirSync(path.join(fixture, 'lib'));
        fs.mkdirSync(path.join(fixture, 'yaml'));
        // This tripwire owns only the delegation boundary; actual installer
        // global/local behavior is covered by the Python dependency suite.
        fs.writeFileSync(path.join(fixture, 'lib', 'python_dependencies.py'), [
          'def ensure_pyyaml(requirements):',
          `    with open(${JSON.stringify(recoveryMarker)}, "w") as marker: marker.write("called")`,
          '    raise RuntimeError("recovery must not run for a broken installed package")'
        ].join('\n'));
        fs.writeFileSync(path.join(fixture, 'yaml', '__init__.py'), 'import _ck_fixture_missing_yaml_dependency\n');
        const env = { ...process.env };
        for (const key of Object.keys(env)) if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_|PYTHON)|TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)) delete env[key];
        Object.assign(env, { HOME: fixture, USERPROFILE: fixture, TMPDIR: fixture, TEMP: fixture, TMP: fixture });
        const python = resolvePythonCommand({ cwd: fixture, env });
        assert.throws(() => preparePythonYaml(python, { scriptsDir: fixture, cwd: fixture, env }), /No module named '_ck_fixture_missing_yaml_dependency'/);
        assert.equal(fs.existsSync(recoveryMarker), false);
      } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
      }
    }
  },
  {
    name: '[python-command] Windows real python avoids alias and launcher processes',
    fn() {
      const calls = [];
      const result = resolvePythonCommand({ platform: 'win32', probe(command) {
        calls.push(command); return { status: 0, stdout: '3.11\n' };
      } });
      assert.equal(result.command, 'python');
      assert.deepEqual(calls, ['python']);
    }
  },
  {
    name: '[python-command] Windows falls back to literal py -3 when python is absent',
    fn() {
      const calls = [];
      const result = resolvePythonCommand({ platform: 'win32', probe(command, args) {
        calls.push([command, args]);
        return command === 'py' ? { status: 0, stdout: '3.12\n' } : { error: { code: 'ENOENT' } };
      } });
      assert.deepEqual(result, { command: 'py', baseArgs: ['-3'] });
      assert.equal(calls.length, 2);
      assert.equal(calls[1][1][0], '-3');
      assert.equal(calls.some(([command]) => command === 'python3'), false);
    }
  },
  {
    name: '[python-command] POSIX falls back to python after a missing python3',
    fn() {
      const result = resolvePythonCommand({ platform: 'linux', probe(command) {
        return command === 'python' ? { status: 0, stdout: '3.10' } : { error: { code: 'ENOENT' } };
      } });
      assert.equal(result.command, 'python');
    }
  },
  {
    name: '[python-command] Python 2 is rejected despite a successful process exit',
    fn() {
      assert.throws(() => resolvePythonCommand({ platform: 'linux', probe: () => ({ status: 0, stdout: '2.7' }) }), /Python 3\.0\+.*version 2\.7/);
    }
  },
  {
    name: '[python-command] graph minimum 3.10 rejects 3.9 and accepts the exact boundary',
    fn() {
      const result = resolvePythonCommand({ platform: 'linux', minMinor: 10, probe(command) {
        return { status: 0, stdout: command === 'python3' ? '3.9' : '3.10' };
      } });
      assert.equal(result.command, 'python');
    }
  },
  {
    name: '[python-command] spawn errors, signals, nonzero exits and invalid versions cannot look green',
    fn() {
      for (const result of [
        { error: { code: 'ETIMEDOUT' }, status: 0, stdout: '3.14' },
        { status: null, signal: 'SIGTERM', stdout: '3.14' },
        { status: 1, stdout: '3.14' },
        { status: 0, stdout: '' },
        { status: 0, stdout: 'Python 3.14' },
        { status: 0, stdout: '4.0' }
      ]) assert.throws(() => resolvePythonCommand({ platform: 'linux', probe: () => result }), /Python 3\.0\+ is required/);
    }
  },
  {
    name: '[python-command] missing interpreters report every attempted launcher without retries',
    fn() {
      const calls = [];
      assert.throws(() => resolvePythonCommand({ platform: 'darwin', probe(command) {
        calls.push(command); return { error: { code: 'ENOENT' } };
      } }), /python3: ENOENT; python: ENOENT/);
      assert.deepEqual(calls, ['python3', 'python']);
    }
  },
  {
    name: '[python-command] discovery preserves fixture cwd and environment with a bounded literal process',
    fn() {
      const env = { PATH: 'fixture-only' };
      const cwd = path.resolve('fixture with spaces');
      resolvePythonCommand({ platform: 'linux', env, cwd, probe(command, args, options) {
        assert.equal(command, 'python3');
        assert.equal(args[0], '-c');
        assert.equal(options.cwd, cwd);
        assert.equal(options.env, env);
        assert.equal(options.timeout, 10000);
        assert.equal(options.windowsHide, true);
        assert.equal(options.shell, undefined);
        return { status: 0, stdout: '3.14' };
      } });
    }
  },
  {
    name: '[python-command] YAML readiness uses the existing recovery owner and returns the verified import location',
    fn() {
      const scriptsDir = path.resolve('fixture & quoted scripts');
      const modulePath = path.resolve('fixture packages');
      const result = preparePythonYaml({ command: 'py', baseArgs: ['-3'] }, { scriptsDir, probe(command, args, options) {
        assert.equal(command, 'py');
        assert.deepEqual(args.slice(0, 2), ['-3', '-c']);
        assert.ok(args[2].includes('from lib.python_dependencies import ensure_pyyaml'));
        assert.ok(args[2].includes(JSON.stringify(path.join(scriptsDir, 'requirements.txt'))));
        assert.ok(args[2].includes('import yaml'));
        assert.ok(args[2].includes('yaml.__file__'));
        assert.equal(args[2].includes("sys.platform = 'win32'"), false);
        assert.equal(options.timeout, 75000);
        assert.equal(options.shell, undefined);
        return { status: 0, stdout: JSON.stringify(modulePath) };
      } });
      assert.equal(result, modulePath);
    }
  },
  {
    name: '[python-command] exhausted dependency setup stays a hard failure and retains its diagnostic',
    fn() {
      let calls = 0;
      assert.throws(() => preparePythonYaml({ command: 'python3', baseArgs: [] }, {
        scriptsDir: path.resolve('fixture'), probe() {
          calls++; return { status: 1, stderr: 'PyYAML remains unavailable; automatic attempts stopped.' };
        }
      }), /Python dependency setup failed: exit 1[\s\S]*PyYAML remains unavailable/);
      assert.equal(calls, 1);
    }
  },
  {
    name: '[python-command] dependency setup rejects process errors and malformed import locations',
    fn() {
      for (const result of [
        { error: { message: 'timeout' }, status: 0, stdout: '"/unused"' },
        { status: null, signal: 'SIGTERM' },
        { status: 0, stdout: 'not JSON' },
        { status: 0, stdout: 'null' },
        { status: 0, stdout: '"relative-path"' }
      ]) assert.throws(() => preparePythonYaml({ command: 'python3', baseArgs: [] }, {
        scriptsDir: path.resolve('fixture'), probe: () => result
      }));
    }
  }
);

module.exports = {
  name: 'python-fallback',
  tests: [
    ...orderingTests,
    ...resolutionTests,
    ...launcherTests
  ]
};
