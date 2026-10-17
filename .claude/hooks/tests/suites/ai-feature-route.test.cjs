'use strict';

/**
 * ai-feature-route — the UserPromptSubmit router that puts the AI-engineering gate in front of the model
 * when the user's prompt asks to build, plan, change or review an AI feature, and costs nothing otherwise.
 *
 * Business intent: a prompt about LLM calls, RAG, embeddings, tool use or an AI assistant gets ONE short
 * directive (one read pointer, the review route); a prompt about this framework's own machinery, a question
 * about what a technique is, and every prompt after the first in a re-arm window get nothing. Invariants guarded here:
 *   - intent: an AI technique AND an action on it route; a bare question or mention does not;
 *   - meta: two distinct framework cues silence the route, one cue leaves only concrete product techniques;
 *   - the directive is short, names ONE protocol file (the framing gate when planning), routes reviews to the
 *     skill/agent, never sends the reader to the knowledge or checklist docs, and never depends on another file;
 *   - it is delivered once per session scope and window through the convention ledger, and re-armed by a
 *     compaction (host-reported or read from the transcript);
 *   - a prompt with no AI vocabulary loads no heavy module;
 *   - it is switched off by `.ck.json` `aiFeatureRoute.enabled:false` or CK_AI_FEATURE_ROUTE=0, and fails open.
 * The suite builds its own fixture projects and delivery stores; it does not depend on any other framework file.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { assertTrue, assertContains } = require('../lib/assertions.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');
const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const HOOK_PATH = path.join(HOOKS_DIR, 'ai-feature-route.cjs');
const hook = require(HOOK_PATH);
const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));

const event = (prompt, session = 's1') => ({ hook_event_name: 'UserPromptSubmit', session_id: session, prompt });
// In-process evaluation with no switch and no settings: a developer's own CK_AI_FEATURE_ROUTE=0 or real
// `.claude/.ck(.local).json` opt-out can neither silence a positive nor make a negative pass vacuously.
const CLEAN_ENV = Object.freeze({});
const ISOLATED = Object.freeze({ env: CLEAN_ENV, rawSettings: Object.freeze({}) });
const MINUTE = 60 * 1000;
const T0 = 1800000000000;

/** An isolated project root holding `.claude/<name>` settings files and its own delivery store. */
function makeProject({ settings = {} } = {}) {
    const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-feature-route-')));
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.mkdirSync(path.join(dir, 'store'));
    for (const [name, value] of Object.entries(settings)) fs.writeFileSync(path.join(dir, '.claude', name), JSON.stringify(value));
    return dir;
}

const removeDir = dir => fs.rmSync(dir, { recursive: true, force: true });

/** Clean-machine child env (Portable Test Contract): no inherited CK_* switch, home and temp inside the fixture. */
function cleanEnv(dir, extra = {}) {
    const overrides = { HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir, CLAUDE_HOOK_DEBUG: undefined };
    for (const key of Object.keys(process.env)) {
        if (/^CK_/i.test(key)) overrides[key] = undefined;
    }
    return childEnv({ ...overrides, CLAUDE_PROJECT_DIR: dir, CK_CONVENTIONS_DIR: path.join(dir, 'store'), ...extra });
}

function runHook(dir, payload, extraEnv = {}) {
    return spawnSync(process.execPath, [HOOK_PATH], {
        input: JSON.stringify(payload), encoding: 'utf8', windowsHide: true, env: cleanEnv(dir, extraEnv)
    });
}

/** In-process run() against a fixture store: returns what would reach stdout. */
async function deliver(store, input, now = T0, extra = {}) {
    const written = [];
    const out = await hook.run(input, {
        ...ISOLATED, storeRoot: store, now, write: (text, done) => { written.push(text); done(true); }, ...extra
    });
    return { out, written };
}

