#!/usr/bin/env node

// Standalone orchestrator for the opencode surface pipeline — sync + verify in one
// place. `.claude`/`.opencode` are PORTABLE and SELF-RUNNING: copying them into
// a project with no root package.json, no npm and no node_modules still runs the
// complete pipeline, because every entrypoint is a path inside the bundle:
//   node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs                # full sync + verify
//   node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --verify-only  # every read-only gate
//   node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --only=<ids>   # subset
//   node .claude/skills/sync-opencode/scripts/run-opencode-sync.mjs --list-stages  # discover the roster
// Runs all stages sequentially, fails fast on first non-zero exit.
// No npm dependency — pure node + spawned subprocesses.
//
// Scope: opencode SURFACE = the generated hooks bridge, recommended root
// `opencode.json` defaults, the skill-selection policy (`permission.skill` in the
// root `opencode.json` plus a `.opencode/commands/<name>.md` per hidden skill),
// and the generated sub-agent mirror. opencode auto-discovers skills from
// `.claude/skills` and `.agents/skills`, so skill files themselves are not copied
// here (unlike sync-codex).

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..", "..", "..", "..");
const sourceScriptsDir = path.join(rootDir, ".claude", "scripts", "opencode");

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const verifyOnly = args.includes("--verify-only");
const listStages = args.includes("--list-stages");
const skipSet = parseListFlag("--skip");
const onlySet = parseListFlag("--only");

function parseListFlag(name) {
    const matches = args.filter(arg => arg.startsWith(`${name}=`));
    if (matches.length > 1) {
        console.error(`[opencode-sync] duplicate ${name} flag; provide one comma-separated selector`);
        process.exit(1);
    }
    if (matches.length === 0) return null;
    return new Set(matches[0].slice(`${name}=`.length).split(",").map(s => s.trim()).filter(Boolean));
}

async function listTestFiles(dir) {
    try {
        const entries = await readdir(dir);
        return entries
            .filter(e => /\.test\.(?:mjs|cjs)$/.test(e))
            .sort()
            .map(e => path.join(dir, e));
    } catch (error) {
        throw new Error(`Cannot discover tests in ${dir}: ${error.message}`);
    }
}

function runCaptured(cmd, argv) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, argv, { cwd: rootDir, stdio: ["ignore", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", data => { stdout += data.toString(); });
        child.stderr.on("data", data => { stderr += data.toString(); });
        child.on("error", reject);
        child.on("close", code => resolve({ code, stdout, stderr }));
    });
}

function relay(result) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
}

// `--test-concurrency` was backported only to Node 18.19+, Node 20.10+, and Node 21+.
// Keep the framework's declared Node 18.0+ floor runnable.
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const supportsTestConcurrencyFlag = nodeMajor >= 21
    || (nodeMajor === 20 && nodeMinor >= 10)
    || (nodeMajor === 18 && nodeMinor >= 19);
const testConcurrencyArgs = supportsTestConcurrencyFlag ? ["--test-concurrency=1"] : [];

