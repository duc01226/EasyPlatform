/**
 * Code-graph opt-in — the graph mode switch `hooks.codeGraph.enabled` (auto | on | off).
 *
 * Guarded business rules:
 * - The graph mode decides graph activity: on → active; auto → active only with a built
 *   graph, dormant without one; off → off. Omitting the setting means auto.
 * - A session start installs or refreshes graph tooling only while the graph is active, so
 *   adopting the framework never downloads tooling for a capability the project does not use.
 * - The graph-not-built note appears only in mode on without a built graph, at most once per
 *   session, never after a dismissal; auto and off never show it. Without a host session id the one
 *   shared marker expires after 24 h; writing a marker prunes this project's markers older than 24 h.
 *   Without the toolchain the note names Python 3.10+ and leaves the install to /graph-code --mode=build.
 * - Off means inert: no automatic step (session start, prompt, edit) produces graph output,
 *   refreshes the graph or starts a process, even when an old graph exists. Projects without a
 *   graph still leave the edit and prompt steps at their first cheap existence check.
 *
 * How "no process started" is observed: graph-utils routes every process it starts through one
 * helper; the CK_GRAPH_SPAWN_STUB seam records each would-be start to a file and starts nothing.
 * Every silence assertion is paired with a control fixture that DOES reach the recorder, so a
 * removed gate turns a silence test red instead of passing vacuously.
 *
 * Portable: every case builds its own project in a temp dir (config, graph file, layout); the
 * real hooks run in fresh child processes with inherited CK_* switches removed and
 * HOME/USERPROFILE/TMPDIR/TEMP/TMP pointed at the fixture. No read of this repository's own
 * config, docs or git state, so no framework-repo guard is needed.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertEqual, assertTrue, assertFalse, assertContains } = require('../lib/assertions.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

const HOOKS_DIR = path.resolve(__dirname, '..', '..');
const GRAPH_UTILS = path.join(HOOKS_DIR, 'lib', 'graph-utils.cjs');
const NOTE = 'Knowledge graph not built';
const GRAPH_TEXTS = [NOTE, '/graph-code --mode=build', 'Graph build skipped'];

/**
 * Build a fixture project.
 * @param {{ mode?: string, graphBuilt?: boolean }} options - mode undefined omits the setting
 * @returns {string} fixture root
 */
function makeProject({ mode, graphBuilt = false } = {}) {
    const dir = createTempDir('ck-code-graph-opt-in-');
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true }); // content dir: prompt gates apply
    fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
    const config = {
        project: { name: 'fixture-project' },
        modules: [{ name: 'mod', kind: 'library', pathRegex: 'src/' }]
    };
    if (mode !== undefined) config.hooks = { codeGraph: { enabled: mode } };
    fs.writeFileSync(path.join(dir, 'docs', 'project-config.json'), JSON.stringify(config, null, 2));
    // Root agent files are not under test: dismiss their setup offer so it never mixes in.
    const tmpClaude = path.join(dir, 'tmp', 'claude-temp');
    fs.mkdirSync(tmpClaude, { recursive: true });
    fs.writeFileSync(path.join(tmpClaude, '.agent-files-dismissed'), new Date().toISOString());
    if (graphBuilt) {
        const db = path.join(dir, '.code-graph', 'graph.db');
        fs.mkdirSync(path.dirname(db), { recursive: true });
        fs.writeFileSync(db, 'old graph');
        // Older than the edit hook's 3 s debounce, so an active graph really proceeds.
        const past = new Date(Date.now() - 60 * 1000);
        fs.utimesSync(db, past, past);
    }
    return dir;
}

function withProject(options, fn) {
    const dir = makeProject(options);
    try {
        return fn(dir);
    } finally {
        cleanupTempDir(dir);
    }
}

const spawnLog = dir => path.join(dir, 'graph-spawns.jsonl');

/**
 * Clean child env: no inherited CK_* switch, home, temp and the per-user cache root inside the
 * fixture, spawn seam armed. The shared graph venv resolves under LOCALAPPDATA (win32) or
 * XDG_CACHE_HOME (Linux), so a real shared venv on the machine cannot leak into a case.
 */
