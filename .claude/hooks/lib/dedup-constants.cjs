'use strict';
/**
 * Centralized dedup markers — legacy of the context-injection hooks, most of which were removed
 * in the de-hooking refactor (see "Consumers" below).
 *
 * Any remaining consumer that references an injection marker MUST import from here.
 * Never define marker strings inline.
 *
 * IMPORTANT: Changing a marker string affects dedup/parity behavior across all consumers.
 * Run tests after any change: node .claude/hooks/tests/test-all-hooks.cjs
 *
 * Consumers (after the de-hooking refactor):
 *   LESSONS / CRITICAL_THINKING / AI_MISTAKE_PREVENTION → via lib/prompt-injections, whose
 *     critical-context output is verified against the canonical SYNC:* blocks by
 *     tests/suites/protocol-text-parity.test.cjs (the post-compact-recovery SessionStart
 *     consumer was removed in the de-hooking refactor).
 *
 * The remaining markers (WORKFLOW_CATALOG / _P2 / _P3, CODE_PATTERNS,
 * BACKEND/FRONTEND/STYLING/KNOWLEDGE/DESIGN_SYSTEM context, CODE_REVIEW_RULES, DEV_RULES,
 * PROJECT_STRUCTURE, CLAUDE_MD, PYTHON_GUIDE, …) fed hooks that have since been removed —
 * the WORKFLOW_CATALOG markers drove the deleted workflow-router.cjs (the workflow catalog is
 * now static in CLAUDE.md `## Workflow & Skills Catalog`); the per-context PreToolUse inject
 * hooks and the prompt-context-assembler family are likewise gone. That guidance now lives
 * statically in CLAUDE.md / agent / skill files. Constants are retained as the single source
 * of truth for any future re-use.
 *
 * DEDUP_LINES — dynamically calculated transcript line counts for each marker.
 * Values are computed at runtime based on actual injection content sizes.
 * All hooks MUST import these instead of hardcoding .slice(-N) values.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// =============================================================================
// DYNAMIC DEDUP CALCULATION
// =============================================================================

/** Minimum dedup window — never go below this regardless of content size */
const MIN_FLOOR = 50;

/**
 * Count lines in a file. Returns 0 if file doesn't exist.
 * @param {string} relativePath - Path relative to PROJECT_DIR
 * @returns {number} Line count
 */
function countFileLines(relativePath) {
    try {
        const fullPath = path.resolve(PROJECT_DIR, relativePath);
        if (!fs.existsSync(fullPath)) return 0;
        const content = fs.readFileSync(fullPath, 'utf-8');
        return content.split('\n').length;
    } catch {
        return 0;
    }
}

/**
 * Count workflow entries in workflows.json.
 * Each workflow generates ~2 lines in the catalog output.
 * @returns {number} Estimated output lines for workflow catalog
 */
function countWorkflowCatalogLines() {
    try {
        const paths = [path.join(PROJECT_DIR, '.claude', 'workflows.json'), path.join(os.homedir(), '.claude', 'workflows.json')];
        for (const p of paths) {
            if (!fs.existsSync(p)) continue;
            const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
            const count = Object.keys(data.workflows || {}).length;
            // ~2 lines per workflow + ~35 lines header/instructions
            return count * 2 + 35;
        }
    } catch {
        /* fall through */
    }
    return 0;
}

/**
 * Count output lines of generateProjectSummary().
 * Lazily requires project-config-loader to avoid circular dependency at module load.
 * @returns {number} Actual line count of generated summary
 */
function countProjectConfigSummaryLines() {
    try {
        const { generateProjectSummary } = require('./project-config-loader.cjs');
        const summary = generateProjectSummary();
        if (!summary) return 0;
        return summary.split('\n').length;
    } catch {
        return 0;
    }
}

/**
 * Content source definitions for dynamic dedup calculation.
 *
 * Types:
 *   'file'     — Content is read from file(s) and injected. Dedup window = file lines × multiplier.
 *   'fixed'    — Constant value. Used for template injections and behavioral windows.
 *
 * Multiplier rationale:
 *   Default 3× for most injections — ensures content stays visible in the
 *   AI attention window across long sessions. Exceptions:
 *   - DEV_RULES, WORKFLOW_CATALOG use 2× (larger content, less drift-sensitive).
 *   - PROJECT_STRUCTURE uses 3× (increased to reduce re-injection frequency by ~50%).
 */
