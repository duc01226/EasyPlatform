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
const verifyScript = path.join(
  repoRoot,
  "scripts",
  "codex",
  "verify-workflow-cycle-compliance.mjs"
);

const workflowIds = [
  "batch-operation",
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "tdd-feature",
  "test-spec-update",
  "test-to-integration",
  "test-verify",
  "verification",
];

const sequenceByWorkflow = {
  "batch-operation": [
    "plan",
    "tdd-spec",
    "tdd-spec-review",
    "code",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  "big-feature": [
    "plan",
    "tdd-spec",
    "tdd-spec-review",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  bugfix: [
    "scout",
    "investigate",
    "tdd-spec",
    "tdd-spec-review",
    "fix",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  feature: [
    "scout",
    "investigate",
    "tdd-spec",
    "tdd-spec-review",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  "full-feature-lifecycle": [
    "plan",
    "tdd-spec",
    "tdd-spec-review",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  "tdd-feature": [
    "scout",
    "investigate",
    "tdd-spec",
    "tdd-spec-review",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  "test-spec-update": [
    "workflow-review-changes",
    "tdd-spec",
    "tdd-spec-review",
    "tdd-spec [direction=sync]",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "docs-update",
    "workflow-end",
  ],
  "test-to-integration": [
    "scout",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "docs-update",
    "workflow-end",
  ],
  "test-verify": [
    "scout",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "docs-update",
    "workflow-end",
  ],
  verification: [
    "scout",
    "investigate",
    "test-initial",
    "tdd-spec",
    "tdd-spec-review",
    "fix",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "tdd-spec [direction=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
};

function makeWorkflowJson() {
  const workflows = {};
  for (const workflowId of workflowIds) {
    workflows[workflowId] = {
      sequence: sequenceByWorkflow[workflowId],
    };
  }

  return {
    commandMapping: {
      investigate: { claude: "/feature-investigation", copilot: "/feature-investigation" },
      plan: { claude: "/plan", copilot: "/plan" },
      "test-initial": { claude: "/test", copilot: "/test" },
      "workflow-end": { claude: "/workflow-end", copilot: "/workflow-end" },
      scout: { claude: "/scout", copilot: "/scout" },
    },
    workflows,
  };
}

function toSkillStepToken(step, { agents = false } = {}) {
  if (step === "investigate") return "feature-investigation";
  if (step === "plan" && agents) return "plan-hard";
  if (step === "test-initial") return "test";
  return step;
}

function buildSkillStepLine(workflowId, { agents = false } = {}) {
  const prefix = agents ? "$" : "/";
  return sequenceByWorkflow[workflowId]
    .map((step) => `${prefix}${toSkillStepToken(step, { agents })}`)
    .join(" -> ");
}

async function writeSkillFile(root, workflowId, stepsLine) {
  const targetDir = path.join(root, `workflow-${workflowId}`);
  await fs.mkdir(targetDir, { recursive: true });
  const content = [
    "---",
    `name: workflow-${workflowId}`,
    "description: test",
    "---",
    "",
    `**IMPORTANT MANDATORY Steps:** ${stepsLine}`,
    "",
  ].join("\n");
  await fs.writeFile(path.join(targetDir, "SKILL.md"), content, "utf8");
}

test("verify-workflow-cycle-compliance passes with normalized aliases", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-pass-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      `${JSON.stringify(makeWorkflowJson(), null, 2)}\n`,
      "utf8"
    );

    for (const workflowId of workflowIds) {
      await writeSkillFile(
        path.join(tempRoot, ".claude", "skills"),
        workflowId,
        buildSkillStepLine(workflowId)
      );
      await writeSkillFile(
        path.join(tempRoot, ".agents", "skills"),
        workflowId,
        buildSkillStepLine(workflowId, { agents: true })
      );
    }

    await execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance fails on paired-drift", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-fail-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      `${JSON.stringify(makeWorkflowJson(), null, 2)}\n`,
      "utf8"
    );

    for (const workflowId of workflowIds) {
      await writeSkillFile(
        path.join(tempRoot, ".claude", "skills"),
        workflowId,
        buildSkillStepLine(workflowId)
      );
      await writeSkillFile(
        path.join(tempRoot, ".agents", "skills"),
        workflowId,
        buildSkillStepLine(workflowId, { agents: true })
      );
    }

    await writeSkillFile(
      path.join(tempRoot, ".agents", "skills"),
      "feature",
      "$scout -> $feature-investigation -> $plan-hard -> $workflow-end"
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /FAIL/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
