#!/usr/bin/env node
/**
 * Integration tests for pdf-to-markdown skill
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
 * Ensure test PDF exists
 * Uses a pre-existing sample PDF file (tests/fixtures/test.pdf)
 * To update: download from https://raw.githubusercontent.com/py-pdf/pypdf/main/resources/crazyones.pdf
 */
function ensureTestPdf() {
  const testPdfPath = path.join(TEST_DIR, 'test.pdf');

  // Check if valid PDF exists
  if (fs.existsSync(testPdfPath)) {
    const stats = fs.statSync(testPdfPath);
    if (stats.size > 1000) return true;
  }

  console.log('[WARN] Test PDF not found or invalid. Expected at: tests/fixtures/test.pdf');
  console.log('       Download sample PDF manually to run conversion tests.');
  return false;
}

/**
 * Setup test fixtures
 * @returns {boolean} - True if test PDF is available
 */
function setup() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  return ensureTestPdf();
}

/**
 * Cleanup test outputs
 */
function cleanup() {
  if (fs.existsSync(OUTPUT_DIR)) {
    for (const file of fs.readdirSync(OUTPUT_DIR)) {
      const filePath = path.join(OUTPUT_DIR, file);
      if (fs.statSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  }

  // Clean any generated MD in fixtures
  for (const file of fs.readdirSync(TEST_DIR)) {
    if (file.endsWith('.md')) {
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
  const result = runConvert('--file ./nonexistent.pdf');
  assert(result.success === false, 'Returns success: false');
  assert(result.error && result.error.includes('not found'), 'Error message mentions not found');
}

/**
 * Test: Invalid file type
 */
function testInvalidFileType() {
  console.log('\nTest: Invalid file type');
  const txtPath = path.join(TEST_DIR, 'test.txt');
  fs.writeFileSync(txtPath, 'Hello world');

  const result = runConvert(`--file "${txtPath}"`);
  assert(result.success === false, 'Returns success: false for non-pdf');
  assert(result.error && result.error.includes('.pdf'), 'Error mentions .pdf requirement');

  fs.unlinkSync(txtPath);
}

/**
 * Test: Basic conversion
 */
function testBasicConversion() {
  console.log('\nTest: Basic conversion');
  const inputPath = path.join(TEST_DIR, 'test.pdf');
  const outputPath = path.join(OUTPUT_DIR, 'basic.md');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(fs.existsSync(outputPath), 'MD file created');
  if (fs.existsSync(outputPath)) {
    const content = fs.readFileSync(outputPath, 'utf8');
    assert(content.length > 0, 'MD file has content');
  }
}

/**
 * Test: Default output path
 */
function testDefaultOutput() {
  console.log('\nTest: Default output path');
  const inputPath = path.join(TEST_DIR, 'test.pdf');
  const expectedOutput = path.join(TEST_DIR, 'test.md');

  if (fs.existsSync(expectedOutput)) {
    fs.unlinkSync(expectedOutput);
  }

  const result = runConvert(`--file "${inputPath}"`);

  assert(result.success === true, 'Returns success: true');
  assert(result.output.endsWith('test.md'), 'Output path ends with test.md');

  if (fs.existsSync(expectedOutput)) {
    fs.unlinkSync(expectedOutput);
  }
}

/**
 * Test: JSON output format
 */
function testJsonFormat() {
  console.log('\nTest: JSON output format');
  const inputPath = path.join(TEST_DIR, 'test.pdf');
  const outputPath = path.join(OUTPUT_DIR, 'json-test.md');

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
  const inputPath = path.join(TEST_DIR, 'test.pdf');
  const outputPath = path.join(OUTPUT_DIR, 'wordcount.md');

  const result = runConvert(`--file "${inputPath}" --output "${outputPath}"`);

  assert(result.success === true, 'Conversion successful');
  assert(typeof result.wordCount === 'number', 'wordCount is a number');
  assert(result.wordCount >= 0, 'wordCount is non-negative');
}

/**
 * Test: Path traversal prevention
 */
function testPathTraversal() {
  console.log('\nTest: Path traversal prevention');
  const result = runConvert('--file "../../../etc/passwd.pdf"');
  assert(result.success === false, 'Returns success: false for traversal attempt');
}

/**
 * Run all tests
 */
function runTests() {
  console.log('PDF to Markdown - Integration Tests');
  console.log('====================================');

  // Check if dependencies are installed
  try {
    require('pdf-parse');
  } catch {
    console.log('\n[WARN] Dependencies not installed. Run: npm install');
    console.log('       Skipping tests that require conversion.\n');

    testMissingFile();
    testFileNotFound();

    console.log('\n------------------------------------');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
    return;
  }

  const hasTestPdf = setup();

  try {
    testMissingFile();
    testFileNotFound();
    testInvalidFileType();

    if (hasTestPdf) {
      testBasicConversion();
      testDefaultOutput();
      testJsonFormat();
      testWordCount();
    } else {
      console.log('\n[SKIP] Skipping conversion tests - no valid test.pdf');
    }

    testPathTraversal();
  } finally {
    cleanup();
  }

  console.log('\n------------------------------------');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
try {
  runTests();
} catch (err) {
  console.error(`Test runner error: ${err.message}`);
  process.exit(1);
}
