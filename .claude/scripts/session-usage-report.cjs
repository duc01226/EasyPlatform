#!/usr/bin/env node
'use strict';

/**
 * session-usage-report — print the token usage of one Claude session, or compare two, plus a
 * run's deviation log (the skip log).
 *
 * Usage:
 *   node .claude/scripts/session-usage-report.cjs --transcript <path> [--compare <path>] [--run <runId>] [--json]
 *   node .claude/scripts/session-usage-report.cjs --run <runId> [--json]
 *
 * Contract:
 * - Offline and read-only. Usage comes from the full, deduplicating read of
 *   `.claude/hooks/lib/session-usage.cjs` (`readUsage`): the main transcript plus every sub-agent
 *   transcript, each response counted once. Output goes to stdout; the caller saves it.
 * - The non-cached total (input + cache_creation + output) is the checkpoint metric. cache_read
 *   prints on its own line, marked "not in total".
 * - Skill loads are summed per skill name over main and sub-agents; their sum is the
 *   "effective steps" figure.
 * - `--compare <path>` prints both runs and, per figure, the delta (B − A) and B ÷ A as a percent.
 * - `--run <runId>` reads `tmp/workflow-runs/<runId>/skips.md` under the current working
 *   directory. The run id is validated before any path is built; a bad one exits 1 and reads
 *   nothing. A missing log prints "no skip log".
 * - Print allowlist: token counts, the skipped-long-line count, `main`/`agent-<id>` names, tool
 *   names, skill names in `^[a-z0-9][a-z0-9-]*$` form (others print as `other`), and from each
 *   deviation-log line only its occurrence id and deviation kind — never the evidence text. A line
 *   whose kind is outside the closed set, or whose id is not a step id, prints as `invalid-line`.
 * - A transcript that cannot be read as a Claude transcript (missing file, a directory, another
 *   host's format with no usage records) prints "unreadable: Claude transcripts only" and exits 0;
 *   no figure is ever guessed for it.
 * Exit codes: 0 report printed (including unreadable runs); 1 bad arguments or a refused run id.
 */

const fs = require('fs');
const path = require('path');
const { readUsage, USAGE_FIELDS } = require('../hooks/lib/session-usage.cjs');

// Same literal as `RUN_ID` in `.claude/scripts/lib/workflow-baseline.cjs:30`; `.` and `..` are also
// refused, as `assertRunId` does there (`:41-45`). Copied because that lib does not export them.
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
// Deviation kinds, closed set: `start-workflow` SKILL.md → Step Execution Protocol, step 6 (BR-GWF-08).
const DEVIATION_KINDS = Object.freeze([
    'when-false',
    'pre-action',
    'intent-skip',
    'merged',
    'simplified',
    'reordered',
    'review-report'
]);
// Occurrence ids are schema ids (`^[a-z][a-z0-9-]*$`) or resolver ids such as `legacy-2.4.0-<hash>-1`.
const OCCURRENCE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SKILL_NAME = /^[a-z0-9][a-z0-9-]*$/;
const TOOL_NAME = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const AGENT_NAME = /^(main|agent-[A-Za-z0-9._-]{1,128})$/;
const SEPARATOR = ' · ';
const INVALID_LINE = 'invalid-line';
const OTHER = 'other';
const SKIP_LOG_MAX_BYTES = 1024 * 1024;
const UNREADABLE = 'unreadable: Claude transcripts only';
const TOKEN_FIELDS = Object.keys(USAGE_FIELDS);
const USAGE_TEXT = [
    'Usage: node .claude/scripts/session-usage-report.cjs --transcript <path> [--compare <path>] [--run <runId>] [--json]',
    '       node .claude/scripts/session-usage-report.cjs --run <runId> [--json]'
].join('\n');

class UsageError extends Error {}

