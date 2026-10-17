'use strict';

/**
 * Skill injectors treat a guide entry as a carried protocol (TC-PDL-066, AC-PDL-22 / BR-PDL-14).
 * The spec's counter-case (an unconverted or inline skill is served as before) is the control and
 * body-carrier runs below: bare skills get their bodies, body carriers get their reminders.
 *
 * A skill converted by `sync-update-blocks.py --mode=guide` carries a protocol as one guide line
 * in its PROTOCOL-GUIDES block instead of the full `<!-- SYNC:tag -->` body. Every skill injector
 * asks `sync_blocks.has_guide_entry` before it inserts a body, so a later injector run never undoes
 * the conversion. The contract this suite guards, per injector:
 *   1. it never inserts a main body into a skill that carries a guide entry for that tag;
 *   2. a guide-carrier gets exactly the reminder outcome a body-carrier gets (a stale reminder is
 *      refreshed, a missing one is added or left out the same way);
 *   3. it changes nothing else in a guided skill;
 *   4. it keeps the file's own line endings: LF stays LF on Windows, CRLF stays CRLF on POSIX.
 *
 * "Every skill injector" is discovered, not listed: each `inject_*.py` next to this suite, minus
 * the agent-only injectors (agents keep full protocol text) and one that inserts no protocol tag,
 * plus `sync-hooks-to-skills.py`. A new
 * injector joins the loop automatically; if it targets none of FIXTURE_SKILLS, the control run
 * fails and names it.
 *
 * Fixture: a temp project gets a copy of every top-level `.claude/scripts/*.py` and the shipped
 * canonical `sync-inline-versions.md` (the injectors load their bodies from it at import time and
 * resolve their root from their own location, so they edit only the temp project). Children run
 * with HOME/USERPROFILE and TMPDIR/TEMP/TMP pointed at a temp dir and inherited framework switches
 * dropped. Python is resolved `python` → `py -3` → `python3` (use `py -3` on Windows and `python3`
 * on macOS/Linux by hand); an unavailable interpreter fails loud, never passes.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const SCRIPTS_DIR = path.resolve(__dirname, '..');
const CANONICAL = path.resolve(SCRIPTS_DIR, '..', 'skills', 'shared', 'sync-inline-versions.md');
const carrier = require(path.join(SCRIPTS_DIR, 'lib', 'protocol-guide-carrier.cjs'));

/** Injectors outside this contract, each with its reason. A stale entry fails the suite. */
const EXCLUDED = {
    'inject_agent_protocol_blocks.py': 'agent-only: agents keep full protocol text',
    'inject_agent_skill_connections.py': 'agent-only: agents keep full protocol text'
};
/** Skill writers that are not named `inject_*.py`. */
const EXTRA = []; // sync-hooks-to-skills.py inserts only agent tiers; the skill no-op is tested below.
/** A refresher never inserts, so its body-carrier fixture would come from the injector that does (none today). */
const SEEDED_BY = {};
/** Every in-scope injector must target at least one of these names. */
const FIXTURE_SKILLS = ['workflow-review-changes', 'production-readiness-review', 'fix'];
/** The registry-binding injector targets the workflow ids in this registry. */
const WORKFLOWS = { workflows: { 'workflow-review-changes': {} } };

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const crlf = text => text.replace(/\n/g, '\r\n');

// ─── Canonical tags (shipped canonical file) ────────────────────────────────

