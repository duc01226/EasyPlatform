# Mode `spec-to-tasks` — existing canonical specs to complete, prioritized planned tasks and stories

Read in full FIRST when `--mode=spec-to-tasks` resolves for `workflow-planned-work` (also selected by `--from=spec --to=tasks`). The registry variant `spec-to-tasks` owns the step list, roles, applicability and outcome gates; this file owns how each step runs and the quality bar it must clear. Shared protocols load through `SKILL.md`; the shared readiness, spec and UI blocks are in [planned-work-core.md](planned-work-core.md).

## Summary

**Goal:** Convert existing canonical specs into complete, dependency-ordered, prioritized, readiness-checked planned tasks and stories — no implementation — with depth proportional to the spec's size and risk.

**Summary:** Triage/profile → investigate/freshness → domain/rationale → clarify → scenario/plan → refine → task review → independent challenge (when it applies) → stories → DoR → prioritize → UI block (design spec → design review → mockup) → docs sync → deck → close. The `gate` steps (clarify, task review, DoR, `workflow-end`) always run; triage and the registry conditions select the rest. Produce ready-to-start tasks, including large-spec slices and attached enabling work.

**Use when:** PO/BA has canonical specs for a capability or bucket. **Adjacent routes:** no spec → mode `idea-to-spec`; informal idea → mode `idea-to-tasks`; code to specs → `workflow-code-to-spec`; build ready tasks → `workflow-feature` / `workflow-big-feature`.

- **Triage first** (capability count · kinds · freshness risk · `isLargeIdea`); it selects which recommended skills run. A 1–3 capability spec with no domain change skips the plan, scenario, domain analysis and the rationale why-review.
- **Gates:** the `gate` steps are `spec [mode=clarify]`, the task review, DoR and `workflow-end`; the independent challenge is optional and runs when a second reviewer is available or the task is M+ or risky; the outcome gates are review converged, spec synced (when tasks, clarified decisions or scenario proof changed canonical spec content) and run closed. Every other quality bar below belongs to a core or optional step, which runs by default or when its registry condition holds; a logged deviation with evidence is the only way out. Content bars — coverage, the releasable outcome, UI full-flow evidence and frontmatter priority — hold in every run; no deviation removes them.
- **Shared planning rules:** read [the planned-work core](planned-work-core.md) before the first task-readiness, prioritize, UI or close step — it owns the task-readiness block, the prioritize threshold, the UI order, the decision log, the loop bounds and the close tail this workflow shares with mode `idea-to-tasks` and mode `idea-to-spec`.
- **[BLOCKING] Tech-agnostic output:** Task / planned work / report prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — implementation names appear only in evidence fields, frontmatter and Mermaid.
- Read `.claude/skills/shared/sdd-artifact-contract.md` when applying M1-M7; `.claude/skills/shared/releasable-task-contract.md` when slicing actor-facing outcomes; `.claude/skills/shared/product-roadmap-contract.md` when `isLargeIdea` governs decomposition. These contracts preserve business-visible criteria, releasable journeys and embedded slice ownership.

## Contents