/** Parses argv; throws UsageError on anything outside the documented flags. */
function parseArgs(argv) {
    const args = { transcript: null, compare: null, run: null, json: false };
    const valued = { '--transcript': 'transcript', '--compare': 'compare', '--run': 'run' };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--json') {
            args.json = true;
            continue;
        }
        const key = valued[arg];
        if (!key) throw new UsageError(`unknown argument: ${arg.startsWith('-') ? arg : '<value>'}`);
        const value = argv[i + 1];
        if (typeof value !== 'string' || value === '' || valued[value] || value === '--json') {
            throw new UsageError(`${arg} needs a value`);
        }
        if (args[key] !== null) throw new UsageError(`${arg} given twice`);
        args[key] = value;
        i += 1;
    }
    if (!args.transcript && !args.run) throw new UsageError('give --transcript <path> or --run <runId>');
    if (args.compare && !args.transcript) throw new UsageError('--compare needs --transcript');
    return args;
}

function allowed(name, pattern) {
    return typeof name === 'string' && pattern.test(name) ? name : OTHER;
}

/** Adds `counts` into `target`, re-applying the name allowlist. */
function mergeCounts(target, counts, pattern) {
    for (const [name, value] of Object.entries(counts || {})) {
        const key = allowed(name, pattern);
        target[key] = (target[key] || 0) + (Number.isFinite(value) ? value : 0);
    }
    return target;
}

function sortedCounts(counts) {
    return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function tokensOf(totals) {
    const tokens = {};
    for (const field of TOKEN_FIELDS) tokens[field] = totals && Number.isFinite(totals[field]) ? totals[field] : 0;
    return tokens;
}

function nonCached(tokens) {
    return tokens.input + tokens.cache_creation + tokens.output;
}

/**
 * The printable summary of one transcript: only allowlisted fields. `readable: false` carries no
 * figure at all, so nothing downstream can print a guessed number.
 */
function summarize(transcriptPath) {
    let usage;
    try {
        usage = readUsage(transcriptPath);
    } catch {
        usage = null;
    }
    const entries = usage ? [usage.main, ...usage.subagents] : [];
    const counted = entries.some(entry => TOKEN_FIELDS.some(field => entry.totals[field] > 0));
    if (!usage || usage.unreadable.includes('main') || !counted) return { readable: false };

    const tokens = tokensOf(null);
    const tools = {};
    const skills = {};
    const agents = entries.map(entry => {
        const agentTokens = tokensOf(entry.totals);
        for (const field of TOKEN_FIELDS) tokens[field] += agentTokens[field];
        mergeCounts(tools, entry.tools, TOOL_NAME);
        mergeCounts(skills, entry.skills, SKILL_NAME);
        const skillLoads = Object.values(entry.skills || {}).reduce((sum, value) => sum + value, 0);
        return { name: allowed(entry.name, AGENT_NAME), tokens: agentTokens, total: nonCached(agentTokens), skillLoads };
    });
    return {
        readable: true,
        tokens,
        total: nonCached(tokens),
        skippedLongLines: Number.isSafeInteger(usage.skippedLongLines) ? usage.skippedLongLines : 0,
        agents,
        unreadableAgents: usage.unreadable.map(name => allowed(name, AGENT_NAME)),
        tools: sortedCounts(tools),
        skills: sortedCounts(skills),
        effectiveSteps: Object.values(skills).reduce((sum, value) => sum + value, 0)
    };
}

function delta(a, b) {
    const diff = b - a;
    return { a, b, delta: diff, percent: a > 0 ? Math.round((b / a) * 1000) / 10 : null };
}

/** Per-figure deltas and B ÷ A percent; null when either run is unreadable (never a guess). */
function compare(runA, runB) {
    if (!runA.readable || !runB.readable) return null;
    const figures = {};
    for (const field of TOKEN_FIELDS) figures[field] = delta(runA.tokens[field], runB.tokens[field]);
    figures.total = delta(runA.total, runB.total);
    figures.effectiveSteps = delta(runA.effectiveSteps, runB.effectiveSteps);
    figures.skippedLongLines = delta(runA.skippedLongLines, runB.skippedLongLines);
    return figures;
}

/** One deviation-log line → `{ occurrenceId, kind }`, or `{ invalid: true }`. Evidence is dropped. */
function parseDeviationLine(line) {
    const first = line.indexOf(SEPARATOR);
    if (first < 0) return { invalid: true };
    const occurrenceId = line.slice(0, first).trim();
    const rest = line.slice(first + SEPARATOR.length);
    const second = rest.indexOf(SEPARATOR);
    const kind = (second < 0 ? rest : rest.slice(0, second)).trim();
    if (!OCCURRENCE_ID.test(occurrenceId) || !DEVIATION_KINDS.includes(kind)) return { invalid: true };
    return { occurrenceId, kind };
}

function validRunId(runId) {
    return typeof runId === 'string' && RUN_ID.test(runId) && runId !== '.' && runId !== '..';
}

/**
 * Reads `tmp/workflow-runs/<runId>/skips.md` under `cwd`. The caller validates `runId` first.
 * Symlinked run directories or logs, non-files and oversized logs are reported, never followed.
 */
function readDeviationLog(runId, cwd) {
    const runDir = path.join(cwd, 'tmp', 'workflow-runs', runId);
    const file = path.join(runDir, 'skips.md');
    let stat;
    try {
        if (fs.lstatSync(runDir).isSymbolicLink()) return { runId, status: 'refused', lines: [] };
        stat = fs.lstatSync(file);
    } catch {
        return { runId, status: 'missing', lines: [] };
    }
    if (!stat.isFile()) return { runId, status: 'refused', lines: [] };
    if (stat.size > SKIP_LOG_MAX_BYTES) return { runId, status: 'too-large', lines: [] };
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch {
        return { runId, status: 'missing', lines: [] };
    }
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '').map(parseDeviationLine);
    return { runId, status: 'found', lines };
}

