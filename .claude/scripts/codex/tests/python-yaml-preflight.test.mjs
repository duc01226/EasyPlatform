import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Contract: the catalog scripts declare PyYAML in .claude/scripts/requirements.txt. When the
// interpreter lacks it they must stop with an actionable message naming the requirement file and
// the install command — never a raw traceback, never a silent skip — while any OTHER missing
// module still surfaces unchanged.

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const requirements = path.join(root, ".claude", "scripts", "requirements.txt");
const SCRIPTS = [".claude/scripts/generate_catalogs.py", ".claude/scripts/scan_skills.py"];
const MISSING_DEPENDENCY_EXIT = 3;

function findPython3(platform = process.platform, probe = spawnSync) {
  const candidates = platform === "win32" ? [["python", []], ["py", ["-3"]]] : [["python3", []], ["python", []]];
  for (const [command, prefix] of candidates) {
    const result = probe(command, [...prefix, "-c", "import sys; print(sys.version_info.major)"], { encoding: "utf8", windowsHide: true, timeout: 5000 });
    if (result.status === 0 && result.stdout.trim() === "3") return { command, prefix };
  }
  throw new Error("A working Python 3 interpreter is required for the PyYAML preflight tests");
}

function runPython(python, args, env) {
  const result = spawnSync(python.command, [...python.prefix, ...args],
    { cwd: root, env, encoding: "utf8", timeout: 60000, windowsHide: true });
  assert.equal(result.error, undefined);
  return result;
}

// scan_skills.py imports its stdio helper unguarded, so a relocated copy needs it beside it.
function copyStdioHelper(dir) {
  fs.copyFileSync(path.join(root, ".claude", "scripts", "win_compat.py"), path.join(dir, "win_compat.py"));
  fs.mkdirSync(path.join(dir, "lib"), { recursive: true });
  fs.copyFileSync(path.join(root, ".claude", "scripts", "lib", "python_dependencies.py"), path.join(dir, "lib", "python_dependencies.py"));
}

function envWithoutPythonPath(extra = {}) {
  const env = { ...process.env, ...extra };
  if (!("PYTHONPATH" in extra)) delete env.PYTHONPATH;
  return env;
}

// `-S` skips site-packages, which is where PyYAML lives, so the interpreter behaves like one
// without the dependency. When yaml is importable anyway (for example vendored into the stdlib
// path), the missing-dependency path cannot be exercised and the case says so visibly.
function skipUnlessYamlMissing(t, python) {
  const probe = runPython(python, ["-S", "-c", "import yaml"], envWithoutPythonPath());
  if (probe.status !== 0 && /No module named 'yaml'/.test(probe.stderr)) return false;
  t.skip("PyYAML is importable without site-packages on this interpreter; the missing-dependency path cannot be exercised here");
  return true;
}

test("TC-PYDEP-001: a missing PyYAML stops with an actionable install message", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  for (const script of SCRIPTS) {
    const result = runPython(python, ["-S", script, "--help"], envWithoutPythonPath());
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    assert.match(result.stderr, /PyYAML/, script);
    assert.ok(result.stderr.includes(requirements), `${script} must name ${requirements}:\n${result.stderr}`);
    assert.match(result.stderr, /-m pip install/, script);
    assert.doesNotMatch(result.stderr, /Traceback/, script);
  }
});

// PowerShell single-quoted literal: only its quote characters (typographic ones too) need doubling.
const powershellLiteral = (value) => `'${value.replace(/['\u2018\u2019\u201a\u201b]/g, "$&$&")}'`;

// Launcher lines that pin the scripts' PEP 668 check, so a case does not depend on whether the
// host interpreter happens to be externally managed: the stdlib directory is `stdlibDir` (with or
// without an EXTERNALLY-MANAGED marker), and the interpreter is a venv only when `inVenv`.
function pep668Pin(stdlibDir, { inVenv = false } = {}) {
  return [
    "import sysconfig",
    "_get_path = sysconfig.get_path",
    `sysconfig.get_path = lambda name, *args, **kwargs: ${JSON.stringify(stdlibDir)} if name == 'stdlib' else _get_path(name, *args, **kwargs)`,
    inVenv ? "sys.prefix = sys.base_prefix + '-venv'" : "sys.prefix = sys.base_prefix",
  ];
}