const CONTENT_SOURCES = {
    // Guidance-only injections (no full content) — fixed 100-line dedup window
    CODE_PATTERNS: { type: 'fixed', value: 100 },
    // Note: CODE_REVIEW_RULES is also injected as full content by code-review-rules-injector.cjs;
    // fixed:100 applies to the guidance-pointer emitted by the code-review-rules builder (dispatcher 1/3).
    CODE_REVIEW_RULES: { type: 'fixed', value: 100 },
    E2E_CONTEXT: { type: 'fixed', value: 100 },
    INTEGRATION_TEST_CONTEXT: { type: 'fixed', value: 100 },
    FEATURE_DOCS_CONTEXT: { type: 'fixed', value: 100 },
    PROJECT_STRUCTURE: { type: 'fixed', value: 100 },
    CLAUDE_MD: {
        type: 'file',
        files: ['CLAUDE.md'],
        multiplier: 3, // critical — re-inject sooner to prevent context drift
        fallback: 900
    },
    DEV_RULES: {
        type: 'file',
        files: ['.claude/docs/development-rules.md'],
        multiplier: 2,
        extraLines: 90, // buildReminder() template lines
        fallback: 300
    },
    DEV_RULES_MODULARIZATION: {
        // Subset marker within DEV_RULES injection — window covers the full output
        type: 'file',
        files: ['.claude/docs/development-rules.md'],
        multiplier: 3,
        extraLines: 90,
        fallback: 200
    },
    LESSONS: {
        type: 'file',
        files: ['docs/project-reference/lessons.md'],
        multiplier: 3,
        fallback: 100
    },
    WORKFLOW_CATALOG: {
        type: 'computed',
        compute: countWorkflowCatalogLines,
        multiplier: 2,
        fallback: 200
    },
    // Guidance-only injections — fixed 100-line dedup window
    BACKEND_CONTEXT: { type: 'fixed', value: 100 },
    FRONTEND_CONTEXT: { type: 'fixed', value: 100 },
    STYLING_CONTEXT: { type: 'fixed', value: 100 },
    KNOWLEDGE_CONTEXT: { type: 'fixed', value: 100 },
    DESIGN_SYSTEM: { type: 'fixed', value: 100 },
    DESIGN_SYSTEM_CANONICAL_GUIDE: { type: 'fixed', value: 50 },
    LESSON_LEARNED: { type: 'fixed', value: 100 },
    // Widened 100 → 400: full 6-step protocol body is large (~250 tokens) and the compact
    // [WORKFLOW-GATE] anchor already covers actionable rules; 4× window cuts re-fire frequency.
    WORKFLOW_PROTOCOL: { type: 'fixed', value: 400 },
    CRITICAL_THINKING: { type: 'fixed', value: 100 },
    AI_MISTAKE_PREVENTION: { type: 'fixed', value: 100 },
    // Project config summary — dynamically generated, dedup scales with actual output
    PROJECT_CONFIG_SUMMARY: {
        type: 'computed',
        compute: countProjectConfigSummaryLines,
        multiplier: 3,
        fallback: 150
    },
    // Behavioral windows — not content dedup, fixed values
    SEARCH_WINDOW: { type: 'fixed', value: 100 },
    SEARCH_SKIP_OVERRIDE: { type: 'fixed', value: 100 },
    GRAPH_GREP_SUGGESTER: { type: 'fixed', value: 100 },
    PYTHON_GUIDE: { type: 'fixed', value: 100 }
};

/**
 * Calculate dedup line count for a single marker based on its content source.
 * @param {Object} source - Content source definition
 * @returns {number} Computed dedup line count
 */
function calculateForSource(source) {
    if (source.type === 'fixed') {
        return source.value;
    }

    if (source.type === 'file') {
        let contentLines = 0;
        for (const file of source.files) {
            contentLines += countFileLines(file);
        }
        contentLines += source.extraLines || 0;
        if (contentLines === 0) return source.fallback;
        return Math.max(MIN_FLOOR, Math.ceil(contentLines * source.multiplier));
    }

    if (source.type === 'computed') {
        const contentLines = source.compute();
        if (contentLines === 0) return source.fallback;
        return Math.max(MIN_FLOOR, Math.ceil(contentLines * source.multiplier));
    }

    return source.fallback || 200;
}

/**
 * Compute all DEDUP_LINES values dynamically.
 * Called once per process (cached by Node module system).
 * @returns {Object} Map of marker key → dedup line count
 */
function computeDedupLines() {
    const result = {};
    for (const [key, source] of Object.entries(CONTENT_SOURCES)) {
        result[key] = calculateForSource(source);
    }
    return result;
}

/**
 * DEDUP_LINES — computed output schema (generated from CONTENT_SOURCES above).
 *
 * Each key maps to the number of trailing transcript lines to check for the
 * corresponding marker string. Values are computed dynamically at module load:
 *
 *   CONTENT_SOURCES[key]                    → calculateForSource()  → DEDUP_LINES[key]
 *   ─────────────────────────────────────────────────────────────────────────────────────
 *   { type:'file',     files, multiplier }    → sum(fileLines) * mult → number
 *   { type:'computed', compute, multiplier } → compute() * mult      → number
 *   { type:'fixed',   value }                → value (as-is)          → number
 *
 * Fallback: if files don't exist (contentLines=0), uses source.fallback.
 * Floor: result is always >= MIN_FLOOR (50).
 */
const DEDUP_LINES = computeDedupLines();

// =============================================================================
// EXPORTS
// =============================================================================

/** Number of leading transcript lines to check for primacy dedup (top-of-context) */
const TOP_DEDUP_LINES = 50;