function signed(value) {
    return value > 0 ? `+${value}` : String(value);
}

function percentText(percent) {
    return percent === null ? 'n/a' : `${percent}%`;
}

function pad(text, width) {
    return String(text).padEnd(width);
}

function formatRun(label, run) {
    const out = [`${label}`];
    if (!run.readable) return [...out, `  ${UNREADABLE}`];
    for (const field of ['input', 'cache_creation', 'output']) out.push(`  ${pad(field, 16)}${run.tokens[field]}`);
    out.push(`  ${pad('total', 16)}${run.total}  non-cached total (checkpoint metric) = input + cache_creation + output`);
    out.push(`  ${pad('cache_read', 16)}${run.tokens.cache_read}  not in total`);
    if (run.skippedLongLines > 0) {
        out.push(`  skipped oversized lines: ${run.skippedLongLines}; the total is low by their usage`);
    }
    if (run.unreadableAgents.length > 0) out.push(`  unreadable sub-agent transcripts: ${run.unreadableAgents.join(', ')}`);
    out.push('  Agents (input / cache_creation / cache_read / output / total / skill loads)');
    for (const agent of run.agents) {
        const t = agent.tokens;
        out.push(`    ${pad(agent.name, 24)}${t.input} / ${t.cache_creation} / ${t.cache_read} / ${t.output} / ${agent.total} / ${agent.skillLoads}`);
    }
    const tools = Object.entries(run.tools);
    out.push(`  Tool calls${tools.length ? '' : ': none'}`);
    for (const [name, value] of tools) out.push(`    ${pad(name, 24)}${value}`);
    const skills = Object.entries(run.skills);
    out.push(`  Skill loads, main + sub-agents${skills.length ? '' : ': none'}`);
    for (const [name, value] of skills) out.push(`    ${pad(name, 24)}${value}`);
    out.push(`  effective steps: ${run.effectiveSteps}`);
    return out;
}

