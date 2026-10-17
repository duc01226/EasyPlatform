# Planned-work core — rules the three planning workflows share

Read in full when running or editing mode `idea-to-tasks`, mode `idea-to-spec` or mode `spec-to-tasks`, before the first spec, task-readiness, prioritize, UI or close step. Each mode's registry variant owns its step list, roles and conditions; its `references/mode-*.md` file owns its triage and the rules unique to it. This file owns the blocks the three modes share; a block applies only where the mode's sequence contains it.

## Spec block — author, tests, one review, one interview

Used by mode `idea-to-spec` and the Single-Task track of mode `idea-to-tasks`: `spec [mode=draft]` → `spec [mode=tests]` → `work-item --mode=review --type=spec-tests` → `spec [mode=clarify]`.

- **Author.** `spec [mode=draft]` writes the provisional canonical spec at its configured path (`spec [mode=update]` when the scope decision is EXTEND an existing spec). Resolve the artifact profile before authoring.
- **Tests.** `spec [mode=tests]` plans the cases in the profile's case carrier. Every case names its **Business Intent / Invariant Guarded** and would fail if that intent broke. The independent review that follows replaces the tests step's own case-list question (`.claude/skills/spec/references/tests.md` → Interactive review).
- **One review.** `work-item --mode=review --type=spec-tests` is the spec's review: its case rows plus the Spec body (§1-7) rows whenever this run authored or changed §1-7 (`.claude/skills/work-item/references/review-type-spec-tests.md` → Spec body), with the BLOCKING M1-M7 gate. No separate untyped spec review runs.
- **One decision interview.** `spec [mode=clarify]` confirms every NON-OBVIOUS, CONFLICTS and high-impact decision the spec and its cases encode, writes each to the native role and the Decisions Log, and keeps residual confidence below 80% as an Open Question. It runs after the review, so it asks about reviewed content; a confirmed material change goes through the spec's authoring procedure, and clarify re-runs its completeness pass on the changed content and re-runs the spec-tests review on that delta (`.claude/skills/spec/references/mode-clarify.md` → Step 5).

## Task-readiness block — refine, review, challenge, story, DoR

Used by mode `idea-to-tasks` and mode `spec-to-tasks`, per task, in this order: `work-item --mode=refine` → `work-item --mode=review --type=task` (gate) → `work-item --mode=challenge --reuse=task-review` (optional, when it applies) → `work-item --mode=story` → `work-item --mode=dor --reuse=task-review` (gate). Stories are sliced after the challenge when it runs, so a revision does not force a re-slice.

| Step | Owns |
| --- | --- |
| `refine` | The task: one independently releasable actor-facing outcome (`.claude/skills/shared/releasable-task-contract.md`), GIVEN/WHEN/THEN acceptance criteria that pass M1-M5/M7, RICE and the frontmatter priority, estimates and the Dependencies table. From a governing spec (clarified in this run, or supplied) it cites the spec as the validated hypothesis and its interview asks only what the spec and the decision log leave open (`.claude/skills/work-item/references/mode-refine.md` → Phase 3 and Phase 7). |
| task review (gate) | A fresh-context review of the task, including the module, feasibility and cross-cutting rows 10-12 (`.claude/skills/work-item/references/review-type-task.md`). Record its report path and the task's SHA-256 identity in the run report. |
| `challenge` | The cross-person Dev BA PIC challenge by a reviewer other than the drafter: it starts from the task review's rows 10-12, adds specific challenge prompts, and the human records `APPROVE`, `REQUEST_REVISION` or `ESCALATE_TO_LEAD` (`.claude/skills/work-item/references/mode-challenge.md`). It is optional: it runs when a real second reviewer (a Dev BA PIC other than the drafter) is available, or the task is size M or larger or carries cross-module, data, security or irreversible risk. When it is skipped, the task review (gate) and DoR (gate) still cover feasibility, module confirmation and the cross-cutting rows. |
| `story` | The stories sliced from the reviewed task, challenged when the challenge ran. |
| DoR (gate) | The `READY_TO_PLAN` verdict over the task and its stories. It also checks the story rows ST1-ST4 (INVEST, task AC → story coverage, scenarios, M1-M7 per story), so no separate story review runs (`.claude/skills/work-item/references/mode-dor.md`). |

