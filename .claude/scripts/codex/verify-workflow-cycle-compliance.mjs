#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Prose-only semantic anchor for the advancement+barrier rule, shared (case-insensitively) by
// every wording across all three carriers (Codex context note, Copilot common-protocol clause,
// injectWorkflowProtocol output): "advance only after ALL/EVERY member(s) return". Deliberately
// NOT a substring of the rendered barrier token "[parallel ⇉ all-return barrier: …]" — so this
// clause-presence check (W5(c)) proves the rule PROSE reached the carrier independently of the
// token-parity check below. (Earlier "all-return barrier" was a token substring, making the check
// near-vacuous for the two token-bearing mirrors; this semantic phrase closes that blind spot.)
const ADVANCEMENT_CLAUSE_PATTERN = /advance only after (?:all|every) member/i;
const ADVANCEMENT_CLAUSE_LABEL = 'advance only after ALL/EVERY member(s) return';

// Optional generated mirror surfaces that carry the rendered barrier token. Absent file ⇒
// that tool's mirror is not enabled in this project (skip, do not fail) — keeps the verifier
// portable across single-tool checkouts of the framework.
const CODEX_CARRIER = "AGENTS.md";
const COPILOT_CARRIER = path.join(".github", "instructions", "common-protocol.instructions.md");
const PROMPT_INJECTIONS = path.join(".claude", "hooks", "lib", "prompt-injections.cjs");

const TARGET_WORKFLOW_IDS = [
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
  "workflow-spec-sync",
];

// Workflow IDs are all `workflow-`-prefixed and their activation skill dir is identity
// (`workflow-bugfix` → `.claude/skills/workflow-bugfix/`). No id currently needs a
// non-identity mapping, so getWorkflowSkillName() returns identity for every id. The empty
// override map is kept as the extension point if a divergent skill dir is ever introduced.
const WORKFLOW_SKILL_NAME_OVERRIDES = new Map([]);

const TDD_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
  "workflow-spec-sync",
]);

const REVIEW_GATE_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
  "workflow-spec-sync",
]);

const IMPLEMENTATION_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
]);

const IMPLEMENTATION_STEPS = new Set(["cook", "fix", "code"]);
const CANONICAL_SPEC_BEFORE_FIRST_PLAN_WORKFLOW_IDS = new Set([
  "workflow-bugfix",
  "workflow-feature",
]);
const CANONICAL_SPEC_BEFORE_IMPLEMENTATION_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
]);
const DEBUGGER_TRACE_WORKFLOW_IDS = new Set(["workflow-bugfix"]);
const DEBUGGER_TRACE_WORKFLOW_TERMS = [
  "end-to-start",
  "observed final",
  "feeder",
  "hypothesis matrix",
  "owning fix layer",
  "forward convergence",
];

const STEP_ALIASES = new Map([
  ["feature-investigation", "investigate"],
  ["test-initial", "test"],
]);

// --- Goal Contract Satisfaction Loop coverage (FR-GOAL-060..064) ---------------------------------
// Targeted skills must carry the goal-contract lifecycle: resolve the active goal before work,
// append iteration evidence after execution, and (for review/workflow surfaces) emit a Goal
// Satisfaction matrix before reporting PASS. These checks scan the `.claude/skills` root ONLY:
// `.agents/**` is a generated mirror refreshed by `npm run codex:sync`, so it is legitimately
// stale between a source edit and the next sync — gating on it would make source-first edits
// unverifiable. Mirror parity is owned by the sync tooling, not this verifier.
const GOAL_CONTRACT_MARKER = "SYNC:goal-contract-satisfaction-loop";
const GOAL_CONTRACT_ACTIVE_GOAL_PATTERN = /active goal|goal contract/i;
const GOAL_CONTRACT_SATISFACTION_PATTERN = /goal satisfaction/i;

// Entry/implementation/fix skills: must resolve + read the active goal before work.
const GOAL_CONTRACT_SKILL_IDS = [
  "plan", // creates {plan-dir}/goal.md during plan bootstrap
  "start-workflow", // resolves the active goal before child task creation
  "cook", // reads the goal contract before implementation
  "code", // reads the goal during analysis/task extraction
  "feature", // maps success validation to saved criteria
  "fix", // active-goal read before root-cause work (ci/issue/logs/test/ui are --target branches)
  "prove-fix", // goal satisfaction update after fix verdict
];

