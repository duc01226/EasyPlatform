import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The dual-ai-runner is a self-executing supervisor with no exported functions, so its
// contract is exercised at the process level: spawn it against a temp run-dir, then assert
// on exit code + the externally observable artifacts it documents (status.json state machine,
// events.ndjson audit log, per-mode output capture). A fake-agent test double stands in for
// the real external CLIs (claude/codex) so the suite needs no network, auth, or those binaries.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, '..', '..', '..', '..');
const runnerScript = path.join(repoRoot, '.claude', 'skills', 'dual-ai', 'scripts', 'dual-ai-runner.mjs');

// Test double for an external AI CLI. Reads the full prompt from stdin (the runner pipes it
// there) and behaves per argv[2]: echo-and-pass, fail with a nonzero code, write its OWN
// output file (the outputMode:"file" contract), or hang until the runner's reaper kills it.
const FAKE_AGENT = `import { writeFileSync } from 'node:fs';
const name = process.argv[2];
const mode = process.env['DUAL_AI_FAKE_' + name.toUpperCase() + '_MODE'] || 'pass';
const outPath = process.env['DUAL_AI_FAKE_' + name.toUpperCase() + '_OUT'];
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => { stdin += c; });
process.stdin.on('end', () => {
  switch (mode) {
    case 'pass':
      process.stdout.write(stdin, () => process.exit(0));
      break;
    case 'fail':
      process.stderr.write('fake-agent: simulated failure\\n', () => process.exit(3));
      break;
    case 'writefile':
      writeFileSync(outPath, 'AGENT-OWNED-OUTPUT:' + stdin);
      process.stdout.write('progress: done\\n', () => process.exit(0));
      break;
    case 'spam':
      process.stdout.write('X'.repeat(1024 * 1024), () => process.exit(0));
      break;
    case 'sleep':
      setTimeout(() => process.exit(0), 600000);
      break;
    default:
      process.exit(9);
  }
});
`;

const createdDirs = [];
after(async () => {
    await Promise.all(createdDirs.map(d => fs.rm(d, { recursive: true, force: true }).catch(() => {})));
});

/**
 * Build a temp run-dir with the fake agent installed, and (unless suppressed) a run-config.json.
 * Each agent spec: { name, mode, outputMode?, prompt?, missingPromptFile? }.
 */
async function setupRun({ agents = [], runId = 'test-run', timeoutSec, omitConfig = false, rawConfig } = {}) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dual-ai-test-'));
    createdDirs.push(dir);
    const fakeAgentPath = path.join(dir, 'fake-agent.mjs');
    await fs.writeFile(fakeAgentPath, FAKE_AGENT);
    const fakeBin = path.join(dir, 'bin');
    await fs.mkdir(fakeBin, { recursive: true });
    for (const name of ['claude', 'codex']) {
        const posixPath = path.join(fakeBin, name);
        const nodePath = process.execPath.replace(/'/g, "'\\''");
        const agentPath = fakeAgentPath.replace(/'/g, "'\\''");
        await fs.writeFile(posixPath, `#!/bin/sh\nexec '${nodePath}' '${agentPath}' ${name} "$@"\n`);
        await fs.chmod(posixPath, 0o755);
        await fs.writeFile(
            path.join(fakeBin, `${name}.cmd`),
            `@echo off\r\n"${process.execPath}" "${fakeAgentPath}" ${name} %*\r\n`
        );
    }

    if (omitConfig) return dir;
    if (rawConfig !== undefined) {
        await fs.writeFile(path.join(dir, 'run-config.json'), rawConfig);
        return dir;
    }

    const configAgents = [];
    const fakeEnv = {};
    for (const a of agents) {
        const promptFile = `${a.name}-prompt.txt`;
        const outputFile = `${a.name}-output.md`;
        if (!a.missingPromptFile) {
            await fs.writeFile(path.join(dir, promptFile), a.prompt ?? `prompt for ${a.name}`);
        }
        const args = a.name === 'codex'
            ? ['exec', '--dangerously-bypass-approvals-and-sandbox', '-c', 'model_reasoning_effort=xhigh', '-o', path.join(dir, outputFile)]
            : ['-p', '--dangerously-skip-permissions', '--effort', 'xhigh'];
        fakeEnv[`DUAL_AI_FAKE_${a.name.toUpperCase()}_MODE`] = a.mode;
        fakeEnv[`DUAL_AI_FAKE_${a.name.toUpperCase()}_OUT`] = path.join(dir, outputFile);
        const entry = { name: a.name, command: a.name, args, promptFile, outputFile };
        if (a.outputMode) entry.outputMode = a.outputMode;
        configAgents.push(entry);
    }
    const config = { runId, cwd: dir, agents: configAgents };
    if (timeoutSec !== undefined) config.timeoutSec = timeoutSec;
    if (agents.some(a => a.maxOutputBytes !== undefined)) config.maxOutputBytes = agents.find(a => a.maxOutputBytes !== undefined).maxOutputBytes;
    await fs.writeFile(path.join(dir, 'run-config.json'), JSON.stringify(config, null, 2));
    await fs.writeFile(path.join(dir, 'fake-env.json'), JSON.stringify({ fakeBin, fakeEnv }, null, 2));
    return dir;
}

async function envForRunDir(runDir) {
    try {
        const { fakeBin, fakeEnv } = JSON.parse(await fs.readFile(path.join(runDir, 'fake-env.json'), 'utf8'));
        return {
            ...process.env,
            ...fakeEnv,
            PATH: `${fakeBin}${path.delimiter}${process.env.PATH || ''}`,
        };
    } catch {
        return process.env;
    }
}

function spawnRunner(args, env = process.env) {
    return new Promise(resolve => {
        const child = spawn(process.execPath, [runnerScript, ...args], { cwd: repoRoot, env });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => { stdout += d; });
        child.stderr.on('data', d => { stderr += d; });
        child.on('close', code => resolve({ code, stdout, stderr }));
    });
}

