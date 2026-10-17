#!/usr/bin/env node

/**
 * Test runner for pdf-convert/to-pdf
 */

const fs = require('fs');
const path = require('path');

// Load test framework
require('./test-framework.cjs');

const testsDir = __dirname;
const testFiles = [
  'chrome-finder.test.cjs',
  'converter.test.cjs'
];

console.log('\n' + '='.repeat(60));
console.log('pdf-convert/to-pdf Test Suite');
console.log('='.repeat(60));

// Load test files
for (const testFile of testFiles) {
  const testPath = path.join(testsDir, testFile);
  if (fs.existsSync(testPath)) {
    try {
      require(testPath);
    } catch (error) {
      console.error(`Error loading ${testFile}: ${error.message}`);
    }
  } else {
    console.log(`Skipping ${testFile} (not found)`);
  }
}

// Run all tests — await the async runner and own the exit code here, so a
// rejected run can never leave the process exiting 0.
global.runAllTests()
  .then(() => {
    process.exit(global.testStats.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(`\nTest run failed: ${error && error.stack ? error.stack : error}`);
    process.exit(1);
  });
