/**
 * Minimal test framework for skill testing
 * Provides describe/it/assert pattern without external dependencies
 */

const assert = require('assert');

const suites = [];
let currentSuite = null;

/**
 * Define a test suite
 * @param {string} name - Suite name
 * @param {Function} fn - Suite function containing tests
 */
global.describe = function(name, fn) {
  const suite = { name, tests: [] };
  suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
};

/**
 * Define a test case
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 */
global.it = function(name, fn) {
  if (currentSuite) {
    currentSuite.tests.push({ name, fn });
  }
};

/**
 * Make assert available globally
 */
global.assert = assert;

/**
 * Run all registered test suites
 * @returns {Promise<{passed: number, failed: number}>}
 */
global.runAllTests = async function() {
  let passed = 0;
  let failed = 0;
  const results = {};

  for (const suite of suites) {
    console.log(`\n  ${suite.name}`);
    results[suite.name] = { passed: 0, failed: 0 };

    for (const test of suite.tests) {
      try {
        await test.fn();
        console.log(`    \x1b[32m✓\x1b[0m ${test.name}`);
        passed++;
        results[suite.name].passed++;
      } catch (error) {
        console.log(`    \x1b[31m✗\x1b[0m ${test.name}`);
        console.log(`      \x1b[31m${error.message}\x1b[0m`);
        failed++;
        results[suite.name].failed++;
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60) + '\n');

  for (const [name, counts] of Object.entries(results)) {
    const status = counts.failed === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`${status}: ${name} (${counts.passed}/${counts.passed + counts.failed})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(60));

  return { passed, failed };
};

module.exports = { suites };
