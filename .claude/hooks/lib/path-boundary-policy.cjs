'use strict';

/**
 * Pure command/path classification adapter.
 *
 * Owns static command roles, relative/cwd and container intent, and the file
 * operand collectors.
 * `inspect` and `resolver` are injected so tests can prove the classification
 * without executing a command or touching a real filesystem.
 */

const path = require('node:path');

const READ_ROLES = new Set([
  'cat', 'head', 'tail', 'less', 'more', 'vim', 'vi', 'nano', 'code', 'notepad',
  'type', 'ls', 'dir', 'find', 'grep', 'egrep', 'fgrep', 'rg', 'ripgrep',
  'sed', 'awk', 'gawk', 'mawk', 'tar', 'get-content', 'select-string',
  'get-item', 'get-childitem'
]);
const WRITE_ROLES = new Set([
  'tee', 'touch', 'cp', 'mv', 'rm', 'del', 'erase', 'copy', 'move', 'ren',
  'rename', 'mkdir', 'rmdir', 'rd', 'set-content', 'add-content', 'out-file', 'remove-item',
  'copy-item', 'move-item',
  // `dd` reads AND writes; it is classified with the writers because that is
  // the stronger authority. Its per-operand read/write split is handled by the
  // `key=value` branch in collectFileOperands, not by this command-level set.
  'dd'
]);
// `dd` takes NO dashed options: every operand is a bare `key=value` pair, and
// only `if=`/`of=` name files. That shape defeated every existing rule — the
// option branch never fires (no leading `-`), the positional branch would have
// resolved the literal token `if=/etc/passwd` rather than the path inside it,
// and both legacy fallbacks miss it too because the token starts with `i`, not
// `/` or `..`. So `dd if=/etc/passwd of=/tmp/stolen.img` was ALLOWED: a raw
// copy of any file on the host, in or out of the project, through the one
// boundary that exists to stop exactly that.
//
// Listed keys are the scalars dd accepts; an UNRECOGNIZED key denies rather
// than being skipped, so a dd operand added later cannot silently carry a path
// past this model.
const DD_SCALAR_KEYS = new Set([
  'bs', 'ibs', 'obs', 'cbs', 'count', 'seek', 'skip', 'iseek', 'oseek',
  'conv', 'iflag', 'oflag', 'status'
]);
const NAVIGATION_ROLES = new Set(['cd', 'chdir', 'pushd', 'popd']);
const LINK_MUTATION_ROLES = new Set(['ln', 'link', 'mklink', 'junction']);
const CONTAINER_TOOLS = new Set(['docker', 'podman', 'kubectl']);
const SHELL_WRAPPERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'pwsh', 'powershell', 'cmd']);
const SHELL_BODY_OPTIONS = new Set(['-c', '-command', '/c', '/command']);
const INLINE_INTERPRETERS = new Set(['python', 'python3', 'py', 'node', 'ruby', 'perl', 'php']);
const WINDOWS_FLAG_ROLES = new Set(['dir', 'del', 'erase', 'copy', 'move', 'ren', 'rename', 'xcopy', 'robocopy', 'findstr', 'cmd']);
const GIT_DIFF_VALUE_OPTIONS = new Set([
  '-U', '--output', '--src-prefix', '--dst-prefix', '--line-prefix',
  '--inter-hunk-context', '--anchored', '--diff-algorithm'
]);
// Optional long-option values are attached with '='; a following word is
// still a revision/pathspec, never the value of a bare presentation option.
const GIT_DIFF_OPTIONAL_OPTIONS = new Set(['--unified', '--abbrev', '--color', '--word-diff', '--ignore-submodules', '--relative', '--submodule']);
// Recovered only from Git diff's bounded revision positions. The command scanner
// leaves caret words UNKNOWN because an embedded cmd.exe body may treat `^` as escape.
const GIT_PARENT_REVISION = /^[A-Za-z0-9][A-Za-z0-9._/-]*\^[0-9]+$/;
const GIT_DIFF_FLAGS = new Set([
  '--no-index', '--cached', '--staged', '--check', '--name-only', '--name-status',
  // `--numstat`/`--compact-summary`/`--cumulative` are display-only siblings of
  // `--stat`/`--shortstat`/`--dirstat` and take no operand. Their absence denied
  // the standard machine-readable diff form while the human-readable ones passed.
  '--numstat', '--compact-summary', '--cumulative',
  '--stat', '--shortstat', '--dirstat', '--summary', '--patch', '-p', '--raw',
  '--patch-with-stat', '--patch-with-raw', '--binary', '--full-index', '--no-color',
  '--color-moved', '--no-color-moved', '--no-ext-diff', '--no-textconv',
  '--ignore-space-at-eol', '--ignore-space-change', '--ignore-all-space',
  '--ignore-blank-lines', '--find-renames', '--find-copies', '--no-renames',
  '--text', '--no-text', '--ita-invisible-in-index', '--ita-visible-in-index',
  '--minimal', '--patience', '--histogram', '--anchored', '--pickaxe-all',
  '--pickaxe-regex', '--irreversible-delete', '--no-prefix', '--default-prefix',
  '--inter-hunk-context', '--output-indicator-new', '--output-indicator-old',
  '--output-indicator-context'
]);
const NO_ARG_OPTIONS = new Set([
  '-r', '-R', '-f', '-i', '-n', '-a', '-q', '-v', '-l', '-c', '-I', '-w', '-x',
  '-p', '-h', '-H', '--interactive', '--tty', '--rm', '--detach', '--read-only',
  '-Force', '-Recurse', '-Directory', '-File', '-Hidden', '-System', '-ReadOnly',
  '-Verbose', '-WhatIf', '-Confirm', '-Name'
]);
const SCALAR_OPTIONS = new Set([
  '-Value', '-Encoding', '-Filter', '-Include',
  '-Exclude', '-ErrorAction', '-ErrorVariable', '-InformationAction',
  '-WarningAction', '-WarningVariable', '-OutVariable', '-OutBuffer'
]);
const COMMAND_SCALAR_OPTIONS = {
  head: new Set(['-n', '-c', '--lines', '--bytes']),
  tail: new Set(['-n', '-c', '--lines', '--bytes', '--pid', '--sleep-interval']),
  grep: new Set(['-A', '-B', '-C', '--context', '--include', '--exclude', '--exclude-dir', '-d', '--directories', '-m', '--max-count']),
  rg: new Set(['-A', '-B', '-C', '--context', '--type', '--type-not', '-g', '--glob', '--iglob', '-m', '--max-count']),
  find: new Set(['-name', '-path', '-type', '-iname', '-ipath']),
  awk: new Set(['-v', '-F'])
};
const PATTERN_COMMANDS = new Set(['grep', 'egrep', 'fgrep', 'rg', 'ripgrep', 'sed', 'awk', 'gawk', 'mawk']);

