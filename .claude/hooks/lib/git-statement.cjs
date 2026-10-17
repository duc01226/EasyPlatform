#!/usr/bin/env node
'use strict';

/**
 * Shared Git / GitHub CLI statement classifier.
 *
 * Extracted from the former `git-commit-block.cjs` PreToolUse hook, which has
 * been removed. `review-commit-gate.cjs` is now the only consumer. It parses
 * every static Bash statement with the shared tokenizer, normalizes Git global
 * options and effective repository identity, then classifies each statement as
 * allow / protected (irreversible) / deny / unknown. Classification is a pure
 * function — each caller owns its own policy and lease handling.
 */
const fs = require('node:fs');
const path = require('node:path');
const { inspectCommand } = require('./command-inspection.cjs');
const { checkLease } = require('./git-operation-lease.cjs');
const { resolveProjectRoot } = require('./project-root.cjs');
const { reportHookInternalError } = require('./debug-log.cjs');

const GLOBAL_OPTION_ARITY = new Map([
  ['-C', 1], ['--git-dir', 1], ['--work-tree', 1], ['--namespace', 1],
  ['--exec-path', 1], ['--config-env', 1], ['-c', 1], ['--super-prefix', 1],
  ['--attr-source', 1], ['--literal-pathspecs', 0], ['--glob-pathspecs', 0],
  ['--noglob-pathspecs', 0], ['--paginate', 0], ['--no-pager', 0],
  ['--no-replace-objects', 0], ['--bare', 0], ['--version', 0], ['--help', 0]
]);
const SHELL_WRAPPERS = new Set([
  'bash', 'sh', 'zsh', 'dash', 'ksh', 'fish', 'pwsh', 'powershell', 'cmd',
  'env', 'sudo', 'command', 'builtin', 'exec', 'eval', 'time', 'timeout', 'xargs'
]);

// `gh` is a SECOND path to the same irreversible remote effects this hook
// exists to gate. `gh pr merge`, `gh release create` and `gh api -X POST`
// publish without ever running `git push`, so gating only the `git` executable
// left the entire class open — a hook that blocks `git push` while `gh pr
// merge` walks past it is not a git-authority gate, it is a spelling filter.
//
// Modeled as an ALLOWLIST OF WRITES: an unmodeled `gh` subcommand stays
// ALLOWED. That is deliberately fail-OPEN, and deliberately the opposite of
// this hook's stance everywhere else. The reason is the failure mode that
// actually bites: `gh` is overwhelmingly read (`pr view`, `run list`, `api`
// GETs), a denylist mis-modeled in the safe direction blocks routine
// inspection on every turn, and an agent that cannot read its own CI falls
// back to disabling the hook — which loses the write gate too. So the residual
// is named rather than hidden: a gh write verb absent from these tables is
// NOT gated until it is added here.
//
// Fail-CLOSED still applies to anything unparseable (dynamic argument, shell
// wrapper, `--repo` naming a repository whose identity this hook cannot match
// against a lease). Unknown SPELLING denies; unknown VERB allows.
const GH_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const GH_WRITE_ACTIONS = new Map([
  ['pr', new Set(['create', 'merge', 'close', 'reopen', 'edit', 'review', 'comment', 'ready', 'lock', 'unlock'])],
  ['issue', new Set(['create', 'close', 'reopen', 'edit', 'comment', 'delete', 'lock', 'unlock', 'pin', 'unpin', 'transfer', 'develop'])],
  ['release', new Set(['create', 'delete', 'edit', 'upload', 'delete-asset'])],
  ['repo', new Set(['create', 'delete', 'edit', 'fork', 'rename', 'archive', 'unarchive', 'sync'])],
  ['workflow', new Set(['run', 'enable', 'disable'])],
  ['run', new Set(['rerun', 'cancel', 'delete'])],
  ['secret', new Set(['set', 'delete'])],
  ['variable', new Set(['set', 'delete'])],
  ['label', new Set(['create', 'delete', 'edit', 'clone'])],
  ['gist', new Set(['create', 'delete', 'edit', 'rename'])],
  ['cache', new Set(['delete'])],
  ['ssh-key', new Set(['add', 'delete'])],
  ['gpg-key', new Set(['add', 'delete'])],
  ['codespace', new Set(['create', 'delete', 'edit', 'stop', 'rebuild'])],
  ['project', new Set(['create', 'delete', 'edit', 'close', 'copy', 'link', 'unlink',
    'mark-template', 'item-create', 'item-delete', 'item-edit', 'item-archive'])]
]);

