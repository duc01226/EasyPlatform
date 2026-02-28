/**
 * Minimal test framework for pdf-to-markdown
 * Self-contained, no external dependencies
 */

const results = { passed: 0, failed: 0, suites: {} };

function describe(suiteName, fn) {
  results.suites[suiteName] = { passed: 0, failed: 0, tests: [] };
  global.__currentSuite = suiteName;
  fn();
}

function it(testName, fn) {
  const suite = results.suites[global.__currentSuite];
  try {
    fn();
    suite.passed++;
    results.passed++;
    suite.tests.push({ name: testName, passed: true });
    console.log(`    \x1b[32m✓\x1b[0m ${testName}`);
  } catch (error) {
    suite.failed++;
    results.failed++;
    suite.tests.push({ name: testName, passed: false, error: error.message });
    console.log(`    \x1b[31m✗\x1b[0m ${testName}`);
    console.log(`      Error: ${error.message}`);
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${JSON.stringify(actual)}`);
      }
    },
    toContain(expected) {
      if (typeof actual === 'string') {
        if (!actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
        }
      }
    },
    toThrow(expectedMessage) {
      let threw = false;
      let errorMessage = '';
      try {
        actual();
      } catch (e) {
        threw = true;
        errorMessage = e.message;
      }
      if (!threw) {
        throw new Error('Expected function to throw');
      }
      if (expectedMessage && !errorMessage.includes(expectedMessage)) {
        throw new Error(`Expected error to contain "${expectedMessage}", got "${errorMessage}"`);
      }
    },
    toBeOneOf(expected) {
      if (!expected.includes(actual)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be one of ${JSON.stringify(expected)}`);
      }
    }
  };
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60) + '\n');

  for (const [suiteName, suite] of Object.entries(results.suites)) {
    const status = suite.failed === 0 ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`${status}: ${suiteName} (${suite.passed}/${suite.passed + suite.failed})`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${results.passed + results.failed} | Passed: ${results.passed} | Failed: ${results.failed}`);
  console.log('='.repeat(60));

  return results.failed === 0;
}

module.exports = { describe, it, expect, printSummary, results };