function formatComparison(figures, runA, runB) {
    const out = ['Comparison (B vs A: delta = B - A, percent = B / A)'];
    if (!figures) {
        const which = [!runA.readable && 'A', !runB.readable && 'B'].filter(Boolean).join(' and ');
        return [...out, `  no comparison: run ${which} ${UNREADABLE}`];
    }
    const rows = [
        ['input', figures.input],
        ['cache_creation', figures.cache_creation],
        ['output', figures.output],
        ['total', figures.total, 'non-cached total (checkpoint metric)'],
        ['cache_read', figures.cache_read, 'not in total'],
        ['effective steps', figures.effectiveSteps],
        ['skipped lines', figures.skippedLongLines]
    ];
    for (const [name, f, note] of rows) {
        out.push(`  ${pad(name, 16)}A ${f.a}  B ${f.b}  delta ${signed(f.delta)}  ${percentText(f.percent)}${note ? `  ${note}` : ''}`);
    }
    return out;
}

function formatDeviationLog(log) {
    const out = [`Deviation log (skip log), run ${log.runId}`];
    if (log.status === 'missing') return [...out, '  no skip log'];
    if (log.status === 'refused') return [...out, '  skip log refused: not a regular file'];
    if (log.status === 'too-large') return [...out, `  skip log refused: over ${SKIP_LOG_MAX_BYTES} bytes`];
    if (log.lines.length === 0) return [...out, '  no deviations'];
    for (const line of log.lines) out.push(line.invalid ? `  ${INVALID_LINE}` : `  ${line.occurrenceId}${SEPARATOR}${line.kind}`);
    const invalid = log.lines.filter(line => line.invalid).length;
    out.push(`  deviations: ${log.lines.length - invalid}, invalid lines: ${invalid}`);
    return out;
}

/** Builds the report object from parsed args. Throws UsageError for a refused run id. */
function buildReport(args, cwd) {
    if (args.run !== null && !validRunId(args.run)) throw new UsageError('invalid run id: refused before any read');
    const runs = [];
    if (args.transcript) runs.push({ label: 'A', ...summarize(args.transcript) });
    if (args.compare) runs.push({ label: 'B', ...summarize(args.compare) });
    const comparison = args.compare ? compare(runs[0], runs[1]) : null;
    const deviationLog = args.run !== null ? readDeviationLog(args.run, cwd) : null;
    return { runs, comparison, deviationLog };
}

function formatText(report) {
    const out = ['Session usage report'];
    for (const run of report.runs) {
        const label = report.runs.length > 1 ? `Run ${run.label}` : 'Run';
        out.push(...formatRun(label, run));
    }
    if (report.runs.length > 1) out.push(...formatComparison(report.comparison, report.runs[0], report.runs[1]));
    if (report.deviationLog) out.push(...formatDeviationLog(report.deviationLog));
    return `${out.join('\n')}\n`;
}

function formatJson(report) {
    const runs = report.runs.map(run => (run.readable ? run : { label: run.label, readable: false, reason: UNREADABLE }));
    const log = report.deviationLog;
    const deviationLog = log
        ? {
            runId: log.runId,
            status: log.status,
            lines: log.lines.map(line => (line.invalid ? { invalid: true } : { occurrenceId: line.occurrenceId, kind: line.kind }))
        }
        : null;
    return `${JSON.stringify({ runs, comparison: report.comparison, deviationLog }, null, 2)}\n`;
}

function main(argv, { cwd = process.cwd(), stdout = process.stdout, stderr = process.stderr } = {}) {
    let args;
    try {
        args = parseArgs(argv);
        const report = buildReport(args, cwd);
        stdout.write(args.json ? formatJson(report) : formatText(report));
        return 0;
    } catch (error) {
        const message = error instanceof UsageError ? error.message : 'report failed';
        stderr.write(`session-usage-report: ${message}\n${error instanceof UsageError ? `${USAGE_TEXT}\n` : ''}`);
        return 1;
    }
}

if (require.main === module) {
    process.exitCode = main(process.argv.slice(2));
}

module.exports = {
    DEVIATION_KINDS,
    RUN_ID,
    parseArgs,
    parseDeviationLine,
    validRunId,
    summarize,
    compare,
    buildReport,
    formatText,
    formatJson,
    main
};