// Destruction, not publication, is what stays gated. A delete/archive/rename removes or renders
// unreachable something the remote holds as the only copy; a create/merge/edit can be undone from
// the GitHub side. `api` with a mutating method is included because the hook cannot see what the
// call does — only that it can be a DELETE.
const GH_IRREVERSIBLE = /\b(?:delete|delete-asset|archive|rename|transfer)\b|^api\b/i;

function basename(value) {
  return String(value || '').replace(/^.*[\\/]/, '').toLowerCase();
}

function executableName(value) {
  return basename(value).replace(/\.exe$/, '');
}

function canonical(value) {
  if (typeof value !== 'string' || value.length === 0 || !path.isAbsolute(value)) return null;
  try {
    const resolved = fs.realpathSync.native(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
      reportHookInternalError('git-statement', 'canonical path resolution failed', error);
    }
    return null;
  }
}

function absoluteFrom(value, base) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) return null;
  const raw = path.isAbsolute(value) ? value : path.resolve(base, value);
  return canonical(raw);
}

function findRepository(start) {
  let current = canonical(start);
  if (!current) return null;
  while (current) {
    const marker = path.join(current, '.git');
    try {
      if (fs.existsSync(marker)) return canonical(current);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
        reportHookInternalError('git-statement', 'repository marker probe failed', error);
      }
      return null;
    }
    const parent = canonical(path.dirname(current));
    if (!parent || parent === current) break;
    current = parent;
  }
  return null;
}

function workTreeGitDirectory(repository) {
  if (!repository) return null;
  const marker = path.join(repository, '.git');
  try {
    const stat = fs.statSync(marker);
    if (stat.isDirectory()) return canonical(marker);
    if (!stat.isFile() || stat.size > 4096) return null;
    const match = /^gitdir: ([^\r\n]+)\r?\n?$/.exec(fs.readFileSync(marker, 'utf8'));
    const directory = match && absoluteFrom(match[1], repository);
    return directory && fs.statSync(directory).isDirectory() ? directory : null;
  } catch (error) {
    if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') {
      reportHookInternalError('git-statement', 'Git storage marker probe failed', error);
    }
    return null;
  }
}

function optionParts(value) {
  if (typeof value !== 'string') return { name: '', inline: undefined };
  const index = value.indexOf('=');
  return index < 0 ? { name: value, inline: undefined } : { name: value.slice(0, index), inline: value.slice(index + 1) };
}

/**
 * Resolve the repository for one parsed Git statement. `-C` is folded in
 * order; path-changing options and leading GIT_* assignments are retained.
 * Any dynamic/malformed/foreign target returns `known:false`, so callers can
 * deny protected operations without falling back to the hook project root.
 */
function resolveGitStatement(statement, initialCwd, env = process.env) {
  let cwd = canonical(initialCwd);
  if (!cwd) return { known: false, reason: 'invalid statement cwd', repository: null, operation: null };
  const assignments = new Map(['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']
    .filter(name => typeof env[name] === 'string').map(name => [name, env[name]]));
  for (const assignment of statement.assignments || []) {
    if (['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR'].includes(assignment.name) && !assignment.static) {
      return { known: false, reason: 'dynamic Git repository assignment', repository: null, operation: null };
    }
    if (!assignment.static || !['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR'].includes(assignment.name)) continue;
    assignments.set(assignment.name, assignment.assignmentValue);
  }
  let gitDir = assignments.get('GIT_DIR');
  let workTree = assignments.get('GIT_WORK_TREE');
  let bare = false;
  let index = 1;
  const argv = statement.argv || [];
  let operation = null;
  let terminator = false;
  for (const token of argv.slice(1)) {
    if (token && token.static === false) {
      return { known: false, reason: 'dynamic Git argument', repository: null, operation: null };
    }
  }
  const resolveOptionValue = (name, inline) => {
    if (inline !== undefined) return inline;
    const next = argv[index++];
    return next && next.static ? next.value : null;
  };
  while (index < argv.length) {
    const token = argv[index++];
    if (!token || !token.static) return { known: false, reason: 'dynamic Git argument', repository: null, operation: null };
    const value = token.value;
    if (terminator) { operation = basename(value); break; }
    if (value === '--') { terminator = true; continue; }
    const { name, inline } = optionParts(value);
    const arity = GLOBAL_OPTION_ARITY.get(name);
    if (arity !== undefined) {
      if (name === '--bare') bare = true;
      if (arity === 1) {
        const argument = resolveOptionValue(name, inline);
        if (typeof argument !== 'string' || argument.length === 0) return { known: false, reason: `missing ${name} value`, repository: null, operation: null };
        if (name === '-C') {
          cwd = absoluteFrom(argument, cwd);
          if (!cwd) return { known: false, reason: 'unresolvable -C target', repository: null, operation: null };
        } else if (name === '--git-dir') gitDir = argument;
        else if (name === '--work-tree') workTree = argument;
      }
      continue;
    }
    if (value.startsWith('-')) {
      // Unknown global options may carry a value. Do not guess its arity:
      // treating the statement as unknown prevents protected fall-through.
      return { known: false, reason: `unsupported Git global option ${value}`, repository: null, operation: null };
    }
    operation = basename(value);
    break;
  }
  if (!operation) return { known: false, reason: 'missing Git operation', repository: null, operation: null };
  // Keep option roles relative to the parsed operation, not a fixed argv offset.
  const operationArgv = [argv[0], argv[index - 1], ...argv.slice(index)];
  if (bare || assignments.has('GIT_COMMON_DIR')) {
    return { known: false, reason: 'bare or explicit Git common directory requires separate scope verification', repository: null, operation, operationArgv };
  }
  const resolvedWorkTree = workTree === undefined ? cwd : absoluteFrom(workTree, cwd);
  if (!resolvedWorkTree) return { known: false, reason: 'unresolvable work tree', repository: null, operation, operationArgv };
  // Git discovers storage from cwd, not --work-tree. A lease's worktree path
  // must identify that same storage, including gitfiles used by linked worktrees.
  const repository = workTree === undefined ? findRepository(cwd) : resolvedWorkTree;
  const workTreeStorage = workTreeGitDirectory(repository);
  const storage = gitDir === undefined ? workTreeGitDirectory(findRepository(cwd)) : absoluteFrom(gitDir, cwd);
  if (!repository || !storage || storage !== workTreeStorage) {
    return { known: false, reason: 'Git storage and worktree identity cannot be matched', repository: null, operation, operationArgv };
  }
  return { known: true, reason: null, repository, operation, cwd: resolvedWorkTree, operationArgv };
}

