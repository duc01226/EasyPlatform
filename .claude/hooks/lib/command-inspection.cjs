'use strict';

/**
 * Pure, bounded POSIX-like command inspection; NEVER execution or a shell sandbox.
 * inspectCommand(text) returns {status, statements, diagnostics}. KNOWN means only
 * supported static syntax, never permission/safety or a prediction of execution.
 * Offsets are UTF-16, end-exclusive. Each token retains raw text, decoded value,
 * static certainty and quote/escape parts. argv includes command, omits leading
 * assignments and redirects. UNKNOWN statements still expose known static tokens:
 * consumers inspect ALL statements and token.static, not just result.status.
 * No expansion, environment, filesystem, aliases, functions or cwd is evaluated.
 *
 * Statement: {start,end,raw,tokens,command,argv,assignments,redirects,separator,
 *             status,diagnostics}. command is argv[0] or null; assignment-only and
 * redirect-only statements are valid. Assignment tokens expose name and
 * assignmentValue. Redirects expose {operator,target,fd}; fd is a string or null,
 * operator.value excludes the fd, operator.raw retains it; missing target is null.
 * Token: {kind,start,end,raw,value,static,parts}; parts retain quote mode
 * (unquoted/single/double/escape), offsets, raw and decoded value. UNKNOWN token
 * values are evidence text only, NEVER a resolved argument. Diagnostic:
 * {code,start,end,status:'UNKNOWN'}. Separators live on the preceding statement.
 *
 * Supported: ordinary words, quotes, escapes, comments, leading name=value,
 * newline/;/&&/||/pipe, static input/output/append/fd redirects. Unsupported:
 * expansions, globs/tilde, compound grammar, eval/interpreters, native shell
 * grammar and heredocs. Opaque balanced regions and bounded heredoc delimiters
 * prevent their data becoming commands; an unterminated opaque region consumes
 * the remaining text. This is not a general shell parser. Alias/function lookup,
 * shell state and whether any branch runs remain outside this syntax contract.
 * Input above MAX_COMMAND_LENGTH or non-string input returns UNKNOWN with no
 * statements. The scanner advances monotonically, uses an iterative opaque-region
 * stack, and stores O(n) evidence within that fixed input cap. No I/O or imports.
 */
const MAX_COMMAND_LENGTH = 65536;
const SEPARATORS = new Set(['\n', ';', '&&', '||', '|']);
const REDIRECTS = ['&>>', '<<<', '<<-', '>>', '<<', '<>', '>&', '<&', '>|', '&>', '<', '>'];

function diagnostic(code, start, end) { return { code, start, end, status: 'UNKNOWN' }; }
function tokenAt(source, kind, start, end, value = source.slice(start, end)) {
  return { kind, start, end, raw: source.slice(start, end), value, static: true, parts: [] };
}

// Call only where unquoted/double-quoted line joining applies. Never normalize
// the whole source: comments, single quotes and heredoc bodies retain raw lines.
function skipContinuations(source, index) {
  while (source[index] === '\\' && source[index + 1] === '\n') index += 2;
  return index;
}
function joinedOperator(source, start, operators) {
  for (const value of operators) {
    let end = start;
    let matched = true;
    for (let offset = 0; offset < value.length; offset++) {
      if (offset) end = skipContinuations(source, end);
      if (source[end] !== value[offset]) { matched = false; break; }
      end++;
    }
    if (matched) return { value, end };
  }
  return null;
}
const isContinuation = part => part.quote === 'escape' && part.raw === '\\\n';
// Keep meaningful quotes/escapes: a decoded "A" or escaped digit is not a
// lexical assignment name or IO_NUMBER, even when its value looks like one.
const lexicalSpelling = token => token.parts.filter(part => !isContinuation(part)).map(part => part.raw).join('');

function parameterPattern(source, start) {
  // Only identify the operator after a literal parameter name. Do not resolve
  // its value or scan the whole nested word. #/##/%/%% have their own quoting.
  let at = skipContinuations(source, start + 1);
  const name = /[A-Za-z_]/.test(source[at] || ' ') ? /[A-Za-z0-9_]/ : /[0-9]/;
  if (name.test(source[at] || ' ')) {
    do { at = skipContinuations(source, at + 1); } while (name.test(source[at] || ' '));
  } else at = skipContinuations(source, at + 1); // Single-character special parameter.
  return source[at] === '#' || source[at] === '%';
}

