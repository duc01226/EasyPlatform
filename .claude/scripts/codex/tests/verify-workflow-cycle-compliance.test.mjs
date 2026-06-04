import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

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
const {
  checkWorkflowDebuggerTracePolicy,
  checkGoalContractSkillCompliance,
  checkGoalContractFileLifecycle,
} = await import(pathToFileURL(verifyScript).href);

const workflowIds = [
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "spec-sync",
];

const sequenceByWorkflow = {
  "big-feature": [
    "plan",
    "spec",
    "spec [mode=tests]",
    "review-artifact --type=spec-tests",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  bugfix: [
    "scout",
    "investigate",
    "spec [mode=amend]",
    "plan",
    "spec [mode=tests]",
    "review-artifact --type=spec-tests",
    "fix",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  feature: [
    "scout",
    "investigate",
    "spec",
    "plan",
    "spec [mode=tests]",
    "review-artifact --type=spec-tests",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  "full-feature-lifecycle": [
    "spec",
    "plan",
    "spec [mode=tests]",
    "review-artifact --type=spec-tests",
    "cook",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "docs-update",
    "workflow-end",
  ],
  "spec-sync": [
    "workflow-review-changes",
    "spec [mode=tests]",
    "review-artifact --type=spec-tests",
    "spec [mode=sync]",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "docs-update",
    "workflow-end",
  ],
};

function makeWorkflowJson() {
  const workflows = {};
  for (const workflowId of workflowIds) {
    // JSON workflow keys are `workflow-`-prefixed (matches production workflows.json);
    // the activation skill dir is identity (`workflow-bugfix` → skills/workflow-bugfix).
    workflows[`workflow-${workflowId}`] = {
      sequence: sequenceByWorkflow[workflowId],
    };
  }

  workflows["workflow-bugfix"].description =
    "Bugfix workflow with end-to-start debugger trace from observed final output to owning fix layer";
  workflows["workflow-bugfix"].whenToUse =
    "Use for bug reports with observed final output, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof";
  workflows["workflow-bugfix"].preActions = {
    injectContext:
      "END-TO-START TRACE: observed final state, feeder paths, hypothesis matrix, owning fix layer, forward convergence proof",
  };

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

test("verify-workflow-cycle-compliance debugger trace metadata policy", () => {
  assert.equal(
    checkWorkflowDebuggerTracePolicy("workflow-bugfix", {
      description: "Bugfix with end-to-start debugger trace",
      whenToUse: "Observed final output and all feeder paths",
      preActions: {
        injectContext:
          "Use hypothesis matrix, owning fix layer, and forward convergence proof before fixing.",
      },
    }),
    null
  );

  assert.match(
    checkWorkflowDebuggerTracePolicy("workflow-bugfix", {
      description: "Bugfix with normal investigation",
      preActions: { injectContext: "Find root cause and fix." },
    }),
    /missing end-to-start debugger trace metadata/
  );
});

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

function buildDisplaySteps(steps, { agents = false } = {}) {
  const prefix = agents ? "$" : "/";
  return steps.map((step) => `${prefix}${toSkillStepToken(step)}`).join(" → ");
}

async function writeSkillFile(root, workflowId, stepsLine, options = {}) {
  const {
    taskTableSteps = null,
    closingTaskCount = null,
    displaySteps = null,
    goalMarker = true,
    goalSatisfaction = true,
  } = options;
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

  if (goalMarker) {
    content.push(
      "<!-- SYNC:goal-contract-satisfaction-loop:reminder -->",
      "",
      "Resolve the active Goal Contract before work.",
      "",
      "<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->",
      ""
    );
  }

  if (goalSatisfaction) {
    content.push("Emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS.", "");
  }

  if (taskTableSteps) {
    content.push("## Mandatory Task Creation", "", buildTaskTable(taskTableSteps), "");
  }

  if (displaySteps) {
    content.push(`**Steps:** ${buildDisplaySteps(displaySteps, { agents: root.includes(".agents") })}`, "");
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
          displaySteps: sequenceByWorkflow[workflowId],
        }
      );
      await writeSkillFile(
        path.join(tempRoot, ".agents", "skills"),
        workflowId,
        buildSkillStepLine(workflowId, { agents: true }),
        {
          taskTableSteps: sequenceByWorkflow[workflowId],
          closingTaskCount: sequenceByWorkflow[workflowId].length,
          displaySteps: sequenceByWorkflow[workflowId],
        }
      );
    }

    await execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance fails when display steps drift", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-display-fail-"));

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
        displaySteps: sequenceByWorkflow.feature.filter((step) => step !== "spec"),
      }
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /Display-steps drift detected/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance enforces spec before implementation planning", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-spec-order-fail-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });

    const workflowsJson = makeWorkflowJson();
    workflowsJson.workflows["workflow-feature"].sequence = [
      "scout",
      "investigate",
      "plan",
      "spec",
      "spec [mode=tests]",
      "review-artifact --type=spec-tests",
      "cook",
      "integration-test",
      "integration-test-review",
      "integration-test-verify",
      "spec [mode=sync]",
      "workflow-review-changes",
      "docs-update",
      "workflow-end",
    ];

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      `${JSON.stringify(workflowsJson, null, 2)}\n`,
      "utf8"
    );

    for (const workflowId of workflowIds) {
      const steps =
        workflowId === "feature"
          ? workflowsJson.workflows["workflow-feature"].sequence
          : sequenceByWorkflow[workflowId];
      await writeSkillFile(
        path.join(tempRoot, ".claude", "skills"),
        workflowId,
        steps.map((step) => `/${toSkillStepToken(step)}`).join(" -> ")
      );
      await writeSkillFile(
        path.join(tempRoot, ".agents", "skills"),
        workflowId,
        steps.map((step) => `$${toSkillStepToken(step)}`).join(" -> ")
      );
    }

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /canonical Feature Spec step must run before the first implementation plan/
    );
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

