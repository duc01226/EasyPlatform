#!/usr/bin/env node
'use strict';

/**
 * Role Context Injector Hook
 *
 * Detects artifact paths and injects role-specific templates and context.
 * Triggers on Read/Write operations to team-artifacts/ folders.
 *
 * @hook PreToolUse
 * @tools Read, Write
 * @pattern stdin/stdout (non-blocking)
 */

const fs = require('fs');

// Role mappings based on artifact paths
const ROLE_PATH_MAPPINGS = {
  'team-artifacts/ideas': {
    role: 'product-owner',
    skill: 'product-owner',
    template: 'team-artifacts/templates/idea-template.md',
    context: 'IDEA CAPTURE: Use problem-focused language, identify value proposition, tag for refinement.'
  },
  'team-artifacts/pbis/stories': {
    role: 'business-analyst',
    skill: 'business-analyst',
    template: 'team-artifacts/templates/user-story-template.md',
    context: 'USER STORY: As a... I want... So that... format, 3+ scenarios per story.'
  },
  'team-artifacts/pbis': {
    role: 'business-analyst',
    skill: 'business-analyst',
    template: 'team-artifacts/templates/pbi-template.md',
    context: 'PBI CREATION: GIVEN/WHEN/THEN format required, INVEST criteria, numeric priority.'
  },
  'team-artifacts/test-specs': {
    role: 'qa-engineer',
    skill: 'qa-engineer',
    template: 'team-artifacts/templates/test-spec-template.md',
    context: 'TEST SPEC: TC-{MOD}-{NNN} IDs required, Evidence field mandatory with file:line format.'
  },
  'team-artifacts/design-specs': {
    role: 'ux-designer',
    skill: 'ux-designer',
    template: 'team-artifacts/templates/design-spec-template.md',
    context: 'DESIGN SPEC: Include component states, design tokens, accessibility requirements.'
  },
  'team-artifacts/qc-reports': {
    role: 'qc-specialist',
    skill: 'qc-specialist',
    template: null,
    context: 'QC REPORT: Checklist-based quality gate, sign-off tracking, compliance verification.'
  }
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
  'qc-specialist': [
    '- [ ] All checklist items verified',
    '- [ ] Gate status stated',
    '- [ ] Sign-offs captured',
    '- [ ] Audit trail updated'
  ]
};

/**
 * Naming convention by role
 */
const NAMING_CONVENTIONS = {
  'product-owner': '{YYMMDD}-po-idea-{slug}.md',
  'business-analyst': '{YYMMDD}-ba-{type}-{slug}.md',
  'qa-engineer': '{YYMMDD}-qa-testspec-{slug}.md',
  'ux-designer': '{YYMMDD}-ux-designspec-{slug}.md',
  'qc-specialist': '{YYMMDD}-qc-gate-{slug}.md'
};

/**
 * Main entry point - stdin/stdout pattern
 */
async function main() {
  try {
    // Read JSON payload from stdin
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

    // Normalize path separators for cross-platform
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check if path matches team-artifacts (check more specific paths first)
    const sortedPaths = Object.keys(ROLE_PATH_MAPPINGS).sort((a, b) => b.length - a.length);

    for (const pathPrefix of sortedPaths) {
      if (normalizedPath.includes(pathPrefix)) {
        const config = ROLE_PATH_MAPPINGS[pathPrefix];
        const injection = generateContextInjection(config);
        console.log(injection);
        break;
      }
    }

    process.exit(0);
  } catch (error) {
    // Non-blocking - always exit 0 even on error
    process.exit(0);
  }
}

/**
 * Generate context injection for matched role
 */
function generateContextInjection(config) {
  const date = new Date();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const checklist = QUALITY_CHECKLISTS[config.role] || [];
  const naming = NAMING_CONVENTIONS[config.role] || '{YYMMDD}-{type}-{slug}.md';

  const lines = [
    `## Role Context (auto-injected)`,
    `- **Active Role:** ${config.role}`,
    `- **Skill:** ${config.skill}`,
    config.template ? `- **Template:** ${config.template}` : '',
    `- **Naming:** ${naming.replace('{YYMMDD}', dateStr)}`,
    ``,
    `## Context`,
    config.context,
    ``,
    `## Quality Checklist`,
    ...checklist
  ].filter(Boolean);

  return lines.join('\n');
}

main();
