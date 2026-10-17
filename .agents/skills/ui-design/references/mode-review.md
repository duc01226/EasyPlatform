# `$ui-design --mode=review` — UI review reference

> Read this reference in full for `$ui-design --mode=review [scope] [--report-only]`, standalone or in a workflow. Review existing interfaces; do not run the design spine. `$ARGUMENTS` means the scope after `--mode=review`, with `--report-only` removed: files, directories or surfaces; empty selects the default scope. Reports use the `ui-review-` prefix.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Validate in-scope user interfaces for content fit, adaptation to supported view sizes and input methods, layout sizing, platform-appropriate layering and styling, accessibility, and async feedback. Apply CSS-specific checks only to CSS-based surfaces and the project's own conventions; skip when the project or change has no UI.

**Summary:** Load project UI rules → resolve scope and affected surfaces → trace consumers → reconstruct composition/render evidence → walk task, forms and journeys → review six categories, nine UI dimensions and four DD passes → report → validate findings → fix and fully re-review to the round bar. `--report-only` stops after validation with no fixes, fan-out or questions; absent UI is skipped.

**Default scope:** All uncommitted UI changes (staged + unstaged) matching the project's configured UI/frontend paths and file-extension patterns. Override: specify files, directories, surfaces, or the full UI codebase.

> **CONDITIONAL — SKIP when no user-facing UI files are in scope.** In workflow context this skill is SKIPPED when the diff has no files matching the project's configured UI/frontend path and extension patterns. If invoked standalone with no UI changes → announce `"No UI changes detected — ui-design --mode=review skipped"` and report clean.

> **ROUTING BOUNDARY (read before starting):**
>
> - **`ui-design --mode=review` (this mode)** — the project UI review gate. Purpose: find issues, assign severity, give project-specific fix guidance citing real reuse targets (sourced from project references). It complements `architecture --mode=review`. In `workflow-review-changes` it runs in TWO places by design (keep both): (a) INTERNALLY as `changes-review`'s UI dimension (step 1), AND (b) as a DEDICATED conditional parallel-batch member (step 9, `ui-ux-designer` sub-agent). Both fire only when UI files are in scope.
> - **`web-design-guidelines`** — a web accessibility / UX checklist. Use it for web surfaces; for native UI, use the target platform's documented accessibility guidance instead.
> - **`ui-ux-designer`** — specialized UI/UX, accessibility, responsive layout, and design-token review/authoring sub-agent when the local agent catalog provides it.

