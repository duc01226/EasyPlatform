import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const { renderWorkflowSkillContract, updateWorkflowSkillContract } = require("../../lib/workflow-skill-contract.cjs");
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
  isCanonicalSpecStep,
  checkGoalContractSkillCompliance,
  GOAL_CONTRACT_SKILL_IDS,
  GOAL_CONTRACT_REVIEW_SKILL_IDS,
  GOAL_CONTRACT_REVIEW_REFERENCE_PATHS,
  GOAL_CONTRACT_ENTRY_REFERENCE_PATHS,
  GOAL_CONTRACT_WORKFLOW_SKILL_IDS,
  IMPLEMENTATION_STEPS,
  checkGoalContractFileLifecycle,
  checkReviewChangesInlineExecutionPolicy,
  checkStartWorkflowPreActionPolicy,
  checkWorkflowInjectContextCoverage,
  resolveWorkflowManifestsForVerification,
  resolveCompatibilityWorkflowManifest,
  checkWorkflowWrapperStepContract,
  checkResolvedParallelGroupsStructure,
  checkParallelGroupsMirrorParity,
  runtimeCatalogForm,
  RUNTIME_CATALOG_FORMS,
  ensureWorkflowPolicy,
} = await import(pathToFileURL(verifyScript).href);

const workflowIds = [
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "spec-sync",
];

