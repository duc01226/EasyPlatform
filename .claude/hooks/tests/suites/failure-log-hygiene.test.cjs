/**
 * Failure-Log Hygiene Suite
 *
 * `run-all-tests.cjs` persists a JSON failure log to `os.tmpdir()/ck/` on every
 * failing run. Unlike `CLAUDE_HOOK_DEBUG` it is NOT opt-in, and its records are
 * built from child-process output that routinely carries absolute repository and
 * sandbox paths — which on Windows embed the local account name. The sibling sink
 * in `debug-log.cjs:118-122` refuses to persist error messages for exactly that
 * reason; this one must keep the message (naming the failure is its whole purpose)
 * and remove the machine identifiers instead.
 *
 * These cases assert that contract directly against the runner's exported
 * helpers. Reaching the same code by forcing a full battery to fail would cost
 * minutes per assertion and still leave the redaction rules unexamined.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
    redact,
    pruneFailureLogs,
    MAX_ERROR_CHARS,
    RETAINED_FAILURE_LOGS
} = require('../lib/failure-log.cjs');

const tests = [
    {
        name: '[failure-log] persisted records carry no machine-identifying path',
        fn: () => {
            const home = os.homedir();
            const tmp = os.tmpdir();
            const repo = process.env.CLAUDE_PROJECT_DIR;

            for (const [raw, forbidden] of [
                [`ENOENT: no such file, open '${path.join(tmp, 'ck', 'probe.json')}'`, tmp],
                [`Expected ${path.join(home, '.claude', 'settings.json')} to exist`, home],
                [`at Object.<anonymous> (${path.join(repo, '.claude', 'hooks', 'x.cjs')}:12:3)`, repo]
            ]) {
                const cleaned = redact(raw, MAX_ERROR_CHARS);
                assert.ok(
                    !cleaned.toLowerCase().includes(forbidden.toLowerCase()),
                    `a persisted record still contains ${forbidden}: ${cleaned}`
                );
                assert.match(cleaned, /<(repo|tmp|home)>/, 'the removed prefix must be replaced by a named placeholder');
            }

            // The account name is the specific thing that made this sink different
            // from every other file this repo writes. Assert on the name itself,
            // not on the directory it appeared in, because it reaches the log
            // through whichever path a child process happened to print.
            const username = os.userInfo().username;
            if (home.includes(username)) {
                const cleaned = redact(`failed while writing ${path.join(home, 'AppData', 'Local', 'Temp', 'x')}`, MAX_ERROR_CHARS);
                assert.ok(!cleaned.includes(username), `the local account name survived redaction: ${cleaned}`);
            }
        }
    },
    {
        name: '[failure-log] redaction matches the separators and casing a child actually prints',
        fn: () => {
            const repo = process.env.CLAUDE_PROJECT_DIR;
            // A child process prints whatever separator and drive casing it used.
            // A literal string replace catches one spelling of the path and leaves
            // the rest — redaction that only works on the tidy form is not redaction.
            for (const variant of [repo, repo.replace(/\\/g, '/'), repo.toUpperCase(), repo.toLowerCase()]) {
                const cleaned = redact(`opened ${variant}/.claude/settings.json`, MAX_ERROR_CHARS);
                assert.match(cleaned, /<repo>/, `variant not redacted: ${variant}`);
            }
        }
    },
    {
        name: '[failure-log] a record keeps the failure message it exists to carry',
        fn: () => {
            // Redaction that removed the diagnosis would be worse than the leak: the
            // log's only job is naming what failed.
            const cleaned = redact('AssertionError: expected 2, got 0 — the gate failed to BLOCK', MAX_ERROR_CHARS);
            assert.match(cleaned, /expected 2, got 0/);
            assert.match(cleaned, /the gate failed to BLOCK/);
            assert.equal(redact(null, MAX_ERROR_CHARS), null, 'a missing stack must stay missing, not become "null"');
            assert.equal(redact(undefined, MAX_ERROR_CHARS), undefined);
        }
    },
    {
        name: '[failure-log] an oversized record is bounded and says so',
        fn: () => {
            const huge = 'x'.repeat(MAX_ERROR_CHARS * 3);
            const cleaned = redact(huge, MAX_ERROR_CHARS);
            assert.ok(cleaned.length < huge.length, 'an unbounded record defeats the point of a bounded sink');
            assert.match(cleaned, /\[truncated \d+ chars\]/, 'truncation must be visible, never silent');
            // One entry carries up to 1700 chars of child output; a suite-wide
            // failure multiplies that by every test in it.
            assert.ok(cleaned.length <= MAX_ERROR_CHARS + 64, 'the bound must actually bound');
        }
    },
    {
        name: '[failure-log] retention keeps the newest logs and deletes the rest',
        fn: () => {
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failure-log-prune-'));
            try {
                const names = [];
                for (let index = 0; index < RETAINED_FAILURE_LOGS + 5; index += 1) {
                    const name = `hook-test-failures-${1700000000000 + index}-${1000 + index}.json`;
                    const file = path.join(dir, name);
                    fs.writeFileSync(file, '{}');
                    // mtime is the ordering key, so it is set explicitly rather than
                    // trusted to the loop running slowly enough to differ.
                    const when = new Date(1700000000000 + index * 60000);
                    fs.utimesSync(file, when, when);
                    names.push(name);
                }
                // A file that is not one of ours must survive: this prunes a shared
                // temp directory, not a directory it owns.
                fs.writeFileSync(path.join(dir, 'unrelated.json'), '{}');

                pruneFailureLogs(dir, RETAINED_FAILURE_LOGS);

                const remaining = fs.readdirSync(dir);
                assert.ok(remaining.includes('unrelated.json'), 'pruning must not touch files it did not write');
                const kept = remaining.filter(name => name.startsWith('hook-test-failures-'));
                assert.equal(kept.length, RETAINED_FAILURE_LOGS, 'retention must bound the log count');
                for (const name of names.slice(-RETAINED_FAILURE_LOGS)) {
                    assert.ok(kept.includes(name), `the newest logs must survive: ${name} was deleted`);
                }
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[failure-log] pruning never becomes a second failure',
        fn: () => {
            // The log is diagnostic: a directory that cannot be listed, or a file a
            // concurrent run already removed, must not throw out of a failing run
            // and replace the real failure with a housekeeping error.
            const missing = path.join(os.tmpdir(), `failure-log-absent-${Date.now()}-${process.pid}`);
            assert.doesNotThrow(() => pruneFailureLogs(missing, RETAINED_FAILURE_LOGS));

            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'failure-log-race-'));
            try {
                const victim = path.join(dir, 'hook-test-failures-1700000000000-1.json');
                fs.writeFileSync(victim, '{}');
                const realUnlink = fs.unlinkSync;
                fs.unlinkSync = () => {
                    throw Object.assign(new Error('EPERM: injected'), { code: 'EPERM' });
                };
                try {
                    assert.doesNotThrow(() => pruneFailureLogs(dir, 0));
                } finally {
                    fs.unlinkSync = realUnlink;
                }
            } finally {
                fs.rmSync(dir, { recursive: true, force: true });
            }
        }
    }
];

module.exports = {
    name: 'failure-log-hygiene',
    tests
};
