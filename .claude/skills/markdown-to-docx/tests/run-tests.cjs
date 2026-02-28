#!/usr/bin/env node

/**
 * Test runner for markdown-to-docx skill
 */

const fs = require('fs');
const path = require('path');

// Load test framework
require('./test-framework.cjs');

const testsDir = __dirname;
const testFiles = ['converter.test.cjs'];

console.log('\n' + '='.repeat(60));
console.log('markdown-to-docx Test Suite');
console.log('='.repeat(60));

// Load test files
for (const testFile of testFiles) {
  const testPath = path.join(testsDir, testFile);
  if (fs.existsSync(testPath)) {
    try {
      require(testPath);
    } catch (error) {
      console.error(`\nError loading ${testFile}: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    }
  } else {
    console.log(`Skipping ${testFile} (not found)`);
  }
}

// Run all tests
global.runAllTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
});
