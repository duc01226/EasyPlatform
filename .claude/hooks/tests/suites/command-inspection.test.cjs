'use strict';

// Intent: expose each executable sibling without promoting quoted data to commands.
// All command text is synthetic data. It is NEVER passed to a shell or interpreter.
const assert = require('node:assert/strict');
const load = () => require('../../lib/command-inspection.cjs');
const values = statement => statement.argv.map(token => token.value);
const separators = ['\n', ';', '&&', '||', '|'];
const quote = (value, mode) => mode === 'bare' ? value : mode === 'single' ? `'${value}'` : `"${value}"`;
const continuation = String.fromCharCode(92, 10);

function provenanceOracle(source, result) {
  const span = (item, lower = 0, upper = source.length) => {
    assert.ok(Number.isInteger(item.start) && Number.isInteger(item.end));
    assert.ok(item.start >= lower && item.end >= item.start && item.end <= upper);
    assert.equal(item.raw, source.slice(item.start, item.end));
  };
  let previous = 0;
  for (const statement of result.statements) {
    span(statement, previous);
    previous = statement.end;
    let tokenEnd = statement.start;
    for (const token of statement.tokens) {
      span(token, tokenEnd, statement.end);
      tokenEnd = token.end;
      let partEnd = token.start;
      for (const part of token.parts) {
        span(part, partEnd, token.end);
        partEnd = part.end;
      }
    }
    if (statement.separator) span(statement.separator, statement.end);
  }
}

function continuationOracle(inspect) {
  // Insert only at declared unquoted/double-quoted lexical boundaries, never
  // within comments, single quotes or an escape pair. Unknown values are raw
  // evidence, so compare their certainty/roles rather than pretend resolution.
  const signature = result => ({ status: result.status, statements: result.statements.map(s => ({
    status: s.status, argv: s.argv.map(t => [t.static, t.static ? t.value : null]),
    assignments: s.assignments.map(t => [t.name, t.static, t.static ? t.assignmentValue : null]),
    redirects: s.redirects.map(r => [r.operator.value, r.fd, r.target?.static, r.target?.static ? r.target.value : null]),
    separator: s.separator?.value ?? null
  })) });
  const cases = [
    ['# comment; git push', [0]], ['echo a # comment; git push', [7]],
    ['GIT_DIR=repo git add file', [0, 1, 4, 7, 8, 12]],
    ['2>out git add file', [0, 1]], ['12>>out git add file', [1, 2, 3]],
    ['echo a && git push', [8]], ['echo a || git push', [8]],
    ['cat &>>out', [5, 6]], ['cat <>out', [5]], ['cat 2>&1', [6]],
    ['cat >|out', [5]], ['cat <<<data', [5, 6], 'UNKNOWN'],
    ['cat $FILE; git add file', [4, 5, 6, 8], 'UNKNOWN'], ['cat "$FILE"; git add file', [6, 7, 9], 'UNKNOWN'],
    ['cat ${FILE}; git add file', [5, 7], 'UNKNOWN'], ['cat $(echo x); git add file', [5, 8], 'UNKNOWN'],
    ['cat <(echo x); git add file', [5], 'UNKNOWN'], ['cat >(echo x); git add file', [5], 'UNKNOWN'],
    ['cat "$(echo "$(echo x)")"; git add file', [6, 14], 'UNKNOWN'],
    ['cat $(echo a#b); git status', [12], 'UNKNOWN'],
    ['cat $(echo # data\nx); git status', [11], 'UNKNOWN'],
    ['cat %FILE%; git status', [6, 8], 'UNKNOWN'],
    ['cat ~/fake', [4, 5], 'UNKNOWN'], ['A=~/fake git add file', [1, 2, 3], 'UNKNOWN'],
    ['A=x:~/fake git add file', [2, 4, 5], 'UNKNOWN'],
    ['cat pre"middle"end', [5, 8, 12]], ['cat ""#literal; git status', [6]],
    ['cat 😀file', [6]], ['cat <<EOF\ndata\nEOF\ngit status', [5], 'UNKNOWN']
  ];
  let count = 0;
  for (const [source, positions, status = 'KNOWN'] of cases) {
    const expected = signature(inspect(source));
    assert.equal(expected.status, status, `Continuation role drift baseline: ${JSON.stringify(source)}`);
    for (const at of positions) for (const repeats of [1, 2, 7]) {
      const input = source.slice(0, at) + continuation.repeat(repeats) + source.slice(at);
      const result = inspect(input);
      assert.deepEqual(signature(result), expected, `Continuation role drift: ${JSON.stringify(input)}`);
      provenanceOracle(input, result);
      count++;
    }
  }
  return count;
}

function separatorOracle(inspect) {
  // Finite domain: 5 separators × 3 executable quote modes × 3 protected verbs = 45.
  let checked = 0;
  for (const separator of separators) {
    for (const mode of ['bare', 'single', 'double']) {
      for (const verb of ['add', 'commit', 'push']) {
        const result = inspect(`echo harmless ${separator} ${quote('git', mode)} ${verb} file.txt`);
        assert.equal(result.status, 'KNOWN');
        assert.equal(result.statements.length, 2, `Sibling lost: ${separator}/${mode}/${verb}`);
        assert.deepEqual(values(result.statements[1]), ['git', verb, 'file.txt']);
        assert.equal(result.statements[0].separator.value, separator);
        checked++;
      }
    }
  }
  return checked;
}

function siblingOracle(inspect, source, commands, verbs) {
  const result = inspect(source);
  assert.equal(result.status, 'UNKNOWN', `Opaque certainty: ${JSON.stringify(source)}`);
  assert.deepEqual(result.statements.map(s => s.command?.static ? s.command.value : '<opaque>'), commands,
    `Opaque sibling drift: ${JSON.stringify(source)}`);
  assert.deepEqual(result.statements.filter(s => s.command?.static && s.command.value === 'git').map(values),
    verbs.map(verb => ['git', verb]), `Opaque Git drift: ${JSON.stringify(source)}`);
  provenanceOracle(source, result);
  return result;
}

