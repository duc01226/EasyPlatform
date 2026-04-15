'use strict';
/**
 * Shared prompt injection helpers for UserPromptSubmit and PreToolUse hooks.
 *
 * Consumers:
 *   injectLessons            → prompt-context-assembler (UserPromptSubmit), lessons-injector (PreToolUse), subagent-context-builders (Agent)
 *   injectCriticalContext    → prompt-context-assembler (UserPromptSubmit), mindset-injector (PreToolUse), subagent-context-builders (Agent)
 *   injectAiMistakePrevention → mindset-injector (PreToolUse), subagent-context-builders (Agent)
 *   injectWorkflowProtocol   → prompt-context-assembler (UserPromptSubmit)
 *   injectLessonReminder     → prompt-context-assembler (UserPromptSubmit)
 */

const fs = require('fs');
const path = require('path');
const {
    LESSONS: LESSONS_MARKER,
    LESSON_LEARNED: LESSON_LEARNED_MARKER,
    WORKFLOW_PROTOCOL: WORKFLOW_PROTOCOL_MARKER,
    CRITICAL_THINKING: CRITICAL_THINKING_MARKER,
    AI_MISTAKE_PREVENTION: AI_MISTAKE_PREVENTION_MARKER,
    DEDUP_LINES,
    TOP_DEDUP_LINES
} = require('./dedup-constants.cjs');

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

    if (!skipDedup && wasMarkerRecentlyInjected(transcriptPath, LESSONS_MARKER, DEDUP_LINES.LESSONS)) {
        return null;
    }

    return `## Learned Lessons\n\n${content}`;
}

/**
 * Helper: check if a marker exists in the transcript — bottom (recency) OR top (primacy).
 *
 * Bottom check: marker in last N lines → still in AI recency window → skip re-injection.
 * Top check: marker in first M lines → still in AI primacy window → skip re-injection.
 *
 * This prevents duplicate injection when content is at the top of context (from earlier
 * prompts) but has scrolled past the bottom dedup window due to tool call output.
 * After compaction, both top and bottom are reset → correctly triggers re-injection.
 *
 * @param {string} transcriptPath - Path to transcript file
 * @param {string} marker - Dedup marker string to search for
 * @param {number} bottomLines - Number of trailing lines to check (recency)
 * @param {number} [topLines=50] - Number of leading lines to check (primacy)
 * @returns {boolean}
 */
function wasMarkerRecentlyInjected(transcriptPath, marker, bottomLines, topLines = TOP_DEDUP_LINES) {
    try {
        if (!transcriptPath || !fs.existsSync(transcriptPath)) return false;
        const transcript = fs.readFileSync(transcriptPath, 'utf-8');
        const allLines = transcript.split('\n');

        // Bottom check (recency) — marker still in recent output
        if (allLines.slice(-bottomLines).some(l => l.includes(marker))) return true;

        // Top check (primacy) — marker still at top of context from earlier injection
        if (allLines.slice(0, topLines).some(l => l.includes(marker))) return true;

        return false;
    } catch {
        return false;
    }
}

/**
 * Return critical thinking mindset reminder.
 * @param {string} [transcriptPath] - Path to transcript for dedup check
 * @param {boolean} [skipDedup=false] - Skip dedup check (always inject)
 * @returns {string|null} Formatted text or null if recently injected
 */
function injectCriticalContext(transcriptPath, skipDedup = false) {
    if (!skipDedup && wasMarkerRecentlyInjected(transcriptPath, CRITICAL_THINKING_MARKER, DEDUP_LINES.CRITICAL_THINKING)) {
        return null;
    }

    return [`**${CRITICAL_THINKING_MARKER}** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.`, ``].join(
        '\n'
    );
}

/**
 * Return the "Common AI Mistake Prevention" block (system lessons).
 * Injected independently of the lesson-learned reminder.
 * @param {string} [transcriptPath] - Path to transcript for dedup check
 * @param {boolean} [skipDedup=false] - Skip dedup check (always inject)
 * @returns {string|null} Formatted text or null if recently injected
 */
