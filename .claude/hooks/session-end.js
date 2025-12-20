#!/usr/bin/env node
/**
 * Claude Code Session End Hook
 *
 * This hook runs when a Claude Code session ends (Stop event).
 * It can be used to:
 * 1. Save session context for continuity
 * 2. Clean up temporary files
 * 3. Log session statistics
 *
 * Exit codes:
 * - 0: Success (should always exit 0 to not block)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MEMORY_DIR = path.join(__dirname, '..', 'memory');
const SESSION_LOG_FILE = path.join(MEMORY_DIR, 'session-log.md');
const MAX_LOG_ENTRIES = 50; // Keep last 50 session entries

/**
 * Ensure memory directory exists
 */
function ensureMemoryDir() {
    if (!fs.existsSync(MEMORY_DIR)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
}

/**
 * Get current timestamp
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Get git branch safely
 */
function getGitBranch() {
    try {
        const { execSync } = require('child_process');
        return execSync('git branch --show-current', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
    } catch {
        return 'unknown';
    }
}

/**
 * Rotate log file to keep only recent entries
 */
function rotateLogIfNeeded() {
    if (!fs.existsSync(SESSION_LOG_FILE)) {
        return;
    }

    try {
        const content = fs.readFileSync(SESSION_LOG_FILE, 'utf-8');
        const entries = content.split('## Session Ended').filter(e => e.trim());

        if (entries.length > MAX_LOG_ENTRIES) {
            // Keep only the last MAX_LOG_ENTRIES
            const recentEntries = entries.slice(-MAX_LOG_ENTRIES);
            const rotatedContent = recentEntries.map(e => '## Session Ended' + e).join('');
            fs.writeFileSync(SESSION_LOG_FILE, rotatedContent);
        }
    } catch {
        // Silently fail - rotation should never block
    }
}

/**
 * Log session end
 */
function logSessionEnd() {
    ensureMemoryDir();

    const entry = `
## Session Ended - ${getTimestamp()}
- Branch: ${getGitBranch()}
- Directory: ${process.cwd()}

---
`;

    try {
        fs.appendFileSync(SESSION_LOG_FILE, entry);
        rotateLogIfNeeded(); // Rotate after adding new entry
    } catch {
        // Silently fail - logging should never block
    }
}

// Read stdin (hook input)
let stdin = '';
try {
    stdin = fs.readFileSync(0, 'utf-8');
} catch {
    // No stdin is fine
}

// Log the session end
logSessionEnd();

// Always exit successfully
process.exit(0);
