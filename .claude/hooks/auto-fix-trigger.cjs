#!/usr/bin/env node
'use strict';

/**
 * Auto-Fix Trigger Hook (PostToolUse: Bash)
 *
 * Detects build/test failures from Bash tool exit codes.
 * When failures detected, injects advisory system-reminder.
 * Tracks consecutive failures with escalation tiers:
 *   1st: suggestion
 *   2nd: stronger suggestion
 *   3rd+: suggest rollback review
 *
 * Whitelist approach: only reacts to known build/test command patterns.
 * Advisory only -- never blocks (exit 0 always).
 *
 * @module auto-fix-trigger
 */

const { parseStdinSync } = require('./lib/stdin-parser.cjs');
const { recordFailure, recordSuccess } = require('./lib/failure-state.cjs');

// Build/test command patterns (whitelist)
const BUILD_TEST_PATTERNS = [
  // .NET
  { pattern: /dotnet\s+(build|test|run|publish)/, category: 'dotnet' },
  // Node/Angular
  { pattern: /npm\s+(test|run\s+build|run\s+test|run\s+lint)/, category: 'npm' },
  { pattern: /nx\s+(test|build|lint|e2e|serve)/, category: 'nx' },
  { pattern: /npx\s+(jest|vitest|playwright)/, category: 'test-runner' },
  // Generic
  { pattern: /yarn\s+(test|build)/, category: 'yarn' }
];

/**
 * Match command against build/test patterns
 * @returns {{ category: string, match: string }|null}
 */
function matchBuildTestCommand(command) {
  if (!command || typeof command !== 'string') return null;

  for (const { pattern, category } of BUILD_TEST_PATTERNS) {
    const m = command.match(pattern);
    if (m) {
      return { category, match: m[0] };
    }
  }
  return null;
}

const MAX_ERROR_CHARS = 500;

function extractErrorSummary(toolResult, maxLines = 10) {
  if (!toolResult) return null;

  let output = '';
  if (typeof toolResult === 'string') {
    output = toolResult;
  } else if (typeof toolResult === 'object') {
    output = toolResult.stderr || toolResult.stdout || toolResult.output || '';
    if (typeof output !== 'string') output = String(output);
  }

  if (!output.trim()) return null;

  const lines = output.split('\n').filter(l => l.trim().length > 0);
  const tail = lines.slice(-maxLines).join('\n');

  if (tail.length > MAX_ERROR_CHARS) {
    return '...' + tail.slice(-MAX_ERROR_CHARS);
  }
  return tail || null;
}

/**
 * Generate advisory message based on failure count tier
 */
function generateAdvisory(commandSummary, count, errorSnippet) {
  if (count >= 3) {
    return `
## Repeated Build/Test Failure (${count} consecutive)

\`${commandSummary}\` has failed ${count} times consecutively.

**Consider escalating:**
1. Run \`git diff\` to review all recent changes
2. Consider reverting the last edit that introduced the failure
3. Use \`/debug\` workflow for systematic root cause analysis
4. Check if the failure existed before your changes
${errorSnippet ? `\n**Last error output:**\n\`\`\`\n${errorSnippet}\n\`\`\`\n` : ''}
This is advisory only.`;
  }

  if (count === 2) {
    return `
## Build/Test Failure (repeated)

\`${commandSummary}\` failed again (2nd consecutive failure).

**Suggested next steps:**
1. Read the full error trace carefully before retrying
2. Verify your fix addresses the actual error, not a symptom
3. Consider a different approach if the same fix isn't working
${errorSnippet ? `\n**Last error output:**\n\`\`\`\n${errorSnippet}\n\`\`\`\n` : ''}
This is advisory only.`;
  }

  // count === 1
  return `
## Build/Test Failure Detected

\`${commandSummary}\` exited with non-zero code.

**Suggested next steps:**
1. Read the error output above carefully
2. Identify the failing test or compilation error
3. Fix the root cause before retrying

This is advisory only.`;
}

try {
  const payload = parseStdinSync({ context: 'auto-fix-trigger' });
  if (!payload || payload.tool_name !== 'Bash') {
    process.exit(0);
  }

  const command = payload.tool_input?.command || '';
  const exitCode = payload.exit_code ?? payload.tool_result?.exit_code ?? 0;
  const sessionId = payload.session_id || process.env.CLAUDE_SESSION_ID || 'unknown';

  // Is this a build/test command?
  const match = matchBuildTestCommand(command);
  if (!match) {
    // Not a build/test command, ignore
    process.exit(0);
  }

  // Success? Reset counter
  if (exitCode === 0) {
    recordSuccess(sessionId, match.category);
    process.exit(0);
  }

  // Failure detected: extract error, record, and generate advisory
  const toolResult = payload.tool_result;
  const errorSnippet = extractErrorSummary(toolResult);
  const count = recordFailure(sessionId, match.category, match.match, errorSnippet);
  const advisory = generateAdvisory(match.match, count, errorSnippet);
  console.log(advisory);

  process.exit(0);
} catch (error) {
  // Fail-open: always exit 0
  process.exit(0);
}
