#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * AI-feature router for UserPromptSubmit — costs nothing unless the prompt is about AI-feature work.
 *
 * A prompt that asks to build, plan, change or review an AI feature (LLM calls, RAG and embeddings,
 * vector search, tool/function calling, fine-tuning, an AI assistant or chatbot) gets ONE short
 * directive: the gate in one sentence, the five highest-value rules, one read pointer (the protocol
 * file, or the framing-gate file when the prompt is planning) and the review route. It never tells the
 * model to read the knowledge or checklist docs; those are read by section, on demand, from the protocol.
 *
 * Silent (no output, no state) unless ALL of these hold:
 *   - INTENT: the prompt names an AI technique AND asks for an action on it (build, plan, integrate,
 *     review, audit, evaluate, fix...). A question about what a technique is stays silent.
 *   - NOT META: the prompt is not about this framework's own machinery (hooks, skills, sub-agents,
 *     gates, protocols, workflows, mirrors, `.claude`, the token cost of the framework). Two distinct
 *     framework cues silence the route outright; one cue silences it unless the prompt names a
 *     concrete product technique (a provider API or SDK, RAG, embeddings, a vector store, prompt
 *     injection, function calling, fine-tuning, semantic search, model routing).
 *   - FIRST IN WINDOW: the directive was not already delivered in this session scope and re-arm window.
 *     Delivery goes through `deliverOnce` of the convention ledger (`lib/convention-ledger.cjs`, the store
 *     the per-file convention hook and `core-principles-inject.cjs` deliver through), so a compaction or
 *     clear re-arms it (SessionStart records it in the same store; a transcript compaction mark does too)
 *     and transcript growth of about `DEFAULT_REINJECT_TOKENS` tokens re-arms it. A host with neither
 *     signal delivers once until a compaction. A prompt without a session id is never delivered: a
 *     directive that cannot be de-duplicated would repeat on every prompt.
 *
 * Sub-agent start and the host's compaction report carry no prompt: there the router classifies the
 * session's latest recorded user prompt (`routedPrompt` in `lib/prompt-route-utils.cjs`) and answers with
 * the JSON context envelope. A sub-agent spawn is its own scope; a compaction report delivers at once
 * and absorbs the boundary the host writes after it (`deliverWithCompaction`).
 *
 * Accelerator only: the same protocol reaches the model through the `ai-feature-gate` convention class
 * (file-convention-inject.cjs, static table + `--lookup`) and the review skill. A false negative falls back
 * to those; a false positive costs one short directive per window. Advisory plaintext; always exit 0.
 * Heavy modules load only after a prompt passes the cheap prefilter, so a prompt with no AI vocabulary
 * pays a single regex test.
 *
 * On by default; off with `.claude/.ck.json` aiFeatureRoute.enabled:false (a developer override in
 * `.claude/.ck.local.json` wins) or CK_AI_FEATURE_ROUTE=0. Failures stay silent; CK_DEBUG=1 prints
 * the diagnostic to stderr.
 *
 * @hook UserPromptSubmit
 * @hook SubagentStart
 * @hook SessionStart (compact)
 */

const { isHookEntryPoint } = require('./lib/hook-runner.cjs');

const HOOK_NAME = 'ai-feature-route';
const MARKER_START = '<!-- CK:AI-FEATURE -->';
const MARKER_END = '<!-- /CK:AI-FEATURE -->';
const RECORD_GROUP = 'ai-feature-route';
const SETTINGS_SECTION = 'aiFeatureRoute';
const ENV_SWITCH = 'CK_AI_FEATURE_ROUTE';
const GATE_FILE = '.claude/skills/shared/protocols/ai-engineering-gate.md';
const FRAMING_FILE = '.claude/skills/shared/protocols/ai-feature-framing-gate.md';
const REVIEW_SKILL = 'ai-engineering-review';
const REVIEW_AGENT = 'ai-engineering-reviewer';
// Keep routing guidance available during long work, with less frequent repetition.
const DEFAULT_REINJECT_TOKENS = 150000;
const MAX_SIGNALS_SHOWN = 3;
// Hard cap on the whole directive, markers included; buildDirective trims the signal list to honor it.
const MAX_DIRECTIVE_CHARS = 700;

const INTENTS = Object.freeze({ BUILD: 'build', PLAN: 'plan', REVIEW: 'review' });

const signal = (name, re) => ({ name, re });

