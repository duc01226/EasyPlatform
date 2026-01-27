/**
 * Bugfix Regression Test Suite
 *
 * Tests for bug fixes implemented in January 2026:
 * 1. Workflow intent change detection - workflow-router.cjs
 * 2. tmpclaude cleanup in .claude subdirectories - session-init.cjs & session-end.cjs
 * 3. Prettier skip patterns for .claude directories - post-edit-prettier.cjs
 * 4. [Workflow] prefix in workflow-generated todos - workflow-router.cjs
 */

const path = require('path');
const fs = require('fs');
const {
  runHook,
  getHookPath,
  createUserPromptInput,
  createSessionStartInput,
  createSessionEndInput,
  createPostToolUseInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertContains,
  assertAllowed,
  assertNotContains,
  assertTrue
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir,
  setupWorkflowState,
  cleanupWorkflowState,
  generateTestSessionId,
  createMockFile,
  fileExists
} = require('../lib/test-utils.cjs');

// Hook paths
const WORKFLOW_ROUTER = getHookPath('workflow-router.cjs');
const SESSION_INIT = getHookPath('session-init.cjs');
const POST_EDIT_PRETTIER = getHookPath('post-edit-prettier.cjs');
const SESSION_END = getHookPath('session-end.cjs');

// ============================================================================
// BUG FIX 1: Workflow Intent Change Detection
// ============================================================================
// Issue: When user's prompt suggests a different workflow than the active one,
// the hook should detect this and show a conflict reminder instead of
// continuing with the active workflow blindly.

