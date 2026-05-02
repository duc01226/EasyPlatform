#!/usr/bin/env node

/**
 * Test runner for docx-to-markdown
 */

const path = require('path');

console.log('='.repeat(60));
console.log('docx-to-markdown Test Suite');
console.log('='.repeat(60) + '\n');

// Run test suites
require('./converter.test.cjs');

// Print summary
const { printSummary } = require('./test-framework.cjs');
const success = printSummary();

process.exit(success ? 0 : 1);
