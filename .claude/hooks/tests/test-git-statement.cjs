#!/usr/bin/env node
'use strict';

/**
 * Process-level tests for the shared Git/gh statement classifier in
 * lib/git-statement.cjs. All repositories, lease stores and markers are
 * synthetic temp fixtures. Policy commands are JSON input; explicit
 * argv-only Git semantic controls run in a separate owned temp repo.
 */
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { issueLease, revokeLease } = require('../lib/git-operation-lease.cjs');
const { inspectCommand } = require('../lib/command-inspection.cjs');
const { resolveGitStatement } = require('../lib/git-statement.cjs');

const shellPath = value => `'${value.replace(/'/g, `'"'"'`)}'`;
const canonical = value => {
  const resolved = fs.realpathSync.native(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

// The classifier is consumed as a library. This bootstrap reproduces the exact
// PreToolUse entrypoint the former git-commit-block.cjs hook used, so the
// process-level block/allow contract is still exercised without a wired hook.
const MODULE = path.resolve(__dirname, '..', 'lib', 'git-statement.cjs');
const RUNNER = path.resolve(__dirname, '..', 'lib', 'hook-runner.cjs');
const HOOK = MODULE;
const BOOTSTRAP = `const { evaluate } = require(${JSON.stringify(MODULE)});`
  + ` const { runPreToolHookSync } = require(${JSON.stringify(RUNNER)});`
  + ` runPreToolHookSync('git-statement', evaluate, { inputErrorCode: 2, errorExitCode: 2 });`;
let passed = 0;
let failed = 0;
const verbose = process.argv.includes('--verbose');

function logResult(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  [PASS] ${name}`); }
  else { failed++; console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ''}`); }
}

// Every assertion below reads a verdict as `result.code === 2`, so ANY path that
// yields a non-2 code without the hook having decided anything is reported as
// "the gate failed to BLOCK" — the most alarming message this suite can emit, and
// a false one. A spawn killed by `timeout` took exactly that path: node kills the
// child with SIGTERM, `close` fires with code === null, the old handler discarded
// `signal`, and null !== 2 surfaced as a security failure.
//
// The bound is MEASURED, not guessed. This script is spawned alongside four peers by
// `suites/standalone-scripts.test.cjs`, so each hook spawn competes with all of them.
// Sampling 120 spawns of the classifier under that same 5-way load on this
// Windows checkout: min 108ms · p50 297ms · p90 2851ms · p99 5875ms · max 6383ms —
// and all 120 returned code 2. The hook was never fail-open; the 5000ms bound simply
// sat BELOW the environment's own p99, so the tail was killed mid-verdict and
// misread. 30s clears the measured worst case ~4.7x while still converting a real
// hang into a NAMED failure; the parent suite's 300s script bound is the backstop for
// total runtime. Raise this only with a new measurement, never to chase a red run.
const HOOK_TIMEOUT_MS = 30_000;