const testsDir = path.join(sourceScriptsDir, "tests");
const stages = [
    { id: "config", label: "sync-opencode-config", mutate: true, cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-config.mjs")] },
    { id: "skills", label: "sync-opencode-skills", mutate: true, cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-skills.mjs")] },
    { id: "hooks", label: "sync-opencode-hooks", mutate: true, cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-hooks.mjs")] },
    { id: "agents", label: "sync-opencode-agents", mutate: true, cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-agents.mjs")] },
    { id: "tests", label: "test-opencode", cmd: process.execPath, argsAsync: async () => ["--test", ...testConcurrencyArgs, ...await listTestFiles(testsDir)] },
    { id: "verify-config", label: "verify-opencode-config", cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-config.mjs"), "--check"] },
    { id: "verify-skills", label: "verify-opencode-skills", cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-skills.mjs"), "--check"] },
    { id: "verify-hooks", label: "verify-opencode-hooks", cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-hooks.mjs"), "--check"] },
    { id: "verify-agents", label: "verify-opencode-agents", cmd: process.execPath, args: [path.join(sourceScriptsDir, "sync-agents.mjs"), "--check"] },
];

function shouldRun(stage) {
    if (verifyOnly && stage.mutate) return false;
    if (onlySet && !onlySet.has(stage.id)) return false;
    if (skipSet && skipSet.has(stage.id)) return false;
    return true;
}

function validateStageSelectors() {
    const knownIds = new Set(stages.map(s => s.id));
    const unknown = [];
    for (const [flag, set] of [["--only", onlySet], ["--skip", skipSet]]) {
        if (!set) continue;
        for (const id of set) if (!knownIds.has(id)) unknown.push(`${flag}=${id}`);
    }
    if (unknown.length > 0) {
        console.error(`[opencode-sync] unknown stage id(s): ${unknown.join(", ")}`);
        console.error(`[opencode-sync] valid stage ids: ${[...knownIds].join(", ")}`);
        process.exit(1);
    }
}

const KNOWN_FLAGS = ["--verbose", "-v", "--verify-only", "--list-stages"];
const KNOWN_LIST_FLAGS = ["--only", "--skip"];
function validateFlags() {
    const unknown = args.filter(arg =>
        !KNOWN_FLAGS.includes(arg) && !KNOWN_LIST_FLAGS.some(flag => arg.startsWith(`${flag}=`)));
    if (unknown.length > 0) {
        console.error(`[opencode-sync] unknown flag(s): ${unknown.join(", ")}`);
        console.error(`[opencode-sync] valid flags: ${[...KNOWN_FLAGS, ...KNOWN_LIST_FLAGS.map(f => `${f}=<ids>`)].join(", ")}`);
        console.error(`[opencode-sync] valid stage ids: ${stages.map(s => s.id).join(", ")}`);
        process.exit(1);
    }
}

async function runStage(stage, index, total) {
    const argv = stage.argsAsync ? await stage.argsAsync() : stage.args ?? [];
    const hasTarget = argv.some(argument => typeof argument === "string" && !argument.startsWith("--"));
    if (stage.argsAsync && argv.includes("--test") && !hasTarget) {
        throw Object.assign(new Error(`No tests discovered for ${stage.id}`), { stage: stage.id });
    }
    const label = `[${index}/${total}] ${stage.label}`;
    process.stdout.write(`${label} ...`);

    const startedAt = Date.now();
    const result = await runCaptured(stage.cmd, argv);
    const ms = Date.now() - startedAt;
    if (result.code === 0) {
        process.stdout.write(verbose ? `${label} ✓ pass (${ms}ms)\n` : ` ✓ pass (${ms}ms)\n`);
        return { stage: stage.id, code: 0, ms };
    }
    process.stdout.write(verbose ? `${label} ✗ FAIL exit=${result.code} (${ms}ms)\n` : ` ✗ FAIL exit=${result.code} (${ms}ms)\n`);
    relay(result);
    throw Object.assign(new Error(`stage ${stage.id} failed`), { exitCode: result.code, stage: stage.id });
}

function printStageRoster() {
    console.log(`[opencode-sync] ${stages.length} stages (in order), from ${rootDir}`);
    for (const [index, stage] of stages.entries()) {
        console.log(`  ${String(index + 1).padStart(2)}. ${stage.id.padEnd(14)} ${stage.mutate ? "MUTATE" : "verify"}  ${stage.label}`);
    }
    console.log("[opencode-sync] --verify-only runs every 'verify' stage above; --only=<ids>/--skip=<ids> select a subset.");
}

async function main() {
    validateFlags();
    validateStageSelectors();
    if (listStages) {
        printStageRoster();
        return;
    }
    const active = stages.filter(shouldRun);
    if (active.length === 0) {
        console.error("[opencode-sync] no stages selected; check --only/--skip flags");
        process.exit(1);
    }

    console.log(`[opencode-sync] running ${active.length} stage(s) from ${rootDir}`);
    const startedAt = Date.now();
    for (let i = 0; i < active.length; i++) {
        try {
            await runStage(active[i], i + 1, active.length);
        } catch (err) {
            console.error(`[opencode-sync] aborted at stage '${err.stage}' (exit ${err.exitCode ?? "?"})`);
            process.exit(err.exitCode || 1);
        }
    }
    console.log(`[opencode-sync] all ${active.length} stage(s) passed (${Date.now() - startedAt}ms)`);
}

await main();
