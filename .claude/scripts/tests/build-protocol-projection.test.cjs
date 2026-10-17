'use strict';

/**
 * Protocol projection (`.claude/scripts/build-protocol-projection.cjs`).
 *
 * Guards the one-owner projection contract (CA-5): every canonical base tag gets exactly one
 * generated file (TC-PDL-001); a tag over the bin splits only at section starts into parts that
 * each fit the bin and render on their own (TC-PDL-002); an ungrouped tag, a stale group entry, a
 * wrong universal set or a bad inlineSkills entry fails the build (TC-PDL-003, TC-PDL-080); the
 * output is deterministic LF text (TC-PDL-004); `--check` fails on any drift without writing
 * (TC-PDL-005); the index carries what delivery needs (TC-PDL-006); the project root is the one the
 * environment selects, never the script's own checkout (TC-PDL-007); no machine path leaks
 * (TC-PDL-008); no shipped body is over the 9,000-char compression ceiling except the exempt
 * `review-protocol-injection` (TC-PDL-047/049). The live case (TC-PDL-055) runs `--check` over the real tree inside the framework
 * repo only, so the `scripts-tests` stage of `run-codex-sync.mjs --verify-only` fails when a
 * canonical edit lands without a rebuild.
 *
 * Every other case builds its own temp project and runs the real CLI with CLAUDE_PROJECT_DIR,
 * HOME/USERPROFILE and TMPDIR/TEMP/TMP pointed at temp dirs.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const SCRIPT = path.resolve(__dirname, '..', 'build-protocol-projection.cjs');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const { isFrameworkRepo } = require(path.join(REPO_ROOT, '.claude', 'hooks', 'tests', 'lib', 'framework-repo-guard.cjs'));
const projection = require(SCRIPT);
// The delivery lib owns the continuation label a split part is delivered with (BR-PDL-03).
const delivery = require(path.resolve(__dirname, '..', '..', 'hooks', 'lib', 'protocol-delivery.cjs'));

const IN_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const LIVE_SKIP = IN_FRAMEWORK_REPO ? false : 'framework-repo self-check: reads the shipped canonical file and its committed projection';
const BIN = 9500;
const SHARED = ['.claude', 'skills', 'shared'];
const OUT_REL = '.claude/skills/shared/protocols';
// The fixture's universal group: four tags delivered by the universal hook in two authored bins.
const UNIVERSAL_TAGS = ['critical-thinking-mindset', 'ai-mistake-prevention', 'project-reference-docs-guide', 'project-protocol-overlay'];
const UNIVERSAL_BINS = [['critical-thinking-mindset', 'ai-mistake-prevention'], ['project-reference-docs-guide', 'project-protocol-overlay']];
const INLINE_SKILLS = ['changes-review', 'code-quality-review'];
/** A drive-letter path or a POSIX home/temp root: text that would pin the projection to one machine. */
const ABSOLUTE_PATH = /(?:\b[A-Za-z]:[\\/])|(?:\/(?:Users|home|private|var\/folders)\/)/;

// ─── Fixture ───────────────────────────────────────────────────────────────

/**
 * A large body: 12 sections of ~1,340 chars each (~16,000 total). One fence spans sections 5-11,
 * so the first cut (about 9,400 chars in) lands inside it and the part framing must reopen it.
 */
function largeBody() {
    const lines = ['> **Large Protocol** — a fixture protocol that must split.', '>'];
    for (let n = 1; n <= 12; n += 1) {
        if (n === 5) lines.push('```');
        lines.push(n % 2 ? `### Section ${n}` : `> **Rule ${n}:** section ${n} opens with a bold lead.`);
        for (let k = 0; k < 16; k += 1) lines.push(`> - clause ${n}.${k}: every clause keeps its full meaning in the part that carries it.`);
        if (n === 11) lines.push('```');
        lines.push('>');
    }
    return lines.join('\n');
}