const CANONICAL_TEXT = fs.readFileSync(CANONICAL, 'utf8').replace(/\r\n/g, '\n');
const MAIN_TAGS = [...CANONICAL_TEXT.matchAll(/^## SYNC:([a-z0-9][a-z0-9-]*)[ \t]*$/gm)].map(m => m[1]);

// ─── Fixture text ──────────────────────────────────────────────────────────

const staleReminder = tag => `<!-- SYNC:${tag}:reminder -->\n\nStale reminder for ${tag}.\n\n<!-- /SYNC:${tag}:reminder -->`;

/** Guide block carrying every canonical tag, written with the shared formatter. */
function guideBlock() {
    const lines = MAIN_TAGS.map(tag =>
        carrier.formatGuideLine({ tag, summary: `Fixture summary for ${tag}`, when: 'when it applies', path: `.claude/skills/shared/protocols/${tag}.md` })
    );
    return [carrier.GUIDE_BLOCK_START, '', '> **Protocol guides** — fixture.', '', ...lines, '', carrier.GUIDE_BLOCK_END].join('\n');
}

/** A skill in canonical layout (two H2 sections so every insert anchor has a place to land). */
function skillText(name, { guides = false, reminders = [] } = {}) {
    return [
        '---',
        `name: ${name}`,
        'description: fixture skill',
        '---',
        '',
        `# ${name}`,
        '',
        '## Quick Summary',
        '',
        'Fixture body.',
        '',
        '## Workflow',
        '',
        '1. Do the work.',
        '',
        ...(guides ? [guideBlock(), ''] : []),
        ...reminders.flatMap(tag => [staleReminder(tag), '']),
        '## Closing Reminders',
        '',
        '- Keep the fixture honest.',
        ''
    ].join('\n');
}

// ─── Text inspection ───────────────────────────────────────────────────────

const ANY_REMINDER_RE = /<!-- SYNC:([a-z0-9][a-z0-9-]*):reminder -->[\s\S]*?<!-- \/SYNC:\1:reminder -->/g;

/** Tags with a main-body opener (`:reminder` openers never match: `:` is outside the class). */
const mainTags = text => new Set([...text.matchAll(/^<!-- SYNC:([a-z0-9][a-z0-9-]*) -->/gm)].map(m => m[1]));
const reminderTags = text => [...text.matchAll(ANY_REMINDER_RE)].map(m => m[1]);
function reminderOf(text, tag) {
    const m = new RegExp(`<!-- SYNC:${escapeRe(tag)}:reminder -->[\\s\\S]*?<!-- /SYNC:${escapeRe(tag)}:reminder -->`).exec(text);
    return m ? m[0] : null;
}
/** The text with every reminder removed and blank runs collapsed: what a guided run must not touch. */
const withoutReminders = text => text.replace(ANY_REMINDER_RE, '').replace(/\n{3,}/g, '\n\n').trimEnd();
const withStaleReminders = text => text.replace(ANY_REMINDER_RE, (_m, tag) => staleReminder(tag));
const withNoReminders = text => text.replace(ANY_REMINDER_RE, '');

// ─── Temp project + Python ─────────────────────────────────────────────────

function tempDir(prefix) {
    return fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function write(root, rel, content) {
    const file = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
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

/**
 * sync-hooks-to-skills.py runs over the whole skills tree and exits unless every ORCHESTRATOR_SKILLS
 * directory exists, so the fixture drives its per-file unit with the tier order its main() uses.
 */
const SYNC_HOOKS_DRIVER = [
    'import glob, importlib.util, os, sys',
    'scripts = os.path.join(".claude", "scripts")',
    'sys.path.insert(0, scripts)',
    'spec = importlib.util.spec_from_file_location("sync_hooks_to_skills", os.path.join(scripts, "sync-hooks-to-skills.py"))',
    'm = importlib.util.module_from_spec(spec)',
    'spec.loader.exec_module(m)',
    'for p in sorted(glob.glob(os.path.join(".claude", "skills", "*", "SKILL.md"))):',
    '    name = os.path.basename(os.path.dirname(p))',
    '    m.process_file(p, m.ORCHESTRATOR_SKILL_BLOCK_ORDER if name in m.ORCHESTRATOR_SKILLS else m.SKILL_BLOCK_ORDER)'
].join('\n');

/** Build the temp project once; `run(script, files)` writes the fixture skills, runs, reads back. */
function makeProject() {
    const root = tempDir('ck-inj-guides-root-');
    const home = tempDir('ck-inj-guides-home-');
    for (const name of fs.readdirSync(SCRIPTS_DIR)) {
        if (name.endsWith('.py')) write(root, `.claude/scripts/${name}`, fs.readFileSync(path.join(SCRIPTS_DIR, name)));
    }
    write(root, '.claude/skills/shared/sync-inline-versions.md', fs.readFileSync(CANONICAL));
    write(root, '.claude/workflows.json', `${JSON.stringify(WORKFLOWS, null, 2)}\n`);
    fs.mkdirSync(path.join(root, '.claude', 'agents'), { recursive: true });
    const env = childEnv(root, home);

    function run(script, files) {
        for (const [name, text] of Object.entries(files)) write(root, `.claude/skills/${name}/SKILL.md`, text);
        const c = python();
        const args = script === 'sync-hooks-to-skills.py' ? ['-c', SYNC_HOOKS_DRIVER] : [path.join(root, '.claude', 'scripts', script)];
        const r = spawnSync(c.command, [...c.baseArgs, ...args], { cwd: root, env, encoding: 'utf8', timeout: 120000 });
        const stderr = String(r.stderr || '');
        // Exit 1 is how several injectors report the skills this fixture omits (MISSING); a crash is not.
        assert.ok(r.status === 0 || r.status === 1, `${script} exited ${r.status}: ${stderr}`);
        assert.doesNotMatch(stderr, /Traceback/, `${script} crashed: ${stderr}`);
        const out = {};
        for (const name of Object.keys(files)) out[name] = fs.readFileSync(path.join(root, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
        return out;
    }

    const cleanup = () => {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(home, { recursive: true, force: true });
    };
    return { run, cleanup };
}

const mapFiles = (names, fn) => Object.fromEntries(names.map(name => [name, fn(name)]));

function assertNoCR(script, variant, out) {
    for (const [name, text] of Object.entries(out)) {
        assert.ok(!text.includes('\r'), `${script} wrote CR into LF skill ${name} (${variant}): it must keep the file's own line endings`);
    }
}

// ─── Discovery ─────────────────────────────────────────────────────────────

const onDisk = fs.readdirSync(SCRIPTS_DIR);
const INJECTORS = [...onDisk.filter(f => /^inject_.*\.py$/.test(f) && !EXCLUDED[f]).sort(), ...EXTRA];

test('injector discovery: every exclusion and extra names a script on disk', () => {
    // Given the exclusion list and the non-inject_* writers
    // When they are compared with the scripts directory
    // Then none is stale, so a removed or renamed injector cannot silently shrink the loop
    for (const name of [...Object.keys(EXCLUDED), ...EXTRA, ...Object.values(SEEDED_BY)]) {
        assert.ok(onDisk.includes(name), `${name} is named by this suite but missing from .claude/scripts/`);
    }
    // And the fixture guide block is recognized for every canonical tag by the shared recognizer
    const tags = carrier.guideTags(skillText('probe', { guides: true }));
    assert.deepEqual(tags, MAIN_TAGS);
    assert.ok(MAIN_TAGS.length > 0, 'the shipped canonical file lists no SYNC tags');
});

test('TC-PDL-066: no skill injector inserts a body into a guided skill; reminders still refresh', async t => {
    const project = makeProject();
    try {
        for (const script of INJECTORS) {
            await t.test(script, () => {
                const seed = SEEDED_BY[script] || script;

                // Given bare fixture skills, When the (seed) injector runs, Then it inserts the bodies it owns
                const bare = mapFiles(FIXTURE_SKILLS, name => skillText(name));
                const control = project.run(seed, bare);
                assertNoCR(seed, 'control', control);
                const owned = mapFiles(FIXTURE_SKILLS, name => [...mainTags(control[name])]);
                const allOwned = new Set(Object.values(owned).flat());
                assert.ok(
                    allOwned.size > 0,
                    `${seed} inserted no protocol body into any of ${FIXTURE_SKILLS.join(', ')}: add a skill it targets to FIXTURE_SKILLS, or list it in EXCLUDED with a reason`
                );
                for (const tag of allOwned) assert.ok(MAIN_TAGS.includes(tag), `${seed} inserted ${tag}, which the canonical file does not define`);

                for (const variant of ['no-reminder', 'stale-reminder']) {
                    // Given the same protocols carried two ways: as bodies (control output) and as guide lines
                    const bodyIn = mapFiles(FIXTURE_SKILLS, name =>
                        variant === 'no-reminder' ? withNoReminders(control[name]) : withStaleReminders(control[name])
                    );
                    const guidedIn = mapFiles(FIXTURE_SKILLS, name =>
                        skillText(name, { guides: true, reminders: variant === 'no-reminder' ? [] : reminderTags(control[name]) })
                    );

                    // When the injector runs on each
                    const bodyOut = project.run(script, bodyIn);
                    const guidedOut = project.run(script, guidedIn);
                    assertNoCR(script, variant, bodyOut);
                    assertNoCR(script, variant, guidedOut);

                    for (const name of FIXTURE_SKILLS) {
                        // Then no body is inserted into the guided skill
                        const inserted = [...mainTags(guidedOut[name])];
                        assert.deepEqual(inserted, [], `${script} inserted ${inserted.join(', ')} into guided skill ${name} (${variant})`);
                        // And nothing outside its reminders changes
                        assert.equal(
                            withoutReminders(guidedOut[name]),
                            withoutReminders(guidedIn[name]),
                            `${script} changed guided skill ${name} outside its reminders (${variant})`
                        );
                        // And each owned tag's reminder ends exactly as it does for a body-carrier
                        for (const tag of owned[name]) {
                            assert.equal(
                                reminderOf(guidedOut[name], tag),
                                reminderOf(bodyOut[name], tag),
                                `${script}: reminder for ${tag} in ${name} differs between a guide-carrier and a body-carrier (${variant})`
                            );
                        }
                    }

                    if (variant === 'stale-reminder') {
                        // Given the same guided skills saved with CRLF line endings
                        // When the injector runs, Then the result is the LF result with CRLF kept
                        const crlfOut = project.run(script, mapFiles(FIXTURE_SKILLS, name => crlf(guidedIn[name])));
                        for (const name of FIXTURE_SKILLS) {
                            assert.equal(crlfOut[name], crlf(guidedOut[name]), `${script} did not keep CRLF in ${name}`);
                        }
                    }
                }
            });
        }
    } finally {
        project.cleanup();
    }
});


test('sync-hooks-to-skills leaves bare and guided skills unchanged when skill tiers are empty', () => {
    const project = makeProject();
    try {
        for (const guides of [false, true]) {
            const input = mapFiles(FIXTURE_SKILLS, name => skillText(name, { guides }));
            assert.deepEqual(project.run('sync-hooks-to-skills.py', input), input);
        }
    } finally { project.cleanup(); }
});
