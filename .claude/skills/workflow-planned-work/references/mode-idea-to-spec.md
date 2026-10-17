# Mode `idea-to-spec` — an idea to one reviewed provisional canonical spec

Read in full FIRST when `--mode=idea-to-spec` resolves for `workflow-planned-work` (also selected by `--from=idea --to=spec`). The registry variant `idea-to-spec` owns the step list, roles, applicability and outcome gates; this file owns how each step runs and the quality bar it must clear. Shared protocols load through `SKILL.md`; the shared readiness, spec and UI blocks are in [planned-work-core.md](planned-work-core.md).

## Summary

**Goal:** Turn a raw idea, vision or problem into one reviewed, docs-synced provisional canonical spec per converged capability, with planned cases under the configured artifact contract; stop before planned work or implementation.

**Summary:** Triage/profile → conditional chained research → brainstorm/discovery → scenario/domain/framing review → initiative → draft/tests → spec-tests review (cases and §1-7) → UI design + design review → clarify → rationale review → docs sync → presentation → close. The `gate` steps (spec-tests review, clarify, `workflow-end`) always run; triage and the registry conditions select the rest. Produce planned evidence, not implemented proof.

**Use when:** PO/BA needs canonical intent before code exists. **Adjacent routes:** existing code → `workflow-code-to-spec`; idea + planned work → mode `idea-to-tasks`; spec + tasks → mode `spec-to-tasks`; specified behavior to build → `workflow-implement-spec`; bug → `workflow-bugfix`.

**Mode `idea-to-spec` steps:** /web-research --chain=deep-dive -> /brainstorm -> /spec [mode=discovery] -> /scenario -> /domain-analysis -> /why-review -> /initiative -> /spec [mode=draft] -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests --fix-loop -> /design-spec -> /work-item --mode=review --type=design -> /spec [mode=clarify] -> /why-review -> /docs-manager --mode=update -> /feature-presentation -> /workflow-end -> /watzup

**Key Rules:** Confirm scope with the user; resolve artifact roles before authoring; create no task, story, planned work, mockup or roadmap artifact.

**Shared planning rules:** read [the planned-work core](planned-work-core.md) before the spec block, the UI steps or the close — it owns the spec block (one review, one decision interview), the UI order, the decision log, the loop bounds and the close tail this workflow shares with mode `idea-to-tasks` and mode `spec-to-tasks`.

**Step contract:** Follow `/start-workflow` → Step Execution Protocol: gates always run; invoke every selected skill through the active host; log deviations. Triage selects recommendations and depth.

## Contents

