import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
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
const generatorPath = path.join(repoRoot, ".claude", "skills", "ai-context-refresh", "scripts", "generate-claude-md.cjs");
const buildersPath = path.join(path.dirname(generatorPath), "section-builders.cjs");

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
  assert.equal(gen.updateMarkedSections(existing, {}, m => warns.push(m)), existing);
  assert.equal(warns.length, 0, "sections without builder output are preserved, not dropped");
});

test("TC-CLG-007 init mode writes a project-only root with no routing text", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ai-context-refresh-hookless-"));

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
              preActions: { injectContext: "Use the selected workflow context." },
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

    await execFileAsync(process.execPath, [generatorPath, "--mode", "init"], {
      cwd: tempRoot, env: { ...process.env, CLAUDE_PROJECT_DIR: tempRoot },
    });

    const claudeMd = await fs.readFile(path.join(tempRoot, "CLAUDE.md"), "utf8");
    // The root holds project information only: the universal hook delivers every framework rule, the
    // route hook delivers the workflow route, so the root carries neither a pointer nor a gate.
    assertRootContract(claudeMd);
    assert.ok(claudeMd.includes("Hookless Test"), "the project name is written");
    assert.doesNotMatch(claudeMd, /<!-- CK:WORKFLOW-ROUTE-POINTER -->|<!-- CK:WORKFLOW-GATE -->|\*\*Workflow question\*\*/);
    assert.doesNotMatch(claudeMd, /CK:WORKFLOW-SKILLS|MANDATORY FIRST ACTION/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("TC-CLG-007 isolation ignores an inherited synthetic project selector", async t => {
  const ambient = await fs.mkdtemp(path.join(os.tmpdir(), "root-test-ambient-"));
  t.after(() => fs.rm(ambient, { recursive: true, force: true }));
  await fs.mkdir(path.join(ambient, "docs"));
  await fs.writeFile(path.join(ambient, "docs/project-config.json"), "{}");
  const sentinels = { "CLAUDE.md": "# Synthetic ambient root\r\nKEEP λ\r\n", ".claude-md.backup": "synthetic existing backup" };
  for (const [name, value] of Object.entries(sentinels)) await fs.writeFile(path.join(ambient, name), value);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: ambient };
  delete env.NODE_TEST_CONTEXT;
  // Select the actual older entry-point test, not this regression (no recursion).
  // Even a regression can only target this owned synthetic ambient project.
  let result, failure;
  try {
    result = await execFileAsync(process.execPath, ["--test", "--test-name-pattern=^TC-CLG-007 init mode", fileURLToPath(import.meta.url)],
      { cwd: ambient, env, timeout: 15000 });
  } catch (error) { failure = error; }
  for (const [name, value] of Object.entries(sentinels)) assert.equal(await fs.readFile(path.join(ambient, name), "utf8"), value, `${name}: ambient bytes unchanged`);
  if (failure) throw failure;
  // Node 22 renders TAP totals as `# pass`; Node 24 uses `ℹ pass`.
  // The process outcome is the invariant, not a reporter-specific glyph.
  assert.match(result.stdout, /(?:#|ℹ) pass 1\b/);
  assert.match(result.stdout, /(?:#|ℹ) fail 0\b/);
});

function assertSectionOwnership(generator) {
  // Inherited strings expose a missing own-property check even when types are guarded.
  for (const key of ["custom", "constructor", "toString", "__proto__"]) {
    const input = section(key, callout, "retain λ  ");
    for (const sections of [{}, Object.create({ [key]: "inherited replacement" })]) {
      const warnings = [];
      assert.equal(generator.updateMarkedSections(input, sections, m => warnings.push(m)), input);
      assert.deepEqual(warnings, []);
    }
    for (const value of ["", null, false, 42, {}, { length: 1 }, () => "not a builder string"]) {
      const sections = Object.defineProperty({}, key, { value, enumerable: true });
      let actual;
      assert.doesNotThrow(() => { actual = generator.updateMarkedSections(input, sections); });
      assert.equal(actual, input, `${key}: non-builder preserved`);
    }
    const sections = Object.defineProperty({}, key, { value: "own replacement", enumerable: true });
    assert.equal(generator.updateMarkedSections(section(key, "original"), sections), section(key, "own replacement"));
  }
}

function assertConfiguredConventions(buildDecisionQuickRef) {
  const heading = "**Decision Quick-Ref:**\n\n| Task | Pattern |\n|---|---|\n";
  let cases = 0;
  // Framework identity and infrastructure existence do not supply architecture; explicit project conventions do.
  for (const name of [undefined, "SampleFramework", "OtherBackend"]) {
    const config = { modules: [{ name: "hooks" }], framework: name ? { name } : {} };
    assert.equal(buildDecisionQuickRef(config), null);
    cases++;
    for (const doc of ["docs/backend-a.md", "docs/custom conventions.md"]) {
      const actual = buildDecisionQuickRef({ ...config, framework: { ...config.framework, backendPatternsDoc: doc } });
      assert.equal(actual, heading + `| Backend conventions | Read \`${doc}\` |`);
      cases++;
    }
  }
  for (const config of [{}, { modules: [], framework: { backendPatternsDoc: "docs/unused.md" } }]) {
    assert.equal(buildDecisionQuickRef(config), null);
    cases++;
  }
  for (const extra of [
    { databases: { primary: "store" } },
    { messaging: { broker: "queue" } },
  ]) {
    assert.equal(buildDecisionQuickRef({ modules: [{ name: "hooks" }], framework: { name: "FrameworkOnly" }, ...extra }), null);
    cases++;
  }
  for (const [extra, row] of [
    [{ messaging: { broker: "queue", consumerConvention: "Queue workers own message consumption" } }, "| Message consumer convention | Queue workers own message consumption |"],
    [{ modules: [{ name: "hooks", meta: { repository: "NamedRepo" } }] }, "| hooks repository | `NamedRepo` |"],
    [{ workflowPatterns: { architectureStyle: "Modular monolith", codeHierarchy: "Route -> use case -> domain function", cssMethodology: "CSS modules", stateManagement: "React local state + query cache", crossModuleValidation: "Contract tests at module boundaries" } }, [
      "| Architecture style | Modular monolith |",
      "| Code hierarchy | Route -> use case -> domain function |",
      "| Cross-module validation | Contract tests at module boundaries |",
      "| Styling methodology | CSS modules |",
      "| State management | React local state + query cache |",
    ].join("\n")],
    [{ framework: { frontendPatternsDoc: "docs/frontend-a.md" } }, "| Frontend conventions | Read `docs/frontend-a.md` |"],
  ]) {
    assert.equal(buildDecisionQuickRef({ modules: [{ name: "hooks" }], framework: { name: "FrameworkOnly" }, ...extra }), heading + (Array.isArray(row) ? row.join("\n") : row));
    cases++;
  }
  return cases;
}

test("TC-HARNESS-008/015 project conventions require configured evidence, not framework identity", () => {
  assert.equal(assertConfiguredConventions(require(buildersPath).buildDecisionQuickRef), 17);
});

test("TC-HARNESS-008/015 convention-row mutants fail the same independent mapping oracle", async () => {
  const source = (await fs.readFile(buildersPath, "utf8")).replace(/\r\n/g, "\n");
  const Module = require("node:module");
  assert.equal(assertConfiguredConventions(require(buildersPath).buildDecisionQuickRef), 17);
  const guard = "// Configuration must name a convention; a database/broker technology alone does not\n    // establish an application's data-access or messaging architecture.\n    if (config.framework?.backendPatternsDoc)";
  for (const [before, after] of [
    [guard, guard.replace("config.framework?.backendPatternsDoc", "config.framework?.name")],
    ["| Backend conventions | Read", "| New API endpoint | Controller + CQRS Command"],
  ]) {
    assert.equal(source.split(before).length, 2, "unique convention mutation target");
    const mutant = new Module(buildersPath);
    mutant.filename = buildersPath;
    mutant.paths = Module._nodeModulePaths(path.dirname(buildersPath));
    mutant._compile(source.replace(before, after), buildersPath);
    assert.equal(typeof mutant.exports.buildDecisionQuickRef, "function", "syntax-valid exported mutant");
    assert.throws(() => assertConfiguredConventions(mutant.exports.buildDecisionQuickRef), { code: "ERR_ASSERTION" });
  }
});

test("TC-HARNESS-015 only own nonempty string builders can replace section bodies", () => {
  assertSectionOwnership(gen);
});

test("TC-HARNESS-015 ownership and type-check mutants fail the same preservation oracle", async () => {
  assertSectionOwnership(gen);
  const source = await fs.readFile(generatorPath, "utf8");
  const Module = require("node:module");
  const mutations = [
    ["Object.prototype.hasOwnProperty.call(sections, key)", "true"],
    ["typeof sections[key] === 'string'", "true"],
  ];
  for (const [before, after] of mutations) {
    assert.equal(source.split(before).length, 2, "exactly one guard target");
    const mutant = new Module(generatorPath);
    mutant.filename = generatorPath;
    mutant.paths = Module._nodeModulePaths(path.dirname(generatorPath));
    mutant._compile(source.replace(before, after), generatorPath);
    assert.equal(typeof mutant.exports.updateMarkedSections, "function", "syntax-valid exported mutant");
    assert.throws(() => assertSectionOwnership(mutant.exports), { code: "ERR_ASSERTION" });
  }
});

// What the universal hook delivers now: none of it may live in the root. Each entry is the lead of a
// retired managed block or universal section.
const UNIVERSAL_ROOT_ABSENT = [
  /CK:UNIVERSAL-GUIDES/,
  /<!-- CK:CRITICAL-THINKING -->/,
  /<!-- CK:AI-MISTAKE-PREVENTION -->/,
  /<!-- CK:WORKFLOW-ROUTE-POINTER -->/,
  /<!-- CK:WORKFLOW-GATE -->/,
  /\[WORKFLOW-GATE\]/,
  /^## Task Planning Rules/m,
  /^## Generated Artifact Storage/m,
  /^## Workflow Step Advancement/m,
  /^## Search Existing Code First/m,
  /^## Code Responsibility Hierarchy/m,
  /^## Evidence-Based Reasoning/m,
  /^## Git & Version-Control Discipline/m,
  /^## Canonical Ownership/m,
  /^## Project Protocol Overlays/m,
  /^## Continuous Improvement/m,
  /Never commit, push, or stage/,
  /all-return barrier/,
  /ask.*whether to activate|MANDATORY FIRST ACTION|invoke.*Skill tool/i,
];

function assertRootContract(text) {
  for (const absent of UNIVERSAL_ROOT_ABSENT) assert.doesNotMatch(text, absent);
  assert.match(text, /<!-- SECTION:tldr -->/, "the generated project sections are kept");
  assert.ok(Buffer.byteLength(text) <= 32768, "the project-only root fits 32 KiB without truncating");
}

async function fixture(t, config = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "compact-root-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "docs"));
  await fs.writeFile(path.join(root, "docs/project-config.json"), JSON.stringify(config));
  return {
    root,
    run: (args, executable = generatorPath) => execFileAsync(process.execPath, [executable, ...args], {
      cwd: root, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    }),
    read: () => fs.readFile(path.join(root, "CLAUDE.md"), "utf8"),
  };
}

async function runCheck(f, executable = generatorPath) {
  try {
    const result = await f.run(["--check"], executable);
    return { code: 0, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  } catch (error) {
    return { code: error.code, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

test("TC-CLG-009 Given a missing root, When the read-only preflight runs, Then it requests init without writing", async t => {
  // Given a portable project with configuration but no CLAUDE.md.
  const f = await fixture(t);

  // When the generator's coordination probe runs.
  const result = await runCheck(f);

  // Then init is required and the probe has not created or backed up the root.
  assert.equal(result.code, 10);
  assert.match(result.stdout, /CLAUDE\.md missing.*init required/);
  await assert.rejects(fs.stat(path.join(f.root, "CLAUDE.md")), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(f.root, ".claude-md.backup")), { code: "ENOENT" });
});

test("TC-CLG-010 Given a markerless root, When preflight runs, Then it is accepted as project-owned and its bytes are preserved", async t => {
  // Given a project-only CLAUDE.md: the root holds project information, so an existing root is complete.
  const f = await fixture(t);
  const original = "# Project-owned instructions\n\nKeep this exact λ text.\n";
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), original, "utf8");

  // When the generator's coordination probe runs.
  const result = await runCheck(f);

  // Then the root is accepted, nothing is generated into it, and neither the root nor a backup is mutated.
  assert.equal(result.code, 0);
  assert.match(result.stdout, /markerless.*project-owned/i);
  assert.equal(await fs.readFile(path.join(f.root, "CLAUDE.md"), "utf8"), original);
  await assert.rejects(fs.stat(path.join(f.root, ".claude-md.backup")), { code: "ENOENT" });
});

test("TC-CLG-011 Given a marker-managed root from an older framework, When preflight runs, Then it is reported stale and a read-only probe preserves its bytes", async t => {
  // Given a root that still carries the retired managed blocks and the completeness sentinel.
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const legacy = ["<!-- CK:UNIVERSAL-GUIDES v7 -->", "", "<!-- CK:WORKFLOW-ROUTE-POINTER -->", "> pointer", "<!-- /CK:WORKFLOW-ROUTE-POINTER -->", "", await f.read()].join("\n");
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), legacy, "utf8");

  // When the generator's coordination probe runs.
  const result = await runCheck(f);

  // Then update is required (the update strips the blocks) and the probe wrote nothing.
  assert.equal(result.code, 11);
  assert.match(result.stdout, /marker-managed update/);
  assert.equal(await fs.readFile(path.join(f.root, "CLAUDE.md"), "utf8"), legacy);
});

test("TC-CLG-012 Given a marker-managed root, When content is current or stale, Then preflight distinguishes both states", async t => {
  // Given a root produced by the same generator that the sync runner invokes.
  const f = await fixture(t);
  await f.run(["--mode", "init"]);

  // When the probe runs once before and once after a managed-section drift.
  const current = await runCheck(f);
  const original = await f.read();
  const drifted = original.replace(/(<!-- SECTION:tldr -->\r?\n)/, "$1MANUAL MANAGED-SECTION DRIFT\r\n");
  assert.notEqual(drifted, original);
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), drifted, "utf8");
  const stale = await runCheck(f);

  // Then current is green, stale is update-required, and the read-only probe preserves drifted bytes.
  assert.equal(current.code, 0);
  assert.match(current.stdout, /CLAUDE\.md is current/);
  assert.equal(stale.code, 11);
  assert.match(stale.stdout, /marker-managed update/);
  assert.equal(await fs.readFile(path.join(f.root, "CLAUDE.md"), "utf8"), drifted);
});

test("TC-HARNESS-008 root holds project information only: no universal protocol text, every rule delivered by hook", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  assertRootContract(await f.read());
  const { extractSyncBody } = require(path.join(repoRoot, ".claude/scripts/lib/extract-sync-block.cjs"));
  const canonical = await fs.readFile(path.join(repoRoot, ".claude/skills/shared/sync-inline-versions.md"), "utf8");
  const groups = JSON.parse(await fs.readFile(path.join(repoRoot, ".claude/skills/shared/protocol-groups.json"), "utf8"));
  const tags = Object.keys(groups.groups.universal.tags);
  assert.ok(tags.length >= 4, "the universal bundle is authored");
  const root = await f.read();
  for (const tag of tags) {
    const lead = extractSyncBody(canonical, tag).split("\n").find(line => line.trim()).trim();
    assert.ok(!root.includes(lead), `${tag}: the protocol lives only in the hook-delivered bundle`);
  }
  t.diagnostic(`minimal generated root: ${Buffer.byteLength(root)} bytes`);
});

test("TC-HARNESS-015 unmanaged custom domain survives update (24 bounded cases)", () => {
  // Domain: 2 line endings × 3 custom payloads × 4 marker keys. No universal claim.
  for (const eol of ["\n", "\r\n"]) for (const body of ["plain custom rule", callout, "λ \"quote\" | table |"])
    for (const key of ["custom", "unknown-rule", "tldr", "dev-commands"]) {
      const input = ["# Custom", section(key, body), "tail preserved"].join("\n").replaceAll("\n", eol);
      assert.equal(gen.updateMarkedSections(input, {}), input);
    }
});

test("TC-HARNESS-015 project map retains every configured context path and note", async t => {
  const f = await fixture(t, {
    project: { name: "Synthetic", languages: ["javascript"] },
    contextGroups: [{ name: "surface", pathRegexes: ["alpha/.*", "beta/.*"], guideDoc: "docs/custom-guide.md" }],
    testing: { commands: { verify: "node synthetic-test.cjs" }, commandsNote: "Platform-specific invocation stays here." },
  });
  await f.run(["--mode", "init"]);
  const text = await f.read();
  for (const value of ["alpha/.*", "beta/.*", "docs/custom-guide.md", "node synthetic-test.cjs", "Platform-specific invocation stays here."])
    assert.ok(text.includes(value), value);
});

test("TC-CLG-008 init and update materialize config-sourced E2E guidance", async t => {
  const config = {
    project: { name: "E2E generation fixture", description: "Synthetic E2E config." },
    e2eTesting: {
      framework: "playwright",
      guideDoc: "docs/project-reference/e2e-test-reference.md",
    },
  };

  const fresh = await fixture(t, config);
  await fresh.run(["--mode", "init"]);
  const initialized = await fresh.read();
  assert.match(initialized, /SECTION:e2e-testing/);
  assert.match(initialized, /e2e-test-reference\.md/);

  const existing = await fixture(t, config);
  const custom = "# Existing root\n\n" + section("tldr", "keep this root") + "\n\n## Custom rule\nretain me\n";
  await fs.writeFile(path.join(existing.root, "CLAUDE.md"), custom, "utf8");
  await existing.run(["--mode", "update"]);
  const updated = await existing.read();
  assert.match(updated, /SECTION:e2e-testing/);
  assert.match(updated, /e2e-test-reference\.md/);
  assert.match(updated, /retain me/);
  assert.equal((updated.match(/<!-- SECTION:e2e-testing -->/g) || []).length, 1);
});

test("TC-HARNESS-008 secret-shaped infrastructure credentials never enter generated root", async t => {
  const sentinel = "password=synthetic-never-rendered-7f4d";
  const f = await fixture(t, {
    project: { name: "Credential fixture" },
    modules: [{ name: "database", kind: "infrastructure", meta: { port: 5432, credentials: sentinel } }],
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), "# Existing root\n\n<!-- SECTION:infra-ports -->\nold\n<!-- /SECTION:infra-ports -->\n");
  await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.doesNotMatch(text, new RegExp(sentinel));
  assert.match(text, /REDACTED.*secret-manager reference/);
});

test("TC-HARNESS-008 credential references survive without raw table injection", async t => {
  const f = await fixture(t, {
    project: { name: "Reference fixture" },
    modules: [{ name: "database", kind: "infrastructure", meta: { port: 5432, credentials: "vault://team/database" } }],
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), "# Existing root\n\n<!-- SECTION:infra-ports -->\nold\n<!-- /SECTION:infra-ports -->\n");
  await f.run(["--mode", "update"]);
  assert.match(await f.read(), /vault:\/\/team\/database/);
});

test("TC-HARNESS-008 R2-11 structured credentials cannot leak into generated root", async t => {
  // Invariant: serialization is not a credential safety check. Unknown fields
  // and quoted/escaped JSON keys must not smuggle synthetic secret material.
  const payloads = [
    { password: "synthetic-object-7f4d" },
    { nested: [{ token: "synthetic-nested-7f4d" }] },
    { arbitrary: "synthetic-unknown-7f4d" },
    ["synthetic-array-7f4d"],
    '{"password":"synthetic-json-7f4d"}',
    '{"pass\\u0077ord":"synthetic-escaped-7f4d"}',
    '"password": "synthetic-fragment-7f4d"',
    { reference: "vault://team/database", value: "synthetic-extra-7f4d" },
    { reference: "synthetic-fake-reference-7f4d" },
  ];
  const f = await fixture(t, {
    project: { name: "Synthetic structured credentials" },
    modules: payloads.map((credentials, i) => ({ name: `service-${i}`, kind: "infrastructure", meta: { port: 5432, credentials } })),
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), section("infra-ports", "old"));
  await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.doesNotMatch(text, /synthetic-[a-z-]+-7f4d/);
  assert.equal((text.match(/REDACTED/g) || []).length, payloads.length);
});

test("TC-HARNESS-008 R2-11 safe references and harmless prose remain readable", async t => {
  const values = ["vault://team/database", "Ask the operator for access", { reference: "op://team/database/password" },
    '{"reference":"vault://team/database"}', "See the runbook | access section"];
  const f = await fixture(t, {
    project: { name: "Synthetic safe credentials" },
    modules: values.map((credentials, i) => ({ name: `safe-${i}`, kind: "infrastructure", meta: { port: 5432, credentials } })),
  });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), section("infra-ports", "old"));
  await f.run(["--mode", "update"]);
  const text = await f.read();
  for (const expected of ["vault://team/database", "op://team/database/password", "Ask the operator for access", "See the runbook \\| access section"])
    assert.ok(text.includes(expected), expected);
  assert.doesNotMatch(text, /REDACTED/);
});

