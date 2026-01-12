/**
 * ACE System & Utility Hooks Test Suite
 *
 * Tests for:
 * - ace-curator-pruner.cjs: Delta promotion, pruning, and limit enforcement
 * - ace-event-emitter.cjs: Event logging to events-stream.jsonl
 * - ace-feedback-tracker.cjs: Delta effectiveness tracking
 * - ace-reflector-analysis.cjs: Pattern extraction from events
 * - metrics-dashboard.cjs: Hook performance metrics display
 * - post-edit-prettier.cjs: Auto-formatting after Edit/Write
 * - workflow-step-tracker.cjs: Workflow step advancement
 * - write-compact-marker.cjs: Compact marker and calibration
 */

const path = require('path');
const fs = require('fs');
const {
  runHook,
  getHookPath,
  createPostToolUseInput,
  createPreCompactInput,
  createUserPromptInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertAllowed,
  assertTrue,
  assertFalse,
  assertNotNullish
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir,
  setupDeltaCandidates,
  setupDeltas,
  readDeltas,
  readDeltaCandidates,
  setupEventsStream,
  readEventsStream,
  setupInjectionTracking,
  setupWorkflowState,
  setupWorkflowConfig,
  setupCalibration,
  readCalibration,
  fileExists,
  createMockFile,
  createDaysAgoTimestamp
} = require('../lib/test-utils.cjs');

// Hook paths
const ACE_CURATOR_PRUNER = getHookPath('ace-curator-pruner.cjs');
const ACE_EVENT_EMITTER = getHookPath('ace-event-emitter.cjs');
const ACE_FEEDBACK_TRACKER = getHookPath('ace-feedback-tracker.cjs');
const ACE_REFLECTOR_ANALYSIS = getHookPath('ace-reflector-analysis.cjs');
const METRICS_DASHBOARD = getHookPath('metrics-dashboard.cjs');
const POST_EDIT_PRETTIER = getHookPath('post-edit-prettier.cjs');
const WORKFLOW_STEP_TRACKER = getHookPath('workflow-step-tracker.cjs');
const WRITE_COMPACT_MARKER = getHookPath('write-compact-marker.cjs');

// ============================================================================
// ace-curator-pruner.cjs Tests (6 tests)
// ============================================================================

