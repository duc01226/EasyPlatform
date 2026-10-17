'use strict';

/**
 * Session usage report CLI (.claude/scripts/session-usage-report.cjs) — guarded contracts:
 *   BR-GWF-10  a comparison shows per-figure deltas and B ÷ A percent; each run's total is
 *              input + cache_creation + output, and cache_read prints apart, "not in total";
 *   BR-GWF-17  the report prints only allowlisted fields: never message text, command text or the
 *              evidence column of a deviation-log line (text and --json alike);
 *   BR-GWF-08  a run id outside the allowed form, or one that climbs out of the run area, is refused
 *              before any read; every closed deviation kind prints, any other kind is invalid-line;
 *   BR-GWF-07  skill loads sum over the main session and every sub-agent (effective steps).
 * Each test name starts with its TC id (spec `README.GuidedWorkflow.md` §8). The CLI is spawned as a
 * real process (precedent: doc-impact-map.test.cjs `runMapper`) from a unique temp project; HOME,
 * USERPROFILE, TMPDIR, TEMP, TMP and CLAUDE_PROJECT_DIR point at that temp dir, so nothing of this
 * repository or the developer's machine is read. Fixtures are removed in `finally`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const SCRIPT = path.join(CLAUDE_DIR, 'scripts', 'session-usage-report.cjs');
const START_WORKFLOW = path.join(CLAUDE_DIR, 'skills', 'start-workflow', 'SKILL.md');
const FAKE_SECRET = 'sk-test-FAKE';
const ALL_KINDS = ['when-false', 'pre-action', 'intent-skip', 'merged', 'simplified', 'reordered', 'review-report'];

function withProject(fn) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'session-usage-report-test-'));
    const transcripts = path.join(root, 'transcripts');
    fs.mkdirSync(transcripts, { recursive: true });
    const fx = {
        root,
        transcript(session) {
            return path.join(transcripts, `${session}.jsonl`);
        },
        subagent(session, id) {
            const dir = path.join(transcripts, session, 'subagents');
            fs.mkdirSync(dir, { recursive: true });
            return path.join(dir, `agent-${id}.jsonl`);
        },
        skipLog(runId, text) {
            const dir = path.join(root, 'tmp', 'workflow-runs', runId);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, 'skips.md'), text);
        }
    };
    try {
        return fn(fx);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

/** The CLI as a real process, cwd = the temp project, home/temp/project-dir redirected into it. */
function runReport(fx, args) {
    const env = { ...process.env };
    const redirected = ['HOME', 'USERPROFILE', 'TMPDIR', 'TEMP', 'TMP', 'CLAUDE_PROJECT_DIR'];
    for (const key of Object.keys(env)) {
        if (redirected.some(name => (process.platform === 'win32' ? name === key.toUpperCase() : name === key))) delete env[key];
    }
    for (const key of redirected) env[key] = fx.root;
    const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: fx.root, env, encoding: 'utf8', timeout: 30000 });
    return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

/** One assistant usage line in the Claude transcript shape. */
function usageLine(id, [input, cacheCreation, cacheRead, output], content = []) {
    return JSON.stringify({
        type: 'assistant',
        requestId: `req_${id}`,
        message: {
            id: `msg_${id}`,
            role: 'assistant',
            content,
            usage: {
                input_tokens: input,
                cache_creation_input_tokens: cacheCreation,
                cache_read_input_tokens: cacheRead,
                output_tokens: output
            }
        }
    }) + '\n';
}

function userLine(text) {
    return JSON.stringify({ type: 'user', message: { role: 'user', content: text } }) + '\n';
}

const skillCall = (id, skill) => ({ type: 'tool_use', id, name: 'Skill', input: { skill } });

/** The text line of one figure in a report block, e.g. `  total   123  non-cached ...`. */
function figureLine(stdout, field, after = '') {
    const from = after ? stdout.indexOf(after) : 0;
    assert.ok(from >= 0, `section "${after}" printed`);
    const line = stdout.slice(from).split('\n').find(l => l.trimStart().startsWith(`${field} `));
    assert.ok(line, `figure "${field}" printed after "${after}"`);
    return line;
}