- [Summary](#summary)
- [1. Triage (FIRST action, before choosing steps)](#1-triage-first-action-before-choosing-steps)
- [2. Required Quality Gates](#2-required-quality-gates)
- [3. Recommended Skills](#3-recommended-skills)
- [4. Orchestration Freedom](#4-orchestration-freedom)
- [5. Memory, Reporting and Fix Path](#5-memory-reporting-and-fix-path)
- [Closing Reminders](#closing-reminders)

## 1. Triage (FIRST action, before choosing steps)

Record size, kinds and risk in the run report before selecting steps. Escalate depth on ambiguity and risk, not length.

| Band     | Signal                                                                            | Default depth                                                                                                                           |
| -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **XS**   | one small capability, clear problem, no existing spec overlap                     | inline; no brainstorm when the user supplied one concrete capability; spec [mode=discovery] only if specs/code exist; light clarify (records OBVIOUS decisions)                            |
| **S**    | one capability, a few rules/states, some open questions                           | inline; full clarify on the non-obvious decisions                                                                                       |
| **M**    | one capability with many rules/states, UI surface, or overlap with existing specs | full framing (why-review), design-spec + design review when UI, rationale why-review, presentation when stakeholders review                                                   |
| **L/XL** | several capabilities, release scope, research-heavy or ambiguous idea             | `isLargeIdea` true → decomposition block; one spec per capability; 4+ capabilities → one `spec` sub-agent per capability in ONE message |

**Kinds:** Apply the conditions in Recommended Skills below to select optional steps.

**Large-idea rule (MANDATORY):** Evaluate `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedTaskThatMustSplit` before authoring. Any true signal → the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) goes in the spec role the native profile or local artifact reference declares for slice plans, and its stable slice IDs carry into downstream inputs. All false → omit it. If neither profile nor local reference declares the slice-plan role, stop and resolve it; never invent a section. A supplied roadmap is read-only; `product-roadmap` requires an explicit user request.

## 2. Required Quality Gates

Rows marked **(gate)** are registry `gate` steps or outcome gates and hold in every run; every other row is the quality bar of a core or optional step and holds whenever that step runs.

| Gate                                                        | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Artifact profile resolved** before discovery or authoring | Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md`; the report names the resolved path, section roles and carriers. A malformed or conflicting contract is BLOCKED — never a silent fallback. |
| **Scope confirmed with the user**                           | The scope — brainstorm convergence when brainstorm ran, the spec [mode=discovery] scope decision (NEW spec · EXTEND existing spec via `spec [mode=update]` · SPLIT into N), or one confirmation question for a supplied concrete capability — confirmed via `ask user question tool`; never auto-select scope.                                                                                                                                                                                      |
| **Spec authored**                                           | The canonical provisional spec at its configured path (`spec [mode=draft]`, or `spec [mode=update]` for EXTEND) with planned test/evidence cases (`spec [mode=tests]`) — each case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.                                                                                                             |
| **Spec review converged** (`review-converged`, gate)        | `/work-item --mode=review --type=spec-tests` on the test/evidence cases and the spec body §1-7, including the BLOCKING **M1-M7** gate (tech-agnostic intent prose, business-visible cases); validated findings fixed and re-reviewed.                                                                                                                                                                                  |
| **Decisions clarified** (gate)                              | `/spec [mode=clarify]` in authored-spec context: every NON-OBVIOUS, CONFLICTS and high-impact decision confirmed by the user and written to the native role and its decision record; residual confidence below 80% stays an Open Question. Depth scales with the triage; it always records at least the OBVIOUS decisions and its verdict.                                                   |
| **Docs synced**                                             | When a derived index, README or reference doc embeds the spec, `/docs-manager --mode=update` refreshed it, touching only declared derived indexes; otherwise the spec and test steps wrote the canonical owner and the skip reason is recorded.                                                                                                                                                                                                                                                                              |
| **Run closed** (`run-closed`, gate)                         | `/workflow-end` checked every outcome gate (top-level runs only).                                                                                                                                                                                                                                                                                                                     |

**Profile rules.** Native profile/local contract owns paths, section roles, IDs, provisional state and case/evidence carriers. Keep intent tech-agnostic; permitted technical detail belongs only in declared contract/evidence roles. Only when neither contract exists, use `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`: eight tech-free sections, inline §5 Mermaid ERD, §6.2–§6.5 UI interaction intent, and Section 8 `TC-{FEATURE}-{NNN}` cases with `Evidence: TBD`, `Status: Planned`, `provisional: true`. Unknown mapping or missing coverage stays BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE. Never invent sections, IDs, provisional fields or a second case registry.

## 3. Recommended Skills

| Skill                                                     | Earns its cost when                                                                                                                                      | Proves / feeds                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `/web-research --chain=deep-dive`                        | external market, competitor or best-practice evidence would change the spec; the chain runs the source deep dive itself                                   | evidence base for the brainstorm                            |
| `/brainstorm`                                             | the problem or solution space is open, or the idea spans several capabilities that need a ranked shortlist; Double Diamond (POV/5 Whys/JTBD/HMW → OST or Lean Canvas → SCAMPER → converge) for M+                                              | converged capability → scope gate                           |
| `/spec [mode=discovery]`                                         | any canonical spec or related code exists; short-circuits with a recorded reason on an empty corpus                                                      | overlap/gap/invariant landscape + NEW/EXTEND/SPLIT decision |
| `/scenario`                                               | the decomposition or scope needs adversarial replay, state, ownership, persistence, recovery or evidence analysis                                        | risks feeding the spec's invariants                         |
| `/domain-analysis`                                        | new or changed domain entities/aggregates                                                                                                                | entity model for the spec                                   |
| `/why-review` (framing)                                   | the problem framing is not already validated, or credible alternatives exist — PASS proceeds, WARN needs user acknowledgment, FAIL returns to brainstorm | right problem before authoring                              |
| `/initiative`                                                   | a durable initiative artifact is needed (several capabilities, stakeholder handoff, later planned-work chain)                                                       | initiative record under the configured team artifacts root        |
| `/spec [mode=draft]` · `/spec [mode=tests]`               | always (the spec-driven core)                                                                                                                            | spec authored gate                                          |
| `/work-item --mode=review --type=spec-tests`               | always (gate) — one review of the cases and the spec body §1-7; depth scales with case count and ambiguity                                                                                                       | review-converged gate                                       |
| `/design-spec` → `/work-item --mode=review --type=design`  | the idea has a user-facing UI; UI specs only (no mockup, no planned work), seeded from the profile's interaction-intent owner, reviewed when written                                 | UI intent companion to the spec                             |
| `/spec [mode=clarify]`                                           | always (gate; depth by triage)                                                                                                                                 | decisions-clarified gate                                    |
| `/why-review` (rationale)                                 | clarification changed a material decision, or the spec is M+; otherwise the spec review already checked its rationale                                                                     | rationale + completeness of the authored spec               |
| `/docs-manager --mode=update`                                            | a derived index, README or reference doc embeds the spec                                                                                                                                                   | docs synced                                                 |
| `/feature-presentation`                                   | several stakeholders review the spec (M+, UI, several capabilities, or on request); spec-only deck, no HTML mockups                                      | stakeholder review input                                    |
| `/workflow-end` → `/watzup`                               | `/workflow-end` always, last (prints the recap); `/watzup` only when its registry condition holds                                                                                                                                             | run-closed gate + handoff                                   |

## 4. Orchestration Freedom

Choose inline/delegated work, waves, batching and order through the Step Execution Protocol. Preserve dependencies: author before review/clarification; land clarification fixes before rationale review and docs sync; re-verify fixes; `/workflow-end` closes the run; never parallelize user approvals. XS/S runs inline. For 4+ capabilities spawn one `spec` agent per capability in ONE message, with framing, resolved profile and output path.

## 5. Memory, Reporting and Fix Path

- Track each selected step as a row in its phase todo, per capability. Write the `tmp/reports/` report FIRST; append per step and re-read it with the task list after compaction.
- Write artifacts immediately to their configured roots (plans, team artifacts, business specs); never batch.
- The initiative file is a work record owned by `/task-track`: `/initiative` writes it in the shape of [Records another skill authors](../../task-track/references/integration-guide.md#records-another-skill-authors), and this workflow never changes its state, assignee or readiness.
- Fix in the owning spec role; the fix path and loop bounds are the planned-work core's (Findings and loop bounds).
- **Provisional output:** use the profile's planned-evidence convention before code exists. The first `workflow-code-to-spec` / `spec [mode=update]` against real code reconciles planned cases with executable proof; clear provisional markers only when the profile's acceptance rule passes.
- **Handoff at close:** canonical spec paths, case/evidence coverage, open questions below 80% confidence, the presentation path when produced, and the next route — mode `spec-to-tasks` for planned work or `workflow-implement-spec` to build.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn a raw idea, vision or problem into one reviewed, docs-synced provisional canonical spec per converged capability, with planned cases under the configured artifact contract; stop before planned work or implementation.

**MUST ATTENTION Main steps:** Triage/profile → conditional chained research → brainstorm/discovery → scenario/domain/framing review → initiative → draft/tests → spec-tests review (cases and §1-7) → UI design + design review → clarify → rationale review → docs sync → presentation → close.

- **MUST ATTENTION** triage FIRST (size band, kinds, risk, `isLargeIdea`); it selects the optional steps and their depth. Any large-idea signal → the complete `large_idea_decomposition` block in the profile's slice-plan role.
- **MUST ATTENTION** resolve the artifact profile before authoring; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **MUST ATTENTION** the spec quality gates always hold: spec + planned cases authored, `/work-item --mode=review --type=spec-tests` converged over the cases and §1-7 with the M1-M7 gate, `/spec [mode=clarify]` confirmed every non-obvious decision with the user, `/workflow-end` closed; `/docs-manager --mode=update` refreshes embedding docs when its condition holds.
- **NEVER** produce tasks, stories, mockups or a roadmap artifact here; never auto-select scope — confirm it with the user.
- **MUST ATTENTION** one row per selected step in its phase todo, report in `tmp/reports/` written first and re-read after compaction; every case names the business intent it guards.

| Evasion | Required action |
| --- | --- |
| "Small idea, skip gates" | Scale depth; keep scope confirmation, review, clarity and closure. |
| "Planned cases prove implementation" | Keep provisional markers until executable proof meets the profile's acceptance rule. |
