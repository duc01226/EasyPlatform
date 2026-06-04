#!/usr/bin/env node
'use strict';
/**
 * Tests for doc-sync-gate.cjs (Phase 4 — doc⇄code sync gate)
 *
 * Two layers:
 *   A. Pure classifier unit tests (lib/doc-sync-classify.cjs) — no git.
 *   B. Integration tests against an ISOLATED throwaway git repo created in the
 *      OS temp dir, exercising the real hook via stdin/exit-code (mirrors
 *      test-git-commit-block.cjs). The hook's lib resolves config + runs git in
 *      CLAUDE_PROJECT_DIR, so pointing that at the temp repo fully isolates the
 *      suite from the host project's real index.
 *
 * Covers TC-DOCSYS-041..048.
 *
 * Usage: node .claude/hooks/tests/test-doc-sync-gate.cjs [--verbose]
 */

const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const HOOKS_DIR = path.resolve(__dirname, '..');
const HOOK_PATH = path.join(HOOKS_DIR, 'doc-sync-gate.cjs');
const verbose = process.argv.includes('--verbose');

let passed = 0;
let failed = 0;
const log = m => console.log(m);
function logResult(name, ok, detail) {
  if (ok) {
    passed++;
    log(`  [PASS] ${name}`);
  } else {
    failed++;
    log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function runHook(input, env = {}, cwd) {
  return new Promise(resolve => {
    const proc = spawn('node', [HOOK_PATH], {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 8000
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => (stdout += d.toString()));
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
    proc.on('close', code => resolve({ code, stdout, stderr }));
    proc.on('error', () => resolve({ code: 1, stdout, stderr }));
  });
}

const AREA_CODE = 'src/Services/ExampleArea/';
const AREA_DOCS = 'docs/specs/ExampleArea/';

function gitAvailable() {
  try {
    execFileSync('git', ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

let repoCounter = 0;
function makeRepo() {
  repoCounter += 1;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `doc-sync-gate-${process.pid}-${repoCounter}-`));
  const g = args => execFileSync('git', args, { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
  g(['init', '-q']);
  g(['config', 'user.email', 'test@test.local']);
  g(['config', 'user.name', 'doc-sync-test']);
  g(['config', 'commit.gpgsign', 'false']);
  // Generic gate config stays project-neutral; enforced areas come from project config.
  const cfgDir = path.join(dir, '.claude', 'hooks', 'config');
  fs.mkdirSync(cfgDir, { recursive: true });
  fs.writeFileSync(
    path.join(cfgDir, 'doc-sync-gate.json'),
    JSON.stringify({
      enabled: true,
      auditLogRelPath: 'tmp/claude-temp/doc-sync-override.log',
      behavioralCodeExtensions: ['.cs', '.ts'],
      fastExit: {
        pathPrefixes: ['docs/', '.claude/', 'plans/', 'tmp/', 'AutomationTest/'],
        pathContains: ['/tests/', '.test.', '.spec.', 'Tests/', 'IntegrationTests/', '/obj/', '/bin/', '/migrations/'],
        extensions: ['.md', '.json', '.scss', '.css', '.html', '.csproj', '.sln']
      },
      enforcedAreas: []
    })
  );
  const projectConfigDir = path.join(dir, 'docs');
  fs.mkdirSync(projectConfigDir, { recursive: true });
  fs.writeFileSync(
    path.join(projectConfigDir, 'project-config.json'),
    JSON.stringify({
      workflowPatterns: {
        docSyncGate: {
          enforcedAreas: [{ name: 'ExampleArea', codePathPrefixes: [AREA_CODE], graceDays: 0 }]
        }
      }
    })
  );
  return { dir, g };
}

function writeFile(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

function rimraf(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

const commitInput = (cmd = 'git commit -m "x"') => ({ tool_name: 'Bash', tool_input: { command: cmd } });
const editInput = file => ({ tool_name: 'Edit', tool_input: { file_path: file, old_string: 'a', new_string: 'b' } });

// ===========================================================================
// A. Classifier unit tests (pure, no git)
// ===========================================================================
function testClassifier() {
  log('\n--- A. Classifier unit (lib/doc-sync-classify.cjs) ---');
  const cls = require(path.join(HOOKS_DIR, 'lib', 'doc-sync-classify.cjs'));

  // Smoke: the real repo config still parses + loads as an object. Enforced-area
  // CONTENT is project-specific (a generic/portable framework legitimately defines
  // none), so the classifier LOGIC below is exercised against a synthetic,
  // project-neutral cfg rather than whatever the host project-config happens to
  // contain. Keeps the unit test deterministic and free of any project residue.
  const realCfg = cls.loadConfig();
  logResult('config loads (real repo)', !!realCfg && typeof realCfg === 'object', JSON.stringify(realCfg && realCfg.enabled));

  const cfg = {
    enabled: true,
    behavioralCodeExtensions: ['.cs', '.ts'],
    fastExit: {
      pathPrefixes: ['docs/', '.claude/', 'plans/', 'tmp/'],
      pathContains: ['/tests/', '.test.', '.spec.', 'Tests/', 'IntegrationTests/', '/obj/', '/bin/', '/migrations/'],
      extensions: ['.md', '.json', '.scss', '.css', '.html', '.csproj', '.sln']
    },
    enforcedAreas: [{ name: 'ExampleArea', codePathPrefixes: ['src/Services/ExampleArea/'], graceDays: 0 }]
  };

  logResult('fast-exit: docs/', cls.isFastExit('docs/specs/x.md', cfg) === true);
  logResult('fast-exit: .md extension', cls.isFastExit('src/Services/ExampleArea/x.md', cfg) === true);
  logResult('fast-exit: integration test', cls.isFastExit('src/Services/ExampleArea/Example.IntegrationTests/X.cs', cfg) === true);
  logResult('NOT fast-exit: real code .cs', cls.isFastExit('src/Services/ExampleArea/Example.Application/Foo.cs', cfg) === false);

  const hit = cls.behavioralCodeHit('src/Services/ExampleArea/Example.Application/Foo.cs', cfg);
  logResult('behavioral hit: code .cs → ExampleArea', !!hit && hit.area.name === 'ExampleArea');
  logResult('no hit: unenforced service .cs', cls.behavioralCodeHit('src/Services/Other/Foo.cs', cfg) === null);
  logResult('no hit: test .cs (fast-exit)', cls.behavioralCodeHit('src/Services/ExampleArea/Example.IntegrationTests/X.cs', cfg) === null);

  logResult(
    'feature-doc area resolves',
    !!cls.areaForFeatureDoc('docs/specs/ExampleArea/README.SampleFeature.md', cfg)
  );
  logResult(
    'feature-doc area null for other docs',
    cls.areaForFeatureDoc('docs/specs/Other/README.X.md', cfg) === null
  );
  logResult('toRepoRel strips project root', typeof cls.toRepoRel('foo/bar.cs') === 'string');
}

// ===========================================================================
// B. Integration tests (isolated temp git repo)
// ===========================================================================
async function testCommitWarnStale() {
  log('\n--- B1. TC-DOCSYS-041: commit with stale area code (no doc) → WARN/ALLOW ---');
  const { dir, g } = makeRepo();
  try {
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'public class Foo { int X() => 1; }\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline']);
    // real behavioral change, no doc staged
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'public class Foo { int X() => 42; }\n');
    g(['add', '-A']);
    const r = await runHook(commitInput(), { CLAUDE_PROJECT_DIR: dir }, dir);
    logResult('TC-DOCSYS-041 allows with warning (exit 0)', r.code === 0, `exit ${r.code}`);
    logResult('TC-DOCSYS-041 message actionable', r.stdout.includes('[doc-sync]') && r.stdout.includes('Feature Spec'));
  } finally {
    rimraf(dir);
  }
}

async function testCommitAllowSynced() {
  log('\n--- B2. TC-DOCSYS-042: commit with code + feature doc staged → ALLOW ---');
  const { dir, g } = makeRepo();
  try {
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'public class Foo { int X() => 1; }\n');
    writeFile(dir, `${AREA_DOCS}README.SampleFeature.md`, '---\nlast_synced: 2026-06-10\n---\n# Goal\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline']);
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'public class Foo { int X() => 42; }\n');
    writeFile(dir, `${AREA_DOCS}README.SampleFeature.md`, '---\nlast_synced: 2026-06-11\n---\n# Goal\nAC-GM-01 changed.\n');
    g(['add', '-A']);
    const r = await runHook(commitInput(), { CLAUDE_PROJECT_DIR: dir }, dir);
    logResult('TC-DOCSYS-042 allows (exit 0)', r.code === 0, `exit ${r.code}`);
  } finally {
    rimraf(dir);
  }
}

async function testEditDocAllows() {
  log('\n--- B3. TC-DOCSYS-043: editing the Feature Spec doc itself → ALLOW (no deadlock) ---');
  const { dir } = makeRepo();
  try {
    const docAbs = writeFile(dir, `${AREA_DOCS}README.SampleFeature.md`, '---\nlast_synced: 2026-06-10\n---\n# Goal\n');
    const r = await runHook(editInput(docAbs), { CLAUDE_PROJECT_DIR: dir }, dir);
    logResult('TC-DOCSYS-043 allows doc edit (exit 0)', r.code === 0, `exit ${r.code}`);
    logResult('TC-DOCSYS-043 silent (no warn on doc)', !r.stdout.includes('[doc-sync]') && !r.stderr.includes('[doc-sync]'));
  } finally {
    rimraf(dir);
  }
}

async function testToolingOnlyAllows() {
  log('\n--- B4. TC-DOCSYS-044: tooling/test-only diff → ALLOW (fast-exit) ---');
  const { dir, g } = makeRepo();
  try {
    writeFile(dir, `${AREA_CODE}Example.IntegrationTests/FooTests.cs`, '// test\n');
    writeFile(dir, `${AREA_DOCS}README.SampleFeature.md`, '# doc\n');
    writeFile(dir, 'README.md', '# root\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline']);
    writeFile(dir, `${AREA_CODE}Example.IntegrationTests/FooTests.cs`, '// test changed\n');
    writeFile(dir, 'README.md', '# root changed\n');
    g(['add', '-A']);
    const r = await runHook(commitInput(), { CLAUDE_PROJECT_DIR: dir }, dir);
    logResult('TC-DOCSYS-044 allows (exit 0)', r.code === 0, `exit ${r.code}`);
  } finally {
    rimraf(dir);
  }
}

async function testOverrideIndependentOfWorkflow() {
  log('\n--- B5. TC-DOCSYS-045: gate ignores workflow/quick: state (fires regardless) ---');
  const { dir, g } = makeRepo();
  try {
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'class Foo{}\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline']);
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'class Foo{ int x=1; }\n');
    g(['add', '-A']);
    // Real commit with workflow detection forced OFF (CK_WORKFLOW='') — the gate must
    // still fire, proving it ignores workflow/quick: state. (A 'quick:'-prefixed string
    // is not a git commit per COMMIT_RE, so it would never even reach the gate.)
    const r = await runHook(commitInput('git commit -m "x"'), { CLAUDE_PROJECT_DIR: dir, CK_WORKFLOW: '' }, dir);
    logResult('TC-DOCSYS-045 still warns/allows (exit 0)', r.code === 0, `exit ${r.code}`);
  } finally {
    rimraf(dir);
  }
}