function opaqueCommentOracle(inspect) {
  const prefixes = [
    'cat ${#FILE}', 'cat "${#FILE}"', 'echo {#x}', '{#x}',
    'cat ${FILE#x}', 'cat ${FILE##x}', 'cat ${FILE:-#x}', 'cat ${FILE:-a #x}',
    'cat ${FILE#(}', 'cat "${FILE#(}"',
    'echo $(echo ${#FILE}#x)', 'echo $(echo ${FILE:-$(echo x)}#x)',
    'echo $(echo x\\#y)', 'echo $(echo ""#x)',
    'echo $(echo x' + continuation + '#y)',
    'echo $( { # ) ; git push\necho x; } )',
    '{ # } ; git push\necho x; }',
    'echo $(echo "${#FILE}#x")'
  ];
  let count = 0;
  for (const prefix of prefixes) for (const separator of [';', '\n']) {
    const first = prefix.startsWith('cat') ? 'cat' : prefix.startsWith('{') ? '<opaque>' : 'echo';
    siblingOracle(inspect, prefix + separator + ' git status', [first, 'git'], ['status']);
    count++;
  }
  for (const operator of ['|', '||', '&&', '&', ';', '>']) for (const gap of ['', continuation, continuation.repeat(7)]) {
    for (const [left, right] of [['echo $(', ')'], ['echo "$(' , ')"'], ['cat <(', ')']]) {
      const source = left + 'echo x ' + operator + gap + '# ) ; git push\ncat x' + right + '; git status';
      siblingOracle(inspect, source, [left.startsWith('cat') ? 'cat' : 'echo', 'git'], ['status']);
      count++;
    }
  }
  return count;
}

function heredocBoundaryOracle(inspect) {
  let count = 0;
  const check = (source, verbs = ['status'], unterminated = false) => {
    const result = siblingOracle(inspect, source, ['cat', ...verbs.map(() => 'git')], verbs);
    assert.equal(result.diagnostics.some(d => d.code === 'UNTERMINATED_HEREDOC'), unterminated,
      `Heredoc termination drift: ${JSON.stringify(source)}`);
    count++;
  };
  for (const delimiter of ['EOF', 'E' + continuation + 'OF']) for (const op of ['<<', '<<-']) {
    check(`cat ${op}${delimiter}\nEO${continuation}F\ngit status`);
    check(`cat ${op}${delimiter}\nx${continuation}EOF\ngit push\nEOF\ngit status`);
    check(`cat ${op}${delimiter}\n# opaque${continuation}git push\nEOF\ngit status`);
  }
  for (const delimiter of ["'EOF'", '"EOF"', "E'O'F", 'E\\OF', "''EOF"]) for (const op of ['<<', '<<-']) {
    check(`cat ${op}${delimiter}\nEO${continuation}F\ngit push`, [], true);
    check(`cat ${op}${delimiter}\nx${continuation}EOF\ngit status`);
    check(`cat ${op}${delimiter}\nEO${continuation}F\ngit push\nEOF\ngit status`);
  }
  for (const slashCount of [1, 2, 3, 4, 7, 8]) {
    const slashes = '\\'.repeat(slashCount);
    // Odd parity joins x + EOF, making the first physical EOF inert. Even
    // parity leaves its newline intact, so that EOF really closes the body.
    if (slashCount % 2) check(`cat <<EOF\nx${slashes}\nEOF\ngit push\nEOF\ngit status`);
    else check(`cat <<EOF\nx${slashes}\nEOF\ngit status`);
  }
  check(`cat <<-EOF\n\tEO${continuation}F\ngit status`);
  check(`cat <<-EOF\n${continuation}\tEOF\ngit status`);
  check(`cat <<-EOF\nEO${continuation}\tF\ngit push\n\tEOF\ngit status`);
  check(`cat <<EOF\n\tEO${continuation}F\ngit push\nEOF\ngit status`);
  check(`cat <<EOF\nEO\\\r\nF\ngit push\nEOF\ngit status`);
  check(`cat <<EOF <<'END'\nEO${continuation}F\ngit push\nEND\ngit status`);
  check('cat <<EOF\nEOF\ngit status');
  check('cat <<EOF\nEOF', []);
  return count;
}

function arithmeticBoundaryOracle(inspect) {
  // Syntax boundaries only: no expression or embedded command is evaluated.
  const wrappers = [
    ['echo $((', '))', 'echo'], ['echo "$((', '))"', 'echo'],
    ['echo $(echo $((', ')))', 'echo'], ['cat "${X:-$((', '))}"', 'cat'],
    ['((', '))', '<opaque>'], ['echo $' + continuation + '(' + continuation + '(', '))', 'echo']
  ];
  let count = 0;
  const check = (left, expression, right, first, separator = ';') => {
    const result = siblingOracle(inspect, left + expression + right + separator + ' git status', [first, 'git'], ['status']);
    assert.equal(result.statements[0].redirects.length, 0, 'Arithmetic redirect leak: opaque operators are not outer redirects');
    count++;
  };
  for (const [left, right, first] of wrappers) {
    // 6 wrappers × 2 operators × 3 gaps × 2 groupings × 2 separators = 144.
    for (const operator of ['<<', '<<=']) for (const gap of ['', ' ', continuation]) {
      for (const grouped of [false, true]) for (const separator of [';', '\n']) {
        const expression = (operator === '<<' ? '1' : 'x') + gap + operator + gap + '2';
        check(left, grouped ? '(' + expression + ')' : expression, right, first, separator);
      }
    }
    for (const expression of ['1 >> 2', '(1 + (2))', '16#10 << 1', '((1)) << 2', '1<(2 << 3)']) check(left, expression, right, first);
    // Each embedded $() is a fresh shell context even within arithmetic.
    // Hostile body text need not evaluate numerically; it must remain opaque.
    for (const body of [') ) ) ) ; git push', '((( {']) {
      check(left, '1 + $(cat <<EOF\n' + body + '\nEOF\n)', right, first);
    }
  }
  return count;
}