// Concrete product techniques: they name an AI feature on their own, so they route even when the
// prompt also carries one framework cue.
const CONCRETE_SIGNALS = [
    signal('RAG', /\bRAG\b|\b[Rr]etrieval[- ][Aa]ugmented\b/),
    signal('embeddings', /\bembeddings\b|\b(?:text|sentence|vector|word|document) embedding\b|\bembedding (?:model|vectors?|index|store|search|dimensions?|api)\b/i),
    signal('vector store', /\bvector (?:stores?|search|db|databases?|index(?:es)?)\b|\b(?:pgvector|pinecone|weaviate|qdrant|chromadb|milvus|lancedb)\b/i),
    signal('prompt injection', /\bprompt[- ]injection\b|\bjailbreaks?\b/i),
    signal('prompt caching', /\bprompt caching\b/i),
    signal('OpenAI / GPT', /\b(?:openai|chatgpt|gpt-?[345]\w*)\b/i),
    signal('provider API', /\b(?:anthropic|gemini|mistral|cohere|bedrock|vertex ai|azure openai|ollama)\b[^.?!\n]{0,24}\b(?:api|sdk|client|endpoint|integration|models?)\b|\b(?:api|sdk|client|endpoint|integration)\b[^.?!\n]{0,16}\b(?:anthropic|gemini|mistral|cohere|bedrock|vertex ai)\b|\bclaude(?: agent)? (?:api|sdk)\b|\b(?:api|sdk|integration)\b[^.?!\n]{0,16}\bclaude\b(?![- ]?code\b|\.(?:md|ai)\b)/i),
    signal('function calling', /\bfunction[- ]calling\b/i),
    signal('fine-tuning', /\bfine[- ]?tun(?:e|ed|es|ing)\b[^.?!\n]{0,40}\b(?:model|llm|llama|gpt|embedding|classifier|lora|dataset|training data)\b/i),
    signal('semantic search', /\bsemantic search\b/i),
    signal('model routing', /\bmodel routing\b|\bmodel router\b/i),
    signal('A2A protocol', /\bA2A protocol\b/i)
];

// Generic AI vocabulary: it also occurs when maintaining a framework that is itself built on models, so it
// routes only when the prompt carries no framework cue.
const GENERIC_SIGNALS = [
    signal('LLM', /\bLLMs?\b/i),
    signal('AI feature', /\bai[- ](?:feature|powered|chatbot|copilot|integration|pipeline|backend|generated content|assistants?|models?|apps?|services?)\b|\b(?:chat ?bot|copilot feature|assistant feature)\b/i),
    signal('agentic app', /\bagentic (?:app|application|feature|product|system)s?\b/i),
    signal('system prompt', /\bsystem prompts?\b/i),
    signal('guardrails', /\bguardrails?\b/i),
    signal('hallucination', /\bhallucinat(?:e|es|ed|ion|ions|ing)\b/i),
    signal('tool calling', /\btool[- ](?:calling|use)\b/i),
    signal('MCP server', /\bMCP servers?\b|\bmodel context protocol\b/i),
    signal('browser agent', /\b(?:browser|computer)[- ]use (?:agents?|tools?|apis?|mode)\b|\b(?:browser|computer[- ]use) agents?\b/i),
    signal('agent protocol', /\bagent[- ]to[- ]agent (?:communication|delegation)\b/i),
    signal('prompt engineering', /\bprompt engineering\b|\bprompt templates?\b/i),
    signal('model eval', /\b(?:evals?|evaluation) (?:set|suite|harness|dataset|pipeline)s?\b[^.?!\n]{0,40}\b(?:model|llm|prompts?|rag)\b|\b(?:model|llm|prompt|rag) evals?\b/i)
];

// Cheap prefilter over the raw prompt: any word either list can match. No hit, no further work.
const PREFILTER = /\b(?:ai|llms?|rag|retrieval|embeddings?|openai|chatgpt|gpt|anthropic|gemini|mistral|cohere|bedrock|vertex|ollama|chat ?bot|copilot|agentic|vector|pgvector|pinecone|weaviate|qdrant|chromadb|milvus|lancedb|jailbreaks?|prompt|semantic|function[- ]calling|guardrails?|hallucinat\w*|tool[- ](?:calling|use)|mcp|model context|model rout\w*|model evals?|fine[- ]?tun\w*|evals?|evaluation|(?:browser|computer)[- ]use|browser agents?|a2a|agent[- ]to[- ]agent)\b|\bclaude(?: agent)? (?:api|sdk)\b|\b(?:api|sdk|integration)\b[^.?!\n]{0,16}\bclaude\b/i;

