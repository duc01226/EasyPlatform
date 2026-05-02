/**
 * Simple test framework for Node.js (mocha-like)
 * Provides describe/it/before/after/assert without external dependencies
 */

global.testStats = {
  total: 0,
  passed: 0,
  failed: 0,
  suites: [],
  currentSuite: null
};

class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeFn = null;
    this.afterFn = null;
  }

  addTest(name, fn) {
    this.tests.push({ name, fn });
  }

  setBefore(fn) {
    this.beforeFn = fn;
  }

  setAfter(fn) {
    this.afterFn = fn;
  }

  async run() {
    const results = {
      name: this.name,
      passed: 0,
      failed: 0,
      errors: []
    };

    console.log(`\n  ${this.name}`);

    for (const test of this.tests) {
      try {
        if (this.beforeFn) await this.beforeFn();
        await test.fn();
        if (this.afterFn) await this.afterFn();

        results.passed++;
        process.stdout.write('    ✓ ' + test.name + '\n');
      } catch (error) {
        results.failed++;
        results.errors.push({ test: test.name, error: error.message });
        process.stdout.write('    ✗ ' + test.name + '\n');
        console.log('      Error: ' + error.message);
      }
    }

    return results;
  }
}

global.testSuites = {};

global.describe = function(name, fn) {
  const suite = new TestSuite(name);
  global.testStats.currentSuite = suite;
  global.testSuites[name] = suite;
  fn();
};

global.it = function(name, fn) {
  if (!global.testStats.currentSuite) {
    throw new Error('it() called outside describe()');
  }
  global.testStats.currentSuite.addTest(name, fn);
};

global.before = function(fn) {
  if (global.testStats.currentSuite) {
    global.testStats.currentSuite.setBefore(fn);
  }
};

global.after = function(fn) {
  if (global.testStats.currentSuite) {
    global.testStats.currentSuite.setAfter(fn);
  }
};

// Simple assertion helper
global.assert = {
  ok: (value, msg) => {
    if (!value) throw new Error(msg || 'Assertion failed: expected truthy value');
  },
  equal: (a, b, msg) => {
    if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} to equal ${JSON.stringify(b)}`);
  },
  deepEqual: (a, b, msg) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error(msg || `Expected ${JSON.stringify(a)} to deep equal ${JSON.stringify(b)}`);
    }
  },
  throws: async (fn, msg) => {
    try {
      await fn();
      throw new Error(msg || 'Expected function to throw');
    } catch (e) {
      if (e.message === (msg || 'Expected function to throw')) throw e;
    }
  },
  notEqual: (a, b, msg) => {
    if (a === b) throw new Error(msg || `Expected ${JSON.stringify(a)} to not equal ${JSON.stringify(b)}`);
  }
};

global.runAllTests = async function() {
  console.log('\n' + '='.repeat(60));
  console.log('Running Tests');
  console.log('='.repeat(60));

  const results = [];
  for (const suite of Object.values(global.testSuites)) {
    const result = await suite.run();
    results.push(result);
    global.testStats.passed += result.passed;
    global.testStats.failed += result.failed;
    global.testStats.total += result.passed + result.failed;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Results');
  console.log('='.repeat(60) + '\n');

  for (const result of results) {
    const status = result.failed > 0 ? 'FAIL' : 'PASS';
    console.log(`${status}: ${result.name} (${result.passed}/${result.passed + result.failed})`);
    if (result.errors.length > 0) {
      result.errors.forEach(err => {
        console.log(`  - ${err.test}: ${err.error}`);
      });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${global.testStats.total} | Passed: ${global.testStats.passed} | Failed: ${global.testStats.failed}`);
  console.log('='.repeat(60) + '\n');

  if (global.testStats.failed > 0) process.exit(1);
};

module.exports = { TestSuite, runAllTests };
