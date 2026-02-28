/**
 * Test utilities for Claude hooks test suite
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// ============================================================================
// Assertions
// ============================================================================

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDeepEqual(actual, expected, msg = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${msg || 'Deep assertion failed'}: expected ${expectedStr}, got ${actualStr}`);
  }
}

function assertTrue(condition, msg = 'Expected true') {
  if (!condition) throw new Error(msg);
}

function assertFalse(condition, msg = 'Expected false') {
  if (condition) throw new Error(msg);
}

function assertContains(str, substring, msg = '') {
  if (!str || !str.includes(substring)) {
    throw new Error(`${msg || 'String does not contain expected substring'}: "${substring}" not in "${str}"`);
  }
}

function assertNotContains(str, substring, msg = '') {
  if (str && str.includes(substring)) {
    throw new Error(`${msg || 'String contains unexpected substring'}: "${substring}" found in "${str}"`);
  }
}

function assertJsonValid(str, msg = 'Invalid JSON') {
  try {
    JSON.parse(str);
  } catch (e) {
    throw new Error(`${msg}: ${e.message}`);
  }
}

function assertJsonHasKey(str, key, msg = '') {
  const obj = JSON.parse(str);
  if (!(key in obj)) {
    throw new Error(`${msg || 'JSON missing key'}: ${key}`);
  }
}

function assertExitCode(result, expected, msg = '') {
  if (result.code !== expected) {
    throw new Error(`${msg || 'Exit code mismatch'}: expected ${expected}, got ${result.code}. stderr: ${result.stderr}`);
  }
}

function assertMatches(str, regex, msg = '') {
  if (!regex.test(str)) {
    throw new Error(`${msg || 'Regex match failed'}: "${str}" does not match ${regex}`);
  }
}

function assertGreaterThan(actual, expected, msg = '') {
  if (actual <= expected) {
    throw new Error(`${msg || 'Greater than assertion failed'}: ${actual} <= ${expected}`);
  }
}

function assertLessThan(actual, expected, msg = '') {
  if (actual >= expected) {
    throw new Error(`${msg || 'Less than assertion failed'}: ${actual} >= ${expected}`);
  }
}

// ============================================================================
// Temp Directory Management
// ============================================================================

const TEST_TEMP_PREFIX = 'claude-hooks-test-';

function createTempDir() {
  const dir = path.join(os.tmpdir(), `${TEST_TEMP_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupTempDir(dir) {
  if (dir && dir.includes(TEST_TEMP_PREFIX) && fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function cleanupAllTestDirs() {
  const tmpDir = os.tmpdir();
  try {
    const entries = fs.readdirSync(tmpDir);
    for (const entry of entries) {
      if (entry.startsWith(TEST_TEMP_PREFIX)) {
        const fullPath = path.join(tmpDir, entry);
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  } catch (e) { /* ignore */ }
}

// ============================================================================
// Mock File System
// ============================================================================

