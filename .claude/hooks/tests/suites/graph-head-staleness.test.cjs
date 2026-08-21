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
 *
 * Python-dependent cases skip cleanly when the graph toolchain is absent, so the suite
 * stays green on a host that never installed tree-sitter.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
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
const hasGraphDb = fs.existsSync(path.join(REPO_ROOT, '.code-graph', 'graph.db'));

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

function runPromptHook() {
    const event = JSON.stringify({ hook_event_name: 'UserPromptSubmit', prompt: 'test', cwd: REPO_ROOT });
    const started = Date.now();
    const result = execFileSync('node', [HOOK], {
        input: event,
        encoding: 'utf-8',
        timeout: 120000,
        cwd: REPO_ROOT,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    return { ms: Date.now() - started, stdout: result };
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
        skip: hasGraphDb ? false : 'no .code-graph/graph.db on this host',
        fn() {
            // Marker primed explicitly: this test asserts the GATE path, so it must not
            // depend on whichever HEAD a previously-run test happened to leave behind.
            const utils = require(UTILS);
            const head = utils.getGitHead();
            assertTrue(head !== null, 'test requires a git repo');
            utils.writeLastSeenHead(head);

            const { ms, stdout } = runPromptHook();

            // A UserPromptSubmit hook that emits output injects it into the prompt.
            // Graph freshness is an accelerator and must stay invisible.
            assertEqual(stdout, '', 'graph-prompt-sync must stay silent on the prompt path');
            // A Python graph sync costs >1s; the pure-node gate path is a few hundred ms.
            assertTrue(ms < 1000, `gate path must not spawn Python (took ${ms}ms — did the HEAD check regress?)`);
            assertEqual(utils.readLastSeenHead(), head, 'marker must still record the evaluated HEAD');
        }
    },
    {
        name: 'TC-GRAPHHEAD-012: sync path (HEAD moved) is silent and records the new HEAD',
        skip: hasGraphDb ? false : 'no .code-graph/graph.db on this host',
        fn() {
            // Simulate "HEAD moved since the last prompt" by parking a stale marker —
            // the same state a `git pull` leaves behind.
            const utils = require(UTILS);
            const head = utils.getGitHead();
            assertTrue(head !== null, 'test requires a git repo');
            utils.writeLastSeenHead('0'.repeat(40));

            const { stdout } = runPromptHook();

            assertEqual(stdout, '', 'the sync path must stay silent too — it must never inject into the prompt');
            assertEqual(
                utils.readLastSeenHead(),
                head,
                'after evaluating a moved HEAD the marker must advance, or every later prompt re-spawns Python'
            );
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