function operandOptionRole(command, name) {
  const family = ({ egrep: 'grep', fgrep: 'grep', ripgrep: 'rg', gawk: 'awk', mawk: 'awk' })[command] || command;
  if (['grep', 'rg'].includes(family) && ['-o', '--only-matching', '-F', '-E', '-s', '--fixed-strings', '--ignore-case', '--line-number', '--count'].includes(name)) return 'switch';
  if (PATTERN_COMMANDS.has(command)) {
    if (['-e', '--regexp', '--expression'].includes(name)) return 'pattern';
    if (['-f', '--file'].includes(name)) return 'pattern-file';
  }
  if (COMMAND_SCALAR_OPTIONS[family]?.has(name) || POWERSHELL_FILE_COMMANDS.has(command) && SCALAR_OPTIONS.has(name)) return 'scalar';
  return null;
}

// A POSIX short-option CLUSTER (`-la`, `-rn`, `-rf`) is ONE token carrying
// several independent switches. Decompose it ONLY when EVERY letter is already
// individually modeled as a no-argument switch for this command; an unmodeled
// letter, or one that takes an operand, still denies.
//
// The conservative form is the point. Assuming any letter is a no-arg flag would
// silently reclassify a real operand as a flag and shrink what this boundary
// treats as a path — the opposite of what it exists to do. So `grep -rn` and
// `ls -la` resolve (every letter known), while `tar -xzf` keeps denying until
// `-z` is modeled, and `head -qn 3` keeps denying because `-n` takes a value.
function clusterIsKnownSwitches(command, value) {
  if (!/^-[A-Za-z]{2,}$/.test(value)) return false;
  for (const letter of value.slice(1)) {
    const flag = `-${letter}`;
    const role = operandOptionRole(command, flag);
    // A letter is a no-arg switch if the generic table says so OR this command's
    // own role table classifies it 'switch'. Consulting only the generic table
    // made the role check below dead code and split `grep -n -o` from clustered
    // `grep -no` — identical commands, opposite verdicts — because grep's
    // switches (-o/-E/-F/-s) live in the role table, not the generic one.
    if (role !== 'switch' && !NO_ARG_OPTIONS.has(flag)) return false;
    // An operand-taking letter (scalar/pattern) still denies, clustered or not.
    if (role && role !== 'switch') return false;
  }
  return true;
}

// GNU head/tail accept a bare line count as a short option (`head -3`,
// `tail -40`) that consumes no separate operand. Modeled only for the two
// commands whose scalar table already declares the equivalent `-n` form.
function isCountShorthand(command, value) {
  return (command === 'head' || command === 'tail') && /^-\d+$/.test(value);
}
const PATH_OPTIONS = new Set(['-Path', '-LiteralPath', '--target-directory']);
const POWERSHELL_FILE_COMMANDS = new Set([
  'get-content', 'select-string', 'get-item', 'get-childitem', 'set-content', 'add-content',
  'out-file', 'remove-item', 'copy-item', 'move-item'
]);

function diagnostic(code, statement = null, token = null) {
  return { code, statement, token, status: 'UNKNOWN' };
}

function result(status, paths, diagnostics) {
  return { status, paths, diagnostics };
}

function slash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function normalized(value) {
  const text = slash(value);
  return process.platform === 'win32' || /^[A-Za-z]:\//.test(text) ? text.toLowerCase() : text;
}

function isAbsoluteLike(value) {
  const text = slash(value);
  return path.posix.isAbsolute(text) || /^[A-Za-z]:\//.test(text) || text.startsWith('//');
}

function inside(target, root, allowlist) {
  const candidate = normalized(target);
  const roots = [root, ...(allowlist || [])].map(normalized);
  return roots.some(base => candidate === base || candidate.startsWith(`${base.replace(/\/$/, '')}/`));
}

function commandName(statement) {
  const value = statement?.command?.value;
  return typeof value === 'string' ? value.replace(/^.*[\\/]/, '').toLowerCase().replace(/\.exe$/, '') : '';
}

function staticValue(token) {
  return token && token.static !== false && typeof token.value === 'string' ? token.value : null;
}

function recoveredGitParentRevision(token) {
  if (token?.kind !== 'word' || token.static !== false || typeof token.value !== 'string'
    || token.raw !== token.value || !Array.isArray(token.parts) || token.parts.length !== 1) return null;
  const [part] = token.parts;
  if (part.quote !== 'unquoted' || part.raw !== token.raw || part.value !== token.value
    || !GIT_PARENT_REVISION.test(token.value)) return null;
  return { ...token, static: true, interpretation: 'git-parent-revision' };
}

function onlyGitParentRevisionUnknowns(statement, tokens) {
  const diagnostics = statement?.diagnostics || [];
  if (!tokens.length || diagnostics.length !== tokens.length) return false;
  const spans = new Set(tokens.map(token => `${token.start}:${token.end}`));
  return diagnostics.every(item => item.code === 'UNSUPPORTED_WORD' && spans.has(`${item.start}:${item.end}`));
}

