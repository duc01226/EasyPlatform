import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const thisDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(thisDir, "..", "..", "..", "..");
const syncContextScript = path.join(repoRoot, ".claude", "scripts", "codex", "sync-context-workflows.mjs");
const subagentAuthorizationSnippet =
  "Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.";
const projectReferenceGateHeading = "## Codex Hookless Project Reference Gate";
const projectReferenceGateRequiredDocs = [
  "docs/project-config.json",
  "docs/project-reference/docs-index-reference.md",
  "docs/project-reference/lessons.md",
];

test("sync-context-workflows mirrors subagent authorization into AGENTS.md", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "shared"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
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

    await fs.writeFile(
      path.join(tempRoot, ".claude", "hooks", "lib", "prompt-injections.cjs"),
      [
        "module.exports = {",
        "  injectWorkflowProtocol: () => '## Workflow Protocol Stub',",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", "skills", "shared", "sync-inline-versions.md"),
      [
        "## SYNC:ai-sdd-artifact-contract",
        "",
        "> Any supported AI tool may execute with synced context.",
        "> Code-to-spec extraction is reference-only until accepted.",
        "> Active reference: `shared/sdd-artifact-contract.md`.",
        "",
        "---",
        "",
        "## SYNC:ai-sdd-artifact-contract:reminder",
        "",
        "- MANDATORY keep generated mirrors current.",
        "",
      ].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, "CLAUDE.md"),
      ["# Claude Source Instructions", "", "Use /test from the Claude source instructions.", ""].join("\n"),
      "utf8"
    );

    await fs.writeFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "# Existing Context\n", "utf8");
    await fs.writeFile(
      path.join(tempRoot, "AGENTS.md"),
      [
        "# Codex Project Instructions",
        "",
        "<!-- CLAUDE-MERGE:START -->",
        "## CLAUDE.md (Prompt-Enhanced Snapshot)",
        "",
        "Legacy generated instructions.",
        "<!-- CLAUDE-MERGE:END -->",
        "",
      ].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.match(contextText, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(contextText, new RegExp(projectReferenceGateHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const requiredDoc of projectReferenceGateRequiredDocs) {
      assert.match(contextText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(agentsText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(contextText, /Auto-select/);
    assert.doesNotMatch(contextText, /Which workflow do you want to activate\?/);
    assert.match(contextText, /SYNC:ai-sdd-artifact-contract/);
    assert.match(contextText, /Any supported AI tool/);
    assert.match(contextText, /reference-only until accepted/);
    assert.doesNotMatch(contextText, /Confirm First:/);
    assert.doesNotMatch(contextText, /if workflow requires confirmation or ambiguity exists/);
    assert.match(agentsText, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(agentsText, /<!-- CLAUDE-MIRROR:START -->/);
    assert.match(agentsText, /# Claude Source Instructions/);
    assert.match(agentsText, /Use \$test from the Claude source instructions\./);
    assert.match(agentsText, /<!-- CODEX-CONTEXT-MIRROR:START -->/);
    assert.match(agentsText, /Use \$test for local test execution\./);
    assert.match(agentsText, /SYNC:ai-sdd-artifact-contract/);
    assert.ok(agentsText.indexOf("<!-- CLAUDE-MIRROR:START -->") < agentsText.indexOf("<!-- CODEX-CONTEXT-MIRROR:START -->"));
    assert.doesNotMatch(agentsText, /<!-- CLAUDE-MERGE:START -->/);
    assert.doesNotMatch(agentsText, /Legacy generated instructions\./);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows creates Codex context and AGENTS when both are missing", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-missing-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
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

    await fs.writeFile(
      path.join(tempRoot, ".claude", "hooks", "lib", "prompt-injections.cjs"),
      [
        "module.exports = {",
        "  injectWorkflowProtocol: () => '## Workflow Protocol Stub',",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.match(contextText, /^<!-- PROMPT-PROTOCOLS:START -->/);
    assert.match(contextText, /# Codex Context/);
    assert.match(contextText, new RegExp(projectReferenceGateHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const requiredDoc of projectReferenceGateRequiredDocs) {
      assert.match(contextText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(agentsText, new RegExp(requiredDoc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    assert.match(agentsText, /# Codex Project Instructions/);
    assert.doesNotMatch(agentsText, /<!-- CLAUDE-MIRROR:START -->/);
    assert.match(agentsText, /<!-- CODEX-CONTEXT-MIRROR:START -->/);
    assert.match(agentsText, /Use \$test for local test execution\./);
    assert.doesNotMatch(agentsText, /Confirm First:/);
    assert.equal(await fs.access(path.join(tempRoot, "scripts")).then(() => true, () => false), false);

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const agentsTextAfterSecondRun = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");
    assert.equal(agentsTextAfterSecondRun, agentsText);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows passes portability config into prompt protocol mirror", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-portability-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", ".ck.json"),
      JSON.stringify(
        {
          portability: {
            rule: "Custom portable rule from local config.",
            projectConfigPath: "custom/project-config.json",
            docsIndexPath: "custom/docs-index.md",
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

    await fs.writeFile(
      path.join(tempRoot, ".claude", "hooks", "lib", "prompt-injections.cjs"),
      [
        "module.exports = {",
        "  injectWorkflowProtocol: (_transcriptPath, portability) => [",
        "    '## Workflow Protocol Stub',",
        "    portability.rule,",
        "    portability.projectConfigPath,",
        "    portability.docsIndexPath,",
        "  ].join('\\n'),",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    for (const expected of [
      "Custom portable rule from local config.",
      "custom/project-config.json",
      "custom/docs-index.md",
    ]) {
      assert.match(contextText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(agentsText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("sync-context-workflows replaces stale project-reference gate content", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-gate-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills", "test"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "hooks", "lib"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".codex"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      JSON.stringify(
        {
          workflows: {
            testing: {
              name: "Testing",
              description: "Run local tests",
              sequence: ["test"],
              preActions: { injectContext: "Use /test for local test execution." },
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

    await fs.writeFile(
      path.join(tempRoot, ".claude", "hooks", "lib", "prompt-injections.cjs"),
      [
        "module.exports = {",
        "  injectWorkflowProtocol: () => '## Workflow Protocol Stub',",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"),
      [
        "# Existing Context",
        "",
        "Codex does not receive Claude hook-injected project docs or project config summaries. Before coding, planning, debugging, testing, or reviewing:",
        "",
        "- Read `docs/project-config.json` for project-specific commands, module paths, workflow settings, and doc paths.",
        "- Read `docs/project-reference/docs-index-reference.md` to route to the right project-reference files.",
        "- Read `docs/project-reference/lessons.md` for always-on project guardrails.",
        "- For situation-specific work, open the referenced project doc directly; do not rely on prior conversation text as proof that the doc is loaded.",
        "",
        projectReferenceGateHeading,
        "",
        "Old direct-read-all-project-reference-docs guidance.",
        "",
        "## Critical Thinking Mindset",
        "",
        "Keep this section.",
        "",
      ].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.doesNotMatch(contextText, /Old direct-read-all-project-reference-docs guidance/);
    assert.match(contextText, /auto-run `\$project-init` or the narrow setup route/);
    assert.match(contextText, /For situation-specific work, open the referenced project doc directly/);
    assert.equal(contextText.match(/For situation-specific work, open the referenced project doc directly/g)?.length, 1);
    assert.match(contextText, /## Critical Thinking Mindset/);
    assert.ok(contextText.indexOf(projectReferenceGateHeading) < contextText.indexOf("## Critical Thinking Mindset"));
    assert.match(agentsText, /For situation-specific work, open the referenced project doc directly/);

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });
    const contextTextAfterSecondRun = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    assert.equal(contextTextAfterSecondRun, contextText);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
