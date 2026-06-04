import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

// Locks the content-loss guard in generate-claude-md.cjs `updateMarkedSections`. `--mode update`
// REPLACES each managed section's body with builder output; this session it silently dropped two
// hand-curated callouts (the Windows-Python note + a Design-routing note) with NO verifier catching
// it — the only drift in the class that was invisible. The guard converts that silent drop into a
// visible WARN. These tests fail if the guard is removed or its low-noise heuristic regresses.

const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const generatorPath = path.join(repoRoot, ".claude", "skills", "claude-md-init", "scripts", "generate-claude-md.cjs");

// Importing the generator must NOT regenerate CLAUDE.md (require.main guard). If the guard were
// missing, requiring it here would run main() against the test runner's argv and mutate the repo.
const gen = require(generatorPath);

const section = (key, ...bodyLines) =>
  [`<!-- SECTION:${key} -->`, "", ...bodyLines, "", `<!-- /SECTION:${key} -->`].join("\n");

const callout = "**Platform (Windows):** invoke Python via `py -3` — NEVER `python3`.";

test("TC-CLG-001 module exports updateMarkedSections without running main() on import", () => {
  assert.equal(typeof gen.updateMarkedSections, "function");
  assert.ok(gen.CURATED_CALLOUT instanceof RegExp);
});

test("TC-CLG-002 WARNs when a curated callout in the old body is not reproduced by the builder", () => {
  const existing = section("dev-commands", "```bash", "node test # all", "```", "", callout);
  const warns = [];
  gen.updateMarkedSections(existing, { "dev-commands": "```bash\nnode test # all\n```" }, m => warns.push(m));
  assert.equal(warns.length, 1, "dropping a curated callout must WARN");
  assert.match(warns[0], /SECTION:dev-commands/);
  assert.match(warns[0], /Platform \(Windows\)/);
  assert.match(warns[0], /project-config\.json/, "WARN must point at the durable (config-sourced) home");
});

test("TC-CLG-003 stays silent when the builder reproduces the callout (e.g. via commandsNote)", () => {
  const existing = section("dev-commands", "```bash", "node test # all", "```", "", callout);
  const newBody = "```bash\nnode test # all\n```\n\n" + callout;
  const warns = [];
  gen.updateMarkedSections(existing, { "dev-commands": newBody }, m => warns.push(m));
  assert.equal(warns.length, 0, "no warning when the callout survives in the new content");
});

test("TC-CLG-004 low-noise: dropping a plain (non-callout) line does NOT warn", () => {
  const existing = section("doc-lookup", "| a | b |", "| plain row | no bold |");
  const warns = [];
  gen.updateMarkedSections(existing, { "doc-lookup": "| a | b |" }, m => warns.push(m));
  assert.equal(warns.length, 0, "plain table/command lines are not curated callouts and must not warn");
});

test("TC-CLG-006 escape-insensitive: prettier-escaped old line vs unescaped builder output does NOT warn", () => {
  // The committed CLAUDE.md is prettier-managed, so it escapes markdown punctuation
  // (`_SharedCommon` -> `\_SharedCommon`). The data-driven builders emit the raw form. The guard
  // must treat these as the same content, else regenerating a prettier-formatted file falsely
  // reports the Apps/Services callout as dropped on every run.
  const escaped = "> **Apps/Services:** Alpha, \\_SharedLib, Sample.Platform, demo\\_domain.";
  const unescaped = "> **Apps/Services:** Alpha, _SharedLib, Sample.Platform, demo_domain.";
  const existing = section("tldr", escaped);
  const warns = [];
  gen.updateMarkedSections(existing, { tldr: unescaped }, m => warns.push(m));
  assert.equal(warns.length, 0, "escaping-only differences must not be reported as content loss");
});

test("TC-CLG-005 unmanaged sections (no builder content) never warn", () => {
  // A section the update isn't rebuilding (not in the sections map) keeps its body verbatim — no drop.
  const existing = section("static-prose", callout);
  const warns = [];
  gen.updateMarkedSections(existing, {}, m => warns.push(m));
  assert.equal(warns.length, 0, "sections without builder output are preserved, not dropped");
});

test("TC-CLG-007 init mode bakes former hook guidance into CLAUDE.md static carrier", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-md-init-hookless-"));

  try {
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, "docs", "project-config.json"),
      JSON.stringify(
        {
          project: { name: "Hookless Test", description: "Temporary hookless init fixture." },
          framework: { languages: ["typescript"] },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              whenToUse: "user wants to verify changes",
              sequence: ["test"],
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [generatorPath, "--mode", "init"], { cwd: tempRoot });

    const claudeMd = await fs.readFile(path.join(tempRoot, "CLAUDE.md"), "utf8");
    for (const expected of [
      "<!-- CK:UNIVERSAL-GUIDES v6 -->",
      "<!-- CK:WORKFLOW-GATE -->",
      "## Workflow & Skills Catalog",
      "`testing`",
      "<!-- CK:CRITICAL-THINKING -->",
      "<!-- CK:AI-MISTAKE-PREVENTION -->",
      "## Continuous Improvement — Lesson Extraction Gate",
      "docs/project-reference/lessons.md",
    ]) {
      assert.ok(claudeMd.includes(expected), `CLAUDE.md init output must include ${expected}`);
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
