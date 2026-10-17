import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import util from "node:util";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { materializeHookMirror } from "../sync-hooks.mjs";

// Contract: portable framework tooling behaves identically when the checkout or the OS temp dir
// is reached through a symlink (macOS spells its temp dir /var/folders/…/T/ while /var is a
// symlink to /private/var). process.argv[1] keeps the caller's spelling, and so does a module's own
// path under --preserve-symlinks, so every comparison that leaves either side lexical silently
// turns an entry point into a no-op, and a lexical walk rejects the temp dir itself.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../../../");
const claudeDir = path.join(repoRoot, ".claude");

function linkDir(target, link) {
  fs.symlinkSync(target, link, process.platform === "win32" ? "junction" : "dir");
}

// Mirrors the macOS layout: a symlinked ANCESTOR above a real leaf, with a trailing separator.
function symlinkedTmp(t) {
  // Windows' native directory alias is a junction. Node can stall before the first assertion when
  // `mkdtemp` traverses a junction beneath the OS temp tree (notably its 8.3 user path), so keep the
  // disposable Windows fixture under the repository's ignored tmp/ owner. The alias itself and all
  // redirected temp variables remain unchanged. POSIX/macOS retain the native /var -> /private/var
  // shape this contract was created to exercise.
  const fixtureParent = process.platform === "win32" ? path.join(repoRoot, "tmp") : os.tmpdir();
  fs.mkdirSync(fixtureParent, { recursive: true });
  const base = fs.realpathSync.native(fs.mkdtempSync(path.join(fixtureParent, "symlinked-tmpdir-contract-")));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const real = path.join(base, "real");
  fs.mkdirSync(path.join(real, "T"), { recursive: true });
  const link = path.join(base, "link");
  linkDir(real, link);
  const tmp = `${path.join(link, "T")}${path.sep}`;
  const env = { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp };
  delete env.NODE_TEST_CONTEXT;
  return { base, real, link, tmp, env };
}

// --- TC-SYMTMP-004 -------------------------------------------------------------------------

// Repo-relative: every suite whose fixtures or oracles depend on how the OS temp dir is spelled.
const TEMP_SENSITIVE_SUITES = [
  ".claude/scripts/codex/tests/workflow-baseline.test.mjs",
  ".claude/scripts/codex/tests/read-workflow-entry.test.mjs",
  ".claude/scripts/codex/tests/workflow-manifest.test.mjs",
  ".claude/scripts/codex/tests/verifier-root-contract.test.mjs",
  ".claude/scripts/tests/project-root.test.mjs",
  ".claude/scripts/tests/install-bootstrap.test.cjs",
];

// Keep the declared Node 18.0+ floor: this flag exists only in the listed backports and newer.
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const supportsTestConcurrencyFlag = nodeMajor >= 21
  || (nodeMajor === 20 && nodeMinor >= 10)
  || (nodeMajor === 18 && nodeMinor >= 19);
const nestedTestConcurrencyArgs = supportsTestConcurrencyFlag ? ["--test-concurrency=1"] : [];

test("TC-SYMTMP-004: temp-dir-sensitive suites pass when the temp dir sits behind a symlinked ancestor", { timeout: 300000 }, (t) => {
  // Given redirected temp variables whose ancestor is a symlink/junction.
  const fx = symlinkedTmp(t);

  // When every temp-sensitive suite runs through Node's real test-process boundary.
  const result = spawnSync(process.execPath,
    ["--test", "--test-reporter=tap", ...nestedTestConcurrencyArgs, ...TEMP_SENSITIVE_SUITES.map((name) => path.join(repoRoot, name))],
    { cwd: repoRoot, env: fx.env, encoding: "utf8", timeout: 240000, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });

  // Then the nested runner completes and every suite preserves the symlinked-temp contract.
  assert.equal(result.error, undefined);
  const failures = result.stdout.split(/\r?\n/).filter((line) => /^\s*not ok /.test(line)).join("\n");
  const total = (name) => {
    const match = result.stdout.match(new RegExp(`^# ${name} (\\d+)$`, "m"));
    assert.ok(match, `TAP summary is missing "# ${name}":\n${result.stdout.slice(-2000)}\n${result.stderr.slice(-2000)}`);
    return Number(match[1]);
  };
  assert.equal(total("fail"), 0, `failing cases under a symlinked temp dir:\n${failures}`);
  assert.equal(total("cancelled"), 0, failures);
  assert.ok(total("pass") > 0, "the nested run executed no tests");
  assert.equal(result.status, 0, `${failures}\n${result.stderr.slice(-2000)}`);
});

// --- TC-SYMTMP-009 -------------------------------------------------------------------------

