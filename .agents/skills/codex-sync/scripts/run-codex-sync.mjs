#!/usr/bin/env node

// Standalone orchestrator equivalent to `npm run codex:sync`.
// Runs all stages sequentially, fails fast on first non-zero exit.
// No npm dependency — pure node + spawned subprocesses.

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..", "..", "..", "..");
const sourceScriptsDir = path.join(rootDir, ".claude", "scripts", "codex");

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const skipSet = parseListFlag("--skip");
const onlySet = parseListFlag("--only");
const migrateFlags = args.filter(arg => arg === "--copy-skills");

function parseListFlag(name) {
    const arg = args.find(a => a.startsWith(`${name}=`));
    if (!arg) return null;
    return new Set(arg.split("=", 2)[1].split(",").map(s => s.trim()).filter(Boolean));
}

async function listTestFiles() {
    const dir = path.join(sourceScriptsDir, "tests");
    try {
        const entries = await readdir(dir);
        return entries
            .filter(e => e.endsWith(".test.mjs"))
            .map(e => path.join(dir, e));
    } catch {
        return [];
    }
}

const stages = [
    { id: "migrate",  label: "migrate",          cmd: "node", args: [path.join(sourceScriptsDir, "migrate-claude-to-codex.mjs"), ...migrateFlags] },
    { id: "hooks",    label: "sync-hooks",       cmd: "node", args: [path.join(sourceScriptsDir, "sync-hooks.mjs")] },
    { id: "context",  label: "sync-context",     cmd: "node", args: [path.join(sourceScriptsDir, "sync-context-workflows.mjs")] },
    { id: "tests",    label: "test-tooling",     cmd: "node", argsAsync: async () => ["--test", ...await listTestFiles()] },
    { id: "wf-cycle", label: "verify-wf-cycle",  cmd: "node", args: [path.join(sourceScriptsDir, "verify-workflow-cycle-compliance.mjs")] },
    { id: "sk-proto", label: "verify-sk-proto",  cmd: "node", args: [path.join(sourceScriptsDir, "verify-skill-protocol-compliance.mjs")] },
    { id: "residue",  label: "verify-residue",   cmd: "node", args: [path.join(sourceScriptsDir, "verify-no-project-residue.mjs")] },
    { id: "sdd",      label: "verify-sdd",       cmd: "node", args: [path.join(sourceScriptsDir, "verify-sdd-semantic-compliance.mjs")] },
];

function shouldRun(id) {
    if (onlySet && !onlySet.has(id)) return false;
    if (skipSet && skipSet.has(id)) return false;
    return true;
}

async function runStage(stage, index, total) {
    // Resolve async argv OUTSIDE the Promise executor: a throw here must reject
    // runStage's promise, not vanish into a discarded async-executor promise
    // (which would leave the orchestrator awaiting a Promise that never settles).
    const argv = stage.argsAsync ? await stage.argsAsync() : stage.args;
    const label = `[${index}/${total}] ${stage.label}`;
    process.stdout.write(`${label} ...`);
    if (verbose) process.stdout.write(`\n  $ ${stage.cmd} ${argv.join(" ")}\n`);

    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
        const child = spawn(stage.cmd, argv, {
            cwd: rootDir,
            stdio: verbose ? "inherit" : ["ignore", "pipe", "pipe"],
        });

        let stdoutBuf = "";
        let stderrBuf = "";
        if (!verbose) {
            child.stdout.on("data", d => { stdoutBuf += d.toString(); });
            child.stderr.on("data", d => { stderrBuf += d.toString(); });
        }

        child.on("error", reject);
        child.on("close", code => {
            const ms = Date.now() - startedAt;
            if (code === 0) {
                process.stdout.write(verbose ? `${label} ✓ pass (${ms}ms)\n` : ` ✓ pass (${ms}ms)\n`);
                resolve({ stage: stage.id, code, ms });
            } else {
                process.stdout.write(verbose ? `${label} ✗ FAIL exit=${code} (${ms}ms)\n` : ` ✗ FAIL exit=${code} (${ms}ms)\n`);
                if (!verbose) {
                    if (stdoutBuf.trim()) process.stdout.write(`--- stdout ---\n${stdoutBuf}`);
                    if (stderrBuf.trim()) process.stderr.write(`--- stderr ---\n${stderrBuf}`);
                }
                reject(Object.assign(new Error(`stage ${stage.id} failed`), { exitCode: code, stage: stage.id }));
            }
        });
    });
}

async function main() {
    const active = stages.filter(s => shouldRun(s.id));
    if (active.length === 0) {
        console.error("[codex-sync] no stages selected; check --only/--skip flags");
        process.exit(1);
    }

    console.log(`[codex-sync] running ${active.length} stage(s) from ${rootDir}`);
    const startedAt = Date.now();

    for (let i = 0; i < active.length; i++) {
        try {
            await runStage(active[i], i + 1, active.length);
        } catch (err) {
            console.error(`[codex-sync] aborted at stage '${err.stage}' (exit ${err.exitCode ?? "?"})`);
            process.exit(err.exitCode || 1);
        }
    }

    const ms = Date.now() - startedAt;
    console.log(`[codex-sync] all ${active.length} stage(s) passed (${ms}ms)`);
}

await main();
