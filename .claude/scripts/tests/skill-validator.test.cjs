const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// TC-HARNESS-010 / S10: the shipped CLI must detect promised body defects,
// preserve benign skills and report without rewriting structural content.
const script = path.resolve(__dirname, '../../skills/skill-creator/scripts/validate-skills.cjs');
const header = ['---', 'name: fixture', "description: '[Testing] Fixture.'", '---'];
const open = tag => `<!-- SYNC:${tag} -->`;
const close = tag => `<!-- /SYNC:${tag} -->`;
const skill = body => [...header, '## Quick Summary', ...body, ''].join('\n');

function fixture(t, source = fs.readFileSync(script, 'utf8')) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const exported = path.join(root, 'skill-creator', 'scripts', 'validate-skills.cjs');
  const scan = path.join(root, 'skills');
  fs.mkdirSync(path.dirname(exported), { recursive: true });
  fs.mkdirSync(scan);
  fs.writeFileSync(exported, source);
  const env = { CLAUDE_PROJECT_DIR: root };
  // OS essentials only; the Windows well-known folder keys stay so a child never writes shell caches under its cwd.
  for (const key of ['SystemRoot', 'WINDIR', 'PATH', 'PATHEXT', 'COMSPEC', 'SystemDrive', 'ProgramData', 'ALLUSERSPROFILE', 'TEMP', 'TMP']) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return {
    root,
    run(content, args = []) {
      const target = path.join(scan, 'SKILL.md');
      fs.writeFileSync(target, content);
      const result = spawnSync(process.execPath, [exported, '--path', scan, ...args], {
        cwd: root, env, encoding: 'utf8', timeout: 10000
      });
      assert.ifError(result.error);
      assert.equal(result.signal, null, result.stderr);
      assert.equal(fs.readFileSync(target, 'utf8'), content, 'structural diagnostics must preserve the file');
      return result;
    }
  };
}

function expectSyncError(result, detail) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /\[ERROR\].*SYNC/);
  assert.match(result.stdout, detail);
}

test('TC-HARNESS-010: missing Quick Summary warns without failing or rewriting', t => {
  const result = fixture(t).run([...header, '# Fixture', 'Body'].join('\n'), ['--fix']);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /\[WARN\].*Quick Summary.*first 30 lines/);
  assert.match(result.stdout, /0 errors, 1 warnings/);
  assert.match(result.stdout, /Fixes applied: 0/);
});

test('TC-HARNESS-010: summary location uses physical line30 inclusive, LF and CRLF', t => {
  const f = fixture(t);
  for (const newline of ['\n', '\r\n']) {
    for (const line of [29, 30, 31, 32]) {
      const content = [...header, ...Array(line - 5).fill(''), '## Quick Summary', 'Body'].join(newline);
      const result = f.run(content);
      assert.equal(result.status, 0, result.stdout);
      assert.equal(/\[WARN\].*Quick Summary/.test(result.stdout), line > 30, `line ${line}`);
    }
  }
});

for (const [name, body, detail] of [
  ['unclosed', [open('alpha')], /Unclosed.*alpha.*line 6/],
  ['stray close', [close('alpha')], /Unexpected.*alpha.*line 6/],
  ['mismatched', [open('alpha'), close('beta')], /expected.*alpha.*line 6/],
  ['crossed', [open('alpha'), open('beta'), close('alpha'), close('beta')], /expected.*beta.*line 7/]
]) {
  test(`TC-HARNESS-010: rejects ${name} SYNC fences`, t => {
    expectSyncError(fixture(t).run(skill(body), ['--fix']), detail);
  });
}

test('TC-HARNESS-010: nested and repeated balanced tags are accepted', t => {
  const result = fixture(t).run(skill([open('alpha'), open('alpha'), close('alpha'), close('alpha')]));
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Total issues: 0/);
});

test('TC-HARNESS-010: full reminder identity is accepted and must match exactly', t => {
  const f = fixture(t);
  const result = f.run(skill([open('alpha'), open('alpha:reminder'), close('alpha:reminder'), close('alpha')]));
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /Total issues: 0/);
  expectSyncError(f.run(skill([open('alpha:reminder'), close('alpha')])), /expected.*alpha:reminder/);
});

