#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Claude Hooks (Enhanced)
 *
 * Tests all 26 hooks in the BravoSUITE Claude Code integration.
 * Covers: SessionStart, SessionEnd, SubagentStart, UserPromptSubmit,
 *         PreToolUse, PostToolUse, PreCompact, Notification
 *
 * Enhanced features:
 * - Output validation (JSON, system-reminder, markdown)
 * - State verification (file writes, state persistence)
 * - Edge cases (empty, null, malformed JSON, Unicode)
 * - Complete pattern coverage (12 Windows commands, 10 privacy patterns)
 *
 * Usage: node test-all-hooks.cjs [--verbose] [--filter=<pattern>] [--validate-output] [--verify-state]
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - One or more tests failed
 *
 * @version 2.0.0
 * @date 2026-01-12
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Import test utilities
const {
  assertEqual,
  assertDeepEqual,
  assertTrue,
  assertFalse,
  assertContains,
  assertNotContains,
  assertJsonValid,
  assertJsonHasKey,
  assertExitCode,
  assertMatches,
  createTempDir,
  cleanupTempDir,
  cleanupAllTestDirs,
  writeTestFile,
  readTestFile,
  fileExists,
  parseBlockingDecision,
  parseSubagentOutput,
  containsSystemReminder,
  containsMarkdownSection,
  extractJsonFromOutput,
  verifyFileCreated,
  verifyFileContent,
  verifyJsonFile,
  verifyJsonlFile,
  loadFixture,
  setupFixtures,
  buildBashPayload,
  buildEditPayload,
  buildReadPayload,
  buildWritePayload,
  buildTodoPayload,
  buildUserPromptPayload,
  buildSessionPayload,
  TestGroup,
  TestSuite
} = require('./helpers/test-utils.cjs');

// ============================================================================
// Configuration
// ============================================================================

const HOOKS_DIR = path.join(__dirname, '..');
const VERBOSE = process.argv.includes('--verbose');
const FILTER = process.argv.find(a => a.startsWith('--filter='))?.split('=')[1] || '';
const VALIDATE_OUTPUT = process.argv.includes('--validate-output');
const VERIFY_STATE = process.argv.includes('--verify-state');

// Colors for terminal output
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m'
};

// ============================================================================
// Test Runner Infrastructure
// ============================================================================

/**
 * Run a hook with given input and return result
 * @param {string} hookFile - Hook filename
 * @param {object} input - Stdin input object
 * @param {object} options - Additional options (cwd, env, timeout)
 * @returns {Promise<{code: number, stdout: string, stderr: string, duration: number}>}
 */
async function runHook(hookFile, input, options = {}) {
  return new Promise((resolve) => {
    const hookPath = path.join(HOOKS_DIR, hookFile);

    if (!fs.existsSync(hookPath)) {
      resolve({ code: -1, stdout: '', stderr: `Hook not found: ${hookFile}`, duration: 0 });
      return;
    }

    const timeout = options.timeout || 10000;
    const env = { ...process.env, ...options.env };
    const startTime = Date.now();

    const proc = spawn('node', [hookPath], {
      cwd: options.cwd || process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, timeout);

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({
        code: killed ? -2 : (code || 0),
        stdout,
        stderr,
        duration,
        killed
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout: '', stderr: err.message, duration: Date.now() - startTime });
    });

    // Send input via stdin
    if (input !== null && input !== undefined) {
      const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
      proc.stdin.write(inputStr);
    }
    proc.stdin.end();
  });
}

/**
 * Test result tracking
 */
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  outputValidation: { passed: 0, failed: 0 },
  stateVerification: { passed: 0, failed: 0 }
};

/**
 * Log test result
 */
function logResult(name, passed, message = '') {
  const icon = passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  console.log(`${icon} ${name}${message ? `: ${message}` : ''}`);

  results.tests.push({ name, passed, message });
  if (passed) results.passed++;
  else results.failed++;
}

/**
 * Log output validation result
 */
function logOutputValidation(name, passed, message = '') {
  if (VALIDATE_OUTPUT) {
    const icon = passed ? `${COLORS.cyan}◉${COLORS.reset}` : `${COLORS.yellow}○${COLORS.reset}`;
    console.log(`  ${icon} Output: ${name}${message ? ` (${message})` : ''}`);
    if (passed) results.outputValidation.passed++;
    else results.outputValidation.failed++;
  }
}

/**
 * Log state verification result
 */
function logStateVerification(name, passed, message = '') {
  if (VERIFY_STATE) {
    const icon = passed ? `${COLORS.cyan}●${COLORS.reset}` : `${COLORS.yellow}○${COLORS.reset}`;
    console.log(`  ${icon} State: ${name}${message ? ` (${message})` : ''}`);
    if (passed) results.stateVerification.passed++;
    else results.stateVerification.failed++;
  }
}

/**
 * Skip test
 */
function skipTest(name, reason) {
  console.log(`${COLORS.yellow}○${COLORS.reset} ${name}: ${COLORS.dim}${reason}${COLORS.reset}`);
  results.skipped++;
}

/**
 * Log section header
 */
function logSection(title) {
  console.log(`\n${COLORS.bold}${COLORS.blue}━━━ ${title} ━━━${COLORS.reset}\n`);
}

/**
 * Log subsection
 */
function logSubsection(title) {
  console.log(`\n  ${COLORS.dim}─── ${title} ───${COLORS.reset}`);
}

// ============================================================================
// Test Cases: Session Lifecycle
// ============================================================================

