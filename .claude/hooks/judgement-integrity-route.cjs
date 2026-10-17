#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Judgement-integrity router for UserPromptSubmit.
 *
 * When the user's prompt asks for a verdict — confirm a theory, judge or evaluate
 * something, name a root cause, or hunt for gaps/issues — inject the anti-confirmation-
 * bias answer-review directive, naming the lean the prompt carries: a gap hunt presumes
 * problems exist, a stated theory presumes it is right, an evaluation presumes the named
 * option is the one to weigh. The directive body is the canonical
 * `SYNC:judgement-integrity:reminder` from `.claude/skills/shared/sync-inline-versions.md`,
 * so the hook and the protocol text never drift.
 *
 * The universal `critical-thinking-mindset` protocol carries the judgement-integrity rule for every
 * task; this hook adds the lean-specific directive on the prompt that asks. Runs on every prompt
 * (no dedup ledger): a judgement question can arrive at any point and the directive only helps on
 * the prompt that asks. Detection is a small heuristic and the directive is conditional, so a false
 * positive costs a few lines of context and a false negative falls back to the universal rule.
 *
 * A sub-agent start and the host's compaction report carry no prompt, so there the router classifies
 * the session's latest recorded user prompt (`routedPrompt`): a delegated agent works on the verdict
 * the user asked for, and a compaction mid-turn drops the directive the turn was answering. Those
 * events answer with the JSON context envelope (`routerOutput`); no prompt ledger keeps them silent.
 *
 * Mirrored to Codex and OpenCode by the hook sync generators, which is why the directive
 * names the skill host-neutrally. Advisory plaintext on a prompt; always exit 0.
 *
 * On by default; off with `.claude/.ck.json` judgementIntegrityRoute.enabled:false (a developer
 * override in `.claude/.ck.local.json` wins) or CK_JUDGEMENT_INTEGRITY_ROUTE=0. Failures stay
 * silent; CK_DEBUG=1 prints the diagnostic to stderr.
 *
 * @hook UserPromptSubmit
 * @hook SubagentStart
 * @hook SessionStart (compact)
 */

const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { debugError } = require('./lib/debug-log.cjs');
const { readUserPrompt, isRouterEnabled, routedPrompt, routerOutput } = require('./lib/prompt-route-utils.cjs');

const HOOK_NAME = 'judgement-integrity-route';
const MARKER_START = '<!-- CK:JUDGEMENT-INTEGRITY -->';
const MARKER_END = '<!-- /CK:JUDGEMENT-INTEGRITY -->';
const SYNC_TAG = 'judgement-integrity:reminder';
const SETTINGS_SECTION = 'judgementIntegrityRoute';
const ENV_SWITCH = 'CK_JUDGEMENT_INTEGRITY_ROUTE';

const LEANS = Object.freeze({
    PROBLEM_PRESUMED: 'problem-presumed',
    CONFIRMATION_SOUGHT: 'confirmation-sought',
    EVALUATION: 'evaluation'
});

const FAULT_NOUNS =
    '(?:gaps?|issues?|problems?|bugs?|flaws?|holes?|risks?|mistakes?|errors?|weakness(?:es)?|loopholes?|edge[- ]cases?|smells?|defects?|regressions?|vulnerabilit(?:y|ies)|shortcomings?|missing (?:pieces?|parts?|cases?|steps?))';

// Each pattern is `strong` (an explicit verdict ask), weak (a phrase that also appears in ordinary
// fix/build requests: "fix any errors", "I have an issue", "why does it crash", "write a critique section")
// — counted only when the prompt is not an action request (see ACTION_REQUEST) — or asked (a stated belief
// or check that is a verdict ask only when the prompt asks a question: "I think X, right?" asks,
// "I think we should add a retry" and "verify that the build passes" instruct).
const strong = re => ({ re, weak: false, asked: false });
const weak = re => ({ re, weak: true, asked: false });
const asked = re => ({ re, weak: false, asked: true });