// Git honours any UNAMBIGUOUS abbreviation of a long option, so `--am`, `--ame` and `--amen`
// all amend exactly as `--amend` does (verified against real git; `--a` alone is rejected as
// ambiguous with --allow-empty/--allow-empty-message, so the set stops at two characters).
// Amend is NOT irreversible — the replaced commit stays in the reflog, exactly as it does after
// `git reset --soft HEAD~1 && git commit`, which produces the same result — so this hook allows
// it. The review gate (its own commit-argv parse, which knows which tokens are option values)
// uses this set to measure an amend's candidate against HEAD's PARENT; it must list every
// spelling git accepts, or an abbreviated flag would be reviewed against the wrong base.
const AMEND_ABBREVIATIONS = new Set(['--am', '--ame', '--amen', '--amend']);

// ── Irreversibility model ───────────────────────────────────────────────────────────────────────
// This hook blocks exactly ONE class of action: work that nothing can bring back afterwards.
//
//   1. UNCOMMITTED WORK. Unstaged edits and untracked files exist in exactly one place — the
//      working tree. Not the object store, not the reflog, not the remote holds a second copy, so a
//      command that overwrites or deletes them destroys the only copy that ever existed.
//   2. DESTRUCTIVE HISTORY REWRITES. `reset --hard`, a force push, a branch force-delete, and
//      reflog/gc pruning remove the very records that recovery depends on.
//
// EVERYTHING ELSE IS ALLOWED — `add`, `commit`, `push`, `pull`, `fetch`, `merge`, `rebase`,
// `cherry-pick`, `revert`, `checkout <branch>`, `switch <branch>`, `stash push`, `tag`, `config`.
// Each is either purely additive or undoable from data git still holds. Whether those SHOULD run
// unprompted is a BEHAVIOURAL rule (`.claude/docs/development-rules.md`, "Pre-commit/Push Rules"), and a behavioural
// rule is not this hook's job: gating recoverable operations bought no safety and made the correct
// workflow — branch, commit, push — harder to reach than the destructive one.
//
// Design note: this is a DENYLIST of destructive spellings, not an allowlist of known-safe ones.
// A git subcommand this file has never heard of is ALLOWED. That is deliberate — an allowlist
// silently blocks every future command until someone edits this file, which is precisely the
// failure this model replaced.

const FORCE_FLAGS = new Set(['-f', '--force']);