// Review gates: must additionally emit Goal Satisfaction status before PASS.
const GOAL_CONTRACT_REVIEW_SKILL_IDS = [
  "review-changes",
  "why-review",
  "plan-review",
  "code-review",
  "review-post-task",
];

// Workflow wrappers + verification/audit surfaces (Phases 05-06). The planned
// workflow-verification / workflow-quality-audit / workflow-tdd-feature / workflow-test-verify
// wrappers do not exist as files; their intent maps to: test (verification evidence),
// quality-gate (audit goal status), workflow-feature (covers TDD/test-first), and
// integration-test-verify (test verification evidence).
const GOAL_CONTRACT_WORKFLOW_SKILL_IDS = [
  "workflow-feature",
  "workflow-bugfix",
  "workflow-review-changes",
  "workflow-write-integration-test",
  "workflow-spec-driven-dev",
  "test",
  "quality-gate",
  "integration-test-verify",
];

// Required structure of a Goal Contract file (see .claude/templates/goal-contract-template.md).
const GOAL_CONTRACT_FILE_REQUIRED_SECTIONS = [
  "Original Request",
  "Purpose",
  "Success Criteria",
  "Constraints",
  "Evidence Required",
  "Iteration Log",
  "Goal Satisfaction",
];

export function checkGoalContractSkillCompliance(skillId, content, { requireSatisfaction = false } = {}) {
  const failures = [];
  const hasMarker = content.includes(GOAL_CONTRACT_MARKER);
  const hasActiveGoalWording = GOAL_CONTRACT_ACTIVE_GOAL_PATTERN.test(content);
  if (!hasMarker && !hasActiveGoalWording) {
    failures.push(
      `Goal-contract violation (${skillId}): missing active-goal lifecycle marker (expected '${GOAL_CONTRACT_MARKER}' wording or active-goal resolution wording)`
    );
  }
  if (requireSatisfaction && !GOAL_CONTRACT_SATISFACTION_PATTERN.test(content)) {
    failures.push(
      `Goal-contract violation (${skillId}): missing 'Goal Satisfaction' wording (review/workflow surfaces must emit the Goal Satisfaction matrix before PASS)`
    );
  }
  return failures;
}

// Validates a concrete Goal Contract file (e.g. a plan's goal.md) end-to-end: all required
// sections present, a Goal Satisfaction matrix with PASS/FAIL/BLOCKED status, and an escalation
// reason whenever any criterion is BLOCKED. Exercised by the verifier test suite via a sample
// lifecycle; exported for reuse by future gates.
export function checkGoalContractFileLifecycle(content) {
  const failures = [];
  for (const section of GOAL_CONTRACT_FILE_REQUIRED_SECTIONS) {
    const sectionPattern = new RegExp(`^#{1,6}\\s+${section}\\s*$`, "im");
    if (!sectionPattern.test(content)) {
      failures.push(`Goal file violation: missing required section '${section}'`);
    }
  }
  if (!/\|\s*Success Criterion\s*\|\s*Evidence\s*\|\s*Status\s*\|/i.test(content)) {
    failures.push(
      "Goal file violation: missing Goal Satisfaction matrix header '| Success Criterion | Evidence | Status |'"
    );
  }
  if (!/\b(PASS|FAIL|BLOCKED)\b/.test(content)) {
    failures.push("Goal file violation: no PASS/FAIL/BLOCKED status recorded");
  }
  if (/\bBLOCKED\b/.test(content) && !/escalat/i.test(content)) {
    failures.push(
      "Goal file violation: BLOCKED status requires a user-facing escalation reason (escalation wording missing)"
    );
  }
  return failures;
}

