#!/usr/bin/env node
/**
 * test-path-boundary-block.js - Unit tests for path-boundary-block hook
 *
 * Tests project boundary enforcement for Claude Code file access.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const HOOK_PATH = path.join(__dirname, '..', 'path-boundary-block.cjs');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * Run the hook with given input
 * @param {object} hookData - Hook input data
 * @param {object} options - Options (cwd, env)
 * @returns {Promise<{code: number, stderr: string}>}
 */
async function runHook(hookData, options = {}) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      CLAUDE_PROJECT_DIR: options.projectDir || PROJECT_ROOT,
      ...options.env
    };

    const proc = spawn('node', [HOOK_PATH], {
      cwd: options.cwd || PROJECT_ROOT,
      env
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stderr });
    });

    proc.stdin.write(JSON.stringify(hookData));
    proc.stdin.end();
  });
}

// ============================================================================
// Test Cases
// ============================================================================

// Tests for paths INSIDE project (should ALLOW)
const allowTests = [
  {
    name: 'project file (absolute) - should allow',
    input: { tool_input: { file_path: path.join(PROJECT_ROOT, 'CLAUDE.md') } },
    expectBlock: false
  },
  {
    name: 'project file (relative) - should allow',
    input: { tool_input: { file_path: './src/index.ts' } },
    expectBlock: false
  },
  {
    name: 'project subdir (relative) - should allow',
    input: { tool_input: { file_path: 'src/Services/Growth/file.cs' } },
    expectBlock: false
  },
  {
    name: 'project root itself - should allow',
    input: { tool_input: { file_path: PROJECT_ROOT } },
    expectBlock: false
  },
  {
    name: 'new file in project - should allow',
    input: { tool_input: { file_path: path.join(PROJECT_ROOT, 'new-file.txt') } },
    expectBlock: false
  },
  {
    name: 'nested path in project - should allow',
    input: { tool_input: { file_path: '.claude/hooks/test.js' } },
    expectBlock: false
  }
];

// Tests for temp directories (should ALLOW)
const tempDirTests = [
  {
    name: 'system TEMP directory - should allow',
    input: { tool_input: { file_path: path.join(os.tmpdir(), 'test.log') } },
    expectBlock: false
  },
  // /tmp only exists on Unix systems
  ...(process.platform !== 'win32' ? [{
    name: '/tmp directory - should allow',
    input: { tool_input: { file_path: '/tmp/build.log' } },
    expectBlock: false
  }] : [])
];

// Tests for paths OUTSIDE project (should BLOCK)
const blockTests = [
  {
    name: 'absolute path outside project - should block',
    input: { tool_input: { file_path: 'D:/OtherProject/file.txt' } },
    expectBlock: true,
    expectContains: 'outside project boundary'
  },
  {
    name: 'windows system path - should block',
    input: { tool_input: { file_path: 'C:/Windows/System32/config/SAM' } },
    expectBlock: true
  },
  {
    name: 'linux root path - should block',
    input: { tool_input: { file_path: '/etc/passwd' } },
    expectBlock: true
  },
  {
    name: 'home directory ssh keys - should block',
    input: { tool_input: { file_path: '~/.ssh/id_rsa' } },
    expectBlock: true
  },
  {
    name: 'home directory aws - should block',
    input: { tool_input: { file_path: '~/.aws/credentials' } },
    expectBlock: true
  },
  {
    name: 'UNC path - should block',
    input: { tool_input: { file_path: '\\\\server\\share\\file.txt' } },
    expectBlock: true
  }
];

// Tests for path traversal attacks (should BLOCK)
const traversalTests = [
  {
    name: 'path traversal (../) - should block',
    input: { tool_input: { file_path: '../../../etc/passwd' } },
    expectBlock: true
  },
  {
    name: 'path traversal mixed - should block',
    input: { tool_input: { file_path: 'src/../../OtherProject/file.txt' } },
    expectBlock: true
  },
  {
    name: 'URL-encoded traversal (%2e%2e) - should block',
    input: { tool_input: { file_path: '%2e%2e/%2e%2e/secret.txt' } },
    expectBlock: true
  },
  // Double-encoded stays encoded after single decode (standard behavior)
  // %252e -> %2e (still encoded, not a traversal attack)
  {
    name: 'double-encoded traversal - should allow (only single decode)',
    input: { tool_input: { file_path: '%252e%252e/secret.txt' } },
    expectBlock: false
  }
];

// Tests for Bash commands with file paths
const bashTests = [
  {
    name: 'bash cat with outside path - should block',
    input: { tool_input: { command: 'cat /etc/passwd' } },
    expectBlock: true
  },
  {
    name: 'bash with absolute outside path - should block',
    input: { tool_input: { command: 'head D:/OtherProject/secret.txt' } },
    expectBlock: true
  },
  {
    name: 'bash with project path - should allow',
    input: { tool_input: { command: `cat ${path.join(PROJECT_ROOT, 'CLAUDE.md')}` } },
    expectBlock: false
  },
  {
    name: 'bash redirect outside project - should block',
    input: { tool_input: { command: 'echo "data" > /tmp/../../etc/test' } },
    expectBlock: true
  }
];