test("TC-HARNESS-008 the generated root routes through Doc Lookup, not repair prose", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const text = await f.read();
  assert.match(text, /## Doc Lookup — What to Read When/);
  assert.match(text, /<!-- SECTION:doc-lookup -->/);
  assert.doesNotMatch(text, /missing or stale.*\/project-init|required detail.*unavailable.*stop.*report/i, "repair rules are hook-delivered protocol text");
});

test("TC-HARNESS-015 oversized custom prose survives CLI update with explicit overflow", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const custom = "\n## My custom operating rule\n" + "λ: preserve this plain custom text.\n".repeat(1400);
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), custom);
  const result = await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.ok(text.includes(custom.trimEnd()), "custom prose must survive byte-for-byte");
  assert.match(result.stdout + result.stderr, /ROOT_OVERFLOW.*bytes.*32768/);
  assert.ok(Buffer.byteLength(text) > 32768, "overflow must not silently truncate");
});

test("TC-HARNESS-015 malformed section boundaries refuse instead of losing custom text", () => {
  for (const input of ["<!-- SECTION:custom -->\nretain", "<!-- /SECTION:custom -->",
    "<!-- SECTION:a -->\n<!-- /SECTION:b -->", "<!-- SECTION:a -->\n<!-- SECTION:b -->"])
    assert.throws(() => gen.updateMarkedSections(input, { a: "replacement" }), /SECTION/);
});

