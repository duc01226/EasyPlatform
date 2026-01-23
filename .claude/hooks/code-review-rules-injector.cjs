#!/usr/bin/env node
'use strict';

/**
 * Code Review Rules Injector Hook
 *
 * Triggers on: PreToolUse (Skill matcher)
 * Purpose: Injects code review rules when review-related skills are activated
 *
 * Configuration (.ck.json):
 *   codeReview.rulesPath - Path to rules file (default: docs/code-review-rules.md)
 *   codeReview.injectOnSkills - Array of skill names to trigger on
 *   codeReview.enabled - Enable/disable injection (default: true)
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 *
 * @module code-review-rules-injector
 */

const fs = require('fs');
const path = require('path');

// Use existing config loader (consistent with other hooks)
const { loadConfig } = require('./lib/ck-config-utils.cjs');

async function main() {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    let payload;
    try {
        payload = JSON.parse(stdin);
    } catch {
        process.exit(0);
    }

    const toolInput = payload.tool_input || {};
    const skillName = (toolInput.skill || '').toLowerCase();

    // Early exit if no skill name
    if (!skillName) {
        process.exit(0);
    }

    // Load config
    const config = loadConfig();
    const reviewConfig = config.codeReview || {};

    // Early exit if disabled
    if (reviewConfig.enabled === false) {
        process.exit(0);
    }

    // Default skills to match - covers all review-related skills:
    // - code-review: main interactive review skill
    // - tasks-code-review: autonomous comprehensive review
    // - arch-security-review: security-focused review
    // Also supports sub-skills via prefix matching (e.g., code-review/pr)
    const targetSkills = reviewConfig.injectOnSkills || [
        'code-review',
        'tasks-code-review',
        'arch-security-review',
        'review-pr',
        'review-changes',
        'review:codebase',
        'code-reviewer'
    ];

    // Match by:
    // 1. Exact match (e.g., 'code-review')
    // 2. Prefix match with '/' separator (e.g., 'code-review/pr', 'code-review/codebase')
    // 3. Wildcard: Any skill ending with '-review' (intentional - catches future *-review skills
    //    automatically without config updates, e.g., 'security-review', 'perf-review', etc.)
    const isReviewSkill =
        targetSkills.some(target => {
            const t = target.toLowerCase();
            return skillName === t || skillName.startsWith(t + '/');
        }) || skillName.endsWith('-review');

    if (!isReviewSkill) {
        process.exit(0);
    }

    // Load rules from external file
    const rulesPath = reviewConfig.rulesPath || 'docs/code-review-rules.md';
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
    const fullPath = path.resolve(projectDir, rulesPath);

    if (!fs.existsSync(fullPath)) {
        console.error(`[code-review-rules] Warning: Rules file not found: ${rulesPath}`);
        process.exit(0);
    }

    const rules = fs.readFileSync(fullPath, 'utf-8');

    // Output as system-reminder format (consistent with pattern-injector.cjs)
    const injection = `## Project Code Review Rules (Auto-Injected)

**Source:** \`${rulesPath}\`

${rules}`;

    console.log(`\n<system-reminder>\n${injection}</system-reminder>\n`);

    process.exit(0);
}

main().catch(e => {
    console.error(`[code-review-rules] Error: ${e.message}`);
    process.exit(0);
});