test('missing step skills require an explicit fixture override', async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cycle-missing-skills-'));
  const doc = { workflows: { fixture: { sequence: ['inspect'], preActions: { injectContext: 'fixture' } } } };
  try {
    assert.throws(() => resolveWorkflowManifestsForVerification(doc, 'fixture', { rootDir }), /Missing skill.*inspect/);
    assert.throws(() => resolveWorkflowManifestsForVerification(doc, 'fixture', { rootDir, availableSkills: [] }), /Missing skill.*inspect/);
    assert.equal(resolveWorkflowManifestsForVerification(doc, 'fixture', { rootDir, availableSkills: ['inspect'] })[0].occurrences[0].skill, 'inspect');
    await fs.mkdir(path.join(rootDir, '.claude', 'skills', 'inspect'), { recursive: true });
    await fs.writeFile(path.join(rootDir, '.claude', 'skills', 'inspect', 'SKILL.md'), '# Inspect');
    assert.equal(resolveWorkflowManifestsForVerification(doc, 'fixture', { rootDir })[0].occurrences[0].skill, 'inspect');
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test('implicit declared-skill override mutation fails the missing-skill oracle', async () => {
  const source = await fs.readFile(verifyScript, 'utf8');
  const guard = '...(availableSkills !== undefined ? { availableSkills: new Set(availableSkills) } : {})';
  assert.equal(source.split(guard).length, 2, 'mutation anchor must be unique');
  const mutated = source.replace(guard, '...{ availableSkills: new Set(availableSkills ?? ["inspect"]) }')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(verifyScript).href));
  const verifier = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString('base64')}`);
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cycle-implicit-mutant-'));
  const doc = { workflows: { fixture: { sequence: ['inspect'], preActions: { injectContext: 'fixture' } } } };
  try {
    const oracle = resolve => assert.throws(() => resolve(doc, 'fixture', { rootDir }), /Missing skill.*inspect/);
    oracle(resolveWorkflowManifestsForVerification);
    assert.throws(() => oracle(verifier.resolveWorkflowManifestsForVerification), assert.AssertionError);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});
const DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT = [
  "DOMAIN-ENTITY REFERENCE REFRESH (CONDITIONAL TERMINAL STEP):",
  "After /test and before /docs-manager --mode=update, run /scan --target=domain-entities when the final diff changes an entity/model, DTO/data contract, persistence schema/migration, or entity-sync evidence represented in docs/project-reference/domain-entities-reference.md.",
  "Otherwise mark the scan step completed with a cited skip reason naming the changed files and why they are outside this scope.",
].join("\n");

const sequenceByWorkflow = {
  "big-feature": [
    "plan",
    "spec",
    "spec [mode=tests]",
    "work-item --mode=review --type=spec-tests",
    "feature-implement",
    "integration-test",
    "integration-test --mode=review",
    "integration-test --mode=verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "test",
    "scan --target=domain-entities",
    "docs-manager --mode=update",
    "workflow-end",
  ],
  bugfix: [
    "investigate",
    "spec [mode=amend]",
    "plan",
    "spec [mode=tests]",
    "work-item --mode=review --type=spec-tests",
    "fix",
    "integration-test",
    "integration-test --mode=review",
    "integration-test --mode=verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "test",
    "scan --target=domain-entities",
    "docs-manager --mode=update",
    "workflow-end",
  ],
  feature: [
    "investigate",
    "spec",
    "plan",
    "spec [mode=tests]",
    "work-item --mode=review --type=spec-tests",
    "feature-implement",
    "integration-test",
    "integration-test --mode=review",
    "integration-test --mode=verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "test",
    "scan --target=domain-entities",
    "docs-manager --mode=update",
    "workflow-end",
  ],
  "full-feature-lifecycle": [
    "spec",
    "plan",
    "spec [mode=tests]",
    "work-item --mode=review --type=spec-tests",
    "feature-implement",
    "integration-test",
    "integration-test --mode=review",
    "integration-test --mode=verify",
    "spec [mode=sync]",
    "workflow-review-changes",
    "docs-manager --mode=update",
    "workflow-end",
  ],
  "spec-sync": [
    "workflow-review-changes",
    "spec [mode=tests]",
    "work-item --mode=review --type=spec-tests",
    "spec [mode=sync]",
    "integration-test",
    "integration-test --mode=review",
    "integration-test --mode=verify",
    "docs-manager --mode=update",
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

  for (const workflowId of workflowIds) {
    const workflow = workflows[`workflow-${workflowId}`];
    workflow.preActions ??= {};
    workflow.preActions.injectContext ??= `Canonical context for ${workflowId}.`;
    workflow.preActions.readFiles = [`.claude/skills/workflow-${workflowId}/SKILL.md`];
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
  // Process fixtures must materialize their step skills just like a real checkout.
  for (const step of sequenceByWorkflow[workflowId] ?? []) {
    const skill = step.split(/\s+/, 1)[0];
    const skillDir = path.join(root, skill);
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), [
      '---', `name: ${skill}`, 'description: fixture', '---',
      '<!-- SYNC:goal-contract-satisfaction-loop:reminder -->',
      'Resolve the active Goal Contract before work. Emit the Goal Satisfaction matrix before PASS.',
      '[WORKFLOW-IN-WORKFLOW: MUST RUN INLINE IN THE MAIN SESSION — never as a sub-agent]',
    ].join('\n'), 'utf8');
    // A real checkout ships the mode references that carry a skill's goal-contract lifecycle beside its SKILL.md
    // (the verifier fails when the owner skill ships without them).
    for (const rel of [...GOAL_CONTRACT_REVIEW_REFERENCE_PATHS, ...GOAL_CONTRACT_ENTRY_REFERENCE_PATHS]) {
      const [owner, ...rest] = rel.replace(/^\.claude\/skills\//, '').split('/');
      if (owner !== skill) continue;
      await fs.mkdir(path.join(skillDir, ...rest.slice(0, -1)), { recursive: true });
      await fs.writeFile(path.join(skillDir, ...rest), 'Resolve the active Goal Contract before work. Emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS.\n', 'utf8');
    }
  }
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

  const document = JSON.parse(await fs.readFile(path.join(root, "..", "..", ".claude", "workflows.json"), "utf8"));
  const id = `workflow-${workflowId}`;
  const availableSkills = Object.values(document.workflows).flatMap(entry => entry.sequence ?? [])
    .map(step => typeof step === "string" ? step.split(/\s+/, 1)[0] : step.skill);
  const manifests = resolveWorkflowManifestsForVerification(document, id, { availableSkills });
  const contract = renderWorkflowSkillContract(id, manifests, { dialect: root.includes(".agents") ? "$" : "/" });
  await fs.writeFile(path.join(targetDir, "SKILL.md"), updateWorkflowSkillContract(content.join("\n"), contract), "utf8");
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

test("verify-workflow-cycle-compliance accepts delegation of review/docs/refresh to nested workflow-review-changes", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-delegated-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });

    const workflowsJson = makeWorkflowJson();
    const delegatedRemovals = ["integration-test --mode=review", "scan --target=domain-entities", "docs-manager --mode=update"];
    for (const workflowId of workflowIds) {
      const entry = workflowsJson.workflows[`workflow-${workflowId}`];
      // A parent may only delegate docs-manager --mode=update while the nested review observes the settled docs
      // state. When a canonical spec step still runs AFTER the nested review, that mutation lands
      // after the nested docs-manager --mode=update, so the parent owes its own terminal docs-manager --mode=update and may not
      // drop it (see the rejection case in the sibling test).
      const nestedIndex = entry.sequence.indexOf("workflow-review-changes");
      const integrationIndex = entry.sequence.indexOf("integration-test");
      // A nested review stands in for `integration-test --mode=review` ONLY when it runs AFTER the
      // integration test it reviews. A workflow whose nested review precedes `integration-test`
      // (e.g. the spec-sync shape) must keep its own `integration-test --mode=review` step.
      const nestedAfterIntegration =
        nestedIndex >= 0 && integrationIndex >= 0 && nestedIndex > integrationIndex;
      const specAfterNested =
        nestedIndex >= 0 &&
        entry.sequence
          .slice(nestedIndex + 1)
          .some((step) => isCanonicalSpecStep(step));
      let removals = specAfterNested
        ? delegatedRemovals.filter((step) => step !== "docs-manager --mode=update")
        : delegatedRemovals;
      if (!nestedAfterIntegration) {
        removals = removals.filter((step) => step !== "integration-test --mode=review");
      }
      entry.sequence = entry.sequence.filter((step) => !removals.includes(step));
    }

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      `${JSON.stringify(workflowsJson, null, 2)}\n`,
      "utf8"
    );

    for (const workflowId of workflowIds) {
      const steps = workflowsJson.workflows[`workflow-${workflowId}`].sequence;
      const build = (prefix) => steps.map((step) => `${prefix}${toSkillStepToken(step)}`).join(" -> ");
      await writeSkillFile(path.join(tempRoot, ".claude", "skills"), workflowId, build("/"));
      await writeSkillFile(path.join(tempRoot, ".agents", "skills"), workflowId, build("$"));
    }

    // Only a parent that runs the nested workflow-review-changes may drop the duplicated
    // integration-test --mode=review / terminal scan / docs-manager --mode=update steps and still pass.
    await execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance rejects docs delegation that lands before a later spec mutation", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-cycle-docs-order-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });

    const workflowsJson = makeWorkflowJson();
    // A review-first shape (spec-sync's order before its verify-last reorder): `workflow-review-changes` runs FIRST and canonical spec steps mutate
    // afterwards, so the nested docs-manager --mode=update cannot satisfy this workflow's closure — the parent must
    // keep its own terminal docs-manager --mode=update. Dropping it must fail the gate.
    const removals = ["integration-test --mode=review", "scan --target=domain-entities", "docs-manager --mode=update"];
    workflowsJson.workflows["workflow-spec-sync"].sequence = workflowsJson.workflows[
      "workflow-spec-sync"
    ].sequence.filter((step) => !removals.includes(step));

    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      `${JSON.stringify(workflowsJson, null, 2)}\n`,
      "utf8"
    );

    for (const workflowId of workflowIds) {
      const steps = workflowsJson.workflows[`workflow-${workflowId}`].sequence;
      const build = (prefix) => steps.map((step) => `${prefix}${toSkillStepToken(step)}`).join(" -> ");
      await writeSkillFile(path.join(tempRoot, ".claude", "skills"), workflowId, build("/"));
      await writeSkillFile(path.join(tempRoot, ".agents", "skills"), workflowId, build("$"));
    }

    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      /missing ordered closure docs-manager --mode=update -> workflow-end/,
      "docs delegation is invalid when canonical spec steps still run after the nested review"
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance enforces terminal domain-entity reference refresh policy for non-delegating workflows", async () => {
  const cases = [
    {
      name: "missing scan",
      mutate(workflowsJson) {
        const sequence = workflowsJson.workflows["workflow-bugfix"].sequence;
        workflowsJson.workflows["workflow-bugfix"].sequence = sequence.filter(
          (step) => step !== "scan --target=domain-entities" && step !== "workflow-review-changes"
        );
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
        workflowsJson.workflows["workflow-feature"].sequence = sequence.filter(
          (step) => step !== "workflow-review-changes"
        );
      },
      expected: /missing terminal domain-entity reference refresh/,
    },
    {
      name: "duplicate scan",
      mutate(workflowsJson) {
        const sequence = workflowsJson.workflows["workflow-feature"].sequence;
        sequence.splice(0, 0, "scan --target=domain-entities");
        workflowsJson.workflows["workflow-feature"].sequence = sequence.filter(
          (step) => step !== "workflow-review-changes"
        );
      },
      expected: /requires exactly one terminal domain-entity reference refresh/,
    },
    {
      name: "unconditional context",
      mutate(workflowsJson) {
        workflowsJson.workflows["workflow-big-feature"].preActions.injectContext =
          "After /test and before /docs-manager --mode=update, run /scan --target=domain-entities for every final diff, including entity/model, DTO/data contract, persistence schema/migration, and entity-sync evidence. Record a cited skip reason for changes outside scope.";
        workflowsJson.workflows["workflow-big-feature"].sequence = workflowsJson.workflows[
          "workflow-big-feature"
        ].sequence.filter((step) => step !== "workflow-review-changes");
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
      "$investigate -> $unknown-step -> $workflow-end"
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
      "investigate",
      "plan",
      "spec",
      "spec [mode=tests]",
      "work-item --mode=review --type=spec-tests",
      "feature-implement",
      "integration-test",
      "integration-test --mode=review",
      "integration-test --mode=verify",
      "spec [mode=sync]",
      "workflow-review-changes",
      "docs-manager --mode=update",
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

test("goal-contract coverage follows the plan review and execute modes into their reference files", () => {
  // Given the merged plan skill keeps its review and execute bodies in references, not in SKILL.md files
  // Then the review reference must emit Goal Satisfaction and the execute reference must resolve the goal
  assert.deepEqual(GOAL_CONTRACT_REVIEW_REFERENCE_PATHS, [".claude/skills/plan/references/mode-review.md", ".claude/skills/integration-test/references/mode-verify.md"]);
  // And the integration-test verification evidence feeds the Goal Satisfaction matrix from its mode reference
  assert.ok(!GOAL_CONTRACT_WORKFLOW_SKILL_IDS.includes(["integration-test", "verify"].join("-")), "the retired verify skill id is not a goal-contract skill");
  assert.deepEqual(GOAL_CONTRACT_ENTRY_REFERENCE_PATHS, [".claude/skills/plan/references/mode-execute.md"]);
  // And no removed skill id lingers in the skill-id lists (an absent skill would silently skip its check)
  const removed = ["review", "validate", "execute"].map((tail) => `plan-${tail}`);
  for (const id of [...GOAL_CONTRACT_SKILL_IDS, ...GOAL_CONTRACT_REVIEW_SKILL_IDS]) {
    assert.ok(!removed.includes(id), `${id} no longer exists as a skill`);
  }
  // And a review reference without the matrix, or an execute reference without the goal, fails the check
  assert.match(
    checkGoalContractSkillCompliance(GOAL_CONTRACT_REVIEW_REFERENCE_PATHS[0], "Resolve the active Goal Contract.", { requireSatisfaction: true })[0],
    /missing 'Goal Satisfaction' wording/
  );
  assert.match(
    checkGoalContractSkillCompliance(GOAL_CONTRACT_ENTRY_REFERENCE_PATHS[0], "Implement the phase.", { requireSatisfaction: false })[0],
    /missing active-goal lifecycle marker/
  );
});

test("the implementation-step policy recognizes the plan execute mode by invocation, not by the bare plan skill", () => {
  assert.ok(IMPLEMENTATION_STEPS.has("plan --mode=execute"));
  assert.ok(!IMPLEMENTATION_STEPS.has("plan"), "a planning-only plan step is not an implementation step");
  assert.ok(!IMPLEMENTATION_STEPS.has("plan --mode=review"));
  const failures = [];
  ensureWorkflowPolicy("workflow-feature", { preActions: { injectContext: "" } }, ["investigate", "plan", "plan --mode=validate", "test", "workflow-end"], failures);
  assert.ok(failures.some((line) => /missing implementation step \(feature-implement\|fix\|plan --mode=execute\)/.test(line)), failures.join("\n"));
  const withExecute = [];
  ensureWorkflowPolicy("workflow-feature", { preActions: { injectContext: "" } }, ["investigate", "plan", "plan --mode=execute", "test", "workflow-end"], withExecute);
  assert.ok(!withExecute.some((line) => /missing implementation step/.test(line)), withExecute.join("\n"));
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
    "Tier 2 is required before TaskCreate for every standard workflow.",
    "The complete entry has non-empty preActions.injectContext.",
    "Use a JSON-aware complete canonical entry read.",
    "Read preActions.injectContext from the selected entry.",
    "The runtime catalog is for route selection only.",
    "Use the exact canonical run condition and evidence-backed skip transition.",
    "Search for the exact workflow ID.",
    "Do NOT parse the runtime catalog sequence for TaskCreate.",
    "Invoke each with the active host's command syntax.",
    "A conditionally skipped task may complete without invoking its Skill tool.",
  ].join("\n");

  assert.deepEqual(checkStartWorkflowPreActionPolicy(rel, compliant), []);

  // Intent: conditional skips remain explicit on every host, without requiring a Claude tool.
  // Given the canonical pre-action contract; when completion uses host-neutral wording.
  const nativeException = "A skipped or merged task, including a conditionally skipped task, completes without skill execution only after both the comment and the deviation-log line.";
  const nativeCompliant = compliant.replace(
    "A conditionally skipped task may complete without invoking its Skill tool.",
    nativeException
  );
  // Then both host-native and legacy instructions are accepted, but omitting the exception fails.
  assert.deepEqual(checkStartWorkflowPreActionPolicy(rel, nativeCompliant), []);
  const missingException = checkStartWorkflowPreActionPolicy(rel, nativeCompliant.replace(nativeException, ""));
  assert.equal(missingException.length, 1);
  assert.match(missingException[0], /conditional completion exception/);

  const failures = checkStartWorkflowPreActionPolicy(
    rel,
    "Tier 1 alone creates tasks from a route summary."
  );
  assert.equal(failures.length, 11);
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
  assert.deepEqual(scopeFailures, []);

  assert.deepEqual(checkStartWorkflowPreActionPolicy("some/other/file.md", compliant), []);
});

test("checkWorkflowInjectContextCoverage requires context for every executable workflow", () => {
  assert.deepEqual(
    checkWorkflowInjectContextCoverage({
      "workflow-ok": {
        sequence: ["step"],
        preActions: { injectContext: "Canonical context." },
      },
    }),
    []
  );

  const failures = checkWorkflowInjectContextCoverage({
    "workflow-missing": { sequence: ["step"], preActions: {} },
    "workflow-blank": { sequence: ["step"], preActions: { injectContext: "  " } },
  });
  assert.equal(failures.length, 2);
  assert.ok(failures.every((failure) => /required non-empty preActions\.injectContext/.test(failure)));
});

test("cycle verifier resolves every declared mode into stable occurrences and barriers", () => {
  const doc = {
    version: "fixture-1",
    workflows: {
      "workflow-variant": {
        name: "Variant fixture",
        preActions: { injectContext: "Canonical fixture context." },
        defaultMode: "update",
        variants: {
          update: {
            sequence: [
              { id: "inspect", skill: "inspect" },
              { id: "review", skill: "review", args: "--mode=all", applicability: { when: "target exists", skipReason: "No target" } },
              { id: "finish", skill: "workflow-end" },
            ],
            parallelGroups: [
              { id: "reviews", members: ["inspect", "review"], conditionalMembers: ["review"], barrier: true },
            ],
          },
          audit: {
            sequence: [
              { id: "audit", skill: "inspect", args: "--audit" },
              { id: "finish-audit", skill: "workflow-end" },
            ],
          },
        },
      },
    },
  };
  const manifests = resolveWorkflowManifestsForVerification(doc, "workflow-variant", {
    availableSkills: ["inspect", "review", "workflow-end"],
  });
  assert.deepEqual(manifests.map((manifest) => manifest.mode), ["update", "audit"]);
  assert.deepEqual(manifests[0].occurrences.map((occurrence) => occurrence.id), ["inspect", "review", "finish"]);
  assert.equal(manifests[0].fingerprint.length, 64);
  assert.deepEqual(checkResolvedParallelGroupsStructure("workflow-variant", manifests[0], [], { mode: "update" }), []);
  assert.throws(
    () => resolveWorkflowManifestsForVerification(doc, "workflow-variant", { mode: "ghost", availableSkills: ["inspect", "review", "workflow-end"] }),
    /Unknown workflow mode/
  );
});

test("cycle verifier rejects repeated explicit occurrence IDs instead of collapsing tasks", () => {
  const doc = {
    version: "fixture-duplicate",
    workflows: {
      "workflow-variant": {
        preActions: { injectContext: "Canonical fixture context." },
        defaultMode: "default",
        variants: {
          default: {
            sequence: [
              { id: "same", skill: "inspect" },
              { id: "same", skill: "review" },
            ],
          },
        },
      },
    },
  };
  assert.throws(
    () => resolveWorkflowManifestsForVerification(doc, "workflow-variant", { availableSkills: ["inspect", "review"] }),
    /Duplicate occurrence ID/
  );
});

test("read-workflow-entry returns the complete Big Feature entry through its terminal review", async () => {
  const { stdout } = await execFileAsync(process.execPath, [
    readWorkflowEntryScript,
    "workflow-big-feature",
  ]);
  const workflow = JSON.parse(stdout);

  // Big Feature delegates the reviewer + terminal docs refresh to the nested
  // workflow-review-changes, so its own sequence must NOT duplicate those steps.
  assert.ok(
    workflow.sequence.some((step) => step.split(" ")[0] === "workflow-review-changes"),
    "Big Feature must route review through the nested workflow-review-changes"
  );
  assert.equal(workflow.sequence.includes("scan --target=domain-entities"), false);
  assert.equal(workflow.sequence.at(-2), "workflow-end");
  assert.equal(workflow.sequence.at(-1), "watzup");
  assert.doesNotMatch(workflow.preActions.injectContext, /DOMAIN-ENTITY REFERENCE REFRESH/);
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

// Business rule: a mode reference that carries a skill's goal-contract lifecycle is part of that skill. When the owner skill
// ships but the reference file is gone, the lifecycle can no longer be verified, so the verifier FAILS (a silent skip would
// let a deleted gate pass). The fixtures materialize those references beside each shipped owner skill (writeSkillFile).
test("verify-workflow-cycle-compliance fails when a goal-contract mode reference is missing while its owner skill ships", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "codex-verify-goal-reference-missing-"));

  try {
    await fs.mkdir(path.join(tempRoot, ".claude", "skills"), { recursive: true });
    await fs.mkdir(path.join(tempRoot, ".agents", "skills"), { recursive: true });
    await fs.writeFile(
      path.join(tempRoot, ".claude", "workflows.json"),
      `${JSON.stringify(makeWorkflowJson(), null, 2)}\n`,
      "utf8"
    );
    for (const workflowId of workflowIds) {
      await writeSkillFile(path.join(tempRoot, ".claude", "skills"), workflowId, buildSkillStepLine(workflowId));
      await writeSkillFile(path.join(tempRoot, ".agents", "skills"), workflowId, buildSkillStepLine(workflowId, { agents: true }));
    }
    const planRefs = path.join(tempRoot, ".claude", "skills", "plan", "references");
    const verifyRef = path.join(tempRoot, ".claude", "skills", "integration-test", "references", "mode-verify.md");
    await fs.access(path.join(planRefs, "mode-review.md"));
    await fs.access(verifyRef);

    // Control: owner skills shipped WITH their references pass.
    await execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot });

    // When the plan skill ships but its mode references are gone, then each missing reference is reported by name
    // and the owner whose reference still exists is not.
    await fs.rm(planRefs, { recursive: true, force: true });
    await assert.rejects(
      execFileAsync(process.execPath, [verifyScript], { cwd: tempRoot }),
      (error) => {
        const output = `${error.stdout ?? ""}${error.stderr ?? ""}${error.message ?? ""}`;
        assert.match(output, /Goal-contract violation \(\.claude\/skills\/plan\/references\/mode-review\.md\): the mode reference is missing although its owner skill 'plan' ships/);
        assert.match(output, /Goal-contract violation \(\.claude\/skills\/plan\/references\/mode-execute\.md\): the mode reference is missing although its owner skill 'plan' ships/);
        assert.doesNotMatch(output, /integration-test\/references\/mode-verify\.md/, 'a reference that still exists is not reported');
        return true;
      }
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

// ── W5 runtime-payload forms (barrier-mark parity only in the marked forms) ────────────────────
// Business rule: the compact catalog and the index with parallel-phase marks must show every
// grouped workflow's `[a ∥ b]` token, so a dropped mark fails; the tiers-only index and the
// pointer-only form omit marks by design (the hook falls back to them only to fit the output cap),
// so they must not fail parity. The advancement clause is required in every form. The fixture root
// carries a stub route delivery module whose payload each case writes, built with the real catalog builder.
const catalogLib = createRequire(import.meta.url)(
  path.join(repoRoot, ".claude", "scripts", "lib", "workflow-skills-catalog.cjs")
);
const W5_GROUP_TOKEN = "[review-a ∥ review-b]";
const W5_WORKFLOWS = {
  "workflow-grouped": {
    name: "Grouped",
    activation: "confirm",
    whenToUse: "review a change with parallel reviewers",
    preActions: { injectContext: "Use the selected workflow context." },
    sequence: ["investigate", "review-a", "review-b", "finish"],
    parallelGroups: [{ id: "reviews", members: ["review-a", "review-b"], barrier: true }],
  },
  "workflow-plain": {
    name: "Plain",
    whenToUse: "do one plain thing",
    preActions: { injectContext: "Use the selected workflow context." },
    sequence: ["investigate", "finish"],
  },
};
const W5_STUB_DELIVERY = [
  "'use strict';",
  "const fs = require('fs');",
  "const path = require('path');",
  "module.exports = { buildCatalogInjection: () => fs.readFileSync(path.join(__dirname, 'payload.txt'), 'utf8') };",
  "",
].join("\n");

/** Wrap a catalog body the way the route delivery module assembles its catalog output (the catalog markers, no gate). */
function w5Payload(catalog) {
  return ["<!-- CK:RUNTIME-WORKFLOW-CATALOG -->", catalog, "<!-- /CK:RUNTIME-WORKFLOW-CATALOG -->"].join("\n");
}

/**
 * Given a temp root with the fixture registry and a stub route delivery module, write the payload `build`
 * returns, then run the W5 runtime check against it. HOME and temp dirs point at the fixture.
 */
async function runW5(build) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "cycle-w5-form-"));
  const keys = ["HOME", "USERPROFILE", "TMPDIR", "TEMP", "TMP"];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) process.env[key] = rootDir;
    await fs.mkdir(path.join(rootDir, ".claude", "hooks", "lib"), { recursive: true });
    await fs.writeFile(
      path.join(rootDir, ".claude", "workflows.json"),
      JSON.stringify({ version: "1.0.0", workflows: W5_WORKFLOWS }),
      "utf8"
    );
    const payload = build(rootDir);
    await fs.writeFile(path.join(rootDir, ".claude", "hooks", "lib", "payload.txt"), payload, "utf8");
    await fs.writeFile(path.join(rootDir, ".claude", "hooks", "lib", "workflow-route-delivery.cjs"), W5_STUB_DELIVERY, "utf8");
    const failures = [];
    await checkParallelGroupsMirrorParity(W5_WORKFLOWS, rootDir, failures);
    return { payload, failures, form: runtimeCatalogForm(payload, rootDir) };
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    await fs.rm(rootDir, { recursive: true, force: true });
  }
}

const compactCatalog = (rootDir) =>
  catalogLib.buildWorkflowSkillsCatalog({ rootDir, sections: ["workflows", "skills"], compact: true, config: {} });
const pointerCatalog = (rows) => (rootDir) => catalogLib.buildWorkflowPointerCatalog({ rootDir, rows });
/** Remove the grouped workflow's barrier token from its row, asserting it was there first. */
const dropMark = (build) => (rootDir) => {
  const catalog = build(rootDir);
  assert.ok(catalog.includes(W5_GROUP_TOKEN), `precondition: the marked form renders ${W5_GROUP_TOKEN}`);
  return w5Payload(catalog.replace(W5_GROUP_TOKEN, ""));
};
const parityFailures = (failures) =>
  failures.filter((failure) => failure.startsWith("parallelGroups runtime parity (workflow-grouped)"));

test("W5 runtime parity passes intact marked forms and fails each one that drops a barrier mark", async () => {
  // Given the compact catalog and the index with parallel-phase marks, each rendered intact
  for (const [label, build, form] of [
    ["compact catalog", compactCatalog, RUNTIME_CATALOG_FORMS.CATALOG],
    ["index with marks", pointerCatalog("groups"), RUNTIME_CATALOG_FORMS.INDEX_MARKED],
  ]) {
    // When W5 checks the intact payload
    const intact = await runW5((rootDir) => w5Payload(build(rootDir)));
    // Then the form is recognised and nothing fails
    assert.equal(intact.form, form, `${label}: form`);
    assert.deepEqual(intact.failures, [], `${label}: intact payload must pass`);
    // When the grouped row loses its mark
    const dropped = await runW5(dropMark(build));
    // Then parity fails for that workflow
    assert.equal(
      parityFailures(dropped.failures).length,
      1,
      `${label}: a dropped mark must fail: ${JSON.stringify(dropped.failures)}`
    );
  }
});

test("W5 runtime parity skips the tiers-only index and the pointer-only form but still requires the advancement clause", async () => {
  // Given the tiers-only index: a row per workflow with no marks
  const tiers = await runW5((rootDir) => w5Payload(pointerCatalog("tiers")(rootDir)));
  assert.equal(tiers.form, RUNTIME_CATALOG_FORMS.INDEX_TIERS);
  assert.ok(tiers.payload.includes("| `workflow-grouped` | confirm |"), "precondition: the tiers row is rendered");
  assert.ok(!tiers.payload.includes("∥ review"), "precondition: the tiers-only index carries no marks");
  // Then W5 does not fail it on marks
  assert.deepEqual(tiers.failures, []);

  // Given the pointer-only form: no workflow rows
  const pointer = await runW5((rootDir) => w5Payload(pointerCatalog("none")(rootDir)));
  assert.equal(pointer.form, RUNTIME_CATALOG_FORMS.POINTER_ONLY);
  assert.ok(!pointer.payload.includes("| `workflow-grouped` |"), "precondition: no workflow rows");
  // Then W5 does not fail it on marks
  assert.deepEqual(pointer.failures, []);

  // Given a tiers-only index whose barrier legend lost the advancement clause
  const clauseless = await runW5((rootDir) =>
    w5Payload(pointerCatalog("tiers")(rootDir).replace(/advance only after ALL return/, "advance later"))
  );
  // Then the advancement-clause check still fails it
  assert.ok(
    clauseless.failures.some((failure) => failure.startsWith("parallelGroups runtime check: advancement clause")),
    JSON.stringify(clauseless.failures)
  );
});

// ── Compatibility preview hardening (outcome gates + reported, not thrown, failures) ──────────
const COMPAT_SKILLS = ["inspect", "review", "workflow-end"];

async function makeCompatFixtureRoot(prefix, workflows) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  for (const skill of COMPAT_SKILLS) {
    await fs.mkdir(path.join(rootDir, ".claude", "skills", skill), { recursive: true });
    await fs.writeFile(path.join(rootDir, ".claude", "skills", skill, "SKILL.md"), `---\nname: ${skill}\ndescription: fixture\n---\n`, "utf8");
  }
  await fs.mkdir(path.join(rootDir, ".agents", "skills"), { recursive: true });
  await fs.writeFile(path.join(rootDir, ".claude", "workflows.json"), `${JSON.stringify({ workflows }, null, 2)}\n`, "utf8");
  return rootDir;
}

/** A variant workflow whose legacy `sequence` preview predates a variant-only review gate step. */
function variantWorkflowWithVariantOnlyGate(legacySequence = ["inspect", "workflow-end"]) {
  return {
    preActions: { injectContext: "Canonical fixture context." },
    intent: "Prove the fixture outcome.",
    outcomeGates: [{ id: "review-converged", satisfiedBy: ["review"] }],
    sequence: legacySequence,
    defaultMode: "update",
    variants: {
      update: {
        sequence: [
          { id: "inspect", skill: "inspect" },
          { id: "review", skill: "review", role: "gate" },
          { id: "finish", skill: "workflow-end", role: "gate" },
        ],
      },
    },
  };
}

test("compatibility preview ignores outcome gates that only a variant step satisfies", async () => {
  // Business Intent / Invariant Guarded: outcome gates are proven against every real mode; the legacy
  // preview only feeds wrapper-parity checks, so a variant-only gate step must not break it.
  // Given a variant workflow whose review gate step exists only in its variant
  const doc = { workflows: { "workflow-variant": variantWorkflowWithVariantOnlyGate() } };
  const rootDir = await makeCompatFixtureRoot("cycle-compat-gates-", doc.workflows);
  try {
    // When the real modes and the legacy preview are resolved
    const [mode] = resolveWorkflowManifestsForVerification(doc, "workflow-variant", { rootDir });
    const preview = resolveCompatibilityWorkflowManifest(doc, "workflow-variant", rootDir);
    // Then the real mode still carries and satisfies the gate, and the preview resolves its legacy steps
    assert.deepEqual(mode.outcomeGates.map((gate) => gate.id), ["review-converged"]);
    assert.deepEqual(preview.sequence, ["inspect", "workflow-end"]);
    assert.ok(doc.workflows["workflow-variant"].outcomeGates, "the projection must not mutate the source entry");

    // Given a verifier mutant whose projection keeps outcomeGates
    const source = await fs.readFile(verifyScript, "utf8");
    const anchor = "  delete legacyEntry.outcomeGates;\n";
    assert.equal(source.split(anchor).length, 2, "mutation anchor must be unique");
    const mutated = source.replace(anchor, "")
      .replaceAll("import.meta.url", JSON.stringify(pathToFileURL(verifyScript).href));
    const verifier = await import(`data:text/javascript;base64,${Buffer.from(mutated).toString("base64")}`);
    // Then the mutant fails the preview on the variant-only gate step
    assert.throws(
      () => verifier.resolveCompatibilityWorkflowManifest(doc, "workflow-variant", rootDir),
      /Outcome gate review-converged names a skill not in the sequence/
    );
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("verify-workflow-cycle-compliance reports a broken compatibility preview as a failure instead of crashing", async () => {
  // Business Intent / Invariant Guarded: every workflow defect reaches the FAIL report, so one bad
  // legacy preview never hides the remaining findings behind an uncaught exception.
  // Given a variant workflow whose legacy preview names a skill that does not exist
  const workflows = { "workflow-variant": variantWorkflowWithVariantOnlyGate(["inspect", "ghost-step", "workflow-end"]) };
  const rootDir = await makeCompatFixtureRoot("cycle-compat-report-", workflows);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: rootDir, HOME: rootDir, USERPROFILE: rootDir, TMPDIR: rootDir, TEMP: rootDir, TMP: rootDir };
  try {
    // When the verifier runs over the fixture project
    const error = await execFileAsync(process.execPath, [verifyScript], { cwd: rootDir, env }).then(
      () => assert.fail("the verifier must fail on the broken preview"),
      (failure) => failure
    );
    // Then it exits 1 through its FAIL report, naming the workflow and the missing skill
    assert.equal(error.code, 1);
    assert.match(error.stderr, /\[codex-verify-workflow-cycle\] FAIL/);
    assert.match(error.stderr, /Workflow compatibility-sequence violation \(workflow-variant\): .*ghost-step/);
    assert.doesNotMatch(error.stderr, /^\s+at /m, "no uncaught stack trace");
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("workflow wrappers point to the guided step contract instead of a blanket no-deviation banner", async () => {
  // Business Intent / Invariant Guarded: start-workflow is the single owner of the step contract
  // (gates fixed, other steps flex with a logged reason); a wrapper banner forbidding every skip,
  // reorder or merge contradicts it. Mirrors derive from the source wrapper, so only `.claude` is checked.
  const BANNER = "> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.";
  const ANCHOR = "> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.";
  // Given the guided anchor, Then the check passes; Given the blanket banner, Then it fails once
  assert.deepEqual(checkWorkflowWrapperStepContract("w.md", `${ANCHOR}\n`), []);
  assert.equal(checkWorkflowWrapperStepContract("w.md", `${BANNER}\n`).length, 1);

  // Given a fixture project whose source and mirror wrappers both carry the banner
  const workflows = { "workflow-variant": variantWorkflowWithVariantOnlyGate() };
  const rootDir = await makeCompatFixtureRoot("cycle-wrapper-banner-", workflows);
  const env = { ...process.env, CLAUDE_PROJECT_DIR: rootDir, HOME: rootDir, USERPROFILE: rootDir, TMPDIR: rootDir, TEMP: rootDir, TMP: rootDir };
  const wrapper = (sigil) => ["---", "name: workflow-variant", "description: fixture", "---", "", BANNER, "",
    `**IMPORTANT MANDATORY Steps:** ${sigil}inspect -> ${sigil}workflow-end`, ""].join("\n");
  try {
    for (const [root, sigil] of [[".claude", "/"], [".agents", "$"]]) {
      await fs.mkdir(path.join(rootDir, root, "skills", "workflow-variant"), { recursive: true });
      await fs.writeFile(path.join(rootDir, root, "skills", "workflow-variant", "SKILL.md"), wrapper(sigil), "utf8");
    }
    // When the verifier runs over the fixture project
    const error = await execFileAsync(process.execPath, [verifyScript], { cwd: rootDir, env }).then(
      () => assert.fail("the verifier must fail on the banner"),
      (failure) => failure
    );
    // Then exactly the source wrapper is reported
    const hits = error.stderr.split(/\r?\n/).filter((line) => line.includes("Workflow wrapper step-contract violation"));
    assert.equal(hits.length, 1, error.stderr);
    assert.match(hits[0], /\.claude\/skills\/workflow-variant\/SKILL\.md/);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test('a review that defers its tests is still the review gate and owns the terminal refresh (verify-last order)', () => {
  const policyFailures = (sequence) => {
    const failures = [];
    ensureWorkflowPolicy('workflow-feature', { preActions: { injectContext: '' } }, sequence, failures);
    return failures;
  };
  const refreshFailure = /domain-entity reference refresh <verification step>/;
  const base = ['plan --mode=execute', 'integration-test'];
  const tail = ['integration-test --mode=verify', 'test', 'workflow-end', 'watzup'];

  // Given the review defers its tests and runs before the verify step
  const deferred = policyFailures([...base, 'workflow-review-changes --tests=defer', ...tail]);
  // Then it is recognised as the review gate and the settled-state refresh is delegated to it
  assert.equal(deferred.some((line) => /missing workflow-review-changes gate/.test(line)), false);
  assert.equal(deferred.some((line) => refreshFailure.test(line)), false);
  assert.equal(deferred.some((line) => /missing ordered integration gate/.test(line)), false);

  // And a review that runs its own tests before the verify step does NOT own the refresh: the parent must
  const proving = policyFailures([...base, 'workflow-review-changes', ...tail]);
  assert.equal(proving.some((line) => refreshFailure.test(line)), true);

  // And a deferring review with no verify step after it leaves its own fixes unverified: it fails
  const unverified = policyFailures([...base, 'integration-test --mode=verify', 'test', 'workflow-review-changes --tests=defer', 'workflow-end', 'watzup']);
  assert.equal(unverified.some((line) => /--tests=defer needs a verify step/.test(line)), true);
  assert.equal(deferred.some((line) => /--tests=defer needs a verify step/.test(line)), false);
});

test('a test-first regression written before the fix is proven by the verify after it', () => {
  // Business Intent / Invariant Guarded: a bug fix's reproducing test exists before the fix and runs after it;
  // a test written only before the change, with no verify after it, never proves the change.
  const policyFailures = (sequence) => {
    const failures = [];
    ensureWorkflowPolicy('workflow-bugfix', { preActions: { injectContext: '' } }, sequence, failures);
    return failures.filter((line) => /implementation must be verified/.test(line));
  };
  const head = ['investigate --mode=debug', 'spec [mode=tests]', 'work-item --mode=review --type=spec-tests', 'integration-test', 'fix', 'spec [mode=sync]'];
  // Given the regression test is written before the fix and the verify runs after the static review
  assert.deepEqual(policyFailures([...head, 'workflow-review-changes --tests=defer', 'integration-test --mode=verify', 'workflow-end', 'watzup']), []);
  // When nothing verifies after the fix, Then the implementation is unverified
  assert.equal(policyFailures([...head, 'workflow-review-changes --tests=defer', 'workflow-end', 'watzup']).length, 1);
  // And a verify that runs before the fix proves nothing about it
  assert.equal(policyFailures(['investigate --mode=debug', 'spec [mode=tests]', 'integration-test', 'integration-test --mode=verify', 'fix', 'spec [mode=sync]', 'workflow-review-changes --tests=defer', 'workflow-end', 'watzup']).length, 1);
  // And with no nested review at all, a test written before the fix and a verify after it are not enough
  assert.equal(policyFailures([...head, 'integration-test --mode=verify', 'workflow-end', 'watzup']).length, 1);
});

test('the integration gate identifies the review and verify ROLE of integration-test/e2e-test, whatever flags accompany it', () => {
  const policyFailures = (sequence) => {
    const failures = [];
    ensureWorkflowPolicy('workflow-feature', { preActions: { injectContext: '' } }, sequence, failures);
    return failures;
  };
  const gate = /missing ordered integration gate/;
  const base = ['plan --mode=execute', 'integration-test'];
  const tail = ['test', 'workflow-end', 'watzup'];
  // Given review and verify invocations that carry extra flags, Then they still satisfy the ordered gate
  assert.equal(policyFailures([...base, 'integration-test --mode=review --report-only --prove-tests', 'integration-test --mode=verify --fix-loop', ...tail]).some((line) => gate.test(line)), false);
  // And a verify invocation with no review step before it (and no nested review) fails the gate
  assert.equal(policyFailures([...base, 'integration-test --mode=verify', ...tail]).some((line) => gate.test(line)), true);
  // And the bare integration-test skill (generation) is neither the review nor the verify role
  assert.equal(policyFailures([...base, 'integration-test', 'integration-test', ...tail]).some((line) => gate.test(line)), true);
  // And an e2e verify invocation satisfies the deferred-review verify requirement
  const deferredWithE2eVerify = policyFailures([...base, 'workflow-review-changes --tests=defer', 'e2e-test --mode=verify --fix-loop', 'workflow-end', 'watzup']);
  assert.equal(deferredWithE2eVerify.some((line) => /--tests=defer needs a verify step/.test(line)), false);
  // And without any verify step after the deferring review it fails
  assert.equal(policyFailures([...base, 'workflow-review-changes --tests=defer', 'e2e-test', 'workflow-end', 'watzup']).some((line) => /--tests=defer needs a verify step/.test(line)), true);
});

test('spec discovery, clarify and index steps never stand in for the canonical spec step', () => {
  // Given the modes that read specs, gate decisions or derive aids
  for (const step of ['spec [mode=discovery]', 'spec [mode=clarify]', 'spec [mode=index]', 'spec [mode=discovery] --investigation=x']) {
    // Then none of them is a canonical spec step
    assert.equal(isCanonicalSpecStep(step), false, step);
  }
  // And the authoring, test and sync invocations stay canonical spec steps
  for (const step of ['spec', 'spec [mode=draft]', 'spec [mode=init]', 'spec [mode=update]', 'spec [mode=tests]', 'spec [mode=sync]', 'spec [mode=amend]']) {
    assert.equal(isCanonicalSpecStep(step), true, step);
  }
  assert.equal(isCanonicalSpecStep('plan'), false);

  const policyFailures = (sequence) => {
    const failures = [];
    ensureWorkflowPolicy('workflow-feature', { preActions: { injectContext: '' } }, sequence, failures);
    return failures;
  };
  const tail = ['plan', 'plan --mode=execute', 'integration-test', 'workflow-review-changes --tests=defer', 'integration-test --mode=verify', 'test', 'workflow-end', 'watzup'];
  const missingSpec = /missing canonical Feature Spec step before implementation planning/;
  // When a workflow runs discovery and clarify but never authors the spec, it fails the canonical-spec gate
  assert.equal(policyFailures(['investigate', 'spec [mode=discovery]', 'spec [mode=clarify]', ...tail]).some((line) => missingSpec.test(line)), true);
  // And the same workflow with the authoring step between them passes that gate
  assert.equal(policyFailures(['investigate', 'spec [mode=discovery]', 'spec', 'spec [mode=clarify]', ...tail]).some((line) => missingSpec.test(line)), false);
});