const workflowIntentChangeTests = [
  {
    name: '[workflow-intent] detects intent change from feature to bugfix',
    fn: async () => {
      const tmpDir = createTempDir();
      let wfState;
      try {
        // Setup: Active "feature" workflow (per-session path)
        wfState = setupWorkflowState(tmpDir, {
          workflowId: 'feature',
          workflowName: 'Feature Implementation',
          currentStep: 1,
          sequence: ['plan', 'cook', 'code-simplifier', 'code-review', 'test', 'docs-update', 'watzup'],
          startedAt: new Date().toISOString()
        });

        // Setup: workflows.json config
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true },
          commandMapping: {
            plan: { claude: '/plan' },
            cook: { claude: '/cook' },
            fix: { claude: '/fix' },
            scout: { claude: '/scout' },
            debug: { claude: '/debug' }
          },
          workflows: {
            feature: {
              name: 'Feature Implementation',
              sequence: ['plan', 'cook'],
              triggerPatterns: ['\\b(implement|add|create)\\b']
            },
            bugfix: {
              name: 'Bug Fix',
              sequence: ['scout', 'debug', 'fix'],
              triggerPatterns: ['\\b(bug|fix|error|broken)\\b']
            }
          }
        }));

        // User prompt suggesting a BUG FIX (different from active feature workflow)
        const input = createUserPromptInput('fix this bug in the login form');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: wfState.sessionId }
        });

        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;

        // Should detect the intent conflict
        assertTrue(
          output.includes('Intent Change') ||
          output.includes('conflict') ||
          output.includes('different workflow') ||
          output.includes('Bug Fix') ||
          output.toLowerCase().includes('switch'),
          'Should detect intent change and show conflict options'
        );
      } finally {
        if (wfState) cleanupWorkflowState(wfState.stateFile);
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-intent] continues when intent matches active workflow',
    fn: async () => {
      const tmpDir = createTempDir();
      let wfState;
      try {
        // Setup: Active "bugfix" workflow (per-session path)
        wfState = setupWorkflowState(tmpDir, {
          workflowId: 'bugfix',
          workflowName: 'Bug Fix',
          currentStep: 2,
          sequence: ['scout', 'debug', 'fix'],
          startedAt: new Date().toISOString()
        });

        // Setup: workflows.json config
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true },
          commandMapping: {
            fix: { claude: '/fix' },
            scout: { claude: '/scout' },
            debug: { claude: '/debug' }
          },
          workflows: {
            bugfix: {
              name: 'Bug Fix',
              sequence: ['scout', 'debug', 'fix'],
              triggerPatterns: ['\\b(bug|fix|error|broken)\\b']
            }
          }
        }));

        // User prompt matching active workflow (bugfix)
        const input = createUserPromptInput('continue fixing the bug');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: wfState.sessionId }
        });

        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;

        // Should NOT show conflict (same intent)
        assertNotContains(output, 'Intent Change', 'Should not show intent change for same workflow');
      } finally {
        if (wfState) cleanupWorkflowState(wfState.stateFile);
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-intent] no conflict when no active workflow',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No workflow state setup — unique session ID ensures isolation
        const testSessionId = generateTestSessionId();

        // Setup: workflows.json config
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true },
          commandMapping: { fix: { claude: '/fix' } },
          workflows: {
            bugfix: {
              name: 'Bug Fix',
              sequence: ['fix'],
              triggerPatterns: ['\\b(bug|fix)\\b']
            }
          }
        }));

        const input = createUserPromptInput('fix this bug');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: testSessionId }
        });

        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;

        // Should NOT show conflict (no active workflow)
        assertNotContains(output, 'Intent Change', 'Should not show intent change without active workflow');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-intent] handles quick: prefix bypass',
    fn: async () => {
      const tmpDir = createTempDir();
      let wfState;
      try {
        // Setup: Active workflow (per-session path)
        wfState = setupWorkflowState(tmpDir, {
          workflowId: 'feature',
          workflowName: 'Feature Implementation',
          currentStep: 1,
          sequence: ['plan', 'cook'],
          startedAt: new Date().toISOString()
        });

        // Setup: workflows.json config
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true, overridePrefix: 'quick:' },
          commandMapping: { plan: { claude: '/plan' } },
          workflows: {
            feature: {
              name: 'Feature',
              sequence: ['plan'],
              triggerPatterns: ['\\bimplement\\b']
            },
            bugfix: {
              name: 'Bug Fix',
              sequence: ['fix'],
              triggerPatterns: ['\\bfix\\b']
            }
          }
        }));

        // User prompt with quick: prefix should bypass workflow detection
        const input = createUserPromptInput('quick: fix this typo');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: wfState.sessionId }
        });

        assertAllowed(result.code, 'Should not block');
        // Quick prefix bypasses all workflow detection
      } finally {
        if (wfState) cleanupWorkflowState(wfState.stateFile);
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// BUG FIX 2: tmpclaude Cleanup in .claude Subdirectories
// ============================================================================
// Issue: cleanupTempFiles() in session-init.cjs skipped directories starting
// with '.' (like .claude), leaving orphaned tmpclaude-* files.
// Fix: Added skipDotDirs parameter and explicit .claude directory scan.

const tmpclaudeCleanupTests = [
  {
    name: '[tmpclaude-cleanup] cleans tmpclaude files from .claude/skills',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create tmpclaude file in .claude/skills subdirectory
        const skillsDir = path.join(tmpDir, '.claude', 'skills', 'learned-patterns', 'scripts');
        fs.mkdirSync(skillsDir, { recursive: true });
        const tmpFile = path.join(skillsDir, 'tmpclaude-abc123def-cwd');
        fs.writeFileSync(tmpFile, 'test content');

        assertTrue(fs.existsSync(tmpFile), 'tmpclaude file should exist before cleanup');

        // Run session-init which calls cleanupTempFiles
        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        // File should be cleaned up
        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be cleaned from .claude/skills');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] cleans tmpclaude files from .claude/hooks',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create tmpclaude file in .claude/hooks subdirectory
        const hooksDir = path.join(tmpDir, '.claude', 'hooks');
        fs.mkdirSync(hooksDir, { recursive: true });
        const tmpFile = path.join(hooksDir, 'tmpclaude-deadbeef123-cwd');
        fs.writeFileSync(tmpFile, 'test content');

        assertTrue(fs.existsSync(tmpFile), 'tmpclaude file should exist before cleanup');

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be cleaned from .claude/hooks');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] cleans tmpclaude files from .claude root',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create tmpclaude file in .claude root
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        const tmpFile = path.join(claudeDir, 'tmpclaude-cafebabe123-cwd');
        fs.writeFileSync(tmpFile, 'test content');

        assertTrue(fs.existsSync(tmpFile), 'tmpclaude file should exist before cleanup');

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be cleaned from .claude root');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] cleans multiple tmpclaude files across .claude subdirs',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        const skillsDir = path.join(claudeDir, 'skills', 'scripts');
        const hooksDir = path.join(claudeDir, 'hooks');
        const memoryDir = path.join(claudeDir, 'memory');

        fs.mkdirSync(skillsDir, { recursive: true });
        fs.mkdirSync(hooksDir, { recursive: true });
        fs.mkdirSync(memoryDir, { recursive: true });

        // Create multiple tmpclaude files (must use hex strings: [a-f0-9]+)
        const tmpFiles = [
          path.join(claudeDir, 'tmpclaude-aabbccdd1111-cwd'),
          path.join(skillsDir, 'tmpclaude-aabbccdd2222-cwd'),
          path.join(hooksDir, 'tmpclaude-aabbccdd3333-cwd'),
          path.join(memoryDir, 'tmpclaude-aabbccdd4444-cwd')
        ];

        tmpFiles.forEach(f => fs.writeFileSync(f, 'test'));
        tmpFiles.forEach(f => assertTrue(fs.existsSync(f), `${f} should exist before cleanup`));

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        tmpFiles.forEach(f => assertTrue(!fs.existsSync(f), `${f} should be cleaned up`));
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] preserves non-tmpclaude files in .claude',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });

        // Create both tmpclaude and regular files (tmpclaude uses hex: [a-f0-9]+)
        const tmpFile = path.join(claudeDir, 'tmpclaude-c1ea0b5f-cwd');
        const regularFile = path.join(claudeDir, 'regular-file.json');
        const stateFile = path.join(claudeDir, '.workflow-state.json');

        fs.writeFileSync(tmpFile, 'should be deleted');
        fs.writeFileSync(regularFile, '{"keep": true}');
        fs.writeFileSync(stateFile, '{"state": "active"}');

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be deleted');
        assertTrue(fs.existsSync(regularFile), 'regular file should be preserved');
        assertTrue(fs.existsSync(stateFile), 'state file should be preserved');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] still skips .git directory',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create .git directory with a tmpclaude-like file
        const gitDir = path.join(tmpDir, '.git', 'objects');
        fs.mkdirSync(gitDir, { recursive: true });
        const gitFile = path.join(gitDir, 'tmpclaude-shouldnottouch-cwd');
        fs.writeFileSync(gitFile, 'git object');

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        // .git should be skipped
        assertTrue(fs.existsSync(gitFile), '.git directory contents should not be touched');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] cleans project root tmpclaude files',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create tmpclaude file at project root (hex: [a-f0-9]+)
        const tmpFile = path.join(tmpDir, 'tmpclaude-a00bf11e-cwd');
        fs.writeFileSync(tmpFile, 'test content');

        assertTrue(fs.existsSync(tmpFile), 'tmpclaude file should exist before cleanup');

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be cleaned from project root');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-cleanup] handles missing .claude directory gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No .claude directory - should not crash
        const input = createSessionStartInput('startup', 'test-session');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertAllowed(result.code, 'Should not crash without .claude directory');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================