test("checkGoalContractSkillCompliance accepts marker or active-goal wording, fails when both absent", () => {
  assert.deepEqual(
    checkGoalContractSkillCompliance("cook", "<!-- SYNC:goal-contract-satisfaction-loop:reminder -->"),
    []
  );
  assert.deepEqual(
    checkGoalContractSkillCompliance("cook", "Resolve the active goal before implementing."),
    []
  );

  const failures = checkGoalContractSkillCompliance("cook", "Implement the feature with tests.");
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Goal-contract violation \(cook\): missing active-goal lifecycle marker/);
});

test("checkGoalContractSkillCompliance requires Goal Satisfaction wording on review/workflow surfaces", () => {
  const markerOnly = "<!-- SYNC:goal-contract-satisfaction-loop:reminder -->";
  const failures = checkGoalContractSkillCompliance("review-changes", markerOnly, {
    requireSatisfaction: true,
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /missing 'Goal Satisfaction' wording/);

  assert.deepEqual(
    checkGoalContractSkillCompliance(
      "review-changes",
      `${markerOnly}\nEmit the Goal Satisfaction matrix before PASS.`,
      { requireSatisfaction: true }
    ),
    []
  );
});

test("checkGoalContractFileLifecycle validates a full goal-contract lifecycle", () => {
  const validGoalFile = [
    "# Goal Contract",
    "",
    "## Original Request",
    "Implement the goal contract satisfaction loop.",
    "",
    "## Purpose",
    "Persist the user goal so loops converge on saved criteria.",
    "",
    "## Success Criteria",
    "- [ ] (required) Verifier checks goal-contract markers",
    "",
    "## Constraints",
    "- No new packages",
    "",
    "## Evidence Required",
    "- Verifier + node:test output",
    "",
    "## Iteration Log",
    "### Iteration 1",
    "- Result: verifier extended",
    "",
    "## Goal Satisfaction",
    "| Success Criterion | Evidence | Status |",
    "| --- | --- | --- |",
    "| Verifier checks markers | tests pass | PASS |",
    "",
    "**Overall:** PASS",
  ].join("\n");

  assert.deepEqual(checkGoalContractFileLifecycle(validGoalFile), []);

  const missingSection = validGoalFile.replace("## Iteration Log", "## Other");
  assert.ok(
    checkGoalContractFileLifecycle(missingSection).some((f) =>
      /missing required section 'Iteration Log'/.test(f)
    )
  );

  const missingMatrix = validGoalFile.replace(
    "| Success Criterion | Evidence | Status |",
    "| Criterion | Proof | State |"
  );
  assert.ok(
    checkGoalContractFileLifecycle(missingMatrix).some((f) =>
      /missing Goal Satisfaction matrix header/.test(f)
    )
  );

  const blockedWithoutEscalation = validGoalFile
    .replaceAll("PASS", "BLOCKED")
    .replace("**Overall:** BLOCKED", "**Overall:** BLOCKED — env unavailable");
  assert.ok(
    checkGoalContractFileLifecycle(blockedWithoutEscalation).some((f) =>
      /BLOCKED status requires a user-facing escalation reason/.test(f)
    )
  );

  const blockedWithEscalation = `${blockedWithoutEscalation}\nEscalation: needs user decision on env access.`;
  assert.deepEqual(checkGoalContractFileLifecycle(blockedWithEscalation), []);
});

test("verify-workflow-cycle-compliance fails when a goal-contract skill lacks the lifecycle marker", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-goal-marker-fail-"));

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
      "bugfix",
      buildSkillStepLine("bugfix"),
      { goalMarker: false, goalSatisfaction: false }
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /Goal-contract violation \(workflow-bugfix\): missing active-goal lifecycle marker/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance fails when a workflow surface lacks Goal Satisfaction wording", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-goal-satisfaction-fail-"));

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
      { goalSatisfaction: false }
    );

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /Goal-contract violation \(workflow-feature\): missing 'Goal Satisfaction' wording/
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
