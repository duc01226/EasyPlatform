#!/usr/bin/env node
'use strict';

/**
 * ACE Constants - Unified configuration for Agentic Context Engineering
 *
 * Single source of truth for all ACE-related constants.
 * Import this module instead of defining constants in individual files.
 *
 * @module ace-constants
 */

// ═══════════════════════════════════════════════════════════════════════════
// RETENTION & LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════

/** Days to retain events in stream before rotation */
const EVENTS_RETENTION_DAYS = 30;

/** Days before a delta is considered stale and eligible for pruning */
const DELTA_STALE_DAYS = 90;

/** Days to retain session tracking data */
const SESSION_RETENTION_DAYS = 7;

/** Days to retain correction tracking signals */
const CORRECTION_RETENTION_DAYS = 30;

/** Days to retain archived deltas before permanent deletion */
const ARCHIVE_RETENTION_DAYS = 90;

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY GATES
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum confidence threshold for delta promotion (80%) */
const CONFIDENCE_THRESHOLD = 0.80;

/** Minimum success rate before a delta is pruned (20%) */
const MIN_SUCCESS_RATE = 0.20;

/** Minimum observations required before quality decisions */
const MIN_OBSERVATIONS = 5;

/** String similarity threshold for deduplication (Jaccard index) */
const SIMILARITY_THRESHOLD = 0.85;

// ═══════════════════════════════════════════════════════════════════════════
// INJECTION BUDGET
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum tokens for playbook injection into context */
const MAX_INJECTION_TOKENS = 500;

/** Maximum number of deltas to inject per session */
const MAX_INJECTION_DELTAS = 7;

/** Approximate characters per token - model-specific values */
const CHARS_PER_TOKEN = {
  'claude-3-sonnet': 4.2,
  'claude-3-opus': 3.8,
  'claude-opus-4': 3.8,
  'default': 4.0
};

/** Default characters per token for estimation */
const CHARS_PER_TOKEN_DEFAULT = 4;

/** Days for recency score decay in priority calculation */
const RECENCY_DECAY_DAYS = 30;

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBOOK LIMITS
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum active deltas in playbook */
const MAX_ACTIVE_DELTAS = 50;

/** Maximum pruned deltas to retain before archiving */
const MAX_PRUNED_DELTAS = 100;

/** Maximum candidates in staging area */
const MAX_CANDIDATES = 100;

// ═══════════════════════════════════════════════════════════════════════════
// FEEDBACK WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/** Weight multiplier for human feedback vs automated signals (compat alias: HUMAN_WEIGHT) */
const HUMAN_FEEDBACK_WEIGHT = 3;

/** Weight for automated outcome signals */
const OUTCOME_WEIGHT = 1.0;

/** Minimum feedback confidence to record (0-1) */
const MIN_FEEDBACK_CONFIDENCE = 0.5;

// ═══════════════════════════════════════════════════════════════════════════
// PATTERN ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/** Sliding window size for co-occurrence analysis */
const ANALYSIS_WINDOW_SIZE = 5;

/** Minimum pattern occurrences to generate candidate */
const MIN_PATTERN_OCCURRENCES = 3;

// ═══════════════════════════════════════════════════════════════════════════
// IMPLICIT FEEDBACK
// ═══════════════════════════════════════════════════════════════════════════

/** Window (ms) for implicit feedback attribution after injection */
const IMPLICIT_FEEDBACK_WINDOW_MS = 30000;

/** Window (ms) for correction detection after AI generation */
const CORRECTION_WINDOW_MS = 60000;

// ═══════════════════════════════════════════════════════════════════════════
// BASELINE
// ═══════════════════════════════════════════════════════════════════════════

/** Default baseline success rate for effect size calculation */
const DEFAULT_BASELINE_RATE = 0.65;

// ═══════════════════════════════════════════════════════════════════════════
// PRIORITY WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════

/** Weight for success rate in priority calculation */
const PRIORITY_WEIGHT_SUCCESS = 0.4;

/** Weight for recency in priority calculation */
const PRIORITY_WEIGHT_RECENCY = 0.3;

/** Weight for context match in priority calculation */
const PRIORITY_WEIGHT_CONTEXT = 0.3;