test("TC-HARNESS-015 R3-01 owned backup captures pre-update bytes; legacy destination untouched (8 cases)", async t => {
  for (const mode of ["init", "update"]) for (const form of ["separated", "equals"]) for (const oldExists of [false, true]) {
    const f = await fixture(t);
    const original = Buffer.from("# Synthetic root\r\n" + section("tldr", "stale λ: retain") + "\r\n");
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
    const legacy = path.join(f.root, ".claude-md.backup");
    if (oldExists) await fs.writeFile(legacy, "old synthetic backup");
    const owned = path.join(f.root, "owned backup = λ.md");
    const option = form === "equals" ? [`--backup-path=${owned}`] : ["--backup-path", owned];
    await f.run([...option, "--mode", mode]);
    assert.deepEqual(await fs.readFile(owned), original, "owned backup must exist and equal pre-write bytes");
    if (oldExists) assert.equal(await fs.readFile(legacy, "utf8"), "old synthetic backup");
    else await assert.rejects(fs.stat(legacy), { code: "ENOENT" });
    assert.notDeepEqual(await fs.readFile(path.join(f.root, "CLAUDE.md")), original, "control proves root really updated");
  }
});

test("TC-HARNESS-015 R3-01 invalid/colliding destinations refuse before root/backup writes", async t => {
  // Bounded domain: 11 invalid forms × init/update = 22 cases, plus valid controls above.
  for (const mode of ["init", "update"]) for (const kind of ["missing", "empty", "relative", "directory", "occupied",
    "duplicate", "default", "root", "missing-parent", "option-value", "whitespace"]) {
    const f = await fixture(t);
    const original = "# Synthetic existing\n" + section("custom", "retain me");
    const legacy = path.join(f.root, ".claude-md.backup");
    const owned = path.join(f.root, "owned.md");
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
    await fs.writeFile(legacy, "old backup");
    await fs.writeFile(owned, "occupied owned backup");
    const options = {
      missing: ["--backup-path"], empty: ["--backup-path="], relative: ["--backup-path=relative.md"],
      directory: [`--backup-path=${f.root}`], occupied: [`--backup-path=${owned}`],
      duplicate: [`--backup-path=${owned}`, `--backup-path=${owned}`], default: [`--backup-path=${legacy}`],
      root: [`--backup-path=${path.join(f.root, "CLAUDE.md")}`],
      "missing-parent": [`--backup-path=${path.join(f.root, "absent", "backup")}`],
      "option-value": ["--backup-path", "--detect"], whitespace: ["--backup-path", "   "],
    };
    await assert.rejects(f.run(["--mode", mode, ...options[kind]]), e => e.code === 1, `${mode}/${kind}`);
    assert.equal(await f.read(), original, `${mode}/${kind}: root unchanged`);
    assert.equal(await fs.readFile(legacy, "utf8"), "old backup");
    assert.equal(await fs.readFile(owned, "utf8"), "occupied owned backup");
  }
});

