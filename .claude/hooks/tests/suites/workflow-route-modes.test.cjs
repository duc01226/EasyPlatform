'use strict';

/**
 * Workflow route modes (ask | auto | off) — end to end.
 *
 * The route hooks are the ONLY carrier of the workflow route, in the mode each person chose. The route is
 * two hook outputs: `workflow-route-inject.cjs` writes the state line, the gate and the project protocol;
 * `workflow-catalog-inject.cjs` writes the workflow catalog. These tests run the REAL hooks as child
 * processes (and the real Codex launcher command) inside a temp fixture project with its own HOME, so a
 * mode switch that stops working fails here — a check of the source text alone would keep passing.
 * Intents protected:
 * - Each mode delivers its own text: `ask` and `auto` both ask the workflow question (`auto` recommends the full workflow first),
 *   `off` delivers a one-line state with no gate and no catalog (BR-WFR-06, BR-WFR-08).
 * - The catalog is an output of its own: silent wherever no gate is delivered, recorded and re-delivered
 *   independently of the route output, and never a second writer of a prompt directive (TC-WFR-025).
 * - Precedence, later wins: default `ask` < project config < ~/.claude/.ck.json < .claude/.ck.local.json
 *   < env CK_WORKFLOW_ROUTE_MODE < this session's prompt directive (BR-WFR-10).
 * - No project config, a config without the key, and an invalid or corrupt value in ANY source all end at
 *   `ask`; the hook never throws or blocks (BR-WFR-10).
 * - A prompt directive applies at once, persists for the session, re-delivers even after the catalog was
 *   delivered, and never fires on prose (BR-WFR-11).
 * - A personal setting never reaches tracked output and is never written to a tracked file (BR-WFR-05).
 *
 * Portable Test Contract: fixture projects and homes are temp dirs; inherited CK_* switches and debug keys
 * are blanked; HOME, USERPROFILE, TMPDIR, TEMP and TMP point at the fixture.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertTrue, assertEqual, assertContains, assertNotContains } = require('../lib/assertions.cjs');
const { childEnv, makeHookTreeProject, removeTempDir, runCodexLauncher } = require('../lib/hook-runner.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const CLAUDE_DIR = path.join(PROJECT_DIR, '.claude');
const routing = require(path.join(CLAUDE_DIR, 'scripts', 'lib', 'workflow-routing-config.cjs'));
const conventionLedger = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'convention-ledger.cjs'));
const frameworkRepoGuard = require('../lib/framework-repo-guard.cjs');
const FRAMEWORK_REPO_SKIP = frameworkRepoGuard.isFrameworkRepo(PROJECT_DIR) ? false : 'asserts the framework repo files only';
const CODEX_HOOKS_SKIP = fs.existsSync(path.join(PROJECT_DIR, '.codex', 'hooks.json')) ? false : 'no .codex/hooks.json in this project';
const GIT_AVAILABLE = (() => {
    try {
        return spawnSync('git', ['--version'], { encoding: 'utf8', windowsHide: true }).status === 0;
    } catch {
        return false;
    }
})();

const PAYLOAD_CAP = 9500;
const ROUTE_HOOK = 'workflow-route-inject.cjs';
const CATALOG_HOOK = 'workflow-catalog-inject.cjs';
const ROUTE_START = '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->';
const CATALOG_START = '<!-- CK:RUNTIME-WORKFLOW-CATALOG -->';
const CATALOG_END = '<!-- /CK:RUNTIME-WORKFLOW-CATALOG -->';
const CATALOG_HEADING = '## Workflow & Skills Catalog';
const ASK_QUESTION = '**Workflow question** (every tier)';
// Mode auto's own line: the same workflow question, with the full workflow recommended first (P46).
const AUTO_START = '**Route mode `auto`:**';
// Mode ask's own line: how the tier orders the recommendation. Both modes carry the workflow question.
const ASK_TIER = 'The tier (workflow `activation`) only orders the recommendation';
// The catalog's tier legend, in each mode's own words.
const ASK_LEGEND = 'before you start a catalog workflow, in every tier';
const AUTO_LEGEND = '**Activation (mode auto):**';
const SWITCHES = { CK_SKILL_AUTO_TRIGGER: undefined, CK_WORKFLOW_ROUTE_MODE: undefined, CK_SESSION_ID: undefined, CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined, NODE_OPTIONS: undefined };

/**
 * A fixture project holding the real hook tree, the routing libraries, the workflow registry, the gate
 * file and the mode CLI, plus a separate HOME and temp dir. `run` spawns the real route hook, `runCatalog`
 * the real catalog hook (the two outputs of one prompt); `cli` spawns the CLI.
 * `overrides` is the RAW override map (an `undefined` value deletes the key) for helpers that resolve the
 * child environment themselves, such as `runCodexLauncher`; `env` is that map already resolved, for `spawnSync`.
 */
function makeProject() {
    const root = makeHookTreeProject('route-modes');
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'route-modes-home-'));
    const home = path.join(scratch, 'home');
    const tmp = path.join(scratch, 'tmp');
    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(tmp, { recursive: true });
    fs.cpSync(path.join(CLAUDE_DIR, 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(CLAUDE_DIR, 'scripts', 'workflow-mode.cjs'), path.join(root, '.claude', 'scripts', 'workflow-mode.cjs'));
    fs.copyFileSync(path.join(CLAUDE_DIR, 'workflows.json'), path.join(root, '.claude', 'workflows.json'));
    fs.mkdirSync(path.join(root, '.claude', 'skills', 'shared'), { recursive: true });
    fs.copyFileSync(
        path.join(CLAUDE_DIR, 'skills', 'shared', 'workflow-first-gate.md'),
        path.join(root, '.claude', 'skills', 'shared', 'workflow-first-gate.md')
    );
    const overrides = extra => ({
        ...SWITCHES, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home, TMPDIR: tmp, TEMP: tmp, TMP: tmp, ...extra
    });
    const env = extra => childEnv(overrides(extra));
    const spawnEvent = (hookFile, payload, extraEnv) => {
        const result = spawnSync(process.execPath, [path.join(root, '.claude', 'hooks', hookFile)], {
            cwd: root,
            input: JSON.stringify({ cwd: root, ...payload }),
            env: env(extraEnv), encoding: 'utf8', windowsHide: true, timeout: 30000
        });
        return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
    };
    const spawnHook = (hookFile, session, prompt, extraEnv) =>
        spawnEvent(hookFile, { hook_event_name: 'UserPromptSubmit', session_id: session, prompt }, extraEnv);
    const project = {
        root,
        home,
        userFile: path.join(home, '.claude', '.ck.json'),
        localFile: path.join(root, '.claude', '.ck.local.json'),
        teamFile: path.join(root, 'docs', 'project-config.json'),
        registryFile: path.join(root, '.claude', 'workflows.json'),
        gateFile: path.join(root, '.claude', 'skills', 'shared', 'workflow-first-gate.md'),
        overrides,
        env,
        write(file, value) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value));
        },
        run(session, prompt, extraEnv = {}) {
            return spawnHook(ROUTE_HOOK, session, prompt, extraEnv);
        },
        runCatalog(session, prompt, extraEnv = {}) {
            return spawnHook(CATALOG_HOOK, session, prompt, extraEnv);
        },
        runEntry(hookFile, session, prompt, extraEnv = {}) {
            return spawnHook(hookFile, session, prompt, extraEnv);
        },
        runEvent(hookFile, payload, extraEnv = {}) {
            return spawnEvent(hookFile, payload, extraEnv);
        },
        cli(args, extraEnv = {}) {
            const result = spawnSync(process.execPath, [path.join(root, '.claude', 'scripts', 'workflow-mode.cjs'), ...args], {
                cwd: root, env: env(extraEnv), encoding: 'utf8', windowsHide: true, timeout: 30000
            });
            return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
        },
        cleanup() {
            removeTempDir(root);
            removeTempDir(scratch);
        }
    };
    return project;
}

async function withProject(fn) {
    const project = makeProject();
    try {
        return await fn(project);
    } finally {
        project.cleanup();
    }
}

const modeOf = out => (out.match(/^Route mode: (ask|auto|off) \(([^)]*?)(?: — [^)]*)?\)/m) || []).slice(1, 3);
const cfg = mode => ({ portability: { workflowRouteMode: mode } });
let sessionCounter = 0;
const newSession = () => `route-modes-${process.pid}-${++sessionCounter}`;

