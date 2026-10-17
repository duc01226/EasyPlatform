#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveWorkflowManifest, resolveAllWorkflowManifests } = require("../lib/workflow-manifest.cjs");
const { resolveProjectRoot, isInvokedAsScript } = require("../lib/project-root.cjs");
const { buildWorkflowPointerCatalog } = require("../lib/workflow-skills-catalog.cjs");
const { checkWorkflowSkillContract } = require("../lib/workflow-skill-contract.cjs");

// Prose-only semantic anchor for the advancement+barrier rule in the runtime routing payload:
// "advance only after ALL/EVERY member(s) return". Deliberately
// NOT a substring of the rendered barrier token "[parallel ⇉ all-return barrier: …]" — so this
// clause-presence check (W5(c)) proves the rule PROSE reached the payload independently of the
// token-parity check below. (Earlier "all-return barrier" was a token substring, making the check
// near-vacuous for token-bearing output; this semantic phrase closes that blind spot.)
const ADVANCEMENT_CLAUSE_PATTERN = /advance only after (?:all|every)(?: members?)? return/i;
const ADVANCEMENT_CLAUSE_LABEL = 'advance only after ALL/EVERY member(s) return';

// Owner of both runtime route outputs; the hook entries `workflow-route-inject.cjs` and
// `workflow-catalog-inject.cjs` only call its `runHook`.
const RUNTIME_ROUTE_DELIVERY = path.join(".claude", "hooks", "lib", "workflow-route-delivery.cjs");

const TARGET_WORKFLOW_IDS = [
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
  "workflow-implement-spec",
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
  "workflow-implement-spec",
  "workflow-spec-sync",
]);

const IMPLEMENTATION_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
  "workflow-implement-spec",
]);

const DOMAIN_ENTITY_REFERENCE_REFRESH_WORKFLOW_IDS = new Set([
  "workflow-big-feature",
  "workflow-bugfix",
  "workflow-feature",
]);

// A parent workflow that runs `workflow-review-changes` INLINE delegates the nested review gates
// to it: that workflow owns the specialist reviewers (notably `integration-test --mode=review`) and the
// terminal `scan --target=domain-entities` reference refresh. It also owns `docs-manager --mode=update` — but ONLY
// when the nested review is the parent's last docs-mutating step: if a canonical spec step still
// runs AFTER the nested review, that mutation lands after the nested `docs-manager --mode=update`, so the parent
// owes its own terminal docs-manager --mode=update (see the positional `docsClosureSatisfied` guard below). The
// gate is NOT dropped for a workflow that runs no nested review: `delegatesNestedReview` is false
// there and each explicit requirement still applies.
const NESTED_REVIEW_WORKFLOW_ID = "workflow-review-changes";
function delegatesNestedReview(sequence) {
  return Array.isArray(sequence) && sequence.includes(NESTED_REVIEW_WORKFLOW_ID);
}
// The domain-entity refresh is anchored on the step it must follow. That anchor is derived from the
// workflow's own sequence rather than hard-coded, because not every delivery workflow ends its
// verification with the same step: `workflow-bugfix` runs no standalone `test` step (its regression
// evidence is the test-first `integration-test` regression written before the fix, proven by `integration-test --mode=verify` and its mutation check after it). The prose anchor
// skips conditional neighbours, so the injectContext names the last step that ALWAYS runs.
const DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT_TERMS = [
  "before /docs-manager --mode=update",
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

const IMPLEMENTATION_STEPS = new Set(["feature-implement", "fix", "plan --mode=execute"]);
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
// `.agents/**` is a generated mirror refreshed by the standalone runner (`.claude/skills/sync-codex/scripts/run-codex-sync.mjs`), so it is legitimately
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
  "feature", // maps success validation to saved criteria
  "fix", // active-goal read before root-cause work (ci/issue/logs/test/ui are --target branches)
];

// Review gates: must additionally emit Goal Satisfaction status before PASS.
const GOAL_CONTRACT_REVIEW_SKILL_IDS = [
  "changes-review",
  "why-review",
  "code-quality-review",
];

// Review gates that live in a skill's mode reference rather than in a SKILL.md of their own:
// the same Goal Satisfaction requirement applies (`/plan --mode=review`, `/integration-test --mode=verify`
// — the verification evidence that feeds the Goal Satisfaction matrix).
const GOAL_CONTRACT_REVIEW_REFERENCE_PATHS = [
  ".claude/skills/plan/references/mode-review.md",
  ".claude/skills/integration-test/references/mode-verify.md",
];

// Implementation surfaces that live in a skill's mode reference: must resolve + read the active goal
// before work (`/plan --mode=execute`).
const GOAL_CONTRACT_ENTRY_REFERENCE_PATHS = [
  ".claude/skills/plan/references/mode-execute.md",
];

