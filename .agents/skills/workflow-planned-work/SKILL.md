---
name: workflow-planned-work
description: '[Workflow] Turn an idea or existing canonical specs into a reviewed provisional spec or reviewed, readiness-checked, prioritized planned tasks and stories; stop before implementation. --from=idea|spec --to=spec|tasks.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-planned-work` together with this skill. Call [`$start-workflow workflow-planned-work`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `idea-to-tasks`: [`$web-research --chain=deep-dive`](../web-research/SKILL.md) (optional; conditional) → [`$brainstorm`](../brainstorm/SKILL.md) (optional; conditional) → [`$initiative`](../initiative/SKILL.md) (core) → [`$spec [mode=discovery]`](../spec/SKILL.md) (optional; conditional) → [`$work-item --mode=review`](../work-item/SKILL.md) (optional; conditional) → [`$domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`$why-review`](../why-review/SKILL.md) (optional; conditional) → [`$spec [mode=draft]`](../spec/SKILL.md) (optional; conditional) → [`$spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`$work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (optional; conditional) → [`$spec [mode=clarify]`](../spec/SKILL.md) (optional; conditional) → [`$scenario`](../scenario/SKILL.md) (optional; conditional) → [`$plan`](../plan/SKILL.md) (optional; conditional) → [`$work-item --mode=refine`](../work-item/SKILL.md) (core) → [`$work-item --mode=review --type=task --fix-loop`](../work-item/SKILL.md) (gate) → [`$work-item --mode=challenge --reuse=task-review`](../work-item/SKILL.md) (optional; conditional) → [`$work-item --mode=story`](../work-item/SKILL.md) (core) → [`$work-item --mode=dor --reuse=task-review`](../work-item/SKILL.md) (gate) → [`$prioritize`](../prioritize/SKILL.md) (optional; conditional) → [`$design-spec`](../design-spec/SKILL.md) (optional; conditional) → [`$work-item --mode=review --type=design`](../work-item/SKILL.md) (optional; conditional) → [`$work-item --mode=mockup --explore`](../work-item/SKILL.md) (optional; conditional) → [`$docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`$feature-presentation`](../feature-presentation/SKILL.md) (optional; conditional) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (7) → Specify (5) → Plan (11; exit review-converged, spec-synced) → Close (3; exit run-closed)
<!-- workflow-mode:idea-to-tasks fingerprint:2df38f731d0e7d14f6ca3263299d3e27ccaee9721c66db6676360b88a4bcead6 -->
- Mode `idea-to-spec`: [`$web-research --chain=deep-dive`](../web-research/SKILL.md) (optional; conditional) → [`$brainstorm`](../brainstorm/SKILL.md) (optional; conditional) → [`$spec [mode=discovery]`](../spec/SKILL.md) (optional; conditional) → [`$scenario`](../scenario/SKILL.md) (optional; conditional) → [`$domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`$why-review`](../why-review/SKILL.md) (optional; conditional) → [`$initiative`](../initiative/SKILL.md) (optional; conditional) → [`$spec [mode=draft]`](../spec/SKILL.md) (core) → [`$spec [mode=tests]`](../spec/SKILL.md) (core) → [`$work-item --mode=review --type=spec-tests --fix-loop`](../work-item/SKILL.md) (gate) → [`$design-spec`](../design-spec/SKILL.md) (optional; conditional) → [`$work-item --mode=review --type=design`](../work-item/SKILL.md) (optional; conditional) → [`$spec [mode=clarify]`](../spec/SKILL.md) (gate) → [`$why-review`](../why-review/SKILL.md) (optional; conditional) → [`$docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`$feature-presentation`](../feature-presentation/SKILL.md) (optional; conditional) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (3) → Specify (12; exit review-converged) → Close (3; exit run-closed)
<!-- workflow-mode:idea-to-spec fingerprint:917f96e7a3c69b3f47ec4d877568a8cc41510d8a69e052ef627d325bb8285603 -->
- Mode `spec-to-tasks`: [`$investigate`](../investigate/SKILL.md) (core) → [`$spec [mode=index]`](../spec/SKILL.md) (optional; conditional) → [`$domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`$why-review`](../why-review/SKILL.md) (optional; conditional) → [`$spec [mode=clarify]`](../spec/SKILL.md) (gate) → [`$scenario`](../scenario/SKILL.md) (optional; conditional) → [`$plan`](../plan/SKILL.md) (optional; conditional) → [`$work-item --mode=refine`](../work-item/SKILL.md) (core) → [`$work-item --mode=review --type=task --fix-loop`](../work-item/SKILL.md) (gate) → [`$work-item --mode=challenge --reuse=task-review`](../work-item/SKILL.md) (optional; conditional) → [`$work-item --mode=story`](../work-item/SKILL.md) (core) → [`$work-item --mode=dor --reuse=task-review`](../work-item/SKILL.md) (gate) → [`$prioritize`](../prioritize/SKILL.md) (optional; conditional) → [`$design-spec`](../design-spec/SKILL.md) (optional; conditional) → [`$work-item --mode=review --type=design`](../work-item/SKILL.md) (optional; conditional) → [`$work-item --mode=mockup --explore`](../work-item/SKILL.md) (optional; conditional) → [`$docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`$feature-presentation`](../feature-presentation/SKILL.md) (optional; conditional) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (4) → Specify (2) → Plan (11; exit review-converged, spec-synced) → Close (3; exit run-closed)
<!-- workflow-mode:spec-to-tasks fingerprint:40412898dd71ae34c0e9d459d31751632418ea253fd5447c7dd5bc7db1187d68 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Initiative, task and story files are work records owned by `$task-track`; continue untracked when no link exists, and acceptance remains explicit.

