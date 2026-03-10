#!/usr/bin/env node
'use strict';
/**
 * Mindset Injector - PreToolUse Hook (Edit|Write|MultiEdit + Skill)
 *
 * Injects critical thinking mindset + AI mistake prevention reminders
 * before code-editing operations and plan-related skill invocations.
 * Also injects lessons on Skill triggers (Edit|Write|MultiEdit lessons
 * handled separately by lessons-injector.cjs).
 *
 * Uses transcript-based dedup to avoid re-injecting on consecutive calls.
 *
 * Triggers:
 *   - PreToolUse → Edit|Write|MultiEdit (before code modifications)
 *   - PreToolUse → Skill (before plan/cook/code/fix/feature skills)
 *
 * Exit Codes:
 *   0 - Success (non-blocking, allows continuation)
 */

const fs = require('fs');
const { injectCriticalContext, injectAiMistakePrevention, injectLessons } = require('./lib/prompt-injections.cjs');

// Skills that benefit from mindset reminders before execution
const MINDSET_SKILLS = new Set([
    'plan',
    'plan-hard',
    'plan-validate',
    'planning',
    'cook',
    'cook-fast',
    'cook-hard',
    'code',
    'fix',
    'fix-issue',
    'fix-parallel',
    'fix-types',
    'feature',
    'feature-implementation',
    'refactoring',
    'debug',
    'code-review',
    'review-changes',
    'review-post-task',
    'integration-test',
    'tdd-spec'
]);

function normalizeSkill(skill) {
    if (!skill) return '';
    return skill.replace(/^\/+/, '').toLowerCase().trim();
}

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
            if (!MINDSET_SKILLS.has(skillName)) process.exit(0);
        } else if (!['Edit', 'Write', 'MultiEdit'].includes(toolName)) {
            process.exit(0);
        }

        // Inject with dedup (shared functions handle transcript checking)
        const critical = injectCriticalContext(transcriptPath);
        if (critical) console.log(critical);

        const aiMistake = injectAiMistakePrevention(transcriptPath);
        if (aiMistake) console.log(aiMistake);

        // Inject lessons on Skill only (Edit|Write|MultiEdit handled by lessons-injector.cjs)
        if (isSkill) {
            const lessons = injectLessons(transcriptPath);
            if (lessons) console.log(lessons);
        }
    } catch {
        /* silent fail — non-blocking */
    }
    process.exit(0);
}

main();