function writeTestFile(dir, relativePath, content) {
  const fullPath = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

function readTestFile(dir, relativePath) {
  return fs.readFileSync(path.join(dir, relativePath), 'utf-8');
}

function fileExists(dir, relativePath) {
  return fs.existsSync(path.join(dir, relativePath));
}

// ============================================================================
// Hook Runner (Enhanced)
// ============================================================================

async function runHook(hookFile, input, options = {}) {
  return new Promise((resolve, reject) => {
    const hooksDir = path.resolve(__dirname, '..', '..');
    const hookPath = path.join(hooksDir, hookFile);

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

// ============================================================================
// Output Validation Helpers
// ============================================================================

function parseBlockingDecision(stdout) {
  try {
    const json = JSON.parse(stdout.trim());
    return {
      isBlocked: json.decision === 'block',
      isApproved: json.decision === 'approve',
      reason: json.reason || null
    };
  } catch (e) {
    return { isBlocked: false, isApproved: false, reason: null, parseError: e.message };
  }
}

function parseSubagentOutput(stdout) {
  try {
    const json = JSON.parse(stdout.trim());
    return {
      valid: !!json.hookSpecificOutput,
      hookEventName: json.hookSpecificOutput?.hookEventName,
      additionalContext: json.hookSpecificOutput?.additionalContext
    };
  } catch (e) {
    return { valid: false, parseError: e.message };
  }
}

function containsSystemReminder(stdout) {
  return stdout.includes('<system-reminder>') && stdout.includes('</system-reminder>');
}

function containsMarkdownSection(stdout, sectionTitle) {
  return stdout.includes(`## ${sectionTitle}`) || stdout.includes(`# ${sectionTitle}`);
}

function extractJsonFromOutput(stdout) {
  // Try to extract JSON from output that might have other text
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

// ============================================================================
// State Verification Helpers
// ============================================================================

function verifyFileCreated(filePath) {
  return fs.existsSync(filePath);
}

function verifyFileContent(filePath, contentCheck) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return contentCheck(content);
}

function verifyJsonFile(filePath, validator) {
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return validator(content);
  } catch (e) {
    return false;
  }
}

function verifyJsonlFile(filePath, validator) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const entries = lines.map(line => JSON.parse(line));
    return validator(entries);
  } catch (e) {
    return false;
  }
}

// ============================================================================
// Fixture Management
// ============================================================================

function loadFixture(name) {
  const fixturePath = path.join(__dirname, '..', 'fixtures', name);
  if (!fs.existsSync(fixturePath)) return null;
  const content = fs.readFileSync(fixturePath, 'utf-8');
  if (name.endsWith('.json')) return JSON.parse(content);
  return content;
}

function setupFixtures(tempDir, fixtures) {
  for (const [relativePath, content] of Object.entries(fixtures)) {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const data = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    fs.writeFileSync(fullPath, data);
  }
}

// ============================================================================
// Payload Builders
// ============================================================================

function buildBashPayload(command, exitCode = 0) {
  return {
    tool_input: { command },
    tool_result: { exit_code: exitCode, stdout: '', stderr: '' }
  };
}

function buildEditPayload(filePath, oldString = '', newString = '') {
  return {
    tool_input: { file_path: filePath, old_string: oldString, new_string: newString }
  };
}

function buildReadPayload(filePath) {
  return {
    tool_input: { file_path: filePath },
    tool_result: { content: '' }
  };
}

function buildWritePayload(filePath, content) {
  return {
    tool_input: { file_path: filePath, content }
  };
}

function buildTodoPayload(todos = []) {
  return {
    tool_input: { todos }
  };
}

function buildUserPromptPayload(prompt, sessionId = 'test-session') {
  return {
    session_id: sessionId,
    user_prompt: prompt,
    hook_event_name: 'UserPromptSubmit'
  };
}

function buildSessionPayload(sessionId = 'test-session', cwd = process.cwd()) {
  return {
    session_id: sessionId,
    cwd,
    hook_event_name: 'SessionStart'
  };
}

// ============================================================================
// Test Group Runner
// ============================================================================

class TestGroup {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.beforeEachFn = null;
    this.afterEachFn = null;
  }

  beforeEach(fn) {
    this.beforeEachFn = fn;
  }

  afterEach(fn) {
    this.afterEachFn = fn;
  }

  test(name, fn) {
    this.tests.push({ name, fn, async: fn.constructor.name === 'AsyncFunction' });
  }

  async run(verbose = false) {
    console.log(`\n▶ ${this.name}`);

    for (const { name, fn, async: isAsync } of this.tests) {
      try {
        if (this.beforeEachFn) await this.beforeEachFn();
        if (isAsync) await fn();
        else fn();
        if (this.afterEachFn) await this.afterEachFn();
        this.passed++;
        console.log(`  ✓ ${name}`);
      } catch (err) {
        this.failed++;
        console.log(`  ✗ ${name}`);
        if (verbose) console.log(`    Error: ${err.message}`);
      }
    }

    return { passed: this.passed, failed: this.failed };
  }
}

// ============================================================================
// Test Suite Runner
// ============================================================================

class TestSuite {
  constructor(name) {
    this.name = name;
    this.groups = [];
  }

  addGroup(group) {
    this.groups.push(group);
    return this;
  }

  async run(verbose = false) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`  ${this.name}`);
    console.log(`${'='.repeat(60)}`);

    let totalPassed = 0;
    let totalFailed = 0;

    for (const group of this.groups) {
      const { passed, failed } = await group.run(verbose);
      totalPassed += passed;
      totalFailed += failed;
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Results: ${totalPassed} passed, ${totalFailed} failed`);
    console.log(`${'─'.repeat(60)}\n`);

    return { passed: totalPassed, failed: totalFailed };
  }
}

// ============================================================================
// Exports
// ============================================================================

module.exports = {
  // Assertions
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
  assertGreaterThan,
  assertLessThan,

  // Temp directory
  createTempDir,
  cleanupTempDir,
  cleanupAllTestDirs,

  // File operations
  writeTestFile,
  readTestFile,
  fileExists,

  // Hook runner
  runHook,

  // Output validation
  parseBlockingDecision,
  parseSubagentOutput,
  containsSystemReminder,
  containsMarkdownSection,
  extractJsonFromOutput,

  // State verification
  verifyFileCreated,
  verifyFileContent,
  verifyJsonFile,
  verifyJsonlFile,

  // Fixtures
  loadFixture,
  setupFixtures,

  // Payload builders
  buildBashPayload,
  buildEditPayload,
  buildReadPayload,
  buildWritePayload,
  buildTodoPayload,
  buildUserPromptPayload,
  buildSessionPayload,

  // Test runner
  TestGroup,
  TestSuite
};
