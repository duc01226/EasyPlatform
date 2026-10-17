#!/usr/bin/env node
'use strict';

/**
 * Runs every tests/*.test.cjs file in its own Node process and prints one line per file:
 *   <file>: PASS|FAIL (...) — pass N, fail N, skipped N
 * The counts come from the node:test summary the child prints (TAP "# pass N" when its output is
 * piped, or the spec reporter's "ℹ pass N"), so ENVIRONMENT-BLOCKED skips stay visible instead of
 * hiding inside a PASS. A final TOTAL line sums them. Exit 1 when any file fails.
 * A file gets FILE_TIMEOUT_MS, well above the largest single spawn timeout a test file uses, so a
 * hung child is reported by the test that owns it rather than killed by the runner first.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FILE_TIMEOUT_MS = 600_000;
const COUNT_KEYS = Object.freeze(['pass', 'fail', 'skipped']);

function compareNames(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Reads the node:test summary counts from a child's output; null when no summary was printed. */
function parseCounts(output) {
  const counts = {};
  const pattern = /^\s*(?:#|ℹ)\s*(pass|fail|skipped)\s+(\d+)\s*$/gm;
  for (let match = pattern.exec(output); match; match = pattern.exec(output)) {
    counts[match[1]] = Number(match[2]);
  }
  if (!COUNT_KEYS.some((key) => key in counts)) return null;
  for (const key of COUNT_KEYS) counts[key] = counts[key] || 0;
  return counts;
}

function describeCounts(counts) {
  if (!counts) return 'no test summary';
  return COUNT_KEYS.map((key) => `${key} ${counts[key]}`).join(', ');
}

function main() {
  let testFiles;
  try {
    testFiles = fs.readdirSync(__dirname)
      .filter((name) => name.endsWith('.test.cjs'))
      .sort(compareNames);
  } catch (error) {
    console.error(`Could not discover html-export tests: ${error.message}`);
    return 1;
  }

  if (testFiles.length === 0) {
    console.error('No html-export *.test.cjs files were found.');
    return 1;
  }

  let failed = false;
  const total = { pass: 0, fail: 0, skipped: 0 };
  const lines = [];
  for (const file of testFiles) {
    const testPath = path.join(__dirname, file);
    const result = spawnSync(process.execPath, [testPath], {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      shell: false,
      windowsHide: true,
      timeout: FILE_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    });
    // Echo the child output first, so the per-file lines below stay together at the end.
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    let status;
    if (result.error) {
      status = `ERROR (${result.error.message})`;
    } else if (result.status === null) {
      status = `FAIL (terminated${result.signal ? ` by ${result.signal}` : ''})`;
    } else if (result.status !== 0) {
      status = `FAIL (exit ${result.status})`;
    } else {
      status = 'PASS';
    }

    const counts = parseCounts(`${result.stdout || ''}\n${result.stderr || ''}`);
    if (counts) for (const key of COUNT_KEYS) total[key] += counts[key];
    lines.push(`${file}: ${status} — ${describeCounts(counts)}`);
    if (result.error || result.status !== 0) failed = true;
  }

  for (const line of lines) console.log(line);
  console.log(`TOTAL: ${failed ? 'FAIL' : 'PASS'} — ${describeCounts(total)}`);
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { compareNames, parseCounts, main, FILE_TIMEOUT_MS };