// Flag sets whose PRESENCE makes an otherwise-safe operation destroy uncommitted work.
const DESTRUCTIVE_BY_FLAG = new Map([
  // Overwrites the working tree from the index/a commit.
  ['reset', new Set(['--hard', '--merge', '--keep'])],
  // `-f`/`--discard-changes` throws away local modifications instead of refusing to switch.
  ['switch', new Set(['-f', '--force', '--discard-changes'])],
  // `-f` overwrites a modified file instead of refusing.
  ['checkout', new Set(['-f', '--force'])],
  // Deletes untracked (and with -x, ignored) files outright. `-n`/`--dry-run` only previews.
  ['clean', new Set(['-f', '--force', '-x', '-X', '-d'])],
  // Discards local modifications rather than refusing to remove the file.
  ['rm', FORCE_FLAGS],
  // Rewrites the remote's history. `--force-with-lease` is excluded on purpose: it refuses when the
  // remote has moved, so it cannot silently clobber someone else's work.
  ['push', new Set(['-f', '--force', '--delete', '--mirror'])],
  // `-D` (and `-d --force`) deletes an UNMERGED branch, orphaning its commits. `-M` force-moves
  // over an existing branch, destroying that ref.
  ['branch', new Set(['-D', '-M'])],
  // Discards the worktree's uncommitted state instead of refusing.
  ['worktree', FORCE_FLAGS],
  // `-u --reset` overwrites working-tree files from the named tree.
  ['read-tree', new Set(['--reset'])],
  ['submodule', FORCE_FLAGS],
  ['update-ref', new Set(['-d', '--delete'])]
]);

// Subcommands that destroy recovery data regardless of flags.
const DESTRUCTIVE_SUBCOMMANDS = new Map([
  ['stash', new Set(['drop', 'clear'])],
  ['reflog', new Set(['delete', 'expire'])]
]);

// Whole operations that rewrite history unconditionally.
const ALWAYS_IRREVERSIBLE = new Set(['filter-branch', 'filter-repo']);

// Literal fallback for a command the inspector could not parse at all. It is deliberately coarser
// than `irreversibleReason` — no argv, no operand positions, so it matches the SPELLINGS rather
// than reasoning about them. Kept in sync with the tables above by `destructiveClassifierMutants`'s
// sibling assertions in the standalone suite.
const DESTRUCTIVE_TEXT = new RegExp([
  '\\breset\\b[^\\n]{0,200}?--(?:hard|merge|keep)\\b',
  '\\bclean\\b[^\\n]{0,200}?\\s-[A-Za-z]*[fxXd]\\b',
  '\\bpush\\b[^\\n]{0,200}?--(?:force(?!-with-lease)|delete|mirror)\\b',
  '\\bbranch\\b[^\\n]{0,200}?\\s-[A-Za-z]*[DM]\\b',
  '\\bstash\\s+(?:drop|clear)\\b',
  '\\breflog\\s+(?:delete|expire)\\b',
  '\\bfilter-(?:branch|repo)\\b',
  '\\bcheckout\\b[^\\n]{0,200}?(?:--force\\b|\\s-[A-Za-z]*f\\b|\\s--\\s)',
  '\\bswitch\\b[^\\n]{0,200}?(?:--discard-changes\\b|--force\\b|\\s-[A-Za-z]*f\\b)',
  '\\brestore\\b',
  '\\brm\\b[^\\n]{0,200}?(?:--force\\b|\\s-[A-Za-z]*f\\b)',
  '--am(?:e(?:n(?:d)?)?)?\\b'
].join('|'));

function staticArgs(argv) {
  return argv.slice(2).map(token => (token && token.static ? token.value : null));
}

function matchesFlag(value, flags) {
  if (value === null) return false;
  if (flags.has(value)) return true;
  const { name } = optionParts(value);
  if (flags.has(name)) return true;
  // Short options cluster: `git clean -fd` is `-f -d`, and matching only the literal `-fd` let the
  // single most destructive spelling in this file through untouched. Expand any `-abc` run and test
  // each letter on its own.
  if (/^-[A-Za-z]{2,}$/.test(name)) {
    return [...name.slice(1)].some(letter => flags.has(`-${letter}`));
  }
  return false;
}

// A pathspec operand is what turns `git checkout`/`git restore` from a branch switch into a
// working-tree overwrite. Git resolves ref-vs-path ambiguity by looking things up; this hook cannot,
// so it uses the one structural signal available: `--` makes everything after it a pathspec, and a
// bare operand whose LAST segment contains a dot (`app.js`, `./x`, `src/a.ts`) is a filename in
// practice while a branch name (`main`, `feature/login`, `HEAD~1`) is not.
function looksLikePathspec(value) {
  if (value === null) return false;
  if (value === '.' || value === '*') return true;
  if (value.startsWith('-')) return false;
  const lastSegment = value.split(/[\\/]/).pop() || '';
  return lastSegment.includes('.') && !/^HEAD[~^]/.test(value);
}