> **Read before review:** resolve styling, design-system, frontend-pattern and code-review references through project config/docs index, plus relevant accepted ADRs. [Phase 0](#phase-0-load-ui-rules-mandatory-first-must-attention) owns applicability, extraction and missing/N/A fallback. Create the read tasks before reviewing.

**Workflow:**

1. **Phase 0: Load UI Rules** — Resolve applicable project UI references and accepted ADRs; record N/A where a styling or design-system category does not apply; load the journey-first gate (`UX-*`) and record the journey source (spec / design-spec / task, or none)
2. **Phase 1: Determine Scope** — Changed UI files (default) or user-specified scope, then expand to affected SURFACES (pages / views / dialogs that render them)
3. **Phase 2: Blast Radius** — assess by grep/read; an optional graph trace can hint at upstream edges for the surface map
4. **Phase 2B: Surface Composition** — Per surface: component tree, style-origin map (own · ancestor layout & stacking context · global/theme/reset · scoping mode), render + computed values + automated a11y scan when runnable, else `ENVIRONMENT-BLOCKED`
5. **Phase 2C: Surface UX Pass** — Per surface: task effort trace, Field Necessity Matrix, container fit, complexity budget (checklist B12–B15, E9–E11, §R, K10), then the journey walkthrough + traceability check (`UX-8`)
6. **Phases 3–3C: Focused Review Passes** — Check each file in its surface context against six categories, then nine UI/UX dimensions and four design-distinctiveness passes
7. **Phase 4: Finalize** — Generate the index report plus one report per surface / per shared component with findings, PASS/BLOCKED/WARN verdicts
8. **Phases 5–6: Validate → Fix → Full UI Re-Review** — validate findings first (Phase 5 still runs under review-only); standalone fix-loop repairs validated blocking findings, then freshly reviews the full UI target after every applied fix, including LOW repairs. Use authorized specialists when the review plan warrants them. Round 1 blocks on every open validated severity; Round 2 blocks only CRITICAL/HIGH/MEDIUM, LOW-only is recorded as deferred, and binary accessibility/security gates always block. Review-only and caller-owned leaves return findings without repairs.

**Key Rules:**

- **AI surface?** Only if the UI shows, streams or triggers model output (see `node .claude/scripts/ai-signal-scan.cjs`): apply `AE-9` from `.claude/skills/shared/protocols/ai-engineering-gate.md` (labels, sources, retry/undo, streaming safety) and route depth to `$ai-engineering-review`; otherwise skip this line.
- **`--report-only`:** read-only leaf mode for a caller that owns every fix — Phases 0–5 only, no fix of any size, no nested sub-agents, no user question, no writer beyond the report; returns validated findings grouped Critical/High/Medium/Low; see [Report-Only Mode](#report-only-mode---report-only).
- Write the index to `tmp/reports/ui-review-{date}-{slug}.md`; per-surface and per-component analysis to `tmp/reports/ui-review-{date}-{slug}/surfaces/{surface}.md` and `.../components/{component}.md`, appended as each is finished
- Judge what RENDERS: a finding about layout, overflow, stacking, spacing or contrast cites the composed result (ancestor and global styles included), never one file in isolation
- A defect repeated across surfaces is ONE systemic finding naming every location or the shared owner
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging
- Review is read-only until `$why-review --validate-findings` confirms findings; fixes may happen only in the validated fix loop (never under `--report-only`) or the caller's fix step, and every fix that blocks the current round restarts a full UI review from Phase 0 with brand-new tasks. From Round 2 onward, LOW-only findings end the loop and are recorded as deferred.

## Contents

- [Quick Summary](#quick-summary)
- [Your Mission](#your-mission)
- [Report-Only Mode (`--report-only`)](#report-only-mode---report-only)
- [First Principle — Easy to Change · Easy to Scale · Easy to Maintain](#first-principle--easy-to-change--easy-to-scale--easy-to-maintain)
- [Review Mindset (NON-NEGOTIABLE)](#review-mindset-non-negotiable)
- [Phase 0: Load UI Rules (MANDATORY FIRST) (MUST ATTENTION)](#phase-0-load-ui-rules-mandatory-first-must-attention)
- [Phase 1: Determine Scope](#phase-1-determine-scope)
- [Phase 2: Blast Radius (optional graph hint)](#phase-2-blast-radius-optional-graph-hint)
- [Phase 2B: Surface Composition (MANDATORY per surface — reconstruct what actually renders)](#phase-2b-surface-composition-mandatory-per-surface--reconstruct-what-actually-renders)
- [Phase 2C: Surface UX Pass (MANDATORY per surface, BEFORE the code categories)](#phase-2c-surface-ux-pass-mandatory-per-surface-before-the-code-categories)
- [Phase 3: UI Category Review](#phase-3-ui-category-review)
- [Phase 3B: UI/UX Design Principles Pass (9 dimensions)](#phase-3b-uiux-design-principles-pass-9-dimensions)
- [Phase 3C: Design Distinctiveness Pass (`DD-1`–`DD-8`)](#phase-3c-design-distinctiveness-pass-dd-1dd-8)
- [Phase 4: Finalize — UI Compliance Report](#phase-4-finalize--ui-compliance-report)
- [Systematic Review Strategy (never under `--report-only`)](#systematic-review-strategy-never-under---report-only)
- [Phase 5: Why-Review Findings Validation Gate (MANDATORY when findings exist)](#phase-5-why-review-findings-validation-gate-mandatory-when-findings-exist)
- [Phase 6: Validated Fix + Full UI Re-Review Loop (MANDATORY when validated findings remain)](#phase-6-validated-fix--full-ui-re-review-loop-mandatory-when-validated-findings-remain)
- [Next Steps](#next-steps)
- [AI Agent Integrity Gate (NON-NEGOTIABLE)](#ai-agent-integrity-gate-non-negotiable)
- [Sub-Agent Type Override](#sub-agent-type-override)
- [Mode protocols](#mode-protocols)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

## Your Mission

<task>
$ARGUMENTS
</task>

## Report-Only Mode (`--report-only`)

> **Use when** a caller runs this skill as a read-only leaf — e.g. a workflow parallel review barrier, a review dimension of another review skill, or a review batch — and another step owns every fix. `--report-only` in `$ARGUMENTS` selects it; review-only is the default; standalone `--fix-loop` alone runs repair/restart phases.
>
> **MANDATORY — when `--report-only` is passed, read `.claude/skills/workflow-review-changes/references/caller-mode.md` § `--report-only` in full FIRST.** It holds the rules every read-only leaf shares (no fix or restart, scope from the caller's brief, no nested fan-out, no user questions, write only the report, return contract); the rules below are this skill's own.
>
> 1. **Run Phases 0–5 only.** Phase 5 `$why-review --validate-findings` still validates every finding. **Phase 6 does not run** — no fix of any size, including a narrow self-fix inside a workflow: return the validated report; the caller owns fixes and any re-review. — why: two writers of one artifact inside a barrier race each other.
> 2. **No nested fan-out.** Skip the Systematic Review Strategy's delegated assignments and any fresh-context reviewer spawn; review every surface sequentially in this context, respecting working-set bounds.
> 3. **Write only the report** — the index and per-surface/per-component files under `tmp/reports/`. Gather Phase 2B render evidence only when it writes nothing outside `tmp/`; otherwise record `ENVIRONMENT-BLOCKED`.
> 4. **Return** the index report path, the round verdict (PASS/FAIL per Phase 4), and the validated findings grouped Critical / High / Medium / Low, mapped from the category labels by the Phase 4 severity vocabulary:
>
> | Category label | Returned group |
> | -------------- | -------------- |
> | BLOCKED | **Critical** for a `P0` finding, **High** for a `P1` finding — the single map in `.claude/docs/design-review-checklist.md` (never an ad-hoc translation) |
> | WARN | **Medium** for `P2`, **Low** for `P3` (same map) |
> | A code/category finding with no P-level | classify by the `SYNC:severity-rubric` consequence tree (the checklist map covers P-levelled findings only) |
> | PASS | Not a finding — list the compliant or N/A categories separately |
>
> A failed binary gate or `NOT VERIFIABLE` evidence is listed with its group and flagged blocking, whatever the round. For this mode the declared step order ends at Phase 5; stopping there is the mode's contract, not a skipped step.

## First Principle — Easy to Change · Easy to Scale · Easy to Maintain

> The full gate is `SYNC:core-engineering-principles` (protocol guide below; a hook delivers its text); its closing digest ends this file.

**Skill focus (styling, layout, tokens, components):** reject hardcoded values that force per-file edits, hand-rolled overflow handling, raw breakpoints and copy-pasted truncation CSS. Name the UI enemies: magic values, duplicated styling knowledge, fixed sizing that fights the viewport, cross-system token mixing and z-index escalation wars. A layout that stays usable across the project's supported sizes and long values beats a fixed layout that breaks at an evidenced boundary.

---

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag a styling violation without reading the target's actual style or UI source and tracing the rendered surface where possible
- Every finding MUST include `file:line` evidence
- Before flagging a pattern violation: grep 3+ existing examples — codebase convention wins
- Question: "Is this actually a violation, or an established exception (icon dimensions, fixed brand assets, genuinely fixed UI)?"

## Phase 0: Load UI Rules (MANDATORY FIRST) (MUST ATTENTION)

> **MUST ATTENTION:** Resolve the target UI and read applicable project docs BEFORE reviewing. Rules come from project and platform evidence, not general knowledge.

- read the configured styling rules doc when styling is in scope — extract its chosen method, tokens, layout rules, and selector conventions; BEM applies only when selected
- read the configured design-system/token doc when present — extract the declared visual tokens and stacking/layer rules that apply to this surface
- read the frontend architecture/patterns doc when it records project conventions — use base components, state, request, and lifecycle abstractions only when they are present and relevant
- read the project code-review rules doc — extract frontend anti-patterns and review rules directly
- load the journey-first gate (`SYNC:ux-journey-gate`, `UX-1`–`UX-11`; read `.claude/skills/shared/protocols/ux-journey-gate.md` when its text is not in context, catalog `.claude/docs/ux-journey-process.md` §9) and locate the journey source for Phase 2C: the governing Feature Spec's per-story flows, the design-spec's §0a User Journeys, or the task's stories/acceptance criteria — record which, or `none — journeys will be inferred`

> **CROSS-SYSTEM WARNING (carry through every category):** Do NOT mix token systems with incompatible root-size, namespace, or layer assumptions in one file. When flagging a fix, recommend whichever token system the file already imports/uses; never introduce another system unless the project docs explicitly require migration.

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted UI changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review
- Filter to files matching the project's configured UI/frontend path and extension patterns
- If ZERO UI files match → announce `"No UI changes detected — ui-design --mode=review skipped"` and report clean (honor the CONDITIONAL skip)

**Expand files → surfaces (MANDATORY when UI files match).** A file does not render; a surface does. For every in-scope file, find the pages / views / dialogs / panels that render it — through routing, parent composition, template usage, or the graph's upstream edges (Phase 2). Record `surface → changed files that render into it` at the top of the index report. Every affected surface is reviewed WHOLE — including its unchanged parts — because load accumulated over many small, individually reasonable diffs is invisible file by file.

- **Shared or global change** (global stylesheet, theme, token, reset, shared primitive): the surface set is every consumer. Review the project's declared representative surfaces (`uiReview.representativeSurfaces` in the project config, when present); otherwise the highest-fan-out consumers found. State the sample and why it is representative.
- **Standalone component with no rendering surface yet** (library/primitive work): review it inside its documented usage examples or story/demo harness when the project has one; otherwise state `surface: none — component reviewed in isolation` and cap layout findings at `NOT VERIFIABLE`.

## Phase 2: Blast Radius (optional graph hint)

- Assess shared-component consumers by grep/read first. Optional: when grep and reading files alone may not reveal a high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), the code graph (`.code-graph/graph.db`) can add callers, dependents and impacted tests. Treat it as a hint, NOT proof: the graph can be stale or incomplete (it lags uncommitted edits and unindexed paths) — verify anything that matters by reading the files/grep. Skip it for low-risk or local changes.
- Record: impacted file count, shared-component fan-out (a changed shared-library component affects every consumer app), risk level
- Prioritize review by highest-impact files first (shared library components > app-local components)
- No graph (or a stale one): proceed on grep/reading; never a finding

Optionally, for each changed component/style file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction both --json
```

Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail. Flag shared-component consumers impacted by a styling or layout change.

## Phase 2B: Surface Composition (MANDATORY per surface — reconstruct what actually renders)

> **Why:** most real layout defects are caused by an ANCESTOR or a GLOBAL layer, not by the file where they show — truncation that never triggers because a flex/grid track refuses to shrink, an overlay trapped by a parent's stacking context, spacing doubled by parent padding plus child margin, a global reset overriding a component's intent. A review that reads one file judges a fiction.

Create the index report `tmp/reports/ui-review-{date}-{slug}.md` now, and one file per surface at `tmp/reports/ui-review-{date}-{slug}/surfaces/{surface}.md` as you reach it. Append each surface's composition record BEFORE moving to the next surface.

For each surface:

1. **Component tree.** Walk from the surface root down to the leaves that the changed files contribute to. Record each node's role and owner (project component, shared primitive, platform element). Stop descending into a shared primitive once its contract is known — review the primitive itself in `components/{component}.md` only when it carries a finding.
2. **Style-origin map.** For every node a later finding may cite, record where its effective layout and visual styles come from:
   - its own styles;
   - **ancestor layout context** — the parent layout model (flex/grid track sizing, minimum-size behavior), overflow/clipping, positioning, and any **stacking context** an ancestor creates (transform, opacity, filter, isolation, positioned + stacking value, or the platform's equivalent);
   - **global layers** — reset/normalize, base element styles, theme, tokens, utility classes — resolved through the configured styling and design-system references;
   - **scoping mode** the project uses (scoped/module styles, shadow roots, global escape hatches) and any rule that crosses it.
3. **Render when the surface can run.** Use the project's run/preview path (`run` skill, `playwright-cli`, or the `experience-review` local-run contract) to capture the surface at each supported viewport and state; read computed values and boxes for every node a finding cites; run the project's automated accessibility scan when its toolchain provides one. Save captures under the run's report folder.
4. **Cannot run?** Record `render: ENVIRONMENT-BLOCKED — {reason}`; keep the static reconstruction; mark every rendered-only claim (contrast, overlap, clipping, layout shift, target size, focus order) `NOT VERIFIABLE`. Never estimate a rendered value.

**Blocked until:** every surface has a tree, a style-origin map for the nodes it cites, and either render evidence or an explicit `ENVIRONMENT-BLOCKED`.

## Phase 2C: Surface UX Pass (MANDATORY per surface, BEFORE the code categories)

> **Why first:** Categories 1–6 are code mechanics; a surface can pass all of them and still be unusable because it asks for too much, in the wrong container, at the wrong moment. Judge the surface's job before its CSS. Work from `.claude/docs/design-review-checklist.md` §B12–B15, §E9–E11, §R, §K10 and calibrate against `.claude/docs/design-review-calibration.md` (case C1 is the canonical overloaded-dialog example).

**Think:** What is the ONE task this surface exists for? What is the least a user must see and enter to finish it? What is here that the task does not need NOW? Which journey steps does this surface host, and can a user actually finish them here?

For each surface, append to its surface report:

1. **Task effort trace** — the primary task's path: `steps → inputs → decisions`, from entry to observable outcome. Mark each step or input that serves the system rather than the user's task.
2. **Field Necessity Matrix** (surfaces with input) — one row per input: needed at THIS step? (why) · who consumes it and when · required/optional · default or derivable? · group · verdict (keep · defer · derive · default · drop). Every §R finding cites a row.
3. **Container fit** — the container used (full view · dialog · side panel · stepped flow · inline) vs. the one the task calls for (§E9); nesting, reachability of primary actions, and dismiss-with-unsaved-input behavior (§E10–E11).
4. **Complexity budget** — count inputs per step, sections per view, and equal-weight actions per view. Compare with `uiReview.complexityBudget` in the project config when declared (§B15). When no budget is declared, do not invent a threshold: judge the counts against the task trace and the primary user's expertise (§B12, §H3) and tag the finding `HEURISTIC`.
5. **Entry modes and honesty** — alternate entry modes competing in one view (§B14); visible controls that do not work or development-status copy (§K10).
6. **Governing intent** — when a Feature Spec or design-spec records the view's information priority (`now / later / not here`) and container role (`SYNC:ui-intent-layer`), the surface is judged against it; a surface showing `later`/`not here` items by default is a finding, and a missing priority record for a new or reshaped view is recorded as a gap.
7. **Journey walkthrough (`UX-8`)** — take the main journeys from the Phase 0 journey source. For each main journey this surface hosts, step through it on the rendered (or reconstructed) surface as the named actor and answer, per step: (1) will the user know this step is needed? (2) will they notice the correct action is available? (3) will they link that action to their goal — label, icon and placement in their vocabulary? (4) after acting, will they see progress — feedback, state change, obvious next step? Record each "no" with the step, surface, element (`file:line`) and fix. Check that the ONE primary action matches the journey's next step (`UX-4`).
8. **Traceability check (`UX-8`)** — one row per hosted journey step: `step → element(s) serving it → information tier → rule enforced → states covered → walkthrough result`. An **unserved step** (a hosted step no element serves) or an **orphan element** (traces to no step, information need or rule) is a finding; a surface hosting no journey step at all is a `UX-3` finding.
   - **No journey source?** Infer the primary journey from the surface itself (its entry point, primary action and outcome), write it as a short step table tagged `INFERRED`, and tag every walkthrough/traceability finding `HEURISTIC` with low confidence (`CL-1`/`CL-2`); such a finding ranks no higher than P2 unless the failure is OBSERVED on the render.
9. **Interaction cost and wayfinding (`UX-9`, `UX-10`)** — per hosted main journey count steps · clicks/taps · view changes · fields · decisions on the surface and compare with the governing flow or the previous version; flag an interaction that does not advance the job, and a click whose label does not predict its destination (weak information scent — the "3-click rule" is not the bar). Per view check where-am-I (current location marked), where-can-I-go (labels in user words), back/exit that keeps entered data, dead-end or orphan views, and that the primary tier sits in the first viewport (`.claude/docs/ux-journey-process.md` §12).
10. **All-gates check (`UX-11`)** — the final report carries the UI/UX Gate Report rows (see UI Health Summary): a gate family that is not reported counts as not checked.

**Severity:** use the checklist defaults (B12, E9, R1, R2, K10 → P1) translated through the checklist §0.3 severity map (P0/P1 → BLOCKED, P2/P3 → WARN). Journey findings: a main-journey step that cannot be completed (unserved step, or a walkthrough "no" on question 2 or 3 that strands the user) → P0/P1 → BLOCKED; a missing progress signal (question 4), a wrong or competing primary action, or an orphan element that adds surface load → P2 → WARN; a purely cosmetic orphan → P3 → WARN. Cite `UX-<clause>` alongside any checklist ID and report the defect ONCE. An expert, data-heavy surface whose density is justified by its users (§H3) is NOT an overload finding — state that reasoning.

**Blocked until:** every surface with input has a Field Necessity Matrix, every surface has a task trace and a container verdict, and every surface has a journey walkthrough plus traceability rows (journeys sourced, or inferred and tagged `HEURISTIC`).

## Phase 3: UI Category Review

Continue appending to the index report `tmp/reports/ui-review-{date}-{slug}.md` and the per-surface files. Judge each file IN ITS SURFACE CONTEXT — cite the composed result from Phase 2B, not the file alone.

For EACH file in scope, evaluate against ALL applicable categories. Skip categories not applicable to the file type (e.g., a pure `.ts` store file skips overflow/sizing/z-index but still hits Category 5's architecture checks and Category 6's loading/error/empty-state wiring).

> **Apply the `Think:` reasoning prompt before each category — derive violations, do NOT recite checklists.**

---

### Category 1: Long-Content Overflow & Truncation — Severity: WARN (HIGH when a flex child truncates with no `min-width: 0`)

**Think:** Does every text container survive a 200-char value? Single-line or multi-line? Can the user still read the full value when it is truncated?

**Detection signals:**

- Hand-rolled `text-overflow: ellipsis` (with `white-space: nowrap` / `overflow: hidden` re-declared by hand) instead of the project mixin/directive
- A flex child that truncates but has **NO `min-width: 0`** — the flex-overflow trap: a flex item's default `min-width: auto` refuses to shrink below content width, so ellipsis never triggers
- Truncated text with **NO tooltip / `title`** to reveal the full value

**DECISION RULE the reviewer enforces:**

- Single-line labels / table cells / chips → ellipsis **+ tooltip-on-overflow**
- Multi-line prose / descriptions → wrap or `-webkit-line-clamp`

**Project fix guidance** (cite real reuse targets from the resolved styling rules doc):

- Prefer the project's documented overflow/ellipsis directive, component, or utility. It must expose the full value only when the element actually overflows and must handle the flex `min-width` trap.
- OR the project's documented truncate/text-ellipsis mixins or utility classes from the styling rules doc.
- Multi-line: use the project-documented clamp pattern.

**Anti-patterns:** hand-rolled substring/width-math truncation. For full-value access and reuse targets, enforce the decision/fix rules above and cite the styling authority.

---

### Category 2: Layout Adaptation Across Supported Sizes — Severity: WARN (BLOCKED only when content is broken or unreachable at a supported size)

**Think:** Is the surface usable at the view sizes, orientations, and display settings supported or promised by the project? Does the target platform's layout model adapt as needed? If content cannot reflow, does the platform provide a usable way to inspect it without clipping or hiding controls?

**Supported-size usability — the minimum bar:**

- **Preferred where supported:** use the platform's responsive layout mechanism (for example, CSS reflow, native size classes, or resizable-window constraints) when it improves access to content.
- **Acceptable fallback:** scrolling or another platform-native overflow treatment is fine when reflow is not appropriate, provided all content and controls remain reachable.
- **Hard minimum (BLOCKED if violated):** meet the view sizes and display settings the product supports; do not leave content clipped, controls unreachable, or essential information hidden without an access path.
- **Escalation:** if adding a supported layout mode needs a refactor too large for the current change, surface the scope and evidence before proceeding.

**Detection signals:**

- For CSS projects, raw viewport breakpoints that bypass the configured breakpoint system
- A layout in the project's chosen system that becomes clipped, overlaps, or hides controls at a supported size
- A fixed grid or canvas without a usable pan, reflow, resize, or scroll path where the project promises smaller views
- A control outside the reachable area or blocked by platform chrome, keyboard, or an overlay with no recovery path

**Project fix guidance:**

- Prefer the project's documented responsive layout APIs, classes, or size categories; use CSS flex/grid only when that is the target's styling system
- Choose overflow, reflow, resizing, or scrolling based on the platform and content
- Use configured breakpoints when present; do not invent a project-wide breakpoint scale
- Large layout refactor required → surface it as a finding and keep it distinct from an unrelated change

**Evidence:** cite the applicable project/platform sizing rule and inspect the rendered outcome before flagging.

---

### Category 3: Content-Responsive vs Fixed Sizing — Severity: WARN

**Think:** Does this surface need a fixed size by design, or should it adapt to content, user scaling, and the target platform's available space?

**Detection signals:**

- For CSS-based surfaces, fixed CSS dimensions on content containers that conflict with supported sizes, user scaling, or the documented design
- For native or desktop surfaces, fixed frame constraints that make a supported size or form factor unusable

**Project fix guidance:**

- Use the project's layout and sizing primitives. In CSS-based layouts, flex/grid and min/max constraints may be appropriate when they match the surrounding code.
- Keep a fixed dimension only when the design or platform requires it and evidence shows it remains usable across supported settings.

**Evidence:** cite the applicable sizing authority and supported-use outcome; the fixed-size exception above remains valid.

---

### Category 4: Stacking and Overlay Order — Severity: BLOCKED when project rules or visible behavior require it

**Think:** How does this platform order overlapping content, and which item must appear above another? Apply this category only when the target uses a stacking or overlay model.

**Detection signals:**

- A numeric stacking value where project rules require a named layer or token
- A forced override that defeats documented ownership or demonstrably hides required content
- **Stacking-context trap** — an overlay (menu, popover, tooltip, dialog) renders inside an ancestor that creates its own stacking context (Phase 2B style-origin map), so no stacking value on the overlay can lift it above that ancestor's siblings. Fix at the owner: render through the project's overlay/portal mechanism, or remove the unneeded stacking context — NEVER escalate the value (calibration case C2)

**Project fix guidance:**

- Use project-declared layer tokens or stacking categories when present
- Otherwise follow the target platform's established overlay/order model and nearby examples; do not invent a repository-wide scale

Cross-reference the project's layering map when one is configured. Any chosen layer must match the actual surface role.

**Evidence:** cite the applicable layer/order authority and evidenced overlap; enforce the detection and fix rules above.

---

### Category 5: Styling Convention and Visual Implementation — Severity: WARN

**Think:** Does this implementation follow the project's configured styling approach and visual ownership, or does it introduce unsupported values, selectors, or layering rules?

> **Styling rules:** Follow the method and limits documented for this project and target. BEM, design tokens, stylesheet nesting limits, and CSS override rules apply only when the project's references/configuration establish them.

**Detection signals:**

- Violation of the configured selector, token, typography, nesting, or styling-system rules
- A class or utility name that conflicts with the project's chosen methodology
- A hard-coded value where the project requires a declared token or scale
- CSS `!important` or stacking overrides only where the project forbids them or evidence shows they break intended ownership
- BEM modifier or element structure only when project configuration/reference docs select BEM
- **Style leakage across the scoping boundary** — component styles that escape into global scope (unscoped element or global selectors, global escape hatches, deep-piercing selectors) or global/theme/reset rules that silently override a component's intended values; cite both sides from the Phase 2B style-origin map
- **Specificity escalation** — a selector made heavier (repeated classes, id selectors, `!important`, deep nesting) only to win against another rule, where restructuring ownership would remove the conflict
- **Spacing owned twice** — a parent's padding/gap plus a child's margin producing a doubled or uneven gap; space belongs to the container (`UI-4.2`)

Apply fixes per the resolved project styling rules doc.

**Frontend architecture checks (OWNED JOINTLY WITH `architecture --mode=review` Category 8 — reference, do not drift):**

> These checks are lifted from `architecture --mode=review` Category 8 so the two skills stay synchronized. They are **owned jointly**; when one changes, update both. Apply them to source files in scope that implement the listed frontend concerns:

- Use a project-documented component or form base when one exists, applies to the target, and the code bypasses it (BLOCKED)
- Follow the project's state/effect pattern when documented; otherwise use the platform's idiomatic state model
- Use a documented API wrapper when one exists for the target; otherwise use the normal request API for the stack
- Manage subscriptions and listeners using the framework lifecycle and any documented cleanup pattern
- Apply BEM only when the project selects it; otherwise follow its configured styling convention
- Place logic according to declared or observed project ownership; do not impose a Model > Service > Component hierarchy

**Component system and reuse checks (code-bearing UI scope):**

- Use the project's component taxonomy and owners when they are documented or evident in code. Do not create Common/Domain-Shared/Page tiers or a base abstraction solely to satisfy this review.
- Reuse or compose an existing component when its API, platform, scope, and lifecycle fit; explain a non-reuse decision only when a relevant shared component exists.
- Keep genuinely shared behavior under a clear owner. Consider extraction when evidence shows reuse will reduce change cost; do not require an abstraction from a fixed duplication count.
- Test reusable component contracts and page/screen composition according to the project's test organization.

**Evidence:** cite real project references or source patterns for the ownership/reuse checks above.

---

### Category 6: Async UI States & Feedback — Loading / Error / Empty / Disabled — Severity: BLOCKED when a material user-visible operation lacks required feedback or recovery

> **This is the UI-resilience gate.** Check whether delay, failure, or an empty result affects the user's task. Do not require irrelevant states, but a material interaction must not leave the user with a frozen surface, silent failure, or unexplained result.

**Think:** For each user-visible async operation (data load, form submit, mutation, navigation-triggered work), trace what the user sees while waiting, on failure, and when there are no results. Flag branches that leave the user with no useful feedback or recovery path.

**Select the states each async/interactive surface needs** from its user impact, the project's conventions, and the target platform (common vocabulary: Default / Loading / Disabled / Error / Empty / Success):

- **Loading** — show progress or a busy affordance when delay or impact would otherwise leave the user uncertain; do not leave an important surface blank or frozen.
- **Error** — user-initiated failures need a human-readable message and recovery path where sensible. Background failures follow the project's notification and error-handling conventions.
- **Empty** — a collection with no results should explain the empty state and offer a next step when useful.
- **Disabled / in-flight guard** — prevent harmful duplicate actions using the control behavior supported by the target platform.
- **Success** — provide confirmation appropriate to the action, or make the resulting state clear.

**Detection signals:**

- A user-visible wait with meaningful delay or impact but no progress/busy feedback → **BLOCKED**
- A user-initiated operation that fails silently or offers no recovery path where one is sensible → **BLOCKED**
- A raw error shown to the user (stack trace, raw JSON, unmapped exception) → WARN
- A list or collection surface with no meaningful empty state → WARN (BLOCKED when the collection is the screen's primary content)
- A submit handler that does NOT disable its trigger while in-flight (double-submit risk) → WARN (BLOCKED for payment / create / irreversible actions)

> **Check for centralized handling BEFORE flagging BLOCKED (avoid false positives):** the app or platform may provide a shared progress/status owner, request handler, error boundary, or reusable UI component. If evidence shows it covers this surface, the local control may not need another indicator — verify its behavior and downgrade or drop the finding. Flag BLOCKED only when no applicable layer gives the user the required feedback.

**Project fix guidance** (cite real reuse targets from applicable frontend, platform, and design-system docs):

- Reuse documented loading/progress, error, and empty-state components or patterns when present; otherwise follow the target platform's idiom without inventing a project-wide abstraction.
- Bind loading / error / empty behavior to the data flow and state owner established by the project; do not impose a fixed model/service/component layer order.

**Evidence:** cite applicable project references or observed feedback/recovery behavior.

> **Note vs Category 5's Bug-Detection "Error Handling":** the shared Bug Detection protocol checks that `catch` scope is correct and exceptions are not swallowed at the *code* level; Category 6 checks that the failure/loading/empty branch produces a *user-visible* state at the *UI* level. Both must pass — a correctly-caught error that renders nothing still fails Category 6.

---

## Phase 3B: UI/UX Design Principles Pass (9 dimensions)

The 40 clauses of `SYNC:ui-ux-design-principles` (carried by `ui-design/SKILL.md`: guide line, hook delivery, fallback `.claude/skills/shared/protocols/ui-ux-design-principles.md`) bind this mode in the **REVIEW** role: every clause is a fail-condition, not a suggestion. Run them as **NINE focused passes over the whole scope — one dimension at a time, in order.** A single simultaneous sweep of all nine is what degrades clause review into tick-boxing; serial attention is the mechanism, not a formatting preference.

**Per pass:** answer the `Think:` prompt from first principles FIRST — *what would make this dimension fail on THIS surface?* — then hunt the violation that reasoning predicts. A pass that produced no reasoning produced no review: record the reasoning, never a tick.

**Every finding:** `UI-<clause>` + `file:line` + severity from the Phase 4 rubric already in force (**BLOCKED** must fix before merge · **WARN** review and decide · **PASS** compliant; a WARN escalates to BLOCKED under the escalation rule stated there). This pass introduces NO new severity scale.

**Precedence (MUST ATTENTION):** the project styling / design-system / frontend-pattern docs loaded in Phase 0 **OUTRANK** these clauses; the clauses outrank generic taste. Where a project doc states its own value (type scale, spacing unit, breakpoints, token contrast pairs), the PROJECT value is the rule and the clause is satisfied by following it. A genuine conflict is SURFACED to the user via `ask user question tool` with both sides — NEVER resolved silently.

| #   | Dimension                 | Clauses            | `Think:`                                                                                                                                                                                                                                                    |
| --- | ------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Visual Hierarchy & Layout | `UI-1.1`-`UI-1.5` | Which element does a first-time user's eye land on, and is it the one this screen exists for? Which groups are held together by whitespace, and which by a border added because the whitespace was wrong? Are the empty, loading and error states designed at all — or only the full state? |
| 2   | Typography                | `UI-2.1`-`UI-2.5` | Follow the configured type scale where one exists; inspect hierarchy, legibility, and supported user text scaling for this platform. Which values depart from the project's evidence, and are the actual reading conditions usable? |
| 3   | Colour & Contrast         | `UI-3.1`-`UI-3.4` | For each foreground/background pair that actually renders, what is the COMPUTED ratio (measured — never judged by eye)? What does a user who cannot perceive the accent hue see instead? In dark mode, is elevation signalled by lifted surfaces or by an inversion? |
| 4   | Spacing & Grid            | `UI-4.1`-`UI-4.4` | Follow the configured spacing/layout system where present; check whether grouping, alignment, and sizing serve the current information. For responsive platforms, do layout changes respond to content and supported sizes? |
| 5   | Interaction & Feedback    | `UI-5.1`-`UI-5.5` | For each interactive element, what feedback does the user receive within the project's/platform's expected response window? Are applicable states and focus/input cues clear? Could an undo path improve a confirmation? Does motion respect user preferences? |
| 6   | Navigation & IA           | `UI-6.1`-`UI-6.4` | Landing on this surface cold: where am I, what's here, where next? How many top-level destinations exist? Are labels the user's words or the team's internal vocabulary? Where does navigation return, using a URL or platform back path when supported? |
| 7   | Forms & Input             | `UI-7.1`-`UI-7.5` | Field by field (use the Phase 2C Field Necessity Matrix, do not redo it): what breaks if this field is removed from THIS step? Is its label still visible once filled? When does validation fire, and does the message say how to fix it? Does the keyboard/autocomplete match the data type? What happens to typed data on validation error, navigation away, and refresh? |
| 8   | Mobile & Touch            | `UI-8.1`-`UI-8.4` | At a touch viewport: measure each tappable element's HIT BOX (not the icon) and the gap to its neighbours; where do primary actions sit relative to the thumb; is anything reachable ONLY by gesture; what do notch, home indicator and the on-screen keyboard cover? _(Mobile/touch surfaces only — when the scope has none, say so explicitly.)_ |
| 9   | Speed & Perceived Speed   | `UI-9.1`-`UI-9.4` | For everything that loads: what occupies its space before data arrives, and does the layout shift when it lands? Is the optimistic path rolled back VISIBLY on failure? On a slow or offline connection, what does the user see — a designed state or a hang? |

**No double-counting.** Several clauses overlap Categories 1-6 (`UI-1.5`/`UI-5.2`/`UI-9.1` overlap Category 6's async-state gate; `UI-2.3` overlaps Category 1's content handling; `UI-4.1` overlaps Category 5's magic-number rule; `UI-4.4` overlaps Category 2's responsive bar). Where they meet, emit **ONE** finding carrying BOTH citations (e.g. `Category 6` + `UI-5.2`) at the HIGHER of the two severities — never two findings for one defect, and never a downgrade because "the other category already covers it".

**Skip rule.** This pass runs whenever a user-facing UI file is in scope. Skip an individual dimension ONLY when the scope contains no surface it can apply to (`UI-8.*` with no touch surface, `UI-7.*` with no input) — name the skipped dimensions and the reason, so a skip is auditable rather than an omission.

---

## Phase 3C: Design Distinctiveness Pass (`DD-1`–`DD-8`)

Phase 3B asked **"is this usable, accessible, and consistent?"** — a floor with measurable pass/fail. This pass asks the question none of the 40 clauses ask: **"is this THIS product's interface, or the one any generator would emit for any brief?"** A surface can pass every clause in Phase 3B and still be a template. The 8 clauses of `SYNC:design-distinctiveness-gate` (carried by `ui-design/SKILL.md`: guide line, hook delivery, fallback `.claude/skills/shared/protocols/design-distinctiveness-gate.md`) bind this mode in the **REVIEW** role; the deep catalog is `.claude/docs/design-knowledge.md`.

**Run as FOUR focused passes, one at a time, in order** — same serial-attention mechanism as Phase 3B:

| # | Pass | Clauses | `Think:` |
| --- | --- | --- | --- |
| 1 | Identity & rationale | `DD-1`, `DD-2` | If I swapped this product for a different one in the same shape, which of these choices would have to change? The ones that would not are where the design defaulted. Read the token/variable names alone — could a reader guess what product this is, or do they read `--gray-700`/`--surface-2`? |
| 2 | Free-axis tell audit | `DD-4` | Which axes did the brief, the project design system, or an accepted ADR actually PIN — and which were free? On each FREE axis, does the code land on a T1–T5 cluster (cream+serif+`#D97757` · acid-on-black · broadsheet · the SaaS-card kit: identical cards, one radius for every hierarchy level, the same `rgba(0,0,0,.1)` shadow, gradient washes as decoration · template chrome: ALL-CAPS eyebrows, `A · B · C` middle-dot meta, spaced-em-dash labels, `#0B0B0B` for black, mono data labels, trailing `→`)? |
| 3 | Type, structure & motion | `DD-5`, `DD-6`, `DD-7` | How many families and how distinct? Does body text exceed ~80ch? Is a single word in a headline accented, are labels ALL CAPS, does an eyebrow just restate its heading? Do numbered markers sit on content that is genuinely a sequence? What does each border tell the reader that whitespace would not? Is there ONE orchestrated motion moment, or a fade-and-slide-up on every section plus a hover transition on every card? |
| 4 | Restraint & implementation integrity | `DD-8` | Where is the boldness spent — once, or scattered? Which decoration would the surface not miss? Find layout or styling workarounds that defeat ownership or expected flow; for CSS surfaces, examples include negative margins undoing parent spacing, unnecessary calculations, absolute positioning to escape layout flow, or conflicting selectors. |

**Every finding:** `DD-<clause>` + `file:line` + a severity from the Phase 4 rubric already in force. This pass introduces NO new severity scale.

**Severity ceiling (MUST ATTENTION).** A `DD-4` tell match is a **hypothesis about a missed decision, never a defect** — it caps at **WARN**, and the finding is INVALID unless it names (a) the axis, (b) the evidence that the brief/project left that axis free, and (c) what the subject matter suggested instead. `DD-5`/`DD-6`/`DD-7` findings that are also `UI-*` violations (legibility outside the applicable platform standard, unmeasured contrast, motion ignoring user preferences) take the `UI-*` severity. Only `DD-8` implementation-integrity findings reach **BLOCKED** on their own, and only where evidence shows the workaround breaks the target or its maintainability.

**Precedence (MUST ATTENTION), strictest in this skill:** the **brief's stated visual direction WINS OUTRIGHT** — a design that was asked for one of the T1–T5 looks and delivered it is a PASS, not a finding. Then the project's design-system and applicable styling/frontend references loaded in Phase 0 — **an established house style is an intentional identity, and a repo-wide convention is NEVER a `DD-4` finding.** NEVER open a finding that amounts to "this looks like other software" without the three-part evidence above. — why: an unevidenced distinctiveness finding is pure taste asserted as a defect, and it pushes a codebase toward a *different* uniform at review cost.

**No double-counting.** Where a `DD-*` clause meets a Category 1–6 check or a `UI-*` clause, emit **ONE** finding carrying BOTH citations at the HIGHER severity — never two findings for one defect.

**Skip rule.** Runs whenever the scope renders a user-facing visual surface. Skip entirely for pure logic/store/service changes with no rendered output — state that reason explicitly so the skip is auditable.

---

## Phase 4: Finalize — UI Compliance Report

Update report with final sections:

### Verdict Scoring

| Overall verdict | Condition |
| --------------- | --------- |
| **FAIL** | Any failed binary gate or unresolved evidence; any validated finding in round 1; any validated CRITICAL/HIGH/MEDIUM in round 2; or persisted `minRounds` not yet met. |
| **PASS** | All binary gates and evidence resolved, current-round blocking findings empty, and persisted `minRounds` met. Record round-2 LOW findings as deferred; they do not force another cycle. |

> **Severity vocabulary (single source of truth).** Category headers may use `BLOCKED` / `WARN`; the overall verdict is `PASS / FAIL` under `review-policy.cjs`, never the category label alone. The fresh sub-agent emits `Critical / High / Medium / Low`. Assign consequence first using the canonical rubric, then apply the round predicate:
>
> | Category label | Canonical finding | Round handling |
> | -------------- | ----------------- | -------------- |
> | BLOCKED | CRITICAL / HIGH | Blocks every round. |
> | WARN | MEDIUM when bounded but consequential | Blocks every round. |
> | WARN | LOW when non-blocking polish | Blocks round 1; record/defer in round 2. |
> | No finding | Evidence-backed compliant or N/A | No severity finding; binary gates and the persisted minimum still apply. |
>
> A category's **"(HIGH when …)"** note is NOT a separate tier — it means that WARN **escalates to BLOCKED** when the stated condition holds (i.e., the finding is a real rendered bug, not a latent risk).

### Report Structure

```markdown
# UI Review Report — {date}

## Scope

- Files reviewed: {count}
- Surfaces reviewed: {surface → changed files that render into it; sample rationale for shared/global changes}
- Components / apps affected: {list}
- Blast radius: {summary from Phase 2}
- Render status: {per surface: captured viewports + scan | ENVIRONMENT-BLOCKED — reason}
- Per-surface reports: `tmp/reports/ui-review-{date}-{slug}/surfaces/*.md` · per-component: `.../components/*.md`

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **Surface(s):** {surface name(s) — a systemic finding lists every surface or names the shared owner}
- **File:** {path}:{line}
- **Rule:** {rule from project or platform reference, or checklist / `UI-*` ID}
- **Evidence:** {what was found — composed result from Phase 2B/2C; MEASURED | OBSERVED | HEURISTIC}
- **Fix:** {project-owned component, platform mechanism, configured style rule, or other applicable reuse target}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project or platform reference}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## UI Health Summary

- Long-content Overflow & Truncation: {PASS/WARN/BLOCKED}
- Layout adaptation at supported sizes: {PASS/WARN/BLOCKED/N/A}
- Content-responsive sizing: {PASS/WARN/BLOCKED/N/A}
- Platform layering rules where applicable: {PASS/WARN/BLOCKED/N/A}
- Project styling convention: {PASS/WARN/BLOCKED/N/A}
- Async UI States & Feedback (loading / error / empty / disabled): {PASS/WARN/BLOCKED}
- UI Architecture (joint w/ `architecture --mode=review`): {PASS/WARN/BLOCKED/N/A}
- Surface load & forms (B12–B15, §R): {PASS/WARN/BLOCKED/N/A}
- Container fit (E9–E11): {PASS/WARN/BLOCKED/N/A}
- Composition fidelity (tree + style origins + render): {COMPLETE / PARTIAL — ENVIRONMENT-BLOCKED reason}

### UI/UX Gate Report (`UX-11`)

| Gate | Result | Evidence |
| ---- | ------ | -------- |
| UX-1–UX-10 journeys, priority, interaction cost, wayfinding | PASS / FAIL / N/A | {journey source, walkthrough, counts} |
| UI-1.1–UI-9.4 floor (applicable) | … | {measured values} |
| DD-1–DD-8 identity | … | … |
| CL-1–CL-6 checklist | … | {sections swept} |
| UI copy | … | … |
```

**Per-surface report shape** (`surfaces/{surface}.md`, appended as each surface completes): Context (task, users, container) → Composition (Phase 2B tree, style-origin map, render evidence) → Surface load (Phase 2C trace, Field Necessity Matrix, container verdict, budget) → Journeys (source or `INFERRED`, walkthrough log, traceability rows) → Findings for this surface (same fields as above) → Coverage. A per-component file (`components/{component}.md`) is written only for a shared component carrying a finding: contract, consumers, style origins, findings.

**Severity translation:** checklist `P0`–`P4` ↔ BLOCKED/WARN ↔ Critical–Low via the single map in `.claude/docs/design-review-checklist.md` §0.3 — never translate ad hoc.

---

## Systematic Review Strategy (never under `--report-only`)

1. **Categorize** — Group files by SURFACE first (the Phase 1 surface map), then by shared-library / component concern; one reviewer owns a surface end to end (composition, UX pass, categories) so no surface is split across agents
2. **Choose assignments** — Follow `SYNC:systematic-review-batching`: inline, bounded sequential or authorized fresh UI/UX-specialized reviewers according to risk, related surfaces, working-set fit and delegation cost; retain the UI-category checklist. File counts do not require parallelism or hierarchy.
3. **Synchronize** — Collect findings, cross-reference shared-component consumers and cross-system token mixing
4. **Consolidate** — One index report with per-category verdicts plus the per-surface files; cluster defects repeated across surfaces into single systemic findings

---

## Phase 5: Why-Review Findings Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings. Also skip when called with `--loop-owner=caller`: the caller validates the merged report once (`$start-workflow` → Workflow-step mode).

**Protocol:**

1. Read own finalized report from `tmp/reports/ui-review-{date}-{slug}.md` (the exact path written in Phase 3 — NOT `{skill}-…`)
2. Invoke `$why-review --validate-findings tmp/reports/ui-review-{date}-{slug}.md`
3. Read the validation verdict path returned by why-review, expected as `tmp/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."
6. **If the report changed after validation:** re-run this validation gate, maximum 3 validation passes, until the report's remaining findings are validated or zero findings remain.

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)
- Called with `--loop-owner=caller` → log "Skipped — the caller validates the merged report once"

**Why:** Validate severity against code before the caller treats a reviewer’s claims as established facts.

---

## Phase 6: Validated Fix + Full UI Re-Review Loop (MANDATORY when validated findings remain)

**Trigger:** Phase 5 returns CLEAN/validated and the UI review report still has one or more findings that must be fixed. Under `--report-only` this phase never runs — the validated report is returned to the caller.

**Protocol:**

1. Create a fresh fix-cycle task list before editing. Do not reuse the review tasks.
2. Fix only findings that survived `$why-review --validate-findings`; when this skill is running inside a workflow, route broader or cross-cutting fixes through the caller's fix step.
3. Run targeted verification for the fixed UI files and any affected consumers.
4. Re-invoke `$ui-design --mode=review` from Phase 0 over the full current UI scope, not only the fixed files.
5. The re-run MUST create brand-new review tasks, reload the UI docs, determine scope again, rerun blast radius where applicable, and review every changed UI file from the start.
6. Repeat validate → fix → full UI re-review until a complete pass clears the current round's exit bar (round 1: zero open findings; round 2: zero CRITICAL/HIGH/MEDIUM, LOW deferred).
7. If the same validated blocker repeats across 2 full invocations with no progress, stop and ask the user for a decision.

**Non-negotiable rules:**

- Never fix a finding before `$why-review --validate-findings` validates it.
- Never mark UI review clean after a targeted fix check only; the clean verdict must come from a full Phase 0 restart.
- Never review only fixed files during the recursive pass; analyze all UI files in scope again.
- Never reuse old todo/task items for the recursive review pass.

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY — NO EXCEPTIONS:** After completing, use `ask user question tool` to present (skip under `--report-only`, when invoked by a parent skill, or as a sub-agent — return the report and next-step recommendations instead):

- **"$code-simplifier" (Recommended)** — Simplify and refine the styling/component code
- **"$web-design-guidelines"** — Generic accessibility / UX checklist for a11y depth
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling references across all relevant file types (styles, UI bindings, and source imports)
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — a fixed `width` may be a genuinely fixed UI element; no "fix" without traced rationale
3. **Verify ALL outputs.** One compiled stylesheet ≠ all consumers — a shared-component style change affects every consuming app
4. **Evaluate pattern fit.** Copying a nearby mixin/token? Verify the file imports/uses the SAME token system and does not mix incompatible project token systems
5. **New artifact = wired artifact.** Prove every created view, style, component, or helper is referenced and reachable through the target platform's entry point

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting. Keep task depth proportional to the work.


## Sub-Agent Type Override

> **MANDATORY:** UI reviews spawn the UI/UX-specialized sub-agent defined by the local sub-agent selection guide.
> Keep `agent_type: "ui-ux-designer"` in the canonical template below when that agent type exists in the local catalog.
> **Rationale:** The shared sub-agent selection guide routes frontend UI/UX, accessibility, responsive layout, and design-token work to the UI/UX specialization. Do not fall back to a generic code-reviewer catch-all unless the local catalog lacks a UI/UX reviewer.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Fresh reviewer prompts MUST embed 11 protocol blocks VERBATIM, copied WHOLESALE; these are review-tier renderings. When canonical `SYNC:` protocols change, update their renderings here in the same edit. Copy this template into the Agent `prompt`; replace only `{placeholders}` in Task / Round / Reference Docs / Target Files / Output. Never alter embedded sections at dispatch.
>
> **Why inline expansion:** Fresh reviewers need every rule immediately; file pointers/placeholders depend on reads or hooks that may not fire. The hybrid policy (`SYNC:shared-protocol-duplication-policy`) therefore retains all 11 full bodies in this template, copied wholesale.

### Subagent Type Selection

- `ui-ux-designer` — default for UI reviews when the local agent catalog provides it
- `code-reviewer` — fallback only when the local catalog lacks a UI/UX-specialized reviewer

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} UI review",
  agent_type: "ui-ux-designer",
  prompt: `
## Task
{review-specific task — e.g., "Review in-scope UI changes for content fit at supported sizes, configured styling, applicable accessibility and layering rules, and async states" | "Review the project's configured UI files under {path}"}

## Round
Round {N}; ZERO prior-round memory. Re-read every target with your own tools. Trust no main-agent information beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
FIRST review the WHOLE PACKAGE. Read `docs/project-config.json`: valid `specArtifacts` profiles select configured `intent/contracts/evidence` roles, identifiers, ownership and test-carrier dialects; only absent profiles use strict-default §3 ACs / §4 BRs / §5 invariants / §8 TCs. Malformed/unsupported declarations are `BLOCKED`, never absent/fallback. Load governing artifact, tests, and changed code TOGETHER; judge mutual consistency before isolated checks.
1. Locate canonical owner sections, guarding tests, and implementing code. Native profiles: preserve owner path + case/scenario ID + optional variant; resolve configured carriers to actual tests. Missing faces are findings (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise; log every disagreement and classify its wrong face:
   - code vs spec: behavior absent from configured `intent/contracts` (or strict-default §3/§4/§5/§8) → CODE-EXTRA or SPEC-STALE; a hard contract/invariant with no enforcing path → CODE-WRONG.
   - tests vs spec: native case without executing assertions, or assertions absent from native rules/cases → TEST-GAP or SPEC-SILENT. Without `specArtifacts`, check strict-default §8 TCs.
   - tests vs code: uncovered changed path → TEST-GAP; test passing a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: enforced but unstated invariants (SPEC-SILENT) MUST become findings, additions to configured `intent`/`contracts`, and `evidence` links to native cases with inspected executing assertions. Without profiles, use strict-default §3/§4/§5/§8 and TC. Enrich; never silently pass.
4. Proceed only after agreement or all disagreements are logged; re-review enriched spec/test packages.
NEVER PASS unlogged spec/test/code disagreements. Diff = entry point; package = judgment unit.

### Evidence-Based Reasoning
Speculation FORBIDDEN; prove every claim.
1. Every claim: cite file:line, grep results, or framework docs
2. Confidence: >80% act freely; 60-80% verify first; <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. Insufficient evidence is valid/expected output
5. Review decision autonomy: choose evidence-supported review approaches, recommendations and next steps without asking the user. Record rationale and preserve every evidence gate. Read-only leaves return remedies to their owner. Only round-limit extension, indispensable facts with no defensible default, and actual missing action authority require a question; never infer consent, accept an open risk or perform an unauthorized operation.
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Admit a finding only with a reachable trigger path (the caller, input or state that reaches the defect) and a consequence; a concern no supported path reaches is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher.
Classify every finding by consequence (never by effort): CRITICAL = immediate material security/safety/data-loss risk or failed binary gate → block; HIGH = material correctness, contract, privacy, or authority risk → must fix; MEDIUM = bounded consequential edge/resilience/maintainability gap → must clear the current round, or escalate with an explicit residual-risk follow-up that does not create a clean pass; LOW = non-blocking polish with no credible present impact → record/defer from round 2; `NOT VERIFIABLE` is unresolved evidence, not LOW.

### Design Patterns Quality
Every code change:
1. Consistency/reuse: follow documented patterns; justify extraction cost by repetition or real consumer need. Similar names alone never require shared bases.
2. Responsibility: follow config/references/accepted decisions/code; place behavior with its owner. Assume no entity/service/controller hierarchy or forbidden layer without evidence.
3. Apply cohesion/coupling/dependency principles where paradigm assumptions fit; SOLID suits OO boundaries, not every language/codebase.
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI: repetition prompts evaluation, never numeric extraction thresholds. Extract when shared change reasons, real consumers, or evidenced ownership/substitution lower total change cost; no hypothetical-use patterns.
6. Purpose naming: public/cross-layer abstractions name consumer capability/domain/contract, not provider/SDK/framework/database/transport. `IStorage`/`Storage` → `AzureBlobStorage`; use `IAzureStorage` only when Azure-specific semantics are intentionally part of the contract.
7. Contract-fit: read callers/all implementations; narrow over-broad abstractions (`IObjectStore`, `DocumentStore`), never reward misleading generic names.
8. Naming signals: `Manager`, `Helper`, `Utils`, `Data`, `Thing`, `Service`, `Interface`, type decorations/unexplained abbreviations are defects only when hiding purpose/scope/responsibility.
9. Concrete names: provider/strategy/transport/test-double names may distinguish real behavior (`AzureBlobStorage`, `InMemoryStorage`, `RetryingStorage`); exclude from caller contracts unless promised.
10. Preserve local interface syntax/naming: `.NET` `I` prefixes and Google TypeScript unmarked interfaces are both valid.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify behavior matches change intent.
1. Every changed file MUST serve stated purpose; flag unrelated scope creep.
2. Trace one complete success scenario through changed code.
3. Trace one failure/edge scenario through changed code.
4. With plan context, map every acceptance criterion to code.
5. Test/spec changes: tests name protected business rule/invariant and fail when it breaks.
6. Migration exclusion: no migration-code tests; schema/data migrations are one-time paths, not core application logic.
NEVER PASS without both happy/error traces.

### Test Spec Verification
Map changed code to test specs.
1. Discover test/spec format in docs, test cases, BDD features, or spec folders.
2. Every changed path MUST map to a test case/spec or be flagged "needs test case".
3. New functions/endpoints/handlers → test-spec creation flag.
4. Exclude migrations from test/spec creation: one-time execution, not core application logic.
5. Verify existing spec evidence resolves actual code (file:line); flag stale references.
6. Meaningful cases name business intent/invariants; flag implementation-mirroring behavior-only cases.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. Missing changed-path specs → log gap, recommend project test-spec workflow.
NEVER skip test mapping; uncovered paths risk production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
Trace execution/data flow; fix the violated contract's owner, never assume the crash site.
MANDATORY before ANY fix:
1. Trace actual origin, transformations, boundaries, failure; invent no absent layers.
2. Identify invalid-state/behavior contract owner from architecture/code evidence.
3. Fix authoritative owner; retain untrusted-boundary validation. Justify multi-file fixes by owned contracts, not file-count thresholds.
4. Inspect relevant existing bypass entries: constructors/adapters/parsers/caches/persistence.
BLOCKED until: The affected path is traced; the owner is supported by file:line evidence; relevant consumers and bypass paths are checked; and the correction point fits the project's architecture.
Anti-patterns (REJECT): assuming the symptom site is the owner; scattering workarounds without tracing the contract; assuming the lowest technical layer is always authoritative; removing validation from a real trust boundary to force a single correction point.

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need todo tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation (optional advice)
Optional: for high-risk blast radius (shared contract/many callers/cross-module/cross-service/public API), .code-graph/graph.db suggests callers/dependents/impacted tests. Treat it as a hint, NOT proof: stale/incomplete graphs lag uncommitted edits/unindexed paths. Verify important results by files/grep; skip low-risk/local changes. An absent or stale graph is never a finding.
Pattern: grep/read → optional graph suggestions → grep/read verification.
- High-risk investigation: trace --direction both on 2-3 entry files
- Fix/debug with wide reach: callers_of on buggy function + tests_for
- Feature touching a shared contract: connections on files to be modified
- Review of a high-risk change: tests_for on changed functions
- Blast radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Optional high-risk hints: python .claude/scripts/code_graph trace <file> --direction both --json if .code-graph/graph.db exists; verify stale-capable caller/dependent hints by files.
4. Map dependents by grep/read callers; optional graph connections/callers_of adds hints.
5. Write investigation to tmp/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Assumptions verified with evidence. (The code graph is optional advice, never a gate.)

## Reference Docs (READ before reviewing)
- {resolved project styling rules doc}
- {resolved project design-system/token doc, especially Z-Index & Layering}
- {resolved project frontend architecture/patterns doc}
- {resolved project code-review rules doc}

## Target Files
{explicit file list OR "run git diff and filter by the project's configured UI/frontend path and extension patterns"}

## Output
Write a structured report to tmp/reports/ui-review-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings (cross-system token mixing, shared-component fan-out)

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO keep the UI/UX-specialized `agent_type` for UI reviews when the local catalog provides it (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** UI quality — content remains available, supported sizes and inputs remain usable, platform layout/layering conventions are respected, project styling stays consistent, and async work provides meaningful feedback.

> **External Memory:** Complex/lengthy work → write findings to `tmp/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).


> **UI-only protocol ownership:** Keep the 11 embedded sections in `OVERRIDE:review-protocol-injection` substance-identical to canonical `SYNC:review-protocol-injection`; `sync-carrier-parity.test.cjs` checks both architecture and UI carriers. The specialist `.claude/agents/ui-ux-designer.md` supplies `SYNC:ui-ux-design-principles`; do not add a twelfth protocol to the shared template.

> **Complexity Prevention (UI-scoped)** — measure code by cost of change and follow the platform's component model. Use configured component tiers and base abstractions when present; otherwise follow the observed structure without inventing one. Keep shared behavior with a clear owner when reuse is evidenced; place derivations, formatting, and validation according to the project's architecture. For deeper backend structure, defer to `$changes-review` or `$architecture --mode=review`.

## Mode protocols

> Full protocol bodies carried by this mode (canonical text: `.claude/skills/shared/sync-inline-versions.md`). The `ui-design` skill already carries `design-distinctiveness-gate`, `design-review-checklist`, `ui-copywriting`, `ui-ux-design-principles` and `ux-journey-gate` (guide line + reminder), so they are not repeated here.

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Boundary naming:** When the category exposes public or cross-layer types, APIs, events, or modules, verify that names describe the capability, domain purpose, or contract rather than the current provider/framework/transport; concrete adapters may carry those details. Check callers and implementations before flagging a name, and treat generic names (`Manager`, `Helper`, `Utils`, `Data`) as signals rather than automatic violations.
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a todo tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

<!-- SYNC:core-engineering-principles -->

> **Core Engineering Principles — Easy to Change · Easy to Scale · Easy to Maintain** — The success metric of every plan, implementation and review is _future change cost_: the next change must be cheap, safe and provable. DRY, reuse, abstraction, interfaces, wrappers, patterns, layering, tests and the harness exist only to serve that goal. Apply this gate BEFORE any narrower design rule or checklist; when a narrower design rule would raise change cost, this principle wins — it never waives a required gate (tests, review, security, user confirmation). It is evidence-gated: judge fit against the project's config, accepted decisions and local patterns, and never impose a technique the project does not use.
>
> 1. **Easy to change.** Keep one owner per piece of knowledge — DRY the rule, not look-alike text. Reuse an existing helper, component or module before writing a new one (search 3+ siblings and cite them). Put purpose-named interfaces or ports at volatile boundaries: wrap a third-party SDK or infrastructure dependency in an adapter when it is volatile, likely to be swapped, or needs a test seam, so a swap touches one place — a stable dependency used directly is fine, and a pass-through wrapper that lowers no change cost is a defect. Keep units small and cohesive with explicit dependencies; no hidden state, boolean traps or leaked implementation detail. Extract an abstraction for a real second consumer or an evidenced change axis, never for speculation; prefer the reversible decision and defer an irreversible one until evidence forces it. Depth → `SYNC:design-patterns-quality`, `SYNC:complexity-prevention`.
> 2. **Easy to scale.** Growth in features, modules, team, data or load must not multiply edit sites or cost. Add a variant by extension (a new handler, registration or config entry), not by editing every switch over the same discriminator. Keep module boundaries and dependency direction explicit. Bound every loop, query, result set, queue and concurrency on the paths that matter, so work grows with the request, not with total data. Scale only what the project's profile warrants — no speculative distribution or infrastructure. Depth → `SYNC:scale-technique-gate`, `SYNC:engineering-foundation-gate` (F5, F6).
> 3. **Easy to maintain.** Protect every changed behavior with tests that name the business intent or invariant and FAIL when it breaks — happy, error, edge, boundary and regression paths, not only the changed line. Tests are repeatable and isolated. The mechanical harness (format, lint, types, build, test — the same command locally and in CI) runs and passes. Names and structure state intent, and docs or specs that embed the behavior stay in sync. Depth → `SYNC:engineering-foundation-gate` (F3, F4, F7), `SYNC:harness-setup`.
>
> **By phase:**
>
> - **Plan** — each phase names what it reuses (`file:line`), the seam or abstraction it adds or why none is needed, the next plausible change and its edit-site count, the growth bound, and the test that proves each invariant — or `N/A` with a reason where an item cannot apply (a docs-only phase has no growth bound).
> - **Implement** — search for reuse before writing; after writing, recount the edit sites of the next plausible change, confirm each new test fails when its intent breaks, and run the harness.
> - **Review** — judge each pillar `PASS` / `FAIL` / `N/A` with `file:line` evidence and name the real enemy: coupling, duplicated knowledge, hidden state, unbounded growth, untested intent, unclear intent or an irreversible decision exposed too early. A finding names its consequence for the next change; absence of a pattern is not a defect.
>
> **Self-check before claiming done:** (1) What is the next plausible change, and how many files would it touch? (2) What breaks at 10× features, data or load? (3) Which named test goes red if this behavior breaks, and does the harness run it?

<!-- /SYNC:core-engineering-principles -->

<!-- SYNC:design-patterns-quality -->

> **Design Quality** — Be opinionated about changeability, and choose techniques by their preconditions. For brownfield work, project config, references, accepted decisions, and current code define the local architecture; do not silently replace a settled pattern. For a new non-trivial system, treat the options below as hypotheses; use the domain, change, and deployment boundaries to select a fit, not a universal target architecture.
>
> 1. **DRY the knowledge, not merely the text.** Keep one owner for a business rule or policy that must change together. Similar-looking code with different reasons to change may stay separate; extract shared functions, modules, types, or components when a real consumer and lower change cost justify them.
> 2. **Give modules explicit responsibilities and dependency direction.** A modular monolith can fit a new application with one release boundary and no evidenced need for independent deployment, scaling, compliance, availability, or runtime; choose another topology when measured ownership or operating boundaries require it. Use Clean/Hexagonal/Ports-and-Adapters ideas to keep policy independent of volatile infrastructure when that boundary buys testability or change isolation. Add layers only when each owns a real contract; split deployment/services only for a demonstrated scaling, ownership, availability, compliance, or release need.
> 3. **Model the domain to its actual complexity.** Use DDD language, aggregates, value objects, and explicit invariants where domain rules and lifecycle matter. Keep straightforward CRUD workflows simple; do not add tactical DDD ceremony without domain complexity.
> 4. **Use events for real decoupling.** Domain/integration events and messaging fit asynchronous reactions or independently owned modules/services. Define idempotency, ordering, retry/recovery, and an outbox/CDC strategy when delivery crosses a durable boundary. Use a direct call inside one consistency boundary when asynchronous delivery adds no value.
> 5. **Use Repository and Unit of Work at meaningful persistence boundaries.** They fit when they protect aggregate/query contracts, isolate a changing persistence technology, or coordinate a real transaction. Do not wrap every ORM call in a generic repository or add a Unit of Work that duplicates the platform's transaction behavior.
> 6. **Apply OOP/SOLID where the language and model use objects.** Prefer cohesive responsibilities, dependency inversion at volatile boundaries, and composition before inheritance; avoid interface-per-class and abstractions with no second implementation or test seam. In functional or data-oriented code, preserve the same cohesion, explicit dependencies, and small contracts without forcing classes.
> 7. **Build UI from cohesive components.** Keep state at the narrowest useful owner; use a store for state genuinely shared across components/routes or for coordinated async data. Add caching only with a freshness/invalidation policy and evidence of a repeated or expensive read. Use the framework's reactive model for composable asynchronous changes and dispose subscriptions/resources by its lifecycle. Apply BEM when the project uses SCSS/BEM; otherwise follow the selected CSS modules, utility, or naming method.
> 8. **Place behavior with its invariant/data owner.** Trace callers and dependencies; use the owner selected by the project's architecture. Do not assume Entity > Service > Controller, or any other fixed layer order.
> 9. **After extraction/move/rename:** grep the full affected scope for dangling references. Preserve project naming/style and verify caller contracts before changing an abstraction.
>
> **Selection gate:** read project config, references, accepted decisions, and comparable implementations. Name the problem/precondition a chosen pattern solves, the simpler alternative, and the trade-off. Configuration may select a stack-specific pattern; it does not make an unjustified abstraction free.
>
> **Review dimensions:** use focused passes over applicable concerns, then group repeated, evidenced violations when they share one cause. A repeated smell is not automatically a defect; name the damaged quality attribute and project-specific consequence.

<!-- /SYNC:design-patterns-quality -->


<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Do not present inference as fact; ground material claims in evidence appropriate to the task.
>
> 1. Cite `file:line` for repository claims, configuration or reference paths for project rules, and URLs or artifact locations for external or observed claims.
> 2. State confidence when a conclusion is uncertain; verify material assumptions before acting and withhold recommendations when evidence is insufficient.
> 3. Trace the consumers, boundaries, or dependencies that exist in the affected path; do not assume services, modules, or architectural styles that the project does not use.
> 4. "I don't have enough evidence" is valid and expected output.
>
> **BLOCKED until:** material claims have traceable evidence, relevant searches are complete, and uncertainties are stated. Search comparable patterns when the task has existing implementations; record when none are available.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation (optional advice)** — Optional: for high-risk blast radius (shared contract, many callers, cross-module/cross-service flow, public API), `.code-graph/graph.db` may add callers, dependents and impacted tests beyond grep/read. Treat it as a hint, NOT proof: stale or incomplete graphs lag uncommitted edits and unindexed paths. verify anything that matters by reading files/grep. Skip it for low-risk or local changes.
>
> An absent or stale graph is never a finding and never blocks, fails or gates work.
>
> **Pattern:** grep/read → optional graph suggestions → grep/read verification.
>
> | Situation                          | Optional graph query                         |
> | ---------------------------------- | -------------------------------------------- |
> | High-risk investigation            | `trace --direction both` on 2-3 entry files  |
> | Fix/debug with wide reach          | `callers_of` on buggy function + `tests_for` |
> | Feature touching a shared contract | `connections` on files to be modified        |
> | Review of a high-risk change       | `tests_for` on changed functions             |
> | Blast radius                       | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Start `--node-mode file` (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->


<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <70% on any critical decision → stop and escalate via ask user question tool (70-80% → verify first) · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY the structured envelope below. Main agent reads the envelope first, then opens the referenced report for synthesis, acceptance, deduplication, or repair planning; a full report is never pasted inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
> Run ID: [stable run identifier]
> Task ID: [parent task or phase identifier]
> Attempt ID: [monotonic attempt/revision identifier]
> Target: [exact files/paths or scope] @ [target fingerprint/commit]
> Changed paths: [none | exact paths]
> Finding totals: Critical=[n] | High=[n] | Medium=[n] | Low=[n]
> Acceptance: PENDING | ACCEPTED | REJECTED — parent records the decision
>
> ### Findings (Critical/High surfaced — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Gaps / Unverified
>
> - [missing host, runtime, coverage, or evidence limitation]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description, or `none`]
>
> Full report: tmp/reports/[skill-name]-[date]-[slug].md
> ```
>
> The ten-bullet limit is a transport limit, not a visibility limit: the full report may contain more than ten Medium/Low findings when no named blocker exists, and the parent MUST read it when synthesizing or deduplicating. The parent MUST reject a stale, duplicate, or superseded `Attempt ID` and MUST accept the current attempt before advancing a dependent step. Read-only leaves write repair proposals/reports only; they do not edit source, generated carriers, or user files.
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the envelope lives in the incrementally-written report. A sub-agent that would exceed the summary shape MUST persist the detail and return only the pointer; bounded transport must never become bounded visibility.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:systematic-review-batching -->

> **Adaptive Review Planning** — Triage the complete target and make a short plan before deep review. Optimize attention and time while preserving coverage and all applicable quality gates.
>
> 1. **Understand the work.** Inventory all changed paths/status and intent; distinguish behavior, contracts, tests, docs/config and mechanical outputs. Identify risk, dependency links and governing rules. Prioritize the paths whose failure has the largest consequence; size alone does not decide depth.
> 2. **Choose an approach.** Review inline when useful. Group connected behavior with its callers, tests and rules; use authorized specialist agents for independent work or necessary expertise. Decide grouping, read sizes and concurrency from the actual working set, context headroom and delegation cost. There are no universal file, line, byte or group-size caps, and no mandated split or hierarchy. Preserve host limits and leave room to reason.
> 3. **Track and persist.** Create todo tasks for the planned review work, findings validation and fix/re-review checks. Track coverage so every file is reviewed or accounted for by relevant evidence; generated/mechanical changes can use verified generator/parity or pattern checks with an explicit rationale. Read relevant source and rules on demand, persist findings and remaining work as you go, and resume from that record after interruption. If context is tight, checkpoint and regroup; never silently truncate or call unreviewed work clean.
> 4. **Coordinate and validate.** Give each delegated reviewer a clear scope, governing rules, report path and the required full review protocol template. Independent readers may run together; fixes wait until their reports return. Validate findings before acting, preserve rejected/re-tiered candidates and reconcile conflicts by evidence. The coordinator independently checks material findings, uncertain claims and cross-group interactions, choosing additional validation where risk warrants it. Reconcile all coverage and required checks before the final verdict.
>
> **Quality bar:** a thousand-file review may need several passes, but file count never waives end-to-end correctness, required rules, tests, finding validation or fresh post-fix review.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `tmp/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: tmp/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:understand-code-first -->

> **Understand Existing Code First** — For code changes, read and trace the target before planning or editing; do not apply a code workflow to work with no code surface.
>
> 1. Search for relevant existing implementations and cite `file:line`; aim for 3+ comparable examples when they exist, and record when the project has fewer or none.
> 2. Read the target area and its configured project references; identify actual structure, owners, and conventions without assuming a framework, layer model, or base class.
> 3. Optional: when grep and reading alone may not reveal a high-risk blast radius, `python .claude/scripts/code_graph trace <file> --direction both --json` (when `.code-graph/graph.db` exists) can add callers and dependents — a hint that may be stale, verified by reading the files.
> 4. Map affected dependencies and callers with available repository tools (grep, reading); an absent, stale or unsupported graph never blocks or fails the task.
> 5. Write investigation to `tmp/analysis/` for non-trivial tasks (3+ files).
> 6. Re-read the analysis before implementing; update it when evidence changes.
> 7. Follow a fitting local pattern, or state why no suitable pattern exists and justify a project-appropriate choice.
>
> **BLOCKED until:** target and relevant existing patterns are inspected, applicable dependencies are traced, and material assumptions have evidence. If an item does not apply or the repository has no comparable implementation, record that fact rather than fabricating a gate result.

<!-- /SYNC:understand-code-first -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** select patterns from project evidence and real needs; keep one owner per rule, justify abstractions by change cost, and grep affected scope for dangling references after extraction, move, or rename.

<!-- /SYNC:design-patterns-quality:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**Optional advice:** the code graph (`.code-graph/graph.db`) can hint at a high-risk blast radius grep misses; it can be stale, so verify by reading files. Never required.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:source-test-drift-check:reminder -->

**IMPORTANT MUST ATTENTION** when source behavior changes, inspect affected tests; decide from evidence whether tests update to match intent or the source change is an unintended bug.

<!-- /SYNC:source-test-drift-check:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:subagent-return-contract:reminder -->

**IMPORTANT MUST ATTENTION** every spawned sub-agent returns report path + status + severity counts; appends findings per-file (never batched); main agent integrates verbatim, never filters.

<!-- /SYNC:subagent-return-contract:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** use structured reasoning for complex or ambiguous work, implicitly when visible markers would clutter. Verify hypotheses, revise assumptions, and close with confidence, assumptions, open questions and a concrete next action.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:systematic-review-batching:reminder -->

**MUST ATTENTION** Triage all files, write a short review plan and create review/validation/fix/re-review tasks first. Choose inline work or authorized specialists from risk, relationships and context headroom; no fixed file/line/byte caps. Persist coverage, reconcile interactions and validate findings before fixes or PASS.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->


<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Validate in-scope user interfaces for content fit, supported-size behavior, platform-appropriate layout/layering and styling, accessibility, and async feedback; use the project's own UI patterns and skip absent surfaces.

**IMPORTANT MUST ATTENTION Workflow:** Phase 0 load project UI rules → Phase 1 determine and filter scope (skip with evidence when no frontend files), then expand files → affected surfaces → Phase 2 grep/read blast radius (graph optional) → Phase 2B reconstruct each surface's composition (component tree, style origins incl. ancestor/stacking/global layers, render or `ENVIRONMENT-BLOCKED`) → Phase 2C surface UX pass (task trace, Field Necessity Matrix, container fit, complexity budget, `UX-8` journey walkthrough + traceability) → Phase 3 review Categories 1–6 in surface context → Phase 3B run nine UI/UX dimensions → Phase 3C run four DD passes → Phase 4 write the compliance verdict → Phase 5 validate findings with `$why-review` → Phase 6 fix only validated findings that block the current round and restart the full UI review (Round 1: all severities; Round 2: CRITICAL/HIGH/MEDIUM; LOW-only deferred; binary gates always block); batch large scopes and use the UI/UX specialist only as the protocol requires.

**MUST ATTENTION** break work into small tasks using todo tracking BEFORE starting; expand child phases and link their parent when nested
**MUST ATTENTION** when delegation applies, tag tasks PAR/SEQ, dispatch disjoint-write PAR waves together, and wait for all returns before advancing
**MUST ATTENTION** resolve and read project UI/styling docs BEFORE reviewing — rules come from docs, not general knowledge
**MUST ATTENTION** SKIP this skill when no files match the project frontend path/extension patterns
**MUST ATTENTION** every violation requires `file:line` proof — NEVER speculate
**MUST ATTENTION** grep 3+ counterexamples before flagging any pattern violation
**MUST ATTENTION** treat BEM, CSS override, and stacking rules as blockers only when the project documents them or source evidence shows a user-visible defect
**MUST ATTENTION** NEVER mix incompatible project token systems in one file — recommend whichever system the file already imports/uses
**MUST ATTENTION** after validated UI fixes, rerun the full UI review; when that protocol uses a fresh reviewer, use the UI/UX-specialized sub-agent from the local sub-agent selection guide
**Optional advice:** the code graph can hint at shared-component consumers grep may miss; it may be stale — verify by reading
**MUST ATTENTION** review SURFACES, not files: execute Phases 2B–2C in the Workflow above BEFORE code categories. The `UX-8` walkthrough must leave no unserved journey step or orphan element; tag findings from inferred journeys `HEURISTIC`.
**MUST ATTENTION** write the index to `tmp/reports/ui-review-{date}-{slug}.md` and one file per surface (and per shared component with findings) under `tmp/reports/ui-review-{date}-{slug}/`, appended as each completes; cluster repeated defects into one systemic finding
**MUST ATTENTION** review phases remain read-only; fixes belong only to Phase 6 after validation, never under `--report-only`
**MUST ATTENTION** apply `Think:` reasoning prompt before checking each category — derive violations, don't recite checklists
**MUST ATTENTION** run the Phase 3B UI/UX Design Principles pass for in-scope user interfaces — review the nine principle groups and apply clauses supported by the target platform, project conventions, and interaction modes; record inapplicable clauses with evidence. Findings cite `UI-<clause>` + `file:line` + BLOCKED/WARN severity, and project design-system docs remain authoritative when present (surface genuine conflicts; NEVER resolve them silently).
**MUST ATTENTION** use `ask user question tool` to present next steps after completing review — except under `--report-only`, when invoked by a parent skill, or as a sub-agent, which ask nothing and return next steps in the summary
**MUST ATTENTION** `--report-only` runs Phases 0–5 only — no fix of any size, no nested fan-out, no user question, no writer beyond the report; return validated findings grouped Critical/High/Medium/Low (BLOCKED → Critical/High, WARN → Medium/Low, PASS → not a finding) — why: a read-only leaf that fixes, fans out, or asks races or stalls its barrier siblings.

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| "Too simple for a UI review"              | Simple surfaces can still fail at supported content sizes. Apply the relevant categories. |
| "Already read the docs"                   | Show the extracted project/platform rule — no recall = no read.                          |
| "Just flag obvious z-index literals"      | Gray areas matter most. Trace the surface's semantic layer before recommending a token. |
| "Fixed width is fine, it looks right"     | Check the sizes and user scaling the project supports; verify the target platform can show the whole interaction. |
| "web-design-guidelines already covers UI" | Use it for web accessibility/UX; also check applicable project UI conventions without duplicating findings. |

<!-- SYNC:core-engineering-principles:reminder -->

**MUST ATTENTION** Core Engineering Principles — every plan, implementation and review must be **Easy to change** (reuse first, one owner per rule, interfaces/adapters at volatile boundaries, no speculative abstraction) · **Easy to scale** (extend by addition, bounded growth, explicit boundaries, sized to the project's real profile) · **Easy to maintain** (intent-named tests that fail when the rule breaks across happy/error/edge paths; harness green locally and in CI). Before done: next change → how many edit sites? 10× → what breaks? which test goes red?

<!-- /SYNC:core-engineering-principles:reminder -->
