---
name: workflow-spec-to-mockup
version: 1.0.0
description: "[Workflow] Turn UI-bearing canonical specs into reviewed, interactive multi-view HTML mockups; stop before planned work or production code."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-spec-to-mockup` together with this skill. Call [`/start-workflow workflow-spec-to-mockup`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/design-spec`](../design-spec/SKILL.md) (core) → [`/work-item --mode=review --type=design --fix-loop`](../work-item/SKILL.md) (gate) → [`/work-item --mode=mockup --explore`](../work-item/SKILL.md) (core) → [`/ui-design --mode=review`](../ui-design/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Specify (3) → Review (1; exit review-converged) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:ef0c111f9e8ac21a9ff623490aa9bd9bbe8a3e09755a475e5440f7f2cc2b8fe4 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Produce one reviewed, journey-validated, interactive multi-view HTML mock app per UI-bearing canonical spec, in the user's chosen direction (recorded fallback only when they cannot be asked), or no mockup when they skip; stop before planned work or implementation.

**Summary:** Scope gate → triage → design spec → design review (`--type=design`) → mockup (`--explore`; it also renders the per-view evidence and links the spec's `mockup:` frontmatter) → UI review → close. Reuse reviewed journeys; record the user's direction before building the full app. A skip retains design review and workflow gates with explicit N/A mockup evidence.

**Use when:** a PO/BA/designer wants to click through a UI-bearing canonical spec before planned work or build. **Adjacent routes:** raw idea → `workflow-planned-work --mode=idea-to-spec` (or `--mode=idea-to-tasks` for planned work with mockups); spec + planned work → `workflow-planned-work` (`spec-to-tasks`); specified behavior to build → `workflow-implement-spec`; backend-only spec → no mockup.

**Key Rules:** Scope/pick stay in the main session; journey-first generation and review gates remain fixed; produce no task, story, plan or production code.

**IMPORTANT MANDATORY Steps:** /design-spec -> /work-item --mode=review --type=design --fix-loop -> /work-item --mode=mockup --explore -> /ui-design --mode=review -> /workflow-end -> /watzup

**Step contract:** Follow `/start-workflow` → Step Execution Protocol. The registry owns recommended order, roles and applicability; invoke each selected skill through the active host and log deviations. Gates (`work-item --mode=review --type=design`, `ui-design --mode=review`, `workflow-end`) always run; the optional step runs only when `applicability.when` holds. On a skip, UI review records `N/A — no mockup to review`.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [0. Mockup Scope Gate (FIRST action of the run)](#0-mockup-scope-gate-first-action-of-the-run)
- [1. Triage (right after the §0 scope gate, before choosing steps)](#1-triage-right-after-the-0-scope-gate-before-choosing-steps)
- [2. Journey-First Design Order (BLOCKING — every generation step)](#2-journey-first-design-order-blocking--every-generation-step)
- [3. Required Quality Gates](#3-required-quality-gates)
- [4. Recommended Skills](#4-recommended-skills)
- [5. Orchestration Freedom](#5-orchestration-freedom)
- [6. Memory, Reporting and Fix Path](#6-memory-reporting-and-fix-path)
- [Closing Reminders](#closing-reminders)

## 0. Mockup Scope Gate (FIRST action of the run)

Run `work-item --mode=mockup` Step 0 before any reading, analysis or `/design-spec`; it owns the question, options and no-question-tool fallback. Record its answer once for the whole run; later `--explore` reuses it. Keep the question in the main session; delegated agents may build direction drafts. Asking first lets a skip save tokens and time.

`Skip mockup` → record `Mockup: SKIPPED by user`; run `/design-spec`, `/work-item --mode=review --type=design`, and the `/ui-design --mode=review` gate with `N/A — no mockup to review`, then `/workflow-end` (and `/watzup` only when its registry condition holds). Log `/work-item --mode=mockup` as an N/A deviation (no mockup exists). The §3 gates Direction selected, Releasable multi-view mock app, Render evidence, Journeys walked and Spec linked (`mockup:`) record `N/A — Mockup: SKIPPED by user`.

## 1. Triage (right after the §0 scope gate, before choosing steps)

Record the result as the first section of the run report.

| Check | Verdict that changes the route |
| --- | --- |
| **Source** | Resolve every spec path the user named, or search the business spec root (default `docs/specs`; `specRoots.business.path` in `docs/project-config.json` overrides). No canonical spec → stop and route to `workflow-planned-work` (`idea-to-spec`). |
| **UI intent layer** | The spec carries the interaction surface (`SYNC:ui-intent-layer`: view inventory with information priority and container role, navigation map, observable states, per-story action flows) in the role its artifact profile declares. Missing → run `spec [mode=update]` on the spec first, or record the gap and derive it in `design-spec` with every derived item tagged `INFERRED`. Backend-only spec → stop: no mockup applies, state the reason. |
| **Scope** | One spec → one run. Several specs → one mockup per spec; 3+ specs → one sub-agent per spec for `design-spec`, while the explore pick stays with the user per spec. |
| **Direction authority** | The brief or the project design system pins colour, type and layout → `--explore` records the exemption and builds directly; some axes pinned → the drafts share them and diverge only on the free axes. |
| **Existing companions** | A linked design spec or mockup already exists → update it in place (`design-spec` / `work-item --mode=mockup` against that path) instead of creating a second one. |

## 2. Journey-First Design Order (BLOCKING — every generation step)

Follow `SYNC:ux-journey-gate`; read `.claude/docs/ux-journey-process.md` when generating or reviewing a surface. No wireframe, direction draft, token table or mockup HTML precedes the Journey Report.

- `design-spec` Step 0a writes the Journey Report (`UX-1`) and design-authority record (`UX-2`).
- `work-item --mode=mockup` reuses both at Step 2a/3, re-confirming only changes. Surface a journey conflicting with the reviewed design spec to the user; never silently re-derive it.
- `ui-design --mode=review` walks every main journey (`UX-8`). The mockup closes with the UI/UX Gate Report (`UX-11`); fix any unserved step, orphan element or open `FAIL` before handoff.

## 3. Required Quality Gates

Rows marked **(gate)** are registry `gate` steps or outcome gates; the other rows are the quality bar of the core `design-spec` and `work-item --mode=mockup --explore` steps; §0 lists the rows a user-skipped mockup records as `N/A`.

| Gate | Evidence that proves it |
| --- | --- |
| **Journey Report first** (`UX-1`) | The design spec's §0a Journey Report precedes every other design output; inferred critical claims confirmed with the user, or recorded `INFERRED — unconfirmed (no question tool)`. |
| **Design authority read** (`UX-2`) | `Design authority read: …` or `N/A` recorded in the design spec header before any section. |
| **Design spec review converged** (`review-converged`, gate) | `/work-item --mode=review --type=design` PASS or WARN, including its UI/UX principles pass, the M1–M7 gate and the `design_spec:` link-back; validated findings fixed and re-reviewed. |
| **Direction selected** | N rendered drafts (the §0 count) of the primary journey's key views under `tmp/design/<run>/`, sharing journeys, views and priority tiers, and in `tmp/design/<run>/direction-approved.md` one of: the user's verbatim pick (`Selection: USER`) · `Selection: USER — 1 option` · `Selection: AUTO-SELECTED — <reason>` (no question tool, drafts unshowable, or the question tool errored) · the recorded exemption when the brief or design system pins every axis; or `Mockup: SKIPPED by user` in the run report. Never pick while the user can be asked; "continue", "looks good" or silence is NOT a pick. |
| **Releasable multi-view mock app** | One self-contained mockup per spec with every required view, navigation edge, component and state (empty, loading and error first) and a connected full-flow demo of each main journey (`.claude/skills/shared/releasable-task-contract.md`); one static or disconnected screen fails. |
| **Render evidence** | The mockup step's Step 7 render (`html-export --to=png`, required in this review-gated workflow) over the final mockup's journey views, passed to the UI review: exit 0 = per-view render evidence only · exit 4 = fix the mockup and re-render · exit 3 = `NOT VERIFIABLE` plus a setup pointer, never an install · exit 1/2 or any other code = tool failure, `NOT VERIFIABLE`. Only files the run's `report.json` `files[]` names count. |
| **Journeys walked** (`UX-8`, gate) | `/ui-design --mode=review` walkthrough log and traceability matrix with no unserved step and no orphan element, plus the `UI-*` / `DD-*` / `CL-*` findings validated, fixed in the mockup and re-reviewed; the UI/UX Gate Report has no unresolved `FAIL`. |
| **Spec linked** | The spec's companion-artifact frontmatter (`design_spec:` / `mockup:` in the portable fallback) points at the design spec and the final mockup — `design-spec` sets `design_spec:` and the mockup step sets `mockup:` (or the profile's native link, `N/A` with the reason when the profile declares none); frontmatter only, spec body untouched. |
| **Run closed** (`run-closed`, gate) | `/workflow-end` checked every outcome gate (top-level runs only). |

## 4. Recommended Skills

| Skill | Earns its cost when | Proves / feeds |
| --- | --- | --- |
| `/design-spec` | always — the tech-agnostic UI spec seeded from the spec's UI intent layer; its Journey Report and design-authority read are the journey-first evidence every later step reuses | `UX-1`, `UX-2`, `design_spec:` link |
| `/work-item --mode=review --type=design` | always (gate) — before any visual direction is drawn, so drafts inherit reviewed journeys and priority | review-converged gate |
| `/work-item --mode=mockup --explore` | unless §0 recorded `Mockup: SKIPPED by user`; pass `--source=<spec path>` and the design-spec path as context. It reuses the §0 answer and owns the drafts, the user's recorded pick, the full mock app build, the Step 7 per-view render evidence (`html-export --to=png`; add `--slides='[data-state]'` to capture every screen state) that `ui-design --mode=review` inspects, and the spec's `mockup:` link | direction pick + mock app + render evidence + spec linked |
| `/ui-design --mode=review` | always (gate) — scope = the final mockup file | `UX-8` walkthrough + `UI-*`/`DD-*`/`CL-*` |
| `/workflow-end` → `/watzup` | `/workflow-end` always, last (prints the recap); `/watzup` only when its registry condition holds | run-closed gate + handoff |

## 5. Orchestration Freedom

Choose inline/delegated work, batching and order through the Step Execution Protocol. Preserve these dependencies: reviewed design spec → direction drafts → recorded pick → full app → render → UI review; fixes land before re-review; `/workflow-end` closes the run.

Keep the explore pick and every user confirmation in the main session, never parallelized or auto-answered while the user can be asked. Auto-selection is limited to the recorded mockup-owner paths: no question tool, drafts unshowable, question tool error. For direction drafts, spawn all N in ONE message and wait for all returns. Each sub-agent brief carries the spec path, Journey Report, design-authority paths and Design Plan skeleton verbatim; it inherits no conversation context. Triage's 3+ spec rule also applies to `design-spec` delegation.

## 6. Memory, Reporting and Fix Path

- One task per phase with a row per step (rows per spec when several) so nothing is lost after compaction; write the run report `tmp/reports/workflow-spec-to-mockup-{YYMMDD}-{HHmm}-{slug}.md` FIRST and append per step; after compaction re-read it, `TaskList` and `tmp/design/<run>/direction-approved.md` before continuing.
- **Artifact placement:** drafts, renders, product facts and run notes are disposable run output under `tmp/design/<run>/` (`<run>` = `YYMMDD-HHmm-<slug>`); the design spec lives under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides); the final mockup lives at the `work-item --mode=mockup` spec-source output path, `design-specs/` under the same team-artifacts root — never inside the business spec root, which holds canonical specs only.
- **Fix path:** findings are validated before fixing; fix journey, priority or rule findings in the design spec (and re-run `work-item --mode=review --type=design`), visual or interaction findings in the mockup (and re-render, then re-run `ui-design --mode=review`), and spec-intent gaps in the spec through `spec [mode=update]`. Review loop: round 1 exits on zero open findings (LOW deferral); round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 3 review rounds; escalate via `ask user question tool` on no progress.
- **Handoff at close:** spec path(s), design-spec path(s), the final mockup path(s), the picked direction and its `Selection:` line quoted from `direction-approved.md` (or `Mockup: SKIPPED by user`), the walkthrough verdict per main journey, render evidence or `NOT VERIFIABLE`, open questions below 80% confidence, and the next route — `workflow-planned-work` (`spec-to-tasks`) for planned work or `workflow-implement-spec` to build.

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

<!-- SYNC:ui-ux-design-principles:reminder -->

Apply `UI-1.1`–`UI-9.4` only to applicable user-interface work. Resolve platform and project conventions first. Use WCAG 2.2 AA as the web accessibility baseline plus any stricter applicable legal/project requirement; non-web surfaces use the documented platform standard. Other web/mobile metrics and component tiers are defaults/examples only for matching surfaces. Skip N/A clauses and non-UI work explicitly. Project config, references, and accepted decisions govern; cite applicable findings by `UI-<clause>` + `file:line`.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce one reviewed, journey-validated, interactive multi-view HTML mock app per UI-bearing canonical spec, in the user's chosen direction (recorded fallback only when they cannot be asked), or no mockup when they skip; stop before planned work or implementation.

**MUST ATTENTION Main steps:** scope gate → triage → `/design-spec` → `/work-item --mode=review --type=design` → `/work-item --mode=mockup --explore` (render evidence + `mockup:` link) → `/ui-design --mode=review` → `/workflow-end` → conditional `/watzup`.

- **MUST ATTENTION** report journeys (`UX-1`) and read design authority (`UX-2`) before generating; walk every main journey with traceability (`UX-8`); no open UI/UX `FAIL` at handoff.
- **MUST ATTENTION** scope gate FIRST, before analysis or drafting. Keep scope and direction picks in the main session; record the `Selection:` line and never choose while the user can be asked.
- **MUST ATTENTION** deliver the full multi-view app: every view, navigation edge, component and state, with a connected full-flow demo per journey; one static screen fails.
- **MUST ATTENTION** design review, UI review and workflow-end gates always run. A skip records UI review N/A; render exit 3 is `NOT VERIFIABLE`, never an install.
- **NEVER** produce tasks, stories, plans or production code; keep drafts/renders in `tmp/design/<run>/` and edit only companion-artifact frontmatter in the spec.

| Evasion | Required action |
| --- | --- |
| "The user said continue" | Record an actual direction pick; continue, looks good and silence are not picks. |
| "One screen demonstrates it" | Cover every required journey, view, state and navigation edge. |
| "No mockup, skip all gates" | Run design review, the UI-review N/A gate, and workflow-end. |