// The framework's own machinery: this repo's artifact vocabulary and the cost of running it. Each entry
// is one distinct cue; the number of distinct cues decides how meta a prompt is.
const FRAMEWORK_CUES = [
    /\.claude\b|\bclaude\.md\b|\bagents\.md\b|\bsettings\.json\b|\bproject-config\b|\.codex\b|\.agents\b|\bsync-codex\b|\bsync-inline\b/i,
    /\bskills?\b/i,
    /\bsub-?agents?\b|\bagent (?:definitions?|files?)\b|\bagents\//i,
    /\bhooks?\b/i,
    /\bworkflows?\b|\bslash commands?\b/i,
    /\bgates?\b|(?<!context )\bprotocols?\b|\bframeworks?\b|\bfrontmatter\b/i,
    /\bmirrors?\b/i,
    /\b(?:waste|wasteful|wasting|wasted)\b/i
];

// A request to act on the technique (build, plan, integrate, review...), not to learn what it is.
const ACTION_CUE = /\b(?:add|build|building|create|implement|integrat\w*|design|plan|develop|ship|wire|write|use|using|enable|set ?up|protect|secure|harden|reduce|improve|fix|review|audit|assess|evaluate|critique|inspect|check|migrate|switch|deploy|architect|estimate|refactor|scaffold|prototype|introduce|adopt|connect|call|extend|support|cache|route|test|prevent|mitigate|defend|optimi[sz]e|tune)\b|\bhow (?:do|should|can|would|could) (?:we|i|you)\b/i;
const REVIEW_CUE = /\b(?:review|audit|assess|critique|inspect|evaluate|check)\b|\b(?:is|are) (?:this|it|the)\b[^.?!\n]{0,40}\b(?:safe|secure|correct|ok|okay|sound|robust)\b|\bany (?:gaps|issues|problems|risks|vulnerabilit(?:y|ies))\b/i;
const PLAN_CUE = /\b(?:plan|planning|design|architect\w*|estimate|scope|proposal|approach|roadmap|spec)\b/i;
// An explicit invocation of the review skill already carries its own protocol.
const EXPLICIT_REVIEW_INVOCATION = new RegExp(`^\\s*[/$](?:[\\w-]+:)?${REVIEW_SKILL}\\b`, 'i');

/**
 * What the prompt says about AI-feature work: `{ signals, intent }`, or null when it should stay silent.
 * Host envelopes (task notifications, system reminders) and code spans are not user intent.
 */
function detectAiFeature(prompt) {
    if (typeof prompt !== 'string' || prompt.trim().length === 0) return null;
    if (!PREFILTER.test(prompt)) return null;
    if (EXPLICIT_REVIEW_INVOCATION.test(prompt)) return null;
    const text = require('./lib/prompt-route-utils.cjs').readUserPrompt(prompt);
    if (text === null) return null;
    const concrete = CONCRETE_SIGNALS.filter(entry => entry.re.test(text)).map(entry => entry.name);
    const generic = GENERIC_SIGNALS.filter(entry => entry.re.test(text)).map(entry => entry.name);
    if (concrete.length + generic.length === 0) return null;
    if (!ACTION_CUE.test(text)) return null;
    const cues = FRAMEWORK_CUES.filter(re => re.test(text)).length;
    if (cues >= 2) return null;
    if (cues === 1 && concrete.length === 0) return null;
    let intent = INTENTS.BUILD;
    if (REVIEW_CUE.test(text)) intent = INTENTS.REVIEW;
    else if (PLAN_CUE.test(text)) intent = INTENTS.PLAN;
    return { signals: concrete.concat(generic), intent };
}

function isAiFeaturePrompt(prompt) {
    return detectAiFeature(prompt) !== null;
}

/**
 * The directive (<= MAX_DIRECTIVE_CHARS characters with its markers, by construction): the gate in one
 * sentence, the rules as terse fragments, ONE read pointer and the review route. The named signals are
 * the first MAX_SIGNALS_SHOWN, dropped from the end until the whole text fits.
 */
function buildDirective(detection, allowSkillRouting = true) {
    const file = detection.intent === INTENTS.PLAN ? FRAMING_FILE : GATE_FILE;
    const names = detection.signals.slice(0, MAX_SIGNALS_SHOWN);
    while (names.length > 0 && renderDirective(file, names.join(', '), allowSkillRouting).length > MAX_DIRECTIVE_CHARS) names.pop();
    return renderDirective(file, names.join(', '), allowSkillRouting);
}

