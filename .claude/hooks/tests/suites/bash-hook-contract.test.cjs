'use strict';

/**
 * Process-boundary regression suite for every hook in the Bash PreToolUse
 * chain. The assertions intentionally inspect both streams and the real child
 * exit status: a hook that silently calls process.exit(0) cannot pass this
 * contract.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SETTINGS = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude', 'settings.json'), 'utf8'));
const HOOKS = SETTINGS.hooks.PreToolUse
  .filter(group => String(group.matcher || '').split('|').includes('Bash'))
  .flatMap(group => group.hooks || [])
  .map(entry => String(entry.command || '').match(/\.claude[\\/]hooks[\\/]([^"']+\.cjs)/)?.[1])
  .filter(Boolean);
const HOOK_NAMES = HOOKS.map(file => file.replace('.cjs', ''));
const BENIGN = createPreToolUseInput('Bash', { command: 'echo hi' });

function runHook(file, input, options = {}) {
  return new Promise(resolve => {
    const env = { ...process.env, ...(options.env || {}) };
    for (const key of options.unsetEnv || []) delete env[key];
    const proc = spawn(process.execPath, [getHookPath(file)], {
      cwd: options.cwd || ROOT,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, options.timeout || 10000);
    proc.stdout.on('data', chunk => { stdout += chunk.toString(); });
    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });
    proc.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    proc.on('error', error => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: `${stderr}${error.message}`, timedOut: false });
    });

    if (options.raw !== undefined) proc.stdin.end(options.raw);
    else if (input !== undefined) proc.stdin.end(typeof input === 'string' ? input : JSON.stringify(input));
    else proc.stdin.end();
  });
}

function runLongChild() {
  const runnerPath = path.join(ROOT, '.claude', 'hooks', 'lib', 'hook-runner.cjs').replace(/\\/g, '/');
  const script = `const { runHook } = require(${JSON.stringify(runnerPath)}); runHook('timeout-probe', () => new Promise(() => {}), { parseEvent: false, timeout: 40 });`;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 5000
  });
  assert.equal(result.status, 0, result.stderr || 'long-running child failed');
  assert.match(result.stderr, /timed out after 40ms/, 'Referenced timeout must report before the child exits');
}

function assertCleanAllow(result, label) {
  assert.equal(result.code, 0, `${label}: ${result.stderr}`);
  assert.equal(result.stdout, '', `${label}: unexpected stdout ${JSON.stringify(result.stdout)}`);
  assert.equal(result.stderr, '', `${label}: unexpected stderr ${JSON.stringify(result.stderr)}`);
  assert.equal(result.timedOut, false, `${label}: timed out`);
}

const tests = [
  {
    name: 'R2 timeout terminates active work after draining and input diagnostics never reflect payloads',
    fn: async () => {
      const runner = JSON.stringify(path.join(ROOT, '.claude/hooks/lib/hook-runner.cjs'));
      for (const wrapper of ['runHook', 'runBlockingHook']) {
        const result = spawnSync(process.execPath, ['-e', `
          const { ${wrapper} } = require(${runner});
          ${wrapper}('active-timeout', () => {
            process.stdout.write('x'.repeat(1024 * 1024));
            process.stderr.write('z'.repeat(1024 * 1024));
            setInterval(() => {}, 100);
            setTimeout(() => process.stdout.write('LATE-HANDLER'), 3000);
            return new Promise(() => {});
          }, { timeout: 40, parseEvent: false, errorExitCode: 2 });
        `], { input: '{}', encoding: 'utf8', timeout: 2000, maxBuffer: 3 * 1024 * 1024, windowsHide: true });
        assert.equal(result.error, undefined, 'Timed-out wrapper must end despite active handles');
        assert.equal(result.status, wrapper === 'runHook' ? 2 : 0);
        assert.equal(result.stdout, 'x'.repeat(1024 * 1024), 'Queued output must drain without late handler output');
        assert.match(result.stderr, /timed out after 40ms/);
        assert.ok(result.stderr.startsWith('z'.repeat(1024 * 1024)), 'Queued stderr must drain too');
      }
      const stalled = spawnSync(process.execPath, ['-e', `
        const { runHook } = require(${runner});
        const write = process.stdout.write.bind(process.stdout);
        process.stdout.write = (chunk, callback) => chunk === '' ? false : write(chunk, callback);
        runHook('stalled-drain', () => new Promise(() => {}), { timeout: 40, errorExitCode: 2 });
      `], { input: '{}', encoding: 'utf8', timeout: 2000, windowsHide: true });
      assert.equal(stalled.error, undefined, 'Missing drain callback must not hang timeout finalization');
      assert.equal(stalled.status, 2);
      assert.match(stalled.stderr, /timed out after 40ms/);
      const success = spawnSync(process.execPath, ['-e', `
        const { runHook } = require(${runner});
        runHook('drain-success', () => 'y'.repeat(1024 * 1024), { outputResult: true });
      `], { input: '{}', encoding: 'utf8', timeout: 5000, maxBuffer: 3 * 1024 * 1024, windowsHide: true });
      assert.equal(success.status, 0);
      assert.equal(success.stdout, 'y'.repeat(1024 * 1024));

      const secret = 'R2SECRET'; // Short enough to catch JSON parser excerpt reflection.
      for (const raw of [secret, JSON.stringify({ ...BENIGN, hook_event_name: secret })]) {
        const result = await runHook('doc-sync-gate.cjs', undefined, { raw });
        assert.equal(result.code, 0);
        assert.equal(result.stdout, '');
        assert.ok(result.stderr.length > 0, 'Input errors must remain visible');
        assert.equal(result.stderr.includes(secret), false, 'Input errors must not reflect payload data');
      }
      const parser = JSON.stringify(path.join(ROOT, '.claude/hooks/lib/stdin-parser.cjs'));
      for (const throwOnError of [false, true]) {
        const result = spawnSync(process.execPath, ['-e', `
          const { parseStdinSync } = require(${parser});
          try { parseStdinSync({ throwOnError: ${throwOnError} }); }
          catch (error) { process.stderr.write(error.message); }
        `], { input: secret, encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0);
        assert.match(result.stderr, /invalid JSON/i);
        assert.equal(result.stderr.includes(secret), false);
      }
      for (const raw of ['null', '[]', JSON.stringify(secret)]) {
        const result = spawnSync(process.execPath, ['-e', `
          const { parseHookEvent } = require(${parser});
          process.stdout.write(JSON.stringify(parseHookEvent()));
        `], { input: raw, encoding: 'utf8', windowsHide: true });
        assert.equal(result.status, 0);
        assert.match(result.stderr, /must be a JSON object/);
        assert.equal(result.stderr.includes(secret), false);
        assert.deepEqual(JSON.parse(result.stdout).raw, {});
      }
    }
  },
  {
    name: 'D4 every Bash-path hook allows echo hi with empty stdout/stderr',
    fn: async () => {
      for (const file of HOOKS) assertCleanAllow(await runHook(file, BENIGN), file);
    }
  },
  {
    name: 'D4 doc-sync-gate advisory stays non-blocking on benign Bash input',
    fn: async () => {
      assertCleanAllow(await runHook('doc-sync-gate.cjs', BENIGN), 'doc-sync-gate advisory');
    }
  },
  {
    name: 'D4 malformed delivery is visible and follows each hook input policy',
    fn: async () => {
      for (const file of ['doc-sync-gate.cjs']) {
        const result = await runHook(file, undefined, { raw: '{not-json' });
        assert.equal(result.code, 0, `${file}: advisory parse failure should preserve allow`);
        assert.ok(result.stderr.includes(file.replace('.cjs', '')), `${file}: missing parse breadcrumb`);
        assert.equal(result.stdout, '', `${file}: parse failure leaked stdout`);
      }
    }
  },
  {
    name: 'D4 all hooks allow benign input with CLAUDE_PROJECT_DIR unset and an unexpected cwd',
    fn: async () => {
      const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-hook-cwd-'));
      try {
        for (const file of HOOKS) {
          const result = await runHook(file, BENIGN, { cwd, unsetEnv: ['CLAUDE_PROJECT_DIR'] });
          assert.equal(result.code, 0, `${file}: ${result.stderr}`);
          assert.equal(result.stdout, '', `${file}: unexpected stdout`);
          assert.equal(result.stderr, '', `${file}: unexpected stderr ${JSON.stringify(result.stderr)}`);
          assert.equal(result.timedOut, false, `${file}: timed out`);
        }
      } finally {
        fs.rmSync(cwd, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'D4 repeated calls remain identical after a long-running child command',
    fn: async () => {
      for (const file of HOOKS) {
        const first = await runHook(file, BENIGN);
        runLongChild();
        const second = await runHook(file, BENIGN);
        assert.deepEqual(
          { code: second.code, stdout: second.stdout, stderr: second.stderr, timedOut: second.timedOut },
          { code: first.code, stdout: first.stdout, stderr: first.stderr, timedOut: first.timedOut },
          file
        );
      }
    }
  },
  {
    name: 'D3 CLAUDE_HOOK_DEBUG records every hook decision and rotates bounded logs',
    fn: async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-hook-debug-'));
      const logPath = path.join(dir, 'debug', 'bash-hooks.log');
      try {
        // Derived structurally from settings.json, never as a magic number: a hard-coded
        // count goes stale the moment a hook is added or removed and then asserts nothing
        // about the real registry. What must hold is that EVERY registered Bash entry
        // resolves to a hook file that exists on disk, with no duplicates.
        const bashEntries = SETTINGS.hooks.PreToolUse
          .filter(group => String(group.matcher || '').split('|').includes('Bash'))
          .flatMap(group => group.hooks || []);
        assert.ok(HOOKS.length > 0, 'Settings must register at least one Bash PreToolUse hook');
        assert.equal(HOOKS.length, bashEntries.length,
          'Every registered Bash PreToolUse entry must resolve to a .claude/hooks/*.cjs file');
        assert.equal(new Set(HOOKS).size, HOOKS.length, 'Bash hook registration must not duplicate a hook');
        for (const file of HOOKS) {
          assert.ok(fs.existsSync(getHookPath(file)), `${file}: registered Bash hook file is missing`);
        }
        for (const file of HOOKS) {
          const result = await runHook(file, BENIGN, {
            env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
          });
          assertCleanAllow(result, `${file} debug run`);
        }
        const records = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(records.length, HOOKS.length, 'One debug record is required per Bash hook invocation');
        assert.deepEqual(new Set(records.map(record => record.hook)), new Set(HOOK_NAMES));
        for (const record of records) {
          assert.equal(record.decision, 'allow');
          assert.equal(record.code, 0);
          assert.equal(typeof record.durationMs, 'number');
          assert.ok(record.durationMs >= 0);
          assert.equal(record.event, 'PreToolUse');
          assert.equal(record.tool, 'Bash');
          assert.equal(Object.hasOwn(record, 'command'), false);
          assert.equal(Object.hasOwn(record, 'path'), false);
        }

        const malformed = await runHook('doc-sync-gate.cjs', undefined, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
        });
        assert.equal(malformed.code, 0);
        const errorRecord = fs.readFileSync(logPath, 'utf8').trim().split('\n').map(line => JSON.parse(line)).at(-1);
        assert.equal(errorRecord.decision, 'error-allow');
        assert.equal(errorRecord.code, 0);
        assert.equal(errorRecord.error.name, 'Error');
        assert.equal(typeof errorRecord.error.code, 'string');
        assert.equal(Object.hasOwn(errorRecord.error, 'message'), false);
        assert.equal(Object.hasOwn(errorRecord, 'command'), false);
        assert.equal(Object.hasOwn(errorRecord, 'path'), false);

        const concurrentLogPath = path.join(dir, 'debug', 'concurrent.log');
        const concurrent = await Promise.all(HOOKS.map(file => runHook(file, BENIGN, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: concurrentLogPath }
        })));
        for (const result of concurrent) assertCleanAllow(result, 'concurrent debug run');
        const concurrentRecords = fs.readFileSync(concurrentLogPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
        assert.equal(concurrentRecords.length, HOOKS.length);
        assert.deepEqual(new Set(concurrentRecords.map(record => record.hook)), new Set(HOOK_NAMES));

        fs.writeFileSync(logPath, 'x'.repeat(1024 * 1024));
        const rotated = await runHook('doc-sync-gate.cjs', BENIGN, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: logPath }
        });
        assertCleanAllow(rotated, 'rotation run');
        assert.ok(fs.existsSync(`${logPath}.1`), 'debug log did not rotate');
        assert.equal(JSON.parse(fs.readFileSync(logPath, 'utf8').trim()).hook, 'doc-sync-gate');
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'D3 debug sink failure is visible without changing a benign decision',
    fn: async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bash-hook-debug-sink-'));
      try {
        const result = await runHook('doc-sync-gate.cjs', BENIGN, {
          env: { CLAUDE_HOOK_DEBUG: '1', CLAUDE_HOOK_DEBUG_LOG: dir }
        });
        assert.equal(result.code, 0, result.stderr);
        assert.equal(result.stdout, '');
        assert.match(result.stderr, /CLAUDE_HOOK_DEBUG log failure/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  },
  {
    name: 'D3 a lost debug-log race is silent; a sink that cannot work still reports',
    fn: async () => {
      // Every registered Bash hook fires on one tool call and appends to one file, so a
      // lost race is the normal case. Reporting it put a line on stderr during an ALLOW,
      // which the D1/D3 contract assertions above read as a hook fault — the race
      // surfaced as an intermittent failure of the gate, not of the logging.
      //
      // The race is INJECTED at the fs calls the library makes, not stressed: a
      // concurrent run reproduces the interleaving only sometimes, and a test
      // that usually cannot fail protects nothing. The four cases below are the
      // whole contract — lost race silent, unwinnable rotation loud AND bounded,
      // transient append retried, real append failure loud.
      const modulePath = path.join(ROOT, '.claude', 'hooks', 'lib', 'debug-log.cjs');
      const { recordHookDecision } = require(modulePath);
      const realRename = fs.renameSync;
      const realAppend = fs.appendFileSync;
      const realWrite = process.stderr.write.bind(process.stderr);
      const previousEnv = {
        debug: process.env.CLAUDE_HOOK_DEBUG,
        log: process.env.CLAUDE_HOOK_DEBUG_LOG
      };
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-log-race-'));
      const logPath = path.join(dir, 'race.log');
      const OVERSIZED = 'x'.repeat(1024 * 1024);

      const raceError = code => Object.assign(new Error(`${code}: injected`), { code });
      let captured = '';
      const record = () => {
        captured = '';
        process.stderr.write = chunk => { captured += chunk.toString(); return true; };
        try {
          recordHookDecision('race-probe', { code: 0, toolName: 'Bash' });
        } finally {
          process.stderr.write = realWrite;
        }
        return captured;
      };

      process.env.CLAUDE_HOOK_DEBUG = '1';
      process.env.CLAUDE_HOOK_DEBUG_LOG = logPath;
      try {
        // 1. A peer rotated first. The rename fails with a concurrency code AND the
        //    oversized file is already gone — nothing to report, and nothing of the
        //    peer's fresh file may be destroyed.
        fs.writeFileSync(logPath, OVERSIZED);
        fs.renameSync = (from, to) => {
          realRename(from, to);
          throw raceError('EPERM');
        };
        assert.equal(record(), '', 'a rotation lost to a peer must not write to stderr');
        assert.ok(fs.existsSync(`${logPath}.1`), 'the peer rotation must stand');
        assert.equal(
          fs.readFileSync(logPath, 'utf8').trim().split('\n').length,
          1,
          'the losing process must append to the peer\'s fresh file, never truncate it'
        );

        // 2. The rename simply cannot succeed and the file is STILL oversized. Errno
        //    alone cannot tell this apart from case 1, so silence here would trade a
        //    stderr line for an unbounded log.
        fs.rmSync(`${logPath}.1`, { force: true });
        fs.writeFileSync(logPath, OVERSIZED);
        fs.renameSync = () => { throw raceError('EPERM'); };
        assert.match(record(), /CLAUDE_HOOK_DEBUG rotation failed/, 'an unwinnable rotation must stay visible');
        assert.ok(
          fs.statSync(logPath).size < OVERSIZED.length,
          'an unwinnable rotation must still bound the active file'
        );
        fs.renameSync = realRename;

        // 3. A transient append collision clears on retry — no diagnostic, and the
        //    record still lands.
        fs.rmSync(logPath, { force: true });
        let appendAttempts = 0;
        fs.appendFileSync = (target, data, encoding) => {
          appendAttempts += 1;
          if (appendAttempts === 1) throw raceError('EBUSY');
          return realAppend(target, data, encoding);
        };
        assert.equal(record(), '', 'a retried append must not write to stderr');
        assert.equal(appendAttempts, 2, 'the append must actually be retried, not skipped');
        assert.equal(fs.readFileSync(logPath, 'utf8').trim().split('\n').length, 1, 'the retried record must land');

        // 4. A sink that fails for a non-race reason is reported on the first attempt.
        fs.appendFileSync = () => { throw raceError('EISDIR'); };
        assert.match(record(), /CLAUDE_HOOK_DEBUG log failure/, 'a real sink failure must stay visible');
      } finally {
        fs.renameSync = realRename;
        fs.appendFileSync = realAppend;
        process.stderr.write = realWrite;
        if (previousEnv.debug === undefined) delete process.env.CLAUDE_HOOK_DEBUG;
        else process.env.CLAUDE_HOOK_DEBUG = previousEnv.debug;
        if (previousEnv.log === undefined) delete process.env.CLAUDE_HOOK_DEBUG_LOG;
        else process.env.CLAUDE_HOOK_DEBUG_LOG = previousEnv.log;
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }
];

module.exports = {
  name: 'bash-hook-contract',
  tests
};