function baseBlocks() {
    const blocks = {
        'alpha-check': '> **Alpha Check** — a small review protocol.\n>\n> 1. Look.\n> 2. Report.',
        'beta-trace': '> **Beta Trace** — walk backward from the end state.',
        'large-protocol': largeBody()
    };
    for (const tag of UNIVERSAL_TAGS) blocks[tag] = `> **${tag}** — universal fixture body.`;
    return blocks;
}

/** Canonical markdown in the real file's layout: blocks separated by `---`, with variants. */
function canonicalText(blocks) {
    const sections = ['# SYNC Inline Versions (fixture)', '', '> Canonical fixture.'];
    for (const [tag, body] of Object.entries(blocks)) {
        sections.push('', '---', '', `## SYNC:${tag}`, '', body);
        sections.push('', '---', '', `## SYNC:${tag}:reminder`, '', `**Reminder** for ${tag}.`);
    }
    sections.push('', '---', '', '## SYNC:critical-thinking-mindset:full', '', 'Full root variant, never projected.', '');
    return sections.join('\n');
}

function baseGroups() {
    const entry = name => ({ summary: `Summary of ${name}`, when: `when ${name} applies` });
    const universal = Object.fromEntries(UNIVERSAL_TAGS.map(tag => [tag, entry(tag)]));
    return {
        version: 1,
        binChars: BIN,
        groups: {
            review: { tags: { 'alpha-check': entry('alpha-check'), 'large-protocol': entry('large-protocol') } },
            'evidence-trace': { tags: { 'beta-trace': entry('beta-trace') } },
            'workflow-task': { tags: {} },
            'spec-test': { tags: {} },
            design: { tags: {} },
            universal: { tags: universal, bins: UNIVERSAL_BINS }
        },
        inlineSkills: INLINE_SKILLS
    };
}

