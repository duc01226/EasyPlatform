#!/usr/bin/env node
'use strict';
/**
 * SubagentStart Dispatcher 1/3 — identity + patterns + dev-rules + code-review-rules + lessons
 *
 * Consolidates the first 5 of the former 8 subagent-init-*.cjs hooks into ONE
 * node process. Emits a single additionalContext block (builders 1–5, in order).
 *
 * Why 3 dispatchers, not 1: the harness caps a single hook block at ~9000 chars
 * (MAX_HOOK_OUTPUT_BYTES: 8500). Measured worst case (code-reviewer):
 *   group {1-5}=6551, {6 ai-mistakes}=6396, {7-8}=731.
 * lessons(5)+ai-mistakes(6)=10,354 forces a boundary at 5|6; ai-mistakes plus the
 * context-guard+todos tail can exceed 8500 once a parent session carries ~30 todos,
 * forcing a boundary at 6|7. ⇒ N=3, contiguous partition {1-5}|{6}|{7-8}.
 * See plans/.../reports/p01-equivalence-proof.txt for the measured proof.
 *
 * Equivalence (M4): each builder block is emitted exactly as the legacy hooks did
 * (emitSubagentContext = lines.join('\n')); concatenating all dispatcher blocks
 * with '\n' is byte-identical to concatenating the 8 legacy blocks with '\n'.
 *
 * Fault isolation: each builder runs in its own try/catch — one throwing does not
 * abort the others (the 5 builders were independent processes before).
 *
 * Order: identity → patterns → dev-rules → code-review-rules → lessons
 * Next: subagent-init-2.cjs (ai-mistakes), subagent-init-3.cjs (context-guard + todos)
 *
 * Exit Codes: 0 — Success (non-blocking, fail-open)
 */

const fs = require('fs');
const { loadConfig, resolveNamingPattern, getGitBranch, resolvePlanPath, getReportsPath, normalizePath } = require('./lib/ck-config-utils.cjs');
const {
    getAgentContext, buildTrustVerification, buildPlanContext, buildLanguageSection,
    buildCriticalContextSection, buildPatternsGuidance, buildDevRulesGuidance,
    buildCodeReviewRulesGuidance, buildSharedLessonsContext, emitSubagentContext
} = require('./lib/subagent-context-builders.cjs');

/** Run a builder, returning [] on any failure so one fault can't abort the rest. */
function safe(fn) {
    try {
        const out = fn();
        return Array.isArray(out) ? out : [];
    } catch {
        return [];
    }
}

/**
 * Build the identity block lines (former subagent-init-identity.cjs body, verbatim).
 * Loads config + resolves plan/reports/naming context, then assembles the lines.
 */
function buildIdentityLines(payload) {
    const agentType = payload.agent_type || 'unknown';
    const agentId = payload.agent_id || 'unknown';

    const config = loadConfig({ includeProject: false, includeAssertions: false });
    const gitBranch = getGitBranch();
    const namePattern = resolveNamingPattern(config.plan, gitBranch);
    const resolved = resolvePlanPath(null, config);
    const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);
    const plansPath = normalizePath(config.paths?.plans) || 'plans';
    const docsPath = normalizePath(config.paths?.docs) || 'docs';

    const agentContext = getAgentContext(agentType, config);

    return [
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
}

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);
        const payload = JSON.parse(stdin);
        const agentType = payload.agent_type || 'unknown';

        const lines = [
            ...safe(() => buildIdentityLines(payload)),
            ...safe(() => buildPatternsGuidance(agentType)),
            ...safe(() => buildDevRulesGuidance(agentType)),
            ...safe(() => buildCodeReviewRulesGuidance(agentType)),
            ...safe(() => buildSharedLessonsContext())
        ];

        emitSubagentContext(lines);
    } catch (error) {
        console.error(`SubagentStart init (1/3) error: ${error.message}`);
        process.exit(0); // fail-open
    }
}

main();