function staticPathValue(token) {
  const value = staticValue(token);
  if (value === null) return null;
  const raw = typeof token?.raw === 'string' ? token.raw : '';
  const unquoted = raw.replace(/^(['"])(.*)\1$/s, '$2');
  // The command scanner decodes backslash escapes. A native Windows path's
  // separators are syntax, not an escape, so retain the raw spelling for
  // drive/UNC operands before realpath resolution.
  if (/^[A-Za-z]:[\\/]/.test(unquoted) || /^\\\\/.test(unquoted)) return unquoted;
  return value;
}

function pathEntry(value, role, source, statement, token = null, requiresExisting = false) {
  return { value, role, source, statement, token, requiresExisting };
}

function requiresExistingRead(command, value) {
  // A nested operand is the boundary-sensitive case: an existing symlink or
  // junction anywhere in the chain can redirect the operation outside the
  // project. Single-component operands retain the hook's historical lexical
  // behavior for files that are about to be created or supplied by a caller.
  return READ_ROLES.has(command) && !WRITE_ROLES.has(command) && /[\\/]/.test(String(value || ''));
}

function splitOption(token) {
  const value = staticValue(token);
  if (!value) return { name: '', inline: undefined };
  const index = value.indexOf('=');
  return index < 0 ? { name: value, inline: undefined } : { name: value.slice(0, index), inline: value.slice(index + 1) };
}

function collectFileOperands(statement) {
  const command = commandName(statement);
  if (command === 'git') {
    const gitShow = collectGitShowOperands(statement);
    if (gitShow.protected) return gitShow;
  }
  if (!READ_ROLES.has(command) && !WRITE_ROLES.has(command)) return { paths: [], protected: false };

  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];
  const paths = [];
  const cwdChanges = [];
  let afterTerminator = false;
  let positional = 0;

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    const value = staticPathValue(token);
    if (value === null) {
      // Only the known leading pattern/program slot is data. A dynamic file
      // operand after that slot cannot establish an in-project boundary.
      if (PATTERN_COMMANDS.has(command) && positional === 0) { positional++; continue; }
      return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_PATH_OPERAND' };
    }
    if (!afterTerminator && value === '--') { afterTerminator = true; continue; }
    // dd's `key=value` operands — see DD_SCALAR_KEYS above for why this cannot
    // ride either the option branch or the positional branch below.
    if (command === 'dd') {
      const eq = value.indexOf('=');
      const key = eq > 0 ? value.slice(0, eq) : '';
      const operandValue = eq > 0 ? value.slice(eq + 1) : '';
      if (key === 'if' || key === 'of') {
        if (!operandValue) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_PATH_OPERAND' };
        // requiresExistingRead() is a COMMAND-level predicate and cannot express
        // this: dd is both reader and writer, so the role lives on the operand.
        // `if=` is the read, and a nested read operand is the symlink-sensitive
        // case that predicate exists to catch — so mirror its condition here.
        paths.push(pathEntry(operandValue, 'operand', 'argv', statement, token,
          key === 'if' && /[\\/]/.test(operandValue)));
        continue;
      }
      if (DD_SCALAR_KEYS.has(key)) continue;
      return { paths, protected: true, unknown: true, unknownCode: 'UNSUPPORTED_DD_OPERAND' };
    }
    if (!afterTerminator && WINDOWS_FLAG_ROLES.has(command) && /^\/{1,2}[A-Za-z][A-Za-z0-9_-]*(?::[^/\\\s]+)?$/.test(value)) {
      continue;
    }
    if (!afterTerminator && value.startsWith('-') && value !== '-') {
      let { name, inline } = splitOption(token);
      if (command === 'tar' && /^-[Cf].+/.test(value)) {
        name = value.slice(0, 2);
        inline = value.slice(2);
      }
      if (command === 'tar' && ['-C', '--directory', '-f', '--file'].includes(name)) {
        const operand = inline === undefined ? argv[++index] : token;
        const operandValue = inline === undefined ? staticPathValue(operand) : inline;
        if (!operandValue) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_TAR_PATH' };
        if (name === '-C' || name === '--directory') {
          cwdChanges.push(operandValue);
          paths.push({ ...pathEntry('.', 'tar-cwd', 'argv', statement, operand), cwdChanges: [...cwdChanges] });
        } else {
          // Archive filenames stay relative to invocation cwd, not member cwd.
          paths.push(pathEntry(operandValue, 'tar-archive', 'argv', statement, operand));
        }
        continue;
      }
      // awk accepts an attached field separator; it is data, not another
      // positional program or a path. Other unmodeled attached options deny.
      if (['awk', 'gawk', 'mawk'].includes(command) && /^-F.+/.test(value)) {
        name = '-F';
        inline = value.slice(2);
      }
      const optionRole = operandOptionRole(command, name);
      if (optionRole === 'switch') continue;
      if (optionRole) {
        if (optionRole.startsWith('pattern')) positional = Math.max(positional, 1);
        const operand = inline === undefined ? argv[++index] : token;
        const operandValue = inline === undefined ? staticPathValue(operand) : inline;
        if (operandValue === null && optionRole !== 'pattern') return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_PATH_OPTION' };
        if (optionRole === 'pattern-file') paths.push(pathEntry(operandValue, 'path-option', 'argv', statement, operand, requiresExistingRead(command, operandValue)));
        continue;
      }
      if (inline !== undefined && (name === '--target-directory' || name === '-Path' || name === '-LiteralPath')) {
        paths.push(pathEntry(inline, 'path-option', 'argv', statement, token, requiresExistingRead(command, inline)));
      }
        if (PATH_OPTIONS.has(name) && inline === undefined) {
        const operand = argv[index + 1];
        if (staticPathValue(operand) === null) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_PATH_OPTION' };
          const pathValue = staticPathValue(operand);
          paths.push(pathEntry(pathValue, 'path-option', 'argv', statement, operand,
            requiresExistingRead(command, pathValue)));
        index++;
      } else if (!NO_ARG_OPTIONS.has(name) && inline === undefined
        && !clusterIsKnownSwitches(command, name) && !isCountShorthand(command, name)
        && !name.startsWith('--target-directory') && !name.startsWith('-Path') && !name.startsWith('-LiteralPath')) {
        return { paths, protected: true, unknown: true, unknownCode: 'UNSUPPORTED_OPTION_ARITY' };
      }
      continue;
    }

    // Pattern/program operands are data; subsequent values are file paths.
    if ((command === 'grep' || command === 'egrep' || command === 'fgrep' || command === 'rg' || command === 'ripgrep' || command === 'sed' || command === 'awk' || command === 'gawk' || command === 'mawk') && positional === 0) {
      positional++;
      continue;
    }
    positional++;
    paths.push({ ...pathEntry(
      value,
      command === 'mkdir' || command === 'rmdir' ? 'directory' : 'operand',
      'argv',
      statement,
      token,
      requiresExistingRead(command, value)
    ), ...(command === 'tar' ? { cwdChanges: [...cwdChanges] } : {}) });
  }
  return { paths, protected: true };
}

function gitDiffUsesNoIndex(argv, start) {
  for (let index = start; index < argv.length; index++) {
    const value = staticValue(argv[index]);
    if (value === '--') return false;
    if (value === '--no-index') return true;
    if (value === null || !value.startsWith('-')) continue;
    const { name, inline } = splitOption(argv[index]);
    if (GIT_DIFF_OPTIONAL_OPTIONS.has(name)) continue;
    if (GIT_DIFF_VALUE_OPTIONS.has(name) && inline === undefined) { index++; continue; }
    if (/^-U\d+$/.test(name)) continue;
  }
  return false;
}

function collectGitDiffOperands(statement) {
  if (commandName(statement) !== 'git') return { paths: [], protected: false };
  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];
  // This adapter owns diff only; other Git operations retain their own gates.
  if (!argv.some(token => staticValue(token) === 'diff')) return { paths: [], protected: false };
  const cwdChanges = [];
  let operationIndex = 0;
  for (; operationIndex < argv.length; operationIndex++) {
    const token = argv[operationIndex];
    const value = staticValue(token);
    if (value === '-C' || value?.startsWith('-C') && value.length > 2) {
      const directory = value === '-C' ? staticPathValue(argv[++operationIndex]) : value.slice(2);
      if (directory === null) return { paths: [], protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_CWD' };
      if (directory !== '') cwdChanges.push(directory);
      continue;
    }
    if (['--no-pager', '--paginate', '--no-optional-locks'].includes(value)) continue;
    if (value === null || value.startsWith('-')) return { paths: [], protected: true, unknown: true, unknownCode: 'UNSUPPORTED_GIT_GLOBAL_OPTION' };
    break;
  }
  if (staticValue(argv[operationIndex]) !== 'diff') return { paths: [], protected: false };

  const paths = [];
  const recoveredParentTokens = [];
  let afterTerminator = false;
  let revisionOperands = 0;
  const noIndex = gitDiffUsesNoIndex(argv, operationIndex + 1);
  for (let index = operationIndex + 1; index < argv.length; index++) {
    const token = argv[index];
    let operandToken = token;
    let value = staticValue(token);
    if (value === '--' && !afterTerminator) {
      afterTerminator = true;
      continue;
    }
    if (afterTerminator) {
      if (value === null) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_DIFF_OPERAND' };
      const pathspec = staticPathValue(operandToken);
      paths.push(pathEntry(pathspec, 'git-diff-pathspec', 'argv', statement, token,
        /[\\/]/.test(String(pathspec || ''))));
      continue;
    }
    if (value === null && !noIndex && revisionOperands < 2) {
      const recovered = recoveredGitParentRevision(token);
      if (recovered) {
        operandToken = recovered;
        value = recovered.value;
        recoveredParentTokens.push(recovered);
      }
    }
    if (value === null) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_DIFF_OPERAND' };
    if (value === '--output') {
      const output = argv[++index];
      if (staticValue(output) === null) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_OUTPUT' };
      paths.push(pathEntry(staticValue(output), 'git-diff-output', 'argv', statement, output));
      continue;
    }
    if (value.startsWith('--output=')) {
      paths.push(pathEntry(value.slice('--output='.length), 'git-diff-output', 'argv', statement, token));
      continue;
    }
    if (value.startsWith('-')) {
      const { name, inline } = splitOption(token);
      if (GIT_DIFF_OPTIONAL_OPTIONS.has(name)) continue;
      if (inline !== undefined) {
        if (GIT_DIFF_VALUE_OPTIONS.has(name) && name === '--output') {
          paths.push(pathEntry(inline, 'git-diff-output', 'argv', statement, token));
          continue;
        }
        if (GIT_DIFF_VALUE_OPTIONS.has(name)) continue;
      }
      if (GIT_DIFF_VALUE_OPTIONS.has(name)) {
        if (!argv[index + 1] || staticValue(argv[index + 1]) === null) {
          return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_OPTION' };
        }
        index++;
        continue;
      }
      if (GIT_DIFF_FLAGS.has(name)) continue;
      // `-U` is the one single-letter value option here, and git accepts its
      // value attached (`-U0`). splitOption only splits on '=', so the attached
      // form arrived as an unknown option name while `-U 0` and `--unified=0`
      // both resolved — three spellings of one semantic, two verdicts.
      if (/^-U\d+$/.test(name)) continue;
      return { paths, protected: true, unknown: true, unknownCode: 'UNSUPPORTED_GIT_DIFF_OPTION' };
    }
    // Git accepts revisions and pathspecs in this position. Treat both as
    // boundary candidates; a revision resolves lexically inside the project,
    // while an absolute/outside path remains visible to the boundary check.
    revisionOperands++;
    const operand = staticPathValue(operandToken);
    paths.push(pathEntry(operand, 'git-diff-operand', 'argv', statement, operandToken,
      /[\\/]/.test(String(operand || ''))));
  }
  // Carry command-local cwd through nested shells without changing siblings.
  for (const entry of paths) entry.cwdChanges = cwdChanges;
  if (cwdChanges.length) paths.push({ ...pathEntry('.', 'git-cwd', 'argv', statement), cwdChanges });
  return {
    paths,
    protected: true,
    recoveredParentRevision: onlyGitParentRevisionUnknowns(statement, recoveredParentTokens)
  };
}

function collectGitShowOperands(statement) {
  if (commandName(statement) !== 'git') return { paths: [], protected: false };
  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];
  if (!argv.some(token => staticValue(token) === 'show')) return { paths: [], protected: false };

  const cwdChanges = [];
  let operationIndex = 0;
  for (; operationIndex < argv.length; operationIndex++) {
    const token = argv[operationIndex];
    const value = staticValue(token);
    if (value === '-C' || value?.startsWith('-C') && value.length > 2) {
      const directory = value === '-C' ? staticPathValue(argv[++operationIndex]) : value.slice(2);
      if (directory === null) return { paths: [], protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_CWD' };
      if (directory !== '') cwdChanges.push(directory);
      continue;
    }
    if (['--no-pager', '--paginate', '--no-optional-locks'].includes(value)) continue;
    if (value === null || value.startsWith('-')) return { paths: [], protected: true, unknown: true, unknownCode: 'UNSUPPORTED_GIT_GLOBAL_OPTION' };
    break;
  }
  if (staticValue(argv[operationIndex]) !== 'show') return { paths: [], protected: false };

  const paths = [];
  let afterTerminator = false;
  for (let index = operationIndex + 1; index < argv.length; index++) {
    const token = argv[index];
    const value = staticValue(token);
    if (value === null) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_GIT_SHOW_OBJECT' };
    if (!afterTerminator && value === '--') {
      afterTerminator = true;
      continue;
    }
    // Presentation switches and options (including optional `--format`) are
    // not object operands. Keep scanning so a following tree-object path is
    // still classified.
    if (!afterTerminator && value.startsWith('-')) continue;

    const separator = value.indexOf(':');
    if (separator < 0) continue; // A revision such as HEAD names no file path.
    const objectPath = value.slice(separator + 1);
    if (!objectPath) continue;
    paths.push(pathEntry(objectPath, 'git-show-object', 'argv', statement, token,
      /[\\/]/.test(objectPath)));
  }

  for (const entry of paths) entry.cwdChanges = cwdChanges;
  if (cwdChanges.length) paths.push({ ...pathEntry('.', 'git-cwd', 'argv', statement), cwdChanges });
  return { paths, protected: true };
}

function inlineCodeBody(statement) {
  const command = commandName(statement);
  if (!INLINE_INTERPRETERS.has(command)) return null;
  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];
  for (let index = 0; index < argv.length; index++) {
    const value = staticValue(argv[index]);
    if (value === null) return { unknown: true };
    if (/^-[cer]$/.test(value)) {
      const body = argv[index + 1];
      return body && staticValue(body) !== null
        ? { value: staticValue(body), unknown: false }
        : { unknown: true };
    }
  }
  return null;
}