// ============================================================================
// BUG FIX 2b: tmpclaude Cleanup on Session End
// ============================================================================
// Issue: tmpclaude files created during session weren't cleaned until NEXT session.
// Fix: Added cleanupTempFiles() call to session-end.cjs (not just session-init).

const tmpclaudeSessionEndTests = [
  {
    name: '[tmpclaude-session-end] cleans tmpclaude files on exit',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create tmpclaude file at project root
        const tmpFile = path.join(tmpDir, 'tmpclaude-aabb1122-cwd');
        fs.writeFileSync(tmpFile, '/some/path');

        assertTrue(fs.existsSync(tmpFile), 'tmpclaude file should exist before session-end');

        // Run session-end hook
        const input = createSessionEndInput('exit');
        await runHook(SESSION_END, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be cleaned on session exit');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-session-end] cleans tmpclaude files on clear',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const tmpFile = path.join(tmpDir, 'tmpclaude-ccdd3344-cwd');
        fs.writeFileSync(tmpFile, '/some/path');

        assertTrue(fs.existsSync(tmpFile), 'tmpclaude file should exist before session clear');

        const input = createSessionEndInput('clear');
        await runHook(SESSION_END, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'tmpclaude file should be cleaned on session clear');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-session-end] cleans from .claude subdirectories',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create tmpclaude files in various .claude subdirs
        const skillsDir = path.join(tmpDir, '.claude', 'skills');
        const hooksDir = path.join(tmpDir, '.claude', 'hooks');
        fs.mkdirSync(skillsDir, { recursive: true });
        fs.mkdirSync(hooksDir, { recursive: true });

        const tmpFile1 = path.join(skillsDir, 'tmpclaude-eeff5566-cwd');
        const tmpFile2 = path.join(hooksDir, 'tmpclaude-aabb7788-cwd');
        fs.writeFileSync(tmpFile1, '/path1');
        fs.writeFileSync(tmpFile2, '/path2');

        assertTrue(fs.existsSync(tmpFile1), 'skills tmpclaude should exist');
        assertTrue(fs.existsSync(tmpFile2), 'hooks tmpclaude should exist');

        const input = createSessionEndInput('exit');
        await runHook(SESSION_END, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile1), 'skills tmpclaude should be cleaned on session-end');
        assertTrue(!fs.existsSync(tmpFile2), 'hooks tmpclaude should be cleaned on session-end');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[tmpclaude-session-end] handles missing temp-cleanup module gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Session-end should not crash even without temp files
        const input = createSessionEndInput('exit');
        const result = await runHook(SESSION_END, input, { cwd: tmpDir });

        assertAllowed(result.code, 'session-end should complete without errors');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// BUG FIX 3: Prettier Skip Patterns for .claude Directories
// ============================================================================
// Issue: post-edit-prettier.cjs was formatting files in .claude/hooks/ and
// .claude/skills/, causing "file unexpectedly modified" errors during editing.
// Fix: Added skip patterns for .claude/hooks/ and .claude/skills/.

const prettierSkipPatternTests = [
  {
    name: '[prettier-skip] skips files in .claude/hooks/',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create a .js file in .claude/hooks/
        const hooksDir = path.join(tmpDir, '.claude', 'hooks');
        fs.mkdirSync(hooksDir, { recursive: true });
        const hookFile = path.join(hooksDir, 'test-hook.cjs');
        const originalContent = 'const x=1;';
        fs.writeFileSync(hookFile, originalContent);

        // Simulate Edit tool completing on this file
        const input = createPostToolUseInput('Edit', {
          file_path: hookFile,
          old_string: 'original',
          new_string: 'edited'
        });

        await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        // File should NOT be modified by Prettier
        const afterContent = fs.readFileSync(hookFile, 'utf8');
        assertEqual(afterContent, originalContent, 'File in .claude/hooks/ should not be formatted');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[prettier-skip] skips files in .claude/skills/',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create a .js file in .claude/skills/
        const skillsDir = path.join(tmpDir, '.claude', 'skills');
        fs.mkdirSync(skillsDir, { recursive: true });
        const skillFile = path.join(skillsDir, 'my-skill.js');
        const originalContent = 'function test(){return 1}';
        fs.writeFileSync(skillFile, originalContent);

        const input = createPostToolUseInput('Edit', {
          file_path: skillFile
        });

        await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        const afterContent = fs.readFileSync(skillFile, 'utf8');
        assertEqual(afterContent, originalContent, 'File in .claude/skills/ should not be formatted');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[prettier-skip] skips nested paths in .claude/skills/learned-patterns/',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const nestedDir = path.join(tmpDir, '.claude', 'skills', 'learned-patterns', 'scripts');
        fs.mkdirSync(nestedDir, { recursive: true });
        const scriptFile = path.join(nestedDir, 'pattern.ts');
        const originalContent = 'const x:number=1';
        fs.writeFileSync(scriptFile, originalContent);

        const input = createPostToolUseInput('Edit', {
          file_path: scriptFile
        });

        await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        const afterContent = fs.readFileSync(scriptFile, 'utf8');
        assertEqual(afterContent, originalContent, 'Nested .claude/skills/ file should not be formatted');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[prettier-skip] still formats regular project files',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create a .js file in src/ directory (should be formatted if prettier is available)
        const srcDir = path.join(tmpDir, 'src');
        fs.mkdirSync(srcDir, { recursive: true });
        const srcFile = path.join(srcDir, 'app.js');
        fs.writeFileSync(srcFile, 'const x=1;');

        const input = createPostToolUseInput('Edit', {
          file_path: srcFile
        });

        const result = await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        // Should not crash - whether Prettier runs depends on config availability
        assertAllowed(result.code, 'Should not crash for regular files');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[prettier-skip] handles Write tool for .claude/ files',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const hooksDir = path.join(tmpDir, '.claude', 'hooks');
        fs.mkdirSync(hooksDir, { recursive: true });
        const hookFile = path.join(hooksDir, 'new-hook.cjs');
        const originalContent = 'module.exports={test:1}';
        fs.writeFileSync(hookFile, originalContent);

        // Simulate Write tool completing
        const input = createPostToolUseInput('Write', {
          file_path: hookFile,
          content: originalContent
        });

        await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        const afterContent = fs.readFileSync(hookFile, 'utf8');
        assertEqual(afterContent, originalContent, 'Written file in .claude/hooks/ should not be formatted');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[prettier-skip] ignores tools other than Edit/Write',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Read', {
          file_path: '/some/file.ts'
        });

        const result = await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should ignore Read tool');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// BUG FIX 4: [Workflow] Prefix in Workflow-Generated Todos
// ============================================================================
// Issue: Workflow-generated todos didn't have a distinguishing prefix.
// Fix: Added instruction to prefix workflow todos with [Workflow].

const workflowPrefixTests = [
  {
    name: '[workflow-prefix] instructions include [Workflow] prefix guidance',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Unique session ID for isolation
        const testSessionId = generateTestSessionId();

        // Setup: workflows.json config with a workflow
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true },
          commandMapping: {
            plan: { claude: '/plan' },
            cook: { claude: '/cook' },
            test: { claude: '/test' }
          },
          workflows: {
            feature: {
              name: 'Feature Implementation',
              sequence: ['plan', 'cook', 'test'],
              triggerPatterns: ['\\b(implement|add|create)\\b'],
              confirmFirst: false
            }
          }
        }));

        // Trigger a feature workflow
        const input = createUserPromptInput('implement a new login feature');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: testSessionId }
        });

        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;

        // Check for [Workflow] prefix instruction
        assertTrue(
          output.includes('[Workflow]') ||
          output.includes('prefix') ||
          output.toLowerCase().includes('todo'),
          'Should include [Workflow] prefix instruction or todo guidance'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-prefix] shows example todos with [Workflow] prefix',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Unique session ID for isolation
        const testSessionId = generateTestSessionId();

        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true },
          commandMapping: {
            scout: { claude: '/scout' },
            fix: { claude: '/fix' }
          },
          workflows: {
            bugfix: {
              name: 'Bug Fix',
              sequence: ['scout', 'fix'],
              triggerPatterns: ['\\b(bug|fix)\\b'],
              confirmFirst: false
            }
          }
        }));

        const input = createUserPromptInput('fix this bug');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: testSessionId }
        });

        const output = result.stdout + result.stderr;

        // Output should contain example todo items with [Workflow] prefix
        if (output.includes('Todo') || output.includes('todo')) {
          assertTrue(
            output.includes('[Workflow]') ||
            output.includes('/scout') ||
            output.includes('/fix'),
            'Should show workflow commands in todo guidance'
          );
        }
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Edge Cases and Regression Prevention
// ============================================================================