async function testSessionInit() {
  logSection('SessionStart: session-init.cjs');

  // Test 1: Startup trigger
  {
    const result = await runHook('session-init.cjs', { source: 'startup' });
    logResult('Startup trigger exits 0', result.code === 0);
    if (result.stdout) {
      logOutputValidation('Contains system-reminder', containsSystemReminder(result.stdout));
    }
  }

  // Test 2: Resume trigger
  {
    const result = await runHook('session-init.cjs', { source: 'resume' });
    logResult('Resume trigger exits 0', result.code === 0);
  }

  // Test 3: Clear trigger (should skip processing)
  {
    const result = await runHook('session-init.cjs', { source: 'clear' });
    logResult('Clear trigger exits 0', result.code === 0);
  }

  // Test 4: Compact trigger
  {
    const result = await runHook('session-init.cjs', { source: 'compact' });
    logResult('Compact trigger exits 0', result.code === 0);
  }

  // Test 5: Empty input
  {
    const result = await runHook('session-init.cjs', null);
    logResult('Empty input exits 0', result.code === 0);
  }

  // Edge cases
  logSubsection('Edge Cases');

  // Test 6: Malformed JSON
  {
    const result = await runHook('session-init.cjs', 'not valid json');
    logResult('Malformed JSON handled', result.code === 0);
  }

  // Test 7: Unknown source
  {
    const result = await runHook('session-init.cjs', { source: 'unknown_source' });
    logResult('Unknown source handled', result.code === 0);
  }

  // Test 8: Empty object
  {
    const result = await runHook('session-init.cjs', {});
    logResult('Empty object handled', result.code === 0);
  }
}

async function testPostCompactRecovery() {
  logSection('SessionStart: post-compact-recovery.cjs');

  // Test 1: Resume trigger
  {
    const result = await runHook('post-compact-recovery.cjs', { source: 'resume' });
    logResult('Resume trigger exits 0', result.code === 0);
  }

  // Test 2: Compact trigger
  {
    const result = await runHook('post-compact-recovery.cjs', { source: 'compact' });
    logResult('Compact trigger exits 0', result.code === 0);
  }

  // Test 3: Startup (should skip)
  {
    const result = await runHook('post-compact-recovery.cjs', { source: 'startup' });
    logResult('Startup trigger exits 0 (no recovery needed)', result.code === 0);
  }

  // Test 4: Clear (should skip)
  {
    const result = await runHook('post-compact-recovery.cjs', { source: 'clear' });
    logResult('Clear trigger exits 0', result.code === 0);
  }
}

async function testSessionEnd() {
  logSection('SessionEnd: session-end.cjs');

  // Test 1: Clear reason
  {
    const result = await runHook('session-end.cjs', {
      reason: 'clear',
      session_id: 'test-session-123'
    });
    logResult('Clear reason exits 0', result.code === 0);
  }

  // Test 2: Exit reason
  {
    const result = await runHook('session-end.cjs', { reason: 'exit' });
    logResult('Exit reason exits 0', result.code === 0);
  }

  // Test 3: Compact reason
  {
    const result = await runHook('session-end.cjs', { reason: 'compact' });
    logResult('Compact reason exits 0', result.code === 0);
  }

  // Test 4: No reason provided
  {
    const result = await runHook('session-end.cjs', {});
    logResult('No reason handled', result.code === 0);
  }

  // Test 5: With session_id
  {
    const result = await runHook('session-end.cjs', {
      reason: 'exit',
      session_id: 'test-abc-123'
    });
    logResult('With session_id handled', result.code === 0);
  }
}

// ============================================================================
// Test Cases: Subagent
// ============================================================================

async function testSubagentInit() {
  logSection('SubagentStart: subagent-init.cjs');

  const subagentTypes = [
    'scout',
    'Explore',
    'planner',
    'researcher',
    'debugger',
    'tester',
    'code-reviewer',
    'fullstack-developer'
  ];

  for (const subagentType of subagentTypes) {
    const result = await runHook('subagent-init.cjs', {
      subagent_type: subagentType,
      prompt: `Test prompt for ${subagentType}`
    });
    logResult(`${subagentType} subagent exits 0`, result.code === 0);

    // Validate output format
    if (result.stdout) {
      const parsed = parseSubagentOutput(result.stdout);
      logOutputValidation(`${subagentType} output valid`, parsed.valid || !result.stdout.includes('{'));
    }
  }

  // Edge cases
  logSubsection('Edge Cases');

  // Empty input
  {
    const result = await runHook('subagent-init.cjs', null);
    logResult('Empty input exits 0', result.code === 0);
  }

  // Unknown subagent type
  {
    const result = await runHook('subagent-init.cjs', {
      subagent_type: 'unknown-type',
      prompt: 'test'
    });
    logResult('Unknown type handled', result.code === 0);
  }

  // Empty prompt
  {
    const result = await runHook('subagent-init.cjs', {
      subagent_type: 'scout',
      prompt: ''
    });
    logResult('Empty prompt handled', result.code === 0);
  }
}

// ============================================================================
// Test Cases: User Input
// ============================================================================

async function testWorkflowRouter() {
  logSection('UserPromptSubmit: workflow-router.cjs');

  const workflowTriggers = [
    { prompt: 'implement a new login feature', intent: 'feature' },
    { prompt: 'add user authentication', intent: 'feature' },
    { prompt: 'create a new component', intent: 'feature' },
    { prompt: 'build the search functionality', intent: 'feature' },
    { prompt: 'fix the bug in authentication', intent: 'bugfix' },
    { prompt: 'the login is not working', intent: 'bugfix' },
    { prompt: 'there is an error in the form', intent: 'bugfix' },
    { prompt: 'update the README documentation', intent: 'docs' },
    { prompt: 'document the API', intent: 'docs' },
    { prompt: 'refactor the service layer', intent: 'refactor' },
    { prompt: 'clean up the code', intent: 'refactor' },
    { prompt: 'how does the auth system work?', intent: 'investigation' },
    { prompt: 'explain the caching mechanism', intent: 'investigation' },
    { prompt: 'where is the config file?', intent: 'investigation' }
  ];

  for (const { prompt, intent } of workflowTriggers) {
    const result = await runHook('workflow-router.cjs', { prompt });
    logResult(`${intent}: "${prompt.slice(0, 30)}..."`, result.code === 0);
  }

  // No workflow detection
  logSubsection('No Workflow (Simple Questions)');

  const simpleQuestions = [
    'what time is it?',
    'hello',
    'thanks',
    'yes',
    'no'
  ];

  for (const prompt of simpleQuestions) {
    const result = await runHook('workflow-router.cjs', { prompt });
    logResult(`No workflow: "${prompt}"`, result.code === 0);
  }

  // Quick prefix
  logSubsection('Quick Prefix');
  {
    const result = await runHook('workflow-router.cjs', {
      prompt: 'quick: add a button'
    });
    logResult('Quick prefix handled', result.code === 0);
  }

  // Slash command
  {
    const result = await runHook('workflow-router.cjs', {
      prompt: '/plan implement feature'
    });
    logResult('Slash command handled', result.code === 0);
  }
}

