'use strict';
/**
 * Shared prompt injection helpers for UserPromptSubmit and PreToolUse hooks.
 *
 * Consumers:
 *   injectLessons       → prompt-context-assembler (UserPromptSubmit), lessons-injector (PreToolUse)
 *   injectLessonReminder → prompt-context-assembler (UserPromptSubmit)
 */

const fs = require('fs');
const path = require('path');
const { LESSONS: LESSONS_MARKER, LESSON_LEARNED: LESSON_LEARNED_MARKER, DEDUP_LINES } = require('./dedup-constants.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const LESSONS_PATH = path.join(PROJECT_DIR, 'docs', 'project-reference', 'lessons.md');

/**
 * Read and return lessons.md content if it has entries.
 * @param {string} transcriptPath - Path to transcript for dedup check
 * @param {boolean} [skipDedup=false] - Skip dedup check (for PreToolUse)
 * @returns {string|null} Formatted lessons content or null
 */
function injectLessons(transcriptPath, skipDedup = false) {
    if (!fs.existsSync(LESSONS_PATH)) return null;
    const content = fs.readFileSync(LESSONS_PATH, 'utf-8').trim();
    if (!content.split('\n').some(l => l.trim().startsWith('- ['))) return null;

    if (!skipDedup && transcriptPath && fs.existsSync(transcriptPath)) {
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        const lastLines = transcript.split('\n').slice(-DEDUP_LINES.LESSONS).join('\n');
        if (lastLines.includes(LESSONS_MARKER)) return null;
    }

    return `## Learned Lessons\n\n${content}`;
}

/**
 * Return lesson-learned reminder text (task planning + /learn prompt).
 * @param {string} transcriptPath - Path to transcript for dedup check
 * @returns {string|null} Reminder text or null if recently injected
 */
function injectLessonReminder(transcriptPath) {
    if (transcriptPath && fs.existsSync(transcriptPath)) {
        try {
            const transcript = fs.readFileSync(transcriptPath, 'utf-8');
            if (
                transcript
                    .split('\n')
                    .slice(-DEDUP_LINES.LESSON_LEARNED)
                    .some(line => line.includes(LESSON_LEARNED_MARKER))
            )
                return null;
        } catch {
            return null;
        }
    }

    return [
        `## ${LESSON_LEARNED_MARKER} Task Planning & Continuous Improvement`,
        ``,
        `## Common AI Mistake Prevention (System Lessons)`,
        ``,
        `- **Re-read files after context compaction.** Edit tools require prior Read in the same context — after compaction all read state is lost. Always re-read before editing.`,
        `- **Grep for old terms after bulk replacements.** AI over-trusts its own find/replace completeness. Always grep the full repo after bulk edits to catch missed references in docs, configs, and catalogs.`,
        `- **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.`,
        `- **After memory loss, check existing state before creating new.** Context compaction wipes memory of prior work — always query current state to resume, never blindly create duplicates.`,
        `- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.`,
        `- **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers that derived from it. Always trace the full chain.`,
        `- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing references (no compile error). Search code, templates, configs, and generated files.`,
        `- **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just the happy path.`,
        `**MANDATORY IMPORTANT MUST** break work into small todo tasks using \`TaskCreate\` BEFORE starting.`,
        `**MANDATORY IMPORTANT MUST** add a **final todo task** at the end of every task list:`,
        ``,
        `> **"Analyze AI mistakes & lessons learned"** — Review the session for AI errors ` +
            `(wrong assumptions, missed patterns, hallucinated APIs, over-engineering, ` +
            `missed reuse opportunities). If any lesson is found, ask the user:`,
        `> *"Found [N] lesson(s) learned. Lesson(s) guide prompt must be analyzed the root cause and to have a generic for AI lesson that can be used in any projects, not just this specific project. Use \`/learn\` to remember for future sessions?"*`,
        `> Wait for user confirmation before invoking \`/learn\`.`,
        ``
    ].join('\n');
}

module.exports = { injectLessons, injectLessonReminder };
