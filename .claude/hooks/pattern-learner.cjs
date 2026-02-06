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
 *   3. If new candidate: Extract reasoning, output confirmation prompt
 *   4. If confirmation: Save pattern with reason/principle
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
const { ensurePatternsDir, loadIndex, loadPattern, savePattern } = require('./lib/pattern-storage.cjs');
const { PENDING_EXPIRY_MS } = require('./lib/pattern-constants.cjs');

// C4: Limit stdin size to prevent OOM attacks
const MAX_STDIN_SIZE = 1024 * 1024; // 1MB limit

// Pending candidate file for confirmation tracking
const PENDING_FILE = path.join(process.cwd(), '.claude', 'memory', 'pattern-pending.json');

/**
 * Extract reasoning from user correction text.
 * Scans for "because"/"since"/"so that"/"in order to" clauses.
 * Prefers false negatives (empty) over false positives (wrong reason).
 *
 * @param {string} text - User prompt text
 * @returns {{ reason: string, principle: string }} Extracted reasoning (empty if none found)
 */
function extractReason(text) {
  if (!text || typeof text !== 'string') {
    return { reason: '', principle: '' };
  }

  // Reasoning keyword patterns - capture clause after keyword until sentence end
  const reasonPatterns = [
    /\bbecause\s+(.+?)(?:\.\s|$)/i,
    /\bsince\s+(.+?)(?:\.\s|$)/i,
    /\bso\s+that\s+(.+?)(?:\.\s|$)/i,
    /\bin\s+order\s+to\s+(.+?)(?:\.\s|$)/i,
  ];

  for (const pattern of reasonPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 3) {
      return { reason: match[1].trim(), principle: '' };
    }
  }

  return { reason: '', principle: '' };
}

/**
 * Post-save enrichment: add reason/principle fields to saved pattern file.
 * Backward compatible - only adds fields when reason is non-empty.
 *
 * @param {string} patternId - Pattern ID from appendPatternCandidate result
 * @param {{ reason: string, principle: string }} reasoning - Extracted reasoning
 */
function enrichPatternWithReason(patternId, reasoning) {
  if (!reasoning.reason && !reasoning.principle) return;
  if (!patternId) return;

  try {
    const index = loadIndex();
    const entry = index.patterns && index.patterns[patternId];
    if (!entry || !entry.file) return;

    const pattern = loadPattern(entry.file);
    if (!pattern) return;

    if (reasoning.reason) {
      pattern.reason = reasoning.reason;
    }
    if (reasoning.principle) {
      pattern.principle = reasoning.principle;
    }

    savePattern(pattern, entry.file);
  } catch (e) {
    if (process.env.CK_DEBUG) {
      console.error('[Pat' + 'tern] Failed to enrich with reason: ' + e.message);
    }
  }
}

/**
 * Format display output including reason when available
 * @param {string} id - Pattern ID
 * @param {string} action - Action taken (created/updated)
 * @param {{ reason: string, principle: string }} reasoning - Extracted reasoning
 * @returns {string} Formatted output
 */
function formatLearnedOutput(id, action, reasoning) {
  let output = '\n[Pat' + 'tern] Learned: ' + id + ' (' + action + ')';
  if (reasoning && reasoning.reason) {
    output += ' -- Reason: ' + reasoning.reason;
  }
  return output;
}

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
          // Enrich saved pattern with reason from pending candidate
          const reasoning = { reason: pending.reason || '', principle: pending.principle || '' };
          enrichPatternWithReason(result.id, reasoning);
          console.log(formatLearnedOutput(result.id, result.action, reasoning));
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

    // Extract reasoning from prompt (because/since/so that/in order to)
    const reasoning = extractReason(prompt);
    if (reasoning.reason) {
      candidate.reason = reasoning.reason;
    }
    if (reasoning.principle) {
      candidate.principle = reasoning.principle;
    }

    // For explicit teaching (/learn), save immediately without confirmation
    const explicit = checkExplicitTeaching(prompt);
    if (explicit.isExplicit) {
      const result = appendPatternCandidate(candidate);

      if (result.action === 'blocked') {
        console.log(`\n[Pattern] ${result.message}`);
      } else {
        // Enrich saved pattern with extracted reason
        enrichPatternWithReason(result.id, reasoning);
        console.log(formatLearnedOutput(result.id, result.action, reasoning));
      }

      process.exit(0);
    }

    // For implicit detection, ask for confirmation (validated decision)
    // Reason is stored with candidate in pending JSON for use after confirmation
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
