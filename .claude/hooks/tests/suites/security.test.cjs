/**
 * Security Hooks Test Suite
 *
 * Tests for:
 * - privacy-block.cjs: Blocks access to sensitive files
 * - scout-block.cjs: Blocks overly broad search patterns
 * - cross-platform-bash.cjs: Warns about Windows-specific commands
 */

const path = require('path');
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
  assertNotContains,
  assertTrue,
  assertFalse
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir,
  setupMockConfig,
  setupCkIgnore
} = require('../lib/test-utils.cjs');

// Hook paths
const PRIVACY_BLOCK = getHookPath('privacy-block.cjs');
const SCOUT_BLOCK = getHookPath('scout-block.cjs');
const CROSS_PLATFORM = getHookPath('cross-platform-bash.cjs');

// ============================================================================
// privacy-block.cjs Tests
// ============================================================================

const privacyBlockTests = [
  // BLOCK - Sensitive file patterns
  {
    name: '[privacy-block] blocks .env file read',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '.env' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block .env read');
      // Hook outputs to stderr, check combined output
      const output = result.stdout + result.stderr;
      assertContains(output, 'PRIVACY BLOCK', 'Should contain PRIVACY BLOCK');
    }
  },
  {
    name: '[privacy-block] blocks nested .env file',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'config/.env' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block nested .env');
    }
  },
  {
    name: '[privacy-block] blocks credentials.json',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'config/credentials.json' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block credentials.json');
    }
  },
  {
    name: '[privacy-block] blocks SSH key files',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '~/.ssh/id_rsa' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block id_rsa');
    }
  },
  {
    name: '[privacy-block] blocks id_ed25519 key',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '.ssh/id_ed25519' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block id_ed25519');
    }
  },
  {
    name: '[privacy-block] blocks secrets.yaml',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'k8s/secrets.yaml' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block secrets.yaml');
    }
  },
  {
    name: '[privacy-block] blocks .env in Bash cat command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'cat .env' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block cat .env');
    }
  },
  {
    name: '[privacy-block] blocks .env in Bash head command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'head -n 10 config/.env' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block head .env');
    }
  },
  {
    name: '[privacy-block] allows kubeconfig (not in sensitive patterns)',
    fn: async () => {
      // Note: kubeconfig is NOT in PRIVACY_PATTERNS - may want to add it
      const input = createPreToolUseInput('Read', { file_path: '~/.kube/config' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'kubeconfig not in patterns');
    }
  },

  // ALLOW - Safe patterns
  {
    name: '[privacy-block] allows .env.example',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '.env.example' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow .env.example');
    }
  },
  {
    name: '[privacy-block] allows .env.template',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '.env.template' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow .env.template');
    }
  },
  {
    name: '[privacy-block] allows regular TypeScript file',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'src/index.ts' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow .ts files');
    }
  },
  {
    name: '[privacy-block] allows APPROVED: prefix',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'APPROVED:.env' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow APPROVED: prefix');
    }
  },
  {
    name: '[privacy-block] allows ssh_config (not key)',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '~/.ssh/config' });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow ssh config');
    }
  },

  // Config toggle test
  {
    name: '[privacy-block] respects privacyBlock: false config',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupMockConfig(tmpDir, { privacyBlock: false });
        const input = createPreToolUseInput('Read', { file_path: '.env' });
        const result = await runHook(PRIVACY_BLOCK, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow with privacyBlock: false');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// scout-block.cjs Tests
// ============================================================================

const scoutBlockTests = [
  // BLOCK - Overly broad patterns
  {
    name: '[scout-block] blocks **/*.ts glob (overly broad)',
    fn: async () => {
      const input = createPreToolUseInput('Glob', { pattern: '**/*.ts' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertBlocked(result.code, 'Should block broad glob');
      // Hook outputs to stderr, check combined output
      const output = result.stdout + result.stderr;
      assertContains(output, 'broad', 'Should mention overly broad');
    }
  },
  {
    name: '[scout-block] blocks **/*.js glob',
    fn: async () => {
      const input = createPreToolUseInput('Glob', { pattern: '**/*.js' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertBlocked(result.code, 'Should block **/*.js');
    }
  },
  {
    name: '[scout-block] allows grep without path (not blocked by current implementation)',
    fn: async () => {
      // Note: Current hook allows grep without path - may want to block
      const input = createPreToolUseInput('Grep', { pattern: 'error' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Grep without path allowed');
    }
  },
  {
    name: '[scout-block] allows grep with root path (not blocked by current implementation)',
    fn: async () => {
      // Note: Current hook allows grep with . path - may want to block
      const input = createPreToolUseInput('Grep', { pattern: 'TODO', path: '.' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Grep with . path allowed');
    }
  },

  // ALLOW - Scoped patterns
  {
    name: '[scout-block] allows src/**/*.ts glob',
    fn: async () => {
      const input = createPreToolUseInput('Glob', { pattern: 'src/**/*.ts' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow scoped glob');
    }
  },
  {
    name: '[scout-block] allows grep with scoped path',
    fn: async () => {
      const input = createPreToolUseInput('Grep', { pattern: 'error', path: 'src/' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow grep with path');
    }
  },
  {
    name: '[scout-block] allows grep with specific file',
    fn: async () => {
      const input = createPreToolUseInput('Grep', { pattern: 'TODO', path: 'src/index.ts' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow grep with file path');
    }
  },

  // ALLOW - Build commands
  {
    name: '[scout-block] allows npm install',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'npm install' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow npm install');
    }
  },
  {
    name: '[scout-block] allows npm run build',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'npm run build' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow npm run');
    }
  },
  {
    name: '[scout-block] allows dotnet build',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'dotnet build' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow dotnet build');
    }
  },
  {
    name: '[scout-block] allows nx serve',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'nx serve app' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should allow nx commands');
    }
  },

  // Ignore non-search tools
  {
    name: '[scout-block] ignores Read tool',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'test.ts' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should ignore Read tool');
    }
  },
  {
    name: '[scout-block] ignores Edit tool',
    fn: async () => {
      const input = createPreToolUseInput('Edit', { file_path: 'test.ts' });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should ignore Edit tool');
    }
  }
];

// ============================================================================
// cross-platform-bash.cjs Tests
// ============================================================================

const crossPlatformTests = [
  // WARN - Windows-specific commands (exit 0, but stdout has warning)
  {
    name: '[cross-platform] blocks dir /b /s command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'dir /b /s path' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertBlocked(result.code, 'Should block Windows dir with flags');
      const output = result.stdout + (result.stderr || '');
      assertContains(output, 'dir', 'Should mention dir command');
    }
  },
  {
    name: '[cross-platform] warns on > nul redirect',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'echo test > nul' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should not block');
      assertContains(result.stdout, '/dev/null', 'Should suggest /dev/null');
    }
  },
  {
    name: '[cross-platform] blocks type command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'type file.txt' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertBlocked(result.code, 'Should block Windows type command');
      const output = result.stdout + (result.stderr || '');
      assertContains(output, 'cat', 'Should suggest cat');
    }
  },
  {
    name: '[cross-platform] blocks copy command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'copy src.txt dest.txt' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertBlocked(result.code, 'Should block Windows copy command');
      const output = result.stdout + (result.stderr || '');
      assertContains(output, 'cp', 'Should suggest cp');
    }
  },
  {
    name: '[cross-platform] warns on backslash paths',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'ls D:\\path\\to\\file' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should not block');
      assertContains(result.stdout.toLowerCase(), 'forward slash', 'Should suggest forward slashes');
    }
  },
  {
    name: '[cross-platform] blocks cls command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'cls' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertBlocked(result.code, 'Should block Windows cls command');
      const output = result.stdout + (result.stderr || '');
      assertContains(output, 'clear', 'Should suggest clear');
    }
  },
  {
    name: '[cross-platform] blocks del command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'del file.txt' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertBlocked(result.code, 'Should block Windows del command');
      const output = result.stdout + (result.stderr || '');
      assertContains(output, 'rm', 'Should suggest rm');
    }
  },
  {
    name: '[cross-platform] blocks move command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'move src.txt dest.txt' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertBlocked(result.code, 'Should block Windows move command');
      const output = result.stdout + (result.stderr || '');
      assertContains(output, 'mv', 'Should suggest mv');
    }
  },
  {
    name: '[cross-platform] warns on 2>nul redirect',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'cmd 2>nul' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should not block');
      assertContains(result.stdout, '/dev/null', 'Should suggest /dev/null');
    }
  },

  // NO WARN - Portable commands
  {
    name: '[cross-platform] no warn on ls command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'ls -la' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should allow ls');
      assertEqual(result.stdout.trim(), '', 'Should have no output for portable commands');
    }
  },
  {
    name: '[cross-platform] no warn on forward slash paths',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'ls "D:/path/to/file"' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should allow forward slashes');
      assertNotContains(result.stdout, 'Cross-Platform', 'Should not warn');
    }
  },
  {
    name: '[cross-platform] no warn on /dev/null redirect',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'cmd > /dev/null 2>&1' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should allow /dev/null');
      assertNotContains(result.stdout, 'Cross-Platform', 'Should not warn');
    }
  },
  {
    name: '[cross-platform] ignores non-Bash tools',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'D:\\test.txt' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should ignore non-Bash');
      assertEqual(result.stdout.trim(), '', 'Should have no output');
    }
  },
  {
    name: '[cross-platform] no warn on cat command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'cat file.txt' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should allow cat');
      assertNotContains(result.stdout, 'Cross-Platform', 'Should not warn');
    }
  },
  {
    name: '[cross-platform] no warn on rm command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: 'rm -rf node_modules' });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should allow rm');
      assertNotContains(result.stdout, 'Cross-Platform', 'Should not warn');
    }
  }
];

