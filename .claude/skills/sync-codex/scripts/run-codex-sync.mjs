#!/usr/bin/env node

// Standalone orchestrator for the codex cross-surface pipeline — equivalent to
// `npm run sync:all && npm run verify:all`.
// This file is the single source of truth for the pipeline; the package.json
// `sync:all`/`verify:all` scripts delegate here, so copying `.claude` into a
// project WITHOUT a root package.json still runs the complete pipeline:
//   node .claude/skills/sync-codex/scripts/run-codex-sync.mjs            # full
//   node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=... # subset
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

async function listTestFiles(dir) {
    try {
        const entries = await readdir(dir);
        return entries
            .filter(e => e.endsWith(".test.mjs"))
            .map(e => path.join(dir, e));
    } catch {
        return [];
    }
}

// SYNC stages (1-3, mutate) then VERIFY stages (4-10, read-only). The verify set is
// `codex:verify:all` (codex tests, scripts tests, wf-cycle, sk-proto, residue, sdd, sync-divergence)
// — i.e. the standalone runner equals the full `npm run verify:all`. portability-no-package-json.test.mjs
// (PORT-005) locks this parity so the runner can never again verify LESS than the npm path.
const codexTestsDir = path.join(sourceScriptsDir, "tests");
const claudeTestsDir = path.join(rootDir, ".claude", "scripts", "tests");
const stages = [
    { id: "migrate",  label: "migrate",          cmd: "node", mutate: true, args: [path.join(sourceScriptsDir, "migrate-claude-to-codex.mjs"), ...migrateFlags] },
    { id: "hooks",    label: "sync-hooks",       cmd: "node", mutate: true, args: [path.join(sourceScriptsDir, "sync-hooks.mjs")] },
    { id: "context",  label: "sync-context",     cmd: "node", mutate: true, args: [path.join(sourceScriptsDir, "sync-context-workflows.mjs")] },
    { id: "tests",    label: "test-codex",       cmd: "node", argsAsync: async () => ["--test", ...await listTestFiles(codexTestsDir)] },
    // General .claude tooling unit tests (.claude/scripts/tests/*.test.mjs) — e.g. the statusline tests.
    // Listed via readdir so the stage works without shell glob expansion (PowerShell does not expand
    // globs the way POSIX shells do; the npm script relied on that, the runner does not).
    { id: "scripts-tests", label: "test-scripts", cmd: "node", argsAsync: async () => ["--test", ...await listTestFiles(claudeTestsDir)] },
    { id: "wf-cycle", label: "verify-wf-cycle",  cmd: "node", args: [path.join(sourceScriptsDir, "verify-workflow-cycle-compliance.mjs")] },
    { id: "sk-proto", label: "verify-sk-proto",  cmd: "node", args: [path.join(sourceScriptsDir, "verify-skill-protocol-compliance.mjs")] },
    { id: "residue",  label: "verify-residue",   cmd: "node", args: [path.join(sourceScriptsDir, "verify-no-project-residue.mjs")] },
    { id: "sdd",      label: "verify-sdd",       cmd: "node", args: [path.join(sourceScriptsDir, "verify-sdd-semantic-compliance.mjs")] },
    // Cross-surface byte-equality oracle. verify-sync-divergence guards BOTH the .agents/skills mirror
    // AND the CONTEXT mirror (AGENTS.md + .codex/CODEX_CONTEXT.md) — the context idempotency check is
    // folded in there (not a separate stage/file) so the portable export ships zero new pipeline scripts.
    { id: "sync-divergence",    label: "verify-sync-divergence",    cmd: "node", args: [path.join(sourceScriptsDir, "verify-sync-divergence.mjs")] },
];

function shouldRun(id) {
    if (onlySet && !onlySet.has(id)) return false;
    if (skipSet && skipSet.has(id)) return false;
    return true;
}

// Fail fast on a mistyped --only/--skip id. shouldRun silently treats an unknown id as
// "not a member" — so `--only=residue,typoXYZ` would run only `residue` and exit 0, quietly
// dropping a verifier. For an allowlist like `verify:all --only=<8 ids>`, one fat-fingered id
// would skip a verifier and still exit green, defeating the whole "runner never verifies LESS
// than npm" guarantee. Reject any requested id that is not a known stage.
function validateStageSelectors() {
    const knownIds = new Set(stages.map(s => s.id));
    const unknown = [];
    for (const [flag, set] of [["--only", onlySet], ["--skip", skipSet]]) {
        if (!set) continue;
        for (const id of set) if (!knownIds.has(id)) unknown.push(`${flag}=${id}`);
    }
    if (unknown.length > 0) {
        console.error(`[codex-sync] unknown stage id(s): ${unknown.join(", ")}`);
        console.error(`[codex-sync] valid stage ids: ${[...knownIds].join(", ")}`);
        process.exit(1);
    }
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
    validateStageSelectors();
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