function hasPathspecOperand(args) {
  const terminator = args.indexOf('--');
  if (terminator !== -1) return args.length > terminator + 1;
  return args.some(looksLikePathspec);
}

/**
 * Why is this statement irreversible? Returns a human-readable reason, or null when the
 * operation cannot destroy unrecoverable work.
 */
function irreversibleReason(operation, argv) {
  if (ALWAYS_IRREVERSIBLE.has(operation)) {
    return `git ${operation} rewrites history in place and cannot be undone`;
  }
  const args = staticArgs(argv);

  const subcommands = DESTRUCTIVE_SUBCOMMANDS.get(operation);
  if (subcommands) {
    const first = args.find(value => value !== null && !value.startsWith('-'));
    if (first && subcommands.has(first)) {
      return `git ${operation} ${first} permanently discards saved work`;
    }
  }

  const flags = DESTRUCTIVE_BY_FLAG.get(operation);
  if (flags && args.some(value => matchesFlag(value, flags))) {
    return `git ${operation} with a force/discard flag destroys uncommitted work or rewrites history`;
  }

  // `git checkout [<ref>] -- <path>` and `git restore <path>` overwrite the working tree from a
  // commit or the index — the classic way an agent silently deletes a user's unsaved edits.
  if (operation === 'checkout' && hasPathspecOperand(args)) {
    return 'git checkout with a pathspec overwrites working-tree changes for those files';
  }
  if (operation === 'restore') {
    // `--staged` ALONE only unstages; the working tree keeps its content, so it is recoverable.
    const staged = args.some(value => matchesFlag(value, new Set(['--staged', '-S'])));
    const worktree = args.some(value => matchesFlag(value, new Set(['--worktree', '-W'])));
    if (!staged || worktree) {
      return 'git restore overwrites working-tree changes for the named paths';
    }
  }

  // An operand this hook could not read statically (command substitution, an unexpanded variable)
  // inside an operation that HAS a destructive spelling could be that spelling. Only these
  // operations deny on an opaque token; every other command stays allowed.
  if ((flags || subcommands || operation === 'restore') && args.includes(null)) {
    return `git ${operation} has an operand produced at run time, which could be a destructive flag`;
  }
  return null;
}

function containsCliToken(value, name) {
  return typeof value === 'string'
    && new RegExp(`(?:^|[\\s'"(])${name}(?:\\.exe)?(?:[\\s'";|&)]|$)`, 'i').test(value);
}

function containsGitToken(value) {
  return containsCliToken(value, 'git');
}

// A wrapper hides the executable from the tokenizer identically whichever CLI
// it wraps, so the same detection covers `bash -c "git push"` and
// `bash -c "gh pr merge"`. Gating only the git spelling would have left the
// wrapper bypass open for gh the moment gh itself was gated.
function wrappedCliStatement(statement, name) {
  const command = executableName(statement.command?.value);
  const tokens = statement.tokens || [];
  const hasOpaque = tokens.some(token => token.static === false && containsCliToken(token.value || token.raw, name));
  const hasNested = SHELL_WRAPPERS.has(command) && tokens.slice(1).some(token => token.static !== false && executableName(token.value) === name);
  if (hasOpaque || hasNested) return true;
  return SHELL_WRAPPERS.has(command) && containsCliToken(statement.raw, name);
}

function wrappedGitStatement(statement) {
  return wrappedCliStatement(statement, 'git');
}

/**
 * Resolve the local repository a `gh` write is attributed to. `gh` infers its
 * target from the cwd's git remote, so the cwd repository is the identity a
 * lease can be matched against — the same identity `git push` from that cwd
 * resolves to.
 */
function resolveGhRepository(initialCwd) {
  const cwd = canonical(initialCwd);
  if (!cwd) return { known: false, reason: 'invalid statement cwd', repository: null };
  const repository = findRepository(cwd);
  const storage = workTreeGitDirectory(repository);
  if (!repository || !storage) {
    return { known: false, reason: 'GitHub CLI write outside a resolvable repository', repository: null };
  }
  return { known: true, reason: null, repository, cwd };
}

// `gh api` carries its verb in a flag, not a subcommand, so the write set is
// detected from the request shape: an explicitly mutating method, or any body
// field (gh promotes a request carrying `-f`/`-F`/`--input` to POST on its own).
// An unreadable method value counts as mutating — this is the one gh path where
// guessing "read" would wave a POST straight through.
function ghApiIsWrite(values) {
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value === '--') break;
    if (!value.startsWith('-')) continue;
    const { name, inline } = optionParts(value);
    if (name === '--input' || name === '--field' || name === '--raw-field'
      || value === '-f' || value === '-F' || /^-[fF]./.test(value)) return true;
    if (name === '--method' || value === '-X') {
      const method = inline !== undefined ? inline : values[index + 1];
      if (typeof method !== 'string' || GH_MUTATING_METHODS.has(method.toUpperCase())) return true;
      continue;
    }
    // pflag accepts the attached shorthand `-XPOST` as readily as `-X POST`.
    if (/^-X./.test(value) && GH_MUTATING_METHODS.has(value.slice(2).toUpperCase())) return true;
  }
  return false;
}

