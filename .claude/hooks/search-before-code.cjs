#!/usr/bin/env node
/**
 * Search-Before-Code Enforcement Hook (PreToolUse)
 *
 * Enforces "search existing patterns first" before code modifications.
 * Validates that Grep/Glob was used before Edit/Write/MultiEdit tools.
 *
 * Trigger: PreToolUse:Edit|Write|MultiEdit
 *
 * Enforcement Strategy:
 *   - CHECK 1: File extension (.ts, .tsx, .cs, .html, .scss)
 *   - CHECK 2: Pattern keywords (PlatformVmStore, Command.*Handler, etc.)
 *   - CHECK 3: Transcript analysis (last 100 lines for Grep/Glob)
 *   - CHECK 4: Trivial change threshold (< 20 lines)
 *
 * Exit Codes:
 *   0 - Allowed (search evidence found or exempt)
 *   1 - Blocked (no search evidence for non-trivial code change)
 *
 * Bypass:
 *   - Use "skip search" | "no search" | "just do it" in prompt
 *   - Set CK_SKIP_SEARCH_CHECK=1 environment variable
 *   - Files matching EXEMPT_PATTERNS
 *
 * Cache Strategy:
 *   - On Grep/Glob: Set CK_SEARCH_PERFORMED=1 (O(1) write)
 *   - On Edit/Write: Check CK_SEARCH_PERFORMED (O(1) read)
 *   - Fallback: Check transcript if cache miss
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const BYPASS_ENV = process.env.CK_SKIP_SEARCH_CHECK === '1';
const SEARCH_PERFORMED = process.env.CK_SEARCH_PERFORMED === '1';

// File extensions that require search-first validation
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.cs', '.html', '.scss', '.sass', '.css']);

// EasyPlatform framework patterns that indicate complex implementation
const FRAMEWORK_PATTERNS = [
  'PlatformVmStore',
  'AppBaseComponent',
  'AppBaseVmStoreComponent',
  'AppBaseFormComponent',
  'PlatformApiService',
  'PlatformCqrsCommand',
  'Command.*Handler',
  'Query.*Handler',
  'IPlatformQueryableRootRepository',
  'PlatformValidationResult',
  'RootEntity',
  'PlatformEntityDto'
];

// File patterns exempt from enforcement
const EXEMPT_PATTERNS = [
  /(^|[/\\])\.claude[/\\]/,          // .claude/ config
  /(^|[/\\])plans[/\\]/,             // Plan documents
  /(^|[/\\])docs[/\\]/,              // Documentation
  /\.md$/i,                           // Markdown files
  /(^|[/\\])temp[/\\]/,              // Temporary files
  /(^|[/\\])\\.git[/\\]/,            // Git metadata
  /(^|[/\\])node_modules[/\\]/,      // Node modules
  /(^|[/\\])dist[/\\]/,              // Build output
  /(^|[/\\])obj[/\\]/,               // C# obj
  /(^|[/\\])bin[/\\]/                // C# bin
];

// Bypass keywords in prompts
const BYPASS_KEYWORDS = ['skip search', 'no search', 'just do it', 'quick:'];

// Tools that modify code
const CODE_MODIFYING_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);

// Search tools that satisfy requirement
const SEARCH_TOOLS = new Set(['Grep', 'Glob']);

// Minimum lines changed to trigger enforcement
const MIN_LINES_THRESHOLD = 20;

// Transcript lookback window
const LOOKBACK_WINDOW = 100;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if file extension requires search validation
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function isCodeFile(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.has(ext);
}

/**
 * Check if file path is exempt from enforcement
 * @param {string} filePath - File path to check
 * @returns {boolean}
 */
function isExemptFile(filePath) {
  if (!filePath) return false;

  // Normalize path for consistent matching
  const normalized = filePath.replace(/\\/g, '/');

  return EXEMPT_PATTERNS.some(pattern => pattern.test(normalized));
}

/**
 * Check if content contains framework patterns requiring search
 * @param {string} content - File content to check
 * @returns {boolean}
 */
function containsFrameworkPatterns(content) {
  if (!content) return false;

  return FRAMEWORK_PATTERNS.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(content);
  });
}

/**
 * Estimate lines changed in edit
 * @param {object} toolInput - Edit tool input
 * @returns {number}
 */
function estimateLinesChanged(toolInput) {
  if (!toolInput) return 0;

  const oldString = toolInput.old_string || '';
  const newString = toolInput.new_string || '';
  const content = toolInput.content || '';

  // For Write tool, count lines in content
  if (content) {
    return content.split('\n').length;
  }

  // For Edit tool, estimate diff size
  const oldLines = oldString.split('\n').length;
  const newLines = newString.split('\n').length;
  return Math.max(oldLines, newLines);
}