test("TC-HARNESS-015 legacy backup invocation stays compatible", async t => {
  for (const mode of ["init", "update"]) {
    const f = await fixture(t);
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), "# Original\n" + section("custom", "keep"));
    const original = await f.read();
    await fs.writeFile(path.join(f.root, ".claude-md.backup"), "old backup");
    await f.run(["--mode", mode]);
    assert.equal(await fs.readFile(path.join(f.root, ".claude-md.backup"), "utf8"), original);
  }
});

// PORTABILITY: both root inputs below are OPTIONAL everywhere else in the framework — the project
// config is absent in a fresh adopter (every consumer falls back to the documented defaults), and
// the root CLAUDE.md does not exist until the pipeline's own stage 1 generates it. Reading either
// unconditionally made this test the single hard failure a project hit when it copied `.claude` in
// and ran the pipeline, with an ENOENT that named neither the cause nor the remedy. The subject
// under test is the update/backup/router contract over whatever the live root contains, so an
// absent config degrades to `{}` (= defaults) and an absent root skips, exactly as TC-WSC-008 does.
test("TC-HARNESS-008 current root COPY keeps custom prose, strips retired managed blocks and owned backup; no live writes", async t => {
  const liveRoot = path.join(repoRoot, "CLAUDE.md");
  const liveBytes = await fs.readFile(liveRoot).catch(() => null);
  if (liveBytes === null) {
    t.skip("root CLAUDE.md is not part of a .claude-only adopter copy");
    return;
  }
  const configRaw = await fs.readFile(path.join(repoRoot, "docs/project-config.json"), "utf8").catch(() => "{}");
  const f = await fixture(t, JSON.parse(configRaw));
  const custom = "\n\n\n## Synthetic user prose\r\nretain exact λ spacing  \r\n\r\n\r\ncustom tail\r\n";
  const original = Buffer.concat([liveBytes, Buffer.from(custom)]);
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
  const owned = path.join(f.root, "owned.md");
  const result = await f.run(["--mode", "update", "--backup-path", owned]);
  const updated = await f.read();
  assert.ok(updated.includes(custom), "genuine custom prose/whitespace preserved");
  // Retired managed blocks never survive an update (hand-editable legacy sections are reported, not removed)
  assert.doesNotMatch(updated, /<!-- CK:(?:UNIVERSAL-GUIDES|WORKFLOW-ROUTE-POINTER|WORKFLOW-GATE|WORKFLOW-SKILLS|CRITICAL-THINKING|AI-MISTAKE-PREVENTION|PROJECT-PROTOCOLS)/);
  assert.doesNotMatch(updated, /CK:UNIVERSAL-GUIDES/);
  assert.deepEqual(await fs.readFile(owned), original);
  assert.deepEqual(await fs.readFile(path.join(repoRoot, "CLAUDE.md")), liveBytes, "live root untouched");
  // The explicit strip removes the universal sections too and keeps the project ones and the custom tail
  const stripped = path.join(f.root, "stripped-owned.md");
  await f.run(["--mode", "update", "--strip-legacy-universal", "--backup-path", stripped]);
  const slim = await f.read();
  for (const absent of UNIVERSAL_ROOT_ABSENT) assert.doesNotMatch(slim, absent);
  // The blank run that separated the custom heading from the removed section above it is the only whitespace a strip may collapse.
  assert.ok(slim.includes(custom.trimStart()), "custom tail survives the strip");
  const hash = input => createHash("sha256").update(input).digest("hex");
  t.diagnostic(JSON.stringify({ liveRootBytes: liveBytes.length, fixtureInputBytes: original.length,
    updatedBytes: Buffer.byteLength(updated), slimBytes: Buffer.byteLength(slim), inputSha256: hash(original), slimSha256: hash(slim),
    overflowReported: /ROOT_OVERFLOW/.test(result.stdout + result.stderr) }));
});

async function copiedGenerator(f, changes = {}) {
  const files = [
    ".claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs",
    ".claude/skills/ai-context-refresh/scripts/section-builders.cjs",
    ".claude/skills/ai-context-refresh/references/claude-md-template.md",
  ];
  for (const file of files) {
    let text = await fs.readFile(path.join(repoRoot, file), "utf8");
    if (changes[file]) {
      const changed = changes[file](text);
      assert.notEqual(changed, text, `mutant must change ${file}`);
      text = changed;
    }
    await fs.mkdir(path.dirname(path.join(f.root, file)), { recursive: true });
    await fs.writeFile(path.join(f.root, file), text);
  }
  // section-builders.cjs resolves relocatable roots through the portability accessors. The require
  // is optional (a compact copy degrades to the default literals), so the copied skill must carry
  // hooks/lib for a fixture to exercise the CONFIG-DERIVED path rather than the degraded one.
  await fs.cp(path.join(repoRoot, ".claude", "hooks", "lib"), path.join(f.root, ".claude", "hooks", "lib"), { recursive: true });
  return path.join(f.root, files[0]);
}



test("TC-HARNESS-015 automatic update and idempotence keep custom tail and backup bytes", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const custom = "\n## Custom prose\nthree newlines\n\n\nkeep spaces  \n";
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), custom);
  const before = await f.read();
  const firstOwned = path.join(f.root, "first-owned.md");
  await f.run(["--backup-path", firstOwned]);
  assert.equal(await fs.readFile(firstOwned, "utf8"), before);
  const once = await f.read();
  await f.run([`--backup-path=${path.join(f.root, "second-owned.md")}`]);
  assert.equal(await f.read(), once, "second update is byte-idempotent");
  assert.ok(once.includes(custom));
});

test("TC-HARNESS-015 malformed markers and absent source refuse before reserving explicit backup", async t => {
  for (const source of [null, "<!-- SECTION:custom -->\nretain unterminated"] ) {
    const f = await fixture(t);
    const owned = path.join(f.root, "owned.md");
    if (source !== null) await fs.writeFile(path.join(f.root, "CLAUDE.md"), source);
    await assert.rejects(f.run(["--mode", "update", "--backup-path", owned]), e => e.code === 1);
    await assert.rejects(fs.stat(owned), { code: "ENOENT" });
    if (source !== null) assert.equal(await f.read(), source);
  }
});

test("TC-HARNESS-015 explicit init cannot invent a pre-update backup; legacy fresh init stays valid", async t => {
  const f = await fixture(t);
  const owned = path.join(f.root, "owned.md");
  await assert.rejects(f.run(["--mode", "init", "--backup-path", owned]), e => e.code === 1);
  await assert.rejects(fs.stat(owned), { code: "ENOENT" });
  await assert.rejects(fs.stat(path.join(f.root, "CLAUDE.md")), { code: "ENOENT" });
  await f.run(["--mode", "init"]);
  assertRootContract(await f.read());
});

test("TC-HARNESS-008 exact legacy route migration preserves changed user-owned lookalikes", async t => {
  const f = await fixture(t);
  await f.run(["--mode", "init"]);
  const custom = ["\n## Custom routing illustration",
    "1. Explicit slash command (e.g. `/plan`, `/feature-implement`) → execute it.",
    "2. Custom business rule: matching a workflow needs a documented reason.",
    "3. No matching workflow AND prompt would modify files → MUST invoke `/plan <prompt>` first.",
    "4. No matching workflow AND prompt is read-only/conversational → answer directly.\n"].join("\n");
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), custom);
  await f.run(["--mode", "update"]);
  assert.ok((await f.read()).includes(custom), "heading/keywords are not ownership proof");
});

