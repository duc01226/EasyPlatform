'use strict';
/**
 * Centralized dedup markers for context injection hooks.
 *
 * All hooks that check the transcript for recent injection MUST import from here.
 * Never define marker strings inline in hook files.
 *
 * IMPORTANT: Changing a marker string affects dedup behavior across all hooks.
 * Run tests after any change: node .claude/hooks/tests/test-all-hooks.cjs
 *
 * Consumers:
 *   CODE_PATTERNS       → backend-context, frontend-context, code-patterns-injector, subagent-init
 *   BACKEND_CONTEXT     → backend-context
 *   FRONTEND_CONTEXT    → frontend-context
 *   STYLING_CONTEXT     → scss-styling-context
 *   LESSON_LEARNED      → prompt-context-assembler (via lib/prompt-injections)
 *   CODE_REVIEW_RULES   → code-review-rules-injector
 *   DEV_RULES           → prompt-context-assembler
 *   KNOWLEDGE_CONTEXT   → knowledge-context
 *   E2E_CONTEXT         → code-patterns-injector
 *   LESSONS             → prompt-context-assembler (via lib/prompt-injections), lessons-injector (PreToolUse)
 *   CRITICAL_THINKING   → prompt-context-assembler (via lib/prompt-injections), mindset-injector (PreToolUse)
 *   AI_MISTAKE_PREVENTION → prompt-context-assembler (via lib/prompt-injections), mindset-injector (PreToolUse)
 *   WORKFLOW_CATALOG    → workflow-router
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
 * Content source definitions for dynamic dedup calculation.
 *
 * Types:
 *   'file'     — Content is read from file(s) and injected. Dedup window = file lines × multiplier.
 *   'fixed'    — Constant value. Used for template injections and behavioral windows.
 *
 * Multiplier rationale:
 *   - Large injections (>200 lines): 1.5× — re-injection cost is high, so we
 *     want a tight window to avoid unnecessary re-reads of the transcript.
 *   - Medium injections (50-200 lines): 2× — balanced trade-off.
 *   - Small injections (<50 lines): 3-5× — re-injection is cheap, but the
 *     marker can get pushed out of view quickly by other injections.
 */
const CONTENT_SOURCES = {
    CODE_PATTERNS: {
        type: 'file',
        files: ['docs/project-reference/backend-patterns-reference.md', 'docs/project-reference/frontend-patterns-reference.md'],
        multiplier: 1.5,
        fallback: 1800
    },
    CODE_REVIEW_RULES: {
        type: 'file',
        files: ['docs/project-reference/code-review-rules.md'],
        multiplier: 1.5,
        extraLines: 10, // header/footer added by hook
        fallback: 1000
    },
    E2E_CONTEXT: {
        type: 'file',
        files: ['docs/project-reference/e2e-test-reference.md'],
        multiplier: 1.5,
        extraLines: 20, // config summary lines added by hook
        fallback: 200
    },
    DEV_RULES: {
        type: 'file',
        files: ['.claude/workflows/development-rules.md'],
        multiplier: 2,
        extraLines: 90, // buildReminder() template lines
        fallback: 300
    },
    DEV_RULES_MODULARIZATION: {
        // Subset marker within DEV_RULES injection — window covers the full output
        type: 'file',
        files: ['.claude/workflows/development-rules.md'],
        multiplier: 1.5,
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
    // Template-based injections — fixed generous values, no drift risk
    BACKEND_CONTEXT: { type: 'fixed', value: 100 },
    FRONTEND_CONTEXT: { type: 'fixed', value: 100 },
    STYLING_CONTEXT: { type: 'fixed', value: 150 },
    KNOWLEDGE_CONTEXT: { type: 'fixed', value: 100 },
    DESIGN_SYSTEM: { type: 'fixed', value: 100 },
    LESSON_LEARNED: { type: 'fixed', value: 100 },
    WORKFLOW_PROTOCOL: { type: 'fixed', value: 100 },
    CRITICAL_THINKING: { type: 'fixed', value: 80 },
    AI_MISTAKE_PREVENTION: { type: 'fixed', value: 80 },
    // Behavioral windows — not content dedup, fixed values
    SEARCH_WINDOW: { type: 'fixed', value: 100 },
    SEARCH_SKIP_OVERRIDE: { type: 'fixed', value: 50 }
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
 *
 * Example output for this project (values will differ per project):
 *   {
 *     CODE_PATTERNS: ~2700,         // file lines × 1.5
 *     CODE_REVIEW_RULES: ~1500,     // file lines × 1.5
 *     E2E_CONTEXT: ~900,            // file lines × 1.5
 *     DEV_RULES: ~340,              // file lines × 2
 *     DEV_RULES_MODULARIZATION: ~250, // file lines × 1.5
 *     LESSONS: ~50,                 // file lines × 3
 *     WORKFLOW_CATALOG: ~250,       // computed lines × 2
 *     BACKEND_CONTEXT: 100,         // fixed
 *     FRONTEND_CONTEXT: 100,        // fixed
 *     STYLING_CONTEXT: 150,         // fixed
 *     KNOWLEDGE_CONTEXT: 100,       // fixed
 *     DESIGN_SYSTEM: 100,           // fixed
 *     LESSON_LEARNED: 150,          // fixed
 *     SEARCH_WINDOW: 100,           // fixed (behavioral)
 *     SEARCH_SKIP_OVERRIDE: 50      // fixed (behavioral)
 *   }
 */
const DEDUP_LINES = computeDedupLines();

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    DEDUP_LINES,
    // Expose internals for testing
    computeDedupLines,
    CONTENT_SOURCES,
    MIN_FLOOR,
    countFileLines,
    countWorkflowCatalogLines,

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

    /** Marker for lessons injection */
    LESSONS: '## Learned Lessons',

    /** Marker for workflow catalog injection */
    WORKFLOW_CATALOG: '## Workflow Catalog',

    /** Marker for workflow execution protocol injection */
    WORKFLOW_PROTOCOL: '[WORKFLOW-EXECUTION-PROTOCOL]',

    /** Marker for critical thinking mindset injection */
    CRITICAL_THINKING: '[CRITICAL-THINKING-MINDSET]',

    /** Marker for AI mistake prevention injection */
    AI_MISTAKE_PREVENTION: '## Common AI Mistake Prevention'
};