test('TC-HARNESS-010: isolated exported CLI has no root package/config/helper dependency', t => {
  const f = fixture(t);
  for (const absent of ['package.json', 'docs', '.claude']) assert.equal(fs.existsSync(path.join(f.root, absent)), false);
  const result = f.run(skill(['Mention `<!-- SYNC:alpha -->` inline.', open('alpha'), close('alpha')]));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /generic defaults/);
  assert.match(result.stdout, /Total issues: 0/);
});

test('TC-HARNESS-010: fenced SYNC examples are prose and lifecycle metadata is accepted', t => {
  const f = fixture(t);
  const content = [
    '---',
    'name: fixture',
    "description: '[Testing] Fixture.'",
    'status: deprecated',
    'deprecated_by: replacement-skill',
    'deprecated_since: 2026-01-02',
    'removal_after: 2027-01-02',
    '---',
    '## Quick Summary',
    '```markdown',
    '<!-- SYNC:{new-block-name} -->',
    '<!-- /SYNC:{new-block-name} -->',
    '```',
    ''
  ].join('\n');
  const result = f.run(content);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Total issues: \d+ \(0 errors, 0 warnings, \d+ info\)/);
});

test('TC-HARNESS-010: malformed lifecycle metadata fails closed', t => {
  const f = fixture(t);
  const base = ['---', 'name: fixture', "description: '[Testing] Fixture.'"];
  const cases = [
    [['status: retired'], /Unknown lifecycle status/],
    [['status: deprecated'], /must name a replacement/],
    [['status: deprecated', 'deprecated_by: replacement-skill', 'deprecated_since: 2026'], /must use ISO date/],
    [['status: deprecated', 'deprecated_by: replacement-skill', 'deprecated_since: 2027-01-02', 'removal_after: 2026-01-02'], /must not precede/],
    [['status: active', 'deprecated_by: replacement-skill'], /require status: deprecated/],
  ];
  for (const [fields, detail] of cases) {
    const result = f.run([...base, ...fields, '---', '## Quick Summary', 'Body'].join('\n'));
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /\[ERROR\]/);
    assert.match(result.stdout, detail);
  }
});

function lifecycleDate(field, value) {
  return [...header.slice(0, -1), 'status: deprecated', 'deprecated_by: replacement-skill',
    `${field}: ${value}`, '---', '## Quick Summary', 'Body'].join('\n');
}

function expectCalendarError(result, field) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.ok(result.stdout.includes(`Lifecycle field "${field}" must use ISO date YYYY-MM-DD`), result.stdout);
  assert.match(result.stdout, /1 errors, 0 warnings/);
}

test('TC-HARNESS-010: lifecycle dates reject impossible days without rewriting or granting removal', t => {
  // Invariant: author typos cannot silently normalize the earliest GC date.
  const f = fixture(t);
  for (const field of ['deprecated_since', 'removal_after']) {
    for (const value of ['2026-02-30', '2026-02-29', '1900-02-29', '2026-04-31',
      '2026-00-10', '2026-13-10', '2026-01-00', '2026-01-32', '2026-2-01']) {
      const result = f.run(lifecycleDate(field, value), ['--fix']);
      expectCalendarError(result, field);
      assert.match(result.stdout, /Fixes applied: 0/);
    }
    for (const value of ['2024-02-29', '2000-02-29', '2026-02-28', '2026-04-30', '2026-12-31']) {
      const result = f.run(lifecycleDate(field, value), ['--fix']);
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /0 errors, 0 warnings/);
      assert.match(result.stdout, /Fixes applied: 0/);
    }
  }
});

function expectBenignBody(result) {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Total issues: 0/);
}

test('TC-HARNESS-010: unmatched fenced examples are ignored but identical live tags fail', t => {
  // Invariant: example text is data, while a closed fence restores live validation.
  const f = fixture(t);
  for (const marker of ['`', '~']) {
    for (const length of [3, 5]) {
      for (const indent of ['', '   ']) {
        const start = indent + marker.repeat(length) + 'markdown';
        const end = indent + marker.repeat(length);
        for (const [tag, detail] of [[open('example'), /Unclosed.*example/], [close('example'), /Unexpected.*example/]]) {
          expectBenignBody(f.run(skill([start, tag, end]), ['--fix']));
          expectSyncError(f.run(skill([tag]), ['--fix']), detail);
          expectSyncError(f.run(skill([start, tag, end, open('live')])), /Unclosed.*live/);
        }
        if (length > 3) {
          // Neither a shorter delimiter nor the other marker closes the sample.
          const other = marker === '`' ? '~' : '`';
          expectBenignBody(f.run(skill([start, marker.repeat(3), open('short'), other.repeat(length), close('other'), end])));
        }
      }
    }
  }
});

