---
name: product-roadmap
description: '[Planning] Use ONLY when the user explicitly requests a product roadmap, roadmap update or milestone selection: outcome milestones, MVP scope, non-goals, risks, evidence gates.'
disable-model-invocation: true
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute phases in order; update todo tracking before and after each phase.
> **[BLOCKING]** Every completed or skipped phase needs concise evidence or a reason.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** When explicitly requested, turn a product vision into an approved, outcome-based roadmap and one selected milestone—or route a genuinely isolated change through an explicit EXEMPT boundary—without making the roadmap artifact a prerequisite for ordinary initiative, task, spec, presentation, or mock-up work.

**Summary:**

- Detect create/update/select/exempt only after confirming that the user explicitly requested this standalone skill. Read the shared contract and existing roadmap before writing. A large or ambiguous idea alone is not an invocation; its decomposition belongs in the owning task/spec/presentation/mock-up artifacts.
- Define the product outcome, actors, business truth, and 3–8 outcome milestones; each milestone names user outcome, risk retired, non-goals, human decisions, dependencies, and evidence.
- Ask the owner to confirm ambiguous terms and select one milestone; write the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) and a linked `scope-brief.md` incrementally.
- Hand off only an approved milestone, or an explicitly accepted EXEMPT scope, to `$scenario`; implementation planning remains blocked until the applicable Plan Gate is satisfied.
- **Main steps:** explicit-route confirmation → context/contract load → outcome framing → milestone design → owner decision gate → roadmap/scope-brief write → selected milestone or EXEMPT handoff → scenario/Plan Gate.

**Workflow:** 0) route and context → 1) outcome framing → 2) milestone design → 3) decision gate → 4) write roadmap → 5) select milestone/scope brief → 6) handoff.

**Key Rules:**

- Product roadmap answers outcomes and boundaries; it is not a timeline or implementation plan.
- Do not choose frameworks, database schemas, endpoints, screens, or code in this skill.
- Never silently reinterpret `ready`, `published`, `delivered`, `paid`, `refunded`, or equivalent lifecycle terms.
- A roadmap is canonical at one path — default `docs/product-roadmap.md`, overridden by a `docsRoots.productRoadmap.path` entry in `docs/project-config.json`; update that file rather than creating competing roadmap files.

## Contents

