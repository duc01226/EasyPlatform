'use strict';
/**
 * Subagent Context Builders — shared lib for subagent-init hooks.
 *
 * Hooks fire on SubagentStart to give agents the context they need.
 * All content-injection (readAndInjectDoc) replaced with read-guidance pointers —
 * agents read files themselves as needed rather than receiving pre-loaded content.
 *
 * These builders are now invoked by 3 cap-bounded dispatchers (down from 8
 * single-builder hooks). The builder FIRING ORDER below is load-bearing —
 * dispatchers call them in this exact sequence so the concatenated
 * additionalContext is byte-equivalent to the legacy ordered concat
 * (each block <=8500 chars; see plans/.../reports/p01-equivalence-proof.txt):
 *
 *    subagent-init.cjs    (dispatcher 1/3) — builders 1-5:
 *      1. identity            — identity, config, rules, plan context, critical thinking
 *      2. patterns            — read-guidance: patterns + agent-specific docs
 *      3. dev-rules           — read-guidance: development-rules.md (dev agents only)
 *      4. code-review-rules   — read-guidance: code-review-rules.md (review agents only)
 *      5. lessons             — lessons learned
 *    subagent-init-2.cjs  (dispatcher 2/3) — builder 6:
 *      6. ai-mistakes         — AI mistake prevention bullets
 *    subagent-init-3.cjs  (dispatcher 3/3) — builders 7-8:
 *      7. context-guard       — context-overflow guard reminder
 *      8. todos               — active task state (fires last)
 */