// Parse a shown command the way a POSIX shell would.
function shellWords(python, text) {
  const parsed = runPython(python, ["-c", "import json, shlex, sys; print(json.dumps(shlex.split(sys.argv[1])))", text], process.env);
  assert.equal(parsed.status, 0, parsed.stderr);
  return JSON.parse(parsed.stdout);
}

test("TC-PYDEP-003: the install hint still pastes when the script path contains a space or shell metacharacters", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "python-yaml-preflight-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const spaced = path.join(fixture, "R&D dir with space it's");
  fs.mkdirSync(spaced);
  copyStdioHelper(spaced);
  for (const script of SCRIPTS) {
    const copy = path.join(spaced, path.basename(script));
    fs.copyFileSync(path.join(root, script), copy);
    const result = runPython(python, ["-S", copy, "--help"], envWithoutPythonPath());
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    const shown = /^Install it (?:from PowerShell )?with: (.+)$/m.exec(result.stderr)?.[1];
    assert.ok(shown, `${script} printed no install command:\n${result.stderr}`);
    const spacedRequirements = path.join(spaced, "requirements.txt");
    if (process.platform === "win32") {
      assert.ok(shown.startsWith("& '"), `${script} must invoke the interpreter through PowerShell's call operator: ${shown}`);
      assert.ok(shown.endsWith(` -m pip install -r ${powershellLiteral(spacedRequirements)}`), `${script} must quote the requirements path: ${shown}`);
    } else {
      // Parse the shown command the way a POSIX shell would and compare it with the intended argv.
      const parsed = runPython(python, ["-c", "import json, shlex, sys; print(json.dumps(shlex.split(sys.argv[1])))", shown], process.env);
      assert.equal(parsed.status, 0, parsed.stderr);
      assert.deepEqual(JSON.parse(parsed.stdout).slice(1), ["-m", "pip", "install", "-r", spacedRequirements], script);
    }
  }
});