module.exports = {
    DEDUP_LINES,
    TOP_DEDUP_LINES,
    // Expose internals for testing
    computeDedupLines,
    CONTENT_SOURCES,
    MIN_FLOOR,
    countFileLines,
    countWorkflowCatalogLines,
    countProjectConfigSummaryLines,

    /** Marker for code pattern injection */
    CODE_PATTERNS: '## Code Patterns',

    /** Marker for backend context injection */
    BACKEND_CONTEXT: '## Backend Services Context Detected',

    /** Marker for frontend context injection */
    FRONTEND_CONTEXT: '## Frontend Apps Context Detected',

    /** Marker for styling context injection */
    STYLING_CONTEXT: '## Styling Context Detected',

    /** Marker for lesson-learned reminders */
    LESSON_LEARNED: '[LESSON-LEARNED-REMINDER]',

    /** Marker for code review rules injection */
    CODE_REVIEW_RULES: '[Code Review Rules - Auto-Injected]',

    /** Marker for dev rules injection */
    DEV_RULES: '[Development Rules - Auto-Injected]',

    /** Marker for knowledge work context injection */
    KNOWLEDGE_CONTEXT: '## Knowledge Work Context Detected',

    /** Marker for E2E testing context injection */
    E2E_CONTEXT: '## E2E Testing Context Detected',

    /** Marker for integration test context injection */
    INTEGRATION_TEST_CONTEXT: '## Integration Test Context Detected',

    /** Marker for feature docs context injection */
    FEATURE_DOCS_CONTEXT: '## Feature Docs Context Detected',

    /** Marker for project structure injection */
    PROJECT_STRUCTURE: '## [Injected: Project Structure Reference]',

    /** Marker for CLAUDE.md re-injection */
    CLAUDE_MD: '## [Re-Injected: CLAUDE.md Key Rules]',

    /** Marker for project config summary injection */
    PROJECT_CONFIG_SUMMARY: '## [Injected: Project Config Summary]',

    /** Marker for lessons injection */
    LESSONS: '## Learned Lessons',

    /**
     * Workflow catalog dedup markers — LEGACY, retained as stable string constants.
     *
     * These drove the dynamic catalog injection emitted by workflow-router.cjs (and the former
     * 3-part paging across workflow-router-p2/-p3.cjs). All three router hooks have since been
     * deleted in the de-hooking refactor — the workflow catalog is now STATIC in CLAUDE.md
     * `## Workflow & Skills Catalog`, so no hook emits or dedups on these markers anymore.
     * Retained only to keep the string constants stable for any future re-use.
     */
    /** Legacy marker (former dynamic catalog) — retained, no longer wired to any hook */
    WORKFLOW_CATALOG: '## Workflow Catalog',

    /** Legacy marker (former part 2) — retained, no longer wired to any hook */
    WORKFLOW_CATALOG_P2: '## Workflow Catalog (continued)',

    /** Legacy marker (former part 3) — retained, no longer wired to any hook */
    WORKFLOW_CATALOG_P3: '## Workflow Catalog (part 3)',

    /** Marker for workflow execution protocol injection */
    WORKFLOW_PROTOCOL: '[WORKFLOW-EXECUTION-PROTOCOL]',

    /** Marker for critical thinking mindset injection */
    CRITICAL_THINKING: '[CRITICAL-THINKING-MINDSET]',

    /** Marker for AI mistake prevention injection */
    AI_MISTAKE_PREVENTION: '## Common AI Mistake Prevention',

    /**
     * Legacy marker — the graph-grep-suggester hook (deleted in the de-hooking refactor) emitted
     * this directive. Its post-grep "run a graph trace; grep can't find callers/consumers/events"
     * mandate now lives statically in the scout skill (drift-locked by content-presence TC-CP-007).
     * Retained as the source-of-truth string for any future re-use.
     */
    GRAPH_GREP_SUGGESTER: '[graph] **STOP AND DECIDE',

    /**
     * Legacy marker — the PreToolUse inject hook that emitted it was removed in the de-hooking
     * refactor; the Windows `py -3` (never `python3`) guidance now lives statically in CLAUDE.md.
     * Retained for any future re-use.
     */
    PYTHON_GUIDE: '[python-guide]',

    /**
     * Legacy marker — the design-system context PreToolUse inject hook was removed in the de-hooking
     * refactor; its guidance now lives statically in the design skill. Retained for any future re-use.
     */
    DESIGN_SYSTEM: '## Design System Context Detected',

    /**
     * Legacy marker — the design-system-canonical-guide hook (deleted in the de-hooking refactor)
     * emitted this on UserPromptSubmit + html/css/scss PreToolUse. Its "read the canonical
     * design-system doc first (tokens/components/BEM)" guidance relocated into the design skill
     * (drift-locked by content-presence TC-CP-004). Retained for any future re-use.
     */
    DESIGN_SYSTEM_CANONICAL_GUIDE: '[design-system-canonical-guide]'
};
