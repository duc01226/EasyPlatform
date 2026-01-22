/**
 * Code Review Rules Injector Test Suite
 *
 * Tests for:
 * - code-review-rules-injector.cjs: Code review rules injection on Skill tool
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue, assertBlocked } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir, createMockFile } = require('../lib/test-utils.cjs');

// Hook path
const CODE_REVIEW_RULES_INJECTOR = getHookPath('code-review-rules-injector.cjs');

// Mock rules content
const MOCK_RULES = `# Test Rules
- [ ] Rule 1
- [ ] Rule 2
`;

// Mock config content
const createMockConfig = (overrides = {}) => JSON.stringify({
  codeReview: {
    rulesPath: 'docs/code-review-rules.md',
    injectOnSkills: ['code-review', 'review-pr', 'review-changes', 'tasks-code-review'],
    enabled: true,
    ...overrides
  }
}, null, 2);

// ============================================================================
// code-review-rules-injector.cjs Tests
// ============================================================================

const codeReviewRulesTests = [
  {
    name: '[code-review-rules] injects rules on code-review skill',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup mock files
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'code-review' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertContains(result.stdout, '<system-reminder>', 'Should contain system-reminder tag');
        assertContains(result.stdout, 'Rule 1', 'Should contain rules content');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] injects rules on tasks-code-review skill',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'tasks-code-review' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertContains(result.stdout, '<system-reminder>', 'Should contain system-reminder tag');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] injects rules on review-pr skill',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'review-pr' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertContains(result.stdout, '<system-reminder>', 'Should contain system-reminder tag');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] does NOT inject on commit skill',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'commit' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertTrue(
          !result.stdout.includes('<system-reminder>'),
          'Should NOT contain system-reminder tag for non-review skill'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] does NOT inject on cook skill',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'cook' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertTrue(
          !result.stdout.includes('<system-reminder>'),
          'Should NOT contain system-reminder tag for cook skill'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] disabled config prevents injection',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig({ enabled: false }));
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'code-review' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertTrue(
          !result.stdout.includes('<system-reminder>'),
          'Should NOT inject when disabled'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] missing rules file shows warning',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        // Note: NOT creating docs/code-review-rules.md

        const input = createPreToolUseInput('Skill', { skill: 'code-review' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0 (non-blocking)');
        assertContains(result.stderr, 'Warning', 'Should show warning in stderr');
        assertTrue(
          !result.stdout.includes('<system-reminder>'),
          'Should NOT inject when file missing'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] uses <system-reminder> format',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'code-review' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertContains(result.stdout, '<system-reminder>', 'Should have opening tag');
        assertContains(result.stdout, '</system-reminder>', 'Should have closing tag');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[code-review-rules] handles empty stdin gracefully',
    fn: async () => {
      const result = await runHook(CODE_REVIEW_RULES_INJECTOR, '');

      assertAllowed(result.code, 'Should exit with 0 for empty stdin');
    }
  },
  {
    name: '[code-review-rules] handles invalid JSON gracefully',
    fn: async () => {
      // Pass raw string instead of object to simulate invalid JSON
      const { spawn } = require('child_process');
      const proc = spawn('node', [CODE_REVIEW_RULES_INJECTOR], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      proc.stdin.write('not valid json');
      proc.stdin.end();

      const code = await new Promise(resolve => {
        proc.on('close', resolve);
      });

      assertEqual(code, 0, 'Should exit with 0 for invalid JSON');
    }
  },
  {
    name: '[code-review-rules] supports skill prefix matching (code-review/fast)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
        fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true });
        fs.writeFileSync(path.join(tmpDir, '.claude', '.ck.json'), createMockConfig());
        fs.writeFileSync(path.join(tmpDir, 'docs', 'code-review-rules.md'), MOCK_RULES);

        const input = createPreToolUseInput('Skill', { skill: 'code-review/fast' });
        const result = await runHook(CODE_REVIEW_RULES_INJECTOR, input, {
          cwd: tmpDir,
          env: { CLAUDE_PROJECT_DIR: tmpDir }
        });

        assertAllowed(result.code, 'Should exit with 0');
        assertContains(result.stdout, '<system-reminder>', 'Should inject for prefix match');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// Export tests
module.exports = {
  name: 'code-review-rules',
  tests: codeReviewRulesTests
};
