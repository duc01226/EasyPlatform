'use strict';
/**
 * Subagent Context Builders — shared lib for subagent-init part hooks.
 *
 * Motivation: subagent-init is split into 18 named hooks to avoid the Claude Code
 * per-hook output size limit (9,000 chars enforced). When a single hook exceeds this
 * limit, the tail is silently truncated — large sections like dev-rules (~18KB) and
 * patterns (~36KB for code-reviewer) get cut. Splitting across 18 hooks ("inject paging")
 * keeps each hook's output small enough that no content is lost.
 * CLAUDE.md is injected natively by Claude Code's claudeMd mechanism — no hook needed.
 *    1. subagent-init-identity.cjs                — identity, config, rules, plan context, critical thinking
 *    2. subagent-init-patterns-p1.cjs             — coding patterns + agent-specific docs page 1/5
 *    3. subagent-init-patterns-p2.cjs             — patterns page 2/5 (silent if empty)
 *    4. subagent-init-patterns-p3.cjs             — patterns page 3/5 (silent if empty)
 *    5. subagent-init-patterns-p4.cjs             — patterns page 4/5 (silent if empty)
 *    6. subagent-init-patterns-p5.cjs             — patterns page 5/5 (silent if empty; overflow hint)
 *    7. subagent-init-dev-rules-p1.cjs            — development-rules.md page 1/3 (code/review agents only)
 *    8. subagent-init-dev-rules-p2.cjs            — dev-rules page 2/3 (silent if fits in p1)
 *    9. subagent-init-dev-rules-p3.cjs            — dev-rules page 3/3 (silent if fits in p1+p2)
 *   10. subagent-init-code-review-rules-p1.cjs    — code-review-rules.md page 1/5 (code-review agents only)
 *   11. subagent-init-code-review-rules-p2.cjs    — code-review-rules page 2/5 (silent if fits earlier)
 *   12. subagent-init-code-review-rules-p3.cjs    — code-review-rules page 3/5 (silent if fits earlier)
 *   13. subagent-init-code-review-rules-p4.cjs    — code-review-rules page 4/5 (silent if fits earlier)
 *   14. subagent-init-code-review-rules-p5.cjs    — code-review-rules page 5/5 (silent if fits earlier; overflow hint)
 *   15. subagent-init-lessons.cjs                 — lessons learned (~1,560 chars)
 *   16. subagent-init-ai-mistakes.cjs             — AI mistake prevention bullets (~8,200 chars; split from lessons to stay under 9,000-char limit)
 *   17. subagent-init-context-guard.cjs           — context-overflow guard reminder
 *   18. subagent-init-todos.cjs                   — active task state (fires last)
 * This lib centralizes all builder functions so each hook stays thin and DRY.
 */

const fs = require('fs');
const path = require('path');
// Only imports used inside builder functions — NOT config utils (those stay in each part's main())
const { getTodoStateForSubagent } = require('./todo-state.cjs');
const { loadProjectConfig } = require('./project-config-loader.cjs');
const { CODE_PATTERNS: CODE_PATTERNS_MARKER } = require('./dedup-constants.cjs');
const { injectCriticalContext, injectLessons, injectAiMistakePrevention } = require('./prompt-injections.cjs');
const { readAndInjectDoc } = require('./context-injector-base.cjs');

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
 * Docs are injected via readAndInjectDoc() — full content, not just paths.
 */
const AGENT_DOC_MAP = {
    // Architecture agents need project structure + domain model
    planner: ['docs/project-reference/project-structure-reference.md', 'docs/project-reference/domain-entities-reference.md'],
    architect: ['docs/project-reference/project-structure-reference.md', 'docs/project-reference/domain-entities-reference.md'],
    'solution-architect': ['docs/project-reference/project-structure-reference.md', 'docs/project-reference/domain-entities-reference.md'],
    scout: ['docs/project-reference/project-structure-reference.md'],

    // Review agents: code-review-rules.md injected via dedicated subagent-init-code-review-rules-p*.cjs hooks
    // (removed from AGENT_DOC_MAP: backend+frontend patterns exhaust the 5-page patterns budget,
    //  leaving code-review-rules.md silently uninjected via the patterns overflow path)

    // Test agents need test references
    'integration-tester': ['docs/project-reference/integration-test-reference.md'],
    tester: ['docs/project-reference/integration-test-reference.md'],
    'e2e-runner': ['docs/project-reference/e2e-test-reference.md'],

    // Docs agents need feature docs + index
    'docs-manager': ['docs/project-reference/feature-docs-reference.md', 'docs/project-reference/docs-index-reference.md'],
    'business-analyst': ['docs/project-reference/feature-docs-reference.md', 'docs/project-reference/docs-index-reference.md']
};

