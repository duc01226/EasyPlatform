/**
 * Project Boundary Hook Test Suite
 *
 * Tests for project-boundary.cjs:
 * - Write tools blocked outside boundary
 * - Read tools allowed outside boundary
 * - Bash write commands blocked outside boundary
 * - Bash read commands allowed outside boundary
 * - MCP filesystem read/write differentiation
 * - Edge cases and input validation
 */

const path = require('path');
const os = require('os');
const {
  runHook,
  getHookPath,
  createPreToolUseInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertContains,
  assertBlocked,
  assertAllowed,
  assertTrue,
  assertFalse
} = require('../lib/assertions.cjs');

const HOOK_PATH = getHookPath('project-boundary.cjs');

// Use the actual project dir as a known valid boundary
const PROJECT_DIR = path.resolve(__dirname, '..', '..', '..', '..');

// Path guaranteed to be outside project boundary (system temp)
const OUTSIDE_PATH = path.join(os.tmpdir(), 'claude', 'fake-task', 'output.txt').replace(/\\/g, '/');
const INSIDE_PATH = path.join(PROJECT_DIR, 'src', 'test.ts').replace(/\\/g, '/');

// Helper to run hook with explicit CLAUDE_PROJECT_DIR
async function runBoundaryHook(input) {
  return runHook(HOOK_PATH, input, {
    env: { CLAUDE_PROJECT_DIR: PROJECT_DIR }
  });
}

// ============================================================================
// Write tools: BLOCKED outside boundary
// ============================================================================

const writeToolBlockTests = [
  {
    name: '[project-boundary] blocks Edit outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Edit', { file_path: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Edit outside boundary should be blocked');
      const output = result.stdout + result.stderr;
      assertContains(output, 'PROJECT BOUNDARY BLOCK', 'Should show block message');
    }
  },
  {
    name: '[project-boundary] blocks Write outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Write', { file_path: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Write outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks MultiEdit outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('MultiEdit', { file_path: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'MultiEdit outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks NotebookEdit outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('NotebookEdit', { file_path: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'NotebookEdit outside boundary should be blocked');
    }
  },
];

// ============================================================================
// Write tools: ALLOWED inside boundary
// ============================================================================

const writeToolAllowTests = [
  {
    name: '[project-boundary] allows Edit inside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Edit', { file_path: INSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Edit inside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Write inside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Write', { file_path: INSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Write inside boundary should be allowed');
    }
  },
];

// ============================================================================
// Read tools: ALLOWED outside boundary (key fix for subagent output reads)
// ============================================================================

const readToolAllowTests = [
  {
    name: '[project-boundary] allows Read outside boundary (subagent output)',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Read outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Glob outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Glob', { pattern: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Glob outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Grep outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Grep', { pattern: 'test', path: OUTSIDE_PATH });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Grep outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Read of Claude temp task output',
    fn: async () => {
      // Simulate the exact scenario that was failing: reading subagent output
      const tempOutputPath = 'C:/Users/DUC~1.DAN/AppData/Local/Temp/claude/d--GitSources-EasyPlatform/tasks/abc1234.output';
      const input = createPreToolUseInput('Read', { file_path: tempOutputPath });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Read of Claude temp output should be allowed');
    }
  },
];

// ============================================================================
// Bash: read commands ALLOWED outside boundary
// ============================================================================

const bashReadAllowTests = [
  {
    name: '[project-boundary] allows Bash cat outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `cat "${OUTSIDE_PATH}" 2>/dev/null | tail -c 15000`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash cat (read) outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Bash tail outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `tail -n 50 "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash tail (read) outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Bash head outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `head -n 20 "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash head (read) outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Bash ls outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `ls -la "${os.tmpdir()}"`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash ls (read) outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Bash grep outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `grep -r "pattern" "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash grep (read) outside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows git status (no write operations)',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: 'git status'
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'git status should be allowed');
    }
  },
];

// ============================================================================
// Bash: write commands BLOCKED outside boundary
// ============================================================================

const bashWriteBlockTests = [
  {
    name: '[project-boundary] blocks Bash redirect write outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `echo "data" > "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash redirect outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks Bash append redirect outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `echo "data" >> "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash append redirect outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks Bash cp outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `cp src/file.txt "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash cp outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks Bash mv outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `mv src/file.txt "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash mv outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks Bash tee outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `echo "data" | tee "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash tee outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks Bash stderr redirect to file outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `node script.js 2>"${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash 2>file outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks Bash stdout redirect (1>) to file outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `node script.js 1>"${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'Bash 1>file outside boundary should be blocked');
    }
  },
];

// ============================================================================
// Bash: write commands ALLOWED inside boundary
// ============================================================================

