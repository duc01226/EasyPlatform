#!/usr/bin/env node
/**
 * Integration tests for markdown-to-docx skill
 * Run: node tests/convert.test.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

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

This is a test markdown file for DOCX conversion.

## Features

- Item 1
- Item 2
- Item 3

## Code Block

\`\`\`javascript
console.log('Hello, DOCX!');
\`\`\`

## Table

| Column A | Column B |
| -------- | -------- |
| Value 1  | Value 2  |

## Link

[Example Link](https://example.com)
`;
  fs.writeFileSync(path.join(TEST_DIR, 'test.md'), testMd);
}

/**
 * Cleanup test outputs
 */
function cleanup() {
  // Clean output directory
  if (fs.existsSync(OUTPUT_DIR)) {
    for (const file of fs.readdirSync(OUTPUT_DIR)) {
      fs.unlinkSync(path.join(OUTPUT_DIR, file));
    }
  }

  // Clean any generated DOCX in fixtures
  for (const file of fs.readdirSync(TEST_DIR)) {
    if (file.endsWith('.docx')) {
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
  const outputPath = path.join(OUTPUT_DIR, 'basic.docx');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(fs.existsSync(outputPath), 'DOCX file created');
  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    assert(stats.size > 1000, 'DOCX file has content (>1KB)');
  }
}

/**
 * Test: Default output path
 */
function testDefaultOutput() {
  console.log('\nTest: Default output path');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const expectedOutput = path.join(TEST_DIR, 'test.docx');

  // Clean up any existing output
  if (fs.existsSync(expectedOutput)) {
    fs.unlinkSync(expectedOutput);
  }

  const result = runConvert(`--file "${inputPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(result.output.endsWith('test.docx'), 'Output path ends with test.docx');

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
  const outputPath = path.join(OUTPUT_DIR, 'json-test.docx');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(typeof result === 'object', 'Output is JSON object');
  assert('success' in result, 'Has success field');
  assert('input' in result, 'Has input field');
  assert('output' in result, 'Has output field');
  assert('wordCount' in result || !result.success, 'Has wordCount field on success');
}

/**
 * Test: Word count
 */
function testWordCount() {
  console.log('\nTest: Word count');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const outputPath = path.join(OUTPUT_DIR, 'wordcount.docx');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(result.success === true, 'Conversion successful');
  assert(typeof result.wordCount === 'number', 'wordCount is a number');
  assert(result.wordCount > 0, 'wordCount is positive');
}

/**
 * Test: Path traversal prevention
 */
function testPathTraversal() {
  console.log('\nTest: Path traversal prevention');
  const result = runConvert('--file "../../../etc/passwd"');
  assert(result.success === false, 'Returns success: false for traversal attempt');
}

/**
 * Test: DOCX file validity (magic bytes check)
 */
function testDocxValidity() {
  console.log('\nTest: DOCX file validity');
  const inputPath = path.join(TEST_DIR, 'test.md');
  const outputPath = path.join(OUTPUT_DIR, 'validity.docx');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  if (result.success && fs.existsSync(outputPath)) {
    // DOCX files are ZIP archives - check for ZIP magic bytes (PK)
    const buffer = fs.readFileSync(outputPath);
    const isPK = buffer[0] === 0x50 && buffer[1] === 0x4B;
    assert(isPK, 'DOCX file has valid ZIP signature (PK header)');
  } else {
    assert(false, 'Could not verify DOCX validity - conversion failed');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Markdown to DOCX - Integration Tests');
  console.log('====================================');

  // Check if dependencies are installed
  try {
    await import('markdown-docx');
  } catch {
    console.log('\n[WARN] Dependencies not installed. Run: npm install');
    console.log('       Skipping tests that require conversion.\n');

    // Run tests that don't require conversion
    testMissingFile();

    console.log('\n------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
    return;
  }

  setup();

  try {
    testMissingFile();
    testFileNotFound();
    testBasicConversion();
    testDefaultOutput();
    testJsonFormat();
    testWordCount();
    testPathTraversal();
    testDocxValidity();
  } finally {
    cleanup();
  }

  console.log('\n------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error(`Test runner error: ${err.message}`);
  process.exit(1);
});
