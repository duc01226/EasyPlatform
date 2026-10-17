'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

/** Select an actual Python 3, independently of its installed third-party packages. */
function resolvePythonCommand({ platform = process.platform, probe = spawnSync, cwd, env = process.env, minMinor = 0 } = {}) {
  const candidates = platform === 'win32'
    ? [{ command: 'python', baseArgs: [] }, { command: 'py', baseArgs: ['-3'] }]
    : [{ command: 'python3', baseArgs: [] }, { command: 'python', baseArgs: [] }];
  const failures = [];
  for (const candidate of candidates) {
    const result = probe(candidate.command, [...candidate.baseArgs, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], {
      cwd, env, encoding: 'utf8', timeout: 10000, windowsHide: true
    });
    const version = /^3\.(\d+)$/.exec((result.stdout || '').trim());
    if (!result.error && result.status === 0 && version && Number(version[1]) >= minMinor) return candidate;
    failures.push(`${[candidate.command, ...candidate.baseArgs].join(' ')}: ${result.error?.code || result.signal || `exit ${result.status}, version ${(result.stdout || '').trim() || 'unknown'}`}`);
  }
  throw new Error(`Python 3.${minMinor}+ is required on PATH. Tried ${failures.join('; ')}.`);
}

/** Run the existing dependency owner on the real platform before stdio simulation. */
function preparePythonYaml(python, { scriptsDir, probe = spawnSync, cwd, env = process.env }) {
  const code = [
    'import json, os, sys',
    `sys.path.insert(0, ${JSON.stringify(scriptsDir)})`,
    'from lib.python_dependencies import ensure_pyyaml',
    'try:',
    '    import yaml',
    'except ModuleNotFoundError as error:',
    '    if error.name != "yaml": raise',
    `    if not ensure_pyyaml(${JSON.stringify(path.join(scriptsDir, 'requirements.txt'))}):`,
    '        raise SystemExit("PyYAML unavailable after bounded dependency recovery; see the scripts requirements.txt.")',
    '    import yaml',
    'print(json.dumps(os.path.dirname(os.path.dirname(yaml.__file__))))'
  ].join('\n');
  const result = probe(python.command, [...python.baseArgs, '-c', code], {
    cwd, env, encoding: 'utf8', windowsHide: true,
    // Readiness includes the owner's two 30s install attempts. Assertion budgets stay unchanged.
    timeout: 75000
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Python dependency setup failed: ${result.error?.message || result.signal || `exit ${result.status}`}\n${(result.stderr || '').slice(0, 2000)}`);
  }
  const modulePath = JSON.parse(result.stdout);
  if (typeof modulePath !== 'string' || !path.isAbsolute(modulePath)) throw new Error('Python dependency setup returned an invalid module path.');
  return modulePath;
}

module.exports = { resolvePythonCommand, preparePythonYaml };
