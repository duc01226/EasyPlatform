#!/usr/bin/env node

/**
 * Unified test runner for Claude hooks
 *
 * Usage:
 *   node run-all-tests.cjs              # Run all tests
 *   node run-all-tests.cjs --filter=X   # Run tests matching X
 *   node run-all-tests.cjs --verbose    # Show detailed output
 *   node run-all-tests.cjs --help       # Show help
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m'
};

// Symbols
const SYMBOLS = {
  pass: process.platform === 'win32' ? '√' : '✓',
  fail: process.platform === 'win32' ? '×' : '✗',
  skip: process.platform === 'win32' ? '-' : '○',
  bullet: process.platform === 'win32' ? '*' : '•'
};

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    help: args.includes('--help') || args.includes('-h'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    filter: args.find(a => a.startsWith('--filter='))?.split('=')[1] || null,
    parallel: args.includes('--parallel'),
    bail: args.includes('--bail'),
    list: args.includes('--list')
  };
}

// Show help message
function showHelp() {
  console.log(`
${COLORS.bright}Claude Hooks Test Runner${COLORS.reset}

${COLORS.cyan}Usage:${COLORS.reset}
  node run-all-tests.cjs [options]

${COLORS.cyan}Options:${COLORS.reset}
  --help, -h      Show this help message
  --verbose, -v   Show detailed test output
  --filter=X      Only run suites/tests matching X
  --parallel      Run test suites in parallel
  --bail          Stop on first test failure
  --list          List available test suites without running

${COLORS.cyan}Examples:${COLORS.reset}
  node run-all-tests.cjs                     # Run all tests
  node run-all-tests.cjs --filter=security   # Run security tests only
  node run-all-tests.cjs -v --filter=privacy # Verbose privacy tests
  node run-all-tests.cjs --list              # List available suites
`);
}

// Discover test suites
function discoverSuites(suitesDir) {
  if (!fs.existsSync(suitesDir)) {
    return [];
  }

  return fs.readdirSync(suitesDir)
    .filter(file => file.endsWith('.test.cjs'))
    .map(file => ({
      name: file.replace('.test.cjs', ''),
      path: path.join(suitesDir, file)
    }));
}

// Format duration
function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Run a single test
async function runTest(test, verbose) {
  const start = Date.now();

  try {
    if (test.fn.constructor.name === 'AsyncFunction') {
      await test.fn();
    } else {
      test.fn();
    }
    const duration = Date.now() - start;
    return {
      name: test.name,
      passed: true,
      duration,
      error: null
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name: test.name,
      passed: false,
      duration,
      error: error.message || String(error),
      stack: verbose ? error.stack : null
    };
  }
}

// Run a test suite
async function runSuite(suite, flags) {
  const start = Date.now();
  const results = {
    name: suite.module.name || suite.name,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0
  };

  const tests = suite.module.tests || [];

  for (const test of tests) {
    // Check if test should be skipped
    if (test.skip) {
      results.skipped++;
      results.tests.push({ name: test.name, skipped: true });
      continue;
    }

    // Check filter
    if (flags.filter && !test.name.toLowerCase().includes(flags.filter.toLowerCase())) {
      continue;
    }

    const result = await runTest(test, flags.verbose);
    results.tests.push(result);

    if (result.passed) {
      results.passed++;
    } else {
      results.failed++;
      if (flags.bail) {
        break;
      }
    }
  }

  results.duration = Date.now() - start;
  return results;
}

// Print test result
function printTestResult(result, verbose) {
  if (result.skipped) {
    console.log(`    ${COLORS.yellow}${SYMBOLS.skip}${COLORS.reset} ${COLORS.dim}${result.name} (skipped)${COLORS.reset}`);
    return;
  }

  if (result.passed) {
    console.log(`    ${COLORS.green}${SYMBOLS.pass}${COLORS.reset} ${result.name} ${COLORS.dim}(${formatDuration(result.duration)})${COLORS.reset}`);
  } else {
    console.log(`    ${COLORS.red}${SYMBOLS.fail}${COLORS.reset} ${result.name} ${COLORS.dim}(${formatDuration(result.duration)})${COLORS.reset}`);
    console.log(`      ${COLORS.red}${result.error}${COLORS.reset}`);
    if (verbose && result.stack) {
      console.log(`      ${COLORS.dim}${result.stack.split('\n').slice(1, 4).join('\n      ')}${COLORS.reset}`);
    }
  }
}

// Print suite results
function printSuiteResults(suiteResult, verbose) {
  const statusColor = suiteResult.failed > 0 ? COLORS.red : COLORS.green;
  console.log(`\n  ${COLORS.bright}${suiteResult.name}${COLORS.reset} ${statusColor}(${suiteResult.passed}/${suiteResult.passed + suiteResult.failed})${COLORS.reset}`);

  for (const test of suiteResult.tests) {
    printTestResult(test, verbose);
  }
}

// Print summary
function printSummary(allResults, totalDuration) {
  const totals = allResults.reduce((acc, r) => ({
    passed: acc.passed + r.passed,
    failed: acc.failed + r.failed,
    skipped: acc.skipped + r.skipped
  }), { passed: 0, failed: 0, skipped: 0 });

  console.log('\n' + '═'.repeat(50));

  if (totals.failed === 0) {
    console.log(`${COLORS.bgGreen}${COLORS.bright} PASSED ${COLORS.reset} ${COLORS.green}All ${totals.passed} tests passed${COLORS.reset}`);
  } else {
    console.log(`${COLORS.bgRed}${COLORS.bright} FAILED ${COLORS.reset} ${COLORS.red}${totals.failed} of ${totals.passed + totals.failed} tests failed${COLORS.reset}`);
  }

  if (totals.skipped > 0) {
    console.log(`${COLORS.yellow}  ${totals.skipped} tests skipped${COLORS.reset}`);
  }

  console.log(`${COLORS.dim}  Duration: ${formatDuration(totalDuration)}${COLORS.reset}`);
  console.log('═'.repeat(50) + '\n');
}

// List available suites
function listSuites(suites) {
  console.log(`\n${COLORS.bright}Available Test Suites:${COLORS.reset}\n`);
  if (suites.length === 0) {
    console.log(`  ${COLORS.dim}No test suites found${COLORS.reset}`);
    console.log(`  ${COLORS.dim}Create .test.cjs files in the suites/ directory${COLORS.reset}`);
  } else {
    for (const suite of suites) {
      console.log(`  ${COLORS.cyan}${SYMBOLS.bullet}${COLORS.reset} ${suite.name}`);
    }
  }
  console.log('');
}

// Main entry point
async function main() {
  const flags = parseArgs();

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  const suitesDir = path.join(__dirname, 'suites');
  let suites = discoverSuites(suitesDir);

  // Filter suites by name if specified
  if (flags.filter) {
    suites = suites.filter(s =>
      s.name.toLowerCase().includes(flags.filter.toLowerCase())
    );
  }

  if (flags.list) {
    listSuites(suites);
    process.exit(0);
  }

  console.log(`\n${COLORS.bright}${COLORS.cyan}Claude Hooks Test Runner${COLORS.reset}`);
  console.log(`${COLORS.dim}Found ${suites.length} test suite(s)${COLORS.reset}`);

  if (suites.length === 0) {
    console.log(`\n${COLORS.yellow}No test suites found${COLORS.reset}`);
    console.log(`${COLORS.dim}Create .test.cjs files in: ${suitesDir}${COLORS.reset}\n`);
    process.exit(0);
  }

  const start = Date.now();
  const allResults = [];

  // Load and run suites
  for (const suite of suites) {
    try {
      const module = require(suite.path);
      const result = await runSuite({ ...suite, module }, flags);
      allResults.push(result);
      printSuiteResults(result, flags.verbose);

      if (flags.bail && result.failed > 0) {
        break;
      }
    } catch (error) {
      console.log(`\n  ${COLORS.red}${SYMBOLS.fail} Failed to load suite: ${suite.name}${COLORS.reset}`);
      console.log(`    ${COLORS.red}${error.message}${COLORS.reset}`);
      if (flags.verbose) {
        console.log(`    ${COLORS.dim}${error.stack}${COLORS.reset}`);
      }
      allResults.push({
        name: suite.name,
        tests: [],
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        loadError: error.message
      });
    }
  }

  const totalDuration = Date.now() - start;
  printSummary(allResults, totalDuration);

  // Exit with error code if any tests failed
  const hasFailures = allResults.some(r => r.failed > 0);
  process.exit(hasFailures ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${COLORS.red}Fatal error: ${error.message}${COLORS.reset}`);
    process.exit(1);
  });
}

module.exports = { runSuite, runTest, discoverSuites };