test('TC-HARNESS-010: removing fenced-content exclusion is killed by the preservation oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  const anchor = 'if (fence) continue;';
  assert.equal(source.split(anchor).length, 2, 'one real mutation site');
  const mutant = source.replace(anchor, 'if (false) continue;');
  const result = fixture(t, mutant).run(skill(['```markdown', open('example'), '```']));
  expectSyncError(result, /Unclosed.*example/);
  assert.throws(() => expectBenignBody(result), { code: 'ERR_ASSERTION' });
});

test('TC-HARNESS-010: shape-only calendar mutant is killed by the invalid-day oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  const anchor = 'if (value && !isIsoCalendarDate(value)) {';
  assert.equal(source.split(anchor).length, 2, 'one real mutation site');
  const mutant = source.replace(anchor, 'if (value && !ISO_DATE.test(value)) {');
  const result = fixture(t, mutant).run(lifecycleDate('removal_after', '2026-02-30'));
  assert.equal(result.status, 0, 'the mutation must run and accept the impossible date');
  assert.throws(() => expectCalendarError(result, 'removal_after'), { code: 'ERR_ASSERTION' });
});

test('TC-HARNESS-010: calendar validation handles invalid Date values and normalization separately', t => {
  const source = fs.readFileSync(script, 'utf8');
  for (const [anchor, replacement, value] of [
    ['Number.isFinite(date.getTime()) && ', '', '2026-13-01'],
    ['date.toISOString().slice(0, 10) === value', 'true', '2026-02-30']
  ]) {
    assert.equal(source.split(anchor).length, 2, 'one real calendar mutation site');
    const result = fixture(t, source.replace(anchor, replacement)).run(lifecycleDate('removal_after', value));
    if (value === '2026-13-01') assert.match(result.stderr, /RangeError: Invalid time value/);
    else assert.equal(result.status, 0, 'round-trip deletion must actually accept normalization');
    assert.throws(() => expectCalendarError(result, 'removal_after'), { code: 'ERR_ASSERTION' });
  }
});

test('TC-HARNESS-010: only valid lifecycle dates participate in chronological ordering', t => {
  const f = fixture(t);
  for (const [since, removal, field] of [
    ['2026-13-01', '2026-01-01', 'deprecated_since'],
    ['2026-01-01', '2026-00-01', 'removal_after']
  ]) {
    const content = lifecycleDate('deprecated_since', since).replace('---\n## Quick Summary', `removal_after: ${removal}\n---\n## Quick Summary`);
    const result = f.run(content);
    expectCalendarError(result, field);
    assert.doesNotMatch(result.stdout, /must not precede/);
  }
  for (const removal of ['2026-01-01', '2026-01-02']) {
    const content = lifecycleDate('deprecated_since', '2026-01-01').replace('---\n## Quick Summary', `removal_after: ${removal}\n---\n## Quick Summary`);
    const result = f.run(content);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /0 errors, 0 warnings/);
  }
});

test('TC-HARNESS-010: default scan excludes the template-skill source', t => {
  const f = fixture(t);
  const templateDir = path.join(f.root, 'skills', '_templates', 'template-skill');
  fs.mkdirSync(templateDir, { recursive: true });
  fs.writeFileSync(path.join(templateDir, 'SKILL.md'), [
    '---',
    'name: invalid TEMPLATE',
    '---',
    '# template source'
  ].join('\n'));
  const result = f.run(skill([]));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Found 1 SKILL\.md files/);
  assert.doesNotMatch(result.stdout, /template-skill/);
});

