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

test("sync-context-workflows mirrors subagent authorization into AGENTS.md", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sync-context-"));

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

    await fs.writeFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "# Existing Context\n", "utf8");
    await fs.writeFile(path.join(tempRoot, "AGENTS.md"), "# Codex Project Instructions\n", "utf8");

    await execFileAsync(process.execPath, [syncContextScript], { cwd: tempRoot });

    const contextText = await fs.readFile(path.join(tempRoot, ".codex", "CODEX_CONTEXT.md"), "utf8");
    const agentsText = await fs.readFile(path.join(tempRoot, "AGENTS.md"), "utf8");

    assert.match(contextText, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(agentsText, new RegExp(subagentAuthorizationSnippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(agentsText, /<!-- CODEX-CONTEXT-MIRROR:START -->/);
    assert.match(agentsText, /Use \$test for local test execution\./);
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
    assert.match(agentsText, /# Codex Project Instructions/);
    assert.match(agentsText, /<!-- CODEX-CONTEXT-MIRROR:START -->/);
    assert.match(agentsText, /Use \$test for local test execution\./);
    assert.equal(await fs.access(path.join(tempRoot, "scripts")).then(() => true, () => false), false);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