// Balance unsupported regions solely to find their outer boundary. Never tokenize
// their contents as executable siblings. Iterative stack avoids recursion limits.
function opaqueEnd(source, start, parameter = false, processSubstitution = false, doubleQuoted = false) {
  const makeFrame = (at, isParameter = false, shellContext = true, arithmeticContext = false, processContext = false, quoted = false) => {
    const opening = source[at];
    // Arithmetic parentheses balance normally, but shifts are not redirects.
    // Ordinary grouping inherits arithmetic; an explicit nested $() does not.
    const arithmetic = opening === '(' && (arithmeticContext ||
      !processContext && shellContext && source[skipContinuations(source, at + 1)] === '(');
    // A brace inside a parameter word is not a shell command body. A standalone
    // brace group is: keep its comments opaque, including their closing braces.
    const shell = !isParameter && !arithmetic && shellContext && (opening === '(' || opening === '{' && /[ \t\n]/.test(source[skipContinuations(source, at + 1)] || 'x'));
    return { close: opening === '(' ? ')' : opening === '{' ? '}' : opening,
      parameter: isParameter, shell, quote: null, commentBoundary: shell, heredocs: [], arithmetic,
      quotedParameter: isParameter && quoted && !parameterPattern(source, at) };
  };
  // The first '(' in <((...)) belongs to process substitution, not arithmetic.
  const frames = [makeFrame(start, parameter, true, false, processSubstitution, doubleQuoted)];
  // A real shell child starts fresh; only a parameter word may inherit quotes.
  const pushExpansion = (at, quoted) => frames.push(makeFrame(at, source[at] === '{', true, false, false, quoted));
  let i = start + 1;
  while (i < source.length && frames.length) {
    const frame = frames[frames.length - 1];
    const c = source[i];
    const next = /[$<>]/.test(c) ? skipContinuations(source, i + 1) : i + 1;
    const processOpening = frame.shell && (c === '<' || c === '>') && source[next] === '(';
    if (frame.quote === "'") { if (c === "'") frame.quote = null; i++; continue; }
    if (c === '\\') {
      if (source[i + 1] !== '\n') frame.commentBoundary = false;
      i = Math.min(source.length, i + 2);
      continue;
    }
    if (frame.close === '`') { if (c === '`') frames.pop(); i++; continue; }
    if (frame.close === "'" || frame.close === '"') {
      if (c === frame.close) frames.pop();
      else if (frame.close === '"' && c === '$' && /[({]/.test(source[next] || ' ')) {
        i = next;
        pushExpansion(i, true);
      }
      else if (frame.close === '"' && c === '`') frames.push(makeFrame(i));
      i++;
      continue;
    }
    if (!frame.quote && frame.shell) {
      if (c === '\n' && frame.heredocs.length) {
        i = consumeHeredocs(source, i + 1, frame.heredocs);
        frame.heredocs = [];
        frame.commentBoundary = true;
        continue;
      }
      const heredoc = c === '<' ? joinedOperator(source, i, ['<<<', '<<-', '<<']) : null;
      if (heredoc) {
        const operator = tokenAt(source, 'redirect', i, heredoc.end, heredoc.value);
        i = heredoc.end;
        frame.commentBoundary = true;
        // A here-string is not a pending body. Consume its whole operator so
        // its second '<' cannot be mistaken for a new heredoc declaration.
        if (heredoc.value === '<<<') continue;
        while (i < source.length) {
          const joined = skipContinuations(source, i);
          if (joined !== i) { i = joined; continue; }
          if (!/[ \t\r]/.test(source[i])) break;
          i++;
        }
        // Static delimiters use the normal quote/escape decoder, but an opaque
        // delimiter cannot recurse into this scanner. Its boundary is unknown.
        const target = readWord(source, i, [], false);
        if (target.end === i || !target.static) return source.length;
        frame.heredocs.push({ operator, target });
        i = target.end;
        frame.commentBoundary = false;
        continue;
      }
    }
    if (frame.quote === '"') {
      if (c === '"') frame.quote = null;
      else if (c === '$' && /[({]/.test(source[next] || ' ')) {
        i = next;
        pushExpansion(i, true);
      } else if (c === '`') frames.push(makeFrame(i));
    } else if (c === '#' && frame.shell && frame.commentBoundary) {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    } else if (processOpening) {
      i = next;
      frame.commentBoundary = false;
      frames.push(makeFrame(i, false, true, false, true));
    } else if (c === '$' && /['"]/.test(source[next] || ' ') && !frame.quotedParameter && !frame.arithmetic) {
      // Dollar-single quotes retain escape boundaries; ordinary single quotes
      // above do not. No escape value or locale translation is evaluated.
      i = next;
      frame.commentBoundary = false;
      frames.push(makeFrame(i));
    } else if (c === '$' && /[({]/.test(source[next] || ' ')) {
      frame.commentBoundary = false;
      i = next;
      pushExpansion(i, frame.quotedParameter || frame.arithmetic);
    } else if (!frame.arithmetic && (c === '"' || c === "'" && !frame.quotedParameter)) { frame.quote = c; frame.commentBoundary = false; }
    else if (c === frame.close) {
      if (frame.heredocs.length) return source.length;
      frames.pop();
    }
    else if (c === '`') { frame.commentBoundary = false; frames.push(makeFrame(i)); }
    else if (!frame.parameter && (c === '(' && (frame.shell || frame.arithmetic) || c === '{')) {
      frames.push(makeFrame(i, false, frame.shell && frame.commentBoundary, frame.arithmetic));
      frame.commentBoundary = c === '(';
    } else frame.commentBoundary = frame.shell && /[\s;|&()<>]/.test(c);
    i++;
  }
  return i;
}

function expansionEnd(source, start, boundOpaque = true, doubleQuoted = false) {
  const c = source[start];
  const nextIndex = skipContinuations(source, start + 1);
  const next = source[nextIndex] || '';
  if (doubleQuoted && c === '$' && /['"]/.test(next || ' ')) return start;
  if (c === '`' || c === '(' || c === '{') return boundOpaque ? opaqueEnd(source, start) : source.length;
  if ((c === '$' && /[({'"]/.test(next || ' ')) || ((c === '<' || c === '>') && next === '(')) return boundOpaque ? opaqueEnd(source, nextIndex, c === '$' && next === '{', c !== '$', doubleQuoted) : source.length;
  if (c !== '$' || !/[A-Za-z0-9_?*!@#$\-'"(]/.test(next)) return start;
  let end = nextIndex + 1;
  if (/[A-Za-z_]/.test(next)) {
    let candidate = skipContinuations(source, end);
    while (/[A-Za-z0-9_]/.test(source[candidate] || ' ')) {
      end = candidate + 1;
      candidate = skipContinuations(source, end);
    }
  }
  return end;
}

function readWord(source, start, diagnostics, boundOpaque = true) {
  const token = tokenAt(source, 'word', start, start, '');
  let i = start;
  let hasWordSyntax = false;
  const part = (quote, from, to, value) => {
    const item = { quote, start: from, end: to, raw: source.slice(from, to), value };
    token.parts.push(item);
    if (!isContinuation(item)) hasWordSyntax = true;
    token.value += value;
  };
  const unknown = (from, to, code = 'UNSUPPORTED_EXPANSION') => {
    token.static = false;
    diagnostics.push(diagnostic(code, from, to));
  };
  while (i < source.length && (!/[\s;|&<>]/.test(source[i]) || /[<>]/.test(source[i]) && source[skipContinuations(source, i + 1)] === '(')) {
    const from = i;
    const c = source[i];
    if (c === '#' && !hasWordSyntax) break;
    const expandedEnd = expansionEnd(source, i, boundOpaque);
    if (expandedEnd > i) {
      i = expandedEnd;
      unknown(from, i);
      part('unquoted', from, i, source.slice(from, i));
    } else if (c === '\\') {
      i++;
      if (i === source.length) {
        token.static = false;
        diagnostics.push(diagnostic('TRAILING_ESCAPE', from, i));
        part('escape', from, i, '');
      } else if (source[i] === '\n') part('escape', from, ++i, '');
      else part('escape', from, ++i, source[i - 1]);
    } else if (c === "'" || c === '"') {
      const quote = c;
      let value = '';
      i++;
      while (i < source.length && source[i] !== quote) {
        if (quote === '"' && source[i] === '\\' && /[\n$`"\\]/.test(source[i + 1] || ' ')) {
          i++;
          if (source[i] !== '\n') value += source[i];
          i++;
        } else if (quote === '"' && (source[i] === '$' || source[i] === '`') && expansionEnd(source, i, boundOpaque, true) > i) {
          const end = expansionEnd(source, i, boundOpaque, true);
          unknown(i, end);
          value += source.slice(i, end);
          i = end;
        } else value += source[i++];
      }
      if (i < source.length) i++;
      else {
        token.static = false;
        diagnostics.push(diagnostic('UNTERMINATED_QUOTE', from, i));
      }
      part(quote === "'" ? 'single' : 'double', from, i, value);
    } else {
      i++;
      while (i < source.length && !/[\s;|&<>\\'"$`(){}]/.test(source[i])) i++;
      // Keep unquoted caret UNKNOWN at the lexical layer: embedded command text
      // may use cmd.exe's escape rules. The Git diff adapter can recover it only
      // after recognizing a supported parent-revision operand position.
      if (/[*?\[\]{}^\x00]|%[A-Za-z_][A-Za-z0-9_]*%/.test(source.slice(from, i)) || c === '~' && !hasWordSyntax || c === ')') unknown(from, i, 'UNSUPPORTED_WORD');
      part('unquoted', from, i, source.slice(from, i));
    }
  }
  token.end = i;
  token.raw = source.slice(start, i);
  const unquotedRuns = token.parts.map(p => isContinuation(p) ? '' : p.quote === 'unquoted' ? p.raw : '\0').join('');
  if (/%[A-Za-z_][A-Za-z0-9_]*%/.test(unquotedRuns) && token.static) unknown(start, i, 'UNSUPPORTED_WORD');
  if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(lexicalSpelling(token)) && /[=:]~/.test(unquotedRuns)) unknown(start, i, 'UNSUPPORTED_EXPANSION');
  return token;
}

function makeStatement(source, tokens, diagnostics, separator) {
  const start = tokens[0].start;
  const end = tokens[tokens.length - 1].end;
  const argv = [];
  const assignments = [];
  const redirects = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === 'redirect') {
      const target = tokens[i + 1]?.kind === 'word' ? tokens[++i] : null;
      redirects.push({ operator: token, target, fd: token.fd });
      if (!target) diagnostics.push(diagnostic('MISSING_REDIRECT_TARGET', token.start, token.end));
    } else {
      const assignment = !argv.length && lexicalSpelling(token).match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
      if (assignment) {
        token.kind = 'assignment';
        token.name = assignment[1];
        token.assignmentValue = token.value.slice(token.name.length + 1);
        assignments.push(token);
      } else argv.push(token);
    }
  }
  const executable = argv[0]?.value.replace(/^.*[\\/]/, '').toLowerCase();
  if (/^(?:eval|source|\.|exec|env|sudo|command|builtin|if|then|else|elif|fi|for|while|until|do|done|case|esac|function|select|time|!|(?:ba|da|z|k|fi)?sh|python[\d.]*|py|node|perl|ruby|pwsh|powershell|cmd)(?:\.exe)?$/.test(executable || '') || /^[A-Z][a-z]+-[A-Z]/.test(argv[0]?.value || '')) {
    diagnostics.push(diagnostic('UNSUPPORTED_COMMAND', argv[0].start, argv[0].end));
  }
  return { start, end, raw: source.slice(start, end), tokens, argv,
    command: argv[0] || null, assignments, redirects, separator,
    status: diagnostics.length ? 'UNKNOWN' : 'KNOWN', diagnostics };
}

// Read only enough heredoc syntax to locate its boundary. Unquoted bodies join
// an unescaped backslash-LF before delimiter comparison; quoted bodies do not.
// Keep every cursor in the original source, and never evaluate body expansions.
function heredocLine(source, start, quoted) {
  const pieces = [];
  let end = start;
  while (end < source.length) {
    const newline = source.indexOf('\n', end);
    const stop = newline < 0 ? source.length : newline;
    let slashes = 0;
    for (let at = stop - 1; at >= end && source[at] === '\\'; at--) slashes++;
    const joined = !quoted && newline >= 0 && slashes % 2 === 1;
    pieces.push(source.slice(end, joined ? stop - 1 : stop));
    end = newline < 0 ? stop : stop + 1;
    if (!joined) break;
  }
  return { line: pieces.join('').replace(/\r$/, ''), end };
}

// One body boundary owner for outer statements and opaque shell frames. Body
// parentheses, quotes, comments and operators are data, not scanner state.
function consumeHeredocs(source, start, heredocs, diagnostics = []) {
  let i = start;
  for (const { operator, target } of heredocs) {
    if (!target.static) return source.length;
    const quoted = target.parts.some(part => part.quote !== 'unquoted' && !isContinuation(part));
    let found = false;
    while (i < source.length) {
      let { line, end } = heredocLine(source, i, quoted);
      // Tabs are stripped from the logical line, not each physical piece.
      if (operator.value === '<<-') line = line.replace(/^\t+/, '');
      i = end;
      if (line === target.value) { found = true; break; }
    }
    if (!found) diagnostics.push(diagnostic('UNTERMINATED_HEREDOC', operator.start, source.length));
  }
  return i;
}

function inspectCommand(source) {
  if (typeof source !== 'string') return { status: 'UNKNOWN', statements: [], diagnostics: [diagnostic('INVALID_INPUT', 0, 0)] };
  if (source.length > MAX_COMMAND_LENGTH) return { status: 'UNKNOWN', statements: [], diagnostics: [diagnostic('INPUT_LIMIT', 0, source.length)] };
  const statements = [];
  const diagnostics = [];
  let tokens = [];
  let pending = [];
  const heredocs = [];
  let i = 0;
  const finish = separator => {
    if (tokens.length) statements.push(makeStatement(source, tokens, pending, separator));
    diagnostics.push(...pending);
    tokens = [];
    pending = [];
  };
  while (i < source.length) {
    const c = source[i];
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '#') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }
    const redirectMatch = source[skipContinuations(source, i + 1)] === '(' ? null : joinedOperator(source, i, REDIRECTS);
    const redirect = redirectMatch?.value;
    if (redirect) {
      const prior = tokens[tokens.length - 1];
      const fd = prior?.kind === 'word' && prior.end === i && /^\d+$/.test(lexicalSpelling(prior)) ? tokens.pop() : null;
      const token = tokenAt(source, 'redirect', fd ? fd.start : i, redirectMatch.end, redirect);
      token.fd = fd ? fd.value : null;
      if (redirect.startsWith('<<')) {
        token.static = false;
        pending.push(diagnostic('UNSUPPORTED_HEREDOC', token.start, token.end));
      }
      tokens.push(token);
      i = redirectMatch.end;
      continue;
    }
    const separatorMatch = joinedOperator(source, i, SEPARATORS);
    const separator = separatorMatch?.value;
    if (separator) {
      if (!tokens.length && separator !== '\n') pending.push(diagnostic('UNEXPECTED_SEPARATOR', i, separatorMatch.end));
      finish(tokenAt(source, 'separator', i, separatorMatch.end, separator));
      i = separatorMatch.end;
      if (separator === '\n') {
        // Delimiters only bound opaque heredoc data; they do not make it supported.
        i = consumeHeredocs(source, i, heredocs, diagnostics);
        heredocs.length = 0;
      }
      continue;
    }
    if (c === '&') {
      pending.push(diagnostic('UNSUPPORTED_OPERATOR', i, i + 1));
      finish({ ...tokenAt(source, 'separator', i, i + 1), static: false });
      i++;
      continue;
    }
    const token = readWord(source, i, pending);
    if (token.end === i) {
      pending.push(diagnostic('UNSUPPORTED_OPERATOR', i, i + 1));
      tokens.push({ ...tokenAt(source, 'unknown', i, ++i), static: false });
    } else {
      if (token.static && token.value === '' && token.parts.every(part => part.quote === 'escape')) {
        i = token.end;
        continue;
      }
      const prior = tokens[tokens.length - 1];
      if (prior?.kind === 'redirect' && ['<<', '<<-'].includes(prior.value)) heredocs.push({ operator: prior, target: token });
      // A line continuation alone creates no argument; an explicitly quoted empty
      // string does. Keeping a phantom empty command would conceal the next word.
      tokens.push(token);
      i = token.end;
    }
  }
  finish(null);
  const last = statements[statements.length - 1];
  if (last?.separator && ['&&', '||', '|'].includes(last.separator.value)) {
    const item = diagnostic('MISSING_STATEMENT', last.separator.start, last.separator.end);
    last.diagnostics.push(item);
    last.status = 'UNKNOWN';
    diagnostics.push(item);
  }
  return { status: diagnostics.length ? 'UNKNOWN' : 'KNOWN', statements, diagnostics };
}

module.exports = { inspectCommand, MAX_COMMAND_LENGTH };
