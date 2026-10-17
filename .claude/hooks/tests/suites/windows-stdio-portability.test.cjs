/**
 * Windows stdio portability suite.
 *
 * Exercises the Windows compatibility branches with captured pipes on every
 * host so wrapper lifetime bugs are reproducible without a Windows-only CI job.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolvePythonCommand: findPythonCommand, preparePythonYaml } = require('../lib/python-command.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPTS_DIR = path.join(REPO_ROOT, '.claude', 'scripts');

let pythonCommand = null;
let yamlModulePath;
let readinessError;

function resolvePythonCommand() {
  if (readinessError) throw readinessError;
  if (pythonCommand) return pythonCommand;
  try {
    const python = findPythonCommand({ cwd: REPO_ROOT });
    yamlModulePath = preparePythonYaml(python, { scriptsDir: SCRIPTS_DIR, cwd: REPO_ROOT });
    pythonCommand = python;
    return pythonCommand;
  } catch (error) {
    readinessError = error;
    throw error;
  }
}

function runPython(code, label, options = {}) {
  const python = resolvePythonCommand();
  const result = spawnSync(python.command, [...python.baseArgs, '-c', `import sys\nsys.path.insert(0, ${JSON.stringify(yamlModulePath)})\n${code}`], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    maxBuffer: options.maxBuffer || 1024 * 1024,
    windowsHide: true,
    env: options.env ? { ...process.env, ...options.env } : process.env
  });
  result.label = label;
  return result;
}

function runSimulatedWindowsScript(relativePath, args = [], options = {}) {
  const scriptPath = path.join(REPO_ROOT, relativePath);
  const statements = [
    // shutil selects native platform imports at import time (Python 3.12+).
    // Load it on the real host before simulating the scripts' Windows branch.
    'import runpy, sys, shutil',
    "sys.platform = 'win32'",
    `sys.path.insert(0, ${JSON.stringify(path.dirname(scriptPath))})`,
    ...((options.blockImports || []).map((name) => `sys.modules[${JSON.stringify(name)}] = None`)),
    `sys.argv = ${JSON.stringify([scriptPath, ...args])}`,
    `runpy.run_path(${JSON.stringify(scriptPath)}, run_name='__main__')`,
    ...(options.after || [])
  ];
  const result = runPython(statements.join('\n'), relativePath, options);
  return result;
}

function preview(value) {
  const text = value || '';
  return text.length > 1200 ? `${text.slice(0, 1200)}…[truncated]` : text;
}

function assertSuccess(result, message) {
  const details = [
    `case=${result.label || 'Python subprocess'}`,
    `status=${result.status}`,
    result.signal ? `signal=${result.signal}` : null,
    result.error ? `spawnError=${result.error.message}` : null,
    `stdout:\n${preview(result.stdout)}`,
    `stderr:\n${preview(result.stderr)}`
  ].filter(Boolean).join('\n');

  assert.ifError(result.error);
  assert.strictEqual(result.status, 0, `${message}\n${details}`);
}

const tests = [
  {
    name: '[windows-stdio] shared helper preserves captured UTF-8 pipes and detaches legacy wrappers',
    fn: () => {
      const code = [
        'import io, sys',
        "sys.platform = 'win32'",
        `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
        'from win_compat import ensure_utf8_stderr, ensure_utf8_stdout, ensure_utf8_stream',
        'original_stdout, original_stderr = sys.stdout, sys.stderr',
        'ensure_utf8_stdout()',
        "ensure_utf8_stderr(errors='replace')",
        'assert sys.stdout is original_stdout, "stdout should be reconfigured in place"',
        'assert sys.stderr is original_stderr, "stderr should be reconfigured in place"',
        'assert sys.stdout.encoding.lower().replace("_", "-") == "utf-8"',
        'assert sys.stderr.encoding.lower().replace("_", "-") == "utf-8"',
        'assert sys.stderr.errors == "replace", sys.stderr.errors',
        'class LegacyStream:',
        '    def __init__(self, buffer):',
        '        self.buffer = buffer',
        '        self.errors = "backslashreplace"',
        '        self.line_buffering = True',
        '        self.write_through = False',
        '        self.detached = False',
        '    def detach(self):',
        '        self.detached = True',
        '        return self.buffer',
        'legacy_buffer = io.BytesIO()',
        'legacy = LegacyStream(legacy_buffer)',
        'wrapped = ensure_utf8_stream(legacy)',
        'assert legacy.detached, "legacy wrapper must detach before replacement"',
        'assert wrapped.encoding.lower().replace("_", "-") == "utf-8"',
        'assert wrapped.errors == "backslashreplace"',
        'assert wrapped.line_buffering is True',
        'wrapped.write("legacy fallback: café ✓")',
        'wrapped.flush()',
        'assert legacy_buffer.getvalue() == "legacy fallback: café ✓".encode("utf-8")',
        'print("captured stdout: café ✓")',
        'print("captured stderr: naïve ✓", file=sys.stderr)',
        'print("legacy fallback: café ✓")'
      ].join('\n');
      const result = runPython(code, 'shared stream helper');
      assertSuccess(result, 'Shared UTF-8 configuration must preserve captured stdout/stderr.');
      assert(result.stdout.includes('captured stdout: café ✓'), 'stdout did not retain UTF-8 text');
      assert(result.stderr.includes('captured stderr: naïve ✓'), 'stderr did not retain UTF-8 text');
      assert(result.stdout.includes('legacy fallback: café ✓'), 'legacy fallback did not write UTF-8');
    }
  },
  {
    name: '[windows-stdio] catalog generator --help works under the shared Windows stream path',
    fn: () => {
      const result = runSimulatedWindowsScript('.claude/scripts/generate_catalogs.py', ['--help']);
      assertSuccess(result, 'Catalog generator help must remain writable through captured stdout.');
      assert(result.stdout.includes('usage:'), 'generator help omitted usage text');
      assert(result.stdout.includes('--skills'), 'generator help omitted --skills');
    }
  },
  {
    name: '[windows-stdio] catalog generator --skills emits UTF-8 YAML without writing files',
    fn: () => {
      const result = runSimulatedWindowsScript('.claude/scripts/generate_catalogs.py', ['--skills']);
      assertSuccess(result, 'Catalog generation must work through captured UTF-8 stdout/stderr.');
      assert(result.stdout.includes('title: Skills Catalog'), 'generated output omitted the skills catalog title');
      assert(result.stdout.includes('skills:'), 'generated output omitted the skills collection');
      assert(result.stdout.includes('📦'), 'generated output did not preserve Unicode YAML values');
    }
  },
  {
    name: '[windows-stdio] catalog generator standalone fallback leaves captured help streams open',
    fn: () => {
      const result = runSimulatedWindowsScript(
        '.claude/scripts/generate_catalogs.py',
        ['--help'],
        { blockImports: ['win_compat'] }
      );
      assertSuccess(result, 'Catalog generator fallback must not close captured stdio.');
      assert(result.stdout.includes('--skills'), 'fallback generator help omitted --skills');
    }
  },
  {
    name: '[windows-stdio] scanner import keeps both captured streams usable',
    fn: () => {
      const code = [
        'import sys',
        "sys.platform = 'win32'",
        `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
        'import scan_skills',
        'print("scanner import stdout: café ✓")',
        'print("scanner import stderr: naïve ✓", file=sys.stderr)'
      ].join('\n');
      const result = runPython(code, 'scan_skills import');
      assertSuccess(result, 'Importing scan_skills must leave captured stdout/stderr usable.');
      assert(result.stdout.includes('scanner import stdout: café ✓'), 'scanner import lost UTF-8 stdout');
      assert(result.stderr.includes('scanner import stderr: naïve ✓'), 'scanner import lost UTF-8 stderr');
    }
  },
  {
    name: '[windows-stdio] ck-help overview keeps replacement error handling under simulated Windows',
    fn: () => {
      const result = runSimulatedWindowsScript('.claude/scripts/ck-help.py', [], {
        after: [
          'assert sys.stdout.errors == "replace", sys.stdout.errors',
          'print("ck-help errors mode: replace")'
        ]
      });
      assertSuccess(result, 'ck-help overview and its replacement error policy must remain usable.');
      assert(result.stdout.includes('# ClaudeKit Commands'), 'ck-help overview output was missing');
      assert(result.stdout.includes('**Usage:**'), 'ck-help usage guidance was missing');
      assert(result.stdout.includes('ck-help errors mode: replace'), 'ck-help replacement mode was not preserved');
    }
  },
  {
    name: '[windows-stdio] design search --help works through its standalone fallback',
    fn: () => {
      const result = runSimulatedWindowsScript(
        '.claude/skills/ui-design/scripts/search.py',
        ['--help'],
        { blockImports: ['win_compat'] }
      );
      assertSuccess(result, 'Design search help fallback must not close captured stdout.');
      assert(result.stdout.includes('usage:'), 'design search help omitted usage text');
      assert(result.stdout.includes('Design Intelligence Search'), 'design search help omitted its description');
    }
  },
  {
    name: '[windows-stdio] audited stream owners do not wrap attached sys buffers directly',
    fn: () => {
      const files = [
        '.claude/scripts/win_compat.py',
        '.claude/scripts/scan_skills.py',
        '.claude/scripts/ck-help.py',
        '.claude/scripts/generate_catalogs.py',
        '.claude/skills/ui-design/scripts/search.py'
      ];
      const unsafe = /TextIOWrapper\s*\(\s*(?:io\.)?sys\.(?:stdout|stderr)\.buffer\b/g;
      for (const file of files) {
        const source = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
        assert(!unsafe.test(source), `${file} still wraps an attached sys buffer directly`);
        unsafe.lastIndex = 0;
      }
    }
  }
];

module.exports = {
  name: 'windows-stdio-portability',
  tests
};
