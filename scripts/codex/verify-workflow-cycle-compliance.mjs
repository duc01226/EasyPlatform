#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TARGET_WORKFLOW_IDS = [
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

const WORKFLOW_SKILL_NAME_OVERRIDES = new Map([
  ["design-workflow", "workflow-design"],
  ["spec-discovery", "spec-discovery"],
  ["workflow-seed-test-data", "workflow-seed-test-data"],
]);

const TDD_WORKFLOW_IDS = new Set([
  "batch-operation",
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "tdd-feature",
  "test-spec-update",
  "verification",
]);

const REVIEW_GATE_WORKFLOW_IDS = new Set([
  "batch-operation",
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "tdd-feature",
  "test-spec-update",
  "verification",
]);

const IMPLEMENTATION_WORKFLOW_IDS = new Set([
  "batch-operation",
  "big-feature",
  "bugfix",
  "feature",
  "full-feature-lifecycle",
  "tdd-feature",
  "verification",
]);

const IMPLEMENTATION_STEPS = new Set(["cook", "fix", "code"]);

const STEP_ALIASES = new Map([
  ["feature-investigation", "investigate"],
  ["plan-hard", "plan"],
  ["test-initial", "test"],
]);

function normalizePath(targetPath, rootDir) {
  return path.relative(rootDir, targetPath).replaceAll("\\", "/");
}

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSkillStepToken(token) {
  return normalizeWhitespace(token)
    .replace(/^[/$]+/, "")
    .replace(/^\*+|\*+$/g, "")
    .trim();
}

function parseStepsFromSkill(content) {
  const stepLinePatterns = [
    /IMPORTANT MANDATORY Steps:\*\*\s*(.+)$/m,
    /IMPORTANT MANDATORY Steps:\s*(.+)$/m,
  ];
  const matchedLine = stepLinePatterns
    .map((pattern) => content.match(pattern)?.[1])
    .find(Boolean);
  if (!matchedLine) return [];

  return matchedLine
    .split(/\s*->\s*/)
    .map((token) => normalizeSkillStepToken(token))
    .filter(Boolean);
}

function normalizeStep(step, stepAliases) {
  const normalized = normalizeWhitespace(step).replace(/^[/$]+/, "").trim();
  return stepAliases.get(normalized) ?? normalized;
}

