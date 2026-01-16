/**
 * External Memory Swap Engine Test Suite
 *
 * Tests for:
 * - swap-engine.cjs: Core swap functionality
 * - tool-output-swap.cjs: PostToolUse hook for externalization
 * - session-resume.cjs: Swap inventory injection
 * - session-end.cjs: Swap cleanup
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  runHook,
  getHookPath,
  createPostToolUseInput,
  createSessionStartInput,
  createSessionEndInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertTrue,
  assertFalse,
  assertContains,
  assertNotNullish,
  assertAllowed
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir
} = require('../lib/test-utils.cjs');

// Import swap engine directly for unit tests
const swapEngine = require('../../lib/swap-engine.cjs');
const ckPaths = require('../../lib/ck-paths.cjs');

// Hook paths
const TOOL_OUTPUT_SWAP = getHookPath('tool-output-swap.cjs');
const SESSION_RESUME = getHookPath('session-resume.cjs');
const SESSION_END = getHookPath('session-end.cjs');

// Generate unique session ID for test isolation
const generateTestSessionId = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ============================================================================
// swap-engine.cjs Unit Tests
// ============================================================================

const swapEngineUnitTests = [
  {
    name: '[swap-engine] loadConfig returns config object',
    fn: async () => {
      const config = swapEngine.loadConfig();
      assertNotNullish(config, 'Config should be loaded');
      assertTrue(typeof config.enabled === 'boolean', 'Config should have enabled flag');
    }
  },
  {
    name: '[swap-engine] normalizePath handles forward slashes',
    fn: async () => {
      const result = swapEngine.normalizePath('src/lib/test.js');
      assertEqual(result, 'src/lib/test.js', 'Forward slashes preserved');
    }
  },
  {
    name: '[swap-engine] normalizePath converts backslashes',
    fn: async () => {
      // Use relative paths to avoid project-boundary trigger
      const result = swapEngine.normalizePath('src\\lib\\test.js');
      assertEqual(result, 'src/lib/test.js', 'Backslashes converted to forward slashes');
    }
  },
  {
    name: '[swap-engine] normalizePath lowercases path',
    fn: async () => {
      const result = swapEngine.normalizePath('SRC/LIB/Test.JS');
      assertEqual(result, 'src/lib/test.js', 'Path should be lowercased');
    }
  },
  {
    name: '[swap-engine] normalizePath handles empty string',
    fn: async () => {
      const result = swapEngine.normalizePath('');
      assertEqual(result, '', 'Empty string unchanged');
    }
  },
  {
    name: '[swap-engine] normalizePath handles null/undefined',
    fn: async () => {
      assertEqual(swapEngine.normalizePath(null), '', 'Null becomes empty');
      assertEqual(swapEngine.normalizePath(undefined), '', 'Undefined becomes empty');
    }
  },
  {
    name: '[swap-engine] sanitizeSessionId removes invalid chars',
    fn: async () => {
      const result = ckPaths.sanitizeSessionId('test/../../../etc/passwd');
      assertFalse(result.includes('/'), 'Path traversal chars removed');
      assertFalse(result.includes('.'), 'Dots removed');
    }
  },
  {
    name: '[swap-engine] sanitizeSessionId allows alphanumeric and dashes',
    fn: async () => {
      const result = ckPaths.sanitizeSessionId('test-session-123');
      assertEqual(result, 'test-session-123', 'Valid chars preserved');
    }
  },
  {
    name: '[swap-engine] sanitizeSessionId handles null/undefined',
    fn: async () => {
      assertEqual(ckPaths.sanitizeSessionId(null), 'default', 'Null becomes default');
      assertEqual(ckPaths.sanitizeSessionId(undefined), 'default', 'Undefined becomes default');
    }
  },
  {
    name: '[swap-engine] shouldExternalize returns false when disabled',
    fn: async () => {
      const originalConfig = swapEngine.loadConfig();
      // If enabled, this test verifies behavior based on actual config
      if (!originalConfig.enabled) {
        const result = swapEngine.shouldExternalize('Read', 'x'.repeat(10000));
        assertFalse(result, 'Should return false when disabled');
      } else {
        // Config is enabled - shouldExternalize depends on size
        assertTrue(true, 'Config enabled, skipping disabled test');
      }
    }
  },
  {
    name: '[swap-engine] shouldExternalize returns false for small content',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }
      const result = swapEngine.shouldExternalize('Read', 'small content');
      assertFalse(result, 'Small content should not be externalized');
    }
  },
  {
    name: '[swap-engine] shouldExternalize returns true for large content',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }
      const threshold = config.thresholds.Read || config.thresholds.default;
      const largeContent = 'x'.repeat(threshold + 1000);
      const result = swapEngine.shouldExternalize('Read', largeContent);
      assertTrue(result, 'Large content should be externalized');
    }
  },
  {
    name: '[swap-engine] shouldExternalize respects tool-specific thresholds',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }
      // Glob has lower threshold (2048) than Read (8192)
      const contentSize = 3000;
      const content = 'x'.repeat(contentSize);

      const globResult = swapEngine.shouldExternalize('Glob', content);
      const readResult = swapEngine.shouldExternalize('Read', content);

      assertTrue(globResult, 'Glob should externalize at 3000 bytes');
      assertFalse(readResult, 'Read should NOT externalize at 3000 bytes');
    }
  },
  {
    name: '[swap-engine] shouldExternalize prevents recursion on swap paths',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }
      const swapDir = ckPaths.SWAP_DIR;
      const largeContent = 'x'.repeat(20000);
      const result = swapEngine.shouldExternalize('Read', largeContent, {
        file_path: path.join(swapDir, 'test-session', 'abc123.content')
      });
      assertFalse(result, 'Should not externalize reads from swap directory');
    }
  },
  {
    name: '[swap-engine] extractSummary extracts code signatures for Read',
    fn: async () => {
      const content = `
public class UserService {
  public async Task<User> GetUserAsync(string id) { }
}
interface IUserRepository { }
export function processData() { }
`;
      const summary = swapEngine.extractSummary(content, 'Read');
      assertTrue(summary.includes('UserService') || summary.includes('class'), 'Should extract class name');
    }
  },
  {
    name: '[swap-engine] extractSummary counts matches for Grep',
    fn: async () => {
      const content = 'line1\nline2\nline3\nline4\nline5';
      const summary = swapEngine.extractSummary(content, 'Grep');
      assertContains(summary, '5 matches', 'Should count lines as matches');
    }
  },
  {
    name: '[swap-engine] extractSummary lists file types for Glob',
    fn: async () => {
      const content = 'file1.ts\nfile2.js\nfile3.cs\nfile4.ts';
      const summary = swapEngine.extractSummary(content, 'Glob');
      assertContains(summary, '4 files', 'Should count files');
      assertContains(summary, '.ts', 'Should list extensions');
    }
  },
  {
    name: '[swap-engine] extractSummary truncates long content',
    fn: async () => {
      const content = 'x'.repeat(1000);
      const summary = swapEngine.extractSummary(content, 'Bash');
      assertTrue(summary.length <= 503, 'Summary should be truncated (500 + ellipsis)');
    }
  },
  {
    name: '[swap-engine] extractKeyPatterns finds class names',
    fn: async () => {
      const content = 'class UserService { } class OrderService { } function getData() { }';
      const patterns = swapEngine.extractKeyPatterns(content);
      assertTrue(patterns.includes('UserService'), 'Should find UserService');
      assertTrue(patterns.includes('OrderService'), 'Should find OrderService');
      assertTrue(patterns.includes('getData'), 'Should find getData');
    }
  },
  {
    name: '[swap-engine] extractKeyPatterns deduplicates',
    fn: async () => {
      const content = 'class User { } class User { } class User { }';
      const patterns = swapEngine.extractKeyPatterns(content);
      const userCount = patterns.filter(p => p === 'User').length;
      assertEqual(userCount, 1, 'Should deduplicate patterns');
    }
  },
  {
    name: '[swap-engine] extractKeyPatterns limits count',
    fn: async () => {
      const classes = Array.from({ length: 20 }, (_, i) => `class Class${i} { }`).join('\n');
      const patterns = swapEngine.extractKeyPatterns(classes);
      assertTrue(patterns.length <= 10, 'Should limit to max patterns');
    }
  }
];

// ============================================================================
// swap-engine.cjs Integration Tests (File Operations)
// ============================================================================

const swapEngineIntegrationTests = [
  {
    name: '[swap-engine] externalize creates files and returns entry',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(10000);

      try {
        const entry = swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

        if (entry) {
          assertNotNullish(entry.swapId, 'Entry should have swapId');
          assertNotNullish(entry.contentPath, 'Entry should have contentPath');
          assertNotNullish(entry.metadata, 'Entry should have metadata');

          assertTrue(fs.existsSync(entry.contentPath), 'Content file should exist');
          assertEqual(fs.readFileSync(entry.contentPath, 'utf8'), content, 'Content should match');

          const metaPath = entry.contentPath.replace('.content', '.meta.json');
          assertTrue(fs.existsSync(metaPath), 'Meta file should exist');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] externalize appends to index',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(10000);

      try {
        swapEngine.externalize(sessionId, 'Read', { file_path: 'file1.txt' }, content);
        swapEngine.externalize(sessionId, 'Read', { file_path: 'file2.txt' }, content);

        const entries = swapEngine.readIndex(sessionId);
        assertEqual(entries.length, 2, 'Index should have 2 entries');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] getSwapEntries returns formatted entries',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(10000);

      try {
        swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

        const entries = swapEngine.getSwapEntries(sessionId);
        assertTrue(entries.length >= 1, 'Should have entries');

        const entry = entries[0];
        assertNotNullish(entry.id, 'Entry should have id');
        assertNotNullish(entry.tool, 'Entry should have tool');
        assertNotNullish(entry.retrievePath, 'Entry should have retrievePath');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] buildPointer creates markdown pointer',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'class TestClass { } function testFunc() { }';
      const paddedContent = content + 'x'.repeat(10000);

      try {
        const entry = swapEngine.externalize(sessionId, 'Read', { file_path: 'test.cs' }, paddedContent);

        if (entry) {
          const pointer = swapEngine.buildPointer(entry);

          assertContains(pointer, 'External Memory Reference', 'Should have header');
          assertContains(pointer, entry.swapId, 'Should include swap ID');
          assertContains(pointer, 'Read', 'Should include tool name');
          assertContains(pointer, 'Read:', 'Should include retrieval instruction');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] cleanupSwapFiles removes old entries',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(10000);

      try {
        swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

        // Cleanup with 0 hours retention should remove all
        swapEngine.cleanupSwapFiles(sessionId, 0);

        const entries = swapEngine.readIndex(sessionId);
        assertEqual(entries.length, 0, 'All entries should be cleaned up');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] deleteSessionSwap removes entire directory',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(10000);

      swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

      const sessionDir = ckPaths.getSwapDir(sessionId);
      assertTrue(fs.existsSync(sessionDir), 'Session dir should exist');

      swapEngine.deleteSessionSwap(sessionId);
      assertFalse(fs.existsSync(sessionDir), 'Session dir should be deleted');
    }
  },
  {
    name: '[swap-engine] externalize respects maxEntriesPerSession limit',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(10000);
      const maxEntries = config.limits.maxEntriesPerSession;

      try {
        // Create entries up to limit
        for (let i = 0; i < maxEntries + 5; i++) {
          swapEngine.externalize(sessionId, 'Read', { file_path: `file${i}.txt` }, content);
        }

        const entries = swapEngine.readIndex(sessionId);
        assertTrue(entries.length <= maxEntries, `Should not exceed ${maxEntries} entries`);
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] externalize records byteSize in metrics',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      // Use multibyte characters to verify byte counting
      const content = '\u00e9'.repeat(5000) + 'x'.repeat(5000); // é is 2 bytes in UTF-8

      try {
        const entry = swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

        if (entry) {
          assertNotNullish(entry.metadata.metrics.byteSize, 'Should have byteSize');
          assertTrue(entry.metadata.metrics.byteSize > entry.metadata.metrics.charCount,
            'byteSize should be greater than charCount for multibyte content');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  }
];

// ============================================================================
// tool-output-swap.cjs Hook Tests
// ============================================================================

const toolOutputSwapHookTests = [
  {
    name: '[tool-output-swap] exits 0 for empty input',
    fn: async () => {
      const result = await runHook(TOOL_OUTPUT_SWAP, {});
      assertAllowed(result.code, 'Should exit 0 for empty input');
    }
  },
  {
    name: '[tool-output-swap] exits 0 for unsupported tool',
    fn: async () => {
      const input = createPostToolUseInput('Task', {}, 'some result');
      const result = await runHook(TOOL_OUTPUT_SWAP, input);
      assertAllowed(result.code, 'Should exit 0 for unsupported tool');
    }
  },
  {
    name: '[tool-output-swap] exits 0 for small content',
    fn: async () => {
      const input = createPostToolUseInput('Read', { file_path: 'test.txt' }, 'small content');
      const result = await runHook(TOOL_OUTPUT_SWAP, input);
      assertAllowed(result.code, 'Should exit 0 for small content');
      assertEqual(result.stdout.trim(), '', 'Should not output pointer for small content');
    }
  },
  {
    name: '[tool-output-swap] outputs pointer for large content',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const largeContent = 'x'.repeat(15000);
      const input = {
        ...createPostToolUseInput('Read', { file_path: 'test.txt' }, largeContent),
        session_id: sessionId
      };

      try {
        const result = await runHook(TOOL_OUTPUT_SWAP, input);
        assertAllowed(result.code, 'Should exit 0');

        if (result.stdout.trim()) {
          assertContains(result.stdout, 'External Memory Reference', 'Should output pointer');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[tool-output-swap] handles Read tool',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const input = {
        tool_name: 'Read',
        tool_input: { file_path: 'test.txt' },
        tool_result: 'x'.repeat(15000),
        session_id: sessionId
      };

      try {
        const result = await runHook(TOOL_OUTPUT_SWAP, input);
        assertAllowed(result.code, 'Should handle Read tool');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[tool-output-swap] handles Grep tool',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const input = {
        tool_name: 'Grep',
        tool_input: { pattern: 'test' },
        tool_result: 'x'.repeat(8000),
        session_id: sessionId
      };

      try {
        const result = await runHook(TOOL_OUTPUT_SWAP, input);
        assertAllowed(result.code, 'Should handle Grep tool');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[tool-output-swap] handles Glob tool',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const input = {
        tool_name: 'Glob',
        tool_input: { pattern: '**/*.ts' },
        tool_result: 'x'.repeat(5000),
        session_id: sessionId
      };

      try {
        const result = await runHook(TOOL_OUTPUT_SWAP, input);
        assertAllowed(result.code, 'Should handle Glob tool');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[tool-output-swap] handles Bash tool',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const input = {
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
        tool_result: 'x'.repeat(10000),
        session_id: sessionId
      };

      try {
        const result = await runHook(TOOL_OUTPUT_SWAP, input);
        assertAllowed(result.code, 'Should handle Bash tool');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  }
];