function ghWriteAction(values) {
  const positional = [];
  for (const value of values) {
    if (value === '--') break;
    if (value.startsWith('-')) continue;
    positional.push(value);
    if (positional.length === 2) break;
  }
  const [group, action] = positional;
  if (!group) return null;
  if (group === 'api') return ghApiIsWrite(values) ? 'api (mutating request)' : null;
  const actions = GH_WRITE_ACTIONS.get(group);
  return actions && action && actions.has(action) ? `${group} ${action}` : null;
}

function classifyGhStatement(statement, initialCwd) {
  if (statement.status && statement.status !== 'KNOWN') {
    return { kind: 'unknown', operation: 'gh', subject: 'GitHub CLI statement', reason: 'unsupported or ambiguous GitHub CLI syntax', resolved: null, statement };
  }
  const argv = statement.argv || [];
  for (const token of argv.slice(1)) {
    if (token && token.static === false) {
      return { kind: 'unknown', operation: 'gh', subject: 'GitHub CLI statement', reason: 'dynamic GitHub CLI argument', resolved: null, statement };
    }
  }
  const values = argv.slice(1).map(token => token?.value).filter(value => typeof value === 'string');
  const write = ghWriteAction(values);
  if (!write) return { kind: 'none', statement };
  // Same irreversibility test as the git side: only gate what cannot be undone. `gh pr create`,
  // `gh pr merge` and `gh release create` all publish, but each is closeable, revertable or
  // deletable afterwards. Deleting a repository, a release, a secret or a cache is not.
  if (!GH_IRREVERSIBLE.test(write)) return { kind: 'allow', operation: 'push', subject: `GitHub CLI ${write}`, resolved: null, statement };
  // `--repo owner/name` retargets the write at a repository this hook cannot
  // match against a lease's local worktree identity, so no lease can authorize
  // it. Cross-repository writes are the highest blast radius in the set; they
  // deny rather than borrow the cwd repository's authority.
  const namesRepository = values.some(value => {
    const { name } = optionParts(value);
    return name === '-R' || name === '--repo' || /^-R./.test(value);
  });
  const resolved = namesRepository
    ? { known: false, reason: 'GitHub CLI write names an explicit --repo target that no local lease can cover', repository: null }
    : resolveGhRepository(initialCwd);
  return {
    kind: 'protected',
    // Leases are minted in the add|commit|push vocabulary. A gh write publishes
    // to the remote exactly as `git push` does, so it consumes a push lease
    // rather than inventing a fourth operation no issuer can mint — which would
    // make the gate unclearable even with explicit user consent.
    operation: 'push',
    subject: `GitHub CLI ${write}`,
    reason: resolved.known ? null : resolved.reason,
    resolved,
    statement
  };
}

// `sh -c "git status"` nests; each hop unwraps one payload, so a small cap ends the recursion.
const MAX_WRAPPED_DEPTH = 4;

/**
 * A wrapper hides the executable from the tokenizer, but its payload is still an ordinary shell
 * command — so parse it and classify what it actually SAYS. The previous model denied every wrapped
 * statement outright, which stopped `sh -c "git reset --hard"` and `sh -c "git status"` alike; under
 * an irreversibility gate only the first of those is this hook's business.
 * Returns null when the payload cannot be read statically, leaving the caller to deny closed.
 */