function injectAiMistakePrevention(transcriptPath, skipDedup = false) {
    if (!skipDedup && wasMarkerRecentlyInjected(transcriptPath, AI_MISTAKE_PREVENTION_MARKER, DEDUP_LINES.AI_MISTAKE_PREVENTION)) {
        return null;
    }

    return [
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
        `- **Update docs that embed canonical data when the source changes.** Docs inlining derived data (workflow sequences, schemas, config tables) go stale silently on source modification — trace and update all embedding docs alongside the canonical source.`,
        `- **Verify sub-agent results after context recovery.** Background agents may complete while parent context is compacted — grep-verify their output rather than trusting assumed completion.`,
        `- **Cross-check full target list against sub-agent assignments.** When distributing work to parallel sub-agents by category, items at category boundaries get missed. Always reconcile the union of all agent assignments against the complete target list before proceeding.`,
        `- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption needs permission + knowledge + enforcement (numbered workflow step).`,
        `- **Persist sub-agent findings incrementally, not as a final batch.** Long-running sub-agents risk context cutoffs before writing their single final report — all findings are lost. Instruct sub-agents to write findings to the report file after each file/section reviewed, so partial results survive if the agent is cut off.`,
        `- **When debugging, ask "whose responsibility?" before fixing.** Trace whether the bug is in the caller (wrong data) or the callee (wrong handling). Fix at the responsible layer — never patch the symptom site with context-specific guards.`,
        `- **Grep ALL removed names after extraction/refactoring.** AI finishes the primary file then reports "done" — secondary files silently keep dangling references. After moving or deleting ANY symbol, grep the entire scope for every removed name before declaring complete.`,
        `- **Assume existing values are intentional — ask WHY before changing.** AI pattern-matches a value as "wrong" and "fixes" it without investigating context. Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code. The current value may exist for a reason you haven't discovered yet.`,
        `- **Verify ALL affected outputs, not just the first.** AI confirms one build passes then declares success. Changes touching multiple stacks (backend, frontend, tests, docs) require verifying EVERY output. One green check is not all green checks.`,
        `- **Don't copy nearby patterns without evaluating fit.** AI mimics the closest code example without checking if preconditions match. Before reusing a pattern: verify the new context has the same constraints, base classes, scope, and lifetime requirements as the source.`,
        `- **Holistic-first debugging — resist the nearest-attention trap.** When investigating any failure, do NOT dive into the first plausible cause. First list EVERY precondition the thing needs to work (config, env vars, file paths, DB names, endpoints, credentials, versions, DI registrations, data preconditions). Then verify EACH precondition against evidence (grep/cat/query — not reasoning). Ask "what would falsify my hypothesis?" — if nothing, it's not a hypothesis. The most expensive AI failure is assuming the obvious layer is correct and going deeper — when the actual bug sits in a layer you never questioned (e.g., tests debugged for hours as code bugs when the real cause was test appsettings pointing at a different database than the running service).`,
        `- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every changed line must trace directly to the bug. Don't restyle, reformat, or improve adjacent code even if you'd do it differently. Orphan cleanup: remove only imports/variables YOUR changes made unused — not pre-existing dead code. (2) Review/enhancement task → implement improvements you see AND announce them explicitly as "Enhancement beyond main request: [what]." Never leave visible quality improvements unfixed when the task gives you license to improve. Either way: never silently scope-creep. Diff test: "Would this line appear if I hadn't been asked to do X?" — if not, either delete it or announce it.`,
        `- **Surface ambiguity before coding — don't pick silently.** If a request has multiple valid interpretations, present each with an effort estimate: "[Request] could mean: (1) [approach, Nh], (2) [approach, Nh]. Which matters most?" List assumptions first (scope, format, volume, constraints) — never assume all-records, file-based, or the more complex path. If a simpler approach exists, say so explicitly before implementing. Never silently pick one interpretation and run with it.`,
        `- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match the task against the workflow catalog and skill list — if a match exists, invoke it via the Skill tool; if a workflow matches, call \`/workflow-start <workflowId>\`. NEVER answer or write code before checking. Skipping this step is a protocol violation.`,
        `- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default to SKEPTIC not VALIDATOR: steel-man at least one rejected alternative (argue FOR it before dismissing), invert every stated reason ("Why NOT this choice — what does it sacrifice?"), stress-test the top 2-3 assumptions ("What if this is wrong?"), run a pre-mortem ("It ships and fails in 3 months — what breaks?"), identify 1-2 alternatives the author never mentioned, and generate contrarian arguments BEFORE finalizing any verdict; presence of a section is NOT quality — quality requires causal reasoning ("X leads to Y"), concrete mitigations, and evidence, not vague descriptions like "it's better" or "monitor closely".`,
        `- **Front-load report-write in sub-agent prompts for large reviews.** Sub-agents reviewing many files hit their token/step budget before writing the final report — all findings are lost. Design sub-agent prompts so: (1) the report-write step is the explicit first deliverable, (2) findings are appended per-file/section immediately (not batched at the end), and (3) the target file scope is bounded so the agent doesn't exhaust budget on reads alone. If a sub-agent returns truncated mid-sentence output and no report file, spawn a new one with a narrower scope rather than retrying the same prompt.`,
        `- **After context compaction, re-verify all prior phase outcomes before continuing.** Session summaries describe what the AI intended — not what actually persisted in the environment (git index, filesystem, running processes). When resuming a multi-phase task after compaction, the FIRST action must be a state audit: re-check git status, re-read modified files, verify filesystem state. Treat every "completed" phase claim as an untested hypothesis until confirmed by evidence.`,
        ``
    ].join('\n');
}

