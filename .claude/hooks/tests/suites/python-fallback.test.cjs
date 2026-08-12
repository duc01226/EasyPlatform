/**
 * Python Fallback Ordering Test Suite
 *
 * Guards the platform-ordered python fallback in session-init.cjs
 * (`pythonFallbackOrder` / `resolvePythonFallback`).
 *
 * Intent under test (fix #2A — see plans/reports/debug-investigate-260711-lifecycle-timeouts.md, F2/E1):
 *  - Windows probes real `python` BEFORE the wasteful MS-Store `python3` alias (cost optimization).
 *  - Off-Windows still probes `python3` FIRST (E1: `python3` is canonical on Linux/macOS; `python` often absent).
 *  - `python3` is ALWAYS in the list — the reorder is a cost optimization, never a coverage reduction,
 *    so a host where ONLY `python3` resolves still detects a version on every platform.
 *
 * Deterministic on any host: uses an injected recording runner, never a real interpreter.
 */

const path = require('path');
const { assertEqual, assertDeepEqual, assertTrue, assertNullish } = require('../lib/assertions.cjs');

const {
  pythonFallbackOrder,
  resolvePythonFallback
} = require(path.resolve(__dirname, '../../session-init.cjs'));

// A runner factory: succeeds (returns a version string) ONLY for the named commands,
// and records the order in which commands were probed.
function recordingRunner(succeedFor) {
  const calls = [];
  const succeed = new Set(succeedFor);
  const run = (binary /* , args */) => {
    calls.push(binary);
    return succeed.has(binary) ? `Python 3.x (${binary})` : null;
  };
  return { run, calls };
}

const orderingTests = [
  {
    name: 'TC-PYFB-001: win32 probes python BEFORE python3 (skip MS-Store alias first)',
    fn() {
      assertDeepEqual(
        pythonFallbackOrder('win32'),
        ['python', 'python3'],
        'Windows fallback must try real python before the python3 alias'
      );
    }
  },
  {
    name: 'TC-PYFB-002: linux probes python3 FIRST (E1 — canonical off-Windows)',
    fn() {
      assertDeepEqual(
        pythonFallbackOrder('linux'),
        ['python3', 'python'],
        'Linux fallback must try python3 first'
      );
    }
  },
  {
    name: 'TC-PYFB-003: darwin probes python3 FIRST (E1 — canonical off-Windows)',
    fn() {
      assertDeepEqual(
        pythonFallbackOrder('darwin'),
        ['python3', 'python'],
        'macOS fallback must try python3 first'
      );
    }
  },
  {
    name: 'TC-PYFB-004: python3 is present in the list on EVERY platform (no coverage loss)',
    fn() {
      for (const platform of ['win32', 'linux', 'darwin', 'freebsd', 'aix']) {
        assertTrue(
          pythonFallbackOrder(platform).includes('python3'),
          `python3 must remain probeable on ${platform}`
        );
        assertTrue(
          pythonFallbackOrder(platform).includes('python'),
          `python must remain probeable on ${platform}`
        );
      }
    }
  }
];

const resolutionTests = [
  {
    name: 'TC-PYFB-010: E1 core — host where ONLY python3 resolves still detects a version (linux)',
    fn() {
      const { run, calls } = recordingRunner(['python3']);
      const result = resolvePythonFallback('linux', run);
      assertTrue(result !== null, 'only-python3 host must still resolve a version');
      assertEqual(calls[0], 'python3', 'linux must probe python3 first');
    }
  },
  {
    name: 'TC-PYFB-011: win32 real-python host resolves via python (alias never needed)',
    fn() {
      const { run, calls } = recordingRunner(['python']);
      const result = resolvePythonFallback('win32', run);
      assertTrue(result !== null, 'Windows real-python host must resolve');
      assertEqual(calls[0], 'python', 'win32 must probe python first');
      assertEqual(calls.length, 1, 'win32 must NOT probe python3 once python succeeds');
    }
  },
  {
    name: 'TC-PYFB-012: win32-alias safety — python fails, python3 succeeds, still resolves',
    fn() {
      const { run, calls } = recordingRunner(['python3']);
      const result = resolvePythonFallback('win32', run);
      assertTrue(result !== null, 'win32 must fall through to python3 when python fails');
      assertDeepEqual(calls, ['python', 'python3'], 'win32 must probe python then python3');
    }
  },
  {
    name: 'TC-PYFB-013: graceful degradation — no interpreter resolves returns null',
    fn() {
      const { run, calls } = recordingRunner([]); // nothing succeeds
      const result = resolvePythonFallback('linux', run);
      assertNullish(result, 'must return null when no interpreter resolves');
      assertDeepEqual(calls, ['python3', 'python'], 'must exhaust the full ordered list before giving up');
    }
  }
];

module.exports = {
  name: 'python-fallback',
  tests: [
    ...orderingTests,
    ...resolutionTests
  ]
};