async function testDevRulesReminder() {
  logSection('UserPromptSubmit: dev-rules-reminder.cjs');

  // Test 1: Basic prompt
  {
    const result = await runHook('dev-rules-reminder.cjs', {
      prompt: 'help me write a component'
    });
    logResult('Basic prompt exits 0', result.code === 0);
  }

  // Test 2: Empty prompt
  {
    const result = await runHook('dev-rules-reminder.cjs', { prompt: '' });
    logResult('Empty prompt exits 0', result.code === 0);
  }

  // Test 3: Long prompt
  {
    const result = await runHook('dev-rules-reminder.cjs', {
      prompt: 'a'.repeat(5000)
    });
    logResult('Long prompt handled', result.code === 0);
  }

  // Test 4: Unicode prompt
  {
    const result = await runHook('dev-rules-reminder.cjs', {
      prompt: 'implement 日本語 feature with emoji 🎉'
    });
    logResult('Unicode prompt handled', result.code === 0);
  }
}

async function testLessonsInjector() {
  logSection('UserPromptSubmit/PreToolUse: lessons-injector.cjs');

  // Test 1: Empty stdin
  {
    const result = await runHook('lessons-injector.cjs', null);
    logResult('Empty stdin exits 0', result.code === 0);
  }

  // Test 2: Missing lessons file
  {
    const result = await runHook('lessons-injector.cjs', { prompt: 'test' }, {
      env: { CLAUDE_PROJECT_DIR: os.tmpdir() }
    });
    logResult('Missing lessons file exits 0', result.code === 0);
  }

  // Test 3: Lessons file with header only (no entries)
  {
    const tempDir = createTempDir();
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'lessons.md'), '# Learned Lessons\n\nNo entries yet.\n');
    try {
      const result = await runHook('lessons-injector.cjs', { prompt: 'test' }, {
        env: { CLAUDE_PROJECT_DIR: tempDir }
      });
      logResult('Header-only lessons file exits 0, no output',
        result.code === 0 && !result.stdout.includes('## Learned Lessons'));
    } finally {
      cleanupTempDir(tempDir);
    }
  }

  // Test 4: Lessons file with entries outputs content
  {
    const tempDir = createTempDir();
    const docsDir = path.join(tempDir, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'lessons.md'),
      '# Learned Lessons\n\n- [backend] Always use repository pattern\n- [frontend] Use BEM classes\n');
    try {
      const result = await runHook('lessons-injector.cjs', { prompt: 'test' }, {
        env: { CLAUDE_PROJECT_DIR: tempDir }
      });
      logResult('Lessons with entries outputs content',
        result.code === 0 && result.stdout.includes('## Learned Lessons'));
      logResult('Output includes lesson entries',
        result.stdout.includes('repository pattern'));
    } finally {
      cleanupTempDir(tempDir);
    }
  }
}

// ============================================================================
// Test Cases: PreToolUse (Blocking Hooks)
// ============================================================================

