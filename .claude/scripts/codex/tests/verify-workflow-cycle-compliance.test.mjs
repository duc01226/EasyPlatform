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
const verifyScript = path.join(
  repoRoot,
  ".claude",
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
      investigate: { claude: "/feature-investigation" },
      plan: { claude: "/plan" },
      "test-initial": { claude: "/test" },
      "workflow-end": { claude: "/workflow-end" },
      scout: { claude: "/scout" },
    },
    workflows,
  };
}

function toSkillStepToken(step) {
  if (step === "investigate") return "feature-investigation";
  if (step === "test-initial") return "test";
  return step;
}

function buildSkillStepLine(workflowId, { agents = false } = {}) {
  const prefix = agents ? "$" : "/";
  return sequenceByWorkflow[workflowId]
    .map((step) => `${prefix}${toSkillStepToken(step)}`)
    .join(" -> ");
}

function buildTaskTable(steps) {
  return [
    "| # | Task Subject | Conditional? |",
    "| --- | --- | --- |",
    ...steps.map(
      (step, index) => `| ${index + 1} | \`[Workflow] /${toSkillStepToken(step)}\` | No |`
    ),
  ].join("\n");
}

async function writeSkillFile(root, workflowId, stepsLine, options = {}) {
  const { taskTableSteps = null, closingTaskCount = null } = options;
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
  ];

  if (taskTableSteps) {
    content.push("## Mandatory Task Creation", "", buildTaskTable(taskTableSteps), "");
  }

  if (closingTaskCount !== null) {
    content.push(
      `**IMPORTANT MUST ATTENTION** break work into small todo tasks using TaskCreate BEFORE starting - create ALL ${closingTaskCount} tasks immediately`,
      ""
    );
  }

  await fs.writeFile(path.join(targetDir, "SKILL.md"), content.join("\n"), "utf8");
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
      "$scout -> $feature-investigation -> $unknown-step -> $workflow-end"
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /FAIL/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance validates task tables and closing counts", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-table-pass-"));

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
        buildSkillStepLine(workflowId),
        {
          taskTableSteps: sequenceByWorkflow[workflowId],
          closingTaskCount: sequenceByWorkflow[workflowId].length,
        }
      );
      await writeSkillFile(
        path.join(tempRoot, ".agents", "skills"),
        workflowId,
        buildSkillStepLine(workflowId, { agents: true }),
        {
          taskTableSteps: sequenceByWorkflow[workflowId],
          closingTaskCount: sequenceByWorkflow[workflowId].length,
        }
      );
    }

    await execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance fails on task-table drift", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-table-fail-"));

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
      path.join(tempRoot, ".claude", "skills"),
      "feature",
      buildSkillStepLine("feature"),
      {
        taskTableSteps: sequenceByWorkflow.feature.filter((step) => step !== "workflow-review-changes"),
        closingTaskCount: sequenceByWorkflow.feature.length,
      }
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /Task-table drift detected/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance fails on closing task-count drift", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-count-fail-"));

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
      path.join(tempRoot, ".claude", "skills"),
      "feature",
      buildSkillStepLine("feature"),
      {
        taskTableSteps: sequenceByWorkflow.feature,
        closingTaskCount: 999,
      }
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /Closing task-count drift detected/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
