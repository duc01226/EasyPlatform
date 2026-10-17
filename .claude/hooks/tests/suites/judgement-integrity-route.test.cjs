'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { assertTrue, assertContains } = require('../lib/assertions.cjs');
const { runCodexLauncher, childEnv, makeHookTreeProject, removeTempDir, recordUserPrompts } = require('../lib/hook-runner.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const HOOK_PATH = path.join(PROJECT_DIR, '.claude', 'hooks', 'judgement-integrity-route.cjs');
const SYNC_PATH = path.join(PROJECT_DIR, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
const hook = require(HOOK_PATH);
const { extractSyncBody } = require(path.join(PROJECT_DIR, '.claude', 'scripts', 'lib', 'extract-sync-block.cjs'));

const event = prompt => ({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt });
const { PROBLEM_PRESUMED, CONFIRMATION_SOUGHT, EVALUATION } = hook.LEANS;
// Opt-out checks read an explicit environment so a developer's own CK_* switch never leaks into a test.
const CLEAN_ENV = Object.freeze({});
// In-process evaluation with no switch and no settings: a developer's CK_JUDGEMENT_INTEGRITY_ROUTE=0 or real
// `.claude/.ck(.local).json` opt-out can neither silence a positive nor make a negative pass vacuously.
const ISOLATED = Object.freeze({ env: CLEAN_ENV, rawSettings: Object.freeze({}) });
// Child processes drop the developer's switch (an undefined value deletes the key) and debug output.
const CHILD_ENV_RESET = Object.freeze({ CK_JUDGEMENT_INTEGRITY_ROUTE: undefined, CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined });

/** An isolated project root holding only `.claude/<name>` settings files; removed by the caller. */
function makeSettingsProject(files) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'judgement-integrity-route-'));
    fs.mkdirSync(path.join(dir, '.claude'));
    for (const [name, value] of Object.entries(files)) {
        fs.writeFileSync(path.join(dir, '.claude', name), JSON.stringify(value));
    }
    return dir;
}

// Intent: a verdict request is routed, and the lean it carries is named so the answer can test against it.
const LEANING = [
    ['does this plan have any gaps?', PROBLEM_PRESUMED],
    ['check if the hook has issues', PROBLEM_PRESUMED],
    ['what is wrong with this function?', PROBLEM_PRESUMED],
    ['I think the cache is the root cause, right?', CONFIRMATION_SOUGHT],
    ['am I right that the parser over-captures?', CONFIRMATION_SOUGHT],
    ['review my theory: the race is in the scheduler', CONFIRMATION_SOUGHT],
    ['should we use a queue or a cron job?', EVALUATION],
    ['evaluate the new routing design', EVALUATION],
    // Common everyday phrasings — "is <subject> <adjective>?" with a multi-word subject, reviews and opinion asks.
    ['is this approach sound?', EVALUATION],
    ['is the new hook correct', EVALUATION],
    ['review the plan for gaps', PROBLEM_PRESUMED],
    ['is anything missing from the checklist', PROBLEM_PRESUMED],
    ['what do you think of this design?', EVALUATION],
    ['thoughts on the retry strategy?', EVALUATION],
    // A fix/build request that ALSO asks for a verdict keeps routing on the explicit verdict ask.
    ['fix the parser — am I right that the regex over-captures?', CONFIRMATION_SOUGHT],
    ['implement the cache; is this approach sound?', EVALUATION],
    ['can you review the fix for any gaps?', PROBLEM_PRESUMED],
    ['Run the tests. Does the plan have any gaps?', PROBLEM_PRESUMED],
    ['my theory is the lock leaks — does it hold?', CONFIRMATION_SOUGHT],
    // A stated belief or a confirm/verify ask routes when the prompt asks a question.
    ['can you confirm that the cache is the cause?', CONFIRMATION_SOUGHT],
    ['I believe the parser is wrong. Can you check?', CONFIRMATION_SOUGHT],
    ['confirm my understanding of the lock order', CONFIRMATION_SOUGHT]
];
// Intent: build, fix, lookup and explain requests carry no verdict and must stay silent.
const NON_JUDGEMENT = [
    'add error handling to the parser',
    'fix the bug in login',
    'check the tests pass',
    'refactor the settings loader',
    'implement a retry with exponential backoff',
    'explain how session-init works',
    'what does this function do?',
    'commit this',
    '/why-review plans/x',
    '```any gaps?```',
    'is the build running?',
    '<task-notification><result>Findings: any gaps? is this correct?</result></task-notification>',
    // Plain fix/build requests: their fault nouns describe work to do, not a verdict to give.
    'Run the tests and fix any errors',
    'I have an issue with the login page, can you fix it?',
    'please implement the retry and handle any edge cases',
    'can you fix it? why does it crash?',
    // Host envelopes (system reminder, truncated task notification) are not user questions.
    '<system-reminder>any gaps? is this correct?</system-reminder>',
    '<task-notification>\n<summary>should we merge? any gaps?',
    '',
    // A stated plan, an instruction to check something, or a verdict word used as a build noun asks for no
    // verdict — each used to inject the ~2 KB directive.
    'I think we should add a retry to the fetcher',
    'we believe the cache belongs in the service layer, so move it there',
    'verify that the build passes',
    'confirm that you pushed',
    'write a critique section for the doc',
    'add a judge step to the pipeline'
];