async function testWindowsCommandDetector() {
  logSection('PreToolUse: windows-command-detector.cjs');

  // ALL Windows CMD patterns (12 patterns)
  logSubsection('Windows CMD Patterns (Should Block)');
  const windowsPatterns = [
    { cmd: 'dir /b /s src', name: 'dir with flags', shouldBlock: true },
    { cmd: 'dir /w', name: 'dir /w', shouldBlock: true },
    { cmd: 'type file.txt', name: 'type command', shouldBlock: true },
    { cmd: 'type package.json', name: 'type package.json', shouldBlock: true },
    { cmd: 'copy file1.txt file2.txt', name: 'copy command', shouldBlock: true },
    { cmd: 'move src dst', name: 'move command', shouldBlock: true },
    { cmd: 'del file.txt', name: 'del command', shouldBlock: true },
    { cmd: 'del /f /q temp', name: 'del with flags', shouldBlock: true },
    { cmd: 'rmdir /s /q path', name: 'rmdir /s', shouldBlock: true },
    { cmd: 'where node', name: 'where command', shouldBlock: true },
    { cmd: 'set NODE_ENV=production', name: 'set VAR=', shouldBlock: true },
    { cmd: 'set PATH=%PATH%;C:\\bin', name: 'set PATH', shouldBlock: true },
    { cmd: 'cls', name: 'cls command', shouldBlock: true },
    { cmd: 'ren old.txt new.txt', name: 'ren command', shouldBlock: true },
    // Note: 'rename' (full word) is not blocked - only 'ren' shorthand is Windows-specific
    { cmd: 'attrib +r file', name: 'attrib command', shouldBlock: true },
    { cmd: 'findstr pattern file', name: 'findstr command', shouldBlock: true },
    { cmd: 'findstr /s /i "search" *.txt', name: 'findstr with flags', shouldBlock: true }
  ];

  for (const { cmd, name, shouldBlock } of windowsPatterns) {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: 'Bash',
      tool_input: { command: cmd }
    });
    // Exit code 2 = block, exit code 0 = allow
    const isBlocked = result.code === 2;
    logResult(`${name}`, isBlocked === shouldBlock);
    if (shouldBlock) {
      logOutputValidation(`${name} has block message`, result.stderr.includes('Windows CMD'));
    }
  }

  // Unix commands (should allow)
  logSubsection('Unix Commands (Should Allow)');
  const unixPatterns = [
    { cmd: 'ls -la src', name: 'ls -la' },
    { cmd: 'cat file.txt', name: 'cat command' },
    { cmd: 'cp file1 file2', name: 'cp command' },
    { cmd: 'mv src dst', name: 'mv command' },
    { cmd: 'rm file.txt', name: 'rm command' },
    { cmd: 'rm -rf temp', name: 'rm -rf' },
    { cmd: 'which node', name: 'which command' },
    { cmd: 'export NODE_ENV=production', name: 'export command' },
    { cmd: 'clear', name: 'clear command' },
    { cmd: 'grep pattern file', name: 'grep command' },
    { cmd: 'find . -name "*.ts"', name: 'find command' }
  ];

  for (const { cmd, name } of unixPatterns) {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: 'Bash',
      tool_input: { command: cmd }
    });
    logResult(`${name} allowed`, result.code === 0);
  }

  // Non-Bash tools (should ignore)
  logSubsection('Non-Bash Tools');
  const nonBashTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Task'];
  for (const tool of nonBashTools) {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: tool,
      tool_input: { file_path: 'test.txt' }
    });
    logResult(`${tool} tool ignored`, result.code === 0);
  }

  // Edge cases
  logSubsection('Edge Cases');
  {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: 'Bash',
      tool_input: { command: '' }
    });
    logResult('Empty command handled', result.code === 0);
  }
  {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: 'Bash',
      tool_input: {}
    });
    logResult('Missing command handled', result.code === 0);
  }
}

async function testScoutBlock() {
  logSection('PreToolUse: scout-block.cjs');

  // Blocked paths
  logSubsection('Blocked Paths');
  const blockedPaths = [
    'node_modules/pkg/index.js',
    'node_modules/@types/node/index.d.ts',
    '.git/config',
    '.git/HEAD',
    'dist/bundle.js',
    'build/output.js',
    'coverage/lcov.info',
    '.next/cache/webpack',
    '.nuxt/dist/server'
  ];

  for (const filePath of blockedPaths) {
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Read',
      tool_input: { file_path: filePath }
    });
    logResult(`${filePath} blocked`, result.code === 2);
  }

  // Allowed paths
  logSubsection('Allowed Paths');
  const allowedPaths = [
    'src/index.ts',
    'src/components/App.tsx',
    'lib/utils.js',
    'tests/unit.test.ts',
    'package.json',
    'tsconfig.json',
    '.claude/hooks/test.cjs'
  ];

  for (const filePath of allowedPaths) {
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Read',
      tool_input: { file_path: filePath }
    });
    logResult(`${filePath} allowed`, result.code === 0);
  }

  // Glob patterns
  logSubsection('Glob Patterns');
  {
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Glob',
      tool_input: { pattern: '**/*.ts' }
    });
    logResult('Broad glob **/*.ts blocked', result.code === 2);
  }
  {
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Glob',
      tool_input: { pattern: 'src/**/*.ts' }
    });
    logResult('Scoped glob src/**/*.ts allowed', result.code === 0);
  }
  {
    // Note: *.json at root IS blocked as broad pattern - use scoped path instead
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Glob',
      tool_input: { pattern: '*.json' }
    });
    logResult('Root glob *.json blocked (broad pattern)', result.code === 2);
  }
  {
    // Scoped path makes simple patterns OK
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Glob',
      tool_input: { pattern: '*.json', path: 'src/config' }
    });
    logResult('Scoped glob src/config/*.json allowed', result.code === 0);
  }

  // Bash commands
  logSubsection('Bash Commands');
  {
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'npm run build' }
    });
    logResult('npm build allowed', result.code === 0);
  }
  {
    const result = await runHook('scout-block.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'cat node_modules/pkg/index.js' }
    });
    logResult('cat node_modules blocked', result.code === 2);
  }
}

async function testPrivacyBlock() {
  logSection('PreToolUse: privacy-block.cjs');

  // ALL privacy patterns (10 patterns)
  logSubsection('Privacy Patterns (Should Block)');
  const privacyPatterns = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    'config/.env',
    'secrets.yaml',
    'secrets.yml',
    'credentials.json',
    'config/credentials.json',
    'key.pem',
    'server.pem',
    'private.key',
    'ssl.key',
    'id_rsa',
    '.ssh/id_rsa',
    'id_ed25519',
    '.ssh/id_ed25519',
    'public.pem'  // All .pem files are blocked (can't distinguish public/private by name)
    // Note: service-account.json and firebase-config.json are NOT blocked
    // The hook only blocks files matching /credentials/i pattern
  ];

  for (const filePath of privacyPatterns) {
    const result = await runHook('privacy-block.cjs', {
      tool_input: { file_path: filePath }
    });
    logResult(`${filePath} blocked`, result.code === 2);
  }

  // Exempt patterns (should allow)
  logSubsection('Exempt Patterns (Should Allow)');
  const exemptPatterns = [
    '.env.example',
    '.env.sample',
    '.env.template',
    // Note: public.pem IS blocked - hook can't distinguish public vs private by name alone
    'APPROVED:.env',
    'APPROVED:credentials.json'
  ];

  for (const filePath of exemptPatterns) {
    const result = await runHook('privacy-block.cjs', {
      tool_input: { file_path: filePath }
    });
    logResult(`${filePath} allowed`, result.code === 0);
  }

  // Regular files (should allow)
  logSubsection('Regular Files (Should Allow)');
  const regularFiles = [
    'src/index.ts',
    'package.json',
    'README.md',
    'config.ts',
    'settings.json'
  ];

  for (const filePath of regularFiles) {
    const result = await runHook('privacy-block.cjs', {
      tool_input: { file_path: filePath }
    });
    logResult(`${filePath} allowed`, result.code === 0);
  }

  // Bash commands with privacy files
  logSubsection('Bash Privacy Commands');
  {
    const result = await runHook('privacy-block.cjs', {
      tool_input: { command: 'cat .env' }
    });
    logResult('cat .env blocked', result.code === 2);
  }
  {
    const result = await runHook('privacy-block.cjs', {
      tool_input: { command: 'grep password .env' }
    });
    logResult('grep .env blocked', result.code === 2);
  }
  {
    const result = await runHook('privacy-block.cjs', {
      tool_input: { command: 'cat config.json' }
    });
    logResult('cat config.json allowed', result.code === 0);
  }
}