async function checkGoalContractSkillCoverage(rootDir, failures) {
  const claudeSkillsRoot = path.join(rootDir, ".claude", "skills");
  const targets = [
    ...GOAL_CONTRACT_SKILL_IDS.map((id) => ({ id, requireSatisfaction: false })),
    ...GOAL_CONTRACT_REVIEW_SKILL_IDS.map((id) => ({ id, requireSatisfaction: true })),
    ...GOAL_CONTRACT_WORKFLOW_SKILL_IDS.map((id) => ({ id, requireSatisfaction: true })),
  ];
  let checkedCount = 0;
  for (const target of targets) {
    const skillPath = path.join(claudeSkillsRoot, target.id, "SKILL.md");
    // Absent skill ⇒ this framework checkout does not ship that skill (skip, do not fail) —
    // same portability rule as the optional mirror carriers above. In the canonical repo all
    // targeted skills exist, so removals surface through the normal review/diff path.
    if (!(await exists(skillPath))) continue;
    const content = await fs.readFile(skillPath, "utf8");
    failures.push(
      ...checkGoalContractSkillCompliance(target.id, content, {
        requireSatisfaction: target.requireSatisfaction,
      })
    );
    checkedCount += 1;
  }
  return checkedCount;
}

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

function parseTaskTableStepsFromSkill(content) {
  const steps = [];
  const rowPattern = /^\|\s*\d+\s*\|\s*`\[Workflow\]\s*[/$]([^`—]+)[^`]*`/gm;
  for (const match of content.matchAll(rowPattern)) {
    const token = normalizeSkillStepToken(match[1]);
    if (token) {
      steps.push(token);
    }
  }

  return steps;
}

function parseDisplayStepsFromSkill(content) {
  const match = content.match(/^\*\*Steps:\*\*\s*(.+)$/m);
  if (!match) return [];

  return match[1]
    .split(/\s*(?:->|→)\s*/)
    .map((token) => normalizeSkillStepToken(token))
    .filter(Boolean);
}

