#!/usr/bin/env node
'use strict';

/**
 * Pattern Learning Constants - Configuration for auto-learning pattern system
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Single source of truth for pattern learning constants.
 *
 * Validated decisions (2026-01-12):
 * - Interactive confirmation for pattern detection
 * - 5 patterns max, 400 tokens budget
 * - 30-day confidence decay
 * - Project-based categories
 *
 * @module pattern-constants
 */

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum score threshold for pattern detection */
const MIN_PATTERN_SCORE = 0.4;

/** Minimum confidence threshold for pattern candidate */
const MIN_PATTERN_CONFIDENCE = 0.3;

/** Score boost when AI just edited a file */
const CONTEXT_BOOST_EDIT = 0.2;

/** Score boost when code block is present */
const CODE_BLOCK_BOOST = 0.15;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════════════════

/** Initial confidence for implicit (detected) patterns */
const INITIAL_CONFIDENCE_IMPLICIT = 0.3;

/** Initial confidence for explicit (/learn) patterns */
const INITIAL_CONFIDENCE_EXPLICIT = 0.6;

/** Confidence boost on confirmation (+20%) */
const CONFIDENCE_BOOST_CONFIRM = 0.2;

/** Confidence penalty on conflict (-10%) */
const CONFIDENCE_PENALTY_CONFLICT = 0.1;

/** Maximum confidence value */
const MAX_CONFIDENCE = 1.0;

/** Minimum confidence value */
const MIN_CONFIDENCE = 0.1;

/** Confidence threshold below which patterns are pruned */
const PRUNE_THRESHOLD = 0.2;

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════

/** Pending confirmation expiry in milliseconds (5 minutes) */
const PENDING_EXPIRY_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════
// DECAY & RETENTION
// ═══════════════════════════════════════════════════════════════════════════

/** Days before confidence decay kicks in */
const CONFIDENCE_DECAY_DAYS = 30;

/** Confidence decay rate per period (5%) */
const CONFIDENCE_DECAY_RATE = 0.05;

/** Days to retain archived patterns */
const PATTERN_ARCHIVE_RETENTION_DAYS = 90;

// ═══════════════════════════════════════════════════════════════════════════
// INJECTION BUDGET (Validated: Comprehensive)
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum patterns to inject per context */
const MAX_PATTERN_INJECTION = 5;

/** Maximum tokens budget for pattern injection */
const PATTERN_TOKEN_BUDGET = 400;

/** Minimum relevance score for injection */
const MIN_RELEVANCE_SCORE = 0.3;

/** Minimum confidence for injection */
const CONFIDENCE_INJECTION_THRESHOLD = 0.4;

/** Approximate characters per token */
const CHARS_PER_TOKEN = 4;

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════

/** Keyword similarity threshold for deduplication (Jaccard index) */
const DEDUP_SIMILARITY_THRESHOLD = 0.8;

// ═══════════════════════════════════════════════════════════════════════════
// KEYWORD WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/** Weight multipliers for keyword categories */
const KEYWORD_WEIGHTS = {
  negation: 0.3,
  redirection: 0.35,
  quality: 0.25,
  explicit: 1.0
};

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION KEYWORDS
// ═══════════════════════════════════════════════════════════════════════════

/** Correction keywords by category (High confidence triggers) */
const CORRECTION_KEYWORDS = {
  negation: ['no,', "don't", 'never', 'avoid', 'stop', 'not like that'],
  redirection: ['instead', 'rather', 'use x not y', 'prefer', 'better to'],
  quality: ['wrong', 'incorrect', 'mistake', 'should be', 'actually', 'should use'],
  explicit: ['/learn', '/remember', 'remember this', 'always do', 'always use']
};

/** Patterns to ignore (false positives) */
const IGNORE_PATTERNS = [
  /\?$/,                      // Questions
  /^(can you|could you)/i,    // Requests, not corrections
  /^(what|how|where|when)/i,  // Questions
  /^(yes|ok|sure|thanks)/i,   // Confirmations
  /^(please|help)/i           // Polite requests
];

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORIES (Validated: Project-based)
// ═══════════════════════════════════════════════════════════════════════════

/** Valid pattern categories */
const PATTERN_CATEGORIES = ['backend', 'frontend', 'workflow', 'general'];

/** Category detection patterns from file paths */
const CATEGORY_PATH_PATTERNS = {
  backend: [
    /\.cs$/,
    /CommandHandler\.cs$/,
    /Repository\.cs$/,
    /Entity\.cs$/,
    /Service\.cs$/,
    /Controller\.cs$/
  ],
  frontend: [
    /\.ts$/,
    /\.tsx$/,
    /\.component\.ts$/,
    /\.store\.ts$/,
    /\.service\.ts$/,
    /\.scss$/
  ],
  workflow: [
    /\.cjs$/,
    /\.yaml$/,
    /\.yml$/,
    /hooks\//,
    /\.github\//,
    /scripts\//
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// PATHS
// ═══════════════════════════════════════════════════════════════════════════

/** Base directory for learned patterns (relative to project root) */
const PATTERNS_BASE_DIR = '.claude/learned-patterns';

/** Index file name */
const PATTERNS_INDEX_FILE = 'index.yaml';

/** Archive subdirectory */
const PATTERNS_ARCHIVE_DIR = 'archive';

module.exports = {
  // Detection
  MIN_PATTERN_SCORE,
  MIN_PATTERN_CONFIDENCE,
  CONTEXT_BOOST_EDIT,
  CODE_BLOCK_BOOST,
  KEYWORD_WEIGHTS,
  CORRECTION_KEYWORDS,
  IGNORE_PATTERNS,

  // Confidence
  INITIAL_CONFIDENCE_IMPLICIT,
  INITIAL_CONFIDENCE_EXPLICIT,
  CONFIDENCE_BOOST_CONFIRM,
  CONFIDENCE_PENALTY_CONFLICT,
  MAX_CONFIDENCE,
  MIN_CONFIDENCE,
  PRUNE_THRESHOLD,

  // Confirmation
  PENDING_EXPIRY_MS,

  // Decay
  CONFIDENCE_DECAY_DAYS,
  CONFIDENCE_DECAY_RATE,
  PATTERN_ARCHIVE_RETENTION_DAYS,

  // Injection
  MAX_PATTERN_INJECTION,
  PATTERN_TOKEN_BUDGET,
  MIN_RELEVANCE_SCORE,
  CONFIDENCE_INJECTION_THRESHOLD,
  CHARS_PER_TOKEN,

  // Deduplication
  DEDUP_SIMILARITY_THRESHOLD,

  // Categories
  PATTERN_CATEGORIES,
  CATEGORY_PATH_PATTERNS,

  // Paths
  PATTERNS_BASE_DIR,
  PATTERNS_INDEX_FILE,
  PATTERNS_ARCHIVE_DIR
};
