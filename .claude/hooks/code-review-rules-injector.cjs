#!/usr/bin/env node
/**
 * Code Review Rules Injector - PreToolUse Hook (Skill matcher)
 *
 * Injects project-specific code review rules when review-related skills are activated.
 * Rules are stored externally in docs/project-reference/code-review-rules.md (configurable via .ck.json).
 *
 * Configuration (.ck.json):
 *   "codeReview": {
 *     "enabled": true,
 *     "rulesPath": "docs/project-reference/code-review-rules.md",
 *     "injectOnSkills": ["code-review", "review-pr", "review-changes"]
 *   }
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./lib/ck-config-utils.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

const { CODE_REVIEW_RULES: INJECTION_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');
const { wasMarkerRecentlyInjected } = require('./lib/prompt-injections.cjs');

/**
 * Trim content to top N + bottom N lines if it exceeds maxLines.
 * Preserves primacy+recency of the content while bounding token cost.
 */
function trimContent(content, maxLines = 50, headLines = 25, tailLines = 25) {
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    return [...lines.slice(0, headLines), '...', ...lines.slice(-tailLines)].join('\n');
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

        // Determine trigger: Skill (review skills) or Edit|Write|MultiEdit (code editing)
        const isSkill = toolName === 'Skill';
        const isEdit = ['Edit', 'Write', 'MultiEdit'].includes(toolName);
        if (!isSkill && !isEdit) process.exit(0);

        // Load config once
        const config = loadConfig({ includeProject: false, includeAssertions: false });
        const reviewConfig = config.codeReview || {};
        if (reviewConfig.enabled === false) process.exit(0);

        if (isSkill) {
            // Skill trigger: only inject for review-related skills
            const skillName = (payload.tool_input?.skill || '').toLowerCase();
            if (!skillName) process.exit(0);

            const targetSkills = reviewConfig.injectOnSkills || ['code-review', 'review', 'review:codebase', 'review-changes', 'code-reviewer'];
            const shouldInject =
                targetSkills.some(target => skillName.includes(target.toLowerCase()) || target.toLowerCase().includes(skillName)) ||
                skillName.endsWith('-review');
            if (!shouldInject) process.exit(0);
        }

        // Check deduplication (top+bottom)
        if (wasMarkerRecentlyInjected(payload.transcript_path, INJECTION_MARKER, DEDUP_LINES.CODE_REVIEW_RULES)) process.exit(0);
        const rulesPath = reviewConfig.rulesPath || 'docs/project-reference/code-review-rules.md';
        const fullPath = path.resolve(process.cwd(), rulesPath);

        if (!fs.existsSync(fullPath)) process.exit(0);

        // Read and inject rules — trim to top25+bottom25 if >50 lines
        const rules = fs.readFileSync(fullPath, 'utf-8');
        const trimmedRules = trimContent(rules);

        console.log(`\n## ${INJECTION_MARKER}\n`);
        console.log(`**Source:** \`${rulesPath}\`\n`);
        console.log(`---\n`);
        console.log(trimmedRules);
        console.log(`\n---\n`);

        process.exit(0);
    } catch (error) {
        // Silent failure - don't block the skill execution
        console.error(`[code-review-rules-injector] Error: ${error.message}`);
        process.exit(0);
    }
}

main();
