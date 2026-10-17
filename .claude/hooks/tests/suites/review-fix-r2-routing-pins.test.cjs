'use strict';

/**
 * Round-2 routing pins (review fix G1) — business intent guarded:
 *
 *   required   a workflow that an explicit skill step, the user's named skill or an already-running
 *              parent workflow requires is part of THAT run: it asks no workflow question (ask) and is not
 *              skipped (off). Modes ask and off govern only a workflow the assistant chooses to start, so a
 *              self-chosen catalog workflow still asks first (ask) and is still not started (off)
 *              (BR-WFR-13, TC-WFR-019). The REAL hooks run as child processes in a temp project: the route
 *              hook writes the gate or the off notice, the catalog hook writes the workflow catalog.
 *   routes     no skill tells the assistant to auto-select a workflow; routing belongs to the route gate.
 *   nested     a Next-Steps hand-off prompt is skipped only when THIS run is a linked step of a parent
 *              workflow (nested=true), never because a `[Workflow]` row merely exists in the task list.
 *   table      the integration-test verify mode keeps the flake verdict table only in its shared owner and
 *              carries no orphaned table separator.
 *   ledger     the retention shape check admits a session's own `_<name>.json` state files, so a session
 *              holding the route-mode directive is still aged and pruned.
 *
 * Portable Test Contract: hook tests use a temp project and a temp HOME; inherited CK_* switches are
 * blanked. Content pins read the framework repo's own shipped files (framework repo only).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HOOKS_DIR = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(HOOKS_DIR, '..', '..');
const { isFrameworkRepo } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'framework-repo-guard.cjs'));
const { childEnv, makeHookTreeProject, removeTempDir } = require(path.join(HOOKS_DIR, 'tests', 'lib', 'hook-runner.cjs'));

const IS_FRAMEWORK_REPO = isFrameworkRepo(REPO_ROOT);
const SKIP_REASON = 'reads the framework repo\'s own shipped files (framework-repo signal)';
const guarded = fn => ({ skip: IS_FRAMEWORK_REPO ? false : SKIP_REASON, fn });

const read = (...rel) => fs.readFileSync(path.join(REPO_ROOT, ...rel), 'utf8').replace(/\r\n?/g, '\n');
const skillText = (...rel) => read('.claude', 'skills', ...rel);

const SWITCHES = { CK_WORKFLOW_ROUTE_MODE: undefined, CK_SESSION_ID: undefined, CK_DEBUG: undefined, CLAUDE_HOOK_DEBUG: undefined, NODE_OPTIONS: undefined };

/** A temp project holding the real hook tree, routing libraries, workflow registry and gate file, plus its own HOME. */
function withProject(fn) {
    const root = makeHookTreeProject('r2-routing');
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-routing-home-'));
    const home = path.join(scratch, 'home');
    const tmp = path.join(scratch, 'tmp');
    fs.mkdirSync(home, { recursive: true });
    fs.mkdirSync(tmp, { recursive: true });
    const claude = path.join(REPO_ROOT, '.claude');
    fs.cpSync(path.join(claude, 'scripts', 'lib'), path.join(root, '.claude', 'scripts', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(claude, 'workflows.json'), path.join(root, '.claude', 'workflows.json'));
    fs.mkdirSync(path.join(root, '.claude', 'skills', 'shared'), { recursive: true });
    fs.copyFileSync(path.join(claude, 'skills', 'shared', 'workflow-first-gate.md'), path.join(root, '.claude', 'skills', 'shared', 'workflow-first-gate.md'));
    const run = (mode, session, hookFile = 'workflow-route-inject.cjs') => {
        const result = spawnSync(process.execPath, [path.join(root, '.claude', 'hooks', hookFile)], {
            cwd: root,
            input: JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: session, cwd: root, prompt: 'add a pagination option to the export command' }),
            env: childEnv({ ...SWITCHES, CK_WORKFLOW_ROUTE_MODE: mode, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home, TMPDIR: tmp, TEMP: tmp, TMP: tmp }),
            encoding: 'utf8', windowsHide: true, timeout: 30000
        });
        return { code: result.status, out: result.stdout || '', err: result.stderr || '' };
    };
    try {
        return fn(run);
    } finally {
        removeTempDir(root);
        removeTempDir(scratch);
    }
}

// The one sentence every mode's text carries, in that mode's own words.
const GATE_CLAUSE = 'A workflow a skill step, a named skill or a running workflow requires is part of that run, not your own selection: no question, `off` never skips it.';
const OFF_CLAUSE = '`off` governs only a workflow YOU choose to start: one that a skill step, a skill the user names or a running parent workflow requires is part of that run and is not skipped.';

