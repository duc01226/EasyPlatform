---
name: workflow-code-to-spec
version: 4.0.0
description: "[Workflow] Author canonical specs from existing code, update them after changes, or audit staleness; reconcile behavior and test evidence."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-code-to-spec` together with this skill. Call [`/start-workflow workflow-code-to-spec`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `init-full`: [`/investigate`](../investigate/SKILL.md) (core) → [`/plan`](../plan/SKILL.md) (optional; conditional) → [`/plan --mode=validate`](../plan/SKILL.md) (optional; conditional) → [`/spec [mode=init]`](../spec/SKILL.md) (core) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=review --type=spec-tests --fix-loop`](../work-item/SKILL.md) (gate) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (3) → Specify (4; exit review-converged, spec-synced) → Close (2; exit run-closed)
<!-- workflow-mode:init-full fingerprint:afbdb83d606a12fc71e945c0a44ddf08400c70bede4b0598d78d584cede5343d -->
- Mode `update`: [`/workflow-review-changes --review-only`](../workflow-review-changes/SKILL.md) (gate) → [`/spec [mode=update]`](../spec/SKILL.md) (core) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=review --type=spec-tests --fix-loop`](../work-item/SKILL.md) (gate) → [`/spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Specify (5; exit review-converged, spec-synced) → Close (2; exit run-closed)
<!-- workflow-mode:update fingerprint:42b3f31e632c9b59f30b0fdd80754581121b7e82f0131bf20594762bcfc85b18 -->
- Mode `audit`: [`/investigate`](../investigate/SKILL.md) (core) → [`/spec [mode=audit]`](../spec/SKILL.md) (core) → [`/why-review --validate-findings`](../why-review/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Specify (2; exit review-converged, spec-synced) → Close (2; exit run-closed)
<!-- workflow-mode:audit fingerprint:0c6e431e6ae87e7ab19cee59b4480dc7f90b1617cd3b9d6f1382d522934882aa -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Keep one canonical spec per capability aligned with implementation and test evidence: author from code (`init-full`), reconcile changes (`update`, default), or report staleness (`audit`).

**Summary:** Confirm mode and capability owners → triage scope → resolve the selected manifest → investigate/plan or review changes → author/update/audit → reconcile and review cases and changed spec intent (audit: validate the report's findings) → sync declared aids → refresh derived docs that embed the spec → outcome gates and close → handoff. Preserve native artifact contracts, full-chain evidence and bounded review convergence.

**Key Rules:** Code owns technical truth; specs own requirements and behavior. Create only declared derived aids, never a parallel authored tree. Confirm scope first; resolve the profile before writing; unknown coverage stays BLOCKED/UNKNOWN.

**Use it when** specs must be written from or reconciled with code: first-time specs for a capability or bucket, after significant code changes, onboarding/compliance handoff, before a migration, or a periodic health audit. **Use a sibling instead when:** no code exists yet → `workflow-planned-work` (`idea-to-spec`); one small spec edit → `/spec` or `workflow-feature-spec`; post-change sync inside a delivery run → `workflow-spec-sync`; only a derived index/ERD → `/spec [mode=index]`.

**IMPORTANT MANDATORY Steps:** /workflow-review-changes --review-only -> /spec [mode=update] -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests --fix-loop -> /spec [mode=sync] -> /docs-manager --mode=update -> /workflow-end -> /watzup

That line is the default `update` sequence. Each mode resolves its own manifest (fingerprint + occurrence IDs) through `/start-workflow` before any task is created:

| Mode        | When                                             | Recommended sequence (**gate** in bold)                                                                                                                                                       |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init-full` | no canonical spec exists for the target scope    | investigate → plan* → plan --mode=validate* → spec [mode=init] → spec [mode=tests]* → **work-item --mode=review --type=spec-tests** → docs-manager --mode=update* → **workflow-end** → watzup* |
| `update`    | code changed, new requirement or task             | **workflow-review-changes --review-only** → spec [mode=update] → spec [mode=tests]* → **work-item --mode=review --type=spec-tests** → spec [mode=sync]* → docs-manager --mode=update* → **workflow-end** → watzup*                   |
| `audit`     | freshness check before a release or on a cadence | investigate → spec [mode=audit] → **why-review --validate-findings** → **workflow-end** → watzup*                                                                                               |

`*` = optional; apply the registry conditions and skip reasons below verbatim.

- **init-full / plan:** run when more than three capabilities are in scope, or the split strategy, naming or ownership was not confirmed at mode selection. Skip reason: "One to three capabilities whose names, owners and target paths the user confirmed at mode selection; the Coverage Ledger carries the split."
- **init-full / plan --mode=validate:** run when the plan step ran in this run. Skip reason: "The plan step did not run (one to three capabilities whose names, owners and target paths the user confirmed at mode selection), so there is no plan to validate; the mode-selection confirmation records those decisions."
- **init-full / spec [mode=tests]:** run when four or more capabilities fan out to spec sub-agents, or the init step could not write complete test cases with real source anchors. Skip reason: "The init step wrote every test case with its real source anchor."
- **init-full / docs-manager --mode=update:** run when a derived index, README or reference doc that embeds the new specs must be refreshed. Skip reason: "No derived index or reference doc embeds the new specs; the spec steps wrote the canonical owners."
- **update / spec [mode=tests]:** run when the change alters business-visible behavior, a public contract, or the test evidence of a specified capability. Skip reason: "A purely cosmetic change (styling, comments, configuration) with no behavioral or test-evidence impact."
- **update / spec [mode=sync]:** run when native case/evidence links or project-declared derived outputs changed in this cycle. Skip reason: "No case/evidence link or declared derived output changed in this cycle."
- **update / docs-manager --mode=update:** run when a derived index, README or reference doc that embeds the updated spec must be refreshed. Skip reason: "No derived index or reference doc embeds the updated spec; the spec steps wrote the canonical owner."
- **every mode / watzup:** run when the user asked for a session report or an HTML wrap-up, or the session spanned several workflows or prompts that need one consolidated handoff. Skip reason: "workflow-end printed the recap, or the short handoff when nothing was built, and every applicable outcome gate passed."

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [1. Step 0 — Mode and Scope (MANDATORY FIRST)](#1-step-0--mode-and-scope-mandatory-first)
- [2. Triage (sets depth, recorded in the run report)](#2-triage-sets-depth-recorded-in-the-run-report)
- [3. Required Quality Gates (non-negotiable)](#3-required-quality-gates-non-negotiable)
- [4. Recommended Skills](#4-recommended-skills)
- [5. Orchestration Freedom](#5-orchestration-freedom)
- [6. Memory, Reporting and Fix Path](#6-memory-reporting-and-fix-path)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## 1. Step 0 — Mode and Scope (MANDATORY FIRST)

Resolve the configured business spec root and artifact contract, then suggest a mode: no current spec for the target → `init-full`; a diff touches an already-specified capability → `update`; an explicit audit/freshness request → `audit`. Map changed code to its capability owner through the App Bucket Mapping in the local `spec-system-reference.md` (reference-docs root from `docsRoots.projectReference.path`). For `audit`, choose the supported mode, capability names and target paths under `SYNC:review-decision-autonomy` and record the rationale; ask only for an indispensable missing fact or actual action authority. For non-audit modes, **BLOCKING:** confirm mode, capability names and target paths via `ask user question tool` before any other action.

## 2. Triage (sets depth, recorded in the run report)

| Scope                                   | Signal                                | Strategy                                                                                                       |
| --------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Single capability** (XS/S)            | one feature or one diff               | inline; no separate plan when names, owners and paths were confirmed at mode selection; plan --mode=validate only when naming or ownership is ambiguous                                   |
| **Single bucket** (M)                   | one module/service, 2–10 capabilities | 2–3 confirmed capabilities run inline like XS/S; more than three, or an unconfirmed split, naming or ownership, plan one task per capability and validate that plan; 4–10 capabilities → one `spec` sub-agent per capability in ONE message           |
| **Multi-bucket / whole project** (L/XL) | "all specs", several buckets          | Coverage Ledger (below); groups of at most 10 capabilities per run, run sequentially across resumable sessions |

Split by independently nameable capabilities, never by line count; apply the native profile's cardinality rule (the `>40` cases heuristic is portable-default only). Update-mode kinds: purely cosmetic change (styling, comments, config) → no case/evidence change; behavior or contract change → cases reconciled; user-facing behavior → interaction-intent refresh.

**Coverage Ledger (BLOCKING for multi-bucket/whole-project).** Enumerate every bucket × capability found by investigate, then write `tmp/reports/code-to-spec-coverage-{date}.md` with one row per capability: owner · capability · canonical spec path · intent · contracts · test/evidence coverage · chain trace · status (NOT STARTED → IN PROGRESS → SPEC DONE → REVIEWED). Update the row after each capability. **Resume rule:** after compaction or a new session read the ledger and `TaskList` FIRST, re-enumerate the business spec root, continue from the first non-REVIEWED row — never re-author a done capability, never re-run investigate or plan for enumerated buckets.

## 3. Required Quality Gates (non-negotiable)

| Gate                                                          | Evidence that proves it                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact profile resolved**                                 | Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md` before any author/update/audit step. A malformed or conflicting contract is BLOCKED. |
| **Full vertical chain traced**                                | Per capability: UI view/action → API → handler → domain rule → event → consumer/read model → UI outcome, reconciled by the `/spec [mode=init]` chain-reconciliation step — no orphan UI, no orphan operation, event and read-side closure. A BROKEN chain is a spec finding, never silently dropped.                            |
| **Three-way sync** (`spec-synced`, modes that write the spec) | Native intent/contract/acceptance roles ↔ configured cases/evidence ↔ executing test code agree; follow the local `spec-system-reference.md`, including its STATE MACHINE DATA ASSERT mandate. Each case names its **Business Intent / Invariant Guarded**, links to executing proof, and would fail if that intent broke.      |
| **Spec review converged** (`review-converged`)                | Writing modes: `/work-item --mode=review --type=spec-tests` on the cases and on the spec intent §1-7 the run authored or changed, including the BLOCKING **M1-M7** gate: zero `[UNVERIFIED]` without an exclusion reason, complete role/evidence coverage, tech-term checks only on designated intent roles. Audit: `/why-review --validate-findings` validates the audit report's findings; the run stays read-only.                                                                                          |
| **Change review** (update mode)                               | `/workflow-review-changes --review-only` run INLINE in the main session: one validated pass with no source edits and no nested docs step; its report is the impact map for the spec update. A validated code defect (CODE-WRONG) is not encoded in the spec: the spec keeps the intended behavior, and the close handoff lists the defect with a `workflow-bugfix` or `workflow-review-changes --fix-loop` route.                                                                                                                                                                                                         |
| **Coverage complete** (multi-bucket)                          | Every ledger row REVIEWED or carrying a recorded deferral reason; the run report and the close recap report `{reviewed}/{total}` capabilities.                                                                                                                                                                                                          |
| **Goal satisfied**                                            | Resolve the active Goal Contract at start (active plan `goal.md`, else a new goal under the plans root); append per-cycle evidence to its Iteration Log; emit the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before `/workflow-end`.                                                                                          |
| **Run closed** (`run-closed`)                                 | `/workflow-end` checked every outcome gate; in a writing mode `/docs-manager --mode=update` ran before it when a derived index, README or reference doc embeds the spec.                                                                                                                                                                                      |

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, ownership and test/evidence carriers. Keep designated intent roles tech-agnostic; keep permitted technical detail in contract/evidence roles; mark unknown claims `[UNVERIFIED]`, never blank. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free Sections 1–7 with the mandatory inline §5 Mermaid ERD and §6.2–§6.5 for UI-bearing features, Section 8 `TC-{FEATURE}-{NNN}` cases with GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, `Evidence: [Source: namespace/service/id]`, `CoveredBy` and status — applies only when neither exists. Missing or unmapped coverage is BLOCKED/UNKNOWN, never NOT-APPLICABLE or PASS.

## 4. Recommended Skills

Follow the selected mode table; read each step's skill before executing. Apply these depth and input decisions:

- `/investigate`: init-full maps capability registry, entry points and both UI/backend ends; audit uses a lightweight trace. This establishes the ledger denominator and chain scope.
- `/plan`: init-full, when its registry condition above holds, plans one task per capability, core domain first; TaskList count must cover capability count before authoring. Otherwise the Coverage Ledger carries the split. Apply validation's registry condition above.
- `/spec [mode=init|update|audit]`: use the selected mode; update only impacted roles. Init writes the cases itself; `spec [mode=tests]` follows in init-full only for a sub-agent fan-out or missing source anchors. Tests mode checks existing IDs and preserves tested evidence. Each review's depth scales with case count.
- `/spec [mode=sync]`: reconcile changed case/evidence links or declared outputs. Use `/spec [mode=index]` alone when only a project-maintained derived index/ERD lags.
- `/work-item --mode=dor` and `/work-item --mode=mockup`: when making a new task implementation-ready; mockup only for UI/journey changes. Planned cases guide implementation and do not prove verified behavior.
- `/docs-manager --mode=update` → `/workflow-end` → `/watzup`: derived-doc refresh when a doc embeds the spec (writing modes only), outcome-gate closure with the recap, then `/watzup` only when its registry condition holds.
- Audit is read-only: `/why-review --validate-findings` validates the audit report, and nothing but the report is written.

**UI intent (conditional):** when changed code carries user-facing behavior, refresh the interaction-intent owner the profile declares and link its design-spec/mockup where the contract expects it (portable form: §6 View Inventory, Key UI States, per-story click-path with `US-`/`OP-`/`BR-` references). A profile with no UX owner → surface the gap; never invent a section.

**New task / requirement update:** map requirement → domain entities → capabilities; record planned intent in native roles with the profile's planned-state convention; add planned cases in the native carrier; review them with `/work-item --mode=review --type=spec-tests`. They are implementation guidance, not verified spec.

## 5. Orchestration Freedom

Choose inline/delegated execution, waves and batching at equal quality under `/start-workflow`; keep gates fixed and log allowed flex. Dependencies: investigate and plan precede authoring; a spec exists before it is reviewed; cases exist before their review; `/workflow-review-changes --review-only` runs inline in the main session; `/docs-manager --mode=update`, when it runs, follows the review fixes and precedes `/workflow-end`, which runs last. Recommended for 4+ capabilities: investigate + plan in the main context → spawn `spec` sub-agents (one per capability) in ONE message → barrier → `spec [mode=tests]` sub-agents in ONE message → main context assembles and reviews. Each brief carries capability name + bucket, output path, the resolved profile and its prose/evidence rules, the SYNC protocols (critical thinking, evidence, incremental persistence, cross-scope boundary), and "write each section immediately"; no sub-agent handles more than 3 capabilities.

## 6. Memory, Reporting and Fix Path

- One phase task per phase, one row per selected step and per capability; write the run report under `tmp/reports/` FIRST and append per section — never hold findings in memory.
- Findings are validated before fixing; fix only validated gaps that block the current round, in the owning spec role, then repeat the full `/work-item --mode=review --type=spec-tests` pass. Review loop: round 1 exits on zero open findings (LOW deferral); round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; binary gates always block; cap 3 review rounds; escalate via `ask user question tool` on no progress.
- **Spec-loop discipline:** derive property cases with boundary counter-cases for every hard invariant; protected core logic uses the mutation-score gate, not line coverage; feed uncovered behavior into both spec and tests through a dual-feedback ledger until no new gap or hidden rule remains.
- **Audit output:** `tmp/reports/spec-audit-{date}-{Bucket}.md` — stale capabilities/roles, stale coverage %, priority order, validated by `/why-review --validate-findings`; the close handoff recommends an `update` run scoped to the stale capabilities.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** workflow steps follow the guided contract in `/start-workflow` — `gate` steps are fixed; other steps may flex only with a logged reason
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Keep one canonical spec per capability aligned with implementation and test evidence: author from code (`init-full`), reconcile changes (`update`, default), or report staleness (`audit`).

**MUST ATTENTION Main steps:** confirm mode/scope → triage → resolve manifest → investigate/plan or review changes → author/update/audit → reconcile/review cases and changed intent (audit: validate findings) → sync declared aids → derived docs when embedded → outcome gates/close → handoff. Apply optional steps by registry conditions and record exact skip reasons.

- **[BLOCKING]** Step 0 FIRST — confirm mode, capabilities and target paths via `ask user question tool`; then triage by capability count and breadth; multi-bucket scope keeps the Coverage Ledger and clears the completeness gate (`{reviewed}/{total}`) before `/workflow-end`.
- **[BLOCKING]** resolve the artifact profile before authoring; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **[BLOCKING]** trace the FULL vertical chain per capability and reconcile it; `/work-item --mode=review --type=spec-tests` converges with the M1-M7 gate (audit: `/why-review --validate-findings` on the report); update mode runs `/workflow-review-changes --review-only` inline in the main session; `/docs-manager --mode=update`, when it runs, precedes `/workflow-end`.
- **[BLOCKING]** 4+ capabilities → one `spec` sub-agent per capability, all spawned in ONE message; after compaction read the ledger and `TaskList` first and never re-author a done capability.
- **MUST ATTENTION** resolve the active Goal Contract at start and emit the Goal Satisfaction matrix before close; every case names the business intent it guards.

| Evasion | Required action |
| --- | --- |
| "The preview is the route" | Resolve the complete selected variant through `/start-workflow`. |
| "Tests pass, coverage is known" | Trace case intent to executing assertions; unresolved coverage stays BLOCKED/UNKNOWN. |