test("TC-PYDEP-004: the install hint keeps a non-ASCII path intact on a legacy Windows code page", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "python-yaml-preflight-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const accented = path.join(fixture, "Jos\u00e9 scripts");
  fs.mkdirSync(accented);
  copyStdioHelper(accented);
  for (const script of SCRIPTS) {
    const copy = path.join(accented, path.basename(script));
    fs.copyFileSync(path.join(root, script), copy);
    // Simulated Windows (the scripts switch stderr to UTF-8 only there) over a stderr whose
    // encoding cannot represent the path, as a legacy console code page cannot.
    const launcher = [
      "import runpy, sys",
      "sys.platform = 'win32'",
      `sys.path.insert(0, ${JSON.stringify(accented)})`,
      `sys.argv = ${JSON.stringify([copy, "--help"])}`,
      `runpy.run_path(${JSON.stringify(copy)}, run_name='__main__')`,
    ].join("\n");
    const result = spawnSync(python.command, [...python.prefix, "-S", "-c", launcher], {
      cwd: root, env: envWithoutPythonPath({ PYTHONIOENCODING: "ascii:backslashreplace" }),
      encoding: "utf8", timeout: 60000, windowsHide: true,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    assert.ok(result.stderr.includes(path.join(accented, "requirements.txt")),
      `${script} must print the requirements path verbatim, not escaped:\n${result.stderr}`);
  }
});

test("TC-PYDEP-005: on Windows the install hint is a PowerShell command that keeps '&' and quotes literal", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "python-yaml-preflight-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  // '&' splits a cmd or PowerShell line when left bare; ' and \u2019 both end a PowerShell literal.
  const tricky = path.join(fixture, "R&D it's \u2019x\u2019");
  fs.mkdirSync(tricky);
  copyStdioHelper(tricky);
  const executable = "C:\\Tools & Co\\Py'thon\\python.exe";
  const plainStdlib = path.join(fixture, "plain-stdlib");
  fs.mkdirSync(plainStdlib);
  for (const script of SCRIPTS) {
    const copy = path.join(tricky, path.basename(script));
    fs.copyFileSync(path.join(root, script), copy);
    // Simulated Windows: the scripts pick the PowerShell rendering from os.name.
    const launcher = [
      "import os, runpy, sys",
      "os.name = 'nt'",
      "sys.platform = 'win32'",
      `sys.executable = ${JSON.stringify(executable)}`,
      ...pep668Pin(plainStdlib),
      `sys.path.insert(0, ${JSON.stringify(tricky)})`,
      `sys.argv = ${JSON.stringify([copy, "--help"])}`,
      `runpy.run_path(${JSON.stringify(copy)}, run_name='__main__')`,
    ].join("\n");
    const result = spawnSync(python.command, [...python.prefix, "-S", "-c", launcher], {
      cwd: root, env: envWithoutPythonPath(), encoding: "utf8", timeout: 60000, windowsHide: true,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    const expected = `& ${powershellLiteral(executable)} -m pip install -r ${powershellLiteral(path.join(tricky, "requirements.txt"))}`;
    assert.equal(expected.includes("'C:\\Tools & Co\\Py''thon\\python.exe'"), true, "fixture self-check: the expected rendering doubles the quote");
    const shown = /^Install it from PowerShell with: (.+)$/m.exec(result.stderr)?.[1];
    assert.equal(shown, expected, `${script}\n${result.stderr}`);
  }
});

test("TC-PYDEP-006: the POSIX install hint does not need Python 3.8's shlex.join", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  for (const script of SCRIPTS) {
    // The installers advertise Python 3.7+, which has shlex.quote but not shlex.join.
    const launcher = [
      "import os, runpy, shlex, sys",
      "os.name = 'posix'",
      "del shlex.join",
      `sys.path.insert(0, ${JSON.stringify(path.join(root, path.dirname(script)))})`,
      `sys.argv = ${JSON.stringify([path.join(root, script), "--help"])}`,
      `runpy.run_path(${JSON.stringify(path.join(root, script))}, run_name='__main__')`,
    ].join("\n");
    const result = runPython(python, ["-S", "-c", launcher], envWithoutPythonPath());
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    assert.doesNotMatch(result.stderr, /Traceback/, script);
    // shlex.quote wraps a path holding shell-special characters (a Windows host's `D:\...`) in quotes.
    assert.match(result.stderr, /^Install it with: .+ -m pip install -r .+requirements\.txt'?$/m, script);
  }
});

test("TC-PYDEP-007: on an externally managed (PEP 668) interpreter the hint installs into the framework venv", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "python-yaml-preflight-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const managedStdlib = path.join(fixture, "managed-stdlib");
  fs.mkdirSync(managedStdlib);
  fs.writeFileSync(path.join(managedStdlib, "EXTERNALLY-MANAGED"), "[externally-managed]\n", "utf8");
  // A project path with shell metacharacters, so every rendered line has to quote it.
  const project = path.join(fixture, "R&D it's");
  const scriptsDir = path.join(project, ".claude", "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  copyStdioHelper(scriptsDir);
  const projectRequirements = path.join(scriptsDir, "requirements.txt");
  // The framework's shared venv (hooks/lib/graph-utils.cjs creates the same one).
  const venv = path.join(project, "tmp", "claude-temp", ".venv");
  for (const script of SCRIPTS) {
    const copy = path.join(scriptsDir, path.basename(script));
    fs.copyFileSync(path.join(root, script), copy);
    for (const windows of [false, true]) {
      const executable = windows ? "C:\\Tools & Co\\python.exe" : "/opt/py 3/bin/python3";
      const launcher = [
        "import os, runpy, sys",
        `os.name = ${windows ? "'nt'" : "'posix'"}`,
        ...(windows ? ["sys.platform = 'win32'"] : []),
        `sys.executable = ${JSON.stringify(executable)}`,
        ...pep668Pin(managedStdlib),
        `sys.path.insert(0, ${JSON.stringify(scriptsDir)})`,
        `sys.argv = ${JSON.stringify([copy, "--help"])}`,
        `runpy.run_path(${JSON.stringify(copy)}, run_name='__main__')`,
      ].join("\n");
      const result = runPython(python, ["-S", "-c", launcher], envWithoutPythonPath());
      const label = `${script} (${windows ? "simulated Windows" : "POSIX"})\n${result.stderr}`;
      assert.equal(result.status, MISSING_DEPENDENCY_EXIT, label);
      assert.doesNotMatch(result.stderr, /Traceback/, label);
      assert.match(result.stderr, /externally managed \(PEP 668\)/, label);
      const shell = windows ? "from PowerShell " : "";
      const create = new RegExp(`^Create a virtual environment ${shell}with: (.+)$`, "m").exec(result.stderr)?.[1];
      const install = new RegExp(`^Install it ${shell}with: (.+)$`, "m").exec(result.stderr)?.[1];
      const onPath = /^Then put the environment first on PATH: (.+)$/m.exec(result.stderr)?.[1];
      // Python's os.path is the host's in both arms, so the expected paths join the same way.
      if (windows) {
        const bin = path.join(venv, "Scripts");
        assert.equal(create, `& ${powershellLiteral(executable)} -m venv ${powershellLiteral(venv)}`, label);
        assert.equal(install, `& ${powershellLiteral(path.join(bin, "python.exe"))} -m pip install -r ${powershellLiteral(projectRequirements)}`, label);
        assert.equal(onPath, `$env:Path = ${powershellLiteral(`${bin};`)} + $env:Path`, label);
      } else {
        const bin = path.join(venv, "bin");
        assert.deepEqual(shellWords(python, create), [executable, "-m", "venv", venv], label);
        assert.deepEqual(shellWords(python, install), [path.join(bin, "python"), "-m", "pip", "install", "-r", projectRequirements], label);
        assert.deepEqual(shellWords(python, onPath), ["export", `PATH=${bin}:$PATH`], label);
      }
    }
  }
});

test("TC-PYDEP-008: inside a virtual environment the marker is ignored, as pip ignores it", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "python-yaml-preflight-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.writeFileSync(path.join(fixture, "EXTERNALLY-MANAGED"), "[externally-managed]\n", "utf8");
  for (const script of SCRIPTS) {
    const launcher = [
      "import os, runpy, sys",
      "os.name = 'posix'",
      ...pep668Pin(fixture, { inVenv: true }),
      `sys.path.insert(0, ${JSON.stringify(path.join(root, path.dirname(script)))})`,
      `sys.argv = ${JSON.stringify([path.join(root, script), "--help"])}`,
      `runpy.run_path(${JSON.stringify(path.join(root, script))}, run_name='__main__')`,
    ].join("\n");
    const result = runPython(python, ["-S", "-c", launcher], envWithoutPythonPath());
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    assert.doesNotMatch(result.stderr, /PEP 668|Create a virtual environment/, script);
    const install = /^Install it with: (.+)$/m.exec(result.stderr)?.[1];
    assert.ok(install, `${script} printed no install command:\n${result.stderr}`);
    assert.deepEqual(shellWords(python, install).slice(1), ["-m", "pip", "install", "-r", requirements], script);
  }
});

test("TC-PYDEP-009: a PEP 668 probe that cannot answer falls back to the pip hint, never a traceback", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  for (const script of SCRIPTS) {
    // Some interpreters cannot resolve sysconfig paths (for example a simulated platform whose
    // _sysconfigdata module does not exist); the preflight must still print its message.
    const launcher = [
      "import os, runpy, sys, sysconfig",
      "os.name = 'posix'",
      "def _unavailable(*args, **kwargs):",
      "    raise ModuleNotFoundError(\"No module named '_sysconfigdata_probe'\")",
      "sysconfig.get_path = _unavailable",
      // Not a venv, or the probe short-circuits before it ever asks sysconfig.
      "sys.prefix = sys.base_prefix",
      `sys.path.insert(0, ${JSON.stringify(path.join(root, path.dirname(script)))})`,
      `sys.argv = ${JSON.stringify([path.join(root, script), "--help"])}`,
      `runpy.run_path(${JSON.stringify(path.join(root, script))}, run_name='__main__')`,
    ].join("\n");
    const result = runPython(python, ["-S", "-c", launcher], envWithoutPythonPath());
    assert.equal(result.status, MISSING_DEPENDENCY_EXIT, `${script}\n${result.stderr}`);
    assert.doesNotMatch(result.stderr, /Traceback|PEP 668/, script);
    // shlex.quote wraps a path holding shell-special characters (a Windows host's `D:\...`) in quotes.
    assert.match(result.stderr, /^Install it with: .+ -m pip install -r .+requirements\.txt'?$/m, script);
  }
});

test("TC-PYDEP-002: any other missing module inside the yaml import still re-raises (preservation)", (t) => {
  const python = findPython3();
  if (skipUnlessYamlMissing(t, python)) return;
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "python-yaml-preflight-"));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixture, "yaml"));
  fs.writeFileSync(path.join(fixture, "yaml", "__init__.py"), "import nonexistent_dep_xyz\n", "utf8");
  for (const script of SCRIPTS) {
    const result = runPython(python, ["-S", script, "--help"], envWithoutPythonPath({ PYTHONPATH: fixture }));
    assert.notEqual(result.status, 0, script);
    assert.notEqual(result.status, MISSING_DEPENDENCY_EXIT, `${script} misreported another missing module as PyYAML:\n${result.stderr}`);
    assert.match(result.stderr, /nonexistent_dep_xyz/, script);
    assert.doesNotMatch(result.stderr, /PyYAML/, script);
  }
});

