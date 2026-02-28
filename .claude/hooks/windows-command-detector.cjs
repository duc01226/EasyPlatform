#!/usr/bin/env node
'use strict';
/**
 * Windows Command Detector Hook
 *
 * Detects Windows CMD-specific commands that will fail in Git Bash (MINGW64)
 * and provides Unix equivalents.
 *
 * @hook PreToolUse
 * @matcher Bash
 */

const fs = require('fs');

// Windows commands that fail in Git Bash with their Unix equivalents
const WINDOWS_COMMAND_PATTERNS = [
  {
    pattern: /^dir\s+\/[a-zA-Z]/,
    name: 'dir with flags',
    example: 'dir /b /s path',
    unix: 'find path -type f (recursive) or ls path (basic)',
    reason: 'Git Bash has /usr/bin/dir (GNU coreutils) which interprets /b as a file path'
  },
  {
    pattern: /^type\s+/,
    name: 'type (view file)',
    example: 'type file.txt',
    unix: 'cat file.txt',
    reason: 'type is a Windows CMD builtin, use cat in Git Bash'
  },
  {
    pattern: /^copy\s+/,
    name: 'copy',
    example: 'copy src dst',
    unix: 'cp src dst',
    reason: 'copy is Windows CMD, use cp in Git Bash'
  },
  {
    pattern: /^move\s+/,
    name: 'move',
    example: 'move src dst',
    unix: 'mv src dst',
    reason: 'move is Windows CMD, use mv in Git Bash'
  },
  {
    pattern: /^del\s+/,
    name: 'del',
    example: 'del file.txt',
    unix: 'rm file.txt',
    reason: 'del is Windows CMD, use rm in Git Bash'
  },
  {
    pattern: /^rmdir\s+\/[sS]/,
    name: 'rmdir /s',
    example: 'rmdir /s /q path',
    unix: 'rm -rf path',
    reason: 'rmdir /s is Windows CMD, use rm -rf in Git Bash'
  },
  {
    pattern: /^where\s+/,
    name: 'where',
    example: 'where node',
    unix: 'which node',
    reason: 'where is Windows CMD, use which in Git Bash'
  },
  {
    pattern: /^set\s+\w+=.*/,
    name: 'set (env var)',
    example: 'set VAR=value',
    unix: 'export VAR=value',
    reason: 'set is Windows CMD syntax, use export in Git Bash'
  },
  {
    pattern: /^cls$/,
    name: 'cls',
    example: 'cls',
    unix: 'clear',
    reason: 'cls is Windows CMD, use clear in Git Bash'
  },
  {
    pattern: /^ren\s+/,
    name: 'ren (rename)',
    example: 'ren old.txt new.txt',
    unix: 'mv old.txt new.txt',
    reason: 'ren is Windows CMD, use mv in Git Bash'
  },
  {
    pattern: /^attrib\s+/,
    name: 'attrib',
    example: 'attrib +r file.txt',
    unix: 'chmod 444 file.txt',
    reason: 'attrib is Windows CMD, use chmod in Git Bash'
  },
  {
    pattern: /^findstr\s+/,
    name: 'findstr',
    example: 'findstr pattern file.txt',
    unix: 'grep pattern file.txt',
    reason: 'findstr is Windows CMD, use grep in Git Bash'
  }
];

/**
 * Formats a block warning message for detected Windows command
 */
function formatBlockWarning(command, match) {
  const truncatedCmd = command.length > 80 ? `${command.substring(0, 80)}...` : command;

  return [
    `## ⚠️ Windows CMD Syntax Detected`,
    '',
    `**Command:** \`${match.name}\``,
    `**Detected:** \`${truncatedCmd}\``,
    '',
    `### Why This Fails`,
    match.reason,
    '',
    `### Fix`,
    `- **Windows (won't work):** \`${match.example}\``,
    `- **Unix (use this):** \`${match.unix}\``,
    '',
    `Claude Code runs in Git Bash (MINGW64), not Windows CMD.`,
    `See CLAUDE.md "Shell Environment" section for full command mapping.`
  ].join('\n');
}

function main() {
  try {
    const input = JSON.parse(fs.readFileSync(process.stdin.fd, 'utf-8'));

    // Only process Bash tool calls
    if (input.tool_name !== 'Bash') {
      return outputResult({ decision: 'approve' });
    }

    const command = input.tool_input?.command || '';

    // Find matching Windows command pattern
    const match = WINDOWS_COMMAND_PATTERNS.find(p => p.pattern.test(command));

    if (match) {
      // Block: output reason to stderr, exit code 2
      console.error(formatBlockWarning(command, match));
      process.exit(2);
    }

    // Allow
    process.exit(0);

  } catch (error) {
    console.error(`windows-command-detector error: ${error.message}`);
    process.exit(0); // Fail-open
  }
}

main();
