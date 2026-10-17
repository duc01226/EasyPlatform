'use strict';

/**
 * Guide mode of `.claude/scripts/sync-update-blocks.py` and the shared guide-carrier recognizer.
 *
 * Guards the hybrid carrier contract (BR-PDL-01, -11, -12, -14):
 * - guide mode replaces each requested full body in a skill's SKILL.md with one guide line and
 *   keeps the `:reminder` digests (TC-PDL-029); a second run is a byte no-op (TC-PDL-030); only the
 *   named tags convert (TC-PDL-031);
 * - it never writes an inline review-family skill or a `references/*.md` file (TC-PDL-081), nor an
 *   agent, while the default mode still propagates a canonical edit to skills AND agents
 *   (TC-PDL-061);
 * - strip mode (`--mode=strip-root-pointer`) removes every universal body and reminder and any retired
 *   `Root-carried protocols` pointer line from each skill (inline skills included) and agent, adds
 *   nothing, keeps references/*.md untouched and is a byte no-op on the second run (TC-PDL-036); guide
 *   mode refuses a universal tag; the retired-pointer recognizers of both languages agree;
 * - the Python recognizer (`sync_blocks.has_guide_entry`) and its JavaScript twin
 *   (`lib/protocol-guide-carrier.cjs`) agree on every line, so sensors in either language count
 *   the same carriers.
 *
 * Every case builds a temp project: the real tool and `sync_blocks.py` are copied into it (the tool
 * resolves its root from its own location), and the real projection generator builds the index
 * there. Children run with HOME/USERPROFILE and TMPDIR/TEMP/TMP pointed at a temp dir and the
 * inherited framework switches dropped. Python is resolved `python` → `py -3` → `python3`; an
 * unavailable interpreter fails loud, never passes.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const SCRIPTS_DIR = path.resolve(__dirname, '..');
const TOOL = path.join(SCRIPTS_DIR, 'sync-update-blocks.py');
const SYNC_BLOCKS = path.join(SCRIPTS_DIR, 'sync_blocks.py');
const LINE_ENDINGS = path.join(SCRIPTS_DIR, 'line_endings.py');
const PROJECTION = path.join(SCRIPTS_DIR, 'build-protocol-projection.cjs');
const carrier = require(path.join(SCRIPTS_DIR, 'lib', 'protocol-guide-carrier.cjs'));

// Tags of the hook-delivered universal group in the fixture; no skill or agent carries any part of them.
const UNIVERSAL = ['critical-thinking-mindset', 'ai-mistake-prevention', 'project-reference-docs-guide', 'project-protocol-overlay'];
const UNIVERSAL_BINS = [['critical-thinking-mindset', 'ai-mistake-prevention'], ['project-reference-docs-guide', 'project-protocol-overlay']];
const INLINE_SKILL = 'inline-review';

// ─── Fixture ───────────────────────────────────────────────────────────────

const BODIES = {
    alpha: '> **Alpha** — look before you act.\n>\n> 1. Read the target.\n> 2. Cite `file:line`.',
    beta: '> **Beta** — walk backward from the end state.',
    gamma: '> **Gamma** — one owner per rule.\n>\n> - Edit the owner first.'
};

function canonicalText(bodies) {
    const out = ['# SYNC Inline Versions (fixture)', '', '> Canonical fixture.'];
    const all = { ...bodies };
    for (const tag of UNIVERSAL) all[tag] = `> **${tag}** — universal fixture body.`;
    for (const [tag, body] of Object.entries(all)) {
        out.push('', '---', '', `## SYNC:${tag}`, '', body);
        out.push('', '---', '', `## SYNC:${tag}:reminder`, '', `**Reminder** for ${tag}.`);
    }
    out.push('', '---', '');
    return out.join('\n');
}

function groups() {
    const entry = tag => ({ summary: `Summary of ${tag}`, when: `when ${tag} applies` });
    return {
        version: 1,
        binChars: 9500,
        groups: {
            review: { tags: { alpha: entry('alpha') } },
            'evidence-trace': { tags: { beta: entry('beta') } },
            'workflow-task': { tags: { gamma: entry('gamma') } },
            'spec-test': { tags: {} },
            design: { tags: {} },
            universal: { tags: Object.fromEntries(UNIVERSAL.map(t => [t, entry(t)])), bins: UNIVERSAL_BINS }
        },
        inlineSkills: [INLINE_SKILL]
    };
}

const block = (tag, body) => `<!-- SYNC:${tag} -->\n\n${body}\n\n<!-- /SYNC:${tag} -->\n`;
const reminder = tag => `<!-- SYNC:${tag}:reminder -->\n\n**Reminder** for ${tag}.\n\n<!-- /SYNC:${tag}:reminder -->\n`;

/**
 * A carrier with full bodies of `tags` (from `bodies`) and their reminders, in skill layout.
 * `mention` adds a prose line that quotes a marker: guide mode matches whole-line markers only, so
 * the mention must survive. (The default propagation mode predates that rule and matches markers
 * anywhere, so its cases leave the mention out.)
 */