function parseClosingTaskCount(content) {
  const match = content.match(/create ALL\s+(\d+)\s+tasks/im);
  return match ? Number.parseInt(match[1], 10) : null;
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

function findFirstIndex(sequence, predicate) {
  for (let index = 0; index < sequence.length; index += 1) {
    if (predicate(sequence[index])) return index;
  }
  return -1;
}

function isCanonicalSpecStep(step) {
  return step === "spec" || step.startsWith("spec ");
}

export function checkWorkflowDebuggerTracePolicy(workflowId, workflow) {
  if (!DEBUGGER_TRACE_WORKFLOW_IDS.has(workflowId)) return null;
  const haystack = normalizeWhitespace(
    [
      workflow?.description ?? "",
      workflow?.whenToUse ?? "",
      workflow?.preActions?.injectContext ?? "",
    ].join(" ")
  ).toLowerCase();
  const missing = DEBUGGER_TRACE_WORKFLOW_TERMS.filter((term) => !haystack.includes(term));
  if (missing.length === 0) return null;
  return `Workflow policy violation (${workflowId}): missing end-to-start debugger trace metadata term(s): ${missing.join(", ")}`;
}

function ensureWorkflowPolicy(workflowId, workflow, sequence, failures) {
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
    if (!hasOrderedSubsequence(sequence, ["spec [mode=tests]", "review-artifact --type=spec-tests"])) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing ordered spec [mode=tests] -> review-artifact --type=spec-tests`
      );
    }
    if (!sequence.includes("spec [mode=sync]")) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing spec [mode=sync]`
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

  const debuggerTraceFailure = checkWorkflowDebuggerTracePolicy(workflowId, workflow);
  if (debuggerTraceFailure) failures.push(debuggerTraceFailure);

  ensureSddWorkflowPolicy(workflowId, sequence, failures);
}

function ensureSddWorkflowPolicy(workflowId, sequence, failures) {
  if (!CANONICAL_SPEC_BEFORE_IMPLEMENTATION_WORKFLOW_IDS.has(workflowId)) return;

  const specIndex = findFirstIndex(sequence, isCanonicalSpecStep);
  const implementationIndex = findFirstIndex(sequence, (step) => IMPLEMENTATION_STEPS.has(step));

  if (specIndex === -1) {
    failures.push(
      `Workflow policy violation (${workflowId}): missing canonical Feature Spec step before implementation planning`
    );
    return;
  }

  if (
    CANONICAL_SPEC_BEFORE_FIRST_PLAN_WORKFLOW_IDS.has(workflowId) &&
    sequence.includes("plan")
  ) {
    const firstPlanIndex = sequence.indexOf("plan");
    if (firstPlanIndex >= 0 && specIndex > firstPlanIndex) {
      failures.push(
        `Workflow policy violation (${workflowId}): canonical Feature Spec step must run before the first implementation plan`
      );
    }
  }

  if (implementationIndex === -1) return;

  if (specIndex > implementationIndex) {
    failures.push(
      `Workflow policy violation (${workflowId}): canonical Feature Spec step must run before implementation step '${sequence[implementationIndex]}'`
    );
  }

  const implementationTail = sequence.slice(implementationIndex);
  const implementationStep = sequence[implementationIndex];
  if (
    !hasOrderedSubsequence(implementationTail, [
      implementationStep,
      "integration-test",
      "integration-test-review",
      "integration-test-verify",
    ])
  ) {
    failures.push(
      `Workflow policy violation (${workflowId}): implementation must be verified by integration-test -> integration-test-review -> integration-test-verify after '${implementationStep}'`
    );
  }

  if (
    !hasOrderedSubsequence(implementationTail, [
      implementationStep,
      "spec [mode=sync]",
      "docs-update",
    ])
  ) {
    failures.push(
      `Workflow policy violation (${workflowId}): implementation must be followed by spec [mode=sync] before docs-update`
    );
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
  // Workflow ids are already `workflow-`-prefixed (Object.keys(workflows)); the activation
  // skill dir is identity for every id (WORKFLOW_SKILL_NAME_OVERRIDES is currently empty).
  return WORKFLOW_SKILL_NAME_OVERRIDES.get(workflowId) ?? workflowId;
}

// Inline twin of renderBarrierToken in sync-context-workflows.mjs / sync-copilot-workflows.cjs.
// MUST stay byte-identical to those renderers — this is the oracle the cross-mirror parity asserts
// against, so any future format change to the renderers without updating this fails the verifier.
function renderExpectedBarrierToken(group) {
  const members = Array.isArray(group?.members) ? group.members : [];
  const conditional = new Set(Array.isArray(group?.conditionalMembers) ? group.conditionalMembers : []);
  const rendered = members.map((m) => (conditional.has(m) ? `${m}*` : m)).join(", ");
  return `[parallel ⇉ all-return barrier: ${rendered}]`;
}

// W5(a) — structural integrity of every declared parallelGroup (config-only, no mirror dependency):
// >=2 members, barrier===true, conditionalMembers⊆members, every member ∈ sequence, and no member
// claimed by two groups in the same workflow. Runs for ALL workflows (no-op when none declared).
function checkParallelGroupsStructure(workflowId, workflow, rawSequence, failures) {
  // A present-but-non-array parallelGroups is a misconfiguration, not "no groups" — fail loudly
  // rather than silently skip (silent skip of a malformed barrier declaration is exactly the
  // false-pass class this verifier exists to catch).
  if (workflow?.parallelGroups !== undefined && !Array.isArray(workflow.parallelGroups)) {
    failures.push(`parallelGroups violation (${workflowId}): parallelGroups must be an array when present`);
    return;
  }
  const groups = Array.isArray(workflow?.parallelGroups) ? workflow.parallelGroups : [];
  if (groups.length === 0) return;
  const sequenceSet = new Set(Array.isArray(rawSequence) ? rawSequence : []);
  const memberOwner = new Map();
  const seenGroupIds = new Set();
  for (const group of groups) {
    const groupId = group?.id ?? "(unnamed)";
    // id is structurally load-bearing: the Codex/Copilot mirror renderers dedup groups by id, so a
    // missing or duplicate id silently drops a group's barrier token from the rendered mirror. Require
    // a non-empty, unique string id so the validator rejects what the renderer would mis-emit.
    if (typeof group?.id !== "string" || group.id.trim() === "") {
      failures.push(`parallelGroups violation (${workflowId}/${groupId}): group must have a non-empty string id`);
    } else if (seenGroupIds.has(group.id)) {
      failures.push(`parallelGroups violation (${workflowId}/${group.id}): duplicate group id (each parallel group needs a unique id)`);
    } else {
      seenGroupIds.add(group.id);
    }
    const members = Array.isArray(group?.members) ? group.members : [];
    if (members.length < 2) {
      failures.push(`parallelGroups violation (${workflowId}/${groupId}): a parallel group needs >=2 members`);
    }
    if (group?.barrier !== true) {
      failures.push(`parallelGroups violation (${workflowId}/${groupId}): barrier must be true`);
    }
    for (const member of members) {
      if (!sequenceSet.has(member)) {
        failures.push(`parallelGroups violation (${workflowId}/${groupId}): member '${member}' is not in the workflow sequence`);
      }
      if (memberOwner.has(member)) {
        failures.push(`parallelGroups violation (${workflowId}/${groupId}): member '${member}' already belongs to group '${memberOwner.get(member)}' (a member must not appear in two groups)`);
      } else {
        memberOwner.set(member, groupId);
      }
    }
    const conditional = Array.isArray(group?.conditionalMembers) ? group.conditionalMembers : [];
    for (const cm of conditional) {
      if (!members.includes(cm)) {
        failures.push(`parallelGroups violation (${workflowId}/${groupId}): conditionalMember '${cm}' is not in members`);
      }
    }
  }
}

// W5(b)+(c) — cross-mirror proof. (b) the expected barrier token is byte-identical across the
// rendered Codex and Copilot mirrors; (c) the advancement clause reached all three carriers.
// Reads each carrier once. Mirror files are optional (portability); injectWorkflowProtocol is a
// framework file and is always exercised. injectWorkflowProtocol(null, …) short-circuits its dedup
// guard with zero file I/O, so calling it here has no side effects.
async function checkParallelGroupsMirrorParity(workflows, rootDir, failures) {
  const grouped = Object.entries(workflows).filter(
    ([, wf]) => Array.isArray(wf?.parallelGroups) && wf.parallelGroups.length > 0
  );
  if (grouped.length === 0) return;

  const codexPath = path.join(rootDir, CODEX_CARRIER);
  const copilotPath = path.join(rootDir, COPILOT_CARRIER);
  const codexText = (await exists(codexPath)) ? await fs.readFile(codexPath, "utf8") : null;
  const copilotText = (await exists(copilotPath)) ? await fs.readFile(copilotPath, "utf8") : null;

  let injectedProtocol = null;
  try {
    const { injectWorkflowProtocol } = require(path.join(rootDir, PROMPT_INJECTIONS));
    injectedProtocol = injectWorkflowProtocol(null, "never");
  } catch (error) {
    failures.push(`parallelGroups carrier check: unable to load injectWorkflowProtocol from ${PROMPT_INJECTIONS} (${error.message})`);
  }

  const clauseCarriers = [
    { label: `Codex context (${CODEX_CARRIER})`, text: codexText },
    { label: `Copilot common-protocol (${normalizePath(copilotPath, rootDir)})`, text: copilotText },
    { label: "injectWorkflowProtocol output", text: injectedProtocol },
  ];
  for (const carrier of clauseCarriers) {
    if (carrier.text === null) continue;
    if (!ADVANCEMENT_CLAUSE_PATTERN.test(carrier.text)) {
      failures.push(`parallelGroups carrier check: advancement clause "${ADVANCEMENT_CLAUSE_LABEL}" missing from ${carrier.label}`);
    }
  }

  const tokenMirrors = [
    { label: `Codex (${CODEX_CARRIER})`, text: codexText },
    { label: `Copilot (${normalizePath(copilotPath, rootDir)})`, text: copilotText },
  ];
  for (const [workflowId, workflow] of grouped) {
    for (const group of workflow.parallelGroups) {
      const expected = renderExpectedBarrierToken(group);
      for (const mirror of tokenMirrors) {
        if (mirror.text === null) continue;
        if (!mirror.text.includes(expected)) {
          failures.push(
            `parallelGroups parity (${workflowId}/${group?.id ?? "(unnamed)"}): expected barrier token absent from ${mirror.label} — regenerate mirrors (npm run codex:sync + node .claude/scripts/sync-copilot-workflows.cjs, or /sync-all-mirrors). Expected: ${expected}`
          );
        }
      }
    }
  }
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
      ensureWorkflowPolicy(workflowId, workflow, expectedSteps, failures);
    }

    checkParallelGroupsStructure(workflowId, workflow, workflowSequence, failures);

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

      const rawTaskTableSteps = parseTaskTableStepsFromSkill(skillContent);
      if (rawTaskTableSteps.length > 0) {
        const taskTableSteps = normalizeSequence(rawTaskTableSteps, stepAliases);
        if (!arraysEqual(expectedSteps, taskTableSteps)) {
          const diff = formatSequenceDiff(expectedSteps, taskTableSteps);
          failures.push(
            [
              `Task-table drift detected for workflow '${workflowId}' in ${normalizePath(skillPath, rootDir)}`,
              `  missing: [${diff.missing.join(", ")}]`,
              `  extra:   [${diff.extra.join(", ")}]`,
              `  expected: ${diff.expected.join(" -> ")}`,
              `  actual:   ${diff.actual.join(" -> ")}`,
            ].join("\n")
          );
        }
      }

      const rawDisplaySteps = parseDisplayStepsFromSkill(skillContent);
      if (rawDisplaySteps.length > 0 && TARGET_WORKFLOW_IDS.includes(workflowId)) {
        const displaySteps = normalizeSequence(rawDisplaySteps, stepAliases);
        if (!arraysEqual(expectedSteps, displaySteps)) {
          const diff = formatSequenceDiff(expectedSteps, displaySteps);
          failures.push(
            [
              `Display-steps drift detected for workflow '${workflowId}' in ${normalizePath(skillPath, rootDir)}`,
              `  missing: [${diff.missing.join(", ")}]`,
              `  extra:   [${diff.extra.join(", ")}]`,
              `  expected: ${diff.expected.join(" -> ")}`,
              `  actual:   ${diff.actual.join(" -> ")}`,
            ].join("\n")
          );
        }
      }

      const closingTaskCount = parseClosingTaskCount(skillContent);
      if (closingTaskCount !== null && closingTaskCount !== expectedSteps.length) {
        failures.push(
          `Closing task-count drift detected for workflow '${workflowId}' in ${normalizePath(skillPath, rootDir)}: expected ${expectedSteps.length}, found ${closingTaskCount}`
        );
      }
    }
  }

  await checkParallelGroupsMirrorParity(workflows, rootDir, failures);

  const goalContractCheckedCount = await checkGoalContractSkillCoverage(rootDir, failures);

  if (failures.length > 0) {
    console.error("[codex-verify-workflow-cycle] FAIL");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  const groupedCount = workflowIds.filter(
    (id) => Array.isArray(workflows[id]?.parallelGroups) && workflows[id].parallelGroups.length > 0
  ).length;
  console.log(
    `[codex-verify-workflow-cycle] PASS (${workflowIds.length} workflow(s) across .claude/.agents skills; ${TARGET_WORKFLOW_IDS.length} policy-checked; ${groupedCount} parallelGroups workflow(s) parity-checked; ${goalContractCheckedCount} goal-contract skill(s) checked)`
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
  CANONICAL_SPEC_BEFORE_FIRST_PLAN_WORKFLOW_IDS,
  CANONICAL_SPEC_BEFORE_IMPLEMENTATION_WORKFLOW_IDS,
  STEP_ALIASES,
  WORKFLOW_SKILL_NAME_OVERRIDES,
  getWorkflowSkillName,
  hasOrderedSubsequence,
  ensureWorkflowPolicy,
  normalizeSequence,
  parseStepsFromSkill,
  parseDisplayStepsFromSkill,
  parseTaskTableStepsFromSkill,
  parseClosingTaskCount,
  formatSequenceDiff,
  renderExpectedBarrierToken,
  checkParallelGroupsStructure,
  checkParallelGroupsMirrorParity,
  GOAL_CONTRACT_MARKER,
  GOAL_CONTRACT_SKILL_IDS,
  GOAL_CONTRACT_REVIEW_SKILL_IDS,
  GOAL_CONTRACT_WORKFLOW_SKILL_IDS,
  GOAL_CONTRACT_FILE_REQUIRED_SECTIONS,
};