function runHook(input, env = {}) {
  return new Promise(resolve => {
    const proc = spawn(process.execPath, ['-e', BOOTSTRAP], { env: { ...process.env,
      GIT_DIR: undefined, GIT_WORK_TREE: undefined, GIT_COMMON_DIR: undefined, ...env },
      stdio: ['pipe', 'pipe', 'pipe'], timeout: HOOK_TIMEOUT_MS, windowsHide: true });
    let stdout = ''; let stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk; });
    proc.stderr.on('data', chunk => { stderr += chunk; });
    // A signal-killed child never produced a verdict. Report that as its own
    // condition instead of letting `code === null` masquerade as a wrong verdict.
    // `code` stays non-2 so the assertion still FAILS — only the diagnosis changes.
    proc.on('close', (code, signal) => resolve(signal
      ? { code: null, stdout, stderr: `${stderr}[harness] hook spawn killed by ${signal} after ${HOOK_TIMEOUT_MS}ms — NO verdict was produced; this is a harness timeout, not a hook decision` }
      : { code, stdout, stderr }));
    proc.on('error', error => resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` }));
    proc.stdin.end(JSON.stringify(input));
  });
}

function bashInput(command, fixture, sessionId = '') {
  return { tool_name: 'Bash', session_id: sessionId, cwd: fixture.repo,
    tool_input: { command } };
}

async function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-policy-test-'));
  const repo = path.join(root, 'repo');
  const foreign = path.join(root, 'foreign repo');
  const store = path.join(root, 'leases');
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.mkdirSync(path.join(foreign, '.git'), { recursive: true });
  fs.mkdirSync(store);
  const session = `session-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const context = { root, repo, foreign, store, session };
  try { await fn(context); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

async function run() {
  console.log('=== git-statement.cjs classifier Test Suite ===\n');
  await fixture(async f => {
    const env = { CLAUDE_PROJECT_DIR: f.repo, CK_GIT_LEASE_STORE: f.store };
    // THE GATE IS IRREVERSIBILITY, NOT AUTHORITY. This hook blocks what cannot be undone —
    // commands that destroy uncommitted work, and destructive history rewrites. `add`, `commit` and
    // `push` are recoverable (unstage, revert, force-push back) and are NO LONGER hook-enforced;
    // the Pre-commit/Push Rules in `.claude/docs/development-rules.md` still forbid them without an explicit request,
    // as a MODEL-BEHAVIORAL rule the hook never enforces. Both halves are asserted here: what must still deny, and —
    // load-bearing — what must NOT, because an over-blocked routine path is what drives a user to
    // disable the hook and lose the destructive gate with it.
    console.log('\n--- Irreversible-operation policy ---');
    for (const command of ['git reset --hard', 'git reset --hard HEAD~3', 'git reset --merge', 'git reset --keep',
      'git checkout -- src/app.js', 'git checkout main -- src/app.js', 'git checkout .', 'git checkout -f main',
      'git restore src/app.js', 'git restore --worktree --staged src/app.js',
      'git switch --discard-changes main', 'git switch -f main',
      'git clean -f', 'git clean -fd', 'git clean -x -f', 'git rm -f x.js',
      'git push --force', 'git push -f origin main', 'git push --delete origin topic', 'git push --mirror',
      'git branch -D topic', 'git branch -M main', 'git stash drop', 'git stash clear',
      'git reflog expire --expire=now --all', 'git reflog delete HEAD@{0}',
      'git filter-branch --tree-filter x', 'git worktree remove -f wt', 'git update-ref -d refs/heads/x',
      'git read-tree --reset -u HEAD', 'git checkout "$REF" -- x', 'git reset "$MODE"']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK irreversible: ${command}`, result.code === 2, result.stderr);
    }
    // Amend is recoverable (the replaced commit stays in the reflog) and yields the same commit as
    // `reset --soft HEAD~1` + commit, which is allowed below — so it is allowed too, without a lease.
    // The review gate, not this classifier, gates it.
    const amend = await runHook(bashInput('git commit --amend --no-edit', f), env);
    logResult('ALLOW: --amend is an ordinary recoverable commit', amend.code === 0, amend.stderr);

    // Recoverable work is not this hook's business. Every one of these was blocked under the old
    // authority model and must now run — that regression is the whole point of the rework.
    for (const command of ['git add .', 'git commit -m test', 'git push', 'git push origin main',
      'git push --force-with-lease', 'git status && git push', 'git add --dry-run .; git push',
      'git add -- --dry-run', 'git add --pathspec-from-file=--dry-run', 'git.exe push', 'git.exe add file',
      '"C:/Program Files/Git/bin/git.exe" push', 'env git.exe push',
      'git branch feature-x', 'git checkout -b feature-x', 'git switch -c feature-x',
      'git checkout main', 'git switch main', 'git checkout feature/login',
      'git merge develop', 'git rebase main', 'git cherry-pick abc123', 'git revert abc123',
      'git fetch --all', 'git pull', 'git stash', 'git stash push -m wip', 'git stash pop',
      'git reset HEAD~1', 'git reset --soft HEAD~1', 'git reset HEAD -- file', 'git restore --staged x.js',
      'git clean -n', 'git rm x.js', 'git branch -d merged', 'git branch -m old new',
      'git tag -a v1 -m release', 'git tag -d v1', 'git remote add o https://example.invalid/r.git',
      'git remote remove origin', 'git remote set-url origin https://example.invalid/r.git',
      'git config user.name value', 'git config edit', 'git --no-pager stash push',
      'git worktree add wt main', 'git mv a b', 'git notes add -m x',
      `${' '.repeat(65536)}git push`]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW recoverable: ${command.length > 100 ? 'oversize command' : command}`, result.code === 0, result.stderr);
    }
    for (const command of ['git add --dry-run .', 'git add -n .', 'git --no-pager add --dry-run .',
      'git add --pathspec-from-file paths.txt --dry-run', '# only a comment', 'echo git', 'which git', 'grep git README.md',
      'git.exe status', 'git --no-pager stash list', 'git -c color.ui=false stash show',
      `git -C "${f.repo}" branch -a`, `git --git-dir="${path.join(f.repo, '.git')}" tag --list`,
      'git --no-pager config --get user.name', 'git --no-pager remote -v']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW read control: ${command}`, result.code === 0, result.stderr);
    }
    // A global option must not hide the destructive spelling behind it.
    for (const command of ['git --no-pager branch -D topic', 'git -c color.ui=false clean -fd',
      'git --work-tree=missing branch -D topic', 'git --git-dir=missing reset --hard']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK global-option destructive: ${command}`, result.code === 2, result.stderr);
    }

    console.log('\n--- Destructive spellings vs their recoverable neighbours ---');
    // The pairs that decide whether the denylist reads flags at all. Each left-hand command differs
    // from its right-hand neighbour by ONE flag or operand, and only the left one destroys work.
    for (const [destructive, recoverable] of [
      ['git reset --hard HEAD~1', 'git reset --soft HEAD~1'],
      ['git clean -fd', 'git clean -n'],
      ['git push --force', 'git push --force-with-lease'],
      ['git branch -D topic', 'git branch -d topic'],
      ['git checkout -- app.js', 'git checkout main'],
      ['git checkout -f main', 'git checkout -b main'],
      ['git restore app.js', 'git restore --staged app.js'],
      ['git switch --discard-changes main', 'git switch -c main'],
      ['git stash drop', 'git stash push'],
      ['git rm -f app.js', 'git rm app.js']
    ]) {
      const denied = await runHook(bashInput(destructive, f, f.session), env);
      logResult(`BLOCK destructive: ${destructive}`, denied.code === 2 && denied.stdout === '', denied.stderr);
      const allowed = await runHook(bashInput(recoverable, f, f.session), env);
      logResult(`ALLOW recoverable neighbour: ${recoverable}`, allowed.code === 0 && allowed.stdout === '', allowed.stderr);
    }
    for (const command of ['git status', 'git diff --stat', 'git log -1', 'git show HEAD', 'git branch -a', 'git remote -v',
      'git rev-parse HEAD', 'git describe --tags', 'git tag -l', 'git blame file', 'git check-ignore file', 'git ls-files',
      'git stash list', 'git stash show', 'git config --get user.name', 'git config user.name']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW: ${command}`, result.code === 0, result.stderr);
    }

    console.log('\n--- Shell wrappers and opaque Git syntax ---');
    // A wrapper's payload is parsed and classified, not denied on sight: `sh -c "git status"` is a
    // read no matter how it is spelled. Only a payload that cannot be read statically denies closed.
    for (const command of ['env git reset --hard', 'command git clean -fd', 'sudo git checkout -- x.js',
      'sh -c "git reset --hard"', 'bash -c "git clean -fd"', 'bash -c \'sh -c "git stash drop"\'',
      'echo $(git push --force)', 'git commit $(printf --amend) -m x',
      `GIT_DIR="$(pwd)/${path.basename(f.foreign)}/.git" git reset --hard`]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK wrapper/opaque: ${command}`, result.code === 2, result.stderr);
    }
    for (const command of ['env git push', 'command git push', 'sudo git commit -m x',
      'sh -c "git commit -m x"', 'sh -c "git status"', 'bash -c "git checkout -b feature"',
      'git branch -a', 'git branch --list topic', 'git tag -l', 'git remote -v',
      'git stash list', 'git stash show']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW wrapper/read selector: ${command}`, result.code === 0, result.stderr);
    }

    console.log('\n--- Global options and effective repository ---');
    // A destructive command aimed at ANOTHER repository is still destructive. An unresolvable target
    // denies closed for the same reason: there is no repository whose lease could cover it.
    for (const command of [`git -C ${shellPath(f.foreign)} reset --hard`, `git --git-dir=${shellPath(f.foreign)} clean -fd`,
      `GIT_DIR=${shellPath(f.foreign)} git reset --hard`, `git -C ${shellPath(f.repo)} -C ${shellPath(f.foreign)} push --force`,
      'git -C missing reset --hard', 'git --git-dir clean -fd']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK target: ${command}`, result.code === 2, result.stderr);
    }
    for (const command of ['echo "git push"', 'cat README.md | grep "git commit"', 'git status && git diff',
      `git -C ${shellPath(f.foreign)} commit -m x`, `GIT_DIR=${shellPath(f.foreign)} git commit -m x`]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW inert/read-only/recoverable: ${command}`, result.code === 0, result.stderr);
    }

    console.log('\n--- Exact session/repository/operation lease ---');
    // Every destructive git spelling consumes the ONE `discard` term. `add`/`commit`/`push` remain
    // mintable for the gh publish gate below, but no longer gate anything on the git side.
    const wrongTermLease = issueLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session,
      sourceRequest: 'synthetic explicit request', operations: ['commit', 'add', 'push'], storeDir: f.store });
    const resetWithWrongTerm = await runHook(bashInput('git reset --hard', f, f.session), env);
    logResult('a destructive command cannot borrow an add/commit/push lease',
      resetWithWrongTerm.code === 2 && resetWithWrongTerm.stdout === '', resetWithWrongTerm.stderr);
    revokeLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session, leaseId: wrongTermLease.leaseId, storeDir: f.store });

    const lease = issueLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session,
      sourceRequest: 'synthetic explicit discard request', operations: ['discard'], storeDir: f.store });
    for (const [command, sid, expected] of [
      ['git reset --hard', f.session, 0], ['git clean -fd', f.session, 0], ['git branch -D topic', f.session, 0],
      ['git reset --hard', `${f.session}-other`, 2]
    ]) {
      const result = await runHook(bashInput(command, f, sid), env);
      logResult(`LEASE discard ${command} (${sid === f.session ? 'matching' : 'wrong session'})`, result.code === expected, result.stderr);
    }
    // Invariant: initial-repository consent cannot authorize an unknown shell cwd. The lease is
    // scoped to a repository, and a navigation this hook cannot follow makes the repository a guess.
    fs.mkdirSync(path.join(f.repo, 'nested', '.git'), { recursive: true });
    for (const command of ['cd nested && git reset --hard', 'pushd nested; git clean -fd',
      'popd; git reset --hard', 'false && cd nested; git reset --hard', 'cd missing || git reset --hard',
      'cd nested && git.exe reset --hard', 'builtin cd nested; git reset --hard',
      'command cd nested; git reset --hard', 'eval "cd nested"; git reset --hard']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK navigation with lease: ${command}`, result.code === 2 && result.stderr.includes('git -C'), result.stderr);
    }
    for (const command of [`git -C "${f.repo}" reset --hard`, 'git.exe reset --hard', 'git clean -fd']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW explicit-scope control: ${command}`, result.code === 0, result.stderr);
    }

    // Invariant: amend is recoverable (reflog), so this hook allows every spelling git accepts without
    // a lease; the review gate owns amend detection (review-commit-gate.test.cjs, REQ-GUARD-03).
    for (const command of ['git commit --amend', 'git commit --amen --no-edit', 'git commit --ame --no-edit', 'git commit --am --no-edit',
      'git commit --amend=x', 'git commit -m x --amen',
      'git commit --no-edit --am', 'git commit --author me --amend', 'git commit --amend -- --amend']) {
      const result = await runHook(bashInput(command, f), env);
      logResult(`ALLOW amend spelling without lease: ${command}`, result.code === 0, result.stderr);
    }
    const foreignCommand = `git -C ${shellPath(f.foreign)} reset --hard`;
    const parsedForeign = resolveGitStatement(inspectCommand(foreignCommand).statements[0], f.repo, {});
    logResult('quoted foreign path resolves to the exact repository', parsedForeign.known && canonical(parsedForeign.repository) === canonical(f.foreign));
    const wrongLeaseResult = await runHook(bashInput(foreignCommand, f, f.session), env);
    logResult('LEASE wrong repository is denied', wrongLeaseResult.code === 2, wrongLeaseResult.stderr);
    // Invariant: worktree identity must not hide storage selected from another repository.
    const mixedCommands = [
      `git --git-dir=${shellPath(path.join(f.foreign, '.git'))} --work-tree=${shellPath(f.repo)} reset --hard`,
      `git --work-tree=${shellPath(f.foreign)} reset --hard`,
      'git --bare reset --hard',
      `GIT_DIR=${shellPath(path.join(f.foreign, '.git'))} GIT_WORK_TREE=${shellPath(f.repo)} git reset --hard`,
      `GIT_COMMON_DIR=${shellPath(path.join(f.foreign, '.git'))} git reset --hard`
    ];
    const foreignLease = issueLease({ projectDir: f.repo, repository: f.foreign, sessionId: f.session,
      sourceRequest: 'synthetic foreign', operations: ['discard'], storeDir: f.store });
    const foreignResult = await runHook(bashInput(foreignCommand, f, f.session), env);
    logResult('LEASE exact foreign repository is allowed', foreignResult.code === 0, foreignResult.stderr);
    for (const command of mixedCommands) {
      const resolved = resolveGitStatement(inspectCommand(command).statements[0], f.repo, {});
      logResult(`mixed target resolver rejects: ${command}`, !resolved.known);
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`mixed target process denies: ${command}`, result.code === 2, result.stderr);
    }
    const redirectedEnv = { ...env, GIT_DIR: path.join(f.foreign, '.git'), GIT_WORK_TREE: f.repo };
    const inheritedRedirect = await runHook(bashInput('git reset --hard', f, f.session), redirectedEnv);
    logResult('inherited mixed Git storage cannot borrow a worktree lease', inheritedRedirect.code === 2, inheritedRedirect.stderr);
    const explicitOverride = await runHook(bashInput(`git --git-dir=${shellPath(path.join(f.repo, '.git'))} reset --hard`, f, f.session), redirectedEnv);
    logResult('explicit Git directory overrides inherited storage when worktree matches', explicitOverride.code === 0, explicitOverride.stderr);
    const linked = path.join(f.root, 'linked worktree');
    const linkedStorage = path.join(f.repo, '.git', 'worktrees', 'linked');
    fs.mkdirSync(linked);
    fs.mkdirSync(linkedStorage, { recursive: true });
    fs.writeFileSync(path.join(linked, '.git'), `gitdir: ${linkedStorage}\n`);
    fs.writeFileSync(path.join(linkedStorage, 'commondir'), '../..\n');
    const linkedLease = issueLease({ projectDir: f.repo, repository: linked, sessionId: f.session,
      sourceRequest: 'synthetic linked', operations: ['discard'], storeDir: f.store });
    for (const command of [
      `git --git-dir=${shellPath(path.join(f.foreign, '.git'))} --work-tree=${shellPath(f.foreign)} reset --hard`,
      `git -C ${shellPath(linked)} reset --hard`,
      `git -C ${shellPath(f.repo)} --git-dir=.git reset --hard`,
      `git -C ${shellPath(f.repo)} --work-tree=. reset --hard`,
      `git --git-dir=${shellPath(linkedStorage)} --work-tree=${shellPath(linked)} reset --hard`
    ]) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`matching storage/worktree is allowed: ${command}`, result.code === 0, result.stderr);
    }
    const linkedCommand = `git -C ${shellPath(linked)} reset --hard`;
    fs.writeFileSync(path.join(linked, '.git'), `gitdir: ${path.relative(linked, linkedStorage)}\n`);
    const relativeLinkResult = await runHook(bashInput(linkedCommand, f, f.session), env);
    logResult('relative linked gitfile preserves exact worktree lease', relativeLinkResult.code === 0, relativeLinkResult.stderr);
    for (const marker of ['not a Git marker', 'gitdir: missing\n', `gitdir: ${'x'.repeat(4096)}`]) {
      fs.writeFileSync(path.join(linked, '.git'), marker);
      const result = await runHook(bashInput(linkedCommand, f, f.session), env);
      logResult('malformed or unresolved linked gitfile cannot authorize a lease', result.code === 2, result.stderr);
    }
    revokeLease({ projectDir: f.repo, repository: linked, sessionId: f.session, leaseId: linkedLease.leaseId, storeDir: f.store });
    revokeLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session, leaseId: lease.leaseId, storeDir: f.store });
    revokeLease({ projectDir: f.repo, repository: f.foreign, sessionId: f.session, leaseId: foreignLease.leaseId, storeDir: f.store });
    const after = await runHook(bashInput('git reset --hard', f, f.session), env);
    logResult('LEASE revoked immediately denies', after.code === 2, after.stderr);

    // The GitHub CLI reaches the same remote effects as `git push` without ever spelling `git`, so
    // it is classified by the SAME irreversibility test rather than a separate authority rule.
    // `gh pr create`, `gh pr merge` and `gh release create` all publish, but each is closeable,
    // revertable or deletable afterwards — so, like `git push` itself, they are no longer gated
    // here and stay bound by CLAUDE.md rule 1 (never publish unless the user asked). Deleting a
    // repository, a release, a secret or a cache is not undoable, and that is what still denies.
    console.log('\n--- GitHub CLI irreversibility ---');
    for (const command of ['gh pr view 12', 'gh pr list', 'gh pr diff 12', 'gh pr checks 12',
      'gh run list --limit 5', 'gh run view 9', 'gh repo view', 'gh browse',
      'gh release list', 'gh workflow list', 'gh repo deploy-key list', 'gh auth status',
      'gh issue list --state open', 'gh extension list',
      'gh pr create --title x --body y', 'gh pr merge 12 --squash', 'gh pr close 12',
      'gh pr review 12 --approve', 'gh pr comment 12 --body hi', 'gh issue create --title x',
      'gh issue close 3', 'gh release create v1.0', 'gh release upload v1.0 dist.zip',
      'gh repo create o/r --public', 'gh repo fork o/r', 'gh workflow run ci.yml',
      'gh workflow disable ci.yml', 'gh run rerun 9', 'gh run cancel 9',
      'gh secret set TOKEN --body v', 'gh variable set NAME --body v', 'gh label create bug',
      'gh gist create note.txt', 'gh ssh-key add key.pub', 'gh gpg-key add key.asc',
      'bash -c "gh pr merge 12"', 'sh -c "gh release create v1"',
      'gh pr merge 12 --repo other/repo', 'gh release create v1 --repo=other/repo']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`ALLOW gh recoverable: ${command}`, result.code === 0, result.stderr);
    }
    for (const command of ['gh issue delete 3', 'gh release delete v1.0', 'gh repo delete o/r',
      'gh repo archive o/r', 'gh cache delete 1', 'gh label delete bug',
      'gh codespace delete --codespace c', 'gh project item-delete 1',
      'gh api -X POST repos/o/r/issues', 'gh api -XPOST repos/o/r/issues',
      'gh api --method DELETE repos/o/r', 'gh api --method=PATCH repos/o/r',
      'gh api graphql -f query=mutation', 'gh api repos/o/r/issues --input body.json',
      'gh api repos/o/r/issues -F title=@t.txt']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK gh irreversible: ${command}`, result.code === 2 && result.stderr.includes('GitHub CLI'), result.stderr);
    }
    // Unknown SPELLING still denies for an irreversible verb: a dynamic argument or a `--repo`
    // target no local lease can identify both defeat the parse the classification depends on.
    for (const command of ['gh repo delete "$REPO"', 'gh repo delete $(cat name)',
      'gh repo delete other/repo --yes', 'gh release delete v1 --repo=other/repo']) {
      const result = await runHook(bashInput(command, f, f.session), env);
      logResult(`BLOCK gh unparseable: ${command}`, result.code === 2 && result.stderr.includes('GitHub CLI'), result.stderr);
    }
    // An irreversible gh action consumes a `push` lease: it reaches the remote exactly as
    // `git push` does, and inventing a term no issuer can mint would make the gate unclearable
    // even with explicit user consent.
    const ghLease = issueLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session,
      sourceRequest: 'synthetic gh publish', operations: ['push'], storeDir: f.store });
    for (const [command, sid, expected] of [
      ['gh release delete v1.0', f.session, 0],
      ['gh repo archive o/r', f.session, 0],
      ['gh release delete v1.0', `${f.session}-other`, 2],
      ['gh release delete v1.0 --repo other/repo', f.session, 2]
    ]) {
      const result = await runHook(bashInput(command, f, sid), env);
      logResult(`LEASE gh ${command} (${sid === f.session ? 'matching' : 'wrong session'})`, result.code === expected, result.stderr);
    }
    revokeLease({ projectDir: f.repo, repository: f.repo, sessionId: f.session, leaseId: ghLease.leaseId, storeDir: f.store });
    const ghAfterRevoke = await runHook(bashInput('gh release delete v1.0', f, f.session), env);
    logResult('LEASE revoked immediately denies gh irreversible action', ghAfterRevoke.code === 2, ghAfterRevoke.stderr);

    console.log('\n--- Marker and input isolation ---');
    const marker = path.join(f.repo, 'tmp', 'claude-temp', '.commit-skill-active');
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, 'legacy marker');
    const markerResult = await runHook(bashInput('git reset --hard', f, f.session), env);
    logResult('legacy marker cannot authorize Git', markerResult.code === 2, markerResult.stderr);
    fs.rmSync(path.dirname(marker), { recursive: true, force: true });
    const nonBash = await runHook({ tool_name: 'Read', tool_input: { file_path: 'file' } }, env);
    logResult('non-Bash passthrough', nonBash.code === 0);
    const malformed = await runHook({ tool_name: 'Bash', tool_input: { command: 42 } }, env);
    logResult('non-string command is denied with a diagnostic', malformed.code === 2 && malformed.stderr.includes('Unable to evaluate'));
    const message = await runHook(bashInput('git reset --hard', f), env);
    logResult('missing session denies irreversible operation',
      message.code === 2 && message.stderr.includes('IRREVERSIBLE') && message.stderr.includes('git stash push'));
    if (verbose) console.log(message.stderr);
  });
  await realGitIrreversibilityControls();
  destructiveClassifierMutants();
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
}

