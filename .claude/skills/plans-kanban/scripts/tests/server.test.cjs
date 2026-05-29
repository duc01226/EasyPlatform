#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const { DEFAULT_PORT, findAvailablePort, isPortAvailable } = require('../lib/port-finder.cjs');
const { writePidFile, readPidFile, removePidFile, findRunningInstances } = require('../lib/process-mgr.cjs');
const { parsePlanTable, normalizeStatus } = require('../lib/plan-parser.cjs');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}`);
    console.log(`    ${err.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected "${expected}", got "${actual}"`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(`${message}: expected truthy value`);
  }
}

async function main() {
  console.log('\n--- Plans Kanban Tests ---');

  await test('DEFAULT_PORT is 3500', () => {
    assertEqual(DEFAULT_PORT, 3500, 'Default port');
  });

  await test('port helpers are callable', async () => {
    assertEqual(typeof isPortAvailable, 'function', 'isPortAvailable');
    const availablePort = await findAvailablePort(DEFAULT_PORT);
    assertTrue(Number.isInteger(availablePort), 'findAvailablePort returns an integer');
  });

  await test('PID helpers write, read, remove, and scan safely', () => {
    const port = 9877;
    writePidFile(port, process.pid);
    assertEqual(readPidFile(port), process.pid, 'PID should round-trip');
    assertTrue(Array.isArray(findRunningInstances()), 'findRunningInstances returns an array');
    removePidFile(port);
    assertEqual(readPidFile(port), null, 'PID should be removed');
  });

  await test('plan parser extracts table phases', () => {
    const tempDir = path.join(os.tmpdir(), 'plans-kanban-test');
    fs.mkdirSync(tempDir, { recursive: true });
    const planPath = path.join(tempDir, 'plan.md');
    fs.writeFileSync(planPath, [
      '# Test Plan',
      '',
      '| Phase | Name | Status | Link |',
      '| --- | --- | --- | --- |',
      '| 1 | Setup | In Progress | [phase-01.md](./phase-01.md) |',
      ''
    ].join('\n'));

    const phases = parsePlanTable(planPath);
    assertEqual(phases.length, 1, 'phase count');
    assertEqual(phases[0].name, 'Setup', 'phase name');
    assertEqual(phases[0].status, 'in-progress', 'phase status');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  await test('status helpers behave predictably', () => {
    assertEqual(normalizeStatus('Done'), 'completed', 'done status');
    assertEqual(normalizeStatus('WIP'), 'in-progress', 'wip status');
  });

  console.log('\n--- Test Results ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
