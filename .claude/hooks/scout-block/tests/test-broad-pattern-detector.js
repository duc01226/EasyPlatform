#!/usr/bin/env node
/**
 * test-broad-pattern-detector.js - Unit tests for broad pattern detection
 *
 * Tests the detection of overly broad glob patterns that would fill context.
 */

const {
  isBroadPattern,
  hasSpecificDirectory,
  isHighLevelPath,
  detectBroadPatternIssue,
  suggestSpecificPatterns
} = require('../broad-pattern-detector.cjs');

// === isBroadPattern tests ===
const broadPatternTests = [
  // Should be detected as broad - TypeScript/JavaScript
  { pattern: '**/*', expected: true, desc: 'all files everywhere' },
  { pattern: '**', expected: true, desc: 'double star alone' },
  { pattern: '*', expected: true, desc: 'single star alone' },
  { pattern: '**/.*', expected: true, desc: 'all dotfiles' },
  { pattern: '**/*.ts', expected: true, desc: 'all .ts files' },
  { pattern: '**/*.tsx', expected: true, desc: 'all .tsx files' },
  { pattern: '**/*.js', expected: true, desc: 'all .js files' },
  { pattern: '**/*.{ts,tsx}', expected: true, desc: 'all TS files with braces' },
  { pattern: '**/*.{js,jsx,ts,tsx}', expected: true, desc: 'all JS/TS files' },
  { pattern: '**/index.ts', expected: true, desc: 'all index.ts files' },
  { pattern: '*.ts', expected: true, desc: 'root .ts files' },
  { pattern: '*.{ts,tsx}', expected: true, desc: 'root TS files with braces' },

  // Should be detected as broad - Python
  { pattern: '**/*.py', expected: true, desc: 'all .py files' },
  { pattern: '**/*.ipynb', expected: true, desc: 'all Jupyter notebooks' },
  { pattern: '**/requirements.txt', expected: true, desc: 'all requirements.txt' },

  // Should be detected as broad - Other languages
  { pattern: '**/*.java', expected: true, desc: 'all Java files' },
  { pattern: '**/*.go', expected: true, desc: 'all Go files' },
  { pattern: '**/*.rs', expected: true, desc: 'all Rust files' },
  { pattern: '**/*.rb', expected: true, desc: 'all Ruby files' },
  { pattern: '**/*.c', expected: true, desc: 'all C files' },
  { pattern: '**/*.cpp', expected: true, desc: 'all C++ files' },

  // Should be detected as broad - Config/Data
  { pattern: '**/*.json', expected: true, desc: 'all JSON files' },
  { pattern: '**/*.yaml', expected: true, desc: 'all YAML files' },
  { pattern: '**/*.md', expected: true, desc: 'all Markdown files' },

  // Should NOT be detected as broad (specific)
  { pattern: 'src/**/*.ts', expected: false, desc: 'src scoped .ts files' },
  { pattern: 'lib/**/*.js', expected: false, desc: 'lib scoped .js files' },
  { pattern: 'components/**/*.tsx', expected: false, desc: 'components scoped' },
  { pattern: 'app/routes/*.ts', expected: false, desc: 'specific app path' },
  { pattern: 'package.json', expected: false, desc: 'specific file' },
  { pattern: 'src/index.ts', expected: false, desc: 'specific file path' },
  { pattern: 'scripts/**/*.py', expected: false, desc: 'scoped Python files' },
  { pattern: null, expected: false, desc: 'null pattern' },
  { pattern: '', expected: false, desc: 'empty pattern' },
];

// === hasSpecificDirectory tests ===
const specificDirTests = [
  { pattern: 'src/**/*.ts', expected: true, desc: 'starts with src/' },
  { pattern: 'lib/**/*.js', expected: true, desc: 'starts with lib/' },
  { pattern: 'app/routes/*.ts', expected: true, desc: 'starts with app/' },
  { pattern: 'components/**/*.tsx', expected: true, desc: 'starts with components/' },
  { pattern: './src/**/*.ts', expected: true, desc: 'starts with ./src/' },
  { pattern: 'mydir/**/*.ts', expected: true, desc: 'custom dir prefix' },
  { pattern: 'packages/web/**/*.ts', expected: true, desc: 'packages scoped' },

  { pattern: '**/*.ts', expected: false, desc: 'no directory prefix' },
  { pattern: '*.ts', expected: false, desc: 'root only' },
  { pattern: null, expected: false, desc: 'null' },
];

// === isHighLevelPath tests ===
const highLevelPathTests = [
  // High level (risky)
  { path: null, expected: true, desc: 'null path (uses CWD)' },
  { path: undefined, expected: true, desc: 'undefined path' },
  { path: '.', expected: true, desc: 'current directory' },
  { path: './', expected: true, desc: 'current directory with slash' },
  { path: '', expected: true, desc: 'empty path' },
  { path: '/home/user/worktrees/myproject', expected: true, desc: 'worktree root' },
  { path: 'myproject', expected: true, desc: 'single directory' },

  // Specific (OK)
  { path: 'src/components', expected: false, desc: 'nested in src' },
  { path: 'lib/utils', expected: false, desc: 'nested in lib' },
  { path: 'packages/web/src', expected: false, desc: 'monorepo src' },
  { path: '/home/user/project/src', expected: false, desc: 'absolute with src' },
];