// Hook suites run through their own runner, not node:test, so they cannot join the list above.
const TEMP_SENSITIVE_HOOK_SUITES = ["file-convention-inject", "graph-head-staleness", "review-commit-gate"];
const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, "");

test("TC-SYMTMP-009: temp-dir-sensitive hook suites pass when the temp dir sits behind a symlinked ancestor", { timeout: 300000 }, (t) => {
  const fx = symlinkedTmp(t);
  const runner = path.join(claudeDir, "hooks", "tests", "run-all-tests.cjs");
  const failures = [];
  for (const suite of TEMP_SENSITIVE_HOOK_SUITES) {
    // Receipt/candidate tests create many real Git repositories and can exceed two minutes on
    // Windows under load. Keep the allowance bounded below the parent test's five-minute cap.
    const timeout = suite === "review-commit-gate" ? 240000 : 120000;
    const result = spawnSync(process.execPath, [runner, `--filter=${suite}`],
      { cwd: repoRoot, env: fx.env, encoding: "utf8", timeout, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    assert.equal(result.error, undefined, suite);
    const output = stripAnsi(`${result.stdout}\n${result.stderr}`);
    const passed = output.match(/All (\d+) tests passed/);
    if (result.status !== 0 || !passed || Number(passed[1]) === 0) {
      failures.push(`${suite} (exit ${result.status}):\n${output.split("\n").filter((line) => /✗/.test(line)).join("\n") || output.slice(-1500)}`);
    }
  }
  assert.deepEqual(failures, [], `hook suites failing under a symlinked temp dir:\n${failures.join("\n\n")}`);
});

// --- TC-SYMTMP-010 -------------------------------------------------------------------------

// Contract: a target is classified by filesystem identity, not by spelling. The project root may
// arrive lexical (CLAUDE_PROJECT_DIR) while process.cwd() is symlink-resolved; both name the same
// directory, so an in-project file must stay in-project whichever spelling each operand uses.
test("TC-SYMTMP-010: toRepoRelative classifies targets by identity, not by path spelling", (t) => {
  const fx = symlinkedTmp(t);
  const requireCjs = createRequire(import.meta.url);
  const { toRepoRelative } = requireCjs(path.join(claudeDir, "hooks", "lib", "file-conventions.cjs"));
  const realProject = path.join(fx.real, "T", "proj");
  const lexicalProject = path.join(fx.link, "T", "proj");
  fs.mkdirSync(path.join(realProject, ".claude", "hooks"), { recursive: true });
  fs.writeFileSync(path.join(realProject, ".claude", "hooks", "x.cjs"), "");
  fs.mkdirSync(path.join(fx.real, "T", "proj-other"));
  fs.mkdirSync(path.join(fx.real, "T", "outside"));
  linkDir(path.join(fx.real, "T", "outside"), path.join(realProject, "linkout"));
  const outside = path.join(fx.real, "T", "outside");
  linkDir(path.join(fx.real, "T", "nowhere"), path.join(outside, "dangling"));
  linkDir(path.join(outside, "loop-b"), path.join(outside, "loop-a"));
  linkDir(path.join(outside, "loop-a"), path.join(outside, "loop-b"));
  linkDir(realProject, path.join(fx.real, "T", "alias"));

  const cases = [
    ["lexical root, canonical cwd, relative file", ".claude/hooks/x.cjs", lexicalProject, realProject, ".claude/hooks/x.cjs"],
    ["canonical root, lexical cwd, relative file", ".claude/hooks/x.cjs", realProject, lexicalProject, ".claude/hooks/x.cjs"],
    ["lexical root, canonical absolute file", path.join(realProject, ".claude", "hooks", "x.cjs"), lexicalProject, lexicalProject, ".claude/hooks/x.cjs"],
    ["not-yet-written file under mixed spellings", "src/new/file.ts", lexicalProject, realProject, "src/new/file.ts"],
    ["sibling sharing the root's name prefix stays outside", path.join(fx.real, "T", "proj-other", "a.ts"), lexicalProject, realProject, null],
    ["parent traversal stays outside", "../outside.ts", lexicalProject, realProject, null],
    // Preservation: the lexical in-project result wins, so an in-project symlink pointing outside
    // keeps its in-project classification instead of being re-judged by where it points.
    ["in-project symlink to an outside dir keeps its lexical classification", "linkout/a.ts", realProject, realProject, "linkout/a.ts"],
    // An outside spelling that resolves into the project is in-project; one whose identity cannot be
    // established (broken or looping symlink) fails closed to outside rather than throwing.
    ["outside alias resolving into the project is in-project", path.join(fx.real, "T", "alias", ".claude", "hooks", "x.cjs"), realProject, realProject, ".claude/hooks/x.cjs"],
    ["broken symlink outside the project stays outside", path.join(outside, "dangling", "a.ts"), lexicalProject, realProject, null],
    ["symlink loop outside the project stays outside", path.join(outside, "loop-a", "a.ts"), lexicalProject, realProject, null],
  ];
  const mismatches = cases
    .map(([name, filePath, projectDir, cwd, expected]) => ({ name, expected, actual: toRepoRelative(filePath, projectDir, cwd) }))
    .filter(({ expected, actual }) => expected !== actual);
  assert.deepEqual(mismatches, []);
});

// --- TC-SYMTMP-011 -------------------------------------------------------------------------

// Same identity contract for the doc-sync relativizers, whose project root is fixed at module
// load from a lexical CLAUDE_PROJECT_DIR. A canonical spelling of an in-project file must still
// classify as repo-relative; outside paths keep the relativizers' existing pass-through shape.
const DOC_SYNC_RELATIVIZERS = [".claude/hooks/lib/doc-sync-classify.cjs", ".claude/scripts/doc-impact-map.cjs"];

test("TC-SYMTMP-011: doc-sync toRepoRel classifies targets by identity, not by path spelling", (t) => {
  const fx = symlinkedTmp(t);
  const realProject = path.join(fx.real, "T", "proj");
  const lexicalProject = path.join(fx.link, "T", "proj");
  fs.mkdirSync(path.join(realProject, ".claude", "hooks"), { recursive: true });
  fs.writeFileSync(path.join(realProject, ".claude", "hooks", "x.cjs"), "");
  fs.mkdirSync(path.join(fx.real, "T", "outside"));
  const outside = path.join(fx.real, "T", "outside");
  linkDir(path.join(fx.real, "T", "nowhere"), path.join(outside, "dangling"));
  linkDir(realProject, path.join(fx.real, "T", "alias"));
  const posix = (p) => p.split(path.sep).join("/").replace(/^\/+/, "");

  const cases = [
    ["relative input passes through", "src/a.ts", "src/a.ts"],
    ["lexical absolute in-project file", path.join(lexicalProject, ".claude", "hooks", "x.cjs"), ".claude/hooks/x.cjs"],
    ["canonical absolute in-project file", path.join(realProject, ".claude", "hooks", "x.cjs"), ".claude/hooks/x.cjs"],
    ["canonical absolute not-yet-written file", path.join(realProject, "src", "new", "file.ts"), "src/new/file.ts"],
    ["outside alias resolving into the project", path.join(fx.real, "T", "alias", ".claude", "hooks", "x.cjs"), ".claude/hooks/x.cjs"],
    // Outside paths keep the pre-existing shape (never classified as in-project), including a path
    // whose identity cannot be established.
    ["outside file keeps its pass-through shape", path.join(outside, "a.ts"), posix(path.join(outside, "a.ts"))],
    ["broken symlink outside keeps its pass-through shape", path.join(outside, "dangling", "a.ts"), posix(path.join(outside, "dangling", "a.ts"))],
  ];
  const probe = `const m = require(process.argv[1]); process.stdout.write(JSON.stringify(JSON.parse(process.argv[2]).map((p) => m.toRepoRel(p))));`;
  const mismatches = [];
  for (const modulePath of DOC_SYNC_RELATIVIZERS) {
    const env = { ...fx.env, CLAUDE_PROJECT_DIR: lexicalProject };
    const result = spawnSync(process.execPath, ["-e", probe, path.join(repoRoot, modulePath), JSON.stringify(cases.map((c) => c[1]))],
      { cwd: realProject, env, encoding: "utf8", timeout: 60000, windowsHide: true });
    assert.equal(result.error, undefined, modulePath);
    assert.equal(result.status, 0, `${modulePath}: ${result.stderr}`);
    const actual = JSON.parse(result.stdout);
    cases.forEach(([name, , expected], index) => {
      if (actual[index] !== expected) mismatches.push({ module: modulePath, name, expected, actual: actual[index] });
    });
  }
  assert.deepEqual(mismatches, []);
});

// --- TC-SYMTMP-007 -------------------------------------------------------------------------

const CJS_ENTRY_POINTS = [
  ".claude/hooks/lib/convention-merge.cjs",
  ".claude/hooks/lib/file-conventions.cjs",
  ".claude/hooks/file-convention-inject.cjs",
  ".claude/hooks/prompt-ledger.cjs",
  ".claude/hooks/workflow-route-inject.cjs",
];

// Preloaded into every run: records each framework module compiled and the first read of fd 0,
// which only a hook's entry branch performs.
const RECORDER = `"use strict";
const fs = require("fs");
const path = require("path");
const Module = require("module");
const out = process.env.SYMTMP_RECORDER_OUT;
const root = process.env.SYMTMP_REPO_ROOT;
const append = fs.appendFileSync;
const record = (line) => { try { append(out, line + "\\n"); } catch (_) {} };
const compile = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
  // Module identity is canonical: under --preserve-symlinks the loader keeps the link spelling.
  let real = filename;
  try { real = fs.realpathSync(filename); } catch (_) {}
  const relative = path.relative(root, real);
  if (relative.split(path.sep)[0] === ".claude") record("module:" + relative.split(path.sep).join("/"));
  return compile.call(this, content, filename);
};
let stdinSeen = false;
const markStdin = () => { if (!stdinSeen) { stdinSeen = true; record("entry:stdin-read"); } };
const readSync = fs.readSync;
fs.readSync = function (fd, ...rest) { if (fd === 0) markStdin(); return readSync.call(this, fd, ...rest); };
const readFileSync = fs.readFileSync;
fs.readFileSync = function (file, ...rest) { if (file === 0 || file === "/dev/stdin") markStdin(); return readFileSync.call(this, file, ...rest); };
`;

async function codexLauncherScript(t) {
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), "symlinked-tmpdir-hooks-"));
  t.after(() => fs.rmSync(staging, { recursive: true, force: true }));
  await materializeHookMirror(staging);
  const hooks = JSON.parse(fs.readFileSync(path.join(staging, "hooks.json"), "utf8"));
  const commands = JSON.stringify(hooks).match(/node -e \\"(.*?)\\" -- /);
  assert.ok(commands, "generated hook mirror contains no node -e launcher");
  return JSON.parse(`"${commands[1]}"`);
}

