#!/usr/bin/env node

/**
 * Test runner for markdown-to-pdf skill
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
console.log('markdown-to-pdf Test Suite');
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

// Run all tests
global.runAllTests();