> **Renamed:** formerly `/workflow-initiative-to-task` (now mode `idea-to-tasks`), formerly `/workflow-initiative-to-spec` (now mode `idea-to-spec`) and formerly `/workflow-spec-to-task` (now mode `spec-to-tasks`); before those, formerly `workflow-idea-to-pbi`, formerly `workflow-idea-to-spec` and formerly `workflow-spec-to-pbi`. The old names no longer resolve.

## Quick Summary

**Goal:** Turn product intent into reviewed planning artifacts through one workflow with three modes, chosen by `--from` and `--to` (or `--mode`): `idea-to-tasks` (default) turns an idea, ticket, brief or raw vision into reviewed, readiness-checked, prioritized planned work; `idea-to-spec` turns a raw idea into one reviewed provisional canonical spec per capability and stops there; `spec-to-tasks` turns existing canonical specs into complete, dependency-ordered, prioritized planned tasks and stories. No mode writes production code.

**Use when:** a PO, BA or user wants planned work or a reviewed spec before any implementation. To build code use `$workflow-feature` (behavior not yet in a canonical spec) or `$workflow-implement-spec` (behavior already specified). To see and click UI directions first use `$workflow-spec-to-mockup`. Formerly `/workflow-initiative-to-task` (`idea-to-tasks`), `/workflow-initiative-to-spec` (`idea-to-spec`) and `/workflow-spec-to-task` (`spec-to-tasks`).

**IMPORTANT MANDATORY Steps:** resolve the `workflow-planned-work` manifest variant for the selected mode first (default `idea-to-tasks`), then create the phase todos the manifest returns (default: $web-research --chain=deep-dive -> $brainstorm -> $initiative -> $spec [mode=discovery] -> $work-item --mode=review -> $domain-analysis -> $why-review -> $spec [mode=draft] -> $spec [mode=tests] -> $work-item --mode=review --type=spec-tests -> $spec [mode=clarify] -> $scenario -> $plan -> $work-item --mode=refine -> $work-item --mode=review --type=task --fix-loop -> $work-item --mode=challenge --reuse=task-review -> $work-item --mode=story -> $work-item --mode=dor --reuse=task-review -> $prioritize -> $design-spec -> $work-item --mode=review --type=design -> $work-item --mode=mockup --explore -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup)

Variant step chains (each equals the registry variant of that name; gates and optional steps are declared there and restated in the mode reference):

- `idea-to-tasks`: $web-research --chain=deep-dive -> $brainstorm -> $initiative -> $spec [mode=discovery] -> $work-item --mode=review -> $domain-analysis -> $why-review -> $spec [mode=draft] -> $spec [mode=tests] -> $work-item --mode=review --type=spec-tests -> $spec [mode=clarify] -> $scenario -> $plan -> $work-item --mode=refine -> $work-item --mode=review --type=task --fix-loop -> $work-item --mode=challenge --reuse=task-review -> $work-item --mode=story -> $work-item --mode=dor --reuse=task-review -> $prioritize -> $design-spec -> $work-item --mode=review --type=design -> $work-item --mode=mockup --explore -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup
- `idea-to-spec`: $web-research --chain=deep-dive -> $brainstorm -> $spec [mode=discovery] -> $scenario -> $domain-analysis -> $why-review -> $initiative -> $spec [mode=draft] -> $spec [mode=tests] -> $work-item --mode=review --type=spec-tests --fix-loop -> $design-spec -> $work-item --mode=review --type=design -> $spec [mode=clarify] -> $why-review -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup
- `spec-to-tasks`: $investigate -> $spec [mode=index] -> $domain-analysis -> $why-review -> $spec [mode=clarify] -> $scenario -> $plan -> $work-item --mode=refine -> $work-item --mode=review --type=task --fix-loop -> $work-item --mode=challenge --reuse=task-review -> $work-item --mode=story -> $work-item --mode=dor --reuse=task-review -> $prioritize -> $design-spec -> $work-item --mode=review --type=design -> $work-item --mode=mockup --explore -> $docs-manager --mode=update -> $feature-presentation -> $workflow-end -> $watzup

