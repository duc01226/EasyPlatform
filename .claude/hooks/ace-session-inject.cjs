#!/usr/bin/env node
'use strict';

/**
 * ACE Session Inject - Delta Injection on Session Start
 *
 * Injects top deltas from active playbook into session context.
 * Token budget: ~500 tokens max (user decision)
 *
 * Hook: SessionStart (startup|resume)
 * Input: .claude/memory/deltas.json
 * Output: Formatted delta injection to stdout
 *
 * @module ace-session-inject
 */

const fs = require('fs');
const path = require('path');
const {
  getTopDeltas,
  ensureDirs,
  atomicWriteJSON
} = require('./lib/ace-playbook-state.cjs');
const {
  formatDeltaForInjection
} = require('./lib/ace-lesson-schema.cjs');
const {
  MAX_STDIN_BYTES,
  MAX_INJECTED_DELTAS_PER_SESSION,
  MAX_TRACKING_SESSIONS
} = require('./lib/ace-constants.cjs');

// Configuration
const MAX_INJECTION_TOKENS = 500;
const CHARS_PER_TOKEN = 4; // Conservative estimate
const MAX_CHARS = MAX_INJECTION_TOKENS * CHARS_PER_TOKEN;

// Paths
const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const TRACKING_FILE = path.join(MEMORY_DIR, '.ace-injection-tracking.json');

/**
 * Read stdin synchronously with size limit
 * @returns {string} stdin content (empty if exceeds MAX_STDIN_BYTES)
 */
function readStdinSync() {
  try {
    const content = fs.readFileSync(0, 'utf-8');
    if (content.length > MAX_STDIN_BYTES) {
      return '';
    }
    return content.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Extract context from environment
 * @returns {Object} Current context
 */
function detectCurrentContext() {
  return {
    branch: process.env.GIT_BRANCH || process.env.CK_GIT_BRANCH || null,
    workingDir: process.cwd(),
    sessionType: process.env.CK_SESSION_TYPE || null
  };
}

/**
 * Check if delta condition matches current context
 * @param {string} condition - Delta condition
 * @param {Object} context - Current context
 * @returns {boolean} True if matches
 */
function matchesCondition(condition, context) {
  if (!condition) return true;

  const condLower = condition.toLowerCase();

  // Skill conditions always match (will be filtered by usage)
  if (condLower.includes('when using /')) {
    return true;
  }

  // File pattern conditions
  if (condLower.includes('*.cs') && context.workingDir?.includes('src')) {
    return true;
  }
  if (condLower.includes('*.ts') && context.workingDir?.includes('src')) {
    return true;
  }

  // Default to including (broad matching initially)
  return true;
}

/**
 * Build injection text within token budget
 * @param {Object[]} deltas - Deltas to inject
 * @param {Object} context - Current context
 * @returns {{injection: string|null, injectedIds: string[]}}
 */
function buildInjection(deltas, context) {
  if (deltas.length === 0) {
    return { injection: null, injectedIds: [] };
  }

  // Filter by context match
  const relevantDeltas = deltas.filter(d =>
    matchesCondition(d.condition, context)
  );

  if (relevantDeltas.length === 0) {
    return { injection: null, injectedIds: [] };
  }

  // Build injection within token budget
  let injection = '\n## ACE Learned Patterns\n\n';
  injection += '> Patterns learned from previous executions (auto-generated).\n\n';

  let charCount = injection.length;
  const injectedIds = [];

  for (const delta of relevantDeltas) {
    const formatted = formatDeltaForInjection(delta);
    const lineLength = formatted.length + 1; // +1 for newline

    if (charCount + lineLength > MAX_CHARS) {
      break;
    }

    injection += formatted + '\n';
    charCount += lineLength;
    injectedIds.push(delta.delta_id);
  }

  if (injectedIds.length === 0) {
    return { injection: null, injectedIds: [] };
  }

  return { injection, injectedIds };
}

/**
 * Track which deltas were injected for this session
 * @param {string[]} deltaIds - Injected delta IDs
 */
function trackInjection(deltaIds) {
  ensureDirs();

  let tracking = {};
  if (fs.existsSync(TRACKING_FILE)) {
    try {
      tracking = JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
    } catch (e) {
      tracking = {};
    }
  }

  const sessionId = process.env.CLAUDE_SESSION_ID || `session_${Date.now()}`;

  // Limit deltas per session (prevents unbounded growth)
  const limitedDeltaIds = deltaIds.slice(0, MAX_INJECTED_DELTAS_PER_SESSION);

  tracking[sessionId] = {
    timestamp: new Date().toISOString(),
    injected_deltas: limitedDeltaIds
  };

  // Keep last N sessions (use constant)
  const sessions = Object.keys(tracking);
  if (sessions.length > MAX_TRACKING_SESSIONS) {
    const oldest = sessions.slice(0, sessions.length - MAX_TRACKING_SESSIONS);
    oldest.forEach(s => delete tracking[s]);
  }

  // Use atomic write to prevent corruption
  atomicWriteJSON(TRACKING_FILE, tracking);
}

/**
 * Log injection event
 * @param {string} message - Log message
 */
function logInjection(message) {
  ensureDirs();
  const logFile = path.join(MEMORY_DIR, 'ace-injection.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} | ${message}\n`);
}

/**
 * Main execution
 */
function main() {
  try {
    const stdin = readStdinSync();
    if (!stdin) {
      process.exit(0);
    }

    const payload = JSON.parse(stdin);

    // Only inject on session start (startup or resume)
    const startType = payload.session_start_type || payload.start_type || '';
    if (!['startup', 'resume'].includes(startType)) {
      process.exit(0);
    }

    // Load top deltas
    const deltas = getTopDeltas(50);
    if (deltas.length === 0) {
      process.exit(0);
    }

    // Build injection
    const context = detectCurrentContext();
    const { injection, injectedIds } = buildInjection(deltas, context);

    if (!injection || injectedIds.length === 0) {
      process.exit(0);
    }

    // Track injection
    trackInjection(injectedIds);
    logInjection(`injected | ${injectedIds.length} deltas | session: ${process.env.CLAUDE_SESSION_ID || 'unknown'}`);

    // Output injection
    console.log(injection);

    process.exit(0);
  } catch (err) {
    // Non-blocking - log error and exit cleanly
    try {
      ensureDirs();
      logInjection(`error | ${err.message}`);
    } catch (e) {
      // Ignore logging errors
    }
    process.exit(0);
  }
}

main();
