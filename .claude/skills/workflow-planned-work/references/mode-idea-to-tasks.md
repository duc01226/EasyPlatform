# Mode `idea-to-tasks` — an idea to reviewed, readiness-checked, prioritized planned work

Read in full FIRST when `--mode=idea-to-tasks` resolves for `workflow-planned-work` (the default, also selected by `--from=idea --to=tasks`). The registry variant `idea-to-tasks` owns the step list, roles, applicability and outcome gates; this file owns how each step runs and the quality bar it must clear. Shared protocols load through `SKILL.md`; the shared readiness, spec and UI blocks are in [planned-work-core.md](planned-work-core.md).

## Summary

**Goal:** Turn a product idea into reviewed, readiness-checked, prioritized planned work — no implementation — with depth proportional to the idea's size, ambiguity and risk.

**Purpose:** For PO/BA work. One concrete idea, ticket or brief becomes one fully refined task (**Single-Task track**: idea → draft Feature Spec → test specs → task → stories). A raw vision spanning several opportunities becomes ranked planned work of several tasks (**Multi-Opportunity track**, the brainstorm-driven MULTI-OPPORTUNITY DISCOVERY MODE). Use mode `idea-to-spec` for a spec without planned work, mode `spec-to-tasks` when canonical specs already exist, `workflow-feature` / `workflow-big-feature` to build a DoR-ready task, `workflow-bugfix` for defects.

- **Triage first** (track · size · kinds · risk · `isLargeIdea`); it selects which recommended skills run and how deep. A small, clear idea never runs the research → brainstorm → plan → cross-task prioritize → deck chain.
- **Gates:** the `gate` steps are the task review, DoR and `workflow-end`; the independent challenge is optional and runs when a second reviewer is available or the task is M+ or risky; the outcome gates are review converged, spec synced (when a draft spec or test specs changed) and run closed. Every other quality bar below belongs to a core or optional step, which runs by default or when its registry condition holds; a logged deviation with evidence is the only way out. Content bars — the releasable outcome, UI full-flow evidence and frontmatter priority — hold in every run; no deviation removes them.
- **Shared planning rules:** read [references/planned-work-core.md](planned-work-core.md) before the first spec, task-readiness, prioritize, UI or close step — it owns the spec block, the task-readiness block, the prioritize threshold, the UI order, the decision log, the loop bounds and the close tail this workflow shares with mode `idea-to-spec` and mode `spec-to-tasks`.
- Every generated artifact is a draft until its review or acceptance gate approves it.
- **Work records:** initiative, task and story files are work records owned by `/task-track`. Child skills write them in the shape of [Records another skill authors](../../task-track/references/integration-guide.md#records-another-skill-authors) (`status: draft`, no assignee, an `id` no other record uses) and offer tracking once after each save. Only record files live in `initiatives/`, `tasks/` and `tasks/stories/`; run reports, review and DoR results and planned-work rankings are saved outside them. A review, challenge or DoR PASS is evidence only: this workflow never sets a record ready, assigns it or accepts it; the person records that through `/task-track --mode=lifecycle`.
- **[BLOCKING] Tech-agnostic output:** initiative / task / story prose follows `spec-principles.md` §3 in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) — framework, product, language and pattern names appear only in evidence fields, frontmatter and Mermaid.
- Apply the shared SDD Artifact Contract (`shared/sdd-artifact-contract.md` in the active skills root) and `.claude/skills/shared/releasable-task-contract.md`; local conventions come from `docs/project-config.json` and the docs index.

## Contents

