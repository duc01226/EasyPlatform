# `$work-item --mode=mockup` — interactive HTML mockup reference

> Loaded by `work-item/SKILL.md`'s Mode Dispatch when invoked as `$work-item --mode=mockup [--source=<path>] [--explore]`. This contract is the whole invocation: generate an interactive HTML mockup from a task, story or spec artifact. It works called directly with no workflow; every rule, flag, output and gate below is the contract of that mode.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Contents

- [Quick Summary](#quick-summary)
- [Task HTML Mockup Generator](#task-html-mockup-generator)
- [When to Use](#when-to-use)
- [Quick Reference](#quick-reference)
- [Detailed Workflow](#detailed-workflow)
- [Mockup Quality Checklist](#mockup-quality-checklist)
- [Edge Cases](#edge-cases)
- [Anti-Patterns](#anti-patterns)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Quick Summary

**Goal:** Give stakeholders a clickable, self-narrating mock app for the task's complete releasable outcome — every required page/view, navigation path, component, state, and story flow — as one self-contained interactive HTML prototype built from finalized task/story artifacts or a canonical feature spec before implementation begins.

**Summary:**

- PRE-implementation preview tool, not a UI builder: run ONLY on finalized tasks/stories (reviewed, gated) or a canonical feature spec with a UI intent layer; backend-only source with no UI sections → skip generation and tell the user; NEVER use for production UI, design specs, or scratch wireframes — why: it previews the wrong thing otherwise.
- **Journey-first, in BLOCKING order (`SYNC:ux-journey-gate`):** (1) analyze and REPORT the main user journeys (`UX-1`, Step 2a) → (2) read the design authority — design principles, design system, existing UI (`UX-2`, Steps 3 + 3b, recorded as `Design authority read:`) → (3) only then generate (Step 4) → walk every main journey + traceability matrix (`UX-8`, Steps 7 + 8). Views are journey steps, flows are main journeys.
- **Main steps/pipeline (run in order):** locate source (1) → extract UI specs (2) → **[BLOCKING] Journey Report (2a)** → **[BLOCKING] plan the page/view, component, state inventories from the journeys (2b)** → **[BLOCKING] plan demo flows = main journeys into flow-specs + one todo each (2c)** → decomposition boundary (2d) → load design system (3) → **[BLOCKING] inventory existing UI + map connected flows (3b)** → load domain entities (3c) → `--explore` only: scope gate first (Step 0: 3/2/1 drafts or skip), then N directions, user picks (3d) → generate the self-contained multi-view mock app HTML (4) → save (5) → report (6) → **[BLOCKING] fidelity validation (7)** → **[BLOCKING] releasable full-flow + demo-quality + journey-walkthrough gate (8)**. The BLOCKING gates (2a · 2b · 2c · 3b+7 · 8) must NEVER be skipped.
- Plan first, generate second: report the journeys (Step 2a), derive views (2b) and flows (2c) from them, and create one todo per flow BEFORE generating; sign off with a final Demo-Quality review gate (Step 8) auditing the generated prototype.
- **`--explore`:** after Steps 2a–3c and before Step 4, fan out N `ui-ux-designer` direction drafts (N = the Step 0 count) of the primary journey's key views (same journeys and priority tiers, divergent visuals), render them with html-export, open them in the default browser, ask the user to pick with `ask user question tool` when 2–3 drafts exist (your evidence-backed recommendation first; user cannot be asked → AUTO-SELECT the recommended draft with its reason), record the answer or the `Selection:` line, then build the full app in the chosen direction (Step 3d, `references/mockup-explore-directions.md`). Without the flag: one direction.
- Output is exactly ONE self-contained HTML file per task, but it MUST behave as a small mock app: include every page/view required by the releasable outcome, navigable transitions between them, all required components and states, and all stories as tabs/sections where useful. Inline CSS/JS, no external deps except Google Fonts, saved alongside the task artifact as `{task-filename}-mockup.html`.
- The mock-up is a **scripted clickable prototype** — each main-story flow clicks through end-to-end ("click X → see Y → move to Z") with guided narration (▶ Play / ⏭ Next / ⏮ Prev / ↺ Reset / ⏏ Exit), an explanation panel, and a visible "⚠ Simulated" banner; interactivity is **scripted/simulated only** (canned transitions, illustrative data) — NEVER real auth, persistence, or backend.
- Fidelity is the whole point — the mock-up must LOOK like the existing app: load the canonical + matched per-app design-system docs (NEW→canonical, REFACTOR→per-app), read real shared/module components for layout patterns, and populate with real domain entity fields and realistic sample data, never Lorem ipsum.
- **Releasable full-flow gate:** the prototype must start at the real entry/context, let a stakeholder navigate through the primary action and applicable validation/recovery states, reach the visible/persisted business result, and leave via the next/exit path. “Many pages” means all pages required by this journey, not an arbitrary page count.
- **Large-idea slice fidelity:** evaluate the shared `isLargeIdea` rule from the owning initiative/spec/task. When any signal is true, read the complete `large_idea_decomposition` block, preserve the task's owning slice ID, and ensure the mock-up demonstrates only that slice's outcome, dependencies, non-goals, risks/evidence, and deferred-work boundary. Do not create or update the product roadmap (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path); flag a missing/conflicting block back to `$work-item --mode=refine` or the owning spec.
- Render every defined component state (default/loading/empty/error) as toggleable, keep any accompanying prose/captions tech-agnostic (business terms, not framework/CSS class names) per the M1/M2 mandates, even though the rendered HTML may use real class names internally.

**Workflow:**

0. **Mockup Scope Gate (`--explore` only, FIRST)** — before any reading, ask 3 / 2 / 1 options or skip (question tool available); no question tool → one auto-selected draft
1. **Locate Source Artifact** — `--source=<path>` (task, story, spec or requirement report) or auto-detect the most recent task + story files in `tasks/` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path); read fully
2. **Extract UI Specs** — parse UI Layout/Wireframe, Components, States, Interaction Flow, Acceptance Criteria + priority/rank (spec source: its UI intent layer — view inventory, navigation map, observable states, per-story action flows)
2a. **[BLOCKING] Analyze & Report Main User Journeys (`UX-1`)** — Journey Report (frame · actors + job statements · ranked main journeys with step tables · derived design requirements · assumptions) from the stories, acceptance criteria and business logic, BEFORE any design output
2b. **[BLOCKING] Plan the Mock-App Surface** — derive every required page/view (= journey steps), navigation edge, common/domain/page component, applicable state, and per-view information priority (`UX-4`) from the Journey Report; todo tracking one todo for surface coverage
2c. **[BLOCKING] Plan the Demo Flows** — one flow-spec per main journey (plus any main story it misses), todo tracking one todo per flow BEFORE generating
2d. **[BLOCKING] Verify decomposition boundary** — when `isLargeIdea=true`, validate the complete five-field `large_idea_decomposition` block and owning slice ID; record `N/A — ordinary isolated scope` when all signals are false
3. **Load Design System (`UX-2`)** — baseline + matched per-app design tokens, colors, typography (NEW→canonical, REFACTOR→per-app)
3b. **[BLOCKING] Inventory Existing UI + Map Connected Flows (`UX-2`)** — read real shared/module components + map entry/exit flows; record `Design authority read:` before any generation
3c. **Load Domain Entities** — entity fields, relationships, enums for realistic sample data
3d. **Explore N Directions (`--explore` only)** — N (Step 0 count) `ui-ux-designer` drafts of the primary journey's key views, rendered with html-export, opened in the default browser; with 2–3 drafts ASK the user to pick (`ask user question tool`, your recommended draft first); record the pick or the `Selection:` line in `direction-approved.md`
4. **Generate HTML** — one self-contained scripted clickable prototype + guided walkthrough matching the app's look and feel (and the approved direction under `--explore`)
5. **Save** — write `{task-filename}-mockup.html` beside the task artifact (spec source: `design-specs/{YYMMDD}-mockup-{spec-slug}.html` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)); as a workflow step with a governing spec, also set its `mockup:` frontmatter link
6. **Report** — path, priority, stories, journeys, demo flows, components, states, fidelity + demo-quality verdicts
7. **[BLOCKING] Fidelity Validation** — mock-up matches inventoried UI (tokens/components/layout/connected flows) and each view's information priority; record PASS/FAIL; per-view render evidence is required in a review-gated workflow
8. **[BLOCKING] Demo-Quality Review Gate** — every flow clicks end-to-end, `UX-8` walkthrough of every main journey + traceability matrix (a self-check in a review-gated workflow, where `ui-design --mode=review` walks independently), no dead controls, narration + "⚠ Simulated" banner, offline, real data, iframe-safe; record PASS/FAIL

**Key Rules:**

- Ask AI to generate an **interactive HTML mock-up** for UI tasks; do not stop at an ASCII-only or static mockup — every main-story flow is a scripted clickable prototype with guided narration.
- One HTML file per task, containing a navigable mock app with all required pages/views; all stories may be shown as sections/tabs, but tabs do not replace missing flow pages
- The generated surface MUST cover the complete releasable outcome: entry/context, action/input, validation/decision, success/result, resulting visible/persisted truth, exit/next action, and applicable recovery/access states
- Include a page/view inventory, navigation map, component inventory (common/domain/page), and state inventory in the generation report; a single static screen or disconnected screen set FAILS the gate
- Report the main user journeys (Step 2a, `UX-1`) and read the design authority (Steps 3 + 3b, `UX-2`) BEFORE any design output; derive views (Step 2b) and demo flows (Step 2c) from the journeys BEFORE generating; sign off with the Demo-Quality + journey-walkthrough gate (Step 8, `UX-8`) AFTER
- `--explore` → Step 0 scope gate, then N direction drafts, user picks, then build (Step 3d); never pick for the user while they can be asked
- Interactivity is **scripted/simulated only** (canned transitions, illustrative data, "⚠ Simulated" banner) — NEVER real `fetch`/auth/persistence/backend; self-contained so it runs inside the deck's `<iframe srcdoc>`
- Self-contained: inline CSS/JS, no external dependencies except Google Fonts
- **Must resemble the project's current UI** — read existing component templates and page layouts
- Design must be based on project reference design docs: `docs/project-reference/design-system/README.md`, `docs/project-reference/design-system/design-system-canonical.md`, and the matched per-app design-system doc from `docs/project-config.json`
- Match project design system: colors, typography, spacing, BEM naming
- Use **real domain entity fields and realistic sample data** — not Lorem ipsum
- Include component states (default, loading, empty, error)
- Responsive layout with mobile/desktop preview
- Save in same directory as the task artifact
- **Tech-agnostic descriptive prose (M1/M2):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M7)" for BLOCKING criteria. Any narrative, captions, annotations, generation notes, or component/state descriptions accompanying the mock-up describe components and states by business/observable terms (e.g., "status indicator", "record list", "loading placeholder"), NOT by framework component names or CSS class names. The rendered HTML itself may use real class names internally (that is implementation, not prose), but the human-readable descriptions stay tech-agnostic per `spec-principles.md` §3 in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
- **Releasable outcome contract:** Apply `.claude/skills/shared/releasable-task-contract.md`; the mockup is complete only when it demonstrates the task's actor-facing outcome through all required views, components, states, and transitions. A single static screen is a blocking failure.
- **Decomposition contract:** Apply `.claude/skills/shared/product-roadmap-contract.md`; for a large idea, the report and mock-up header must name the owning slice ID and state `Decomposition boundary: PASS | BLOCKED`. A mock-up must not invent a new slice, roadmap, milestone, or deferred owner.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Task HTML Mockup Generator

Generate visual HTML mockup reports from task and user story artifacts.

---

## When to Use

- After task and stories are finalized (reviewed, challenged, gated)
- When a canonical feature spec with a UI intent layer needs an interactive preview (`--source=<spec path>`, optionally with a `$design-spec` output)
- Before moving to implementation planning or design spec
- When stakeholders need a visual preview of the feature, or 1–3 design directions to choose from first (`--explore`)
- As the last step of the UI block in `workflow-planned-work` and similar workflows, after the reviewed design spec

**NOT for**: Implementing production UI (use `$feature-implement`), creating design specs (use `$design-spec`), or wireframing from scratch (use `$design-spec --mode=wireframe`).

---

## Quick Reference

### Input

| Source          | Path                                                    |
| --------------- | ------------------------------------------------------- |
| Task artifact    | `tasks/{YYMMDD}-task-{slug}.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)            |
| Story artifacts | `tasks/stories/{YYMMDD}-us-{task-slug}.md` under that same team-artifacts root (default `team-artifacts`; overridden by `docsRoots.teamArtifacts.path` in `docs/project-config.json`) |
| Feature spec    | A canonical feature spec under the business spec root (default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path) — read its UI intent layer (`SYNC:ui-intent-layer`: view inventory, navigation map, observable states, per-story action flows) and business rules |
| Design spec     | Optional companion from `$design-spec` (`design-specs/` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)) — layout, components and states for the same feature |
| Explicit path   | `--source=<path>` (task, story or spec); a bare path argument is accepted as `--source` |

### Flags

| Flag              | Effect                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------- |
| `--source=<path>` | Source artifact: task, story, feature spec or requirement report. Omitted → auto-detect the most recent task (Step 1)                 |
| `--explore`       | Before the full build, ask how many design directions to generate (3 / 2 / 1 / skip — asked at Step 0, FIRST, before any reading; no question tool → one, auto-selected), then generate them of the primary journey's key views, render them, open them in the default browser, and ask the user to pick with a recommended option (Step 3d). Omitted → single direction |

### Output

| Type        | Path                                           |
| ----------- | ---------------------------------------------- |
| HTML mockup (task/story source) | `{same-dir-as-task}/{task-filename}-mockup.html` |
| HTML mockup (spec source) | `design-specs/{YYMMDD}-mockup-{spec-slug}.html` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) — never inside the spec root |
| `--explore` run artifacts | `tmp/design/<run>/` — `journey-report.md`, `run-notes.md`, `direction-{a,b,c}.html`, `renders/direction-{a,b,c}/`, `direction-approved.md` (disposable) |

### Related

- **Input from:** `$work-item --mode=refine`, `$work-item --mode=story`, `$spec` (canonical feature spec), `$design-spec`
- **Command:** `$work-item --mode=mockup [--source=<path>] [--explore]`
- **Uses:** `html-export` (Step 3d renders, Step 7 render evidence — required in a review-gated workflow), `ui-ux-designer` sub-agents (Step 3d)
- **Next Step:** `$prioritize`, `$design-spec`, `$plan`

---

## Detailed Workflow

### Step 0: Mockup Scope Gate (`--explore` only; FIRST, before ANY reading or analysis)

> **Purpose:** let the user skip or shrink mockup generation BEFORE any tokens are spent on it. This is a pre-generation confirm, not the post-generation pick (that is Step 3d).

- **`ask user question tool` available → ALWAYS ask first**, before Step 1: "Generate design mockup options for <feature/surface>?" Options: `3 options` · `2 options` · `1 option` · `Skip mockup`. Mark one `(Recommended)` by the requested scope, judged from the request text only: a new page or multi-view flow → 3; a single component or dialog → 1–2. Use one short line of context per option (for example the token and time cost of 3 drafts versus 1).
- **`Skip mockup`** → STOP this skill now. Record `Mockup: SKIPPED by user (Step 0)` in the calling plan or run report; the workflow continues without a mockup.
- **`1` / `2` / `3 options`** → run Steps 1–8 as written; Step 3d builds exactly that many drafts (`1 option` → one draft in your recommended direction, still rendered and opened, recorded `Selection: USER — 1 option`, no pick needed).
- **`ask user question tool` NOT available** (a non-interactive host, a sub-agent only when no session in the run can ask the user, an autonomous or scheduled run) → do not ask and do not block: run Steps 1–8 with ONE draft in the recommended direction (best main-journey fit and best fit with the project design system), auto-select it, and record `Selection: AUTO-SELECTED — no question tool (1 draft)` in `direction-approved.md` and in the plan or run report.

**Run it where the user can be asked:** when this skill runs as a workflow step, Step 0 and the Step 3d pick execute in the main session; a delegated sub-agent may build drafts but never owns Step 0 or the pick, and the no-question-tool fallback is only for hosts where no session can ask. **Never ask twice:** when the calling workflow already asked this at its start and recorded the answer in its run report, reuse that answer. Without `--explore` (a direct single-direction request), Step 0 does not apply.

### Step 1: Locate Source Artifact

1. If `--source=<path>` (or a bare path argument) is provided, use it as the source path and classify it: **task**, **story** (resolve its parent task via the story's task link or slug, then continue as a task source), or **feature spec** (a file under the business spec root — default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path — or a file whose frontmatter/headings declare a feature spec), or **requirement report** (a workflow run's investigation, requirement or plan report — e.g. from `workflow-feature` or `workflow-bugfix` when the work adds new UI and no task or spec covers it yet)
2. Otherwise, auto-detect the most recent task: glob `tasks/*.md` (the folder's own files, not `tasks/stories/`) under the team-artifacts root, which finds a task saved as `{YYMMDD}-task-{slug}.md` by refinement and one saved as `{id}.md` by the tracker alike, (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path), sorted by modification time
3. Read the source artifact fully
4. **Task source:** check for associated stories: glob `tasks/stories/*-us-{task-slug}*.md` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path); read all story artifacts if found
5. **Spec source:** read the spec's UI intent layer (`SYNC:ui-intent-layer` — view inventory with information priority and container role, navigation map, key observable states, per-story action flows), its user stories and acceptance criteria, and its business rules; read `feature-spec-reference.md` and `spec-system-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) for the section layout when they exist. When a `$design-spec` output exists for the same feature (`design-specs/` under the team-artifacts root), read it too. A spec with no UI intent layer and no UI stories is treated as backend-only (Step 2). Reuse the spec's view and flow vocabulary verbatim — never rename a view the spec names
6. **Requirement-report source:** read the report's requirement, affected users, business rules and the existing UI it names; derive the Journey Report (Step 2a) from it plus the code's business logic and the existing UI. Every claim not stated in the report is tagged `INFERRED`; confirm an inferred primary actor, main job or outcome with the user before Step 3d (no question tool → record it `INFERRED — unconfirmed (no question tool)` and continue). Save the mockup under `tmp/design/<run>/` beside the drafts, and record its path in the report so the plan consumes it.

### Step 2: Extract UI Specifications

From the task and story artifacts (or, for a spec source, the matching spec sections: View Inventory → layout, Key observable states → States, Per-story action flows → Interaction Flow, acceptance criteria / test cases → Acceptance Criteria, business rules → rules; a design-spec supplies layout and components), extract:

| Section                            | What to Extract                       |
| ---------------------------------- | ------------------------------------- |
| `## UI Layout` / `## UI Wireframe` | ASCII wireframe, layout description   |
| `### Components`                   | Component names, behaviors, tiers     |
| `### States`                       | Default, Loading, Empty, Error states |
| `### Interaction Flow`             | User actions and system responses     |
| `## Acceptance Criteria`           | GIVEN/WHEN/THEN scenarios for context |
| `## Description`                   | User role, capability, business value |
| frontmatter `priority_label` / `priority`    | Task priority label (`priority_label`) + numeric rank (integer `priority`, lower first); a task holding a label in `priority` and a number in `rank` reads the same way — render in the header (Step 4). MANDATORY when present; the mockup MUST carry the same priority info as the planned work. |
| `large_idea_decomposition` / slice ID | Slice outcome, dependency boundary, non-goals, risk/evidence owner, and deferred-work ownership — preserve read-only when present |

**Requirement-report or spec source:** judge UI scope by the requirement's user-facing intent — the new or reshaped pages, views, components or dialogs it names — never by the presence of task `## UI Layout` sections, which such a source does not have. Skip only when that intent names no user-facing surface.

If no UI sections exist (backend-only task), inform user and skip mockup generation:

> "This task has no UI sections (marked as backend-only). No mockup generated."

### Step 2a: [BLOCKING] Analyze & Report Main User Journeys (`UX-1`)

> **[BLOCKING] No wireframe, design plan, token table, direction draft or HTML before this report exists** (`SYNC:ux-journey-gate` `UX-1`). The mock app hosts the user's journeys; the journeys decide the views, their information priority and the demo flows. Template and method: `.claude/docs/ux-journey-process.md` §4 (Journey Report), §5 (choosing main journeys), §10 (depth by scope).

1. **Read the evidence** (catalog §3) — the source's stories ("As a / I want / So that"), acceptance criteria (GIVEN/WHEN/THEN), `### Interaction Flow` or the spec's per-story action flows and navigation map, the business rules (validation, permissions, status transitions, limits, side effects — from the spec, or from code when the artifacts are thin), and the related existing screens. Cite each source. **A companion `$design-spec` that already carries a reviewed Journey Report** is the starting evidence: reuse it, re-confirm only what the source changed since, and surface — never silently re-derive — any journey that disagrees with it.
2. **Write the Journey Report** per catalog §4 — frame (problem · business goal · success signal · constraints) · actors with context, expertise and frequency, one job statement each · the main journeys ranked by frequency × business value × risk × first-use criticality (3–5 for a feature; 1–2 for a single new view) · per journey a step table (intent · decision/action · information needed · business rule · system response · failure → recovery) with entry and exit · derived design requirements (views, information priority per view, rules → interaction, critical states) · assumptions and open questions. Tag claims `SOURCED (<location>)` or `INFERRED (<reason>)`.
3. **Confirm the load-bearing inferences** — when the primary actor, their main job or the success outcome is only `INFERRED`, confirm it with the user BEFORE Step 2b; with no question tool, record it as `INFERRED — unconfirmed (no question tool)` in the assumptions and the Step 6 report and continue — never block. Other inferences stay as labelled assumptions.
4. **Present it** in the response (and carry it into the Step 6 report); under `--explore` Step 3d also persists it for the direction drafts.

The report's J-IDs (`J1` = the top-ranked main journey) are the keys Steps 2b, 2c, 7 and 8 trace against.

### Step 2b: [BLOCKING] Plan the Mock-App Surface (views = journey steps; components, states, priority)

> **[BLOCKING] Do NOT generate a one-screen mockup.** Treat the output as a small mock app for the source's releasable outcome. DERIVE the surface from the Step 2a Journey Report before writing HTML — every view hosts ≥1 journey step and every main-journey step lands on a view (`UX-3`).

1. **Build the page/view inventory from the journey steps** — group the Journey Report's steps into views by task cohesion; name each view's role, the steps it hosts, its primary task and its container (full view · dialog only for short focused tasks · side panel · stepped flow). Cover entering the feature, inspecting or providing required context, performing the primary action, validation/error/recovery, confirming the result, and leaving or continuing. Include supporting list/detail/manage/history/access views when a journey needs them. A spec source's View Inventory is the starting list — reuse its view names verbatim.
2. **Build the navigation map** — from each journey's entry, step order and exit: name each entry point, transition trigger, destination, back/exit path, and the state carried across the transition. A tab or section is acceptable only when it represents a real view in the journey; it must not hide a missing page.
3. **Rank information priority per view (`UX-4`, catalog §6)** — inventory each view's information and actions from the steps it hosts, score need-at-the-decision × frequency × cost-of-missing, and tier them: **Primary** (one focal point, ONE primary action = the journey's next step) · **Secondary** · **On demand** (progressive disclosure) · **Not here** (owning view named). Order within a tier by the journey's step order. Step 4's visual hierarchy implements this ranking and never reshuffles it.
4. **Map business rules to interaction (`UX-5`, catalog §7)** — for every rule on a journey step, pick the lightest treatment that PREVENTS the error before one that reports it (constraints, defaults, conditional visibility, permission-aware actions, state-driven transitions, undo over confirm, confirm only the irreversible, async feedback), and name each step's failure → recovery path.
5. **Build the component inventory** — classify every needed component as common/reusable, domain-shared, or page-level. Include the components that make the flow usable: navigation, forms, validation, status, confirmation, empty/loading/error, dialogs, lists/details, and recovery controls where applicable.
6. **Build the state inventory** — connect default, loading, empty, error, success, permission-denied, duplicate-submit, refresh, and recovery states to the views/components where they apply. Do not invent states that the source does not need; record `N/A` with a reason.
7. **Create one todo tracking todo for surface coverage** — keep it open until every inventory item is rendered and connected in the prototype; add the Step 8 full-flow gate as the final todo.

The inventory is complete only when a stakeholder can follow the whole business outcome from entry to visible/persisted result and then exit/continue. “Many pages” is a completeness rule, not a fixed page-count requirement.

### Step 2c: [BLOCKING] Plan the Demo Flows (flows = main journeys; many todos BEFORE generating)

> **[BLOCKING] Do NOT generate the mock-up until every main journey is planned as a flow-spec and a todo exists per flow.** The mock-up is a clickable, self-narrating prototype of the source's main journeys — plan the journeys first, generate second.

1. **Enumerate the flows from the Journey Report** — one flow per main journey (`J1`…`Jn`), its steps taken from the journey's step table; then cross-check `### Interaction Flow` (or the spec's per-story action flows), the acceptance-criteria scenarios and each story's "As a / I want / So that" — a main user story no journey covers gets its own flow AND is added back to the Journey Report. MVP happy paths — not every edge case.
2. **Author one flow-spec per flow** — fill the `references/mockup-interactive-demo.md` §1 schema: `id`, `journey` (the J-ID), business-language `title`, `persona`, `trigger`, ordered `steps[]` where each step = `{ action: "user clicks/selects/types X", result: "screen/state Y appears", explain: "plain-language why" }`, and `endState`. The `explain`/`title` prose stays tech-agnostic (business terms, not class names) per M1/M2.
3. **todo tracking one todo per flow** — so each journey is generated and later verified (Step 8) individually; add the Step 8 Demo-Quality review as the final todo.

Each flow-spec MUST reference the page/view inventory and finish at the task's named releasable outcome, not at an intermediate technical state. Add the applicable validation, recovery, persistence, access, and exit views to the flow even when the happy path is the primary walkthrough.

> See `references/mockup-interactive-demo.md` §1 for the flow-spec schema + a worked example.

### Step 3: Load Design System Context (`UX-2` design-authority read, part 1)

> **[BLOCKING] Steps 3 and 3b together are the `UX-2` design-authority read, and BOTH must complete before Step 3d or Step 4 generates anything.** Read the project's design principles/guidelines, design system (tokens, components, patterns), styling conventions, accepted design ADRs and the existing related UI; adopt house patterns and never invent a token or component the project already defines.

1. Read the source's `module` field from frontmatter (spec source: its module/service ownership)
2. Load design system docs dynamically (project-config.json + glob fallback). The HTML mock-up design must be based on these project reference design docs:
    - **Mandatory baseline:** Read `design-system/README.md` and `design-system/design-system-canonical.md`, both inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path)
    - **Primary:** Read top-level `designSystem` in `docs/project-config.json`: use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the task/app context against `designSystem.appMappings[]` to select the per-app doc. Do NOT look for `designSystem` on module entries.
    - **Fallback:** glob `design-system/*.md` inside the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) → match module name against discovered file names (case-insensitive substring match)
    - **Default:** If no match found, use `design-system/README.md` in that same reference-docs root (default `docs/project-reference`; overridden by `docsRoots.projectReference.path` in `docs/project-config.json`)
    - **Triage rule (NEW vs REFACTOR):** For NEW pages/components → load `designSystem.canonicalDoc` from top-level `project-config.json` (single source of truth for new code). For REFACTOR of existing screens → load the matched per-app doc via top-level `designSystem.appMappings` (current-state inventory).

3. Extract from design system docs (read enough of the canonical and matched per-app docs to apply the rules):
    - **Colors:** Primary, secondary, accent, background, text colors
    - **Typography:** Font families, sizes, weights
    - **Spacing:** Margin/padding scale
    - **Border radius:** Component roundness
    - **Shadows:** Elevation levels

4. Optionally read `configured styling reference` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) (first 100 lines) for the project's selected styling patterns
5. Read the project's design principles/guidelines and accepted design ADRs (the ADR root — default `docs/adr`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path) when they exist; they outrank the brief's defaults and the framework clauses.

### Step 3b: [BLOCKING] Inventory Existing UI + Map Connected Flows (`UX-2` design-authority read, part 2)

> **[BLOCKING] Do NOT generate the mockup until this inventory + connected-flow map is done** (canonical: `SYNC:existing-ui-research`). The mockup must faithfully match the current UI system, not generic HTML.

The mockup should resemble the project's actual UI, not generic HTML. Discover existing components AND map the flows that connect to this screen:

1. Read `frontend-patterns-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) (first 200 lines) — extract base component classes, common UI patterns, form patterns, table/grid patterns, dialog/modal patterns
2. Glob the project's shared component library (if exists):
    - `Glob("**/libs/*common*/**/*.component.ts")` or `Glob("**/shared/**/*.component.ts")` — discover reusable components (buttons, tables, forms, dialogs, filters, status badges)
    - Read 2-3 key component files to understand their HTML template structure and CSS class naming
3. Glob the module's own components (if task module detected):
    - Search for existing page components in the module to understand the current UI layout patterns
    - Read 1-2 existing page templates to capture the actual look and feel (sidebar layout, toolbar patterns, card grids, etc.)
4. Extract from discovered components:
    - **Layout patterns:** Sidebar + content, full-width, split-panel, tabbed
    - **Common components:** Table with pagination, filter bar, action buttons, status chips, breadcrumbs
    - **Form patterns:** Form groups, validation display, multi-step forms
    - **Navigation:** Tab bars, breadcrumbs, sidebar menus
5. **Map connected feature flows** — identify every existing feature/screen that links to, embeds, includes, or navigates to/from this new screen; note the entry/exit flows so the mockup fits the surrounding navigation, not just a standalone page.

> **Key principle:** Mimic existing system UI. If the project has a table with specific column patterns, use that pattern. If it has card-based layouts, use cards. The mockup should feel like it belongs in the existing application.

6. **Record the design-authority read (`UX-2`)** — before leaving Step 3b, write `Design authority read: <paths read in Steps 3 + 3b>` (or `N/A — none configured (checked: <paths>)`) in the response and carry it into the Step 6 report. A companion design-spec's `Design authority read:` record may seed this list; re-read any path it names that Steps 3 + 3b depend on. No record → Step 3d and Step 4 are BLOCKED.

### Step 3c: Load Domain Entity Context

Use real domain entities and relationships for realistic mockup data:

1. Read `domain-entities-reference.md` from the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) if it exists — extract entities, fields, relationships for the task's module
2. From the task artifact, extract referenced entities from `## Domain Context` section
3. Use entity field names and types to generate **realistic sample data** in the mockup:
    - Entity names → table column headers, form field labels
    - Entity relationships → navigation links, dropdowns, nested displays
    - Entity statuses/enums → status badges, filter options
    - Date fields → realistic date values
    - String fields → domain-appropriate sample text (customer names, invoice titles, etc.)

> **Key principle:** Sample data should use actual entity field names and realistic domain values — not "Lorem ipsum" or "Item 1, Item 2".

### Step 3d: Explore N Directions (`--explore` only)

> **Runs ONLY with `--explore`, after Steps 2a–3c and before Step 4.** Without the flag, record `Explore: not requested` and go to Step 4 (single direction). **First action: read `references/mockup-explore-directions.md`** and follow it step by step — it adapts the design skill's explore workflow (`.claude/skills/ui-design/references/explore/workflow.md`) to a mock app.

0. **Use the Step 0 scope decision.** Build the number of drafts the user chose at Step 0 (3, 2 or 1). Skip was already handled at Step 0, and with no question tool Step 0 fixed ONE auto-selected draft, so pick seeds and fan out only that many sub-agents.
1. **Resolve authority per axis** (colour · type · layout) from Steps 3 + 3b. A project design system (or existing UI) that pins all three → record them `ADOPTED`, write the exemption in `tmp/design/<run>/direction-approved.md`, log `Explore: SKIPPED — <reason>`, and continue at Step 4.
2. **Pick N divergence seeds** and fan out N `ui-ux-designer` sub-agents in ONE message; each builds a direction draft of the KEY views of the primary journey (`J1`) — not the whole app — into `tmp/design/<run>/direction-{a,b,c}.html` (as many as N). All N serve the SAME journeys, views, information-priority tiers, primary actions and rule treatments; they diverge only on the FREE visual axes and the layout skeleton.
3. **After all N return**, render each with html-export to PNG under `tmp/design/<run>/renders/direction-{a,b,c}/`, reading the exit code first (never install dependencies).
4. **Present the N drafts side by side** with how each serves the primary journey, **open each in the default browser** (`node .claude/scripts/open-report.cjs tmp/design/<run>/direction-<x>.html`), then, with 2–3 drafts, **ask with `ask user question tool`** — one option per draft, your evidence-backed recommendation first labelled `(Recommended)` — never pick for the user while they can be asked; "continue" is not a pick. One draft (`1 option` or no question tool) → no question; its `Selection:` line is already set. Drafts cannot be shown or the question tool errors after drafting → AUTO-SELECT the recommended draft (best journey fit + design-system fit), record `Selection: AUTO-SELECTED — <reason>` and continue (`references/mockup-explore-directions.md` Step 7).
5. **Record the verbatim pick or the `Selection:` line** in `tmp/design/<run>/direction-approved.md` (explore gate-file template), then build the full interactive multi-view mock app in the chosen direction at Step 4.

### Step 4: Generate HTML Mockup

> **Precondition (BLOCKING):** the Step 2a Journey Report exists, the Step 2b/2c plans are derived from it, the `Design authority read:` record exists (Steps 3 + 3b), and under `--explore` the direction pick is recorded in `direction-approved.md` (or the exemption is logged). Build every view with its Step 2b information-priority tiers — one focal point and ONE primary action per view — and its rule → interaction treatments (`UX-4`, `UX-5`), in the user's vocabulary (`UX-6`). Under `--explore`, the approved direction's visual axes and layout skeleton are fixed inputs for EVERY view and flow, not only the key views drafted.

Generate a **single self-contained HTML file** with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Mockup: {Task Title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>
            /* Design system tokens as CSS variables */
            /* Component styles matching project BEM conventions */
            /* Responsive breakpoints */
            /* Dark/light theme support */
        </style>
    </head>
    <body>
        <!-- task Header: title, description, metadata -->
        <!-- Mock-app navigation: every planned page/view and its entry/exit transitions -->
        <!-- Story sections with mockup UI; tabs may group real views but never replace them -->
        <!-- Page/view panels covering the complete releasable outcome -->
        <!-- Common, domain, and page-level components from the component inventory -->
        <!-- Component state toggles (default/loading/empty/error) -->
        <!-- Interactive prototype: screens/states + hotspots + demo control bar + explanation panel + "⚠ Simulated" banner -->
        <script>
            /* Tab navigation */
            /* State toggles */
            /* Theme toggle */
            /* Responsive preview toggle */
            /* Prototype engine: goTo(viewOrStateId) router + page navigation + hotspots + simulated submit — see references/mockup-interactive-demo.md §2 */
            /* Guided walkthrough: ▶ Play ⏭ Next ⏮ Prev ↺ Reset ⏏ Exit — see references/mockup-interactive-demo.md §3 */
        </script>
    </body>
</html>
```

#### Interactive Prototype + Guided Walkthrough

The mock-up is a **scripted clickable prototype** of each planned flow (Step 2c), not a still image. For EVERY flow-spec, render the journey so a stakeholder can click through it and watch it narrate. Mechanics are delegated — do NOT inline the engine here:

1. **Screen/state router + hotspots** — render each flow's screens/states as DOM sections and wire clickable hotspots that `goTo` the next state (`references/mockup-interactive-demo.md §2`). Simulated submit → success toast → in-memory row insert; NO real `fetch`/persistence/backend.
2. **Demo controls + guided walkthrough** — a control bar (`▶ Play · ⏭ Next · ⏮ Prev · ↺ Reset · ⏏ Exit`) auto-/step-walks the flow, spotlighting the active hotspot (`references/mockup-interactive-demo.md §3`).
3. **Explanation panel + "⚠ Simulated" banner** — a persistent panel names the current flow + step (`n / total`) + the step's plain-language `explain`; a visible "⚠ Simulated — illustrative data, no real actions are performed" banner is the scope guard (`references/mockup-interactive-demo.md §4`).
4. **Affordances + a11y** — hotspots visibly highlighted (pulse/outline), disabled controls show a tooltip, demo never traps the user, `prefers-reduced-motion` respected (`references/mockup-interactive-demo.md §5`).

> **Scope guard:** interactivity is **scripted/simulated only** (canned transitions, illustrative data) — never real auth, persistence, or backend calls; self-contained so it runs inside the deck's `<iframe srcdoc>` sandbox (`references/mockup-interactive-demo.md §6`).

#### Design-Principles Build Constraints (real markup, not advice)

The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`, the `SYNC:ui-ux-design-principles` block below) are BUILD CONSTRAINTS on the emitted HTML/CSS — the mock-up must actually DO these, not merely describe them. Project design-system tokens outrank the clause defaults; a genuine conflict goes to the user, NEVER resolved silently.

1. **Build the empty, loading and error views FIRST (`UI-1.5`)** — author those three state panels BEFORE the populated one and wire each into the state toggle (Default | Loading | Empty | Error) so a stakeholder can click into them. A story panel rendering only the populated view is incomplete.
2. **Real focus rings (`UI-5.5`)** — every focusable control keeps a VISIBLE `:focus-visible` outline in the emitted CSS. `outline: none` with no replacement ring is a build defect; tab through each flow before the Step 8 gate.
3. **All 5 interaction states as real CSS (`UI-5.2`)** — `:hover`, `:focus-visible`, `:active`, `[disabled]` and the default rule exist for every button, link, input, tab and hotspot; disabled controls are visibly muted AND non-interactive, not merely unbound.
4. **Real 44×44pt touch targets (`UI-8.1`, `UI-8.2`)** — every tappable element carries a `min-width`/`min-height` of at least 44px (the hit area may exceed the visible icon) with ≥8px separation, in the responsive/mobile preview as well as desktop; primary actions sit in the bottom third of the mobile viewport.
5. **Reserved space for anything that loads (`UI-9.3`, `UI-9.1`)** — images, avatars, charts and skeletons carry explicit width/height or aspect-ratio so switching Default ↔ Loading NEVER shifts the layout; skeletons for known layouts, spinners only for unknown waits.
6. **Declared scales emitted as CSS variables (`UI-2.5`, `UI-4.1`)** — the type scale as 6 named custom properties and the spacing scale from ONE 4px or 8px base; every `font-size`, `padding`, `margin` and `gap` references a variable. Hard-coded one-off px values are a build defect.
7. **Measured contrast (`UI-3.1`, `UI-3.2`, `UI-3.3`)** — text ≥4.5:1 and UI edges/borders ≥3:1 against their ACTUAL backgrounds in BOTH themes, one accent with one job, and status chips / validation states pair colour with an icon or text label so colour never carries the meaning alone.
8. **Body type and measure (`UI-2.2`, `UI-2.3`)** — body text 16px (17px in the mobile preview) and never below 14px for readable content; prose columns constrained to a 45–75 character measure.
9. **Motion budget (`UI-5.4`)** — transitions 150–250ms ease-out, and the guided walkthrough honours `prefers-reduced-motion` (already required by the prototype a11y rule above).
10. **Forms (`UI-7.2`, `UI-7.3`, `UI-7.5`)** — visible labels on every input (placeholders are hints, NEVER labels); the error state shows the message beside its field with a fix instruction; simulated navigation between demo steps preserves entered values.

#### HTML Structure Requirements

1. **Header Section:**
    - Task ID and title
    - Module badge
    - **Priority badge** — the task's priority label + numeric rank from frontmatter (e.g. "Priority: Must Have · Rank #2"). MANDATORY when the task carries `priority_label`/`priority`; the mockup MUST surface the same priority info as the planned work so stakeholders see it on the prototype itself. Omit only when the task genuinely has no priority assigned yet.
    - Story count summary
    - Generation date

2. **Navigation:**
    - Navigable page/view controls for every item in the page/view inventory; story tabs/sections may group the views
    - Entry, back, next, exit, and recovery paths are wired; no dead-end page is accepted unless it is the intentional final result
    - Active view highlight using design system primary color

3. **Story Panels:**
    - Story title and description ("As a... I want... So that...")
    - Visual mockup of every page/view required by the story's full flow, not only its first screen
    - Component placeholders with realistic sample data
    - State toggle buttons (Default | Loading | Empty | Error)

4. **Footer:**
    - "Generated from task {ID}" attribution
    - Link back to artifact path
    - Generation timestamp

#### Styling Rules

- Base every visual decision on the loaded project reference design docs; cite the docs used in the generation notes when reporting the mock-up.
- Use CSS custom properties (variables) from design system tokens
- Follow BEM naming: `mockup__header`, `mockup__nav`, `mockup__panel`
- Match the project's color palette, typography, and spacing
- Include both light and dark theme (toggle button in header)
- Responsive: mobile (< 768px) and desktop layout — mobile must stay usable: reflow where possible (stack rows, collapse grids to one column); where a block genuinely can't reflow (tables, wide grids) give it `overflow: auto` scroll rather than letting it clip; nothing broken or cut off
- Use realistic placeholder data (names, dates, numbers) — not "Lorem ipsum"

#### Component Rendering

Map wireframe components to HTML elements AND to their scripted demo interaction (the hotspot/transition that advances the flow — `references/mockup-interactive-demo.md §2`):

| Wireframe Component | HTML Rendering                             | Demo Interaction (scripted/simulated)                          |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Table/Grid          | `<table>` with design system styles        | Row click → `goTo` detail screen/state                         |
| Form                | `<form>` with labeled inputs               | Submit → simulated success toast + in-memory row insert        |
| Button              | `<button>` with primary/secondary variants | Hotspot → advances the demo to the next screen/state           |
| Card                | `<div class="card">` with shadow           | Card click → `goTo` the card's detail screen/state             |
| List                | `<ul>` or data list                        | Item click → `goTo` selected-item screen/state                 |
| Modal/Dialog        | Overlay `<div>` (toggleable)               | Trigger → open dialog state; confirm/cancel → `goTo` next      |
| Tab panel           | Tab navigation with content panels         | Tab → switch panel (no nav away)                               |
| Search/Filter       | Input with icon                            | Apply → simulated filtered result state                        |
| Status badge        | `<span>` with color coding                 | Non-interactive (illustrative state indicator)                 |
| Empty state         | Centered message with icon                 | Primary CTA → `goTo` the create/first-action screen/state      |
| Loading state       | Skeleton placeholder or spinner            | Transient → auto-advances to the loaded screen/state           |
| Error state         | Error banner with message                  | Retry → `goTo` back to the prior screen/state                  |

### Step 5: Save HTML File

- **Path:** Same directory as the task artifact
- **Name:** `{task-filename-without-ext}-mockup.html`
- Example: `tasks/260324-task-goal-tracking-mockup.html` under the team-artifacts root (default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path)
- **Spec source:** `design-specs/{YYMMDD}-mockup-{spec-slug}.html` under the team-artifacts root (default `team-artifacts/`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) — never inside the business spec root, which holds canonical specs only
- **Spec link (workflow step):** when this mode runs as a workflow step (`workflow-spec-to-mockup`, the UI block of the planned-work workflows, or any workflow whose next step is `ui-design --mode=review`) and a governing spec exists, set that spec's `mockup:` frontmatter key (or the artifact profile's native companion link) to the saved mockup path: add it if absent, update it if stale. Frontmatter only, never the spec body — the rule `design-spec` Step 8 applies to `design_spec:`. A profile that declares no companion link records `N/A` with that reason.
- **Requirement-report source:** `tmp/design/<run>/mockup.html` beside the drafts (no task or spec folder exists yet); record that path in the calling plan or run report so the plan's UI Layout links it
- **`--explore`:** the direction drafts, renders and `direction-approved.md` stay under `tmp/design/<run>/` (disposable run output); only the full mock app is saved here

### Step 6: Report to User

After generation, output:

```
Mockup generated: {path}
- Source: {task | story | spec path} (+ design-spec path when used)
- Task priority: {priority label} · Rank #{rank}  (or "not yet prioritized")
- Stories covered: {count}
- Main journeys (Journey Report, UX-1): {J1…Jn titles + primary actor}
- Design authority read (UX-2): {paths | N/A — none configured (checked: …)}
- Direction (--explore): {approved a | b | c | mix — tmp/design/<run>/direction-approved.md | SKIPPED — <reason> | not requested}
- Demo flows: {count} ({flow titles → J-IDs})
- Releasable outcome: {actor + observable outcome}
- Pages/views rendered: {count + inventory — every required view, not an arbitrary page count}
- Navigation map: {entry → transitions → result → exit}
- Components rendered: {common + domain + page inventory}
- States included: {default, loading, empty, error}
- Full-flow coverage: PASS | FAIL
- Fidelity vs existing UI: PASS | FAIL
- Render evidence (Step 7): {per-view PNGs named by report.json files[] | NOT VERIFIABLE — exit code + reason | optional, not run}
- Spec linked (`mockup:`): {spec path | N/A — reason | not a workflow step}
- Demo quality: PASS | FAIL
- Journey walkthrough + traceability (UX-8): PASS | FAIL — {unserved steps / orphan elements, or none}
- Interaction cost + wayfinding (UX-9, UX-10): PASS | FAIL — {per-journey counts vs baseline; dead ends, or none}
- UI/UX Gate Report (UX-11): {table — UX / UI / DD / CL / copy rows with PASS | FAIL → fixed | N/A + evidence}

Open in browser to preview. Click highlighted hotspots or press ▶ Play to walk a flow. Use theme toggle for dark/light mode.
```

---

### Step 7: [BLOCKING] Fidelity Validation — Mockup Matches Existing UI

> **[BLOCKING] After the HTML is generated, validate it faithfully matches the existing UI inventoried in Step 3b before handing off.** Do NOT report the mockup as done until this validation records a result — a mockup that does not match the current system is not done.

Validate the produced mockup against the inventoried existing UI and record an explicit pass/fail:

1. **Design tokens** — colors, typography, spacing match the project design system (Step 3).
2. **Component patterns** — tables, forms, dialogs, status chips, and navigation reuse the existing component patterns (Step 3b), not generic HTML.
3. **Layout/structure** — the screen layout matches the existing pages of the related feature (sidebar / toolbar / card-grid conventions).
4. **Connected flows** — entry/exit navigation matches the connected feature flows mapped in Step 3b.
5. **Information priority (`UX-4`)** — each view's rendered hierarchy implements its Step 2b tiers: the Primary-tier item is the single focal point, ONE primary action matches the journey's next step, On-demand items sit behind progressive disclosure, and no high cost-of-missing item is hidden. A visual hierarchy that reshuffles the ranking FAILS.
6. **Approved direction (`--explore` only)** — colour, type and layout skeleton match `direction-approved.md` across EVERY view, not only the drafted key views.

**Required in a review-gated workflow:** when this mode runs as a step of `workflow-spec-to-mockup`, or of any workflow whose next step is `ui-design --mode=review`, the render evidence below is mandatory: run it over the final mockup, record the per-view PNGs in the Step 6 report and pass them to that review. The exit rule below still decides what the run proves; `NOT VERIFIABLE` is recorded as such, never as a pass.

**Optional render evidence (when html-export is installed):** `node .claude/skills/html-export/scripts/export.cjs --to=png <mockup.html> --slides='[data-state]'` at the default viewports captures EVERY screen; attach the per-screen PNGs to the fidelity verdict. Exit 0 is evidence ONLY for per-screen render, zero page errors, and no blank captures — items 1–4 still judge fidelity. **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `$html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.

Record the outcome in the Step 6 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / information priority (/ approved direction) matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the mockup to match the existing UI and re-validate before handoff.

---

### Step 8: [BLOCKING] Demo-Quality Review Gate

> **[BLOCKING] This is the final review todo (Step 2c created it).** After fidelity passes, audit the GENERATED interactive prototype's demo quality before handoff. Do NOT report the mock-up as done until this records a result — a prototype with a dead control or a flow that does not click through is not done. Full checklist: `references/mockup-interactive-demo.md §7`.

**First, confirm the result SATISFIES the source's intent** (not merely that it renders): every Journey Report main journey and every main user story in the source's `## Acceptance Criteria` / `### Interaction Flow` (or the spec's per-story action flows) is represented by a flow-spec demo (coverage — no main journey or story missing), the page/view inventory is fully rendered and navigable, AND each prototype faithfully demonstrates that story's intended behavior end-to-end. Then audit the produced prototype against every planned flow-spec and record an explicit pass/fail:

0. **Satisfies the task intent** — every main-story/MVP flow from the acceptance criteria is present and its demo conveys the intended behavior; if a story has no demo or the demo misrepresents it, this gate FAILS regardless of the items below.
1. **Releasable full-flow coverage** — every planned page/view is present, every required navigation edge is wired, required common/domain/page components are rendered, and applicable states are reachable. One isolated screen or disconnected screen set FAILS.
2. **Outcome journey clicks end-to-end** — each flow's `steps[]` reaches the named business `endState` via real hotspots and shows the visible/persisted truth plus exit/next path; no path dead-ends.
3. **No dead controls** — every button/hotspot advances the demo or is visibly disabled-with-tooltip.
4. **Narration present + tech-agnostic** — every step shows its plain-language `explain`; copy is business-language (M1/M2), not class names; the "⚠ Simulated — illustrative data, no real actions are performed" banner is visible on every flow.
5. **Opens offline standalone** — no external `<script src>`; Google Fonts CSS only; no JS console errors.
6. **Real domain data** — screens/rows use real entity field names + realistic values, never Lorem ipsum.
7. **iframe-safe** — works self-contained inside an `<iframe srcdoc>` sandbox (no parent-document or network dependency) so the deck can embed it.

8. **Journey walkthrough (`UX-8`, `.claude/docs/ux-journey-process.md` §9)** — walk EVERY Journey Report main journey on the built prototype as its named actor; per step answer: will the user know the step is needed · notice the correct action · link that action to their goal · see that progress was made? Each "no" is a finding (step · view · element · fix).
9. **Traceability matrix (`UX-8`)** — one row per journey step: `Journey · step | View | Element(s) serving it | Information shown (tier) | Rule enforced | States covered | Walkthrough result`. An **unserved step** (no view/element) or an **orphan element** (traces to no step, need or rule — delete or justify it) FAILS the gate. Include the matrix in the Step 6 report.
10. **Interaction cost + wayfinding (`UX-9`, `UX-10`, catalog §12)** — per main journey record steps · clicks · view changes · fields · decisions on the prototype against the existing flow or the source flow, and cut what does not advance the job; every view marks where the user is, labels destinations in user words, and offers a back/exit path that keeps entered data — no dead-end or orphan view. The primary tier renders in the first viewport.
11. **UI/UX Gate Report (`UX-11`, catalog §13)** — one row per gate (`UX-*`, applicable `UI-*`, `DD-*`, `CL-*` with at least the `CL-5` triage, UI copy), each `PASS` / `FAIL → fixed` / `N/A` with evidence. A gate missing from the report counts as not checked; an unresolved `FAIL` blocks hand-off.

**In a review-gated workflow** (as in Step 7), items 8-11 are this step's self-check and the following `ui-design --mode=review` gate is the independent walk. Click through each main journey once as its actor, record the traceability matrix and a self-assessed UI/UX Gate Report, and fix every unserved step, orphan element and `FAIL` you find before hand-off; record `UX-8/UX-11: self-check — independent walk by ui-design --mode=review`. The per-step four-question walkthrough log belongs to that gate. Items 0-7 stay blocking here, because that review does not own them. Run standalone, items 8-11 keep the full gate.

Record the outcome in the Step 6 report:

```
Full-flow + demo quality: PASS | FAIL — releasable outcome covered (all required pages/views + navigation + components + states) / every main story demoed faithfully / outcome journey reaches visible result and exit / no dead controls / narration tech-agnostic + banner / offline / real data / iframe-safe / every main journey walked (UX-8) + traceability matrix with no unserved step or orphan element? If FAIL: what broke + the fix.
```

If **FAIL**, fix the prototype (re-author from the flow-spec — cheap) and re-audit before handoff.

---

## Mockup Quality Checklist

Before completing:

- [ ] HTML file is self-contained (opens correctly without a server)
- [ ] All stories from task are represented as sections/tabs
- [ ] Releasable outcome is named and demonstrated from entry/context to visible/persisted result and exit/next action
- [ ] Every required page/view is rendered and navigable; page count reflects the actual flow, not an arbitrary target
- [ ] Navigation map is wired, including entry/back/next/exit/recovery paths
- [ ] Common, domain, and page-level components required by the flow are rendered with applicable states
- [ ] Journey Report (Step 2a, `UX-1`) presented before any design output; inferred primary actor/job/outcome confirmed, or recorded `INFERRED — unconfirmed (no question tool)`
- [ ] `Design authority read:` recorded (Steps 3 + 3b, `UX-2`) before Step 3d/Step 4 generation
- [ ] Every main journey's flow (Step 2c) is rendered as a scripted clickable prototype with guided narration
- [ ] Every view renders its Step 2b information-priority tiers — one focal point, ONE primary action = the journey's next step (`UX-4`); business rules shown as prevention, states and recovery (`UX-5`)
- [ ] `UX-8` journey walkthrough + traceability matrix recorded (Step 8) — no unserved step, no orphan element
- [ ] Interaction cost per main journey and wayfinding per view recorded (`UX-9`, `UX-10`)
- [ ] UI/UX Gate Report covers every gate — `UX-*`, `UI-*`, `DD-*`, `CL-*`, UI copy — with no open `FAIL` (`UX-11`)
- [ ] `--explore` only: Step 0 scope answer recorded; N rendered directions presented and opened, the user's verbatim pick, the `Selection: USER — 1 option` / `Selection: AUTO-SELECTED — <reason>` line, or the exemption recorded in `direction-approved.md` (or `Mockup: SKIPPED by user`), full app built in that direction
- [ ] Design is based on `design-system-canonical.md` plus the matched per-app design-system doc when available
- [ ] Design system colors and typography match the project
- [ ] Component states are toggleable (where defined in artifact)
- [ ] Responsive layout works for mobile and desktop — usable on small screens with nothing clipped/cut-off/unreachable (reflow preferred; `overflow: auto` scroll acceptable where a block can't reflow)
- [ ] Realistic placeholder data used (not Lorem ipsum)
- [ ] Task metadata shown in header (ID, title, module, date)
- [ ] Task priority shown in header (priority label + numeric rank from frontmatter) when the task is prioritized — the mockup carries the same priority info as the planned work
- [ ] File saved alongside the task artifact
- [ ] Fidelity validation (Step 7) recorded PASS — mockup matches existing UI tokens, components, layout, connected flows and each view's information priority (and the approved direction under `--explore`)
- [ ] Releasable full-flow + Demo-Quality gate (Step 8) recorded PASS — all required views/navigation/components/states are connected, every flow reaches the business result and exit, no dead controls, narration + "⚠ Simulated" banner present, offline, iframe-safe
- [ ] Design-Principles build constraints hold — `UI-1.5` empty/loading/error panels BUILT and toggleable, `UI-5.5` visible focus ring on every focusable control, `UI-5.2` all 5 interaction states in real CSS, `UI-8.1`/`UI-8.2` real ≥44×44px touch targets 8px apart with bottom-third primaries in the mobile preview, `UI-9.3` reserved space so state switches never shift layout, `UI-2.5`/`UI-4.1` 6-step type scale + ONE 4/8px spacing unit emitted as CSS variables, `UI-3.1`/`UI-3.3` contrast measured 4.5:1 text / 3:1 edges in both themes and colour never the sole carrier of meaning

---

## Edge Cases

| Scenario                          | Handling                                                |
| --------------------------------- | ------------------------------------------------------- |
| Backend-only task (no UI sections), or a requirement report / spec whose intent names no user-facing surface | Skip mockup, inform user                                |
| No stories yet (task only)         | Generate HTML mock-up from task's UI Layout section only |
| Multiple modules                  | Load primary module's design system                     |
| No design system docs             | Use sensible defaults (Inter font, neutral palette)     |
| Very large task (10+ stories)      | Group stories into categories, use collapsible sections |
| Spec source with no UI intent layer and no UI stories | Treat as backend-only: skip mockup, inform user; suggest `$spec` to add the UI intent layer when a UI is expected |
| Primary actor, main job or success outcome only INFERRED | Confirm with the user at Step 2a before Step 2b; no question tool → record `INFERRED — unconfirmed (no question tool)` as an assumption and continue — never generate on a silently assumed journey |
| `--explore` but the design system pins colour, type AND layout | Record all three `ADOPTED`, write the exemption in `direction-approved.md`, log `Explore: SKIPPED — <reason>`, build single-direction |
| `--explore` renders exit 3 / 1 / 2 | Present the drafts' HTML paths marked `NOT VERIFIABLE`; still open/ask for the pick; never install dependencies |

---

## Anti-Patterns

| Anti-Pattern                                       | Correct Approach                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Production-quality CSS framework                   | Simple inline CSS matching design tokens                                                          |
| External dependencies (CDN libs)                   | Self-contained except Google Fonts                                                                |
| Pixel-perfect implementation                       | Approximate visual representation                                                                 |
| Real backend/business logic (auth, live API, persistence) | Scripted/simulated prototype interactivity only — clickable nav, simulated transitions, guided demo; NO real business logic or data writes |
| Dead / non-wired buttons                           | Every control either advances the demo or is visibly disabled-with-tooltip                        |
| Lorem ipsum placeholder text                       | Realistic domain-specific sample data                                                            |
| Screens designed first, journeys inferred after    | Journey Report (Step 2a) first; views and flows derived from it; walkthrough + traceability at Step 8 |
| Drafts that differ in what the user sees first | Same journeys, views, priority tiers and primary actions in every draft; diverge only on free visual axes and layout skeleton |
| Picking a direction for the user / treating "continue" as a pick | Present and open the N rendered drafts, ask with a recommended option, record the user's verbatim pick; only a user who cannot be asked gets an AUTO-SELECTED draft, recorded with its reason |

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `ask user question tool` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$prioritize (Recommended)"** — Prioritize the task in the planned work (task/story source)
- **"$design-spec"** — Create detailed design specification from mockup (the Journey Report, traceability matrix and approved direction carry over)
- **"$plan"** — Start implementation planning
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:design-distinctiveness-gate -->

> **[BLOCKING] Design distinctiveness gate (`DD-1`–`DD-8`) — binds on ANY task that designs, plans, mocks up, implements, or reviews a user-facing visual surface.** Deep catalog: `.claude/docs/design-knowledge.md`. Cite findings as `DD-<clause>` + `file:line`.
>
> **Precedence (resolve in this order, never silently):** the **brief's own stated visual direction WINS outright** — including when it asks for one of the `DD-4` tells. Then the **project's design-system / SCSS / frontend-pattern docs and accepted ADRs** — a house style IS an intentional identity; re-deciding it per feature is incoherence. Then these clauses. A genuine conflict is SURFACED to the user with both sides, NEVER resolved silently.
>
> **Relationship to `UI-1.1`–`UI-9.4`:** the 40 clauses ask _"is this usable, accessible, consistent?"_ (a measurable floor); this gate asks _"is this THIS product's interface, or the one any generator would emit for any brief?"_. BOTH bind; where they touch (type scale, colour, motion timing) the clause sets the floor and this gate picks the value.
>
> - `DD-1` **Ground it in the subject matter.** Before designing, name the concrete subject, the audience, and the design's primary job — and CONFIRM with the user when the brief is silent. Distinctive choices come FROM the subject's industry, materials and vernacular, never taste applied on top. **Test: if the palette, type and layout would fit a different product unchanged, there is no identity yet.**
> - `DD-2` **Every choice carries a WHY.** "It's common", "it's clean", "users expect it" are not reasons; an unexplained decision is a default that arrived unnoticed. Defaults hide in infrastructure — typography, navigation, data display, and TOKEN NAMES. **Token-name test: someone reading only your CSS variables should be able to guess what product this is** (`--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` evoke a template).
> - `DD-3` **Two passes, and the review pass is mandatory.** (1a) Write a compact **design plan** — Colour (4–6 named hex values) · Type (families + roles + scale) · Layout (one-sentence prose + ASCII wireframes to compare alternatives, including alignment: left/centre/justified) · Principles (what makes THIS page unique). (1b) **BLOCKING generic test — before any code:** work through a similar prompt and see whether you arrive somewhere similar; **any part that reads like the generic default for any comparable page rather than a choice for THIS brief gets REVISED, and you state what you changed and why.** Then (2a) build the REVISED plan, (2b) critique. — why: a plan taken straight to code reproduces the default it came from.
> - `DD-4` **Audit every FREE axis against the generated-design tell catalog** (`[model-knowledge]`, calibration not prohibition — each trait is legitimate for SOME brief): **T1** cream `#F4F1EA` + high-contrast serif + terracotta near `#D97757` (Anthropic's own interaction accent — on a user's brief it reads specifically as a tell) · **T2** near-black + one acid-green/vermilion accent · **T3** broadsheet hairline-rule pastiche, zero radius, dense columns · **T4** the SaaS-card kit: identical rounded cards, ONE radius regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration · **T5** template chrome whatever the subject: tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots (`A · B · C`), `WORD — fragment` labels with a spaced em dash, tinted near-black (`#0B0B0B`/`#111`) standing in for black, monospace for small data labels, `→` appended to link/button text. **A match is a HYPOTHESIS about a missed decision, never a defect** — promote it only by naming the axis, that the brief left it free, and what the subject suggested instead.
> - `DD-5` **Typography carries the personality.** One family, or two CLEARLY distinct ones — you do NOT need separate display and body faces. Choose deliberately, set a real scale with intentional weights, widths and spacing; a headline is an ACTIVE part of the design. Measure under ~80 characters; serifs tolerate slightly longer lines and want slightly more line-height than sans at the same size. Hierarchy needs weight/tracking/opacity, not size alone. **Avoid the three commonest tells: accenting a single word in a headline (italic/bold/colour) · ALL CAPS labels · an eyebrow label that names the section the heading already names.**
> - `DD-6` **Structure is information, not decoration.** Outlines, borders, numbering, eyebrows, dividers and labels must encode something about the content. **Before adding numbered markers (`01 / 02 / 03`), check the content really IS a sequence** — a stepped process, timeline or ranking. Every device must tell the reader something whitespace would not, or it goes. **Hero:** open with the most characteristic thing in the subject's world, in whatever form fits (headline, image, animation, live demo, interactive moment) — big-number-plus-small-label-plus-gradient is the DEFAULT treatment, so use it only when it is genuinely best here. **Composition:** rhythm over monotone (uniform card size, gap and density is no one deciding); articulable proportions; one dominant focal point.
> - `DD-7` **Motion sparingly and deliberately.** Non-user-triggered motion draws attention ONLY. One orchestrated moment — a single page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as generated.** Motion that ANSWERS a person's action (opening, expanding, confirming) is welcome when it shows what changed. Honour `prefers-reduced-motion`.
> - `DD-8` **Spend boldness once, then remove one accessory.** Let ONE element be the memorable thing and keep everything around it quiet and disciplined; cut any decoration that does not serve the brief. **Critique the BUILT page, not just the plan** — composition, craft (density is a decision, not a constant), content coherence, and CSS honesty (negative margins undoing a parent's padding, workaround-only `calc()` values, and absolute positioning to escape layout flow are lies; the correct answer is simpler than the hack). Review screenshots where the environment supports it. Then ask "if they said this lacks craft, what would they point to?" and fix that. **Build the quality floor in silently** — responsive, visible keyboard focus, reduced-motion respected, measured contrast, tokens never raw hex or magic numbers — and watch CSS selector specificity, where a type-based selector (`.section`) and an element-based one (`.cta`) most often cancel each other's padding/margin.
>
> **Memory:** vary between briefs — light and dark, families, direction. NEVER converge on the same choice across generations (Space Grotesk, for example). Where the project already has a design system, tokens, or an `interface-system.md`, ADOPT and record it rather than re-deciding; write back any pattern used 2+ times with measurements worth remembering.
>
> **Skip ONLY** when the change has NO user-facing visual surface (backend-only, tooling, docs) — state that reason explicitly so the skip is auditable.

<!-- /SYNC:design-distinctiveness-gate -->

<!-- SYNC:design-review-checklist -->

> **Front-End Design Review Checklist** — the EXECUTABLE review protocol for any artifact carrying a user-facing front-end surface. Full catalog (`A1`…`Q` plus §R, ~155 checks with failure signals and default severities; worked calibration cases in `.claude/docs/design-review-calibration.md`): **`.claude/docs/design-review-checklist.md`**. This gate carries the protocol and the triage pass; the file carries the checks.
>
> **Applies when — and ONLY when — the change, plan, or artifact carries a user-facing front-end surface.** A back-end-only diff, a doc edit, or a config change is `N/A`: state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage. When it DOES apply, **MUST ATTENTION READ `.claude/docs/design-review-checklist.md` and work its sections** — a review that cites a check ID without opening the catalog is asserting, not checking.
>
> **`CL-1` Context before checks (§0.1).** Establish platform · primary user & expertise · primary task · success metric · constraints · review scope · available artifacts. Fewer than four known → state the gap at the top of the report and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.
>
> **`CL-2` Evidence or nothing (§0.2).** Every finding cites a specific location (screen · element · `file:line`). NEVER invent a measurement — contrast, tap-target size, and load time that cannot be measured from the given artifact are `NOT VERIFIABLE`, never a guessed number. Tag every finding `MEASURED` · `OBSERVED` · `HEURISTIC`. Status values: `PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`.
>
> **`CL-3` Severity, then a cap (§0.3).** `P0` blocks task completion / loses data / excludes a protected group (ship blocker) · `P1` significant friction or a legal accessibility floor (fix before release) · `P2` measurable inefficiency (next iteration) · `P3` polish (later) · `P4` note. Translate to other dialects (BLOCKED/WARN, Critical–Low, BLOCKING/ADVISORY) ONLY through the §0.3 severity map. Cap the report at the top 10 by severity unless a full audit was requested. A clean section reports "no issues found" — NEVER pad. Every `P0`/`P1` carries a concrete fix.
>
> **`CL-4` Section sweep, in order — over whole SURFACES, not files (§0.5).** Map changed files to the pages/views/dialogs they render into, reconstruct each surface's composition (component tree + style origins; render when it can run, else `ENVIRONMENT-BLOCKED`), then sweep: §A core usability heuristics · §B cognitive load & surface complexity (B12–B15: surface load, progressive disclosure, one job per view, the project's complexity budget) · §C visual design & hierarchy · §D interaction and relevant product states · §E information architecture & container fit (E9–E11: dialog vs full view vs stepped flow vs side panel vs inline) · **§F web / §G mobile — conditional on platform; §H expert & data-heavy use — conditional on usage, not platform** · §I accessibility: use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, use the documented platform standard. Record the selected standard and its source; severity follows the governing release contract · §J content & UX writing · §K trust, ethics & privacy · **§L AI & agentic patterns — conditional on the product having AI features** · §M cross-cutting consistency · **§R forms & data entry — conditional on input: fill the Field Necessity Matrix first** · §N edge-case probes. Make one focused pass per applicable section and record N/A with evidence for sections the surface does not support. Cluster a defect repeated across surfaces into ONE finding; calibrate against `.claude/docs/design-review-calibration.md`.
>
> **`CL-5` Quick Triage Pass (§P)** when a full sweep is not possible — use these prompts for applicable surfaces: (1) can a new user complete the primary task unaided · (2) is feedback timely against the project/platform expectation · (3) do relevant empty/loading/error states offer a forward path · (4) is the primary action obvious and reachable for supported inputs · (5) do contrast and focus meet the selected accessibility standard (WCAG 2.2 AA baseline for web) · (6) can users operate the surface with its supported input modes · (7) do interactive targets meet the platform's size/spacing guidance · (8) are destructive actions recoverable where appropriate · (9) does the surface work at its smallest supported size and required zoom/reflow · (10) are there deceptive or coercive patterns.
>
> **`CL-6` Report shape (§O).** Context (+ known gaps) → Verdict (Ship / Ship with fixes / Do not ship) → What works (2–4 specific strengths, cited) → Findings grouped `P0`→`P3`, each with Location · Evidence + tag · Impact · Principle (checklist ID) · Fix → Open questions → Coverage table. Any `P0` caps the grade at Fail regardless of score; report a score only ALONGSIDE findings, never instead of them.
>
> **Component architecture pass (§M6–§M9) when source code is in scope.** Verify the ownership model documented or demonstrated by the project, reuse/composition decisions, and whether shared behavior is duplicated without a reason. Do not require tiers, a base abstraction, or a particular test hierarchy unless the project uses one. Report applicable checklist IDs with `file:line` evidence; do not infer source architecture from a screenshot alone.
>
> **Precedence and no-double-counting.** The project's design-system / SCSS / frontend-pattern docs and accepted ADRs OUTRANK this checklist; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — check intent before flagging, and surface a genuine conflict to the user with both sides, NEVER resolve it silently. This checklist is the review PROCEDURE, not a third set of taste rules: `UI-1.1`–`UI-9.4` ask "does it meet the usability floor?", `DD-1`–`DD-8` ask "is this THIS product's interface?", and these checks ask "did the review actually look, with evidence, and rank it?". Where a check restates a `UI-*` or `DD-*` clause, report the defect ONCE under whichever ID the consuming skill already uses.
>
> **For a PLAN or a PLAN REVIEW.** When the plan contains UI work, bind applicable acceptance criteria to the target platform/surface, relevant user states, and the selected accessibility standard. Each UI phase MUST name, per new or reshaped view: its primary task, its container (E9), its information priority (what is shown now / later / never here), and — for input — the inputs required at creation vs deferred (§R1–R2). A plan review treats a UI phase missing these as a finding against the checklist IDs it leaves unbound. Use WCAG 2.2 AA as the web baseline and meet any stricter applicable legal or project requirement; for other platforms, identify the documented platform standard. Identify conditional sections (§F/§G/§H, §L) that apply. Do not require every catalogued state; record the standard and its source, and keep unsupported checks N/A.

<!-- /SYNC:design-review-checklist -->

<!-- SYNC:existing-ui-research -->

> **[BLOCKING] Understand the existing UI before you design or spec a new/updated screen.** Before producing any wireframe, mockup, screen design, or UI spec:
>
> 1. **Inventory existing related UI** — search the project for screens, pages, and components already serving this feature or its domain (consult configured design-system docs + the real component inventory).
>    Use the project's documented component tiers and base abstractions when present; otherwise record the actual component roles and owners without inventing a tier model.
> 2. **Map connected flows** — identify every feature that links to, embeds, includes, or navigates to/from the new screen; trace its entry and exit flows so the new screen fits them.
> 3. **Reuse before invent** — prefer composing an existing component when its contract fits; justify any new component or variant against the inventory and record the constraint that prevents reuse.
>    Avoid duplicated behavior where a suitable project abstraction exists; do not create a base, tier, selector convention, or shared component solely to match this checklist.
> 4. **Record findings** — note the matched existing screens/components + connected flows in the artifact so downstream design faithfully matches the current UI system.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that explicitly.

<!-- /SYNC:existing-ui-research -->

<!-- SYNC:ui-copywriting -->

> **Words are design content, not decoration** — binds whenever a task authors, changes, or reviews user-visible strings (labels, CTAs, headings, empty/error/loading text, toasts, placeholder content). Deep detail: `.claude/docs/design-knowledge.md` §8. Copy makes a design feel as templated as the visuals do.
>
> Before writing anything, ask what the design needs to SAY and how it can best be said to help the person navigate the experience. Then:
>
> 1. **Write from the end user's perspective.** Name things by what users will understand in simple language, not by how the system is built — a user manages **notifications**, not **webhook config**. Describe what something is or does in plain terms rather than selling it. Being specific and legible to a new user ALWAYS beats being clever.
> 2. **Active voice by default.** A CTA says exactly what happens when it is used: **"Save changes"**, NEVER "Submit".
> 3. **One name per action, across the whole flow.** The button that says **Publish** produces a toast that says **Published**. The vocabulary of an interface is the signposting for someone navigating the product — cohesion and consistency are how people learn their way around.
> 4. **Failure and emptiness give DIRECTION, not mood.** Explain what went wrong and how to fix it, in the interface's voice rather than a person's. **Errors do NOT apologize, and are NEVER vague about what happened.** An empty screen is an invitation to act.
> 5. **Conversational tone, one job per element.** Plain verbs, sentence case, no filler, tone matched to the brand and the audience; let each written element do exactly one job.
> 6. **Real content, never lorem.** When the brief supplies no copy, write plausible strings for the ACTUAL subject. **Coherence check — read every visible string as a user would, checking for truth, not typos:** could a real person at a real company be looking at exactly this data right now, or does the page title belong to one product, the body to another, and the sidebar metrics to a third? A beautifully designed interface with nonsensical content is a movie set with no script.
>
> **Skip ONLY** when the change surfaces no user-visible text — state that explicitly.

<!-- /SYNC:ui-copywriting -->

<!-- SYNC:ui-ux-design-principles -->

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile examples)** — a reference catalog, not a universal platform contract. Apply it only to an applicable user-facing interface. Resolve the target platform, input modes, accessibility standard, and relevant design conventions from the brief, project config/reference docs, accepted decisions, and existing UI. For web, use WCAG 2.2 AA as the baseline and meet any stricter applicable legal or project requirement; for non-web surfaces, use the documented platform accessibility standard. Record the selected standard and source.
>
> Numeric values and patterns below are examples or heuristics for matching surfaces, not required thresholds. Use a value as a fail-condition only when an applicable law, platform standard, project contract, or accepted design decision establishes it. For desktop, game, embedded, command-line, or other interfaces, use their documented platform conventions and accessibility requirements; do not report a mismatch with a web/mobile example as a defect. Skip clauses whose underlying capability is absent and record N/A when needed. Cite applicable clauses by ID (for example `UI-3.1` or `UI-8.2`).
>
> **Precedence:** accepted product/design decisions → project config and design-system / styling / frontend / platform references → applicable clauses below → general heuristics. A genuine conflict between authoritative project sources is SURFACED with both sides — NEVER resolved silently. An absent project convention is not permission to invent one.
>
> **1.0 Visual Hierarchy & Layout**
>
> - `UI-1.1` One focal point per view — or per region on a deliberately multi-panel expert surface. Two elements competing for first read → demote one.
> - `UI-1.2` Signal order: size → weight → colour → position. Use the cheapest signal that works before adding another.
> - `UI-1.3` Group by proximity first. Add a border or container only when it encodes a real boundary; boxes inside boxes rarely do.
> - `UI-1.4` Align to a shared edge. Every unexplained indent reads as an accident.
> - `UI-1.5` Design the empty, loading and error state FIRST. The full state is the easy one.
>
> **2.0 Typography**
>
> - `UI-2.1` Keep type families and weights purposeful; follow the project's type system when present. Two families and three weights are one possible web starting point, not a limit.
> - `UI-2.2` Meet the readable-text sizes required by the applicable platform and project. Common web/mobile values such as 16px are examples; do not use them as universal minimums.
> - `UI-2.3` Keep text measures readable for the content and target surface. A 45–75 character line is an editorial heuristic, not a pass threshold.
> - `UI-2.4` Choose line spacing that supports the font, size, script, and reading context; ratios such as 1.5 for body text are starting points.
> - `UI-2.5` Use the project's type scale where defined. Otherwise keep sizes purposeful and consistent without requiring a fixed number of named steps.
>
> **3.0 Colour & Contrast**
>
> - `UI-3.1` Meet the contrast ratios required by the selected accessibility standard; for web, use WCAG 2.2 AA unless a stricter applicable legal or project requirement applies. Measure where possible. Ratios such as 4.5:1 for text and 3:1 for interface parts are standard-specific examples, not universal values.
> - `UI-3.2` One accent, one job. An accent that is everywhere points at nothing.
> - `UI-3.3` Colour NEVER carries meaning alone — pair it with an icon, label or position.
> - `UI-3.4` Dark mode is NOT inverted light mode. Lift surfaces to signal elevation; soften pure-white text.
>
> **4.0 Spacing & Grid**
>
> - `UI-4.1` Follow the project's spacing tokens or grid when defined. A 4px or 8px base is one common option, not a framework requirement.
> - `UI-4.2` Space belongs to the container, not the child. Use `gap`; reserve margins for exceptions.
> - `UI-4.3` Use spacing to make grouping and hierarchy clear; the right relationship depends on the content and layout.
> - `UI-4.4` Breakpoints follow content, not devices. Break where the layout stops working.
>
> **5.0 Interaction & Feedback**
>
> - `UI-5.1` Give immediate, perceivable feedback; use a timing target only when the product contract or applicable platform guidance defines one.
> - `UI-5.2` Specify the interaction states supported by the target platform and input modes (for example default, focus, active, disabled, or loading); hover is not universal.
> - `UI-5.3` Prefer undo over confirmation. Confirm ONLY what cannot be reversed.
> - `UI-5.4` Use motion when it clarifies cause and effect; follow project/platform timing and easing, and honor reduced-motion preferences when supported. Durations around 150–250ms are examples, not a rule.
> - `UI-5.5` Preserve a perceivable focus indicator wherever the interface supports focus navigation; follow the platform and applicable accessibility standard.
>
> **6.0 Navigation & IA**
>
> - `UI-6.1` Every screen answers: where am I, what's here, where next.
> - `UI-6.2` Keep primary navigation understandable for the product's information architecture; do not impose a fixed destination count.
> - `UI-6.3` Label by the user's word, not the internal one. Team vocabulary is not a taxonomy.
> - `UI-6.4` Preserve expected return, history, or deep-link behavior where the platform and product provide those concepts.
>
> **7.0 Forms & Input**
>
> - `UI-7.1` Ask for less. Every field needs a reason to exist at THIS step — defer, derive, or default what the task does not need now (Field Necessity Matrix: `.claude/docs/design-review-checklist.md` §R).
> - `UI-7.2` Labels stay visible. Placeholders are hints, NEVER labels.
> - `UI-7.3` Validate at a point that supports timely, useful correction without disrupting entry; follow the project's interaction contract. Explain errors and associate them with the affected input where supported.
> - `UI-7.4` Match the input control and available input aids to the data and target platform; use autocomplete or capitalization hints only where supported and appropriate.
> - `UI-7.5` NEVER lose entered data. Preserve input across errors, navigation and refresh.
>
> **8.0 Mobile & Touch** _(mobile/touch surfaces)_
>
> - `UI-8.1` Meet the target-size and spacing requirements of the applicable platform/accessibility standard. The interactive target may exceed the visible icon.
> - `UI-8.2` Place primary actions where they are reachable for the target device, orientation, handedness, and input mode.
> - `UI-8.3` Provide an alternative to gesture-only actions when required by the target platform or accessibility contract.
> - `UI-8.4` Respect safe areas and the keyboard. Notch, home indicator and on-screen keyboard all steal space.
>
> **9.0 Speed & Perceived Speed**
>
> - `UI-9.1` Give feedback appropriate to the work and what is known; skeletons and spinners are options, not required patterns.
> - `UI-9.2` Use optimistic updates only when the operation can be safely reconciled; otherwise show clear pending, success, and failure states.
> - `UI-9.3` Reserve space for anything that loads. Images, ads and fonts must NEVER shift the layout.
> - `UI-9.4` For network-dependent surfaces, define useful timeout, retry, and offline behavior according to the product's availability needs.
>
> **Apply by role** — the clauses are one set; what you DO with them depends on the task:
>
> | Role | Obligation |
> | --- | --- |
> | DESIGN / PLAN a surface | Select applicable clauses for the target platform; document required states, tokens, input, and constraints from the project contract. |
> | IMPLEMENT a component | Verify the configured behavior and accessibility requirements; use project tokens and abstractions only when defined. |
> | REVIEW UI code or a design artifact | Treat only applicable, authoritative clauses as fail-conditions; cite `UI-<clause>` + `file:line` + severity. NEVER turn inapplicable defaults into findings. |
> | SCAN / document a UI system | Record the project's actual platform conventions and deliberate deviations; do not fill gaps with this catalog's examples. |
>
> **Component architecture (code-bearing UI work):** Follow documented tiers and base abstractions when the project has them. Otherwise identify actual reuse boundaries from the code; do not require a three-tier taxonomy, base class, or lower-tier test model. Reuse shared behavior when a demonstrated consumer and suitable project abstraction justify it; test according to the project's test organization.
>
> **Skip ONLY** when the change has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable, not an omission.

<!-- /SYNC:ui-ux-design-principles -->

<!-- SYNC:ux-journey-gate -->

> **[BLOCKING] Journey-first UX gate (`UX-1`–`UX-11`) — binds on ANY task that generates, specifies, plans, mocks up or reviews a user-facing surface.** Catalog (process, templates, methods, sources): `.claude/docs/ux-journey-process.md`. Each clause is a CHECK: record `PASS` / `FAIL → fixed` / `N/A (reason)` with evidence; cite findings as `UX-<n>` + location.
>
> **Order is BLOCKING: (1) REPORT the main user journeys → (2) READ the project's design principles, design system and existing UI → (3) only then generate → (4) CHECK every UI/UX gate (`UX-11`).** No wireframe, mockup, design plan, token table or UI code before step 1's report exists.
>
> - `UX-1` **Journey Report first.** Frame (problem · business goal · success signal · constraints) · actors (context, expertise, frequency) with job statements · 3–5 main journeys ranked by frequency × value × risk × first-use · per journey a step table (intent · decision · information needed · business rule · response · failure → recovery) · derived requirements · assumptions. Evidence from spec, stories, business logic, existing UI — each claim `SOURCED (location)` or `INFERRED`; CONFIRM an inferred primary actor, main job or success outcome with the user; no question tool → record it as `INFERRED — unconfirmed (no question tool)` in the assumptions and hand-off and continue — never block.
> - `UX-2` **Design authority read before generating.** Project design principles, design system (tokens, components, patterns), styling conventions, design ADRs, existing related UI — record `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)`. Adopt house patterns; never invent what the project defines.
> - `UX-3` **Screens are journey steps.** Every view hosts ≥1 step and names its primary task; every main-journey step lands on a view; container fits the task (dialog only for short focused tasks).
> - `UX-4` **Important information first.** Per view, rank items by need-at-the-decision × frequency × cost-of-missing → Primary (the first read and first viewport: one focal point, ONE primary action = the journey's next step) · Secondary (visible, subdued) · On demand (progressive disclosure, always reachable) · Not here (owning view named). Front-load labels and headings so a scan of the first words finds the answer; never hide a high-cost-of-missing item on demand. Hierarchy implements the rank.
> - `UX-5` **Business rules become interaction.** Prevent before reporting: constraints, defaults, conditional visibility, permission-aware and state-driven actions, undo over confirm, confirm only the irreversible, async feedback; each step's failure and recovery path and each view's empty/loading/error states designed.
> - `UX-6` **Match the mental model.** User vocabulary · platform and house conventions · recognition over recall · few choices per decision · context carried across steps, never re-typed · accelerators for frequent experts.
> - `UX-7` **Low-fi before hi-fi.** Walk the main journeys on a structural sketch before the `DD-3` Design Plan and visual design.
> - `UX-8` **Walk the journeys.** Cognitive walkthrough per main journey on the result — does the user know the step is needed, see the action, link it to the goal, see progress? — plus a traceability matrix (step → view → element → tier → rule → states). Unserved step or orphan element = defect.
> - `UX-9` **Interaction cost per journey, measured.** Record per main journey: steps · clicks/taps · view changes · fields typed · decisions · waits — against the existing flow or the spec. Remove, default, merge or defer every interaction that does not advance the job; frequent journeys get the shortest path, rare ones may sit deeper. Click count alone is not the bar (the "3-click rule" is a myth): every click must be CONFIDENT — its label predicts the destination (information scent).
> - `UX-10` **Navigation and wayfinding.** Every view answers: where am I (current location marked), where can I go (labels in user words with strong scent), how do I get back or out (back/cancel/exit that keeps entered data). The navigation map has an entry for every journey, no dead ends or orphan views, works from a deep link, and keeps placement consistent; frequent destinations are one navigation action from where the journey starts.
> - `UX-11` **All UI/UX gates checked before hand-off.** Close every design output with a **UI/UX Gate Report**: one row per gate — `UX-1`–`UX-10` · `UI-1.1`–`UI-9.4` (floor, applicable clauses) · `DD-1`–`DD-8` (identity) · `CL-1`–`CL-6` (full sweep for a review, at least the `CL-5` triage otherwise) · UI copy — each `PASS` / `FAIL → fixed` / `FAIL — open` / `N/A (reason)` / `NOT VERIFIABLE` (never a guessed measurement) with evidence. An open `FAIL` blocks hand-off; an unlisted gate counts as not checked.
>
> **Depth scales with scope, never to zero:** tweak → 3–5 line journey note + the gate rows it touches · new/reshaped view → 1–2 journeys · new flow → full report · product → per capability. Recreation modes (screenshot/video) still infer and report the journeys and record violations the walk exposes. **Precedence:** accepted product decisions and the project's specs, design principles, design system and ADRs → the brief → these clauses; surface genuine conflicts to the user, NEVER resolve silently. **Sub-agents inherit nothing from this conversation:** a UI-bearing sub-agent brief carries the Journey Report and the Design Plan verbatim plus the design-system doc paths, or the leaf supplies its own defaults. **Skip ONLY** with no user-facing surface — state the reason.

<!-- /SYNC:ux-journey-gate -->

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:ui-copywriting:reminder -->

- **MUST ATTENTION** treat user-visible words as design content: end-user vocabulary, not system vocabulary (notifications, not webhook config) · active-voice CTAs that say what happens ("Save changes", never "Submit") · ONE name per action across the whole flow (Publish → "Published") · errors explain what happened and how to fix it and NEVER apologize or stay vague, empty screens invite action · sentence case, plain verbs, no filler, one job per element · real subject-specific copy, never lorem — and read every string for TRUTH: one coherent story, not three products' content on one screen. Skip ONLY when no user-visible text changes, stated explicitly.

<!-- /SYNC:ui-copywriting:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:ux-journey-gate:reminder -->

- **MUST ATTENTION** journey-first, BLOCKING order: REPORT the main user journeys (`UX-1`, evidence-tagged; confirm an inferred actor/job/outcome, or with no question tool record it `INFERRED — unconfirmed` and continue) → READ project design principles, design system, existing UI (`UX-2`) → generate → CHECK all gates. Checks: views = journey steps (`UX-3`) · important information first — one focal point, one primary action = next step, first viewport holds the primary tier (`UX-4`) · rules become prevention, states, recovery (`UX-5`) · the user's mental model (`UX-6`) · low-fi first (`UX-7`) · walkthrough + traceability, no unserved step or orphan (`UX-8`) · interaction cost per journey measured — steps, clicks, view changes, fields, decisions — every click confident, not a 3-click rule (`UX-9`) · wayfinding: where am I, where can I go, how do I get back, no dead ends (`UX-10`) · close with the **UI/UX Gate Report** covering `UX-*`, `UI-*`, `DD-*`, `CL-*` and UI copy — an unresolved `FAIL` blocks hand-off (`UX-11`). Catalog: `.claude/docs/ux-journey-process.md`. Skip ONLY with no user-facing surface, stated.

<!-- /SYNC:ux-journey-gate:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Give stakeholders a clickable, self-narrating mock app for the task's complete releasable outcome — every required page/view, navigation path, component, state, and story flow — as one self-contained interactive HTML prototype built from finalized task/story artifacts or a canonical feature spec before implementation begins.

**IMPORTANT MUST ATTENTION Main steps/modes:** `--explore` only: scope gate FIRST (0: 3/2/1 or skip) → locate/read source (1) → extract UI (2) → Journey Report (2a) → surface inventory (2b) → flow-specs + one todo per flow (2c) → decomposition boundary (2d) → design system (3) → existing UI + connected flows (3b) → domain entities (3c) → `--explore` directions + selection (3d) → generate (4) → save (5) → report (6) → fidelity (7) → releasable full-flow, Demo-Quality and journey walkthrough (8). Honor `--source`, all BLOCKING gates and standalone invocation; without `--explore`, generate one direction.

**Critical rules:**

- Use finalized, gated tasks/stories or the supported spec/requirement-report source; skip backend-only scope with an explicit reason. Journey Report (`UX-1`) precedes design output; confirm inferred actor/job/outcome or record the no-question-tool assumption. Derive views, priorities, rule treatments and flows from the report; record `Design authority read:` (`UX-2`) before generation.
- Read canonical + matched per-app design-system docs (NEW→canonical, REFACTOR→per-app), real shared/module components and domain evidence; cite `file:line` (>80% to act; <80% verify). Preserve prioritized task metadata in the header and large-idea slice/deferred-work boundaries; never create a roadmap or a new slice here.
- Under `--explore`, read `references/mockup-explore-directions.md` when drafting: honor Step 0 count/reused answer, main-session questions, all-axes-pinned exemption, same journeys/priorities across drafts, render/open every draft and select under Step 3d's exact user/no-tool/error rules. "Continue" is not a pick; never install exporter dependencies. Record the pick or `Selection:` line before building the full app.
- Produce ONE self-contained, connected HTML mock app per source, saved by Step 5's source-specific route. Every main flow is scripted/simulated with walkthrough controls, explanation panel and visible "⚠ Simulated" banner; no real fetch/auth/persistence/backend. Use realistic domain values, toggleable defined states and tech-agnostic captions; implementation class names may remain in HTML.
- Apply Step 4's **Design-Principles Build Constraints** as emitted markup/CSS, including its scales, states, focus, targets, reserved space, measured contrast, motion and form requirements; a prose description does not satisfy them. Honor full inline UI/journey/design/copy/review protocols, not this digest alone.
- Create small tracked todos before action and the final review todo. Steps 7–8 must record PASS for fidelity, complete entry-to-result/exit outcome, every main-story flow, no dead controls, offline/iframe safety, `UX-8` walkthrough + traceability, `UX-9`/`UX-10` costs/wayfinding and the `UX-11` gate table; fix failures before handoff. One isolated screen or unserved journey step fails.
- Ask the user for the **Next Steps** options after completion; never auto-decide their next action, and a direct call asks no workflow question.

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| "Task looks ready, skip the gated/finalized check"| Run only on reviewed-and-gated tasks. An unfinished task previews the wrong thing.            |
| "A static mockup is faster than a clickable one" | Static conveys layout only, not behavior — the user asked for an MVP demo. Render each flow as a scripted clickable prototype (regenerated from the §1 flow-spec — cheap). |
| "Skip the flow planning, just generate"          | Step 2c (flow-specs + one todo per flow) is BLOCKING; planning the journeys first is what makes the prototype complete and click-through-verifiable. |
| "Wire it to a real endpoint so it feels real"    | Interactivity is scripted/simulated only — canned transitions, illustrative data, "⚠ Simulated" banner. NO real `fetch`/auth/persistence/backend. |
| "Lorem ipsum is faster"                          | Fake data hides real overflow/state gaps. Use real entity field names + realistic values.  |
| "Generic clean HTML is good enough"              | Fidelity is the point — read design-system docs + 2-3 real components, mimic the actual UI. |
| "Class names in the notes are fine"              | Prose stays tech-agnostic (M1/M2). Real class names live in the rendered HTML, not captions.|
| "Only need the default state"                    | Render every defined state (default/loading/empty/error) as toggleable.                     |
| "Already know the entity fields"                 | Show `file:line` from the domain-entities reference. No proof = no read.                     |
| "The stories already describe the journeys"     | Stories list wants; the Journey Report (Step 2a) ranks journeys, names each step's decision, information need, rule and recovery — the views and priority tiers come from it. Present it first. |
| "Pick the strongest direction to save a turn"    | `--explore` ASKS for the user's pick — recommend with evidence, never pick for them while they can be asked, and "continue" is not a pick. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
