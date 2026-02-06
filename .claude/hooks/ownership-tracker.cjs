#!/usr/bin/env node
'use strict';

/**
 * Ownership Tracker Hook (PostToolUse)
 *
 * Tracks file ownership changes with timestamps for Edit and Write tool calls.
 * Logs to .claude/memory/ownership-log.json with a rolling 500-entry window.
 *
 * What this does NOT catch:
 * Tracks authorship, not understanding. Ownership != comprehension.
 * A log entry means someone touched the file, not that they understood
 * its purpose, dependencies, or failure modes.
 *
 * Hook: PostToolUse (Edit|Write)
 * Output: .claude/memory/ownership-log.json
 *
 * @module ownership-tracker
 */

const fs = require('fs');
const path = require('path');

// Constants
const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const LOG_FILE = path.join(MEMORY_DIR, 'ownership-log.json');
const MAX_ENTRIES = 500;

/**
 * Read stdin asynchronously with timeout to prevent hanging
 * @returns {Promise<Object|null>} Parsed JSON payload or null
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    process.stdin.on('error', () => resolve(null));

    // Timeout after 500ms to prevent hanging
    setTimeout(() => resolve(null), 500);
  });
}

/**
 * Ensure memory directory exists
 */
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

/**
 * Read existing ownership log (returns [] on any error)
 * @returns {Array} Array of ownership entries
 */
function readLog() {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const raw = fs.readFileSync(LOG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Write ownership log with rolling window enforcement
 * @param {Array} entries - Array of ownership entries
 */
function writeLog(entries) {
  // Enforce rolling window: keep only the most recent MAX_ENTRIES
  const trimmed = entries.length > MAX_ENTRIES
    ? entries.slice(entries.length - MAX_ENTRIES)
    : entries;

  fs.writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

/**
 * Extract file path from tool input
 * @param {Object} toolInput - Tool input object
 * @returns {string|null} File path or null
 */
function extractFilePath(toolInput) {
  if (!toolInput) return null;
  return toolInput.file_path || toolInput.filePath || null;
}

async function main() {
  const payload = await readStdin();
  if (!payload) process.exit(0);

  const toolName = payload.tool_name;

  // Only track Edit and Write
  if (toolName !== 'Edit' && toolName !== 'Write') {
    process.exit(0);
  }

  const toolInput = payload.tool_input || {};
  const filePath = extractFilePath(toolInput);

  if (!filePath) process.exit(0);

  try {
    ensureMemoryDir();

    const entries = readLog();

    const sessionId = process.env.CLAUDE_SESSION_ID || process.env.SESSION_ID || 'unknown';

    entries.push({
      file: filePath,
      timestamp: new Date().toISOString(),
      session: sessionId,
    });

    writeLog(entries);
  } catch {
    // Never block the edit -- graceful degradation
  }

  process.exit(0);
}

main();