/**
 * Agent types that receive code-review-rules.md injection via dedicated hooks.
 * Separated from AGENT_DOC_MAP/patterns pipeline because backend+frontend patterns
 * exhaust all 5 × 8,500-char pattern pages, silently dropping code-review-rules.md.
 * Injected by subagent-init-code-review-rules-p1.cjs … p5.cjs (after dev-rules hooks).
 */
const CODE_REVIEW_RULES_AGENT_TYPES = new Set([
    'code-reviewer',
    'code-simplifier',
    'spec-compliance-reviewer'
]);

/**
 * Agent types that receive development-rules.md injection.
 * These agents produce or review code and need full dev rules for quality enforcement.
 * Injected by subagent-init-dev-rules-p1.cjs + p2.cjs + p3.cjs (7th–9th of 18).
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
 * Build one page of development-rules.md for subagent context injection.
 * Dynamic paging: reads file at runtime, splits at line boundaries.
 * Returns [] if agentType not in DEV_RULES_AGENT_TYPES, or page is empty (silent exit).
 *
 * @param {number} partIndex   - 0-based page index (0=p1, 1=p2, 2=p3)
 * @param {number} totalParts  - Total pages (default 3, handles up to ~25.5KB)
 * @param {string} agentType   - From SubagentStart payload
 * @returns {string[]} Lines array, empty if agent type excluded or page is empty
 */