/** The markdown table separator lines of `text` whose previous line is not a table row (an orphaned separator). */
function orphanSeparators(text) {
    const lines = text.split('\n');
    const orphans = [];
    lines.forEach((line, i) => {
        if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line) && !(i > 0 && lines[i - 1].trimStart().startsWith('|'))) orphans.push(i + 1);
    });
    return orphans;
}

const tests = [
    {
        name: '[review-fix-r2-routing] TC-WFR-019 the ask and auto routes carry the required-workflow clause and a self-chosen workflow still asks first',
        fn: () => withProject(run => {
            // Given a project in mode ask and in mode auto
            const ask = run('ask', `r2-ask-${process.pid}`);
            const auto = run('auto', `r2-auto-${process.pid}`);
            assert.equal(ask.code, 0, ask.err);
            assert.equal(auto.code, 0, auto.err);
            // Then each route says a workflow a run requires is part of that run: no question, never skipped
            for (const [label, out] of [['ask', ask.out], ['auto', auto.out]]) {
                assert.ok(out.includes(GATE_CLAUSE), `${label} route lost the required-workflow clause`);
            }
            // And a workflow the assistant chooses itself still waits for the question, in ask and in auto
            for (const [label, out] of [['ask', ask.out], ['auto', auto.out]]) {
                assert.ok(out.includes('**Workflow question** (every tier)'), `${label} route keeps the workflow question`);
                assert.ok(out.includes('it NEVER starts before the answer'), `${label} route keeps "never starts before the answer"`);
                assert.ok(out.includes('ask the workflow question (below) only when YOUR route is to start a catalog workflow'), `${label} route keeps the own-route trigger`);
            }
            // And auto recommends the full workflow first, never for a manual-tier workflow
            assert.ok(auto.out.includes('recommend (a) first, except for a `manual` tier'), 'auto route keeps the manual-tier rule');
        })
    },
    {
        name: '[review-fix-r2-routing] TC-WFR-019 the off notice carries the required-workflow clause and a self-chosen workflow is still not started',
        fn: () => withProject(run => {
            // Given a project in mode off
            const off = run('off', `r2-off-${process.pid}`);
            assert.equal(off.code, 0, off.err);
            // Then the notice says off governs only a workflow the assistant chooses to start
            assert.ok(off.out.includes(OFF_CLAUSE), 'off notice lost the required-workflow clause');
            // And it still forbids choosing or starting a workflow by itself, and still skips the skill step that would
            assert.ok(off.out.includes('Do not choose or start a workflow yourself'), 'off notice keeps the self-chosen prohibition');
            assert.ok(off.out.includes('a skill step that would start a workflow (skip that step and continue the skill)'), 'off notice keeps the skip rule');
            // And it still delivers no gate and no catalog: the route hook writes neither, and the catalog hook writes nothing
            assert.ok(!off.out.includes('CK:RUNTIME-WORKFLOW-ROUTE -->'), 'off must not deliver the ask/auto route');
            assert.ok(!off.out.includes('## Workflow & Skills Catalog'), 'off must not deliver the catalog');
            const catalog = run('off', `r2-off-${process.pid}`, 'workflow-catalog-inject.cjs');
            assert.equal(catalog.code, 0, catalog.err);
            assert.equal(catalog.out, '', 'off must not deliver the catalog output');
            // (Counter-case: with routing on, that same hook does deliver the catalog, so the silence above is the mode's doing.)
            const asked = run('ask', `r2-off-counter-${process.pid}`, 'workflow-catalog-inject.cjs');
            assert.ok(asked.out.includes('## Workflow & Skills Catalog'), 'the catalog hook delivers the catalog when routing is on');
        })
    },
    {
        name: '[review-fix-r2-routing] TC-WFR-019 start-workflow and the configuration guide state the required-workflow clause',
        ...guarded(() => {
            const start = skillText('start-workflow', 'SKILL.md');
            // Then the ask-mode rule exempts a required workflow from the question and from `off`
            assert.match(start, /A workflow \(or workflow skill\) that an explicit skill step, the user's named skill or an already-running parent workflow requires is part of that run, not a self-matched workflow: it neither asks the workflow question nor is skipped by `off`; the route modes \(`ask`, `auto`, `off`\) govern only a workflow YOU choose to start for the task\./);
            // And the off rule runs a required workflow in every mode
            assert.match(start, /An explicit request, and a workflow that a skill step, the user's named skill or a running parent workflow requires, run in every mode\./);
            // And a hand-off the assistant chose still counts as its own selection
            assert.match(start, /hand-off after you chose to invoke that skill — is your own selection, never an explicit request/);
            // And the route-mode guide carries the same sentence, with the commit example: a failing test's fix workflow
            const guide = read('.claude', 'docs', 'configuration', 'README.md');
            assert.match(guide, /So does a workflow that an explicit skill step, the skill you named or an already-running parent workflow requires[^\n]*`\/commit` running `\/workflow-integration-test --mode=green` to fix a failing test\): it is part of that run, not a self-matched workflow — it asks no workflow question and `off` does not skip it; `ask`, `auto` and `off` govern only a workflow the model chooses to start\./);
            // And the gate file owns the clause once, next to the explicit-request rule
            const gate = read('.claude', 'skills', 'shared', 'workflow-first-gate.md');
            assert.equal(gate.split(GATE_CLAUSE).length - 1, 1, 'the gate file carries the clause exactly once');
        })
    },
    {
        name: '[review-fix-r2-routing] TC-WFR-019 the workflow-routing spec states the clause (BR-WFR-13) and the catalog lives only in the guidance (AC-WFR-04)',
        ...guarded(() => {
            const spec = read('docs', 'specs', 'ContextDelivery', 'README.WorkflowRouting.md');
            assert.match(spec, /^- \*\*AC-WFR-19\*\*/m, 'AC-WFR-19 exists');
            assert.match(spec, /^### BR-WFR-13: A workflow a run requires is part of that run \[HARD\]/m, 'BR-WFR-13 exists');
            assert.match(spec, /^#### TC-WFR-019:/m, 'TC-WFR-019 exists');
            assert.doesNotMatch(spec, /full in the root instruction files/, 'the catalog is never full in a root file (AC-WFR-04)');
            // Every CoveredBy name of TC-WFR-019 resolves to a test of this suite
            const block = spec.slice(spec.indexOf('#### TC-WFR-019:'), spec.indexOf('### Validation Tests'));
            const names = [...block.matchAll(/review-fix-r2-routing-pins\.test\.cjs::(\[review-fix-r2-routing\][^`]+)`/g)].map(match => match[1]);
            assert.ok(names.length >= 3, 'TC-WFR-019 lists its covering tests');
            const own = new Set(tests.map(test => test.name));
            for (const name of names) assert.ok(own.has(name), `CoveredBy resolves: ${name}`);
        })
    },
    {
        name: '[review-fix-r2-routing] no skill tells the assistant to auto-select a workflow; e2e-test defers to the route gate',
        ...guarded(() => {
            const skillsDir = path.join(REPO_ROOT, '.claude', 'skills');
            const offenders = [];
            for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
                if (!entry.isDirectory()) continue;
                const file = path.join(skillsDir, entry.name, 'SKILL.md');
                if (!fs.existsSync(file)) continue;
                if (/auto-select the appropriate workflow|when not already in one/i.test(fs.readFileSync(file, 'utf8'))) offenders.push(entry.name);
            }
            assert.deepEqual(offenders, [], `skills that still auto-select a workflow: ${offenders.join(', ')}`);
            const e2e = skillText('e2e-test', 'SKILL.md');
            assert.match(e2e, /Workflow routing follows the route gate; this skill starts no workflow itself/);
        })
    },
    {
        name: '[review-fix-r2-routing] Next-Steps prompt is skipped only for THIS run\'s nested step, never for an ambient [Workflow] row',
        ...guarded(() => {
            for (const rel of [['integration-test', 'SKILL.md'], ['integration-test', 'references', 'mode-verify.md'], ['seed-test-data', 'SKILL.md']]) {
                const text = skillText(...rel);
                const label = rel.join('/');
                // Then the ambient-state condition is gone
                assert.doesNotMatch(text, /a parent `\[Workflow\]` task row is active per `TaskList`/, `${label} still keys the skip on an ambient [Workflow] row`);
                // And the skip requires THIS run's own linked phase tasks (nested=true)
                const line = text.split('\n').find(l => l.includes('**Inside a workflow**'));
                assert.ok(line, `${label} keeps its Inside-a-workflow line`);
                assert.match(line, /THIS run is a step of a `\[Workflow\]` row: its own phase tasks are linked to that parent row, `nested=true`/, `${label} must condition the skip on nested=true`);
                assert.match(line, /abandoned one, does not count/, `${label} must say an abandoned row does not count`);
                // And every other case asks as a standalone call
                assert.match(line, /\*\*Otherwise \(standalone, or only an unrelated `\[Workflow\]` row exists\):\*\*/, `${label} must ask when only an unrelated row exists`);
                assert.doesNotMatch(line, /\*\*Standalone:\*\*/, `${label} must not keep the old standalone label`);
            }

        })
    },
    {
        name: '[review-fix-r2-routing] integration-test --mode=verify keeps the flake table only in its shared owner and has no orphaned table separator',
        ...guarded(() => {
            const skill = skillText('integration-test', 'references', 'mode-verify.md');
            const shared = read('.claude', 'skills', 'shared', 'verify-convergence-loop.md');
            assert.deepEqual(orphanSeparators(skill), [], 'integration-test --mode=verify carries an orphaned table separator');
            // Then the verdict table rows live once, in the shared owner the read line names
            assert.doesNotMatch(skill, /^\| \*\*\([abc]\)/m, 'the skill duplicates the flake verdict table');
            assert.equal((shared.match(/^\| \*\*\([abc]\)/gm) || []).length, 3, 'the shared owner keeps the three-way verdict table');
            assert.match(skill, /MUST ATTENTION READ `\.claude\/skills\/shared\/verify-convergence-loop\.md` § 1 whenever a required test is red in one run and green in another/);
            // And every flake rule stays in the skill
            for (const rule of ['Verdict first, change second', 'Reproduce before concluding', 'NEVER resolve a flake by widening a timeout, adding a retry, or skipping', 'Do not file (c) until (a) and (b) are ruled out with evidence', 'Any resolution restarts the configured repeat gate']) {
                assert.ok(skill.includes(rule), `the flake rule "${rule}" was lost`);
            }
        })
    },
    {
        name: '[review-fix-r2-routing] the orphaned-separator detector flags a separator with no table row above it',
        fn: () => {
            assert.deepEqual(orphanSeparators('text\n\n----- | -----\n| a | b |'), [3]);
            assert.deepEqual(orphanSeparators('| h | i |\n| --- | --- |\n| a | b |'), []);
        }
    },
    {
        name: '[review-fix-r2-routing] the ledger retention shape admits a session\'s own state file, so a session holding the route-mode directive is pruned when stale',
        fn: () => {
            const ledger = require(path.join(HOOKS_DIR, 'lib', 'convention-ledger.cjs'));
            const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r2-ledger-'));
            try {
                const DAY = 24 * 60 * 60 * 1000;
                const age = dir => {
                    const stamp = (Date.now() - 8 * DAY) / 1000;
                    const targets = [];
                    const walk = current => {
                        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
                            const full = path.join(current, entry.name);
                            targets.push(full);
                            if (entry.isDirectory()) walk(full);
                        }
                    };
                    walk(dir);
                    targets.push(dir);
                    for (const target of targets.reverse()) fs.utimesSync(target, stamp, stamp);
                };
                // Given a session that received a route-mode directive, and one that only holds an owner marker
                assert.ok(ledger.writeSessionState(root, 'with-directive', 'route-mode', { mode: 'off' }));
                assert.ok(ledger.markSessionOwned(root, 'owner-only'));
                // And a stranger's folder that holds a `_x.json` file but no ownership marker
                fs.mkdirSync(path.join(root, 'stranger'), { recursive: true });
                fs.writeFileSync(path.join(root, 'stranger', '_state.json'), '{}');
                // And an owned session that also holds a file the ledger never writes
                assert.ok(ledger.writeSessionState(root, 'foreign-file', 'route-mode', { mode: 'ask' }));
                fs.writeFileSync(path.join(root, 'foreign-file', 'notes.txt'), 'mine');
                for (const dir of ['with-directive', 'owner-only', 'stranger', 'foreign-file']) age(path.join(root, dir));
                // When the retention sweep runs
                const removed = ledger.pruneStale(root, Date.now());
                // Then the directive session is aged and removed with the owner-only one
                assert.equal(removed, 2, 'both stale owned sessions are removed');
                assert.ok(!fs.existsSync(path.join(root, 'with-directive')), 'a session holding _route-mode.json is pruned when stale');
                assert.ok(!fs.existsSync(path.join(root, 'owner-only')));
                // And an unmarked folder, and a folder with a file of unknown shape, are never deleted
                assert.ok(fs.existsSync(path.join(root, 'stranger', '_state.json')), 'shape alone never authorizes deletion');
                assert.ok(fs.existsSync(path.join(root, 'foreign-file', 'notes.txt')), 'a foreign file keeps the folder');
            } finally {
                removeTempDir(root);
            }
        }
    }
];

module.exports = { name: 'review-fix-r2-routing-pins', tests };
