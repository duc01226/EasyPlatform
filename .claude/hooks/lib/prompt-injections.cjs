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

    return [
        `**${CRITICAL_THINKING_MARKER}** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.`,
        `**Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.`,
        `**AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.`,
        ``
    ].join('\n');
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
        `- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.`,
        `- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.`,
        `- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.`,
        `- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.`,
        `- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.`,
        `- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.`,
        `- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.`,
        `- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.`,
        `- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.`,
        `- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.`,
        `- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.`,
        `- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).`,
        `- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.`,
        `- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.`,
        `- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.`,
        `- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.`,
        `- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.`,
        `- **Don't copy nearby patterns without evaluating fit.** Closest example ≠ matching preconditions. Verify new context has same constraints, base classes, scope, lifetime.`,
        `- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.`,
        `- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.`,
        `- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.`,
        `- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via Skill tool or \`/workflow-start <workflowId>\`. NEVER answer or write code before checking. Skip = protocol violation.`,
        `- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".`,
        `- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.`,
        `- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.`,
        `- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.`,
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
        `## ${LESSON_LEARNED_MARKER} [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.`,
        ``,
        `Break work into small tasks (\`TaskCreate\`) before starting. Add final task: "Analyze AI mistakes & lessons learned".`,
        ``,
        `**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**`,
        `1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".`,
        `2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.`,
        `3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.`,
        `4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.`,
        `5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip \`/learn\`.`,
        `6. **Auto-fix gate:** "Could \`/code-review\`/\`/simplify\`/\`/security\`/\`/lint\` catch this?" — Yes → improve review skill instead.`,
        `7. BOTH gates pass → ask user to run \`/learn\`.`,
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

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow; if no clean fit, compose a custom step combination that better serves the prompt
3. **ACTIVATE:** Call \`/workflow-start <workflowId>\` for best-match; or sequence custom steps directly
4. **CREATE TASKS:** \`TaskCreate\` for ALL workflow steps
5. **EXECUTE:** Follow each step in sequence`;
    }

    return `## ${WORKFLOW_PROTOCOL_MARKER} [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use \`AskUserQuestion\` with this structure:
   - Question: "Which workflow do you want to activate?"
   - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
   - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call \`/workflow-start <workflowId>\` for standard; sequence custom steps manually
5. **CREATE TASKS:** \`TaskCreate\` for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence`;
}

module.exports = {
    injectLessons,
    injectCriticalContext,
    injectAiMistakePrevention,
    injectWorkflowProtocol,
    injectLessonReminder,
    wasMarkerRecentlyInjected
};