// Intent: prompts that name an AI technique AND ask to act on it are routed, with the signal that fired.
const POSITIVE = [
    ['add an LLM call to summarize support tickets', 'LLM'],
    ['build a RAG pipeline over our product docs', 'RAG'],
    ['use OpenAI embeddings for the search box', 'embeddings'],
    ['implement semantic search with pgvector', 'vector store'],
    ['protect the chatbot from prompt injection', 'prompt injection'],
    ['integrate the Anthropic API for ticket classification', 'provider API'],
    ['use the Gemini SDK to extract invoice fields', 'provider API'],
    ['add function calling to the assistant feature', 'function calling'],
    ['fine-tune a model on our support conversations', 'fine-tuning'],
    ['plan the agentic app architecture', 'agentic app'],
    ['write an eval harness for the model', 'model eval'],
    ['add model routing between a small and a large model', 'model routing'],
    ['use GPT-4o for extraction', 'OpenAI / GPT'],
    ['how do we cache the prompt? enable prompt caching', 'prompt caching'],
    ['ship an AI-powered search to customers', 'AI feature'],
    ['add a RAG pipeline with embeddings to the search service', 'RAG'],
    ['review this OpenAI tool-calling agent for prompt injection', 'prompt injection'],
    // One framework cue, but a concrete product technique is named: still an AI-feature task
    ['add an OpenAI embeddings step to the workflow that summarizes tickets', 'embeddings'],
    // Generic vocabulary routes when nothing says this is framework maintenance
    ['add guardrails around the model output', 'guardrails'],
    ['how do we reduce hallucination in our answers?', 'hallucination'],
    ['write the system prompt for the support bot', 'system prompt'],
    ['set up an MCP server for our product', 'MCP server'],
    ['build a browser agent that books tickets for customers', 'browser agent'],
    ['design a computer-use agent for invoice entry', 'browser agent'],
    ['implement agent-to-agent delegation over the A2A protocol', 'A2A protocol'],
    ['add agent-to-agent communication between the planner and the booking service', 'agent protocol'],
    // The Claude provider, spelled as an API or SDK phrase (not the coding assistant's own name)
    ['integrate the Claude API into the checkout flow', 'provider API'],
    ['use the Claude SDK to draft replies', 'provider API'],
    ['build a support bot on the Claude Agent SDK', 'provider API'],
    ['add the Anthropic SDK to the billing service', 'provider API'],
    // A bare provider name after an API/SDK word still routes; only the assistant's own spellings are excluded
    ['use the SDK to call Claude from the worker', 'provider API'],
    ['wire the API client to Claude, then add retries', 'provider API']
];
// Intent: this framework's own vocabulary, unrelated uses of the words, a bare question and host envelopes never route.
const NEGATIVE = [
    'update the agent definition',
    'edit the skill prompt',
    'review hooks',
    'add a new workflow step',
    'fix the prompt ledger hook',
    'refactor the settings loader',
    'explain how the agents work',
    'the prompt is too long',
    'commit this',
    'fine-tune the layout spacing',
    'embedding a video player in the page',
    'the rag in the page header is torn',
    'a gemini zodiac widget',
    // Words that only look like the new surfaces: no agent, no protocol
    'the browser use statistics page shows 40% Chrome',
    'fix the A2A payment reconciliation job',
    'update the browser agent notes in the skill docs',
    // The technique is named but nothing asks to act on it
    'what is RAG?',
    'explain embeddings to me',
    'the LLM is slow today',
    'tell me about vector databases',
    // Generic AI vocabulary inside framework maintenance stays silent (one cue is enough for generic words)
    'add a system prompt section to the reviewer agent definition in .claude/agents',
    'improve the guardrails in the commit hook',
    'reduce hallucination in the skill instructions',
    'add an MCP server entry to settings.json',
    'tighten the AI-agent folder portability rules',
    'add an LLM step to the workflow that summarizes tickets',
    'update the ai-engineering-review skill so it reads the checklist by section',
    // Two distinct framework cues silence the route even when a concrete technique is listed
    'update the review skills, sub-agents and hooks so plan review and code review of any AI feature (LLM calls, RAG, tool use) get an expert protocol injected',
    'sync the mirrors after changing the AI gate protocol for RAG',
    // The coding assistant's own name is not the Claude provider
    'update the Claude Code hooks documentation',
    'add a note about the Claude Code SDK to the guide',
    'wire the SDK docs into Claude Code',
    'the Claude API is popular',
    'fix the claude.md generator',
    // ...in every spelling: hyphenated, the memory file, the web app
    'add an integration test for claude-code',
    'wire the sdk docs into claude-code',
    'add an API endpoint for CLAUDE.md generation',
    'use the SDK to build the claude.md refresher',
    'add an SDK link to the claude.ai guide',
    // Code, host envelopes, explicit review invocation, empty input
    '```const x = new OpenAI()```',
    'run `npm test` and fix the failing `llm` spec',
    '<system-reminder>LLM RAG embeddings prompt injection</system-reminder>',
    '<task-notification><result>the LLM call fails</result></task-notification>',
    '/ai-engineering-review src/llm',
    '$ai-engineering-review',
    ''
];