// ═══════════════════════════════════════════════════════════════════════════
// FILE LOCKING
// ═══════════════════════════════════════════════════════════════════════════

/** Timeout for file lock acquisition (ms) */
const LOCK_TIMEOUT_MS = 5000;

/** Delay between lock retry attempts (ms) */
const LOCK_RETRY_DELAY_MS = 50;

// ═══════════════════════════════════════════════════════════════════════════
// INPUT SAFETY LIMITS
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum stdin bytes to prevent OOM (1MB) */
const MAX_STDIN_BYTES = 1024 * 1024;

/** Maximum event file size before rotation (10MB) */
const MAX_EVENT_FILE_BYTES = 10 * 1024 * 1024;

// ═══════════════════════════════════════════════════════════════════════════
// SAFE FILE EXTENSIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Whitelist of safe file extensions for pattern extraction */
const SAFE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.cs', '.csproj', '.sln',
  '.json', '.yaml', '.yml', '.xml',
  '.md', '.txt', '.html', '.css', '.scss',
  '.py', '.go', '.rs', '.java', '.kt',
  '.sh', '.bash', '.ps1', '.cmd', '.bat'
];

// ═══════════════════════════════════════════════════════════════════════════
// SESSION LIMITS
// ═══════════════════════════════════════════════════════════════════════════

/** Maximum deltas injected per session */
const MAX_INJECTED_DELTAS_PER_SESSION = 50;

/** Maximum concurrent tracking sessions */
const MAX_TRACKING_SESSIONS = 100;

/** Maximum source events per candidate */
const MAX_SOURCE_EVENTS = 10;

/** Maximum items in general-purpose lists */
const MAX_COUNT = 1000;

module.exports = {
  // Retention & lifecycle
  EVENTS_RETENTION_DAYS,
  DELTA_STALE_DAYS,
  SESSION_RETENTION_DAYS,
  CORRECTION_RETENTION_DAYS,
  ARCHIVE_RETENTION_DAYS,

  // Quality gates
  CONFIDENCE_THRESHOLD,
  MIN_SUCCESS_RATE,
  MIN_OBSERVATIONS,
  SIMILARITY_THRESHOLD,

  // Injection budget
  MAX_INJECTION_TOKENS,
  MAX_INJECTION_DELTAS,
  CHARS_PER_TOKEN,
  CHARS_PER_TOKEN_DEFAULT,
  RECENCY_DECAY_DAYS,

  // Playbook limits
  MAX_ACTIVE_DELTAS,
  MAX_PRUNED_DELTAS,
  MAX_CANDIDATES,

  // Feedback weights
  HUMAN_FEEDBACK_WEIGHT,
  HUMAN_WEIGHT: HUMAN_FEEDBACK_WEIGHT, // backward compat alias
  OUTCOME_WEIGHT,
  MIN_FEEDBACK_CONFIDENCE,

  // Pattern analysis
  ANALYSIS_WINDOW_SIZE,
  MIN_PATTERN_OCCURRENCES,

  // Implicit feedback
  IMPLICIT_FEEDBACK_WINDOW_MS,
  CORRECTION_WINDOW_MS,

  // Baseline
  DEFAULT_BASELINE_RATE,

  // Priority weights
  PRIORITY_WEIGHT_SUCCESS,
  PRIORITY_WEIGHT_RECENCY,
  PRIORITY_WEIGHT_CONTEXT,

  // File locking
  LOCK_TIMEOUT_MS,
  LOCK_RETRY_DELAY_MS,

  // Input safety
  MAX_STDIN_BYTES,
  MAX_EVENT_FILE_BYTES,

  // Safe extensions
  SAFE_EXTENSIONS,

  // Session limits
  MAX_INJECTED_DELTAS_PER_SESSION,
  MAX_TRACKING_SESSIONS,
  MAX_SOURCE_EVENTS,
  MAX_COUNT,

  // Backward compatibility aliases
  MAX_DELTAS: MAX_ACTIVE_DELTAS,
  STALE_DAYS: DELTA_STALE_DAYS,
  PRUNE_MIN_SUCCESS_RATE: MIN_SUCCESS_RATE
};
