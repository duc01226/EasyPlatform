'use strict';

/**
 * Cross-reader parity for the canonical protocol source (`.claude/skills/shared/sync-inline-versions.md`).
 *
 * Three readers end a `## SYNC:<tag>` section, and every copy of a protocol is a projection of
 * what they return: the JS `extractSyncBody` (`.claude/scripts/lib/extract-sync-block.cjs`, used by
 * the projection builder and the Codex/CLAUDE.md bakers), the Python writer `read_canonical_block`
 * (`.claude/scripts/sync-update-blocks.py`) and the Python injector helper `load_sync_body`
 * (`.claude/scripts/sync_blocks.py`). When one of them ends a block by a different rule, the same
 * tag projects different text on different surfaces with every other gate green — the JS reader
 * once swallowed a whole neighbouring protocol into a reminder because an HTML comment sat between
 * the `---` separator and the next heading.
 *
 * Guarded invariant: for the same markdown, the JS reader returns exactly the body the Python writer
 * returns (after trimming), on every heading.
 * - The fixture case runs everywhere: a temp project carrying copies of the Python readers and a
 *   canonical file with every separator layout that has diverged before.
 * - The corpus case is a framework-repo self-check (it reads this repo's shipped canonical file and
 *   compares all three readers over every heading); it skips in an adopting project.
 * Both skip, with a reason, when no Python 3 interpreter is on PATH.
 *
 * OS behavior: Python is resolved as `py -3` then `python` then `python3` on Windows and as
 * `python3` then `python` on macOS/Linux, and must report major version 3 (a Windows Store
 * `python3` alias fails that probe). Line endings: the fixture is written LF and once as CRLF; every
 * reader normalises line endings, so both must agree. Children run with HOME/USERPROFILE and
 * TMPDIR/TEMP/TMP pointed at a temp dir and `PYTHONDONTWRITEBYTECODE=1`, so no cache lands in the repo.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPTS_DIR = path.join(REPO_ROOT, '.claude', 'scripts');
const CANONICAL_REL = ['.claude', 'skills', 'shared', 'sync-inline-versions.md'];
const { isFrameworkRepo } = require(path.join(REPO_ROOT, '.claude', 'hooks', 'tests', 'lib', 'framework-repo-guard.cjs'));
const { childEnv, removeTempDir } = require(path.join(REPO_ROOT, '.claude', 'hooks', 'tests', 'lib', 'hook-runner.cjs'));
const { extractSyncBody } = require(path.join(SCRIPTS_DIR, 'lib', 'extract-sync-block.cjs'));

const HEADING_RE = /^## SYNC:(\S+)[ \t]*$/gm;

// Loads the two Python readers from `<root>/.claude/scripts` and prints {tag: {rcb, lsb}} as ASCII
// JSON. `read_canonical_block` exits on a missing tag and `load_sync_body` raises; both become null.
const PY_DUMP = [
    'import importlib.util, json, os, sys',
    "scripts = os.path.join(sys.argv[1], '.claude', 'scripts')",
    'sys.path.insert(0, scripts)',
    "spec = importlib.util.spec_from_file_location('sync_update_blocks', os.path.join(scripts, 'sync-update-blocks.py'))",
    'mod = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(mod)',
    'import sync_blocks',
    'out = {}',
    'for tag in json.load(sys.stdin):',
    '    try:',
    '        rcb = mod.read_canonical_block(tag).strip()',
    '    except SystemExit:',
    '        rcb = None',
    '    try:',
    "        lsb = sync_blocks.load_sync_body('SYNC:' + tag)",
    '    except ValueError:',
    '        lsb = None',
    "    out[tag] = {'rcb': rcb, 'lsb': lsb}",
    'sys.stdout.write(json.dumps(out))',
].join('\n');

function makeTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Child env: inherited PATH, but HOME/temp dirs isolated and no bytecode written. */
function isolatedEnv(tempRoot) {
    return childEnv({
        HOME: tempRoot,
        USERPROFILE: tempRoot,
        TMPDIR: tempRoot,
        TEMP: tempRoot,
        TMP: tempRoot,
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONPATH: undefined,
        PYTHONSTARTUP: undefined,
    });
}

let pythonCache;
/** `{ command, args }` for a working Python 3, or null. Resolved once per process. */
function resolvePython() {
    if (pythonCache !== undefined) return pythonCache;
    const candidates = process.platform === 'win32'
        ? [['py', ['-3']], ['python', []], ['python3', []]]
        : [['python3', []], ['python', []]];
    pythonCache = null;
    for (const [command, args] of candidates) {
        const probe = spawnSync(command, [...args, '-c', 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)'], {
            encoding: 'utf8', timeout: 15000, windowsHide: true,
        });
        if (!probe.error && probe.status === 0) {
            pythonCache = { command, args };
            break;
        }
    }
    return pythonCache;
}

const PYTHON = resolvePython();
const NO_PYTHON = PYTHON ? false : 'no Python 3 interpreter on PATH (tried py -3 / python / python3)';
const LIVE_SKIP = NO_PYTHON || (isFrameworkRepo(REPO_ROOT) ? false : 'framework-repo self-check: reads the shipped canonical protocol file');

