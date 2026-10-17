#!/usr/bin/env node

// Standalone orchestrator for the codex cross-surface pipeline — sync + verify in one place.
// This file is the single source of truth for the pipeline. `.claude`/`.codex` are PORTABLE and
// SELF-RUNNING: copying them into a project with no root `package.json`, no npm and no node_modules
// still runs the complete pipeline, because every entrypoint is a path inside the bundle:
//   node .claude/skills/sync-codex/scripts/run-codex-sync.mjs                # full sync + verify
//   node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --verify-only  # every read-only gate
//   node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --only=<ids>   # subset
//   node .claude/skills/sync-codex/scripts/run-codex-sync.mjs --list-stages  # discover the roster
// Runs all stages sequentially, fails fast on first non-zero exit.
// No npm dependency — pure node + spawned subprocesses.
//
// `--verify-only` is DERIVED from each stage's `mutate` marker, so "run every read-only gate" is a
// capability of the bundle rather than a stage list transcribed into a host `package.json`. An
// adopter that hand-copies such a list silently under-verifies the moment a stage is added here.

import { spawn } from "node:child_process";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const here = path.dirname(url.fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, "..", "..", "..", "..");
const sourceScriptsDir = path.join(rootDir, ".claude", "scripts", "codex");
const claudeMdGenerator = path.join(rootDir, ".claude", "skills", "ai-context-refresh", "scripts", "generate-claude-md.cjs");
const techSpecGenerator = path.join(rootDir, ".claude", "skills", "tech-spec", "scripts", "generate-tech-specs.mjs");

const args = process.argv.slice(2);
const verbose = args.includes("--verbose") || args.includes("-v");
const verifyOnly = args.includes("--verify-only");
const listStages = args.includes("--list-stages");
const skipSet = parseListFlag("--skip");
const onlySet = parseListFlag("--only");
const migrateFlags = args.filter(arg => arg === "--copy-skills");

