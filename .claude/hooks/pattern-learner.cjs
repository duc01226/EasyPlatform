#!/usr/bin/env node
'use strict';

/**
 * Pattern Learner Hook - Detects user corrections and saves learned patterns
 *
 * Part of Agentic Context Engineering (ACE) implementation.
 * Triggers on: UserPromptSubmit
 *
 * Validated decisions:
 * - Interactive confirmation after pattern detection
 * - Docs conflict checking before storage
 *
 * Flow:
 *   1. Detect pattern candidate from prompt
 *   2. Check for pending confirmation response
 *   3. If new candidate: Output confirmation prompt
 *   4. If confirmation: Save pattern
 *   5. If rejection: Discard candidate
 *
 * Exit Codes:
 *   0 - Success (non-blocking)
 */

const fs = require('fs');
const path = require('path');

const {
  detectPatternCandidate,
  meetsConfidenceThreshold,
  formatConfirmationPrompt,
  isConfirmationResponse,
  isRejectionResponse,
  checkExplicitTeaching
} = require('./lib/pattern-detector.cjs');

const { appendPatternCandidate } = require('./lib/pattern-extractor.cjs');
const { ensurePatternsDir } = require('./lib/pattern-storage.cjs');
const { PENDING_EXPIRY_MS } = require('./lib/pattern-constants.cjs');

// C4: Limit stdin size to prevent OOM attacks
const MAX_STDIN_SIZE = 1024 * 1024; // 1MB limit

// Pending candidate file for confirmation tracking
const PENDING_FILE = path.join(process.cwd(), '.claude', 'memory', 'pattern-pending.json');

/**
 * Load pending pattern candidate
 * @returns {object | null}
 */
function loadPendingCandidate() {
  try {
    if (!fs.existsSync(PENDING_FILE)) return null;
    const content = fs.readFileSync(PENDING_FILE, 'utf-8');
    const data = JSON.parse(content);

    // Expire after configured timeout
    if (Date.now() - data.timestamp > PENDING_EXPIRY_MS) {
      fs.unlinkSync(PENDING_FILE);
      return null;
    }

    return data.candidate;
  } catch (e) {
    return null;
  }
}

/**
 * Save pending pattern candidate
 * @param {object} candidate
 */
function savePendingCandidate(candidate) {
  try {
    const dir = path.dirname(PENDING_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(PENDING_FILE, JSON.stringify({
      candidate,
      timestamp: Date.now()
    }));
  } catch (e) {
    if (process.env.CK_DEBUG) {
      console.error(`[Pattern] Failed to save pending: ${e.message}`);
    }
  }
}

/**
 * Clear pending pattern candidate
 */
function clearPendingCandidate() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      fs.unlinkSync(PENDING_FILE);
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Main hook execution
 */
async function main() {
  try {
    // Read payload from stdin
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) {
      process.exit(0);
    }

    // C4: Size check before parse to prevent OOM
    if (stdin.length > MAX_STDIN_SIZE) {
      console.error(`[Pattern] ERROR: stdin exceeds ${MAX_STDIN_SIZE} bytes, skipping`);
      process.exit(0);
    }

    const payload = JSON.parse(stdin);
    const prompt = payload.prompt || payload.message || '';

    if (!prompt) {
      process.exit(0);
    }

    // Check for pending confirmation response first
    const pending = loadPendingCandidate();
    if (pending) {
      // Check if this prompt is a confirmation response
      if (isConfirmationResponse(prompt)) {
        // Save the pattern
        const result = appendPatternCandidate(pending);
        clearPendingCandidate();

        if (result.action === 'blocked') {
          console.log(`\n[Pattern] ${result.message}`);
        } else {
          console.log(`\n[Pattern] Learned: ${result.id} (${result.action})`);
          if (process.env.CK_DEBUG) {
            console.error(`[Pattern] ${result.message}`);
          }
        }

        process.exit(0);
      }

      if (isRejectionResponse(prompt)) {
        // Discard the pattern
        clearPendingCandidate();
        console.log('\n[Pattern] Pattern discarded.');
        process.exit(0);
      }

      // Not a confirmation response - clear pending and continue
      // (User moved on to something else)
      clearPendingCandidate();
    }

    // Get last AI action context from environment
    const lastResponse = {
      tool: process.env.CK_LAST_TOOL || null,
      path: process.env.CK_LAST_FILE || null
    };

    // Detect pattern candidate
    const candidate = detectPatternCandidate(prompt, lastResponse);

    if (!candidate || !meetsConfidenceThreshold(candidate)) {
      process.exit(0);
    }

    // For explicit teaching (/learn), save immediately without confirmation
    const explicit = checkExplicitTeaching(prompt);
    if (explicit.isExplicit) {
      const result = appendPatternCandidate(candidate);

      if (result.action === 'blocked') {
        console.log(`\n[Pattern] ${result.message}`);
      } else {
        console.log(`\n[Pattern] Learned: ${result.id} (${result.action})`);
      }

      process.exit(0);
    }

    // For implicit detection, ask for confirmation (validated decision)
    savePendingCandidate(candidate);

    // Output confirmation prompt
    const confirmPrompt = formatConfirmationPrompt(candidate);
    console.log(confirmPrompt);

    if (process.env.CK_DEBUG) {
      console.error(`[Pattern] Candidate detected: ${candidate.triggers[0]?.keyword || 'implicit'} (confidence: ${candidate.confidence.toFixed(2)})`);
    }

    process.exit(0);
  } catch (error) {
    // Non-blocking - always exit 0
    if (process.env.CK_DEBUG) {
      console.error(`[Pattern] Error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
