import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { frameworkPkg, readFrameworkRootFile } from "./framework-repo.helper.mjs";

// Regression lock for the cross-surface mirror-drift class fixed this session:
//   1. A standalone `prettier --write` reformatted AGENTS.md and drifted its projection off
//      CLAUDE.md, FAILing the sync-divergence oracle.
//   2. There was no single entrypoint to sync+verify the codex surfaces, so a one-surface sync
//      left the others silently stale.
// These tests fail loudly if either guard is removed — keeping the sync pipeline the sole writer
// of generated-mirror bytes, and keeping one command that re-establishes full cross-surface parity.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");

const read = rel => fs.readFileSync(path.join(repoRoot, rel), "utf8");

// All three tests below assert facts about THIS repo's own root `.prettierignore` / `package.json`.
// An adopting project supplies its own, so they are framework-repo self-checks — see
// framework-repo.helper.mjs for why an unconditional read aborted the pipeline in adopting projects.
// PORT-011 locks the guard to resolve true here, so a rename cannot silently skip them.

// TC-MWG-001 — every generated cross-surface mirror is excluded from prettier so the sync is its
// sole byte-writer. These are the exact artifacts the mirror-equality verifiers byte-compare.
test("TC-MWG-001 .prettierignore excludes every generated cross-surface mirror", () => {
  const ignore = readFrameworkRootFile(repoRoot, ".prettierignore");
  if (ignore === null) return; // adopting project: its prettier config is its own
  const required = ["/AGENTS.md", "/.codex/", "/.agents/"];
  const lines = new Set(ignore.split(/\r?\n/).map(l => l.trim()));
  const missing = required.filter(p => !lines.has(p));
  assert.equal(missing.length, 0, `.prettierignore must exclude generated mirrors (prettier-drift guard). Missing: ${missing.join(", ")}`);
});

// TC-MWG-002 — CLAUDE.md stays prettier-managed (it is source the generator emits prettier-clean,
// and AGENTS.md embeds its already-formatted body). Ignoring it would mask real formatting drift.
test("TC-MWG-002 .prettierignore does NOT exclude CLAUDE.md (it is prettier-managed source)", () => {
  const ignore = readFrameworkRootFile(repoRoot, ".prettierignore");
  if (ignore === null) return; // adopting project: its prettier config is its own
  const lines = new Set(ignore.split(/\r?\n/).map(l => l.trim()));
  assert.ok(!lines.has("/CLAUDE.md") && !lines.has("CLAUDE.md"), "CLAUDE.md must remain prettier-managed source, not an ignored mirror");
});

// TC-MWG-003 — the full pipeline is reachable ONLY from inside `.claude`. The predecessor of this
// test allowed `sync:all`/`verify:all` as thin delegating npm aliases; they are now forbidden
// entirely, because a delegating alias is still a second documented interface, and prose that
// teaches `npm run …` teaches a command absent from a Python repo, a .NET repo, or any project that
// copied only `.claude`. The runner is the sole orchestrator, and it ships inside the bundle.
test("TC-MWG-003 the whole pipeline is driven from inside .claude, never from a package.json script", () => {
  // Runner presence is UNCONDITIONAL — it travels in the bundle.
  const runnerPath = path.join(repoRoot, ".claude", "skills", "sync-codex", "scripts", "run-codex-sync.mjs");
  assert.ok(fs.existsSync(runnerPath), "the standalone runner must exist inside .claude");
  const runner = fs.readFileSync(runnerPath, "utf8");
  assert.match(runner, /--verify-only/, "the runner must expose the read-only pipeline selector itself");
  assert.match(runner, /--list-stages/, "the runner must expose its own stage roster for discovery");

  const pkg = frameworkPkg(repoRoot);
  if (!pkg) return; // adopting project: its package.json scripts are its own business
  const offenders = Object.entries(pkg.scripts || {})
    .filter(([, command]) => /\.claude[\\/]|\.codex[\\/]|run-codex-sync/.test(String(command)))
    .map(([name]) => name);
  assert.deepEqual(offenders, [], `no package.json script may drive the framework; found: ${offenders.join(", ")}`);
});