module.exports = {
    name: 'ai-feature-route',
    tests: [
        {
            // Given prompts that name an AI technique and ask to act on it
            // When each is detected
            // Then each routes with the signal that fired
            name: '[ai-feature-route] TC-AIR-001 prompts that name an AI technique and ask to act on it are routed with the signal that fired',
            fn: () => {
                for (const [prompt, signal] of POSITIVE) {
                    const detection = hook.detectAiFeature(prompt);
                    assertTrue(detection !== null, `expected a route for ${JSON.stringify(prompt)}`);
                    assertTrue(detection.signals.includes(signal), `expected signal ${signal} for ${JSON.stringify(prompt)}, got ${JSON.stringify(detection.signals)}`);
                }
            }
        },
        {
            // Given framework vocabulary, bare questions, unrelated uses, code spans, host envelopes and explicit review calls
            // When each is detected
            // Then none routes
            name: '[ai-feature-route] TC-AIR-002 framework vocabulary, bare questions, unrelated uses, code, host envelopes and explicit review calls stay silent',
            fn: () => {
                for (const prompt of NEGATIVE) {
                    assertTrue(!hook.isAiFeaturePrompt(prompt), `expected no route: ${JSON.stringify(prompt)} (got ${JSON.stringify(hook.detectAiFeature(prompt))})`);
                }
                assertTrue(hook.detectAiFeature(undefined) === null && hook.detectAiFeature(null) === null && hook.detectAiFeature(42) === null, 'non-string prompts stay silent');
            }
        },
        {
            // Given build, review and plan prompts, many-signal detections and very long signal names
            // When the directive is built
            // Then it is at most 700 characters by construction, names one protocol file, routes reviews to the skill/agent and names no deep doc
            name: '[ai-feature-route] TC-AIR-003 the directive is short, names ONE read file (framing gate when planning), routes reviews to the skill/agent and never to the deep docs',
            fn: () => {
                const directive = prompt => hook.buildDirective(hook.detectAiFeature(prompt));
                const cases = {
                    review: directive('review our LLM integration for safety problems'),
                    build: directive('add an LLM call that drafts replies'),
                    plan: directive('plan an agentic app architecture for support')
                };
                for (const [kind, text] of Object.entries(cases)) {
                    assertTrue(text.length <= 700, `${kind} directive is ${text.length} chars (limit 700)`);
                    assertContains(text, hook.MARKER_START);
                    assertContains(text, hook.MARKER_END);
                    assertContains(text, 'ai-engineering-review');
                    assertContains(text, 'ai-engineering-reviewer');
                    assertContains(text, 'never memory');
                    assertContains(text, 'Otherwise ignore');
                    assertTrue(!/ai-engineering-(?:review-checklist|knowledge|calibration)/.test(text), `${kind}: never points at the checklist, knowledge or calibration docs`);
                    const reads = text.match(/\.claude\/skills\/shared\/protocols\/[\w-]+\.md/g) || [];
                    assertTrue(reads.length === 1, `${kind}: exactly one read pointer, got ${JSON.stringify(reads)}`);
                }
                assertContains(cases.review, hook.GATE_FILE);
                assertContains(cases.build, hook.GATE_FILE);
                assertContains(cases.plan, hook.FRAMING_FILE);
                assertTrue(!cases.plan.includes(hook.GATE_FILE), 'a planning prompt reads the framing gate, not the floor');
                assertTrue(hook.detectAiFeature('review the RAG retrieval code').intent === hook.INTENTS.REVIEW, 'review intent');
                assertTrue(hook.detectAiFeature('add a RAG retrieval step').intent === hook.INTENTS.BUILD, 'build intent');
                assertTrue(hook.detectAiFeature('design a RAG assistant for support').intent === hook.INTENTS.PLAN, 'plan intent');
                // Even with the longest signal names the directive stays inside the limit
                const longest = hook.buildDirective({ signals: ['prompt injection', 'OpenAI / GPT', 'provider API', 'fine-tuning'], intent: hook.INTENTS.PLAN });
                assertTrue(longest.length <= 700, `longest directive is ${longest.length} chars`);
                // The cap holds by construction: a prompt that matches every technique names at most MAX_SIGNALS_SHOWN of them
                const everything = 'build a RAG pipeline with embeddings on pgvector, protect it against prompt injection, enable prompt caching, use OpenAI and GPT-4o, integrate the Anthropic API, add function calling, fine-tune a model on our training data dataset, add semantic search and model routing, plus LLM guardrails, hallucination checks, an MCP server, tool calling and a system prompt for the AI feature';
                const detection = hook.detectAiFeature(everything);
                assertTrue(detection !== null && detection.signals.length > 12, `the probe prompt matches many techniques, got ${detection && detection.signals.length}`);
                for (const intent of Object.values(hook.INTENTS)) {
                    const wide = hook.buildDirective({ ...detection, intent });
                    assertTrue(wide.length <= hook.MAX_DIRECTIVE_CHARS, `${intent}: a many-signal directive is ${wide.length} chars (limit ${hook.MAX_DIRECTIVE_CHARS})`);
                    const named = (/AI-feature work \(([^)]*)\)/.exec(wide) || [null, ''])[1].split(', ').filter(Boolean);
                    assertTrue(named.length > 0 && named.length <= hook.MAX_SIGNALS_SHOWN, `${intent}: at most ${hook.MAX_SIGNALS_SHOWN} signals are named, got ${named.length}`);
                }
                // ... and by trimming when the names themselves are long: names are dropped from the end until the whole text fits
                for (const [length, count] of [[250, 3], [300, 2], [900, 1]]) {
                    const long = hook.buildDirective({ signals: Array.from({ length: count }, (_, i) => `${'x'.repeat(length)}${i}`), intent: hook.INTENTS.PLAN });
                    assertTrue(long.length <= 700, `${count} signals of ${length} chars: directive is ${long.length} chars`);
                    assertContains(long, hook.MARKER_END);
                    assertContains(long, hook.FRAMING_FILE);
                }
                assertTrue(!/AI-feature work \(/.test(hook.buildDirective({ signals: ['x'.repeat(900)], intent: hook.INTENTS.BUILD })), 'a signal list that cannot fit is omitted, not cut mid-name');
            }
        },
        {
            // Given two projects, one with a canonical protocol source and one without
            // When the hook runs in each
            // Then the output is identical and embeds no protocol body
            name: '[ai-feature-route] TC-AIR-004 the directive is self-contained: identical with or without any canonical protocol source',
            fn: () => {
                const withSource = makeProject();
                const withoutSource = makeProject();
                try {
                    const shared = path.join(withSource, '.claude', 'skills', 'shared');
                    fs.mkdirSync(shared, { recursive: true });
                    fs.writeFileSync(path.join(shared, 'sync-inline-versions.md'), '## SYNC:ai-engineering-gate:reminder\n\n- FIXTURE-CANONICAL-BODY\n');
                    const prompt = 'add an LLM call to the reply service';
                    const a = runHook(withSource, event(prompt));
                    const b = runHook(withoutSource, event(prompt));
                    assertTrue(a.status === 0 && b.status === 0, `exit ${a.status}/${b.status}: ${a.stderr}${b.stderr}`);
                    assertContains(a.stdout, hook.MARKER_START);
                    assertTrue(!a.stdout.includes('FIXTURE-CANONICAL-BODY'), 'no canonical protocol body is embedded');
                    assertTrue(a.stdout === b.stdout, 'the directive does not depend on another file');
                } finally {
                    removeDir(withSource);
                    removeDir(withoutSource);
                }
            }
        },
        {
            // Given enabled projects and projects that opt out by settings file or environment
            // When the router is evaluated in process and at the process boundary
            // Then an opt-out silences it and a local override wins
            name: '[ai-feature-route] TC-AIR-005 opt-out: .ck.json aiFeatureRoute.enabled:false or CK_AI_FEATURE_ROUTE=0 silences the router',
            fn: () => {
                const ask = event('add an LLM call to the reply service');
                const enabledDir = makeProject();
                const disabledDir = makeProject({ settings: { '.ck.json': { aiFeatureRoute: { enabled: false } } } });
                const localOnDir = makeProject({ settings: { '.ck.json': { aiFeatureRoute: { enabled: false } }, '.ck.local.json': { aiFeatureRoute: { enabled: true } } } });
                try {
                    assertContains(hook.evaluate(ask, { env: CLEAN_ENV, projectDir: enabledDir }), hook.MARKER_START);
                    assertTrue(hook.evaluate(ask, { env: CLEAN_ENV, projectDir: disabledDir }) === '', '.ck.json enabled:false must silence');
                    assertTrue(hook.evaluate(ask, { env: CLEAN_ENV, rawSettings: { enabled: 'false' } }) === '', 'a hand-typed "false" must silence');
                    assertContains(hook.evaluate(ask, { env: CLEAN_ENV, projectDir: localOnDir }), hook.MARKER_START);
                    assertTrue(hook.evaluate(ask, { env: { CK_AI_FEATURE_ROUTE: '0' }, projectDir: enabledDir }) === '', 'CK_AI_FEATURE_ROUTE=0 must silence');
                    // At the real process boundary the hook resolves settings from CLAUDE_PROJECT_DIR
                    const on = runHook(enabledDir, ask);
                    assertTrue(on.status === 0 && on.stdout.includes(hook.MARKER_START), 'enabled run emits the directive');
                    const offByConfig = runHook(disabledDir, ask);
                    assertTrue(offByConfig.status === 0 && offByConfig.stdout === '', 'config opt-out is silent at the process boundary');
                    const offByEnv = runHook(enabledDir, event(ask.prompt, 'other-session'), { CK_AI_FEATURE_ROUTE: '0' });
                    assertTrue(offByEnv.status === 0 && offByEnv.stdout === '', 'env opt-out is silent at the process boundary');
                } finally {
                    for (const dir of [enabledDir, disabledDir, localOnDir]) removeDir(dir);
                }
            }
        },
        {
            // Given other events, malformed input and a prompt getter that throws
            // When the router is evaluated
            // Then it stays silent on stdout and diagnoses only under CK_DEBUG
            name: '[ai-feature-route] TC-AIR-006 other events and malformed input fail open; an internal failure is silent on stdout and diagnosed only under CK_DEBUG',
            fn: () => {
                assertTrue(hook.evaluate(event('refactor the loader'), ISOLATED) === '', 'a non-AI prompt is silent');
                assertTrue(hook.evaluate({ hook_event_name: 'PreToolUse', prompt: 'add an LLM call' }, ISOLATED) === '', 'other events are ignored');
                assertTrue(hook.evaluate(null, ISOLATED) === '', 'malformed input fails open');
                assertTrue(hook.evaluate([], ISOLATED) === '', 'array input fails open');
                // Given a payload whose prompt getter throws (a stand-in for any internal failure)
                const driver = [
                    'const hook = require(process.argv[1]);',
                    "const input = { hook_event_name: 'UserPromptSubmit', get prompt() { throw new Error('probe-failure'); } };",
                    'process.stdout.write(hook.evaluate(input));'
                ].join(' ');
                const run = debug => spawnSync(process.execPath, ['-e', driver, HOOK_PATH], { encoding: 'utf8', env: childEnv({ CK_AI_FEATURE_ROUTE: undefined, CLAUDE_HOOK_DEBUG: undefined, CK_DEBUG: debug }) });
                const quiet = run('');
                const loud = run('1');
                assertTrue(quiet.status === 0 && quiet.stdout === '' && !quiet.stderr.includes('probe-failure'), 'no diagnostic without CK_DEBUG');
                assertTrue(loud.status === 0 && loud.stdout === '', 'still silent on stdout under CK_DEBUG');
                assertContains(loud.stderr, '[ai-feature-route]');
                assertContains(loud.stderr, 'probe-failure');
            }
        },
        {
            // Given a matching prompt, unparseable stdin and a Codex-style launcher
            // When the entry point runs
            // Then it emits the directive for a match, nothing for bad input, and always exits 0
            name: '[ai-feature-route] TC-AIR-007 entry point emits the directive and exits 0; a Codex-style launcher (require, no require.main) does too',
            fn: () => {
                const project = makeProject();
                const env = cleanEnv(project);
                try {
                    const payload = JSON.stringify(event('add an LLM call to the reply service'));
                    const out = execFileSync(process.execPath, [HOOK_PATH], { input: payload, encoding: 'utf8', env });
                    assertContains(out, hook.MARKER_START);
                    assertTrue(execFileSync(process.execPath, [HOOK_PATH], { input: 'not json', encoding: 'utf8', env, stdio: ['pipe', 'pipe', 'pipe'] }) === '', 'unparseable stdin stays silent');
                    // Codex runs hooks through `node -e … require(hook)` with the hook path as argv[1]; a second session, so the first delivery does not mute it
                    const launchedPayload = JSON.stringify(event('add an LLM call to the reply service', 's2'));
                    const launched = spawnSync(process.execPath, ['-e', 'process.chdir(process.env.CLAUDE_PROJECT_DIR); require(process.argv[1]);', HOOK_PATH],
                        { input: launchedPayload, encoding: 'utf8', env, windowsHide: true });
                    assertTrue(launched.status === 0, `launcher exit ${launched.status}: ${launched.stderr}`);
                    assertContains(launched.stdout, hook.MARKER_START);
                } finally {
                    removeDir(project);
                }
            }
        },
        {
            // Given the framework repo's settings, .ck.json schema and option help
            // When they are inspected
            // Then the hook is wired and its enabled option is configurable and documented
            name: '[ai-feature-route] TC-AIR-008 registered on UserPromptSubmit, SubagentStart and SessionStart compact and configurable in the .ck.json schema (framework repo)',
            fn: () => {
                if (!isFrameworkRepo(REPO_ROOT)) return;
                const settings = require(path.join(REPO_ROOT, '.claude', 'settings.json'));
                const wired = (event, matcher) => (settings.hooks[event] || [])
                    .filter(group => matcher === undefined || group.matcher === matcher)
                    .some(group => group.hooks.some(h => h.command.includes('ai-feature-route.cjs')));
                assertTrue(wired('UserPromptSubmit'), 'hook must be wired on prompts');
                assertTrue(wired('SubagentStart') && wired('SessionStart', 'compact'), 'hook must be wired on every sub-agent start and the compaction report');
                const { CK_SCHEMA } = require(path.join(HOOKS_DIR, 'lib', 'ck-config-schema.cjs'));
                assertTrue(CK_SCHEMA[hook.SETTINGS_SECTION] && CK_SCHEMA[hook.SETTINGS_SECTION].properties.enabled.type === 'boolean', 'aiFeatureRoute.enabled is a schema field');
                const { CK_CONFIG_DESCRIBES } = require(path.join(REPO_ROOT, '.claude', 'scripts', 'lib', 'config-option-describes.cjs'));
                assertTrue(Boolean(CK_CONFIG_DESCRIBES[hook.SETTINGS_SECTION]) && Boolean(CK_CONFIG_DESCRIBES[`${hook.SETTINGS_SECTION}.enabled`]), 'both options carry help text');
                assertContains(CK_CONFIG_DESCRIBES[`${hook.SETTINGS_SECTION}.enabled`], hook.ENV_SWITCH);
            }
        },
        {
            // INTENT: naming a technique is not asking for work on it — the directive would be pure cost on a question.
            // Given pairs of a question and an action prompt about the same technique
            // When each is detected
            // Then only the action routes
            name: '[ai-feature-route] TC-AIR-009 the route needs an action on the technique: the same prompt with and without an action verb',
            fn: () => {
                const pairs = [
                    ['what is RAG?', 'build a RAG pipeline'],
                    ['explain how embeddings work', 'add embeddings to the search box'],
                    ['tell me about prompt injection', 'protect the chatbot from prompt injection'],
                    ['the OpenAI API is popular', 'integrate the OpenAI API']
                ];
                for (const [question, action] of pairs) {
                    assertTrue(hook.detectAiFeature(question) === null, `no action, no route: ${JSON.stringify(question)}`);
                    assertTrue(hook.detectAiFeature(action) !== null, `action routes: ${JSON.stringify(action)}`);
                }
            }
        },
        {
            // INTENT: the framework is built on models, so its own maintenance prompts mention AI constantly.
            // Given prompts carrying zero, one or two framework cues
            // When each is detected
            // Then silence follows the cue rules: two cues silence, one cue keeps only concrete techniques
            name: '[ai-feature-route] TC-AIR-010 meta prompts: two framework cues silence, one cue keeps only concrete product techniques',
            fn: () => {
                const routed = prompt => hook.detectAiFeature(prompt) !== null;
                // Zero cues: generic vocabulary routes
                assertTrue(routed('add guardrails around the model output'), 'no cue: generic routes');
                // One cue: generic is framework maintenance, a concrete technique is still a product feature
                assertTrue(!routed('add guardrails to the hook'), 'one cue + generic: silent');
                assertTrue(routed('add a RAG step to the workflow'), 'one cue + concrete: routes');
                assertTrue(!routed('do not waste tokens when we plan an AI feature'), 'a waste cue + generic AI feature: silent');
                // Two distinct cues: silent even when a concrete technique is named
                assertTrue(!routed('add a RAG step to the workflow hook'), 'two cues + concrete: silent');
                assertTrue(!routed('review the skills and sub-agents that use OpenAI embeddings'), 'skills + sub-agents + concrete: silent');
                // The cue count is over DISTINCT cues, not repeats of one word
                assertTrue(routed('add a RAG step to the workflow, then a second workflow, then a third workflow'), 'repeats of one cue are one cue');
                // A protocol cue never swallows the Model Context Protocol phrase
                assertTrue(routed('set up a Model Context Protocol server for our product'), 'MCP phrase is not a framework cue');
            }
        },
        {
            // INTENT: at most one directive per session scope and re-arm window; compaction re-arms it; no id, no delivery.
            // Given sessions with a first delivery, a host-reported compaction and a transcript compaction
            // When matching prompts arrive
            // Then each session gets one directive per window, a compaction re-arms it, and no session id means no delivery
            name: '[ai-feature-route] TC-AIR-011 delivered once per session window; a compaction (host-reported or in the transcript) re-arms it',
            fn: async () => {
                const dir = makeProject();
                const store = path.join(dir, 'store');
                const prompt = 'add a RAG pipeline with embeddings to the search service';
                try {
                    const first = await deliver(store, event(prompt, 'sess-a'), T0);
                    assertContains(first.out, hook.MARKER_START);
                    assertTrue(first.written.length === 1, 'the first matching prompt writes one directive');
                    const second = await deliver(store, event('now review the OpenAI tool-calling agent for prompt injection', 'sess-a'), T0 + MINUTE);
                    assertTrue(second.out === '' && second.written.length === 0, 'the second matching prompt in the window is silent, whatever its wording');
                    const other = await deliver(store, event(prompt, 'sess-b'), T0 + MINUTE);
                    assertContains(other.out, hook.MARKER_START); // another session has its own window
                    const noSession = await deliver(store, { hook_event_name: 'UserPromptSubmit', prompt }, T0);
                    assertTrue(noSession.out === '', 'a prompt with no session id cannot be de-duplicated, so it is never delivered');
                    // Host-reported condensation (SessionStart compact|clear, recorded by the convention hook in the same store)
                    ledger.recordSessionCompaction(store, 'sess-a', T0 + 2 * MINUTE);
                    const afterHostCompaction = await deliver(store, event(prompt, 'sess-a'), T0 + 3 * MINUTE);
                    assertContains(afterHostCompaction.out, hook.MARKER_START);
                    assertTrue((await deliver(store, event(prompt, 'sess-a'), T0 + 4 * MINUTE)).out === '', 'silent again after the re-armed delivery');
                    // Compaction mark read from the transcript
                    const transcript = path.join(dir, 'transcript.jsonl');
                    fs.writeFileSync(transcript, '{"type":"user","message":{"content":"start"}}\n');
                    const inputWith = (session, extra) => ({ ...event(prompt, session), transcript_path: transcript, ...extra });
                    assertContains((await deliver(store, inputWith('sess-c'), T0)).out, hook.MARKER_START);
                    assertTrue((await deliver(store, inputWith('sess-c'), T0 + MINUTE)).out === '', 'transcript without a compaction: silent');
                    fs.appendFileSync(transcript, `${JSON.stringify({ type: 'system', subtype: 'compact_boundary', timestamp: new Date(T0 + 2 * MINUTE).toISOString() })}\n`);
                    assertContains((await deliver(store, inputWith('sess-c'), T0 + 3 * MINUTE)).out, hook.MARKER_START);
                } finally {
                    removeDir(dir);
                }
            }
        },
        {
            // INTENT: zero cost on a prompt with no AI vocabulary — no heavy module is even loaded, and no state is written.
            // Given a prompt with no AI vocabulary
            // When the hook runs
            // Then no heavy module is loaded and no state is written
            name: '[ai-feature-route] TC-AIR-012 a prompt with no AI vocabulary loads no heavy module and writes no state',
            fn: () => {
                const project = makeProject();
                try {
                    const driver = [
                        'const hook = require(process.argv[1]);',
                        "const out = hook.evaluate({ hook_event_name: 'UserPromptSubmit', session_id: 's', prompt: 'refactor the settings loader and rename the helper' }, { env: {}, rawSettings: {} });",
                        "const heavy = Object.keys(require.cache).filter(f => /prompt-route-utils|prompt-ledger-store|convention-ledger|file-conventions/.test(f));",
                        'process.stdout.write(JSON.stringify({ out, heavy }));'
                    ].join(' ');
                    const result = spawnSync(process.execPath, ['-e', driver, HOOK_PATH], { encoding: 'utf8', env: cleanEnv(project), windowsHide: true });
                    assertTrue(result.status === 0, `exit ${result.status}: ${result.stderr}`);
                    const parsed = JSON.parse(result.stdout);
                    assertTrue(parsed.out === '', 'silent');
                    assertTrue(parsed.heavy.length === 0, `no heavy module loaded, got ${JSON.stringify(parsed.heavy)}`);
                    const silent = runHook(project, event('refactor the settings loader and rename the helper'));
                    assertTrue(silent.status === 0 && silent.stdout === '', 'silent at the process boundary');
                    assertTrue(fs.readdirSync(path.join(project, 'store')).length === 0, 'a silent prompt writes nothing to the delivery store');
                } finally {
                    removeDir(project);
                }
            }
        },
        {
            // Given a session whose latest recorded user prompt asks for AI-feature work
            // When a sub-agent starts, the host reports a compaction, or the same sub-agent starts again
            // Then each new scope gets the directive once as its event's context, and a compaction delivers at once
            name: '[ai-feature-route] TC-AIR-014 sub-agent start and compaction route the latest recorded prompt: once per spawn, at once after a compaction',
            fn: async () => {
                const dir = makeProject();
                const store = path.join(dir, 'store');
                const deps = { projectDir: dir };
                const agentStart = id => ({ hook_event_name: 'SubagentStart', session_id: 'sess-p', agent_id: id, agent_type: 'general-purpose' });
                const compaction = { hook_event_name: 'SessionStart', session_id: 'sess-p', source: 'compact' };
                const context = result => JSON.parse(result.out).hookSpecificOutput;
                try {
                    assertTrue((await deliver(store, agentStart('a1'), T0, deps)).out === '', 'no recorded prompt: silent');
                    require('../lib/hook-runner.cjs').recordUserPrompts(dir, 'sess-p', ['add a RAG pipeline with embeddings to the search service']);
                    const spawned = context(await deliver(store, agentStart('a1'), T0, deps));
                    assertTrue(spawned.hookEventName === 'SubagentStart', 'agent start answers with its own envelope');
                    assertContains(spawned.additionalContext, hook.MARKER_START);
                    assertTrue((await deliver(store, agentStart('a1'), T0 + MINUTE, deps)).out === '', 'the same spawn is deduplicated');
                    assertContains((await deliver(store, agentStart('a2'), T0 + MINUTE, deps)).out, hook.MARKER_START);
                    // The main scope has its own record: a prompt delivers, then a compaction delivers again at once
                    assertContains((await deliver(store, event('add a RAG pipeline with embeddings to the search service', 'sess-p'), T0, deps)).out, hook.MARKER_START);
                    const compacted = context(await deliver(store, compaction, T0 + 2 * MINUTE, deps));
                    assertTrue(compacted.hookEventName === 'SessionStart', 'compaction answers with its own envelope');
                    assertContains(compacted.additionalContext, hook.MARKER_START);
                    // A later non-AI prompt becomes the latest one: nothing routes for the next spawn
                    require('../lib/hook-runner.cjs').recordUserPrompts(dir, 'sess-p', ['add a RAG pipeline', 'rename the settings page']);
                    assertTrue((await deliver(store, agentStart('a3'), T0 + 3 * MINUTE, deps)).out === '', 'only the latest prompt counts');
                } finally {
                    removeDir(dir);
                }
            }
        },
        {
            // INTENT: the directive is re-sent only when the conversation could have lost it — after a compaction, or ~150K tokens of growth —
            // and never while it is still inside the window. The assertions are on what the hook OWNS: whether a directive is emitted.
            // Given a delivered directive and a transcript of the conversation
            // When transcript growth reaches the window (one byte below, then exactly at it), a Codex compaction line is appended, and a second match repeats
            // Then nothing is emitted inside the window or on a repeat, and a directive is emitted at the window edge and after a Codex compaction
            name: '[ai-feature-route] TC-AIR-013 re-arm: silent inside the ~150K-token window and on a repeat, delivered at the window edge and after a Codex compaction marker',
            fn: async () => {
                const { BYTES_PER_TOKEN } = require(path.join(HOOKS_DIR, 'lib', 'file-conventions.cjs'));
                const windowBytes = hook.DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN;
                assertTrue(windowBytes === 3300000, `the window is 150000 tokens x 22 bytes, got ${windowBytes}`);
                const dir = makeProject();
                const store = path.join(dir, 'store');
                const prompt = 'add a RAG pipeline with embeddings to the search service';
                const start = '{"type":"user","message":{"content":"start"}}\n';
                /** Append one filler transcript line of exactly `bytes` bytes (newline included). */
                const grow = (file, bytes) => {
                    const shell = '{"type":"user","message":{"content":""}}\n';
                    fs.appendFileSync(file, shell.replace('""', `"${'x'.repeat(bytes - shell.length)}"`));
                };
                const ask = (session, transcript, now) => deliver(store, { ...event(prompt, session), transcript_path: transcript }, now);
                const delivered = result => result.out.includes(hook.MARKER_START) && result.written.length === 1;
                try {
                    // Window edge: growth of windowBytes - 1 is still inside, windowBytes is the edge
                    const growing = path.join(dir, 'growing.jsonl');
                    fs.writeFileSync(growing, start);
                    assertTrue(delivered(await ask('sess-window', growing, T0)), 'the first matching prompt is delivered');
                    grow(growing, windowBytes - 1);
                    const inside = await ask('sess-window', growing, T0 + MINUTE);
                    assertTrue(inside.out === '' && inside.written.length === 0, 'one byte inside the window: still present, nothing emitted');
                    fs.appendFileSync(growing, '\n');
                    assertTrue(delivered(await ask('sess-window', growing, T0 + 2 * MINUTE)), 'growth reached the window: the directive is delivered again');
                    const repeat = await ask('sess-window', growing, T0 + 3 * MINUTE);
                    assertTrue(repeat.out === '' && repeat.written.length === 0, 'a second match inside the new window stays silent');
                    grow(growing, 4096);
                    assertTrue((await ask('sess-window', growing, T0 + 4 * MINUTE)).out === '', 'a small amount of growth inside the new window stays silent');

                    // Codex marks a compaction with a `compacted` line in the transcript
                    const codex = path.join(dir, 'codex.jsonl');
                    fs.writeFileSync(codex, start);
                    assertTrue(delivered(await ask('sess-codex', codex, T0)), 'first delivery in a Codex-style session');
                    assertTrue((await ask('sess-codex', codex, T0 + MINUTE)).out === '', 'silent while nothing was compacted');
                    fs.appendFileSync(codex, `${JSON.stringify({ type: 'compacted', timestamp: new Date(T0 + 2 * MINUTE).toISOString() })}\n`);
                    assertTrue(delivered(await ask('sess-codex', codex, T0 + 3 * MINUTE)), 'the compacted marker re-arms the directive');
                    assertTrue((await ask('sess-codex', codex, T0 + 4 * MINUTE)).out === '', 'and it is silent again afterwards');
                } finally {
                    removeDir(dir);
                }
            }
        }
    ]
};