function classifyWrappedStatement(statement, initialCwd, cli, depth) {
  if (depth >= MAX_WRAPPED_DEPTH) return null;
  const tokens = statement.tokens || [];
  for (const token of tokens) {
    const value = token?.value;
    // A payload produced at run time could say anything; only a literal one can be classified.
    if (token?.static === false || typeof value !== 'string' || !/\s/.test(value)) continue;
    if (!containsCliToken(value, cli)) continue;
    let inner;
    try { inner = inspectCommand(value); } catch { return null; }
    if (inner.status !== 'KNOWN' || inner.statements.length === 0) return null;
    const items = inner.statements
      .map(nested => classifyStatement(nested, initialCwd, depth + 1))
      .filter(item => item.kind !== 'none');
    if (items.length === 0) continue;
    // Deny-wins inside the payload, exactly as it does across top-level statements.
    return items.find(item => item.kind !== 'allow') || items[0];
  }
  // `sudo git push` keeps the CLI and its arguments as ORDINARY sibling tokens — there is no quoted
  // payload to re-parse, so the inner command is simply the token run starting at the CLI name.
  const index = tokens.findIndex(token => token?.static !== false && executableName(token?.value) === cli);
  if (index === -1) return null;
  const argv = tokens.slice(index);
  if (argv.length === 0) return null;
  // The wrapper's own status describes the WRAPPER's syntax — `sudo git push` is only "ambiguous"
  // because of the sudo layer. Re-state it from the slice we actually classify: KNOWN when every
  // token in it is literal, and otherwise inherited so a dynamic operand still denies closed.
  const status = argv.every(token => token?.static !== false) ? 'KNOWN' : statement.status;
  return classifyStatement({ ...statement, status, command: argv[0], argv, tokens: argv }, initialCwd, depth + 1);
}

function classifyStatement(statement, initialCwd, depth = 0) {
  const command = executableName(statement.command?.value);
  if (command === 'gh') return classifyGhStatement(statement, initialCwd);
  if (command !== 'git') {
    if (wrappedGitStatement(statement)) {
      return classifyWrappedStatement(statement, initialCwd, 'git', depth)
        // `subject` is set explicitly: without it formatBlockMessage renders `Git ${operation}`,
        // and operation is the literal string 'git' here, which printed "Git git is IRREVERSIBLE".
        || { kind: 'unknown', operation: 'git', subject: 'Git statement', reason: 'a shell wrapper or command substitution hides the Git command from static parsing', resolved: null, statement };
    }
    if (wrappedCliStatement(statement, 'gh')) {
      return classifyWrappedStatement(statement, initialCwd, 'gh', depth)
        || { kind: 'unknown', operation: 'gh', subject: 'GitHub CLI statement', reason: 'unsupported shell wrapper or opaque GitHub CLI command', resolved: null, statement };
    }
    return { kind: 'none', statement };
  }
  if (statement.status && statement.status !== 'KNOWN') {
    return { kind: 'unknown', operation: 'git', subject: 'Git statement', reason: 'unsupported or ambiguous Git syntax', resolved: null, statement };
  }
  const resolved = resolveGitStatement(statement, initialCwd);
  if (!resolved.operation) return { kind: 'unknown', resolved, statement };
  const operation = resolved.operation;
  const argv = resolved.operationArgv || [];
  const irreversible = irreversibleReason(operation, argv);
  // Every destructive git spelling consumes the ONE `discard` lease term rather than its own
  // operation name. Minting `reset`/`clean`/`branch`/… separately would mean an issuer had to
  // predict the exact command, and a term no issuer can mint makes the gate unclearable.
  if (irreversible) return { kind: 'protected', operation, leaseOperation: 'discard', reason: irreversible, resolved, statement };
  return { kind: 'allow', operation, resolved, statement };
}

function projectRoot(input) {
  const cwd = input?.tool_input?.cwd || input?.cwd || process.cwd();
  const resolved = resolveProjectRoot({ cwd, scriptPath: __filename, env: process.env });
  if (resolved.source === 'invalid-env-fallback') {
    throw new Error(`Unable to resolve project root: ${resolved.error}`);
  }
  return canonical(resolved.rootDir) || canonical(cwd);
}

function sessionId(input) {
  const value = input?.session_id || process.env.CK_SESSION_ID;
  return typeof value === 'string' && value.trim() && value !== 'default' ? value : null;
}

function hasLease(input, resolved, operation, root) {
  if (!resolved?.known || !resolved.repository || !root || !sessionId(input)) return false;
  const storeDir = process.env.CK_GIT_LEASE_STORE;
  return checkLease({ projectDir: root, repository: resolved.repository, sessionId: sessionId(input), operation,
    ...(storeDir ? { storeDir } : {}) });
}

