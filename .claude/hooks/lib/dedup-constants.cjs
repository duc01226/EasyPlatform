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
 *   CODE_PATTERNS       → code-patterns-injector (guidance only)
 *   BACKEND_CONTEXT     → backend-context (guidance only)
 *   FRONTEND_CONTEXT    → frontend-context (guidance only)
 *   STYLING_CONTEXT     → scss-styling-context (guidance only)
 *   LESSON_LEARNED      → prompt-context-assembler-closers (via lib/prompt-injections)
 *   CODE_REVIEW_RULES   → code-review-rules-injector
 *   DEV_RULES           → dev-rules-injector (PreToolUse: Edit|Write|MultiEdit|Skill)
 *   KNOWLEDGE_CONTEXT   → knowledge-context (guidance only)
 *   E2E_CONTEXT         → code-patterns-injector (guidance only)
 *   LESSONS             → prompt-context-assembler (via lib/prompt-injections), lessons-injector (PreToolUse)
 *   CRITICAL_THINKING   → prompt-context-assembler (via lib/prompt-injections), mindset-injector (PreToolUse)
 *   AI_MISTAKE_PREVENTION → prompt-context-assembler (via lib/prompt-injections), mindset-injector (PreToolUse)
 *   WORKFLOW_CATALOG / _P2 / _P3 → workflow-router (p1) / workflow-router-p2 (p2) / workflow-router-p3 (p3)
 *     NOTE: catalog stays inline (not collapsed to a guidance pointer like other refs) because
 *     it drives workflow SELECTION on every prompt — collapsing would force a tool call before
 *     every user message, costing more than the inline payload. Paging is intentional.
 *     The 3 per-part markers are centralized below (single source of truth) but kept DISTINCT —
 *     see the block comment at their definition for the behavior-preservation rationale.
 *   INTEGRATION_TEST_CONTEXT → code-patterns-injector (guidance only)
 *   FEATURE_DOCS_CONTEXT     → code-patterns-injector (guidance only)
 *   PROJECT_STRUCTURE    → prompt-context-assembler-docs (guidance only — merged from p1+p2)
 *   CLAUDE_MD            → prompt-context-assembler-claude
 *   PROJECT_CONFIG_SUMMARY → prompt-context-assembler-project-config
 *   DESIGN_SYSTEM        → design-system-context (guidance only)
 *   DESIGN_SYSTEM_CANONICAL_GUIDE → design-system-canonical-guide (UserPromptSubmit + PreToolUse Read/Edit html/css/scss)
 *   GRAPH_GREP_SUGGESTER → graph-grep-suggester
 *   PYTHON_GUIDE         → python-call-guide (PreToolUse: Bash)
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

/**
 * Minimum transcript line count before context-recovery injections fire.
 * Fresh sessions already have project instructions at maximum recency — skip.
 */
const FRESH_SESSION_THRESHOLD = 200;

module.exports = {
    DEDUP_LINES,
    TOP_DEDUP_LINES,
    FRESH_SESSION_THRESHOLD,
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
     * Workflow catalog dedup markers — single source of truth for all 3 router parts.
     *
     * The catalog is paged across 3 UserPromptSubmit hooks (workflow-router{,-p2,-p3}.cjs) to stay
     * under the harness per-hook size limit. Each part dedups on its OWN marker + OWN window:
     *   WORKFLOW_CATALOG     → workflow-router.cjs    (part 1)  bottom window: DEDUP_LINES.WORKFLOW_CATALOG (computed)
     *   WORKFLOW_CATALOG_P2  → workflow-router-p2.cjs (part 2)  bottom window: 150 (inline)
     *   WORKFLOW_CATALOG_P3  → workflow-router-p3.cjs (part 3)  bottom window: 150 (inline)
     *
     * Markers are kept DISTINCT (NOT collapsed to one shared base string) deliberately:
     *   1. Behavior preservation — `WORKFLOW_CATALOG` ('## Workflow Catalog') is a SUBSTRING of both
     *      P2/P3 markers, and the parts use DIFFERENT dedup windows. Collapsing all three to the base
     *      marker would flip part 2/3's re-emit decision in a reachable transcript-depth band (its
     *      header at depth ~150–165), changing observable output. Distinct markers keep each part's
     *      dedup byte-identical to its historical behavior.
     *   2. KNOWN LATENT desync (NOT fixed here — fixing it is a behavior change): p1's window is
     *      computed (~workflows×2) while p2/p3 are fixed at 150, so the three can theoretically fall
     *      out of their windows at slightly different depths. In practice all three fire together on
     *      the same prompt with headers ~15 lines apart, so they dedup in lockstep every normal
     *      session. Any future window-unification must be a deliberate, tested behavior change.
     */
    /** Marker for workflow catalog injection (part 1) */
    WORKFLOW_CATALOG: '## Workflow Catalog',

    /** Marker for workflow catalog injection (part 2 — continued) */
    WORKFLOW_CATALOG_P2: '## Workflow Catalog (continued)',

    /** Marker for workflow catalog injection (part 3) */
    WORKFLOW_CATALOG_P3: '## Workflow Catalog (part 3)',

    /** Marker for workflow execution protocol injection */
    WORKFLOW_PROTOCOL: '[WORKFLOW-EXECUTION-PROTOCOL]',

    /** Marker for critical thinking mindset injection */
    CRITICAL_THINKING: '[CRITICAL-THINKING-MINDSET]',

    /** Marker for AI mistake prevention injection */
    AI_MISTAKE_PREVENTION: '## Common AI Mistake Prevention',

    /** Marker for graph-grep-suggester directive */
    GRAPH_GREP_SUGGESTER: '[graph] **STOP AND DECIDE',

    /** Marker for python-call-guide PreToolUse injection */
    PYTHON_GUIDE: '[python-guide]',

    /** Marker for design system context guidance injection */
    DESIGN_SYSTEM: '## Design System Context Detected',

    /** Marker for design-system canonical guide (UserPromptSubmit + PreToolUse html/css/scss) */
    DESIGN_SYSTEM_CANONICAL_GUIDE: '[design-system-canonical-guide]'
};
