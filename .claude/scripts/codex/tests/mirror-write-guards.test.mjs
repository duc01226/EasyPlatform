import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression lock for the cross-surface mirror-drift class fixed this session:
//   1. A standalone `prettier --write` reformatted AGENTS.md and drifted its mirror block off
//      .codex/CODEX_CONTEXT.md, FAILing verify-skill-protocol-compliance.
//   2. There was no single entrypoint to sync+verify the codex surfaces, so a one-surface sync
//      left the others silently stale.
// These tests fail loudly if either guard is removed — keeping the sync pipeline the sole writer
// of generated-mirror bytes, and keeping one command that re-establishes full cross-surface parity.

const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");

const read = rel => fs.readFileSync(path.join(repoRoot, rel), "utf8");

// TC-MWG-001 — every generated cross-surface mirror is excluded from prettier so the sync is its
// sole byte-writer. These are the exact artifacts the mirror-equality verifiers byte-compare.
test("TC-MWG-001 .prettierignore excludes every generated cross-surface mirror", () => {
  const ignore = read(".prettierignore");
  const required = ["/AGENTS.md", "/.codex/", "/.agents/"];
  const lines = new Set(ignore.split(/\r?\n/).map(l => l.trim()));
  const missing = required.filter(p => !lines.has(p));
  assert.equal(missing.length, 0, `.prettierignore must exclude generated mirrors (prettier-drift guard). Missing: ${missing.join(", ")}`);
});

// TC-MWG-002 — CLAUDE.md stays prettier-managed (it is source the generator emits prettier-clean,
// and AGENTS.md embeds its already-formatted body). Ignoring it would mask real formatting drift.
test("TC-MWG-002 .prettierignore does NOT exclude CLAUDE.md (it is prettier-managed source)", () => {
  const lines = new Set(read(".prettierignore").split(/\r?\n/).map(l => l.trim()));
  assert.ok(!lines.has("/CLAUDE.md") && !lines.has("CLAUDE.md"), "CLAUDE.md must remain prettier-managed source, not an ignored mirror");
});

// TC-MWG-003 — the unified sync:all/verify:all entrypoints DELEGATE to the standalone runner instead
// of embedding an `npm run … && …` chain. This is the portability contract: the full-pipeline logic
// lives in ONE place inside `.claude` (run-codex-sync.mjs), so a project that only copied `.claude`
// (no root package.json) runs the identical pipeline, and the npm chain can't drift from the runner.
// The "spans both surfaces" guarantee now lives on the runner and is locked by PORT-005.
test("TC-MWG-003 sync:all + verify:all delegate to the standalone .claude runner (no embedded && chain)", () => {
  const pkg = JSON.parse(read("package.json"));
  const scripts = pkg.scripts || {};
  for (const name of ["sync:all", "verify:all"]) {
    assert.ok(typeof scripts[name] === "string" && scripts[name].length > 0, `package.json must define the "${name}" script`);
  }
  const runnerRef = /node\s+\.claude\/skills\/sync-codex\/scripts\/run-codex-sync\.mjs/;
  for (const name of ["sync:all", "verify:all"]) {
    assert.match(scripts[name], runnerRef, `${name} must delegate to the standalone runner, not re-encode the chain`);
    assert.ok(!scripts[name].includes("&&"), `${name} must NOT embed an && chain — orchestration logic belongs in the .claude runner, not package.json`);
  }
});