function normalizeSequence(steps, stepAliases) {
  return steps.map((step) => normalizeStep(step, stepAliases));
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function hasOrderedSubsequence(sequence, expectedSubsequence) {
  let cursor = 0;
  for (const step of sequence) {
    if (step === expectedSubsequence[cursor]) {
      cursor += 1;
      if (cursor === expectedSubsequence.length) return true;
    }
  }
  return false;
}

function ensureWorkflowPolicy(workflowId, sequence, failures) {
  if (
    !hasOrderedSubsequence(sequence, [
      "integration-test",
      "integration-test-review",
      "integration-test-verify",
    ])
  ) {
    failures.push(
      `Workflow policy violation (${workflowId}): missing ordered integration gate integration-test -> integration-test-review -> integration-test-verify`
    );
  }

  if (!hasOrderedSubsequence(sequence, ["docs-update", "workflow-end"])) {
    failures.push(
      `Workflow policy violation (${workflowId}): missing ordered closure docs-update -> workflow-end`
    );
  }

  if (TDD_WORKFLOW_IDS.has(workflowId)) {
    if (!hasOrderedSubsequence(sequence, ["tdd-spec", "tdd-spec-review"])) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing ordered tdd-spec -> tdd-spec-review`
      );
    }
    if (!sequence.includes("tdd-spec [direction=sync]")) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing tdd-spec [direction=sync]`
      );
    }
  }

  if (REVIEW_GATE_WORKFLOW_IDS.has(workflowId) && !sequence.includes("workflow-review-changes")) {
    failures.push(
      `Workflow policy violation (${workflowId}): missing workflow-review-changes gate`
    );
  }

  if (IMPLEMENTATION_WORKFLOW_IDS.has(workflowId)) {
    const hasImplementationStep = sequence.some((step) => IMPLEMENTATION_STEPS.has(step));
    if (!hasImplementationStep) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing implementation step (cook|fix|code)`
      );
    }
  }
}

function formatSequenceDiff(expected, actual) {
  const missing = [...new Set(expected.filter((step) => !actual.includes(step)))];
  const extra = [...new Set(actual.filter((step) => !expected.includes(step)))];
  return {
    missing,
    extra,
    expected,
    actual,
  };
}

function getWorkflowSkillName(workflowId) {
  return WORKFLOW_SKILL_NAME_OVERRIDES.get(workflowId) ?? `workflow-${workflowId}`;
}

async function main() {
  const rootDir = process.cwd();
  const workflowsPath = path.join(rootDir, ".claude", "workflows.json");
  const skillRoots = [
    { label: ".claude", path: path.join(rootDir, ".claude", "skills") },
    { label: ".agents", path: path.join(rootDir, ".agents", "skills") },
  ];

  const failures = [];

  if (!(await exists(workflowsPath))) {
    throw new Error(`Missing workflows config: ${normalizePath(workflowsPath, rootDir)}`);
  }

  const workflowsDoc = JSON.parse(await fs.readFile(workflowsPath, "utf8"));
  const workflows = workflowsDoc?.workflows ?? {};
  const stepAliases = STEP_ALIASES;

  const workflowIds = Object.keys(workflows).sort();

  for (const workflowId of workflowIds) {
    const workflow = workflows?.[workflowId];
    if (!workflow) {
      failures.push(`Missing workflow id in .claude/workflows.json: ${workflowId}`);
      continue;
    }

    const workflowSequence = Array.isArray(workflow.sequence) ? workflow.sequence : [];
    if (workflowSequence.length === 0) {
      failures.push(`Workflow has empty sequence: ${workflowId}`);
      continue;
    }

    const expectedSteps = normalizeSequence(workflowSequence, stepAliases);
    if (TARGET_WORKFLOW_IDS.includes(workflowId)) {
      ensureWorkflowPolicy(workflowId, expectedSteps, failures);
    }

    const workflowSkillName = getWorkflowSkillName(workflowId);
    for (const skillRoot of skillRoots) {
      const skillPath = path.join(skillRoot.path, workflowSkillName, "SKILL.md");
      if (!(await exists(skillPath))) {
        failures.push(`Missing workflow skill file (${skillRoot.label}): ${normalizePath(skillPath, rootDir)}`);
        continue;
      }

      const skillContent = await fs.readFile(skillPath, "utf8");
      const rawSkillSteps = parseStepsFromSkill(skillContent);
      if (rawSkillSteps.length === 0) {
        if (!workflowSkillName.startsWith("workflow-")) {
          continue;
        }
        failures.push(
          `No 'IMPORTANT MANDATORY Steps' found in ${normalizePath(skillPath, rootDir)}`
        );
        continue;
      }

      const actualSteps = normalizeSequence(rawSkillSteps, stepAliases);
      if (!arraysEqual(expectedSteps, actualSteps)) {
        const diff = formatSequenceDiff(expectedSteps, actualSteps);
        failures.push(
          [
            `Paired-drift detected for workflow '${workflowId}' in ${normalizePath(skillPath, rootDir)}`,
            `  missing: [${diff.missing.join(", ")}]`,
            `  extra:   [${diff.extra.join(", ")}]`,
            `  expected: ${diff.expected.join(" -> ")}`,
            `  actual:   ${diff.actual.join(" -> ")}`,
          ].join("\n")
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error("[codex-verify-workflow-cycle] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `[codex-verify-workflow-cycle] PASS (${workflowIds.length} workflow(s) across .claude/.agents skills; ${TARGET_WORKFLOW_IDS.length} policy-checked)`
  );
}

const isEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  await main();
}

export {
  TARGET_WORKFLOW_IDS,
  TDD_WORKFLOW_IDS,
  REVIEW_GATE_WORKFLOW_IDS,
  IMPLEMENTATION_WORKFLOW_IDS,
  IMPLEMENTATION_STEPS,
  STEP_ALIASES,
  WORKFLOW_SKILL_NAME_OVERRIDES,
  getWorkflowSkillName,
  hasOrderedSubsequence,
  ensureWorkflowPolicy,
  normalizeSequence,
  parseStepsFromSkill,
  formatSequenceDiff,
};