/**
 * Check if prompt contains bypass keywords
 * @param {object} payload - Hook payload
 * @returns {boolean}
 */
function hasPromptBypass(payload) {
  const toolInput = payload.tool_input || {};

  // Check for bypass keywords in various input fields
  const fieldsToCheck = [
    toolInput.old_string,
    toolInput.new_string,
    toolInput.content,
    toolInput.description,
    payload.prompt
  ];

  return fieldsToCheck.some(field => {
    if (!field || typeof field !== 'string') return false;
    return BYPASS_KEYWORDS.some(keyword =>
      field.toLowerCase().includes(keyword.toLowerCase())
    );
  });
}

/**
 * Check recent tool history for search evidence
 * @param {string} transcriptPath - Path to transcript file
 * @param {number} lookbackWindow - Number of recent lines to check
 * @returns {boolean}
 */
function hasRecentSearchEvidence(transcriptPath, lookbackWindow = LOOKBACK_WINDOW) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return false;
  }

  try {
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    const lines = transcript.split('\n');

    // Search last N lines for Grep/Glob tool calls
    const recentLines = lines.slice(-lookbackWindow);
    const toolCallPattern = /<invoke name="(Grep|Glob)">/;

    return recentLines.some(line => toolCallPattern.test(line));
  } catch (error) {
    // Non-blocking: If transcript read fails, allow continuation
    return false;
  }
}

/**
 * Build warning/error message
 * @param {string} filePath - File being edited
 * @param {string} reason - Reason for enforcement
 * @returns {string}
 */
function buildMessage(filePath, reason) {
  return `
🚫 BLOCKED: Search Existing Patterns First

File: ${filePath}
Reason: ${reason}

Before modifying code, you MUST search for existing implementations:

  1. Use Grep to find similar patterns:
     Grep: pattern="<feature-name>|<entity-name>|<concept>"

  2. Use Glob to locate related files:
     Glob: pattern="**/*<similar-file-pattern>*"

  3. Read base classes and framework utilities
  4. Verify no duplication exists
  5. Document search evidence in your response

WHY: Prevents code duplication, ensures pattern consistency, reuses battle-tested code.

This enforcement ensures adherence to CLAUDE.md Golden Rule #4.

Bypass (for trivial changes only):
  - Add "skip search" or "no search" or "just do it" to your prompt
  - Set CK_SKIP_SEARCH_CHECK=1 environment variable

Learn more: CLAUDE.md Golden Rule #4, docs/claude/architecture.md
`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

try {
  // Read stdin
  const stdin = fs.readFileSync(0, 'utf-8').trim();
  if (!stdin) process.exit(0);

  const payload = JSON.parse(stdin);
  const toolName = payload.tool_name || '';
  const toolInput = payload.tool_input || {};

  // Only enforce on code-modifying tools
  if (!CODE_MODIFYING_TOOLS.has(toolName)) {
    process.exit(0);
  }

  // Check for environment bypass
  if (BYPASS_ENV) {
    process.exit(0);
  }

  // Check for prompt bypass keywords
  if (hasPromptBypass(payload)) {
    process.exit(0);
  }

  // Get file path
  const filePath = toolInput.file_path || toolInput.notebook_path || '';

  // Check if file is exempt
  if (isExemptFile(filePath)) {
    process.exit(0);
  }

  // Check if file extension requires validation
  if (!isCodeFile(filePath)) {
    process.exit(0);
  }

  // Check if change is trivial (< MIN_LINES_THRESHOLD lines)
  const linesChanged = estimateLinesChanged(toolInput);
  if (linesChanged < MIN_LINES_THRESHOLD) {
    process.exit(0);
  }

  // Check cache first (O(1) performance)
  if (SEARCH_PERFORMED) {
    process.exit(0);
  }

  // Fallback: Check recent transcript for search evidence
  const hasSearchEvidence = hasRecentSearchEvidence(payload.transcript_path);

  if (hasSearchEvidence) {
    // Cache the result for subsequent calls
    process.env.CK_SEARCH_PERFORMED = '1';
    process.exit(0);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NO SEARCH EVIDENCE FOUND - Additional validation for framework patterns
  // ─────────────────────────────────────────────────────────────────────────

  const content = toolInput.content || toolInput.new_string || '';
  const hasFrameworkPattern = containsFrameworkPatterns(content);

  let reason = 'No search evidence found (Grep/Glob)';
  if (hasFrameworkPattern) {
    reason += ' and framework patterns detected (PlatformVmStore, Command handlers, etc.)';
  }

  const message = buildMessage(filePath, reason);
  console.log(message);
  process.exit(1);

} catch (error) {
  // Non-blocking: Log error and allow continuation
  console.error(`Search-before-code hook error: ${error.message}`);
  process.exit(0);
}