test("TC-HARNESS-008/015 semantic mutants are killed by observable output/backup assertions", async t => {
  const generator = ".claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs";
  const template = ".claude/skills/ai-context-refresh/references/claude-md-template.md";
  for (const mutation of ["ignored-backup-option", "nonexclusive-backup", "universal-section-returns", "sentinel-returns"]) {
    const f = await fixture(t);
    const changes = mutation === "ignored-backup-option" ? { [generator]: s => s.replaceAll("createBackup(backupPath);", "createBackup();") }
      : mutation === "nonexclusive-backup" ? { [generator]: s => s.replace("fs.constants.COPYFILE_EXCL", "0") }
      : mutation === "universal-section-returns" ? { [template]: s => s.replace("## Development Commands", "## Task Planning Rules\n\nCreate a small task per change.\n\n## Development Commands") }
      : { [template]: s => `<!-- CK:UNIVERSAL-GUIDES v7 -->\n${s}` };
    const executable = await copiedGenerator(f, changes);
    await execFileAsync(process.execPath, ["--check", executable]);
    const original = "# Original synthetic root\n";
    await fs.writeFile(path.join(f.root, "CLAUDE.md"), original);
    const owned = path.join(f.root, "owned.md");
    if (mutation === "nonexclusive-backup") await fs.writeFile(owned, "occupied original backup");
    await f.run(["--mode", "init", "--backup-path", owned], executable);
    if (mutation === "ignored-backup-option") {
      await assert.rejects(fs.readFile(owned), { code: "ENOENT" }, "semantic oracle: required owned backup missing");
      assert.equal(await fs.readFile(path.join(f.root, ".claude-md.backup"), "utf8"), original,
        "mutant reached legacy write; no syntax-based kill");
    } else if (mutation === "nonexclusive-backup") {
      assert.notEqual(await fs.readFile(owned, "utf8"), "occupied original backup", "collision preservation oracle kills mutant");
    } else {
      assert.throws(() => assertRootContract(require("node:fs").readFileSync(path.join(f.root, "CLAUDE.md"), "utf8")),
        { code: "ERR_ASSERTION" }, "runtime root invariant oracle kills mutant");
    }
    t.diagnostic(`${mutation}: KILLED (syntax valid, semantic assertion)`);
  }
});

// A text-mode writer on Windows (e.g. a count refresh) rewrites every EOL to CRLF. The re-stamp
// strips its managed blocks and must also drop the CRLF separators they leave behind; an LF-only
// pattern kept them, so each rewrite + update cycle appended ~10 blank lines under the header.
test("TC-HARNESS-015 stripping the retired blocks of a CRLF root leaves no blank run and is idempotent", async t => {
  const toCrlf = text => text.replace(/\r?\n/g, "\r\n");
  const lf = text => text.replace(/\r\n/g, "\n");
  const legacyRoot = toCrlf(["<!-- CK:UNIVERSAL-GUIDES v7 -->", "", "<!-- CK:WORKFLOW-ROUTE-POINTER -->", "> pointer", "<!-- /CK:WORKFLOW-ROUTE-POINTER -->", "",
    "<!-- CK:CRITICAL-THINKING -->", "**[CRITICAL-THINKING-MINDSET]** ...", "<!-- /CK:CRITICAL-THINKING -->", "", "# Project", "", "<!-- SECTION:tldr -->", "> **Project:** Test", "<!-- /SECTION:tldr -->", ""].join("\n"));
  const cycle = async (f, executable) => {
    await f.run(["--mode", "update"], executable);
    return f.read();
  };

  const f = await fixture(t);
  const executable = await copiedGenerator(f);
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), legacyRoot);
  const first = await cycle(f, executable);
  assert.doesNotMatch(first, /CK:UNIVERSAL-GUIDES|CK:WORKFLOW-ROUTE-POINTER|CK:CRITICAL-THINKING/, "the retired blocks are stripped");
  assert.ok(lf(first).startsWith("# Project\n"), "no separator run is left where the blocks stood (CRLF-aware strip)");
  const second = await cycle(f, executable);
  assert.equal(lf(second), lf(first), "a second update converges to the same content");

  // Mutant: the LF-only leading strip. The same oracle must observe the leftover separators.
  const generator = ".claude/skills/ai-context-refresh/scripts/generate-claude-md.cjs";
  const m = await fixture(t);
  const mutant = await copiedGenerator(m, { [generator]: s => s.replace(".replace(/^(?:\\r?\\n)+/, '');", ".replace(/^\\n+/, '');") });
  await fs.writeFile(path.join(m.root, "CLAUDE.md"), legacyRoot);
  const mutated = await cycle(m, mutant);
  assert.ok(!lf(mutated).startsWith("# Project\n"), "LF-only strip mutant must leave leading separators behind");
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-DOCROOT-060..067 — buildDocIndex / buildDocLookup derive their roots from config.
//
// Before this, `buildDocIndex` hardcoded `path.join(projectDir, 'docs')` and returned `null` for
// any project whose docs tree lives elsewhere. `null` is not a harmless skip: the splicer drops the
// whole section INCLUDING its `<!-- SECTION:doc-index -->` markers (the open-marker falsy branch and
// the `if (sections[currentKey])` close branch in generate-claude-md.cjs), so the block vanished
// with no error anywhere and `--mode update` could never restore it. TC-DOCROOT-061/062 are the
// regression guards for exactly that silent-deletion path.
// ─────────────────────────────────────────────────────────────────────────────

const nodeFs = require("node:fs");

/** Materialize a synthetic project tree; `layout` maps repo-relative path -> file content. */
async function docsFixture(t, layout) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "docroot-builders-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [rel, content] of Object.entries(layout)) {
    const abs = path.join(root, ...rel.split("/"));
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
  }
  return root;
}

const freshBuilders = () => require(buildersPath);

/** Pre-change `buildDocIndex`, verbatim — the independent oracle for the SC-11 default. */
function legacyDocIndex(projectDir) {
  const docsDir = path.join(projectDir, "docs");
  if (!nodeFs.existsSync(docsDir)) return null;
  const countMarkdownDeep = (dir, depth = 0) => {
    if (depth > 4) return 0;
    let total = 0;
    for (const item of nodeFs.readdirSync(dir, { withFileTypes: true })) {
      if (item.name.startsWith(".")) continue;
      if (item.isDirectory()) total += countMarkdownDeep(path.join(dir, item.name), depth + 1);
      else if (item.name.endsWith(".md")) total += 1;
    }
    return total;
  };
  const tree = [];
  for (const entry of nodeFs.readdirSync(docsDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) tree.push(`docs/${entry.name}/  (${countMarkdownDeep(path.join(docsDir, entry.name))} files)`);
    else if (entry.name.endsWith(".md")) tree.push(`docs/${entry.name}`);
  }
  if (tree.length === 0) return null;
  return "```\n" + tree.join("\n") + "\n```";
}

/** Pre-change `buildDocLookup`, verbatim — the independent oracle for the SC-11 default. */
function legacyDocLookup(config) {
  const modules = config.modules || [];
  const featureRoot = "docs/specs";
  const rows = modules.filter(m => m.meta?.domain).map(m => `| ${m.meta.domain} | \`${featureRoot}/${m.name}/\` |`);
  rows.push(`| Feature specs, capability behavior, business rules, test cases | \`${featureRoot}/\` + \`docs/project-reference/feature-spec-reference.md\` |`);
  rows.push("| Spec paths, TC format, canonical vs derived spec artifacts | `docs/project-reference/spec-system-reference.md` |");
  rows.push("| Spec quality, AI-implementability, tech-agnostic prose | `docs/project-reference/spec-principles.md` |");
  rows.push("| Behavior or public contract changes, spec-test-code sync | `docs/project-reference/workflow-spec-test-code-cycle-reference.md` |");
  if (config.framework?.backendPatternsDoc) rows.push(`| Backend patterns, CQRS, validation | \`${config.framework.backendPatternsDoc}\` |`);
  if (config.framework?.frontendPatternsDoc) rows.push(`| Frontend patterns, components, stores | \`${config.framework.frontendPatternsDoc}\` |`);
  return `| If user prompt mentions... | Read first |\n|---|---|\n${rows.join("\n")}`;
}

