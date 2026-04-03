#!/usr/bin/env node
'use strict';
/**
 * Dev Rules Injector - PreToolUse Hook (Edit|Write|MultiEdit + Skill)
 *
 * Injects development-rules.md content before code-editing operations
 * and when review/coding skills are invoked.
 *
 * Replaces the UserPromptSubmit injection that previously lived in
 * prompt-context-assembler.cjs — now only fires when AI is about to
 * code or review, saving tokens on non-coding prompts.
 *
 * Triggers:
 *   - PreToolUse → Edit|Write|MultiEdit (before code modifications)
 *   - PreToolUse → Skill (before review and coding skills)
 *
 * Configuration (.ck.json):
 *   devRules.enabled - Enable/disable injection (default: true)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig } = require('./lib/ck-config-utils.cjs');
const { DEV_RULES: DEV_RULES_MARKER, DEDUP_LINES } = require('./lib/dedup-constants.cjs');
const { wasMarkerRecentlyInjected } = require('./lib/prompt-injections.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// ═══════════════════════════════════════════════════════════════════════════
// SKILL SETS
// ═══════════════════════════════════════════════════════════════════════════

// Review skills that trigger full dev rules injection
const REVIEW_SKILLS = new Set([
    'code-review',
    'review-changes',
    'review-post-task',
    'review-architecture',
    'code-simplifier',
    'sre-review',
    'why-review',
    'workflow-review-changes',
    'simplify',
    'story-review',
    'tdd-spec-review',
    'refine-review',
    'knowledge-review',
    'plan-review'
]);

// Coding skills that trigger full dev rules injection
const CODING_SKILLS = new Set([
    'cook',
    'cook-fast',
    'cook-hard',
    'cook-auto',
    'cook-auto-fast',
    'cook-auto-parallel',
    'cook-parallel',
    'code',
    'code-auto',
    'code-no-test',
    'fix',
    'fix-fast',
    'fix-hard',
    'fix-issue',
    'fix-parallel',
    'fix-types',
    'fix-ui',
    'fix-logs',
    'fix-ci'
]);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeSkill(skill) {
    if (!skill) return '';
    return skill.replace(/^\/+/, '').toLowerCase().trim();
}

function resolveDevRulesPath() {
    const localPath = path.join(PROJECT_DIR, '.claude', 'docs', 'development-rules.md');
    const globalPath = path.join(os.homedir(), '.claude', 'docs', 'development-rules.md');
    if (fs.existsSync(localPath)) return localPath;
    if (fs.existsSync(globalPath)) return globalPath;
    return null;
}

function wasRecentlyInjected(transcriptPath) {
    return wasMarkerRecentlyInjected(transcriptPath, DEV_RULES_MARKER, DEDUP_LINES.DEV_RULES);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
    try {
        const stdin = fs.readFileSync(0, 'utf-8').trim();
        if (!stdin) process.exit(0);

        const payload = JSON.parse(stdin);
        const toolName = payload.tool_name || '';
        const transcriptPath = payload.transcript_path || '';

        // Gate: only fire for Edit|Write|MultiEdit or matching Skill
        const isSkill = toolName === 'Skill';
        if (isSkill) {
            const skillName = normalizeSkill(payload.tool_input?.skill);
            if (!REVIEW_SKILLS.has(skillName) && !CODING_SKILLS.has(skillName)) process.exit(0);
        } else if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        // Check if enabled via config
        const config = loadConfig({ includeProject: false, includeAssertions: false });
        if (config.devRules?.enabled === false) process.exit(0);

        // Dedup check
        if (wasRecentlyInjected(transcriptPath)) process.exit(0);

        // Resolve and inject full dev rules content
        const rulesPath = resolveDevRulesPath();
        if (!rulesPath) process.exit(0);

        const content = fs.readFileSync(rulesPath, 'utf-8');
        if (!content.trim()) process.exit(0);

        console.log('\n---\n');
        console.log(`## ${DEV_RULES_MARKER}\n`);
        console.log(`**Source:** \`${rulesPath.includes(os.homedir()) ? '~/.claude/docs/development-rules.md' : '.claude/docs/development-rules.md'}\`\n`);
        console.log('---\n');
        console.log(content);
        console.log('\n---\n');
    } catch {
        /* silent fail — non-blocking */
    }
    process.exit(0);
}

main();