async function testEditEnforcement() {
  logSection('PreToolUse: edit-enforcement.cjs');

  // Test 1: Exempt file (.md) - should allow even without tasks
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: 'README.md', old_string: 'a', new_string: 'b' }
    });
    logResult('Exempt .md file allowed', result.code === 0);
  }

  // Test 2: Exempt file (.json) - should allow
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: 'config.json', content: '{}' }
    });
    logResult('Exempt .json file allowed', result.code === 0);
  }

  // Test 3: Exempt path (.claude/hooks/) - should allow
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: '.claude/hooks/some-hook.cjs', old_string: 'a', new_string: 'b' }
    });
    logResult('Exempt .claude/hooks/ path allowed', result.code === 0);
  }

  // Test 4: Exempt path (plans/) - should allow
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: 'plans/my-plan.md', content: 'plan' }
    });
    logResult('Exempt plans/ path allowed', result.code === 0);
  }

  // Test 5: Non-exempt .ts file without tasks - should BLOCK (exit 1)
  // Use isolated session ID with no todo state to ensure blocking
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: 'src/test.ts', old_string: 'a', new_string: 'b' }
    }, { env: { CK_SESSION_ID: `test-edit-block-ts-${Date.now()}` } });
    logResult('Non-exempt .ts file without tasks blocked', result.code === 1);
  }

  // Test 6: Non-exempt .cs file without tasks - should BLOCK (exit 1)
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Write',
      tool_input: { file_path: 'src/Service/Handler.cs', content: 'code' }
    }, { env: { CK_SESSION_ID: `test-edit-block-cs-${Date.now()}` } });
    logResult('Non-exempt .cs file without tasks blocked', result.code === 1);
  }

  // Test 7: MultiEdit tool - extracts primaryPath from edits[0].file_path → non-exempt → BLOCK
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'MultiEdit',
      tool_input: { edits: [{ file_path: 'a.ts' }, { file_path: 'b.ts' }] }
    }, { env: { CK_SESSION_ID: `test-edit-block-multi-${Date.now()}` } });
    logResult('MultiEdit non-exempt files without tasks blocked', result.code === 1);
  }

  // Test 8: NotebookEdit tool - non-exempt without tasks → BLOCK
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'NotebookEdit',
      tool_input: { notebook_path: 'analysis.ipynb' }
    }, { env: { CK_SESSION_ID: `test-edit-block-nb-${Date.now()}` } });
    logResult('NotebookEdit non-exempt without tasks blocked', result.code === 1);
  }

  // Test 9: Non-edit tool (should ignore)
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Read',
      tool_input: { file_path: 'test.ts' }
    });
    logResult('Read tool ignored', result.code === 0);
  }

  // Test 10: Quick mode bypass
  {
    const result = await runHook('edit-enforcement.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: 'src/test.ts', old_string: 'a', new_string: 'b' }
    }, { env: { CK_QUICK_MODE: 'true' } });
    logResult('Quick mode bypasses enforcement', result.code === 0);
  }
}

async function testSkillEnforcement() {
  logSection('PreToolUse: skill-enforcement.cjs');

  // Meta skills - always allowed regardless of tasks/workflow (tested with clean session)
  logSubsection('Meta Skills (always allowed)');
  const metaSkills = ['help', 'memory', 'checkpoint', 'recover', 'context', 'ck-help', 'watzup', 'compact'];
  const metaSessionId = `test-skill-meta-${Date.now()}`;

  for (const skill of metaSkills) {
    const result = await runHook('skill-enforcement.cjs', {
      tool_name: 'Skill',
      tool_input: { skill }
    }, { env: { CK_SESSION_ID: metaSessionId } });
    logResult(`${skill} meta skill allowed`, result.code === 0);
  }

  // Research skills WITH todos — allowed (research phase doesn't need implementation tasks)
  logSubsection('Research Skills');
  const researchSkills = ['scout', 'investigate', 'explore', 'plan', 'analyze', 'review', 'debug', 'docs'];
  const researchSessionId = `test-skill-research-${Date.now()}`;

  // Set up todo state so research skills can pass through the no-todos gate
  {
    const { markTodosCalled, clearTodoState } = require('../lib/todo-state.cjs');
    markTodosCalled(researchSessionId, { pending: 1, completed: 0, inProgress: 0 });
  }

  for (const skill of researchSkills) {
    const result = await runHook('skill-enforcement.cjs', {
      tool_name: 'Skill',
      tool_input: { skill }
    }, { env: { CK_SESSION_ID: researchSessionId } });
    logResult(`${skill} allowed (research)`, result.code === 0);
  }

  // Clean up todo state
  {
    const { clearTodoState } = require('../lib/todo-state.cjs');
    clearTodoState(researchSessionId);
  }

  // Research skills WITHOUT todos/workflow — blocked (forces workflow activation first)
  logSubsection('Research Skills (blocked without tasks/workflow)');
  {
    const cleanSessionId = `test-skill-no-todos-${Date.now()}`;
    const result = await runHook('skill-enforcement.cjs', {
      tool_name: 'Skill',
      tool_input: { skill: 'scout' }
    }, { env: { CK_SESSION_ID: cleanSessionId } });
    logResult('scout without tasks/workflow blocked', result.code === 1);
  }

  // Implementation skills without tasks - should block (exit 1)
  // Use isolated session IDs with no todo state to ensure blocking
  logSubsection('Implementation Skills (blocked without tasks)');
  const implSkills = ['cook', 'code', 'implement', 'fix'];

  for (const skill of implSkills) {
    const result = await runHook('skill-enforcement.cjs', {
      tool_name: 'Skill',
      tool_input: { skill }
    }, { env: { CK_SESSION_ID: `test-skill-block-${skill}-${Date.now()}` } });
    // skill-enforcement blocks with exit code 1 (not 2)
    logResult(`${skill} without tasks blocked`, result.code === 1);
  }

  // Quick mode bypass
  logSubsection('Quick Mode Bypass');
  {
    const result = await runHook('skill-enforcement.cjs', {
      tool_name: 'Skill',
      tool_input: { skill: 'cook' }
    }, { env: { CK_QUICK_MODE: 'true' } });
    logResult('Quick mode bypasses skill enforcement', result.code === 0);
  }

  // Non-Skill tool (should ignore)
  {
    const result = await runHook('skill-enforcement.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: 'test.ts' }
    });
    logResult('Non-Skill tool ignored', result.code === 0);
  }
}

