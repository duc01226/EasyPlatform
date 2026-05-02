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
const repoRoot = path.resolve(thisDir, "..", "..", "..");
const migrateScript = path.join(repoRoot, "scripts", "codex", "migrate-claude-to-codex.mjs");

test("migrate-claude-to-codex mirrors skills and injects protocol block", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-migrate-"));
  try {
    const skillDir = path.join(tempRoot, ".claude", "skills", "sample-skill");
    const agentsDir = path.join(tempRoot, ".claude", "agents");
    const hooksDir = path.join(tempRoot, ".claude", "hooks", "lib");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.mkdir(hooksDir, { recursive: true });

    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      [
        "---",
        "name: sample-skill",
        "description: 'Sample skill for migration test'",
        "---",
        "",
        "# Sample Skill",
        "",
        "Use /plan for planning.",
        'Agent({ subagent_type: "architect", prompt: "review" })',
        'Agent(review-architecture, subagent_type="code-reviewer", ...)',
        "",
      ].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(agentsDir, "sample-agent.md"),
      ["---", "name: sample-agent", "description: sample agent", "---", "", "Agent body."].join("\n"),
      "utf8"
    );

    await fs.writeFile(
      path.join(tempRoot, ".claude", ".ck.json"),
      JSON.stringify({ workflow: { confirmationMode: "always" } }, null, 2),
      "utf8"
    );

    await fs.writeFile(
      path.join(hooksDir, "prompt-injections.cjs"),
      [
        "module.exports = {",
        "  injectWorkflowProtocol: () => '## Workflow Protocol Stub',",
        "  injectCriticalContext: () => '## Critical Context Stub',",
        "  injectAiMistakePrevention: () => '## Mistake Prevention Stub',",
        "  injectLessons: () => '## Lessons Stub',",
        "  injectLessonReminder: () => '## Lesson Reminder Stub',",
        "};",
        "",
      ].join("\n"),
      "utf8"
    );

    await execFileAsync(process.execPath, [migrateScript], { cwd: tempRoot });

    const mirroredSkill = await fs.readFile(
      path.join(tempRoot, ".agents", "skills", "sample-skill", "SKILL.md"),
      "utf8"
    );
    const mirroredAgent = await fs.readFile(
      path.join(tempRoot, ".codex", "agents", "sample-agent.toml"),
      "utf8"
    );

    assert.match(mirroredSkill, /CODEX:SYNC-PROMPT-PROTOCOLS:START/);
    assert.match(mirroredSkill, /Hookless Prompt Protocol Mirror/);
    assert.match(mirroredSkill, /spawn_agent\(\{ agent_type: "architect"/);
    assert.match(mirroredSkill, /spawn_agent\(review-architecture, agent_type="code-reviewer"/);
    assert.doesNotMatch(mirroredSkill, /\bAgent\(|\bsubagent_type[=:]/);
    assert.doesNotMatch(mirroredSkill, /adr-service-pattern-v1-v2-split|integration-test-guide|seed-test-data-reference/);
    assert.match(mirroredAgent, /name = "sample-agent"/);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