function processBoundaryOracle(inspect) {
  const wrappers = [['cat ', '', 'cat'], ['echo $(cat ', ')', 'echo'],
    ['echo "$(cat ', ')"', 'echo'], ['{ cat ', '; }', '<opaque>']];
  let count = 0;
  for (const [left, right, first] of wrappers) for (const direction of ['<', '>']) {
    for (const join of ['', continuation]) for (const gap of ['', ' ', continuation]) {
      const check = body => {
        const input = left + direction + join + '(' + gap + body + ')' + right + '; git status';
        const result = siblingOracle(inspect, input, [first, 'git'], ['status']);
        assert.equal(result.statements[0].redirects.length, 0, 'Process redirect leak');
        count++;
      };
      for (const op of ['<<', '<<-']) for (const delimiter of ['EOF', "'EOF'"]) {
        for (const body of [') ) ) ) ; git push', '((( {']) {
          check('(cat ' + op + delimiter + '\n' + body + '\nEOF\n)');
        }
      }
      // A process body may itself contain real arithmetic. Its comparison
      // followed by grouping must not create another process/shell frame.
      for (const expression of ['1 << 2', '1<(2 << 3)']) check('((' + expression + '))');
    }
  }
  return count; // 4 wrappers × 2 directions × 2 joins × 3 gaps × (8 + 2) = 480.
}

function quoteEvidence(inspect, source, first = 'echo', status = 'UNKNOWN') {
  const result = inspect(source);
  assert.equal(result.status, status, `Quote certainty: ${JSON.stringify(source)}`);
  assert.deepEqual(result.statements.map(s => s.command?.static ? s.command.value : '<opaque>'),
    [first, 'git'], `Quote sibling drift: ${JSON.stringify(source)}`);
  assert.deepEqual(result.statements.filter(s => s.command?.static && s.command.value === 'git').map(values),
    [['git', 'status']], `Quote Git drift: ${JSON.stringify(source)}`);
  assert.equal(result.statements[0].redirects.length, 0, `Quote redirect leak: ${JSON.stringify(source)}`);
  provenanceOracle(source, result);
  return result;
}

function ansiBoundaryOracle(inspect) {
  const wrappers = [['echo ', '', 'echo'], ['echo $(printf %s ', ')', 'echo'],
    ['echo "$(printf %s ', ')"', 'echo'], ['cat <(printf %s ', ')', 'cat'],
    ['cat >(printf %s ', ')', 'cat'], ['{ printf %s ', '; }', '<opaque>'],
    ['echo ${X:-', '}', 'echo'], ['echo $((1 + $(printf %s ', ')))', 'echo'],
    ['cat "${X:-$(printf %s ', ')}"', 'cat']];
  let count = 0;
  for (const [left, right, first] of wrappers) {
    const check = token => { quoteEvidence(inspect, left + token + right + '; git status', first); count++; };
    for (const join of ['', continuation]) {
      for (const slashes of [1, 3, 7]) for (const body of ["'); git push; echo x", "'} ; git push; {"]) {
        check('$' + join + "'" + '\\'.repeat(slashes) + body + "'");
      }
      for (const slashes of [0, 2, 4]) check('$' + join + "'x" + '\\'.repeat(slashes) + "'");
    }
    // Ordinary single quotes close after a backslash, unlike ANSI quotes.
    const source = left + "'x\\'" + right + '; git status';
    quoteEvidence(inspect, source, first, right ? 'UNKNOWN' : 'KNOWN');
    count++;
  }
  return count; // 9 wrappers × (2 joins × (3 odd × 2 bodies + 3 even) + 1) = 171.
}

function quotedParameterOracle(inspect) {
  let count = 0;
  const check = (source, first = 'cat', status = 'UNKNOWN') => {
    const result = quoteEvidence(inspect, source + '; git status', first, status);
    count++;
    return result;
  };
  for (const join of ['', continuation]) for (const literal of ["'}; git push;", "'(", "'\\'"]) {
    const result = check('echo "$' + join + literal + '"', 'echo', 'KNOWN');
    assert.deepEqual(values(result.statements[0]), ['echo', '$' + literal], 'Quote literal value');
  }
  const contexts = [['cat "', '"', 'cat'], ['cat $"', '"', 'cat'], ['echo $(cat "', '")', 'echo']];
  for (const name of ['X', 'FILE_2', '12']) for (const join of ['', continuation]) {
    const parameter = name + join;
    for (const operator of [':-', '-', ':+', '+', ':=', '=', ':?', '?']) {
      for (const [left, right, first] of contexts) for (const body of ["'", "$'", "'\\}x"]) {
        check(left + '${' + parameter + operator + body + '}' + right, first);
      }
      // Without enclosing double quotes the word has its own quote syntax.
      check('cat ${' + parameter + operator + "'} ; git push; {'}");
    }
    for (const operator of ['#', '##', '%', '%%']) for (const surrounding of ['', '"']) for (const body of ["'} ; git push; {'", "'\"} ; git push; {'"]) {
      // POSIX substring-processing words do not inherit enclosing double quotes.
      check('cat ' + surrounding + '${' + parameter + operator + body + '}' + surrounding);
    }
  }
  check('cat "${X:-${Y:-\'}}"');
  check('cat $"${X:-${Y:-\'}}"');
  // Arithmetic boundary recognition does not validate/evaluate the expression.
  // Its quote characters are data under the POSIX arithmetic quoting rule.
  for (const expression of ["1 + '", '1 + "', "1 + $'"]) check('echo $((' + expression + '))', 'echo');
  check("echo $(( ${X:-'} + 1 ))", 'echo');
  check('cat "${FI' + continuation + "LE#'\"} ; git push; {'}" + '"');
  check('cat "' + '${X:-'.repeat(1000) + "'" + '}'.repeat(1000) + '"');
  return count; // 584 composed literal/parameter cases + 6 arithmetic/name/depth controls.
}