module.exports = {
    name: 'workflow-route-modes',
    tests: [
        {
            // Intent: the default mode asks; a person who never configures anything keeps today's behavior.
            name: '[workflow-route-modes] TC-WFR-014 mode ask (the default) delivers the gate, the workflow question and the catalog once per session',
            fn: () => withProject(p => {
                // Given a project with no configuration at all
                const session = newSession();
                // When the first prompt arrives and both route hooks run
                const first = p.run(session, 'fix the flaky login test');
                const catalog = p.runCatalog(session, 'fix the flaky login test');
                // Then the route hook exits cleanly with the ask-mode route
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'ask|default');
                assertContains(first.out, ROUTE_START);
                assertContains(first.out, ASK_QUESTION);
                assertContains(first.out, '(c) execute directly, no workflow or skill');
                assertNotContains(first.out, AUTO_START, 'mode ask must not carry the auto-start text');
                assertNotContains(first.out, 'CK:GATE-MODE', 'no fence line may reach the model');
                // And the catalog arrives as an output of its own, from the catalog hook
                assertEqual(catalog.code, 0, catalog.err);
                assertContains(catalog.out, CATALOG_START);
                assertContains(catalog.out, CATALOG_HEADING);
                assertContains(catalog.out, ASK_LEGEND);
                assertNotContains(first.out, CATALOG_HEADING, 'the route output carries no catalog');
                assertNotContains(catalog.out, ROUTE_START, 'the catalog output carries no route block');
                // And the second prompt of the session stays silent on both
                assertEqual(p.run(session, 'and one more thing').out, '', 'delivered once per session');
                assertEqual(p.runCatalog(session, 'and one more thing').out, '', 'the catalog is delivered once per session');
                // And a new session receives both again
                const next = newSession();
                assertContains(p.run(next, 'hello').out, ASK_QUESTION);
                assertContains(p.runCatalog(next, 'hello').out, CATALOG_HEADING);
            })
        },
        {
            // Intent: a compaction drops the route and catalog from the conversation, and a long autonomous run
            // may never send another prompt, so the host's compaction report carries both at once.
            name: '[workflow-route-modes] TC-WFR-027 a compaction report delivers the route and the catalog at once, as session-start context',
            fn: () => withProject(p => {
                // Given a session that already received both outputs
                const session = newSession();
                assertContains(p.run(session, 'fix the flaky login test').out, ROUTE_START);
                assertContains(p.runCatalog(session, 'fix the flaky login test').out, CATALOG_HEADING);
                // When the host reports a compaction
                const compact = { hook_event_name: 'SessionStart', session_id: session, source: 'compact' };
                const route = p.runEvent(ROUTE_HOOK, compact);
                const catalog = p.runEvent(CATALOG_HOOK, compact);
                // Then each arrives again as the session-start context envelope, with the same mode
                assertEqual(route.code, 0, route.err);
                const routeContext = JSON.parse(route.out).hookSpecificOutput;
                assertEqual(routeContext.hookEventName, 'SessionStart');
                assertContains(routeContext.additionalContext, ROUTE_START);
                assertEqual(modeOf(routeContext.additionalContext).join('|'), 'ask|default');
                assertContains(JSON.parse(catalog.out).hookSpecificOutput.additionalContext, CATALOG_HEADING);
                // And the other session-start sources stay silent: the next prompt carries the route
                for (const source of ['startup', 'resume', 'clear']) {
                    assertEqual(p.runEvent(ROUTE_HOOK, { ...compact, source }).out, '', `${source} delivers nothing`);
                    assertEqual(p.runEvent(CATALOG_HOOK, { ...compact, source }).out, '', `${source} delivers no catalog`);
                }
            })
        },
        {
            // Intent: `auto` keeps the question (the user's always-ask rule, P46) and only recommends the full workflow first.
            name: '[workflow-route-modes] TC-WFR-014 mode auto asks the workflow question and recommends the full workflow first',
            fn: () => withProject(p => {
                // Given the person sets auto in the environment
                const session = newSession();
                const env = { CK_WORKFLOW_ROUTE_MODE: 'auto' };
                // When the first prompt arrives and both route hooks run
                const first = p.run(session, 'add a retry to the fetcher', env);
                const catalog = p.runCatalog(session, 'add a retry to the fetcher', env);
                // Then the route asks the same question before any self-selected workflow starts, recommends the full workflow first,
                // and keeps the mid-session and explicit-request rules
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'auto|env CK_WORKFLOW_ROUTE_MODE');
                assertContains(first.out, AUTO_START);
                assertContains(first.out, ASK_QUESTION);
                assertContains(first.out, 'it NEVER starts before the answer');
                assertContains(first.out, '**Route mode `auto`:** recommend (a) first, except for a `manual` tier.');
                assertNotContains(first.out, ASK_TIER, 'the ask tier line is its own text');
                assertContains(first.out, 'Mid-session: never auto-activate a workflow or ask to start one.');
                assertContains(first.out, 'An explicit request (`$workflow-*` on Codex too) runs any tier with no question');
                // And the catalog output carries the auto tier legend, never the ask one
                assertEqual(catalog.code, 0, catalog.err);
                assertContains(catalog.out, CATALOG_HEADING);
                assertContains(catalog.out, AUTO_LEGEND);
                assertNotContains(catalog.out, ASK_LEGEND, 'the auto legend is its own text');
                assertContains(catalog.out, 'recommending the full workflow first for an `auto` or `confirm` tier and never first for `manual`');
                assertNotContains(first.out, CATALOG_HEADING, 'the route output carries no catalog');
                // And no auto-start wording survives in either output
                for (const out of [first.out, catalog.out]) assertTrue(!/starts? (?:it )?without asking/.test(out), 'mode auto must never start a self-selected workflow unasked');
            })
        },
        {
            // Intent: `off` is a state line only; the big catalog is not spent and nothing self-starts.
            name: '[workflow-route-modes] TC-WFR-014 mode off delivers a short state with no gate and no catalog, once per session, keeping explicit requests',
            fn: () => withProject(p => {
                const session = newSession();
                // Given the person sets off in the environment
                const first = p.run(session, '/workflow-bugfix fix the login crash', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                // Then only the off state arrives: no gate, no catalog, well under the ask payload
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'off|env CK_WORKFLOW_ROUTE_MODE');
                assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                assertNotContains(first.out, CATALOG_HEADING, 'off must not deliver the catalog');
                assertNotContains(first.out, '<!-- CK:WORKFLOW-GATE -->', 'off must not deliver the gate');
                assertNotContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE -->', 'off must not deliver the route block');
                assertTrue(first.out.length < 1500, `off state is ${first.out.length} chars`);
                // And it tells the assistant: no self-start, explicit requests still run, every quality gate binds
                assertContains(first.out, 'Do not choose or start a workflow yourself');
                assertContains(first.out, 'only when the user explicitly asks for one');
                assertContains(first.out, '`/start-workflow <id>`');
                assertContains(first.out, 'Every quality gate');
                // And it never lets a workflow start by itself, yet does not skip a step that only offers one to the user
                assertContains(first.out, 'not through `start-workflow`, a `workflow-*` skill, or a skill step that would start a workflow');
                assertContains(first.out, 'A step that only offers a workflow to the user as an option stays as written');
                assertContains(first.out, 'or the one skill the user names');
                assertNotContains(first.out, 'no skill you chose for routing');
                // And the catalog hook adds nothing to it
                const catalog = p.runCatalog(session, '/workflow-bugfix fix the login crash', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                assertEqual(catalog.code, 0, catalog.err);
                assertEqual(catalog.out, '', 'off must not deliver the catalog output');
                // And it is delivered once per session
                assertEqual(p.run(session, 'next', { CK_WORKFLOW_ROUTE_MODE: 'off' }).out, '', 'off state delivered once per session');
            })
        },
        {
            // Intent: every hook output fits the host's 10,000-character hook-output cap with margin.
            name: '[workflow-route-modes] TC-WFR-014 every mode stays under the host output cap',
            fn: () => withProject(p => {
                for (const mode of ['ask', 'auto', 'off']) {
                    const session = newSession();
                    const out = p.run(session, 'hello', { CK_WORKFLOW_ROUTE_MODE: mode }).out;
                    assertTrue(out.length > 0 && out.length <= PAYLOAD_CAP, `mode ${mode}: route output is ${out.length} chars, cap ${PAYLOAD_CAP}`);
                    const catalog = p.runCatalog(session, 'hello', { CK_WORKFLOW_ROUTE_MODE: mode }).out;
                    if (mode === 'off') assertEqual(catalog, '', 'mode off: no catalog output');
                    else assertTrue(catalog.length > 0 && catalog.length <= PAYLOAD_CAP, `mode ${mode}: catalog output is ${catalog.length} chars, cap ${PAYLOAD_CAP}`);
                }
            })
        },
        {
            // Intent: the hook must fire on the Codex host through its own launcher, honouring the same env.
            name: '[workflow-route-modes] TC-WFR-018 the real Codex launcher command runs the same hook and honours the mode',
            skip: CODEX_HOOKS_SKIP,
            fn: () => withProject(p => {
                for (const [mode, expected] of [['auto', AUTO_START], ['ask', ASK_QUESTION]]) {
                    const result = runCodexLauncher('workflow-route-inject.cjs',
                        JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt: 'hello' }),
                        { cwd: p.root, env: { ...SWITCHES, CLAUDE_PROJECT_DIR: p.root, HOME: p.home, USERPROFILE: p.home, CK_WORKFLOW_ROUTE_MODE: mode } });
                    assertEqual(result.code, 0, result.stderr);
                    assertContains(result.stdout, `Route mode: ${mode} (env CK_WORKFLOW_ROUTE_MODE)`);
                    assertContains(result.stdout, expected);
                }
                const off = runCodexLauncher('workflow-route-inject.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt: 'hello' }),
                    { cwd: p.root, env: { ...SWITCHES, CLAUDE_PROJECT_DIR: p.root, HOME: p.home, USERPROFILE: p.home, CK_WORKFLOW_ROUTE_MODE: 'off' } });
                assertContains(off.stdout, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                // And the catalog hook, through the same launcher, writes nothing while routing is off
                const offCatalog = runCodexLauncher('workflow-catalog-inject.cjs',
                    JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt: 'hello' }),
                    { cwd: p.root, env: { ...SWITCHES, CLAUDE_PROJECT_DIR: p.root, HOME: p.home, USERPROFILE: p.home, CK_WORKFLOW_ROUTE_MODE: 'off' } });
                assertEqual(offCatalog.code, 0, offCatalog.stderr);
                assertEqual(offCatalog.stdout, '', 'off writes no catalog through the launcher either');
            })
        },
        {
            // Intent: Claude, Codex and the OpenCode bridge each run the route's two hooks (the gate and the
            // catalog); losing a registration silently drops that output (and every personal mode) on that host.
            name: '[workflow-route-modes] TC-WFR-018 the route hook is registered for UserPromptSubmit on Claude, Codex and OpenCode',
            skip: FRAMEWORK_REPO_SKIP,
            fn: () => {
                const settings = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'settings.json'), 'utf8'));
                const commands = (settings.hooks.UserPromptSubmit || []).flatMap(group => (group.hooks || []).map(h => h.command || ''));
                const codexFile = path.join(PROJECT_DIR, '.codex', 'hooks.json');
                const codexCommands = fs.existsSync(codexFile)
                    ? (JSON.parse(fs.readFileSync(codexFile, 'utf8')).hooks.UserPromptSubmit || []).flatMap(group => (group.hooks || []).map(h => h.command || ''))
                    : null;
                const bridge = path.join(PROJECT_DIR, '.opencode', 'plugins', 'easy-claude-hooks.js');
                const bridgeText = fs.existsSync(bridge) ? fs.readFileSync(bridge, 'utf8') : null;
                for (const hookFile of [ROUTE_HOOK, CATALOG_HOOK]) {
                    assertTrue(fs.existsSync(path.join(CLAUDE_DIR, 'hooks', hookFile)), `${hookFile} must exist`);
                    assertTrue(commands.some(c => c.includes(`.claude/hooks/${hookFile}`)), `settings.json must register ${hookFile} for UserPromptSubmit`);
                    assertTrue((settings.hooks.SessionStart || []).some(group => group.matcher === 'compact' && group.hooks.some(h => (h.command || '').includes(`.claude/hooks/${hookFile}`))),
                        `settings.json must register ${hookFile} for the SessionStart compaction report`);
                    if (codexCommands) {
                        assertTrue(codexCommands.some(c => c.includes(`.claude/hooks/${hookFile}`)), `.codex/hooks.json must register ${hookFile}`);
                    }
                    if (bridgeText !== null) {
                        assertContains(bridgeText, hookFile, `the OpenCode bridge must carry ${hookFile}`);
                    }
                }
            }
        },
        {
            // Intent: each source beats the ones below it, and the state line names the winner.
            name: '[workflow-route-modes] TC-WFR-015 precedence: project config < user file < checkout file < env < prompt directive',
            fn: () => withProject(p => {
                const at = (prompt, env) => modeOf(p.run(newSession(), prompt, env).out).join('|');
                // Given only the team project config
                p.write(p.teamFile, cfg('auto'));
                assertEqual(at('hi'), 'auto|project config');
                // When the person's every-project file disagrees, it wins over the team
                p.write(p.userFile, cfg('off'));
                assertEqual(at('hi'), 'off|~/.claude/.ck.json');
                // When this checkout's git-ignored file disagrees, it wins over the user file
                p.write(p.localFile, cfg('ask'));
                assertEqual(at('hi'), 'ask|.claude/.ck.local.json');
                // When the environment disagrees, it wins over every file
                assertEqual(at('hi', { CK_WORKFLOW_ROUTE_MODE: 'auto' }), 'auto|env CK_WORKFLOW_ROUTE_MODE');
                // When the prompt carries a directive, it wins over the environment
                assertEqual(at('workflow-mode: off', { CK_WORKFLOW_ROUTE_MODE: 'auto' }), 'off|set by your prompt this session');
            })
        },
        {
            // Intent: a person with no setting anywhere keeps `ask`, and the CLI reports source `default`.
            name: '[workflow-route-modes] TC-WFR-015 no project config at all, or a config without the key, falls back to ask (default)',
            fn: () => withProject(p => {
                // Given no docs/project-config.json at all
                assertTrue(!fs.existsSync(p.teamFile));
                assertEqual(modeOf(p.run(newSession(), 'hi').out).join('|'), 'ask|default');
                let shown = p.cli(['--show']);
                assertEqual(shown.code, 0, shown.err);
                assertContains(shown.out, 'Route mode: ask (default)');
                // And a project config that exists but has no workflow-mode setting
                p.write(p.teamFile, { project: { name: 'fixture' }, portability: { inlinePathRules: true } });
                assertEqual(modeOf(p.run(newSession(), 'hi').out).join('|'), 'ask|default');
                shown = p.cli([]);
                assertContains(shown.out, 'Route mode: ask (default)');
                assertEqual(JSON.parse(p.cli(['--json']).out).source, 'default');
            })
        },
        {
            // Intent: no bad value, in any source, can change the mode, throw or block the hook; the next source decides.
            name: '[workflow-route-modes] TC-WFR-015 an invalid or corrupt value in any source is ignored, the next source decides, and the hook never fails',
            fn: () => withProject(p => {
                const at = (env) => {
                    const result = p.run(newSession(), 'hi', env);
                    assertEqual(result.code, 0, `the hook must exit 0: ${result.err}`);
                    return modeOf(result.out).join('|');
                };
                const bad = ['banana', '', 42, true, ['auto']];
                // Env: an unknown value falls through to the layer below (project config auto), then to ask when there is none
                p.write(p.teamFile, cfg('auto'));
                for (const value of ['banana', 'sometimes', '   ', 'auto off']) assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: value }), 'auto|project config', `env ${JSON.stringify(value)}`);
                fs.rmSync(p.teamFile);
                for (const value of ['banana', '   ']) assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: value }), 'ask|default', `env ${JSON.stringify(value)} alone`);
                // Files: every bad value in every personal file falls through to the team value, then to ask
                for (const [label, file] of [['user file', p.userFile], ['checkout file', p.localFile]]) {
                    for (const value of bad) {
                        p.write(file, { portability: { workflowRouteMode: value } });
                        assertEqual(at(), 'ask|default', `${label} value ${JSON.stringify(value)}`);
                    }
                    for (const text of ['{bad json', '', '[]', '"off"']) {
                        p.write(file, text);
                        assertEqual(at(), 'ask|default', `${label} content ${JSON.stringify(text)}`);
                    }
                    fs.rmSync(file);
                }
                // Project config: invalid or malformed content is ignored too
                for (const value of bad) {
                    p.write(p.teamFile, cfg(value));
                    assertEqual(at(), 'ask|default', `project config value ${JSON.stringify(value)}`);
                }
                p.write(p.teamFile, '{nope');
                assertEqual(at(), 'ask|default', 'malformed project config');
                // A corrupt higher layer never hides a valid lower one
                p.write(p.teamFile, cfg('off'));
                p.write(p.userFile, '{bad');
                p.write(p.localFile, cfg('banana'));
                assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: 'banana' }), 'off|project config', 'corrupt personal layers fall through to the project config');
            })
        },
        {
            // Intent: a file saved by a Windows editor (BOM, UTF-16) or an env value typed with quotes in cmd.exe
            // must not be silently ignored — that is how a person's setting "did not work".
            name: '[workflow-route-modes] TC-WFR-015 a file saved with a BOM or as UTF-16, and a quoted env value, still count',
            fn: () => withProject(p => {
                const body = JSON.stringify(cfg('off'));
                const at = (env) => modeOf(p.run(newSession(), 'hi', env).out).join('|');
                p.write(p.localFile, `\uFEFF${body}`);
                assertEqual(at(), 'off|.claude/.ck.local.json', 'UTF-8 with a byte-order mark');
                p.write(p.localFile, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(body, 'utf16le')]));
                assertEqual(at(), 'off|.claude/.ck.local.json', 'UTF-16 little-endian');
                p.write(p.localFile, Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(body, 'utf16le').swap16()]));
                assertEqual(at(), 'off|.claude/.ck.local.json', 'UTF-16 big-endian');
                fs.rmSync(p.localFile);
                assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: '"auto"' }), 'auto|env CK_WORKFLOW_ROUTE_MODE', 'quoted env value');
                assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: ' OFF ' }), 'off|env CK_WORKFLOW_ROUTE_MODE', 'padded upper-case env value');
                for (const alias of ['0', 'false', 'no', 'disabled']) assertEqual(at({ CK_WORKFLOW_ROUTE_MODE: alias }), 'off|env CK_WORKFLOW_ROUTE_MODE', `env alias ${alias}`);
            })
        },
        {
            // Intent: existing boolean settings keep working, and the named mode wins inside one file.
            name: '[workflow-route-modes] TC-WFR-015 the legacy workflowAutoDetect boolean reads as off or ask and workflowRouteMode wins in one file',
            fn: () => withProject(p => {
                const resolve = (extra = {}) => routing.resolveWorkflowRouteMode({ rootDir: p.root, env: {}, homeDir: p.home, ...extra });
                p.write(p.teamFile, { portability: { workflowAutoDetect: false } });
                assertEqual(resolve().mode, 'off');
                p.write(p.teamFile, { portability: { workflowAutoDetect: false, workflowRouteMode: 'auto' } });
                assertEqual(resolve().mode, 'auto', 'workflowRouteMode wins over the legacy boolean in the same file');
                p.write(p.teamFile, { portability: { workflowRouteMode: 'off' } });
                p.write(p.localFile, { portability: { workflowAutoDetect: true } });
                assertEqual(resolve().mode, 'ask', 'a personal true re-enables routing over a team off');
                assertEqual(routing.readWorkflowRouteMode({}), 'ask');
                assertEqual(routing.readWorkflowRouteMode({ portability: { workflowRouteMode: 'AUTO' } }), 'auto', 'mode names are case-insensitive');
            })
        },
        {
            // Intent: tracked generators read the team layer only, so a personal setting never reaches shared files.
            name: '[workflow-route-modes] TC-WFR-017 the team scope ignores every personal source',
            fn: () => withProject(p => {
                p.write(p.teamFile, cfg('ask'));
                p.write(p.userFile, cfg('off'));
                p.write(p.localFile, cfg('off'));
                const team = routing.resolveWorkflowRouteMode({
                    rootDir: p.root, scope: routing.SCOPE_TEAM, env: { CK_WORKFLOW_ROUTE_MODE: 'off' }, homeDir: p.home, sessionMode: 'off'
                });
                assertEqual(team.mode, 'ask');
                assertEqual(team.source, routing.SOURCE_PROJECT_CONFIG);
                const effective = routing.resolveWorkflowRouteMode({ rootDir: p.root, env: {}, homeDir: p.home });
                assertEqual(effective.mode, 'off');
                assertEqual(effective.overriddenPersonally, true);
                // And both schemas accept exactly the three mode names
                const { CK_SCHEMA, validateCkConfig, WORKFLOW_ROUTE_MODES: ckModes } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'ck-config-schema.cjs'));
                const { validateConfig, WORKFLOW_ROUTE_MODES: projectModes } = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'project-config-schema.cjs'));
                assertEqual(JSON.stringify(ckModes), JSON.stringify(routing.ROUTE_MODES));
                assertEqual(JSON.stringify(projectModes), JSON.stringify(routing.ROUTE_MODES));
                assertTrue(CK_SCHEMA.portability.properties.workflowRouteMode.type === 'string');
                assertTrue(validateCkConfig({ portability: { workflowRouteMode: 'banana' } }).errors.some(e => e.includes('workflowRouteMode')), 'the .ck.json validator names the bad key');
                assertTrue(!validateConfig({ project: { name: 'x' }, portability: { workflowRouteMode: 'auto' } }).errors.some(e => e.includes('workflowRouteMode')));
                assertTrue(validateConfig({ project: { name: 'x' }, portability: { workflowRouteMode: 'banana' } }).errors.some(e => e.includes('workflowRouteMode')), 'the project-config validator names the bad key');
            })
        },
        {
            // Intent: the personal file is outside the repository, and the checkout file is git-ignored, so a setting
            // cannot be committed by accident.
            name: '[workflow-route-modes] TC-WFR-017 the user file lives under the home directory, outside any checkout',
            fn: () => withProject(p => {
                const userPath = routing.resolveUserConfigPath(p.home);
                assertEqual(userPath, path.join(p.home, '.claude', '.ck.json'));
                const relative = path.relative(p.root, userPath);
                assertTrue(relative.startsWith('..') && !path.isAbsolute(relative), 'the user file is not inside the project');
                assertEqual(routing.resolveUserConfigPath(''), null, 'no home directory, no user file');
                assertTrue(typeof routing.resolveUserConfigPath() === 'string', 'the default home is os.homedir()');
            })
        },
        {
            // Intent: a directive in the prompt applies at once, lasts the session, and a new session returns to the configured mode.
            name: '[workflow-route-modes] TC-WFR-016 a first-line directive applies to this prompt and the rest of the session only',
            fn: () => withProject(p => {
                p.write(p.userFile, cfg('ask'));
                const session = newSession();
                // When the first line is a directive, the new mode applies immediately, and the reply line is added
                const first = p.run(session, 'workflow-mode: off\nfix the login bug');
                assertEqual(first.code, 0, first.err);
                assertEqual(modeOf(first.out).join('|'), 'off|set by your prompt this session');
                assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                assertContains(first.out, 'Route mode directive applied: off for this session');
                assertContains(first.out, 'not a task');
                assertNotContains(first.out, CATALOG_HEADING);
                // Then the next prompt needs no directive: the session keeps the mode, and nothing is repeated
                assertEqual(p.run(session, 'and the signup bug too').out, '', 'the session keeps off without a second delivery');
                // And a switch mid-session re-delivers the new route even though a route was delivered already
                const auto = p.run(session, '/workflow-mode auto');
                assertEqual(modeOf(auto.out).join('|'), 'auto|set by your prompt this session');
                assertContains(auto.out, AUTO_START);
                assertContains(auto.out, "the first task after your directive counts as the session's first task");
                assertEqual(p.run(session, 'next task').out, '', 'and the session keeps auto');
                // And the Codex spelling works
                assertEqual(modeOf(p.run(newSession(), '$workflow-mode ask').out).join('|'), 'ask|set by your prompt this session');
                // And a NEW session falls back to the configured mode; nothing was written
                assertEqual(modeOf(p.run(newSession(), 'hello').out).join('|'), 'ask|~/.claude/.ck.json');
                assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'ask', 'a session directive writes no file');
            })
        },
        {
            // Intent (BR-WFR-11): a failed session save never promises later-prompt scope; explicit personal
            // saving remains independent and later prompts resolve their actual recorded/configured preferences.
            name: '[workflow-route-modes] TC-WFR-016 failed session persistence is reported and later prompts use recorded or configured preferences',
            fn: async () => {
                for (const save of [false, true]) {
                    await withProject(p => {
                        // Given a configured ask preference and a regular file where the session store's tmp
                        // directory belongs (Windows/macOS/Linux, no permission or timeout assumption).
                        p.write(p.userFile, cfg('ask'));
                        const before = fs.readFileSync(p.userFile, 'utf8');
                        const blocked = path.join(p.root, 'tmp');
                        p.write(blocked, 'not a folder');
                        const session = newSession();
                        // When a directive arrives, with and without an explicit independent personal save.
                        const first = p.run(session, `workflow-mode: off${save ? ' save' : ''}\nfix the login bug`);
                        // Then the current prompt gets off, but its reply never claims the session was saved.
                        assertEqual(first.code, 0, first.err);
                        assertEqual(modeOf(first.out)[0], 'off');
                        assertContains(first.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                        assertContains(first.out, 'Route mode directive applied: off for this prompt; session preference NOT saved');
                        assertContains(first.out, 'Later prompts use the recorded/configured mode');
                        assertNotContains(first.out, 'Route mode directive applied: off for this session');
                        if (save) {
                            assertContains(first.out, `; saved to ${p.userFile}`);
                            assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'off');
                        } else {
                            assertEqual(fs.readFileSync(p.userFile, 'utf8'), before, 'without save, personal preferences stay unchanged');
                        }
                        // And the next ordinary prompt in the SAME session uses actual preferences. A personal
                        // save may decide off; without it the original ask preference still decides.
                        const later = p.run(session, 'and the signup bug too');
                        assertEqual(later.code, 0, later.err);
                        assertEqual(modeOf(later.out).join('|'), `${save ? 'off' : 'ask'}|~/.claude/.ck.json`);
                        assertNotContains(later.out, 'Route mode directive applied:', 'a plain prompt is not a directive');
                        assertEqual(fs.readFileSync(blocked, 'utf8'), 'not a folder', 'the blocking fixture file is untouched');
                    });
                }
            }
        },
        {
            // Intent: repeating the directive for a mode already delivered still gets its reply line.
            name: '[workflow-route-modes] TC-WFR-016 repeating the same directive only acknowledges it',
            fn: () => withProject(p => {
                const session = newSession();
                p.run(session, 'workflow-mode: off');
                const again = p.run(session, 'workflow-mode: off');
                assertEqual(again.code, 0, again.err);
                assertContains(again.out, 'Route mode directive applied: off for this session');
                assertNotContains(again.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->', 'the off state is not delivered twice');
            })
        },
        {
            // Intent: only an explicit first-line directive counts; prose that mentions the words never changes the mode.
            name: '[workflow-route-modes] TC-WFR-016 prose, a later line, a code fence and trailing words are not a directive',
            fn: () => withProject(p => {
                const notDirectives = [
                    'please explain workflow-mode: off in the docs',
                    'hello\nworkflow-mode: off',
                    '```\nworkflow-mode: off\n```',
                    'workflow-mode: off please',
                    'workflow-mode: banana',
                    'workflow-mode:',
                    '/workflow-mode',
                    '/workflow-mode --show',
                    'the /workflow-mode auto command',
                    '> workflow-mode: off',
                    'workflow-mode off'
                ];
                for (const prompt of notDirectives) {
                    assertEqual(routing.parseRouteModeDirective(prompt), null, `parse ${JSON.stringify(prompt)}`);
                }
                for (const prompt of notDirectives.slice(0, 4)) {
                    assertEqual(modeOf(p.run(newSession(), prompt).out).join('|'), 'ask|default', `hook ${JSON.stringify(prompt)}`);
                }
                const directives = [
                    ['workflow-mode: auto', 'auto', false], ['Workflow-Mode:OFF', 'off', false], ['/workflow-mode ask', 'ask', false],
                    ['$workflow-mode auto', 'auto', false], ['  \n workflow-mode: off \nmore', 'off', false],
                    ['workflow-mode: auto save', 'auto', true], ['/workflow-mode off --save', 'off', true]
                ];
                for (const [prompt, mode, save] of directives) {
                    const parsed = routing.parseRouteModeDirective(prompt);
                    assertTrue(Boolean(parsed) && parsed.mode === mode && parsed.save === save, `parse ${JSON.stringify(prompt)} -> ${JSON.stringify(parsed)}`);
                }
            })
        },
        {
            // Intent: `save` persists for the person (user file, outside any repo), keeping their other keys, and never
            // overwrites a file it cannot read.
            name: '[workflow-route-modes] TC-WFR-016 a directive with save writes the user file, keeps its other keys and refuses a corrupt file',
            fn: () => withProject(p => {
                p.write(p.userFile, { locale: { responseLanguage: 'fr' }, portability: { docsIndexPath: 'keep/me.md' } });
                const first = p.run(newSession(), 'workflow-mode: auto save');
                assertEqual(first.code, 0, first.err);
                assertContains(first.out, `; saved to ${p.userFile}`);
                const saved = JSON.parse(fs.readFileSync(p.userFile, 'utf8'));
                assertEqual(saved.portability.workflowRouteMode, 'auto');
                assertEqual(saved.portability.docsIndexPath, 'keep/me.md', 'other keys survive');
                assertEqual(saved.locale.responseLanguage, 'fr', 'other sections survive');
                // And a new session reads it from the user file
                assertEqual(modeOf(p.run(newSession(), 'hello').out).join('|'), 'auto|~/.claude/.ck.json');
                // And a corrupt user file is reported, never overwritten
                p.write(p.userFile, '{corrupt');
                const refused = p.run(newSession(), 'workflow-mode: off save');
                assertContains(refused.out, 'NOT saved (unreadable-config)');
                assertEqual(fs.readFileSync(p.userFile, 'utf8'), '{corrupt', 'a corrupt file is left untouched');
                assertEqual(modeOf(refused.out).join('|'), 'off|set by your prompt this session', 'the session still gets the mode');
                // And valid JSON that is not an object (a list, a string) is refused the same way
                for (const text of ['[]', '"off"', '42']) {
                    p.write(p.userFile, text);
                    const notObject = p.run(newSession(), 'workflow-mode: auto save');
                    assertContains(notObject.out, 'NOT saved (unreadable-config)', `file content ${text}`);
                    assertEqual(fs.readFileSync(p.userFile, 'utf8'), text, `file content ${text} is left untouched`);
                }
            })
        },
        {
            // Intent: the skill's CLI shows the winning source, persists to the user file, and refuses a checkout file that
            // git does not ignore (it could be committed).
            name: '[workflow-route-modes] TC-WFR-017 the workflow-mode CLI shows the source, saves to the user file and refuses an un-ignored checkout file',
            fn: () => withProject(p => {
                // Given a user file that sets auto
                let out = p.cli(['auto', '--save']);
                assertEqual(out.code, 0, out.err);
                assertContains(out.out, 'Route mode: auto (~/.claude/.ck.json)');
                assertContains(out.out, `Saved: ${p.userFile}`);
                assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'auto');
                // When the environment overrides it, the CLI says which source still wins
                out = p.cli(['off', '--save'], { CK_WORKFLOW_ROUTE_MODE: 'ask' });
                assertContains(out.out, 'Route mode: ask (env CK_WORKFLOW_ROUTE_MODE)');
                assertContains(out.out, 'a higher-precedence source');
                // And a mode without --save writes nothing and says how to set a session mode
                fs.rmSync(p.userFile);
                out = p.cli(['auto']);
                assertEqual(out.code, 0, out.err);
                assertContains(out.out, 'Nothing written');
                assertTrue(!fs.existsSync(p.userFile));
                // And --local is refused here: the fixture is not a git checkout that ignores the file
                out = p.cli(['auto', '--save', '--local']);
                assertEqual(out.code, 1);
                assertContains(out.err, 'not git-ignored');
                assertTrue(!fs.existsSync(p.localFile), 'nothing was written to the checkout file');
                // And an unknown argument is a usage error
                assertEqual(p.cli(['sometimes']).code, 1);
            })
        },
        {
            // Intent: `--show` reports the mode in force — the session's prompt directive included — and names the winning
            // source. The directive lives in the hook's session record, so the CLI must read that record for the same session.
            name: '[workflow-route-modes] TC-WFR-017 the workflow-mode CLI reports a session prompt directive from the hook session record',
            fn: () => withProject(p => {
                p.write(p.userFile, cfg('auto'));
                const session = newSession();
                // Given no directive yet: the real winner (the user file) is reported for that session
                assertEqual(p.run(session, 'hello').code, 0);
                let shown = p.cli(['--show'], { CK_SESSION_ID: session });
                assertEqual(shown.code, 0, shown.err);
                assertContains(shown.out, 'Route mode: auto (~/.claude/.ck.json)');
                assertNotContains(shown.out, 'No session id');
                // When the session's prompt carries `workflow-mode: off` (the hook records it)
                assertContains(p.run(session, 'workflow-mode: off').out, 'Route mode directive applied: off');
                // Then the CLI for the same session reports off, decided by the prompt directive
                shown = p.cli(['--show'], { CK_SESSION_ID: session });
                assertContains(shown.out, 'Route mode: off (set by your prompt this session)');
                assertContains(shown.out, 'session prompt directive: off');
                const json = JSON.parse(p.cli(['--json'], { CK_SESSION_ID: session }).out);
                assertEqual(`${json.mode}|${json.source}`, 'off|session');
                // And the id can be passed as an argument instead of the environment
                assertContains(p.cli([`--session=${session}`]).out, 'Route mode: off (set by your prompt this session)');
                // And a saved mode says a higher-precedence source still wins
                assertContains(p.cli(['auto', '--save'], { CK_SESSION_ID: session }).out, 'the effective mode stays off');
                // And another session has no directive: the CLI reports its real winner
                assertContains(p.cli(['--show'], { CK_SESSION_ID: newSession() }).out, 'Route mode: auto (~/.claude/.ck.json)');
                // And with no session id the CLI cannot see a directive and says so instead of guessing
                shown = p.cli(['--show']);
                assertContains(shown.out, 'Route mode: auto (~/.claude/.ck.json)');
                assertContains(shown.out, 'a prompt directive given this session is not visible');
                assertEqual(JSON.parse(p.cli(['--json']).out).sessionNote !== null, true);
            })
        },
        {
            name: '[workflow-route-modes] TC-WFR-017 the workflow-mode CLI writes the checkout file only when git ignores it',
            skip: GIT_AVAILABLE ? false : 'git is not available',
            fn: () => withProject(p => {
                const git = args => spawnSync('git', args, { cwd: p.root, encoding: 'utf8', windowsHide: true });
                assertEqual(git(['init', '-q']).status, 0);
                p.write(path.join(p.root, '.claude', '.gitignore'), '*.local.json\n');
                const out = p.cli(['off', '--save', '--local']);
                assertEqual(out.code, 0, out.err);
                assertContains(out.out, 'Route mode: off (.claude/.ck.local.json)');
                assertEqual(JSON.parse(fs.readFileSync(p.localFile, 'utf8')).portability.workflowRouteMode, 'off');
                const ignored = git(['check-ignore', '-q', '--', '.claude/.ck.local.json']);
                assertEqual(ignored.status, 0, 'the written checkout file is git-ignored');
            })
        },
        {
            // TC-WFR-023 / BR-WFR-15: deliver the right discovery depth without redundant interviews
            // or build authority. This checks the hook's owned guidance, not a model's route selection.
            name: '[workflow-route-modes] TC-WFR-023 decision discovery routes by uncertainty and preserves artifact owners and authority',
            fn: () => withProject(p => {
                const assertDiscovery = (out, where) => {
                    assertContains(out, '| Loose idea, plan or design with unresolved material choices that fit one conversation, no owning artifact | `grill`: interview, save the Decision Record, then stop |', where);
                    assertContains(out, '| Loose idea or existing decision map with an unclear route and dependent unresolved decisions spanning sessions | `wayfinder`: chart or resume a decision map, then stop; size alone is insufficient |', where);
                    assertContains(out, '| Saved implementation plan or authored spec/test cases needing decisions validated | existing owner: `plan --mode=validate` or `spec [mode=clarify]` |', where);
                    for (const rule of [
                        'select by unresolved decisions, not size',
                        'Clear work keeps its ordinary route',
                        'When a selected workflow already owns an interview, use that step instead of adding `grill`',
                        'Honor explicit requests and configured automatic-selection restrictions',
                        'reuse confirmed choices only while scope and premises still hold; cite them',
                        'put open, changed, conflicting or unconfirmed choices to the human',
                        'All hosting gates remain binding',
                        'Discovery stops at its handoff and grants no build authority',
                        'Honor an explicit skill/workflow request first'
                    ]) assertContains(out, rule, where);
                    assertNotContains(out, 'CK:GATE-MODE', where);
                    assertTrue(out.length <= PAYLOAD_CAP, `${where}: ${out.length} chars`);
                };
                // Given the shipped gate and fresh isolated sessions in each enabled mode
                for (const mode of ['ask', 'auto']) {
                    const env = { CK_WORKFLOW_ROUTE_MODE: mode };
                    // When the real hook runs, the delivered table and exclusions must agree.
                    const direct = p.run(newSession(), 'help resolve the open decisions', env);
                    assertEqual(direct.code, 0, direct.err);
                    assertDiscovery(direct.out, `native / ${mode}`);
                    // A project with the Codex projection must receive the same guidance through its real launcher.
                    // The launcher resolves the child environment itself, so it takes the RAW override map: a
                    // resolved environment would let every switch the fixture deletes come back from this process.
                    if (CODEX_HOOKS_SKIP === false) {
                        const codex = runCodexLauncher(ROUTE_HOOK,
                            JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt: 'help resolve the open decisions' }),
                            { cwd: p.root, env: p.overrides(env) });
                        assertEqual(codex.code, 0, codex.stderr);
                        assertDiscovery(codex.stdout, `Codex / ${mode}`);
                    }
                    // Disabling automatic skill selection retains its human-choice policy, never the discovery gate.
                    const restricted = p.run(newSession(), 'help resolve the open decisions', { ...env, CK_SKILL_AUTO_TRIGGER: 'off' });
                    assertEqual(restricted.code, 0, restricted.err);
                    assertContains(restricted.out, 'Framework skill auto-trigger is disabled');
                    assertContains(restricted.out, 'Named user requests and required hook/protocol calls remain eligible');
                    assertNotContains(restricted.out, '**Decision discovery:**');
                    assertNotContains(restricted.out, '<!-- CK:WORKFLOW-GATE -->');
                }
                // An unavailable catalog cannot drop the gate's decision rules: the catalog output reports it,
                // and the route output still carries the full gate.
                p.write(p.registryFile, '{ invalid json');
                for (const mode of ['ask', 'auto']) {
                    const session = newSession();
                    const fallback = p.run(session, 'help resolve the open decisions', { CK_WORKFLOW_ROUTE_MODE: mode });
                    assertEqual(fallback.code, 0, fallback.err);
                    assertDiscovery(fallback.out, `catalog unavailable / ${mode}`);
                    const catalog = p.runCatalog(session, 'help resolve the open decisions', { CK_WORKFLOW_ROUTE_MODE: mode });
                    assertEqual(catalog.code, 0, catalog.err);
                    assertContains(catalog.out, 'workflow catalog unavailable: ');
                }
                // Off still carries only its existing notice and explicit-request authority.
                const off = p.run(newSession(), 'help resolve the open decisions', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                assertEqual(off.code, 0, off.err);
                assertContains(off.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                assertContains(off.out, 'or the one skill the user names');
                assertNotContains(off.out, '**Decision discovery:**');
                assertNotContains(off.out, '<!-- CK:WORKFLOW-GATE -->');
            })
        },
        {
            // Intent: the route hook keeps the gate text in ONE place: the gate file. A mode variant lost from it, or a
            // fence that leaks into the payload, changes what the assistant is told.
            name: '[workflow-route-modes] TC-WFR-014 the shipped gate renders a distinct, fence-free text for ask and for auto',
            fn: () => {
                const hook = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'workflow-route-delivery.cjs'));
                const gate = fs.readFileSync(path.join(CLAUDE_DIR, 'skills', 'shared', 'workflow-first-gate.md'), 'utf8');
                const ask = hook.renderGateForMode(gate, 'ask');
                const auto = hook.renderGateForMode(gate, 'auto');
                assertTrue(ask !== auto, 'the two modes must differ');
                for (const text of [ask, auto]) {
                    assertContains(text, '<!-- CK:WORKFLOW-GATE -->');
                    assertNotContains(text, 'CK:GATE-MODE');
                    assertNotContains(text, 'CK:WORKFLOW-ROUTE-POINTER', 'the root pointer is not part of the delivered gate');
                    assertContains(text, '| Signals | Route |', 'the routing table is shared by both modes');
                    assertContains(text, 'Catalog fit');
                }
                // ask: the question fires only for a started catalog workflow; direct, single-skill and custom-simple proceed unasked
                assertContains(ask, 'NEVER starts before the answer');
                assertContains(ask, 'only when YOUR route is to start a catalog workflow');
                assertContains(ask, 'a direct, single-skill or custom-simple route (a Catalog-fit downgrade included) proceeds without asking');
                assertContains(ask, '(never for direct or custom-simple)');
                assertNotContains(ask, 'a route that matches a catalog workflow', 'a matched-but-downgraded route must not be told to ask');
                assertTrue(!/(?:direct|custom-simple)[^.;|]{0,80}\b(?:must|MUST|always) ask\b/.test(ask), 'a direct or custom-simple route must never be told to ask');
                assertContains(auto, 'NEVER starts before the answer', 'mode auto asks the same question (P46)');
                assertContains(auto, '**Route mode `auto`:**');
                assertNotContains(ask, '**Route mode `auto`:**');
            }
        },
        {
            // Intent: the route hooks are the only carrier of the route and of the off notice, so a project whose
            // record store cannot be created (a read-only checkout, a file where `tmp/` belongs) still receives the
            // mode's text and its catalog: a duplicate per prompt is accepted over a route the model never sees.
            name: '[workflow-route-modes] TC-WFR-014 an unusable record store still delivers the route and the off notice on every prompt',
            fn: () => withProject(p => {
                // Given a regular file where the project's tmp folder should be (portable on every OS)
                p.write(path.join(p.root, 'tmp'), 'not a folder');
                for (const [mode, marker] of [['ask', ASK_QUESTION], ['auto', AUTO_START], ['off', '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->']]) {
                    const session = newSession();
                    // When two prompts of one session arrive in that mode
                    const first = p.run(session, 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode });
                    const second = p.run(session, 'and one more thing', { CK_WORKFLOW_ROUTE_MODE: mode });
                    // Then each prompt carries the mode's text and the hook exits cleanly
                    for (const [label, result] of [['first', first], ['second', second]]) {
                        assertEqual(result.code, 0, `${mode} ${label}: ${result.err}`);
                        assertContains(result.out, marker, `${mode} ${label} prompt must carry its route text`);
                    }
                    // And the catalog output is delivered with it on each prompt (none in mode off)
                    for (const label of ['first', 'second']) {
                        const catalog = p.runCatalog(session, `${label} prompt`, { CK_WORKFLOW_ROUTE_MODE: mode });
                        assertEqual(catalog.code, 0, `${mode} ${label} catalog: ${catalog.err}`);
                        if (mode === 'off') assertEqual(catalog.out, '', `${mode} ${label}: no catalog output`);
                        else assertContains(catalog.out, CATALOG_HEADING, `${mode} ${label} prompt must carry the catalog`);
                    }
                }
                assertTrue(fs.statSync(path.join(p.root, 'tmp')).isFile(), 'the blocking file is untouched');
            })
        },
        {
            // Intent: the route hooks are the only carrier of the route, so a catalog that cannot be built (a registry
            // with merge-conflict markers, a missing file, a workflow without its injectContext) must not silence it:
            // the mode's gate still arrives in full in the route output, and the catalog output is one line saying
            // the catalog is unavailable. `off` reads no file and is unchanged.
            name: '[workflow-route-modes] TC-WFR-020 an unreadable workflow registry still delivers the mode gate and one catalog-unavailable line',
            fn: () => withProject(p => {
                const registry = p.registryFile;
                const good = fs.readFileSync(registry, 'utf8');
                const withoutInject = JSON.stringify((() => {
                    const doc = JSON.parse(good);
                    delete doc.workflows[Object.keys(doc.workflows)[0]].preActions.injectContext;
                    return doc;
                })());
                const breakers = [
                    ['conflict markers', () => p.write(registry, '<<<<<<< HEAD\n{"workflows":{}}\n=======\n>>>>>>> branch\n')],
                    ['missing file', () => fs.rmSync(registry)],
                    ['a workflow without injectContext', () => p.write(registry, withoutInject)],
                    ['empty file', () => p.write(registry, '')]
                ];
                const modes = [['ask', ASK_TIER, AUTO_START], ['auto', AUTO_START, ASK_TIER]];
                // The route output a healthy registry gives each mode: the full gate
                const healthy = Object.fromEntries(modes.map(([mode]) => [mode, p.run(newSession(), 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode }).out]));
                for (const [label, breakIt] of breakers) {
                    p.write(registry, good);
                    breakIt();
                    for (const [mode, marker, absent] of modes) {
                        // Given a registry the catalog cannot be built from, in mode ask or auto
                        const session = newSession();
                        const env = { CK_WORKFLOW_ROUTE_MODE: mode };
                        const out = p.run(session, 'fix the flaky login test', env);
                        const catalog = p.runCatalog(session, 'fix the flaky login test', env);
                        const where = `${label} / ${mode}`;
                        // Then the route hook exits cleanly and still delivers the state line and the mode's own gate text
                        assertEqual(out.code, 0, `${where}: ${out.err}`);
                        assertEqual(modeOf(out.out)[0], mode, `${where}: state line`);
                        assertContains(out.out, ROUTE_START, where);
                        assertContains(out.out, marker, `${where}: the mode's gate text must arrive`);
                        assertNotContains(out.out, absent, `${where}: the other mode's text must not arrive`);
                        assertNotContains(out.out, 'CK:GATE-MODE', `${where}: no fence line may reach the model`);
                        // And it is the same full gate a healthy registry gives: the registry costs the route output nothing
                        assertEqual(out.out, healthy[mode], `${where}: the route output must be the full gate, unchanged`);
                        assertNotContains(out.out, 'workflow catalog unavailable', `${where}: the notice belongs to the catalog output`);
                        assertTrue(out.out.length <= PAYLOAD_CAP, `${where}: route output is ${out.out.length} chars`);
                        // And the catalog hook exits cleanly with its markers around exactly one notice line
                        assertEqual(catalog.code, 0, `${where}: ${catalog.err}`);
                        const lines = catalog.out.trimEnd().split('\n');
                        assertEqual(lines.length, 3, `${where}: the catalog output is its two markers and one line, got ${JSON.stringify(catalog.out)}`);
                        assertEqual(lines[0], CATALOG_START, where);
                        assertEqual(lines[2], CATALOG_END, where);
                        assertTrue(lines[1].startsWith('workflow catalog unavailable: '), `${where}: ${lines[1]}`);
                        assertTrue(lines[1].endsWith('; read .claude/workflows.json'), `${where}: ${lines[1]}`);
                        assertNotContains(catalog.out, CATALOG_HEADING, `${where}: no catalog`);
                        assertEqual(`${out.out}${catalog.out}`.split('\n').filter(line => line.startsWith('workflow catalog unavailable: ')).length, 1, `${where}: exactly one notice line across both outputs`);
                        assertTrue(catalog.out.length <= PAYLOAD_CAP, `${where}: catalog output is ${catalog.out.length} chars`);
                    }
                    // And `off` is unchanged: its notice reads no file, and no catalog output is written
                    const offSession = newSession();
                    const off = p.run(offSession, 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                    assertContains(off.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->', `${label} / off`);
                    assertNotContains(off.out, 'workflow catalog unavailable', `${label} / off`);
                    assertEqual(p.runCatalog(offSession, 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: 'off' }).out, '', `${label} / off: no catalog output`);
                }
                // And once the registry is repaired, the same session receives the real catalog (the notice is content, so the change re-arms delivery)
                const session = newSession();
                const ask = { CK_WORKFLOW_ROUTE_MODE: 'ask' };
                p.write(registry, '{ not json');
                assertContains(p.run(session, 'first', ask).out, ASK_QUESTION);
                assertContains(p.runCatalog(session, 'first', ask).out, 'workflow catalog unavailable: ');
                p.write(registry, good);
                assertContains(p.runCatalog(session, 'second', ask).out, CATALOG_HEADING);
                // While the route output, which the registry never changed, is not delivered again
                assertEqual(p.run(session, 'second', ask).out, '', 'the repaired registry re-arms the catalog output only');
            })
        },
        {
            // Intent: when even the gate file cannot be read the hook names it in one line instead of printing
            // nothing, so the model and the person see that the route is gone; `off` needs no file and is unchanged.
            name: '[workflow-route-modes] TC-WFR-021 an unreadable gate file is reported in one line naming it, and the off notice is unchanged',
            fn: () => withProject(p => {
                const gate = p.gateFile;
                const good = fs.readFileSync(gate, 'utf8');
                const breakers = [
                    ['missing gate file', () => fs.rmSync(gate)],
                    ['unreadable gate path (a folder)', () => { fs.rmSync(gate); fs.mkdirSync(gate); }],
                    ['empty gate file', () => p.write(gate, '')],
                    ['whitespace gate file', () => p.write(gate, ' \r\n\t')],
                    ['empty marked gate', () => p.write(gate, '# unrelated reference\n<!-- CK:WORKFLOW-GATE -->\n \n<!-- /CK:WORKFLOW-GATE -->')],
                    ['mode-filtered empty gate', () => p.write(gate, '<!-- CK:WORKFLOW-GATE -->\n<!-- CK:GATE-MODE off -->\nonly off\n<!-- /CK:GATE-MODE -->\n<!-- /CK:WORKFLOW-GATE -->')]
                ];
                for (const [label, breakIt] of breakers) {
                    fs.rmSync(gate, { recursive: true, force: true });
                    fs.copyFileSync(path.join(CLAUDE_DIR, 'skills', 'shared', 'workflow-first-gate.md'), gate);
                    breakIt();
                    for (const mode of ['ask', 'auto']) {
                        // Given a gate file the hook cannot read, in mode ask or auto (with a good registry)
                        const session = newSession();
                        const out = p.run(session, 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode });
                        const where = `${label} / ${mode}`;
                        // Then the hook exits cleanly and delivers the state line and one line naming the gate file
                        assertEqual(out.code, 0, `${where}: ${out.err}`);
                        assertEqual(modeOf(out.out)[0], mode, `${where}: state line`);
                        assertContains(out.out, 'workflow route unavailable: .claude/skills/shared/workflow-first-gate.md could not be read', where);
                        assertContains(out.out, 'read it and .claude/workflows.json', where);
                        assertNotContains(out.out, CATALOG_HEADING, `${where}: no catalog`);
                        // And the catalog hook, which reads no gate, still delivers its catalog and never repeats the notice
                        const catalog = p.runCatalog(session, 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: mode });
                        assertEqual(catalog.code, 0, `${where}: ${catalog.err}`);
                        assertContains(catalog.out, CATALOG_HEADING, `${where}: the catalog output does not depend on the gate file`);
                        assertEqual(`${out.out}${catalog.out}`.split('\n').filter(line => line.startsWith('workflow route unavailable: ')).length, 1, `${where}: exactly one notice line`);
                    }
                    const off = p.run(newSession(), 'fix the flaky login test', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                    assertContains(off.out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->', `${label} / off`);
                    assertNotContains(off.out, 'workflow route unavailable', `${label} / off`);
                }
                // Adopters' nonempty unmarked gate text remains supported.
                p.write(gate, 'SYNTHETIC_NONEMPTY_UNMARKED_GATE');
                const unmarkedSession = newSession();
                const unmarked = p.run(unmarkedSession, 'fix the fixture');
                assertContains(unmarked.out, 'SYNTHETIC_NONEMPTY_UNMARKED_GATE');
                assertNotContains(unmarked.out, 'workflow route unavailable: ');
                assertContains(p.runCatalog(unmarkedSession, 'fix the fixture').out, CATALOG_HEADING);
                // Repair changes the route output's content, so this session receives the gate; the catalog
                // output, already delivered and unchanged, is not repeated.
                const session = newSession();
                p.write(gate, '');
                assertContains(p.run(session, 'first').out, 'workflow route unavailable: ');
                assertContains(p.runCatalog(session, 'first').out, CATALOG_HEADING);
                p.write(gate, good);
                const repaired = p.run(session, 'second');
                assertContains(repaired.out, ASK_QUESTION);
                assertNotContains(repaired.out, 'workflow route unavailable: ');
                assertEqual(p.runCatalog(session, 'second').out, '', 'a repaired gate re-arms the route output only');
                // And a mode change then re-delivers both outputs in the new mode
                assertContains(p.run(session, 'third', { CK_WORKFLOW_ROUTE_MODE: 'auto' }).out, AUTO_START);
                const autoCatalog = p.runCatalog(session, 'third', { CK_WORKFLOW_ROUTE_MODE: 'auto' });
                assertContains(autoCatalog.out, CATALOG_HEADING);
                assertContains(autoCatalog.out, AUTO_LEGEND);
            })
        },
        {
            // Intent (BR-WFR-08): the catalog serves the gate. Where no gate is delivered (route mode off, or
            // framework skill auto-trigger disabled) a catalog would invite the routing the person switched
            // off, so the catalog hook writes nothing; with routing on it writes the catalog block and only that.
            name: '[workflow-route-modes] TC-WFR-025 the catalog output is silent when routing is off or framework skill auto-trigger is disabled',
            fn: () => withProject(p => {
                const prompt = 'add a retry to the fetcher';
                const silent = (result, where) => {
                    assertEqual(result.code, 0, `${where}: ${result.err}`);
                    assertEqual(result.out, '', `${where}: the catalog hook must write nothing`);
                };
                // Given route mode off, from the environment and from the person's own file
                // When the catalog hook runs / Then it writes nothing and exits cleanly
                silent(p.runCatalog(newSession(), prompt, { CK_WORKFLOW_ROUTE_MODE: 'off' }), 'mode off (environment)');
                p.write(p.userFile, cfg('off'));
                silent(p.runCatalog(newSession(), prompt), 'mode off (user file)');
                fs.rmSync(p.userFile);
                // Given framework skill auto-trigger disabled, in each mode that would otherwise deliver the catalog
                for (const mode of ['ask', 'auto']) {
                    silent(p.runCatalog(newSession(), prompt, { CK_WORKFLOW_ROUTE_MODE: mode, CK_SKILL_AUTO_TRIGGER: 'off' }), `auto-trigger disabled (environment) / ${mode}`);
                }
                p.write(p.teamFile, { portability: { skillAutoTrigger: false } });
                silent(p.runCatalog(newSession(), prompt), 'auto-trigger disabled (project config)');
                fs.rmSync(p.teamFile);
                // Given routing on, in mode ask and in mode auto
                for (const [mode, legend, otherLegend] of [['ask', ASK_LEGEND, AUTO_LEGEND], ['auto', AUTO_LEGEND, ASK_LEGEND]]) {
                    const session = newSession();
                    // When the catalog hook runs
                    const on = p.runCatalog(session, prompt, { CK_WORKFLOW_ROUTE_MODE: mode });
                    // Then it writes the catalog block for that mode, and only that block
                    assertEqual(on.code, 0, `${mode}: ${on.err}`);
                    assertTrue(on.out.startsWith(`${CATALOG_START}\n`) && on.out.endsWith(`\n${CATALOG_END}\n`), `${mode}: the output must be the catalog block`);
                    assertContains(on.out, CATALOG_HEADING, mode);
                    assertContains(on.out, legend, `${mode}: its own tier legend`);
                    assertNotContains(on.out, otherLegend, `${mode}: never the other mode's tier legend`);
                    assertNotContains(on.out, ROUTE_START, `${mode}: one hook process writes one output`);
                    assertNotContains(on.out, '<!-- CK:WORKFLOW-GATE -->', `${mode}: the gate belongs to the route output`);
                    assertNotContains(on.out, 'Route mode:', `${mode}: the state line belongs to the route output`);
                    assertTrue(on.out.length <= PAYLOAD_CAP, `${mode}: catalog output is ${on.out.length} chars`);
                    // And the route hook, on the same prompt, writes the gate and none of the catalog
                    const route = p.run(session, prompt, { CK_WORKFLOW_ROUTE_MODE: mode });
                    assertContains(route.out, ROUTE_START, mode);
                    assertNotContains(route.out, CATALOG_START, `${mode}: one hook process writes one output`);
                    assertNotContains(route.out, CATALOG_HEADING, `${mode}: the route output carries no catalog`);
                }
                // And silence leaves no delivery record: switched back on in the same session, the catalog arrives
                const session = newSession();
                silent(p.runCatalog(session, prompt, { CK_WORKFLOW_ROUTE_MODE: 'off' }), 'mode off, then on');
                assertContains(p.runCatalog(session, 'next', { CK_WORKFLOW_ROUTE_MODE: 'ask' }).out, CATALOG_HEADING);
            })
        },
        {
            // Intent (BR-WFR-09): each of the route's two outputs is delivered once per conversation and comes
            // back only when ITS OWN content changes. One shared record would re-deliver an output on every
            // prompt (each hook overwriting the other's hash); no record would repeat the catalog every prompt.
            name: '[workflow-route-modes] TC-WFR-025 the catalog output is delivered once on its own record and again after its content changes',
            fn: () => withProject(p => {
                const session = newSession();
                const store = routing.resolveSessionStoreRoot(p.root);
                const record = group => conventionLedger.readRecord(store, session, 'main', group);
                // Given the first prompt of a session
                // When both hooks run
                assertContains(p.run(session, 'fix the flaky login test').out, ASK_QUESTION);
                const first = p.runCatalog(session, 'fix the flaky login test');
                // Then the catalog is delivered, and each output is recorded on a record of its own
                assertContains(first.out, CATALOG_HEADING);
                assertContains(first.out, ASK_LEGEND);
                const routeRecord = record('workflow-route');
                const catalogRecord = record('workflow-catalog');
                assertTrue(Boolean(routeRecord && routeRecord.hash), 'the route delivery must be recorded under workflow-route');
                assertTrue(Boolean(catalogRecord && catalogRecord.hash), 'the catalog delivery must be recorded under workflow-catalog');
                assertTrue(routeRecord.hash !== catalogRecord.hash, 'the two records hold different content');
                // And the second prompt is silent on both
                assertEqual(p.run(session, 'and one more thing').out, '', 'the route output is delivered once');
                assertEqual(p.runCatalog(session, 'and one more thing').out, '', 'the catalog output is delivered once');
                // When the registry gains a workflow (the catalog's content changes, the gate's does not)
                const registry = JSON.parse(fs.readFileSync(p.registryFile, 'utf8'));
                registry.workflows['workflow-fixture-added'] = {
                    name: 'Fixture added', whenToUse: 'run the fixture route',
                    preActions: { injectContext: 'Use the selected workflow context.' },
                    sequence: ['investigate', 'finish']
                };
                p.write(p.registryFile, registry);
                // Then the catalog is delivered again with the new row, and the route output is not
                assertContains(p.runCatalog(session, 'third').out, '| `workflow-fixture-added` |');
                assertEqual(p.run(session, 'third').out, '', 'a registry change re-arms the catalog output only');
                assertEqual(record('workflow-route').hash, routeRecord.hash, 'a catalog delivery leaves the route record untouched');
                assertTrue(record('workflow-catalog').hash !== catalogRecord.hash, 'the catalog record holds the new content');
                // When the gate file gains a rule (the route output's content changes, the catalog's does not)
                const gate = fs.readFileSync(p.gateFile, 'utf8');
                assertContains(gate, '<!-- /CK:WORKFLOW-GATE -->', 'precondition: the shipped gate is a marked block');
                p.write(p.gateFile, gate.replace('<!-- /CK:WORKFLOW-GATE -->', '> FIXTURE-ADDED-GATE-RULE\n\n<!-- /CK:WORKFLOW-GATE -->'));
                // Then the route output is delivered again with the rule, and the catalog is not
                assertContains(p.run(session, 'fourth').out, 'FIXTURE-ADDED-GATE-RULE');
                assertEqual(p.runCatalog(session, 'fourth').out, '', 'a gate change re-arms the route output only');
                // When the person switches the session to mode auto (the catalog's tier legend changes)
                const autoCatalog = p.runCatalog(session, 'workflow-mode: auto');
                const autoRoute = p.run(session, 'workflow-mode: auto');
                // Then the catalog is delivered again with the auto legend, next to the auto gate
                assertContains(autoCatalog.out, AUTO_LEGEND);
                assertNotContains(autoCatalog.out, ASK_LEGEND);
                assertContains(autoRoute.out, AUTO_START);
                // And the session keeps auto: the next plain prompt repeats neither output
                assertEqual(p.runCatalog(session, 'sixth').out, '', 'the catalog hook reads the session mode the route hook recorded');
                assertEqual(p.run(session, 'sixth').out, '', 'the session keeps auto');
                // When the person turns routing off and on again in the same conversation
                assertEqual(p.runCatalog(session, 'workflow-mode: off').out, '', 'off delivers no catalog');
                assertContains(p.run(session, 'workflow-mode: off').out, '<!-- CK:RUNTIME-WORKFLOW-ROUTE-OFF -->');
                const backCatalog = p.runCatalog(session, 'workflow-mode: auto');
                const backRoute = p.run(session, 'workflow-mode: auto');
                // Then the gate returns, and the unchanged catalog, still in the conversation, is not repeated
                assertContains(backRoute.out, AUTO_START);
                assertEqual(backCatalog.out, '', 'an unchanged catalog already delivered in this conversation is not repeated');
            })
        },
        {
            // Intent (BR-WFR-11): the hooks of one prompt run in parallel, so the catalog hook reads a prompt
            // directive itself to print the right mode's catalog, but only the route hook applies it: one
            // session record, one reply line, one personal-file save. A second writer would acknowledge the
            // directive twice or save a mode the person did not see confirmed.
            name: '[workflow-route-modes] TC-WFR-025 a prompt directive sets the catalog\'s mode without a session write or a second acknowledgement',
            fn: () => withProject(p => {
                const sessionMode = session => routing.readSessionRouteMode({ rootDir: p.root, sessionId: session });
                // Given a fresh session whose first prompt opens with the directive for mode off
                const offSession = newSession();
                // When the catalog hook runs
                const off = p.runCatalog(offSession, 'workflow-mode: off\nfix the login bug');
                // Then it writes nothing at all: no catalog, no off notice, no reply line
                assertEqual(off.code, 0, off.err);
                assertEqual(off.out, '', 'a directive for off silences the catalog hook');
                // And it records no session mode: that write belongs to the route hook
                assertEqual(sessionMode(offSession), undefined, 'the catalog hook must not write the session mode');
                // Given a fresh session (configured mode: ask) whose first prompt opens with the directive for mode auto, with save
                const autoSession = newSession();
                const directive = 'workflow-mode: auto save\nadd a retry to the fetcher';
                // When the catalog hook runs, before the route hook has recorded anything
                const catalog = p.runCatalog(autoSession, directive);
                // Then the catalog output carries the auto legend at once, with no reply line
                assertEqual(catalog.code, 0, catalog.err);
                assertContains(catalog.out, CATALOG_START);
                assertContains(catalog.out, AUTO_LEGEND);
                assertNotContains(catalog.out, ASK_LEGEND, 'the directive wins over the configured mode');
                assertNotContains(catalog.out, 'Route mode directive applied', 'the catalog hook never acknowledges a directive');
                // And it neither records the session mode nor saves the personal file
                assertEqual(sessionMode(autoSession), undefined, 'the catalog hook must not write the session mode');
                assertTrue(!fs.existsSync(p.userFile), 'the catalog hook must not save the mode to the user file');
                // When the route hook handles the same prompt
                const route = p.run(autoSession, directive);
                // Then it alone applies the directive: the one reply line, the session record and the save
                assertContains(route.out, 'Route mode directive applied: auto for this session');
                assertEqual(`${route.out}${catalog.out}`.split('Route mode directive applied').length - 1, 1, 'exactly one acknowledgement across both outputs');
                assertEqual(sessionMode(autoSession), 'auto');
                assertEqual(JSON.parse(fs.readFileSync(p.userFile, 'utf8')).portability.workflowRouteMode, 'auto');
                // And repeating the directive gets no output from the catalog hook: the reply line is the route hook's
                const again = p.runCatalog(autoSession, 'workflow-mode: auto');
                assertEqual(again.out, '', 'the catalog is already delivered in this mode');
            })
        },
        {
            // Intent: the route is exactly two outputs, each written by its own entry. An entry that names an
            // output the delivery module does not have (a mistyped or half-added third output) must add nothing
            // to the conversation: before this rule it fell back to the route output, so the gate arrived twice.
            name: '[workflow-route-modes] TC-WFR-025 an entry naming an output the route does not have writes nothing, never a second route block',
            fn: () => withProject(async p => {
                const delivery = require(path.join(CLAUDE_DIR, 'hooks', 'lib', 'workflow-route-delivery.cjs'));
                const prompt = 'fix the flaky login test';
                const store = path.join(p.root, 'tmp', 'workflow-routing');
                for (const part of ['protocol', 'Route', '', null, 1]) {
                    // Given a hook entry in the project's hook tree that names an unknown output
                    const entry = 'workflow-unknown-part-inject.cjs';
                    p.write(path.join(p.root, '.claude', 'hooks', entry),
                        `'use strict';\nrequire('./lib/workflow-route-delivery.cjs').runHook(${JSON.stringify(part)});\n`);
                    const session = newSession();
                    // When the host runs it on a prompt, in a mode that delivers the route
                    const result = p.runEntry(entry, session, prompt, { CK_WORKFLOW_ROUTE_MODE: 'ask' });
                    // Then it writes nothing, says why on stderr, exits cleanly and records no delivery
                    assertEqual(result.code, 0, `${JSON.stringify(part)}: ${result.err}`);
                    assertEqual(result.out, '', `${JSON.stringify(part)}: an unknown output must write nothing`);
                    assertContains(result.err, 'unknown route part', `${JSON.stringify(part)}: the diagnostic names the cause`);
                    for (const group of ['workflow-route', 'workflow-catalog']) {
                        assertTrue(!conventionLedger.readRecord(store, session, 'main', group), `${JSON.stringify(part)}: no ${group} record`);
                    }
                    // And the in-process seam agrees: nothing is written for that output
                    let written = '';
                    const returned = await delivery.run(
                        { hook_event_name: 'UserPromptSubmit', session_id: newSession(), cwd: p.root, prompt },
                        { part, projectDir: p.root, env: {}, homeDir: p.home, write: (text, done) => { written += text; done(true); } }
                    );
                    assertEqual(returned, '', `${JSON.stringify(part)}: run() resolves to nothing`);
                    assertEqual(written, '', `${JSON.stringify(part)}: run() writes nothing`);
                }
                // And the two real outputs are the whole set
                assertEqual(JSON.stringify(delivery.PARTS), JSON.stringify(['route', 'catalog']));
                const session = newSession();
                assertContains(p.run(session, prompt, { CK_WORKFLOW_ROUTE_MODE: 'ask' }).out, ROUTE_START, 'the route entry still delivers');
                assertContains(p.runCatalog(session, prompt, { CK_WORKFLOW_ROUTE_MODE: 'ask' }).out, CATALOG_START, 'the catalog entry still delivers');
            })
        },
        {
            // Intent: an alias to ignored credentials must not leak into context; public aliases still work.
            name: '[workflow-route-modes] TC-WFR-022 private protocol aliases are refused while public aliases remain readable',
            fn: () => withProject(p => {
                const alias = path.join(p.root, 'docs', 'protocol-alias');
                const variants = [
                    ['credentials-store', 'route.md', 'SYNTHETIC_PRIVATE_SENTINEL', false],
                    ['public-store', 'route.md', 'SYNTHETIC_PUBLIC_PROTOCOL', true],
                    ['sample-store', '.env.example', 'SYNTHETIC_SAMPLE_PROTOCOL', true]
                ];
                for (const [folder, name, body, isAllowed] of variants) {
                    const target = path.join(p.root, folder);
                    p.write(path.join(target, name), body);
                    fs.mkdirSync(path.dirname(alias), { recursive: true });
                    fs.symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
                    try {
                        p.write(p.teamFile, { portability: { workflowRouteProtocol: { path: `docs/protocol-alias/${name}` } } });
                        for (const mode of ['ask', 'auto']) {
                            const out = p.run(newSession(), 'fix the fixture', { CK_WORKFLOW_ROUTE_MODE: mode });
                            assertEqual(out.code, 0, out.err);
                            assertContains(out.out, mode === 'ask' ? ASK_QUESTION : AUTO_START);
                            if (isAllowed) assertContains(out.out, body, `${folder} / ${mode}: public protocol remains readable`);
                            else assertNotContains(out.out, body, `${folder} / ${mode}: physical credentials must stay private`);
                        }
                        const off = p.run(newSession(), 'fix the fixture', { CK_WORKFLOW_ROUTE_MODE: 'off' });
                        assertNotContains(off.out, body, `${folder} / off: no protocol is read`);
                        if (!isAllowed) {
                            // A rejected checkout-local source expresses no opinion; the public team layer wins.
                            p.write(p.localFile, { portability: { workflowRouteProtocol: { path: `docs/protocol-alias/${name}` } } });
                            p.write(p.teamFile, { portability: { workflowRouteProtocol: 'SYNTHETIC_TEAM_PROTOCOL' } });
                            const out = p.run(newSession(), 'fix the fixture');
                            assertContains(out.out, 'SYNTHETIC_TEAM_PROTOCOL');
                            assertNotContains(out.out, body);
                            fs.rmSync(p.localFile);
                        }
                    } finally {
                        fs.unlinkSync(alias);
                    }
                }
                // Resolve both sides physically: a checkout reached through a link is still eligible.
                const linkedRoot = path.join(p.root, 'linked-checkout');
                p.write(p.teamFile, { portability: { workflowRouteProtocol: { path: 'public-store/route.md' } } });
                fs.symlinkSync(p.root, linkedRoot, process.platform === 'win32' ? 'junction' : 'dir');
                try {
                    const out = p.run(newSession(), 'fix the fixture', { CLAUDE_PROJECT_DIR: linkedRoot });
                    assertEqual(out.code, 0, out.err);
                    assertContains(out.out, 'SYNTHETIC_PUBLIC_PROTOCOL');
                } finally {
                    fs.unlinkSync(linkedRoot);
                }
            })
        }
    ]
};
