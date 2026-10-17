# Artifact Accumulation — Scope Resolution, Parse Map, Gap-Fill Routing, Branches

Collect-side reference for `feature-presentation`. Governs **content collection**: which artifacts enter the deck (scope resolution), which slide section each artifact type feeds (parse map), how missing artifacts are filled (gap-fill routing), and the spec-only / empty-state branches. (Rendering correctness lives in `deck-template.md`.)

<!-- SKILL-NAV:START -->
## Contents

- [0. Path roots (resolve before globbing or citing any path below)](#0-path-roots-resolve-before-globbing-or-citing-any-path-below)
- [1. Scope Resolution (SKILL.md Step 1)](#1-scope-resolution-skillmd-step-1)
- [2. Per-Artifact-Type Parse Map](#2-per-artifact-type-parse-map)
- [3. Gap-Fill Routing (SKILL.md Step 2 — sub-agent)](#3-gap-fill-routing-skillmd-step-2--sub-agent)
- [4. Branches](#4-branches)
- [5. Accumulation Output (handed to `deck-template.md`)](#5-accumulation-output-handed-to-deck-templatemd)
- [6. Journey-Extraction Map (main-story flows → ordered journeys)](#6-journey-extraction-map-main-story-flows--ordered-journeys)

<!-- SKILL-NAV:END -->

## 0. Path roots (resolve before globbing or citing any path below)

- `{artifacts-root}` — the team-artifacts root: default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.
- `{spec-root}` — the business Feature Spec root: default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

Both placeholders stand for the RESOLVED value everywhere they appear below. The glob shapes, date prefixes, and file-name conventions are unchanged by the root — substitute the prefix only.

---

## 1. Scope Resolution (SKILL.md Step 1)

Three modes, in priority order:

### A. Default — active-plan anchor (created→now date range)

1. Read `activePlan` from the OS-temp per-session file `CK_TMP_DIR/session/{id}.json` (the path returned by `getSessionStatePath`, written by `.claude/scripts/set-active-plan.cjs`).
2. Read the plan to get its **created date** (frontmatter `created:`) and its declared artifact/spec outputs.
3. Compute the **created→now date range** and enumerate every `{YYMMDD}` in it.
4. Glob each artifact root for EVERY `{YYMMDD}` in the range (NOT just today):
    - `{artifacts-root}/initiatives/{YYMMDD}-*`
    - `{artifacts-root}/tasks/{YYMMDD}-task-*.md`
    - `{artifacts-root}/tasks/stories/{YYMMDD}-us-*.md`
    - A record in `initiatives/`, `tasks/` or `tasks/stories/` whose file name carries no date, such as a task created in the tracker and saved as `{id}.md`: include it when its frontmatter `created` or `updated` date falls in the range. Never skip a record only because its file name lacks the date prefix.
    - `{artifacts-root}/tasks/*-mockup.html` (date-prefixed via their task)
    - `{artifacts-root}/design-specs/{YYMMDD}-designspec-*.md`
    - `{artifacts-root}/backlog/*-backlog.md` (the ranked-priority source for the Scope & planned work slide)
    - the plan's `{spec-root}/{Bucket}/README.{Feature}.md` outputs
5. **Multi-day rule (why the range, not today):** a workflow spanning midnight authors specs on day 1 and tasks on day 2. A single-day `{YYMMDD}` glob silently drops the day-1 artifacts. Always glob the whole created→now range.

### B. Custom prompt — widen scope

If the user names specs/features, widen the in-scope set to those named artifacts plus their dependents (the tasks, stories, mockups, and design-specs derived from them).

### C. Standalone + no prompt — ask

If invoked standalone with no prompt/scope and no resolvable `activePlan`, use `ask user question tool` to ask which specs/initiatives to present. NEVER silently guess scope.

---

## 2. Per-Artifact-Type Parse Map

Each in-scope artifact feeds one or more stakeholder slide sections:

| Artifact type | Source path                                         | Parse → slide section                                                                 |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Initiative    | `{artifacts-root}/initiatives/{YYMMDD}-*`                 | Business context (problem, value, initiative→spec narrative)                                 |
| Feature Spec  | `{spec-root}/{Bucket}/README.{Feature}.md`          | Business context (§1-3); Behavior & rules (§4 rules / §5 invariants); QC view (§8 TCs) |
| Task           | `{artifacts-root}/tasks/{YYMMDD}-task-*.md`           | Scope & planned work (task cards in ranked order, each showing its `priority_label` + integer `priority` rank from frontmatter, plus acceptance criteria) |
| Decomposition | Owning initiative/spec/task `large_idea_decomposition` block | Decomposition & boundaries (slice IDs/outcomes, dependency order, non-goals, risks/evidence owners, deferred-work owners); required when any shared large-idea signal is true |
| Planned work       | `{artifacts-root}/backlog/*-backlog.md`             | Scope & planned work (the ranked order + priority source when task frontmatter is thin — reconcile against per-task `priority_label`/`priority`) |
| User story    | `{artifacts-root}/tasks/stories/{YYMMDD}-us-*.md`   | Scope & planned work (As-a/I-want/So-that, acceptance criteria)                             |
| Design-spec   | `{artifacts-root}/design-specs/{YYMMDD}-designspec-*.md` | UI / mockups (ASCII wireframe + Component Inventory / States / Design-Tokens tables) |
| Mockup        | `{artifacts-root}/tasks/*-mockup.html`               | UI / mockups (embedded via `<iframe srcdoc>` — see `deck-template.md` §3)             |

**Real domain data:** populate sample data from `domain-entities-reference.md` in the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — real entity field names + realistic values, never Lorem ipsum or "Item 1, Item 2". Keep accompanying prose tech-agnostic (business/observable terms, not framework/CSS class names).

---

## 3. Gap-Fill Routing (SKILL.md Step 2 — sub-agent)

Fill missing downstream artifacts so the deck is complete:

| Gap                                              | Fill action                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Targeted spec has NO tasks                         | An offer, not a required step: ask the user once; on a yes, invoke `workflow-planned-work --mode=spec-to-tasks` **AS A SUB-AGENT** (Agent tool) briefed to run `/start-workflow workflow-planned-work --mode=spec-to-tasks` with the user's yes as the explicit request — returns a summary, writes full findings to `tmp/reports/`; otherwise report the gap |
| Tasks lack `-mockup.html` AND workflow is mockup-bearing (`idea-to-tasks`) | Invoke `work-item --mode=mockup` per task to generate the missing mockup                       |
| Spec-only `idea-to-spec` context                 | SKIP all mockup generation — never invoke `work-item --mode=mockup` (deck uses design-spec visuals only)          |

**Sub-agent rule (why):** per CLAUDE.md "Workflow Step Advancement §3", a step that itself activates a multi-step workflow MUST run as a sub-agent — it returns only a summary and writes full findings to `tmp/reports/`. Running it inline would pollute the deck-build context with the entire workflow transcript and exhaust the budget before assembly.

---

## 4. Branches

### Spec-only vs mockup-bearing

| Context             | Visual source for the "UI / mockups" section                                              |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `idea-to-tasks`       | Embedded `work-item --mode=mockup` HTML via `<iframe srcdoc>` (full HTML mockups)                       |
| `idea-to-spec`      | Design-spec ASCII wireframe + Component Inventory / States / Design-Tokens tables ONLY — NO HTML mockups, NO `work-item --mode=mockup` invocation |

The spec-only branch preserves the `idea-to-spec` no-mockup / no-code contract: in that context the deck NEVER generates or embeds an HTML mockup, even if one could be produced.

### Demo flows per branch

| Context        | Journey demo source                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `idea-to-tasks`  | Interactive `work-item --mode=mockup` HTML scoped to the flow, embedded via `<iframe srcdoc>` + deck narration strip (`deck-template.md` §3b). |
| `idea-to-spec` | **Narrated step-through of design-spec ASCII frames** — one wireframe-demo slide per ASCII frame (ids `demo-{journey-slug}`, `demo-{journey-slug}-2`, …), advanced by Next, each with its per-step explanation (`deck-template.md` §3b "Spec-only wireframe demo"). NO HTML mockup, NEVER invoke `work-item --mode=mockup`. |

The spec-only narrated-ASCII journey honors the no-mockup / no-code contract while still giving stakeholders a sense of motion — it advances design-spec ASCII frames, it does not render or embed any HTML mockup.

### Empty-state (F3)

- If scope resolves to **zero artifacts**, emit an explicit empty-state slide rather than failing.
- If an in-scope feature has **no `-mockup.html` AND no design-spec**, render an explicit empty-state slide ("No prototype or design available for {feature}") — never a broken/blank iframe.

---

## 5. Accumulation Output (handed to `deck-template.md`)

The accumulation step produces an ordered, stakeholder-sectioned content model:

1. **Title / agenda** — feature(s), run date, resolved scope.
2. **Business context** — from initiatives + Feature Spec §1-3.
3. **Decomposition & boundaries** — when any shared large-idea signal is true, from the complete owning block; show stable slice IDs, ordered dependencies, non-goals, risk/evidence ownership, and deferred-work ownership. When all signals are false, show `N/A — ordinary isolated scope` and do not invent roadmap content.
4. **Scope & planned work** — from tasks + stories, presented in ranked order with each task's `priority_label` + integer `priority` rank (read from task frontmatter, reconciled against the ranked `{artifacts-root}/backlog/*-backlog.md` when present). Priority display is MANDATORY when the tasks are prioritized; if they are not yet prioritized, say so explicitly rather than omitting the field.
5. **Behavior & rules** — from Feature Spec §4 rules / §5 invariants + §8 test cases.
6. **Journeys / demo flows** — ordered main-story journeys (§6 extraction map); each handed to the render side as an interactive demo-flow slide (or narrated ASCII frames in spec-only context).
7. **UI / mockups** — per the spec-only vs mockup-bearing branch (or empty-state).
8. **QC view** — from Feature Spec §8 test specifications + states matrix + edge cases.
9. **Summary / next steps**.

The render-side (`deck-template.md`) turns this content model into the single standalone HTML deck.

---

## 6. Journey-Extraction Map (main-story flows → ordered journeys)

Extract one **journey** per main user story (MVP happy path — not every edge case). Each journey is an ordered sequence: entry → click steps ("click X → see Y → move to Z") → end state, with one plain-language explanation per step. The render side turns each journey into a demo-flow slide (`deck-template.md` §3b).

| Source artifact + section                                          | What it contributes to the journey                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Task `## Acceptance Criteria` GIVEN / WHEN / THEN                    | The entry condition (GIVEN), the user action (WHEN), the observable result (THEN) for each step. |
| User story `As a / I want / So that`                               | The persona + the journey's goal/title + the business "why" for the explanation. |
| Mock-up flow-spec (`work-item/references/mockup-interactive-demo.md` §1) | The concrete ordered `steps[]` (`action` → `result` → `explain`) + `endState` — when a `-mockup.html` exists, reuse its flow-specs verbatim so the deck demo == the per-task prototype. |

One journey per main story. Keep journey `title`/explanation prose tech-agnostic (business/observable terms, not framework/CSS class names) per M1/M2. In spec-only `idea-to-spec` context, the journey's steps map to design-spec ASCII frames (narrated step-through, one slide per frame), never an HTML mockup. Artifact text and wireframes carry `<`, `>` and `&`: hand them to the render side as plain text — it escapes every inserted value (`deck-template.md` §1 "Escape every inserted value").
