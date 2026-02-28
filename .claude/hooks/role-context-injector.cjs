#!/usr/bin/env node
/**
 * Role Context Injector Hook
 *
 * Detects artifact paths and injects role-specific templates and context.
 * Triggers on Read/Write operations to team-artifacts/ folders.
 *
 * @trigger PreToolUse (Read, Write)
 * @injects Role templates, naming conventions, quality checklists
 *
 * Input: JSON via stdin with tool_name, tool_input
 * Output: Context string via stdout
 * Exit: 0 (non-blocking)
 */

const fs = require('fs');
const path = require('path');
const { normalizePathForComparison } = require('./lib/ck-path-utils.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Role mappings based on artifact paths
const ROLE_PATH_MAPPINGS = {
  'team-artifacts/ideas/': {
    role: 'product-owner',
    skill: 'product-owner',
    template: 'team-artifacts/templates/idea-template.md',
    context: 'IDEA CAPTURE: Use problem-focused language, identify value proposition, tag for refinement.'
  },
  'team-artifacts/pbis/stories/': {
    role: 'business-analyst',
    skill: 'business-analyst',
    template: 'team-artifacts/templates/user-story-template.md',
    context: 'USER STORY: As a... I want... So that... format, 3+ scenarios per story.'
  },
  'team-artifacts/pbis/': {
    role: 'business-analyst',
    skill: 'business-analyst',
    template: 'team-artifacts/templates/pbi-template.md',
    context: 'PBI CREATION: GIVEN/WHEN/THEN format required, INVEST criteria, numeric priority.'
  },
  'team-artifacts/test-specs/': {
    role: 'qa-engineer',
    skill: 'test-spec',
    template: 'team-artifacts/templates/test-spec-template.md',
    context: 'TEST SPEC: TC-{MOD}-{NNN} IDs required, Evidence field mandatory with file:line format.'
  },
  'team-artifacts/design-specs/': {
    role: 'ux-designer',
    skill: 'ux-designer',
    template: 'team-artifacts/templates/design-spec-template.md',
    context: 'DESIGN SPEC: Include component states, design tokens, accessibility requirements.'
  },
  'team-artifacts/qc-reports/': {
    role: 'qc-specialist',
    skill: 'qc-specialist',
    template: 'team-artifacts/templates/qc-report-template.md',
    context: 'QC REPORT: Gate pass/fail status, checklist completion, sign-off tracking.'
  }
};

// Naming convention by role
const NAMING_CONVENTIONS = {
  'product-owner': '{YYMMDD}-po-{type}-{slug}.md',
  'business-analyst': '{YYMMDD}-ba-{type}-{slug}.md',
  'qa-engineer': '{YYMMDD}-qa-{type}-{slug}.md',
  'ux-designer': '{YYMMDD}-ux-{type}-{slug}.md',
  'project-manager': '{YYMMDD}-pm-{type}-{slug}.md',
  'qc-specialist': '{YYMMDD}-qc-{type}-{slug}.md'
};

// Quality checklists by role
const QUALITY_CHECKLISTS = {
  'product-owner': [
    '- [ ] Problem statement is user-focused',
    '- [ ] Value proposition quantified',
    '- [ ] Priority is numeric (not High/Med/Low)',
    '- [ ] Dependencies listed'
  ],
  'business-analyst': [
    '- [ ] User story format correct',
    '- [ ] 3+ scenarios (positive, negative, edge)',
    '- [ ] GIVEN/WHEN/THEN format',
    '- [ ] INVEST criteria met'
  ],
  'qa-engineer': [
    '- [ ] TC-{MOD}-{NNN} IDs assigned',
    '- [ ] Evidence field has file:line',
    '- [ ] Summary counts match',
    '- [ ] No template placeholders'
  ],
  'ux-designer': [
    '- [ ] All states documented',
    '- [ ] Design tokens specified',
    '- [ ] Accessibility notes included',
    '- [ ] Responsive breakpoints defined'
  ],
  'project-manager': [
    '- [ ] Metrics calculated',
    '- [ ] Blockers identified',
    '- [ ] Action items assigned',
    '- [ ] Risks documented'
  ],
  'qc-specialist': [
    '- [ ] All checklist items verified',
    '- [ ] Gate status stated',
    '- [ ] Sign-offs captured',
    '- [ ] Audit trail updated'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if path contains the target pattern
 */
function pathContains(filePath, pattern) {
  const normalizedPath = normalizePathForComparison(filePath);
  const normalizedPattern = pattern.toLowerCase();
  return normalizedPath.includes(normalizedPattern);
}

/**
 * Find matching role config for file path
 * Note: More specific paths (like pbis/stories/) are checked first
 */
function findRoleConfig(filePath) {
  // Sort by path length descending to match most specific first
  const sortedMappings = Object.entries(ROLE_PATH_MAPPINGS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [pathPrefix, config] of sortedMappings) {
    if (pathContains(filePath, pathPrefix)) {
      return config;
    }
  }
  return null;
}

/**
 * Generate context injection string
 */
function generateContextInjection(config) {
  const date = new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const namingPattern = NAMING_CONVENTIONS[config.role] || '{YYMMDD}-{role}-{type}-{slug}.md';
  const checklist = QUALITY_CHECKLISTS[config.role] || [];

  const lines = [
    '',
    '## Role Context (auto-injected)',
    '',
    `**Active Role:** ${config.role}`,
    `**Skill:** ${config.skill}`,
    `**Template:** ${config.template}`,
    `**Naming:** ${namingPattern.replace('{YYMMDD}', dateStr)}`,
    '',
    '### Context',
    config.context,
    '',
    '### Quality Checklist',
    ...checklist,
    ''
  ];

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);
    const toolName = payload.tool_name || '';
    const toolInput = payload.tool_input || {};

    // Only process Read/Write operations
    if (!['Read', 'Write'].includes(toolName)) {
      process.exit(0);
    }

    // Extract file path from tool input
    const filePath = toolInput.file_path || toolInput.path || '';
    if (!filePath) process.exit(0);

    // Find matching role config
    const config = findRoleConfig(filePath);
    if (!config) process.exit(0);

    // Output the injection
    const injection = generateContextInjection(config);
    console.log(injection);

    process.exit(0);
  } catch (error) {
    // Non-blocking - exit silently on error
    process.exit(0);
  }
}

main();
