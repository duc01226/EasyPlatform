#!/usr/bin/env node
/**
 * Generic multi-agent session supervisor.
 *
 * Spawns N external AI CLI sessions (claude, codex, ...) as child processes,
 * supervises them start-to-end, and persists an externally observable status
 * report so an orchestrating agent can watch progress and collect results.
 *
 * Usage:
 *   node dual-ai-runner.mjs --run-dir <abs-dir> [--poll-sec 5]
 *
 * Contract files (all inside --run-dir):
 *   run-config.json   INPUT  — run definition (see schema below)
 *   status.json       OUTPUT — atomically updated snapshot (poll this to watch)
 *   events.ndjson     OUTPUT — append-only start-to-end audit log
 *   <name>-stderr.log OUTPUT — per-agent stderr capture
 *
 * run-config.json schema:
 * {
 *   "runId": "string",
 *   "cwd": "abs path the agents run from (repo root)",
 *   "timeoutSec": 3600,
 *   "agents": [{
 *     "name": "claude",
 *     "command": "claude",
 *     "args": ["-p", "--dangerously-skip-permissions", "--effort", "xhigh"], // fixed flags ONLY — never prompt content
 *     "promptFile": "prompt-claude.txt",      // piped to the child via stdin (quoting-safe)
 *     "outputFile": "claude-output.md",
 *     "outputMode": "stdout"                  // "stdout": runner writes child stdout to outputFile
 *   }]                                        // "file": CLI writes outputFile itself (e.g. codex -o);
 * }                                           //         runner writes child stdout to <name>-progress.log
 *
 * Exit code: 0 = every agent exited 0; 1 = any failure/timeout; 2 = config/setup error.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, appendFileSync, createWriteStream, statSync, existsSync } from 'node:fs';
import { basename, join, isAbsolute, relative, resolve } from 'node:path';

const argv = process.argv.slice(2);
function argValue(flag, fallback) {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
}

const runDir = argValue('--run-dir');
if (!runDir || !isAbsolute(runDir) || !existsSync(join(runDir, 'run-config.json'))) {
    console.error('[runner] --run-dir must be an absolute dir containing run-config.json');
    process.exit(2);
}

// NaN here is catastrophic, not cosmetic: setInterval(fn, NaN) becomes a ~1ms hot loop
// and setTimeout(reaper, NaN) fires immediately, killing every agent at startup.
function positiveSeconds(value, fallback, label) {
    if (value === undefined || value === null) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
        console.error(`[runner] ${label} must be a positive number, got: ${JSON.stringify(value)}`);
        process.exit(2);
    }
    return Math.max(1, n);
}

const pollSec = positiveSeconds(argValue('--poll-sec'), 5, '--poll-sec');
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const MAX_AGENTS = 2;
const DEFAULT_MAX_OUTPUT_BYTES = 25 * 1024 * 1024;
const STDERR_TAIL_BYTES = 2000;
const SUPPORTED_AGENTS = {
    claude: {
        command: 'claude',
        args: ['-p', '--dangerously-skip-permissions', '--effort', 'xhigh'],
    },
    codex: {
        command: 'codex',
        argsPrefix: ['exec', '--dangerously-bypass-approvals-and-sandbox', '-c', 'model_reasoning_effort=xhigh', '-o'],
    },
};

let config;
try {
    config = JSON.parse(readFileSync(join(runDir, 'run-config.json'), 'utf8'));
} catch (err) {
    console.error(`[runner] invalid run-config.json: ${err.message}`);
    process.exit(2);
}
if (!Array.isArray(config.agents) || config.agents.length === 0
    || config.agents.some(a => !a.name || !a.command || !Array.isArray(a.args) || !a.promptFile || !a.outputFile)) {
    console.error('[runner] run-config.json: "agents" must be a non-empty array of {name, command, args[], promptFile, outputFile}');
    process.exit(2);
}
const timeoutMs = positiveSeconds(config.timeoutSec, 3600, 'run-config.json "timeoutSec"') * 1000;
const maxOutputBytes = positiveSeconds(config.maxOutputBytes, DEFAULT_MAX_OUTPUT_BYTES, 'run-config.json "maxOutputBytes"');
const isWin = process.platform === 'win32';

function isInside(parent, child) {
    const rel = relative(resolve(parent), resolve(child));
    return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function validateCwd(cwd) {
    const resolvedCwd = resolve(cwd || runDir);
    const resolvedRunDir = resolve(runDir);
    const resolvedProjectDir = resolve(PROJECT_DIR);
    if (!isInside(resolvedRunDir, resolvedCwd) && !isInside(resolvedProjectDir, resolvedCwd)) {
        console.error('[runner] run-config.json "cwd" must stay inside the run dir or project dir');
        process.exit(2);
    }
    return resolvedCwd;
}

function validateAgents(agents) {
    if (agents.length > MAX_AGENTS) {
        console.error(`[runner] run-config.json supports at most ${MAX_AGENTS} agents`);
        process.exit(2);
    }
    const seen = new Set();
    for (const agent of agents) {
        const expected = SUPPORTED_AGENTS[agent.name];
        if (!expected) {
            console.error(`[runner] unsupported agent "${agent.name}"`);
            process.exit(2);
        }
        if (seen.has(agent.name)) {
            console.error(`[runner] duplicate agent "${agent.name}"`);
            process.exit(2);
        }
        seen.add(agent.name);
        if (agent.command !== expected.command) {
            console.error(`[runner] agent "${agent.name}" command must be "${expected.command}"`);
            process.exit(2);
        }
        if (agent.name === 'claude') {
            if (JSON.stringify(agent.args) !== JSON.stringify(expected.args)) {
                console.error('[runner] agent "claude" args must match the fixed headless template');
                process.exit(2);
            }
        } else if (agent.name === 'codex') {
            const prefix = expected.argsPrefix;
            const hasPrefix = prefix.every((value, index) => agent.args[index] === value);
            const outputPath = agent.args[prefix.length];
            const expectedOutput = resolve(runDir, agent.outputFile);
            if (!hasPrefix || agent.args.length !== prefix.length + 1 || resolve(outputPath) !== expectedOutput) {
                console.error('[runner] agent "codex" args must match the fixed headless template and write inside run-dir');
                process.exit(2);
            }
        }
        for (const rel of [agent.promptFile, agent.outputFile]) {
            const resolved = resolve(runDir, rel);
            if (!isInside(runDir, resolved) || basename(resolved) !== basename(rel)) {
                console.error(`[runner] agent "${agent.name}" prompt/output files must be direct files inside run-dir`);
                process.exit(2);
            }
        }
    }
}

const childCwd = validateCwd(config.cwd);
validateAgents(config.agents);

const status = {
    runId: config.runId ?? 'unnamed-run',
    runnerPid: process.pid,
    state: 'starting', // starting | running | completed | failed | timeout
    startedAt: new Date().toISOString(),
    endedAt: null,
    timeoutSec: timeoutMs / 1000,
    agents: {},
};

function writeStatus() {
    // temp + rename = atomic on the same volume; pollers never see a torn write
    const tmp = join(runDir, 'status.json.tmp');
    writeFileSync(tmp, JSON.stringify(status, null, 2));
    renameSync(tmp, join(runDir, 'status.json'));
}

function logEvent(event, extra = {}) {
    appendFileSync(join(runDir, 'events.ndjson'), JSON.stringify({ at: new Date().toISOString(), event, ...extra }) + '\n');
}

function fileSize(path) {
    try { return statSync(path).size; } catch { return 0; }
}

function killTree(child, name) {
    if (child.exitCode !== null || child.signalCode !== null) return;
    logEvent('kill', { agent: name, pid: child.pid });
    if (isWin) {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
        try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
        setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, 10_000).unref();
    }
}

function markOutputLimit(a, child, name, kind) {
    if (a.state !== 'running') return;
    a.state = 'failed';
    a.endedAt = new Date().toISOString();
    a.stderrTail = `${kind} exceeded maxOutputBytes (${maxOutputBytes})`;
    logEvent('agent-failed', { agent: name, reason: a.stderrTail });
    killTree(child, name);
    writeStatus();
}

const children = [];

function startAgent(agent) {
    const a = {
        state: 'starting',
        pid: null,
        startedAt: new Date().toISOString(),
        endedAt: null,
        exitCode: null,
        outputFile: agent.outputFile,
        outputBytes: 0,
        progressBytes: 0,
        lastActivityAt: null,
        stderrTail: '',
    };
    status.agents[agent.name] = a;

    let prompt;
    try {
        prompt = readFileSync(join(runDir, agent.promptFile), 'utf8');
    } catch (err) {
        a.state = 'failed';
        a.endedAt = new Date().toISOString();
        a.stderrTail = `prompt file unreadable: ${err.message}`;
        logEvent('agent-failed', { agent: agent.name, reason: a.stderrTail });
        writeStatus();
        return Promise.resolve(1);
    }

    // Windows CLI installs are often .cmd shims. Use the shell only after exact
    // agent/argument allowlisting above; POSIX runs shell-free.
    const child = spawn(agent.command, agent.args, {
        cwd: childCwd,
        shell: isWin,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: !isWin,
    });
    children.push({ child, name: agent.name });
    a.pid = child.pid;
    a.state = 'running';
    logEvent('agent-start', { agent: agent.name, pid: child.pid, command: agent.command });
    writeStatus();

    // A fast-failing child (auth error, command not found) closes the pipe before the
    // prompt drains; without this listener the EPIPE would crash the whole runner.
    child.stdin.on('error', () => {});
    child.stdin.write(prompt);
    child.stdin.end();

    const stdoutTarget = agent.outputMode === 'file' ? join(runDir, `${agent.name}-progress.log`) : join(runDir, agent.outputFile);
    const stdoutStream = createWriteStream(stdoutTarget);
    child.stdout.on('data', chunk => {
        if (agent.outputMode === 'file') a.progressBytes += chunk.length;
        else a.outputBytes += chunk.length;
        if (a.outputBytes > maxOutputBytes || a.progressBytes > maxOutputBytes) {
            markOutputLimit(a, child, agent.name, agent.outputMode === 'file' ? 'progress output' : 'stdout output');
            return;
        }
        stdoutStream.write(chunk);
    });
    child.stdout.on('end', () => stdoutStream.end());
    const stderrPath = join(runDir, `${agent.name}-stderr.log`);
    const stderrStream = createWriteStream(stderrPath);
    child.stderr.on('data', chunk => {
        a.stderrTail = (a.stderrTail + chunk.toString()).slice(-STDERR_TAIL_BYTES);
        stderrStream.write(chunk);
        if (fileSize(stderrPath) > maxOutputBytes) markOutputLimit(a, child, agent.name, 'stderr output');
    });
    child.stderr.on('end', () => stderrStream.end());

    return new Promise(resolve => {
        child.on('error', err => {
            a.state = 'failed';
            a.endedAt = new Date().toISOString();
            a.stderrTail = `spawn error: ${err.message}`;
            logEvent('agent-failed', { agent: agent.name, reason: a.stderrTail });
            writeStatus();
            resolve(1);
        });
        child.on('close', (code, signal) => {
            a.exitCode = code;
            a.endedAt = new Date().toISOString();
            a.state = a.state === 'timeout' ? 'timeout' : a.state === 'failed' ? 'failed' : code === 0 ? 'completed' : 'failed';
            a.outputBytes = fileSize(join(runDir, agent.outputFile));
            a.progressBytes = agent.outputMode === 'file' ? fileSize(join(runDir, `${agent.name}-progress.log`)) : a.outputBytes;
            logEvent('agent-exit', { agent: agent.name, exitCode: code, signal, state: a.state });
            writeStatus();
            resolve(a.state === 'completed' ? 0 : 1);
        });
    });
}

logEvent('run-start', { runId: status.runId, agents: config.agents.map(x => x.name) });
writeStatus();

const heartbeat = setInterval(() => {
    for (const agent of config.agents) {
        const a = status.agents[agent.name];
        if (!a || a.state !== 'running') continue;
        const out = fileSize(join(runDir, agent.outputFile));
        const prog = agent.outputMode === 'file' ? fileSize(join(runDir, `${agent.name}-progress.log`)) : out;
        if (out !== a.outputBytes || prog !== a.progressBytes) a.lastActivityAt = new Date().toISOString();
        a.outputBytes = out;
        a.progressBytes = prog;
    }
    writeStatus();
}, pollSec * 1000);
heartbeat.unref();

const reaper = setTimeout(() => {
    logEvent('run-timeout', { afterSec: timeoutMs / 1000 });
    for (const { child, name } of children) {
        if (status.agents[name]?.state === 'running') {
            status.agents[name].state = 'timeout';
            killTree(child, name);
        }
    }
    writeStatus();
}, timeoutMs);
reaper.unref();

status.state = 'running';
writeStatus();

const exitCodes = await Promise.all(config.agents.map(startAgent));
clearInterval(heartbeat);
clearTimeout(reaper);

const states = Object.values(status.agents).map(a => a.state);
status.state = states.includes('timeout') ? 'timeout' : exitCodes.every(c => c === 0) ? 'completed' : 'failed';
status.endedAt = new Date().toISOString();
writeStatus();
logEvent('run-end', { state: status.state, exitCodes });
console.log(`[runner] ${status.state} — ${Object.entries(status.agents).map(([n, a]) => `${n}:${a.state}(exit=${a.exitCode})`).join(' ')}`);
process.exit(status.state === 'completed' ? 0 : 1);