function parseListFlag(name) {
    const matches = args.filter(arg => arg.startsWith(`${name}=`));
    if (matches.length > 1) {
        console.error(`[codex-sync] duplicate ${name} flag; provide one comma-separated selector`);
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

async function readJsonOrNull(filePath) {
    try {
        return JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return null;
        throw new Error(`Cannot read JSON configuration at ${filePath}: ${error.message}`);
    }
}

async function loadProjectConfig() {
    const ckConfig = await readJsonOrNull(path.join(rootDir, ".claude", ".ck.json"));
    const configured = ckConfig?.portability?.projectConfigPath;
    const relativePath = typeof configured === "string" && configured.trim()
        ? configured.trim()
        : "docs/project-config.json";
    const configPath = path.resolve(rootDir, relativePath);
    const relativeConfigPath = path.relative(rootDir, configPath);
    if (relativeConfigPath.startsWith("..") || path.isAbsolute(relativeConfigPath)) {
        throw new Error(`Configured project config must stay inside the repository: ${relativePath}`);
    }
    return await readJsonOrNull(configPath);
}

let projectConfigPromise;
async function optionalStageSkipReason(stageId) {
    if (stageId !== "tech-spec-freshness" && stageId !== "feature-registry") return null;
    projectConfigPromise ??= loadProjectConfig();
    const config = await projectConfigPromise;

    if (stageId === "tech-spec-freshness") {
        if (config === null || !Object.prototype.hasOwnProperty.call(config, "techSpecScan")) {
            return "not configured: project config has no techSpecScan contract";
        }
        return null;
    }

    const roots = config?.specSystem?.featureRegistryRoots;
    if (config === null || !Object.prototype.hasOwnProperty.call(config, "specSystem") || !Object.prototype.hasOwnProperty.call(config.specSystem ?? {}, "featureRegistryRoots")) {
        return "not configured: project config has no specSystem.featureRegistryRoots contract";
    }
    if (!Array.isArray(roots) || roots.length === 0 || roots.some(root => typeof root !== "string" || !root.trim())) {
        return null;
    }
    return null;
}

function runCaptured(cmd, argv, env = process.env) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, argv, {
            cwd: rootDir,
            env,
            stdio: ["ignore", "pipe", "pipe"],
        });
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

async function runClaudeMdPreflight() {
    // Force the child to use the same root that this script resolved from its own path. This
    // prevents an inherited CLAUDE_PROJECT_DIR from redirecting a copied bundle to another
    // project when the runner is launched from an unrelated working directory.
    const env = { ...process.env, CLAUDE_PROJECT_DIR: rootDir };
    const check = await runCaptured(process.execPath, [claudeMdGenerator, "--check"], env);
    relay(check);

    if (check.code === 0) return;
    const mode = check.code === 10 ? "init" : check.code === 11 ? "update" : null;
    if (!mode) {
        throw Object.assign(new Error(`CLAUDE.md preflight failed with exit ${check.code}`), { exitCode: 1 });
    }

    process.stdout.write(`[claude-md] applying --mode ${mode}\n`);
    const write = await runCaptured(process.execPath, [claudeMdGenerator, "--mode", mode], env);
    relay(write);
    if (write.code !== 0) {
        throw Object.assign(new Error(`CLAUDE.md ${mode} failed`), { exitCode: write.code || 1 });
    }
}

// `--test-concurrency` was backported only to Node 18.19+, Node 20.10+, and Node 21+.
// Keep the framework's declared Node 18.0+ floor runnable: older test runners never accepted the
// flag, and therefore must receive the legacy invocation rather than fail before discovering tests.
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const supportsTestConcurrencyFlag = nodeMajor >= 21
    || (nodeMajor === 20 && nodeMinor >= 10)
    || (nodeMajor === 18 && nodeMinor >= 19);
const scriptsTestConcurrencyArgs = supportsTestConcurrencyFlag ? ["--test-concurrency=1"] : [];
// Test flags are selected from this process's version, so test children must use this exact Node
// executable rather than a potentially different `node` found later on PATH (npx/absolute launches
// can otherwise make the gate and its child disagree).
const testNodeCommand = process.execPath;

// SYNC stages (1-4, mutate) then VERIFY stages (read-only). This runner's non-mutate stage set IS
// the canonical definition of "verify everything" — do NOT re-declare that roster anywhere else.
// `npm run verify:all` passes it as an `--only=` allowlist, and `codex:verify:all` now delegates
// straight to `verify:all` rather than maintaining a parallel `&&` chain (it drifted one verifier
// behind for exactly that reason: nothing locked it). portability-no-package-json.test.mjs guards
// both directions — PORT-005 asserts every npm-referenced verifier is a runner stage, PORT-008
// deepEquals `verify:all --only` to this non-mutate set, and PORT-010 asserts `codex:verify:all`
// delegates instead of re-listing stages. Adding a stage below therefore REQUIRES adding its id to
// `verify:all --only=` or PORT-008 goes red — which is the point.
const codexTestsDir = path.join(sourceScriptsDir, "tests");
const claudeTestsDir = path.join(rootDir, ".claude", "scripts", "tests");
// The hooks suites are standalone runners (custom .cjs harnesses), NOT `node --test` modules — running
// them under `node --test` reports spurious failures. They are invoked through their own runner's
// `--filter` selector. Only the SYNC-INTEGRITY suites belong here (catalog/mirror/protocol parity);
// hook-behaviour suites (notification, security, lifecycle, …) stay in `npm test`, which is a
// different concern and would add ~30s for no sync-integrity coverage.
// The selector is a SUBSTRING match on suite names (derived from filenames), so a rename could empty
// one of these stages. pipeline-stage-integrity.test.mjs guards that: STAGE-001 locks the runner to
// exit 1 on a zero-match `--filter` (a stage that executed nothing is never a pass), and STAGE-002
// asserts `--filter=parity` still selects BOTH parity suites — the only selector here matching more
// than one, and therefore the only one whose coverage could silently halve.
const hooksRunner = path.join(rootDir, ".claude", "hooks", "tests", "run-all-tests.cjs");
const stages = [
    { id: "claude-md", label: "ensure-claude-md", mutate: true, run: runClaudeMdPreflight },
    { id: "migrate",  label: "migrate",          cmd: "node", mutate: true, args: [path.join(sourceScriptsDir, "migrate-claude-to-codex.mjs"), ...migrateFlags] },
    { id: "hooks",    label: "sync-hooks",       cmd: "node", mutate: true, args: [path.join(sourceScriptsDir, "sync-hooks.mjs")] },
    { id: "context",  label: "sync-context",     cmd: "node", mutate: true, args: [path.join(sourceScriptsDir, "sync-context-workflows.mjs")] },
    { id: "tests",    label: "test-codex",       test: true, cmd: testNodeCommand, argsAsync: async () => ["--test", ...await listTestFiles(codexTestsDir)] },
    // General .claude tooling unit tests (*.test.mjs and *.test.cjs).
    // Listed via readdir so the stage works without shell glob expansion (PowerShell does not expand
    // globs the way POSIX shells do; the npm script relied on that, the runner does not).
    // Process-heavy tooling tests spawn validator and graph child processes; serialize top-level
    // files where the runtime supports it so per-child timeout guards measure the child rather than
    // runner contention. On older supported Node 18 releases, the legacy runner receives no unknown
    // flag and retains its pre-existing execution behavior.
    { id: "scripts-tests", label: "test-scripts", test: true, cmd: testNodeCommand, argsAsync: async () => ["--test", ...scriptsTestConcurrencyArgs, ...await listTestFiles(claudeTestsDir)] },
    // Live read-only release gates run only after their tooling/fixture tests have passed. The
    // tech-spec generator's --check mode compares a fresh in-memory render with committed derived
    // views; the feature registry validates canonical spec identity, links, ranges, and coverage.
    // Both gates are optional project capabilities: absent configuration is an explicit skip, while
    // a present but malformed contract still reaches the direct tool and fails closed.
    { id: "tech-spec-freshness", label: "verify-tech-spec-freshness", cmd: "node", args: [techSpecGenerator, "--check"] },
    { id: "feature-registry", label: "verify-feature-registry", cmd: "node", args: [path.join(sourceScriptsDir, "verify-feature-registry.mjs"), "--configured-roots"] },
    // Catalog↔source parity: `.claude/SKILLS.yaml` must equal a fresh `generate_catalogs.py --skills`
    // render, and the CLAUDE.md/AGENTS.md COUNT markers must match the real inventory (ADR-0001,
    // ADR-0002). This guard existed and worked, but lived ONLY in the hooks suite — which no pipeline
    // stage ran — so a changeset shipped a stale committed catalog while all 12 stages reported green.
    { id: "hooks-count-drift", label: "hooks-count-drift", test: true, cmd: "node", args: [hooksRunner, "--filter=count-drift"] },
    // Protocol-text + SYNC-carrier parity across the mirrored surfaces.
    { id: "hooks-parity",     label: "hooks-parity",       test: true, cmd: "node", args: [hooksRunner, "--filter=parity"] },
    // Doc↔code sync gate.
    { id: "hooks-doc-sync",   label: "hooks-doc-sync",     test: true, cmd: "node", args: [hooksRunner, "--filter=doc-sync-gate"] },
    { id: "wf-cycle", label: "verify-wf-cycle",  cmd: "node", args: [path.join(sourceScriptsDir, "verify-workflow-cycle-compliance.mjs")] },
    { id: "sk-proto", label: "verify-sk-proto",  cmd: "node", args: [path.join(sourceScriptsDir, "verify-skill-protocol-compliance.mjs")] },
    { id: "residue",  label: "verify-residue",   cmd: "node", args: [path.join(sourceScriptsDir, "verify-no-project-residue.mjs")] },
    { id: "sdd",      label: "verify-sdd",       cmd: "node", args: [path.join(sourceScriptsDir, "verify-sdd-semantic-compliance.mjs")] },
    // Self-Review Convergence Loop enforcement sensor (SC8). Statically asserts every review-family
    // SKILL.md that carries findings language also carries the `/why-review --validate-findings`
    // route, AND that a validate-only grader does NOT embed the `SYNC:double-round-trip-review`
    // fix-loop engine. Read-only; fails the build if an author ships a review skill without the gate.
    { id: "review-validate-coverage", label: "verify-review-validate-coverage", cmd: "node", args: [path.join(sourceScriptsDir, "verify-review-validate-coverage.mjs")] },
    // SYNC tag <-> carrier adoption parity. Closes the last unguarded axis of the SYNC system: which
    // review skill carries which tag. Asserts declared carriers actually carry both the main and
    // :reminder block, that no UNDECLARED skill carries a matrix tag (the injector would never refresh
    // it), and that every injected body byte-matches canonical. Parses the adoption matrix out of
    // inject_review_skill_blocks.py rather than declaring a Node copy, so the two cannot disagree.
    { id: "sync-adoption-parity", label: "verify-sync-adoption-parity", cmd: "node", args: [path.join(sourceScriptsDir, "verify-sync-adoption-parity.mjs")] },
    // Provenance-marker discipline in .claude/docs/architecture-knowledge.md. The catalog's own §20
    // rule says an unenforced rule "will be violated within a quarter" — this convention was violated
    // three times in one authoring session, so the sensor asserts: declared tags only · `— VERIFY`
    // only on a declared tag · every guarded section (§3/§8/§9/§10) carries its default-basis banner ·
    // no banner enumerates row-level exceptions (a stale-prone second mechanism no consuming skill
    // reads) · a `[model-knowledge]` marker carries `— VERIFY` so the consumers' guard actually fires.
    // Fail-soft when the catalog is absent, so a project that copied `.claude` without it still syncs.
    { id: "provenance-markers", label: "verify-provenance-markers", cmd: "node", args: [path.join(sourceScriptsDir, "verify-provenance-markers.mjs")] },
    // Cross-surface byte-equality oracle. verify-sync-divergence guards BOTH the .agents/skills mirror
    // AND the CONTEXT mirror (AGENTS.md; a leftover .codex/CODEX_CONTEXT.md is an orphan) — the context idempotency check is
    // folded in there (not a separate stage/file) so the portable export ships zero new pipeline scripts.
    { id: "sync-divergence",    label: "verify-sync-divergence",    cmd: "node", args: [path.join(sourceScriptsDir, "verify-sync-divergence.mjs")] },
];

// `--verify-only` is resolved from the stage's own `mutate` marker rather than a roster: the
// read-only set can never fall behind the pipeline, because a new mutating stage declares itself.
function shouldRun(stage) {
    if (verifyOnly && stage.mutate) return false;
    if (onlySet && !onlySet.has(stage.id)) return false;
    if (skipSet && skipSet.has(stage.id)) return false;
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

// Same fail-fast reasoning one level up, for the FLAG rather than the stage id. An
// unrecognized flag used to be ignored, which silently degraded to "no filter" — so a
// plausible-looking `--help`, or the `--mode update` an advisory elsewhere suggested, ran
// all 19 stages INCLUDING the four mutating ones (CLAUDE.md preflight, migrate, sync-hooks, sync-context)
// instead of doing the narrow thing the reader asked for. A runner that can rewrite the
// tree must never treat "I did not understand you" as "run everything".
const KNOWN_FLAGS = ["--verbose", "-v", "--copy-skills", "--verify-only", "--list-stages"];
const KNOWN_LIST_FLAGS = ["--only", "--skip"];
function validateFlags() {
    const unknown = args.filter(arg =>
        !KNOWN_FLAGS.includes(arg) && !KNOWN_LIST_FLAGS.some(flag => arg.startsWith(`${flag}=`)));
    if (unknown.length > 0) {
        console.error(`[codex-sync] unknown flag(s): ${unknown.join(", ")}`);
        console.error(`[codex-sync] valid flags: ${[...KNOWN_FLAGS, ...KNOWN_LIST_FLAGS.map(f => `${f}=<ids>`)].join(", ")}`);
        console.error(`[codex-sync] valid stage ids: ${stages.map(s => s.id).join(", ")}`);
        process.exit(1);
    }
}

async function runStage(stage, index, total) {
    // Resolve async argv OUTSIDE the Promise executor: a throw here must reject
    // runStage's promise, not vanish into a discarded async-executor promise
    // (which would leave the orchestrator awaiting a Promise that never settles).
    const argv = stage.argsAsync ? await stage.argsAsync() : stage.args ?? [];
    const hasTestTarget = argv.some(argument => typeof argument === "string" && !argument.startsWith("--"));
    if (stage.argsAsync && argv.includes("--test") && !hasTestTarget) {
        throw Object.assign(new Error(`No tests discovered for ${stage.id}`), { stage: stage.id });
    }
    const label = `[${index}/${total}] ${stage.label}`;
    process.stdout.write(`${label} ...`);
    if (verbose) {
        const command = stage.cmd ? `${stage.cmd} ${argv.join(" ")}` : `${stage.label} (internal coordinator)`;
        process.stdout.write(`\n  $ ${command}\n`);
    }

    try {
        const skipReason = await optionalStageSkipReason(stage.id);
        if (skipReason) {
            process.stdout.write(verbose ? `${label} ↷ SKIP (${skipReason})\n` : ` ↷ SKIP (${skipReason})\n`);
            return { stage: stage.id, code: 0, skipped: true };
        }
    } catch (error) {
        error.stage = stage.id;
        throw error;
    }

    if (stage.run) {
        const startedAt = Date.now();
        try {
            await stage.run();
            const ms = Date.now() - startedAt;
            process.stdout.write(verbose ? `${label} ✓ pass (${ms}ms)\n` : ` ✓ pass (${ms}ms)\n`);
            return { stage: stage.id, code: 0, ms };
        } catch (error) {
            const ms = Date.now() - startedAt;
            process.stdout.write(verbose ? `${label} ✗ FAIL (${ms}ms)\n` : ` ✗ FAIL (${ms}ms)\n`);
            error.stage = stage.id;
            throw error;
        }
    }

    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
        const child = spawn(stage.cmd, argv, {
            cwd: rootDir,
            // Verification exercises hooks even when the user's chat runtime is off.
            // This child-only override never changes their saved preference or chat.
            env: stage.test ? { ...process.env, CK_FRAMEWORK_MODE: "on" } : process.env,
            stdio: verbose ? "inherit" : ["ignore", "pipe", "pipe"],
        });

        let stdoutBuf = "";
        let stderrBuf = "";
        if (!verbose) {
            child.stdout.on("data", d => { stdoutBuf += d.toString(); });
            child.stderr.on("data", d => { stderrBuf += d.toString(); });
        }

        // A spawn failure (missing executable, EACCES) yields a bare Error with no stage
        // and no exit code, which the orchestrator would report as stage 'undefined'.
        child.on("error", error => {
            error.stage = stage.id;
            reject(error);
        });
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

// Self-documenting roster. Without it the only way to learn the stage ids is to read this source or
// a host `package.json` — the exact dependency the portable contract forbids.
function printStageRoster() {
    console.log(`[codex-sync] ${stages.length} stages (in order), from ${rootDir}`);
    for (const [index, stage] of stages.entries()) {
        console.log(`  ${String(index + 1).padStart(2)}. ${stage.id.padEnd(24)} ${stage.mutate ? "MUTATE" : "verify"}  ${stage.label}`);
    }
    console.log("[codex-sync] --verify-only runs every 'verify' stage above; --only=<ids>/--skip=<ids> select a subset.");
}

async function pathExists(target) {
    try {
        await access(target);
        return true;
    } catch {
        return false;
    }
}

// POST-RUN HANDOFF (deliberately NOT a stage): when the consuming project has a
// project-local `.opencode/` directory, sync the opencode hooks surface too. The Codex
// roster is a pinned 19-stage contract and the opencode pipeline owns its own roster and
// verify gates, so this is a handoff rather than a 20th stage. Under `--verify-only` the
// handoff is read-only too, preserving the "no mutation" contract of that mode.
async function syncOpencodeIfPresent() {
    const opencodeDir = path.join(rootDir, ".opencode");
    if (!(await pathExists(opencodeDir))) return { ran: false };
    const opencodeRunner = path.join(rootDir, ".claude", "skills", "sync-opencode", "scripts", "run-opencode-sync.mjs");
    if (!(await pathExists(opencodeRunner))) {
        console.log("[codex-sync] .opencode/ present but the sync-opencode runner is absent; skipping opencode sync");
        return { ran: false };
    }
    console.log(`[codex-sync] .opencode/ present → handoff to sync-opencode${verifyOnly ? " (--verify-only)" : ""}`);
    const result = await runCaptured(process.execPath, [opencodeRunner, ...(verifyOnly ? ["--verify-only"] : [])]);
    relay(result);
    if (result.code !== 0) {
        throw Object.assign(new Error("sync-opencode handoff failed"), { exitCode: result.code || 1 });
    }
    return { ran: true };
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
        console.error("[codex-sync] no stages selected; check --only/--skip flags");
        process.exit(1);
    }

    console.log(`[codex-sync] running ${active.length} stage(s) from ${rootDir}`);
    const startedAt = Date.now();

    for (let i = 0; i < active.length; i++) {
        try {
            // Belongs to the mutating migration stage, including ai-context-refresh's
            // --skip=claude-md handoff. Verify-only never reaches this branch.
            if (active[i].id === "migrate") {
                const { syncWorkflowSkillContracts } = require(path.join(rootDir, ".claude", "scripts", "lib", "workflow-skill-contract.cjs"));
                const updated = syncWorkflowSkillContracts(rootDir);
                process.stdout.write(`[workflow-calls] updated: ${updated.length}\n`);
            }
            await runStage(active[i], i + 1, active.length);
        } catch (err) {
            err.stage ??= active[i].id;
            console.error(`[codex-sync] aborted at stage '${err.stage}' (exit ${err.exitCode ?? "?"})`);
            process.exit(err.exitCode || 1);
        }
    }

    // The handoff is defined as running "after all stages pass", so a subset run
    // (--only/--skip) must not trigger it, and its failure must surface the opencode
    // stage's own exit code instead of an unhandled rejection. `await main()` has no
    // top-level catch, so without this wrapper a throw here exits 1 and prints a stack.
    const subsetRun = Boolean((onlySet && onlySet.size) || (skipSet && skipSet.size));
    if (subsetRun) {
        console.log("[codex-sync] subset run (--only/--skip): skipping the opencode handoff (it runs only after the full roster passes)");
    } else {
        try {
            await syncOpencodeIfPresent();
        } catch (err) {
            console.error(`[codex-sync] opencode handoff failed (exit ${err.exitCode ?? "?"})`);
            process.exit(err.exitCode || 1);
        }
    }

    const ms = Date.now() - startedAt;
    console.log(`[codex-sync] all ${active.length} stage(s) passed (${ms}ms)`);
}

await main();
