#!/usr/bin/env node
/**
 * cross-platform-bash.cjs - Validates Bash commands for cross-platform compatibility
 *
 * Detects Windows-specific commands that fail in Git Bash/Unix shells:
 * - `dir /b /s` → Windows dir with flags (should use `ls -R` or `find`)
 * - Paths with backslashes → Will be stripped/escaped (should use forward slashes)
 *
 * This hook WARNS but does not block (fail-open). It provides helpful suggestions
 * for portable alternatives.
 *
 * Exit Codes:
 * - 0: Command allowed (with optional warning in output)
 */

const fs = require('fs');
const os = require('os');

// Windows-specific command patterns that fail in Git Bash
const WINDOWS_COMMANDS = [
  {
    // Redirection to nul (Windows null device) - CRITICAL: creates 'nul' file in Git Bash
    pattern: /[12]?>\s*nul\b/i,
    message: 'Windows `nul` device redirection creates a file named "nul" in Git Bash',
    suggestion: 'Use `/dev/null` instead of `nul` for cross-platform compatibility',
    examples: [
      'command > nul → command > /dev/null',
      'command 2>nul → command 2>/dev/null',
      'command >nul 2>&1 → command > /dev/null 2>&1',
    ],
  },
  {
    // dir with Windows flags
    pattern: /^dir\s+\/[a-zA-Z]/,
    message: 'Windows `dir` command with flags detected',
    suggestion: 'Use `ls -la` (list) or `find . -type f` (recursive) instead',
    examples: [
      'dir /b /s path → find "path" -type f',
      'dir /b path → ls -1 "path"',
      'dir /s path → ls -R "path"',
    ],
  },
  {
    // dir without flags but could be ambiguous
    pattern: /^dir\s+[A-Z]:\\/i,
    message: 'Windows-style path with `dir` command',
    suggestion: 'Use forward slashes and `ls` instead',
    examples: ['dir D:\\path → ls -la "D:/path"'],
  },
  {
    // type command (Windows equivalent of cat)
    pattern: /^type\s+/,
    message: 'Windows `type` command detected',
    suggestion: 'Use `cat` instead',
    examples: ['type file.txt → cat file.txt'],
  },
  {
    // copy command
    pattern: /^copy\s+/i,
    message: 'Windows `copy` command detected',
    suggestion: 'Use `cp` instead',
    examples: ['copy src dest → cp src dest'],
  },
  {
    // move command
    pattern: /^move\s+/i,
    message: 'Windows `move` command detected',
    suggestion: 'Use `mv` instead',
    examples: ['move src dest → mv src dest'],
  },
  {
    // del/erase command
    pattern: /^(del|erase)\s+/i,
    message: 'Windows `del` command detected',
    suggestion: 'Use `rm` instead',
    examples: ['del file.txt → rm file.txt'],
  },
  {
    // md/mkdir with backslashes
    pattern: /^md\s+/i,
    message: 'Windows `md` command detected',
    suggestion: 'Use `mkdir -p` instead',
    examples: ['md path\\subdir → mkdir -p "path/subdir"'],
  },
  {
    // rd/rmdir
    pattern: /^(rd|rmdir)\s+/i,
    message: 'Windows `rd` command detected',
    suggestion: 'Use `rm -r` or `rmdir` with forward slashes',
    examples: ['rd /s path → rm -rf path'],
  },
  {
    // cls command
    pattern: /^cls$/i,
    message: 'Windows `cls` command detected',
    suggestion: 'Use `clear` instead',
    examples: ['cls → clear'],
  },
  {
    // ren/rename
    pattern: /^(ren|rename)\s+/i,
    message: 'Windows `ren` command detected',
    suggestion: 'Use `mv` instead',
    examples: ['ren old new → mv old new'],
  },
];

// Detect backslash paths that will be misinterpreted in Git Bash
const BACKSLASH_PATH_PATTERN = /[A-Z]:\\/i;
const MULTIPLE_BACKSLASHES = /\\\\/; // Escaped backslashes

/**
 * Check if running in a Unix-like environment on Windows
 * Git Bash, MSYS2, Cygwin, WSL all set specific env vars
 */
function isUnixShellOnWindows() {
  return (
    os.platform() === 'win32' &&
    (process.env.MSYSTEM || // Git Bash / MSYS2
      process.env.CYGWIN || // Cygwin
      process.env.WSL_DISTRO_NAME || // WSL
      process.env.SHELL?.includes('/bin/')) // Generic Unix shell indicator
  );
}

/**
 * Analyze a command for cross-platform issues
 */
function analyzeCommand(command) {
  if (!command || typeof command !== 'string') return null;

  const issues = [];
  const trimmed = command.trim();

  // Check for Windows-specific commands
  for (const cmd of WINDOWS_COMMANDS) {
    if (cmd.pattern.test(trimmed)) {
      issues.push({
        type: 'windows_command',
        message: cmd.message,
        suggestion: cmd.suggestion,
        examples: cmd.examples,
      });
    }
  }

  // Check for backslash paths (common cross-platform issue)
  if (BACKSLASH_PATH_PATTERN.test(trimmed) && !MULTIPLE_BACKSLASHES.test(trimmed)) {
    issues.push({
      type: 'backslash_path',
      message: 'Windows-style backslash path detected',
      suggestion: 'Use forward slashes for cross-platform compatibility',
      examples: [
        'D:\\path\\file → "D:/path/file"',
        'C:\\Users\\name → "C:/Users/name"',
      ],
    });
  }

  return issues.length > 0 ? issues : null;
}

/**
 * Format warning message
 */
function formatWarning(issues) {
  const lines = [
    '⚠️  **Cross-Platform Compatibility Warning**',
    '',
  ];

  for (const issue of issues) {
    lines.push(`**Issue:** ${issue.message}`);
    lines.push(`**Fix:** ${issue.suggestion}`);
    if (issue.examples && issue.examples.length > 0) {
      lines.push('**Examples:**');
      for (const ex of issue.examples) {
        lines.push(`  - \`${ex}\``);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*This command may fail in Git Bash/Unix shells on Windows.*');
  lines.push('*Use portable alternatives for cross-platform compatibility.*');

  return lines.join('\n');
}

// Main execution
try {
  // Read stdin synchronously
  const hookInput = fs.readFileSync(0, 'utf-8');

  // Parse JSON (fail-open on errors)
  let data;
  try {
    data = JSON.parse(hookInput);
  } catch {
    process.exit(0);
  }

  // Only process Bash commands
  if (data.tool_name !== 'Bash') {
    process.exit(0);
  }

  // Get command from tool_input
  const command = data.tool_input?.command;
  if (!command) {
    process.exit(0);
  }

  // Analyze for cross-platform issues
  const issues = analyzeCommand(command);

  if (issues) {
    // Output warning but allow command to proceed (fail-open)
    console.log(formatWarning(issues));
  }

  // Always allow - this is a warning hook, not a blocking hook
  process.exit(0);
} catch (error) {
  // Fail-open on any error
  console.error(`WARN: Hook error - ${error.message}`);
  process.exit(0);
}