/**
 * The denylist rests on a FACTUAL claim about git — that these spellings destroy work nothing can
 * bring back, and that their one-flag neighbours do not. A table of flags asserted against another
 * table of flags would only ask the implementation what it believes, so the claim is measured
 * against real git in an isolated repository instead.
 */
async function realGitIrreversibilityControls() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'git-irreversibility-'));
  try {
    // No inherited repository/config identity, user hooks, signing or external shell.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
    Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(root, 'global'),
      GIT_AUTHOR_NAME: 'Synthetic', GIT_AUTHOR_EMAIL: 'synthetic@example.invalid',
      GIT_COMMITTER_NAME: 'Synthetic', GIT_COMMITTER_EMAIL: 'synthetic@example.invalid' });
    const attempt = args => spawnSync('git', args, { cwd: root, env, encoding: 'utf8', shell: false, windowsHide: true });
    const git = args => {
      const result = attempt(args);
      assert.equal(result.status, 0, `${args.join(' ')}: ${result.error || result.stderr}`);
      return result.stdout.trim();
    };
    const tracked = path.join(root, 'tracked.txt');
    git(['init', '--quiet', '--template=']);
    fs.writeFileSync(tracked, 'committed\n');
    git(['add', 'tracked.txt']);
    git(['commit', '--quiet', '--no-gpg-sign', '-m', 'base']);
    const base = git(['rev-parse', '--abbrev-ref', 'HEAD']);

    // 1. UNCOMMITTED WORK. `--soft` keeps the edit; `--hard` is the only copy's last moment.
    fs.writeFileSync(tracked, 'unsaved edit\n');
    git(['reset', '--soft', 'HEAD']);
    assert.equal(fs.readFileSync(tracked, 'utf8'), 'unsaved edit\n', 'reset --soft must preserve the working tree');
    git(['reset', '--hard', 'HEAD']);
    assert.equal(fs.readFileSync(tracked, 'utf8'), 'committed\n', 'reset --hard must overwrite the working tree');

    // 2. UNTRACKED FILES. `-n` previews; `-fd` deletes, and nothing in git ever held a copy.
    const untracked = path.join(root, 'scratch', 'notes.txt');
    fs.mkdirSync(path.dirname(untracked), { recursive: true });
    fs.writeFileSync(untracked, 'never added\n');
    git(['clean', '-nd']);
    assert.ok(fs.existsSync(untracked), 'clean -n must only preview');
    git(['clean', '-fd']);
    assert.ok(!fs.existsSync(untracked), 'clean -fd must delete untracked files');

    // 3. UNMERGED BRANCH. `-d` refuses on its own; `-D` orphans the commits it names.
    git(['checkout', '--quiet', '-b', 'topic']);
    fs.writeFileSync(path.join(root, 'topic.txt'), 'topic work\n');
    git(['add', 'topic.txt']);
    git(['commit', '--quiet', '--no-gpg-sign', '-m', 'topic']);
    git(['checkout', '--quiet', base]);
    assert.notEqual(attempt(['branch', '-d', 'topic']).status, 0, 'branch -d must refuse an unmerged branch');
    assert.equal(attempt(['branch', '-D', 'topic']).status, 0, 'branch -D must delete it anyway');

    // 4. WORKING-TREE OVERWRITE by pathspec — the classic silent loss of an agent-unseen edit.
    fs.writeFileSync(tracked, 'second unsaved edit\n');
    git(['checkout', '--', 'tracked.txt']);
    assert.equal(fs.readFileSync(tracked, 'utf8'), 'committed\n', 'checkout -- <path> must overwrite the working tree');

    logResult('real isolated Git: every gated spelling destroys work its neighbour preserves', true);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