function nestedHeredocOracle(inspect) {
  const frames = [
    ['echo $(', ')', 'echo'], ['echo "$(', ')"', 'echo'],
    ['cat <(', ')', 'cat'], ['{ ', '}', '<opaque>'], ['(', ')', '<opaque>'],
    ['cat "${X:-$(', ')}"', 'cat']
  ];
  let count = 0;
  const check = (left, inside, right, first) => {
    siblingOracle(inspect, left + inside + '\n' + right + '; git status', [first, 'git'], ['status']);
    count++;
  };
  for (const [left, right, first] of frames) {
    for (const delimiter of ['EOF', "'EOF'", '"EOF"', "E'O'F", 'E\\OF', 'E' + continuation + 'OF']) {
      for (const op of ['<<', '<<-']) for (const body of [') } ; git push', '( {', "'\"$( # ) } ; git push"]) {
        check(left, `cat ${op}${delimiter}\n${body}\nEOF`, right, first);
      }
    }
    check(left, "cat <<EOF <<'END'\n) ; git push\nEOF\n{\nEND", right, first);
    check(left, `cat <<-EOF\n) ; git push\n\tEO${continuation}F`, right, first);
    check(left, "echo $(cat <<'EOF'\n) } ; git push\nEOF\n)", right, first);
    check(left, 'cat <<EOF # ) } ; git push\n(\nEOF', right, first);
    check(left, 'cat <<<data <<EOF\n) } ; git push\nEOF', right, first);
    check(left, `cat <<EOF\nx${continuation}EOF\n) } ; git push\nEOF`, right, first);
    check(left, `cat <<'EOF'\nEO${continuation}F\n) } ; git push\nEOF`, right, first);
    for (const inert of ['echo "<<EOF"', 'echo \\<\\<EOF', 'cat <<<"literal ) ; git push"', "echo '<<EOF'"]) {
      check(left, inert, right, first);
    }
  }
  return count;
}

const operandTests = [
    {
      name: 'TC-HARNESS-001/CI05: leading assignments and redirect targets retain distinct roles',
      fn() {
        const source = 'GIT_DIR="repo/.git" 2>errors GIT_WORK_TREE=repo git -C a -C b add -- file';
        const statement = load().inspectCommand(source).statements[0];
        assert.deepEqual(statement.assignments.map(token => [token.name, token.assignmentValue]), [['GIT_DIR', 'repo/.git'], ['GIT_WORK_TREE', 'repo']]);
        assert.deepEqual(values(statement), ['git', '-C', 'a', '-C', 'b', 'add', '--', 'file']);
        assert.equal(statement.command.value, 'git');
        assert.equal(statement.redirects[0].fd, '2');
        assert.equal(statement.redirects[0].target.value, 'errors');
        assert.deepEqual(values(load().inspectCommand('echo A=1 "B=2"').statements[0]), ['echo', 'A=1', 'B=2']);
        assert.equal(load().inspectCommand('"A=1" git status').statements[0].assignments.length, 0);
      }
    },
    {
      name: 'TC-HARNESS-002/CI06: every static path/redirect keeps its own quote and operator provenance',
      fn() {
        const source = 'cat <"fake dir/.env" >out >>log 3<>data 2>&1 4<&0 >|clobber';
        const statement = load().inspectCommand(source).statements[0];
        assert.deepEqual(values(statement), ['cat']);
        assert.deepEqual(statement.redirects.map(r => [r.operator.value, r.target.value, r.fd]), [
          ['<', 'fake dir/.env', null], ['>', 'out', null], ['>>', 'log', null], ['<>', 'data', '3'],
          ['>&', '1', '2'], ['<&', '0', '4'], ['>|', 'clobber', null]
        ]);
        for (const token of statement.tokens) assert.equal(source.slice(token.start, token.end), token.raw);
        assert.equal(statement.redirects[0].target.parts[0].quote, 'double');
        assert.deepEqual(values(load().inspectCommand('cat \'C:\\fake dir\\key.pem\' a\\ b').statements[0]), ['cat', 'C:\\fake dir\\key.pem', 'a b']);
      }
    },
    {
      name: 'TC-HARNESS-002/CI07: partial redirect, quote and escape preserve evidence with UNKNOWN',
      fn() {
        for (const input of ['cat <', 'cat > >out', 'git add "unfinished', 'cat trailing\\', 'git status &&', 'git status ||| git add file']) {
          const result = load().inspectCommand(input);
          assert.equal(result.status, 'UNKNOWN', input);
          assert.ok(result.diagnostics.length > 0, input);
          assert.ok(result.statements.some(statement => statement.command.value === (input.startsWith('git') ? 'git' : 'cat')));
        }
      }
    }
];

