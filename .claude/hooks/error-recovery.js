#!/usr/bin/env node
/**
 * Claude Code PostToolUse Hook: Error Recovery Suggestions
 *
 * This hook runs after tool execution to detect failures and suggest recovery actions.
 * Helps implement the "Agentic Feedback Loop" from context engineering principles.
 *
 * Exit code 0 = Continue normally
 * Output: Suggestions for recovery if error detected
 */

const fs = require("fs");

// Read stdin
let stdin = "";
try {
  stdin = fs.readFileSync(0, "utf-8");
} catch (e) {
  process.exit(0);
}

let input;
try {
  input = JSON.parse(stdin);
} catch (e) {
  process.exit(0);
}

const toolName = input.tool_name || "";
const toolOutput = input.tool_output || "";
const toolInput = input.tool_input || {};

// Error patterns and recovery suggestions
const errorPatterns = [
  // Build errors
  {
    pattern: /error CS\d+|error TS\d+|Build FAILED/i,
    suggestion:
      "Build error detected. Consider:\n1. Check error message for specific file:line\n2. Verify using correct types/imports\n3. Run 'dotnet build' or 'npm run build' for full error output",
  },

  // Test failures
  {
    pattern: /FAIL|failed|AssertionError|Expected.*but got/i,
    suggestion:
      "Test failure detected. Consider:\n1. Read the assertion error carefully\n2. Check test expectations vs actual behavior\n3. Verify test setup and mock data",
  },

  // File not found
  {
    pattern: /ENOENT|No such file|file not found|Cannot find/i,
    suggestion:
      "File not found. Consider:\n1. Verify the file path is correct\n2. Check if file was created/moved\n3. Use Glob to search for similar files",
  },

  // Permission errors
  {
    pattern: /EACCES|Permission denied|Access is denied/i,
    suggestion:
      "Permission error. Consider:\n1. Check file/folder permissions\n2. Verify not editing protected paths\n3. Close files that might be locked",
  },

  // Network errors
  {
    pattern: /ECONNREFUSED|ETIMEDOUT|network error|fetch failed/i,
    suggestion:
      "Network error. Consider:\n1. Check if service is running\n2. Verify correct port/URL\n3. Check firewall/proxy settings",
  },

  // Git errors
  {
    pattern: /fatal:|error: Your local changes|CONFLICT/i,
    suggestion:
      "Git error detected. Consider:\n1. Check git status for uncommitted changes\n2. Resolve merge conflicts if present\n3. Verify you're on the correct branch",
  },

  // Database errors
  {
    pattern: /connection.*failed|database.*error|query.*failed/i,
    suggestion:
      "Database error. Consider:\n1. Check database connection string\n2. Verify database is running (docker-compose)\n3. Check if migrations are up to date",
  },

  // Validation errors
  {
    pattern: /validation.*failed|invalid.*input|required.*missing/i,
    suggestion:
      "Validation error. Consider:\n1. Check required fields\n2. Verify data format/types\n3. Review validation rules in entity/command",
  },
];

// Check for error patterns
if (toolOutput) {
  for (const { pattern, suggestion } of errorPatterns) {
    if (pattern.test(toolOutput)) {
      console.log(`\n=== Error Recovery Suggestion ===\n${suggestion}\n`);
      break; // Only show first matching suggestion
    }
  }
}

// Log failures to memory (could be enhanced to call Memory MCP)
if (
  toolOutput &&
  (toolOutput.includes("error") ||
    toolOutput.includes("FAIL") ||
    toolOutput.includes("Error"))
) {
  // Silently track for pattern analysis
  // Future: Store in Memory MCP for pattern learning
}

process.exit(0);