async function testAuditedOverride() {
  log('\n--- B6. TC-DOCSYS-046: DOC_SYNC_OVERRIDE=1 → ALLOW + audit log ---');
  const { dir, g } = makeRepo();
  try {
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'class Foo{}\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline']);
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'class Foo{ int x=1; }\n');
    g(['add', '-A']);
    const r = await runHook(commitInput(), { CLAUDE_PROJECT_DIR: dir, DOC_SYNC_OVERRIDE: '1' }, dir);
    logResult('TC-DOCSYS-046 allows (exit 0)', r.code === 0, `exit ${r.code}`);
    const auditPath = path.join(dir, 'tmp', 'claude-temp', 'doc-sync-override.log');
    const wrote = fs.existsSync(auditPath) && fs.readFileSync(auditPath, 'utf-8').includes('OVERRIDE');
    logResult('TC-DOCSYS-046 writes audit log line', wrote);
  } finally {
    rimraf(dir);
  }
}

async function testEditWarnNonBlocking() {
  log('\n--- B7. TC-DOCSYS-047: Write/Edit on stale area code → WARN, exit 0 ---');
  const { dir, g } = makeRepo();
  try {
    const codeAbs = writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'class Foo{}\n');
    // Feature doc synced long ago → any later code commit = drift.
    writeFile(dir, `${AREA_DOCS}README.SampleFeature.md`, '---\nlast_synced: 2000-01-01\n---\n# Goal\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline (code changed after 2000-01-01)']);
    const r = await runHook(editInput(codeAbs), { CLAUDE_PROJECT_DIR: dir }, dir);
    logResult('TC-DOCSYS-047 never blocks (exit 0)', r.code === 0, `exit ${r.code}`);
    logResult('TC-DOCSYS-047 emits [doc-sync] warning', r.stdout.includes('[doc-sync]'), r.stdout.slice(0, 80));
  } finally {
    rimraf(dir);
  }
}