**Step contract:** steps follow `$start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its skill invocation, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-planned-work` workflow. Run `$start-workflow workflow-planned-work` with `--mode=<mode>` (mapped from `--from`/`--to` below) and the user's prompt as context. The resolved variant is a complete sequence: execute that manifest and never a hand-swapped list.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Mode Selection — FIRST Action](#mode-selection--first-action)
- [Mode `idea-to-tasks`](#mode-idea-to-tasks)
- [Mode `idea-to-spec`](#mode-idea-to-spec)
- [Mode `spec-to-tasks`](#mode-spec-to-tasks)
- [Closing Reminders](#closing-reminders)

## Mode Selection — FIRST Action

Pick the mode BEFORE creating tasks and record it, with the resolver fingerprint, in the workflow report. `--from` and `--to` map to the mode; an explicit `--mode` wins; with neither, choose from the prompt and state the assumption. Every mode closes through `$workflow-end`, which checks the mode's own outcome gates.

| `--from` / `--to` | Mode | Pick it when | Deliverable | Outcome gates (registry) |
| --- | --- | --- | --- | --- |
| `--from=idea --to=tasks` (default) | `idea-to-tasks` | An idea, ticket, brief or raw product vision must become ready-to-plan work: one task through a provisional spec (Single-Task track), or several opportunities through a RICE opportunity map (Multi-Opportunity track). | A provisional spec and test specifications (Single-Task), reviewed and readiness-checked tasks and stories, prioritization, UI mockups for UI tasks | `review-converged` · `spec-synced` (when a draft spec or test specifications changed) · `run-closed` |
| `--from=idea --to=spec` | `idea-to-spec` | A raw idea, vision or problem must become one reviewed provisional canonical spec per converged capability, with no task, story or mockup yet. | Reviewed provisional canonical specs with their planned test cases | `review-converged` · `run-closed` |
| `--from=spec --to=tasks` | `spec-to-tasks` | Canonical specs already exist and must become complete, dependency-ordered, prioritized planned work with capability slicing and implementation ordering. | A coverage matrix, tasks, stories, DoR evidence and ranked planned work | `review-converged` · `spec-synced` (when the run changed canonical spec content) · `run-closed` |

One flag alone: `--to=spec` → `idea-to-spec`; `--from=spec` → `spec-to-tasks`; `--from=idea` or `--to=tasks` → `idea-to-tasks`. `--from=spec --to=spec` is not a mode: to revise a spec use `$workflow-feature-spec`.

## Mode `idea-to-tasks`

**[BLOCKING]** When `idea-to-tasks` resolves, read `.claude/skills/workflow-planned-work/references/mode-idea-to-tasks.md` in full FIRST, then `references/planned-work-core.md` before the first spec, readiness or UI step. Its triage, quality gates, recommended-skills table, multi-opportunity loop, artifacts and fix path are the contract for this mode.

## Mode `idea-to-spec`

**[BLOCKING]** When `idea-to-spec` resolves, read `.claude/skills/workflow-planned-work/references/mode-idea-to-spec.md` in full FIRST, then `references/planned-work-core.md` before the first spec step. Its triage, quality gates, recommended skills, orchestration and fix path are the contract for this mode.

## Mode `spec-to-tasks`

**[BLOCKING]** When `spec-to-tasks` resolves, read `.claude/skills/workflow-planned-work/references/mode-spec-to-tasks.md` in full FIRST, then `references/planned-work-core.md` before the first readiness or UI step. Its canonical input profile, triage, quality gates, recommended skills, outputs and fix path are the contract for this mode.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `ui-ux-design-principles` — Forty usability and accessibility clauses, UI-1.1 to UI-9.4; designing, building or reviewing a user-facing interface → .claude/skills/shared/protocols/ui-ux-design-principles.md
- `ux-journey-gate` — Journey-first UX gate UX-1 to UX-11: report journeys, read the design authority, generate, then check every UI/UX gate; generating, specifying, planning, mocking up or reviewing a user-facing surface → .claude/skills/shared/protocols/ux-journey-gate.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** turn product intent into reviewed planning artifacts in the selected mode — a reviewed provisional spec (`idea-to-spec`) or reviewed, readiness-checked, prioritized planned work (`idea-to-tasks`, `spec-to-tasks`) — and stop before implementation.

- **MUST ATTENTION** select the mode FIRST from `--from`/`--to`, `--mode` or the prompt, record it with the fingerprint, then read that mode's reference in full before any step.
- **MUST ATTENTION** `gate` steps always run; core and optional steps follow their registry conditions, each skip logged with evidence; frontmatter priority and the releasable-outcome contract hold in every task-producing run.
- **MUST ATTENTION** no mode writes production code, creates a product roadmap or holds all tasks in memory: write each artifact as soon as it is drafted.

**[TASK-PLANNING]** Create the phase todos the manifest returns before triage, analysis or step execution.
