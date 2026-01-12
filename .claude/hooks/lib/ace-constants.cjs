#!/usr/bin/env node
'use strict';

/**
 * ACE Shared Constants - Single source of truth for ACE configuration
 *
 * All ACE modules should import constants from here to prevent divergence.
 *
 * @module ace-constants
 */

module.exports = {
  // Confidence calculation weights
  HUMAN_WEIGHT: 3.0,
  OUTCOME_WEIGHT: 1.0,

  // Similarity thresholds
  SIMILARITY_THRESHOLD: 0.85,

  // Confidence thresholds
  CONFIDENCE_THRESHOLD: 0.80,

  // Limits
  MAX_DELTAS: 50,
  MAX_COUNT: 1000,
  MAX_SOURCE_EVENTS: 10,

  // Timing
  STALE_DAYS: 90,
  PRUNE_MIN_SUCCESS_RATE: 0.20,

  // File locking
  LOCK_TIMEOUT_MS: 5000,
  LOCK_RETRY_DELAY_MS: 50,

  // Input safety limits
  MAX_STDIN_BYTES: 1024 * 1024, // 1MB max stdin to prevent OOM
  MAX_EVENT_FILE_BYTES: 10 * 1024 * 1024, // 10MB before rotation

  // Safe file extensions whitelist for pattern extraction
  SAFE_EXTENSIONS: [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.cs', '.csproj', '.sln',
    '.json', '.yaml', '.yml', '.xml',
    '.md', '.txt', '.html', '.css', '.scss',
    '.py', '.go', '.rs', '.java', '.kt',
    '.sh', '.bash', '.ps1', '.cmd', '.bat'
  ],

  // Session limits
  MAX_INJECTED_DELTAS_PER_SESSION: 50,
  MAX_TRACKING_SESSIONS: 100,

  // Token estimation (chars per token by model)
  CHARS_PER_TOKEN: {
    'claude-3-haiku': 5.0,
    'claude-3-sonnet': 4.2,
    'claude-3-opus': 3.8,
    'claude-opus-4': 3.8,
    'default': 4.0
  },

  // Injection limits
  MAX_INJECTION_TOKENS: 500
};