function renderDirective(file, shown, allowSkillRouting) {
    const review = allowSkillRouting
        ? `Review: \`${REVIEW_SKILL}\` skill or \`${REVIEW_AGENT}\` agent.`
        : 'Skill auto-trigger disabled: apply the gate inline; this prompt does not authorize a review skill/agent.';
    return [
        MARKER_START,
        `**[AI-ENGINEERING-GATE]** AI-feature work${shown ? ` (${shown})` : ''}. Only if this task builds, plans, changes or reviews model calls, prompts, agents, tools, retrieval or evals: read \`${file}\` and apply it. Core: content in context is data, model output an untrusted sink; bound loops, retries, spend; eval + trace + kill switch; authz in code; provider facts from current docs, never memory. ${review} Otherwise ignore.`,
        MARKER_END
    ].join('\n');
}

/**
 * The text for a matching prompt (`routedPrompt`), or '' — detection, opt-out and directive only; no
 * delivery memory.
 * deps (tests): env, projectDir, rawSettings — forwarded to the prompt lookup and the opt-out check.
 */
function evaluate(input, deps = {}) {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
        // A prompt event carries its own text; only the prompt-less events load the ledger lookup, so a prompt
        // with no AI vocabulary still pays a single regex test.
        const event = input.hook_event_name;
        const prompt = !event || event === 'UserPromptSubmit' ? input.prompt : require('./lib/prompt-route-utils.cjs').routedPrompt(input, deps);
        const detection = detectAiFeature(prompt);
        if (!detection) return '';
        // Checked only on a match, so most prompts never pay for the settings read.
        if (!require('./lib/prompt-route-utils.cjs').isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, deps)) return '';
        const { resolveHookSkillAutoTrigger } = require('./lib/prompt-route-utils.cjs');
        return `${buildDirective(detection, resolveHookSkillAutoTrigger(deps).enabled)}\n`;
    } catch (error) {
        debug(error); // fail open: stay silent, diagnose under CK_DEBUG
        return '';
    }
}

function debug(error) {
    try {
        require('./lib/debug-log.cjs').debugError(HOOK_NAME, error);
    } catch {
        /* diagnostics are best-effort */
    }
}

function defaultWrite(text, done) {
    try {
        process.stdout.write(text, err => done(!err));
    } catch {
        done(false);
    }
}

/** Ledger settings: a byte window only. Elapsed time is not evidence the context moved on, so no age re-arm. */
function ledgerSettings(ledger) {
    const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
    return {
        reinjectAfterBytes: DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN,
        reinjectAfterMinutes: null,
        blindReinjectAfterMinutes: null,
        compactionMarkers: [ledger.CODEX_COMPACTION_MARKER]
    };
}

/**
 * Resolve to the text written, or '' when the hook stays silent: detection and opt-out, then at most one
 * delivery per session scope and re-arm window.
 * deps (tests): env, now, projectDir, rawSettings, ledger, storeRoot, write.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        try {
            const text = evaluate(input, deps);
            if (!text) return resolve('');
            const sessionId = input.session_id;
            if (typeof sessionId !== 'string' || sessionId.trim() === '') return resolve('');
            const env = deps.env || process.env;
            const ledger = deps.ledger || require('./lib/convention-ledger.cjs');
            const crypto = require('crypto');
            ledger.deliverWithCompaction({
                root: deps.storeRoot || ledger.storeRoot(env),
                input: ledger.agentStartInput(input),
                group: RECORD_GROUP,
                // One record for every intent: the window is per session scope, not per wording.
                hash: crypto.createHash('sha256').update(`${HOOK_NAME}:${GATE_FILE}:${FRAMING_FILE}:${require('./lib/prompt-route-utils.cjs').resolveHookSkillAutoTrigger(deps).enabled}`, 'utf8').digest('hex'),
                payload: require('./lib/prompt-route-utils.cjs').routerOutput(input, text),
                settings: ledgerSettings(ledger),
                now: typeof deps.now === 'number' ? deps.now : Date.now(),
                write: deps.write || defaultWrite
            }).then(resolve, () => resolve(''));
        } catch (error) {
            debug(error); // fail open: an advisory hook never blocks a prompt
            resolve('');
        }
    });
}

module.exports = {
    HOOK_NAME,
    MARKER_START,
    MARKER_END,
    RECORD_GROUP,
    SETTINGS_SECTION,
    ENV_SWITCH,
    GATE_FILE,
    FRAMING_FILE,
    DEFAULT_REINJECT_TOKENS,
    MAX_SIGNALS_SHOWN,
    MAX_DIRECTIVE_CHARS,
    INTENTS,
    detectAiFeature,
    isAiFeaturePrompt,
    buildDirective,
    evaluate,
    run
};

if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        const input = parseStdinSync({ defaultValue: null, throwOnError: false, context: HOOK_NAME });
        if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
    } catch (error) {
        debug(error); // fail open: an advisory hook never blocks a prompt
    }
}