async function runRunner(runDir, { pollSec = 1 } = {}) {
    return spawnRunner(['--run-dir', runDir, '--poll-sec', String(pollSec)], await envForRunDir(runDir));
}

async function readStatus(dir) {
    return JSON.parse(await fs.readFile(path.join(dir, 'status.json'), 'utf8'));
}

async function readEvents(dir) {
    const raw = await fs.readFile(path.join(dir, 'events.ndjson'), 'utf8');
    return raw.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

// ── Setup / config validation (exit code 2) ───────────────────────────────────

test('exits 2 when --run-dir is missing', async () => {
    const { code, stderr } = await spawnRunner([]);
    assert.equal(code, 2);
    assert.match(stderr, /--run-dir/);
});

test('exits 2 when --run-dir is not absolute', async () => {
    const { code } = await spawnRunner(['--run-dir', 'relative/dir']);
    assert.equal(code, 2);
});

test('exits 2 when run-config.json is absent from --run-dir', async () => {
    const dir = await setupRun({ omitConfig: true });
    const { code } = await runRunner(dir);
    assert.equal(code, 2);
});

test('exits 2 when run-config.json is invalid JSON', async () => {
    const dir = await setupRun({ rawConfig: '{ this is not json' });
    const { code, stderr } = await runRunner(dir);
    assert.equal(code, 2);
    assert.match(stderr, /invalid run-config\.json/);
});

test('exits 2 when agents array is empty', async () => {
    const dir = await setupRun({ rawConfig: JSON.stringify({ runId: 'x', agents: [] }) });
    const { code, stderr } = await runRunner(dir);
    assert.equal(code, 2);
    assert.match(stderr, /agents/);
});

test('exits 2 when an agent is missing required fields', async () => {
    const dir = await setupRun({ rawConfig: JSON.stringify({ runId: 'x', agents: [{ name: 'a1' }] }) });
    const { code } = await runRunner(dir);
    assert.equal(code, 2);
});

test('exits 2 on a non-positive --poll-sec (guards the setInterval(NaN) hot-loop)', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'pass' }] });
    for (const bad of ['abc', '0', '-1']) {
        const { code, stderr } = await spawnRunner(['--run-dir', dir, '--poll-sec', bad]);
        assert.equal(code, 2, `--poll-sec ${bad} should exit 2`);
        assert.match(stderr, /--poll-sec/);
    }
});

test('exits 2 on a non-positive timeoutSec', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'pass' }], timeoutSec: -5 });
    const { code, stderr } = await runRunner(dir);
    assert.equal(code, 2);
    assert.match(stderr, /timeoutSec/);
});

// ── Happy path (exit 0) ────────────────────────────────────────────────────────

test('single passing agent: exit 0, status completed, stdin prompt captured to outputFile', async () => {
    const PROMPT = 'UNIQUE-PROMPT-PAYLOAD-12345';
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'pass', prompt: PROMPT }] });
    const { code } = await runRunner(dir);
    assert.equal(code, 0);

    const status = await readStatus(dir);
    assert.equal(status.state, 'completed');
    assert.equal(status.agents.claude.state, 'completed');
    assert.equal(status.agents.claude.exitCode, 0);

    // 'pass' mode echoes stdin → stdout; outputMode defaults to 'stdout' so the runner
    // captures it into outputFile. This proves the prompt was piped via stdin, not argv.
    const output = await fs.readFile(path.join(dir, 'claude-output.md'), 'utf8');
    assert.match(output, /UNIQUE-PROMPT-PAYLOAD-12345/);

    const eventNames = (await readEvents(dir)).map(e => e.event);
    for (const expected of ['run-start', 'agent-start', 'agent-exit', 'run-end']) {
        assert.ok(eventNames.includes(expected), `events.ndjson should contain "${expected}"`);
    }
});