- [Summary](#summary)
- [Triage — FIRST Action](#triage--first-action)
- [Required Quality Gates](#required-quality-gates)
- [Recommended Skills](#recommended-skills)
- [UI Mockup — Journey-First Explore (UI tasks)](#ui-mockup--journey-first-explore-ui-tasks)
- [Reuse Handoffs (caller-passed; every skill still runs standalone with full checks)](#reuse-handoffs-caller-passed-every-skill-still-runs-standalone-with-full-checks)
- [Multi-Opportunity Loop](#multi-opportunity-loop)
- [Artifacts](#artifacts)
- [Orchestration, Memory & Fix Path](#orchestration-memory--fix-path)
- [Closing Reminders](#closing-reminders)

## Triage — FIRST Action

Classify before choosing steps; write the result as the first section of the run report.

1. **Track** — one concrete idea/ticket/brief → **Single-Task**; a vision/problem spanning several independent opportunities → **Multi-Opportunity**. Ambiguous → ask via `ask user question tool` before any step.
2. **Size** (guidance, not a law) — **XS/S**: one actor, one journey, evident acceptance criteria, no new domain entity, no open decision · **M**: one task with domain, UI or cross-module reach, or unresolved decisions · **L/XL**: several tasks, multi-capability or release-scope.
3. **Kinds** — existing PO artifact supplied · new or reshaped UI surface · domain entity change · market uncertainty · security/PII/money · cross-module.
4. **Large idea** — `isLargeIdea = multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedTaskThatMustSplit`. True → the owning task/spec carries the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and downstream stories, mockups and the deck inherit it read-only; all-false → omit the block. A genuinely isolated change records `Decomposition Applicability: EXEMPT` with reason and accepting owner. Never create the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides) — only an explicit roadmap request routes to the standalone `product-roadmap` skill; a supplied roadmap is read-only context.
5. **Risk & ambiguity** escalate depth (plan cycle, scenario, research), not idea length.

| Triage result                      | Typical route (recommended skills below decide the rest)                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single-Task, XS/S, clear            | initiative → draft spec → test specs → spec-tests review → spec [mode=clarify] → work-item --mode=refine (task derived from the clarified spec) → task review → work-item --mode=challenge (only with a second reviewer) → work-item --mode=story → work-item --mode=dor → UI block if UI (design-spec → design review → mockup --explore) → docs-manager --mode=update → close |
| Single-Task, M+ / risky / ambiguous | adds domain-analysis + one rationale why-review (framing and domain), scenario, one lean plan (validated inside its step), prioritize against the planned work, presentation deck                                                                  |
| Multi-Opportunity                  | optional chained research → brainstorm → domain-analysis once → one why-review on the opportunity map and the domain decisions → per-opportunity loop → cross-task prioritize → UI block per UI task → deck → close                                              |

## Required Quality Gates

Rows marked **(gate)** are registry `gate` steps or outcome gates and hold in every run; every other row is the quality bar of a core or optional step and holds whenever that step runs.

| Gate                      | Evidence                                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Triage recorded           | track, size, kinds, risk, `isLargeIdea` verdict in the run report                                                                                                                                                                                                                       |
| Releasable outcome        | every task names one independently releasable actor-facing outcome with a complete entry-to-result journey; technical/foundation/setup work is attached enabling work, never a standalone task; `BLOCKED` never advances by assumption                                                    |
| Rationale reviewed        | `/why-review` after `/domain-analysis` — one pass on the framing and the domain decisions (and on the opportunity map in the Multi-Opportunity track) — is PASS, or WARN with user acknowledgment; FAIL returns to the framing or the domain model. A small single-capability idea leaves the framing challenge to the task review's anti-bias pass |
| Spec clarity (Single-Task) | draft Feature Spec + TC IDs routed to Feature doc Section 8, reviewed by `/work-item --mode=review --type=spec-tests` (cases and §1-7); `/spec [mode=clarify]` confirms every non-obvious, conflicting or high-impact decision with the user before the task is derived — it runs whenever a draft spec exists |
| Artifact review converged (gate) | `/work-item --mode=review --type=task` converged: validated blocking findings fixed and re-reviewed; the story checks ST1-ST4, M1-M7 included, converge inside the DoR                                                                                                                                                                            |
| Independent challenge     | `/work-item --mode=challenge` run by a reviewer other than the drafter, when a second reviewer is available or the task is M+ or risky (optional); otherwise the fresh-context task review covers module, feasibility and cross-cutting (its rows 10-12) and DoR records readiness |
| Readiness check (gate)    | `/work-item --mode=dor` PASS or WARN for every task and its stories before its UI block runs or it is handed off                                                                                                                                                                                               |
| Priority                  | every task carries integer `priority` (rank) + `priority_label` (RICE/MoSCoW) in frontmatter — from `/prioritize` when three or more tasks were generated or ranking against existing planned work was needed, otherwise the main session writes it (through `/task-track` when the task is tracked) in the order refine's value and effort analysis supports, citing it; mockup header and deck show the final value                                                                                                                                                                           |
| UI evidence               | UI tasks: `/design-spec` reviewed by `/work-item --mode=review --type=design`, then the journey-first mockup via `/work-item --mode=mockup --explore` (it owns the scope gate, reuses the reviewed Journey Report `UX-1` and design-authority read `UX-2`, records the direction pick and walks the journeys `UX-8`; or a recorded `Mockup: SKIPPED by user`) — a navigable mock app with every required page/view, navigation edge, component, state and full-flow demo; one isolated screen fails. Backend-only: stated skip reason |
| Docs synced (gate when a draft spec or test specs changed) | `/docs-manager --mode=update` report (`tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`) confirms feature docs, Feature doc Section 8 TC IDs and derived indexes, or records that none were impacted                                                                                                        |
| Run closed (gate)         | `/workflow-end` prints the recap: tasks created, DoR results, blocking items, recommended next workflow; `/watzup` follows only when its registry condition holds                                                                                                                                                                           |

No code changes here: the test-green gate does not apply; TC drafts stay reference-only until the review and DoR gates accept them.

## Recommended Skills

Skipping a step whose applicability is false, or that triage shows does no real work, is expected — log it (`when-false` / `intent-skip`) with evidence.

| Skill                                                                                                   | Earns its cost when                                                                                                      | Feeds                         |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| `/web-research --chain=deep-dive`                                                                      | market, competitor or best-practice evidence would change the outcome; the chain runs the source deep dive itself                  | brainstorm/refine evidence    |
| `/brainstorm`                                                                                           | Multi-Opportunity track — 3–8 item RICE opportunity map                                                                  | opportunity selection         |
| `/initiative`, `/work-item --mode=refine`                                                                                      | always (per opportunity in Multi-Opportunity) — `work-item --mode=refine` owns hypothesis, AC, RICE and the Releasable Outcome Gate; on the Single-Task track it derives the task from the clarified spec (its from-spec form)         | releasable outcome            |
| `/spec [mode=discovery]`                                                                                       | specs or related code already exist for the area                                                                         | no duplicate capability       |
| `/work-item --mode=review` (no type)                                                                            | the PO supplied an existing artifact/ticket/brief                                                                        | input quality                 |
| `/why-review`                                                                                           | once, after `/domain-analysis`: the idea is M+, credible alternative framings or domain decisions exist, or the Multi-Opportunity map needs its rationale challenged                                                                 | rationale review              |
| `/spec [mode=draft]`, `/spec [mode=tests]`, `/work-item --mode=review --type=spec-tests`, `/spec [mode=clarify]`       | Single-Task track                                                                                                         | spec clarity                  |
| `/scenario`                                                                                             | the slice needs adversarial replay, state, ownership, recovery or evidence analysis before planning                      | risk coverage                 |
| `/domain-analysis`                                                                                      | the idea adds or changes domain entities (Multi-Opportunity: once, up front)                                             | domain impact                 |
| `/plan`                                                                              | Single-Task track and M+, cross-module, risky or ambiguous; it validates its decisions inside its step                                                                | story slicing, estimates, DoR |
| `/work-item --mode=review --type=task`, `/work-item --mode=challenge`, `/work-item --mode=story`, `/work-item --mode=dor` | per task, in that order; the challenge runs when a second reviewer is available or the task is M+ or risky                                                    | review, challenge, DoR        |
| `/prioritize`                                                                                           | three or more tasks, or the task must be ranked against existing planned work; otherwise the main session writes the integer priority (through `/task-track` when the task is tracked) | priority                      |
| `/design-spec` → `/work-item --mode=review --type=design` → `/work-item --mode=mockup --explore`                                                                | the task has a user-facing UI surface; journey-first (see UI Mockup below) and gated by `SYNC:existing-ui-research` so both match the current UI system | UI evidence                   |
| `/docs-manager --mode=update`                                                                                          | a draft spec or test cases were authored or changed (Single-Task track), or a derived doc embeds them                                                                                                 | docs synced                   |
| `/feature-presentation`                                                                                 | several tasks, M+ scope, or stakeholders asked for a deck                                                                 | stakeholder handoff           |

The standalone why-review runs once, before the spec is drafted: each later artifact review (spec-tests, task, DoR) owns its own rationale and finding-validation pass.

## UI Mockup — Journey-First Explore (UI tasks)

The UI block — `/design-spec` → `/work-item --mode=review --type=design` → `/work-item --mode=mockup --explore` — runs per UI task after `/work-item --mode=dor` and `/prioritize`. Its order, the mockup's ownership of the scope gate, drafts, pick and walkthrough, the main-session rule and the spec-hub coupling are in the planned-work core (UI block). This workflow adds one orchestration rule: in a sub-agent-per-opportunity run the orchestrator asks each task's Step 0 scope question and presents its rendered drafts itself.

## Reuse Handoffs (caller-passed; every skill still runs standalone with full checks)

- `/initiative` runs one Discovery Interview; `/work-item --mode=refine` receives the initiative file and asks only the categories that interview, the clarified spec and the decision log left unanswered.
- The task-review reuse (`--reuse=task-review`), the Journey Report reuse and the decision log follow the planned-work core.

## Multi-Opportunity Loop

1. `/brainstorm` (Double Diamond) writes the RICE-scored opportunity map to `{plan-dir}/brainstorm-opportunity-map.md` under the plans root (default `plans/`; `docsRoots.plans.path` in `docs/project-config.json` overrides).
2. `ask user question tool` with `multiSelect: true`: "Which opportunities should we develop into tasks?"
3. `/domain-analysis` once, when the selected opportunities add or change domain entities; then ONE why-review on the opportunity map and those domain decisions: are the top opportunities the right problems, are Reach/Impact founded, are the domain decisions sound, pre-mortem, systemic alternatives. FAIL on a high-ranked item → drop it or reframe; WARN → proceed with user acknowledgment.
4. Add every loop row up front — one row per loop step per selected opportunity, inside the phase todo that owns the step — before processing any opportunity.
5. **Per-opportunity task loop:** `/initiative` → `/work-item --mode=refine` → `/work-item --mode=review --type=task` → `/work-item --mode=challenge` (when it applies) → `/work-item --mode=story` → `/work-item --mode=dor`. When opportunities run as sub-agents, each sub-agent stops after `/work-item --mode=dor`. Draft spec, test specs, spec [mode=clarify], scenario and the plan never run per opportunity.
6. After all opportunities: cross-task `/prioritize` (RICE + dependency graph, Must/Should/Could per release scope) records `priority` + `priority_label` on EACH task, not only the planned-work file.
7. Then the main session runs the UI block for each UI task (`/design-spec` → `/work-item --mode=review --type=design` → `/work-item --mode=mockup --explore`), because the scope gate and the explore pick are the user's, per task, and a sub-agent cannot ask the user. Backend-only tasks record the skip reason.

## Artifacts

| Output                      | Path                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Initiative                  | `team-artifacts/initiatives/{YYMMDD}-{role}-initiative-{slug}.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides |
| Task (+ stories, DoR result) | `team-artifacts/tasks/{YYMMDD}-task-{slug}.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides          |
| Mockup                      | HTML file beside the task                                                                                                                     |
| Test specs                  | Feature doc Section 8 (canonical TC registry), mapped to acceptance criteria by TC IDs                                                       |
| Planned work                     | `team-artifacts/backlog/{YYMMDD}-backlog-update.md` — default root; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides   |
| Docs sync                   | `tmp/reports/docs-update-{YYMMDD}-{HHMM}.md`                                                                                                 |

Each task carries: title, problem statement, hypothesis, GIVEN/WHEN/THEN acceptance criteria, RICE score and priority, user stories, TC IDs, DoR status, and mockup link when UI. Child skills (`initiative`, `work-item --mode=refine`, `work-item --mode=story`, `work-item --mode=mockup`, `prioritize`, `docs-manager --mode=update`) resolve the same roots; write each artifact immediately after its step.

## Orchestration, Memory & Fix Path

- **Orchestration freedom:** choose inline vs sub-agent, batching and order to minimize wall-clock and tokens at equal quality. XS/S work runs inline; with 6+ selected opportunities spawn one sub-agent per opportunity (brainstorm context + its task list) and keep `/prioritize` in the main context, updating a summary table every 3 opportunities. Fixed dependencies: an artifact exists before it is reviewed; the draft spec and its test specs are reviewed and clarified before the task is derived from them; DoR passes before the task is prioritized and before its UI block; the design spec is reviewed before the mockup's drafts; gates awaiting user answers are never parallelized; `/workflow-end` runs last. When a task's rank changes after its mockup was built, refresh the mockup's priority badge.
- **Memory:** one row per selected step in its phase todo (per opportunity in the loop). Create `tmp/reports/planned-work-idea-to-tasks-{YYMMDD}-{HHmm}-{slug}.md` first, append after every step, and re-read it plus `TaskList` after compaction. Sub-agent briefs make report writing their first deliverable.
- **Fix path and loop bounds:** the planned-work core (Findings and loop bounds) owns them.

---

**Mode `idea-to-tasks` steps:** /web-research --chain=deep-dive -> /brainstorm -> /initiative -> /spec [mode=discovery] -> /work-item --mode=review -> /domain-analysis -> /why-review -> /spec [mode=draft] -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests -> /spec [mode=clarify] -> /scenario -> /plan -> /work-item --mode=refine -> /work-item --mode=review --type=task --fix-loop -> /work-item --mode=challenge --reuse=task-review -> /work-item --mode=story -> /work-item --mode=dor --reuse=task-review -> /prioritize -> /design-spec -> /work-item --mode=review --type=design -> /work-item --mode=mockup --explore -> /docs-manager --mode=update -> /feature-presentation -> /workflow-end -> /watzup

**Step contract:** the list above is the recommended default order from `.claude/workflows.json`; steps follow `/start-workflow` → Step Execution Protocol — `gate` steps (`work-item --mode=review --type=task`, `work-item --mode=dor`, `workflow-end`) always run, `optional` steps run when their `applicability.when` holds, and every skip, merge, simplification or reorder is logged with evidence. NEVER batch-complete validation gates.

Activate with `/start-workflow workflow-planned-work --mode=idea-to-tasks` and the user's prompt as context.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** reviewed, DoR-ready, prioritized planned work where every task is an independently releasable actor-facing outcome — depth proportional to the idea, gates never skipped.

- **MUST ATTENTION** triage first (track · size · kinds · risk · `isLargeIdea`) and record it; a small, clear idea skips research, brainstorm, plan cycle, cross-task prioritize and the deck — log each skip with evidence.
- **MUST ATTENTION** the `gate` steps — `work-item --mode=review --type=task`, `work-item --mode=dor` PASS/WARN, `workflow-end` — run every time; the independent `work-item --mode=challenge` runs when a second reviewer is available or the task is M+ or risky; the spec block (Single-Task), the rationale why-review, the UI block (full-flow mock app or a recorded `Mockup: SKIPPED by user`), `prioritize` and `docs-manager --mode=update` run by default or on their registry condition, each departure logged with evidence; frontmatter priority always holds.
- **MUST ATTENTION** UI mockups are journey-first: `/design-spec` and its design review come first, then `/work-item --mode=mockup --explore` (scope gate first, the reviewed Journey Report before any drafting, the user's recorded pick — never picked while the user can be asked; `Selection:` line when no question tool) — why: a direction chosen before the journeys, or for the user, styles the wrong surface.
- **MUST ATTENTION** large ideas carry the complete `large_idea_decomposition` block (`outcome_slices` … `deferred_work_owner`); never create a roadmap artifact by default.
- **MUST ATTENTION** one row per selected step in its phase todo, report file first and appended per step; artifacts are drafts until their gate accepts them.
- **MUST ATTENTION** tech-agnostic prose; implementation names only in evidence fields, frontmatter and Mermaid.