test('TC-HARNESS-010: --fix refuses a scan path outside the project root', t => {
  const f = fixture(t);
  const outside = fs.mkdtempSync(path.join(path.dirname(f.root), 'skill-validator-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const target = path.join(outside, 'SKILL.md');
  const content = [...header, 'name: invalid duplicate'].join('\n');
  fs.writeFileSync(target, content);
  const exported = path.join(f.root, 'skill-creator', 'scripts', 'validate-skills.cjs');
  const result = spawnSync(process.execPath, [exported, '--path', outside, '--fix'], {
    cwd: f.root, env: f.env || { CLAUDE_PROJECT_DIR: f.root }, encoding: 'utf8', timeout: 10000
  });
  assert.equal(result.status, 2, result.stdout + result.stderr);
  assert.match(result.stderr, /outside project root/);
  assert.equal(fs.readFileSync(target, 'utf8'), content, 'external target must remain untouched');
});

test('TC-HARNESS-010: malformed frontmatter still fails', t => {
  const result = fixture(t).run('---\nname: fixture\n## Quick Summary\nBody');
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stdout, /\[ERROR\] No YAML frontmatter found/);
});

test('TC-HARNESS-010: bounded nesting property and boundary counter-cases', t => {
  // Finite domain: depths1..4, two tag families, LF/CRLF; deleting a close,
  // renaming the innermost close, or prepending a close must fail. Not a universal proof.
  const f = fixture(t);
  for (const base of ['alpha', 'alpha:reminder']) {
    for (const depth of [1, 2, 3, 4]) {
      const tags = Array.from({ length: depth }, (_, i) => `${base}-${i}`);
      const starts = tags.map(open);
      const ends = tags.slice().reverse().map(close);
      for (const newline of ['\n', '\r\n']) {
        const valid = skill([...starts, ...ends]).replaceAll('\n', newline);
        assert.equal(f.run(valid).status, 0, `valid ${base}/${depth}/${JSON.stringify(newline)}`);
        for (const body of [[...starts, ...ends.slice(1)], [...starts, close('different'), ...ends.slice(1)], [close('stray'), ...starts, ...ends]]) {
          expectSyncError(f.run(skill(body).replaceAll('\n', newline)), /SYNC/);
        }
      }
    }
  }
});

// Contents list of long skill files: the first 100 lines are what a preview shows and what a host
// keeps after compaction, so a file over 100 lines must list its contents there.
const sized = (total, newline = '\n', extra = []) =>
  [...header, '## Quick Summary', ...extra, ...Array(total - 5 - extra.length).fill('Body')].join(newline) + newline;
const contentsWarning = /\[WARN\] (?:[\w./-]+: )?Contents list must appear in the first 100 lines/;

test('TC-HARNESS-010: a long skill file without a contents list warns without failing or rewriting', t => {
  const result = fixture(t).run(sized(140), ['--fix']);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /\[WARN\] Contents list must appear in the first 100 lines of a file over 100 lines \(missing\)/);
  assert.match(result.stdout, /0 errors, 1 warnings/);
  assert.match(result.stdout, /Fixes applied: 0/);
});

test('TC-HARNESS-010: the contents rule starts above 100 physical lines, LF and CRLF', t => {
  const f = fixture(t);
  for (const newline of ['\n', '\r\n']) {
    for (const total of [99, 100, 101, 102]) {
      const result = f.run(sized(total, newline));
      assert.equal(contentsWarning.test(result.stdout), total > 100, `${total} lines`);
    }
  }
});

test('TC-HARNESS-010: a contents heading counts only inside the first 100 lines', t => {
  const f = fixture(t);
  assert.doesNotMatch(f.run(sized(140, '\n', ['## Contents', '- [Quick Summary](#quick-summary)'])).stdout, contentsWarning);
  const atLine = line => [...header, '## Quick Summary', ...Array(line - 6).fill('Body'), '## Contents', '- [Quick Summary](#quick-summary)', ...Array(40).fill('Body')].join('\n') + '\n';
  assert.doesNotMatch(f.run(atLine(100)).stdout, /Contents list/);
  assert.match(f.run(atLine(101)).stdout, /Contents list must appear.*\(found at line 101\)/);
});

test('TC-HARNESS-010: a fenced contents heading is sample output, never the list', t => {
  assert.match(fixture(t).run(sized(140, '\n', ['```markdown', '## Contents', '```'])).stdout, contentsWarning);
});

// One linked entry per section, flat, in document order: the list an agent reads is complete.
const sections = names => names.flatMap(name => [`## ${name}`, 'Body']);
const doc = (list, names, filler = 120) => [...header, '## Quick Summary', 'Body', '## Contents', '', ...list, '', ...sections(names), ...Array(filler).fill('Body')].join('\n') + '\n';

