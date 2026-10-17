/**
 * Graph HEAD-Staleness Test Suite
 *
 * Guards the mechanism that keeps the code graph in step with git HEAD:
 *   - `.claude/scripts/code_graph/incremental.py` → `sync_with_git` graph-ahead guard
 *   - `.claude/hooks/graph-prompt-sync.cjs`       → per-prompt HEAD-change gate
 *   - `.claude/hooks/graph-session-init.cjs`      → SessionStart sync + marker record
 *
 * Intent under test:
 *  - Pulling someone else's commits (HEAD moves FORWARD) must re-parse the moved files,
 *    or every graph query silently answers from a stale node set.
 *  - Checking out an OLDER branch/commit the graph already covers (HEAD moves BACKWARD)
 *    must do NOTHING — no re-parse, and `last_synced_commit` must NOT be dragged
 *    backwards. This is the explicit product decision; without the guard `git diff A..B`
 *    succeeds in BOTH directions, so an older checkout would rewrite the graph backwards.
 *  - Diverged branches are NOT "behind" (neither commit is an ancestor of the other) and
 *    must still sync — the guard must not over-trigger.
 *  - The per-prompt hook must NOT spawn Python when HEAD is unchanged; that gate is the
 *    only thing making a UserPromptSubmit hook affordable.
 *  - When HEAD HAS moved but the toolchain is missing, the HEAD gate CANNOT fire — the
 *    marker is only written for a decided sync. Without a second gate, that state taxes
 *    every single prompt with two Python spawns, forever, and never self-heals. A bounded
 *    negative cache must absorb it, and observing a working toolchain must clear it so a
 *    repair is honoured immediately rather than after the TTL.
 *
 * Python-dependent cases skip cleanly when the graph toolchain is absent, so the suite
 * stays green on a host that never installed tree-sitter.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { assertEqual, assertTrue, assertContains } = require('../lib/assertions.cjs');

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SCRIPTS_DIR = path.join(REPO_ROOT, '.claude', 'scripts');
const HOOK = path.join(REPO_ROOT, '.claude', 'hooks', 'graph-prompt-sync.cjs');
const UTILS = path.join(REPO_ROOT, '.claude', 'hooks', 'lib', 'graph-utils.cjs');

// ---------------------------------------------------------------------------
// Environment probes — decide up front what can actually run here.
// ---------------------------------------------------------------------------

function findPython() {
    const candidates = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
    for (const bin of candidates) {
        try {
            const v = execFileSync(bin, ['-c', 'import tree_sitter, tree_sitter_language_pack, networkx'], {
                encoding: 'utf-8',
                timeout: 20000,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            void v;
            return bin;
        } catch {
            /* try next */
        }
    }
    return null;
}

const PYTHON = findPython();
const noPython = PYTHON === null;