function carrierText(title, tags, bodies = BODIES, { mention = true } = {}) {
    return [
        '---',
        `name: ${title}`,
        '---',
        '',
        `# ${title}`,
        '',
        mention ? 'Main content. It mentions the `<!-- SYNC:alpha -->` marker in prose, which is never a block.' : 'Main content.',
        '',
        ...tags.map(t => block(t, bodies[t])),
        '## Closing Reminders',
        '',
        ...tags.map(t => reminder(t)),
        'End.',
        ''
    ].join('\n');
}

function tempDir(prefix) {
    return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function write(root, rel, text) {
    const file = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return file;
}

/** Clean-machine child environment: inherited switches dropped, home and temp dirs redirected. */
function childEnv(root, home) {
    const env = {};
    const drop = /^(CLAUDE_|CK_|CODEX_|OPENCODE_|PYTHON|HOME$|USERPROFILE$|TMPDIR$|TEMP$|TMP$)/i;
    for (const [key, value] of Object.entries(process.env)) if (!drop.test(key)) env[key] = value;
    return {
        ...env,
        CLAUDE_PROJECT_DIR: root,
        HOME: home,
        USERPROFILE: home,
        TMPDIR: home,
        TEMP: home,
        TMP: home,
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONIOENCODING: 'utf-8'
    };
}

/**
 * Build a temp project and run `fn({ root, run, py, read })`. `files` maps root-relative paths to
 * text. The real tool and loader are copied under `.claude/scripts/`, and the real projection
 * generator builds `.claude/skills/shared/protocols/` from the fixture canonical file.
 */
function withProject(files, fn, { bodies = BODIES } = {}) {
    const root = tempDir('ck-guide-root-');
    const home = tempDir('ck-guide-home-');
    try {
        write(root, '.claude/skills/shared/sync-inline-versions.md', canonicalText(bodies));
        write(root, '.claude/skills/shared/protocol-groups.json', `${JSON.stringify(groups(), null, 2)}\n`);
        write(root, `.claude/skills/${INLINE_SKILL}/SKILL.md`, `---\nname: ${INLINE_SKILL}\n---\n`);
        for (const [rel, text] of Object.entries(files)) write(root, rel, text);
        fs.mkdirSync(path.join(root, '.claude', 'agents'), { recursive: true });
        for (const src of [TOOL, SYNC_BLOCKS, LINE_ENDINGS]) {
            write(root, `.claude/scripts/${path.basename(src)}`, fs.readFileSync(src, 'utf8'));
        }
        const env = childEnv(root, home);
        const built = spawnSync(process.execPath, [PROJECTION], { cwd: root, env, encoding: 'utf8', timeout: 60000 });
        assert.equal(built.status, 0, `fixture projection build failed: ${built.stderr}`);
        const tool = path.join(root, '.claude', 'scripts', 'sync-update-blocks.py');
        const run = (...args) => py([tool, ...args], { cwd: root, env });
        const read = rel => fs.readFileSync(path.join(root, ...rel.split('/')));
        return fn({ root, run, read, env });
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(home, { recursive: true, force: true });
    }
}

// ─── Python resolution ─────────────────────────────────────────────────────

let PYTHON = null;
/** First interpreter that runs Python 3: `python`, then `py -3` (Windows), then `python3`. */
function python() {
    if (PYTHON) return PYTHON;
    const candidates = [
        { command: 'python', baseArgs: [] },
        { command: 'py', baseArgs: ['-3'] },
        { command: 'python3', baseArgs: [] }
    ];
    const errors = [];
    for (const c of candidates) {
        const r = spawnSync(c.command, [...c.baseArgs, '-c', 'import sys; print(sys.version_info[0])'], { encoding: 'utf8', timeout: 30000 });
        if (r.status === 0 && String(r.stdout).trim() === '3') return (PYTHON = c);
        errors.push(`${c.command}: ${r.error ? r.error.code : `exit ${r.status}`}`);
    }
    throw new Error(`no Python 3 interpreter found (${errors.join('; ')}) — this suite never passes without one`);
}

function py(args, { cwd, env } = {}) {
    const c = python();
    const r = spawnSync(c.command, [...c.baseArgs, ...args], { cwd, env, encoding: 'utf8', timeout: 60000 });
    return { code: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') };
}

/**
 * Python recognizer results for each text, through the real `sync_blocks.py`, plus whether
 * `format_guide_line` accepts each of `lines` (rows of `{tag, summary, when, path}`).
 */
function pyRecognize(texts, tag, lines = []) {
    const program = [
        'import json, sys',
        `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
        'from sync_blocks import format_guide_line, guide_tags, has_guide_entry',
        'data = json.loads(sys.stdin.read())',
        'def fmt(r):',
        '    try:',
        '        return format_guide_line(r["tag"], r["summary"], r["when"], r["path"])',
        '    except ValueError:',
        '        return None',
        `print(json.dumps({"texts": [{"tags": guide_tags(t), "has": has_guide_entry(t, ${JSON.stringify(tag)})} for t in data["texts"]], "lines": [fmt(r) for r in data["lines"]]}))`
    ].join('\n');
    const c = python();
    const home = tempDir('ck-guide-py-');
    try {
        const r = spawnSync(c.command, [...c.baseArgs, '-c', program], {
            input: JSON.stringify({ texts, lines }),
            encoding: 'utf8',
            timeout: 60000,
            env: childEnv(home, home)
        });
        assert.equal(r.status, 0, `python recognizer failed: ${r.stderr}`);
        return JSON.parse(r.stdout);
    } finally {
        fs.rmSync(home, { recursive: true, force: true });
    }
}

// ─── Text helpers ──────────────────────────────────────────────────────────

const lf = buf => String(buf).replace(/\r\n?/g, '\n');
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Body between whole-line markers, or null. */
function markedBody(text, marker) {
    const m = new RegExp(`^<!-- ${escapeRe(marker)} -->\\n([\\s\\S]*?)\\n<!-- /${escapeRe(marker)} -->$`, 'm').exec(lf(text));
    return m ? m[1].trim() : null;
}

const guideLineFor = (root, tag) => {
    const index = JSON.parse(fs.readFileSync(path.join(root, '.claude', 'skills', 'shared', 'protocols', 'index.json'), 'utf8'));
    const row = index.tags.find(r => r.tag === tag);
    return carrier.formatGuideLine({ tag, summary: row.summary, when: row.when, path: row.file });
};

// ─── Cases ─────────────────────────────────────────────────────────────────

test('TC-PDL-029: guide mode replaces each full body with one guide line and keeps every reminder', () =>
    withProject({ '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha', 'beta', 'gamma']) }, ({ root, run, read }) => {
        // Given a skill that carries three full protocol bodies and their reminders
        const before = lf(read('.claude/skills/conv/SKILL.md'));
        // When guide mode converts the three tags
        const result = run('--mode=guide', '--tags', 'alpha,beta,gamma');
        assert.equal(result.code, 0, result.stderr + result.stdout);
        const after = lf(read('.claude/skills/conv/SKILL.md'));
        // Then no full body is left, and each tag has exactly the published guide line
        for (const tag of ['alpha', 'beta', 'gamma']) {
            assert.equal(markedBody(after, `SYNC:${tag}`), null, `${tag} body still inline`);
            assert.ok(after.includes(`${guideLineFor(root, tag)}\n`), `${tag} guide line missing or not in the published form`);
            // And the reminder digest is byte-identical to the one before conversion
            assert.equal(markedBody(after, `SYNC:${tag}:reminder`), markedBody(before, `SYNC:${tag}:reminder`));
        }
        // And both recognizers see exactly the three tags
        assert.deepEqual(carrier.guideTags(after).sort(), ['alpha', 'beta', 'gamma']);
        const [pyResult] = pyRecognize([after], 'beta').texts;
        assert.deepEqual(pyResult.tags.sort(), ['alpha', 'beta', 'gamma']);
        assert.equal(pyResult.has, true);
        // And the prose mention of a marker and the rest of the file are untouched
        assert.ok(after.includes('mentions the `<!-- SYNC:alpha -->` marker in prose'));
        assert.equal(after.split('<!-- PROTOCOL-GUIDES:START -->').length - 1, 1, 'exactly one guide block');
        assert.ok(after.indexOf('<!-- PROTOCOL-GUIDES:START -->') < after.indexOf('## Closing Reminders'), 'block sits where the bodies were');
    }));

test('TC-PDL-030: a second guide run changes no byte; dry run writes nothing and reports the per-skill delta', () =>
    withProject({ '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha', 'beta']) }, ({ run, read }) => {
        // Given an unconverted skill
        const original = read('.claude/skills/conv/SKILL.md');
        // When guide mode runs with --dry-run
        const dry = run('--dry-run', '--mode=guide', '--tags', 'alpha,beta');
        // Then nothing is written and the byte delta for that skill is printed
        assert.equal(dry.code, 0, dry.stderr);
        assert.ok(read('.claude/skills/conv/SKILL.md').equals(original), 'dry run wrote the file');
        // (these fixture bodies are shorter than the block's intro line, so the sign is not asserted)
        assert.match(dry.stdout, /\.claude\/skills\/conv\/SKILL\.md: [+-]\d+ bytes \(alpha, beta\)/);
        // When it converts for real and then runs again
        assert.equal(run('--mode=guide', '--tags', 'alpha,beta').code, 0);
        const converted = read('.claude/skills/conv/SKILL.md');
        const again = run('--mode=guide', '--tags', 'alpha,beta');
        // Then the second run is a byte no-op and says so
        assert.equal(again.code, 0, again.stderr);
        assert.ok(read('.claude/skills/conv/SKILL.md').equals(converted), 'second run changed the skill');
        assert.match(again.stdout, /Total skills changed: 0/);
    }));

test('TC-PDL-031: only the named tags convert; every other body stays in full', () =>
    withProject({ '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha', 'beta', 'gamma']) }, ({ run, read }) => {
        // Given a skill with bodies for alpha, beta and gamma
        const before = lf(read('.claude/skills/conv/SKILL.md'));
        // When conversion runs for alpha and beta only
        const result = run('--mode=guide', '--tags', 'alpha,beta');
        assert.equal(result.code, 0, result.stderr);
        const after = lf(read('.claude/skills/conv/SKILL.md'));
        // Then alpha and beta are guide entries and gamma keeps its full body unchanged
        assert.deepEqual(carrier.guideTags(after).sort(), ['alpha', 'beta']);
        assert.equal(carrier.hasGuideEntry(after, 'gamma'), false);
        assert.equal(markedBody(after, 'SYNC:gamma'), markedBody(before, 'SYNC:gamma'));
        assert.ok(markedBody(after, 'SYNC:gamma').includes('one owner per rule'));
        // When gamma converts later, it joins the same single block
        assert.equal(run('--mode=guide', '--tags', 'gamma').code, 0);
        const later = lf(read('.claude/skills/conv/SKILL.md'));
        assert.deepEqual(carrier.guideTags(later), ['alpha', 'beta', 'gamma']);
        assert.equal(later.split('<!-- PROTOCOL-GUIDES:START -->').length - 1, 1);
    }));

test('TC-PDL-081: guide mode leaves an inlineSkills skill and a references/*.md carrier byte-identical', () => {
    const files = {
        '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha']),
        '.claude/skills/conv/references/r.md': carrierText('reference', ['alpha']),
        [`.claude/skills/${INLINE_SKILL}/SKILL.md`]: carrierText(INLINE_SKILL, ['alpha'])
    };
    return withProject(files, ({ run, read }) => {
        // Given an inline skill, a converted skill and a reference file that all carry alpha
        const inlineBefore = read(`.claude/skills/${INLINE_SKILL}/SKILL.md`);
        const refBefore = read('.claude/skills/conv/references/r.md');
        // When guide mode runs for alpha
        const result = run('--mode=guide', '--tags', 'alpha');
        assert.equal(result.code, 0, result.stderr);
        // Then only the converted skill's SKILL.md changed
        assert.equal(carrier.hasGuideEntry(lf(read('.claude/skills/conv/SKILL.md')), 'alpha'), true);
        assert.ok(read(`.claude/skills/${INLINE_SKILL}/SKILL.md`).equals(inlineBefore), 'inline skill was written');
        assert.ok(read('.claude/skills/conv/references/r.md').equals(refBefore), 'reference file was written');
        assert.match(result.stdout, /Total skills changed: 1\b/);
    });
});

test('TC-PDL-061: a canonical edit reaches every skill AND agent carrier; guide mode then leaves agents byte-identical', () => {
    const oldBodies = { ...BODIES, alpha: '> **Alpha** — the OLD wording.' };
    const plain = { mention: false };
    const files = {
        '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha'], oldBodies, plain),
        '.claude/skills/other/SKILL.md': carrierText('other', ['alpha'], oldBodies, plain),
        '.claude/agents/reviewer.md': carrierText('reviewer', ['alpha'], oldBodies, plain),
        '.claude/agents/planner.md': carrierText('planner', ['alpha'], oldBodies, plain)
    };
    return withProject(files, ({ run, read }) => {
        // Given skill and agent carriers of alpha that hold the old text, and a canonical file that holds the new text
        const carriers = Object.keys(files);
        for (const rel of carriers) assert.ok(markedBody(read(rel), 'SYNC:alpha').includes('OLD wording'));
        // When the default mode propagates alpha
        const sync = run('alpha');
        assert.equal(sync.code, 0, sync.stderr + sync.stdout);
        // Then every skill and agent carrier equals the canonical body
        for (const rel of carriers) assert.equal(markedBody(read(rel), 'SYNC:alpha'), BODIES.alpha, `${rel} not propagated`);
        // When guide mode runs for alpha
        const agentsBefore = ['.claude/agents/reviewer.md', '.claude/agents/planner.md'].map(rel => [rel, read(rel)]);
        const guide = run('--mode=guide', '--tags', 'alpha');
        assert.equal(guide.code, 0, guide.stderr);
        // Then both skills converted and no agent byte changed
        for (const rel of ['.claude/skills/conv/SKILL.md', '.claude/skills/other/SKILL.md']) {
            assert.equal(carrier.hasGuideEntry(lf(read(rel)), 'alpha'), true, `${rel} not converted`);
        }
        for (const [rel, bytes] of agentsBefore) assert.ok(read(rel).equals(bytes), `${rel} was written by guide mode`);
    });
});

test('both modes keep each carrier in its own newline style on every OS (never the host default)', () => {
    const oldBodies = { ...BODIES, alpha: '> **Alpha** — the OLD wording.' };
    const plain = { mention: false };
    const lfText = carrierText('lf', ['alpha'], oldBodies, plain);
    const files = {
        '.claude/skills/lf/SKILL.md': lfText,
        '.claude/skills/crlf/SKILL.md': carrierText('crlf', ['alpha'], oldBodies, plain).replace(/\n/g, '\r\n'),
        '.claude/agents/crlf-agent.md': carrierText('crlf-agent', ['alpha'], oldBodies, plain).replace(/\n/g, '\r\n')
    };
    return withProject(files, ({ run, read }) => {
        const style = rel => {
            const text = String(read(rel));
            const crlf = (text.match(/\r\n/g) || []).length;
            const lfOnly = (text.match(/(?<!\r)\n/g) || []).length;
            return crlf && !lfOnly ? 'crlf' : lfOnly && !crlf ? 'lf' : 'mixed';
        };
        // Given an LF skill, a CRLF skill and a CRLF agent that carry alpha
        // When the default mode propagates alpha, and then guide mode converts it
        assert.equal(run('alpha').code, 0);
        const afterSync = Object.fromEntries(Object.keys(files).map(rel => [rel, style(rel)]));
        assert.equal(run('--mode=guide', '--tags', 'alpha').code, 0);
        // Then every file keeps the style it started with after each run
        assert.deepEqual(afterSync, { '.claude/skills/lf/SKILL.md': 'lf', '.claude/skills/crlf/SKILL.md': 'crlf', '.claude/agents/crlf-agent.md': 'crlf' });
        assert.equal(style('.claude/skills/lf/SKILL.md'), 'lf');
        assert.equal(style('.claude/skills/crlf/SKILL.md'), 'crlf');
        // And the CRLF skill converted like any other
        assert.equal(carrier.hasGuideEntry(String(read('.claude/skills/crlf/SKILL.md')), 'alpha'), true);
    });
});

test('guide mode fails closed: an unpublished tag, a variant tag or an unbalanced block writes nothing', () =>
    withProject(
        {
            '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha']),
            '.claude/skills/broken/SKILL.md': `${carrierText('broken', ['beta'])}\n<!-- SYNC:beta -->\n`
        },
        ({ run, read }) => {
            // Given a convertible skill and a skill whose beta markers are unbalanced
            const conv = read('.claude/skills/conv/SKILL.md');
            const broken = read('.claude/skills/broken/SKILL.md');
            // When a tag with no published projection is requested
            const unknown = run('--mode=guide', '--tags', 'alpha,not-published');
            // Then the run is refused before any write
            assert.equal(unknown.code, 2);
            assert.match(unknown.stderr, /no published projection for: not-published/);
            assert.ok(read('.claude/skills/conv/SKILL.md').equals(conv));
            // When a :reminder variant is requested
            const variant = run('--mode=guide', '--tags', 'alpha:reminder');
            // Then it is refused: only base tags convert
            assert.equal(variant.code, 2);
            assert.ok(read('.claude/skills/conv/SKILL.md').equals(conv));
            // When beta converts across both skills
            const unbalanced = run('--mode=guide', '--tags', 'beta');
            // Then the unbalanced file is reported and left unchanged, and the run exits non-zero
            assert.equal(unbalanced.code, 1);
            assert.match(unbalanced.stdout, /\.claude\/skills\/broken\/SKILL\.md: unbalanced SYNC:beta tags/);
            assert.ok(read('.claude/skills/broken/SKILL.md').equals(broken));
        }
    ));

test('guide mode fails closed without the inlineSkills list', () =>
    withProject({ '.claude/skills/conv/SKILL.md': carrierText('conv', ['alpha']) }, ({ root, run, read }) => {
        // Given a groups file with no inlineSkills list
        const groupsFile = path.join(root, '.claude', 'skills', 'shared', 'protocol-groups.json');
        const data = JSON.parse(fs.readFileSync(groupsFile, 'utf8'));
        delete data.inlineSkills;
        fs.writeFileSync(groupsFile, JSON.stringify(data));
        const conv = read('.claude/skills/conv/SKILL.md');
        // When guide mode runs
        const result = run('--mode=guide', '--tags', 'alpha');
        // Then it refuses rather than converting a skill that might be an inline one
        assert.notEqual(result.code, 0);
        assert.match(result.stderr, /inlineSkills/);
        assert.ok(read('.claude/skills/conv/SKILL.md').equals(conv));
    }));

test('recognizer twins: the Python and JavaScript recognizers agree on every guide-line shape', () => {
    // Given guide texts in every shape a carrier can hold
    const good = carrier.formatGuideLine({ tag: 'alpha', summary: 'Look first', when: 'every edit', path: '.claude/skills/shared/protocols/alpha.md' });
    const wrap = body => `x\n<!-- PROTOCOL-GUIDES:START -->\n\n> intro\n\n${body}\n\n<!-- PROTOCOL-GUIDES:END -->\ny\n`;
    const cases = [
        { name: 'well-formed', text: wrap(good), tags: ['alpha'] },
        { name: 'CRLF checkout', text: wrap(good).replace(/\n/g, '\r\n'), tags: ['alpha'] },
        { name: 'mirror path spelling', text: wrap(good.replace('.claude/skills', '.agents/skills')), tags: ['alpha'] },
        { name: 'outside a block', text: `${good}\n`, tags: [] },
        { name: 'path names another tag', text: wrap(good.replace('alpha.md', 'beta.md')), tags: [] },
        { name: 'no semicolon', text: wrap(good.replace('; ', ' ')), tags: [] },
        { name: 'no arrow', text: wrap(good.replace(' → ', ' ')), tags: [] },
        { name: 'uppercase tag', text: wrap(good.replace('`alpha`', '`Alpha`')), tags: [] },
        { name: 'unterminated block', text: `<!-- PROTOCOL-GUIDES:START -->\n${good}\n`, tags: [] },
        {
            name: 'two blocks',
            text: `${wrap(good)}${wrap(good.replace(/alpha/g, 'beta'))}`,
            tags: ['alpha', 'beta']
        }
    ];
    // And writer inputs: one valid row and rows whose text would not read back field for field
    const rows = [
        { name: 'valid', row: { tag: 'alpha', summary: 'Look first', when: 'every edit', path: '.claude/skills/shared/protocols/alpha.md' }, ok: true },
        { name: 'semicolon in summary', row: { tag: 'alpha', summary: 'a; b', when: 'w', path: 'alpha.md' }, ok: false },
        { name: 'arrow in when', row: { tag: 'alpha', summary: 's', when: 'a → b', path: 'alpha.md' }, ok: false },
        { name: 'path of another tag', row: { tag: 'alpha', summary: 's', when: 'w', path: 'beta.md' }, ok: false }
    ];
    // When both recognizers read the texts and both writers format the rows
    const py = pyRecognize(cases.map(c => c.text), 'alpha', rows.map(r => r.row));
    // Then each recognizer returns the expected tags, and the two agree case by case
    cases.forEach((c, i) => {
        assert.deepEqual(carrier.guideTags(c.text), c.tags, `JS: ${c.name}`);
        assert.deepEqual(py.texts[i].tags, c.tags, `Python: ${c.name}`);
        assert.equal(carrier.hasGuideEntry(c.text, 'alpha'), py.texts[i].has, `has-entry disagreement: ${c.name}`);
    });
    // And both writers emit the same line for a valid row and refuse the same invalid rows
    rows.forEach(({ name, row, ok }, i) => {
        let js = null;
        try {
            js = carrier.formatGuideLine(row);
        } catch (err) {
            assert.match(err.message, /guide format/, `JS: ${name}`);
        }
        assert.equal(js !== null, ok, `JS writer: ${name}`);
        assert.equal(py.lines[i], js, `writer disagreement: ${name}`);
    });
});
// ─── Universal strip ───────────────────────────────────────────────────────

const RETIRED_POINTER = '> **Root-carried protocols** — fixture pointer naming every universal tag.';

/** A carrier that still holds every universal body, its reminder, the retired pointer and (for a guided skill) a guide line. */
function universalCarrierText(title, { guides = false, extra = [] } = {}) {
    return [
        '---',
        `name: ${title}`,
        '---',
        '',
        `# ${title}`,
        '',
        'Main content.',
        '',
        RETIRED_POINTER,
        '',
        ...(guides ? [carrier.GUIDE_BLOCK_START, '', '> **Protocol guides** — fixture.', '', carrier.formatGuideLine({ tag: 'alpha', summary: 'Summary of alpha', when: 'when alpha applies', path: '.claude/skills/shared/protocols/alpha.md' }), '', carrier.GUIDE_BLOCK_END, ''] : []),
        ...UNIVERSAL.map(t => block(t, `> **${t}** — universal fixture body.`)),
        ...extra.map(t => block(t, `> **${t}** — folded fixture body.`)),
        '## Closing Reminders',
        '',
        ...UNIVERSAL.map(t => reminder(t)),
        ...extra.map(t => reminder(t)),
        'End.',
        ''
    ].join('\n');
}

const STRIP_FILES = {
    '.claude/skills/guided/SKILL.md': universalCarrierText('guided', { guides: true }),
    [`.claude/skills/${INLINE_SKILL}/SKILL.md`]: universalCarrierText(INLINE_SKILL),
    '.claude/skills/guided/references/r.md': universalCarrierText('reference'),
    '.claude/agents/helper.md': universalCarrierText('helper', { extra: ['task-tracking-external-report'] })
};

test('TC-PDL-036: strip mode: every skill (inline included) and agent ends with no universal body, reminder or retired pointer line', () =>
    withProject(STRIP_FILES, ({ run, read }) => {
        // Given a guided skill, an inline skill, a reference file and an agent that all carry the universal set
        const referenceBefore = read('.claude/skills/guided/references/r.md');
        // When strip mode runs
        const result = run('--mode=strip-root-pointer');
        assert.equal(result.code, 0, result.stderr + result.stdout);
        for (const rel of ['.claude/skills/guided/SKILL.md', `.claude/skills/${INLINE_SKILL}/SKILL.md`, '.claude/agents/helper.md']) {
            const after = lf(read(rel));
            // Then no universal body or reminder is left, and nothing is written in their place
            for (const tag of UNIVERSAL) {
                assert.equal(markedBody(after, `SYNC:${tag}`), null, `${rel}: ${tag} body left`);
                assert.equal(markedBody(after, `SYNC:${tag}:reminder`), null, `${rel}: ${tag} reminder left`);
                assert.equal(carrier.hasGuideEntry(after, tag), false, `${rel}: ${tag} guide line written`);
            }
            // And the retired pointer line is gone while the surrounding text survives
            assert.equal(carrier.rootPointerLines(after).length, 0, `${rel}: retired pointer left`);
            assert.ok(after.includes('Main content.') && after.includes('End.'), `${rel}: surrounding text lost`);
        }
        // And a guide line for a non-universal tag survives
        assert.equal(carrier.hasGuideEntry(lf(read('.claude/skills/guided/SKILL.md')), 'alpha'), true);
        // And an agent also drops the agent-folded protocol
        assert.equal(markedBody(read('.claude/agents/helper.md'), 'SYNC:task-tracking-external-report'), null);
        // And a references/*.md file is never touched
        assert.ok(read('.claude/skills/guided/references/r.md').equals(referenceBefore), 'reference file was written');
    }));

test('strip mode: a second run and a dry run change no byte; other guide lines and skill text survive', () =>
    withProject(
        {
            ...STRIP_FILES,
            '.claude/skills/mixed/SKILL.md': `${carrierText('mixed', ['alpha']).replace('## Closing Reminders', `${block('critical-thinking-mindset', '> root body.')}## Closing Reminders`)}`
        },
        ({ run, read }) => {
            // Given a skill that also carries a non-universal protocol (alpha)
            assert.equal(run('--mode=guide', '--tags', 'alpha').code, 0);
            const before = lf(read('.claude/skills/mixed/SKILL.md'));
            const dry = run('--dry-run', '--mode=strip-root-pointer');
            // Then a dry run reports and writes nothing
            assert.equal(dry.code, 0, dry.stderr);
            assert.equal(lf(read('.claude/skills/mixed/SKILL.md')), before, 'dry run wrote the file');
            assert.match(dry.stdout, /skill: \d+ changed/);
            // When strip mode runs, then again
            assert.equal(run('--mode=strip-root-pointer').code, 0);
            const mixed = lf(read('.claude/skills/mixed/SKILL.md'));
            const snapshot = Object.keys(STRIP_FILES).map(rel => [rel, read(rel)]);
            const again = run('--mode=strip-root-pointer');
            // Then the second run is a byte no-op and says so
            assert.equal(again.code, 0, again.stderr);
            assert.match(again.stdout, /Total files changed: 0/);
            for (const [rel, bytes] of snapshot) assert.ok(read(rel).equals(bytes), `second run changed ${rel}`);
            // And the alpha guide line and its reminder survive, while the universal body is gone
            assert.equal(carrier.hasGuideEntry(mixed, 'alpha'), true);
            assert.notEqual(markedBody(mixed, 'SYNC:alpha:reminder'), null);
            assert.equal(markedBody(mixed, 'SYNC:critical-thinking-mindset'), null);
        }
    ));

test('strip mode keeps each file in its own newline style; guide mode refuses a universal tag', () =>
    withProject({ '.claude/skills/crlf/SKILL.md': universalCarrierText('crlf', { guides: true }).replace(/\n/g, '\r\n') }, ({ run, read }) => {
        // Given a CRLF skill, When strip mode runs, Then it stays CRLF
        assert.equal(run('--mode=strip-root-pointer').code, 0);
        const text = String(read('.claude/skills/crlf/SKILL.md'));
        assert.equal((text.match(/(?<!\r)\n/g) || []).length, 0, 'LF-only line found in a CRLF file');
        assert.equal(carrier.rootPointerLines(text).length, 0);
        // And guide mode never converts a universal tag
        const refused = run('--mode=guide', '--tags', 'critical-thinking-mindset');
        assert.equal(refused.code, 2);
        assert.match(refused.stderr, /universal tags are never converted/);
        // And strip mode takes no tag
        assert.notEqual(run('--mode=strip-root-pointer', 'alpha').code, 0);
    }));

test('retired-pointer twins: the Python and JavaScript recognizers agree', () => {
    const line = RETIRED_POINTER;
    const cases = [
        { name: 'well-formed', text: `x\n\n${line}\n\ny\n`, count: 1 },
        { name: 'CRLF checkout', text: `x\r\n\r\n${line}\r\n\r\ny\r\n`, count: 1 },
        { name: 'duplicate', text: `${line}\n\n${line}\n`, count: 2 },
        { name: 'quoted inside a list', text: `- ${line}\n`, count: 0 },
        { name: 'wrong lead', text: `> **Root protocols** — nothing\n`, count: 0 },
        { name: 'none', text: '# title\n', count: 0 }
    ];
    const program = [
        'import json, sys',
        `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
        'from sync_blocks import has_root_pointer, root_pointer_lines',
        'data = json.loads(sys.stdin.read())',
        'print(json.dumps({"texts": [{"has": has_root_pointer(t), "lines": root_pointer_lines(t)} for t in data["texts"]]}))'
    ].join('\n');
    const c = python();
    const home = tempDir('ck-guide-py-');
    try {
        const r = spawnSync(c.command, [...c.baseArgs, '-c', program], {
            input: JSON.stringify({ texts: cases.map(x => x.text) }),
            encoding: 'utf8',
            timeout: 60000,
            env: childEnv(home, home)
        });
        assert.equal(r.status, 0, `python recognizer failed: ${r.stderr}`);
        const py = JSON.parse(r.stdout);
        // Then both recognizers agree case by case
        cases.forEach((x, i) => {
            assert.equal(carrier.rootPointerLines(x.text).length, x.count, `JS: ${x.name}`);
            assert.equal(py.texts[i].lines.length, x.count, `Python: ${x.name}`);
            assert.equal(carrier.hasRootPointer(x.text), py.texts[i].has, `has-pointer disagreement: ${x.name}`);
            assert.equal(carrier.hasRootPointer(x.text), x.count > 0, `JS: ${x.name}`);
        });
    } finally {
        fs.rmSync(home, { recursive: true, force: true });
    }
});