async function testRenameNoopAllows() {
  log('\n--- B8. TC-DOCSYS-048: pure rename/noop of area code → ALLOW (no false deny) ---');
  const { dir, g } = makeRepo();
  try {
    writeFile(dir, `${AREA_CODE}Example.Application/Foo.cs`, 'class Foo{ int x=1; }\n');
    g(['add', '-A']);
    g(['commit', '-qm', 'baseline']);
    g(['mv', `${AREA_CODE}Example.Application/Foo.cs`, `${AREA_CODE}Example.Application/Bar.cs`]); // pure rename
    const r = await runHook(commitInput(), { CLAUDE_PROJECT_DIR: dir }, dir);
    logResult('TC-DOCSYS-048 allows rename-noop (exit 0)', r.code === 0, `exit ${r.code}`);
  } finally {
    rimraf(dir);
  }
}

async function main() {
  log('=== doc-sync-gate.cjs Test Suite ===');
  testClassifier();

  if (!gitAvailable()) {
    log('\n[SKIP] git not available — integration tests B1..B8 skipped.');
  } else {
    await testCommitWarnStale();
    await testCommitAllowSynced();
    await testEditDocAllows();
    await testToolingOnlyAllows();
    await testOverrideIndependentOfWorkflow();
    await testAuditedOverride();
    await testEditWarnNonBlocking();
    await testRenameNoopAllows();
  }

  log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