function formatBlockMessage(result) {
  // `subject` lets a non-git publisher name itself. Reporting `gh pr merge` as
  // "Git push" would send the reader looking for a git command that never ran.
  const subject = result.subject || `Git ${result.operation || 'statement'}`;
  // An UNPARSED statement is denied because its effect is unknown, not because it was shown to be
  // irreversible. Asserting "is IRREVERSIBLE" about `echo "$(git status)"` sent the reader hunting
  // for a destructive operation that never existed, and for a policy on a read-only subcommand
  // that has none. Name the parse failure instead, and keep the irreversibility claim for the
  // operations this hook actually identified as destructive.
  const headline = result.kind === 'unknown'
    ? `[BLOCKED] ${subject} could not be parsed statically${result.reason ? ` — ${result.reason}` : ''}, so an irreversible operation cannot be ruled out.`
    : `[BLOCKED] ${subject} is IRREVERSIBLE${result.reason ? ` — ${result.reason}` : ''}.`;
  return [
    headline,
    '',
    'This hook blocks only what cannot be undone: commands that destroy uncommitted work, and',
    'destructive history rewrites. Everything recoverable (add, commit, push, merge, rebase,',
    'branch, checkout <branch>, stash push) is allowed and is NOT gated here.',
    '',
    'There is no undo for this one. Before retrying, confirm with the user, and prefer a',
    'recoverable alternative where one exists:',
    '  discard local edits   -> `git stash push` (keeps them, retrievable with `git stash pop`)',
    '  undo a commit         -> `git revert <sha>` or `git reset --soft HEAD~1`',
    '  drop a branch         -> `git branch -d` (refuses when it would orphan commits)',
    '  clean untracked files -> `git clean -n` first, to see exactly what would be deleted.',
    '',
    'This clears ONLY with a current-session `discard` lease for THIS repository, minted after the',
    'user explicitly asked for it (git-manager / a commit skill). A lease is bookkeeping, not',
    'consent — it never substitutes for the user actually asking. The user can also just run the',
    'command themselves with `!<command>` at the Claude Code prompt.'
  ].join('\n');
}

function evaluationError(message) {
  return {
    code: 2,
    stderr: `[git-statement] Unable to evaluate Bash input: ${message}\n`,
    decision: 'error-block'
  };
}

function evaluate(input) {
  // A valid event for another tool is outside this hook's matcher.
  if (!input || input.tool_name !== 'Bash') return undefined;
  if (!input.tool_input || typeof input.tool_input !== 'object' || Array.isArray(input.tool_input)) {
    return evaluationError('tool_input is missing or not an object');
  }
  const command = input.tool_input.command;
  if (typeof command !== 'string' || command.trim().length === 0) {
    return evaluationError('Bash command is missing or not a non-empty string');
  }

  const inspected = inspectCommand(command);
  if (inspected.status !== 'KNOWN' && inspected.statements.length === 0) {
    // Nothing can be classified structurally here. Denying EVERY uninspectable command was the old
    // model's answer, and it stops an oversize-but-harmless `git push` along with the one command
    // that matters. So the fallback is a literal scan for a destructive spelling — a deliberately
    // narrow net, because an over-blocked routine path is what drives a user to turn the whole hook off.
    if (!DESTRUCTIVE_TEXT.test(command)) return undefined;
    return evaluationError('command could not be inspected and names a destructive Git spelling; split it into shorter, explicit commands');
  }
  const cwd = input.tool_input?.cwd || input.cwd || process.cwd();
  let navigationSeen = false;
  const classifications = inspected.statements.map(statement => {
    const commandName = executableName(statement.command?.value);
    // Do not guess which conditional branch ran or emulate the shell directory stack.
    if (['cd', 'pushd', 'popd'].includes(commandName) ||
      (['builtin', 'command', 'eval'].includes(commandName) &&
        (statement.tokens || []).some(token => /(?:^|\s)(?:cd|pushd|popd)(?:\s|$)/.test(token.value || '')))) {
      navigationSeen = true;
    }
    const item = classifyStatement(statement, cwd);
    if (navigationSeen && item.kind === 'protected') {
      return { ...item, kind: 'unknown', reason: 'shell directory state is unknown; retry a separate git -C command', resolved: null };
    }
    return item;
  }).filter(item => item.kind !== 'none');
  if (classifications.length === 0) return undefined;
  const root = projectRoot(input);
  for (const item of classifications) {
    if (item.kind === 'protected' && hasLease(input, item.resolved, item.leaseOperation || item.operation, root)) continue;
    if (item.kind === 'allow') continue;
    const reason = item.reason || (item.resolved?.known ? null : item.resolved?.reason || 'unsupported or ambiguous Git statement');
    return {
      code: 2,
      stderr: `${formatBlockMessage({ ...item, reason })}\n`,
      decision: 'block'
    };
  }
  return undefined;
}

module.exports = {
  // Keep repository and session resolution centralized so lease scope is
  // consistent with the context this gate evaluates.
  canonical,
  findRepository,
  workTreeGitDirectory,
  projectRoot,
  sessionId,
  resolveGitStatement,
  classifyStatement,
  irreversibleReason,
  matchesFlag,
  looksLikePathspec,
  AMEND_ABBREVIATIONS,
  wrappedGitStatement,
  wrappedCliStatement,
  ghWriteAction,
  ghApiIsWrite,
  hasLease,
  evaluate
};