const tests = [
    {
        name: '[usage-report] TC-GWF-031 comparing two runs prints per-figure deltas and B/A percent; total = input + cache_creation + output; cache_read apart, "not in total"',
        fn: () => withProject(fx => {
            // Given run A: main (10/100/1000/20) + one sub-agent (5/50/500/10) → total 195, cache_read 1500
            const runA = fx.transcript('run-a');
            fs.writeFileSync(runA, usageLine('a1', [10, 100, 1000, 20]));
            fs.writeFileSync(fx.subagent('run-a', 'x1'), usageLine('a2', [5, 50, 500, 10]));
            // And run B: main only (20/100/3000/15) → total 135, cache_read 3000
            const runB = fx.transcript('run-b');
            fs.writeFileSync(runB, usageLine('b1', [20, 100, 3000, 15]));

            // When they are compared (text and --json)
            const text = runReport(fx, ['--transcript', runA, '--compare', runB]);
            const json = runReport(fx, ['--transcript', runA, '--compare', runB, '--json']);

            // Then both print, exit 0
            assert.equal(text.code, 0, text.stderr);
            assert.equal(json.code, 0, json.stderr);
            // And each run's total is the non-cached sum, labelled as the checkpoint metric
            assert.match(figureLine(text.stdout, 'total', 'Run A'), /\b195\b.*non-cached total \(checkpoint metric\)/);
            assert.match(figureLine(text.stdout, 'total', 'Run B'), /\b135\b.*non-cached total \(checkpoint metric\)/);
            // And cache_read prints on its own line, marked "not in total", never inside the total
            assert.match(figureLine(text.stdout, 'cache_read', 'Run A'), /\b1500\b\s+not in total/);
            assert.match(figureLine(text.stdout, 'cache_read', 'Run B'), /\b3000\b\s+not in total/);
            // And every figure prints both values, the delta and B/A percent
            const cmp = 'Comparison';
            assert.match(figureLine(text.stdout, 'input', cmp), /A 15\s+B 20\s+delta \+5\s+133\.3%/);
            assert.match(figureLine(text.stdout, 'cache_creation', cmp), /A 150\s+B 100\s+delta -50\s+66\.7%/);
            assert.match(figureLine(text.stdout, 'output', cmp), /A 30\s+B 15\s+delta -15\s+50%/);
            assert.match(figureLine(text.stdout, 'total', cmp), /A 195\s+B 135\s+delta -60\s+69\.2%/);
            assert.match(figureLine(text.stdout, 'cache_read', cmp), /A 1500\s+B 3000\s+delta \+1500\s+200%\s+not in total/);
            // And the structured output carries the same figures
            const report = JSON.parse(json.stdout);
            for (const run of report.runs) {
                assert.equal(run.total, run.tokens.input + run.tokens.cache_creation + run.tokens.output, `run ${run.label} total`);
            }
            assert.deepEqual(report.runs.map(run => run.total), [195, 135]);
            assert.deepEqual(report.comparison.total, { a: 195, b: 135, delta: -60, percent: 69.2 });
            assert.deepEqual(report.comparison.cache_read, { a: 1500, b: 3000, delta: 1500, percent: 200 });

            // Edge: one unreadable run → "unreadable" for it, no guessed figure and no comparison
            const missing = runReport(fx, ['--transcript', runA, '--compare', fx.transcript('gone')]);
            assert.equal(missing.code, 0);
            assert.match(missing.stdout, /Run B\n\s+unreadable: Claude transcripts only/);
            assert.match(missing.stdout, /no comparison: run B unreadable: Claude transcripts only/);
            assert.doesNotMatch(missing.stdout, /delta [+-]?\d|\d%/);
            const missingJson = JSON.parse(runReport(fx, ['--transcript', runA, '--compare', fx.transcript('gone'), '--json']).stdout);
            assert.deepEqual(missingJson.runs[1], { label: 'B', readable: false, reason: 'unreadable: Claude transcripts only' });
            assert.equal(missingJson.comparison, null);
        })
    },
    {
        name: '[usage-report] TC-GWF-032 message text and a Bash command holding a fake token never reach the text or --json report',
        fn: () => withProject(fx => {
            // Given a run whose user message, assistant text and Bash tool_input.command hold a fake token
            const main = fx.transcript('secret-run');
            fs.writeFileSync(main,
                userLine(`please use ${FAKE_SECRET} for the deploy`) +
                usageLine('s1', [3, 30, 300, 7], [
                    { type: 'text', text: `I will export ${FAKE_SECRET} now` },
                    { type: 'tool_use', id: 'toolu_bash', name: 'Bash', input: { command: `export API_KEY=${FAKE_SECRET}` } },
                    skillCall('toolu_skill', FAKE_SECRET)
                ]));
            // And a sub-agent that echoes the token in its own command
            fs.writeFileSync(fx.subagent('secret-run', 'y1'), usageLine('s2', [1, 1, 1, 1], [
                { type: 'tool_use', id: 'toolu_bash2', name: 'Bash', input: { command: `echo ${FAKE_SECRET}` } }
            ]));

            // When the report is printed as text and as structured output
            const text = runReport(fx, ['--transcript', main]);
            const json = runReport(fx, ['--transcript', main, '--json']);

            // Then neither output contains the token
            assert.equal(text.code, 0, text.stderr);
            assert.equal(json.code, 0, json.stderr);
            assert.ok(!text.stdout.includes(FAKE_SECRET), 'text report leaks the fake token');
            assert.ok(!json.stdout.includes(FAKE_SECRET), 'json report leaks the fake token');
            assert.ok(!text.stdout.includes('API_KEY') && !json.stdout.includes('API_KEY'), 'command text printed');
            // And the allowlisted fields still print: the tool name, never its input
            const report = JSON.parse(json.stdout);
            assert.equal(report.runs[0].tools.Bash, 2);
            // And a skill name outside the allowed form prints as "other"
            assert.deepEqual(report.runs[0].skills, { other: 1 });
            assert.match(text.stdout, /\n\s+other\s+1\n/);
        })
    },
    {
        name: '[usage-report] TC-GWF-033 the deviation log prints occurrence id + kind only, all 7 kinds parse, unknown kinds are invalid-line, and a hostile run id is refused before any read',
        fn: () => withProject(fx => {
            // Given a deviation log with every closed kind, free-text evidence, and two malformed lines
            const evidence = ALL_KINDS.map(kind => `evidence for ${kind} ${FAKE_SECRET} · with a separator`);
            fx.skipLog('run-1',
                ALL_KINDS.map((kind, i) => `step-${i}${' · '}${kind}${' · '}${evidence[i]}`).join('\n') +
                `\nlegacy-2.4.0-abc-3 · approved-by-me · ${FAKE_SECRET}\n` +
                `../../etc · merged · ${FAKE_SECRET}\n\n`);

            // When it is printed (text and --json)
            const text = runReport(fx, ['--run', 'run-1']);
            const json = runReport(fx, ['--run', 'run-1', '--json']);

            // Then each valid line shows only the occurrence id and the kind, for all 7 kinds
            assert.equal(text.code, 0, text.stderr);
            for (const [i, kind] of ALL_KINDS.entries()) {
                assert.ok(text.stdout.includes(`\n  step-${i} · ${kind}\n`), `kind ${kind} printed as id · kind`);
            }
            // And a line with an unknown kind, or a non-step id, prints as invalid-line
            assert.equal(text.stdout.split('\n').filter(line => line.trim() === 'invalid-line').length, 2);
            assert.match(text.stdout, /deviations: 7, invalid lines: 2/);
            // And no evidence text is printed either way
            for (const out of [text.stdout, json.stdout]) {
                assert.ok(!out.includes(FAKE_SECRET) && !out.includes('evidence for') && !out.includes('approved-by-me'), 'evidence printed');
            }
            const log = JSON.parse(json.stdout).deviationLog;
            assert.equal(log.status, 'found');
            assert.deepEqual(log.lines.filter(line => !line.invalid).map(line => line.kind), ALL_KINDS);
            assert.deepEqual(Object.keys(log.lines[0]).sort(), ['kind', 'occurrenceId']);

            // Given a readable log one directory above the run area, reachable only by climbing out
            fs.mkdirSync(path.join(fx.root, 'tmp', 'escape'), { recursive: true });
            fs.writeFileSync(path.join(fx.root, 'tmp', 'escape', 'skips.md'), `escaped-step · merged · ${FAKE_SECRET}\n`);
            // When a run id that climbs out, an absolute path, `.`, `..` or an empty-start id is requested
            for (const hostile of ['../escape', '..', '.', path.join(fx.root, 'tmp', 'escape'), '-x', 'a/b']) {
                const refused = runReport(fx, ['--run', hostile]);
                // Then the report refuses with a failure and prints nothing it could have read
                assert.notEqual(refused.code, 0, `run id ${hostile} refused`);
                assert.match(refused.stderr, /invalid run id|needs a value/);
                assert.equal(refused.stdout, '', `nothing printed for ${hostile}`);
            }

            // Edge: no log for a valid run id → "no skip log"
            const none = runReport(fx, ['--run', 'run-2']);
            assert.equal(none.code, 0);
            assert.match(none.stdout, /\n\s+no skip log\n/);
        })
    },
    {
        name: '[usage-report] TC-GWF-033 the CLI deviation kinds equal the closed set in start-workflow (runner and report cannot drift)',
        fn: () => {
            // Given the runner's closed kind list (start-workflow Step Execution Protocol, deviation log rule)
            const skill = fs.readFileSync(START_WORKFLOW, 'utf8');
            const at = skill.indexOf('Deviation kinds (closed set');
            assert.ok(at >= 0, 'start-workflow declares the closed deviation kinds');
            const rule = skill.slice(at, skill.indexOf('\n', at));
            const runnerKinds = [...rule.matchAll(/`([a-z][a-z-]*)` \(/g)].map(match => match[1]);
            // When the CLI's own set is loaded
            const { DEVIATION_KINDS } = require(SCRIPT);
            // Then both lists are the same 7 kinds, in the same order
            assert.deepEqual(runnerKinds, ALL_KINDS);
            assert.deepEqual([...DEVIATION_KINDS], runnerKinds);
        }
    },
    {
        name: '[usage-report] TC-GWF-054 skill loads sum over main and sub-agents per name; effective steps = 5',
        fn: () => withProject(fx => {
            // Given 2 Skill calls in main (plan, changes-review) and 3 in a sub-agent (changes-review, test, why-review)
            const main = fx.transcript('nested-run');
            fs.writeFileSync(main,
                usageLine('m1', [1, 1, 1, 1], [skillCall('t1', 'plan')]) +
                usageLine('m2', [1, 1, 1, 1], [skillCall('t2', 'changes-review')]));
            fs.writeFileSync(fx.subagent('nested-run', 'r1'),
                usageLine('r1', [1, 1, 1, 1], [skillCall('t3', 'changes-review'), skillCall('t4', 'test')]) +
                usageLine('r2', [1, 1, 1, 1], [skillCall('t5', 'why-review')]));

            // When the report is printed (text and --json)
            const text = runReport(fx, ['--transcript', main]);
            const json = runReport(fx, ['--transcript', main, '--json']);

            // Then the rows sum both files per skill name
            assert.equal(text.code, 0, text.stderr);
            const run = JSON.parse(json.stdout).runs[0];
            assert.deepEqual(run.skills, { 'changes-review': 2, plan: 1, test: 1, 'why-review': 1 });
            assert.match(figureLine(text.stdout, 'changes-review', 'Skill loads'), /changes-review\s+2$/);
            // And the effective-step total is 5
            assert.equal(run.effectiveSteps, 5);
            assert.match(text.stdout, /effective steps: 5\n/);
            // And each agent row carries its own skill loads (main 2, sub-agent 3)
            assert.deepEqual(run.agents.map(agent => [agent.name, agent.skillLoads]), [['main', 2], ['agent-r1', 3]]);
        })
    }
];

module.exports = { name: 'Session Usage Report CLI', tests };