test("TC-DOCROOT-060 buildDocIndex scans the configured docs tree and prefixes entries with it", async t => {
  const root = await docsFixture(t, {
    "documentation/reference/backend-patterns-reference.md": "# ref",
    "documentation/reference/nested/deep.md": "# deep",
    "documentation/overview.md": "# overview",
    "docs/decoy.md": "# the default tree must NOT be scanned when a root is configured",
  });
  const out = freshBuilders().buildDocIndex({ docsRoots: { projectReference: { path: "documentation/reference" } } }, root);

  assert.ok(out, "a configured docs tree must produce content");
  assert.ok(out.includes("documentation/reference/  (2 files)"), `nested count under the resolved root; got:\n${out}`);
  assert.ok(out.includes("documentation/overview.md"), `top-level markdown under the resolved root; got:\n${out}`);
  assert.ok(!out.includes("docs/"), `the hardcoded default tree must not leak into the output; got:\n${out}`);
});

test("TC-DOCROOT-061 a resolved-but-missing docs tree returns a VISIBLE block, never null", async t => {
  const root = await docsFixture(t, { "docs/decoy.md": "# present but not the configured tree" });
  const out = freshBuilders().buildDocIndex({ docsRoots: { projectReference: { path: "documentation/reference" } } }, root);

  // The regression this guards: returning null here deleted the section AND its markers.
  assert.notEqual(out, null, "a missing docs tree must not return null — that deletes the section markers");
  assert.equal(typeof out, "string");
  assert.ok(out.trim().length > 0, "the block must be non-empty so the splicer keeps the markers");
  assert.ok(out.includes("documentation/"), `the note must name the resolved path it failed to find; got:\n${out}`);
});

test("TC-DOCROOT-062 rendering a template with a missing docs tree keeps both SECTION:doc-index markers", async t => {
  // End-to-end through populateTemplate — the splicer that drops a falsy section INCLUDING its
  // markers. The shipped template carries no doc-index marker pair (it is inserted by heading
  // detection on update), so the fixture template adds one.
  const templateRel = ".claude/skills/ai-context-refresh/references/claude-md-template.md";
  const buildersRel = ".claude/skills/ai-context-refresh/scripts/section-builders.cjs";
  const withDocIndexMarkers = text =>
    text.replace("<!-- SECTION:doc-lookup -->", "<!-- SECTION:doc-index -->\n<!-- /SECTION:doc-index -->\n\n<!-- SECTION:doc-lookup -->");
  const relocated = { docsRoots: { projectReference: { path: "documentation/reference" } } };

  const f = await fixture(t, relocated);
  await f.run(["--mode", "init"], await copiedGenerator(f, { [templateRel]: withDocIndexMarkers }));
  const claudeMd = await f.read();

  assert.ok(claudeMd.includes("<!-- SECTION:doc-index -->"), "the OPEN marker must survive a docs tree that could not be found");
  assert.ok(claudeMd.includes("<!-- /SECTION:doc-index -->"), "the CLOSE marker must survive a docs tree that could not be found");
  const body = claudeMd.split("<!-- SECTION:doc-index -->")[1].split("<!-- /SECTION:doc-index -->")[0];
  assert.ok(body.includes("documentation/"), `the surviving block must name the resolved path; got:\n${body}`);

  // Mutant: restore the pre-change `return null`. The SAME oracle must observe the whole block —
  // markers included — disappear, which is precisely the silent, unrecoverable loss being closed.
  const m = await fixture(t, relocated);
  const mutant = await copiedGenerator(m, {
    [templateRel]: withDocIndexMarkers,
    [buildersRel]: s => s.replace(
      "if (!fs.existsSync(docsDir)) return docsNoteBlock",
      "if (!fs.existsSync(docsDir)) return null; if (false) return docsNoteBlock"
    ),
  });
  await m.run(["--mode", "init"], mutant);
  const mutantMd = await m.read();
  assert.ok(!mutantMd.includes("<!-- SECTION:doc-index -->"), "the null-returning mutant must delete the open marker");
  assert.ok(!mutantMd.includes("<!-- /SECTION:doc-index -->"), "the null-returning mutant must delete the close marker");
});

test("TC-DOCROOT-063 buildDocLookup derives the feature-spec root and module rows from specRoots", () => {
  const out = freshBuilders().buildDocLookup({
    specRoots: { business: { path: "spec-library" } },
    modules: [{ name: "alpha", meta: { domain: "Alpha domain" } }],
  });

  assert.ok(out.includes("| Alpha domain | `spec-library/alpha/` |"), `module-domain row uses the configured root; got:\n${out}`);
  assert.ok(out.includes("`spec-library/` +"), `feature-spec row uses the configured root; got:\n${out}`);
  assert.ok(!out.includes("docs/specs"), `the hardcoded spec root must not survive; got:\n${out}`);
});

test("TC-DOCROOT-064 buildDocLookup builds the four reference rows under the configured reference root", () => {
  const out = freshBuilders().buildDocLookup({ docsRoots: { projectReference: { path: "documentation/reference" } } });

  for (const file of [
    "feature-spec-reference.md",
    "spec-system-reference.md",
    "spec-principles.md",
    "workflow-spec-test-code-cycle-reference.md",
  ]) {
    assert.ok(out.includes(`\`documentation/reference/${file}\``), `${file} must be routed under the configured root; got:\n${out}`);
  }
  assert.ok(!out.includes("docs/project-reference/"), `the hardcoded reference root must not survive; got:\n${out}`);
});

test("TC-DOCROOT-065 SC-11: with no root config both builders match the pre-change implementation", async t => {
  const root = await docsFixture(t, {
    "docs/project-reference/lessons.md": "# lessons",
    "docs/specs/Capability/README.spec.md": "# spec",
    "docs/adr/0001.md": "# adr",
    "docs/overview.md": "# overview",
  });
  const b = freshBuilders();

  for (const config of [
    {},
    { modules: [{ name: "alpha", meta: { domain: "Alpha domain" } }] },
    { framework: { backendPatternsDoc: "docs/b.md", frontendPatternsDoc: "docs/f.md" } },
    { specRoots: { business: { path: "docs/specs" } }, docsRoots: { projectReference: { path: "docs/project-reference" } } },
  ]) {
    assert.equal(b.buildDocIndex(config, root), legacyDocIndex(root), "doc-index default output must be byte-identical");
    assert.equal(b.buildDocLookup(config), legacyDocLookup(config), "doc-lookup default output must be byte-identical");
  }
  // The live repository is the strongest default fixture there is — WHEN it has a docs tree.
  // `.claude` is portable, so this suite also runs in an adopting project that has copied the bundle
  // but not yet generated any `docs/**` markdown. There the two builders diverge BY DESIGN: the
  // legacy implementation returned `null` and dropped the section, while the current one emits the
  // `(doc-index unavailable)` note precisely to keep the section and its markers alive
  // (`section-builders.cjs:99-102`). Asserting byte-parity there graded an intentional improvement as
  // a regression. The empty case is asserted explicitly rather than skipped, so both shapes stay covered.
  const liveIndex = b.buildDocIndex({}, repoRoot);
  if (legacyDocIndex(repoRoot) === null) {
    assert.match(liveIndex, /\(doc-index unavailable\)/,
      "with no docs markdown the current builder must emit the visible note the legacy null dropped");
  } else {
    assert.equal(liveIndex, legacyDocIndex(repoRoot), "repo docs tree renders byte-identically");
  }
});

test("TC-DOCROOT-066 single-segment guard: a one-segment reference root never becomes the repo root", async t => {
  // `path.dirname('reference')` is `'.'` — the project root. Walking it would emit node_modules/,
  // tmp/ and every sibling tree into the generated CLAUDE.md. The configured root itself wins.
  const root = await docsFixture(t, {
    "reference/lessons.md": "# lessons",
    "node_modules/pkg/readme.md": "# dependency noise",
    "tmp/scratch.md": "# disposable",
    ".claude/skills/x/SKILL.md": "# harness",
    "docs/decoy.md": "# default tree",
  });
  const out = freshBuilders().buildDocIndex({ docsRoots: { projectReference: { path: "reference" } } }, root);

  assert.ok(out.includes("reference/lessons.md"), `the configured root itself is the docs tree; got:\n${out}`);
  for (const sibling of ["node_modules", "tmp", ".claude", "docs/decoy"]) {
    assert.ok(!out.includes(sibling), `a repo-root sibling leaked into the doc index: ${sibling}\n${out}`);
  }
});