function isolatedEnv(dir) {
    const overrides = {
        HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir,
        LOCALAPPDATA: dir, XDG_CACHE_HOME: dir,
        CLAUDE_PROJECT_DIR: dir,
        CLAUDE_HOOK_DEBUG: undefined
    };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    overrides.CK_GRAPH_SPAWN_STUB = spawnLog(dir);
    return childEnv(overrides);
}

/** Run one real hook as its own process against the fixture. */
function runHookIn(dir, hookFile, payload) {
    const child = spawnSync(process.execPath, [path.join(HOOKS_DIR, hookFile)], {
        cwd: dir,
        env: isolatedEnv(dir),
        input: JSON.stringify(payload),
        encoding: 'utf8',
        timeout: 30000,
        windowsHide: true
    });
    assertEqual(child.error, undefined, `${hookFile} must complete: ${child.error && child.error.message}`);
    assertEqual(child.status, 0, `${hookFile} must stay non-blocking; stderr: ${child.stderr}`);
    return { stdout: child.stdout || '', stderr: child.stderr || '' };
}

/** Every process start the graph tooling attempted in this fixture. */
function spawnsIn(dir) {
    try {
        return fs.readFileSync(spawnLog(dir), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
        return [];
    }
}

const sessionStart = { hook_event_name: 'SessionStart', source: 'startup', session_id: 'session-a' };
const prompt = (text, sessionId = 'session-a') => ({ hook_event_name: 'UserPromptSubmit', prompt: text, session_id: sessionId });
const editEvent = dir => ({
    hook_event_name: 'PostToolUse',
    tool_name: 'Edit',
    session_id: 'session-a',
    tool_input: { file_path: path.join(dir, 'src', 'index.js'), old_string: 'a', new_string: 'b' }
});

const promptWithoutSession = text => ({ hook_event_name: 'UserPromptSubmit', prompt: text });
// The once-per-session note markers live in the OS temp dir, which isolatedEnv points at the fixture.
const markersDir = dir => path.join(dir, 'ck', 'markers');
const graphNoteMarkers = dir => {
    try {
        return fs.readdirSync(markersDir(dir)).filter(name => name.startsWith('graph-note-')).sort();
    } catch {
        return [];
    }
};
const DAY_MS = 24 * 60 * 60 * 1000;
const backdate = (file, ageMs) => {
    const past = new Date(Date.now() - ageMs);
    fs.utimesSync(file, past, past);
};

const count = (text, needle) => text.split(needle).length - 1;
const assertNoGraphText = (text, label) => {
    for (const needle of GRAPH_TEXTS) assertFalse(text.includes(needle), `${label}: unexpected graph text "${needle}" in ${JSON.stringify(text)}`);
};

const tests = [
    {
        name: '[code-graph-opt-in] BR-ADS-01 codeGraphMode maps the setting and graph presence to active | dormant | off',
        fn() {
            // Given each setting (on, auto, off, omitted, out-of-contract) in a project with and without a built graph
            const { codeGraphMode } = require(GRAPH_UTILS);
            const cfg = enabled => ({ hooks: { codeGraph: { enabled } } });
            for (const graphBuilt of [false, true]) {
                const dir = makeProject({ graphBuilt });
                try {
                    // When codeGraphMode resolves the mode
                    // Then on is active, auto follows the graph, off and anything outside the contract are off
                    const expectAuto = graphBuilt ? 'active' : 'dormant';
                    assertEqual(codeGraphMode({ config: cfg('on'), projectDir: dir }), 'active', `on, graph=${graphBuilt}`);
                    assertEqual(codeGraphMode({ config: cfg('auto'), projectDir: dir }), expectAuto, `auto, graph=${graphBuilt}`);
                    assertEqual(codeGraphMode({ config: cfg('off'), projectDir: dir }), 'off', `off, graph=${graphBuilt}`);
                    assertEqual(codeGraphMode({ config: {}, projectDir: dir }), expectAuto, `setting omitted means auto, graph=${graphBuilt}`);
                    assertEqual(codeGraphMode({ config: { hooks: {} }, projectDir: dir }), expectAuto, `codeGraph omitted means auto, graph=${graphBuilt}`);
                    // Outside the contract (validation rejects it): stay inert rather than guess.
                    assertEqual(codeGraphMode({ config: cfg('yes'), projectDir: dir }), 'off', `unknown value is inert, graph=${graphBuilt}`);
                    assertEqual(codeGraphMode({ config: { hooks: { codeGraph: 'on' } }, projectDir: dir }), 'off', `non-object section is inert, graph=${graphBuilt}`);
                } finally {
                    cleanupTempDir(dir);
                }
            }
        }
    },
    {
        name: '[code-graph-opt-in] TC-ADS-001 auto mode without a built graph installs nothing at session start',
        fn() {
            for (const mode of ['auto', undefined]) {
                // Given a project in mode auto (or with the setting omitted) and no built graph
                withProject({ mode, graphBuilt: false }, dir => {
                    const label = mode === undefined ? 'setting omitted' : `mode ${mode}`;
                    // When a session starts
                    const out = runHookIn(dir, 'graph-session-init.cjs', sessionStart);
                    // Then nothing is printed, no toolchain process starts and no environment is created
                    assertEqual(out.stdout, '', `${label}: session start prints nothing`);
                    assertEqual(JSON.stringify(spawnsIn(dir)), '[]', `${label}: no graph tooling process (no Python probe, no venv, no pip)`);
                    assertFalse(fs.existsSync(path.join(dir, 'tmp', 'claude-temp', '.venv')), `${label}: no graph tooling environment is created`);
                });
            }
            // Control: the same fixture in mode on DOES reach the toolchain, so the recorder
            // above observes a real install path and the silence is not vacuous.
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                runHookIn(dir, 'graph-session-init.cjs', sessionStart);
                assertTrue(spawnsIn(dir).length > 0, 'control: mode on must probe the graph toolchain at session start');
            });
        }
    },
    {
        name: '[code-graph-opt-in] TC-ADS-002 auto mode without a built graph shows no graph note',
        fn() {
            // Given a project in mode auto without a built graph
            withProject({ mode: 'auto', graphBuilt: false }, dir => {
                // When the user submits a prompt
                const out = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                // Then no graph text appears and no toolchain probe starts
                assertNoGraphText(out.stdout, 'auto without a graph');
                assertEqual(JSON.stringify(spawnsIn(dir)), '[]', 'auto without a graph: the prompt gate probes no toolchain');
            });
            // Control: the same fixture in mode on reaches the graph gate and shows the note.
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                const out = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                assertContains(out.stdout, NOTE, 'control: mode on without a graph shows the note');
            });
            // Edge: the same project after building a graph runs graph features as before (no note).
            withProject({ mode: 'auto', graphBuilt: true }, dir => {
                const out = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                assertNoGraphText(out.stdout, 'auto with a built graph');
            });
        }
    },
    {
        name: '[code-graph-opt-in] TC-ADS-003 on mode without a built graph notes it once per session',
        fn() {
            // Given a project in mode on without a built graph
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                // When two prompts arrive in the same session
                const first = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                const second = runHookIn(dir, 'init-prompt-gate.cjs', prompt('now add tests'));
                // Then only the first carries the note, and it routes to the graph build
                assertEqual(count(first.stdout, NOTE), 1, 'the first prompt of the session carries exactly one note');
                assertContains(first.stdout, '/graph-code --mode=build', 'the note routes to the graph build');
                // And without the toolchain (the spawn seam finds no Python) the note leaves the install to
                // /graph-code --mode=build, never to a system-wide pip install
                assertContains(first.stdout, 'Python 3.10+ required; `/graph-code --mode=build` installs the rest', 'the no-toolchain note names the prerequisite and the install route');
                assertFalse(first.stdout.includes('pip install'), 'the note must not tell the user to pip install into the system Python');
                assertEqual(count(second.stdout, NOTE), 0, 'the second prompt of the same session carries no note');
                // Edge: a new session may show it once again.
                const otherSession = runHookIn(dir, 'init-prompt-gate.cjs', prompt('next task', 'session-b'));
                assertEqual(count(otherSession.stdout, NOTE), 1, 'a new session shows the note once again');
            });
            // Edge: a dismissal made earlier silences the note.
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                fs.writeFileSync(path.join(dir, 'tmp', 'claude-temp', '.graph-dismissed'), new Date().toISOString());
                const out = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                assertEqual(count(out.stdout, NOTE), 0, 'a dismissed note never appears');
            });
        }
    },
    {
        // Guards the documented fallback: a host without a session id shares one marker, which expires after
        // 24 h so the note is neither repeated on every prompt nor silenced forever.
        name: '[code-graph-opt-in] TC-ADS-003 without a host session id the shared note marker expires after 24 h',
        fn() {
            // Given a project in mode on without a built graph, on a host that sends no session id
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                // When two prompts arrive
                const first = runHookIn(dir, 'init-prompt-gate.cjs', promptWithoutSession('implement feature X'));
                const second = runHookIn(dir, 'init-prompt-gate.cjs', promptWithoutSession('now add tests'));
                // Then the note appears once, recorded in the one shared fallback marker
                assertEqual(count(first.stdout, NOTE), 1, 'the first prompt without a session id carries the note');
                assertEqual(count(second.stdout, NOTE), 0, 'a second prompt within 24 h carries no note');
                const markers = graphNoteMarkers(dir);
                assertEqual(markers.length, 1, `one shared marker expected, got ${JSON.stringify(markers)}`);
                assertTrue(markers[0].endsWith('-default'), `the shared marker uses the fallback session key: ${markers[0]}`);
                // When that marker is older than 24 h
                backdate(path.join(markersDir(dir), markers[0]), DAY_MS + 60 * 1000);
                const later = runHookIn(dir, 'init-prompt-gate.cjs', promptWithoutSession('next task'));
                // Then the note appears once again
                assertEqual(count(later.stdout, NOTE), 1, 'an expired shared marker lets the note show again');
            });
            // Control: with a session id the same back-dated marker still silences the note (the expiry
            // applies only to the shared fallback marker).
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                const [marker] = graphNoteMarkers(dir);
                backdate(path.join(markersDir(dir), marker), DAY_MS + 60 * 1000);
                const again = runHookIn(dir, 'init-prompt-gate.cjs', prompt('now add tests'));
                assertEqual(count(again.stdout, NOTE), 0, 'a session-keyed marker does not expire within its session');
            });
        }
    },
    {
        // Guards temp hygiene: one marker is written per session and nothing else deletes them, so writing a
        // new one removes this project's markers past their 24 h lifetime and leaves everything else alone.
        name: '[code-graph-opt-in] TC-ADS-003 writing a note marker prunes this project\'s markers older than 24 h',
        fn() {
            // Given a project in mode on without a built graph, whose first session left a marker
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X', 'session-a'));
                const [own] = graphNoteMarkers(dir);
                assertTrue(own && own.endsWith('-session-a'), `session-a marker expected, got ${JSON.stringify(graphNoteMarkers(dir))}`);
                const prefix = own.slice(0, -'session-a'.length);
                // And more markers: this project's stale and fresh ones, plus another project's stale one
                const staleOwn = `${prefix}session-old`;
                const freshOwn = `${prefix}session-fresh`;
                const staleOther = 'graph-note-000000000000-session-old';
                for (const name of [staleOwn, freshOwn, staleOther]) fs.writeFileSync(path.join(markersDir(dir), name), 'x\n');
                for (const name of [own, staleOwn, staleOther]) backdate(path.join(markersDir(dir), name), DAY_MS + 60 * 1000);
                // When a new session shows the note and writes its marker
                const out = runHookIn(dir, 'init-prompt-gate.cjs', prompt('next task', 'session-b'));
                assertEqual(count(out.stdout, NOTE), 1, 'the new session shows the note');
                // Then this project's markers older than 24 h are gone, and the fresh one, the new one and the
                // other project's marker remain
                const left = graphNoteMarkers(dir);
                assertFalse(left.includes(staleOwn), 'a stale marker of this project is pruned');
                assertFalse(left.includes(own), 'the stale first-session marker is pruned');
                assertTrue(left.includes(freshOwn), 'a fresh marker of this project is kept');
                assertTrue(left.includes(`${prefix}session-b`), 'the new session marker is written');
                assertTrue(left.includes(staleOther), 'another project\'s marker is never touched');
            });
        }
    },
    {
        name: '[code-graph-opt-in] TC-ADS-005 off mode with a built graph produces no graph activity',
        fn() {
            // Given a project in mode off that still holds an old graph
            withProject({ mode: 'off', graphBuilt: true }, dir => {
                const db = path.join(dir, '.code-graph', 'graph.db');
                const before = fs.readFileSync(db, 'utf8');
                // When a session starts and prompts (including "skip graph") arrive
                const session = runHookIn(dir, 'graph-session-init.cjs', sessionStart);
                const gate1 = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X'));
                const gate2 = runHookIn(dir, 'init-prompt-gate.cjs', prompt('skip graph'));
                const sync = runHookIn(dir, 'graph-prompt-sync.cjs', prompt('implement feature X'));
                // Then no step prints graph output, starts a process or refreshes or touches the graph
                assertEqual(session.stdout, '', 'session start prints nothing');
                assertEqual(sync.stdout, '', 'prompt sync prints nothing');
                assertNoGraphText(gate1.stdout + gate2.stdout, 'off with a graph');
                assertEqual(JSON.stringify(spawnsIn(dir)), '[]', 'no graph process at session start or on prompts');
                assertFalse(fs.existsSync(path.join(dir, '.code-graph', '.last-seen-head')), 'the graph is not refreshed (no sync recorded)');
                assertEqual(fs.readFileSync(db, 'utf8'), before, 'the old graph is left untouched');
            });
            // Edge: off without any graph is silent too — not even an answer to "skip graph".
            withProject({ mode: 'off', graphBuilt: false }, dir => {
                const out = runHookIn(dir, 'init-prompt-gate.cjs', prompt('implement feature X')).stdout
                    + runHookIn(dir, 'init-prompt-gate.cjs', prompt('skip graph')).stdout;
                assertNoGraphText(out, 'off without a graph');
                assertFalse(fs.existsSync(path.join(dir, 'tmp', 'claude-temp', '.graph-dismissed')), 'off: no dismissal state is written');
            });
            // Control: switching back to auto with the graph present resumes graph work.
            withProject({ mode: 'auto', graphBuilt: true }, dir => {
                runHookIn(dir, 'graph-session-init.cjs', sessionStart);
                assertTrue(spawnsIn(dir).length > 0, 'control: auto with a built graph reaches the graph toolchain');
            });
        }
    },
    {
        name: '[code-graph-opt-in] TC-ADS-056 off mode keeps the per-edit and per-prompt graph steps from starting',
        fn() {
            // Given a project in mode off with a built graph
            withProject({ mode: 'off', graphBuilt: true }, dir => {
                // When a file is edited and a prompt arrives
                const edit = runHookIn(dir, 'graph-auto-update.cjs', editEvent(dir));
                const sync = runHookIn(dir, 'graph-prompt-sync.cjs', prompt('implement feature X'));
                // Then neither step writes output or starts a process
                assertEqual(edit.stdout + edit.stderr, '', 'edit step writes no output');
                assertEqual(sync.stdout + sync.stderr, '', 'prompt step writes no output');
                assertEqual(JSON.stringify(spawnsIn(dir)), '[]', 'neither step starts a process');
            });
            // Controls: with the graph active each step does reach a process start, one hook at a time.
            for (const [hook, payload] of [['graph-auto-update.cjs', editEvent], ['graph-prompt-sync.cjs', () => prompt('implement feature X')]]) {
                withProject({ mode: 'auto', graphBuilt: true }, dir => {
                    runHookIn(dir, hook, payload(dir));
                    assertTrue(spawnsIn(dir).length > 0, `control: ${hook} with an active graph starts a process`);
                });
            }
            // Edge: without a graph both steps stop at the existence check, before the setting is
            // consulted — even mode on (which would be active) starts nothing.
            withProject({ mode: 'on', graphBuilt: false }, dir => {
                runHookIn(dir, 'graph-auto-update.cjs', editEvent(dir));
                runHookIn(dir, 'graph-prompt-sync.cjs', prompt('implement feature X'));
                assertEqual(JSON.stringify(spawnsIn(dir)), '[]', 'no graph: both steps exit on the first cheap check');
            });
        }
    }
];

module.exports = {
    name: 'code-graph-opt-in',
    tests
};