function gitRev(ref) {
    try {
        return execFileSync('git', ['rev-parse', ref], {
            encoding: 'utf-8',
            cwd: REPO_ROOT,
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
    } catch {
        return null;
    }
}

const HEAD = gitRev('HEAD');
const PREV = gitRev('HEAD~1');
// Needs two real commits to express "ahead" and "behind" against real ancestry.
const noHistory = !HEAD || !PREV;

/**
 * Drive sync_with_git against a throwaway graph DB seeded with `lastSynced`,
 * with get_current_head stubbed to `fakeHead`. Real ancestry from this repo is
 * used for the merge-base check — no synthetic commits are created.
 */
function runSyncCase(lastSynced, fakeHead) {
    const tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ckgraph-')), 'g.db');
    const script = [
        'import sys, json, pathlib',
        `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
        'from code_graph import incremental as inc',
        'from code_graph.graph import GraphStore',
        `store = GraphStore(${JSON.stringify(tmpDb)})`,
        `store.set_metadata("last_synced_commit", ${JSON.stringify(lastSynced)})`,
        'store.commit()',
        `inc.get_current_head = lambda r: ${JSON.stringify(fakeHead)}`,
        `res = inc.sync_with_git(pathlib.Path(${JSON.stringify(REPO_ROOT)}), store)`,
        'print(json.dumps({"reason": res.get("reason"), "after": store.get_metadata("last_synced_commit")}))'
    ].join('\n');

    const out = execFileSync(PYTHON, ['-c', script], {
        encoding: 'utf-8',
        timeout: 180000,
        cwd: REPO_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    return JSON.parse(out.trim().split('\n').pop());
}

const skipSync = noPython || noHistory;

// ---------------------------------------------------------------------------
// Python-side: the graph-ahead guard
// ---------------------------------------------------------------------------

const guardTests = [
    {
        name: 'TC-GRAPHHEAD-001: HEAD behind the graph (older checkout) is a no-op',
        skip: skipSync,
        fn() {
            const r = runSyncCase(HEAD, PREV);
            assertEqual(r.reason, 'graph_ahead_skipped', 'an older checkout must not re-parse the graph backwards');
            assertEqual(r.after, HEAD, 'last_synced_commit must NOT be dragged backwards to the older commit');
        }
    },
    {
        name: 'TC-GRAPHHEAD-002: HEAD ahead of the graph (pulled commits) syncs forward',
        skip: skipSync,
        fn() {
            const r = runSyncCase(PREV, HEAD);
            assertEqual(r.reason, 'synced', 'a forward HEAD move is exactly the pull case the mechanism exists for');
            assertEqual(r.after, HEAD, 'last_synced_commit must advance to the new HEAD');
        }
    },
    {
        name: 'TC-GRAPHHEAD-003: HEAD equal to the graph reports up_to_date and does no work',
        skip: skipSync,
        fn() {
            const r = runSyncCase(HEAD, HEAD);
            assertEqual(r.reason, 'up_to_date', 'an unchanged HEAD must not re-parse anything');
            assertEqual(r.after, HEAD, 'last_synced_commit must be left alone');
        }
    },
    {
        name: 'TC-GRAPHHEAD-004: guard uses merge-base ancestry, not a bare inequality',
        skip: noPython,
        fn() {
            // A commit that does not exist locally must NOT be treated as an ancestor —
            // otherwise an unreachable ref (post force-push) would silently suppress a
            // needed resync instead of falling through to the rebuild path.
            const script = [
                'import sys, pathlib, json',
                `sys.path.insert(0, ${JSON.stringify(SCRIPTS_DIR)})`,
                'from code_graph.incremental import _is_ancestor',
                `r = pathlib.Path(${JSON.stringify(REPO_ROOT)})`,
                `print(json.dumps({"bogus": _is_ancestor(r, "d"*40, ${JSON.stringify(HEAD || 'HEAD')})}))`
            ].join('\n');
            const out = execFileSync(PYTHON, ['-c', script], {
                encoding: 'utf-8',
                timeout: 30000,
                cwd: REPO_ROOT,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            const r = JSON.parse(out.trim().split('\n').pop());
            assertEqual(r.bogus, false, 'an unreachable commit must answer "not an ancestor", never fail-open to "yes"');
        }
    }
];

// ---------------------------------------------------------------------------
// Hook-side: the per-prompt HEAD-change gate
// ---------------------------------------------------------------------------

function runPromptHook({ unchanged = false, available = true, locked = false, cachedUnavailable = false, result = { reason: 'synced' } } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ckgraph-prompt-'));
    const head = 'a'.repeat(40);
    const initial = unchanged ? head : '0'.repeat(40);
    const marker = path.join(root, '.last-seen-head');
    const calls = path.join(root, 'calls.jsonl');
    try {
        fs.writeFileSync(marker, initial);
        fs.writeFileSync(calls, '');
        fs.writeFileSync(path.join(root, 'graph.db'), 'isolated existence sentinel');
        // Only external graph/config dependencies are controlled. The real hook,
        // stdin parser and runner execute in a fresh process for every case.
        const script = `
            const fs = require('node:fs');
            const path = require('node:path');
            const root = process.cwd();
            const record = value => fs.appendFileSync(path.join(root, 'calls.jsonl'), JSON.stringify(value) + '\\n');
            require.cache[${JSON.stringify(UTILS)}] = { exports: {
                getGraphDbPath: () => path.join(root, 'graph.db'),
                // Graph mode has its own suite (code-graph-opt-in); these cases run in active mode.
                codeGraphMode: () => 'active',
                getGitHead: () => ${JSON.stringify(head)},
                readLastSeenHead: () => fs.readFileSync(path.join(root, '.last-seen-head'), 'utf8'),
                writeLastSeenHead: value => { record(['write', value]); fs.writeFileSync(path.join(root, '.last-seen-head'), value); },
                isGraphAvailable: () => { record(['available']); return { available: ${available} }; },
                isDepsUnavailableCached: () => { record(['cached?']); return ${cachedUnavailable}; },
                markDepsUnavailable: () => record(['mark']),
                clearDepsUnavailable: () => record(['clear']),
                acquireUpdateLock: () => { record(['acquire']); return ${!locked}; },
                releaseUpdateLock: () => record(['release']),
                invokeGraph: (...args) => { record(['sync', ...args]); return ${JSON.stringify(result)}; }
            } };
            require.cache[${JSON.stringify(path.join(path.dirname(UTILS), 'project-config-loader.cjs'))}] = {
                exports: { isConfigPopulated: () => true, loadProjectConfig: () => ({}) }
            };
            require(${JSON.stringify(HOOK)});
        `;
        const child = spawnSync(process.execPath, ['-e', script], {
            input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'test', cwd: root }),
            encoding: 'utf8', timeout: 10000, cwd: root, windowsHide: true,
            env: { ...process.env, CLAUDE_PROJECT_DIR: root, CK_DEBUG: '0', CLAUDE_HOOK_DEBUG: '0', NODE_OPTIONS: '' },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        assertEqual(child.error, undefined, `hook child must complete: ${child.error?.message}; ${child.stderr}`);
        assertEqual(child.status, 0, `hook must remain non-blocking: ${child.stderr}`);
        assertEqual(child.stdout, '', 'graph-prompt-sync must never inject into the prompt');
        assertEqual(child.stderr, '', 'controlled graph outcomes must not report runtime errors');
        return {
            head, initial, marker: fs.readFileSync(marker, 'utf8'),
            calls: fs.readFileSync(calls, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
        };
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

/**
 * Normalise a recorded call list for shape comparison.
 *
 * The sync timeout is no longer the constant 15000 — the hook subtracts the wall
 * time already spent from its own total budget, so the exact value is genuinely
 * nondeterministic. Asserting it exactly would make the suite flaky on a slow
 * host; asserting nothing would let a budget of 0 — which silently disables the
 * sync — pass. So the value is checked for its INVARIANT (a usable slice of time,
 * never above the declared per-call cap) and then collapsed to a token.
 * @param {Array<Array>} calls - Recorded stub invocations
 * @returns {Array<Array>} Same list with sync timeouts collapsed to 'BUDGETED'
 */
function shapeOf(calls) {
    return calls.map((call) => {
        if (call[0] !== 'sync') return call;
        const timeout = call[3];
        assertTrue(
            typeof timeout === 'number' && timeout > 0 && timeout <= 15000,
            `sync timeout must be a positive slice of the hook budget capped at 15000, got ${timeout}`
        );
        return [...call.slice(0, 3), 'BUDGETED'];
    });
}

const hookTests = [
    {
        name: 'TC-GRAPHHEAD-010: prompt hook exposes the HEAD gate helpers it depends on',
        fn() {
            const utils = require(UTILS);
            for (const fnName of ['getGitHead', 'readLastSeenHead', 'writeLastSeenHead', 'getLastSeenHeadPath']) {
                assertEqual(typeof utils[fnName], 'function', `graph-utils must export ${fnName}`);
            }
        }
    },
    {
        name: 'TC-GRAPHHEAD-011: gate path (HEAD unchanged) is silent and skips Python',
        fn() {
            const r = runPromptHook({ unchanged: true });
            assertEqual(JSON.stringify(r.calls), '[]', 'unchanged HEAD must skip dependency probes, locks and Python sync');
            assertEqual(r.marker, r.head, 'marker must still record the evaluated HEAD');
        }
    },
    {
        name: 'TC-GRAPHHEAD-012: sync path (HEAD moved) is silent and records the new HEAD',
        fn() {
            for (const reason of ['synced', 'graph_ahead_skipped']) {
                const r = runPromptHook({ result: { reason } });
                assertEqual(r.marker, r.head, `${reason}: a decided sync must record the evaluated HEAD`);
                assertEqual(JSON.stringify(shapeOf(r.calls)), JSON.stringify([
                    ['cached?'], ['available'], ['clear'], ['acquire'], ['sync', 'sync', [], 'BUDGETED'], ['write', r.head], ['release']
                ]), `${reason}: sync must hold its lock, write once and release`);
            }
            for (const scenario of [
                { options: { available: false }, calls: [['cached?'], ['available'], ['mark']], label: 'unavailable dependencies' },
                { options: { cachedUnavailable: true }, calls: [['cached?']], label: 'cached-unavailable verdict' },
                { options: { locked: true }, calls: [['cached?'], ['available'], ['clear'], ['acquire']], label: 'held lock' },
                { options: { result: null }, calls: [['cached?'], ['available'], ['clear'], ['acquire'], ['sync', 'sync', [], 'BUDGETED'], ['release']], label: 'failed sync' }
            ]) {
                const r = runPromptHook(scenario.options);
                assertEqual(r.marker, r.initial, `${scenario.label}: retain stale marker so the next prompt can retry`);
                assertEqual(JSON.stringify(shapeOf(r.calls)), JSON.stringify(scenario.calls), `${scenario.label}: no forbidden sync/write/unlock`);
            }
        }
    },
    {
        name: 'TC-GRAPHHEAD-015: a recorded "deps unavailable" verdict costs nothing to honour',
        fn() {
            // The defect this guards: the HEAD gate can only fire once a sync has been
            // DECIDED. With the toolchain missing no sync is ever decided, so HEAD stays
            // ahead of the marker forever, and isGraphAvailable() — two Python spawns,
            // 5s cap each, in a fresh process that keeps no in-memory memo — was paid on
            // literally every prompt to rediscover the same missing package.
            const r = runPromptHook({ cachedUnavailable: true });
            assertEqual(
                JSON.stringify(r.calls), JSON.stringify([['cached?']]),
                'a cached negative verdict must short-circuit BEFORE isGraphAvailable, or it saves nothing'
            );
            assertEqual(r.marker, r.initial, 'a skipped probe must never claim the graph is synced');
        }
    },
    {
        name: 'TC-GRAPHHEAD-016: the verdict is recorded when unavailable and dropped when available',
        fn() {
            // Recording without clearing would be worse than no cache at all: a repaired
            // install would stay suppressed for the whole TTL.
            const unavailable = runPromptHook({ available: false });
            assertContains(
                JSON.stringify(unavailable.calls), '["mark"]',
                'an unavailable toolchain must be recorded so the next prompt skips the probe'
            );
            assertEqual(
                JSON.stringify(unavailable.calls).includes('"clear"'), false,
                'an unavailable toolchain must never clear the verdict'
            );

            const available = runPromptHook({});
            assertContains(
                JSON.stringify(available.calls), '["clear"]',
                'observing a working toolchain must drop any recorded verdict immediately'
            );
            assertEqual(
                JSON.stringify(available.calls).includes('"mark"'), false,
                'a working toolchain must never record itself unavailable'
            );
        }
    },
    {
        name: 'TC-GRAPHHEAD-017: graph-utils owns the negative-cache helpers and bounds the TTL',
        fn() {
            const utils = require(UTILS);
            for (const fnName of ['getDepsUnavailablePath', 'isDepsUnavailableCached', 'markDepsUnavailable', 'clearDepsUnavailable']) {
                assertEqual(typeof utils[fnName], 'function', `graph-utils must export ${fnName}`);
            }

            // Exercised in an isolated project root, through the real filesystem, because
            // the semantics under test ARE filesystem semantics: the marker's directory may
            // not exist yet, and the verdict's age is its mtime. An in-process stub would
            // assert the test's own bookkeeping instead.
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ckgraph-deps-'));
            // A `.claude` directory is what makes a root RESOLVABLE. Without it the marker
            // writers no-op by design — exactly as `writeLastSeenHead` does — rather than
            // scattering state into an unidentified directory, so the probe below would
            // otherwise be measuring that refusal instead of the TTL.
            fs.mkdirSync(path.join(root, '.claude'));
            try {
                const script = `
                    const u = require(${JSON.stringify(UTILS)});
                    const out = [];
                    out.push(['absent', u.isDepsUnavailableCached(60000)]);
                    u.markDepsUnavailable();
                    // Identity, not spelling: the root keeps the lexical CLAUDE_PROJECT_DIR spelling, which may
                    // differ from process.cwd() by a symlink or junction, so compare both sides canonically.
                    const real = require('fs').realpathSync;
                    out.push(['under-root', real(u.getDepsUnavailablePath()).startsWith(real(process.cwd()) + require('path').sep)]);
                    out.push(['fresh', u.isDepsUnavailableCached(60000)]);
                    out.push(['expired', u.isDepsUnavailableCached(0)]);
                    // A marker whose mtime sits slightly ahead of the clock is the
                    // ordinary just-written case on a filesystem with coarse timestamp
                    // granularity, NOT an invalid verdict.
                    const marker = u.getDepsUnavailablePath();
                    const soon = new Date(Date.now() + 2000);
                    require('fs').utimesSync(marker, soon, soon);
                    out.push(['future-skew', u.isDepsUnavailableCached(60000)]);
                    // A marker a whole TTL ahead is a broken clock, not a verdict.
                    const farFuture = new Date(Date.now() + 120000);
                    require('fs').utimesSync(marker, farFuture, farFuture);
                    out.push(['absurd-future', u.isDepsUnavailableCached(60000)]);
                    u.clearDepsUnavailable();
                    out.push(['cleared', u.isDepsUnavailableCached(60000)]);
                    u.clearDepsUnavailable(); // clearing an absent verdict must not throw
                    console.log(JSON.stringify(out));
                `;
                const child = spawnSync(process.execPath, ['-e', script], {
                    encoding: 'utf8', timeout: 20000, cwd: root, windowsHide: true,
                    env: { ...process.env, CLAUDE_PROJECT_DIR: root, CK_DEBUG: '0', CLAUDE_HOOK_DEBUG: '0', NODE_OPTIONS: '' },
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                assertEqual(child.status, 0, `negative-cache probe must succeed: ${child.stderr}`);
                const observed = Object.fromEntries(JSON.parse(child.stdout.trim().split('\n').pop()));

                assertEqual(observed.absent, false, 'no verdict on record must probe for real, never assume unavailable');
                assertEqual(observed['under-root'], true, 'the marker must live under the project root, not a shared temp path');
                assertEqual(observed.fresh, true, 'a just-recorded verdict must be honoured');
                // The TTL is the only thing making a cached negative safe to write at all:
                // without it a repair performed outside this framework stays suppressed forever.
                assertEqual(observed.expired, false, 'an aged-out verdict must be re-probed, not trusted');
                assertEqual(observed['future-skew'], true, 'a marker whose mtime is a moment ahead of the clock is freshly written, not invalid');
                assertEqual(observed['absurd-future'], false, 'a marker a whole TTL ahead is a broken clock and must be re-probed');
                assertEqual(observed.cleared, false, 'clearing must make the next check probe for real');
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    },
    {
        name: 'TC-GRAPHHEAD-013: hook is registered on UserPromptSubmit',
        fn() {
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf-8'));
            const commands = (settings.hooks.UserPromptSubmit || []).flatMap((entry) => entry.hooks.map((h) => h.command));
            assertContains(commands.join('\n'), 'graph-prompt-sync.cjs', 'graph-prompt-sync must be wired on UserPromptSubmit');
        }
    },
    {
        name: 'TC-GRAPHHEAD-014: session-init also covers resume, not just startup',
        fn() {
            // A resumed session is precisely the case where HEAD moved while away.
            const settings = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'settings.json'), 'utf-8'));
            const entry = (settings.hooks.SessionStart || []).find((e) => e.hooks.some((h) => h.command.includes('graph-session-init.cjs')));
            assertTrue(Boolean(entry), 'graph-session-init must be registered on SessionStart');
            assertContains(entry.matcher, 'resume', 'graph-session-init must run on resume, not startup only');
        }
    }
];

module.exports = {
    name: 'graph-head-staleness',
    tests: [...guardTests, ...hookTests]
};