// === detectBroadPatternIssue integration tests ===
const integrationTests = [
  // Should BLOCK
  {
    input: { pattern: '**/*.ts' },
    expected: true,
    desc: 'broad pattern, no path'
  },
  {
    input: { pattern: '**/*.{ts,tsx}', path: '/home/user/worktrees/myproject' },
    expected: true,
    desc: 'broad pattern at worktree'
  },
  {
    input: { pattern: '**/*', path: '.' },
    expected: true,
    desc: 'all files at current dir'
  },
  {
    input: { pattern: '**/index.ts', path: 'myproject' },
    expected: true,
    desc: 'all index.ts at shallow path'
  },

  // Should ALLOW
  {
    input: { pattern: 'src/**/*.ts' },
    expected: false,
    desc: 'scoped to src'
  },
  {
    input: { pattern: '**/*.ts', path: 'src/components' },
    expected: false,
    desc: 'broad pattern but specific path'
  },
  {
    input: { pattern: 'package.json' },
    expected: false,
    desc: 'specific file'
  },
  {
    input: { pattern: 'lib/**/*.js', path: '/home/user/project' },
    expected: false,
    desc: 'scoped pattern'
  },
  {
    input: {},
    expected: false,
    desc: 'no pattern'
  },
  {
    input: null,
    expected: false,
    desc: 'null input'
  },
];

// Run tests
console.log('Testing broad-pattern-detector module...\n');
let passed = 0;
let failed = 0;

// Test isBroadPattern
console.log('\x1b[1m--- isBroadPattern ---\x1b[0m');
for (const test of broadPatternTests) {
  const result = isBroadPattern(test.pattern);
  const success = result === test.expected;
  if (success) {
    console.log(`\x1b[32m✓\x1b[0m ${test.desc}: "${test.pattern}" -> ${result ? 'BROAD' : 'OK'}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${test.desc}: expected ${test.expected ? 'BROAD' : 'OK'}, got ${result ? 'BROAD' : 'OK'}`);
    failed++;
  }
}

// Test hasSpecificDirectory
console.log('\n\x1b[1m--- hasSpecificDirectory ---\x1b[0m');
for (const test of specificDirTests) {
  const result = hasSpecificDirectory(test.pattern);
  const success = result === test.expected;
  if (success) {
    console.log(`\x1b[32m✓\x1b[0m ${test.desc}: "${test.pattern}" -> ${result ? 'HAS_DIR' : 'NO_DIR'}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${test.desc}: expected ${test.expected ? 'HAS_DIR' : 'NO_DIR'}, got ${result ? 'HAS_DIR' : 'NO_DIR'}`);
    failed++;
  }
}

// Test isHighLevelPath
console.log('\n\x1b[1m--- isHighLevelPath ---\x1b[0m');
for (const test of highLevelPathTests) {
  const result = isHighLevelPath(test.path);
  const success = result === test.expected;
  if (success) {
    console.log(`\x1b[32m✓\x1b[0m ${test.desc}: "${test.path}" -> ${result ? 'HIGH_LEVEL' : 'SPECIFIC'}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${test.desc}: expected ${test.expected ? 'HIGH_LEVEL' : 'SPECIFIC'}, got ${result ? 'HIGH_LEVEL' : 'SPECIFIC'}`);
    failed++;
  }
}

// Test integration
console.log('\n\x1b[1m--- detectBroadPatternIssue (integration) ---\x1b[0m');
for (const test of integrationTests) {
  const result = detectBroadPatternIssue(test.input);
  const success = result.blocked === test.expected;
  if (success) {
    console.log(`\x1b[32m✓\x1b[0m ${test.desc} -> ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`);
    passed++;
  } else {
    console.log(`\x1b[31m✗\x1b[0m ${test.desc}: expected ${test.expected ? 'BLOCKED' : 'ALLOWED'}, got ${result.blocked ? 'BLOCKED' : 'ALLOWED'}`);
    failed++;
  }
}

// Test suggestions
console.log('\n\x1b[1m--- suggestSpecificPatterns ---\x1b[0m');
const suggestions = suggestSpecificPatterns('**/*.ts');
if (suggestions.length > 0 && suggestions.some(s => s.includes('src/'))) {
  console.log(`\x1b[32m✓\x1b[0m suggestions for **/*.ts include src-scoped patterns`);
  passed++;
} else {
  console.log(`\x1b[31m✗\x1b[0m suggestions should include src-scoped patterns`);
  failed++;
}

console.log(`\n\x1b[1mResults:\x1b[0m ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