/**
 * Return lesson-learned reminder text (task planning + /learn prompt).
 * @param {string} transcriptPath - Path to transcript for dedup check
 * @returns {string|null} Reminder text or null if recently injected
 */
function injectLessonReminder(transcriptPath) {
    if (wasMarkerRecentlyInjected(transcriptPath, LESSON_LEARNED_MARKER, DEDUP_LINES.LESSON_LEARNED)) {
        return null;
    }

    return [
        `## ${LESSON_LEARNED_MARKER} [BLOCKING] Task Planning & Continuous Improvement — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.`,
        ``,
        `Break work into small tasks (\`TaskCreate\`) before starting. Add final task: "Analyze AI mistakes & lessons learned".`,
        ``,
        `**When extracting lessons — ROOT CAUSE ONLY, not symptom fixes:**`,
        `1. Name the FAILURE MODE (reasoning/assumption failure), not the symptom ("assumed API existed without reading source" not "used wrong enum value")`,
        `2. Test generality: does this failure mode apply to ≥3 different contexts or codebases? If not, go up one abstraction level.`,
        `3. Write as a universal rule — strip ALL project-specific names, file paths, class names. Must be useful on any codebase.`,
        `4. Consolidate: if multiple mistakes share one failure mode → ONE lesson, not many.`,
        `5. If lessons found, ask user to run \`/learn\`.`,
        ``
    ].join('\n');
}

/**
 * Return workflow execution protocol text (detection + task breakdown guidance).
 * Content varies by confirmationMode: "always" asks user, "never" auto-executes.
 * @param {string} transcriptPath - Path to transcript for dedup check
 * @param {string} confirmationMode - "always" | "never"
 * @returns {string|null} Protocol text or null if recently injected
 */
function injectWorkflowProtocol(transcriptPath, confirmationMode) {
    if (wasMarkerRecentlyInjected(transcriptPath, WORKFLOW_PROTOCOL_MARKER, DEDUP_LINES.WORKFLOW_PROTOCOL)) {
        return null;
    }

    if (confirmationMode === 'never') {
        return `## ${WORKFLOW_PROTOCOL_MARKER} [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against the workflow catalog
2. **ACTIVATE:** Call \`/workflow-start <workflowId>\` immediately
3. **CREATE TASKS:** \`TaskCreate\` for ALL workflow steps
4. **EXECUTE:** Follow each step in sequence`;
    }

    return `## ${WORKFLOW_PROTOCOL_MARKER} [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against the workflow catalog
2. **ASK:** Use \`AskUserQuestion\`: "Activate [Workflow] (Recommended)" vs "Execute directly"
3. **ACTIVATE (if confirmed):** Call \`/workflow-start <workflowId>\`
4. **CREATE TASKS:** \`TaskCreate\` for ALL workflow steps
5. **EXECUTE:** Follow each step in sequence`;
}

module.exports = {
    injectLessons,
    injectCriticalContext,
    injectAiMistakePrevention,
    injectWorkflowProtocol,
    injectLessonReminder,
    wasMarkerRecentlyInjected
};
