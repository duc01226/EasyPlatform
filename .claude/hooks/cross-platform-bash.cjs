#!/usr/bin/env node
/**
 * cross-platform-bash.cjs - Validates Bash commands for cross-platform compatibility
 *
 * Detects Windows-specific commands that fail in Git Bash/Unix shells:
 * - `dir /b /s` → Windows dir with flags (BLOCKED)
 * - `type`, `copy`, `move`, `del`, etc. → Windows CMD commands (BLOCKED)
 * - Paths with backslashes → Warning only (might be in quoted strings)
 * - `> nul` redirection → Warning only (creates 'nul' file but might be intentional)
 *
 * Exit Codes:
 * - 0: Command allowed (with optional warning)
 * - 2: Command blocked (definitive Windows CMD pattern detected)
 */

const fs = require('fs');
const os = require('os');

// Windows-specific command patterns that fail in Git Bash
const WINDOWS_COMMANDS = [
  {
    // Redirection to nul (Windows null device) - CRITICAL: creates 'nul' file in Git Bash
    // WARNING ONLY: might be intentional in test scripts
    pattern: /[12]?>\s*nul\b/i,
    message: 'Windows `nul` device redirection creates a file named "nul" in Git Bash',
    suggestion: 'Use `/dev/null` instead of `nul` for cross-platform compatibility',
    examples: [
      'command > nul → command > /dev/null',
      'command 2>nul → command 2>/dev/null',
      'command >nul 2>&1 → command > /dev/null 2>&1',
    ],
    blocking: false,
  },
  {
    // dir with Windows flags - BLOCKING (unambiguous CMD command)
    pattern: /^dir\s+\/[a-zA-Z]/,
    message: 'Windows `dir` command with flags detected',
    suggestion: 'Use `ls -la` (list) or `find . -type f` (recursive) instead',
    examples: [
      'dir /b /s path → find "path" -type f',
      'dir /b path → ls -1 "path"',
      'dir /s path → ls -R "path"',
    ],
    blocking: true,
  },
  {
    // dir without flags but could be ambiguous
    // WARNING ONLY: might work in some contexts
    pattern: /^dir\s+[A-Z]:\\/i,
    message: 'Windows-style path with `dir` command',
    suggestion: 'Use forward slashes and `ls` instead',
    examples: ['dir D:\\path → ls -la "D:/path"'],
    blocking: false,
  },
  {
    // type command (Windows equivalent of cat) - BLOCKING
    pattern: /^type\s+/,
    message: 'Windows `type` command detected',
    suggestion: 'Use `cat` instead',
    examples: ['type file.txt → cat file.txt'],
    blocking: true,
  },
  {
    // copy command - BLOCKING
    pattern: /^copy\s+/i,
    message: 'Windows `copy` command detected',
    suggestion: 'Use `cp` instead',
    examples: ['copy src dest → cp src dest'],
    blocking: true,
  },
  {
    // move command - BLOCKING
    pattern: /^move\s+/i,
    message: 'Windows `move` command detected',
    suggestion: 'Use `mv` instead',
    examples: ['move src dest → mv src dest'],
    blocking: true,
  },
  {
    // del/erase command - BLOCKING
    pattern: /^(del|erase)\s+/i,
    message: 'Windows `del` command detected',
    suggestion: 'Use `rm` instead',
    examples: ['del file.txt → rm file.txt'],
    blocking: true,
  },
  {
    // md/mkdir - BLOCKING
    pattern: /^md\s+/i,
    message: 'Windows `md` command detected',
    suggestion: 'Use `mkdir -p` instead',
    examples: ['md path\\subdir → mkdir -p "path/subdir"'],
    blocking: true,
  },
  {
    // rd/rmdir - BLOCKING
    pattern: /^(rd|rmdir)\s+/i,
    message: 'Windows `rd` command detected',
    suggestion: 'Use `rm -r` or `rmdir` with forward slashes',
    examples: ['rd /s path → rm -rf path'],
    blocking: true,
  },
  {
    // cls command - BLOCKING
    pattern: /^cls$/i,
    message: 'Windows `cls` command detected',
    suggestion: 'Use `clear` instead',
    examples: ['cls → clear'],
    blocking: true,
  },
  {
    // ren/rename - BLOCKING
    pattern: /^(ren|rename)\s+/i,
    message: 'Windows `ren` command detected',
    suggestion: 'Use `mv` instead',
    examples: ['ren old new → mv old new'],
    blocking: true,
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
 * @returns {{ issues: Array, hasBlocking: boolean }|null}
 */
function analyzeCommand(command) {
  if (!command || typeof command !== 'string') return null;

  const issues = [];
  let hasBlocking = false;
  const trimmed = command.trim();

  // Check for Windows-specific commands
  for (const cmd of WINDOWS_COMMANDS) {
    if (cmd.pattern.test(trimmed)) {
      issues.push({
        type: 'windows_command',
        message: cmd.message,
        suggestion: cmd.suggestion,
        examples: cmd.examples,
        blocking: cmd.blocking || false,
      });
      if (cmd.blocking) {
        hasBlocking = true;
      }
    }
  }

  // Check for backslash paths (common cross-platform issue) - WARNING ONLY
  if (BACKSLASH_PATH_PATTERN.test(trimmed) && !MULTIPLE_BACKSLASHES.test(trimmed)) {
    issues.push({
      type: 'backslash_path',
      message: 'Windows-style backslash path detected',
      suggestion: 'Use forward slashes for cross-platform compatibility',
      examples: [
        'D:\\path\\file → "D:/path/file"',
        'C:\\Users\\name → "C:/Users/name"',
      ],
      blocking: false,
    });
  }

  return issues.length > 0 ? { issues, hasBlocking } : null;
}

/**
 * Format warning or blocking message
 * @param {Array} issues - Detected issues
 * @param {boolean} blocking - Whether any issue is blocking
 */
function formatMessage(issues, blocking) {
  const lines = [
    blocking
      ? '🚫  **Windows CMD Command Blocked**'
      : '⚠️  **Cross-Platform Compatibility Warning**',
    '',
  ];

  for (const issue of issues) {
    const severity = issue.blocking ? '**BLOCKED**' : '*Warning*';
    lines.push(`${severity}: ${issue.message}`);
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
  if (blocking) {
    lines.push('*This Windows CMD command will FAIL in Git Bash/Unix shells.*');
    lines.push('*Use the portable Unix alternative shown above.*');
  } else {
    lines.push('*This command may fail in Git Bash/Unix shells on Windows.*');
    lines.push('*Use portable alternatives for cross-platform compatibility.*');
  }

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
  const result = analyzeCommand(command);

  if (result) {
    // Output message (warning or blocking error)
    console.log(formatMessage(result.issues, result.hasBlocking));

    // Exit 2 to block if definitive CMD pattern detected
    if (result.hasBlocking) {
      process.exit(2);
    }
  }

  // Allow - no issues detected
  process.exit(0);
} catch (error) {
  // Fail-open on any error
  console.error(`WARN: Hook error - ${error.message}`);
  process.exit(0);
}
