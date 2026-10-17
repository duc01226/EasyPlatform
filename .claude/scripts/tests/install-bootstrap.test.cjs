'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sourceHooks = path.resolve(__dirname, '../../hooks');

function fixture(run) {
  // Canonical fixture root: hooks resolve the project root through process.cwd()/__dirname, which
  // are symlink-resolved (macOS /var -> /private/var), so a lexical temp spelling cannot match.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ck-install-bootstrap-')));
  const hooks = path.join(root, '.claude', 'hooks');
  fs.mkdirSync(hooks, { recursive: true });
  fs.copyFileSync(path.join(sourceHooks, 'verify-install.cjs'), path.join(hooks, 'verify-install.cjs'));
  fs.writeFileSync(path.join(root, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node .claude/hooks/verify-install.cjs' }] }] },
  }));
  try { run({ root, hooks }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

function invoke(root, cwd = root, explicit, input) {
  const env = { ...process.env };
  delete env.CLAUDE_PROJECT_DIR;
  delete env.NODE_TEST_CONTEXT;
  if (explicit !== undefined) env.CLAUDE_PROJECT_DIR = explicit;
  return spawnSync(process.execPath, [path.join(root, '.claude', 'hooks', 'verify-install.cjs')], {
    cwd, env, input, encoding: 'utf8', timeout: 10000,
  });
}

function assertWarning(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /Install incomplete/);
  assert.match(result.stderr, /Repair:.*re-export/);
  assert.doesNotMatch(result.stderr, /node:internal|Require stack:|\n\s+at /);
  assert.equal((result.stderr.match(/Install incomplete/g) || []).length, 1);
}

test('partial install without the root helper emits one actionable warning and exits zero', () => fixture(({ root }) => {
  assertWarning(invoke(root));
}));

test('partial install without a transitive root-helper dependency remains diagnosable', () => fixture(({ root, hooks }) => {
  fs.mkdirSync(path.join(hooks, 'lib'));
  fs.copyFileSync(path.join(sourceHooks, 'lib', 'project-root.cjs'), path.join(hooks, 'lib', 'project-root.cjs'));
  assertWarning(invoke(root));
}));

test('bootstrap fallback locates the project from nested cwd and explicit root', () => fixture(({ root }) => {
  const nested = path.join(root, 'src', 'nested');
  fs.mkdirSync(nested, { recursive: true });
  for (const [cwd, explicit] of [[nested, undefined], [os.tmpdir(), root], [path.parse(root).root, undefined]]) {
    const result = invoke(root, cwd, explicit);
    assertWarning(result);
    assert.match(result.stderr, /<project-root>/);
    const escapedRoot = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.doesNotMatch(result.stderr, new RegExp(escapedRoot));
  }
}));

test('bootstrap fallback respects the consuming cwd project before its own script project', () => fixture(({ root }) => {
  const consuming = path.join(root, 'consumer');
  fs.mkdirSync(path.join(consuming, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(consuming, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node .claude/hooks/missing-consumer.cjs' }] }] },
  }));
  const result = invoke(root, consuming);
  assertWarning(result);
  assert.match(result.stderr, /<project-root>/);
  const escapedConsuming = consuming.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.doesNotMatch(result.stderr, new RegExp(escapedConsuming));
  assert.match(result.stderr, /missing-consumer\.cjs/);
}));

test('complete root helper still reports a missing registered hook', () => fixture(({ root, hooks }) => {
  fs.cpSync(path.join(sourceHooks, 'lib'), path.join(hooks, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, '.claude', 'settings.json'), JSON.stringify({
    hooks: { SessionStart: [{ hooks: [{ command: 'node .claude/hooks/missing.cjs' }] }] },
  }));
  const result = invoke(root);
  assertWarning(result);
  assert.match(result.stderr, /missing\.cjs/);
  assert.doesNotMatch(result.stderr, /Root helper unavailable/);
}));

test('complete installation stays silent from root and nested cwd', () => fixture(({ root, hooks }) => {
  fs.cpSync(path.join(sourceHooks, 'lib'), path.join(hooks, 'lib'), { recursive: true });
  const nested = path.join(root, 'src');
  fs.mkdirSync(nested);
  for (const cwd of [root, nested]) {
    const result = invoke(root, cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
}));

// The stub stands in for the whole startup-install owner, so it must export the name the hook
// actually calls. `runStartupInstall` — not `buildInstallRequest` — is the boundary: the runner owns
// the per-project lock, the post-lock completeness recheck and the process-tree cleanup proof, and it
// builds the request itself. Stubbing the wrong name is silent: the hook's `catch` swallows the
// resulting TypeError exactly as it swallows a real manager failure, so the marker file is the only
// evidence that the owner was reached at all.
function guardedOwnerFixture(run) {
  fixture(({ root, hooks }) => {
    fs.cpSync(path.join(sourceHooks, 'lib'), path.join(hooks, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(hooks, 'lib', 'startup-install.cjs'), `
      const fs = require('node:fs');
      const path = require('node:path');
      module.exports = {
        runStartupInstall: async options => {
          fs.appendFileSync(
            path.join(options.projectRoot, 'guarded-owner-called'),
            JSON.stringify({ source: options.source, projectRoot: options.projectRoot }) + '\\n'
          );
          return { outcome: 'noop-no-manifest' };
        },
        formatDiagnostic: () => null
      };
    `);
    run({ root });
  });
}

function ownerCalls(root) {
  const marker = path.join(root, 'guarded-owner-called');
  if (!fs.existsSync(marker)) return [];
  return fs.readFileSync(marker, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}

test('complete startup invokes the request owner exactly once', () => guardedOwnerFixture(({ root }) => {
  const result = invoke(root, root, undefined, JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' }));
  assert.equal(result.status, 0, result.stderr);
  // Appending rather than overwriting is what makes "exactly once" assertable: an owner invoked twice
  // would have overwritten its own marker and read as a single call.
  assert.deepEqual(ownerCalls(root), [{ source: 'startup', projectRoot: root }]);
}));

// The owner decides whether to spawn a package manager, so the root it is handed is a boundary, not a
// convenience: it must be the root the integrity scan just cleared, never the session's cwd.
test('the guarded owner receives the bootstrapped project root, not the cwd', () => guardedOwnerFixture(({ root }) => {
  const nested = path.join(root, 'src', 'nested');
  fs.mkdirSync(nested, { recursive: true });
  const envelope = JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup' });
  for (const [cwd, explicit] of [[nested, undefined], [os.tmpdir(), root]]) {
    fs.rmSync(path.join(root, 'guarded-owner-called'), { force: true });
    const result = invoke(root, cwd, explicit, envelope);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(ownerCalls(root), [{ source: 'startup', projectRoot: root }], `${cwd} / ${explicit}`);
  }
}));

test('resume, empty, and malformed envelopes never invoke the guarded owner', () => guardedOwnerFixture(({ root }) => {
  for (const input of [
    JSON.stringify({ hook_event_name: 'SessionStart', source: 'resume' }),
    '',
    '{not-json'
  ]) {
    const result = invoke(root, root, undefined, input);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(path.join(root, 'guarded-owner-called')), false, input || 'empty');
  }
}));

test('settings registers exactly one startup-install owner', () => {
  const settings = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../settings.json'), 'utf8'));
  const commands = (settings.hooks?.SessionStart || []).flatMap(group => (group.hooks || []).map(hook => hook.command));
  assert.equal(commands.filter(command => command.includes('verify-install.cjs')).length, 1);
  assert.equal(commands.filter(command => command.includes('startup-install.cjs')).length, 0);
});
