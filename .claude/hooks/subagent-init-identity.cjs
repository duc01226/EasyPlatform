#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Hook — Identity + Config + Rules (fires 1st of 18)
 *
 * Outputs: subagent identity, plan context, language, rules, naming,
 *          trust verification, agent instructions.
 *          (Parent task state moved to subagent-init-todos.cjs, hook 18.)
 *
 * Execution order: identity → patterns-p1..p5 → dev-rules-p1..p3
 *   → lessons → ai-mistakes → context-guard → todos (last)
 *
 * Split into 18 named hooks to avoid the Claude Code per-hook output size limit
 * (9,000 chars enforced). Exceeding this causes silent tail truncation — large
 * sections like CLAUDE.md (~13KB), dev-rules (~18KB), and patterns (~36KB for
 * code-reviewer) get cut. Each hook is registered sequentially in settings.json;
 * the harness concatenates all additionalContext blocks ("inject paging").
 *
 * See: .claude/hooks/lib/subagent-context-builders.cjs — shared builders.
 * Next: subagent-init-patterns-p1.cjs (coding patterns + agent docs, fires 2nd)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
// Config utils needed directly in main() for plan context setup
const { loadConfig, resolveNamingPattern, getGitBranch, resolvePlanPath, getReportsPath, normalizePath } = require('./lib/ck-config-utils.cjs');
// Builders lib — contains all builder functions extracted from this file
const {
    getAgentContext, buildTrustVerification, buildPlanContext,
    buildLanguageSection, buildCriticalContextSection, emitSubagentContext
} = require('./lib/subagent-context-builders.cjs');

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

        const agentContext = getAgentContext(agentType, config);

        const lines = [
            ...buildCriticalContextSection(), // critical thinking mindset (was in deleted claude-md-p1)
            ``,
            `**IMPORTANT: Sub-agent. Run autonomously until task fully complete. Do NOT stop to ask user anything — make decisions independently and keep working.**`,
            ``,
            `## Subagent: ${agentType}`,
            `ID: ${agentId} | CWD: ${payload.cwd || process.cwd()}`,
            ``,
            ...buildPlanContext(resolved, reportsPath, plansPath, docsPath),
            ...buildLanguageSection(config),
            `## Rules`,
            `- **Development Rules** — YAGNI/KISS/DRY. Logic in LOWEST layer (Entity > Service > Component). Kebab-case files. Search 3+ existing patterns before creating new code. Read existing code before changes. Run linting before commit. Surface ambiguity before coding: list assumptions (scope/format/volume), present interpretations with effort estimates — NEVER pick silently.`,
            `- MUST ATTENTION READ \`.claude/docs/development-rules.md\` for full rules, code quality guidelines, and pre-commit checklist.`,
            `- Reports → ${reportsPath}`,
            `- YAGNI / KISS / DRY`,
            `- **Class Responsibility:** Logic in LOWEST layer (Model > Service > Component). Mapping → Command/DTO. Constants → Model.`,
            ``,
            `## Naming`,
            `- Report: ${reportsPath}${agentType}-${namePattern}.md`,
            `- Plan dir: ${plansPath}/${namePattern}/`,
            ...buildTrustVerification(config),
            ...(agentContext ? [``, `## Agent Instructions`, agentContext] : [])
        ];

        emitSubagentContext(lines);
    } catch (error) {
        console.error(`SubagentStart identity error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