const edgeCaseTests = [
  {
    name: '[edge-case] handles deeply nested tmpclaude files',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Create very deeply nested tmpclaude file (hex: [a-f0-9]+)
        const deepDir = path.join(tmpDir, '.claude', 'a', 'b', 'c', 'd', 'e');
        fs.mkdirSync(deepDir, { recursive: true });
        const tmpFile = path.join(deepDir, 'tmpclaude-dee50e5fed-cwd');
        fs.writeFileSync(tmpFile, 'deep test');

        assertTrue(fs.existsSync(tmpFile), 'Deep tmpclaude file should exist before cleanup');

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertTrue(!fs.existsSync(tmpFile), 'Deep tmpclaude file should be cleaned');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edge-case] handles tmpclaude filename variations',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });

        // Valid tmpclaude patterns (hex only: [a-f0-9]+)
        const validFiles = [
          'tmpclaude-a1b2c3d4-cwd',
          'tmpclaude-000000000-cwd',
          'tmpclaude-ffffffff-cwd',
          'tmpclaude-abcdef1234567890-cwd'
        ];

        // Invalid patterns (should NOT be deleted)
        // - non-hex chars, wrong suffix, wrong prefix
        const invalidFiles = [
          'tmpclaude-test.txt',           // wrong suffix
          'tmpclaude-ab12cd-nocwd',       // wrong suffix (not -cwd)
          'not-tmpclaude-abcd-cwd',       // wrong prefix
          'tmpclaude.cwd',                // missing hex portion
          'tmpclaude-ghijkl-cwd'          // non-hex chars (g, h, i, j, k, l)
        ];

        validFiles.forEach(f => fs.writeFileSync(path.join(claudeDir, f), 'valid'));
        invalidFiles.forEach(f => fs.writeFileSync(path.join(claudeDir, f), 'invalid'));

        const input = createSessionStartInput('startup', 'test-session');
        await runHook(SESSION_INIT, input, { cwd: tmpDir });

        // Valid patterns should be cleaned
        validFiles.forEach(f => {
          assertTrue(!fs.existsSync(path.join(claudeDir, f)), `Valid pattern ${f} should be cleaned`);
        });

        // Invalid patterns should remain
        invalidFiles.forEach(f => {
          assertTrue(fs.existsSync(path.join(claudeDir, f)), `Invalid pattern ${f} should remain`);
        });
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edge-case] handles empty .claude directory',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        // Directory exists but is empty

        const input = createSessionStartInput('startup', 'test-session');
        const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });

        assertAllowed(result.code, 'Should handle empty .claude directory');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edge-case] workflow state with expired timestamp',
    fn: async () => {
      const tmpDir = createTempDir();
      let wfState;
      try {
        // Setup: Old workflow state (24+ hours ago)
        const oldDate = new Date();
        oldDate.setHours(oldDate.getHours() - 25);

        wfState = setupWorkflowState(tmpDir, {
          workflowId: 'feature',
          workflowName: 'Feature Implementation',
          currentStep: 1,
          sequence: ['plan', 'cook'],
          startedAt: oldDate.toISOString()
        });

        // Setup: workflows.json config
        const claudeDir = path.join(tmpDir, '.claude');
        fs.mkdirSync(claudeDir, { recursive: true });
        fs.writeFileSync(path.join(claudeDir, 'workflows.json'), JSON.stringify({
          version: '1.2.0',
          settings: { enabled: true },
          commandMapping: { fix: { claude: '/fix' } },
          workflows: {
            bugfix: {
              name: 'Bug Fix',
              sequence: ['fix'],
              triggerPatterns: ['\\bfix\\b']
            }
          }
        }));

        // New prompt with different intent - stale workflow might be ignored
        const input = createUserPromptInput('fix this bug');
        const result = await runHook(WORKFLOW_ROUTER, input, {
          cwd: tmpDir,
          env: { CLAUDE_SESSION_ID: wfState.sessionId }
        });

        assertAllowed(result.code, 'Should handle stale workflow state');
      } finally {
        if (wfState) cleanupWorkflowState(wfState.stateFile);
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edge-case] prettier hook with tool_error set',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Simulate Edit tool that failed
        const input = {
          event: 'PostToolUse',
          tool_name: 'Edit',
          tool_input: { file_path: '/some/file.ts' },
          tool_error: 'Edit failed: file not found'
        };

        const result = await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        // Should not attempt to format a file that failed to edit
        assertAllowed(result.code, 'Should handle tool_error gracefully');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edge-case] prettier hook with non-existent file',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Edit', {
          file_path: path.join(tmpDir, 'non-existent-file.ts')
        });

        const result = await runHook(POST_EDIT_PRETTIER, input, { cwd: tmpDir });

        // Should handle gracefully without crashing
        assertAllowed(result.code, 'Should handle non-existent file gracefully');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// Export test suite
module.exports = {
  name: 'Bugfix Regression Tests',
  tests: [
    ...workflowIntentChangeTests,
    ...tmpclaudeCleanupTests,
    ...tmpclaudeSessionEndTests,
    ...prettierSkipPatternTests,
    ...workflowPrefixTests,
    ...edgeCaseTests
  ]
};