function isFileCapableInlineCode(statement) {
  const body = inlineCodeBody(statement);
  if (!body) return false;
  if (body.unknown) return true;
  return /(?:\brequire\s*\(\s*['"](?:node:)?fs|\b(?:fs\.)?(?:read|write|append|readdir|mkdir|rm|unlink|stat|lstat|open|createRead|createWrite|chmod|copyFile|rename)\w*\s*\(|\bopen\s*\(|\b(?:read|write)File\b|\bpath\.(?:resolve|join|normalize)\b|(?:^|[\s'"`])(?:[A-Za-z]:[\\/]|\/etc\/|\/home\/|\/tmp\/|\.env(?:\b|[./])))/i.test(body.value);
}

function collectShellOperands(statement, inspect, depth = 0) {
  const command = commandName(statement);
  if (!SHELL_WRAPPERS.has(command)) return null;
  if (depth > 2 || typeof inspect !== 'function') {
    return { paths: [], protected: true, unknown: true, unknownCode: 'SHELL_SCOPE_UNKNOWN' };
  }
  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];
  let bodyIndex = -1;
  for (let index = 0; index < argv.length; index++) {
    const value = staticValue(argv[index]);
    if (value === null) return { paths: [], protected: true, unknown: true, unknownCode: 'DYNAMIC_SHELL_BODY' };
    const normalizedOption = value.toLowerCase().replace(/^\/\//, '/');
    if (SHELL_BODY_OPTIONS.has(normalizedOption)) {
      bodyIndex = index + 1;
      break;
    }
  }
  if (bodyIndex < 0 || !argv[bodyIndex]) {
    return { paths: [], protected: true, unknown: true, unknownCode: 'DYNAMIC_SHELL_BODY' };
  }
  const bodyToken = argv[bodyIndex];
  const bodyValue = staticValue(bodyToken);
  const rawBody = typeof bodyToken.value === 'string' ? bodyToken.value : '';
  const isPowerShell = command === 'pwsh' || command === 'powershell';
  const hasHereString = /@['\"]/s.test(bodyValue ?? rawBody);
  if (bodyValue === null && !(isPowerShell && hasHereString)) {
    return { paths: [], protected: true, unknown: true, unknownCode: 'DYNAMIC_SHELL_BODY' };
  }
  // PowerShell here-strings are data, not nested shell syntax. The command
  // scanner quite reasonably marks their verbatim body as dynamic, so strip
  // only those bodies before recursively inspecting the executable portion.
  const nestedSource = isPowerShell && hasHereString
    ? (bodyValue ?? rawBody).replace(/@'[\s\S]*?'@/g, "@''@").replace(/@"[\s\S]*?"@/g, '@""@')
    : bodyValue;
  let nested;
  try {
    nested = inspect(nestedSource);
  } catch (_) {
    return { paths: [], protected: true, unknown: true, unknownCode: 'SHELL_INSPECTION_FAILED' };
  }
  const paths = [];
  let unknown = nested.status === 'UNKNOWN' && nested.statements.length === 0;
  let covered = !unknown;
  let navigationSeen = false;
  for (const [index, child] of (nested.statements || []).entries()) {
    const collected = collectStatement(child, index, inspect, depth + 1);
    if (navigationSeen && collected.protected && !collected.navigation) unknown = true;
    if (collected.navigation) navigationSeen = true;
    paths.push(...collected.paths);
    unknown ||= Boolean(collected.unknown);
    covered &&= Boolean(collected.covered);
  }
  return {
    paths,
    protected: true,
    covered,
    unknown,
    unknownCode: unknown ? 'SHELL_SCOPE_UNKNOWN' : null
  };
}

function splitVolumeSpec(value) {
  const text = String(value || '');
  // Windows drive letters contain a colon. Split on the first colon that is
  // followed by a slash/backslash (or the first ordinary POSIX separator).
  const candidates = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== ':') continue;
    if (i === 1 && /^[A-Za-z]$/.test(text[0])) continue;
    candidates.push(i);
  }
  if (candidates.length === 0) return null;
  const split = candidates[0];
  const source = text.slice(0, split);
  const rest = text.slice(split + 1);
  if (!source || !rest) return null;
  return { source, target: rest.split(':')[0] };
}

function parseMount(value) {
  const fields = String(value || '').split(',');
  const map = new Map();
  for (const field of fields) {
    const index = field.indexOf('=');
    if (index < 1) return null;
    map.set(field.slice(0, index).trim().toLowerCase(), field.slice(index + 1).trim());
  }
  return map;
}

// Container subcommands whose operands are container / image / pod / service REFERENCES, never host
// paths. `docker logs <container>` denied closed on UNSUPPORTED_CONTAINER_FORM purely because only
// `run` and `exec` were modelled: the hook could not classify a bare container ref, so it refused to
// guess — and a routine, read-only log read became unrunnable.
//
// Membership is decided by ONE question: can this subcommand name a HOST path in any operand or
// flag? Everything that can is deliberately absent, and must stay absent:
//   docker/podman — `cp` (host<->container copy), `build`/`buildx` (context dir), `save`/`load`/
//                   `export`/`import` (`-o`/`-i` archives), `compose` (`-f` compose file, handled
//                   separately below), `context`, `volume` (`--opt device=`), `secret`, `config`
//   kubectl       — `cp`, `apply`/`create`/`replace`/`delete`/`patch` (`-f` manifest), `kustomize`
// These return no paths but stay `protected`, so the statement's own redirects are still checked by
// withInvocationRedirects — `docker logs x > /etc/out` is still a boundary decision.
const CONTAINER_REF_SUBCOMMANDS = new Map([
  ['docker', new Set([
    'logs', 'ps', 'top', 'port', 'stats', 'events', 'inspect', 'version', 'info', 'images',
    'start', 'stop', 'restart', 'kill', 'pause', 'unpause', 'wait', 'diff', 'history',
    'attach', 'rm', 'rmi', 'pull', 'push', 'tag', 'search', 'login', 'logout'
  ])],
  ['podman', new Set([
    'logs', 'ps', 'top', 'port', 'stats', 'events', 'inspect', 'version', 'info', 'images',
    'start', 'stop', 'restart', 'kill', 'pause', 'unpause', 'wait', 'diff', 'history',
    'attach', 'rm', 'rmi', 'pull', 'push', 'tag', 'search', 'login', 'logout'
  ])],
  ['kubectl', new Set([
    'logs', 'get', 'describe', 'top', 'events', 'api-resources', 'api-versions',
    'cluster-info', 'version', 'rollout', 'scale', 'wait'
  ])]
]);

// `docker compose <sub>` is safe ONLY when no flag can name a host file. These all can.
const COMPOSE_PATH_FLAGS = new Set(['-f', '--file', '--env-file', '--project-directory']);
const COMPOSE_REF_SUBCOMMANDS = new Set([
  'logs', 'ps', 'top', 'events', 'start', 'stop', 'restart', 'kill', 'pause', 'unpause', 'version'
]);

function composeIsPathFree(argv) {
  let subcommand = null;
  for (let index = 1; index < argv.length; index++) {
    const value = staticValue(argv[index]);
    if (value === null) return false;
    if (COMPOSE_PATH_FLAGS.has(value) || [...COMPOSE_PATH_FLAGS].some(flag => value.startsWith(`${flag}=`))) return false;
    if (!subcommand && !value.startsWith('-')) subcommand = value;
  }
  return subcommand !== null && COMPOSE_REF_SUBCOMMANDS.has(subcommand);
}

function collectContainerOperands(statement) {
  const tool = commandName(statement);
  if (!CONTAINER_TOOLS.has(tool)) return { paths: [], protected: false };
  const argv = Array.isArray(statement?.argv) ? statement.argv.slice(1) : [];
  const subcommand = staticValue(argv[0]);
  if (subcommand && CONTAINER_REF_SUBCOMMANDS.get(tool)?.has(subcommand)) {
    return { paths: [], protected: true, unknown: false, unknownCode: null };
  }
  if (subcommand === 'compose' && tool !== 'kubectl' && composeIsPathFree(argv)) {
    return { paths: [], protected: true, unknown: false, unknownCode: null };
  }
  if (!subcommand || !['run', 'exec'].includes(subcommand) && !(tool === 'kubectl' && subcommand === 'exec')) {
    return { paths: [], protected: true, unknown: true, unknownCode: 'UNSUPPORTED_CONTAINER_FORM' };
  }
  const paths = [];
  let unknown = subcommand === 'exec' || (tool === 'kubectl' && subcommand === 'exec');
  let imageSeen = false;
  for (let index = 1; index < argv.length; index++) {
    const value = staticValue(argv[index]);
    if (value === null) return { paths, protected: true, unknown: true, unknownCode: 'DYNAMIC_CONTAINER_OPERAND' };
    if (value === '-v' || value === '--volume') {
      const spec = staticValue(argv[++index]);
      const parsed = splitVolumeSpec(spec);
      if (!parsed) { unknown = true; continue; }
      paths.push(pathEntry(parsed.source, 'container-bind-source', 'argv', statement, argv[index]));
      continue;
    }
    if (value.startsWith('--volume=')) {
      const parsed = splitVolumeSpec(value.slice('--volume='.length));
      if (!parsed) { unknown = true; continue; }
      paths.push(pathEntry(parsed.source, 'container-bind-source', 'argv', statement, argv[index]));
      continue;
    }
    if (value === '--mount') {
      const map = parseMount(staticValue(argv[++index]));
      if (!map || map.get('type')?.toLowerCase() !== 'bind' || !map.get('source') || !map.get('target')) { unknown = true; continue; }
      paths.push(pathEntry(map.get('source'), 'container-bind-source', 'argv', statement, argv[index]));
      continue;
    }
    if (value.startsWith('--mount=')) {
      const map = parseMount(value.slice('--mount='.length));
      if (!map || map.get('type')?.toLowerCase() !== 'bind' || !map.get('source') || !map.get('target')) { unknown = true; continue; }
      paths.push(pathEntry(map.get('source'), 'container-bind-source', 'argv', statement, argv[index]));
      continue;
    }
    if (value.startsWith('-') && value !== '--') {
      // Known scalar container options are skipped; unknown options cannot be
      // safely assigned a role without a complete container CLI grammar.
      if (new Set(['--name', '--network', '--env', '-e', '--workdir', '-w', '--user', '-u', '--entrypoint']).has(value)) index++;
      else if (!['--rm', '--tty', '-t', '--interactive', '-i', '--detach', '-d', '--read-only'].includes(value)) unknown = true;
      continue;
    }
    // `run`'s first positional is the image. Later positionals are the
    // container command tail and cannot be safely interpreted as host paths.
    // The old index-based check classified an image after `-v/--mount` as an
    // unknown command, which made a fully visible, in-project bind mount fail
    // closed even though its host boundary was known.
    if (subcommand === 'run') {
      if (value === '--') continue;
      if (!imageSeen) imageSeen = true;
      else unknown = true;
    }
  }
  return { paths, protected: true, unknown, unknownCode: unknown ? 'CONTAINER_SCOPE_UNKNOWN' : null };
}

// Wrapper argv roles are owned by the boundary policy. This does not
// evaluate assignments, shell split-string syntax, aliases or executables.
function unwrapCommand(statement) {
  const command = commandName(statement);
  if (!['env', 'sudo', 'command', 'builtin', 'exec'].includes(command)) return null;
  const argv = statement.argv.slice(1);
  const cwdChanges = [];
  const flags = {
    env: new Set(['-i', '--ignore-environment', '-0', '--null']),
    sudo: new Set(['-n', '--non-interactive', '-E', '--preserve-env', '-H', '--set-home']),
    command: new Set(['-p']), builtin: new Set(), exec: new Set(['-c', '-l'])
  };
  const values = {
    env: new Set(['-u', '--unset', '-C', '--chdir']),
    sudo: new Set(['-u', '--user', '-g', '--group']),
    command: new Set(), builtin: new Set(), exec: new Set(['-a'])
  };
  let index = 0;
  for (; index < argv.length; index++) {
    const token = argv[index];
    const value = staticValue(token);
    if (value === null) return { unknown: true };
    if (value === '--') { index++; break; }
    if (command === 'env' && /^[A-Za-z_][A-Za-z0-9_]*=/.test(value)) continue;
    if (!value.startsWith('-') || value === '-') break;
    let { name, inline } = splitOption(token);
    if ((command === 'env' && /^-[uC].+/.test(value)) || (command === 'sudo' && /^-[ug].+/.test(value))) {
      name = value.slice(0, 2);
      inline = value.slice(2);
    }
    if (flags[command].has(name) && inline === undefined) continue;
    if (!values[command].has(name)) return { unknown: true };
    const operand = inline === undefined ? staticPathValue(argv[++index]) : inline;
    if (!operand) return { unknown: true };
    if (command === 'env' && ['-C', '--chdir'].includes(name)) {
      if (cwdChanges.length) return { unknown: true }; // Repeated chdir precedence is not modeled.
      cwdChanges.push(operand);
    }
  }
  if (!argv[index] || staticValue(argv[index]) === null) return { unknown: true };
  return {
    cwdChanges,
    inner: { ...statement, command: argv[index], argv: argv.slice(index), assignments: [], status: 'KNOWN' }
  };
}

// Shell bodies and container images are collected from argv alone, but the
// statement's own redirections are performed by the INVOKING shell before the
// nested body or the container ever starts, so their targets belong to this
// scope — the same reasoning the wrapper branch below already applies. Without
// this merge a fully covered nested body suppresses the legacy fallback and an
// outer '>' target escapes the boundary entirely.
function withInvocationRedirects(collected, statement, index, inspect, depth) {
  if (!(statement?.redirects || []).length) return collected;
  const outer = collectStatement({ ...statement, command: null, argv: [], status: 'KNOWN' }, index, inspect, depth + 1);
  return {
    ...collected,
    paths: [...collected.paths, ...outer.paths],
    protected: Boolean(collected.protected) || Boolean(outer.protected),
    covered: Boolean(collected.covered) && Boolean(outer.covered),
    unknown: Boolean(collected.unknown) || Boolean(outer.unknown),
    unknownCode: collected.unknownCode || outer.unknownCode || null
  };
}

function collectStatement(statement, index, inspect, depth = 0) {
  const command = commandName(statement);
  const wrapper = unwrapCommand(statement);
  if (wrapper) {
    if (wrapper.unknown || depth > 3) return { paths: [], protected: true, covered: true, unknown: true, unknownCode: 'WRAPPER_SCOPE_UNKNOWN' };
    // Shell redirections happen before the wrapper changes cwd. Keep them
    // in the invocation scope, separate from the wrapped command's paths.
    const child = collectStatement({ ...wrapper.inner, redirects: [] }, index, inspect, depth + 1);
    const outer = collectStatement({ ...statement, command: null, argv: [], status: 'KNOWN' }, index, inspect, depth + 1);
    const paths = child.paths.map(entry => ({ ...entry, cwdChanges: [...wrapper.cwdChanges, ...(entry.cwdChanges || [])] }));
    if (wrapper.cwdChanges.length) paths.push({ ...pathEntry('.', 'wrapper-cwd', 'argv', statement), cwdChanges: wrapper.cwdChanges });
    // `protected` is a union (any protected part protects the whole); `covered`
    // is an intersection (the statement is only fully modeled when BOTH the
    // wrapped body and the invocation-scope redirects are), matching the
    // withInvocationRedirects sibling above. OR here let a covered body
    // launder an unmodeled outer redirect.
    return { ...child, paths: [...paths, ...outer.paths], protected: child.protected || outer.protected,
      covered: child.covered && outer.covered, unknown: child.unknown || outer.unknown,
      unknownCode: child.unknownCode || outer.unknownCode };
  }
  if (LINK_MUTATION_ROLES.has(command)) {
    return {
      paths: [],
      protected: true,
      covered: true,
      unknown: true,
      unknownCode: 'LINK_MUTATION_UNSUPPORTED',
      navigation: false
    };
  }
  const navigation = NAVIGATION_ROLES.has(commandName(statement));
  const container = collectContainerOperands(statement);
  if (container.protected) {
    const merged = withInvocationRedirects({ ...container, covered: !container.unknown }, statement, index, inspect, depth);
    return { ...merged, navigation };
  }
  const shell = collectShellOperands(statement, inspect, depth);
  if (shell) return { ...withInvocationRedirects(shell, statement, index, inspect, depth), navigation };
  const gitDiff = collectGitDiffOperands(statement);
  const files = gitDiff.protected ? gitDiff : collectFileOperands(statement);
  const paths = [...files.paths];
  if (isFileCapableInlineCode(statement)) {
    return { paths, protected: true, covered: true, unknown: true, unknownCode: 'INLINE_INTERPRETER_SCOPE_UNKNOWN', navigation };
  }
  for (const redirect of statement.redirects || []) {
    // Classify the heredoc BEFORE the staticness check. The inspector sets
    // `static: false` on a heredoc's `<<` to mean "unsupported construct", not
    // "text produced at run time" — the operator itself is literal. Reading it
    // through staticValue() therefore returned null and tripped the
    // REDIRECT_UNKNOWN guard first, leaving the heredoc branch permanently
    // unreachable and every heredoc reported as a generic unknown redirect.
    const operatorText = redirect.operator?.value ?? null;
    if (operatorText === '<<' || operatorText === '<<-') return { paths, protected: true, unknown: true, unknownCode: 'HEREDOC_UNSUPPORTED', navigation };
    const operator = staticValue(redirect.operator);
    if (!operator) return { paths, protected: true, unknown: true, unknownCode: 'REDIRECT_UNKNOWN', navigation };
    if (['<', '>', '>>', '<>', '>&', '<&', '>|', '&>'].includes(operator)) {
      const target = staticValue(redirect.target);
      if (target === null) return { paths, protected: true, unknown: true, unknownCode: 'REDIRECT_TARGET_UNKNOWN', navigation };
      paths.push(pathEntry(target, operator === '<' ? 'input-redirect' : 'output-redirect', 'redirect', statement, redirect.target));
    }
  }
  // Legacy pattern strippers intentionally accept opaque sed/awk/grep bodies.
  // Do not turn an otherwise path-free opaque pattern into a false boundary
  // denial; absolute/relative operands still flow through the collected paths.
  if (statement.status === 'UNKNOWN' && (paths.length > 0 || navigation)
    && !gitDiff.recoveredParentRevision && !new Set([
    'find', 'sed', 'awk', 'gawk', 'mawk', 'grep', 'egrep', 'fgrep', 'rg', 'ripgrep',
    ...POWERSHELL_FILE_COMMANDS
  ]).has(commandName(statement))) {
    return { paths, protected: true, covered: true, unknown: true, unknownCode: 'STATEMENT_UNKNOWN', navigation };
  }
  const protectedStatement = files.protected || paths.length > 0 || navigation;
  return {
    paths,
    protected: protectedStatement,
    // `covered` answers a NARROWER question than `protected`: did operand-role
    // classification actually MODEL this command, so the legacy regex extractor
    // can be suppressed? A redirect target is collected for ANY command, modeled
    // or not, so `paths.length > 0` must NOT imply coverage — conflating them let
    // `curl -o /etc/passwd https://x > out.txt` mark itself covered off the `>`
    // alone, suppress the fallback that was catching `/etc/passwd`, and ALLOW.
    covered: Boolean(files.protected) || navigation,
    // Operand-role classification owns pattern opacity; aggregation must not
    // erase unresolved file operands or unknown option arity.
    unknown: Boolean(files.unknown),
    unknownCode: files.unknownCode,
    navigation
  };
}

function resolveCandidate(value, base, resolver, metadata = {}) {
  if (typeof value !== 'string' || value.length === 0) return { outcome: 'UNKNOWN', resolved: null };
  if (!resolver || typeof resolver.resolve !== 'function') {
    return { outcome: 'INSIDE', resolved: path.resolve(base, value) };
  }
  try {
    const resolved = resolver.resolve(value, base, metadata);
    if (typeof resolved !== 'string' || resolved.length === 0) return { outcome: 'UNKNOWN', resolved: null };
    return { outcome: 'RESOLVED', resolved };
  } catch (_) {
    return { outcome: 'UNKNOWN', resolved: null };
  }
}

function isPseudoPath(value) {
  const text = normalized(value);
  return /^\/(?:dev|proc|sys)(?:\/|$)/.test(text);
}

function evaluateBoundary({ toolName, toolInput, eventCwd, projectRoot, allowlist = [], inspect, resolver } = {}) {
  const paths = [];
  const diagnostics = [];
  const MAX_STRUCTURED_PATHS = 256;
  const MAX_PATH_LENGTH = 4096;
  const MAX_TOTAL_PATH_BYTES = 262144;
  let totalPathBytes = 0;
  let covered = true;
  const root = typeof projectRoot === 'string' && isAbsoluteLike(projectRoot) ? normalized(projectRoot) : null;
  const eventBase = typeof eventCwd === 'string' && isAbsoluteLike(eventCwd) ? normalized(eventCwd) : null;
  if (!root || !eventBase) return result('UNKNOWN', paths, [diagnostic('INVALID_CONTEXT')]);
  if (!toolInput || typeof toolInput !== 'object' || Array.isArray(toolInput)) return result('ALLOW', paths, []);
  const add = (entry, base) => {
    for (const directory of entry.cwdChanges || []) {
      const resolved = resolveCandidate(directory, base, resolver, { requiresExisting: true, role: 'git-cwd' });
      if (!resolved.resolved) {
        diagnostics.push(diagnostic('PATH_UNRESOLVABLE', entry.statement));
        return;
      }
      base = resolved.resolved;
    }
    if (paths.length >= MAX_STRUCTURED_PATHS || totalPathBytes + entry.value.length > MAX_TOTAL_PATH_BYTES) {
      diagnostics.push(diagnostic('STRUCTURED_PATH_LIMIT'));
      return;
    }
    if (entry.value.length > MAX_PATH_LENGTH) {
      diagnostics.push(diagnostic('STRUCTURED_PATH_TOO_LONG'));
      return;
    }
    totalPathBytes += entry.value.length;
    if (isPseudoPath(entry.value)) {
      paths.push({ statement: entry.statement ?? null, token: entry.token?.start ?? null, role: entry.role, source: entry.source, value: entry.value, resolved: entry.value, outcome: 'INSIDE', diagnostic: null });
      return;
    }
    const resolved = resolveCandidate(entry.value, base, resolver, {
      requiresExisting: entry.requiresExisting,
      role: entry.role
    });
    const inBoundary = resolved.resolved && inside(resolved.resolved, root, allowlist);
    const outcome = resolved.outcome === 'UNKNOWN' ? 'UNKNOWN' : (inBoundary ? 'INSIDE' : 'OUTSIDE');
    // `value` carries the operand AS WRITTEN. `resolved` is null for every
    // UNKNOWN row, so without it a caller reporting the block has nothing to
    // name the offending operand with — `source` is the origin channel
    // ('argv'/'structured'), never path text.
    const row = { statement: entry.statement ?? null, token: entry.token?.start ?? null, role: entry.role, source: entry.source, value: entry.value, resolved: resolved.resolved, outcome, diagnostic: outcome === 'OUTSIDE' ? 'OUTSIDE_PROJECT' : outcome === 'UNKNOWN' ? 'PATH_UNRESOLVABLE' : null };
    paths.push(row);
    if (outcome === 'OUTSIDE') diagnostics.push(diagnostic('OUTSIDE_PROJECT', row.statement, row.token));
    if (outcome === 'UNKNOWN') diagnostics.push(diagnostic('PATH_UNRESOLVABLE', row.statement, row.token));
  };

  for (const [field, value] of [['file_path', toolInput.file_path], ['path', toolInput.path], ['notebook_path', toolInput.notebook_path]]) {
    if (value !== undefined) {
      if (value === '') continue;
      if (typeof value !== 'string') diagnostics.push(diagnostic('STRUCTURED_PATH_INVALID'));
      else add(pathEntry(value, 'structured', field, null), root);
    }
  }
  if (toolName && String(toolName).startsWith('mcp__filesystem__') && Array.isArray(toolInput.paths)) {
    for (let index = 0; index < toolInput.paths.length && paths.length < MAX_STRUCTURED_PATHS; index++) {
      const value = toolInput.paths[index];
      if (typeof value !== 'string' || value.length === 0) diagnostics.push(diagnostic('STRUCTURED_PATH_INVALID'));
      else add(pathEntry(value, 'structured', 'paths[]', null), root);
    }
    if (toolInput.paths.length > MAX_STRUCTURED_PATHS) diagnostics.push(diagnostic('STRUCTURED_PATH_LIMIT'));
  }

  if (typeof toolInput.command === 'string' && toolInput.command.length > 0) {
    if (typeof inspect !== 'function') return result('UNKNOWN', paths, [...diagnostics, diagnostic('POLICY_EXCEPTION')]);
    let inspected;
    try { inspected = inspect(toolInput.command); } catch (_) { return result('UNKNOWN', paths, [...diagnostics, diagnostic('POLICY_EXCEPTION')]); }
    // No statement exists to carry a scanner-wide resource/input failure.
    // Preserve that uncertainty before per-statement role recovery.
    if (inspected.status === 'UNKNOWN' && !(inspected.statements || []).length) {
      diagnostics.push(diagnostic(inspected.diagnostics?.[0]?.code || 'INSPECTION_UNKNOWN'));
    }
    let navigationSeen = false;
    for (let index = 0; index < (inspected.statements || []).length; index++) {
      const statement = inspected.statements[index];
      const collected = collectStatement(statement, index, inspect);
      covered &&= Boolean(collected.covered);
      if (navigationSeen && collected.protected && !collected.navigation) {
        diagnostics.push(diagnostic('CWD_TRANSITION_UNKNOWN', index));
        collected.unknown = true;
        collected.unknownCode = 'CWD_TRANSITION_UNKNOWN';
      }
      if (collected.navigation) navigationSeen = true;
      for (const entry of collected.paths) add({ ...entry, statement: index }, eventBase);
      if (collected.unknown) diagnostics.push(diagnostic(collected.unknownCode || 'STATEMENT_UNKNOWN', index));
    }
  }

  const hasOutside = paths.some(item => item.outcome === 'OUTSIDE');
  const hasUnknown = diagnostics.length > 0 || paths.some(item => item.outcome === 'UNKNOWN');
  const value = result(hasOutside ? 'BLOCK' : hasUnknown ? 'UNKNOWN' : 'ALLOW', paths, diagnostics);
  value.covered = covered;
  return value;
}

module.exports = {
  READ_ROLES,
  WRITE_ROLES,
  evaluateBoundary,
  collectFileOperands,
  collectGitDiffOperands,
  unwrapCommand,
  collectContainerOperands,
  splitVolumeSpec,
  parseMount,
  inside,
  isAbsoluteLike
};
