#!/usr/bin/env node
/**
 * Claude Code PreToolUse Hook: Validate Bash Commands
 *
 * This hook runs before any Bash command execution to block dangerous operations.
 * Exit code 2 = Block the command
 * Exit code 0 = Allow the command
 *
 * Input: JSON via stdin with tool_input.command containing the Bash command
 * Output: JSON with decision and reason if blocking
 */

const fs = require('fs');

// Read stdin
let stdin = '';
try {
  stdin = fs.readFileSync(0, 'utf-8');
} catch (e) {
  // No stdin provided, allow by default
  process.exit(0);
}

let input;
try {
  input = JSON.parse(stdin);
} catch (e) {
  // Invalid JSON, allow by default
  process.exit(0);
}

const command = input.tool_input?.command || '';

// Patterns for dangerous commands that should be blocked
const dangerousPatterns = [
  // Destructive file operations
  { pattern: /rm\s+(-[rfRF]+\s+)*[\/~]/, reason: 'Recursive delete on root or home directory' },
  { pattern: /rm\s+-rf\s+\*/, reason: 'Recursive delete with wildcard' },
  { pattern: /rm\s+-rf\s+\.\./, reason: 'Recursive delete on parent directory' },

  // Dangerous git operations
  { pattern: /git\s+push\s+(-f|--force)/, reason: 'Force push can destroy remote history' },
  { pattern: /git\s+push\s+.*(-f|--force)/, reason: 'Force push can destroy remote history' },
  { pattern: /git\s+reset\s+--hard/, reason: 'Hard reset can lose uncommitted changes' },
  { pattern: /git\s+clean\s+-[dxf]*d[dxf]*/, reason: 'Git clean can delete untracked files' },

  // Database destructive operations
  { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)/i, reason: 'Database drop operation' },
  { pattern: /TRUNCATE\s+TABLE/i, reason: 'Database truncate operation' },
  { pattern: /DELETE\s+FROM\s+\S+\s*(;|$)/i, reason: 'Delete without WHERE clause' },

  // System-level dangerous operations
  { pattern: /chmod\s+777/, reason: 'Setting overly permissive file permissions' },
  { pattern: /chmod\s+-R\s+777/, reason: 'Recursive overly permissive permissions' },
  { pattern: /chown\s+-R\s+root/, reason: 'Changing ownership to root recursively' },

  // Remote code execution risks
  { pattern: /curl\s+.*\|\s*sh/, reason: 'Piping curl to shell is dangerous' },
  { pattern: /curl\s+.*\|\s*bash/, reason: 'Piping curl to bash is dangerous' },
  { pattern: /wget\s+.*\|\s*sh/, reason: 'Piping wget to shell is dangerous' },
  { pattern: /wget\s+.*\|\s*bash/, reason: 'Piping wget to bash is dangerous' },

  // Format/wipe operations
  { pattern: /mkfs\./, reason: 'Filesystem format operation' },
  { pattern: /dd\s+if=.*of=\/dev/, reason: 'Direct disk write operation' },

  // Environment destruction
  { pattern: /npm\s+cache\s+clean\s+--force/, reason: 'Force clean npm cache' },
  { pattern: /rm\s+-rf\s+node_modules/, reason: 'Deleting node_modules (use npm ci instead)' },
];

// Check each pattern
for (const { pattern, reason } of dangerousPatterns) {
  if (pattern.test(command)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `BLOCKED: ${reason}\nCommand: ${command}`
    }));
    process.exit(2);
  }
}

// Command is safe, allow execution
process.exit(0);
