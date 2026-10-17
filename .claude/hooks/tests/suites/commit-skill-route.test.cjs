'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertTrue, assertContains } = require('../lib/assertions.cjs');
const { runCodexLauncher, childEnv, makeHookTreeProject, removeTempDir } = require('../lib/hook-runner.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const HOOK_PATH = path.join(PROJECT_DIR, '.claude', 'hooks', 'commit-skill-route.cjs');
const hook = require(HOOK_PATH);

const event = prompt => ({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt });
// Opt-out checks read an explicit environment so a developer's own CK_* switch never leaks into a test.
const CLEAN_ENV = Object.freeze({});
// In-process evaluation with no switch and no settings: a developer's CK_COMMIT_SKILL_ROUTE=0 or real
// `.claude/.ck(.local).json` opt-out can neither silence a positive nor make a negative pass vacuously.
const ISOLATED = Object.freeze({ env: CLEAN_ENV, rawSettings: Object.freeze({}) });
// Child processes drop the developer's switch (an undefined value deletes the key) and debug output.
const CHILD_ENV_RESET = Object.freeze({ CK_COMMIT_SKILL_ROUTE: undefined, CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined });

/** An isolated project root holding only `.claude/<name>` settings files; removed by the caller. */
function makeSettingsProject(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commit-skill-route-'));
    fs.mkdirSync(path.join(dir, '.claude'));
    for (const [name, value] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, '.claude', name), JSON.stringify(value));
    }
    return dir;
}

// Intent: a request to CREATE a commit must be routed to the commit skill on every host.
const REQUESTS = [
    'commit',
    'commit this',
    'please commit the changes',
    'stage and commit everything',
    'commit and push',
    'ok, make a commit for the hook fix',
    "don't forget to commit",
    "why don't you commit?",
    'Commit it now.',
    // A bare comma closes a negated clause: the request that follows it still routes.
    'without pushing, commit this',
    "don't push yet, commit the fix"
];
// Intent: a prompt that FORBIDS committing must never receive a MUST-run-commit directive (CLAUDE.md git rule 1).
const FORBIDDING = [
    'do not stage or commit',
    "don't push or commit",
    'don’t commit',
    'no need to commit',
    "shouldn't commit",
    'hold off on committing',
    'fix it, but do not stage, push, or commit',
    'never stage/commit',
    // "commit" inside a negated verb list reached through a bare comma: mid-list, or after two listed verbs.
    'Do not stage, commit, or push anything yet',
    "don't stage, commit or push",
    'never commit, stage, or push',
    "please don't add or commit",
    "don't stage, push, commit",
    'do not stage, commit/push'
];
// Intent: host-generated envelopes are not user input, even when they mention commits.
const HOST_ENVELOPES = [
    '<task-notification><result>Commits: review-commit-gate blocked the commit</result></task-notification>',
    '<task-notification>\n<summary>Agent finished: commit this change',
    '<system-reminder>commit this</system-reminder>'
];
// Intent: explicit skill calls, negated requests, references to existing commits and code are NOT requests.
const NON_REQUESTS = [
    '/commit',
    '/commit --push',
    '$commit',
    "don't commit yet",
    'do not commit anything',
    'fix the bug but never commit',
    'finish the work without committing',
    'what changed in commit 7d98b42a?',
    'why does `git commit --amend` fail here?',
    'refactor the settings loader',
    ''
];
// Intent: "commit" as a noun (an existing commit or one of its attributes) or inside an identifier or file
// name is a reference, not a request — the MUST-run-commit directive would be noise.
const REFERENCES = [
    'Please review the last commit message',
    'the commit message format is wrong',
    'what does this commit do?',
    'which commit broke the build?',
    'explain the commit history',
    'the commit gate blocked me, why?',
    'review-commit-gate is broken, fix it',
    'fix commit-skill-route.cjs tests',
    'rename commitHash to sha'
];