const fs = require('fs');
const path = require('path');
const { getTodoStateForSubagent } = require('./todo-state.cjs');
const { loadProjectConfig } = require('./project-config-loader.cjs');
const { injectCriticalContext, injectLessons, injectAiMistakePrevention } = require('./prompt-injections.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

/**
 * Build coding pattern context for implementation-aware agents
 */
const PATTERN_AWARE_AGENT_TYPES = new Set([
    'fullstack-developer',
    'debugger',
    'tester',
    'code-reviewer',
    'code-simplifier',
    'planner',
    'architect',
    'integration-tester',
    'backend-developer'
]);

/**
 * Agent-type → additional reference docs mapping.
 * Each agent type receives docs relevant to its specialized role.
 * Docs are referenced as guidance pointers — agents are directed to read them.
 */
const AGENT_DOC_MAP = {
    // Architecture agents need project structure + domain model
    planner: ['docs/project-reference/project-structure-reference.md', 'docs/project-reference/domain-entities-reference.md'],
    architect: ['docs/project-reference/project-structure-reference.md', 'docs/project-reference/domain-entities-reference.md'],
    'solution-architect': ['docs/project-reference/project-structure-reference.md', 'docs/project-reference/domain-entities-reference.md'],
    scout: ['docs/project-reference/project-structure-reference.md'],

    // Review agents: code-review-rules.md guidance pointer emitted by the dedicated
    // code-review-rules builder (dispatcher 1/3) — kept out of AGENT_DOC_MAP so that
    // builder remains the single source of truth.

    // Test agents need test references
    'integration-tester': ['docs/project-reference/integration-test-reference.md'],
    tester: ['docs/project-reference/integration-test-reference.md'],
    'e2e-runner': ['docs/project-reference/e2e-test-reference.md'],

    // Docs agents need the full local spec routing set + index.
    'docs-manager': [
        'docs/project-reference/feature-spec-reference.md',
        'docs/project-reference/spec-system-reference.md',
        'docs/project-reference/spec-principles.md',
        'docs/project-reference/workflow-spec-test-code-cycle-reference.md',
        'docs/project-reference/docs-index-reference.md'
    ],
    'business-analyst': [
        'docs/project-reference/feature-spec-reference.md',
        'docs/project-reference/spec-system-reference.md',
        'docs/project-reference/spec-principles.md',
        'docs/project-reference/workflow-spec-test-code-cycle-reference.md',
        'docs/project-reference/docs-index-reference.md'
    ]
};

/**
 * Agent types that receive code-review-rules.md injection via dedicated hooks.
 * Separated from AGENT_DOC_MAP/patterns pipeline because backend+frontend patterns
 * exhaust all 5 × 8,500-char pattern pages, silently dropping code-review-rules.md.
 * Injected by the code-review-rules builder in dispatcher 1/3 (after the dev-rules builder).
 */
const CODE_REVIEW_RULES_AGENT_TYPES = new Set([
    'code-reviewer',
    'code-simplifier',
    'spec-compliance-reviewer'
]);

/**
 * Agent types that receive development-rules.md injection.
 * These agents produce or review code and need full dev rules for quality enforcement.
 * Injected by the dev-rules builder (3rd builder, dispatcher 1/3).
 */
const DEV_RULES_AGENT_TYPES = new Set([
    'code-reviewer',
    'code-simplifier',
    'spec-compliance-reviewer',
    'fullstack-developer',
    'backend-developer',
    'frontend-developer',
    'debugger',
    'tester',
    'integration-tester',
    'e2e-runner',
    'planner'
]);

/**
 * Get agent-specific context from config
 */
function getAgentContext(agentType, config) {
    const agentConfig = config.subagent?.agents?.[agentType];
    if (!agentConfig?.contextPrefix) return null;
    return agentConfig.contextPrefix;
}

/**
 * Build trust verification section if enabled
 */
function buildTrustVerification(config) {
    if (!config.trust?.enabled || !config.trust?.passphrase) return [];
    return [``, `## Trust Verification`, `Passphrase: "${config.trust.passphrase}"`];
}

/**
 * Build plan context lines
 */
function buildPlanContext(resolved, reportsPath, plansPath, docsPath) {
    const activePlan = resolved.resolvedBy === 'session' ? resolved.path : '';
    const suggestedPlan = resolved.resolvedBy === 'branch' ? resolved.path : '';

    let planLine = '- Plan: none';
    if (activePlan) planLine = `- Plan: ${activePlan}`;
    else if (suggestedPlan) planLine = `- Plan: none | Suggested: ${suggestedPlan}`;

    return [`## Context`, planLine, `- Reports: ${reportsPath}`, `- Paths: ${plansPath}/ | ${docsPath}/`, ``];
}

/**
 * Build language section if configured
 */
function buildLanguageSection(config) {
    const thinkingLanguage = config.locale?.thinkingLanguage || '';
    const responseLanguage = config.locale?.responseLanguage || '';
    const effectiveThinking = thinkingLanguage || (responseLanguage ? 'en' : '');
    const hasThinking = effectiveThinking && effectiveThinking !== responseLanguage;

    if (!hasThinking && !responseLanguage) return [];

    return [
        `## Language`,
        ...(hasThinking ? [`- Thinking: Use ${effectiveThinking} for reasoning (logic, precision).`] : []),
        ...(responseLanguage ? [`- Response: Respond in ${responseLanguage} (natural, fluent).`] : []),
        ``
    ];
}

/**
 * Split content into a specific page using a max-chars-per-page limit.
 * Splits on line boundaries — never mid-line — so output is always valid text.
 *
 * @param {string} content - Full content to paginate
 * @param {number} partIndex - 0-based page index to return
 * @param {number} totalParts - Total number of pages declared by caller
 * @param {number} maxCharsPerPart - Hard limit per page (default 9000)
 * @returns {{
 *   content: string,   // Page text (empty string if page is beyond content end)
 *   meta: string,      // "Part X/Y: lines A–B of C (N%)" for injection headers
 *   overflow: {fromLine: number, remainingLines: number, remainingChars: number}|null
 *             // Set only on the last page when content exceeds totalParts*maxCharsPerPart
 * }}
 */
function splitContentIntoPart(content, partIndex, totalParts, maxCharsPerPart = 9000) {
    const lines = content.split('\n');
    const totalLines = lines.length;

    // Build page boundaries by consuming lines up to maxCharsPerPart per page.
    let currentLine = 0;
    const pages = [];

    for (let p = 0; p < totalParts && currentLine < totalLines; p++) {
        const startLine = currentLine;
        let pageChars = 0;

        while (currentLine < totalLines) {
            const lineLen = lines[currentLine].length + 1; // +1 for newline
            // Always include at least one line per page to avoid infinite loop on long single lines
            if (pageChars > 0 && pageChars + lineLen > maxCharsPerPart) break;
            pageChars += lineLen;
            currentLine++;
        }

        pages.push({ startLine, endLine: currentLine });
    }

    // Return content for the requested part index
    const page = pages[partIndex];
    if (!page || page.startLine >= page.endLine) {
        return { content: '', meta: '', overflow: null };
    }

    const partLines = lines.slice(page.startLine, page.endLine);
    const partContent = partLines.join('\n');
    const coveragePct = Math.round((page.endLine / totalLines) * 100);
    const meta = `Part ${partIndex + 1}/${totalParts}: lines ${page.startLine + 1}–${page.endLine} of ${totalLines} (${coveragePct}%)`;

    // Overflow check: only relevant on the last declared part
    let overflow = null;
    if (partIndex === totalParts - 1) {
        const lastInjectedLine = pages[pages.length - 1]?.endLine ?? 0;
        if (lastInjectedLine < totalLines) {
            const remainingLines = totalLines - lastInjectedLine;
            const remainingChars = lines.slice(lastInjectedLine).join('\n').length;
            overflow = { fromLine: lastInjectedLine + 1, remainingLines, remainingChars };
        }
    }

    return { content: partContent, meta, overflow };
}

/**
 * Inject critical thinking mindset reminder (reuses shared helper from prompt-injections).
 * skipDedup=true: subagents have no transcript to dedup against.
 */
function buildCriticalContextSection() {
    try {
        const block = injectCriticalContext(null, true);
        return block ? ['', block] : [];
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Inject lessons learned content (reuses shared helper from prompt-injections).
 * Replaces direct fs.readFileSync to stay in sync with main session injection format.
 * skipDedup=true: subagents have no transcript to dedup against.
 * Note: returns null when lessons.md is absent, empty, or has no "- [" bullet entries.
 */
function buildSharedLessonsContext() {
    try {
        const block = injectLessons(null, true);
        return block ? ['', block] : [];
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Build AI mistake prevention context for subagent awareness.
 * skipDedup=true: subagents always get fresh injection (no transcript to dedup against).
 */
function buildAiMistakePreventionContext() {
    try {
        const block = injectAiMistakePrevention(null, true);
        return block ? ['', block] : [];
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Build read-guidance for development rules — tells the agent to read development-rules.md.
 * Returns [] if agentType not in DEV_RULES_AGENT_TYPES.
 *
 * @param {string} agentType - From SubagentStart payload
 * @returns {string[]} Lines array, empty if agent type excluded
 */
function buildDevRulesGuidance(agentType) {
    if (!DEV_RULES_AGENT_TYPES.has(agentType)) return [];
    const rulesPath = path.resolve(PROJECT_DIR, '.claude', 'docs', 'development-rules.md');
    if (!fs.existsSync(rulesPath)) return [];
    return [
        '',
        '## Development Rules',
        '',
        'Read: `.claude/docs/development-rules.md` — coding standards, architecture rules, quality gates, anti-patterns.',
        ''
    ];
}

/**
 * Build read-guidance for code review rules — tells the agent to read code-review-rules.md.
 * Returns [] if agentType not in CODE_REVIEW_RULES_AGENT_TYPES.
 *
 * @param {string} agentType - From SubagentStart payload
 * @returns {string[]} Lines array, empty if agent type excluded
 */
function buildCodeReviewRulesGuidance(agentType) {
    if (!CODE_REVIEW_RULES_AGENT_TYPES.has(agentType)) return [];
    const rulesPath = path.resolve(PROJECT_DIR, 'docs', 'project-reference', 'code-review-rules.md');
    if (!fs.existsSync(rulesPath)) return [];
    return [
        '',
        '## Code Review Rules',
        '',
        'Read: `docs/project-reference/code-review-rules.md` — review checklist, anti-patterns, quality standards, layer violations.',
        ''
    ];
}

/**
 * Build read-guidance for coding patterns — tells the agent which docs to read.
 * Returns [] if agent type is not in PATTERN_AWARE_AGENT_TYPES AND not in AGENT_DOC_MAP.
 *
 * @param {string} agentType - From SubagentStart payload
 * @returns {string[]} Lines array, empty if agent type excluded
 */
function buildPatternsGuidance(agentType) {
    const isPatternAware = PATTERN_AWARE_AGENT_TYPES.has(agentType);
    const agentDocs = AGENT_DOC_MAP[agentType];
    if (!isPatternAware && !agentDocs) return [];

    try {
        const projConfig = loadProjectConfig();
        const lines = ['', `## Coding Patterns & Reference Docs`, ''];

        if (isPatternAware) {
            const bp = projConfig.framework?.backendPatternsDoc || 'docs/project-reference/backend-patterns-reference.md';
            const fp = projConfig.framework?.frontendPatternsDoc || 'docs/project-reference/frontend-patterns-reference.md';
            lines.push(
                'Read before implementing:',
                `- \`${bp}\` — CQRS commands/queries, validation, repositories, entity events, v1/v2 patterns`,
                `- \`${fp}\` — base classes, state-management store, reactive effects, component styling, API service pattern`,
            );
            const stylingDoc = projConfig.contextGroups?.find(g => g.stylingDoc)?.stylingDoc;
            const designSystemDoc = projConfig.contextGroups?.find(g => g.designSystemDoc)?.designSystemDoc;
            if (stylingDoc) lines.push(`- \`${stylingDoc}\` — SCSS conventions, BEM patterns`);
            if (designSystemDoc) lines.push(`- \`${designSystemDoc}\` — design tokens and component patterns`);
        }

        if (agentDocs?.length) {
            if (!isPatternAware) lines.push('Read before starting:');
            agentDocs.forEach(docPath => lines.push(`- \`${docPath}\``));
        }

        lines.push('');
        return lines;
    } catch {
        return [];
    }
}

/**
 * Build parent task state section for subagent awareness
 */
function buildParentTodoSection() {
    const todoState = getTodoStateForSubagent();
    if (!todoState?.hasTodos) return [];

    return [
        ``,
        `## Parent Task Context`,
        `Tasks: ${todoState.taskCount} total, ${todoState.pendingCount} pending`,
        ...(todoState.summaryTodos?.length > 0 ? [`Active:`, ...todoState.summaryTodos.map(t => `  ${t}`)] : [])
    ];
}

/**
 * Build context-overflow guard reminder — concise, high-signal.
 * Used in hook 7 (context-guard hook). Hook 1 (identity) does NOT call this — see lifecycle.test.cjs:1390
 * @param {string|null} sessionId - Current session ID for Session: header (optional)
 */
function buildContextGuardContext(sessionId = null) {
    const tsExample = '20260414143022847'; // YYYYMMDDHHmmssSSS — 17 chars
    const sessionId_ = sessionId || '<your-session-id>';
    const block = [
        '## ⚠️ Context Guard — MANDATORY',
        'Context exhaustion = silent loss of ALL findings. No progress file = no recovery.',
        '',
        'MUST ATTENTION if task > 5 files or > 3 steps:',
        `- **On start:** create \`tmp/ck-agent-${tsExample}-a3f9d2.progress.md\` (ts=17-char ms, rnd=6-char hex)`,
        `  ⚠️ REPLACE example values — do NOT copy literally. Use current timestamp in \`YYYYMMDDHHmmssSSS\` format (17 digits) and generate a RANDOM 6-char hex suffix.`,
        `  First line: \`Session: ${sessionId_}\``,
        '- **After each step:** append findings — mark `[done]` / `[partial]` / `[pending]`',
        '- **Context running out?** Write `[partial]` to file FIRST — NEVER summarize before writing.',
        '- **Producing a report?** Start final message with: `Report: plans/reports/<name>.md`',
    ].join('\n');

    return ['', block];
}

/**
 * Emit SubagentStart context to stdout and exit 0.
 * Shared by all 8 subagent-init-*.cjs hooks — avoids repeating the output
 * wrapping structure in each hook file.
 * @param {string[]} lines - Content lines to emit (exits silently if empty)
 */
function emitSubagentContext(lines) {
    if (lines.length === 0) process.exit(0);
    const output = {
        hookSpecificOutput: {
            hookEventName: 'SubagentStart',
            additionalContext: lines.join('\n')
        }
    };
    console.log(JSON.stringify(output));
    process.exit(0);
}

module.exports = {
    PROJECT_DIR,
    PATTERN_AWARE_AGENT_TYPES,
    DEV_RULES_AGENT_TYPES,
    CODE_REVIEW_RULES_AGENT_TYPES,
    AGENT_DOC_MAP,
    getAgentContext,
    buildTrustVerification,
    buildPatternsGuidance,
    buildDevRulesGuidance,
    buildCodeReviewRulesGuidance,
    buildPlanContext,
    buildLanguageSection,
    splitContentIntoPart,
    buildCriticalContextSection,
    buildSharedLessonsContext,
    buildAiMistakePreventionContext,
    buildContextGuardContext,
    buildParentTodoSection,
    emitSubagentContext,
    MAX_HOOK_OUTPUT_BYTES: 8500  // 500-char headroom below 9000-char harness limit
};