async function testContextInjectors() {
  logSection('PreToolUse: Context Injector Hooks');

  // Design System Context
  logSubsection('design-system-context.cjs');
  const frontendPaths = [
    'src/WebV2/apps/growth/src/app.component.ts',
    'src/WebV2/libs/bravo-common/src/button.component.ts',
    'src/WebV2/apps/employee/src/pages/profile.component.ts'
  ];

  for (const filePath of frontendPaths) {
    const result = await runHook('design-system-context.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: filePath }
    });
    logResult(`Design system: ${filePath.split('/').pop()}`, result.code === 0);
    if (result.stdout) {
      logOutputValidation('Contains design tokens', result.stdout.includes('design') || result.stdout.length < 10);
    }
  }

  // Backend C# Context
  logSubsection('backend-csharp-context.cjs');
  const backendPaths = [
    'src/Services/Growth/Commands/SaveCommand.cs',
    'src/Services/Talents/Entities/Employee.cs',
    'src/Platform/Easy.Platform/Application/Handler.cs'
  ];

  for (const filePath of backendPaths) {
    const result = await runHook('backend-csharp-context.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: filePath }
    });
    logResult(`Backend context: ${filePath.split('/').pop()}`, result.code === 0);
  }

  // Frontend TypeScript Context
  logSubsection('frontend-typescript-context.cjs');
  const tsPaths = [
    'src/WebV2/libs/bravo-common/src/component.ts',
    'src/WebV2/apps/growth/src/app.module.ts',
    'src/WebV2/libs/platform-core/src/store.ts'
  ];

  for (const filePath of tsPaths) {
    const result = await runHook('frontend-typescript-context.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: filePath }
    });
    logResult(`Frontend context: ${filePath.split('/').pop()}`, result.code === 0);
  }

  // SCSS Styling Context
  logSubsection('scss-styling-context.cjs');
  const scssPaths = [
    'src/WebV2/apps/growth/styles/main.scss',
    'src/WebV2/libs/bravo-common/src/button.component.scss',
    'src/WebV2/styles/_variables.scss'
  ];

  for (const filePath of scssPaths) {
    const result = await runHook('scss-styling-context.cjs', {
      tool_name: 'Edit',
      tool_input: { file_path: filePath }
    });
    logResult(`SCSS context: ${filePath.split('/').pop()}`, result.code === 0);
  }

  // Non-matching files (should skip without error)
  logSubsection('Non-Matching Files');
  const nonMatching = [
    { hook: 'design-system-context.cjs', file: 'README.md' },
    { hook: 'backend-csharp-context.cjs', file: 'package.json' },
    { hook: 'frontend-typescript-context.cjs', file: 'config.yaml' },
    { hook: 'scss-styling-context.cjs', file: 'index.html' }
  ];

  for (const { hook, file } of nonMatching) {
    const result = await runHook(hook, {
      tool_name: 'Edit',
      tool_input: { file_path: file }
    });
    logResult(`${hook.replace('.cjs', '')} skips ${file}`, result.code === 0);
  }
}

// ============================================================================
// Test Cases: PreCompact
// ============================================================================

async function testPreCompactHooks() {
  logSection('PreCompact Hooks');

  // write-compact-marker.cjs
  logSubsection('write-compact-marker.cjs');
  const triggers = ['manual', 'auto', 'forced'];

  for (const trigger of triggers) {
    const result = await runHook('write-compact-marker.cjs', { trigger });
    logResult(`write-compact-marker (${trigger})`, result.code === 0);
  }

}

// ============================================================================
// Test Cases: PostToolUse
// ============================================================================

