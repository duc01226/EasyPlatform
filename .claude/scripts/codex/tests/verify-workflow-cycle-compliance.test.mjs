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
const readWorkflowEntryScript = path.join(
  repoRoot,
  ".claude",
  "scripts",
  "codex",
  "read-workflow-entry.mjs"
);
const {
  checkWorkflowDebuggerTracePolicy,
  checkGoalContractSkillCompliance,
  checkGoalContractFileLifecycle,
  checkReviewChangesInlineExecutionPolicy,
  checkStartWorkflowPreActionPolicy,
} = await import(pathToFileURL(verifyScript).href);

const workflowIds = [
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "spec-sync",
];
const DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT = [
  "DOMAIN-ENTITY REFERENCE REFRESH (CONDITIONAL TERMINAL STEP):",
  "After /test and before /docs-update, run /scan --target=domain-entities when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in docs/project-reference/domain-entities-reference.md.",
  "Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope.",
].join("\n");

const sequenceByWorkflow = {
  "big-feature": [
    "plan",
    "spec",
    "spec [mode=tests]",
    "artifact-review --type=spec-tests",
    "feature-implement",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "test",
    "scan --target=domain-entities",
    "docs-update",
    "workflow-end",
  ],
  bugfix: [
    "scout",
    "investigate",
    "spec [mode=amend]",
    "plan",
    "spec [mode=tests]",
    "artifact-review --type=spec-tests",
    "fix",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "test",
    "scan --target=domain-entities",
    "docs-update",
    "workflow-end",
  ],
  feature: [
    "scout",
    "investigate",
    "spec",
    "plan",
    "spec [mode=tests]",
    "artifact-review --type=spec-tests",
    "feature-implement",
    "integration-test",
    "integration-test-review",
    "integration-test-verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "test",
    "scan --target=domain-entities",
    "docs-update",
    "workflow-end",
  ],
  "full-feature-lifecycle": [
    "spec",
    "plan",
    "spec [mode=tests]",
    "artifact-review --type=spec-tests",
    "feature-implement",
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
    "artifact-review --type=spec-tests",
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
      sequence: [...sequenceByWorkflow[workflowId]],
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

  for (const workflowId of ["big-feature", "bugfix", "feature"]) {
    const workflow = workflows[`workflow-${workflowId}`];
    workflow.preActions ??= {};
    workflow.preActions.injectContext = [
      workflow.preActions.injectContext,
      DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return {
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

test("verify-workflow-cycle-compliance accepts the domain refresh for delivery workflows and excludes non-delivery workflows", async () => {
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

test("verify-workflow-cycle-compliance enforces terminal domain-entity reference refresh policy", async () => {
  const cases = [
    {
      name: "missing scan",
      mutate(workflowsJson) {
        workflowsJson.workflows["workflow-bugfix"].sequence = workflowsJson.workflows[
          "workflow-bugfix"
        ].sequence.filter((step) => step !== "scan --target=domain-entities");
      },
      expected: /requires exactly one terminal domain-entity reference refresh/,
    },
    {
      name: "reordered scan",
      mutate(workflowsJson) {
        const sequence = workflowsJson.workflows["workflow-feature"].sequence;
        const scanIndex = sequence.indexOf("scan --target=domain-entities");
        sequence.splice(scanIndex, 1);
        sequence.splice(sequence.indexOf("test"), 0, "scan --target=domain-entities");
      },
      expected: /missing terminal domain-entity reference refresh/,
    },
    {
      name: "duplicate scan",
      mutate(workflowsJson) {
        workflowsJson.workflows["workflow-feature"].sequence.splice(
          0,
          0,
          "scan --target=domain-entities"
        );
      },
      expected: /requires exactly one terminal domain-entity reference refresh/,
    },
    {
      name: "unconditional context",
      mutate(workflowsJson) {
        workflowsJson.workflows["workflow-big-feature"].preActions.injectContext =
          "After /test and before /docs-update, run /scan --target=domain-entities for every final diff, including entity/model, DTO/data contract, persistence schema/migration, and entity-sync evidence. Record a cited skip reason for changes outside scope.";
      },
      expected: /missing conditional domain-entity reference refresh context term\(s\)/,
    },
  ];

  for (const policyCase of cases) {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), `codex-verify-domain-entity-${policyCase.name.replaceAll(" ", "-")}-`)
    );

    try {
      await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
      await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });

      const workflowsJson = makeWorkflowJson();
      policyCase.mutate(workflowsJson);
      await fs.writeFile(
        path.join(tempRoot, ".claude", "workflows.json"),
        `${JSON.stringify(workflowsJson, null, 2)}\n`,
        "utf8"
      );

      for (const workflowId of workflowIds) {
        const steps = workflowsJson.workflows[`workflow-${workflowId}`].sequence;
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
        policyCase.expected,
        policyCase.name
      );
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
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
      "$scout -> $investigate -> $unknown-step -> $workflow-end"
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
      "artifact-review --type=spec-tests",
      "feature-implement",
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
    checkGoalContractSkillCompliance("feature-implement", "<!-- SYNC:goal-contract-satisfaction-loop:reminder -->"),
    []
  );
  assert.deepEqual(
    checkGoalContractSkillCompliance("feature-implement", "Resolve the active goal before implementing."),
    []
  );

  const failures = checkGoalContractSkillCompliance("feature-implement", "Implement the feature with tests.");
  assert.equal(failures.length, 1);
  assert.match(failures[0], /Goal-contract violation \(feature-implement\): missing active-goal lifecycle marker/);
});

test("checkGoalContractSkillCompliance requires Goal Satisfaction wording on review/workflow surfaces", () => {
  const markerOnly = "<!-- SYNC:goal-contract-satisfaction-loop:reminder -->";
  const failures = checkGoalContractSkillCompliance("changes-review", markerOnly, {
    requireSatisfaction: true,
  });
  assert.equal(failures.length, 1);
  assert.match(failures[0], /missing 'Goal Satisfaction' wording/);

  assert.deepEqual(
    checkGoalContractSkillCompliance(
      "changes-review",
      `${markerOnly}\nEmit the Goal Satisfaction matrix before PASS.`,
      { requireSatisfaction: true }
    ),
    []
  );
});

test("checkReviewChangesInlineExecutionPolicy enforces inline-in-main-session, rejects sub-agent regression", () => {
  const wrcRel = ".claude/skills/workflow-review-changes/SKILL.md";
  const swfRel = ".claude/skills/start-workflow/SKILL.md";

  // PASS: workflow-review-changes SKILL declares inline-in-main-session, no obsolete mandate.
  assert.deepEqual(
    checkReviewChangesInlineExecutionPolicy(
      wrcRel,
      "[WORKFLOW-IN-WORKFLOW: MUST RUN INLINE IN THE MAIN SESSION — never as a sub-agent] ..."
    ),
    []
  );

  // FAIL: regression to the obsolete 'MUST RUN AS SUB-AGENT' whole-workflow mandate.
  const subagentRegression = checkReviewChangesInlineExecutionPolicy(
    wrcRel,
    "[WORKFLOW-IN-WORKFLOW: MUST RUN AS SUB-AGENT when inside another workflow] ..."
  );
  assert.ok(
    subagentRegression.some((f) => /MUST RUN AS SUB-AGENT/.test(f)),
    "expected the obsolete sub-agent mandate to be rejected"
  );
  // ...and it also lacks the required inline declaration, so the require check fails too.
  assert.ok(subagentRegression.some((f) => /missing inline-in-main-session execution mandate/.test(f)));

  // FAIL: start-workflow keeps the old code-reviewer sub-agent delegation row.
  const delegationRowRegression = checkReviewChangesInlineExecutionPolicy(
    swfRel,
    [
      "| Step | Workflow activated | Step count source | Agent type |",
      "| --- | --- | --- | --- |",
      "| `/workflow-review-changes` | `workflow-review-changes` | `len(...)` | `code-reviewer` |",
    ].join("\n")
  );
  assert.ok(
    delegationRowRegression.some((f) => /sub-agent delegation row/.test(f)),
    "expected the obsolete code-reviewer delegation row to be rejected"
  );

  // PASS: start-workflow declares the inline exception for workflow-review-changes.
  assert.deepEqual(
    checkReviewChangesInlineExecutionPolicy(
      swfRel,
      "EXCEPTION — `workflow-review-changes` runs INLINE in the main session (never a sub-agent)."
    ),
    []
  );

  // Unknown surface ⇒ no-op (no false positives on unrelated files).
  assert.deepEqual(checkReviewChangesInlineExecutionPolicy("some/other/file.md", "anything"), []);
});

test("checkStartWorkflowPreActionPolicy requires canonical pre-actions before TaskCreate", () => {
  const rel = ".claude/skills/start-workflow/SKILL.md";
  const compliant = [
    "Tier 2 is required before TaskCreate only for workflow-big-feature, workflow-bugfix, and workflow-feature.",
    "Use a JSON-aware complete canonical entry read.",
    "Read preActions.injectContext from the selected entry.",
    "The static catalog is a route-selection aid.",
    "Use the exact canonical run condition and evidence-backed skip transition.",
    "Search for the exact workflow ID.",
    "Do NOT parse a static catalog sequence for TaskCreate.",
    "Invoke each with the active host's command syntax.",
    "A conditionally skipped task may complete without invoking its Skill tool.",
  ].join("\n");

  assert.deepEqual(checkStartWorkflowPreActionPolicy(rel, compliant), []);

  const failures = checkStartWorkflowPreActionPolicy(
    rel,
    "Tier 1 alone creates tasks from the static catalog."
  );
  assert.equal(failures.length, 10);
  assert.ok(failures.some((failure) => /Tier-2 canonical entry read/.test(failure)));
  assert.ok(failures.some((failure) => /conditional task run\/skip propagation/.test(failure)));

  const bypassFailures = checkStartWorkflowPreActionPolicy(
    rel,
    `${compliant}\nALWAYS try tiers in order — stop at first success.\nuse Tier 2 when the workflow may declare \`parallelGroups\``
  );
  assert.ok(bypassFailures.some((failure) => /stop-at-first-success tier fallback/.test(failure)));
  assert.ok(bypassFailures.some((failure) => /parallel-groups-only Tier-2 condition/.test(failure)));

  const placeholderFailures = checkStartWorkflowPreActionPolicy(
    rel,
    `${compliant}\nParse: sequence → invoke each as \`/<stepId>\``
  );
  assert.ok(placeholderFailures.some((failure) => /Claude-only generic step placeholder/.test(failure)));

  const extractionFailures = checkStartWorkflowPreActionPolicy(
    rel,
    `${compliant}\nGrep: pattern='"<workflowId>":' context=35\nTaskCreate: activeForm="Executing /{step-name}"`
  );
  assert.ok(extractionFailures.some((failure) => /fixed-context workflow extraction/.test(failure)));
  assert.ok(extractionFailures.some((failure) => /slash-form task activity template/.test(failure)));

  const scopeFailures = checkStartWorkflowPreActionPolicy(
    rel,
    `${compliant}\nTier 2 is required before every standard-workflow TaskCreate.`
  );
  assert.ok(scopeFailures.some((failure) => /all-standard-workflow Tier-2 expansion/.test(failure)));

  assert.deepEqual(checkStartWorkflowPreActionPolicy("some/other/file.md", compliant), []);
});

test("read-workflow-entry returns the complete Big Feature entry through its terminal refresh", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    readWorkflowEntryScript,
    "workflow-big-feature",
  ]);
  const workflow = JSON.parse(stdout);
  const scanIndex = workflow.sequence.indexOf("scan --target=domain-entities");

  assert.ok(scanIndex > 0, "expected Big Feature entry to include the domain-entity scan");
  assert.equal(workflow.sequence[scanIndex - 1], "test");
  assert.equal(workflow.sequence[scanIndex + 1], "docs-update");
  assert.match(workflow.preActions.injectContext, /DOMAIN-ENTITY REFERENCE REFRESH/);
});

test("read-workflow-entry rejects an unknown workflow ID", async () => {
  for (const workflowId of ["workflow-does-not-exist", "__proto__", "constructor", "toString"]) {
    await assert.rejects(
      execFileAsync(process.execPath, [readWorkflowEntryScript, workflowId]),
      new RegExp(`Unknown workflow ID: ${workflowId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
    );
  }
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
