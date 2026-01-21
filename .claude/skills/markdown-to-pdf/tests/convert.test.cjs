#!/usr/bin/env node
/**
 * Integration tests for markdown-to-pdf skill
 * Run: node tests/convert.test.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SKILL_DIR = path.join(__dirname, '..');
const CONVERT_SCRIPT = path.join(SKILL_DIR, 'scripts', 'convert.cjs');
const TEST_DIR = path.join(SKILL_DIR, 'tests', 'fixtures');
const OUTPUT_DIR = path.join(SKILL_DIR, 'tests', 'output');

// Test state
let passed = 0;
let failed = 0;

/**
 * Test helper - run CLI and parse JSON output
 */
function runConvert(args) {
  try {
    const result = execSync(`node "${CONVERT_SCRIPT}" ${args}`, {
      encoding: 'utf8',
      cwd: SKILL_DIR
    });
    return JSON.parse(result.trim());
  } catch (err) {
    // Even on exit code 1, we may have JSON in stdout
    if (err.stdout) {
      try {
        return JSON.parse(err.stdout.trim());
      } catch {
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: err.message };
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${message}`);
    failed++;
  }
}

/**
 * Setup test fixtures
 */
function setup() {
  // Create test directories
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Create test markdown file
  const testMd = `# Test Document

This is a test markdown file for PDF conversion.

## Features

- Item 1
- Item 2
- Item 3

## Code Block

\`\`\`javascript
console.log('Hello, PDF!');
\`\`\`

## Table

| Column A | Column B |
| -------- | -------- |
| Value 1  | Value 2  |
`;
  fs.writeFileSync(path.join(TEST_DIR, 'test.md'), testMd);

  // Create custom CSS
  const customCss = `body { font-family: serif; }`;
  fs.writeFileSync(path.join(TEST_DIR, 'custom.css'), customCss);
}

/**
 * Cleanup test outputs
 */
function cleanup() {
  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    const files = fs.readdirSync(OUTPUT_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }

  // Clean any generated PDFs in fixtures
  const fixtureFiles = fs.readdirSync(TEST_DIR);
  for (const file of fixtureFiles) {
    if (file.endsWith('.pdf')) {
      fs.unlinkSync(path.join(TEST_DIR, file));
    }
  }
}

/**
 * Test: Missing --file argument
 */
function testMissingFile() {
  console.log('\nTest: Missing --file argument');
  const result = runConvert('');
  assert(result.success === false || result.error, 'Returns error when file missing');
}

/**
 * Test: File not found
 */
function testFileNotFound() {
  console.log('\nTest: File not found');
  const result = runConvert('--file ./nonexistent.md');
  assert(result.success === false, 'Returns success: false');
  assert(result.error && result.error.includes('not found'), 'Error message mentions not found');
}

/**
 * Test: Basic conversion
 */
function testBasicConversion() {
  console.log('\nTest: Basic conversion');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const outputPath = path.join(OUTPUT_DIR, 'basic.pdf');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(fs.existsSync(outputPath), 'PDF file created');
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    assert(stats.size > 1000, 'PDF file has content (>1KB)');
  }
}

/**
 * Test: Custom CSS
 */
function testCustomCss() {
  console.log('\nTest: Custom CSS');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const outputPath = path.join(OUTPUT_DIR, 'styled.pdf');
  const cssPath = path.join(TEST_DIR, 'custom.css');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}" --style "${cssPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(fs.existsSync(outputPath), 'PDF file created with custom styling');
}

/**
 * Test: Default output path
 */
function testDefaultOutput() {
  console.log('\nTest: Default output path');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const expectedOutput = path.join(TEST_DIR, 'test.pdf');

  // Clean up any existing output
  if (fs.existsSync(expectedOutput)) {
    fs.unlinkSync(expectedOutput);
  }

  const result = runConvert(`--file "${inputPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(result.output.endsWith('test.pdf'), 'Output path ends with test.pdf');

  // Cleanup
  if (fs.existsSync(expectedOutput)) {
    fs.unlinkSync(expectedOutput);
  }
}

/**
 * Test: JSON output format
 */
function testJsonFormat() {
  console.log('\nTest: JSON output format');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const outputPath = path.join(OUTPUT_DIR, 'json-test.pdf');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(typeof result === 'object', 'Output is JSON object');
  assert('success' in result, 'Has success field');
  assert('input' in result, 'Has input field');
  assert('output' in result, 'Has output field');
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Markdown to PDF - Integration Tests');
  console.log('===================================');

  // Check if md-to-pdf is installed
  try {
    require('md-to-pdf');
  } catch {
    console.log('\n[WARN] md-to-pdf not installed. Run: npm install');
    console.log('       Skipping tests that require md-to-pdf.\n');

    // Run tests that don't require conversion
    testMissingFile();

    console.log('\n-----------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
    return;
  }

  setup();

  try {
    testMissingFile();
    testFileNotFound();
    testBasicConversion();
    testCustomCss();
    testDefaultOutput();
    testJsonFormat();
  } finally {
    cleanup();
  }

  console.log('\n-----------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error(`Test runner error: ${err.message}`);
  process.exit(1);
});
