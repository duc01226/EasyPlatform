/**
 * Assertion library for Claude hooks testing
 * Provides simple, clear assertion functions with descriptive error messages
 */

/**
 * Assert two values are strictly equal
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} [msg] - Optional message prefix
 */
function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Assert two values are deeply equal (for objects/arrays)
 * @param {*} actual - The actual value
 * @param {*} expected - The expected value
 * @param {string} [msg] - Optional message prefix
 */
function assertDeepEqual(actual, expected, msg = '') {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  if (actualStr !== expectedStr) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Objects not equal.\nExpected:\n${expectedStr}\nGot:\n${actualStr}`);
  }
}

/**
 * Assert a condition is truthy
 * @param {*} condition - The condition to check
 * @param {string} [msg] - Message to show on failure
 */
function assertTrue(condition, msg = 'Expected condition to be true') {
  if (!condition) {
    throw new Error(msg);
  }
}

/**
 * Assert a condition is falsy
 * @param {*} condition - The condition to check
 * @param {string} [msg] - Message to show on failure
 */
function assertFalse(condition, msg = 'Expected condition to be false') {
  if (condition) {
    throw new Error(msg);
  }
}

/**
 * Assert a string contains a substring
 * @param {string} str - The string to search in
 * @param {string} substring - The substring to find
 * @param {string} [msg] - Optional message prefix
 */
function assertContains(str, substring, msg = '') {
  if (typeof str !== 'string') {
    throw new Error(`${msg ? msg + ': ' : ''}Expected string, got ${typeof str}`);
  }
  if (!str.includes(substring)) {
    const preview = str.length > 200 ? str.substring(0, 200) + '...' : str;
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected string to contain "${substring}"\nGot: "${preview}"`);
  }
}

/**
 * Assert a string does not contain a substring
 * @param {string} str - The string to search in
 * @param {string} substring - The substring that should not be present
 * @param {string} [msg] - Optional message prefix
 */
function assertNotContains(str, substring, msg = '') {
  if (typeof str !== 'string') {
    throw new Error(`${msg ? msg + ': ' : ''}Expected string, got ${typeof str}`);
  }
  if (str.includes(substring)) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected string NOT to contain "${substring}"`);
  }
}

/**
 * Assert a string matches a regex pattern
 * @param {string} str - The string to test
 * @param {RegExp} pattern - The regex pattern
 * @param {string} [msg] - Optional message prefix
 */
function assertMatches(str, pattern, msg = '') {
  if (!pattern.test(str)) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected string to match ${pattern}\nGot: "${str}"`);
  }
}

/**
 * Assert a function throws an error
 * @param {Function} fn - The function to execute
 * @param {string|RegExp} [expectedError] - Expected error message or pattern
 * @param {string} [msg] - Optional message prefix
 */
function assertThrows(fn, expectedError = null, msg = '') {
  let threw = false;
  let error = null;
  try {
    fn();
  } catch (e) {
    threw = true;
    error = e;
  }

  const prefix = msg ? `${msg}: ` : '';
  if (!threw) {
    throw new Error(`${prefix}Expected function to throw`);
  }

  if (expectedError) {
    const errorMsg = error.message || String(error);
    if (expectedError instanceof RegExp) {
      if (!expectedError.test(errorMsg)) {
        throw new Error(`${prefix}Expected error to match ${expectedError}, got: "${errorMsg}"`);
      }
    } else if (!errorMsg.includes(expectedError)) {
      throw new Error(`${prefix}Expected error to contain "${expectedError}", got: "${errorMsg}"`);
    }
  }
}

/**
 * Assert an async function throws an error
 * @param {Function} fn - The async function to execute
 * @param {string|RegExp} [expectedError] - Expected error message or pattern
 * @param {string} [msg] - Optional message prefix
 */
async function assertThrowsAsync(fn, expectedError = null, msg = '') {
  let threw = false;
  let error = null;
  try {
    await fn();
  } catch (e) {
    threw = true;
    error = e;
  }

  const prefix = msg ? `${msg}: ` : '';
  if (!threw) {
    throw new Error(`${prefix}Expected async function to throw`);
  }

  if (expectedError) {
    const errorMsg = error.message || String(error);
    if (expectedError instanceof RegExp) {
      if (!expectedError.test(errorMsg)) {
        throw new Error(`${prefix}Expected error to match ${expectedError}, got: "${errorMsg}"`);
      }
    } else if (!errorMsg.includes(expectedError)) {
      throw new Error(`${prefix}Expected error to contain "${expectedError}", got: "${errorMsg}"`);
    }
  }
}

/**
 * Assert a value is null or undefined
 * @param {*} value - The value to check
 * @param {string} [msg] - Optional message
 */
function assertNullish(value, msg = '') {
  if (value != null) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected null or undefined, got ${JSON.stringify(value)}`);
  }
}

/**
 * Assert a value is not null or undefined
 * @param {*} value - The value to check
 * @param {string} [msg] - Optional message
 */
function assertNotNullish(value, msg = '') {
  if (value == null) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected value to be defined, got ${value}`);
  }
}

/**
 * Assert exit code matches expected
 * @param {number} actual - Actual exit code
 * @param {number} expected - Expected exit code
 * @param {string} [context] - Additional context for error message
 */
function assertExitCode(actual, expected, context = '') {
  if (actual !== expected) {
    const ctx = context ? ` (${context})` : '';
    throw new Error(`Expected exit code ${expected}, got ${actual}${ctx}`);
  }
}

/**
 * Assert hook was blocked (exit code 2)
 * @param {number} exitCode - The exit code
 * @param {string} [msg] - Optional message
 */
function assertBlocked(exitCode, msg = '') {
  assertExitCode(exitCode, 2, msg || 'Expected hook to block');
}

/**
 * Assert hook was allowed (exit code 0)
 * @param {number} exitCode - The exit code
 * @param {string} [msg] - Optional message
 */
function assertAllowed(exitCode, msg = '') {
  assertExitCode(exitCode, 0, msg || 'Expected hook to allow');
}

module.exports = {
  assertEqual,
  assertDeepEqual,
  assertTrue,
  assertFalse,
  assertContains,
  assertNotContains,
  assertMatches,
  assertThrows,
  assertThrowsAsync,
  assertNullish,
  assertNotNullish,
  assertExitCode,
  assertBlocked,
  assertAllowed
};
