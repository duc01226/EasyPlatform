#!/usr/bin/env node
/**
 * SubagentStart Hook - Injects context to subagents
 *
 * Fires: When a subagent (Task tool call) is started
 * Purpose: Inject project context (CLAUDE.md, lessons, rules, patterns)
 * into subagents since they don't inherit CLAUDE.md or hooks automatically
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const path = require('path');
const { loadConfig, resolveNamingPattern, getGitBranch, resolvePlanPath, getReportsPath, normalizePath } = require('./lib/ck-config-utils.cjs');
const { getTodoStateForSubagent } = require('./lib/todo-state.cjs');
const { loadProjectConfig } = require('./lib/project-config-loader.cjs');
const { CODE_PATTERNS: CODE_PATTERNS_MARKER } = require('./lib/dedup-constants.cjs');
const { injectAiMistakePrevention } = require('./lib/prompt-injections.cjs');
const { readAndInjectDoc } = require('./lib/context-injector-base.cjs');

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

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

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

    // Review agents need code review rules
    'code-reviewer': ['docs/project-reference/code-review-rules.md'],
    'code-simplifier': ['docs/project-reference/code-review-rules.md'],
    'spec-compliance-reviewer': ['docs/project-reference/code-review-rules.md'],

    // Test agents need test references
    'integration-tester': ['docs/project-reference/integration-test-reference.md'],
    tester: ['docs/project-reference/integration-test-reference.md'],
    'e2e-runner': ['docs/project-reference/e2e-test-reference.md'],

    // Docs agents need feature docs + index
    'docs-manager': ['docs/project-reference/feature-docs-reference.md', 'docs/project-reference/docs-index-reference.md'],
    'business-analyst': ['docs/project-reference/feature-docs-reference.md', 'docs/project-reference/docs-index-reference.md']
};

/**
 * Build agent-specific reference doc context.
 * Injects full doc content for docs mapped to this agent type.
 */
function buildAgentSpecificDocs(agentType) {
    const docs = AGENT_DOC_MAP[agentType];
    if (!docs || docs.length === 0) return [];

    const lines = ['', '## Agent-Specific Reference Docs'];
    for (const docPath of docs) {
        const content = readAndInjectDoc(docPath);
        if (content) lines.push(content);
    }
    return lines.length > 1 ? lines : [];
}

function buildCodingPatternContext(agentType) {
    if (!PATTERN_AWARE_AGENT_TYPES.has(agentType)) return [];
    const projConfig = loadProjectConfig();
    const backendDoc = projConfig.framework?.backendPatternsDoc || 'docs/project-reference/backend-patterns-reference.md';
    const frontendDoc = projConfig.framework?.frontendPatternsDoc || 'docs/project-reference/frontend-patterns-reference.md';

    const stylingDoc = projConfig.contextGroups?.find(g => g.stylingDoc)?.stylingDoc || null;
    const designSystemDoc = projConfig.contextGroups?.find(g => g.designSystemDoc)?.designSystemDoc || null;

    const lines = ['', CODE_PATTERNS_MARKER];
    // Inject doc content directly so subagents have full patterns without reading
    const backendContent = readAndInjectDoc(backendDoc);
    if (backendContent) lines.push(backendContent);
    const frontendContent = readAndInjectDoc(frontendDoc);
    if (frontendContent) lines.push(frontendContent);
    if (stylingDoc) {
        const stylingContent = readAndInjectDoc(stylingDoc);
        if (stylingContent) lines.push(stylingContent);
    }
    if (designSystemDoc) {
        const dsContent = readAndInjectDoc(designSystemDoc);
        if (dsContent) lines.push(dsContent);
    }
    return lines;
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
 * Build CLAUDE.md project instructions for subagent context
 * Subagents don't inherit CLAUDE.md automatically — must be injected
 */
function buildClaudeMdContext() {
    try {
        const claudeMdPath = path.resolve(PROJECT_DIR, 'CLAUDE.md');
        if (!fs.existsSync(claudeMdPath)) return [];
        const content = fs.readFileSync(claudeMdPath, 'utf-8');
        return ['', '## Project Instructions (CLAUDE.md)', '', content];
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Build lessons learned context for subagent awareness
 */
function buildLessonsContext() {
    try {
        const lessonsPath = path.resolve(PROJECT_DIR, 'docs', 'project-reference', 'lessons.md');
        if (!fs.existsSync(lessonsPath)) return [];
        const content = fs.readFileSync(lessonsPath, 'utf-8');
        return ['', '## Lessons Learned', '', content];
    } catch {
        return []; /* fail-open */
    }
}

/**
 * Build AI mistake prevention context for subagent awareness
 */
function buildAiMistakePreventionContext() {
    try {
        // skipDedup=true: subagents always get fresh injection (no transcript to dedup against)
        const block = injectAiMistakePrevention(null, true);
        return block ? ['', block] : [];
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
 * Main hook execution
 */
async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const agentType = payload.agent_type || 'unknown';
        const agentId = payload.agent_id || 'unknown';

        const config = loadConfig({
            includeProject: false,
            includeAssertions: false
        });
        const gitBranch = getGitBranch();
        const namePattern = resolveNamingPattern(config.plan, gitBranch);
        const resolved = resolvePlanPath(null, config);
        const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);
        const plansPath = normalizePath(config.paths?.plans) || 'plans';
        const docsPath = normalizePath(config.paths?.docs) || 'docs';

        // Build compact context by assembling all sections
        const agentContext = getAgentContext(agentType, config);

        const lines = [
            `**IMPORTANT: You are a sub-agent. Run autonomously until task is fully complete. Do NOT stop to ask the user anything — make decisions independently and keep working.**`,
            ``,
            `## Subagent: ${agentType}`,
            `ID: ${agentId} | CWD: ${payload.cwd || process.cwd()}`,
            ``,
            ...buildPlanContext(resolved, reportsPath, plansPath, docsPath),
            ...buildLanguageSection(config),
            `## Rules`,
            `- **Development Rules** — YAGNI/KISS/DRY. Logic in LOWEST layer (Entity > Service > Component). Kebab-case files. Search 3+ existing patterns before creating new code. Read existing code before changes. Run linting before commit.`,
            `- MUST READ \`.claude/docs/development-rules.md\` for full rules, code quality guidelines, and pre-commit checklist.`,
            `- Reports → ${reportsPath}`,
            `- YAGNI / KISS / DRY`,
            `- **Class Responsibility:** Logic in LOWEST layer (Model > Service > Component). Mapping → Command/DTO. Constants → Model.`,
            ``,
            `## Naming`,
            `- Report: ${reportsPath}${agentType}-${namePattern}.md`,
            `- Plan dir: ${plansPath}/${namePattern}/`,
            ...buildTrustVerification(config),
            ...(agentContext ? [``, `## Agent Instructions`, agentContext] : []),
            ...buildParentTodoSection(),
            ...buildCodingPatternContext(agentType),
            ...buildAgentSpecificDocs(agentType),
            ...buildClaudeMdContext(),
            ...buildLessonsContext(),
            ...buildAiMistakePreventionContext()
        ];

        // SubagentStart requires hookSpecificOutput.additionalContext format
        const output = {
            hookSpecificOutput: {
                hookEventName: 'SubagentStart',
                additionalContext: lines.join('\n')
            }
        };

        console.log(JSON.stringify(output));
        process.exit(0);
    } catch (error) {
        console.error(`SubagentStart hook error: ${error.message}`);
        process.exit(0); // Fail-open
    }
}

main();