module.exports = {
    name: 'commit-skill-route',
    tests: [
        {
            name: '[commit-skill-route] TC-CSR-001 commit requests are routed to the commit skill',
            fn: () => {
                for (const prompt of REQUESTS) {
                    assertTrue(hook.isCommitRequest(prompt), `expected commit request: ${JSON.stringify(prompt)}`);
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-002 skill calls, negations, hash references and code stay silent',
            fn: () => {
                for (const prompt of NON_REQUESTS) {
                    assertTrue(!hook.isCommitRequest(prompt), `expected no route: ${JSON.stringify(prompt)}`);
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-009 noun, identifier and file-name uses of "commit" stay silent',
            fn: () => {
                // Given prompts that name a commit or a commit-named artifact without asking to create one
                for (const prompt of REFERENCES) {
                    // When the router evaluates them / Then none is read as a commit request
                    assertTrue(!hook.isCommitRequest(prompt), `expected no route for a reference: ${JSON.stringify(prompt)}`);
                    assertTrue(hook.evaluate(event(prompt), ISOLATED) === '', `expected silent evaluate: ${JSON.stringify(prompt)}`);
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-010 opt-out: .ck.json commitSkillRoute.enabled:false or CK_COMMIT_SKILL_ROUTE=0 silences the router',
            fn: () => {
                // Given a commit request that routes when nothing is switched off
                const request = event('stage and commit');
                const enabledDir = makeSettingsProject({});
                const disabledDir = makeSettingsProject({ '.ck.json': { commitSkillRoute: { enabled: false } } });
                const localOnDir = makeSettingsProject({
                    '.ck.json': { commitSkillRoute: { enabled: false } },
                    '.ck.local.json': { commitSkillRoute: { enabled: true } }
                });
                try {
                    assertContains(hook.evaluate(request, { env: CLEAN_ENV, projectDir: enabledDir }), hook.MARKER_START);
                    // When the team config switches it off / Then it stays silent
                    assertTrue(hook.evaluate(request, { env: CLEAN_ENV, projectDir: disabledDir }) === '', '.ck.json enabled:false must silence');
                    assertTrue(hook.evaluate(request, { env: CLEAN_ENV, rawSettings: { enabled: 'off' } }) === '', 'a hand-typed "off" must silence');
                    // When a developer-local override re-enables it / Then the local value wins
                    assertContains(hook.evaluate(request, { env: CLEAN_ENV, projectDir: localOnDir }), hook.MARKER_START);
                    // When the env switch is 0 / Then it stays silent even though config enables it
                    assertTrue(hook.evaluate(request, { env: { CK_COMMIT_SKILL_ROUTE: '0' }, projectDir: enabledDir }) === '', 'CK_COMMIT_SKILL_ROUTE=0 must silence');
                    // And at the real process boundary: the hook resolves settings from CLAUDE_PROJECT_DIR
                    const run = (dir, extraEnv = {}) => spawnSync(process.execPath, [HOOK_PATH], {
                        input: JSON.stringify(request),
                        encoding: 'utf8',
                        env: childEnv({ ...CHILD_ENV_RESET, CLAUDE_PROJECT_DIR: dir, ...extraEnv })
                    });
                    const on = run(enabledDir);
                    assertTrue(on.status === 0, `enabled run exits 0, got ${on.status}`);
                    assertContains(on.stdout, hook.MARKER_START);
                    const offByConfig = run(disabledDir);
                    assertTrue(offByConfig.status === 0 && offByConfig.stdout === '', 'config opt-out is silent at the process boundary');
                    const offByEnv = run(enabledDir, { CK_COMMIT_SKILL_ROUTE: '0' });
                    assertTrue(offByEnv.status === 0 && offByEnv.stdout === '', 'env opt-out is silent at the process boundary');
                } finally {
                    for (const dir of [enabledDir, disabledDir, localOnDir]) fs.rmSync(dir, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-011 an internal failure stays silent on stdout and is diagnosed only under CK_DEBUG',
            fn: () => {
                // Given a payload whose prompt getter throws (a stand-in for any internal failure)
                const driver = [
                    'const hook = require(process.argv[1]);',
                    "const input = { hook_event_name: 'UserPromptSubmit', get prompt() { throw new Error('probe-failure'); } };",
                    'process.stdout.write(hook.evaluate(input));'
                ].join(' ');
                const run = debug => spawnSync(process.execPath, ['-e', driver, HOOK_PATH], {
                    encoding: 'utf8',
                    env: { ...process.env, CK_DEBUG: debug }
                });
                // When evaluated without and with CK_DEBUG
                const quiet = run('');
                const loud = run('1');
                // Then stdout stays empty (fail-open) and the diagnostic appears on stderr only when asked
                assertTrue(quiet.status === 0 && quiet.stdout === '' && !quiet.stderr.includes('probe-failure'), 'no diagnostic without CK_DEBUG');
                assertTrue(loud.status === 0 && loud.stdout === '', 'still silent on stdout under CK_DEBUG');
                assertContains(loud.stderr, '[commit-skill-route]');
                assertContains(loud.stderr, 'probe-failure');
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-006 prompts that forbid committing stay silent (coordinated verbs, curly apostrophe, need/should/hold-off forms)',
            fn: () => {
                for (const prompt of FORBIDDING) {
                    assertTrue(!hook.isCommitRequest(prompt), `expected no route for a forbidding prompt: ${JSON.stringify(prompt)}`);
                    assertTrue(hook.evaluate(event(prompt), ISOLATED) === '', `expected silent evaluate: ${JSON.stringify(prompt)}`);
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-007 system-reminder / task-notification envelopes stay silent',
            fn: () => {
                for (const prompt of HOST_ENVELOPES) {
                    assertTrue(hook.evaluate(event(prompt), ISOLATED) === '', `host envelope must be silent: ${JSON.stringify(prompt)}`);
                }
                // A real request is still routed when a host block rides along after the user's text.
                assertContains(hook.evaluate(event('commit this <system-reminder>note</system-reminder>'), ISOLATED), hook.MARKER_START);
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-003 directive names the skill on Claude, Codex and OpenCode',
            fn: () => {
                // Given a commit request evaluated with no switch and no settings
                const text = hook.evaluate(event('commit this'), ISOLATED);
                // Then the directive names the skill on every host
                assertContains(text, hook.MARKER_START);
                assertContains(text, 'Skill tool `commit`');
                assertContains(text, '$commit');
                assertContains(text, '.agents/skills/commit/SKILL.md');
                assertContains(text, 'OpenCode');
                assertContains(text, 'NEVER run an ad-hoc `git commit`');
                assertTrue(hook.evaluate(event('refactor the loader'), ISOLATED) === '', 'non-commit prompt must be silent');
                assertTrue(hook.evaluate({ hook_event_name: 'PreToolUse', prompt: 'commit' }, ISOLATED) === '', 'other events are ignored');
                assertTrue(hook.evaluate(null, ISOLATED) === '', 'malformed input fails open');
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-004 entry point routes requests and keeps malformed stdin diagnostics debug-only',
            fn: () => {
                // Technical contract: malformed host payloads fail open without default diagnostics.
                // Given a fixture root isolated from developer settings, switches, home and temp state
                const project = makeSettingsProject({});
                const env = childEnv({
                    ...CHILD_ENV_RESET,
                    CLAUDE_PROJECT_DIR: project,
                    HOME: project, USERPROFILE: project, TMPDIR: project, TEMP: project, TMP: project
                });
                const run = (input, debug) => spawnSync(process.execPath, [HOOK_PATH], {
                    input, encoding: 'utf8', timeout: 30000, cwd: project,
                    env: childEnv({ ...env, ...CHILD_ENV_RESET, CK_DEBUG: debug })
                });
                try {
                    // When the real entry receives a valid commit request / Then it routes and exits 0
                    const routed = run(JSON.stringify(event('stage and commit')));
                    assertTrue(routed.status === 0 && routed.stderr === '', 'valid request exits 0 without diagnostics');
                    assertContains(routed.stdout, hook.MARKER_START);
                    // Upstream serialization bugs can produce malformed JSON; raw payloads must not be echoed.
                    const malformed = '{malformed-payload-probe';
                    for (const debug of [undefined, '', '0']) {
                        // When debug is disabled / Then both output channels remain empty and exit stays 0
                        const quiet = run(malformed, debug);
                        assertTrue(quiet.status === 0 && quiet.stdout === '' && quiet.stderr === '',
                            `malformed stdin is quiet without debug (${String(debug)}): ${quiet.stderr}`);
                    }
                    for (const debug of ['1', 'true']) {
                        // When debug is enabled / Then only a sanitized diagnostic appears on stderr
                        const loud = run(malformed, debug);
                        assertTrue(loud.status === 0 && loud.stdout === '', 'debug parse failure still exits 0 without context');
                        assertContains(loud.stderr, '[commit-skill-route]');
                        assertContains(loud.stderr, 'Hook stdin contains invalid JSON');
                        assertTrue(!loud.stderr.includes('malformed-payload-probe'), 'diagnostic must not reflect raw stdin');
                    }
                    // Empty or valid JSON with an unsupported event shape also stays silent, even under debug.
                    for (const input of ['', ' \r\n ', 'null', '[]', '42', '"commit"', '{"prompt":false}']) {
                        const ignored = run(input, '1');
                        assertTrue(ignored.status === 0 && ignored.stdout === '' && ignored.stderr === '',
                            `unsupported input stays silent: ${JSON.stringify(input)}`);
                    }
                } finally {
                    fs.rmSync(project, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-008 Codex launcher (node -e … require) emits the directive',
            fn: () => {
                // Given a fixture project holding a copy of the hook tree and no settings, switch removed from the env
                const project = makeHookTreeProject('commit-route');
                try {
                    // When Codex launches the router from the fixture root on a commit request
                    const result = runCodexLauncher('commit-skill-route.cjs', JSON.stringify(event('stage and commit')),
                        { cwd: project, env: CHILD_ENV_RESET });
                    // Then it exits 0 and emits the directive
                    assertTrue(result.code === 0, `Codex launcher exited ${result.code}: ${result.stderr}`);
                    assertContains(result.stdout, hook.MARKER_START);
                } finally {
                    removeTempDir(project);
                }
            }
        },
        {
            name: '[commit-skill-route] TC-CSR-005 registered on UserPromptSubmit in settings',
            fn: () => {
                const settings = require(path.join(PROJECT_DIR, '.claude', 'settings.json'));
                const commands = (settings.hooks.UserPromptSubmit || []).flatMap(group => group.hooks.map(h => h.command));
                assertTrue(commands.some(c => c.includes('commit-skill-route.cjs')), 'hook must be wired in settings.json');
            }
        }
    ]
};
