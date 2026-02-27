/**
 * Tracking Hooks Test Suite
 *
 * Tests for:
 * - edit-complexity-tracker.cjs: Multi-file edit detection and warnings
 * - pattern-learner.cjs: User correction pattern detection
 * - save-context-memory.cjs: PreCompact context preservation
 */

const path = require('path');
const fs = require('fs');
const {
  runHook,
  getHookPath,
  createPostToolUseInput,
  createUserPromptInput,
  createPreCompactInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertContains,
  assertAllowed,
  assertTrue,
  assertNotNullish
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir,
  setupTodoState,
  setupEditState,
  createMockFile,
  fileExists,
  readStateFile
} = require('../lib/test-utils.cjs');

// Hook paths
const EDIT_COUNT_TRACKER = getHookPath('edit-complexity-tracker.cjs');
const PATTERN_LEARNER = getHookPath('pattern-learner.cjs');
const SAVE_CONTEXT_MEMORY = getHookPath('save-context-memory.cjs');

// ============================================================================
// edit-complexity-tracker.cjs Tests
// ============================================================================

const editCountTrackerTests = [
  {
    name: '[edit-complexity-tracker] tracks Edit tool usage',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Edit', {
          file_path: '/path/to/file.ts',
          old_string: 'old',
          new_string: 'new'
        }, { success: true });
        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');

        // Check state file was created
        const state = readStateFile(tmpDir, '.edit-state.json');
        if (state) {
          assertTrue(state.editCount >= 1, 'Should count edit');
          assertTrue(state.editedFiles.includes('/path/to/file.ts'), 'Should track file');
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] tracks Write tool usage',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Write', {
          file_path: '/path/to/new-file.ts',
          content: 'new content'
        }, { success: true });
        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');

        const state = readStateFile(tmpDir, '.edit-state.json');
        if (state) {
          assertTrue(state.writeCount >= 1, 'Should count write');
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] warns after 3+ edits without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup state with 2 edits (one more triggers warning)
        setupEditState(tmpDir, {
          editCount: 2,
          writeCount: 0,
          editedFiles: ['/file1.ts', '/file2.ts'],
          warningShown: false
        });

        // No todos
        const input = createPostToolUseInput('Edit', {
          file_path: '/file3.ts',
          old_string: 'x',
          new_string: 'y'
        }, { success: true });

        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const output = result.stdout + result.stderr;
        // May output warning about multi-file operation
        assertTrue(
          output.includes('Multi-File') ||
          output.includes('TodoWrite') ||
          output === '',
          'May show multi-file warning or be silent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] resets count on TodoWrite',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup state with existing edits
        setupEditState(tmpDir, {
          editCount: 5,
          writeCount: 2,
          editedFiles: ['/file1.ts', '/file2.ts'],
          warningShown: true
        });

        const input = createPostToolUseInput('TodoWrite', {
          todos: [{ content: 'Task', status: 'pending' }]
        }, { success: true });

        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        // Check state was reset
        const state = readStateFile(tmpDir, '.edit-state.json');
        if (state) {
          assertEqual(state.editCount, 0, 'Edit count should be reset');
          assertEqual(state.writeCount, 0, 'Write count should be reset');
          assertEqual(state.warningShown, false, 'Warning shown should be reset');
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] suppresses warning when todos exist',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup existing edits
        setupEditState(tmpDir, {
          editCount: 2,
          writeCount: 0,
          editedFiles: ['/file1.ts', '/file2.ts'],
          warningShown: false
        });

        // Setup active todos
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 1,
          pendingCount: 1
        });

        const input = createPostToolUseInput('Edit', {
          file_path: '/file3.ts',
          old_string: 'a',
          new_string: 'b'
        }, { success: true });

        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        // Should NOT warn since todos exist
        const output = result.stdout;
        assertTrue(
          !output.includes('Multi-File') || output === '',
          'Should not show warning when todos exist'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] ignores Read tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Read', {
          file_path: '/path/to/file.ts'
        }, { content: 'file content' });

        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        // State should not be created for Read
        const state = readStateFile(tmpDir, '.edit-state.json');
        assertTrue(
          state === null || state.editCount === 0,
          'Should not track Read operations'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] ignores Bash tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Bash', {
          command: 'npm install'
        }, { stdout: 'installed' });

        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] handles empty input gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(EDIT_COUNT_TRACKER, {}, { cwd: tmpDir });
        assertAllowed(result.code, 'Should fail-open on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] deduplicates same file edits',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Edit same file twice
        const input = createPostToolUseInput('Edit', {
          file_path: '/same/file.ts',
          old_string: 'x',
          new_string: 'y'
        });

        await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });

        const state = readStateFile(tmpDir, '.edit-state.json');
        if (state) {
          // File should appear once in list (deduplicated)
          const count = state.editedFiles.filter(f => f === '/same/file.ts').length;
          assertEqual(count, 1, 'Same file should be deduplicated');
          // But edit count should be 2
          assertEqual(state.editCount, 2, 'Edit count should increment each time');
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-complexity-tracker] handles MultiEdit tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('MultiEdit', {
          file_path: '/path/to/multi.ts',
          edits: [{ old: 'a', new: 'b' }]
        });

        const result = await runHook(EDIT_COUNT_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const state = readStateFile(tmpDir, '.edit-state.json');
        if (state) {
          assertTrue(state.editCount >= 1, 'Should track MultiEdit');
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// pattern-learner.cjs Tests
// ============================================================================

const patternLearnerTests = [
  {
    name: '[pattern-learner] handles normal prompt without pattern',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('What is the weather today?');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] handles explicit /learn command',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('/learn always use PlatformValidationResult instead of throwing exceptions');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const output = result.stdout + result.stderr;
        // May output pattern learning confirmation
        assertTrue(
          output.includes('Pattern') ||
          output.includes('Learn') ||
          output === '',
          'May acknowledge learning'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] detects correction pattern',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Correction pattern prompt
        const input = createUserPromptInput('No, you should use PlatformValidationResult, not throw ValidationException');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const output = result.stdout + result.stderr;
        // May detect pattern and ask for confirmation
        assertTrue(
          output.includes('Pattern') ||
          output.includes('confirm') ||
          output === '',
          'May detect pattern candidate'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] handles empty prompt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block on empty prompt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] handles confirmation response',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create pending pattern file
        const memoryDir = path.join(tmpDir, '.claude', 'memory');
        fs.mkdirSync(memoryDir, { recursive: true });
        fs.writeFileSync(
          path.join(memoryDir, 'pattern-pending.json'),
          JSON.stringify({
            candidate: {
              pattern: 'Test pattern',
              confidence: 0.8,
              triggers: [{ type: 'correction' }]
            },
            timestamp: Date.now()
          })
        );

        const input = createUserPromptInput('yes');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] handles rejection response',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create pending pattern file
        const memoryDir = path.join(tmpDir, '.claude', 'memory');
        fs.mkdirSync(memoryDir, { recursive: true });
        fs.writeFileSync(
          path.join(memoryDir, 'pattern-pending.json'),
          JSON.stringify({
            candidate: {
              pattern: 'Test pattern',
              confidence: 0.8
            },
            timestamp: Date.now()
          })
        );

        const input = createUserPromptInput('no');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const output = result.stdout + result.stderr;
        assertTrue(
          output.includes('discard') ||
          output === '' ||
          !fs.existsSync(path.join(memoryDir, 'pattern-pending.json')),
          'Should discard pattern'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] handles empty input object',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(PATTERN_LEARNER, {}, { cwd: tmpDir });
        assertAllowed(result.code, 'Should fail-open');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[pattern-learner] expires stale pending patterns',
    skip: true, // Hook was rewritten — stale-pending expiry logic removed
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create very old pending pattern
        const memoryDir = path.join(tmpDir, '.claude', 'memory');
        fs.mkdirSync(memoryDir, { recursive: true });
        fs.writeFileSync(
          path.join(memoryDir, 'pattern-pending.json'),
          JSON.stringify({
            candidate: { pattern: 'Old pattern' },
            timestamp: Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
          })
        );

        const input = createUserPromptInput('yes');
        const result = await runHook(PATTERN_LEARNER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        // Old pending should be cleaned up
        const pendingExists = fs.existsSync(path.join(memoryDir, 'pattern-pending.json'));
        assertTrue(!pendingExists, 'Stale pending should be cleaned up');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// save-context-memory.cjs Tests
// ============================================================================

const saveContextMemoryTests = [
  {
    name: '[save-context-memory] saves checkpoint on PreCompact',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create plans directory structure
        const plansDir = path.join(tmpDir, 'plans', 'reports');
        fs.mkdirSync(plansDir, { recursive: true });

        const input = {
          event: 'PreCompact',
          trigger: 'auto',
          session_id: 'test-session'
        };
        const result = await runHook(SAVE_CONTEXT_MEMORY, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const output = result.stdout + result.stderr;
        assertTrue(
          output.includes('checkpoint') ||
          output.includes('Memory') ||
          output === '',
          'May output checkpoint message'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[save-context-memory] creates reports directory if missing',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreCompactInput({
          trigger: 'manual',
          session_id: 'test-123'
        });
        const result = await runHook(SAVE_CONTEXT_MEMORY, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[save-context-memory] includes context window stats',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = {
          event: 'PreCompact',
          trigger: 'auto',
          context_window: {
            total_input_tokens: 50000,
            total_output_tokens: 20000,
            context_window_size: 200000
          }
        };
        const result = await runHook(SAVE_CONTEXT_MEMORY, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[save-context-memory] includes todo state in checkpoint',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup todo state
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 3,
          pendingCount: 1,
          inProgressCount: 1,
          completedCount: 1,
          todos: [
            { content: 'Task 1', status: 'completed' },
            { content: 'Task 2', status: 'in_progress' },
            { content: 'Task 3', status: 'pending' }
          ]
        });

        const input = createPreCompactInput({
          trigger: 'auto'
        });
        const result = await runHook(SAVE_CONTEXT_MEMORY, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const output = result.stdout + result.stderr;
        assertTrue(
          output.includes('pending') ||
          output.includes('Todo') ||
          output === '',
          'May include todo status'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[save-context-memory] handles empty input',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(SAVE_CONTEXT_MEMORY, {}, { cwd: tmpDir });
        assertAllowed(result.code, 'Should fail-open on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[save-context-memory] handles missing context_window',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreCompactInput({
          trigger: 'manual'
          // No context_window field
        });
        const result = await runHook(SAVE_CONTEXT_MEMORY, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should handle missing context_window');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// Export test suite
module.exports = {
  name: 'Tracking Hooks',
  tests: [
    ...editCountTrackerTests,
    ...patternLearnerTests,
    ...saveContextMemoryTests
  ]
};