module.exports = {
    name: 'judgement-integrity-route',
    tests: [
        {
            name: '[judgement-integrity-route] TC-JIR-001 verdict requests are routed with the lean they carry',
            fn: () => {
                for (const [prompt, lean] of LEANING) {
                    const leans = hook.detectLeans(prompt);
                    assertTrue(leans.includes(lean), `expected ${lean} for ${JSON.stringify(prompt)}, got ${JSON.stringify(leans)}`);
                }
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-002 build, fix, lookup, explicit why-review and code stay silent',
            fn: () => {
                for (const prompt of NON_JUDGEMENT) {
                    assertTrue(!hook.isJudgementRequest(prompt), `expected no route: ${JSON.stringify(prompt)}`);
                }
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-003 directive carries the canonical reminder verbatim and guards both bias directions',
            fn: () => {
                const canonical = extractSyncBody(fs.readFileSync(SYNC_PATH, 'utf8'), hook.SYNC_TAG);
                assertTrue(Boolean(canonical), 'canonical SYNC:judgement-integrity:reminder must exist');
                // Given a verdict ask with automatic activation enabled, independent of project/personal defaults
                const text = hook.evaluate(event('does this plan have any gaps?'), {
                    ...ISOLATED, env: { ...CLEAN_ENV, CK_SKILL_AUTO_TRIGGER: 'true' }
                });
                // Then the directive carries the canonical reminder verbatim
                assertContains(text, hook.MARKER_START);
                assertContains(text, canonical.trim());
                // Anti-invention and anti-contrarian halves are both load-bearing — losing either re-opens a bias.
                assertContains(text, 'never invent findings');
                assertContains(text, 'never manufacture disagreement');
                assertContains(text, 'no material issues found');
                // External-fact verdicts must be web-verified, not answered from memory.
                assertContains(text, 'verify via web research');
                assertContains(text, 'memory alone = `Unverified`');
                assertContains(text, '$why-review');
                assertContains(text, 'OpenCode');
                // Everyday check is inline; only formal deliverables / MEDIUM+ verdicts escalate to the skill.
                assertContains(text, 'Default = INLINE self-check');
                assertContains(text, 'Escalate to `why-review --validate-findings` only for formal review/audit/gap-hunt deliverable');
                // Same trigger as the canonical reminder: a MEDIUM+ issue escalates only when the inline pass cannot settle it.
                assertContains(text, 'MEDIUM+/consequential issue the inline pass cannot settle');
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-008 fallback body keeps both bias halves when the canonical reminder is unavailable',
            fn: () => {
                // Given no canonical SYNC reminder (unit: explicit null; process: a project without the SYNC file)
                const text = hook.buildDirective([PROBLEM_PRESUMED], null);
                // Then the built-in body still guards anti-invention AND anti-contrarian, and names the rule
                assertContains(text, hook.MARKER_START);
                assertContains(text, 'never invent findings');
                assertContains(text, 'never manufacture disagreement');
                assertContains(text, '`Bias check:` line');
                assertContains(text, '`SYNC:judgement-integrity`');
                assertTrue(!text.includes('verify via web research'), 'explicit null must select the built-in body, not the canonical one');
                const project = makeSettingsProject({});
                try {
                    // When the hook runs where the canonical source cannot be read
                    const result = spawnSync(process.execPath, [HOOK_PATH], {
                        input: JSON.stringify(event('does this plan have any gaps?')),
                        encoding: 'utf8',
                        env: childEnv({ ...CHILD_ENV_RESET, CLAUDE_PROJECT_DIR: project })
                    });
                    // Then it still emits the directive with the fallback body, exit 0
                    assertTrue(result.status === 0, `fallback run exits 0, got ${result.status}`);
                    assertContains(result.stdout, 'never invent findings');
                    assertContains(result.stdout, 'never manufacture disagreement');
                    assertTrue(!result.stdout.includes('verify via web research'), 'a project without the SYNC file must get the built-in body');
                } finally {
                    fs.rmSync(project, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-009 opt-out: .ck.json judgementIntegrityRoute.enabled:false or CK_JUDGEMENT_INTEGRITY_ROUTE=0 silences the router',
            fn: () => {
                // Given a verdict ask that routes when nothing is switched off
                const ask = event('does this plan have any gaps?');
                const enabledDir = makeSettingsProject({});
                const disabledDir = makeSettingsProject({ '.ck.json': { judgementIntegrityRoute: { enabled: false } } });
                const localOnDir = makeSettingsProject({
                    '.ck.json': { judgementIntegrityRoute: { enabled: false } },
                    '.ck.local.json': { judgementIntegrityRoute: { enabled: true } }
                });
                try {
                    assertContains(hook.evaluate(ask, { env: CLEAN_ENV, projectDir: enabledDir }), hook.MARKER_START);
                    // When the team config switches it off / Then it stays silent
                    assertTrue(hook.evaluate(ask, { env: CLEAN_ENV, projectDir: disabledDir }) === '', '.ck.json enabled:false must silence');
                    assertTrue(hook.evaluate(ask, { env: CLEAN_ENV, rawSettings: { enabled: 'false' } }) === '', 'a hand-typed "false" must silence');
                    // When a developer-local override re-enables it / Then the local value wins
                    assertContains(hook.evaluate(ask, { env: CLEAN_ENV, projectDir: localOnDir }), hook.MARKER_START);
                    // When the env switch is 0 / Then it stays silent even though config enables it
                    assertTrue(hook.evaluate(ask, { env: { CK_JUDGEMENT_INTEGRITY_ROUTE: '0' }, projectDir: enabledDir }) === '', 'CK_JUDGEMENT_INTEGRITY_ROUTE=0 must silence');
                    // And at the real process boundary: the hook resolves settings from CLAUDE_PROJECT_DIR
                    const run = (dir, extraEnv = {}) => spawnSync(process.execPath, [HOOK_PATH], {
                        input: JSON.stringify(ask),
                        encoding: 'utf8',
                        env: childEnv({ ...CHILD_ENV_RESET, CLAUDE_PROJECT_DIR: dir, ...extraEnv })
                    });
                    const on = run(enabledDir);
                    assertTrue(on.status === 0, `enabled run exits 0, got ${on.status}`);
                    assertContains(on.stdout, hook.MARKER_START);
                    const offByConfig = run(disabledDir);
                    assertTrue(offByConfig.status === 0 && offByConfig.stdout === '', 'config opt-out is silent at the process boundary');
                    const offByEnv = run(enabledDir, { CK_JUDGEMENT_INTEGRITY_ROUTE: '0' });
                    assertTrue(offByEnv.status === 0 && offByEnv.stdout === '', 'env opt-out is silent at the process boundary');
                } finally {
                    for (const dir of [enabledDir, disabledDir, localOnDir]) fs.rmSync(dir, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-010 an internal failure stays silent on stdout and is diagnosed only under CK_DEBUG',
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
                assertContains(loud.stderr, '[judgement-integrity-route]');
                assertContains(loud.stderr, 'probe-failure');
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-007 Codex launcher (node -e … require) emits the directive',
            fn: () => {
                // Given a fixture project holding a copy of the hook tree and no settings, switch removed from the env
                const project = makeHookTreeProject('judgement-route');
                try {
                    // When Codex launches the router from the fixture root on a verdict ask
                    const result = runCodexLauncher('judgement-integrity-route.cjs', JSON.stringify(event('am I right that this is the root cause?')),
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
            name: '[judgement-integrity-route] TC-JIR-004 fails open on other events and malformed input',
            fn: () => {
                assertTrue(hook.evaluate(event('refactor the loader'), ISOLATED) === '', 'non-judgement prompt must be silent');
                assertTrue(hook.evaluate({ hook_event_name: 'PreToolUse', prompt: 'any gaps?' }, ISOLATED) === '', 'other events are ignored');
                assertTrue(hook.evaluate(null, ISOLATED) === '', 'malformed input fails open');
                assertTrue(hook.evaluate([], ISOLATED) === '', 'array input fails open');
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-011 sub-agent start and compaction classify the latest recorded user prompt and answer as context',
            fn: () => {
                const project = makeSettingsProject({});
                const deps = { ...ISOLATED, projectDir: project };
                const agentStart = { hook_event_name: 'SubagentStart', session_id: 's1', agent_id: 'a1', agent_type: 'general-purpose' };
                const compaction = { hook_event_name: 'SessionStart', session_id: 's1', source: 'compact' };
                try {
                    // Given no recorded prompt / Then neither prompt-less event routes
                    assertTrue(hook.evaluate(agentStart, deps) === '' && hook.evaluate(compaction, deps) === '', 'no ledger stays silent');
                    // Given the latest recorded prompt asks for a verdict
                    recordUserPrompts(project, 's1', ['refactor the loader', 'does this plan have any gaps?']);
                    for (const input of [agentStart, compaction]) {
                        // When the event carries no prompt of its own / Then the directive names the recorded lean
                        const text = hook.evaluate(input, deps);
                        assertContains(text, `lean: ${PROBLEM_PRESUMED}`);
                        // And the output is the event's context envelope, not plain stdout
                        const envelope = JSON.parse(require('../../lib/prompt-route-utils.cjs').routerOutput(input, text));
                        assertTrue(envelope.hookSpecificOutput.hookEventName === input.hook_event_name, 'envelope names the event');
                        assertContains(envelope.hookSpecificOutput.additionalContext, hook.MARKER_START);
                    }
                    // Given a later build request recorded after the verdict ask / Then the latest prompt decides: silent
                    recordUserPrompts(project, 's1', ['does this plan have any gaps?', 'implement the plan']);
                    assertTrue(hook.evaluate(agentStart, deps) === '', 'an older verdict ask never routes');
                    // And other session-start sources never read the ledger
                    for (const source of ['startup', 'resume', 'clear']) {
                        assertTrue(hook.evaluate({ ...compaction, source }, deps) === '', `${source} stays silent`);
                    }
                } finally {
                    fs.rmSync(project, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-005 entry point emits the directive and exits 0',
            fn: () => {
                // Given a fixture project with no settings and the developer's switch removed from the environment
                const project = makeSettingsProject({});
                const reset = {};
                for (const key of Object.keys(process.env)) {
                    if (/^(?:CK_|CLAUDE_|CODEX_|OPENCODE_|OPENAI_|ANTHROPIC_|GEMINI_|GOOGLE_|AZURE_)/i.test(key)) reset[key] = undefined;
                }
                const env = childEnv({ ...reset, HOME: project, USERPROFILE: project, TMPDIR: project, TEMP: project, TMP: project, CLAUDE_PROJECT_DIR: project });
                const run = (input, debug = '') => spawnSync(process.execPath, [HOOK_PATH], {
                    input, encoding: 'utf8', windowsHide: true, env: { ...env, CK_DEBUG: debug }
                });
                try {
                    // When the hook runs as `node <hook>` on a verdict ask / Then it emits the directive
                    const out = execFileSync(process.execPath, [HOOK_PATH], {
                        input: JSON.stringify(event('am I right that this is the root cause?')),
                        encoding: 'utf8',
                        env
                    });
                    assertContains(out, hook.MARKER_START);
                    // When stdin is empty, non-JSON, malformed, nonobject or code-only / Then both channels stay silent and exit 0
                    for (const input of ['', 'not json', '{"secret":"SYNTHETIC-SECRET",', 'null', '[]', JSON.stringify(event('``any gaps?``')), JSON.stringify(event('~~~text\nany gaps?\n~~~'))]) {
                        const silent = run(input);
                        assertTrue(silent.status === 0 && silent.stdout === '' && silent.stderr === '', `irrelevant/malformed/code input stays silent: ${JSON.stringify(input)}; stderr=${silent.stderr}`);
                    }
                    // When malformed JSON arrives in debug mode / Then the sanitized diagnostic uses stderr only
                    const diagnosed = run('{"secret":"SYNTHETIC-SECRET",', '1');
                    assertTrue(diagnosed.status === 0 && diagnosed.stdout === '', 'debug parse failure remains fail-open');
                    assertContains(diagnosed.stderr, 'Hook stdin contains invalid JSON');
                    assertTrue(!diagnosed.stderr.includes('SYNTHETIC-SECRET'), 'malformed input is never echoed into diagnostics');
                } finally {
                    fs.rmSync(project, { recursive: true, force: true });
                }
            }
        },
        {
            name: '[judgement-integrity-route] TC-JIR-006 registered on UserPromptSubmit, SubagentStart and SessionStart compact, and carried by the universal critical-thinking protocol',
            fn: () => {
                const settings = require(path.join(PROJECT_DIR, '.claude', 'settings.json'));
                const wired = (event, matcher) => (settings.hooks[event] || [])
                    .filter(group => matcher === undefined || group.matcher === matcher)
                    .some(group => group.hooks.some(h => h.command.includes('judgement-integrity-route.cjs')));
                assertTrue(wired('UserPromptSubmit'), 'hook must be wired on prompts');
                assertTrue(wired('SubagentStart'), 'hook must be wired on every sub-agent start');
                assertTrue(wired('SessionStart', 'compact'), 'hook must be wired on the compaction report');
                // The universal protocol carries the rule for every task; the hook adds the lean-specific directive.
                const full = extractSyncBody(fs.readFileSync(SYNC_PATH, 'utf8'), 'critical-thinking-mindset');
                assertContains(full, '**Judgement integrity:**');
                assertContains(full, 'never invent findings or manufacture disagreement');
                assertContains(full, 'web-verify external facts');
            }
        }
    ]
};
