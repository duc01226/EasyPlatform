#!/usr/bin/env node
/**
 * Code Review Rules Injector - PreToolUse Hook (Skill matcher)
 *
 * Injects project-specific code review rules when review-related skills are activated.
 * Rules are stored externally in docs/code-review-rules.md (configurable via .ck.json).
 *
 * Configuration (.ck.json):
 *   "codeReview": {
 *     "enabled": true,
 *     "rulesPath": "docs/code-review-rules.md",
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

const { CODE_REVIEW_RULES: INJECTION_MARKER } = require('./lib/dedup-constants.cjs');

function wasRecentlyInjected(transcriptPath) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        // Check last 300 lines (rules are ~150 lines, so this covers ~2 injections)
        return transcript
            .split('\n')
            .slice(-300)
            .some(line => line.includes(INJECTION_MARKER));
    } catch (e) {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);

        // Extract skill name from tool input
        const toolInput = payload.tool_input || {};
        const skillName = (toolInput.skill || '').toLowerCase();

        // Early exit if not a Skill tool call
        if (!skillName) process.exit(0);

        // Load configuration
        const config = loadConfig({ includeProject: false, includeAssertions: false });
        const reviewConfig = config.codeReview || {};

        // Check if enabled
        if (reviewConfig.enabled === false) process.exit(0);

        // Check if this skill should trigger injection
        const targetSkills = reviewConfig.injectOnSkills || ['code-review', 'review', 'review:codebase', 'review-changes', 'code-reviewer'];
        const shouldInject = targetSkills.some(target => skillName.includes(target.toLowerCase()) || target.toLowerCase().includes(skillName))
            // Wildcard: catch future *-review skills automatically
            || skillName.endsWith('-review');

        if (!shouldInject) process.exit(0);

        // Check deduplication
        if (wasRecentlyInjected(payload.transcript_path)) process.exit(0);

        // Resolve rules file path
        const rulesPath = reviewConfig.rulesPath || 'docs/code-review-rules.md';
        const fullPath = path.resolve(process.cwd(), rulesPath);

        if (!fs.existsSync(fullPath)) {
            console.log(`\n⚠️ **Code Review Rules Warning:** Rules file not found at \`${rulesPath}\``);
            console.log(`Create the file or update \`codeReview.rulesPath\` in \`.claude/.ck.json\`\n`);
            process.exit(0);
        }

        // Read and inject rules
        const rules = fs.readFileSync(fullPath, 'utf-8');

        console.log(`\n## ${INJECTION_MARKER}\n`);
        console.log(`**Source:** \`${rulesPath}\` | **Skill:** \`${skillName}\`\n`);
        console.log(`---\n`);
        console.log(rules);
        console.log(`\n---\n`);
        console.log(`**IMPORTANT:** Apply these project-specific rules during your review.\n`);

        process.exit(0);
    } catch (error) {
        // Silent failure - don't block the skill execution
        console.error(`[code-review-rules-injector] Error: ${error.message}`);
        process.exit(0);
    }
}

main();
