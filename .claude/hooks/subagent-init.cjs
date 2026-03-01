#!/usr/bin/env node
/**
 * SubagentStart Hook - Injects context to subagents (Optimized)
 *
 * Fires: When a subagent (Task tool call) is started
 * Purpose: Inject minimal context using env vars from SessionStart
 * Target: ~200 tokens (down from ~350)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const path = require('path');
const {
  loadConfig,
  resolveNamingPattern,
  getGitBranch,
  resolvePlanPath,
  getReportsPath,
  normalizePath
} = require('./lib/ck-config-utils.cjs');
const { getTodoStateForSubagent } = require('./lib/todo-state.cjs');
const { loadProjectConfig } = require('./lib/project-config-loader.cjs');
const { CODE_PATTERNS: CODE_PATTERNS_MARKER } = require('./lib/dedup-constants.cjs');

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
  return [
    ``,
    `## Trust Verification`,
    `Passphrase: "${config.trust.passphrase}"`
  ];
}

/**
 * Build coding pattern context for implementation-aware agents
 */
const PATTERN_AWARE_AGENT_TYPES = new Set([
  'fullstack-developer', 'debugger', 'tester',
  'code-reviewer', 'code-simplifier',
  'planner', 'architect',
  'integration-tester', 'backend-developer'
]);

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const COMPACT_REF_PATH = path.resolve(PROJECT_DIR, '.ai/docs/compact-pattern-reference.md');

function buildCodingPatternContext(agentType) {
  if (!PATTERN_AWARE_AGENT_TYPES.has(agentType)) return [];
  const projConfig = loadProjectConfig();
  const backendDoc = projConfig.framework?.backendPatternsDoc || 'docs/backend-patterns-reference.md';
  const frontendDoc = projConfig.framework?.frontendPatternsDoc || 'docs/frontend-patterns-reference.md';

  const lines = ['', CODE_PATTERNS_MARKER];
  try {
    if (fs.existsSync(COMPACT_REF_PATH)) {
      lines.push(fs.readFileSync(COMPACT_REF_PATH, 'utf-8'));
    }
  } catch { /* non-blocking */ }
  lines.push(
    '',
    '**MUST READ for full code examples:**',
    `- \`${backendDoc}\` - Backend (CQRS, Repository, Entity, etc.)`,
    `- \`${frontendDoc}\` - Frontend (Components, Store, Forms, etc.)`
  );
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

  return [
    `## Context`,
    planLine,
    `- Reports: ${reportsPath}`,
    `- Paths: ${plansPath}/ | ${docsPath}/`,
    ``
  ];
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
 * Build parent task state section for subagent awareness
 */
function buildParentTodoSection() {
  const todoState = getTodoStateForSubagent();
  if (!todoState?.hasTodos) return [];

  return [
    ``,
    `## Parent Task Context`,
    `Tasks: ${todoState.taskCount} total, ${todoState.pendingCount} pending`,
    ...(todoState.summaryTodos?.length > 0
      ? [`Active:`, ...todoState.summaryTodos.map(t => `  ${t}`)]
      : [])
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

    const config = loadConfig({ includeProject: false, includeAssertions: false });
    const gitBranch = getGitBranch();
    const namePattern = resolveNamingPattern(config.plan, gitBranch);
    const resolved = resolvePlanPath(null, config);
    const reportsPath = getReportsPath(resolved.path, resolved.resolvedBy, config.plan, config.paths);
    const plansPath = normalizePath(config.paths?.plans) || 'plans';
    const docsPath = normalizePath(config.paths?.docs) || 'docs';

    // Build compact context by assembling all sections
    const agentContext = getAgentContext(agentType, config);

    const lines = [
      `## Subagent: ${agentType}`,
      `ID: ${agentId} | CWD: ${payload.cwd || process.cwd()}`,
      ``,
      ...buildPlanContext(resolved, reportsPath, plansPath, docsPath),
      ...buildLanguageSection(config),
      `## Rules`,
      `- **MUST READ:** .claude/workflows/development-rules.md before implementation`,
      `- Reports → ${reportsPath}`,
      `- YAGNI / KISS / DRY`,
      `- **Class Responsibility:** Logic in LOWEST layer (Model > Service > Component). Mapping → Command/DTO. Constants → Model.`,
      `- Concise, list unresolved Qs at end`,
      ``,
      `## Naming`,
      `- Report: ${reportsPath}${agentType}-${namePattern}.md`,
      `- Plan dir: ${plansPath}/${namePattern}/`,
      ...buildTrustVerification(config),
      ...(agentContext ? [``, `## Agent Instructions`, agentContext] : []),
      ...buildParentTodoSection(),
      ...buildCodingPatternContext(agentType)
    ];

    // SubagentStart requires hookSpecificOutput.additionalContext format
    const output = {
      hookSpecificOutput: {
        hookEventName: "SubagentStart",
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
