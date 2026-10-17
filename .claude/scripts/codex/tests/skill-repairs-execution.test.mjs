import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
// Override is an installed .claude root, matching the other repair suites.
const sourceRoot = process.env.SKILL_REPAIRS_SOURCE_ROOT || join(root, '.claude');
const skill = (name, file = 'SKILL.md') => readFileSync(join(sourceRoot, 'skills', name, file), 'utf8');
const sandbox = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-repairs-execution-'));
  const env = {};
  for (const key of ['PATH', 'SystemRoot', 'WINDIR', 'COMSPEC', 'PATHEXT']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, { HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir,
    GIT_CONFIG_GLOBAL: join(dir, 'empty-config'), GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' });
  try { return fn(dir, env); } finally { rmSync(dir, { recursive: true, force: true }); }
};
const run = (cwd, env, cmd, args) => spawnSync(cmd, args, { cwd, env, encoding: 'utf8' });
const git = (cwd, env, ...args) => run(cwd, env, 'git', args);
const ok = (result) => { assert.equal(result.status, 0, result.stderr || result.stdout); return result.stdout.trim(); };
function init(dir, env) {
  mkdirSync(dir, { recursive: true }); ok(git(dir, env, 'init', '-q'));
  ok(git(dir, env, 'config', 'user.name', 'Fixture')); ok(git(dir, env, 'config', 'user.email', 'fixture@example.invalid'));
  ok(git(dir, env, 'config', 'commit.gpgsign', 'false'));
  writeFileSync(join(dir, 'case.txt'), 'valid\n'); ok(git(dir, env, 'add', 'case.txt')); ok(git(dir, env, 'commit', '-qm', 'fixture baseline'));
}
function snapshot(dir, env) {
  return { head: ok(git(dir, env, 'rev-parse', 'HEAD')), index: readFileSync(join(dir, '.git/index')).toString('hex') };
}

test('fixture environment excludes inherited shell, Git-template and provider inputs', () => {
  const keys = ['BASH_ENV', 'ENV', 'GIT_TEMPLATE_DIR', 'OPENAI_API_KEY', 'CK_WORKFLOW_MODE'];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    for (const key of keys) process.env[key] = 'synthetic-inherited-input';
    sandbox((dir, env) => {
      for (const key of keys) assert.equal(env[key], undefined, `Fixture inherited ${key}`);
      assert.equal(env.HOME, dir);
      assert.equal(env.GIT_CONFIG_NOSYSTEM, '1');
    });
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

for (const name of ['demo-guide', 'understand']) {
  test(`${name}: real tier table routes all boundaries and program before broad multi`, () => {
    const rows = skill(name).split('\n').filter(line => /^\s*\| \*\*S[0-4] ·/.test(line));
    assert.equal(rows.length, 5);
    const select = (input) => {
      for (const row of rows) {
        const id = row.match(/\*\*(S\d)/)[1]; const trigger = row.split('|')[2];
        const threshold = trigger.match(/([<>≥]+)\s*(\d+)\s*(?:in-scope )?files/);
        const filesMatch = threshold && (threshold[1] === '>' ? input.files > +threshold[2] : threshold[1] === '<' ? input.files < +threshold[2] : input.files >= +threshold[2]);
        const match = /Whole (?:product|repo)/.test(trigger) ? input.program :
          /One (?:case|file)/.test(trigger) ? input.point :
          /≥ 2 capabilities/.test(trigger) ? filesMatch || input.capabilities >= 2 :
          /> 6 (?:story )?groups/.test(trigger) ? filesMatch || input.groups > 6 : filesMatch && input.capabilities === 1;
        if (match) return id;
      }
      throw Error('unclassified scope');
    };
    for (const [files, expected] of [[1, 'S0'], [9, 'S1'], [10, 'S2'], [40, 'S2'], [41, 'S3'], [60, 'S3']]) {
      assert.equal(select({ files, capabilities: 1, groups: 1, point: files === 1 }), expected);
    }
    assert.equal(select({ files: 60, capabilities: 4, groups: 9, program: true, point: true }), 'S4');
    assert.equal(select({ files: 3, capabilities: 2, groups: 7 }), 'S3');
    assert.equal(select({ files: 3, capabilities: 2, groups: 2 }), 'S2');
  });
}

test('EX02/03/05: profile policies have no contradictory universal override', () => {
  const harness = skill('harness-setup');
  assert.match(harness, /No mutation tool, property tool or score threshold is universally required/);
  assert.doesNotMatch(harness, /gate on mutation score|minimum mutation-score threshold|Integration = subcutaneous CQRS/i);
  const scaffold = skill('scaffold');
  assert.match(scaffold, /Map each required foundation to an existing owner/);
  assert.match(scaffold, /SKIP only when every applicable requirement is covered/);
  assert.doesNotMatch(scaffold, /existing scaffolding found = SKIP|when grep finds NO existing|If existing scaffolding found → SKIP/);
  const integration = skill('integration-test');
  assert.match(integration, /synchronous persistence uses the normal read\/assert path/);
  assert.match(integration, /Organization follows the project-native convention/);
  assert.doesNotMatch(integration, /ALWAYS.*(?:ALL|EVERY) DB assertion|Minimum 3 test methods|verify minimum 3 tests|no ledger, no PASS|NEVER create `Queries\/`/);
});

test('EX04: collision recovery requires atomic owner/carrier migration and preserves cardinality', () => {
  const source = skill('integration-test');
  assert.match(source, /migrate the canonical ID and every configured carrier\/reference atomically/);
  assert.match(source, /preserving variants and declared many-to-many mappings/);
  assert.doesNotMatch(source, /renumber in doc only|Keep test-spec annotation unchanged/);
  assert.match(source, /If either owner\/carrier is ambiguous or outside authorized ownership, stop/);
});

test('EX06: hook instructions require isolated positive, lint-negative and absent-hook probes', () => {
  const source = skill('linter-setup');
  for (const expected of [/isolated temporary fixture repository/, /HEAD and index bytes/, /linter’s diagnostic/, /absent\/broken-hook fixture/, /clean valid fixture that succeeds/, /finally/]) assert.match(source, expected);
});

test('EX06 fixture: installed lint gate rejects exact defect; absent gate is detectable without touching original HEAD/index', { skip: process.platform === 'win32' ? 'POSIX shell-hook fixture; portable contract checked separately' : false }, () => sandbox((dir, env) => { // POSIX shell hook fixture; instruction contract covers host equivalents.
  const original = join(dir, 'original'); init(original, env);
  writeFileSync(join(original, 'pending.txt'), 'pre-existing staged work'); ok(git(original, env, 'add', 'pending.txt'));
  const before = snapshot(original, env);
  for (const installed of [true, false]) {
    const probe = join(dir, installed ? 'installed' : 'absent'); init(probe, env);
    if (installed) writeFileSync(join(probe, '.git/hooks/pre-commit'), '#!/bin/sh\nif grep -q INVALID case.txt; then echo "fixture-lint case.txt forbidden-token" >&2; exit 23; fi\n', { mode: 0o755 });
    writeFileSync(join(probe, 'case.txt'), 'INVALID\n'); ok(git(probe, env, 'add', 'case.txt'));
    const result = git(probe, env, 'commit', '-qm', 'intentional fixture defect');
    const verified = result.status !== 0 && /fixture-lint case.txt forbidden-token/.test(result.stderr);
    assert.equal(verified, installed);
    if (installed) {
      writeFileSync(join(probe, 'case.txt'), 'valid clean change\n'); ok(git(probe, env, 'add', 'case.txt'));
      ok(git(probe, env, 'commit', '-qm', 'valid fixture'));
    } else assert.equal(result.status, 0, 'absent hook must expose false verification');
    assert.deepEqual(snapshot(original, env), before);
  }
}));

test('EX07: actual documented Bash capture preserves producer failure and both streams', (t) => sandbox((dir, env) => {
  const source = skill('fix', 'references/target-logs.md');
  assert.match(source, /without rewriting the project script\/config/);
  const recipe = source.match(/\*\*Bash:\*\*[^`]*`([^`]+)`/)[1];
  const bash = run(dir, env, 'bash', ['--version']);
  if (bash.error?.code === 'ENOENT') { t.skip('Bash unavailable; instruction contract is checked in other cases'); return; }
  const manifest = join(dir, 'package.json'); writeFileSync(manifest, '{"scripts":{"test":"original"}}');
  for (const status of [0, 7]) {
    const command = `bash -c 'echo diagnostic-out; echo diagnostic-err >&2; exit ${status}'`;
    const result = run(dir, env, 'bash', ['-c', recipe.replace('<command>', command)]);
    assert.equal(result.status, status, result.stderr);
    assert.match(readFileSync(join(dir, 'logs.txt'), 'utf8'), /diagnostic-out\ndiagnostic-err/);
    assert.equal(readFileSync(manifest, 'utf8'), '{"scripts":{"test":"original"}}');
  }
}));

test('EX08: resolver returns PR candidate and only authorized standalone continuation changes history', () => {
  const source = skill('git-conflict-resolve');
  assert.match(source, /leave HEAD unchanged until the caller’s review\/commit gate/);
  assert.match(source, /Route a merge commit through `\/commit`/);
  assert.match(source, /GIT_EDITOR=true git rebase --continue/);
  assert.doesNotMatch(source, /^git commit\s*#/m);
});

test('EX08 fixture: conflicted merge can return resolved staged candidate with unchanged HEAD', () => sandbox((dir, env) => {
  const repo = join(dir, 'merge'); init(repo, env); const trunk = ok(git(repo, env, 'branch', '--show-current'));
  ok(git(repo, env, 'checkout', '-qb', 'source')); writeFileSync(join(repo, 'case.txt'), 'source\n'); ok(git(repo, env, 'add', 'case.txt')); ok(git(repo, env, 'commit', '-qm', 'source'));
  ok(git(repo, env, 'checkout', '-q', trunk)); writeFileSync(join(repo, 'case.txt'), 'target\n'); ok(git(repo, env, 'add', 'case.txt')); ok(git(repo, env, 'commit', '-qm', 'target'));
  const head = snapshot(repo, env).head;
  assert.notEqual(git(repo, env, 'merge', '--no-edit', 'source').status, 0);
  writeFileSync(join(repo, 'case.txt'), 'resolved target and source\n'); ok(git(repo, env, 'add', 'case.txt'));
  assert.equal(snapshot(repo, env).head, head); assert.ok(existsSync(join(repo, '.git/MERGE_HEAD')));
  assert.equal(ok(git(repo, env, 'diff', '--name-only', '--diff-filter=U')), '');
  assert.match(ok(git(repo, env, 'diff', '--cached')), /resolved target and source/);
}));