test('outputMode "file": runner routes stdout to a progress log, CLI owns the output file', async () => {
    const dir = await setupRun({ agents: [{ name: 'codex', mode: 'writefile', outputMode: 'file', prompt: 'P' }] });
    const { code } = await runRunner(dir);
    assert.equal(code, 0);

    const status = await readStatus(dir);
    assert.equal(status.state, 'completed');
    assert.equal(status.agents.codex.state, 'completed');

    const output = await fs.readFile(path.join(dir, 'codex-output.md'), 'utf8');
    assert.match(output, /^AGENT-OWNED-OUTPUT:/);
    // child stdout goes to <name>-progress.log, NOT the output file, under outputMode:file
    const progress = await fs.readFile(path.join(dir, 'codex-progress.log'), 'utf8');
    assert.match(progress, /progress: done/);
});

// ── Failure aggregation (exit 1) ────────────────────────────────────────────────

test('single failing agent: exit 1, status failed, exitCode preserved', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'fail' }] });
    const { code } = await runRunner(dir);
    assert.equal(code, 1);

    const status = await readStatus(dir);
    assert.equal(status.state, 'failed');
    assert.equal(status.agents.claude.state, 'failed');
    assert.equal(status.agents.claude.exitCode, 3);
    assert.match(status.agents.claude.stderrTail, /simulated failure/);
});

test('mixed pass+fail agents aggregate to a failed run', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'pass' }, { name: 'codex', mode: 'fail' }] });
    const { code } = await runRunner(dir);
    assert.equal(code, 1);

    const status = await readStatus(dir);
    assert.equal(status.state, 'failed');
    assert.equal(status.agents.claude.state, 'completed');
    assert.equal(status.agents.codex.state, 'failed');
});

test('unreadable prompt file fails that agent without crashing the runner', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'pass', missingPromptFile: true }] });
    const { code } = await runRunner(dir);
    assert.equal(code, 1);

    const status = await readStatus(dir);
    assert.equal(status.state, 'failed');
    assert.equal(status.agents.claude.state, 'failed');
    assert.match(status.agents.claude.stderrTail, /prompt file unreadable/);
});

// ── Timeout reaping (exit 1, state timeout) ─────────────────────────────────────

test('a hung agent is reaped at timeoutSec and the run is marked timeout', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'sleep' }], timeoutSec: 1 });
    const { code } = await runRunner(dir, { pollSec: 1 });
    assert.equal(code, 1);

    const status = await readStatus(dir);
    assert.equal(status.state, 'timeout');
    assert.equal(status.agents.claude.state, 'timeout');

    const eventNames = (await readEvents(dir)).map(e => e.event);
    assert.ok(eventNames.includes('run-timeout'), 'events.ndjson should record run-timeout');
    assert.ok(eventNames.includes('kill'), 'events.ndjson should record the kill');
});

test('exits 2 when more than two agents are configured', async () => {
    const dir = await setupRun({
        rawConfig: JSON.stringify({
            runId: 'x',
            agents: [
                { name: 'claude', command: 'claude', args: [], promptFile: 'a', outputFile: 'a.out' },
                { name: 'codex', command: 'codex', args: [], promptFile: 'b', outputFile: 'b.out' },
                { name: 'extra', command: 'extra', args: [], promptFile: 'c', outputFile: 'c.out' }
            ]
        })
    });
    const { code, stderr } = await runRunner(dir);
    assert.equal(code, 2);
    assert.match(stderr, /at most 2 agents/);
});

test('exits 2 when an agent command does not match its allowlisted identity', async () => {
    const dir = await setupRun({
        rawConfig: JSON.stringify({
            runId: 'x',
            agents: [{
                name: 'claude',
                command: 'powershell',
                args: ['-NoProfile'],
                promptFile: 'a',
                outputFile: 'a.out'
            }]
        })
    });
    const { code, stderr } = await runRunner(dir);
    assert.equal(code, 2);
    assert.match(stderr, /command must be "claude"/);
});

test('terminates a noisy agent when stdout exceeds maxOutputBytes', async () => {
    const dir = await setupRun({ agents: [{ name: 'claude', mode: 'spam', maxOutputBytes: 1024 }] });
    const { code } = await runRunner(dir);
    assert.equal(code, 1);
    const status = await readStatus(dir);
    assert.equal(status.state, 'failed');
    assert.equal(status.agents.claude.state, 'failed');
    assert.match(status.agents.claude.stderrTail, /exceeded maxOutputBytes/);
});