- [Summary](#summary)
- [Canonical Input Profile](#canonical-input-profile)
- [Triage — FIRST Action](#triage--first-action)
- [Required Quality Gates](#required-quality-gates)
- [Recommended Skills](#recommended-skills)
- [Outputs](#outputs)
- [Orchestration, Memory & Fix Path](#orchestration-memory--fix-path)
- [Closing Reminders](#closing-reminders)

## Canonical Input Profile

Before loading or mapping a spec, read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts` when declared), the configured template and the local `spec-system-reference.md` / `spec-principles.md`. Use the native paths, section roles, identifier formats, ownership model and evidence/test carriers they declare; code stays the technical source of truth and the canonical spec the requirements source — never create a second engineering-spec plane.

- The portable `{Bucket}/README.{Feature}.md` tech-free 8-section spec (§3 US/AC, §4 BR, §5 ERD, §6 flows, §7 permissions, §8 `TC-` cases) is the fallback ONLY when neither a native profile nor a local artifact contract applies.
- Carry native requirement, acceptance, rule and scenario IDs as the PRIMARY citation spine and declared evidence carriers as secondary traceability; never translate them into `FR-`/`BR-`, mint new IDs, synthesize a missing section or duplicate a case registry.
- A missing/ambiguous spec path or owner → ask for the exact configured path. An unknown role, owner or test-evidence mapping is `UNKNOWN` and blocks that mapping — never treat it as absent or green.

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Scale** — **1–3 capabilities**: inline, one row per capability and feature group in its phase todo · **4–10**: split by capability, then feature/operation group · **10+**: capability-group batches with coverage-matrix checkpoints. Any task over 8 effort points splits (SPIDR) until ≤ 8.
2. **Kinds** — new/changed entities, lifecycle or state transitions, cross-service ownership, data migration or seed needs (domain) · user-facing UI surface · implementation already exists (freshness risk) · security/PII/money.
3. **Large spec** — evaluate `isLargeIdea`. True → read the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) from the role the native profile or local reference declares for slice plans and carry its stable slice IDs through every task, story, mockup and the all-task deck; if no role permits slice plans, mark the owner `UNKNOWN` and stop decomposition until resolved. All-false → omit the block and roadmap fields. Never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); a supplied roadmap is read-only context.
4. **Risk & ambiguity** escalate depth (plan cycle, scenario), not spec length.

## Required Quality Gates

Rows marked **(gate)** are registry `gate` steps or outcome gates and hold in every run; every other row is the quality bar of a core or optional step and holds whenever that step runs.

| Gate                      | Evidence                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage recorded           | scale, kinds, freshness risk, `isLargeIdea` verdict in the run report                                                                                                                                                                                                                                                                                                            |
| Source freshness known    | `$spec [mode=index]` audit result, or the cited reason no implementation exists to drift from; stale critical domain/contract/business-rule sections stop task generation until the user decides whether to update specs first                                                                                                                                                           |
| Coverage                  | coverage matrix (`Spec Source · Capability · Feature/Operation · Domain Impact · Shared Dependency · Task Type · Status`) maps every source feature/operation to exactly one of: generated releasable task · enabling subtask attached to a releasable task · existing task reference · out-of-scope with reason                                                                        |
| Spec clarity (gate)       | `$spec [mode=clarify]` confirms every non-obvious, conflicting or high-impact decomposition decision with the user before any task is built; confirmed material changes route through `$spec [mode=update]` — it never re-authors the spec                                                                                                                                        |
| Releasable outcome        | every task is one independently releasable actor-facing outcome with a complete entry-to-result journey; enabling/foundation/migration/setup work is attached and ordered before what it enables, never a standalone task                                                                                                                                                          |
| M1-M5, M7                 | acceptance criteria are tech-agnostic, observable, single-interpretation GIVEN/WHEN/THEN; M7 demo test on each criterion's BODY — `Given` a state a user can arrange, `When` an action a user can take, `Then` an outcome a user can see; an invocation `When` or a schema/type/call-count `Then` fails as TECHNICAL-ONLY; AC count never derives from an architecture inventory |
| Rationale reviewed        | when the domain-analysis or plan step ran, or the specs offer competing decomposition options: `$why-review` on the domain/decomposition rationale is PASS, or WARN with user acknowledgment; otherwise the task review challenges each task's rationale                                                                                                                                                                                                                                                                                    |
| Artifact review converged (gate) | `$work-item --mode=review --type=task` converged: validated blocking findings fixed and re-reviewed; the story checks ST1-ST4, M1-M7 included, converge inside the DoR                                                                                                                                                                                                                                                                     |
| Independent challenge     | `$work-item --mode=challenge` run by a reviewer other than the drafter, when a second reviewer is available or the task is M+ or risky (optional); otherwise the fresh-context task review covers module, feasibility and cross-cutting (its rows 10-12) and DoR records readiness |
| Readiness check (gate)    | `$work-item --mode=dor` PASS or WARN for every task and its stories                                                                                                                                                                                                                                                                                                                                           |
| UI evidence               | UI tasks: `$design-spec` reviewed by `$work-item --mode=review --type=design`, then `$work-item --mode=mockup --explore` (scope gate, the user's direction pick, or a recorded `Mockup: SKIPPED by user`) builds a navigable mock app covering every required page/view, navigation edge, component, state, story and the full flow; one isolated screen fails. Backend-only: stated skip reason                                                                                                                                                                      |
| Priority propagation      | every task carries integer `priority` (rank) + `priority_label` in frontmatter (`$prioritize` ranks all generated tasks once and writes it into EACH task when three or more tasks were generated or ranking against existing planned work was requested; otherwise the main session writes it (through `$task-track` when the task is tracked) in the order refine's value and effort analysis supports, citing it); mockup header and deck show the final value |
| Docs synced (gate when canonical spec content changed) | `$docs-manager --mode=update` confirms canonical specs, their test/evidence carriers and project-declared derived indexes are updated or explicitly unchanged                                                                                                                                                                                                                                   |
| Run closed (gate)         | `$workflow-end` prints the recap; `$watzup` follows only when its registry condition holds                                                                                                                                                                                                                                                                                                                                          |

No code changes here: the test-green gate does not apply.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                              | Earns its cost when                                                                                                                                           | Feeds                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `$investigate`                                                                                                     | always — locate canonical specs, catalog/index, related code                                                                                                  | input profile, coverage |
| `$spec [mode=index]` (audit)                                                                                              | implementation exists or the spec was not synced against code this session                                                                                    | freshness               |
| `$domain-analysis`                                                                                                 | a spec item implies new/changed entities, lifecycle, ownership boundaries or data migration; findings go under each affected task's `## Domain Impact`         | domain impact           |
| `$why-review`                                                                                                      | the domain-analysis or plan step ran, or the specs offer competing decomposition options — challenge that rationale before clarification                                                                                    | rationale review        |
| `$spec [mode=clarify]`                                                                                                    | always (gate)                                                                                                                                                 | spec clarity            |
| `$scenario`                                                                                                        | slice risks need adversarial replay, state, ownership, recovery or evidence analysis; map proof to a task and native test-evidence ID or `deferred_work_owner` | risk coverage           |
| `$plan`                                                                                         | large spec, 4+ capabilities or cross-capability dependencies; it validates its decisions inside its step                                                                                                  | slicing and order       |
| `$work-item --mode=refine`, `$work-item --mode=review --type=task`, `$work-item --mode=challenge`, `$work-item --mode=story`, `$work-item --mode=dor` | in that order, per coverage-matrix row that needs a new task; the challenge runs when a second reviewer is available or the task is M+ or risky                       | review, challenge, DoR  |
| `$prioritize`                                                                                                      | three or more tasks were generated, or the task must be ranked against existing planned work; otherwise the main session writes the integer priority (through `$task-track` when the task is tracked) | priority                |
| `$design-spec` → `$work-item --mode=review --type=design` → `$work-item --mode=mockup --explore`                                                                                     | the task has a user-facing UI surface; gated by `SYNC:existing-ui-research`                                                                               | UI evidence             |
| `$docs-manager --mode=update`                                                                                                     | tasks, clarified decisions or scenario proof changed canonical spec content or its test or evidence carriers                                                                                                                                      | docs synced             |
| `$feature-presentation`                                                                                            | several tasks, large spec, or stakeholders asked for a deck — then the Scope & planned work slide shows each task's rank                                             | stakeholder handoff     |

**Shared blocks:** the task-review reuse (`--reuse=task-review`), the UI order and spec-hub coupling, and the decision log follow the planned-work core.

## Outputs

Paths are relative to the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

**Work records:** Task and story files are work records owned by `$task-track`. Child skills write them in the shape of [Records another skill authors](../../task-track/references/integration-guide.md#records-another-skill-authors) (`status: draft`, no assignee, an `id` no other record uses) and offer tracking once after each save. Only record files live in `tasks/` and `tasks/stories/`. A review, challenge or DoR PASS is evidence only: this workflow never sets a record ready, assigns it or accepts it; the person records that through `$task-track --mode=lifecycle`.

- `tasks/{date}-task-{slug}.md` per task — native ID citations, `file:section` evidence, GIVEN/WHEN/THEN AC, effort points and complexity, dependencies (`must-before` / `can-parallel` / `blocked-by` / `independent`), priority input, test/evidence needs mapped to the declared carrier, domain impact, enabling-task references, Releasable Outcome Gate evidence (actor, outcome, journey, visible/persisted truth, access/failure/recovery, non-goals), UI inventory or no-UI reason, and `priority` frontmatter.
- `tasks/{slug}-mockup.html` and `design-specs/{date}-designspec-{slug}.md` per UI task.
- `backlog/spec-to-tasks-{date}-backlog.md` — rank and recommended order, dependency graph, first-do/blocked/defer groups, enabling work ordered with the tasks it enables, RICE or MoSCoW rationale, DoR status per task, open questions.
- The `$feature-presentation` deck when it runs, and `tmp/reports/spec-to-tasks-{date}-{bucket}.md` with the coverage matrix and unresolved questions.

## Orchestration, Memory & Fix Path

- **Orchestration:** choose inline/delegated work, batching and order through the Step Execution Protocol at equal quality. Use Triage's scale bands; each 10+ capability batch gets a report section. Preserve dependencies: freshness and clarification precede decomposition; a task exists before it is reviewed; `$prioritize` runs once, after every task's DoR and before the UI block; the design spec is reviewed before the mockup's drafts; gates awaiting user answers are never parallelized; `$workflow-end` runs last. When a rank changes after a mockup was built, refresh the mockup's priority badge.
- **Memory:** keep one row per selected step in its phase todo, per capability group. Write `tmp/reports/spec-to-tasks-{date}-{bucket}.md` first and append per capability/feature; after compaction re-read it and the todo list (the current task list). Write task records immediately; sub-agent briefs require report writing first.
- **Fix path and loop bounds:** the planned-work core (Findings and loop bounds) owns them; here a confirmed spec change is fixed through `$spec [mode=update]`.

---

**Mode `spec-to-tasks` steps:** $investigate -> $spec [mode=index] -> $domain-analysis -> $why-review -> $spec [mode=clarify] -> $scenario -> $plan -> $work-item --mode=refine -> $work-item --mode=review --type=task --fix-loop -> $work-item --mode=challenge --reuse=task-review -> $work-item --mode=story -> $work-item --mode=dor --reuse=task-review -> $prioritize -> $design-spec -> $work-item --mode=review --type=design -> $work-item --mode=mockup --explore -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `$start-workflow` → Step Execution Protocol — `gate` steps (`spec [mode=clarify]`, `work-item --mode=review --type=task`, `work-item --mode=dor`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `$start-workflow workflow-planned-work --mode=spec-to-tasks` and the user's prompt as context.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Convert existing canonical specs into complete, dependency-ordered, prioritized, readiness-checked planned tasks and stories — no implementation — with depth proportional to the spec's size and risk.

**MUST ATTENTION Main steps:** Triage/profile → investigate/freshness → domain/rationale → clarify → scenario/plan → refine → task review → independent challenge (when it applies) → stories → DoR → prioritize → UI block (design spec → design review → mockup) → docs sync → deck → close. The `gate` steps always run; triage and the registry conditions select the rest.

- **MUST ATTENTION** triage first (scale · kinds · freshness · `isLargeIdea`) and record it; skip domain analysis, scenario, the plan and the rationale why-review only with logged evidence.
- **MUST ATTENTION** the `gate` steps — `spec [mode=clarify]`, `work-item --mode=review --type=task`, `work-item --mode=dor`, `workflow-end` — run every time; the independent `work-item --mode=challenge` runs when a second reviewer is available or the task is M+ or risky; the coverage matrix, releasable outcome + M7 and priority in every task's frontmatter always hold; the UI block (full-flow mock app after the reviewed design spec) and `docs-manager --mode=update` run by default or on their registry condition, each departure logged with evidence.
- **MUST ATTENTION** carry native IDs as the citation spine; never mint IDs, invent sections or emit a standalone technical task.
- **MUST ATTENTION** large specs carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one row per selected step in its phase todo, report file first and appended per capability; tech-agnostic prose.

| Evasion | Required action |
| --- | --- |
| "Small spec, skip gates" | Scale depth; preserve clarification, the task review, DoR and closure; the independent challenge and docs sync run on their conditions. |
| "Technical setup is a task" | Attach enabling work to an independently releasable actor-facing outcome. |