// Gap hunt: "any gaps?", "does it have issues", "find bugs in", "what's wrong with", "anything missing".
const PROBLEM_PATTERNS = [
    strong(new RegExp(`\\b(?:find|finds|finding|review|reviewing|spot|identify|list|look for|hunt for|detect|audit for|scan for|are there|is there)\\b[^.?!\\n]{0,48}\\b${FAULT_NOUNS}`, 'i')),
    strong(new RegExp(`\\b(?:does|do|did|has|have) (?:this|it|that|these|those|the|my|our|your)\\b[^.?!\\n]{0,48}\\b${FAULT_NOUNS}`, 'i')),
    weak(new RegExp(`\\b(?:any|anything|some|check|checking|has|have|having|see)\\b[^.?!\\n]{0,48}\\b${FAULT_NOUNS}`, 'i')),
    strong(/\bwhat(?:'s| is| are)? (?:wrong|missing|broken|off)\b/i),
    strong(/\b(?:anything|something) (?:wrong|missing|broken|off)\b/i),
    strong(/\b(?:poke holes|tear (?:it|this) apart|find fault)\b/i)
];

// Stated theory or expected answer: "I think X", "my theory", "am I right", "confirm that", "isn't it".
const CONFIRMATION_PATTERNS = [
    asked(/\b(?:i|we) (?:think|believe|suspect|guess|feel|assume|bet|reckon|am pretty sure|am sure)\b/i),
    strong(/\b(?:my|our) (?:theory|hypothesis|guess|intuition|hunch|understanding|assumption|reading|take)\b/i),
    strong(/\bam i (?:right|wrong|correct|missing something)\b/i),
    strong(/\b(?:confirm|verify|validate) (?:my|our)\b/i),
    asked(/\b(?:confirm|verify|validate) (?:that|whether|if)\b/i),
    strong(/\b(?:is it true|isn'?t it|aren'?t (?:they|we)|doesn'?t it|don'?t you (?:think|agree)|right\?|correct\?|agree\?)/i),
    weak(/\b(?:it|this|that) (?:must|has to) be\b/i),
    strong(/\b(?:pretty sure|surely|obviously|clearly) (?:it|this|that|the)\b/i)
];

// Evaluation / verdict: "evaluate", "is this good/correct/safe", "should we", "which is better", "root cause".
const EVALUATION_PATTERNS = [
    weak(/\b(?:evaluate|evaluation|assess|assessment|judge|judgement|judgment|critique|verdict|appraise|sanity[- ]check|double[- ]check)\b/i),
    strong(/\b(?:is|are|was|were) (?:this|it|that|these|those|the|my|our)(?: [\w-]+){0,2} (?:good|bad|correct|right|wrong|safe|ok|okay|valid|sound|better|worse|enough|sufficient|necessary|worth it|a good idea|the right)\b/i),
    strong(/\bshould (?:i|we|it|this)\b/i),
    strong(/\b(?:which (?:one )?is better|better than|pros and cons|trade-?offs?|worth it)\b/i),
    strong(/\b(?:root cause|is (?:this|that|it) (?:the|a) cause)\b/i),
    weak(/\bwhy (?:does|did|is)\b/i),
    strong(/\bdoes (?:this|it|that) (?:make sense|work|hold)\b/i),
    strong(/\b(?:what do you think|thoughts on|your (?:opinion|take|view) on|how (?:good|solid|robust) is)\b/i)
];

// An explicit review-skill invocation already carries its own adversarial protocol.
const EXPLICIT_REVIEW_INVOCATION = /^\s*[/$](?:[\w-]+:)?why-review\b/i;
// "Implement / add / create ..." with no question is a build request, not a verdict request.
const QUESTION_OR_VERDICT_CUE = /\?|\b(?:check|evaluate|assess|judge|review|confirm|verify|validate|audit|critique|am i|is it|is this|is the|is anything|is there|are there|does it|what do you think|thoughts on|should|which|why|what(?:'s| is)? wrong|any \w+)\b/i;
// A fix/build request — sentence-initial imperative ("Run the tests and fix any errors") or a polite ask
// ("can you fix it?", "please implement …"). Its fault nouns describe work to do, not a verdict to give.
const ACTION_VERBS = '(?:fix|implement|add|create|build|run|resolve|make|update|refactor|write|remove|delete|rename|debug|repair|patch|install|set\\s+up|migrate|clean\\s+up|handle|change|move|convert|upgrade|generate)';
const ACTION_REQUEST = new RegExp(
    `(?:^|[.!?;\\n]\\s*)(?:(?:please|pls|ok(?:ay)?|now|then|so|and)[,\\s]+)*${ACTION_VERBS}\\b|\\b(?:can|could|would|will) you (?:please )?(?:help (?:me )?)?${ACTION_VERBS}\\b|\\b(?:please|help me) ${ACTION_VERBS}\\b`,
    'i'
);

/** Return the list of leans the prompt carries; empty when it does not ask for a verdict. */
function detectLeans(prompt) {
    if (typeof prompt !== 'string' || prompt.trim().length === 0) return [];
    if (EXPLICIT_REVIEW_INVOCATION.test(prompt)) return [];
    const text = readUserPrompt(prompt);
    if (text === null) return []; // host envelope, not user input
    if (!QUESTION_OR_VERDICT_CUE.test(text)) return [];
    const isAction = ACTION_REQUEST.test(text);
    const isQuestion = text.includes('?');
    const hits = patterns => patterns.some(p => (!isAction || !p.weak) && (isQuestion || !p.asked) && p.re.test(text));
    const leans = [];
    if (hits(PROBLEM_PATTERNS)) leans.push(LEANS.PROBLEM_PRESUMED);
    if (hits(CONFIRMATION_PATTERNS)) leans.push(LEANS.CONFIRMATION_SOUGHT);
    if (hits(EVALUATION_PATTERNS)) leans.push(LEANS.EVALUATION);
    return leans;
}

function isJudgementRequest(prompt) {
    return detectLeans(prompt).length > 0;
}

const LEAN_GUIDANCE = {
    [LEANS.PROBLEM_PRESUMED]:
        'Gap hunt: "no material issues found" is a valid answer; non-empty list not the goal. Keep only findings you would still report had user asked to confirm none exist.',
    [LEANS.CONFIRMATION_SOUGHT]:
        "User's theory/expected answer = hypothesis: hunt hardest for refuting evidence; say plainly if it fails.",
    [LEANS.EVALUATION]:
        'Verdict: weigh option/cause user did NOT name with same evidence bar as named one.'
};

function loadCanonicalReminder() {
    try {
        const { readCanonicalProtocol } = require('../scripts/lib/canonical-protocol.cjs');
        const { resolveProjectRoot } = require('./lib/project-root.cjs');
        const rootDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
        return readCanonicalProtocol(rootDir, SYNC_TAG);
    } catch (error) {
        debugError(HOOK_NAME, error); // the directive falls back to its built-in body
        return null;
    }
}

function buildDirective(leans, reminder = loadCanonicalReminder(), allowSkillRouting = true) {
    const body =
        reminder ||
        '- **MANDATORY** Name premise, test it AND its opposite with one evidence bar, why-review draft before replying; never invent findings, never manufacture disagreement; end with `Bias check:` line (`SYNC:judgement-integrity`).';
    return [
        MARKER_START,
        `**[JUDGEMENT-INTEGRITY]** Verdict ask (lean: ${leans.join(', ')}). Apply \`SYNC:judgement-integrity\` against confirmation bias:`,
        ...leans.map(lean => `- ${LEAN_GUIDANCE[lean]}`),
        body,
        allowSkillRouting
            ? 'Default = INLINE self-check (steps above; why-review the draft mentally) — no skill call: skill is heavy, everyday answers stay inline. Escalate to `why-review --validate-findings` only for formal review/audit/gap-hunt deliverable or MEDIUM+/consequential issue the inline pass cannot settle: Claude Code → Skill tool `why-review`; Codex → `$why-review` (`.agents/skills/why-review/SKILL.md`); OpenCode → `.claude/skills/why-review/SKILL.md`. Not a verdict ask → ignore.'
            : 'Skill auto-trigger is disabled: keep this verdict self-check INLINE. This prompt classifier does not authorize a heavy review skill. Named user requests and required calls in an already authorized operation still follow the skill activation policy.',
        MARKER_END
    ].join('\n');
}

/**
 * Return the directive for the event's prompt (`routedPrompt`), or '' to stay silent.
 * deps (tests): env, projectDir, rawSettings — forwarded to the prompt lookup and the opt-out check.
 */
function evaluate(input, deps = {}) {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
        const leans = detectLeans(routedPrompt(input, deps));
        if (leans.length === 0) return '';
        // Checked only on a match, so most prompts never pay for the settings read.
        if (!isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, deps)) return '';
        const { resolveHookSkillAutoTrigger } = require('./lib/prompt-route-utils.cjs');
        return `${buildDirective(leans, undefined, resolveHookSkillAutoTrigger(deps).enabled)}\n`;
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: stay silent, diagnose under CK_DEBUG
        return '';
    }
}

module.exports = {
    HOOK_NAME,
    MARKER_START,
    MARKER_END,
    SYNC_TAG,
    SETTINGS_SECTION,
    ENV_SWITCH,
    LEANS,
    detectLeans,
    isJudgementRequest,
    buildDirective,
    evaluate
};

if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        const input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
        const text = evaluate(input);
        if (text) process.stdout.write(routerOutput(input, text));
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: an advisory hook never blocks a prompt
    }
}