module.exports = {
  name: 'command-inspection',
  tests: [
    {
      name: 'TC-HARNESS-001/002/CI25: ANSI quote origin and slash parity preserve opaque siblings',
      fn() { assert.equal(ansiBoundaryOracle(load().inspectCommand), 171); }
    },
    {
      name: 'TC-HARNESS-001/002/CI26: literal and parameter quote contexts preserve independent evidence',
      fn() { assert.equal(quotedParameterOracle(load().inspectCommand), 590); }
    },
    {
      name: 'TC-HARNESS-001/002/CI27: quote origin/context mutations fail independent evidence assertions',
      fn() {
        const source = require('node:fs').readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const compile = text => {
          const context = { module: { exports: {} } };
          new (require('node:vm').Script)(text).runInNewContext(context, { timeout: 1000 });
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        const oracle = inspect => {
          assert.equal(ansiBoundaryOracle(inspect), 171);
          assert.equal(quotedParameterOracle(inspect), 590);
        };
        oracle(compile(source));
        for (const [original, replacement, occurrences = 1] of [
          ['processSubstitution, doubleQuoted)', 'processSubstitution, false)'],
          ["if (doubleQuoted && c === '$'", "if (false && c === '$'"],
          ['!parameterPattern(source, at)', 'true'],
          ['isParameter && quoted &&', 'isParameter &&'],
          ['do { at = skipContinuations(source, at + 1); }', 'do { at++; }'],
          ["c === '\"' || c === \"'\" && !frame.quotedParameter", "c === '\"' || c === \"'\""],
          ["c === '$' && /['\"]/.test(source[next] || ' ')", 'false'],
          ["    if (c === '\\\\') {", "    if (c === '\\\\' && frame.close !== \"'\") {"],
          ['pushExpansion(i, true);', 'pushExpansion(i, false);', 2],
          ['pushExpansion(i, frame.quotedParameter || frame.arithmetic)', 'pushExpansion(i, false)'],
          ["!frame.arithmetic && (c === '\"'", "(c === '\"'"],
          ["&& !frame.quotedParameter && !frame.arithmetic", "&& !frame.quotedParameter"]
        ]) {
          assert.equal(source.split(original).length - 1, occurrences, `Quote mutation anchor: ${original}`);
          const mutant = compile(source.replaceAll(original, () => replacement));
          assert.throws(() => oracle(mutant),
            error => error.code === 'ERR_ASSERTION' && /Quote (?:certainty|sibling drift|Git drift|redirect leak)/.test(error.message),
            `Semantic quote-context kill required: ${original}`);
        }
      }
    },
    {
      name: 'TC-HARNESS-001/002/CI23: process origins distinguish subshell and arithmetic body frames',
      fn() { assert.equal(processBoundaryOracle(load().inspectCommand), 480); }
    },
    {
      name: 'TC-HARNESS-001/002/CI24: process origin and arithmetic negative-context mutants fail behavior',
      fn() {
        const source = require('node:fs').readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const compile = text => {
          const context = { module: { exports: {} } };
          new (require('node:vm').Script)(text).runInNewContext(context, { timeout: 1000 });
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        const oracle = inspect => {
          assert.equal(processBoundaryOracle(inspect), 480);
          assert.equal(arithmeticBoundaryOracle(inspect), 186);
        };
        oracle(compile(source));
        for (const [original, replacement] of [
          ["c === '$' && next === '{', c !== '$'", "c === '$' && next === '{', false"],
          ['makeFrame(start, parameter, true, false, processSubstitution, doubleQuoted)', 'makeFrame(start, parameter, true, false, false, doubleQuoted)'],
          ['!processContext && shellContext', 'shellContext'],
          ['else if (processOpening)', 'else if (false)'],
          ['makeFrame(i, false, true, false, true)', 'makeFrame(i, false, true, false, false)'],
          ["frame.shell && (c === '<' || c === '>')", "(c === '<' || c === '>')"],
          ["/[$<>]/.test(c) ? skipContinuations", "c === '$' ? skipContinuations"]
        ]) {
          assert.equal(source.split(original).length - 1, 1, `Unique process mutation target: ${original}`);
          // Replacement text contains shell $' spelling; a callback prevents
          // String.replace from interpreting it as its own suffix placeholder.
          const mutant = compile(source.replace(original, () => replacement));
          assert.throws(() => oracle(mutant),
            error => error.code === 'ERR_ASSERTION' && /Opaque (?:sibling|Git) drift|(?:Arithmetic|Process) redirect leak/.test(error.message),
            `Semantic process kill required: ${original}`);
        }
        for (const mode of ['single', 'double']) {
          const literal = '<((cat <<EOF))>';
          const result = load().inspectCommand('echo ' + quote(literal, mode) + '; git status');
          assert.equal(result.status, 'KNOWN');
          assert.deepEqual(result.statements.map(values), [['echo', literal], ['git', 'status']]);
        }
      }
    },
    {
      name: 'TC-HARNESS-001/002/CI21: arithmetic operators preserve opaque boundaries and genuine shell children',
      fn() { assert.equal(arithmeticBoundaryOracle(load().inspectCommand), 186); }
    },
    {
      name: 'TC-HARNESS-001/002/CI22: arithmetic context mutants fail independent outcomes, not compilation',
      fn() {
        const source = require('node:fs').readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const compile = text => {
          const context = { module: { exports: {} } };
          new (require('node:vm').Script)(text).runInNewContext(context, { timeout: 1000 });
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        assert.equal(arithmeticBoundaryOracle(compile(source)), 186);
        for (const [original, replacement, occurrences] of [
          ['!isParameter && !arithmetic && shellContext', '!isParameter && shellContext', 1],
          ["shellContext && source[skipContinuations(source, at + 1)] === '('", "shellContext && source[at + 1] === '('", 1],
          ["frame.shell && frame.commentBoundary, frame.arithmetic", "frame.shell && frame.commentBoundary, false", 1],
          ["c === '(' && (frame.shell || frame.arithmetic)", "c === '(' && frame.shell", 1],
          ["makeFrame(at, source[at] === '{', true, false, false, quoted)", "makeFrame(at, source[at] === '{', !frames[frames.length - 1].arithmetic, false, false, quoted)", 1]
        ]) {
          assert.equal(source.split(original).length - 1, occurrences, `Arithmetic mutation target: ${original}`);
          const mutant = compile(source.replaceAll(original, replacement));
          assert.throws(() => arithmeticBoundaryOracle(mutant),
            error => error.code === 'ERR_ASSERTION' && /Opaque (?:sibling|Git) drift|Arithmetic redirect leak/.test(error.message),
            `Semantic arithmetic kill required: ${original}`);
        }
        const inspect = load().inspectCommand;
        for (const literal of ['$((1 << 2))', '$((x <<= 1))']) {
          const result = inspect("echo '" + literal + "'; git status");
          assert.equal(result.status, 'KNOWN');
          assert.deepEqual(result.statements.map(values), [['echo', literal], ['git', 'status']]);
        }
        siblingOracle(inspect, 'echo $( (cat <<EOF\n) ) ) ; git push\nEOF\n) ); git status', ['echo', 'git'], ['status']);
        const deep = 'echo $((' + '('.repeat(2000) + '1 << 2' + ')'.repeat(2000) + ')); git status';
        siblingOracle(inspect, deep, ['echo', 'git'], ['status']);
      }
    },
    {
      name: 'TC-HARNESS-001/002/CI19: nested heredoc bodies cannot open/close opaque frames or expose commands',
      fn() { assert.equal(nestedHeredocOracle(load().inspectCommand), 282); }
    },
    {
      name: 'TC-HARNESS-001/002/CI20: nested-body handoff mutants fail behavior; opaque delimiter parsing stays bounded',
      fn() {
        const source = require('node:fs').readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const compile = text => {
          const context = { module: { exports: {} } };
          new (require('node:vm').Script)(text).runInNewContext(context, { timeout: 1000 });
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        assert.equal(nestedHeredocOracle(compile(source)), 282);
        for (const [original, replacement] of [
          ["c === '\\n' && frame.heredocs.length", 'false'],
          ['frame.heredocs.push({ operator, target });', '[].push({ operator, target });'],
          ['consumeHeredocs(source, i + 1, frame.heredocs)', 'consumeHeredocs(source, i + 1, frame.heredocs.slice(0, 1))'],
          ["if (heredoc.value === '<<<') continue;", 'if (false) continue;']
        ]) {
          assert.equal(source.split(original).length - 1, 1, `Unique nested-body mutation target: ${original}`);
          const mutant = compile(source.replace(original, replacement));
          assert.throws(() => nestedHeredocOracle(mutant), error => error.code === 'ERR_ASSERTION' && /Opaque (?:sibling|Git) drift/.test(error.message),
            `Semantic nested-body kill required: ${original}`);
        }
        const inspect = load().inspectCommand;
        const deep = 'echo $(' + 'cat <<$('.repeat(2500) + 'x' + ')'.repeat(2501) + '; git status';
        // A delimiter containing an unresolved opaque expression is outside the
        // selected static subset, just like an unknown outer heredoc target.
        siblingOracle(inspect, deep, ['echo'], []);
        siblingOracle(inspect, 'echo $(cat <<$END\n) ; git push\nEND\n); git status', ['echo'], []);
        siblingOracle(inspect, 'echo $(cat <<EOF\n) ; git push', ['echo'], []);
      }
    },
    {
      name: 'TC-HARNESS-001/002/CI16: opaque comments use frame grammar and exact independent sibling expectations',
      fn() { assert.equal(opaqueCommentOracle(load().inspectCommand), 90); }
    },
    {
      name: 'TC-HARNESS-001/002/CI17: heredoc quote/parity/logical-line boundaries preserve exact siblings',
      fn() { assert.equal(heredocBoundaryOracle(load().inspectCommand), 56); }
    },
    {
      name: 'TC-HARNESS-001/002/CI18: opacity regressions are killed by independent sibling oracles',
      fn() {
        const source = require('node:fs').readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const compile = text => {
          const context = { module: { exports: {} } };
          new (require('node:vm').Script)(text).runInNewContext(context, { timeout: 1000 });
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        assert.equal(opaqueCommentOracle(compile(source)), 90);
        assert.equal(heredocBoundaryOracle(compile(source)), 56);
        const mutations = [
          ["parameter: isParameter, shell, quote: null, commentBoundary: shell", "parameter: isParameter, shell: true, quote: null, commentBoundary: true", opaqueCommentOracle],
          ['frame.shell && /[\\s;|&()<>]/.test(c)', 'frame.shell && /[\\s(;]/.test(c)', opaqueCommentOracle],
          ["frame.commentBoundary = false;\n      i = next;", "frame.commentBoundary = true;\n      i = next;", opaqueCommentOracle],
          ['!quoted && newline >= 0 && slashes % 2 === 1', 'false', heredocBoundaryOracle],
          ['!quoted && newline >= 0 && slashes % 2 === 1', 'newline >= 0 && slashes % 2 === 1', heredocBoundaryOracle],
          ['!quoted && newline >= 0 && slashes % 2 === 1', '!quoted && newline >= 0 && slashes > 0', heredocBoundaryOracle],
          ["part.quote !== 'unquoted' && !isContinuation(part)", "part.quote !== 'unquoted'", heredocBoundaryOracle],
          ["line.replace(/^\\t+/, '')", "line.replace(/\\t+/g, '')", heredocBoundaryOracle]
        ];
        for (const [original, replacement, oracle] of mutations) {
          assert.equal(source.split(original).length - 1, 1, `Unique opacity mutation target: ${original}`);
          const mutant = compile(source.replace(original, replacement));
          assert.throws(() => oracle(mutant), error => error.code === 'ERR_ASSERTION' && /Opaque (?:sibling|Git|certainty) drift|Heredoc termination drift/.test(error.message),
            `Behavioral opacity kill required: ${original}`);
        }
      }
    },
    {
      name: 'TC-HARNESS-001/002/CI13: eligible continuation insertion preserves logical roles and raw provenance',
      fn() { assert.ok(continuationOracle(load().inspectCommand) >= 150); }
    },
    {
      name: 'TC-HARNESS-001/002/CI14: continuation countercontexts remain literal and bounded',
      fn() {
        const inspect = load().inspectCommand;
        for (const source of ['\\# comment; git push', '""' + continuation + '# comment; git push', 'echo a' + continuation + '#b; git status']) {
          const result = inspect(source);
          assert.equal(result.status, 'KNOWN');
          assert.equal(result.statements.length, 2);
          provenanceOracle(source, result);
        }
        const comment = inspect('# comment' + continuation + 'git push');
        assert.deepEqual(comment.statements.map(values), [['git', 'push']]);
        for (const operand of ["'$" + continuation + "FILE'", "'a" + continuation + "b'"]) {
          const result = inspect('cat ' + operand);
          assert.equal(result.status, 'KNOWN');
          assert.equal(result.statements[0].argv[1].value, operand.slice(1, -1));
        }
        for (const operand of ['\\$' + continuation + 'FILE', '"\\$' + continuation + 'FILE"']) {
          const result = inspect('cat ' + operand);
          assert.equal(result.status, 'KNOWN');
          assert.equal(result.statements[0].argv[1].value, '$FILE');
        }
        for (const name of ['"A"', '\\A', "''A"]) {
          const result = inspect(name + continuation + '=repo git status');
          assert.equal(result.statements[0].assignments.length, 0);
        }
        for (const number of ['"2"', '\\2', "''2"]) {
          const result = inspect(number + continuation + '>out git status');
          assert.equal(result.statements[0].redirects[0].fd, null);
          assert.equal(result.statements[0].command.value, '2');
        }
        for (const source of ['cat ""' + continuation + '~/fake', 'A=""' + continuation + '~/fake git status', 'A=x\\:' + continuation + '~/fake git status']) {
          assert.equal(inspect(source).status, 'KNOWN', source);
        }
        const heredoc = 'cat <<EOF\n# data' + continuation + 'git push\nEOF\ngit status';
        assert.deepEqual(inspect(heredoc).statements.map(s => s.command?.value), ['cat', 'git']);
        const large = continuation.repeat(30000) + '# inert; git push';
        assert.deepEqual(inspect(large).statements, []);
        assert.equal(inspect(large).status, 'KNOWN');
      }
    },
    {
      name: 'TC-HARNESS-001/CI01: bounded separator domain preserves executable siblings',
      fn() { assert.equal(separatorOracle(load().inspectCommand), 45); }
    },
    {
      name: 'TC-HARNESS-001/CI02: quoted separators and operation names stay inert operands',
      fn() {
        const input = 'echo "git add x; git push && git commit" \'a|b\' x\\;y';
        const result = load().inspectCommand(input);
        assert.equal(result.statements.length, 1);
        assert.deepEqual(values(result.statements[0]), ['echo', 'git add x; git push && git commit', 'a|b', 'x;y']);
        assert.equal(result.status, 'KNOWN');
      }
    },
    {
      name: 'TC-HARNESS-002/CI03: adjacent quote fragments retain exact offset provenance',
      fn() {
        const input = 'cat pre"middle part"\'end\' ""';
        const { statements: [statement] } = load().inspectCommand(input);
        const token = statement.argv[1];
        assert.equal(token.value, 'premiddle partend');
        assert.equal(token.raw, input.slice(token.start, token.end));
        assert.deepEqual(token.parts.map(part => part.quote), ['unquoted', 'double', 'single']);
        for (const part of token.parts) assert.equal(part.raw, input.slice(part.start, part.end));
        assert.equal(statement.argv[2].value, '');
        assert.equal(statement.argv[2].static, true);
      }
    },
    {
      name: 'TC-HARNESS-001/CI04: escapes, CRLF, comments and literal boundary controls',
      fn() {
        const result = load().inspectCommand('g\\\nit status # git push\r\ncat a\\ b "c\\q" \'$HOME\'');
        assert.deepEqual(result.statements.map(values), [['git', 'status'], ['cat', 'a b', 'c\\q', '$HOME']]);
        assert.equal(result.status, 'KNOWN');
        assert.deepEqual(load().inspectCommand(' \t# comment').statements, []);
        assert.deepEqual(values(load().inspectCommand('echo a#b').statements[0]), ['echo', 'a#b']);
        assert.deepEqual(values(load().inspectCommand('\\\n git add file').statements[0]), ['git', 'add', 'file']);
      }
    },
    ...operandTests,
    {
      name: 'TC-HARNESS-001/CI08: expansions stay UNKNOWN while literal escaped/single-quoted forms are static',
      fn() {
        for (const operand of ['$FILE', '"$FILE"', '${FILE}', '$(printf "x; git push")', '`printf x`', '<(cat fake)', '*.pem', '~/key', '{a,b}', '"$(printf "$(echo x)")"', "$'x; git push'", '$"x; git push"']) {
          const result = load().inspectCommand(`cat ${operand}`);
          assert.equal(result.status, 'UNKNOWN', operand);
          assert.equal(result.statements.length, 1, operand);
          assert.equal(result.statements[0].argv[1].static, false, operand);
        }
        for (const operand of ["'$FILE'", '"\\$FILE"', '\\$FILE', "'*.pem'", '"~/key"', '"a;b"', '%s', '100%']) {
          const result = load().inspectCommand(`cat ${operand}`);
          assert.equal(result.status, 'KNOWN', operand);
          assert.equal(result.statements[0].argv[1].static, true, operand);
        }
      }
    },
    {
      name: 'TC-HARNESS-002/CI09: interpreter, foreign grammar and heredoc bodies are explicitly unsupported',
      fn() {
        for (const input of ['eval "git add fake"', 'bash -c "git push"', 'python -c "print(1)"', 'node -e "1"', 'pwsh -Command "Get-Content fake"', 'cmd /c "type fake"', 'Get-Content fake', '(git add fake)', 'echo %FILE%', 'echo ^&', 'cat <<<literal']) {
          assert.equal(load().inspectCommand(input).status, 'UNKNOWN', input);
        }
        const heredoc = load().inspectCommand("cat <<'EOF'\ngit push\nEOF\ngit add file");
        assert.equal(heredoc.status, 'UNKNOWN');
        assert.deepEqual(heredoc.statements.map(s => s.command?.value), ['cat', 'git']);
        assert.deepEqual(values(heredoc.statements[1]), ['git', 'add', 'file']);
        assert.equal(load().inspectCommand('cat <<EOF\nunterminated').status, 'UNKNOWN');
      }
    },
    {
      name: 'TC-HARNESS-001/CI10: UNKNOWN siblings never erase independent recognized operations',
      fn() {
        // Finite domain: 5 separators × 6 unknown forms × 2 sibling orders = 60.
        const unknowns = ['echo $(echo "git push; x")', 'echo `echo "git push"`', 'eval "git push"', 'node -e "git push"', '(echo "git push")', 'echo $FILE'];
        let checked = 0;
        for (const separator of separators) for (const unknown of unknowns) for (const reverse of [false, true]) {
          const input = (reverse ? ['git add file', unknown] : [unknown, 'git add file']).join(` ${separator} `);
          const result = load().inspectCommand(input);
          assert.equal(result.status, 'UNKNOWN', input);
          const git = result.statements.filter(s => s.command?.static && s.command.value === 'git');
          assert.equal(git.length, 1, input);
          assert.deepEqual(values(git[0]), ['git', 'add', 'file']);
          checked++;
        }
        assert.equal(checked, 60);
        const mixed = load().inspectCommand('GIT_DIR=$REPO git add file; cat "$FILE" fake.pem');
        assert.equal(mixed.statements[0].assignments[0].static, false);
        assert.equal(mixed.statements[0].command.static, true);
        assert.equal(mixed.statements[1].argv[2].static, true);
        assert.equal(load().inspectCommand('GIT_DIR=~/fake git add file').statements[0].assignments[0].static, false);
        assert.deepEqual(load().inspectCommand('echo data & git add file').statements.map(s => s.command?.value), ['echo', 'git']);
      }
    },
    {
      name: 'TC-HARNESS-001/CI11: finite size and nesting boundary stays bounded without runtime evaluation',
      fn() {
        const { inspectCommand, MAX_COMMAND_LENGTH } = load();
        for (const length of [0, 1, 1024, MAX_COMMAND_LENGTH - 1, MAX_COMMAND_LENGTH]) {
          const result = inspectCommand('x'.repeat(length));
          assert.equal(result.status, 'KNOWN');
          if (length) assert.equal(result.statements[0].argv[0].end, length);
        }
        for (const input of ['x'.repeat(MAX_COMMAND_LENGTH + 1), null, {}, 1]) {
          const result = inspectCommand(input);
          assert.equal(result.status, 'UNKNOWN');
          assert.equal(result.statements.length, 0);
          assert.equal(result.diagnostics.length, 1);
        }
        const nested = `echo ${'$('.repeat(1000)}x${')'.repeat(1000)}; git push`;
        assert.equal(inspectCommand(nested).statements[1].command.value, 'git');
        const many = inspectCommand('x;'.repeat(10000));
        assert.equal(many.statements.length, 10000);
        assert.equal(many.status, 'KNOWN');
      }
    },
    {
      name: 'TC-HARNESS-001/CI12: semantic separator-ignore mutant is killed by the same behavior oracle',
      fn() {
        const fs = require('node:fs');
        const vm = require('node:vm');
        const source = fs.readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const original = "finish(tokenAt(source, 'separator', i, separatorMatch.end, separator));";
        assert.equal(source.split(original).length - 1, 1, 'Mutation target must exist exactly once');
        const compile = text => {
          const context = { module: { exports: {} } };
          new vm.Script(text).runInNewContext(context, { timeout: 1000 });
          // Normalize VM realm prototypes; this is trusted module source, never command input.
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        assert.equal(separatorOracle(compile(source)), 45, 'Unmodified source must pass the mutation oracle');
        const mutant = compile(source.replace(original, `if (separator !== ';') ${original}`));
        assert.equal(mutant('echo one; git push').statements.length, 1, 'Mutant must change separator behavior');
        assert.throws(() => separatorOracle(mutant), error => error.code === 'ERR_ASSERTION' && error.message.includes('Sibling lost'), 'Syntax/load errors do not count as mutation kills');
      }
    },
    {
      name: 'TC-HARNESS-001/002/CI15: continuation-role mutants are killed by the same composition oracle',
      fn() {
        const source = require('node:fs').readFileSync(require.resolve('../../lib/command-inspection.cjs'), 'utf8');
        const compile = text => {
          const context = { module: { exports: {} } };
          new (require('node:vm').Script)(text).runInNewContext(context, { timeout: 1000 });
          return input => JSON.parse(JSON.stringify(context.module.exports.inspectCommand(input)));
        };
        assert.ok(continuationOracle(compile(source)) >= 150);
        const mutations = [
          ['if (!isContinuation(item)) hasWordSyntax = true;', 'hasWordSyntax = true;'],
          ['lexicalSpelling(token).match', 'token.raw.match'],
          ['/^\\d+$/.test(lexicalSpelling(prior))', '/^\\d+$/.test(prior.raw)'],
          ['const nextIndex = skipContinuations(source, start + 1);', 'const nextIndex = start + 1;'],
          ['if (offset) end = skipContinuations(source, end);', 'if (offset) end += 0;'],
          ["c === '~' && !hasWordSyntax", "c === '~' && from === start"],
          ['/^[A-Za-z_][A-Za-z0-9_]*=/.test(lexicalSpelling(token)) && /[=:]~/.test(unquotedRuns)', 'false'],
          ["c === '#' && frame.shell && frame.commentBoundary", "c === '#' && frame.shell && /[\\s(;]/.test(source[i - 1])"],
          ['/%[A-Za-z_][A-Za-z0-9_]*%/.test(unquotedRuns) && token.static', 'false']
        ];
        for (const [original, replacement] of mutations) {
          assert.equal(source.split(original).length - 1, 1, `Unique mutation target: ${original}`);
          const mutant = compile(source.replace(original, replacement));
          assert.throws(() => continuationOracle(mutant), error => error.code === 'ERR_ASSERTION' && error.message.includes('Continuation role drift'), `Semantic kill required: ${original}`);
        }
      }
    }
  ]
};