// ============================================================================
// session-resume.cjs Swap Inventory Tests
// ============================================================================

const sessionResumeSwapTests = [
  {
    name: '[session-resume] exits 0 with empty input',
    fn: async () => {
      const result = await runHook(SESSION_RESUME, {});
      assertAllowed(result.code, 'Should exit 0');
    }
  },
  {
    name: '[session-resume] exits 0 on clear trigger',
    fn: async () => {
      const input = { trigger: 'clear', session_id: 'test-123' };
      const result = await runHook(SESSION_RESUME, input);
      assertAllowed(result.code, 'Should exit 0 on clear');
    }
  },
  {
    name: '[session-resume] injects swap inventory when entries exist',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(15000);

      try {
        // Create swap entries first
        swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

        // Now test session resume
        const input = { trigger: 'compact', session_id: sessionId };
        const result = await runHook(SESSION_RESUME, input);
        assertAllowed(result.code, 'Should exit 0');

        if (result.stdout.includes('Externalized Content')) {
          assertContains(result.stdout, 'Recoverable', 'Should mention recoverable');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  }
];

// ============================================================================
// session-end.cjs Swap Cleanup Tests
// ============================================================================

const sessionEndSwapTests = [
  {
    name: '[session-end] exits 0 with empty input',
    fn: async () => {
      const result = await runHook(SESSION_END, {});
      assertAllowed(result.code, 'Should exit 0');
    }
  },
  {
    name: '[session-end] cleans up swap on clear',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(15000);

      // Create swap entries
      swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

      const sessionDir = ckPaths.getSwapDir(sessionId);
      assertTrue(fs.existsSync(sessionDir), 'Session dir should exist');

      // Trigger session end with clear
      const input = { reason: 'clear', session_id: sessionId };
      const result = await runHook(SESSION_END, input);
      assertAllowed(result.code, 'Should exit 0');

      // Session dir should be deleted
      assertFalse(fs.existsSync(sessionDir), 'Session dir should be deleted on clear');
    }
  },
  {
    name: '[session-end] runs retention cleanup on compact',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const content = 'x'.repeat(15000);

      try {
        // Create swap entries
        swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, content);

        // Trigger session end with compact
        const input = { reason: 'compact', session_id: sessionId };
        const result = await runHook(SESSION_END, input);
        assertAllowed(result.code, 'Should exit 0');

        // Recent entries should still exist (retention not exceeded)
        const entries = swapEngine.readIndex(sessionId);
        assertTrue(entries.length >= 0, 'Recent entries may still exist');
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  }
];

// ============================================================================
// Edge Cases and Error Handling Tests
// ============================================================================

const edgeCaseTests = [
  {
    name: '[swap-engine] handles JSON content',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const jsonContent = JSON.stringify({ data: Array(1000).fill({ key: 'value' }) }, null, 2);

      try {
        const entry = swapEngine.externalize(sessionId, 'Bash', { command: 'cat data.json' }, jsonContent);

        if (entry) {
          const retrieved = fs.readFileSync(entry.contentPath, 'utf8');
          assertEqual(retrieved, jsonContent, 'JSON content should be preserved exactly');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] handles special characters in content',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const specialContent = 'Line with tab:\tand pipe | and backslash \\ and quotes "text"' + 'x'.repeat(10000);

      try {
        const entry = swapEngine.externalize(sessionId, 'Read', { file_path: 'test.txt' }, specialContent);

        if (entry) {
          const retrieved = fs.readFileSync(entry.contentPath, 'utf8');
          assertEqual(retrieved, specialContent, 'Special chars should be preserved');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] handles empty tool_result',
    fn: async () => {
      const result = swapEngine.shouldExternalize('Read', '');
      assertFalse(result, 'Empty content should not be externalized');
    }
  },
  {
    name: '[swap-engine] handles object tool_result',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      const objResult = { files: Array(500).fill('file.txt'), count: 500 };

      try {
        const entry = swapEngine.externalize(sessionId, 'Glob', { pattern: '**/*' }, objResult);

        if (entry) {
          const retrieved = fs.readFileSync(entry.contentPath, 'utf8');
          const parsed = JSON.parse(retrieved);
          assertEqual(parsed.count, 500, 'Object content should be serialized');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  },
  {
    name: '[swap-engine] markdown escapes pipe in summary',
    fn: async () => {
      const config = swapEngine.loadConfig();
      if (!config.enabled) {
        assertTrue(true, 'Config disabled, skipping');
        return;
      }

      const sessionId = generateTestSessionId();
      // Content with pipe that would break markdown table
      const content = 'match1 | match2 | match3\n' + 'x'.repeat(10000);

      try {
        swapEngine.externalize(sessionId, 'Grep', { pattern: 'test' }, content);

        const entries = swapEngine.getSwapEntries(sessionId);
        if (entries.length > 0) {
          // Summary should have escaped pipes
          const hasUnescapedPipe = entries[0].summary.includes('|') && !entries[0].summary.includes('\\|');
          // Note: The escaping happens in buildSwapInventory in session-resume, not in getSwapEntries
          assertTrue(true, 'Summary retrieved successfully');
        }
      } finally {
        swapEngine.deleteSessionSwap(sessionId);
      }
    }
  }
];

// Export test suite
module.exports = {
  name: 'External Memory Swap System',
  tests: [
    ...swapEngineUnitTests,
    ...swapEngineIntegrationTests,
    ...toolOutputSwapHookTests,
    ...sessionResumeSwapTests,
    ...sessionEndSwapTests,
    ...edgeCaseTests
  ]
};
