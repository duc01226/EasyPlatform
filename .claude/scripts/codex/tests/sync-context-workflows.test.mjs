import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const syncContextScript = path.join(repoRoot, ".claude", "scripts", "codex", "sync-context-workflows.mjs");

function runSync(cwd, ambient = process.env) {
  return execFileAsync(process.execPath, [syncContextScript], { cwd, env: { ...ambient, CLAUDE_PROJECT_DIR: cwd } });
}

test('sync-context fixture overrides a competing ambient root without touching it', async () => {
  const owner = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-context-isolation-'));
  const target = path.join(owner, 'target');
  const foreign = path.join(owner, 'foreign');
  try {
    for (const dir of [target, foreign]) {
      await fs.mkdir(path.join(dir, '.claude/skills/test'), { recursive: true });
      await fs.writeFile(path.join(dir, '.claude/skills/test/SKILL.md'), '---\nname: test\ndescription: fixture\n---\n');
      await fs.writeFile(path.join(dir, '.claude/workflows.json'), JSON.stringify({ workflows: {
        testing: { sequence: ['test'], preActions: { injectContext: 'Run fixture test.' } },
      } }));
    }
    await fs.mkdir(path.join(foreign, '.codex'));
    await fs.writeFile(path.join(foreign, '.codex/CODEX_CONTEXT.md'), 'foreign-context-sentinel');
    await fs.writeFile(path.join(foreign, 'AGENTS.md'), 'foreign-agent-sentinel');
    await runSync(target, { ...process.env, CLAUDE_PROJECT_DIR: foreign });
    const targetAgents = await fs.readFile(path.join(target, 'AGENTS.md'), 'utf8');
    assert.match(targetAgents, /# Codex Project Instructions/);
    assertProjectOnly(targetAgents, 'target AGENTS.md');
    assert.equal(await fs.access(path.join(target, '.codex/CODEX_CONTEXT.md')).then(() => true, () => false), false, 'no context file is written');
    assert.equal(await fs.readFile(path.join(foreign, '.codex/CODEX_CONTEXT.md'), 'utf8'), 'foreign-context-sentinel');
    assert.equal(await fs.readFile(path.join(foreign, 'AGENTS.md'), 'utf8'), 'foreign-agent-sentinel');
    assert.deepEqual(await fs.readdir(path.join(foreign, '.codex')), ['CODEX_CONTEXT.md']);
  } finally {
    await fs.rm(owner, { recursive: true, force: true });
  }
});
// AGENTS.md is the project-information projection of CLAUDE.md: no protocol text, no context mirror, no
// route pointer. These signatures are the lead lines of universal protocols the universal hook delivers.
const UNIVERSAL_SIGNATURES = [
  "[CRITICAL-THINKING-MINDSET]",
  "## Common AI Mistake Prevention (System Lessons)",
  "Create a small task per change before edits",
];
const RETIRED_MARKERS = [
  "CODEX-CONTEXT-MIRROR",
  "PROMPT-PROTOCOLS",
  "CK:WORKFLOW-ROUTE-POINTER",
  "CK:WORKFLOW-GATE",
  "CK:UNIVERSAL-GUIDES",
  "CODEX:SYNC-PROMPT-PROTOCOLS",
];
function assertProjectOnly(text, label) {
  for (const signature of UNIVERSAL_SIGNATURES) assert.ok(!text.includes(signature), `${label} carries universal protocol text: ${signature}`);
  for (const marker of RETIRED_MARKERS) assert.ok(!text.includes(marker), `${label} carries the retired block ${marker}`);
}
const require = createRequire(import.meta.url);
const workflowCatalog = require(path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs"));

test("runtime workflow catalog rejects a workflow without injectContext", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-missing-inject-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        { workflows: { testing: { name: "Testing", sequence: ["test"] } } },
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

    assert.throws(
      () => workflowCatalog.buildWorkflowSkillsCatalog({ rootDir: tempRoot }),
      /missing required non-empty preActions\.injectContext/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows writes the project projection and strips every retired block", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"), "---\nname: test\ndescription: Test skill\n---\n\n# Test\n", "utf8");
    await fs.writeFile(
      path.join(tempRoot, "CLAUDE.md"),
      [
        "# Claude Source Instructions", "", "Use /test from the Claude source instructions.", "",
        "## Doc Lookup — What to Read When", "", "| If user prompt mentions... | Read first |", "| --- | --- |", "| Anything | `docs/project-config.json` |", "",
        "## Task Planning Rules", "", "Create a small task per change before edits.", "",
        "## Project Rules & Context", "", "Keep commits small.", "",
      ].join("\n"),
      "utf8"
    );
    // A previous generation left a context file and the managed blocks that point at it.
    await fs.writeFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "# Existing Context\n", "utf8");
    await fs.writeFile(
      path.join(tempRoot, "AGENTS.md"),
      [
        "# Codex Project Instructions",
        "",
        "<!-- CLAUDE-MERGE:START -->", "## CLAUDE.md (Prompt-Enhanced Snapshot)", "", "Legacy generated instructions.", "<!-- CLAUDE-MERGE:END -->",
        "",
        "<!-- CODEX-CONTEXT-MIRROR:START -->", "## Codex Context Mirror (Auto-Synced)", "Read `.codex/CODEX_CONTEXT.md`.", "<!-- CODEX-CONTEXT-MIRROR:END -->",
        "",
      ].join("\n"),
      "utf8"
    );

    await runSync(tempRoot);

    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    assert.match(agentsText, /<!-- CLAUDE-MIRROR:START -->/);
    assert.match(agentsText, /# Claude Source Instructions/);
    assert.match(agentsText, /Use \$test from the Claude source instructions\./, "skill mentions are rewritten for Codex");
    assert.match(agentsText, /## Doc Lookup — What to Read When/);
    assert.match(agentsText, /## Project Rules & Context/);
    // Only whitelisted project headings are projected: the universal section never reaches AGENTS.md
    assert.doesNotMatch(agentsText, /## Task Planning Rules/);
    assertProjectOnly(agentsText, "AGENTS.md");
    assert.doesNotMatch(agentsText, /<!-- CLAUDE-MERGE:START -->|Legacy generated instructions\./);
    assert.equal(await fs.access(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md")).then(() => true, () => false), false, "the retired context file is removed");
    // Doc Lookup comes before the hand-owned rules
    assert.ok(agentsText.indexOf("## Doc Lookup") < agentsText.indexOf("## Project Rules & Context"));
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// Business intent: AGENTS.md mirrors CLAUDE.md text verbatim. Rule lines carry regex literals such as
// `\.cjs$` followed by a backtick; a re-sync must never expand them as replacement patterns
// ("$`" splices the text before the block into the line, `$&` repeats the old block). The CLAUDE
// block is the only mirrored block that carries free source text, so it is the one exercised here.
test("sync-context-workflows re-sync keeps dollar sequences in mirrored CLAUDE.md text verbatim", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-dollar-"));
  const ruleLine = "- include path regex `[\\\\/]hooks[\\\\/].*\\.cjs$`; replacement tokens $& and $$ stay literal";
  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"), "---\nname: test\ndescription: fixture\n---\n");
    await fs.writeFile(path.join(tempRoot, ".claude", "workflows.json"), JSON.stringify({ workflows: {
      testing: { sequence: ["test"], preActions: { injectContext: "Run fixture test." } },
    } }));
    await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), `# Claude Source Instructions\n\n${ruleLine}\n`, "utf8");

    await runSync(tempRoot);
    await runSync(tempRoot); // second pass takes the managed-block replace path

    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    assert.ok(agentsText.includes(ruleLine), "mirrored rule line must survive re-sync verbatim");
    assert.equal(agentsText.split("<!-- CLAUDE-MIRROR:START -->").length, 2, "exactly one CLAUDE mirror block");
    assert.equal(agentsText.includes("CODEX-CONTEXT-MIRROR"), false, "no context mirror block");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows never inlines project lessons into AGENTS.md", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-lessons-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"), ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"), "utf8");
    await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), "# Project\n\nRead `docs/project-reference/lessons.md` for project guardrails.\n", "utf8");
    await runSync(tempRoot);

    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    assert.match(agentsText, /docs\/project-reference\/lessons\.md/, "the project's own pointer is kept");
    assert.doesNotMatch(agentsText, /^## Learned Lessons\b/m);
    assert.doesNotMatch(agentsText, /^# Lessons Learned\b/m);
    assert.doesNotMatch(agentsText, /ExecuteInjectScopedAsync/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows creates AGENTS.md when it is missing and never creates a context file", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-missing-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"), ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"), "utf8");

    await runSync(tempRoot);

    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    assert.match(agentsText, /# Codex Project Instructions/);
    assert.doesNotMatch(agentsText, /<!-- CLAUDE-MIRROR:START -->/, "no CLAUDE.md, nothing to project");
    assertProjectOnly(agentsText, "AGENTS.md");
    assert.equal(await fs.access(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md")).then(() => true, () => false), false);
    assert.equal(await fs.access(path.join(tempRoot, "scripts")).then(() => true, () => false), false);

    await runSync(tempRoot);
    assert.equal(await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8"), agentsText, "a second run is byte-idempotent");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows writes no protocol text and ignores local portability data", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-no-protocol-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "custom"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", ".ck.json"),
      JSON.stringify({ portability: { rule: "Custom portable rule from local config.", projectConfigPath: "custom/project-config.json", docsIndexPath: "custom/docs-index.md" } }, null, 2),
      "utf8"
    );
    await fs.writeFile(path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"), ["---", "name: test", "description: Test skill", "---", "", "# Test", ""].join("\n"), "utf8");
    await fs.writeFile(path.join(tempRoot, "custom", "project-config.json"), JSON.stringify({ portability: { workflowRouteMode: "off" } }, null, 2), "utf8");
    await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), "# Project\n\nProject notes.\n", "utf8");

    // Whatever the route mode, the tracked mirror holds no route text, no protocol and no local configuration
    for (const mode of ["off", "ask", "auto"]) {
      await fs.writeFile(path.join(tempRoot, "custom", "project-config.json"), JSON.stringify({ portability: { workflowRouteMode: mode } }, null, 2), "utf8");
      await runSync(tempRoot);
      const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
      assertProjectOnly(agentsText, `AGENTS.md (mode ${mode})`);
      assert.doesNotMatch(agentsText, /Workflow Catalog|\[TASK-PLANNING\]/);
      for (const local of ["Custom portable rule from local config.", "custom/project-config.json", "custom/docs-index.md"]) {
        assert.ok(!agentsText.includes(local), `local portability data reached the tracked mirror: ${local}`);
      }
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});


test("sync-context-workflows replaces a previous-generation AGENTS.md and removes the context file instead of duplicating either", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-gate-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });
    await fs.writeFile(path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"), "---\nname: test\ndescription: Test skill\n---\n\n# Test\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), "# Project\n\n## Doc Lookup — What to Read When\n\nProject routing.\n", "utf8");
    // Given the previous generation: a context file with a project-reference gate and an AGENTS.md that mirrors
    // CLAUDE.md, the context and a protocol block.
    await fs.writeFile(
      path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"),
      ["# Existing Context", "", "## Codex Project Reference Gate (Hook-Independent)", "", "Old direct-read-all-project-reference-docs guidance.", ""].join("\n"),
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, "AGENTS.md"),
      [
        "# Codex Project Instructions", "",
        "<!-- CLAUDE-MIRROR:START -->", "<!-- CK:CODEX-ROOT-PROJECTION -->", "old projection with the gate", "<!-- /CK:CODEX-ROOT-PROJECTION -->", "<!-- CLAUDE-MIRROR:END -->", "",
        "<!-- CODEX-CONTEXT-MIRROR:START -->", "Read `.codex/CODEX_CONTEXT.md`", "Context fingerprint (SHA-256): " + "0".repeat(64), "<!-- CODEX-CONTEXT-MIRROR:END -->", "",
      ].join("\n"),
      "utf8"
    );

    // When the context sync runs, twice
    await runSync(tempRoot);
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    await runSync(tempRoot);

    // Then exactly one current projection stands, the old blocks and the context file are gone, and the run is idempotent
    assert.equal(agentsText.split("<!-- CLAUDE-MIRROR:START -->").length, 2);
    assert.doesNotMatch(agentsText, /old projection with the gate|CODEX-CONTEXT-MIRROR/);
    assert.match(agentsText, /Project routing\./);
    assertProjectOnly(agentsText, "AGENTS.md");
    assert.equal(await fs.access(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md")).then(() => true, () => false), false);
    assert.equal(await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8"), agentsText);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});


test("runtime catalog renders every canonical workflow variant while the Codex root carries no route text", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-variants-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "workflow-end"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1",
        workflows: {
          "workflow-variant": {
            name: "Variant workflow",
            description: "Choose a named output mode",
            defaultMode: "synthesis",
            variants: {
              synthesis: {
                sequence: [
                  { id: "synth-test", skill: "test", args: "--mode=synthesis" },
                  { id: "synth-end", skill: "workflow-end" },
                ],
              },
              audit: {
                sequence: [
                  { id: "audit-test", skill: "test", args: "--mode=audit" },
                  { id: "audit-end", skill: "workflow-end" },
                ],
              },
            },
            preActions: { injectContext: "Resolve the selected output mode before task creation." },
          },
        },
      }, null, 2),
      "utf8"
    );
    for (const [name, description] of [["test", "Test skill"], ["workflow-end", "Workflow end skill"]]) {
      await fs.writeFile(
        path.join(tempRoot, ".claude", "skills", name, "SKILL.md"),
        ["---", `name: ${name}`, `description: ${description}`, "---", "", `# ${name}`, ""].join("\n"),
        "utf8"
      );
    }

    await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), "# Project\n", "utf8");
    await runSync(tempRoot);
    const contextText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    const document = JSON.parse(await fs.readFile(path.join(tempRoot, ".claude", "workflows.json"), "utf8"));
    const claudeCatalog = workflowCatalog.buildWorkflowSkillsCatalog({ rootDir: tempRoot, sections: ["workflows"] });

    assert.doesNotMatch(contextText, /<!-- CK:WORKFLOW-ROUTE-POINTER -->/);
    assert.doesNotMatch(contextText, /<!-- CK:WORKFLOW-GATE -->/);
    assert.doesNotMatch(contextText, /synthesis:|audit:|Workflow Catalog/);
    assert.match(claudeCatalog, /synthesis:/);
    assert.match(claudeCatalog, /audit:/);
    assert.match(claudeCatalog, /test --mode=(?:synthesis|audit)/);
    for (const id of ["synth-test", "synth-end", "audit-test", "audit-end"]) {
      assert.doesNotMatch(contextText, new RegExp(id), `the Codex root must omit runtime occurrence ${id}`);
    }
    assert.doesNotMatch(contextText, /\[object Object\]/);
    assert.deepEqual(
      workflowCatalog.resolvedModeSequences(tempRoot, "workflow-variant", document.workflows["workflow-variant"]),
      [
        { mode: "synthesis", sequence: ["test --mode=synthesis", "workflow-end"] },
        { mode: "audit", sequence: ["test --mode=audit", "workflow-end"] },
      ],
      "Claude's catalog resolver must expose the same mode/sequence projection"
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// TC-DOCROOT-028 — a routed field carrying {SPEC_ROOT} must reach the mirror RESOLVED.
// A bare token in .codex/CODEX_CONTEXT.md is strictly worse than the hardcoded path it
// replaced, so the assertion is two-sided: the resolved value is present AND the literal
// token is absent. The fixture declares specRoots, proving the mirror follows CONFIG and
// not just the default.
test("runtime catalog resolves {SPEC_ROOT} while the tracked mirror omits workflow text (TC-DOCROOT-028)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-docroot-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "docs", "project-config.json"),
      JSON.stringify({ specRoots: { business: { path: "spec-library" } } }, null, 2),
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      "---\nname: test\ndescription: fixture\n---\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1",
        workflows: {
          docroot: {
            name: "Docroot workflow",
            description: "Docroot workflow",
            whenToUse: "read {SPEC_ROOT}/README.md for {Bucket}",
            sequence: ["test"],
            preActions: { injectContext: "Specs live in {SPEC_ROOT}/; buckets stay {Bucket}." },
          },
        },
      }, null, 2),
      "utf8"
    );

    await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), "# Project\n", "utf8");
    await runSync(tempRoot);
    const contextText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    const catalog = workflowCatalog.buildWorkflowSkillsCatalog({
      rootDir: tempRoot,
      config: { specRoots: { business: { path: "spec-library" } } }
    });

    assert.doesNotMatch(contextText, /\{SPEC_ROOT\}/, "a bare portability token must never reach a mirror");
    assert.doesNotMatch(contextText, /Docroot workflow|Specs live/);
    assert.match(catalog, /spec-library\/readme\.md/i, "route hint must resolve from config");
    assert.match(catalog, /\{bucket\}/i, "unknown braces are AI placeholders and must survive route rendering");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// TC-DOCROOT-029 — the generator carries no copy of the portability-token defaults: the project-config
// loader is the one resolver, so a second copy could only drift.
test("the context mirror carries no portability-token fallback: it resolves no token and ships none (TC-DOCROOT-029)", async () => {
  // The generator projects project text only; workflow routing (the one place tokens are resolved) is
  // a runtime hook, so a second copy of the token defaults would be dead code that can only drift.
  const source = await fs.readFile(syncContextScript, "utf8");
  assert.doesNotMatch(source, /PORTABILITY_TOKEN_DEFAULTS|resolvePortabilityTokensFallback/);
  const loader = require(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs"));
  assert.equal(typeof loader.resolvePortabilityTokens, "function", "the loader stays the one resolver");
});

// ─────────────────────────────────────────────────────────────────────────────
// TC-DOCROOT-050..055 — Phase 05. `.claude/workflows.json` ROUTED fields carry TOKENS.
//
// None of these tests asserts a COUNT. Each walks the live file and derives its own
// target set, because the routed-field inventory moves whenever a workflow is added.
// ─────────────────────────────────────────────────────────────────────────────

const realWorkflowsPath = path.join(repoRoot, ".claude", "workflows.json");
const configLoader = require(path.join(repoRoot, ".claude", "hooks", "lib", "project-config-loader.cjs"));
const PORTABILITY_TOKEN_NAMES = Object.keys(configLoader.PORTABILITY_TOKENS);

// The tracked literal each token replaces, derived from the loader's own defaults so a new
// token cannot silently escape this guard. `PLANS_ROOT` is the one root whose bare default
// (`plans`) is an ordinary English word, so it is matched only in its path-shaped form.
const TRACKED_LITERALS = PORTABILITY_TOKEN_NAMES.map((token) => {
  const value = configLoader.PORTABILITY_TOKENS[token].default;
  return token === "PLANS_ROOT" ? `${value}/` : value;
});

// Exactly the routed set Phase 04b fixed: anything NOT matched here stays literal by design.
const ROUTED_FIELD_PATH = /(\.description|\.whenToUse|\.preActions\.injectContext|\.applicability\.when|\.applicability\.skipReason)$/;

function collectRoutedStrings(node, jsonPath, sink) {
  if (typeof node === "string") {
    if (ROUTED_FIELD_PATH.test(jsonPath)) sink.push({ jsonPath, value: node });
  } else if (Array.isArray(node)) {
    node.forEach((item, index) => collectRoutedStrings(item, `${jsonPath}[${index}]`, sink));
  } else if (node && typeof node === "object") {
    for (const key of Object.keys(node)) collectRoutedStrings(node[key], `${jsonPath}.${key}`, sink);
  }
}

async function readRoutedStrings() {
  const document = JSON.parse(await fs.readFile(realWorkflowsPath, "utf8"));
  const sink = [];
  collectRoutedStrings(document, "", sink);
  return { document, routed: sink };
}

async function buildMirrorFixture(projectConfig) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-p05-"));
  await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
  await fs.writeFile(
    path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
    "---\nname: test\ndescription: fixture\n---\n",
    "utf8"
  );
  await fs.copyFile(realWorkflowsPath, path.join(tempRoot, ".claude", "workflows.json"));
  if (projectConfig) {
    await fs.mkdir(path.join(tempRoot, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, "docs", "project-config.json"),
      JSON.stringify(projectConfig, null, 2),
      "utf8"
    );
  }
  await fs.writeFile(path.join(tempRoot, "CLAUDE.md"), "# Project\n", "utf8");
  await runSync(tempRoot);
  const contextText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
  const catalog = workflowCatalog.buildWorkflowSkillsCatalog({ rootDir: tempRoot, config: projectConfig || {} });
  return { tempRoot, contextText, catalog };
}

test("every routed workflows.json field is literal-free (TC-DOCROOT-050)", async () => {
  const { routed } = await readRoutedStrings();
  assert.ok(routed.length > 0, "routed-field walker found nothing — has the field shape changed?");

  const offenders = [];
  for (const { jsonPath, value } of routed) {
    for (const literal of TRACKED_LITERALS) {
      if (value.includes(literal)) offenders.push(`${jsonPath} still contains "${literal}"`);
    }
  }
  assert.deepEqual(offenders, [], `routed fields must carry tokens, not literals:\n${offenders.join("\n")}`);
});

test("runtime catalog resolves portability tokens and keeps AI placeholders (TC-DOCROOT-051, TC-DOCROOT-052)", async () => {
  const { tempRoot, contextText, catalog } = await buildMirrorFixture(null);
  try {
    for (const token of PORTABILITY_TOKEN_NAMES) {
      assert.equal(
        contextText.includes(`{${token}}`),
        false,
        `a bare {${token}} reached AGENTS.md — strictly worse than the literal it replaced`
      );
    }

    assert.doesNotMatch(contextText, /Workflow Catalog|Workflows Index/);
    assert.doesNotMatch(catalog, /\[object Object\]/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("relocating specRoots.business never adds workflow data to the tracked mirror (TC-DOCROOT-053)", async () => {
  const { tempRoot, contextText } = await buildMirrorFixture({ specRoots: { business: { path: "spec-library" } } });
  try {
    assert.doesNotMatch(contextText, /Workflow Catalog|Workflows Index|\{SPEC_ROOT\}/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runtime catalog still throws on a blank injectContext (TC-DOCROOT-054)", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-blank-inject-"));
  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "test", "SKILL.md"),
      "---\nname: test\ndescription: fixture\n---\n",
      "utf8"
    );
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify({
        version: "1",
        workflows: {
          blank: { name: "Blank", sequence: ["test"], preActions: { injectContext: "   \n  " } },
        },
      }, null, 2),
      "utf8"
    );
    assert.throws(
      () => workflowCatalog.buildWorkflowSkillsCatalog({ rootDir: tempRoot }),
      /missing required non-empty preActions\.injectContext/,
      "a whitespace-only injectContext must fail the generator, not ship an empty protocol"
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("Tier-2 read-workflow-entry emits no bare token for any workflow id (TC-DOCROOT-055)", async () => {
  const readEntryScript = path.join(repoRoot, ".claude", "scripts", "codex", "read-workflow-entry.mjs");
  const { document } = await readRoutedStrings();
  const workflowIds = Object.keys(document.workflows);
  assert.ok(workflowIds.length > 0, "workflows.json declares no workflows");

  for (const workflowId of workflowIds) {
    const { stdout } = await execFileAsync(process.execPath, [readEntryScript, workflowId], { cwd: repoRoot });
    for (const token of PORTABILITY_TOKEN_NAMES) {
      assert.equal(
        stdout.includes(`{${token}}`),
        false,
        `read-workflow-entry ${workflowId} printed a bare {${token}} into the Tier-2 canonical read`
      );
    }
    assert.doesNotThrow(() => JSON.parse(stdout), `read-workflow-entry ${workflowId} must emit valid JSON`);
  }
});