function writeProject(root, { blocks = baseBlocks(), groups = baseGroups(), skills = INLINE_SKILLS } = {}) {
    fs.mkdirSync(path.join(root, ...SHARED), { recursive: true });
    fs.writeFileSync(path.join(root, ...SHARED, 'sync-inline-versions.md'), canonicalText(blocks));
    fs.writeFileSync(path.join(root, ...SHARED, 'protocol-groups.json'), `${JSON.stringify(groups, null, 2)}\n`);
    for (const skill of skills) {
        fs.mkdirSync(path.join(root, '.claude', 'skills', skill), { recursive: true });
        fs.writeFileSync(path.join(root, '.claude', 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\n---\n`);
    }
}

function tempDir(prefix) {
    // Resolve the OS temp root (macOS: /var -> /private/var) so every spelling of the path agrees.
    return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/** Run `fn(root, home)` against a fresh fixture project; both temp dirs are removed afterwards. */
function withProject(options, fn) {
    const root = tempDir('ck-proj-root-');
    const home = tempDir('ck-proj-home-');
    try {
        writeProject(root, options);
        return fn(root, home);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(home, { recursive: true, force: true });
    }
}

/** Clean-machine child environment: inherited switches dropped, home and temp dirs redirected. */
function childEnv(root, home) {
    const env = {};
    const drop = /^(CLAUDE_|CK_|CODEX_|OPENCODE_|HOME$|USERPROFILE$|TMPDIR$|TEMP$|TMP$)/i;
    for (const [key, value] of Object.entries(process.env)) if (!drop.test(key)) env[key] = value;
    return { ...env, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home, TMPDIR: home, TEMP: home, TMP: home };
}

function run(root, home, args = [], { cwd = root, env = childEnv(root, home) } = {}) {
    const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env, encoding: 'utf8', timeout: 60000 });
    return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

const outDir = root => path.join(root, ...OUT_REL.split('/'));
const readIndex = root => JSON.parse(fs.readFileSync(path.join(outDir(root), 'index.json'), 'utf8'));
const snapshot = root =>
    Object.fromEntries(
        fs
            .readdirSync(outDir(root))
            .sort()
            .map(name => [name, fs.readFileSync(path.join(outDir(root), name))])
    );

/** Fence balance of a markdown text: true when every fence it opens it also closes. */
function fencesBalanced(text) {
    let open = null;
    for (const line of text.split('\n')) {
        const match = /^(?:[ \t]*>[ \t]?)*( {0,3})(`{3,}|~{3,})(.*)$/.exec(line);
        if (!match) continue;
        if (!open) open = match[2];
        else if (match[2][0] === open[0] && match[2].length >= open.length && match[3].trim() === '') open = null;
    }
    return open === null;
}

// ─── Cases ─────────────────────────────────────────────────────────────────

test('TC-PDL-001: each canonical base tag gets exactly one projection file holding its body; variants are never projected', () =>
    withProject({}, (root, home) => {
        // Given a canonical file with 7 base tags, each with a :reminder, plus one :full variant
        const blocks = baseBlocks();
        // When the projection is built
        const result = run(root, home);
        // Then it succeeds and writes one <tag>.md per base tag with the exact body
        assert.equal(result.code, 0, result.stderr);
        const names = fs.readdirSync(outDir(root));
        for (const [tag, body] of Object.entries(blocks)) {
            assert.equal(names.filter(name => name === `${tag}.md`).length, 1, `${tag}.md`);
            assert.equal(fs.readFileSync(path.join(outDir(root), `${tag}.md`), 'utf8'), `${body}\n`, `${tag}.md body`);
        }
        assert.ok(!names.some(name => name.includes(':') || /reminder|full/.test(name)), `no variant file: ${names.join(', ')}`);
        assert.deepEqual(readIndex(root).tags.map(row => row.tag), Object.keys(blocks).sort());
    }));

test('TC-PDL-002: a tag over the bin splits into parts that each fit the bin, cut only at section starts, with fences reopened', () =>
    withProject({}, (root, home) => {
        // Given a ~16,000-char tag whose fenced block spans seven sections
        const body = baseBlocks()['large-protocol'];
        assert.ok(body.length > BIN, `fixture body is ${body.length} chars`);
        // When the projection is built
        assert.equal(run(root, home).code, 0);
        // Then the index row lists >1 part, each file within the bin and each fence-balanced
        const row = readIndex(root).tags.find(r => r.tag === 'large-protocol');
        assert.ok(row.parts.length > 1, 'split into parts');
        const texts = row.parts.map(part => {
            const text = fs.readFileSync(path.join(root, ...part.file.split('/')), 'utf8').replace(/\n$/, '');
            assert.equal(text.length, part.chars, `${part.file} chars`);
            assert.ok(text.length <= BIN, `${part.file} is ${text.length} chars`);
            assert.ok(fencesBalanced(text), `${part.file} leaves a fence open`);
            return text;
        });
        // And at least one cut lands inside the fence, so the reopen rule is exercised, not assumed
        assert.ok(texts.slice(1).some(text => text.startsWith('```\n')), 'no part reopens the fence');
        // And every part after the first starts at a section start (after a reopened fence line)
        for (const text of texts.slice(1)) {
            const first = text.split('\n').find(line => !/^(?:>\s?)*(`{3,}|~{3,})\s*$/.test(line));
            assert.ok(projection.isSectionStart(first), `part starts mid-section: ${JSON.stringify(first)}`);
        }
        // And the parts, minus framing fences, carry every body line in order
        const content = text => text.split('\n').filter(line => line.trim() && !/^```$/.test(line));
        assert.deepEqual(texts.flatMap(content), content(body));
        // And each part fits the bin as delivered, with the continuation label delivery puts before part 2+
        texts.forEach((text, index) => {
            const delivered = delivery.continuationLabel('large-protocol', index + 1, texts.length) + text;
            assert.ok(delivered.length <= BIN, `part ${index + 1} is ${delivered.length} chars as delivered`);
        });
    }));

test('TC-PDL-002: a continued part leaves room for its delivery label, so a part near the bin still fits once labelled', () => {
    // Given a 200-char bin and a body whose second part would fill the bin to the last char without a label
    const bin = 200;
    const head = `> **Head** — ${'h'.repeat(180)}`;
    const second = `> **Second** — ${'s'.repeat(bin - '> **Second** — '.length)}`;
    assert.equal(second.length, bin, 'fixture: the second section alone is exactly the bin');
    const tail = `> **Tail** — ${'t'.repeat(20)}`;
    const shortSecond = `> **Second** — ${'s'.repeat(100)}`;
    // When a body with a section that fits only without the label is split
    // Then the build fails naming the section and the label reserve (never a part that overflows once labelled)
    assert.throws(() => projection.splitIntoParts([head, second].join('\n'), bin, 'labelled'), /tag "labelled".*line 2.*200-char bin.*delivery label/);
    // And a body whose continued parts fit with the label splits into parts that all fit as delivered
    const parts = projection.splitIntoParts([head, shortSecond, tail].join('\n'), bin, 'labelled');
    assert.ok(parts.length > 1, 'split into parts');
    parts.forEach((text, index) => {
        const delivered = delivery.continuationLabel('labelled', index + 1, parts.length) + text;
        assert.ok(delivered.length <= bin, `part ${index + 1} is ${delivered.length} chars as delivered`);
    });
});

test('TC-PDL-002: a section larger than the bin on its own fails the build naming the tag', () => {
    // Given a body whose second section alone is over a 200-char bin
    const body = ['> **Head** — intro.', '> **Rule:** ' + 'x'.repeat(300)].join('\n');
    // When it is split, Then the error names the tag and the oversized section
    assert.throws(() => projection.splitIntoParts(body, 200, 'oversized-tag'), /tag "oversized-tag".*line 2.*200-char bin/);
});

test('TC-PDL-003: a canonical tag with no group fails the build naming it, and nothing is written', () => {
    // Given the groups file without beta-trace
    const groups = baseGroups();
    delete groups.groups['evidence-trace'].tags['beta-trace'];
    withProject({ groups }, (root, home) => {
        // When the projection is built
        const result = run(root, home);
        // Then it fails, names the tag and writes no output directory
        assert.equal(result.code, 1);
        assert.match(result.stderr, /tag "beta-trace" has no group/);
        assert.equal(fs.existsSync(outDir(root)), false);
    });
});

test('TC-PDL-003: a group entry for an undefined tag, a tag in two groups or an unknown group fails the build', () => {
    const cases = [
        [g => (g.groups.design.tags['ghost-tag'] = { summary: 's', when: 'w' }), /lists tag "ghost-tag", which .* does not define/],
        [g => (g.groups.design.tags['alpha-check'] = { summary: 's', when: 'w' }), /tag "alpha-check" is in two groups/],
        [g => (g.groups.extra = { tags: {} }), /unknown group "extra"/],
        [g => (g.groups.review.tags['alpha-check'].summary = 'a; b'), /summary must not contain ";"/]
    ];
    for (const [mutate, pattern] of cases) {
        const groups = baseGroups();
        mutate(groups);
        withProject({ groups }, (root, home) => {
            // Given one invalid groups file, When built, Then the build fails with the named reason
            const result = run(root, home);
            assert.equal(result.code, 1, pattern.source);
            assert.match(result.stderr, pattern);
        });
    }
});

test('TC-PDL-004: two builds produce byte-identical LF output', () =>
    withProject({}, (root, home) => {
        // Given one build
        assert.equal(run(root, home).code, 0);
        const first = snapshot(root);
        // When the output directory is removed and the projection is built again
        fs.rmSync(outDir(root), { recursive: true });
        assert.equal(run(root, home).code, 0);
        // Then every file is byte-identical and carries no CR
        assert.deepEqual(snapshot(root), first);
        for (const [name, bytes] of Object.entries(first)) assert.ok(!bytes.includes(0x0d), `${name} has CR`);
        // And a rebuild over an up-to-date projection writes nothing
        assert.match(run(root, home).stdout, /0 written, 0 removed/);
    }));

test('TC-PDL-005: --check fails on an edited canonical tag or an extra file, without writing, and passes after a rebuild', () =>
    withProject({}, (root, home) => {
        // Given a fresh projection that checks clean
        assert.equal(run(root, home).code, 0);
        assert.equal(run(root, home, ['--check']).code, 0);
        // When a canonical body is edited without a rebuild
        const canonical = path.join(root, ...SHARED, 'sync-inline-versions.md');
        fs.writeFileSync(canonical, fs.readFileSync(canonical, 'utf8').replace('a small review protocol', 'an edited review protocol'));
        const before = fs.readFileSync(path.join(outDir(root), 'alpha-check.md'), 'utf8');
        const stale = run(root, home, ['--check']);
        // Then --check fails naming the stale file and leaves it untouched
        assert.equal(stale.code, 1);
        assert.match(stale.stderr, /stale: \.claude\/skills\/shared\/protocols\/alpha-check\.md/);
        assert.equal(fs.readFileSync(path.join(outDir(root), 'alpha-check.md'), 'utf8'), before);
        // And after a rebuild it passes; an extra file then fails it again
        assert.equal(run(root, home).code, 0);
        assert.equal(run(root, home, ['--check']).code, 0);
        fs.writeFileSync(path.join(outDir(root), 'retired-tag.md'), 'old\n');
        assert.match(run(root, home, ['--check']).stderr, /extra: .*retired-tag\.md/);
        // And a write run removes it
        assert.match(run(root, home).stdout, /1 removed/);
        assert.equal(fs.existsSync(path.join(outDir(root), 'retired-tag.md')), false);
    }));

test('TC-PDL-005: --check accepts a CRLF checkout of an up-to-date projection', () =>
    withProject({}, (root, home) => {
        // Given an up-to-date projection whose files a checkout converted to CRLF
        assert.equal(run(root, home).code, 0);
        for (const name of fs.readdirSync(outDir(root))) {
            const file = path.join(outDir(root), name);
            fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\n/g, '\r\n'));
        }
        // When --check runs, Then line endings alone are not drift
        const result = run(root, home, ['--check']);
        assert.equal(result.code, 0, result.stderr);
    }));

test('TC-PDL-006: every index row has group, summary, when, chars, file and parts that exist', () =>
    withProject({}, (root, home) => {
        // Given a built projection
        assert.equal(run(root, home).code, 0);
        // When the index is read
        const index = readIndex(root);
        const groups = baseGroups().groups;
        // Then it states the bin and the six groups, and each row matches the groups file and disk
        assert.equal(index.binChars, BIN);
        assert.deepEqual(index.groups, projection.GROUP_NAMES);
        for (const row of index.tags) {
            assert.equal(row.group, Object.keys(groups).find(g => groups[g].tags[row.tag]), `${row.tag} group`);
            assert.deepEqual([row.summary, row.when], [groups[row.group].tags[row.tag].summary, groups[row.group].tags[row.tag].when]);
            assert.equal(row.file, `${OUT_REL}/${row.tag}.md`);
            assert.equal(row.chars, fs.readFileSync(path.join(root, ...row.file.split('/')), 'utf8').length - 1, `${row.tag} chars`);
            assert.ok(Array.isArray(row.parts) && row.parts.length >= 1, `${row.tag} parts`);
            for (const part of row.parts) {
                assert.ok(Number.isInteger(part.chars) && part.chars <= index.binChars, `${part.file} chars`);
                assert.ok(fs.existsSync(path.join(root, ...part.file.split('/'))), `${part.file} exists`);
            }
            if (row.chars <= index.binChars) assert.deepEqual(row.parts, [{ file: row.file, chars: row.chars }]);
        }
    }));

test('TC-PDL-007: the project root comes from CLAUDE_PROJECT_DIR, not the working directory or the script checkout', () =>
    withProject({}, (root, home) => {
        // Given a working directory that is another project with its own .claude folder
        const elsewhere = tempDir('ck-proj-cwd-');
        try {
            fs.mkdirSync(path.join(elsewhere, '.claude'));
            // When the build runs from there with CLAUDE_PROJECT_DIR naming the fixture
            const result = run(root, home, [], { cwd: elsewhere });
            // Then the output lands in the fixture only, with root-relative paths in the index
            assert.equal(result.code, 0, result.stderr);
            assert.ok(fs.existsSync(path.join(outDir(root), 'index.json')));
            assert.equal(fs.existsSync(path.join(elsewhere, '.claude', 'skills')), false);
            assert.ok(readIndex(root).tags.every(row => row.file.startsWith(`${OUT_REL}/`)));
            // And a relative CLAUDE_PROJECT_DIR is rejected before anything is written
            fs.rmSync(outDir(root), { recursive: true });
            const rejected = run(root, home, [], { env: { ...childEnv(root, home), CLAUDE_PROJECT_DIR: 'relative-project' } });
            assert.equal(rejected.code, 1);
            assert.match(rejected.stderr, /CLAUDE_PROJECT_DIR/);
            assert.equal(fs.existsSync(outDir(root)), false);
        } finally {
            fs.rmSync(elsewhere, { recursive: true, force: true });
        }
    }));

test('TC-PDL-008: the fixture projection carries no machine path', () =>
    withProject({}, (root, home) => {
        // Given a projection built inside a temp project
        assert.equal(run(root, home).code, 0);
        // When every output file is scanned, Then neither the project root nor any absolute path appears
        for (const [name, bytes] of Object.entries(snapshot(root))) {
            const text = bytes.toString('utf8');
            assert.ok(!text.includes(root) && !text.includes(root.replace(/\\/g, '/')), `${name} names the project root`);
            assert.doesNotMatch(text, ABSOLUTE_PATH, name);
        }
    }));

test('TC-PDL-008: the committed projection carries no project residue or absolute path', { skip: LIVE_SKIP }, async () => {
    // Given the framework repo's committed projection and its residue gate's term lists
    const residue = await import(pathToFileURL(path.join(REPO_ROOT, '.claude', 'scripts', 'codex', 'verify-no-project-residue.mjs')).href);
    const dir = outDir(REPO_ROOT);
    // When every projection file is scanned, Then no forbidden term, project symbol or absolute path appears
    for (const name of fs.readdirSync(dir)) {
        const text = fs.readFileSync(path.join(dir, name), 'utf8');
        const rel = `${OUT_REL}/${name}`;
        const lower = text.toLowerCase();
        assert.deepEqual(residue.forbiddenTerms.filter(term => lower.includes(term.toLowerCase())), [], rel);
        assert.deepEqual(residue.findProjectSymbolViolations(text, rel), [], rel);
        assert.doesNotMatch(text, ABSOLUTE_PATH, rel);
    }
});

test('TC-PDL-080: the universal bins must cover every universal tag exactly once and each bin must fit', () => {
    // Given universal groups whose bins omit a tag, name a foreign tag, repeat a tag, are missing, or overflow
    const omitted = baseGroups();
    omitted.groups.universal.bins = [UNIVERSAL_BINS[0], ['project-reference-docs-guide']];
    const foreign = baseGroups();
    foreign.groups.universal.bins = [...UNIVERSAL_BINS, ['alpha-check']];
    const repeated = baseGroups();
    repeated.groups.universal.bins = [...UNIVERSAL_BINS, ['ai-mistake-prevention']];
    const absent = baseGroups();
    delete absent.groups.universal.bins;
    const oversizedBudget = baseGroups();
    oversizedBudget.binChars = BIN + 1;
    const overflow = baseGroups();
    delete overflow.groups.review.tags['large-protocol'];
    overflow.groups.universal.tags['large-protocol'] = { summary: 's', when: 'w' };
    overflow.groups.universal.bins = [[...UNIVERSAL_BINS[0], 'large-protocol'], UNIVERSAL_BINS[1]];
    for (const [groups, pattern] of [
        [omitted, /universal tag "project-protocol-overlay" is in no bin/],
        [foreign, /universal bins name tag "alpha-check", which is not in the universal group/],
        [repeated, /universal bins list tag "ai-mistake-prevention" more than once/],
        [absent, /group "universal" needs a non-empty "bins" array/],
        [oversizedBudget, /binChars must be a positive integer no greater than 9500/],
        [overflow, /universal bin 1 .* renders \d+ chars, over the 9500-char bin/]
    ]) {
        withProject({ groups }, (root, home) => {
            // When built, Then the build fails naming the offending tag or bin
            const result = run(root, home);
            assert.equal(result.code, 1);
            assert.match(result.stderr, pattern);
            assert.equal(fs.existsSync(path.join(root, OUT_REL, 'index.json')), false, 'invalid groups publish no projection');
        });
    }
});

test('TC-PDL-080: an inlineSkills entry that is not a skill name or has no skill directory fails the build naming it', () => {
    for (const [entry, pattern] of [
        ['../escape', /inlineSkills entry "\.\.\/escape" is not a skill name/],
        ['Code-Review', /inlineSkills entry "Code-Review" is not a skill name/],
        ['missing-skill', /inlineSkills entry "missing-skill" has no \.claude\/skills\/missing-skill\/SKILL\.md/]
    ]) {
        const groups = baseGroups();
        groups.inlineSkills = [...INLINE_SKILLS, entry];
        withProject({ groups }, (root, home) => {
            // Given one bad inlineSkills entry, When built, Then the build fails naming it
            const result = run(root, home);
            assert.equal(result.code, 1, entry);
            assert.match(result.stderr, pattern);
        });
    }
});

test('TC-PDL-080: the shipped groups file bins every universal tag once and uses guide-backed review entrypoints with an empty inline list', { skip: LIVE_SKIP }, () => {
    // Given the framework repo's groups file
    const groups = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ...SHARED, 'protocol-groups.json'), 'utf8'));
    // When it is read, Then the authored bins hold each universal tag exactly once and inlineSkills is the owner's list (BR-PDL-11)
    assert.deepEqual(groups.groups.universal.bins.flat().sort(), Object.keys(groups.groups.universal.tags).sort());
    assert.deepEqual(groups.inlineSkills, []);
    for (const name of ['changes-review', 'code-quality-review', 'why-review', 'workflow-review-changes']) {
        const text = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
        assert.match(text, /<!-- PROTOCOL-GUIDES:START -->/);
        assert.match(text, /Apply each protocol only when its read-when condition holds/);
        assert.match(text, /If a protocol's text is not in your context, read its file below before you act on it/);
        const guides = [...text.matchAll(/^- `([^`]+)` — [^\n]+ → (\.claude\/skills\/shared\/protocols\/[^\s]+\.md)$/gm)];
        assert.ok(guides.length > 0, `${name} has no guides`);
        for (const [, tag, relative] of guides) {
            assert.ok(!Object.hasOwn(groups.groups.universal.tags, tag), `${name} leaks universal guide ${tag}`);
            assert.equal(fs.existsSync(path.join(REPO_ROOT, ...relative.split('/'))), true, `${name}: ${tag} has no published fallback`);
            assert.ok(!text.includes(`<!-- SYNC:${tag} -->`), `${name} still carries full ${tag}`);
        }
        assert.match(text, /<!-- SYNC:severity-rubric:reminder -->/);
    }
});

/** Compression ceiling for one canonical body (F3): every tag fits one bin with headroom. */
const COMPRESSED_LIMIT = 9000;
/** Excluded from F3: its embedded reviewer renderings are pinned verbatim by OVERRIDE copies. */
const COMPRESSION_EXEMPT = ['review-protocol-injection'];

/** `tag chars` for every row over `limit` that is not exempt (TC-PDL-047). */
function oversizedTags(rows, limit, exempt) {
    return rows.filter(row => row.chars > limit && !exempt.includes(row.tag)).map(row => `${row.tag} ${row.chars}`);
}

test('TC-PDL-047: the size check flags a body one char over the limit and spares only the exempt tag', () => {
    // Given one row at the limit, one a char over it, and an exempt row far over it
    const rows = [
        { tag: 'at-limit', chars: COMPRESSED_LIMIT },
        { tag: 'one-over', chars: COMPRESSED_LIMIT + 1 },
        { tag: 'review-protocol-injection', chars: 16000 }
    ];
    // When checked, Then only the non-exempt over-limit row is reported
    assert.deepEqual(oversizedTags(rows, COMPRESSED_LIMIT, COMPRESSION_EXEMPT), [`one-over ${COMPRESSED_LIMIT + 1}`]);
    // And without the exemption the excluded tag is reported too (the exemption is the only escape)
    assert.equal(oversizedTags(rows, COMPRESSED_LIMIT, []).length, 2);
});

test('TC-PDL-047/TC-PDL-049: no shipped protocol body exceeds 9,000 chars except review-protocol-injection, and --check passes', { skip: LIVE_SKIP }, () => {
    const { extractSyncBody } = require(path.join(REPO_ROOT, '.claude', 'scripts', 'lib', 'extract-sync-block.cjs'));
    // Given the committed projection index and the canonical file's `:full` variants (never projected)
    const index = readIndex(REPO_ROOT);
    const canonical = fs.readFileSync(path.join(REPO_ROOT, ...SHARED, 'sync-inline-versions.md'), 'utf8');
    const fullRows = [...canonical.matchAll(/^## SYNC:(\S+:full)[ \t]*$/gm)].map(match => ({
        tag: match[1],
        chars: (extractSyncBody(canonical, match[1]) || '').length
    }));
    assert.ok(index.tags.length > 0, 'non-vacuous: the index has rows');
    assert.ok(fullRows.length > 0, 'non-vacuous: the canonical file has :full variants');
    // When every base tag and :full variant is measured, Then none is over the limit unless exempt
    assert.deepEqual(oversizedTags(index.tags, COMPRESSED_LIMIT, COMPRESSION_EXEMPT), []);
    assert.deepEqual(oversizedTags(fullRows, COMPRESSED_LIMIT, COMPRESSION_EXEMPT), []);
    // And the index is fresh (--check passes), so the measured chars are the canonical bodies
    const home = tempDir('ck-proj-home-');
    try {
        const result = spawnSync(process.execPath, [SCRIPT, '--check'], {
            cwd: REPO_ROOT,
            env: childEnv(REPO_ROOT, home),
            encoding: 'utf8',
            timeout: 60000
        });
        assert.equal(result.status, 0, `${result.stderr}${result.stdout}`);
    } finally {
        fs.rmSync(home, { recursive: true, force: true });
    }
});

test('TC-PDL-055: the committed projection matches a fresh build of the real canonical file (--check)', { skip: LIVE_SKIP }, () => {
    // Given the framework repo, When --check runs over the real tree
    const home = tempDir('ck-proj-home-');
    try {
        const result = spawnSync(process.execPath, [SCRIPT, '--check'], {
            cwd: REPO_ROOT,
            env: childEnv(REPO_ROOT, home),
            encoding: 'utf8',
            timeout: 60000
        });
        // Then it passes; otherwise the fix is a rebuild in the same change as the canonical edit
        assert.equal(result.status, 0, `${result.stderr}${result.stdout}`);
        assert.match(result.stdout, /up to date/);
    } finally {
        fs.rmSync(home, { recursive: true, force: true });
    }
});