/** Run the Python readers under `projectRoot` for `tags`; returns {tag: {rcb, lsb}}. */
function pythonBodies(projectRoot, tags, tempRoot) {
    const result = spawnSync(PYTHON.command, [...PYTHON.args, '-c', PY_DUMP, projectRoot], {
        input: JSON.stringify(tags),
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
        env: isolatedEnv(tempRoot),
    });
    assert.equal(result.status, 0, `python readers failed (exit ${result.status}): ${result.stderr || result.error}`);
    return JSON.parse(result.stdout);
}

function headings(markdown) {
    return [...String(markdown).replace(/\r\n?/g, '\n').matchAll(HEADING_RE)].map(match => match[1]);
}

/** A canonical file carrying every separator layout the readers have disagreed on. */
function fixtureCanonical() {
    return [
        '# Canonical fixture',
        '',
        '## SYNC:alpha',
        '',
        '> Alpha body.',
        '',
        '---',
        '',
        '## SYNC:alpha:reminder',
        '',
        '**Alpha** reminder.',
        '',
        '---',
        '',
        '<!-- an editor note between the separator and the next heading -->',
        '',
        '## SYNC:beta',
        '',
        '> Beta body keeps a table row | a | b | and a --- inside a line.',
        '',
        '---   ',
        '## SYNC:gamma',
        '> Gamma body with no blank line around its separator.',
        '## SYNC:delta',
        '',
        '> Delta ends the file with a trailing separator.',
        '',
        '---',
        '',
    ].join('\n');
}

test('fixture: the JS reader and the Python writer end every block at the same line (LF and CRLF)', { skip: NO_PYTHON }, () => {
    const tempRoot = makeTempDir('ck-sync-reader-parity-');
    try {
        for (const [label, eol] of [['LF', '\n'], ['CRLF', '\r\n']]) {
            // Given a temp project carrying the shipped Python readers and a canonical file with
            // an HTML comment after a separator, a separator with trailing blanks, a heading with no
            // separator before it and a trailing separator at EOF
            const project = path.join(tempRoot, label);
            const scripts = path.join(project, '.claude', 'scripts');
            fs.mkdirSync(scripts, { recursive: true });
            for (const name of fs.readdirSync(SCRIPTS_DIR).filter(entry => entry.endsWith('.py'))) {
                fs.copyFileSync(path.join(SCRIPTS_DIR, name), path.join(scripts, name));
            }
            const canonicalPath = path.join(project, ...CANONICAL_REL);
            fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
            const markdown = fixtureCanonical().replace(/\n/g, eol);
            fs.writeFileSync(canonicalPath, markdown);
            const tags = headings(markdown);
            assert.deepEqual(tags, ['alpha', 'alpha:reminder', 'beta', 'gamma', 'delta'], 'non-vacuous: every layout is present');

            // When both readers extract every heading
            const py = pythonBodies(project, tags, tempRoot);

            // Then the JS body equals the Python writer's body, and the separator-adjacent text never leaks
            for (const tag of tags) {
                assert.equal(typeof py[tag].rcb, 'string', `${label} ${tag}: the Python writer resolves the block`);
                assert.equal(extractSyncBody(markdown, tag), py[tag].rcb, `${label} ${tag}: JS and Python bodies differ`);
            }
            assert.equal(extractSyncBody(markdown, 'alpha:reminder'), '**Alpha** reminder.', `${label}: a comment after the separator is not part of the block`);
            assert.equal(extractSyncBody(markdown, 'gamma'), '> Gamma body with no blank line around its separator.', `${label}: a heading ends the block`);
            assert.equal(extractSyncBody(markdown, 'delta'), '> Delta ends the file with a trailing separator.', `${label}: the last block drops its trailing separator`);
        }
    } finally {
        removeTempDir(tempRoot);
    }
});

test('corpus: all three readers agree on every heading of the shipped canonical file', { skip: LIVE_SKIP }, () => {
    const tempRoot = makeTempDir('ck-sync-reader-corpus-');
    try {
        // Given the shipped canonical protocol file
        const markdown = fs.readFileSync(path.join(REPO_ROOT, ...CANONICAL_REL), 'utf8');
        const tags = headings(markdown);
        assert.ok(tags.length >= 70, `non-vacuous: expected the full canonical corpus, parsed ${tags.length} headings`);

        // When the JS reader and both Python readers extract every heading
        const py = pythonBodies(REPO_ROOT, tags, tempRoot);

        // Then all three return the same body for every tag
        const mismatches = [];
        for (const tag of tags) {
            const js = extractSyncBody(markdown, tag);
            if (js !== py[tag].rcb) mismatches.push(`${tag}: extractSyncBody (${js && js.length} chars) != read_canonical_block (${py[tag].rcb && py[tag].rcb.length} chars)`);
            if (py[tag].lsb !== py[tag].rcb) mismatches.push(`${tag}: load_sync_body != read_canonical_block`);
        }
        assert.deepEqual(mismatches, [], `canonical readers disagree:\n${mismatches.join('\n')}`);
    } finally {
        removeTempDir(tempRoot);
    }
});