test("TC-DOCROOT-067 a traversing reference root falls back to the default docs tree", async t => {
  const root = await docsFixture(t, { "docs/overview.md": "# overview" });
  const out = freshBuilders().buildDocIndex({ docsRoots: { projectReference: { path: "../escape" } } }, root);

  assert.equal(out, "```\ndocs/overview.md\n```", `an escaping root must degrade to the default tree; got:\n${out}`);
});

// TC-DOCROOT-068..069 — with the project dir, doc-lookup is the when-to-read index an agent routes
// every question through. It must never point at a document the project does not have (a dead row
// sends the agent to invent the answer), and a doc the project declares N/A must not be routed.
test("TC-DOCROOT-068 doc-lookup routes only existing docs, with start-here rows first and N/A docs named once", async t => {
  // Given a project holding some selected docs, missing others, and declaring one pattern doc N/A.
  const root = await docsFixture(t, {
    "docs/project-config.json": "{}",
    "docs/project-reference/docs-index-reference.md": "# index",
    "docs/project-reference/lessons.md": "# lessons",
    "docs/project-reference/code-review-rules.md": "# rules",
    "docs/project-reference/backend-patterns-reference.md": "# n/a",
    "docs/project-reference/runbook-reference.md": "# custom",
    "docs/adr/0001-choice.md": "# adr",
    ".claude/docs/README.md": "# framework",
  });
  const config = {
    framework: { backendPatternsDoc: "docs/project-reference/backend-patterns-reference.md" },
    referenceDocs: [
      { filename: "code-review-rules.md", purpose: "Code review checklist and rules" },
      { filename: "backend-patterns-reference.md", purpose: "Backend coding patterns (N/A for this project)" },
      { filename: "runbook-reference.md", purpose: "Operational runbook for releases" },
      { filename: "e2e-test-reference.md", purpose: "E2E patterns" },
    ],
  };
  // When the doc-lookup table is built with the project directory.
  const out = freshBuilders().buildDocLookup(config, root);
  const rows = out.split("\n").filter(line => line.startsWith("| ") && !line.startsWith("| If user"));

  // Then start-here rows lead, only existing docs are routed, and the N/A doc is named once instead.
  assert.match(rows[0], /start here.*`docs\/project-config\.json`/, `config is the first row; got:\n${out}`);
  assert.match(rows[1], /`docs\/project-reference\/docs-index-reference\.md`/, "docs index is the second row");
  assert.match(rows[2], /`docs\/project-reference\/lessons\.md`/, "lessons is the third row");
  assert.match(out, /Before editing or reviewing code.*Holds: Code review checklist and rules \| `docs\/project-reference\/code-review-rules\.md`/,
    "a built-in doc carries its trigger AND the project purpose");
  assert.match(out, /\| Operational runbook for releases \| `docs\/project-reference\/runbook-reference\.md` \|/, "a custom doc routes by its purpose");
  assert.match(out, /`docs\/adr\/`/, "an ADR root with decisions is routed");
  assert.doesNotMatch(out, /`\.claude\/docs\/README\.md`/, "root navigation excludes framework guides even when shipped");
  assert.ok(!out.includes("e2e-test-reference.md"), "a selected doc missing on disk must not be routed");
  assert.ok(!out.includes("spec-system-reference.md") && !out.includes("docs/specs/"), "a fixed spec row whose docs are missing must not be routed");
  assert.ok(!out.includes(".claude/docs/development-rules.md"), "a framework doc missing on disk must not be routed");
  assert.ok(!rows.some(row => row.includes("backend-patterns-reference.md")), "a declared N/A doc must not be routed, not even by its framework row");
  assert.match(out, /Declared not applicable[^\n]*`backend-patterns-reference\.md`/, "a declared N/A doc is named once so agents skip it");
});

test("TC-DOCROOT-069 doc-lookup discovery rows follow relocated reference and ADR roots", async t => {
  // Given reference docs and decisions that live only under relocated roots.
  const root = await docsFixture(t, {
    "documentation/reference/lessons.md": "# lessons",
    "documentation/reference/project-structure-reference.md": "# structure",
    "decisions/0001.md": "# adr",
  });
  // When the doc-lookup table is built for a config naming those roots.
  const out = freshBuilders().buildDocLookup({
    docsRoots: { projectReference: { path: "documentation/reference" }, adr: { path: "decisions" } },
    referenceDocs: [{ filename: "project-structure-reference.md", purpose: "Directory layout" }],
  }, root);

  // Then every discovery row follows the configured roots and no default root appears.
  assert.match(out, /`documentation\/reference\/lessons\.md`/, `lessons follows the configured root; got:\n${out}`);
  assert.match(out, /`documentation\/reference\/project-structure-reference\.md`/);
  assert.match(out, /`decisions\/`/, "the ADR row follows docsRoots.adr");
  assert.ok(!out.includes("docs/project-reference"), "no default reference root may appear");
  assert.ok(!out.includes("docs/adr"), "no default ADR root may appear");
});

test("TC-DOCROOT-070 decision quick-ref never routes a pattern doc the project declares N/A", () => {
  // Given a config naming backend and frontend pattern docs.
  const b = freshBuilders();
  const base = {
    modules: [{ name: "alpha" }],
    framework: { backendPatternsDoc: "docs/project-reference/backend-patterns-reference.md", frontendPatternsDoc: "docs/project-reference/frontend-patterns-reference.md" },
  };
  // When the quick-ref is built with the backend doc applicable, then declared N/A.
  const applicable = b.buildDecisionQuickRef({ ...base, referenceDocs: [{ filename: "backend-patterns-reference.md", purpose: "Backend patterns" }] });
  const declared = b.buildDecisionQuickRef({ ...base, referenceDocs: [{ filename: "backend-patterns-reference.md", purpose: "Backend coding patterns (N/A for this project)" }] });

  // Then only the declared doc is dropped.
  assert.match(applicable, /Backend conventions/, "an applicable backend doc is still routed");
  assert.ok(!declared.includes("backend-patterns-reference.md"), `a declared N/A doc must not be routed; got:\n${declared}`);
  assert.match(declared, /Frontend conventions/, "only the declared doc is dropped");
});

test("TC-DOCROOT-071 doc-lookup survives a file-shaped ADR root and never probes a traversing referenceDocs name", async t => {
  // Given a file where the ADR directory belongs and a referenceDocs name that traverses out.
  const root = await docsFixture(t, {
    "docs/adr": "not a directory",
    "docs/project-reference/lessons.md": "# lessons",
    "outside.md": "# must never be routed",
  });
  // When the doc-lookup table is built.
  const out = freshBuilders().buildDocLookup({
    referenceDocs: [{ filename: "../../outside.md", purpose: "Escaping doc" }],
  }, root);

  // Then generation succeeds and neither the ADR root nor the traversing doc is routed.
  assert.match(out, /`docs\/project-reference\/lessons\.md`/, "generation still succeeds");
  assert.ok(!out.includes("docs/adr"), "a file-shaped ADR root yields no row");
  assert.ok(!out.includes("outside.md") && !out.includes("Escaping doc"), "a traversing name is skipped, never routed");
});

