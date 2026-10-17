import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
const canonicalPath = path.join(root, ".claude/skills/shared/sync-inline-versions.md");
const matrixPath = path.join(root, ".claude/scripts/agent_protocol_matrix.py");
const injectorPath = path.join(root, ".claude/scripts/inject_agent_protocol_blocks.py");

function findPython3(platform = process.platform, probe = spawnSync) {
  const candidates = platform === 'win32' ? [['python', []], ['py', ['-3']]] : [['python3', []], ['python', []]];
  for (const [command, prefix] of candidates) {
    const result = probe(command, [...prefix, '-c', 'import sys; print(sys.version_info.major)'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    if (result.status === 0 && result.stdout.trim() === '3') return { command, prefix };
  }
  throw new Error('A working Python 3 interpreter is required for agent contract tests');
}

function runPython(args) {
  const { command, prefix } = findPython3();
  return spawnSync(command, [...prefix, ...args], { cwd: root, encoding: 'utf8', windowsHide: true });
}

test('Python discovery supports Python-only hosts and preserves execution failures', () => {
  const calls = [];
  const probe = (command) => { calls.push(command); return { status: command === 'python' ? 0 : 1, stdout: '3\n' }; };
  assert.deepEqual(findPython3('linux', probe), { command: 'python', prefix: [] });
  assert.deepEqual(calls, ['python3', 'python']);
  assert.deepEqual(findPython3('win32', command => ({ status: command === 'py' ? 0 : 1, stdout: '3' })), { command: 'py', prefix: ['-3'] });
  assert.throws(() => findPython3('linux', () => ({ status: 0, stdout: '2' })), /Python 3 interpreter is required/);
  assert.throws(() => findPython3('linux', () => ({ status: null, error: new Error('ENOENT') })), /Python 3 interpreter is required/);
  const failed = runPython(['-c', 'import sys; sys.stderr.write("intentional-python-failure"); sys.exit(7)']);
  assert.equal(failed.status, 7);
  assert.match(failed.stderr, /intentional-python-failure/);
});

function returnContract(text) {
  for (const field of ["Run ID:", "Task ID:", "Attempt ID:", "Target:", "Changed paths:",
    "Finding totals:", "Acceptance:", "### Gaps / Unverified", "Full report:"]) {
    assert.ok(text.includes(field), `return contract must carry ${field}`);
  }
  assert.match(text, /transport limit, not a visibility limit/);
  assert.match(text, /more than ten Medium\/Low findings/);
  assert.match(text, /synthesis, acceptance, deduplication, or repair planning/);
  assert.match(text, /stale, duplicate, or superseded `Attempt ID`/);
  assert.match(text, /Read-only leaves write repair proposals\/reports only/);
}

test("TC-HARNESS-005/011 canonical return envelope preserves identity and full visibility", () => {
  const text = fs.readFileSync(canonicalPath, "utf8");
  const start = text.indexOf("## SYNC:subagent-return-contract");
  const end = text.indexOf("## SYNC:incremental-persistence", start);
  assert.ok(start >= 0 && end > start);
  returnContract(text.slice(start, end));
});

test("TC-HARNESS-005 stale-attempt mutant is rejected by the independent envelope oracle", () => {
  const text = fs.readFileSync(canonicalPath, "utf8");
  assert.throws(() => returnContract(text.replace("Attempt ID: [monotonic attempt/revision identifier]", "Attempt: omitted")), /Attempt ID/);
});

test("TC-HARNESS-011 incremental persistence requires parent synthesis and acceptance", () => {
  const text = fs.readFileSync(canonicalPath, "utf8");
  const start = text.indexOf("## SYNC:incremental-persistence");
  const end = text.indexOf("## SYNC:task-tracking-external-report", start);
  const body = text.slice(start, end);
  assert.match(body, /record Run ID, Task ID, Attempt ID/);
  assert.match(body, /Parent synthesis/);
  assert.match(body, /Read-only boundary/);
  assert.match(body, /Advancement gate/);
  assert.match(body, /stale or late attempts cannot advance/);
});

test("TC-HARNESS-005 injector reconciles excluded orchestration fences without role prose edits", () => {
  const code = [
    "import sys, json",
    "sys.path.insert(0, '.claude/scripts')",
    "from inject_agent_protocol_blocks import reconcile_excluded_blocks",
    "text = 'role prose\\n<!-- SYNC:parallel-phase-advancement -->\\nold orchestration\\n<!-- /SYNC:parallel-phase-advancement -->\\nend'",
    "clean, removed = reconcile_excluded_blocks(text, 'security-auditor')",
    "print(json.dumps({'clean': clean, 'removed': removed}))",
  ].join("; ");
  const result = runPython(["-c", code]);
  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.clean.includes("old orchestration"), false);
  assert.equal(parsed.clean.includes("role prose"), true);
  assert.deepEqual(parsed.removed, ["SYNC:parallel-phase-advancement"]);

  const whitelistCode = [
    "import sys, json",
    "sys.path.insert(0, '.claude/scripts')",
    "from inject_agent_protocol_blocks import reconcile_excluded_blocks",
    "text = '<!-- SYNC:sub-agent-selection -->\\nkeep\\n<!-- /SYNC:sub-agent-selection -->'",
    "clean, removed = reconcile_excluded_blocks(text, 'framework-maintainer')",
    "print(json.dumps({'clean': clean, 'removed': removed}))",
  ].join("; ");
  const whitelist = runPython(["-c", whitelistCode]);
  assert.equal(whitelist.status, 0, whitelist.stderr);
  const kept = JSON.parse(whitelist.stdout);
  assert.match(kept.clean, /keep/);
  assert.deepEqual(kept.removed, []);

  // An orphaned OPEN fence (close fence lost by an earlier partial edit) must not let the
  // removal span run on to the NEXT block's close fence. The non-greedy DOTALL pattern used
  // to do exactly that, deleting the role-authored lines in between and reporting only the
  // tag name, so the loss was invisible in run output and recoverable only from git.
  const orphanCode = [
    "import sys, json",
    "sys.path.insert(0, '.claude/scripts')",
    "from inject_agent_protocol_blocks import reconcile_excluded_blocks",
    "text = '<!-- SYNC:parallel-phase-advancement -->\\norphan body\\n\\nROLE-PROSE-A\\nROLE-PROSE-B\\n\\n<!-- SYNC:parallel-phase-advancement -->\\nstale orchestration\\n<!-- /SYNC:parallel-phase-advancement -->\\ntail'",
    "clean, removed = reconcile_excluded_blocks(text, 'security-auditor')",
    "print(json.dumps({'clean': clean, 'removed': removed}))",
  ].join("; ");
  const orphan = runPython(["-c", orphanCode]);
  assert.equal(orphan.status, 0, orphan.stderr);
  const orphanParsed = JSON.parse(orphan.stdout);
  assert.equal(orphanParsed.clean.includes("ROLE-PROSE-A"), true, "role prose before the block must survive");
  assert.equal(orphanParsed.clean.includes("ROLE-PROSE-B"), true, "role prose before the block must survive");
  assert.equal(orphanParsed.clean.includes("stale orchestration"), false, "the well-formed stale block is still removed");
  assert.equal(orphanParsed.clean.includes("orphan body"), true, "the unbalanced fence stays visible rather than being swallowed");
  assert.equal(orphanParsed.clean.includes("tail"), true);
  assert.deepEqual(orphanParsed.removed, ["SYNC:parallel-phase-advancement"]);
});

test("TC-HARNESS-005 matrix and injector remain executable and canonical", () => {
  assert.match(fs.readFileSync(injectorPath, "utf8"), /reconcile_excluded_blocks/);
  const result = runPython([matrixPath, "--validate"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /All tags canonical/);
  assert.match(fs.readFileSync(matrixPath, "utf8"), /stale-orchestration guard/);
});

test('TC-HARNESS-005 stale on-disk orchestration is rejected and the enforcement deletion is killed', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-matrix-negative-'));
  try {
    const agents = path.join(fixture, 'agents');
    fs.cpSync(path.join(root, '.claude/agents'), agents, { recursive: true });
    for (const entry of fs.readdirSync(path.join(root, '.claude/skills'), { withFileTypes: true })) {
      if (!entry.isDirectory() || !fs.existsSync(path.join(root, '.claude/skills', entry.name, 'SKILL.md'))) continue;
      fs.mkdirSync(path.join(fixture, 'skills', entry.name), { recursive: true });
      fs.writeFileSync(path.join(fixture, 'skills', entry.name, 'SKILL.md'), '# Fixture');
    }
    const code = [
      'import sys, pathlib',
      `matrix_path = pathlib.Path(${JSON.stringify(matrixPath)})`,
      "source = matrix_path.read_text(encoding='utf-8')",
      "start = source.index('    for agent in sorted(on_disk & set(AGENT_QUALITY_BLOCKS)):')",
      "end = source.index('    # (connection)', start)",
      "if sys.argv[1] == 'mutant': source = source[:start] + source[end:]",
      "namespace = {'__file__': str(matrix_path), '__name__': 'matrix_fixture'}",
      "exec(compile(source, str(matrix_path), 'exec'), namespace)",
      `namespace['AGENTS_DIR'] = pathlib.Path(${JSON.stringify(agents)})`,
      "assert 'sub-agent-selection' in namespace['ORCHESTRATION_WHITELIST']['framework-maintainer']",
      "assert 'sub-agent-selection' in namespace['agent_present_tags']('framework-maintainer')",
      "errors, warnings = namespace['validate']()",
      "assert errors == [], errors",
      "carrier = namespace['AGENTS_DIR'] / 'security-auditor.md'",
      "carrier.write_text(carrier.read_text(encoding='utf-8') + '\\n<!-- SYNC:parallel-phase-advancement -->\\nstale\\n<!-- /SYNC:parallel-phase-advancement -->\\n', encoding='utf-8')",
      "errors, warnings = namespace['validate']()",
      "expected = \"(i) agent 'security-auditor' still carries excluded-orchestration block(s) ['parallel-phase-advancement']; run inject_agent_protocol_blocks.py to reconcile exact fences\"",
      "assert errors == [expected], ('stale carrier rejection missing', errors)",
      "print('stale-carrier-rejected; whitelist-control-valid')",
    ].join('\n');
    const original = fs.readFileSync(path.join(agents, 'security-auditor.md'), 'utf8');
    const control = runPython(['-c', code, 'control']);
    assert.equal(control.status, 0, control.stdout + control.stderr);
    assert.match(control.stdout, /stale-carrier-rejected; whitelist-control-valid/);
    fs.writeFileSync(path.join(agents, 'security-auditor.md'), original);
    const mutant = runPython(['-c', code, 'mutant']);
    assert.notEqual(mutant.status, 0);
    assert.match(mutant.stderr, /AssertionError:.*stale carrier rejection missing/);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
});