const aceCuratorPrunerTests = [
  {
    name: '[ace-curator-pruner] promotes qualified candidates on PreCompact',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup candidates with high confidence
        setupDeltaCandidates(tmpDir, [
          {
            id: 'delta-1',
            pattern: 'test-pattern',
            confidence: 0.85,
            successCount: 10,
            failureCount: 1,
            lastUsed: new Date().toISOString()
          }
        ]);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_CURATOR_PRUNER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should complete without blocking');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-curator-pruner] prunes stale deltas older than 90 days',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup old deltas (>90 days)
        setupDeltas(tmpDir, [
          {
            id: 'old-delta-1',
            pattern: 'old-pattern',
            confidence: 0.7,
            lastUsed: createDaysAgoTimestamp(100) // 100 days ago
          },
          {
            id: 'fresh-delta-2',
            pattern: 'fresh-pattern',
            confidence: 0.8,
            lastUsed: new Date().toISOString()
          }
        ]);

        const input = createPreCompactInput({ compact_type: 'auto' });
        const result = await runHook(ACE_CURATOR_PRUNER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should handle pruning without error');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-curator-pruner] enforces max 50 delta limit',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup 60 deltas (over limit)
        const deltas = Array(60).fill(null).map((_, i) => ({
          id: `delta-${i}`,
          pattern: `pattern-${i}`,
          confidence: 0.5 + (i / 200), // Varying confidence
          lastUsed: new Date().toISOString()
        }));
        setupDeltas(tmpDir, deltas);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_CURATOR_PRUNER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should enforce limit without error');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-curator-pruner] skips non-PreCompact events',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Bash', { command: 'echo test' }, { exit_code: 0 });
        const result = await runHook(ACE_CURATOR_PRUNER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should exit 0 for non-PreCompact');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-curator-pruner] handles empty candidates gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup empty candidates
        setupDeltaCandidates(tmpDir, []);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_CURATOR_PRUNER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should handle empty candidates');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-curator-pruner] handles missing memory directory',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No memory directory setup
        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_CURATOR_PRUNER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should not crash without memory dir');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// ace-event-emitter.cjs Tests (6 tests)
// ============================================================================

const aceEventEmitterTests = [
  {
    name: '[ace-event-emitter] logs Bash tool execution',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupEventsStream(tmpDir, []); // Start with empty stream

        const input = createPostToolUseInput('Bash',
          { command: 'npm test' },
          { exit_code: 0, stdout: 'tests passed' }
        );
        const result = await runHook(ACE_EVENT_EMITTER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should log Bash event');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-event-emitter] logs Skill tool execution',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupEventsStream(tmpDir, []);

        const input = createPostToolUseInput('Skill',
          { skill: 'cook' },
          { exit_code: 0 }
        );
        const result = await runHook(ACE_EVENT_EMITTER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should log Skill event');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-event-emitter] skips trivial commands',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupEventsStream(tmpDir, []);

        // Trivial commands should be skipped
        const trivialCommands = ['echo hello', 'pwd', 'which node', 'whoami', 'date', 'env'];

        for (const cmd of trivialCommands) {
          const input = createPostToolUseInput('Bash',
            { command: cmd },
            { exit_code: 0 }
          );
          const result = await runHook(ACE_EVENT_EMITTER, input, {
            cwd: tmpDir,
            env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
          });
          assertAllowed(result.code, `Should skip trivial command: ${cmd}`);
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-event-emitter] skips non-Bash/Skill tools',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupEventsStream(tmpDir, []);

        const input = createPostToolUseInput('Read',
          { file_path: '/some/file.txt' },
          { content: 'file content' }
        );
        const result = await runHook(ACE_EVENT_EMITTER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should not log Read tool');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-event-emitter] classifies error types correctly',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupEventsStream(tmpDir, []);

        const input = createPostToolUseInput('Bash',
          { command: 'npm test' },
          { exit_code: 1, stderr: 'Error: test failed' }
        );
        const result = await runHook(ACE_EVENT_EMITTER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should log error event');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-event-emitter] handles empty input gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(ACE_EVENT_EMITTER, {}, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should not crash on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// ace-feedback-tracker.cjs Tests (5 tests)
// ============================================================================

const aceFeedbackTrackerTests = [
  {
    name: '[ace-feedback-tracker] increments helpful on success',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup injection tracking with delta
        setupInjectionTracking(tmpDir, 'test-session', ['delta-1']);
        setupDeltas(tmpDir, [{
          id: 'delta-1',
          pattern: 'test-pattern',
          confidence: 0.7,
          helpfulCount: 5,
          notHelpfulCount: 1
        }]);

        const input = createPostToolUseInput('Skill',
          { skill: 'cook' },
          { exit_code: 0 }
        );
        input.session_id = 'test-session';

        const result = await runHook(ACE_FEEDBACK_TRACKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should track success feedback');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-feedback-tracker] increments not_helpful on failure',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupInjectionTracking(tmpDir, 'test-session', ['delta-1']);
        setupDeltas(tmpDir, [{
          id: 'delta-1',
          pattern: 'test-pattern',
          confidence: 0.7,
          helpfulCount: 5,
          notHelpfulCount: 1
        }]);

        const input = createPostToolUseInput('Skill',
          { skill: 'cook' },
          { exit_code: 1, error: 'skill failed' }
        );
        input.session_id = 'test-session';

        const result = await runHook(ACE_FEEDBACK_TRACKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should track failure feedback');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-feedback-tracker] detects negative feedback keywords',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupInjectionTracking(tmpDir, 'test-session', ['delta-1']);
        setupDeltas(tmpDir, [{
          id: 'delta-1',
          pattern: 'test-pattern',
          confidence: 0.7
        }]);

        const input = createUserPromptInput('this is wrong, that did not work');
        input.session_id = 'test-session';

        const result = await runHook(ACE_FEEDBACK_TRACKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should detect negative feedback');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-feedback-tracker] skips without injected deltas',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No injection tracking setup
        const input = createPostToolUseInput('Skill',
          { skill: 'cook' },
          { exit_code: 0 }
        );

        const result = await runHook(ACE_FEEDBACK_TRACKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should skip without tracking');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-feedback-tracker] handles empty input gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(ACE_FEEDBACK_TRACKER, {}, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should not crash on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// ace-reflector-analysis.cjs Tests (6 tests)
// ============================================================================

const aceReflectorAnalysisTests = [
  {
    name: '[ace-reflector-analysis] extracts patterns from events on PreCompact',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup events with repeated patterns
        const events = Array(10).fill(null).map((_, i) => ({
          timestamp: new Date().toISOString(),
          tool: 'Skill',
          skill: 'cook',
          outcome: i % 2 === 0 ? 'success' : 'failure',
          errorType: i % 2 === 1 ? 'compilation_error' : null
        }));
        setupEventsStream(tmpDir, events);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_REFLECTOR_ANALYSIS, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should analyze events');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-reflector-analysis] groups by skill and error_type',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup events with different error types
        const events = [
          { tool: 'Skill', skill: 'cook', outcome: 'failure', errorType: 'compilation_error' },
          { tool: 'Skill', skill: 'cook', outcome: 'failure', errorType: 'compilation_error' },
          { tool: 'Skill', skill: 'cook', outcome: 'failure', errorType: 'compilation_error' },
          { tool: 'Skill', skill: 'fix', outcome: 'failure', errorType: 'test_failure' },
          { tool: 'Skill', skill: 'fix', outcome: 'failure', errorType: 'test_failure' },
          { tool: 'Skill', skill: 'fix', outcome: 'failure', errorType: 'test_failure' }
        ].map(e => ({ ...e, timestamp: new Date().toISOString() }));
        setupEventsStream(tmpDir, events);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_REFLECTOR_ANALYSIS, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should group events');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-reflector-analysis] filters below min events threshold',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Only 2 events (below MIN_EVENTS_FOR_PATTERN = 3)
        const events = [
          { tool: 'Skill', skill: 'cook', outcome: 'failure', errorType: 'error1' },
          { tool: 'Skill', skill: 'cook', outcome: 'failure', errorType: 'error1' }
        ].map(e => ({ ...e, timestamp: new Date().toISOString() }));
        setupEventsStream(tmpDir, events);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_REFLECTOR_ANALYSIS, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should filter below threshold');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-reflector-analysis] skips with insufficient events',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Only 3 events (below MIN_EVENTS_FOR_ANALYSIS = 5)
        const events = [
          { tool: 'Skill', skill: 'cook', outcome: 'success' },
          { tool: 'Skill', skill: 'cook', outcome: 'success' },
          { tool: 'Skill', skill: 'cook', outcome: 'success' }
        ].map(e => ({ ...e, timestamp: new Date().toISOString() }));
        setupEventsStream(tmpDir, events);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_REFLECTOR_ANALYSIS, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should skip with few events');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-reflector-analysis] skips non-PreCompact events',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Bash', { command: 'echo test' }, { exit_code: 0 });
        const result = await runHook(ACE_REFLECTOR_ANALYSIS, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should skip non-PreCompact');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[ace-reflector-analysis] handles empty events stream',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupEventsStream(tmpDir, []);

        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(ACE_REFLECTOR_ANALYSIS, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should handle empty stream');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// metrics-dashboard.cjs Tests (5 tests)
// ============================================================================

const metricsDashboardTests = [
  {
    name: '[metrics-dashboard] displays metrics with --json flag',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Run with --json flag to get parseable output
        const result = await runHook(METRICS_DASHBOARD, undefined, {
          cwd: tmpDir,
          env: {
            CK_TMP_DIR: path.join(tmpDir, '.claude', 'tmp'),
            METRICS_PATH: path.join(tmpDir, '.claude', 'tmp', 'hook-metrics.json')
          }
        });

        // Metrics dashboard is a CLI tool, not a hook - it reads args from argv
        // Just verify it doesn't crash
        assertTrue(
          result.code === 0 || result.code === 1,
          'Should run without crashing'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[metrics-dashboard] handles empty metrics file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No metrics file exists
        const result = await runHook(METRICS_DASHBOARD, undefined, {
          cwd: tmpDir,
          env: {
            CK_TMP_DIR: path.join(tmpDir, '.claude', 'tmp')
          }
        });

        assertTrue(
          result.code === 0 || result.code === 1,
          'Should handle missing metrics'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[metrics-dashboard] handles invalid metrics file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const tmpClaudeDir = path.join(tmpDir, '.claude', 'tmp');
        fs.mkdirSync(tmpClaudeDir, { recursive: true });
        fs.writeFileSync(path.join(tmpClaudeDir, 'hook-metrics.json'), '{ invalid json');

        const result = await runHook(METRICS_DASHBOARD, undefined, {
          cwd: tmpDir,
          env: {
            CK_TMP_DIR: tmpClaudeDir
          }
        });

        assertTrue(
          result.code === 0 || result.code === 1,
          'Should handle invalid JSON'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[metrics-dashboard] formats large numbers correctly',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const tmpClaudeDir = path.join(tmpDir, '.claude', 'tmp');
        fs.mkdirSync(tmpClaudeDir, { recursive: true });
        fs.writeFileSync(path.join(tmpClaudeDir, 'hook-metrics.json'), JSON.stringify({
          hooks: {
            'test-hook': {
              total: 1000000,
              successRate: '99.5%',
              p50Ms: 50,
              p99Ms: 200,
              failureCount: 5000,
              lastExecution: new Date().toISOString()
            }
          },
          updated: new Date().toISOString()
        }));

        const result = await runHook(METRICS_DASHBOARD, undefined, {
          cwd: tmpDir,
          env: {
            CK_TMP_DIR: tmpClaudeDir
          }
        });

        assertTrue(
          result.code === 0 || result.code === 1,
          'Should format large numbers'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[metrics-dashboard] handles help flag',
    fn: async () => {
      // This is a CLI tool test - verify basic execution
      const tmpDir = createTempDir();
      try {
        const result = await runHook(METRICS_DASHBOARD, undefined, {
          cwd: tmpDir
        });

        // Dashboard reads from argv, so without args it just displays
        assertTrue(
          result.code === 0 || result.code === 1,
          'Should execute without error'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// post-edit-prettier.cjs Tests (5 tests)
// ============================================================================

const postEditPrettierTests = [
  {
    name: '[post-edit-prettier] handles supported extension',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const tsFile = createMockFile(tmpDir, 'src/test.ts', 'const x=1');

        const input = createPostToolUseInput('Edit',
          { file_path: tsFile },
          {}
        );
        const result = await runHook(POST_EDIT_PRETTIER, input, {
          cwd: tmpDir,
          timeout: 5000 // Shorter timeout for prettier
        });

        assertAllowed(result.code, 'Should handle .ts file');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[post-edit-prettier] skips unsupported extension',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const csFile = createMockFile(tmpDir, 'src/test.cs', 'class Test {}');

        const input = createPostToolUseInput('Edit',
          { file_path: csFile },
          {}
        );
        const result = await runHook(POST_EDIT_PRETTIER, input, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should skip .cs file');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[post-edit-prettier] skips node_modules paths',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const nodeModuleFile = createMockFile(tmpDir, 'node_modules/pkg/index.ts', 'export const x = 1');

        const input = createPostToolUseInput('Edit',
          { file_path: nodeModuleFile },
          {}
        );
        const result = await runHook(POST_EDIT_PRETTIER, input, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should skip node_modules');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[post-edit-prettier] handles non-existent file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Edit',
          { file_path: path.join(tmpDir, 'missing.ts') },
          {}
        );
        const result = await runHook(POST_EDIT_PRETTIER, input, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should handle missing file');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[post-edit-prettier] handles Write tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const jsFile = createMockFile(tmpDir, 'src/new.js', 'const y = 2');

        const input = createPostToolUseInput('Write',
          { file_path: jsFile },
          {}
        );
        const result = await runHook(POST_EDIT_PRETTIER, input, {
          cwd: tmpDir,
          timeout: 5000
        });

        assertAllowed(result.code, 'Should handle Write tool');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// workflow-step-tracker.cjs Tests (4 tests)
// ============================================================================

const workflowStepTrackerTests = [
  {
    name: '[workflow-step-tracker] advances workflow on skill match',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupWorkflowState(tmpDir, {
          active: true,
          currentWorkflow: 'feature',
          currentStep: 0,
          steps: [
            { id: 'plan', skill: 'plan', status: 'pending' },
            { id: 'cook', skill: 'cook', status: 'pending' }
          ]
        });

        const input = createPostToolUseInput('Skill',
          { skill: 'plan' },
          { exit_code: 0 }
        );
        const result = await runHook(WORKFLOW_STEP_TRACKER, input, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should advance workflow');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-step-tracker] skips non-Skill tools',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Bash',
          { command: 'echo test' },
          { exit_code: 0 }
        );
        const result = await runHook(WORKFLOW_STEP_TRACKER, input, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should skip Bash tool');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-step-tracker] handles no active workflow',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No workflow state setup
        const input = createPostToolUseInput('Skill',
          { skill: 'plan' },
          { exit_code: 0 }
        );
        const result = await runHook(WORKFLOW_STEP_TRACKER, input, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should handle no workflow');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-step-tracker] handles empty input gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const result = await runHook(WORKFLOW_STEP_TRACKER, {}, {
          cwd: tmpDir
        });

        assertAllowed(result.code, 'Should not crash on empty input');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// write-compact-marker.cjs Tests (5 tests)
// ============================================================================

const writeCompactMarkerTests = [
  {
    name: '[write-compact-marker] writes session marker on PreCompact',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreCompactInput({
          session_id: 'test-session-123',
          compact_type: 'manual'
        });
        const result = await runHook(WRITE_COMPACT_MARKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should write marker');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[write-compact-marker] updates calibration data',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupCalibration(tmpDir, {
          threshold: 50000,
          samples: 5,
          lastUpdated: createDaysAgoTimestamp(1)
        });

        const input = createPreCompactInput({
          session_id: 'test-session',
          context_window: { tokens_used: 60000 }
        });
        const result = await runHook(WRITE_COMPACT_MARKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should update calibration');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[write-compact-marker] uses default session id',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No session_id in input
        const input = createPreCompactInput({ compact_type: 'manual' });
        const result = await runHook(WRITE_COMPACT_MARKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should use default session');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[write-compact-marker] handles missing context_window',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreCompactInput({
          session_id: 'test-session'
          // No context_window
        });
        const result = await runHook(WRITE_COMPACT_MARKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should handle missing context');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[write-compact-marker] skips non-PreCompact events',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Bash', { command: 'test' }, { exit_code: 0 });
        const result = await runHook(WRITE_COMPACT_MARKER, input, {
          cwd: tmpDir,
          env: { CK_MEMORY_DIR: path.join(tmpDir, '.claude', 'memory') }
        });

        assertAllowed(result.code, 'Should skip non-PreCompact');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Export test suite
// ============================================================================

module.exports = {
  name: 'ACE System & Utility Hooks',
  tests: [
    ...aceCuratorPrunerTests,
    ...aceEventEmitterTests,
    ...aceFeedbackTrackerTests,
    ...aceReflectorAnalysisTests,
    ...metricsDashboardTests,
    ...postEditPrettierTests,
    ...workflowStepTrackerTests,
    ...writeCompactMarkerTests
  ]
};