- [Quick Summary](#quick-summary)
- [Mission](#mission)
- [Required Context](#required-context)
- [Phase 0: Explicit Invocation Gate and Applicability](#phase-0-explicit-invocation-gate-and-applicability)
- [Phase 1: Frame the Product Outcome](#phase-1-frame-the-product-outcome)
- [Phase 2: Design Outcome-Based Milestones](#phase-2-design-outcome-based-milestones)
- [Phase 3: Decision Gate](#phase-3-decision-gate)
- [Phase 4: Write the Canonical Roadmap](#phase-4-write-the-canonical-roadmap)
- [Phase 5: Select One Milestone and Write Scope Brief](#phase-5-select-one-milestone-and-write-scope-brief)
- [Phase 6: Handoff and Stop Conditions](#phase-6-handoff-and-stop-conditions)
- [Output](#output)
- [Closing Reminders](#closing-reminders)

## Mission

<request>$ARGUMENTS</request>

## Required Context

**MUST ATTENTION READ** `.claude/skills/shared/product-roadmap-contract.md` and `references/roadmap-template.md` before authoring. Also read `docs/project-config.json`, `docs/project-reference/docs-index-reference.md`, and `docs/project-reference/lessons.md` when present. If project context is stale or missing, use the project's setup route before proceeding.

## Phase 0: Explicit Invocation Gate and Applicability

First confirm that the caller explicitly requested a product-roadmap deliverable or named this standalone skill. If not, STOP this route and return control to the active initiative/task/spec workflow; do not infer `create`, do not create a scope brief, and do not write the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path).

For an explicit invocation, classify `$ARGUMENTS` as `create`, `update`, `select`, or `exempt`:

- `create`: no approved roadmap or a new product boundary;
- `update`: roadmap exists but outcome, milestone, risk, or decision changed;
- `select`: roadmap exists and the task needs one milestone scope brief.
- `exempt`: a genuinely isolated brownfield change or bugfix whose product-level scope is unchanged.

Do not infer roadmap-first planning from greenfield, big/ambiguous, broad, or release-scoped wording. Those signals trigger the shared `large_idea_decomposition` contract in their owning workflow. Only the explicit `create|update|select` route writes or updates a product roadmap. For `exempt`, resolve or create the stable scope brief, write the explicit `Roadmap Applicability: EXEMPT` record from the shared contract, and hand off to the existing narrow flow; do not create/update a product roadmap or select a milestone.

## Phase 1: Frame the Product Outcome

Run Phases 1–5 only for `create`, `update`, or `select`. The `exempt` route uses the shared contract's common scope fields and skips product-outcome/milestone authoring.

Read the request and existing product/spec artifacts without selecting technology. Establish:

1. Primary user/owner and the outcome they need.
2. Product boundary and actors outside it.
3. Key hypothesis and the cheapest evidence that could validate it.
4. Business source of truth, critical states, persistence expectation, and ambiguous terms.
5. Risks that make a screen-only breakdown unsafe (data loss, duplicates, wrong status, access leakage, orphaned records, irreversible side effects).

Separate observed evidence, user-provided decisions, and AI hypotheses. Mark unresolved items instead of filling gaps from “reasonable” defaults.

## Phase 2: Design Outcome-Based Milestones

Create 3–8 milestones, ordered by dependency and learning value, not calendar date. For every milestone answer:

| Field | Required question |
| --- | --- |
| User outcome | What can the user accomplish after this milestone? |
| Risk retired | Which product, data, access, lifecycle, or operational risk is reduced? |
| Non-goals | What is explicitly not being built or validated yet? |
| Human decisions | Which terms, policies, ownership, or risk tolerances require approval? |
| Evidence gate | What observable journey/state proves the milestone is complete? |
| Dependencies | Which prior outcome or decision must already hold? |

Use “Pre-MVP Gate” for product truth/ownership/state decisions when needed, and “MVP” only for the smallest release that tests the key hypothesis. Keep later refunds, automation, roles, production handoff, or similar work visible as later milestones or non-goals; do not erase them from the roadmap.

## Phase 3: Decision Gate

Before writing an approved roadmap, use `ask user question tool` for every material ambiguity. At minimum confirm:

- the product hypothesis and primary owner/customer;
- source-of-truth state and persistence expectation;
- meanings of lifecycle terms that downstream artifacts might interpret differently;
- milestone boundaries, especially what MVP explicitly excludes;
- evidence acceptable for completion and what must be redacted.

Present 2–4 concrete options with a recommendation grounded in the request. Record `confirmed`, `deferred`, or `blocked`; a material `blocked` decision prevents approval.

## Phase 4: Write the Canonical Roadmap

Use `references/roadmap-template.md`. Create or update the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) immediately after framing; preserve approved history and replace only the section the owner approved. Include the evidence basis for each decision, but do not place secrets or implementation design in the file.

The artifact is `draft` until the owner approves the product outcome and milestones. A new roadmap MUST NOT be marked `approved` because AI confidence is high.

## Phase 5: Select One Milestone and Write Scope Brief

For roadmap-applicable work, ask the owner to select one milestone (or confirm the supplied one). Then write:

`<plans root>/{active-plan-id}/scope-brief.md` — resolve `<plans root>` in this order: a `docsRoots.plans.path` entry in `docs/project-config.json` WINS; otherwise `.ck.json` `paths.plans`; otherwise the `plans` default.

If no active plan exists, create one stable handoff directory named `{YYMMDD-HHmm}-{slug}/` under that same resolved plans root (default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`), write the scope brief there, and keep that `plan-id` for every downstream artifact. Do not put a scope brief under `tmp/reports/`: that directory is for reports, not the roadmap-to-plan handoff. The scope brief must carry the roadmap path, milestone ID/outcome, actor, in-scope behaviors, non-goals, terminology, source of truth, risks, confirmed decisions, open questions, evidence gate, and redaction rules. Update the roadmap’s `## Selected Milestone` section with the same path and approval status.

Do not select multiple milestones for one implementation plan. If the request spans independent outcomes, return to milestone design and split the scope.

For `exempt`, do not select a milestone. Write `<plans root>/{plan-id}/scope-brief.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` wins, else `.ck.json` `paths.plans`) with the shared contract's EXEMPT block, common actor/outcome/boundary/non-goal/terms/source-of-truth/risk/evidence fields, and accepting-owner approval. Keep the stable `plan-id` for `$scenario` and `$plan`.

## Phase 6: Handoff and Stop Conditions

For an explicit roadmap request, handoff only after the roadmap document (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path) and the scope brief are written and owner-approved. For `exempt`, handoff after the EXEMPT scope brief and owner approval are written; no roadmap or milestone is required:

1. `$scenario {scope-brief}` to enumerate adversarial situations.
2. `$brainstorm` for a selected capability’s detailed scope only when ideation is still needed; do not reopen the product roadmap silently.
3. `$spec`, `$work-item --mode=refine`, or `$plan` only after the downstream skill confirms the roadmap/milestone references or the EXEMPT branch.

Stop and report `BLOCKED` when applicable roadmap artifacts are missing, no applicable milestone is selected, the EXEMPT reason/owner is missing, a material term has multiple plausible meanings, or the owner has not approved the selection/boundary.

## Output

Report:

- roadmap path and status, or the EXEMPT reason and owner;
- selected milestone ID and user outcome when applicable;
- explicit non-goals;
- risk retired and evidence gate;
- confirmed decisions and open questions;
- scope brief path;
- next skill and any blocker.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** For an explicit roadmap request, produce an owner-approved outcome roadmap and one selected milestone, or an owner-approved EXEMPT boundary for an isolated change. Ordinary workflows use embedded large-idea decomposition and do not enter this writer route.
**IMPORTANT MUST ATTENTION Main steps:** confirm the explicit route → load context and contract → frame outcomes → design milestones → obtain owner decisions → write the roadmap/scope brief → hand off the selected milestone or EXEMPT branch through scenario and Plan Gate.
**IMPORTANT MUST ATTENTION** run the explicit route → context → outcome/milestone or EXEMPT boundary → decision gate → scope → handoff in order.
**IMPORTANT MUST ATTENTION** define outcome, risk retired, non-goals, human decisions, dependencies, and evidence for every milestone.
**IMPORTANT MUST ATTENTION** use `ask user question tool` for material decisions; AI confidence never equals owner approval.
**IMPORTANT MUST ATTENTION** no framework, schema, endpoint, screen, or code decisions in the product roadmap.