function buildDevRulesContextPart(partIndex, totalParts = 3, agentType) {
    if (!DEV_RULES_AGENT_TYPES.has(agentType)) return [];
    try {
        const rulesPath = path.resolve(PROJECT_DIR, '.claude', 'docs', 'development-rules.md');
        if (!fs.existsSync(rulesPath)) return [];
        const content = fs.readFileSync(rulesPath, 'utf-8').trim();
        if (!content) return [];

        const { content: partContent, meta, overflow } = splitContentIntoPart(content, partIndex, totalParts, 8500);
        if (!partContent) return [];

        const lines = ['', `## Development Rules (.claude/docs/development-rules.md) — ${meta}`, '', partContent];

        if (overflow) {
            lines.push(
                '',
                `> **[DEV-RULES OVERFLOW]** ${overflow.remainingLines} lines (~${overflow.remainingChars} chars) not injected.`,
                `> Read \`.claude/docs/development-rules.md\` from line ${overflow.fromLine} for remaining content.`
            );
        }
        return lines;
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Build one page of code-review-rules.md for subagent context injection.
 * Dynamic paging: reads file at runtime, splits at line boundaries.
 * Returns [] if agentType not in CODE_REVIEW_RULES_AGENT_TYPES, or page is empty (silent exit).
 * 5 pages × 8,500 chars = 42,500-char budget — sufficient for the 38 KB rules file.
 *
 * @param {number} partIndex   - 0-based page index (0=p1 … 4=p5)
 * @param {number} totalParts  - Total pages (default 5, handles up to ~42.5KB)
 * @param {string} agentType   - From SubagentStart payload
 * @returns {string[]} Lines array, empty if agent type excluded or page is empty
 */
function buildCodeReviewRulesContextPart(partIndex, totalParts = 5, agentType) {
    if (!CODE_REVIEW_RULES_AGENT_TYPES.has(agentType)) return [];
    try {
        const rulesPath = path.resolve(PROJECT_DIR, 'docs', 'project-reference', 'code-review-rules.md');
        if (!fs.existsSync(rulesPath)) return [];
        const content = fs.readFileSync(rulesPath, 'utf-8').trim();
        if (!content) return [];

        const { content: partContent, meta, overflow } = splitContentIntoPart(content, partIndex, totalParts, 8500);
        if (!partContent) return [];

        const lines = ['', `## Code Review Rules (docs/project-reference/code-review-rules.md) — ${meta}`, '', partContent];

        if (overflow) {
            lines.push(
                '',
                `> **[CODE-REVIEW-RULES OVERFLOW]** ${overflow.remainingLines} lines (~${overflow.remainingChars} chars) not injected.`,
                `> Read \`docs/project-reference/code-review-rules.md\` from line ${overflow.fromLine} for remaining content.`
            );
        }
        return lines;
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Build the full concatenated patterns content for an agent type.
 * Combines: CODE_PATTERNS_MARKER + backend + frontend + styling + design + agent-specific docs.
 * Returns '' if agent type is not in PATTERN_AWARE_AGENT_TYPES AND not in AGENT_DOC_MAP.
 * @internal — called by buildPatternsContextPart()
 * @param {string} agentType
 * @returns {string} Full concatenated content (empty string if agent type excluded)
 */
function buildAllPatternsContent(agentType) {
    const isPatternAware = PATTERN_AWARE_AGENT_TYPES.has(agentType);
    const hasAgentDocs = !!AGENT_DOC_MAP[agentType];
    if (!isPatternAware && !hasAgentDocs) return '';

    const projConfig = loadProjectConfig();
    const lines = [];

    if (isPatternAware) {
        lines.push('', CODE_PATTERNS_MARKER); // dedup-constants.cjs — prevents duplicate pattern injection in same session
        const backendDoc = projConfig.framework?.backendPatternsDoc || 'docs/project-reference/backend-patterns-reference.md';
        const frontendDoc = projConfig.framework?.frontendPatternsDoc || 'docs/project-reference/frontend-patterns-reference.md';
        const backendContent = readAndInjectDoc(backendDoc);
        if (backendContent) lines.push('', backendContent);
        const frontendContent = readAndInjectDoc(frontendDoc);
        if (frontendContent) lines.push('', frontendContent);

        const stylingDoc = projConfig.contextGroups?.find(g => g.stylingDoc)?.stylingDoc || null;
        const designSystemDoc = projConfig.contextGroups?.find(g => g.designSystemDoc)?.designSystemDoc || null;
        if (stylingDoc) { const c = readAndInjectDoc(stylingDoc); if (c) lines.push('', c); }
        if (designSystemDoc) { const c = readAndInjectDoc(designSystemDoc); if (c) lines.push('', c); }
    }

    if (hasAgentDocs) {
        lines.push('', '## Agent-Specific Reference Docs');
        for (const docPath of AGENT_DOC_MAP[agentType]) {
            const c = readAndInjectDoc(docPath);
            if (c) lines.push('', c);
        }
    }

    return lines.join('\n');
}

/**
 * Build one page of combined patterns content for subagent context injection.
 * Dynamic paging: builds full content for agent type at runtime, splits at line boundaries.
 * Returns [] if agent type excluded or page is empty (silent exit).
 *
 * @param {number} partIndex   - 0-based page index (0=p1 … 4=p5)
 * @param {number} totalParts  - Total pages (default 5, handles worst-case ~36KB for code-reviewer + future growth)
 * @param {string} agentType   - From SubagentStart payload
 * @returns {string[]} Lines array, empty if agent type excluded or page is empty
 */
function buildPatternsContextPart(partIndex, totalParts = 5, agentType) {
    try {
        const fullContent = buildAllPatternsContent(agentType);
        if (!fullContent) return [];

        const { content: partContent, meta, overflow } = splitContentIntoPart(fullContent, partIndex, totalParts, 8500);
        if (!partContent) return [];

        const lines = ['', `## Coding Patterns & Reference Docs — ${meta}`, '', partContent];

        if (overflow) {
            lines.push(
                '',
                `> **[PATTERNS OVERFLOW]** ${overflow.remainingLines} lines (~${overflow.remainingChars} chars) not injected (content exceeds ${totalParts} × 8,500-char pages).`,
                `> Remaining content: read the relevant reference doc files directly from \`docs/project-reference/\`.`
            );
        }
        return lines;
    } catch {
        return []; /* fail-open */
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
 * Used in hook 12 (context-guard hook). Hook 1 (identity) does NOT call this — see lifecycle.test.cjs:1390
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
 * Shared by all 18 subagent-init-*.cjs hooks — avoids repeating the output
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
    buildAllPatternsContent,
    buildPatternsContextPart,
    buildPlanContext,
    buildLanguageSection,
    splitContentIntoPart,
    buildCriticalContextSection,
    buildSharedLessonsContext,
    buildAiMistakePreventionContext,
    buildContextGuardContext,
    buildDevRulesContextPart,
    buildCodeReviewRulesContextPart,
    buildParentTodoSection,
    emitSubagentContext,
    MAX_HOOK_OUTPUT_BYTES: 8500  // 500-char headroom below 9000-char harness limit
};