/**
 * Mutation-test the LIVE classifier. Each mutation is a plausible simplification of the
 * irreversibility rules; the oracle must reject every one of them, which is what proves the rules
 * are load-bearing rather than decorative.
 */
function destructiveClassifierMutants() {
  const source = fs.readFileSync(HOOK, 'utf8');
  const mutations = [
    // `git clean -fd` is the single most destructive spelling in the file, and it is a CLUSTER.
    ['cluster-expansion-dropped', 'if (/^-[A-Za-z]{2,}$/.test(name)) {', 'if (false) {'],
    // Without the dot heuristic a bare `git checkout app.js` reads as a branch switch.
    ['pathspec-heuristic-dropped', "return lastSegment.includes('.') && !/^HEAD[~^]/.test(value);", 'return false;'],
    // `--` makes everything after it a pathspec; ignoring that hides the explicit form.
    ['terminator-pathspec-dropped', 'if (terminator !== -1) return args.length > terminator + 1;', 'if (terminator !== -1) return false;'],
    // `--staged` ALONE is recoverable; every other restore form overwrites the working tree.
    ['restore-always-recoverable', 'if (!staged || worktree) {', 'if (false) {'],
    // An operand this hook could not read could BE the destructive flag.
    ['opaque-operand-ignored', "if ((flags || subcommands || operation === 'restore') && args.includes(null)) {", 'if (false) {'],
    // The subcommand is the first non-flag operand, not literally the first token.
    ['subcommand-position-naive', "const first = args.find(value => value !== null && !value.startsWith('-'));", 'const first = args[0];']
  ];
  const oracle = api => {
    const reason = command => {
      const argv = inspectCommand(command).statements[0].argv;
      return api.irreversibleReason(argv[1]?.value, argv);
    };
    for (const [command, destructive] of [
      ['git reset --hard', true], ['git reset --hard HEAD~3', true], ['git reset --merge', true],
      ['git reset --soft HEAD~1', false], ['git reset HEAD -- file', false],
      ['git clean -fd', true], ['git clean -f', true], ['git clean -x -f', true], ['git clean -n', false],
      ['git push --force', true], ['git push --delete origin topic', true],
      ['git push --force-with-lease', false], ['git push origin main', false],
      ['git branch -D topic', true], ['git branch -M main', true], ['git branch -d merged', false],
      ['git checkout main -- src/app.js', true], ['git checkout app.js', true], ['git checkout .', true],
      ['git checkout -f main', true], ['git checkout main', false], ['git checkout -b feature', false],
      ['git restore app.js', true], ['git restore --worktree --staged app.js', true],
      ['git restore --staged app.js', false],
      ['git switch --discard-changes main', true], ['git switch -c topic', false],
      ['git stash drop', true], ['git stash -q drop', true], ['git stash clear', true],
      ['git stash push -m wip', false], ['git stash pop', false],
      ['git reflog expire --expire=now', true], ['git reflog show', false],
      ['git filter-branch --all', true], ['git rm -f x.js', true], ['git rm x.js', false],
      ['git update-ref -d refs/heads/x', true], ['git read-tree --reset -u HEAD', true],
      ['git reset "$MODE"', true], ['git checkout "$REF" -- x', true],
      ['git status', false], ['git commit -m x', false], ['git merge develop', false],
      ['git rebase main', false], ['git tag -d v1', false], ['git config user.name value', false]
    ]) {
      assert.equal(Boolean(reason(command)), destructive, command);
    }
  };
  oracle(require(HOOK));
  for (const [name, anchor, replacement] of mutations) {
    assert.equal(source.split(anchor).length - 1, 1, `Unique mutation anchor: ${name}`);
    const sandbox = { require: createRequire(HOOK), module: { exports: {} }, process, Buffer, __filename: HOOK, __dirname: path.dirname(HOOK) };
    new vm.Script(source.replace(anchor, replacement), { filename: `mutant-${name}.cjs` }).runInNewContext(sandbox);
    assert.throws(() => oracle(sandbox.module.exports), { code: 'ERR_ASSERTION' }, name);
    logResult(`KILLED classifier mutant: ${name}`, true);
  }
}

run().catch(error => { console.error(error); process.exit(1); });