// Workflow wrappers + verification/audit surfaces (Phases 05-06). The planned
// workflow-verification / workflow-quality-audit / workflow-tdd-feature / workflow-test-verify
// wrappers do not exist as files; their intent maps to: test (verification evidence),
// workflow-feature (covers TDD/test-first), and `integration-test --mode=verify` (test
// verification evidence; its body is GOAL_CONTRACT_REVIEW_REFERENCE_PATHS).
const GOAL_CONTRACT_WORKFLOW_SKILL_IDS = [
  "workflow-feature",
  "workflow-bugfix",
  "workflow-review-changes",
  "workflow-integration-test",
  "workflow-code-to-spec",
  "test",
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
// `/goal` gate binds the session Stop hook and its post-fix re-review is inline by design, so a
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
    rel: ".claude/skills/shared/protocols/workflow-step-advancement.md",
    require: [
      {
        label: "workflow-step-advancement: workflow-review-changes inline-in-main-session exception",
        re: /workflow-review-changes[^\n]*inline\s+in\s+the\s+main\s+(?:current\s+)?session/i,
      },
    ],
    forbid: [],
  },
];

// The optional runtime workflow catalog is a fast route-selection surface, not the complete
// execution contract. start-workflow must always load the selected canonical entry before TaskCreate so a
// workflow's pre-actions (including conditional run/skip rules) reach the concrete task.
const START_WORKFLOW_PREACTION_SURFACE = ".claude/skills/start-workflow/SKILL.md";
const START_WORKFLOW_PREACTION_REQUIREMENTS = [
  {
    label: "Tier-2 canonical entry read before TaskCreate",
    re: /Tier 2[^.\n]*required[^.\n]*before[^.\n]*TaskCreate/i,
  },
  {
    label: "all-standard-workflow policy scope",
    re: /every standard workflow/i,
  },
  {
    label: "required non-empty inject-context contract",
    re: /non-empty `?preActions\.injectContext`?/i,
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
    label: "runtime catalog route-selection boundary",
    re: /runtime catalog[^.\n]*route selection only/i,
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
    re: /Do NOT parse the runtime catalog sequence/i,
  },
  {
    label: "host-neutral step invocation guidance",
    re: /active host's command syntax/i,
  },
  {
    label: "conditional completion exception",
    re: /conditional(?:ly)? skipped task[^.\n]*without (?:invoking(?: its)? `?Skill`? tool|skill execution)/i,
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
];

// Workflow wrappers follow the guided step contract that start-workflow owns (BR-GWF-13/16): `gate`
// steps are fixed, other steps may flex with a logged reason. A blanket no-deviation banner in a
// wrapper contradicts that contract; non-workflow skills keep it for their own internal steps.
const WORKFLOW_WRAPPER_FORBIDDEN_BANNERS = [
  {
    label: "blanket no-skip/reorder/merge banner (steps follow the guided contract in start-workflow)",
    re: /NEVER skip, reorder, or merge steps without explicit user approval/i,
  },
];

export function checkWorkflowWrapperStepContract(rel, content) {
  return WORKFLOW_WRAPPER_FORBIDDEN_BANNERS.filter(({ re }) => re.test(content)).map(
    ({ label }) => `Workflow wrapper step-contract violation (${rel}): ${label}`
  );
}

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

export function checkWorkflowInjectContextCoverage(workflows) {
  const failures = [];
  for (const [workflowId, workflow] of Object.entries(workflows ?? {})) {
    const hasLegacySequence = Array.isArray(workflow?.sequence) && workflow.sequence.length > 0;
    const hasVariantSequence =
      workflow?.variants &&
      typeof workflow.variants === "object" &&
      !Array.isArray(workflow.variants) &&
      Object.values(workflow.variants).some(
        (variant) => Array.isArray(variant?.sequence) && variant.sequence.length > 0
      );
    if (!hasLegacySequence && !hasVariantSequence) {
      failures.push(`Workflow ${workflowId} has no executable sequence`);
      continue;
    }
    const injectContext = workflow?.preActions?.injectContext;
    if (typeof injectContext !== "string" || injectContext.trim().length === 0) {
      failures.push(
        `Workflow ${workflowId} is missing required non-empty preActions.injectContext`
      );
    }
  }
  return failures;
}

/**
 * Resolve every executable workflow mode for the cycle verifier.  The verifier deliberately
 * consumes the same manifest producer as activation and the static catalog; it never re-parses
 * variant objects or invents a default when a mode is unknown. Isolated fixtures may supply an
 * explicit availableSkills override; otherwise every declared skill must exist on disk.
 */
export function resolveWorkflowManifestsForVerification(
  workflowsDoc,
  workflowId,
  { rootDir = process.cwd(), mode, availableSkills } = {}
) {
  const registry = workflowsDoc?.workflows ?? {};
  if (!Object.hasOwn(registry, workflowId)) throw new Error(`Unknown workflow ID: ${workflowId}`);
  const resolverOptions = {
    rootDir,
    ...(availableSkills !== undefined ? { availableSkills: new Set(availableSkills) } : {}),
  };
  if (mode !== undefined) {
    return [resolveWorkflowManifest(workflowsDoc, workflowId, { ...resolverOptions, mode })];
  }
  return resolveAllWorkflowManifests(workflowsDoc, workflowId, resolverOptions);
}

// Variant-bearing entries may retain a legacy `sequence` preview for older wrapper text.  The
// canonical resolver intentionally rejects string steps when `variants` is present, so resolve
// that compatibility preview through an isolated legacy projection instead of interpreting it a
// second time in the verifier.  This keeps wrapper parity backwards-compatible while all selected
// variants continue to use the real manifest above.  The projection drops `outcomeGates`: gates
// are proven against every real mode, and a gate satisfied only by a variant step would otherwise
// fail against the legacy preview.
export function resolveCompatibilityWorkflowManifest(workflowsDoc, workflowId, rootDir) {
  const workflow = workflowsDoc.workflows[workflowId];
  if (!Array.isArray(workflow?.sequence) || workflow.sequence.length === 0) return null;
  if (!workflow.variants) {
    return resolveWorkflowManifestsForVerification(workflowsDoc, workflowId, { rootDir })[0] ?? null;
  }
  const legacyEntry = { ...workflow };
  delete legacyEntry.variants;
  delete legacyEntry.defaultMode;
  delete legacyEntry.outcomeGates;
  const legacyDoc = {
    ...workflowsDoc,
    workflows: { ...workflowsDoc.workflows, [workflowId]: legacyEntry },
  };
  return resolveWorkflowManifestsForVerification(legacyDoc, workflowId, { rootDir })[0] ?? null;
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

// `.claude/skills/<owner>/references/<file>.md` -> `<owner>` (the skill whose SKILL.md ships the mode reference).
function referenceOwnerSkill(rel) {
  const match = /^\.claude\/skills\/([^/]+)\/references\//.exec(rel);
  return match ? match[1] : null;
}

async function checkGoalContractSkillCoverage(rootDir, failures) {
  const claudeSkillsRoot = path.join(rootDir, ".claude", "skills");
  const targets = [
    ...GOAL_CONTRACT_SKILL_IDS.map((id) => ({ id, requireSatisfaction: false })),
    ...GOAL_CONTRACT_REVIEW_SKILL_IDS.map((id) => ({ id, requireSatisfaction: true })),
    ...GOAL_CONTRACT_WORKFLOW_SKILL_IDS.map((id) => ({ id, requireSatisfaction: true })),
  ];
  for (const rel of GOAL_CONTRACT_REVIEW_REFERENCE_PATHS) {
    targets.push({ id: rel, requireSatisfaction: true, filePath: path.join(rootDir, ...rel.split("/")), ownerSkill: referenceOwnerSkill(rel) });
  }
  for (const rel of GOAL_CONTRACT_ENTRY_REFERENCE_PATHS) {
    targets.push({ id: rel, requireSatisfaction: false, filePath: path.join(rootDir, ...rel.split("/")), ownerSkill: referenceOwnerSkill(rel) });
  }
  let checkedCount = 0;
  for (const target of targets) {
    const skillPath = target.filePath ?? path.join(claudeSkillsRoot, target.id, "SKILL.md");
    if (!(await exists(skillPath))) {
      // A mode reference whose owner skill ships is part of that skill: its goal-contract lifecycle
      // cannot be checked when the file is gone, so that is a failure, never a silent skip.
      if (target.ownerSkill && (await exists(path.join(claudeSkillsRoot, target.ownerSkill, "SKILL.md")))) {
        failures.push(
          `Goal-contract violation (${target.id}): the mode reference is missing although its owner skill '${target.ownerSkill}' ships — its goal-contract lifecycle cannot be verified`
        );
      }
      // Absent skill ⇒ this framework checkout does not ship that skill (skip, do not fail) —
      // same portability rule as the optional mirror carriers above. In the canonical repo all
      // targeted skills exist, so removals surface through the normal review/diff path.
      continue;
    }
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

  // Variant-aware wrappers often explain the resolver before showing the default sequence, e.g.
  // "resolve ... (default: /investigate -> /web-research -> /workflow-end)".  Extract the
  // parenthesized/default list before splitting arrows so prose and trailing punctuation cannot
  // become synthetic step IDs.  Plain legacy lines continue through unchanged.
  const defaultList = matchedLine.match(/\bdefault\s*:\s*([^)]*)\)?\s*\.?\s*$/i)?.[1];
  const source = defaultList || matchedLine;

  return source
    .split(/\s*->\s*/)
    .map((token) => normalizeSkillStepToken(token))
    .map((token) => token.replace(/[).,;:]+$/g, "").trim())
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

// `spec [mode=discovery|clarify|index]` read specs, gate decisions or derive aids; they never author or
// sync the canonical artifact, so they cannot stand in for the canonical spec step.
const NON_CANONICAL_SPEC_MODE = /\[mode=(?:discovery|clarify|index)\]/;
function isCanonicalSpecStep(step) {
  return (step === "spec" || step.startsWith("spec ")) && !NON_CANONICAL_SPEC_MODE.test(step);
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

// The nested review's `--tests={prove|defer}` mode flag (SYNC:verify-last-order) selects when its test
// run happens, not which step it is: the policy identifies it by skill name.
const REVIEW_TESTS_MODE_FLAG = /^workflow-review-changes\s+--tests=(?:prove|defer)$/;

// `integration-test` and `e2e-test` serve several roles through their `--mode` flag; the policy identifies
// the role (review / verify), not the flag set that accompanies it (`--report-only`, `--fix-loop`, ...).
const MODE_ROLE_STEP = /^(integration-test|e2e-test)\s+(?:\S+\s+)*--mode=(review|verify)(?:\s|$)/;
function modeRoleStep(step) {
  const match = MODE_ROLE_STEP.exec(step);
  return match ? `${match[1]} --mode=${match[2]}` : step;
}
const REVIEW_DEFERS_TESTS_FLAG = /^workflow-review-changes\s+--tests=defer$/;

function ensureWorkflowPolicy(workflowId, workflow, rawPolicySequence, failures) {
  const sequence = rawPolicySequence.map((step) => modeRoleStep(REVIEW_TESTS_MODE_FLAG.test(step) ? NESTED_REVIEW_WORKFLOW_ID : step));
  const nestedReview = delegatesNestedReview(sequence);
  const nestedReviewIndex = sequence.indexOf(NESTED_REVIEW_WORKFLOW_ID);
  const integrationIndex = sequence.indexOf("integration-test");
  const integrationVerifyIndex = sequence.indexOf("integration-test --mode=verify");
  // A delegated review stands in for `integration-test --mode=review` ONLY when it runs AFTER the
  // integration test it is meant to review. A position-blind `includes` let `workflow-spec-sync`
  // pass the gate with a nested review that executes BEFORE the integration test — the review
  // reviewed the wrong state. Mirror the positional `docsClosure` guard below.
  const nestedReviewAfterIntegration =
    nestedReviewIndex >= 0 && integrationIndex >= 0 && nestedReviewIndex > integrationIndex;
  const integrationGateSatisfied =
    hasOrderedSubsequence(sequence, [
      "integration-test",
      "integration-test --mode=review",
      "integration-test --mode=verify",
    ]) ||
    (nestedReview && nestedReviewAfterIntegration &&
      hasOrderedSubsequence(sequence, ["integration-test", "integration-test --mode=verify"]));
  if (!integrationGateSatisfied) {
    failures.push(
      `Workflow policy violation (${workflowId}): missing ordered integration gate integration-test -> integration-test --mode=review -> integration-test --mode=verify (a nested workflow-review-changes occurrence satisfies integration-test --mode=review)`
    );
  }

  // Delegated docs closure is only valid when the nested review observes the SETTLED docs state: if
  // the parent still runs a canonical spec step AFTER the nested review, that mutation lands after
  // the nested `docs-manager --mode=update`, so the parent owes its own terminal docs-manager --mode=update. Without this
  // positional guard a workflow could place `workflow-review-changes` first, mutate specs
  // afterwards, and still pass the closure check with no docs sync over its own changes.
  const specStepsAfterNestedReview =
    nestedReviewIndex >= 0 &&
    sequence.slice(nestedReviewIndex + 1).some((step) => isCanonicalSpecStep(step));
  const docsClosureSatisfied =
    hasOrderedSubsequence(sequence, ["docs-manager --mode=update", "workflow-end"]) ||
    (nestedReview && sequence.includes("workflow-end") && !specStepsAfterNestedReview);
  if (!docsClosureSatisfied) {
    failures.push(
      `Workflow policy violation (${workflowId}): missing ordered closure docs-manager --mode=update -> workflow-end (a nested workflow-review-changes occurrence satisfies docs-manager --mode=update only when no canonical spec step runs after it)`
    );
  }

  // The terminal domain-entity reference refresh is owned by the nested workflow-review-changes ONLY
  // when that review runs after the parent's terminal verification (i.e. it observes the settled
  // state). A nested review placed before verification must not absorb the requirement.
  // Verify-last order (SYNC:verify-last-order): a review that defers its tests (`--tests=defer`) runs
  // BEFORE the verify by design, but the protocol re-runs it after any edit the verify step makes
  // (verify-last-order step 5; `workflow-end` reads the review receipt or a cited report), so its final
  // run still observes the settled state. A deferring review with no verify step after it would leave its
  // own fixes unverified, so that shape fails below.
  const nestedReviewDefersTests = rawPolicySequence.some((step) => REVIEW_DEFERS_TESTS_FLAG.test(step));
  if (nestedReviewDefersTests) {
    const verifySteps = new Set(["integration-test --mode=verify", "test", "e2e-test --mode=verify"]);
    if (!sequence.slice(nestedReviewIndex + 1).some((step) => verifySteps.has(step))) {
      failures.push(
        `Workflow policy violation (${workflowId}): workflow-review-changes --tests=defer needs a verify step (integration-test --mode=verify|test|e2e-test --mode=verify) after it — its fixes would otherwise never run under tests`
      );
    }
  }
  const nestedReviewCoversTerminalState =
    nestedReviewIndex >= 0 &&
    (integrationVerifyIndex < 0 || nestedReviewIndex > integrationVerifyIndex || nestedReviewDefersTests);
  if (DOMAIN_ENTITY_REFERENCE_REFRESH_WORKFLOW_IDS.has(workflowId) && !nestedReviewCoversTerminalState) {
    const domainEntityScanStep = "scan --target=domain-entities";
    const scanCount = sequence.filter((step) => step === domainEntityScanStep).length;
    const scanIndex = sequence.indexOf(domainEntityScanStep);
    const hasTerminalDomainEntityRefresh =
      scanCount === 1 && scanIndex > 0 && sequence[scanIndex + 1] === "docs-manager --mode=update";
    if (scanCount !== 1) {
      failures.push(
        `Workflow policy violation (${workflowId}): requires exactly one terminal domain-entity reference refresh <verification step> -> scan --target=domain-entities -> docs-manager --mode=update (found ${scanCount})`
      );
    } else if (!hasTerminalDomainEntityRefresh) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing terminal domain-entity reference refresh <verification step> -> scan --target=domain-entities -> docs-manager --mode=update`
      );
    }

    // The prose anchor is the last step before the scan that ALWAYS runs: a conditional neighbour
    // (e.g. an opt-in E2E handoff) is skipped by default, so naming it would tell the reader to
    // sequence the refresh after a step that usually never executes.
    const conditionalSteps = new Set(
      (Array.isArray(workflow?.sequence) ? workflow.sequence : [])
        .filter((step) => step && typeof step === "object" && step.applicability)
        .map((step) => normalizeWhitespace(`${step.skill ?? ""}`).replace(/^[/$]+/, "").trim())
        .filter(Boolean)
    );
    let anchorIndex = scanIndex - 1;
    while (anchorIndex > 0 && conditionalSteps.has(sequence[anchorIndex].split(" ")[0])) {
      anchorIndex -= 1;
    }
    const anchorTerm =
      anchorIndex >= 0 ? `after /${sequence[anchorIndex].split(" ")[0]}` : "after /test";

    const workflowContext = normalizeWhitespace(workflow?.preActions?.injectContext ?? "").toLowerCase();
    const missingContextTerms = [
      anchorTerm,
      ...DOMAIN_ENTITY_REFERENCE_REFRESH_CONTEXT_TERMS,
    ].filter((term) => !workflowContext.includes(term));
    if (missingContextTerms.length > 0) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing conditional domain-entity reference refresh context term(s): ${missingContextTerms.join(", ")}`
      );
    }
  }

  if (TDD_WORKFLOW_IDS.has(workflowId)) {
    if (!hasOrderedSubsequence(sequence, ["spec [mode=tests]", "work-item --mode=review --type=spec-tests"])) {
      failures.push(
        `Workflow policy violation (${workflowId}): missing ordered spec [mode=tests] -> work-item --mode=review --type=spec-tests`
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
        `Workflow policy violation (${workflowId}): missing implementation step (feature-implement|fix|plan --mode=execute)`
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
  const nestedReview = delegatesNestedReview(sequence);
  const implementationVerified =
    hasOrderedSubsequence(implementationTail, [
      implementationStep,
      "integration-test",
      "integration-test --mode=review",
      "integration-test --mode=verify",
    ]) ||
    (nestedReview &&
      hasOrderedSubsequence(implementationTail, [
        implementationStep,
        "integration-test",
        "integration-test --mode=verify",
      ])) ||
    // Test-first regression: the reproducing test is written BEFORE the change (a bug fix) and the
    // verify after the change proves it red without the fix and green with it.
    (nestedReview &&
      hasOrderedSubsequence(sequence, ["integration-test", implementationStep, "integration-test --mode=verify"]));
  if (!implementationVerified) {
    failures.push(
      `Workflow policy violation (${workflowId}): implementation must be verified by integration-test -> integration-test --mode=review -> integration-test --mode=verify after '${implementationStep}' (a nested workflow-review-changes occurrence satisfies integration-test --mode=review; a test written before '${implementationStep}' counts when the verify runs after it)`
    );
  }

  const specSyncBeforeDocs =
    hasOrderedSubsequence(implementationTail, [
      implementationStep,
      "spec [mode=sync]",
      "docs-manager --mode=update",
    ]) ||
    (nestedReview &&
      hasOrderedSubsequence(implementationTail, [implementationStep, "spec [mode=sync]"]));
  if (!specSyncBeforeDocs) {
    failures.push(
      `Workflow policy violation (${workflowId}): implementation must be followed by spec [mode=sync] before docs-manager --mode=update (a nested workflow-review-changes occurrence satisfies docs-manager --mode=update)`
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

// Inline twin of the runtime catalog renderer's barrier token.
// MUST stay byte-identical to that renderer — this is the oracle the runtime parity check asserts
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
    // id is structurally load-bearing: the runtime catalog renderer dedups groups by id, so a
    // missing or duplicate id silently drops a group's barrier token from the rendered payload. Require
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

// W5(a) for a resolved manifest.  The resolver has already normalized barrier members to stable
// occurrence IDs; this second, consumer-side oracle proves the cycle checker actually consumes
// those IDs (rather than silently falling back to a legacy command string) and that every declared
// group remains a contiguous all-return wave in the selected mode.
export function checkResolvedParallelGroupsStructure(workflowId, manifest, failures, { mode } = {}) {
  const label = mode ? `${workflowId}/${mode}` : workflowId;
  const occurrences = Array.isArray(manifest?.occurrences) ? manifest.occurrences : [];
  const sequenceIds = occurrences.map((occurrence) => occurrence?.id);
  const sequenceIndex = new Map(sequenceIds.map((id, index) => [id, index]));
  const groups = Array.isArray(manifest?.parallelGroups) ? manifest.parallelGroups : [];
  const owners = new Map();
  const groupIds = new Set();

  for (const group of groups) {
    const groupId = group?.id ?? "(unnamed)";
    if (typeof group?.id !== "string" || group.id.trim() === "") {
      failures.push(`resolved parallelGroups violation (${label}/${groupId}): group needs a non-empty id`);
    } else if (groupIds.has(group.id)) {
      failures.push(`resolved parallelGroups violation (${label}/${groupId}): duplicate group id`);
    } else {
      groupIds.add(group.id);
    }
    if (group?.barrier !== true) {
      failures.push(`resolved parallelGroups violation (${label}/${groupId}): barrier must be true`);
    }
    const members = Array.isArray(group?.members) ? group.members : [];
    if (members.length < 2) {
      failures.push(`resolved parallelGroups violation (${label}/${groupId}): a group needs >=2 occurrence IDs`);
    }
    const positions = [];
    for (const member of members) {
      if (!sequenceIndex.has(member)) {
        failures.push(`resolved parallelGroups violation (${label}/${groupId}): unknown occurrence '${member}'`);
        continue;
      }
      if (owners.has(member)) {
        failures.push(
          `resolved parallelGroups violation (${label}/${groupId}): occurrence '${member}' already belongs to '${owners.get(member)}'`
        );
      } else {
        owners.set(member, groupId);
      }
      positions.push(sequenceIndex.get(member));
      const occurrence = occurrences[sequenceIndex.get(member)];
      if (occurrence?.barrier !== groupId) {
        failures.push(
          `resolved parallelGroups violation (${label}/${groupId}): occurrence '${member}' does not carry its barrier owner`
        );
      }
    }
    const sorted = positions.slice().sort((a, b) => a - b);
    if (sorted.some((position, index) => position !== sorted[0] + index)) {
      failures.push(`resolved parallelGroups violation (${label}/${groupId}): members must be contiguous`);
    }
    const conditional = Array.isArray(group?.conditionalMembers) ? group.conditionalMembers : [];
    for (const member of conditional) {
      if (!members.includes(member)) {
        failures.push(
          `resolved parallelGroups violation (${label}/${groupId}): conditional occurrence '${member}' is outside members`
        );
      }
      if (!sequenceIndex.has(member)) {
        failures.push(
          `resolved parallelGroups violation (${label}/${groupId}): conditional occurrence '${member}' is unknown`
        );
      }
    }
  }
  return failures;
}

// Catalog forms the runtime catalog output can take (lib/workflow-route-delivery.cjs
// buildCatalogInjection, delivered by workflow-catalog-inject.cjs). The
// compact catalog and the index with parallel-phase marks carry every barrier token per workflow
// row; the tiers-only index and the pointer-only form omit them by design (`start-workflow <id>`
// loads a workflow's phases).
const RUNTIME_CATALOG_FORMS = Object.freeze({
  CATALOG: "catalog",
  INDEX_MARKED: "index-marked",
  INDEX_TIERS: "index-tiers",
  POINTER_ONLY: "pointer-only",
});

// Identify a pointer form by the exact body the shared catalog builder renders for this root, so no
// header text is duplicated here. The pointer-only body is a prefix of both index bodies, so the
// marked index is tested first. A payload that matches no pointer body (the compact catalog, the
// full catalog, or an unrecognised one) is reported as `catalog` and stays under the parity check.
export function runtimeCatalogForm(runtimeText, rootDir) {
  const rendered = (rows) => {
    try {
      return buildWorkflowPointerCatalog({ rootDir, rows });
    } catch {
      return "";
    }
  };
  const carries = (body) => typeof body === "string" && body.length > 0 && runtimeText.includes(body);
  if (carries(rendered("groups"))) return RUNTIME_CATALOG_FORMS.INDEX_MARKED;
  if (carries(rendered("tiers"))) return RUNTIME_CATALOG_FORMS.INDEX_TIERS;
  if (carries(rendered("none"))) return RUNTIME_CATALOG_FORMS.POINTER_ONLY;
  return RUNTIME_CATALOG_FORMS.CATALOG;
}

// W5(b)+(c) — runtime-payload proof. (b) every expected barrier token is present in the catalog
// output the runtime prompt hooks emit, when that text is a marked form; (c) the advancement clause reached
// that payload, in every form. Root and mirror files carry no route text, so the runtime output is the
// only place either can be checked.
async function checkParallelGroupsMirrorParity(workflows, rootDir, failures, resolvedByWorkflow = []) {
  const grouped = Object.entries(workflows).filter(
    ([, wf]) => Array.isArray(wf?.parallelGroups) && wf.parallelGroups.length > 0
  );
  const resolvedGrouped = (resolvedByWorkflow ?? []).flatMap(({ workflowId, manifests }) =>
    (manifests ?? [])
      .filter((manifest) => Array.isArray(manifest?.parallelGroups) && manifest.parallelGroups.length > 0)
      .map((manifest) => ({ workflowId, manifest }))
  );
  if (grouped.length === 0 && resolvedGrouped.length === 0) return;

  const deliveryPath = path.join(rootDir, RUNTIME_ROUTE_DELIVERY);
  if (!(await exists(deliveryPath))) {
    failures.push(`parallelGroups runtime check: missing route delivery module ${RUNTIME_ROUTE_DELIVERY}`);
    return;
  }
  let runtimeText;
  try {
    // The catalog rides its own hook output; the route output (gate + protocol) carries no rows.
    const { buildCatalogInjection } = require(deliveryPath);
    runtimeText = buildCatalogInjection(rootDir);
  } catch (error) {
    failures.push(`parallelGroups runtime check: could not build ${RUNTIME_ROUTE_DELIVERY} payload (${error?.message || error})`);
    return;
  }

  if (!ADVANCEMENT_CLAUSE_PATTERN.test(runtimeText)) {
    failures.push(`parallelGroups runtime check: advancement clause "${ADVANCEMENT_CLAUSE_LABEL}" missing from ${RUNTIME_ROUTE_DELIVERY} payload`);
  }
  // The runtime catalog intentionally shows human-readable route summaries rather than the
  // resolver's internal occurrence IDs. Structural checks above own exact membership and
  // barriers; this boundary check proves every grouped workflow still exposes parallel notation
  // in the marked forms. The tiers-only index skips it; the pointer-only form renders no rows, so
  // a grouped row that still appears there is checked.
  const form = runtimeCatalogForm(runtimeText, rootDir);
  for (const [workflowId, workflow] of grouped) {
    const row = runtimeText.split(/\r?\n/).find(line => line.startsWith(`| \`${workflowId}\` |`));
    if (form === RUNTIME_CATALOG_FORMS.INDEX_TIERS || (form === RUNTIME_CATALOG_FORMS.POINTER_ONLY && !row)) continue;
    const renderedGroups = (row?.match(/\[[^\]]*∥[^\]]*\]/g) || []).length;
    const expectedGroups = workflow.parallelGroups.length;
    if (renderedGroups < expectedGroups) {
      failures.push(
        `parallelGroups runtime parity (${workflowId}): expected ${expectedGroups} parallel group(s), found ${renderedGroups} in ${RUNTIME_ROUTE_DELIVERY} payload`
      );
    }
  }
}

async function main() {
  const rootDir = resolveProjectRoot({
    cwd: process.cwd(),
    scriptPath: fileURLToPath(import.meta.url),
    env: process.env,
  }).rootDir;
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
  const resolvedByWorkflow = [];

  failures.push(...checkWorkflowInjectContextCoverage(workflows));

  for (const workflowId of workflowIds) {
    const workflow = workflows?.[workflowId];
    if (!workflow) {
      failures.push(`Missing workflow id in .claude/workflows.json: ${workflowId}`);
      continue;
    }

    let manifests;
    try {
      manifests = resolveWorkflowManifestsForVerification(workflowsDoc, workflowId, { rootDir });
    } catch (error) {
      failures.push(`Workflow manifest violation (${workflowId}): ${error.message}`);
      continue;
    }
    resolvedByWorkflow.push({ workflowId, workflow, manifests });

    // A legacy `sequence` remains the compatibility preview consumed by existing wrapper prose;
    // when a workflow is variant-only, use its selected default mode as that preview.  Every mode
    // is still resolved and structurally checked below, so the preview can never hide a malformed
    // or duplicate variant occurrence.
    let compatibilityManifest;
    try {
      compatibilityManifest =
        resolveCompatibilityWorkflowManifest(workflowsDoc, workflowId, rootDir) ?? manifests[0];
    } catch (error) {
      failures.push(`Workflow compatibility-sequence violation (${workflowId}): ${error.message}`);
      continue;
    }
    const workflowSequence = compatibilityManifest?.sequence ?? [];
    if (workflowSequence.length === 0) {
      failures.push(`Workflow has empty sequence: ${workflowId}`);
      continue;
    }

    const expectedSteps = normalizeSequence(workflowSequence, stepAliases);
    // Run policy checks for every resolved mode.  This is intentionally independent of wrapper
    // text: a mode-specific sequence can add/remove gates, and a default-only check would miss the
    // defect.  Legacy workflows have one `default` manifest and preserve the prior behavior.
    for (const manifest of manifests) {
      const modeSteps = normalizeSequence(manifest.sequence, stepAliases);
      if (TARGET_WORKFLOW_IDS.includes(workflowId)) {
        ensureWorkflowPolicy(workflowId, workflow, modeSteps, failures);
      }
      checkResolvedParallelGroupsStructure(workflowId, manifest, failures, { mode: manifest.mode });
    }

    const workflowSkillName = getWorkflowSkillName(workflowId);
    for (const skillRoot of skillRoots) {
      const skillPath = path.join(skillRoot.path, workflowSkillName, "SKILL.md");
      if (!(await exists(skillPath))) {
        failures.push(`Missing workflow skill file (${skillRoot.label}): ${normalizePath(skillPath, rootDir)}`);
        continue;
      }

      const skillContent = await fs.readFile(skillPath, "utf8");
      failures.push(...checkWorkflowSkillContract(workflowId, workflow, manifests, skillContent, {
        dialect: skillRoot.label === ".agents" ? "$" : "/",
      }));
      // Source wrappers only: the mirrors are regenerated from them.
      if (skillRoot.label === ".claude") {
        failures.push(...checkWorkflowWrapperStepContract(normalizePath(skillPath, rootDir), skillContent));
      }
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

  await checkParallelGroupsMirrorParity(workflows, rootDir, failures, resolvedByWorkflow);

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
  isInvokedAsScript(process.argv[1], fileURLToPath(import.meta.url));

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
  isCanonicalSpecStep,
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
  RUNTIME_CATALOG_FORMS,
  REVIEW_CHANGES_INLINE_SURFACES,
  GOAL_CONTRACT_MARKER,
  GOAL_CONTRACT_SKILL_IDS,
  GOAL_CONTRACT_REVIEW_SKILL_IDS,
  GOAL_CONTRACT_REVIEW_REFERENCE_PATHS,
  GOAL_CONTRACT_ENTRY_REFERENCE_PATHS,
  GOAL_CONTRACT_WORKFLOW_SKILL_IDS,
  GOAL_CONTRACT_FILE_REQUIRED_SECTIONS,
};
