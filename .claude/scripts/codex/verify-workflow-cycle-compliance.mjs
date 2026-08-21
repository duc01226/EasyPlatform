#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Prose-only semantic anchor for the advancement+barrier rule, shared (case-insensitively) by
// every wording across static carriers (Codex context note):
// "advance only after ALL/EVERY member(s) return". Deliberately
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

const DOMAIN_ENTITY_REFERENCE_REFRESH_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
]);
const DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT_TERMS = [
  "after /test",
  "before /docs-update",
  "run /scan --target=domain-entities",
  "when the final diff",
  "final diff",
  "entity/model",
  "dto/data contract",
  "persistence schema/migration",
  "entity-sync",
  "otherwise",
  "cited skip reason",
];

const IMPLEMENTATION_STEPS = new Set(["feature-implement", "fix", "plan-execute"]);
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
  "feature-implement", // reads the goal contract before implementation
  "plan-execute", // reads the goal during analysis/task extraction
  "feature", // maps success validation to saved criteria
  "fix", // active-goal read before root-cause work (ci/issue/logs/test/ui are --target branches)
  "prove-fix", // goal satisfaction update after fix verdict
];

// Review gates: must additionally emit Goal Satisfaction status before PASS.
const GOAL_CONTRACT_REVIEW_SKILL_IDS = [
  "changes-review",
  "why-review",
  "plan-review",
  "code-review",
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
  "workflow-code-to-spec",
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

// --- workflow-review-changes inline-in-main-session execution policy -----------------------------
// workflow-review-changes is the documented EXCEPTION to "nested workflow -> sub-agent": its Step 0
// `/goal` gate binds the session Stop hook and its step-15 re-review is inline by design, so a
// sub-agent cannot host it without silently dropping the unabandonable review->fix->re-review loop.
// These checks assert the canonical `.claude` surfaces DECLARE the inline mandate and carry NO
// residual whole-workflow sub-agent mandate. `.agents/**` mirrors are owned by the sync tooling
// (same portability rule as the goal-contract checks above — gating on a generated mirror would make
// source-first edits unverifiable). Patterns are intentionally semantic (phrase, not exact wording)
// so a correct rewording stays green; a regression to sub-agent delegation fails loudly.
const REVIEW_CHANGES_INLINE_MAIN_SESSION = /inline\s+in\s+the\s+main\s+(?:current\s+)?session/i;
const REVIEW_CHANGES_OBSOLETE_SUBAGENT_MANDATE = /MUST RUN AS SUB-AGENT/i;
// Old start-workflow HARD-GATE row delegating the whole workflow to a `code-reviewer` sub-agent.
const REVIEW_CHANGES_OBSOLETE_DELEGATION_ROW =
  /\|\s*`?[/$]?workflow-review-changes`?\s*\|[^\n]*`code-reviewer`/i;

const REVIEW_CHANGES_INLINE_SURFACES = [
  {
    rel: ".claude/skills/workflow-review-changes/SKILL.md",
    require: [
      { label: "inline-in-main-session execution mandate", re: REVIEW_CHANGES_INLINE_MAIN_SESSION },
    ],
    forbid: [
      { label: "obsolete 'MUST RUN AS SUB-AGENT' whole-workflow mandate", re: REVIEW_CHANGES_OBSOLETE_SUBAGENT_MANDATE },
    ],
  },
  {
    rel: ".claude/skills/start-workflow/SKILL.md",
    require: [
      {
        label: "workflow-review-changes inline-in-main-session exception",
        re: /workflow-review-changes[^\n]*inline\s+in\s+the\s+main\s+session/i,
      },
    ],
    forbid: [
      {
        label: "obsolete sub-agent delegation row mapping workflow-review-changes to code-reviewer",
        re: REVIEW_CHANGES_OBSOLETE_DELEGATION_ROW,
      },
    ],
  },
  {
    rel: ".claude/skills/claude-md-init/references/claude-md-template.md",
    require: [
      {
        label: "§3 workflow-review-changes inline-in-main-session exception",
        re: /workflow-review-changes[^\n]*inline\s+in\s+the\s+main\s+(?:current\s+)?session/i,
      },
    ],
    forbid: [],
  },
];

// The static workflow catalog is a fast route-selection surface, not the complete execution
// contract. start-workflow must always load the selected canonical entry before TaskCreate so a
// workflow's pre-actions (including conditional run/skip rules) reach the concrete task.
const START_WORKFLOW_PREACTION_SURFACE = ".claude/skills/start-workflow/SKILL.md";
const START_WORKFLOW_PREACTION_REQUIREMENTS = [
  {
    label: "Tier-2 canonical entry read before TaskCreate",
    re: /Tier 2[^.\n]*required[^.\n]*before[^.\n]*TaskCreate/i,
  },
  {
    label: "three-workflow policy scope",
    re: /workflow-big-feature[^.\n]*workflow-bugfix[^.\n]*workflow-feature/i,
  },
  {
    label: "JSON-aware complete canonical-entry read",
    re: /JSON-aware[^.\n]*complete[^.\n]*canonical[^.\n]*entry/i,
  },
  {
    label: "preActions inject-context loading",
    re: /preActions\.injectContext/i,
  },
  {
    label: "static catalog route-selection boundary",
    re: /static catalog is a route-selection aid/i,
  },
  {
    label: "conditional task run/skip propagation",
    re: /exact canonical run condition and evidence-backed skip transition/i,
  },
  {
    label: "host-neutral Tier-1 workflow-id selection",
    re: /exact workflow ID/i,
  },
  {
    label: "Tier-1 non-execution boundary",
    re: /Do NOT parse a static catalog sequence/i,
  },
  {
    label: "host-neutral step invocation guidance",
    re: /active host's command syntax/i,
  },
  {
    label: "conditional completion exception",
    re: /conditional(?:ly)? skipped task[^.\n]*without invoking(?: its)? `?Skill`? tool/i,
  },
];
const START_WORKFLOW_PREACTION_FORBIDDEN = [
  { label: "stop-at-first-success tier fallback", re: /stop at first success/i },
  {
    label: "parallel-groups-only Tier-2 condition",
    re: /use Tier 2 when the workflow may declare `parallelGroups`/i,
  },
  {
    label: "static catalog command parsing mandate",
    re: /Parse the `Steps:` value[^\n]*TaskCreate/i,
  },
  {
    label: "Claude-only generic step placeholder",
    re: /invoke each as `\/<stepId>`/i,
  },
  {
    label: "fixed-context workflow extraction",
    re: /(?:context=35|--context 35|context=30|--context 30)/i,
  },
  {
    label: "slash-form task activity template",
    re: /activeForm="Executing \/\{step-name\}"/i,
  },
  {
    label: "unapproved all-standard-workflow Tier-2 expansion",
    re: /before every standard-workflow TaskCreate/i,
  },
];

export function checkStartWorkflowPreActionPolicy(rel, content) {
  if (rel !== START_WORKFLOW_PREACTION_SURFACE) return [];
  const failures = START_WORKFLOW_PREACTION_REQUIREMENTS.flatMap(({ label, re }) =>
    re.test(content)
      ? []
      : [
          `start-workflow pre-action violation (${rel}): missing ${label} — load the selected canonical workflow entry before TaskCreate so conditional pre-actions reach the task`,
        ]
  );
  for (const { label, re } of START_WORKFLOW_PREACTION_FORBIDDEN) {
    if (re.test(content)) {
      failures.push(
        `start-workflow pre-action violation (${rel}): found ${label} — Tier 1 selects a route and Tier 2 must load the canonical execution contract before TaskCreate`
      );
    }
  }
  return failures;
}

async function checkStartWorkflowPreActionCoverage(rootDir, failures) {
  const filePath = path.join(rootDir, ...START_WORKFLOW_PREACTION_SURFACE.split("/"));
  if (!(await exists(filePath))) return 0;
  const content = await fs.readFile(filePath, "utf8");
  failures.push(...checkStartWorkflowPreActionPolicy(START_WORKFLOW_PREACTION_SURFACE, content));
  return 1;
}

// Pure, content-only checker (exported for unit tests): given a known surface `rel` and its
// content, return the list of inline-execution policy violations. Unknown `rel` ⇒ no-op.
export function checkReviewChangesInlineExecutionPolicy(rel, content) {
  const failures = [];
  const surface = REVIEW_CHANGES_INLINE_SURFACES.find((s) => s.rel === rel);
  if (!surface) return failures;
  for (const req of surface.require) {
    if (!req.re.test(content)) {
      failures.push(
        `workflow-review-changes inline-execution violation (${rel}): missing ${req.label} — workflow-review-changes MUST declare it runs INLINE in the main session when a step inside a parent workflow`
      );
    }
  }
  for (const forbid of surface.forbid) {
    if (forbid.re.test(content)) {
      failures.push(
        `workflow-review-changes inline-execution violation (${rel}): found ${forbid.label} — workflow-review-changes MUST run inline in the main session, never as a sub-agent (its Step 0 /goal gate owns the session Stop hook)`
      );
    }
  }
  return failures;
}

async function checkReviewChangesInlineExecutionCoverage(rootDir, failures) {
  let checkedCount = 0;
  for (const surface of REVIEW_CHANGES_INLINE_SURFACES) {
    const filePath = path.join(rootDir, ...surface.rel.split("/"));
    // Absent surface ⇒ this framework checkout does not ship it (skip, do not fail) — same
    // portability rule as the optional mirror carriers and goal-contract coverage above.
    if (!(await exists(filePath))) continue;
    const content = await fs.readFile(filePath, "utf8");
    failures.push(...checkReviewChangesInlineExecutionPolicy(surface.rel, content));
    checkedCount += 1;
  }
  return checkedCount;
}

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

  if (DOMAIN_ENTITY_REFERENCE_REFRESH_WORKFLOW_IDS.has(workflowId)) {
    const domainEntityScanStep = "scan --target=domain-entities";
    const scanCount = sequence.filter((step) => step === domainEntityScanStep).length;
    const scanIndex = sequence.indexOf(domainEntityScanStep);
    const hasTerminalDomainEntityRefresh =
      scanCount === 1 &&
      scanIndex > 0 &&
      sequence[scanIndex - 1] === "test" &&
      sequence[scanIndex + 1] === "docs-update";
    if (scanCount !== 1) {
      failures.push(
        `Workflow policy violation (${workflowId}): requires exactly one terminal domain-entity reference refresh test -> scan --target=domain-entities -> docs-update (found ${scanCount})`
      );
    } else if (!hasTerminalDomainEntityRefresh) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing terminal domain-entity reference refresh test -> scan --target=domain-entities -> docs-update`
      );
    }

    const workflowContext = normalizeWhitespace(workflow?.preActions?.injectContext ?? "").toLowerCase();
    const missingContextTerms = DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT_TERMS.filter(
      (term) => !workflowContext.includes(term)
    );
    if (missingContextTerms.length > 0) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing conditional domain-entity reference refresh context term(s): ${missingContextTerms.join(", ")}`
      );
    }
  }

  if (TDD_WORKFLOW_IDS.has(workflowId)) {
    if (!hasOrderedSubsequence(sequence, ["spec [mode=tests]", "artifact-review --type=spec-tests"])) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing ordered spec [mode=tests] -> artifact-review --type=spec-tests`
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
        `Workflow policy violation (${workflowId}): missing implementation step (feature-implement|fix|plan-execute)`
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

// Inline twin of renderBarrierToken in sync-context-workflows.mjs.
// MUST stay byte-identical to that renderer — this is the oracle the cross-mirror parity asserts
// against, so any future format change to the renderer without updating this fails the verifier.
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
    // id is structurally load-bearing: the Codex mirror renderer dedups groups by id, so a
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

// W5(b)+(c) — cross-mirror proof. (b) the expected barrier token is present in the rendered Codex
// mirror; (c) the advancement clause reached the enabled static carrier. Reads the carrier once.
// Mirror file is optional (portability).
async function checkParallelGroupsMirrorParity(workflows, rootDir, failures) {
  const grouped = Object.entries(workflows).filter(
    ([, wf]) => Array.isArray(wf?.parallelGroups) && wf.parallelGroups.length > 0
  );
  if (grouped.length === 0) return;

  const codexPath = path.join(rootDir, CODEX_CARRIER);
  const codexText = (await exists(codexPath)) ? await fs.readFile(codexPath, "utf8") : null;

  const clauseCarriers = [
    { label: `Codex context (${CODEX_CARRIER})`, text: codexText },
  ];
  for (const carrier of clauseCarriers) {
    if (carrier.text === null) continue;
    if (!ADVANCEMENT_CLAUSE_PATTERN.test(carrier.text)) {
      failures.push(`parallelGroups carrier check: advancement clause "${ADVANCEMENT_CLAUSE_LABEL}" missing from ${carrier.label}`);
    }
  }

  const tokenMirrors = [
    { label: `Codex (${CODEX_CARRIER})`, text: codexText },
  ];
  for (const [workflowId, workflow] of grouped) {
    for (const group of workflow.parallelGroups) {
      const expected = renderExpectedBarrierToken(group);
      for (const mirror of tokenMirrors) {
        if (mirror.text === null) continue;
        if (!mirror.text.includes(expected)) {
          failures.push(
            `parallelGroups parity (${workflowId}/${group?.id ?? "(unnamed)"}): expected barrier token absent from ${mirror.label} — regenerate mirrors (npm run codex:sync). Expected: ${expected}`
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

  const reviewChangesInlineCheckedCount = await checkReviewChangesInlineExecutionCoverage(
    rootDir,
    failures
  );

  const startWorkflowPreActionCheckedCount = await checkStartWorkflowPreActionCoverage(
    rootDir,
    failures
  );

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
    `[codex-verify-workflow-cycle] PASS (${workflowIds.length} workflow(s) across .claude/.agents skills; ${TARGET_WORKFLOW_IDS.length} policy-checked; ${groupedCount} parallelGroups workflow(s) parity-checked; ${goalContractCheckedCount} goal-contract skill(s) checked; ${reviewChangesInlineCheckedCount} workflow-review-changes inline-execution surface(s) checked; ${startWorkflowPreActionCheckedCount} start-workflow pre-action surface(s) checked)`
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
  REVIEW_CHANGES_INLINE_SURFACES,
  GOAL_CONTRACT_MARKER,
  GOAL_CONTRACT_SKILL_IDS,
  GOAL_CONTRACT_REVIEW_SKILL_IDS,
  GOAL_CONTRACT_WORKFLOW_SKILL_IDS,
  GOAL_CONTRACT_FILE_REQUIRED_SECTIONS,
};
