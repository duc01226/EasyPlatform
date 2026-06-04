'use strict';

const fs = require('fs');
const path = require('path');
const { extractSyncBlock, extractSyncBody } = require('./extract-sync-block.cjs');

const DEFAULT_SHARED_AI_SDD_SYNC_TAGS = ['ai-sdd-artifact-contract', 'ai-sdd-artifact-contract:reminder'];
const DEFAULT_SOURCE_LINE =
    'Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`';

function normalizePromptProtocolText(text) {
    if (!text || typeof text !== 'string') return null;
    const normalized = text.trim();
    return normalized.length > 0 ? normalized : null;
}

function loadCkConfig(rootDir) {
    const ckConfigPath = path.join(rootDir, '.claude', '.ck.json');
    try {
        return JSON.parse(fs.readFileSync(ckConfigPath, 'utf8'));
    } catch {
        return {};
    }
}

function sharedSyncInlinePath(rootDir) {
    return path.join(rootDir, '.claude', 'skills', 'shared', 'sync-inline-versions.md');
}

function readSharedSyncInline(rootDir) {
    return fs.readFileSync(sharedSyncInlinePath(rootDir), 'utf8');
}

function buildPortabilityBoundary(portability = {}) {
    const projectConfigPath = portability.projectConfigPath || 'docs/project-config.json';
    const docsIndexPath = portability.docsIndexPath || 'docs/project-reference/docs-index-reference.md';
    const rule =
        portability.rule ||
        'Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/.';

    return `**Generic portability boundary:** ${rule} Apply shared AI-SDD from \`shared/sdd-artifact-contract.md\`. Read \`${projectConfigPath}\` and \`${docsIndexPath}\`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or \`docs/specs/\` work, route through the local spec docs named by the docs index: \`feature-spec-reference.md\`, \`spec-system-reference.md\`, \`spec-principles.md\`, and \`workflow-spec-test-code-cycle-reference.md\` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run \`$project-init\` (or the narrow lower-level route such as \`$project-config\`, \`$docs-init\`, \`$scan-all\`, or \`$scan --target=<key>\`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.`;
}

function buildWorkflowProtocolText(portability = {}) {
    return `## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

${buildPortabilityBoundary(portability)}

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call \`$start-workflow <workflowId>\`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)`;
}

function buildSharedAiSddMarkerSection(rootDir, tags = DEFAULT_SHARED_AI_SDD_SYNC_TAGS) {
    try {
        const content = readSharedSyncInline(rootDir);
        const blocks = tags.map((tag) => extractSyncBlock(content, tag)).filter(Boolean);
        if (blocks.length === 0) return null;

        return [
            '## Shared AI-SDD Protocol Markers',
            '',
            'Source: `.claude/skills/shared/sync-inline-versions.md`',
            '',
            blocks.join('\n\n---\n\n')
        ].join('\n');
    } catch {
        return null;
    }
}

function buildCanonicalProtocolText(rootDir, tag) {
    try {
        return extractSyncBody(readSharedSyncInline(rootDir), tag);
    } catch {
        return null;
    }
}

function buildTaskPlanningProtocolText() {
    return '**[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.';
}

function buildLessonLearnedReminderText() {
    return `## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**
1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip \`$learn\`.
6. **Auto-fix gate:** "Could \`$code-review\`/\`$code-simplifier\`/\`$security-review\`/\`$lint\` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run \`$learn\`.`;
}

function buildPromptProtocolSections(rootDir, options = {}) {
    const ckConfig = loadCkConfig(rootDir);
    const portability = ckConfig?.portability ?? {};
    const includeAiSdd = options.includeAiSdd !== false;
    const includeUniversalRules = options.includeUniversalRules !== false;
    const includeLessonReminder = options.includeLessonReminder === true;

    return [
        normalizePromptProtocolText(buildWorkflowProtocolText(portability)),
        includeAiSdd ? normalizePromptProtocolText(buildSharedAiSddMarkerSection(rootDir, options.sharedAiSddTags)) : null,
        normalizePromptProtocolText(buildTaskPlanningProtocolText()),
        includeLessonReminder ? normalizePromptProtocolText(buildLessonLearnedReminderText()) : null,
        includeUniversalRules
            ? normalizePromptProtocolText(buildCanonicalProtocolText(rootDir, 'critical-thinking-mindset:full'))
            : null,
        includeUniversalRules
            ? normalizePromptProtocolText(buildCanonicalProtocolText(rootDir, 'ai-mistake-prevention:full'))
            : null
    ].filter(Boolean);
}

function buildPromptProtocolMirrorSection(rootDir, options = {}) {
    const heading = options.heading || 'Prompt Protocol Mirror (Auto-Synced)';
    const sourceLine = options.sourceLine || DEFAULT_SOURCE_LINE;
    const sections = buildPromptProtocolSections(rootDir, options);

    return [`## ${heading}`, '', sourceLine, '', ...sections].join('\n');
}

function buildCodexPromptProtocolBlock(rootDir, options = {}) {
    const startMarker = options.startMarker || '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->';
    const endMarker = options.endMarker || '<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->';
    const section = buildPromptProtocolMirrorSection(rootDir, {
        ...options,
        heading: options.heading || 'Hookless Prompt Protocol Mirror (Auto-Synced)',
        includeLessonReminder: options.includeLessonReminder ?? true
    });

    return [startMarker, section, '', endMarker].join('\n');
}

module.exports = {
    DEFAULT_SOURCE_LINE,
    buildCanonicalProtocolText,
    buildCodexPromptProtocolBlock,
    buildLessonLearnedReminderText,
    buildPortabilityBoundary,
    buildPromptProtocolMirrorSection,
    buildPromptProtocolSections,
    buildSharedAiSddMarkerSection,
    buildTaskPlanningProtocolText,
    buildWorkflowProtocolText,
    loadCkConfig,
    normalizePromptProtocolText
};