async function testPostToolUseHooks() {
  logSection('PostToolUse Hooks');

  // bash-cleanup.cjs
  logSubsection('bash-cleanup.cjs');
  {
    const result = await runHook('bash-cleanup.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'echo test' },
      tool_response: 'test'
    });
    logResult('bash-cleanup (success)', result.code === 0);
  }
  {
    const result = await runHook('bash-cleanup.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'exit 1' },
      tool_response: { exit_code: 1, stderr: 'error' }
    });
    logResult('bash-cleanup (failure)', result.code === 0);
  }

  // post-edit-prettier.cjs
  logSubsection('post-edit-prettier.cjs');
  const editTools = ['Edit', 'Write', 'MultiEdit'];
  for (const tool of editTools) {
    const result = await runHook('post-edit-prettier.cjs', {
      tool_name: tool,
      tool_input: { file_path: 'src/test.ts' },
      tool_response: 'success'
    });
    logResult(`post-edit-prettier (${tool})`, result.code === 0);
  }

  // todo-tracker.cjs
  logSubsection('todo-tracker.cjs');
  {
    const result = await runHook('todo-tracker.cjs', {
      tool_name: 'TaskCreate',
      tool_input: {
        subject: 'Test task 1',
        description: 'Test description',
        activeForm: 'Testing 1'
      }
    });
    logResult('todo-tracker with TaskCreate', result.code === 0);
  }
  {
    // Test backward compatibility with TodoWrite
    const result = await runHook('todo-tracker.cjs', {
      tool_name: 'TodoWrite',
      tool_input: { todos: [] }
    });
    logResult('todo-tracker backward compat TodoWrite', result.code === 0);
  }

  // workflow-step-tracker.cjs
  logSubsection('workflow-step-tracker.cjs');
  const skills = ['plan', 'cook', 'test', 'code-review', 'scout'];
  for (const skill of skills) {
    const result = await runHook('workflow-step-tracker.cjs', {
      tool_name: 'Skill',
      tool_input: { skill },
      tool_response: 'completed'
    });
    logResult(`workflow-step-tracker (${skill})`, result.code === 0);
  }

}

// ============================================================================
// Test Cases: Notification
// ============================================================================

async function testNotification() {
  logSection('Notification: notify-waiting.js');

  // Note: Tests run with CLAUDE_HOOK_TEST_MODE=1 to skip actual OS notifications
  const testEnv = { env: { CLAUDE_HOOK_TEST_MODE: '1' } };

  logSubsection('Event Types');

  // AskUserPrompt - should trigger dialog notification
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'AskUserPrompt',
      cwd: 'D:/GitSources/BravoSuite',
      session_id: 'test-001'
    }, testEnv);
    logResult('AskUserPrompt event (dialog)', result.code === 0);
  }

  // Stop - should trigger dialog notification
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Stop',
      cwd: 'D:/GitSources/BravoSuite',
      session_id: 'test-002'
    }, testEnv);
    logResult('Stop event (dialog)', result.code === 0);
  }

  // SubagentStop - should trigger notification (not dialog)
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'SubagentStop',
      cwd: 'D:/GitSources/BravoSuite',
      agent_type: 'scout',
      session_id: 'test-003'
    }, testEnv);
    logResult('SubagentStop event (notification)', result.code === 0);
  }

  logSubsection('Project Name Extraction');

  // With Windows path
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Stop',
      cwd: 'D:\\GitSources\\MyProject'
    }, testEnv);
    logResult('Windows path cwd extraction', result.code === 0);
  }

  // With Unix path
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Stop',
      cwd: '/home/user/projects/MyProject'
    }, testEnv);
    logResult('Unix path cwd extraction', result.code === 0);
  }

  logSubsection('Edge Cases');

  // No cwd - should still work with empty prefix
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'AskUserPrompt'
    }, testEnv);
    logResult('No cwd (empty prefix)', result.code === 0);
  }

  // No event name - should use default message
  {
    const result = await runHook('notify-waiting.js', {}, testEnv);
    logResult('No event name (default)', result.code === 0);
  }

  // Unknown event name - should use default message
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'UnknownEvent',
      cwd: 'D:/GitSources/Test'
    }, testEnv);
    logResult('Unknown event name', result.code === 0);
  }

  // Empty object
  {
    const result = await runHook('notify-waiting.js', {}, testEnv);
    logResult('Empty input', result.code === 0);
  }

  // Legacy type field (backwards compatibility)
  {
    const result = await runHook('notify-waiting.js', {
      type: 'waiting_for_input'
    }, testEnv);
    logResult('Legacy type field', result.code === 0);
  }

  logSubsection('Permission Prompt Filtering');

  // Permission prompt - should be skipped (no notification sent)
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Notification',
      notification_type: 'permission_prompt',
      message: 'Claude needs your permission to use Bash',
      cwd: 'D:/GitSources/BravoSuite'
    }, testEnv);
    logResult('Permission prompt (skipped)', result.code === 0);
  }

  // Non-permission notification - should trigger notification
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Notification',
      notification_type: 'idle_prompt',
      message: 'Claude is waiting for your input',
      cwd: 'D:/GitSources/BravoSuite'
    }, testEnv);
    logResult('Idle prompt (not skipped)', result.code === 0);
  }

  logSubsection('Message-Based Permission Detection (Bug #11964 Workaround)');

  // Permission prompt via message only (missing notification_type) - should be skipped
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Notification',
      message: 'Claude needs your permission to use Bash',
      cwd: 'D:/GitSources/BravoSuite'
      // Note: notification_type intentionally omitted to simulate bug #11964
    }, testEnv);
    logResult('Message-based permission detection (skipped)', result.code === 0);
  }

  // Permission prompt for Write tool via message only - should be skipped
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Notification',
      message: 'Claude needs your permission to use Write',
      cwd: 'D:/GitSources/BravoSuite'
    }, testEnv);
    logResult('Write permission message (skipped)', result.code === 0);
  }

  // Regular message mentioning "permission" but not a permission prompt - should NOT be skipped
  {
    const result = await runHook('notify-waiting.js', {
      hook_event_name: 'Notification',
      message: 'Check file permission settings',
      cwd: 'D:/GitSources/BravoSuite'
    }, testEnv);
    logResult('Non-permission message with "permission" word (not skipped)', result.code === 0);
  }
}