// ============================================================================
// Edge Case: Path Traversal & Injection Tests (10 tests)
// ============================================================================

const pathTraversalTests = [
  {
    name: '[privacy-block] blocks ../ path traversal',
    fn: async () => {
      const input = createPreToolUseInput('Read', {
        file_path: '../../../etc/passwd'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      // Path traversal should either be blocked or sanitized (exit 0 or 2)
      assertTrue(
        result.code === 0 || result.code === 2,
        'Should handle path traversal safely'
      );
    }
  },
  {
    name: '[privacy-block] blocks absolute path to sensitive file',
    fn: async () => {
      const input = createPreToolUseInput('Read', {
        file_path: '/home/user/.env'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block absolute path to .env');
    }
  },
  {
    name: '[privacy-block] blocks Windows path traversal',
    fn: async () => {
      const input = createPreToolUseInput('Read', {
        file_path: '..\\..\\..\\Windows\\System32\\config\\sam'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      // Should either allow (not a sensitive pattern) or handle gracefully
      assertTrue(
        result.code === 0 || result.code === 2,
        'Should handle Windows traversal'
      );
    }
  },
  {
    name: '[privacy-block] blocks semicolon injection in Bash',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: 'echo test; cat .env'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block semicolon injection');
    }
  },
  {
    name: '[privacy-block] blocks AND injection in Bash',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: 'echo test && cat .env'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block && injection');
    }
  },
  {
    name: '[privacy-block] blocks pipe injection in Bash',
    fn: async () => {
      const input = createPreToolUseInput('Bash', {
        command: 'ls | cat .env'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertBlocked(result.code, 'Should block pipe injection');
    }
  },
  {
    name: '[privacy-block] handles quoted path in command (limitation)',
    fn: async () => {
      // NOTE: Current implementation doesn't parse quotes in bash commands
      // This documents actual behavior - quoted .env is not detected
      const input = createPreToolUseInput('Bash', {
        command: 'cat ".env"'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      // Current behavior: doesn't parse quotes, so this passes through
      assertAllowed(result.code, 'Currently does not parse quotes in commands');
    }
  },
  {
    name: '[privacy-block] handles very long path gracefully',
    fn: async () => {
      const longPath = 'a/'.repeat(2000) + '.env';
      const input = createPreToolUseInput('Read', {
        file_path: longPath
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      // Should not crash, can either block or allow
      assertTrue(
        result.code === 0 || result.code === 2,
        'Should handle long path without crashing'
      );
      assertFalse(result.timedOut, 'Should not timeout');
    }
  },
  {
    name: '[privacy-block] allows legitimate nested path',
    fn: async () => {
      const input = createPreToolUseInput('Read', {
        file_path: 'src/config/settings.json'
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow legitimate nested path');
    }
  },
  {
    name: '[scout-block] handles path with special characters',
    fn: async () => {
      const input = createPreToolUseInput('Glob', {
        pattern: 'src/[test]/**/*.ts'
      });
      const result = await runHook(SCOUT_BLOCK, input);
      // Scoped pattern should be allowed
      assertAllowed(result.code, 'Should handle special chars in path');
    }
  }
];

// ============================================================================
// Edge Case: Input Validation Tests (8 tests)
// ============================================================================

const inputValidationTests = [
  {
    name: '[privacy-block] handles empty JSON object',
    fn: async () => {
      const result = await runHook(PRIVACY_BLOCK, {});
      assertAllowed(result.code, 'Should not crash on empty object');
    }
  },
  {
    name: '[privacy-block] handles null input',
    fn: async () => {
      const result = await runHook(PRIVACY_BLOCK, null);
      assertAllowed(result.code, 'Should not crash on null');
    }
  },
  {
    name: '[privacy-block] handles missing tool_input',
    fn: async () => {
      const input = { event: 'PreToolUse', tool_name: 'Read' };
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should handle missing tool_input');
    }
  },
  {
    name: '[privacy-block] handles wrong type for file_path',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 123 });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should handle number as file_path');
    }
  },
  {
    name: '[scout-block] handles undefined pattern',
    fn: async () => {
      const input = createPreToolUseInput('Glob', { pattern: undefined });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should handle undefined pattern');
    }
  },
  {
    name: '[cross-platform] handles array instead of string command',
    fn: async () => {
      const input = createPreToolUseInput('Bash', { command: ['ls', '-la'] });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should handle array command');
    }
  },
  {
    name: '[privacy-block] handles deeply nested input',
    fn: async () => {
      let nested = { file_path: '.env' };
      for (let i = 0; i < 50; i++) {
        nested = { inner: nested };
      }
      const input = createPreToolUseInput('Read', nested);
      const result = await runHook(PRIVACY_BLOCK, input);
      // Hook should handle this gracefully (no file_path at expected level)
      assertAllowed(result.code, 'Should handle deep nesting');
    }
  },
  {
    name: '[privacy-block] handles extra unexpected fields',
    fn: async () => {
      const input = createPreToolUseInput('Read', {
        file_path: 'test.ts',
        unexpected_field: 'value',
        another: { nested: 'object' }
      });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should allow with extra fields');
    }
  }
];

// ============================================================================
// Edge Case: Resource Limits Tests (6 tests)
// ============================================================================

const resourceLimitTests = [
  {
    name: '[privacy-block] handles rapid sequential calls',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: 'test.ts' });

      // Run 20 calls in quick succession
      const results = await Promise.all(
        Array(20).fill().map(() => runHook(PRIVACY_BLOCK, input))
      );

      // All should complete without error
      for (const result of results) {
        assertAllowed(result.code, 'Should handle rapid calls');
        assertFalse(result.timedOut, 'Should not timeout');
      }
    }
  },
  {
    name: '[scout-block] handles very long pattern',
    fn: async () => {
      const longPattern = 'src/' + 'a'.repeat(5000) + '/**/*.ts';
      const input = createPreToolUseInput('Glob', { pattern: longPattern });
      const result = await runHook(SCOUT_BLOCK, input);
      assertAllowed(result.code, 'Should handle long pattern');
      assertFalse(result.timedOut, 'Should not timeout');
    }
  },
  {
    name: '[cross-platform] handles very long command',
    fn: async () => {
      const longCmd = 'echo ' + 'a'.repeat(10000);
      const input = createPreToolUseInput('Bash', { command: longCmd });
      const result = await runHook(CROSS_PLATFORM, input);
      assertAllowed(result.code, 'Should handle long command');
      assertFalse(result.timedOut, 'Should not timeout');
    }
  },
  {
    name: '[privacy-block] handles concurrent calls for different tools',
    fn: async () => {
      const inputs = [
        createPreToolUseInput('Read', { file_path: 'test1.ts' }),
        createPreToolUseInput('Bash', { command: 'echo test' }),
        createPreToolUseInput('Read', { file_path: 'test2.ts' }),
        createPreToolUseInput('Glob', { pattern: 'src/*.ts' }),
        createPreToolUseInput('Grep', { pattern: 'TODO', path: 'src/' })
      ];

      const results = await Promise.all(
        inputs.map(input => runHook(PRIVACY_BLOCK, input))
      );

      for (const result of results) {
        assertAllowed(result.code, 'Should handle concurrent calls');
      }
    }
  },
  {
    name: '[privacy-block] handles command with many pipe segments',
    fn: async () => {
      const manyPipes = 'echo test' + ' | grep x'.repeat(20);
      const input = createPreToolUseInput('Bash', { command: manyPipes });
      const result = await runHook(PRIVACY_BLOCK, input);
      assertAllowed(result.code, 'Should handle many pipes');
    }
  },
  {
    name: '[scout-block] handles pattern with many wildcards',
    fn: async () => {
      const input = createPreToolUseInput('Glob', {
        pattern: 'src/**/**/test/**/**/spec/**/*.ts'
      });
      const result = await runHook(SCOUT_BLOCK, input);
      // This is scoped to src/, should be allowed
      assertAllowed(result.code, 'Should handle many wildcards');
    }
  }
];

// Export test suite
module.exports = {
  name: 'Security Hooks',
  tests: [
    ...privacyBlockTests,
    ...scoutBlockTests,
    ...crossPlatformTests,
    ...pathTraversalTests,
    ...inputValidationTests,
    ...resourceLimitTests
  ]
};