test("TC-SYMTMP-007: CJS entry points run their entry branch when launched through a symlinked path", async (t) => {
  const base = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "symlinked-tmpdir-cjs-")));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const recorder = path.join(base, "recorder.cjs");
  fs.writeFileSync(recorder, RECORDER, "utf8");
  const repoLink = path.join(base, "repo-link");
  linkDir(repoRoot, repoLink);
  const launcher = await codexLauncherScript(t);

  let runIndex = 0;
  const run = (args, cwd, target) => {
    const out = path.join(base, `run-${runIndex++}.log`);
    const env = { ...process.env, SYMTMP_RECORDER_OUT: out, SYMTMP_REPO_ROOT: repoRoot };
    delete env.NODE_TEST_CONTEXT;
    delete env.CLAUDE_PROJECT_DIR;
    const result = spawnSync(process.execPath, ["-r", recorder, ...args],
      { cwd, env, input: "", encoding: "utf8", timeout: 60000, windowsHide: true });
    assert.equal(result.error, undefined);
    const log = fs.existsSync(out) ? fs.readFileSync(out, "utf8").split("\n").filter(Boolean) : [];
    // Compare the outcome the entry branch owns (exit status, output, the entry markers), not the
    // module-load order: a launcher-aware guard may legitimately load its own helper to decide.
    return {
      status: result.status, stdout: result.stdout, stderr: result.stderr,
      loaded: log.includes(`module:${target}`), entries: log.filter((line) => line.startsWith("entry:")),
    };
  };

  // Every entry point is checked before asserting, so one run reports the whole class.
  const mismatches = [];
  for (const target of CJS_ENTRY_POINTS) {
    const reference = run([path.join(repoRoot, target)], repoRoot, target);
    assert.ok(reference.loaded, `reference run never loaded ${target}`);
    const launches = {
      // (i) An absolute path spelled through the symlinked checkout.
      "absolute symlink-spelled": run(["-e", "require(process.argv[1])", "--", path.join(repoLink, target)], repoRoot, target),
      // (ii) Preservation: the generated Codex launcher from a symlinked working directory.
      "generated Codex launcher": run(["-e", launcher, "--", target], repoLink, target),
      // (iii) --preserve-symlinks keeps __filename on the link spelling too, so the module side of
      // the comparison must be canonical as well as argv[1].
      "preserve-symlinks": run(["--preserve-symlinks", "-e", "require(process.argv[1])", "--", path.join(repoLink, target)], repoRoot, target),
    };
    for (const [mode, observed] of Object.entries(launches)) {
      if (!util.isDeepStrictEqual(observed, reference)) mismatches.push({ target, mode, observed, reference });
    }
  }
  assert.deepEqual(mismatches, [], "each launch must behave exactly like a direct run of the same entry point");
});