// TC-DOCROOT-072..077 — existing adopters receive the Doc Lookup heading on `--mode update`, N/A is
// explicit (never inferred from ordinary prose), no path is routed twice, and cells are escaped.
test("TC-DOCROOT-072 update back-fills the Doc Lookup heading onto a legacy headless doc-lookup block", () => {
  // Given a CRLF root whose doc-lookup section has no heading, and a root with an older heading alias.
  const legacy = ["# Demo", "", "## Inventory", "", "<!-- SECTION:doc-lookup -->", "", "| old |", "", "<!-- /SECTION:doc-lookup -->", ""].join("\r\n");
  // When the heading back-fill runs.
  const out = gen.backfillDocLookupHeading(legacy);
  const aliased = gen.backfillDocLookupHeading("## Doc Lookup Guide\n\n<!-- SECTION:doc-lookup -->\n<!-- /SECTION:doc-lookup -->\n");

  // Then the canonical heading is inserted once, line endings are kept, and unrelated roots are untouched.
  assert.match(out, /## Doc Lookup — What to Read When\r\n\r\n<!-- SECTION:doc-lookup -->/, `heading inserted before the marker, CRLF kept; got:\n${out}`);
  assert.equal(gen.backfillDocLookupHeading(out), out, "idempotent: a second update adds nothing");
  assert.equal((aliased.match(/^## /gm) || []).length, 1, "a smart-merge doc-lookup heading is normalized, never duplicated");
  assert.match(aliased, /^## Doc Lookup — What to Read When$/m);
  assert.equal(gen.backfillDocLookupHeading("# No lookup here\n"), "# No lookup here\n", "a root without the section is untouched");
});

test("TC-DOCROOT-073 N/A needs an explicit field or a leading/parenthesized marker, never incidental prose", async t => {
  // Given four existing docs: one with incidental "not applicable" prose, three declared N/A three ways.
  const root = await docsFixture(t, {
    "docs/project-reference/integration-test-reference.md": "# it",
    "docs/project-reference/e2e-test-reference.md": "# e2e",
    "docs/project-reference/scss-styling-guide.md": "# scss",
    "docs/project-reference/seed-test-data-reference.md": "# seed",
  });
  // When the doc-lookup table is built.
  const out = freshBuilders().buildDocLookup({
    referenceDocs: [
      { filename: "integration-test-reference.md", purpose: "Integration test patterns. Mocks are not applicable here." },
      { filename: "e2e-test-reference.md", purpose: "E2E patterns", notApplicable: true },
      { filename: "scss-styling-guide.md", purpose: "N/A — no stylesheets" },
      { filename: "seed-test-data-reference.md", purpose: "Seeders (N/A for this project)" },
    ],
  }, root);
  const rows = out.split("\n").filter(line => line.startsWith("| ") && !line.startsWith("| If user"));

  // Then incidental prose keeps the doc routed, and each declared doc is skipped and named once.
  assert.ok(rows.some(row => row.includes("integration-test-reference.md")), `incidental N/A prose must not hide a real doc; got:\n${out}`);
  for (const file of ["e2e-test-reference.md", "scss-styling-guide.md", "seed-test-data-reference.md"]) {
    assert.ok(!rows.some(row => row.includes(file)), `${file} is declared N/A and must not be routed`);
    assert.ok(out.split("\n").some(line => line.startsWith("Declared not applicable") && line.includes(`\`${file}\``)), `${file} is named once as N/A`);
  }
});

test("TC-DOCROOT-074 a fixed spec row honours N/A, and an applicable pattern doc is routed exactly once", async t => {
  // Given a fixed-row spec doc declared N/A and a pattern doc named by both a fixed row and referenceDocs.
  const root = await docsFixture(t, {
    "docs/project-reference/spec-principles.md": "# principles",
    "docs/project-reference/backend-patterns-reference.md": "# backend",
  });
  // When the doc-lookup table is built.
  const out = freshBuilders().buildDocLookup({
    framework: { backendPatternsDoc: "docs/project-reference/backend-patterns-reference.md" },
    referenceDocs: [
      { filename: "spec-principles.md", purpose: "Spec rules", notApplicable: true },
      { filename: "backend-patterns-reference.md", purpose: "Backend patterns" },
    ],
  }, root);
  const rows = out.split("\n").filter(line => line.startsWith("| ") && !line.startsWith("| If user"));

  // Then the N/A spec doc is named, not routed, and the pattern doc is routed exactly once.
  assert.ok(!rows.some(row => row.includes("spec-principles.md")), `a fixed spec row declared N/A must not be routed; got:\n${out}`);
  assert.ok(out.split("\n").some(line => line.startsWith("Declared not applicable") && line.includes("`spec-principles.md`")));
  assert.equal(rows.filter(row => row.includes("backend-patterns-reference.md")).length, 1, "an applicable pattern doc in both fixed rows and referenceDocs is routed once");
});

test("TC-DOCROOT-075 a project with no docs gets an actionable line, never a header-only table", async t => {
  // Given a project with no documentation at all.
  const root = await docsFixture(t, { "README.md": "# empty project" });
  // When the doc-lookup table is built.
  const out = freshBuilders().buildDocLookup({}, root);
  // Then it explains missing project documentation without framework activation.
  assert.ok(!out.includes("| If user prompt mentions..."), `no empty table; got:\n${out}`);
  assert.match(out, /No project reference documents are configured or present/);
  assert.doesNotMatch(out, /project-init|docs-manager/);
});

test("TC-DOCROOT-076 decision quick-ref left with only N/A docs returns a body, so update replaces stale rows", () => {
  // Given a config whose only pattern doc is declared N/A, and a root still carrying its old routing row.
  const b = freshBuilders();
  const config = {
    modules: [{ name: "alpha" }],
    framework: { backendPatternsDoc: "docs/project-reference/backend-patterns-reference.md" },
    referenceDocs: [{ filename: "backend-patterns-reference.md", purpose: "Backend", notApplicable: true }],
  };
  const stale = ["<!-- SECTION:decision-quick-ref -->", "", "| Backend conventions | Read `docs/project-reference/backend-patterns-reference.md` |", "", "<!-- /SECTION:decision-quick-ref -->", ""].join("\n");
  // When the quick-ref is built and applied with --mode update semantics.
  const body = b.buildDecisionQuickRef(config);
  const updated = gen.updateMarkedSections(stale, { "decision-quick-ref": body }, () => {});

  // Then the body is a string without the N/A row, so the stale row is replaced rather than kept.
  assert.equal(typeof body, "string", "never null: null would keep the stale body on --mode update");
  assert.ok(!body.includes("| Backend conventions"), "no routing row to the N/A doc");
  assert.ok(!updated.includes("| Backend conventions"), `update must replace the stale routing row; got:\n${updated}`);
});

test("TC-DOCROOT-077 doc-lookup escapes every cell, so a pipe in a module topic never splits its row", async t => {
  // Given a module whose domain text contains a table pipe, with its spec folder present.
  const root = await docsFixture(t, { "docs/specs/Billing/README.md": "# billing" });
  const config = { modules: [{ name: "Billing", meta: { domain: "Invoices | refunds" } }] };
  // When the doc-lookup table is built with and without the project directory.
  const b = freshBuilders();
  const outputs = [b.buildDocLookup(config, root), b.buildDocLookup(config)];

  // Then the pipe is escaped and the row still has exactly two cells routing the module's spec folder.
  for (const out of outputs) {
    const row = out.split("\n").find(line => line.includes("Invoices"));
    assert.equal(row, "| Invoices \\| refunds | `docs/specs/Billing/` |", `the topic cell must be escaped; got:\n${out}`);
    assert.equal(row.split(/(?<!\\)\|/).length, 4, "an escaped pipe adds no column");
  }
});


test("root initialization and update preserve project facts without framework machinery", async t => {
  const f = await fixture(t, {
    project: { name: "Project-only root", description: "Keep the project identity" },
    contextGroups: [{ name: "source", pathRegexes: ["src/.*"], guideDoc: "docs/source.md", rules: ["Invoke /plan before editing"] }],
    testing: { commands: { unit: "node --test" } },
  });
  await f.run(["--mode", "init"]);
  let text = await f.read();
  for (const fact of ["Project-only root", "Keep the project identity", "src/.*", "docs/source.md", "node --test"])
    assert.ok(text.includes(fact), fact);
  assert.doesNotMatch(text, /framework rules|\.claude|Auto.Context|Skill Activation|Invoke \/plan|convention hook/i);
  await fs.appendFile(path.join(f.root, "CLAUDE.md"), "\n" + section("skill-activation", "Invoke /plan and load framework machinery"));
  await f.run(["--mode", "update"]);
  text = await f.read();
  assert.doesNotMatch(text, /SECTION:skill-activation|Invoke \/plan|framework machinery/);
  assert.match(text, /Keep the project identity/);
});

test("root update clears obsolete hook guidance when no project convention map exists", async t => {
  const f = await fixture(t, { project: { name: "Project-only root" } });
  await fs.writeFile(path.join(f.root, "CLAUDE.md"), section("golden-rules", "Run .claude/hooks/lib/file-conventions.cjs before editing") + "\nProject-owned prose stays.\n");
  await f.run(["--mode", "update"]);
  const text = await f.read();
  assert.doesNotMatch(text, /\.claude\/hooks/);
  assert.match(text, /Project-owned prose stays/);
});