test('TC-HARNESS-010: a contents list that omits, misnames or empties an entry is reported', t => {
  const f = fixture(t);
  const stale = /\[WARN\] Contents list does not match the headings/;
  const full = ['- [Quick Summary](#quick-summary)', '- [Alpha](#alpha)', '- [Beta](#beta)'];
  assert.doesNotMatch(f.run(doc(full, ['Alpha', 'Beta'])).stdout, /Contents list/);
  assert.match(f.run(doc(full.slice(0, 2), ['Alpha', 'Beta'])).stdout, stale, 'a section added without its entry');
  assert.match(f.run(doc(full, ['Alpha', 'Gamma'])).stdout, stale, 'a renamed section leaves a dead entry');
  assert.match(f.run(doc([], ['Alpha', 'Beta'])).stdout, stale, 'an empty list');
  assert.match(f.run(doc(['- Quick Summary', '- Alpha', '- Beta'], ['Alpha', 'Beta'])).stdout, stale, 'entries without links');
  assert.match(f.run(doc(full, ['Alpha', 'Beta'], 2)).stdout, /Total issues: 0/, 'a short file with a correct list is clean');
  assert.match(f.run(doc(full.slice(0, 2), ['Alpha', 'Beta'], 2)).stdout, stale, 'a short file is still held to the list it carries');
});

test('TC-HARNESS-010: entries follow the heading structure: both top levels when a file has several, the next level when sections are few', t => {
  const f = fixture(t);
  const body = Array(120).fill('Body');
  const lateTitle = [...header, '## Quick Summary', 'Body', '## Contents', '',
    '- [Quick Summary](#quick-summary)', '- [Part One](#part-one)', '- [Inside](#inside)', '- [Part Two](#part-two)', '- [Closing](#closing)', '',
    '# Part One', '## Inside', '### Detail', '# Part Two', '## Closing', ...body].join('\n') + '\n';
  assert.doesNotMatch(f.run(lateTitle).stdout, /Contents list/, 'first and second level, flat, deeper levels left out');
  const few = [...header, '## Quick Summary', 'Body', '## Contents', '',
    '- [Quick Summary](#quick-summary)', '- [Only](#only)', '- [Step A](#step-a)', '- [Step B](#step-b)', '',
    '## Only', '### Step A', '### Step B', ...body].join('\n') + '\n';
  assert.doesNotMatch(f.run(few).stdout, /Contents list/, 'two sections bring their next level in');
  const repeated = [...header, '## Quick Summary', 'Body', '## Contents', '',
    '- [Quick Summary](#quick-summary)', '- [Notes](#notes)', '- [`--flag` & more](#--flag--more)', '- [Notes](#notes-1)', '',
    '## Notes', '## `--flag` & more', '## Notes', ...body].join('\n') + '\n';
  assert.doesNotMatch(f.run(repeated).stdout, /Contents list/, 'repeated headings are numbered and inline code is kept');
});

test('TC-HARNESS-010: --fix-contents writes a missing list after Quick Summary, repairs a stale one, and is idempotent', t => {
  const f = fixture(t);
  const target = path.join(f.root, 'skills', 'SKILL.md');
  const reference = path.join(f.root, 'skills', 'references', 'long.md');
  fs.mkdirSync(path.dirname(reference), { recursive: true });
  const write = () => spawnSync(process.execPath, [path.join(f.root, 'skill-creator', 'scripts', 'validate-skills.cjs'), '--path', path.join(f.root, 'skills'), '--fix-contents'],
    { cwd: f.root, env: { CLAUDE_PROJECT_DIR: f.root, PATH: process.env.PATH || '' }, encoding: 'utf8', timeout: 10000 });
  for (const newline of ['\n', '\r\n']) {
    fs.writeFileSync(target, [...header, '## Quick Summary', 'Body', '<!-- BLOCK:START -->', '## Alpha', '<!-- BLOCK:END -->', '## Beta', ...Array(120).fill('Body')].join(newline) + newline);
    fs.writeFileSync(reference, ['# Title', '', 'Intro', '', '## Contents', '', '- [Gone](#gone)', '', '## One', '## Two', '## Three', ...Array(120).fill('Body')].join(newline) + newline);
    const first = write();
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /Contents lists written: 2/);
    const entry = fs.readFileSync(target, 'utf8');
    assert.equal(entry.includes('\r\n'), newline === '\r\n', 'line endings are kept');
    const lines = entry.split(/\r?\n/);
    const at = lines.indexOf('## Contents');
    assert.ok(at > lines.indexOf('## Quick Summary') && at < lines.indexOf('<!-- BLOCK:START -->'), 'after Quick Summary and never inside a marker block');
    assert.deepEqual(lines.slice(at + 2, at + 5), ['- [Quick Summary](#quick-summary)', '- [Alpha](#alpha)', '- [Beta](#beta)']);
    assert.match(fs.readFileSync(reference, 'utf8'), /## Contents\r?\n\r?\n- \[One\]\(#one\)\r?\n- \[Two\]\(#two\)\r?\n- \[Three\]\(#three\)\r?\n\r?\n## One/);
    const second = write();
    assert.match(second.stdout, /Contents lists written: 0/);
    assert.doesNotMatch(second.stdout, /\[WARN\].*Contents list/);
    assert.equal(fs.readFileSync(target, 'utf8'), entry, 'a second run changes nothing');
  }
});