// Tests for MCP filesystem tools
const mcpTests = [
  {
    name: 'MCP read file outside project - should block',
    input: {
      tool_name: 'mcp__filesystem__read_text_file',
      tool_input: { path: 'D:/OtherProject/config.json' }
    },
    expectBlock: true
  },
  {
    name: 'MCP read multiple with one outside - should block',
    input: {
      tool_name: 'mcp__filesystem__read_multiple_files',
      tool_input: { paths: [path.join(PROJECT_ROOT, 'file1.txt'), 'D:/Outside/file2.txt'] }
    },
    expectBlock: true
  },
  {
    name: 'MCP read file inside project - should allow',
    input: {
      tool_name: 'mcp__filesystem__read_text_file',
      tool_input: { path: path.join(PROJECT_ROOT, 'CLAUDE.md') }
    },
    expectBlock: false
  }
];

// Tests for NotebookEdit tool
const notebookTests = [
  {
    name: 'notebook outside project - should block',
    input: { tool_input: { notebook_path: 'D:/OtherProject/analysis.ipynb' } },
    expectBlock: true
  },
  {
    name: 'notebook inside project - should allow',
    input: { tool_input: { notebook_path: path.join(PROJECT_ROOT, 'notebooks/test.ipynb') } },
    expectBlock: false
  }
];

// Tests for config toggle
const configTests = [
  {
    name: 'pathBoundary: false - outside path should allow',
    input: { tool_input: { file_path: 'D:/OtherProject/file.txt' } },
    config: { pathBoundary: false },
    expectBlock: false
  },
  {
    name: 'pathBoundary: true - outside path should block',
    input: { tool_input: { file_path: 'D:/OtherProject/file.txt' } },
    config: { pathBoundary: true },
    expectBlock: true
  },
  {
    name: 'pathBoundaryAllowedDirs - custom dir should allow',
    input: { tool_input: { file_path: 'D:/AllowedDir/file.txt' } },
    config: { pathBoundaryAllowedDirs: ['D:/AllowedDir'] },
    expectBlock: false
  }
];

// Edge cases
const edgeCaseTests = [
  {
    name: 'empty path - should allow',
    input: { tool_input: { file_path: '' } },
    expectBlock: false
  },
  {
    name: 'null input - should allow',
    input: { tool_input: null },
    expectBlock: false
  },
  {
    name: 'missing tool_input - should allow',
    input: {},
    expectBlock: false
  },
  {
    name: 'invalid JSON - should allow (fail-open)',
    rawInput: 'not json',
    expectBlock: false
  }
];

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Run hook with temp config file
 */
async function runWithConfig(input, config) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boundary-test-'));
  const tmpClaudeDir = path.join(tmpDir, '.claude');
  fs.mkdirSync(tmpClaudeDir, { recursive: true });
  fs.writeFileSync(path.join(tmpClaudeDir, '.ck.json'), JSON.stringify(config));

  const result = await runHook(input, { cwd: tmpDir, projectDir: PROJECT_ROOT });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return result;
}

/**
 * Run hook with raw (non-JSON) input
 */
async function runWithRawInput(rawInput) {
  return new Promise((resolve) => {
    const proc = spawn('node', [HOOK_PATH], {
      env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_ROOT }
    });
    let stderr = '';
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => resolve({ code, stderr }));
    proc.stdin.write(rawInput);
    proc.stdin.end();
  });
}

async function runTestGroup(groupName, tests, options = {}) {
  console.log(`\n\x1b[1m--- ${groupName} ---\x1b[0m`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = test.config ? await runWithConfig(test.input, test.config)
      : test.rawInput ? await runWithRawInput(test.rawInput)
      : await runHook(test.input, options);

    const blocked = result.code === 2;
    const success = blocked === test.expectBlock;
    const containsOk = !test.expectContains || result.stderr.includes(test.expectContains);

    if (success && containsOk) {
      console.log(`\x1b[32m✓\x1b[0m ${test.name}`);
      passed++;
    } else {
      console.log(`\x1b[31m✗\x1b[0m ${test.name}: expected ${test.expectBlock ? 'BLOCK' : 'ALLOW'}, got ${blocked ? 'BLOCK' : 'ALLOW'}`);
      if (result.stderr && !success) {
        console.log(`  stderr: ${result.stderr.slice(0, 200)}`);
      }
      failed++;
    }
  }

  return { passed, failed };
}

async function main() {
  console.log('Testing path-boundary-block hook...');
  console.log(`Project root: ${PROJECT_ROOT}\n`);

  let totalPassed = 0;
  let totalFailed = 0;

  // Run all test groups
  const groups = [
    ['Allow Tests (inside project)', allowTests],
    ['Temp Directory Tests', tempDirTests],
    ['Block Tests (outside project)', blockTests],
    ['Path Traversal Tests', traversalTests],
    ['Bash Command Tests', bashTests],
    ['MCP Filesystem Tests', mcpTests],
    ['NotebookEdit Tests', notebookTests],
    ['Config Toggle Tests', configTests],
    ['Edge Cases', edgeCaseTests]
  ];

  for (const [name, tests] of groups) {
    const { passed, failed } = await runTestGroup(name, tests);
    totalPassed += passed;
    totalFailed += failed;
  }

  // Summary
  console.log(`\n\x1b[1m========================================\x1b[0m`);
  console.log(`\x1b[1mResults:\x1b[0m ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`\x1b[1m========================================\x1b[0m`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