const bashWriteAllowTests = [
  {
    name: '[project-boundary] allows Bash redirect inside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `echo "data" > "${INSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash redirect inside boundary should be allowed');
    }
  },
  {
    name: '[project-boundary] allows Bash cp inside boundary',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `cp src/a.txt src/b.txt`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Bash cp inside boundary should be allowed');
    }
  },
];

// ============================================================================
// containsWriteOperation unit tests (via hook behavior)
// ============================================================================

const writeDetectionTests = [
  {
    name: '[project-boundary] detects > redirect as write',
    fn: async () => {
      // Use a command that writes to an outside path
      const input = createPreToolUseInput('Bash', {
        command: `node script.js > "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, '> redirect should be detected as write');
    }
  },
  {
    name: '[project-boundary] does NOT treat 2>&1 as write redirect',
    fn: async () => {
      // 2>&1 is fd redirect, not file write. No write ops = allowed regardless
      const input = createPreToolUseInput('Bash', {
        command: `node script.js 2>&1`
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, '2>&1 should not be treated as write');
    }
  },
  {
    name: '[project-boundary] detects heredoc as write',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `cat <<EOF > "${OUTSIDE_PATH}"\ntest\nEOF`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'heredoc write should be detected');
    }
  },
  {
    name: '[project-boundary] detects mkdir as write',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `mkdir "${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'mkdir should be detected as write');
    }
  },
  {
    name: '[project-boundary] detects 2>file as write (not fd redirect)',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `node script.js 2>"${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, '2>file should be detected as write');
    }
  },
  {
    name: '[project-boundary] detects 1>file as write (not fd redirect)',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: `node script.js 1>"${OUTSIDE_PATH}"`
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, '1>file should be detected as write');
    }
  },
];

// ============================================================================
// MCP filesystem: read operations ALLOWED, write operations BLOCKED
// ============================================================================

const mcpFilesystemTests = [
  {
    name: '[project-boundary] allows MCP filesystem read_file outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('mcp__filesystem__read_file', {
        path: OUTSIDE_PATH
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'MCP read_file should be allowed outside boundary');
    }
  },
  {
    name: '[project-boundary] allows MCP filesystem list_directory outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('mcp__filesystem__list_directory', {
        path: OUTSIDE_PATH
      });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'MCP list_directory should be allowed outside boundary');
    }
  },
  {
    name: '[project-boundary] blocks MCP filesystem write_file outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('mcp__filesystem__write_file', {
        path: OUTSIDE_PATH
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'MCP write_file outside boundary should be blocked');
    }
  },
  {
    name: '[project-boundary] blocks MCP filesystem move_file outside boundary',
    fn: async () => {
      const input = createPreToolUseInput('mcp__filesystem__move_file', {
        path: OUTSIDE_PATH
      });
      const result = await runBoundaryHook(input);
      assertBlocked(result.code, 'MCP move_file outside boundary should be blocked');
    }
  },
];

// ============================================================================
// Non-boundary tools: should pass through
// ============================================================================

const nonBoundaryTests = [
  {
    name: '[project-boundary] passes through non-boundary tools',
    fn: async () => {
      const input = createPreToolUseInput('WebSearch', { query: 'test' });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'WebSearch should not be checked');
    }
  },
  {
    name: '[project-boundary] passes through Task tool',
    fn: async () => {
      const input = createPreToolUseInput('Task', { prompt: 'test' });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Task should not be checked');
    }
  },
];

// ============================================================================
// Input validation edge cases
// ============================================================================

const edgeCaseTests = [
  {
    name: '[project-boundary] handles empty input gracefully',
    fn: async () => {
      const result = await runHook(HOOK_PATH, null, {
        env: { CLAUDE_PROJECT_DIR: PROJECT_DIR }
      });
      assertAllowed(result.code, 'Empty input should not crash');
    }
  },
  {
    name: '[project-boundary] handles missing tool_input',
    fn: async () => {
      const input = { event: 'PreToolUse', tool_name: 'Edit' };
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Missing tool_input should not crash');
    }
  },
  {
    name: '[project-boundary] handles empty command in Bash',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: '' });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'Empty Bash command should be allowed');
    }
  },
  {
    name: '[project-boundary] allows write tools with no extractable path',
    fn: async () => {
      const input = createPreToolUseInput('Edit', { old_string: 'a', new_string: 'b' });
      const result = await runBoundaryHook(input);
      assertAllowed(result.code, 'No path = no boundary check needed');
    }
  },
];

// Export test suite
module.exports = {
  name: 'Project Boundary Hook',
  tests: [
    ...writeToolBlockTests,
    ...writeToolAllowTests,
    ...readToolAllowTests,
    ...bashReadAllowTests,
    ...bashWriteBlockTests,
    ...bashWriteAllowTests,
    ...writeDetectionTests,
    ...mcpFilesystemTests,
    ...nonBoundaryTests,
    ...edgeCaseTests
  ]
};