test('TC-HARNESS-010: bundled Markdown follows the contents rule and vendored packages are not inspected', t => {
  const f = fixture(t);
  const long = Array(140).fill('Reference line').join('\n') + '\n';
  const write = (rel, content) => {
    const target = path.join(f.root, 'skills', rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write('references/long.md', long);
  write('references/indexed.md', `# Title\n\n## Contents\n\n- [Part](#part)\n\n## Part\n${long}`);
  write('references/short.md', 'Short reference\n');
  write('node_modules/vendored/README.md', long);
  const result = f.run(skill(['Body']));
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /\[WARN\] references\/long\.md: Contents list must appear/);
  assert.doesNotMatch(result.stdout, /indexed\.md|short\.md|node_modules/);
  assert.match(result.stdout, /0 errors, 1 warnings/);
});

test('TC-HARNESS-010: bundled contents inspect regular files and report unsupported entries without reading them', t => {
  // A directory-entry seam covers Windows without requiring permission to create symlinks or a FIFO.
  const source = fs.readFileSync(script, 'utf8');
  const marker = "const path = require('path');";
  const shim = `
const actualReaddir = fs.readdirSync;
const actualReadFile = fs.readFileSync;
const unsupportedNames = ['outside.md', 'dangling.md', 'pipe.md'];
fs.readdirSync = (dir, options) => {
  const entries = actualReaddir(dir, options);
  return options?.withFileTypes && path.basename(dir) === 'skills'
    ? entries.concat(unsupportedNames.map(name => ({ name, isDirectory: () => false, isFile: () => false })))
    : entries;
};
fs.readFileSync = (file, ...args) => {
  if (unsupportedNames.includes(path.basename(String(file)))) throw new Error('unsupported entry must never be read');
  return actualReadFile(file, ...args);
};
`;
  assert.ok(source.includes(marker), 'portable CLI seam must exist');
  const f = fixture(t, source.replace(marker, marker + shim));
  fs.writeFileSync(path.join(f.root, 'skills', 'regular.md'), Array(140).fill('Regular reference').join('\n'));
  const result = f.run(skill(['Body']));
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const name of ['outside.md', 'dangling.md', 'pipe.md']) {
    assert.ok(result.stdout.includes(`${name}: Contents not inspected (non-regular Markdown entry)`), name);
  }
  assert.match(result.stdout, /regular\.md: Contents list must appear/);
  assert.match(result.stdout, /--- Summary ---/);
  assert.match(result.stdout, /0 errors, 4 warnings/);
});

test('TC-HARNESS-010: removing the contents check is killed by the long-file oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  const mutant = source.replace('validateContents(filePath, content, result);', '/* seeded mutant: contents ignored */');
  assert.notEqual(mutant, source, 'mutation site must exist');
  assert.doesNotMatch(fixture(t, mutant).run(sized(140)).stdout, contentsWarning);
  assert.match(fixture(t).run(sized(140)).stdout, contentsWarning);
});

test('TC-HARNESS-010: ignored-body semantic mutant is killed by the defect oracle', t => {
  const source = fs.readFileSync(script, 'utf8');
  // Remove only the body-validation call in an isolated copy; schema/CLI remain live.
  const mutant = source.replace('validateBody(fm, result);', '/* seeded mutant: body ignored */');
  assert.notEqual(mutant, source, 'mutation site must exist');
  const result = fixture(t, mutant).run(skill([open('alpha')]));
  assert.equal(result.status, 0, 'mutant must actually skip body rejection');
  assert.throws(() => expectSyncError(result, /Unclosed/), { code: 'ERR_ASSERTION' });
});
