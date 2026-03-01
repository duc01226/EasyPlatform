#!/usr/bin/env node
/**
 * Search Before Code Hook - Edit/Write Validation
 *
 * Enforces "search existing code first" rule by checking for recent Grep/Glob
 * tool calls before allowing Edit/Write/MultiEdit operations.
 *
 * Part of Pattern-First Coding Enforcement (Quality Audit 2026-02-07).
 *
 * Trigger: PreToolUse → Edit|Write|MultiEdit
 * Logic:
 *   1. Check transcript for recent Grep/Glob calls (last 100 lines)
 *   2. If no search found AND file appears to implement new pattern → BLOCK
 *   3. Output blocking message with guidance
 *   4. Exception: Trivial files (< 20 lines), user override with "skip search" in message
 *
 * Configuration (.ck.json):
 *   searchBeforeCode.enabled - Enable/disable hook (default: true)
 *   searchBeforeCode.requireSearchFor - File patterns requiring search (default: .ts, .tsx, .cs)
 *   searchBeforeCode.trivialLineThreshold - Max lines for trivial exception (default: 20)
 *
 * Exit Codes:
 *   0 - Success (allow operation)
 *   1 - Blocked (search required)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadProjectConfig } = require('./lib/project-config-loader.cjs');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SEARCH_WINDOW_LINES = 100; // Check last N lines of transcript for searches
const TRIVIAL_LINE_THRESHOLD = 20; // Files with fewer lines are considered trivial
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// File extensions that require pattern search
const REQUIRE_SEARCH_EXTENSIONS = ['.ts', '.tsx', '.cs', '.html', '.scss'];

// Keywords indicating new pattern implementation (triggers search requirement)
// Loaded from docs/project-config.json framework.searchPatternKeywords
const projectConfig = loadProjectConfig();
const PATTERN_KEYWORDS = projectConfig.framework?.searchPatternKeywords || [
  'Command.*Handler',
  'Repository'
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if file extension requires search
 */
function requiresSearch(filePath) {
  if (!filePath) return false;
  const ext = path.extname(filePath).toLowerCase();
  return REQUIRE_SEARCH_EXTENSIONS.includes(ext);
}

/**
 * Check if file content contains pattern implementation keywords
 */
function containsPatternImplementation(content) {
  if (!content) return false;
  return PATTERN_KEYWORDS.some(keyword => {
    const regex = new RegExp(keyword, 'i');
    return regex.test(content);
  });
}

const TRANSCRIPT_MAX_LINES = 500; // Cap transcript to last N lines
const TRANSCRIPT_MAX_BYTES = 512 * 1024; // 512KB size guard

/**
 * Read transcript once with size guard
 * @param {string} transcriptPath - Path to transcript file
 * @returns {string} Transcript content (last TRANSCRIPT_MAX_LINES lines)
 */
function readTranscriptOnce(transcriptPath) {
  try {
    if (!transcriptPath || !fs.existsSync(transcriptPath)) return '';
    const stat = fs.statSync(transcriptPath);
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    // Always cap to last N lines (protects against unbounded reads in long sessions)
    if (stat.size > TRANSCRIPT_MAX_BYTES || content.split('\n').length > TRANSCRIPT_MAX_LINES) {
      return content.split('\n').slice(-TRANSCRIPT_MAX_LINES).join('\n');
    }
    return content;
  } catch {
    return '';
  }
}

/**
 * Check if transcript contains recent Grep/Glob searches
 * @param {string} transcriptContent - Already-read transcript string
 */
function hasRecentSearch(transcriptContent) {
  if (!transcriptContent) return false;
  const recentLines = transcriptContent.split('\n').slice(-SEARCH_WINDOW_LINES).join('\n');
  return recentLines.includes('"tool_name":"Grep"') || recentLines.includes('"tool_name":"Glob"');
}

/**
 * Check if user explicitly requested to skip search
 * @param {string} transcriptContent - Already-read transcript string
 */
function hasSkipSearchOverride(transcriptContent) {
  if (!transcriptContent) return false;
  const recentLines = transcriptContent.split('\n').slice(-50).join('\n');
  return /skip\s+search|no\s+search|just\s+do\s+it/i.test(recentLines);
}

/**
 * Check if file is trivial (small enough to not require search)
 */
function isTrivialFile(content) {
  if (!content) return true;
  const lines = content.split('\n').length;
  return lines < TRIVIAL_LINE_THRESHOLD;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  try {
    const stdin = fs.readFileSync(0, 'utf-8').trim();
    if (!stdin) process.exit(0);

    const payload = JSON.parse(stdin);

    // Only handle Edit/Write/MultiEdit
    if (!['Edit', 'Write', 'MultiEdit'].includes(payload.tool_name)) process.exit(0);

    // Load config
    let config = { enabled: true };
    try {
      const { loadConfig } = require('./lib/ck-config-utils.cjs');
      const fullConfig = loadConfig() || {};
      config = fullConfig.searchBeforeCode || config;
    } catch { /* use defaults */ }

    // Early exit if disabled
    if (config.enabled === false) process.exit(0);

    // Get file path
    const filePath = payload.tool_input?.file_path
        || payload.tool_input?.filePath
        || payload.tool_input?.edits?.[0]?.file_path
        || '';

    // Skip if file doesn't require search
    if (!requiresSearch(filePath)) process.exit(0);

    // Get file content
    const newContent = payload.tool_input?.new_string
        || payload.tool_input?.content
        || payload.tool_input?.edits?.[0]?.new_string
        || '';

    // Skip if trivial file
    if (isTrivialFile(newContent)) process.exit(0);

    // Read transcript ONCE (single read with size guard)
    const transcriptPath = payload.transcript_path || '';
    const transcript = readTranscriptOnce(transcriptPath);

    // Skip if user explicitly requested to skip search
    if (hasSkipSearchOverride(transcript)) process.exit(0);

    // Check if implementing new pattern
    if (!containsPatternImplementation(newContent)) process.exit(0);

    // Check for recent search
    if (hasRecentSearch(transcript)) process.exit(0);

    // BLOCK: No search found
    console.error('\n═══════════════════════════════════════════════════════════════════════');
    console.error('⛔ BLOCKED: Search existing code before implementing');
    console.error('═══════════════════════════════════════════════════════════════════════\n');
    console.error('File:', filePath);
    console.error('Reason: New pattern implementation detected without prior code search\n');
    console.error('REQUIRED ACTIONS:');
    console.error('1. Use Grep/Glob to find 3+ similar patterns in the codebase');
    console.error('2. Study existing implementations (NOT generic framework docs)');
    console.error('3. Provide file:line evidence in your plan\n');
    console.error('Example:');
    const exampleKeyword = PATTERN_KEYWORDS[0] || 'Repository';
    console.error(`  grep -r "${exampleKeyword}" src/ --include="*.cs" -A 3\n`);
    console.error('Override: Add "skip search" to your message if this is intentional');
    console.error('═══════════════════════════════════════════════════════════════════════\n');

    process.exit(1); // Block the operation
  } catch (error) {
    // Non-blocking on errors - allow operation to proceed
    if (process.env.CK_DEBUG) {
      console.error(`[SearchBeforeCode] Error: ${error.message}`);
    }
    process.exit(0);
  }
}

main();
