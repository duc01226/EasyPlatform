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
const path = require('path');
const { injectCriticalContext, injectAiMistakePrevention, injectLessons } = require('./lib/prompt-injections.cjs');
const { TOP_DEDUP_LINES } = require('./lib/dedup-constants.cjs');

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
    'fix-fast',
    'fix-hard',
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
    'tdd-spec',
    // Investigation skills — also get graph protocol reminder
    'scout',
    'investigate',
    'feature-investigation',
    'prove-fix',
    'security',
    'performance'
]);

// Subset of skills that REQUIRE graph trace — gets extra graph protocol injection
const GRAPH_REQUIRED_SKILLS = new Set([
    'scout',
    'investigate',
    'feature-investigation',
    'debug',
    'fix',
    'fix-fast',
    'fix-hard',
    'fix-issue',
    'prove-fix',
    'code-review',
    'review-changes',
    'security',
    'performance',
    'plan',
    'plan-hard'
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

        // Golden Rules from CLAUDE.md — re-inject on Edit|Write|MultiEdit to maintain
        // attention after long planning/investigation phases. Generic: extracts dynamically.
        if (!isSkill) {
            try {
                const goldenMarker = '[Golden Rules Reminder]';
                // Top+bottom dedup — skip if recently injected or still at top of context
                const goldenAlreadyInjected = (() => {
                    try {
                        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
                        const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n');
                        return lines.slice(-100).some(l => l.includes(goldenMarker)) || lines.slice(0, TOP_DEDUP_LINES).some(l => l.includes(goldenMarker));
                    } catch {
                        return false;
                    }
                })();

                if (!goldenAlreadyInjected) {
                    const claudeMdPath = path.resolve(process.env.CLAUDE_PROJECT_DIR || '.', 'CLAUDE.md');
                    if (fs.existsSync(claudeMdPath)) {
                        const content = fs.readFileSync(claudeMdPath, 'utf-8');
                        const goldenMatch = content.match(/\*\*Golden Rules[^*]*\*\*:?\s*\n((?:[\s\S]*?))\n\n/);
                        if (goldenMatch) {
                            const rulesLines = goldenMatch[1].trim().split('\n');
                            let trimmed;
                            if (rulesLines.length > 50) {
                                trimmed = [...rulesLines.slice(0, 25), '...', ...rulesLines.slice(-25)].join('\n');
                            } else {
                                trimmed = rulesLines.join('\n');
                            }
                            console.log(`\n## ${goldenMarker}\n\n${trimmed}`);
                        }
                    }
                }
            } catch {
                /* silent */
            }

            // Graph gate compact — remind to trace before editing
            try {
                const graphDbPath = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
                if (fs.existsSync(graphDbPath)) {
                    console.log(
                        `\n**[GRAPH-GATE]** Run graph trace on key files before editing: \`python .claude/scripts/code_graph trace <file> --direction both --json\``
                    );
                }
            } catch {
                /* silent */
            }
        }

        // Inject lessons on Skill only (Edit|Write|MultiEdit handled by lessons-injector.cjs)
        if (isSkill) {
            const lessons = injectLessons(transcriptPath);
            if (lessons) console.log(lessons);

            // Graph protocol reminder for investigation/fix/review skills
            // Only fires when: skill requires graph + graph.db exists
            // Compact: ~2 lines, no dedup (fires once per skill invocation, not spammy)
            const skillName = normalizeSkill(payload.tool_input?.skill);
            if (GRAPH_REQUIRED_SKILLS.has(skillName)) {
                try {
                    const graphDbPath = path.join(process.env.CLAUDE_PROJECT_DIR || '.', '.code-graph', 'graph.db');
                    if (fs.existsSync(graphDbPath)) {
                        console.log(
                            `\n<HARD-GATE>\n` +
                                `[GRAPH MANDATORY for /${skillName}] You MUST run at least ONE graph trace on key files before concluding this task.\n` +
                                `Command: python .claude/scripts/code_graph trace <key-file> --direction both --json\n` +
                                `Skip ONLY if .code-graph/graph.db does not exist. It EXISTS — so graph trace is REQUIRED.\n` +
                                `</HARD-GATE>`
                        );
                    }
                } catch {
                    /* silent */
                }
            }
        }
    } catch {
        /* silent fail — non-blocking */
    }
    process.exit(0);
}

main();