// Provisioning tests run the real helper in a copied project. Only the pip process
// is replaced; actual yaml imports prove consumer availability without network or
// global writes. -S removes the host's installed package; the flag proxy then
// permits recovery under the explicitly controlled process seam.
function recoveryFixture(t) {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "yaml-recovery-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const scripts = path.join(project, ".claude", "scripts");
  fs.mkdirSync(scripts, { recursive: true });
  copyStdioHelper(scripts);
  fs.writeFileSync(path.join(scripts, "requirements.txt"), "pyyaml>=6.0\n");
  const env = envWithoutPythonPath();
  for (const key of Object.keys(env)) {
    if (/^(CK_|CLAUDE_|CODEX_|OPENCODE_)|TOKEN|SECRET|PASSWORD|API_KEY/i.test(key)) delete env[key];
  }
  Object.assign(env, { HOME: project, USERPROFILE: project, TMPDIR: project, TEMP: project, TMP: project });
  return { project, scripts, env };
}

function recoveryPython(t, body, { allowRecovery = true } = {}) {
  const fixture = recoveryFixture(t);
  const python = findPython3();
  const setup = [
    "import os, sys, json, subprocess, importlib",
    "from unittest.mock import patch",
    `sys.path.insert(0, ${JSON.stringify(fixture.scripts)})`,
    "from lib import python_dependencies as deps",
    `requirements = ${JSON.stringify(path.join(fixture.scripts, "requirements.txt"))}`,
    `project = ${JSON.stringify(fixture.project)}`,
    "target = os.path.join(project, 'tmp', 'claude-temp', 'python-packages')",
    "def write_yaml(folder):",
    "    os.makedirs(os.path.join(folder, 'yaml'), exist_ok=True)",
    "    with open(os.path.join(folder, 'yaml', '__init__.py'), 'w') as f:",
    "        f.write('__version__ = \"6.0\"\\n')",
    ...(allowRecovery ? [
      "original_flags = sys.flags",
      "class Flags:",
      "    no_site = 0",
      "    def __getattr__(self, key): return getattr(original_flags, key)",
      "sys.flags = Flags()",
    ] : []),
    body,
  ].join("\n");
  const result = runPython(python, ["-S", "-c", setup], fixture.env);
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("TC-PYDEP-010: an available package avoids all installation", (t) => {
  // Given a usable dependency, When recovery runs, Then no installer is invoked.
  const result = recoveryPython(t, `
write_yaml(project)
sys.path.insert(0, project)
with patch.object(deps.subprocess, 'run', side_effect=AssertionError('unexpected install')):
    print(json.dumps({'ok': deps.ensure_pyyaml(requirements)}))`);
  assert.equal(result.ok, true);
});

test("TC-PYDEP-011: global installation must make the dependency usable before success", (t) => {
  // Given missing yaml, When the global pip seam supplies it, Then the real importer succeeds.
  const result = recoveryPython(t, `
calls = []
def pip(argv, **options):
    calls.append({'argv': argv, 'timeout': options['timeout'], 'shell': options.get('shell', False)})
    write_yaml(project)
    sys.path.insert(0, project)
    return subprocess.CompletedProcess(argv, 0)
with patch.object(deps.subprocess, 'run', side_effect=pip):
    ok = deps.ensure_pyyaml(requirements)
print(json.dumps({'ok': ok, 'calls': calls, 'origin': importlib.import_module('yaml').__file__}))`);
  assert.equal(result.ok, true);
  assert.equal(result.calls.length, 1);
  assert.ok(result.calls[0].argv.includes("--no-user"));
  assert.equal(result.calls[0].argv.at(-1), "pyyaml>=6.0");
  assert.equal(result.calls[0].timeout, 30);
  assert.equal(result.calls[0].shell, false);
});

for (const failure of ["denied", "timeout", "unusable-success", "missing-pip"]) {
  test(`TC-PYDEP-012-${failure}: a failed global attempt recovers through a verified local target`, (t) => {
    // Given global denial/timeout/unusable output, When local recovery supplies yaml,
    // Then the consumer imports it from that target and further calls need no install.
    const result = recoveryPython(t, `
calls = []
def pip(argv, **options):
    calls.append(argv)
    if '--target' not in argv:
        mode = ${JSON.stringify(failure)}
        if mode == 'timeout': raise subprocess.TimeoutExpired(argv, 30)
        if mode == 'missing-pip': raise OSError('pip unavailable')
        return subprocess.CompletedProcess(argv, 0 if mode == 'unusable-success' else 1)
    write_yaml(argv[argv.index('--target') + 1])
    return subprocess.CompletedProcess(argv, 0)
with patch.object(deps.subprocess, 'run', side_effect=pip):
    ok = deps.ensure_pyyaml(requirements)
    repeated = deps.ensure_pyyaml(requirements)
print(json.dumps({'ok': ok, 'repeated': repeated, 'calls': calls,
                  'origin': importlib.import_module('yaml').__file__, 'target': target}))`);
    assert.equal(result.ok, true);
    assert.equal(result.repeated, true);
    assert.equal(result.calls.length, 2);
    assert.ok(result.calls[0].includes("--no-user"));
    assert.ok(result.calls[1].includes("--target"));
    assert.ok(result.origin.startsWith(result.target));
    assert.ok(result.calls.every(argv => !argv.includes("--break-system-packages")));
  });
}

test("TC-PYDEP-013: a cached local package is reused without repeating a global attempt", (t) => {
  // Given an earlier target install, When another process needs yaml, Then it uses that cache.
  const result = recoveryPython(t, `
write_yaml(target)
with patch.object(deps.subprocess, 'run', side_effect=AssertionError('cache must avoid install')):
    print(json.dumps({'ok': deps.ensure_pyyaml(requirements),
                      'origin': importlib.import_module('yaml').__file__, 'target': target}))`);
  assert.equal(result.ok, true);
  assert.ok(result.origin.startsWith(result.target));
});

test("TC-PYDEP-014: exhausted recovery remains unavailable with no unbounded retries", (t) => {
  // Given both install strategies fail, When recovery runs, Then no false availability or third try.
  const result = recoveryPython(t, `
os.makedirs(target)
calls = []
def pip(argv, **options):
    calls.append(argv)
    return subprocess.CompletedProcess(argv, 1)
with patch.object(deps.subprocess, 'run', side_effect=pip):
    ok = deps.ensure_pyyaml(requirements)
print(json.dumps({'ok': ok, 'calls': calls, 'target_added': target in sys.path}))`);
  assert.equal(result.ok, false);
  assert.equal(result.calls.length, 2);
  assert.equal(result.target_added, false);
});

for (const mode of ["no-site", "opt-out", "undeclared", "duplicate", "missing-file"]) {
  test(`TC-PYDEP-015-${mode}: diagnostic or undeclared recovery performs no installation`, (t) => {
    // Given an explicit nonmutating probe or undeclared package, When called, Then no child process.
    const result = recoveryPython(t, `
mode = ${JSON.stringify(mode)}
if mode == 'opt-out': os.environ['CK_AUTO_INSTALL_DEPENDENCIES'] = '0'
if mode == 'undeclared':
    with open(requirements, 'w') as f: f.write('--index-url https://example.invalid\\nunknown-package\\n')
if mode == 'duplicate':
    with open(requirements, 'w') as f: f.write('pyyaml>=6.0\\npyyaml>=6.0\\n')
if mode == 'missing-file': os.remove(requirements)
with patch.object(deps.subprocess, 'run', side_effect=AssertionError('must not install')):
    print(json.dumps({'ok': deps.ensure_pyyaml(requirements)}))`, { allowRecovery: mode !== "no-site" });
    assert.equal(result.ok, false);
  });
}

for (const platform of ["win32", "darwin", "linux"]) {
  test(`TC-PYDEP-016-${platform}: install arguments preserve the interpreter and literal paths`, (t) => {
    // Given a platform interpreter literal with shell metacharacters, When installation is attempted,
    // Then the subprocess receives literal argv, finite timeouts, and no shell/elevation.
    // The helper has no OS branch: keep native sys.platform so lazy stdlib imports stay valid.
    const result = recoveryPython(t, `
sys.executable = ${JSON.stringify(platform === "win32" ? "C:\\Tools & Co\\python.exe" : "/opt/Python & Co/bin/python3")}
sys.prefix = "prefix & literal's"
calls = []
def pip(argv, **options):
    calls.append({'argv': argv, 'shell': options.get('shell', False), 'timeout': options['timeout'],
                  'stdin_null': options['stdin'] == subprocess.DEVNULL})
    return subprocess.CompletedProcess(argv, 1)
with patch.object(deps.subprocess, 'run', side_effect=pip):
    ok = deps.ensure_pyyaml(requirements)
print(json.dumps({'ok': ok, 'calls': calls, 'executable': sys.executable, 'prefix': sys.prefix}))`);
    assert.equal(result.ok, false);
    assert.equal(result.calls.length, 2);
    for (const call of result.calls) {
      assert.deepEqual(call.argv.slice(0, 5), [result.executable, "-m", "pip", "--isolated", "install"]);
      assert.equal(call.shell, false);
      assert.equal(call.stdin_null, true);
      assert.equal(call.timeout, 30);
      assert.ok(call.argv.includes("--no-input"));
      assert.ok(call.argv.includes("--only-binary=:all:"));
      assert.equal(call.argv[call.argv.indexOf("--retries") + 1], "0");
    }
    assert.ok(result.calls[0].argv.includes("--no-user"));
    assert.ok(!result.calls[0].argv.includes("--prefix"));
    assert.ok(!result.calls[0].argv.includes("--root"));
  });
}

test("TC-PYDEP-017: a broken transitive import is not guessed into an installation request", (t) => {
  // Given an installed yaml with a broken transitive import, When recovery checks it,
  // Then that fault propagates unchanged and never invokes pip.
  const result = recoveryPython(t, `
write_yaml(project)
with open(os.path.join(project, 'yaml', '__init__.py'), 'w') as f: f.write('import missing_transitive_dependency\\n')
sys.path.insert(0, project)
with patch.object(deps.subprocess, 'run', side_effect=AssertionError('must not install guessed package')):
    try:
        deps.ensure_pyyaml(requirements)
    except ModuleNotFoundError as error:
        print(json.dumps({'name': error.name}))
    else: raise AssertionError('broken package was hidden')`);
  assert.equal(result.name, "missing_transitive_dependency");
});

for (const script of SCRIPTS) {
  for (const succeeds of [true, false]) {
    test(`TC-PYDEP-018-${path.basename(script)}-${succeeds}: entrypoint continues only with a usable recovered dependency`, (t) => {
      // Given the real copied entrypoint and live helper, When pip recovers/fails,
      // Then its owned help/metadata succeeds after actual import, otherwise actionable exit3.
      const fixture = recoveryFixture(t);
      fs.mkdirSync(path.join(fixture.project, ".claude", "skills"));
      const yamlFixture = '__version__ = "6.0"\ndef dump(value, **options):\n    assert value == []\n    return "[]\\n"\n';
      const copy = path.join(fixture.scripts, path.basename(script));
      fs.copyFileSync(path.join(root, script), copy);
      const python = findPython3();
      const launcher = [
        "import os, sys, subprocess, runpy",
        "from unittest.mock import patch",
        `sys.path.insert(0, ${JSON.stringify(fixture.scripts)})`,
        "from lib import python_dependencies as deps",
        `os.chdir(${JSON.stringify(fixture.project)})`,
        "original_flags = sys.flags",
        "class Flags:",
        "    no_site = 0",
        "    def __getattr__(self, key): return getattr(original_flags, key)",
        "sys.flags = Flags()",
        "calls = []",
        "def pip(argv, **options):",
        "    calls.append(argv)",
        ...(succeeds ? [
          `    os.makedirs(${JSON.stringify(path.join(fixture.project, "yaml"))}, exist_ok=True)`,
          `    with open(${JSON.stringify(path.join(fixture.project, "yaml", "__init__.py"))}, 'w') as f: f.write(${JSON.stringify(yamlFixture)})`,
          `    sys.path.insert(0, ${JSON.stringify(fixture.project)})`,
          "    return subprocess.CompletedProcess(argv, 0)",
        ] : ["    return subprocess.CompletedProcess(argv, 1)"]),
        `sys.argv = ${JSON.stringify(path.basename(script) === "scan_skills.py" ? [copy] : [copy, "--help"])}`,
        "with patch.object(deps.subprocess, 'run', side_effect=pip):",
        `    runpy.run_path(${JSON.stringify(copy)}, run_name='__main__')`,
      ].join("\n");
      const result = runPython(python, ["-S", "-c", launcher], fixture.env);
      assert.equal(result.status, succeeds ? 0 : 3, result.stderr);
      assert.doesNotMatch(result.stderr, /Traceback/);
      if (succeeds && path.basename(script) === "scan_skills.py") {
        assert.match(result.stdout, /Found 0 skills/);
        assert.match(result.stdout, /Saved metadata/);
        assert.equal(fs.readFileSync(path.join(fixture.scripts, "skills_data.yaml"), "utf8"), "[]\n");
      } else if (succeeds) assert.match(result.stdout, /usage:/i);
      else assert.match(result.stderr, /PyYAML remains unavailable[\s\S]*requires PyYAML/);
    });
  }
}