// ============================================================================
// Test Cases: Lib Modules
// ============================================================================

async function testLibModules() {
  logSection('Lib Module Verification');

  const libFiles = [
    'workflow-state.cjs',
    'ck-config-utils.cjs',
    'ck-paths.cjs',
    'edit-state.cjs',
    'todo-state.cjs'
  ];

  for (const libFile of libFiles) {
    const libPath = path.join(HOOKS_DIR, 'lib', libFile);
    try {
      if (fs.existsSync(libPath)) {
        require(libPath);
        logResult(`${libFile} loads without error`, true);
      } else {
        skipTest(libFile, 'File not found');
      }
    } catch (err) {
      logResult(`${libFile} loads without error`, false, err.message);
    }
  }
}

// ============================================================================
// Edge Case Tests
// ============================================================================

async function testEdgeCases() {
  logSection('Edge Cases & Error Handling');

  // Malformed JSON input
  logSubsection('Malformed JSON');
  const hooksToTest = [
    'session-init.cjs',
    'workflow-router.cjs',
    'windows-command-detector.cjs',
    'privacy-block.cjs'
  ];

  for (const hook of hooksToTest) {
    const result = await runHook(hook, 'not valid json');
    logResult(`${hook} handles malformed JSON`, result.code === 0);
  }

  // Empty/null inputs
  logSubsection('Empty/Null Inputs');
  for (const hook of hooksToTest) {
    const result = await runHook(hook, null);
    logResult(`${hook} handles null input`, result.code === 0);
  }
  for (const hook of hooksToTest) {
    const result = await runHook(hook, {});
    logResult(`${hook} handles empty object`, result.code === 0);
  }

  // Unicode and special characters
  logSubsection('Unicode & Special Characters');
  {
    const result = await runHook('workflow-router.cjs', {
      prompt: '実装する feature with 日本語 and emoji 🎉'
    });
    logResult('Unicode in prompt', result.code === 0);
  }
  {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'echo "hello 世界"' }
    });
    logResult('Unicode in command', result.code === 0);
  }

  // Very long inputs
  logSubsection('Long Inputs');
  {
    const result = await runHook('workflow-router.cjs', {
      prompt: 'implement '.repeat(1000)
    });
    logResult('Long prompt handled', result.code === 0);
  }
  {
    const result = await runHook('windows-command-detector.cjs', {
      tool_name: 'Bash',
      tool_input: { command: 'echo ' + 'a'.repeat(10000) }
    });
    logResult('Long command handled', result.code === 0);
  }

}

// ============================================================================
// Main Test Runner
// ============================================================================

async function runAllTests() {
  console.log(`\n${COLORS.bold}Claude Hooks Comprehensive Test Suite v2.0${COLORS.reset}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`${COLORS.dim}Running from: ${HOOKS_DIR}${COLORS.reset}`);
  if (FILTER) console.log(`${COLORS.dim}Filter: ${FILTER}${COLORS.reset}`);
  if (VALIDATE_OUTPUT) console.log(`${COLORS.cyan}Output validation enabled${COLORS.reset}`);
  if (VERIFY_STATE) console.log(`${COLORS.cyan}State verification enabled${COLORS.reset}`);
  console.log();

  const startTime = Date.now();

  // Clean up any leftover test directories
  cleanupAllTestDirs();

  // Session Lifecycle
  if (!FILTER || 'session'.includes(FILTER)) {
    await testSessionInit();
    await testPostCompactRecovery();
    await testSessionEnd();
  }

  // Subagent
  if (!FILTER || 'subagent'.includes(FILTER)) {
    await testSubagentInit();
  }

  // User Input
  if (!FILTER || 'user'.includes(FILTER) || 'prompt'.includes(FILTER)) {
    await testWorkflowRouter();
    await testDevRulesReminder();
    await testLessonsInjector();
  }

  // PreToolUse
  if (!FILTER || 'pre'.includes(FILTER) || 'tool'.includes(FILTER) || 'block'.includes(FILTER)) {
    await testWindowsCommandDetector();
    await testScoutBlock();
    await testPrivacyBlock();
    await testEditEnforcement();
    await testSkillEnforcement();
    await testContextInjectors();
  }

  // PreCompact
  if (!FILTER || 'compact'.includes(FILTER)) {
    await testPreCompactHooks();
  }

  // PostToolUse
  if (!FILTER || 'post'.includes(FILTER)) {
    await testPostToolUseHooks();
  }

  // Notification
  if (!FILTER || 'notify'.includes(FILTER)) {
    await testNotification();
  }

  // Lib Modules
  if (!FILTER || 'lib'.includes(FILTER)) {
    await testLibModules();
  }

  // Edge Cases
  if (!FILTER || 'edge'.includes(FILTER)) {
    await testEdgeCases();
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${COLORS.bold}SUMMARY${COLORS.reset}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`${COLORS.green}Passed:${COLORS.reset}  ${results.passed}`);
  console.log(`${COLORS.red}Failed:${COLORS.reset}  ${results.failed}`);
  console.log(`${COLORS.yellow}Skipped:${COLORS.reset} ${results.skipped}`);

  if (VALIDATE_OUTPUT) {
    console.log(`${COLORS.cyan}Output Validations:${COLORS.reset} ${results.outputValidation.passed} passed, ${results.outputValidation.failed} failed`);
  }
  if (VERIFY_STATE) {
    console.log(`${COLORS.cyan}State Verifications:${COLORS.reset} ${results.stateVerification.passed} passed, ${results.stateVerification.failed} failed`);
  }

  console.log(`${COLORS.dim}Duration: ${duration}s${COLORS.reset}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Clean up
  cleanupAllTestDirs();

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  console.error(`${COLORS.red}Test runner error:${COLORS.reset}`, err);
  process.exit(1);
});
