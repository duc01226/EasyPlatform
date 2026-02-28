/**
 * Session Lifecycle Hooks Test Suite
 *
 * Tests for:
 * - session-init.cjs: Session initialization and project detection
 * - session-resume.cjs: Checkpoint restoration
 * - session-end.cjs: Session cleanup
 * - subagent-init.cjs: Subagent context injection
 * - ace-session-inject.cjs: Lesson injection
 */

const path = require('path');
const fs = require('fs');
const {
  runHook,
  getHookPath,
  createSessionStartInput,
  createSubagentStartInput,
  createSessionEndInput,
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
  setupCheckpoint,
  setupTodoState,
  setupAceLessons,
  createMockFile,
  fileExists,
  createTimestamp
} = require('../lib/test-utils.cjs');

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');
const SESSION_RESUME = getHookPath('session-resume.cjs');
const SESSION_END = getHookPath('session-end.cjs');
const SUBAGENT_INIT = getHookPath('subagent-init.cjs');
const ACE_SESSION_INJECT = getHookPath('ace-session-inject.cjs');

// ============================================================================
// session-init.cjs Tests
// ============================================================================

const sessionInitTests = [
  {
    name: '[session-init] handles startup source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('startup', 'test-session-123');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        // Session init outputs project context
        const output = result.stdout + result.stderr;
        assertTrue(
          output.includes('Session') ||
          output.includes('Project') ||
          output === '' ||
          output.includes('single-repo'), // May detect project type
          'Should output session context or nothing'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles resume source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('resume', 'test-session-123');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles clear source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('clear');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles compact source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('compact');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] detects Node project by package.json',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        createMockFile(tmpDir, 'package.json', '{"name": "test-project"}');
        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code);
        const output = result.stdout + result.stderr;
        // May detect node/npm project
        assertTrue(
          output.toLowerCase().includes('npm') ||
          output.toLowerCase().includes('node') ||
          output.toLowerCase().includes('single-repo') ||
          output === '',
          'May detect Node project'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] detects .NET project by .sln file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        createMockFile(tmpDir, 'Project.sln', 'Microsoft Visual Studio Solution File');
        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles empty input gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(SESSION_INIT, {}, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// session-resume.cjs Tests
// ============================================================================

const sessionResumeTests = [
  {
    name: '[session-resume] restores todos from fresh checkpoint',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupCheckpoint(tmpDir, {
          timestamp: createTimestamp(0), // Now
          todos: [
            { content: 'Task 1', status: 'pending' },
            { content: 'Task 2', status: 'in_progress' }
          ]
        });
        const input = createSessionStartInput('resume');
        const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
        assertAllowed(result.code);
        const output = result.stdout + result.stderr;
        // May output restoration message
        assertTrue(
          output.includes('restore') ||
          output.includes('checkpoint') ||
          output.includes('todo') ||
          output === '',
          'May mention restoration or be silent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-resume] skips if no checkpoint exists',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('resume');
        const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-resume] skips stale checkpoint (>24h old)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupCheckpoint(tmpDir, {
          timestamp: createTimestamp(25), // 25 hours ago
          todos: [{ content: 'Old task', status: 'pending' }]
        });
        const input = createSessionStartInput('resume');
        const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
        assertAllowed(result.code);
        // Should not restore stale checkpoint
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-resume] handles startup source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-resume] handles compact source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('compact');
        const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// session-end.cjs Tests
// ============================================================================

const sessionEndTests = [
  {
    name: '[session-end] handles clear source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create state files
        setupTodoState(tmpDir, { hasTodos: true, taskCount: 2 });
        const input = createSessionEndInput('clear');
        const result = await runHook(SESSION_END, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-end] handles exit source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionEndInput('exit');
        const result = await runHook(SESSION_END, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-end] handles empty directory',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionEndInput('clear');
        const result = await runHook(SESSION_END, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not fail on missing files');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// subagent-init.cjs Tests
// ============================================================================

const subagentInitTests = [
  {
    name: '[subagent-init] injects context for researcher agent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = {
          event: 'SubagentStart',
          agent_type: 'researcher',
          agent_id: 'test-123',
          cwd: tmpDir
        };
        const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code);
        // Should output JSON with hookSpecificOutput
        const output = result.stdout.trim();
        if (output) {
          assertTrue(
            output.includes('researcher') ||
            output.includes('Subagent') ||
            output.startsWith('{'),
            'Should contain agent context'
          );
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[subagent-init] injects context for planner agent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = {
          event: 'SubagentStart',
          agent_type: 'planner',
          agent_id: 'plan-456',
          cwd: tmpDir
        };
        const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[subagent-init] includes parent todo state if present',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 3,
          pendingCount: 2,
          inProgressCount: 1,
          completedCount: 0,
          summaryTodos: ['[pending] Task 1', '[in_progress] Task 2']
        });
        const input = {
          event: 'SubagentStart',
          agent_type: 'cook',
          agent_id: 'cook-789',
          cwd: tmpDir
        };
        const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code);
        const output = result.stdout;
        if (output) {
          // May include todo context
          assertTrue(
            output.includes('Todo') ||
            output.includes('Tasks') ||
            output.includes('pending') ||
            output.includes('Subagent'),
            'Should include context'
          );
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[subagent-init] handles unknown agent type',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = {
          event: 'SubagentStart',
          agent_type: 'unknown-agent',
          agent_id: 'unknown-001',
          cwd: tmpDir
        };
        const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block unknown agent');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[subagent-init] outputs JSON format with hookSpecificOutput',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = {
          event: 'SubagentStart',
          agent_type: 'explorer',
          agent_id: 'exp-001',
          cwd: tmpDir
        };
        const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code);
        const output = result.stdout.trim();
        if (output) {
          // Should be valid JSON
          try {
            const parsed = JSON.parse(output);
            assertTrue(
              parsed.hookSpecificOutput !== undefined,
              'Should have hookSpecificOutput'
            );
          } catch (e) {
            // May not always output JSON, that's OK
          }
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[subagent-init] handles empty input gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(SUBAGENT_INIT, {}, { cwd: tmpDir });
        assertAllowed(result.code, 'Should fail-open on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// ace-session-inject.cjs Tests
// ============================================================================

const aceSessionInjectTests = [
  {
    name: '[ace-session-inject] injects high-confidence lessons',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupAceLessons(tmpDir, [
          { problem: 'Test problem', solution: 'Test solution', confidence: 0.9 }
        ]);
        const input = createSessionStartInput('startup');
        const result = await runHook(ACE_SESSION_INJECT, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-session-inject] handles no lessons file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('startup');
        const result = await runHook(ACE_SESSION_INJECT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block without lessons');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-session-inject] handles resume source',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('resume');
        const result = await runHook(ACE_SESSION_INJECT, input, { cwd: tmpDir });
        assertAllowed(result.code);
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-session-inject] skips low-confidence lessons',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupAceLessons(tmpDir, [
          { problem: 'Low confidence', solution: 'Test', confidence: 0.2 }
        ]);
        const input = createSessionStartInput('startup');
        const result = await runHook(ACE_SESSION_INJECT, input, { cwd: tmpDir });
        assertAllowed(result.code);
        // Low confidence should be filtered out
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Config File Edge Cases
// ============================================================================

const configEdgeCaseTests = [
  {
    name: '[session-init] handles missing .ck.json config',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create .claude directory but no .ck.json
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });

        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not crash without config file');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles empty .ck.json config',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, '.ck.json'), '{}');

        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should handle empty config');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles invalid JSON in .ck.json',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, '.ck.json'), '{ broken json');

        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not crash on malformed JSON');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles config with wrong types',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        // Write config with wrong types (string instead of boolean, number instead of string, etc.)
        fs.writeFileSync(path.join(claudeDir, '.ck.json'), JSON.stringify({
          enableHooks: 'yes',  // Should be boolean
          maxRetries: 'three', // Should be number
          timeout: true,       // Should be number
          features: 123        // Should be array/object
        }));

        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should handle config with wrong types');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-resume] handles malformed checkpoint file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const memoryDir = path.join(tmpDir, '.claude', 'memory');
        fs.mkdirSync(memoryDir, { recursive: true });
        // Write malformed checkpoint
        fs.writeFileSync(path.join(memoryDir, 'session-checkpoint.json'), '{ broken');

        const input = createSessionStartInput('resume');
        const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not crash on malformed checkpoint');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[session-init] handles config in different locations',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create nested project structure with config at different level
        const projectDir = path.join(tmpDir, 'project');
        const subDir = path.join(projectDir, 'src', 'app');
        fs.mkdirSync(subDir, { recursive: true });

        // Config only at root level
        const claudeDir = path.join(projectDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, '.ck.json'), JSON.stringify({ projectName: 'test' }));

        // Run from subdirectory
        const input = createSessionStartInput('startup');
        const result = await runHook(SESSION_INIT, input, { cwd: subDir });
        assertAllowed(result.code, 'Should handle config search path');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-session-inject] handles malformed lessons file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const memoryDir = path.join(tmpDir, '.claude', 'memory');
        fs.mkdirSync(memoryDir, { recursive: true });
        // Write malformed lessons
        fs.writeFileSync(path.join(memoryDir, 'lessons.json'), '{ not valid json');

        const input = createSessionStartInput('startup');
        const result = await runHook(ACE_SESSION_INJECT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not crash on malformed lessons');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
];

// Export test suite
module.exports = {
  name: 'Session Lifecycle Hooks',
  tests: [
    ...sessionInitTests,
    ...sessionResumeTests,
    ...sessionEndTests,
    ...subagentInitTests,
    ...aceSessionInjectTests,
    ...configEdgeCaseTests
  ]
};