- **Reuse.** `--reuse=task-review` lets the challenge and DoR reuse only the criteria the task review's coverage map allows, and only while the task's SHA-256 still matches; DoR- and challenge-owned checks always run in full. After any task edit (a fix, or a story edit that touched the task) drop the flag so both run every check (`.claude/skills/shared/m1-m7-gates.md` → Reusing an earlier verdict).

## Prioritize — threshold and placement

`prioritize` runs once, after every task's DoR and before the UI block, when three or more tasks were generated in this run or a task must be ranked against existing planned work. The skill ranks only three or more items, because fewer give no ranking signal (`.claude/skills/prioritize/SKILL.md` → "fewer than 3 items"); below that, the main session writes each task's integer `priority` and `priority_label` (through `/task-track` when the task is tracked) in the order refine's value and effort analysis supports, citing it. When it runs, it writes integer `priority` (rank) and `priority_label` (RICE or MoSCoW) into EACH task's frontmatter, not only the planned-work file, so the mockup's priority badge and the deck show the final value.

## UI block — design spec, design review, mockup

Order: `design-spec` → `work-item --mode=review --type=design` → `work-item --mode=mockup --explore`, per UI task (mode `idea-to-spec` runs the first two only; `workflow-spec-to-mockup` runs the same order).

- `design-spec` writes the Journey Report (`UX-1`) and the design-authority record (`UX-2`). The design review converges before any visual direction is drawn, so the drafts inherit reviewed journeys and information priority.
- `--explore` owns the Step 0 scope gate (3, 2 or 1 drafts, or skip), the direction drafts, the user's recorded pick, the full mock app and the walkthrough (`UX-8`). It reuses the reviewed Journey Report and re-confirms only what changed (`.claude/skills/work-item/references/mode-mockup.md` → Step 2a).
- **The scope gate and the pick are the user's, in the main session** — never inside a sub-agent and never batched across tasks. A scope answer recorded in the run report is reused, never asked twice; `Mockup: SKIPPED by user` is a valid recorded outcome.
- **Spec-hub coupling.** `design-spec` records `design_spec:` and the mockup step, which runs after it, records `mockup:` in the governing spec's frontmatter, or the profile's native link — frontmatter only; visual fidelity stays out of the spec (`SYNC:ui-intent-layer`). A native spec with no link carrier keeps the separate design spec and flags the missing relationship; never invent a section.
- Backend-only work records its stated skip reason for the whole block.

## Decision log — ask once per run

Every answer a step obtains from the user — the initiative Discovery Interview, refine's validation interview, `spec [mode=clarify]`, a plan validation, the mockup scope gate and the direction pick — is appended to the run's `## Decisions` (`/start-workflow` → Step Execution Protocol, Decision log). Each later interview reads that section first and asks only what it leaves open or what new evidence reopened; a reused answer is cited, never asked again. `spec [mode=clarify]` is the run's single decision interview for spec content. `plan` validates its own decisions inside its step when the workflow lists no `plan --mode=validate` step (`.claude/skills/plan/SKILL.md` → Standalone Validation Chain).

## Findings and loop bounds

Validate findings before fixing; fix in the owning artifact (`refine` for the task, `story` for stories, `spec` for the spec and its cases) and re-run the reviewer that raised the finding. Round 1 exits on zero open findings (LOW deferral); round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 3 review rounds, and on no progress escalate via `ask user question tool`.

## Close tail

`docs-manager --mode=update` (optional) → `feature-presentation` (optional) → `workflow-end` (gate) → `watzup` (optional).

- **Docs.** The spec and test steps write the canonical owner. `docs-manager --mode=update` runs when its registry condition holds (each workflow states its own) to sync the spec's case carrier and the derived indexes or reference docs that embed it; its report is the `spec-synced` evidence where that outcome gate applies.
- **Deck.** `feature-presentation` runs for several tasks or capabilities, an M or larger scope, or a stakeholder request; a planned-work deck shows each task's final rank.
- **Close.** `workflow-end` checks every outcome gate and prints the recap, or the short handoff when nothing was built. `watzup` runs only when the user asked for a session report or the session spanned several workflows. The handoff names the artifacts written, the review and DoR results, blocking items, open questions below 80% confidence and the recommended next workflow.
- These workflows change no code: the test-green gate does not apply, and planned cases stay reference-only until their review and readiness gates accept them.
