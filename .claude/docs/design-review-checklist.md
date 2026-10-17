# UI/UX Design Review Checklist — executable review protocol for user-facing UI

> **Role:** the **executable review protocol** for any artifact carrying a user-facing UI surface. Every item has a stable ID, a verifiable check, an observable failure signal, and a default severity, so an agent can run it against screenshots, prototypes, live URLs, code, or design files and produce a consistent, evidence-backed report. Owns the REVIEW PROTOCOL (§0), the SURFACE-SCOPE & COMPOSITION rule (§0.5), the CHECK CATALOG (§A–§M, §R), the EDGE-CASE PROBE LIST (§N), the REPORT FORMAT (§O), the QUICK TRIAGE PASS (§P), and the SCORING model (§Q). Owns NO design reasoning — that lives in `design-knowledge.md`.
>
> **Consumed by:** `web-design-guidelines` · `work-item --mode=review` · `test-ui` · `changes-review` · `ui-design` · `design-spec` · `work-item --mode=mockup` · `feature-presentation` · `presentation-builder` · `plan` · `scaffold` · `feature-implement` · `fix`, plus the `ui-ux-designer`, `frontend-developer` and `fullstack-developer` agents. This list is the drift-guard's scope — a skill belongs here only when it carries the canonical block or generated protocol guide, so the list stays greppable and the sweep stays truthful. NEVER add an aspirational consumer.
>
> **Drift-guard:** this file is AUTHORITATIVE for the check IDs (`A1`…`Q`), the severity rubric, and the report format. Related but SEPARATE single-sources — NEVER duplicate them here: the 40 usability clauses `UI-1.1`–`UI-9.4` in `SYNC:ui-ux-design-principles`; the visual-identity clauses `DD-1`–`DD-8` in `SYNC:design-distinctiveness-gate` + `.claude/docs/design-knowledge.md`; the tech-agnostic spec layer in `SYNC:ui-intent-layer`; project tokens/components in `design-system/` under the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path. On any change here, grep `design-review-checklist` and update every consuming carrier.
>
> **Relationship to the other two UI rule sets — three questions, no overlap.** `UI-1.1`–`UI-9.4` ask _"does this meet the usability/accessibility floor?"_ `DD-1`–`DD-8` ask _"is this THIS product's interface, or any generator's?"_ This checklist asks _"did the review actually LOOK at everything, with evidence, and rank it?"_ — it is the **procedure and evidence contract** for a review, not a third set of taste rules. Where a check here restates a `UI-*` clause, report it ONCE under whichever ID the consuming skill already uses; NEVER emit two findings for one defect.
>
> **MUST ATTENTION** apply this checklist ONLY when the change, plan, or artifact carries a user-facing front-end surface. A back-end-only diff, a doc edit, or a config change is `N/A` — state that once and move on. NEVER run a UI review on a non-UI change to manufacture coverage.
>
> **MUST ATTENTION** the project's OWN design-system, SCSS, and frontend-pattern docs plus accepted ADRs **OUTRANK this checklist** on any conflict; the brief's stated direction outranks aesthetic judgment. A deliberate, documented convention is NEVER a defect — surface a genuine conflict to the user with both sides, NEVER resolve it silently.
>
> **Portability and applicability.** This is a shared checklist of review prompts, not a universal product specification. Resolve the supported platforms, input modes, user states, and governing accessibility/release standards from project configuration, references, and evidence. Run matching checks only; record unsupported checks as `N/A` and unverifiable checks as `NOT VERIFIABLE`. Numeric examples and default severities are starting points, not project-wide mandates; the governing standard and release contract determine thresholds and priority.
>
> **Provenance.** `[model-knowledge]` — a consolidation of established practice: Nielsen's usability heuristics (§A), named UX laws (§B), Gestalt and typographic convention (§C), and WCAG 2.2 AA examples (§I) `[standard reference: W3C WCAG 2.2]`. Apply the WCAG examples only when that version/level governs the surface. Severity defaults are calibration, not law; a project's own release policy outranks them.

---

## Quick Summary

**Goal:** Turn a front-end review into a repeatable, evidence-backed report — every finding carrying a location, an observation tag, an impact, a checklist ID, and a fix — so defects are ranked by real severity instead of by whatever the reviewer happened to notice first.

**Summary:**

- **Gather context BEFORE checking (§0.1).** Platform, primary user, primary task, success metric, constraints, scope, artifacts. Fewer than four known → state the gap at the top and mark affected findings **low confidence**.
- **Evidence or nothing (§0.2).** Every finding cites a location. NEVER invent a measurement — an unmeasurable check is `NOT VERIFIABLE`, never a guessed number. Tag each finding `MEASURED` / `OBSERVED` / `HEURISTIC`.
- **Judge the SURFACE, not the diff (§0.5).** Expand changed files to the pages/views they render into, reconstruct how each surface actually composes (component tree + style origins), and review each surface whole — load accumulated over many small diffs is invisible file by file.
- **The sections, in order:** §0 protocol → §A heuristics → §B cognitive load & surface complexity → §C visual hierarchy → §D relevant interaction states → §E information architecture & container fit → **§F web / §G mobile (conditional on platform) / §H expert & data-heavy use (conditional on usage)** → §I accessibility (against the governing standard) → §J content → §K trust & ethics → **§L AI patterns (conditional)** → §M consistency → **§R forms & data entry (conditional on input)** → §N applicable edge-case probes → §O report format → §P quick triage → §Q scoring.
- **Calibrate before judging.** Worked bad/good examples with their expected findings live in `.claude/docs/design-review-calibration.md`.
- **Severity is the output, not the finding count.** P0 blocks ship · P1 fix before release · P2 next iteration · P3 later · P4 note. Cap at the top 10 by severity unless a full audit was requested; a clean section reports "no issues found" — NEVER pad.
- **No time for a full pass?** Run §P (10 checks) — it catches the majority of serious defects.

---

## 0. Review Protocol

### 0.1 Before reviewing — gather context

Do not begin checks until these are known or explicitly marked `UNKNOWN`:

| Field                          | Why it matters                                                              |
| ------------------------------ | --------------------------------------------------------------------------- |
| Platform & usage profile       | Determines which conditional sections apply (§F web, §G mobile, §H expert/data-heavy use, §R input) |
| Primary user & expertise level | Novice-facing vs expert-facing changes density and shortcut expectations    |
| Primary task / job to be done  | Every check is judged against whether it helps or blocks this task          |
| Success metric                 | Conversion, task completion, retention, error rate                          |
| Constraints                    | Brand system, tech stack, regulatory, legacy, timeline                      |
| Review scope                   | Full product, one flow, one screen, one component                           |
| Review artifacts available     | Screenshots, live build, Figma, code, analytics, user research              |

If fewer than four of these are known, state the gap at the top of the report and mark affected findings as **low confidence**.

**Journey Report first.** When a Journey Report (`UX-1`, `.claude/docs/ux-journey-process.md`) exists for the surface, take the primary user, expertise, primary task and success metric from its actors, job statements and ranked main journeys instead of re-deriving them. The journey check itself is `UX-8` — walk every main journey on the surface and trace step → view → element → tier → rule → states; report an unserved step or orphan element once, under the ID the consuming skill already uses.

### 0.2 Agent conduct rules

1. **Evidence or nothing.** Every finding cites a specific location (screen name, element, file, line, coordinates). No finding may be inferred from a screen you did not see.
2. **Never invent measurements.** If you cannot measure contrast, tap-target size, or load time from the artifact given, mark the check `NOT VERIFIABLE` — do not guess a number.
3. **Distinguish fact from judgment.** Tag each finding `MEASURED`, `OBSERVED`, or `HEURISTIC`.
4. **Check the rule before applying it.** A convention violated deliberately for a good reason is not a defect. Ask before flagging when intent is unclear.
5. **No padding.** A clean section reports "no issues found." Do not manufacture findings to fill it.
6. **Prioritize ruthlessly.** Cap the report at the top 10 issues by severity unless a full audit was requested.
7. **Propose, don't just diagnose.** Every Critical and High finding needs a concrete recommended fix.

### 0.3 Severity rubric

| Level             | Definition                                                                     | Action             |
| ----------------- | ------------------------------------------------------------------------------ | ------------------ |
| **P0 — Critical** | Blocks task completion, causes data loss, or excludes a protected group        | Ship blocker       |
| **P1 — High**     | Significant friction, high error rate, or violates a legal accessibility floor | Fix before release |
| **P2 — Medium**   | Measurable inefficiency or inconsistency; degrades trust                       | Next iteration     |
| **P3 — Low**      | Polish, refinement, minor inconsistency                                        | Later              |
| **P4 — Note**     | Observation or opportunity, no defect                                          | Optional           |

**Severity vocabulary map — the single translation table.** Consumers speak different dialects; this table is authoritative for converting between them. Assign the consequence FIRST with the rubric above, then translate — never translate a label into a different consequence.

| This checklist | `ui-design --mode=review` category label | Sub-agent / fix-loop severity | `experience-review` round class |
| -------------- | -------------------------- | ----------------------------- | ------------------------------- |
| `P0`           | BLOCKED                    | Critical                      | BLOCKING                        |
| `P1`           | BLOCKED                    | High                          | BLOCKING                        |
| `P2`           | WARN                       | Medium                        | BLOCKING                        |
| `P3`           | WARN                       | Low                           | ADVISORY                        |
| `P4`           | — (note, no finding)       | — (note)                      | ADVISORY                        |

### 0.4 Status values

`PASS` · `FAIL` · `PARTIAL` · `N/A` · `NOT VERIFIABLE`

### 0.5 Surface scope and composition — review what renders, not what changed

A file is not a screen. Before running the section sweep on source code:

1. **Expand scope to affected surfaces.** Map every changed file to the pages/views/dialogs that render it (routing, parent composition, or the project's code graph). Review each affected surface WHOLE. A change to a global stylesheet, theme, token, or shared primitive affects every consumer — review a representative sample (the project's declared representative surfaces when configured, otherwise the highest-traffic consumers found) and state the sample.
2. **Reconstruct the composition.** Walk the component tree from the surface root down. For each node record where its effective styles come from: its own styles · ancestor layout context (flex/grid parent, overflow and clipping, positioning, stacking context) · global layers (reset, base, theme, tokens, utilities) · the style-scoping mode the project uses (scoped/module styles, shadow roots, global escapes). A defect is judged against the COMPOSED result, never a single file.
3. **Render when the surface can run.** Capture the surface at each supported viewport, the computed styles and boxes of every node a finding cites, and an automated accessibility scan when the project toolchain provides one. When it cannot run, record `ENVIRONMENT-BLOCKED` for the render and mark rendered-only claims (contrast, overlap, layout shift, target size) `NOT VERIFIABLE` — never estimate them.
4. **Cluster systemic defects.** The same defect on many surfaces is ONE finding naming every location (or the shared owner that causes it), ranked by its worst instance — so the top-10 cap never hides a pattern.

---

## A. Core Usability Heuristics

| ID  | Check                                                                                       | Failure signal                                                        | Default |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| A1  | System status is always visible — loading, saving, syncing, progress, connection            | Action occurs with no visible response within 1s                      | P1      |
| A2  | Language matches the user's world; no internal jargon, codes, or system errors surfaced raw | Labels like "Entity ID," "Null result," "Error 0x8007"                | P2      |
| A3  | Every flow has a visible exit, cancel, or back path                                         | User can enter a state with no way out but browser back / force quit  | P1      |
| A4  | Consistent terms, icons, layouts, and behaviors across the product                          | Same action labeled differently on two screens                        | P2      |
| A5  | Errors are prevented structurally, not just validated after                                 | Free-text field where a picker would eliminate the error class        | P2      |
| A6  | Options are shown, not recalled — no dependence on memory across steps                      | User must remember a code from step 2 to complete step 5              | P2      |
| A7  | Shortcuts and accelerators exist for repeat users                                           | Frequent multi-step task with no saved state, template, or shortcut   | P3      |
| A8  | Every element earns its place; no decorative clutter competing with the task                | Primary CTA competing with 4+ equally weighted elements               | P2      |
| A9  | Error messages state what happened, why, and the next step, in plain language               | "Something went wrong. Try again." with no recovery path              | P1      |
| A10 | Help is contextual and findable at the point of confusion                                   | Documentation exists only in a separate site with no in-product entry | P3      |
| A11 | Destructive actions are reversible or require deliberate confirmation                       | One-tap permanent delete with no undo                                 | P0      |
| A12 | The user, not the system, is in control — no unexpected auto-advance or forced paths        | Auto-submitting form, hijacked scroll, unskippable sequence           | P1      |

---

## B. Cognitive Load, Decision Design & Surface Complexity

| ID  | Check                                                                                      | Failure signal                                                               | Default |
| --- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------- |
| B1  | **Fitts** — primary targets are large and near the likely pointer/thumb origin             | Main CTA is small and in the hardest-to-reach corner                         | P2      |
| B2  | **Hick** — choices are chunked, staged, or defaulted; no undifferentiated long lists       | 12+ equal-weight options presented simultaneously at a decision point        | P2      |
| B3  | **Miller** — grouped items stay within ~5–9 per cluster                                    | Navigation with 15 flat, ungrouped items                                     | P2      |
| B4  | **Jakob** — conventional patterns behave conventionally                                    | Logo doesn't link home; hamburger opens something unexpected                 | P2      |
| B5  | **Tesler** — unavoidable complexity is absorbed by the system, not pushed to the user      | User asked to compute, format, or reformat something the system could derive | P2      |
| B6  | **Doherty** — interactions meet the product/platform response expectation or show progress | Perceptible dead time with no feedback                                       | P1      |
| B7  | **Von Restorff** — exactly one element per view is visually dominant                       | Three "primary" buttons on one screen                                        | P2      |
| B8  | **Peak–End** — flow endings are satisfying and clearly closed                              | Successful submission ends on a blank screen with no confirmation            | P2      |
| B9  | **Goal-gradient / Zeigarnik** — multi-step flows show progress and remaining effort        | Unbounded wizard with no step count                                          | P2      |
| B10 | **Pareto** — the top 20% of features get the most prominent placement                      | Rarely used admin action occupies prime real estate                          | P3      |
| B11 | Reading level and information density suit the audience                                    | Dense expert jargon in a consumer onboarding flow                            | P2      |
| B12 | **Surface load fits the task** — each view shows the information and inputs its primary task needs NOW; the rest is deferred, derived, or linked | One view asks for everything the record could ever hold, most of it irrelevant to the task at hand | P1      |
| B13 | **Progressive disclosure** — secondary, rare, or expert detail is revealed on demand, not shown by default | Every optional section expanded by default; the primary path is buried beneath it | P2      |
| B14 | **One job per view** — a view serves one primary task; alternate entry modes are separate, clearly chosen paths | Upload, paste, pick-existing, and manual entry all presented at once in one view | P2      |
| B15 | **Complexity budget respected** — counts of inputs per step, sections per view, and equal-weight actions per view stay within the project's declared budget, or the excess is justified by the primary user's expertise | Budget declared at 12 inputs per step; the step shows 31 with no stated reason | P2      |

---

## C. Visual Design & Hierarchy

| ID  | Check                                                                                             | Failure signal                                                           | Default |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- |
| C1  | Visual hierarchy matches task priority — the most important thing looks most important            | Eye lands on a banner before the primary action                          | P2      |
| C2  | Alignment is systematic; elements share edges and a consistent grid                               | Ragged left edges, off-grid components, inconsistent gutters             | P3      |
| C3  | Spacing follows a scale (e.g. 4/8pt) and is applied consistently                                  | Arbitrary values: 13px here, 17px there                                  | P3      |
| C4  | Proximity groups related items and separates unrelated ones                                       | Label sits closer to the wrong input than its own                        | P2      |
| C5  | Type styles and weights are limited, intentional, and consistent with the project's design system | Unrelated type treatments compete within one surface                     | P3      |
| C6  | Text width, size, and line spacing support comfortable reading for the audience and platform      | Long lines or tight spacing make content difficult to follow             | P2      |
| C7  | Color is systematic and semantic — success/warning/error/info are consistent                      | Red used both for errors and for a brand accent                          | P2      |
| C8  | White space is used deliberately; no wall-to-wall density without reason                          | Zero breathing room around dense content blocks                          | P3      |
| C9  | Elevation/shadow/layering communicates real hierarchy, not decoration                             | Random shadow depths with no z-order logic                               | P3      |
| C10 | Iconography is consistent in style, weight, grid, and metaphor                                    | Mixed outline and filled icons in one toolbar                            | P3      |
| C11 | Imagery is purposeful, optimized, and consistent in treatment                                     | Generic stock photos with mismatched crops and color                     | P3      |
| C12 | Gestalt principles are respected — grouping, similarity, closure, common region read correctly    | Card boundaries imply grouping that contradicts the actual relationships | P2      |
| C13 | Brand expression is present but never at the cost of clarity                                      | Custom styling makes a button unrecognizable as a button                 | P2      |

---

## D. Interaction & State Design

| ID  | Check                                                                                                                                                                | Failure signal                                                                   | Default |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| D1  | Applicable interaction states are clear for the supported inputs: default, focus/hover where available, active, disabled, loading, error, selected                   | A supported input has no clear state feedback                                    | P1      |
| D2  | Relevant states are handled for the surface and its supported capabilities: ideal, empty, first-run, loading, partial, error, offline, or maximum-data as applicable | An applicable empty or error state has no useful content                         | P1      |
| D3  | Empty states explain what belongs there and offer the action to fill it                                                                                              | "No results" with no suggestion or reset                                         | P2      |
| D4  | Loading uses skeletons or optimistic UI, not spinners on full pages                                                                                                  | 4-second full-page spinner                                                       | P2      |
| D5  | Affordances are unambiguous — clickable looks clickable, disabled looks disabled                                                                                     | Flat text that is secretly a link; disabled state indistinguishable from enabled | P1      |
| D6  | Feedback is immediate and proportional to the action                                                                                                                 | Save with no confirmation of any kind                                            | P1      |
| D7  | Animation is purposeful, platform-appropriate, and respects the user's motion settings                                                                               | Decorative motion delays or obscures the task                                    | P3      |
| D8  | `prefers-reduced-motion` is respected                                                                                                                                | Parallax and large motion play regardless of OS setting                          | P1      |
| D9  | Destructive actions have undo (preferred) or confirmation naming the consequence                                                                                     | "Are you sure?" with no statement of what is lost                                | P1      |
| D10 | Work in progress is preserved — autosave, draft recovery, state restoration                                                                                          | Navigating away silently discards 10 minutes of input                            | P0      |
| D11 | Smart defaults are pre-selected for the most common case                                                                                                             | Every field blank when 90% of users pick the same value                          | P2      |
| D12 | Direct manipulation where natural — drag, resize, inline edit                                                                                                        | Requires a modal round-trip to change one value                                  | P3      |
| D13 | No dead ends: every error, empty, and edge state offers a forward path                                                                                               | 404 with no navigation or search                                                 | P1      |

---

## E. Information Architecture, Navigation & Container Fit

| ID  | Check                                                                               | Failure signal                                                     | Default |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------- |
| E1  | Current location is always indicated                                                | No active-state highlighting in navigation                         | P2      |
| E2  | Labels are predictive — users can guess the destination content                     | Vague labels: "Solutions," "More," "Resources"                     | P2      |
| E3  | Categories are mutually exclusive and collectively exhaustive                       | Items that plausibly belong in three sections                      | P2      |
| E4  | Primary tasks are reachable in ≤3 deliberate steps                                  | Core action buried 5 levels deep                                   | P2      |
| E5  | Search exists where content volume demands it, with filters and a useful zero-state | Search returns "0 results" with no suggestions or query relaxation | P2      |
| E6  | Hierarchy depth is shallow and breadth is chunked                                   | 8-level nested menu                                                | P2      |
| E7  | Back/breadcrumb behavior is predictable and matches platform expectations           | Back exits the app from mid-flow                                   | P1      |
| E8  | Naming is consistent between navigation label, page title, and heading              | Nav says "Billing," page says "Payments"                           | P3      |
| E9  | **Container fits the task** — a dialog holds a short, focused, interrupting task; long or multi-section entry gets a full view or a stepped flow; supporting detail beside ongoing work gets a side panel; single-value edits stay inline | A long multi-section form inside a scrolling dialog | P1      |
| E10 | Containers do not nest or trap — no dialog on top of a dialog, no scroll area inside a scrolling dialog, primary actions stay reachable without scrolling | The save button of a dialog is reachable only after scrolling through its whole body | P2      |
| E11 | Dismissing a container with unsaved input is protected — autosave, a draft, or a confirmation that names what will be lost | Clicking outside the dialog silently discards 20 filled fields | P1      |

---

## F. Web-Specific _(apply only if platform includes web)_

| ID  | Check                                                                                                             | Failure signal                                        | Default |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------- |
| F1  | Usable across the project's supported viewport range with no unintended clipping or horizontal scroll             | Layout breaks at a required supported size            | P1      |
| F2  | Core content and primary action work without JavaScript or on slow networks                                       | Blank page until a 2MB bundle loads                   | P2      |
| F3  | Measure applicable Core Web Vitals against the product's declared performance budget or selected current guidance | Content shifts after load, causing misclicks          | P1      |
| F4  | Value proposition and primary action are clear in the first viewport                                              | User must scroll to learn what the product does       | P2      |
| F5  | Semantic HTML: one h1, logical heading order, landmarks, lists, native buttons/links                              | `<div onclick>` used as a button                      | P1      |
| F6  | Links navigate, buttons act — and each looks like what it is                                                      | "Button" that changes the URL, or a link that submits | P2      |
| F7  | Forms: single column, top-aligned labels, correct `type` and `autocomplete`, inline validation on blur            | Validation fires per keystroke or only on submit      | P2      |
| F8  | URLs are readable, stable, shareable, and reflect state where appropriate                                         | Filtered view cannot be shared or bookmarked          | P3      |
| F9  | Page titles, meta descriptions, alt text, and structured data are present and accurate                            | Duplicate or missing `<title>` across pages           | P3      |
| F10 | Scanning pattern supported (F-pattern for content, Z for landing)                                                 | Key information placed where no one looks             | P3      |
| F11 | Works in the browsers and versions the project supports                                                           | Feature silently fails in a supported browser         | P1      |
| F12 | Dark mode and forced-colors mode render legibly if supported                                                      | Text disappears in dark mode                          | P2      |

---

## G. Mobile-Specific _(apply only if platform includes iOS/Android)_

| ID  | Check                                                                                      | Failure signal                                              | Default |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------- |
| G1  | Touch targets and spacing meet the target OS, accessibility standard, and project guidance | Adjacent targets are difficult to operate                   | P1      |
| G2  | Primary actions sit within the natural thumb arc; destructive actions do not               | Main CTA in the top-left corner                             | P2      |
| G3  | One-handed use is possible for core tasks                                                  | Reaching the send button requires two hands                 | P2      |
| G4  | Safe areas respected — notch, dynamic island, home indicator, rounded corners              | Content hidden behind the gesture bar                       | P1      |
| G5  | Platform conventions followed (HIG / Material) for navigation, sheets, back behavior       | Android hardware/gesture back does nothing or exits the app | P1      |
| G6  | Offline and poor-connectivity behavior is designed: cached, queued, communicated           | Infinite spinner on airplane mode                           | P1      |
| G7  | Permissions requested just-in-time with a plain rationale, never all at launch             | Location + contacts + notifications prompt on first open    | P1      |
| G8  | Notifications are relevant, timed, batched, and user-controllable                          | Daily marketing push with no granular settings              | P2      |
| G9  | Rotation and multitasking preserve state                                                   | Rotating clears the form                                    | P1      |
| G10 | Onboarding is short, skippable, and demonstrates value before asking for anything          | 6 mandatory screens before any use                          | P2      |
| G11 | Gestures are discoverable and never the only path to a function                            | Swipe-only delete with no visible alternative               | P2      |
| G12 | Respects OS text size, bold text, and reduced motion settings                              | Layout breaks at largest Dynamic Type setting               | P1      |
| G13 | Cold start and time-to-first-meaningful-screen are acceptable (<2s target)                 | 5s splash on every launch                                   | P2      |
| G14 | Haptics are meaningful and sparing                                                         | Haptic on every scroll tick                                 | P3      |
| G15 | Deep links resolve correctly and preserve back stack                                       | Deep link opens home instead of the target                  | P2      |

---

## H. Expert, Data-Heavy & Enterprise Use _(apply when the primary users are repeat/expert users or the surface is data-heavy — regardless of platform; H7–H9 and H11 apply to desktop apps only)_

A back-office web app, an admin console, and an installed desktop tool share these needs; the platform does not decide them, the usage does. Record the usage profile from §0.1 and state why §H applies or not.

| ID  | Check                                                                                   | Failure signal                                              | Default |
| --- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------- |
| H1  | Full keyboard operability: logical tab order, visible focus, no traps                   | Modal cannot be closed or navigated by keyboard             | P1      |
| H2  | Shortcuts for frequent actions, discoverable in menus/tooltips                          | Power task requires 6 mouse clicks with no shortcut         | P2      |
| H3  | Information density matches expert needs — not artificially spacious                    | Data table showing 4 rows per screen for a monitoring tool  | P2      |
| H4  | Bulk operations: multi-select, select-all, batch actions                                | 200 items must be deleted one at a time                     | P1      |
| H5  | Large datasets handled via virtualization, pagination, or lazy loading                  | UI freezes at 10k rows                                      | P1      |
| H6  | Long operations are non-blocking, with progress and cancel                              | Modal spinner locks the app for 30s with no cancel          | P1      |
| H7  | Window state, layout, and session position are restored on reopen                       | App reopens at defaults every time                          | P2      |
| H8  | OS conventions honored (menu bar, ribbon, native dialogs, drag & drop)                  | Custom file picker instead of the system one                | P3      |
| H9  | Right-click context menus provide relevant advanced actions                             | No context menu anywhere                                    | P3      |
| H10 | Permissions and roles are reflected clearly — hidden or explained, not silently failing | Button visible but silently does nothing without permission | P1      |
| H11 | Multi-window / multi-monitor / resize behavior is sane                                  | Layout breaks below a certain window width with no reflow   | P2      |
| H12 | Tables prioritize columns by task — the identifying and deciding columns lead; secondary columns can be hidden or reordered | Twelve equal-width columns; the record name is truncated to make room for audit dates | P2      |
| H13 | Sort, filter, search, and paging state survives navigation away and back, and is visible (active filters shown and clearable) | Opening a row and returning resets the filtered, sorted list to page 1 | P2      |
| H14 | Row-level and bulk actions are distinct and discoverable; the bulk action names the count it affects | "Delete" applies to 37 hidden selected rows with no count shown | P1      |
| H15 | Zero-result and filtered-empty states distinguish "nothing exists" from "nothing matches" and offer the way back | "No data" shown after a filter, with no hint that a filter is active | P2      |

---

## I. Accessibility (apply the governing standard)

Resolve the applicable law, project policy, and platform accessibility standard from project references and evidence; record its name, version/level, and source. The numeric criteria below describe WCAG 2.2 AA where marked and apply only when that standard governs the relevant surface. For other standards or modalities, use their corresponding criteria. Default severities are guidance; follow the project's release contract. Failures blocking task completion may be **P0**.

| ID  | Check                                                                                                                           | Failure signal                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| I1  | Text contrast ≥4.5:1 (normal), ≥3:1 (large ≥18.66px/24px); UI components and graphics ≥3:1                                      | Light gray placeholder text at 2.8:1                        |
| I2  | Meaning is never conveyed by color alone                                                                                        | Required fields marked only in red                          |
| I3  | All functionality is keyboard-operable with no traps                                                                            | Custom dropdown unreachable by keyboard                     |
| I4  | Focus indicator is always visible and has sufficient contrast                                                                   | `outline: none` with no replacement                         |
| I5  | All images, icons, and media have appropriate text alternatives; decorative images are hidden                                   | Icon-only button with no accessible name                    |
| I6  | Form inputs have programmatically associated labels; errors are announced                                                       | Placeholder used as the only label                          |
| I7  | Heading structure is logical and sequential                                                                                     | Skips from h1 to h4; headings used for styling              |
| I8  | ARIA used only where native semantics fall short, and used correctly                                                            | `role="button"` on a `<div>` with no keyboard handler       |
| I9  | Content reflows at the zoom, viewport, and text-scaling levels required by the applicable standard and platform                 | Required content is lost or unusable at a supported setting |
| I10 | Motion, autoplay, and flashing respect user settings; nothing flashes >3×/sec                                                   | Autoplaying video with sound                                |
| I11 | Time limits are adjustable, extendable, or absent                                                                               | Session expires mid-form with no warning                    |
| I12 | Screen reader pass completed on the primary flow (VoiceOver / TalkBack / NVDA)                                                  | Not tested                                                  |
| I13 | Touch/pointer alternatives exist for complex gestures; drag has a non-drag path                                                 | Reorder possible only by drag                               |
| I14 | Interactive targets meet the applicable standard and platform target-size guidance (WCAG 2.2 examples apply only when selected) | Dense controls are difficult to activate                    |
| I15 | Dialogs and overlays manage focus: focus moves in on open, stays within while modal, Escape (or the platform equivalent) closes, focus returns to the trigger on close, the background is inert and has an accessible name | Tabbing from an open dialog lands on the page behind it |
| I16 | View changes that do not reload the page move focus to, or announce, the new content                                          | After in-app navigation, a screen reader is still reading the previous view |

---

## J. Content & UX Writing

| ID  | Check                                                                                              | Failure signal                                         | Default |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------- |
| J1  | Buttons name the action and its outcome                                                            | "OK" / "Submit" where "Save changes" is clearer        | P3      |
| J2  | Key information is front-loaded in headings and first sentences                                    | Value buried in paragraph 3                            | P2      |
| J3  | Terminology is consistent across UI, docs, and support                                             | Same object called "project," "workspace," and "board" | P2      |
| J4  | Error copy is specific, blameless, and actionable                                                  | "Invalid input"                                        | P1      |
| J5  | Tone is consistent and appropriate to context — never jokey during failure or data loss            | Playful copy on a payment failure                      | P2      |
| J6  | Copy is localization-ready: no concatenated strings, room for ~30% text expansion, RTL-safe layout | Fixed-width button that clips German text              | P2      |
| J7  | Numbers, dates, currency, and units are formatted per locale                                       | US date format shown to EU users                       | P3      |
| J8  | Reading level appropriate; sentences short; active voice                                           | Legalese in a consumer flow                            | P3      |

---

## K. Trust, Ethics & Privacy

| ID  | Check                                                                                                              | Failure signal                                           | Default |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------- |
| K1  | No dark patterns: confirmshaming, roach motel, forced continuity, hidden costs, disguised ads, preselected upsells | "No thanks, I hate saving money"                         | P0      |
| K2  | Cancellation and deletion are as easy as signup                                                                    | Signup in-app, cancellation by phone only                | P0      |
| K3  | Total cost is visible before commitment                                                                            | Fees appear only on the final step                       | P1      |
| K4  | Consent is opt-in, granular, and honestly defaulted                                                                | Pre-ticked marketing consent                             | P0      |
| K5  | Data collection is minimal and its purpose is explained at point of collection                                     | Phone number required with no stated reason              | P1      |
| K6  | Urgency and scarcity claims are truthful                                                                           | Fake countdown that resets on reload                     | P0      |
| K7  | Automation and AI-generated content are disclosed, explainable, and overridable                                    | AI decision presented as fact with no source or override | P1      |
| K8  | Sensitive actions (payment, sharing, permissions) show clear consequence before confirming                         | Share button that silently makes content public          | P0      |
| K9  | Engagement mechanics don't exploit attention by default                                                            | Infinite scroll + autoplay + streaks with no controls    | P2      |
| K10 | Every visible control works end to end, or is hidden / explicitly marked unavailable; no development-status copy reaches users | An upload control beside the note "parsing is not connected yet" | P1      |

---

## L. AI & Agentic Interface Patterns _(apply if the product includes AI features)_

| ID  | Check                                                                                       | Failure signal                                         | Default |
| --- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------- |
| L1  | AI-generated output is visually and textually distinguishable from user or verified content | Model output styled identically to authoritative data  | P1      |
| L2  | Confidence and uncertainty are communicated; the system doesn't assert what it doesn't know | Hedge-free answers on low-confidence outputs           | P1      |
| L3  | Sources and reasoning are inspectable where the output is consequential                     | Claim with no citation or trace                        | P1      |
| L4  | User can edit, regenerate, reject, or roll back any AI action                               | One-way AI edit applied directly to user data          | P0      |
| L5  | Autonomous actions require proportional consent — higher stakes, more explicit approval     | Agent sends email or spends money without confirmation | P0      |
| L6  | Streaming/long-running responses show progress and are interruptible                        | No stop button during a 60s generation                 | P1      |
| L7  | Capability boundaries are set upfront; failure is graceful and honest                       | Confident fabrication instead of "I can't do that"     | P1      |
| L8  | Input affordances teach what to ask — examples, suggestions, scoped prompts                 | Bare text box with no guidance                         | P2      |
| L9  | Latency is masked with useful interim feedback, not a bare spinner                          | Blank state for 15s                                    | P2      |
| L10 | Data handling is disclosed: what is sent, retained, and used for training                   | No statement anywhere                                  | P1      |
| L11 | Undo/audit trail exists for agent-taken actions                                             | No record of what the agent changed                    | P1      |
| L12 | Graceful handoff to a human or deterministic path when the AI fails                         | Dead end after two failed attempts                     | P2      |

---

## M. Cross-Cutting Consistency & System Health

| ID  | Check                                                                                                                                           | Default |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| M1  | Components come from a design system; one-off variants are justified                                                                            | P3      |
| M2  | Design tokens (color, spacing, type, radius, motion) are used rather than hard-coded values                                                     | P3      |
| M3  | The same task feels the same across web, mobile, and desktop where the user crosses platforms                                                   | P2      |
| M4  | Patterns are internally consistent: same modal type for same purpose, same table behavior everywhere                                            | P2      |
| M5  | New work doesn't fork existing patterns without a documented reason                                                                             | P3      |
| M6  | UI code has clear ownership using the project's documented component/module organization, or evidenced local boundaries when none is documented | P2      |
| M7  | Existing components and abstractions are reused or composed when they fit; a meaningful deviation names its constraint                          | P2      |
| M8  | Shared behavior has an appropriate owner; duplication is consolidated when doing so reduces real maintenance cost                               | P2      |
| M9  | Tests cover reusable behavior and surface composition according to the project's test organization and capabilities                             | P2      |

---

## R. Forms & Data Entry _(apply when the surface collects input)_

Placed after §M in the sweep; the ID letter is new, not a reordering. Before judging, build the **Field Necessity Matrix** — one row per input, so every judgment below cites a row instead of an impression:

| Field | Needed at THIS step? (why) | Who consumes it, and when | Required / optional | Default or derivable? | Group | Verdict (keep · defer · derive · default · drop) |
| ----- | -------------------------- | ------------------------- | ------------------- | --------------------- | ----- | ------------------------------------------------- |

| ID  | Check                                                                                                                      | Failure signal                                                                  | Default |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| R1  | Every input has a reason to exist at this step; inputs no consumer needs yet are deferred to a later step or the record's own edit view | A creation form collects social handles and marital status nobody reads at creation | P1      |
| R2  | "Create minimal, enrich later" — creation asks for the smallest set that makes a valid, useful record; enrichment happens in context afterwards | A record cannot be saved until 25 non-essential fields are filled | P1      |
| R3  | Required and optional inputs are visibly separated or marked consistently; optional sections can be collapsed or skipped | Required and optional fields interleaved, with only a tiny asterisk to tell them apart | P2      |
| R4  | Inputs are grouped by the user's mental model (who / how to reach / what they bring), each group short enough to scan | One flat "Identity" group of 14 unrelated inputs | P2      |
| R5  | Conditional inputs appear only when their condition holds                                                                  | Spouse details shown before marital status is chosen | P2      |
| R6  | Derivable or knowable values are derived, defaulted, or pre-filled (from the source document, the account, locale, prior entries) — never retyped | Birth year AND date of birth asked separately; country retyped although location was selected | P2      |
| R7  | Long entry offers a way to not lose progress — autosave, a draft, or a stepped flow with saved steps                       | A 40-input form lost on an accidental close | P1      |
| R8  | Validation on submit summarizes the errors, links or moves focus to the first invalid input, and keeps all entered values  | Submit fails with a generic banner at the top while the invalid input is off-screen | P1      |
| R9  | Input layout supports scanning and completion order — one reading order, labels bound to inputs, no side-by-side pairs that are unrelated | Two columns whose left/right pairs have nothing in common, so the tab order zigzags | P2      |
| R10 | Example values are recognizably examples, never mistakable for entered data or for a label                                 | Placeholder shows a realistic full name that users believe is already filled in | P2      |

---

## N. Edge Cases to Deliberately Probe

Select probes that match the product's supported capabilities, platform, user risks, and declared operating limits. Record results for applicable probes; mark unsupported conditions `N/A` with evidence and missing observations `NOT VERIFIABLE`.

- First-time user, zero data
- Maximum supported data volume and field/attachment limits, as declared by the project
- Zero results after filtering
- Slow or intermittent network, where the surface depends on network access
- Offline/reconnect behavior, where offline use is supported or promised
- A relevant service failure, using the failure classes this system exposes
- Expired session or revoked permission mid-task
- Duplicate submission / double-tap on the primary action
- Interruption or backgrounding supported by the target platform
- Copy/paste and autofill for fields that support them
- Largest supported text scale and required zoom/reflow settings
- Keyboard and assistive-technology operation for supported input modes
- RTL and long-translation locales when supported
- Concurrent edits when the product supports shared editing

---

## O. Report Output Format

The agent returns exactly this structure. When more than one surface is in scope, write ONE file per surface (page/view/dialog) and one per shared component that carries findings, each in this shape, plus an index that rolls them up — the consuming skill names the paths. Append each surface's record as it is completed; never hold findings for a final batch write.

```markdown
# Design Review — [Product / Flow] — [Date]

## Context

Platform · Usage profile · Users · Primary task · Artifacts reviewed · Scope
Surfaces in scope: [surface → changed files that render into it]
Known gaps: [what was unavailable, and which findings are therefore lower confidence]

## Composition (per surface, source-code reviews)

Component tree (root → leaves) · style origin per node (own · ancestor layout/stacking context · global/theme/reset · scoping mode) · render evidence (captures per viewport, computed values cited, automated scan) or `ENVIRONMENT-BLOCKED`

## Surface load (per surface with input)

Task effort trace (steps · inputs · decisions on the primary path) · Field Necessity Matrix (§R) · container choice and why (§E9) · budget status (§B15)

## Verdict

[Ship / Ship with fixes / Do not ship] — one paragraph of reasoning.

## What works

2–4 specific strengths worth preserving. Cite locations.

## Findings

### P0 — Critical

**[ID] Title**

- Location: [screen / element / file:line — a systemic finding lists every location or names the shared owner that causes them]
- Evidence: [what was observed] — [MEASURED | OBSERVED | HEURISTIC]
- Impact: [who is affected, and how]
- Principle: [checklist ID]
- Fix: [specific, implementable recommendation]

### P1 — High

[same structure]

### P2 — Medium

[same structure, may be condensed to one line each]

### P3 — Low

[bulleted list]

## Open questions for the team

[Where intent was unclear and a finding was withheld]

## Coverage

| Section      | Checked | Passed | Failed | Not verifiable |
| ------------ | ------- | ------ | ------ | -------------- |
| A Heuristics | 12      |        |        |                |
| B Cognitive  | 15      |        |        |                |
| E IA & fit   | 11      |        |        |                |
| R Forms      | 10      |        |        |                |
| ...          |         |        |        |                |
```

---

## P. Quick Triage Pass (10 minutes)

When a full review isn't possible, run only these. They catch the majority of serious defects.

1. Can the intended user complete the primary task — without wading through information, inputs, or entry modes the task does not need, in a container that fits it? _(A, E, B12, E9, R1)_
2. Does each action give timely feedback against the product/platform expectation, or show progress? _(A1, B6, D6)_
3. Do the relevant empty, loading, error, and recovery states offer a forward path? _(D2, D13)_
4. Is the primary action obvious and reachable using supported inputs? _(B7, C1, G2)_
5. Does text and focus meet the governing accessibility standard? _(I1, I4)_
6. Can the flow be completed with supported input and assistive-technology modes? _(I3, H1)_
7. Do interactive targets meet applicable platform and accessibility guidance? _(G1)_
8. Is destructive action reversible where appropriate? _(A11, D9, D10)_
9. Does it work at the smallest supported size and required zoom/reflow? _(F1, I9)_
10. Are there any dark patterns? _(K1–K8)_

---

## Q. Scoring (optional)

Per section: `score = passed / (checked − N/A − not verifiable)`.

Weight for an overall figure:

| Section                    | Weight |
| -------------------------- | ------ |
| I Accessibility            | 20%    |
| A Heuristics               | 15%    |
| D Interaction & states     | 15%    |
| K Ethics & trust           | 12%    |
| B Cognitive load + R forms | 10%    |
| E Information architecture | 8%     |
| Platform section (F/G/H)   | 8%     |
| C Visual design            | 6%     |
| J Content                  | 4%     |
| M Consistency              | 2%     |

Any P0 caps the overall grade at **Fail**, regardless of score. Report the score alongside findings, never instead of them — a number without evidence is not a review.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a repeatable, evidence-backed front-end review whose findings are ranked by real severity — every one carrying location, observation tag, impact, checklist ID, and fix.

**IMPORTANT MUST ATTENTION** gather §0.1 context FIRST (platform, user, task, metric, constraints, scope, artifacts). Fewer than four known → state the gap at the top and mark affected findings **low confidence** — why: a check judged against an unknown task is a guess wearing an ID.

**IMPORTANT MUST ATTENTION** walk the sections in order: §0.5 surface scope & composition → §A heuristics → §B cognitive & surface complexity → §C visual → §D relevant interaction states → §E IA & container fit → §F/§G (platform-conditional) and §H (usage-conditional) → §I against the governing accessibility standard → §J content → §K ethics → §L AI (conditional) → §M consistency → §R forms (input-conditional) → §N applicable edge-case probes → §O report → §P triage → §Q scoring — why: a section skipped in the long middle silently becomes an unreported defect class.

**IMPORTANT MUST ATTENTION** evidence or nothing — cite a location for every finding, and NEVER invent a measurement. Unmeasurable from the given artifact → `NOT VERIFIABLE`, and tag every finding `MEASURED` / `OBSERVED` / `HEURISTIC`.

**IMPORTANT MUST ATTENTION** apply this checklist ONLY to changes with a user-facing front-end surface — a back-end-only diff is `N/A`, stated once. NEVER pad a clean section; report "no issues found" and cap at the top 10 by severity unless a full audit was asked for.

**IMPORTANT MUST ATTENTION** propose a concrete fix for every P0 and P1 — a diagnosis without a remedy is half a review.

**IMPORTANT MUST ATTENTION** report a defect ONCE — where a check here restates a `UI-*` or `DD-*` clause, use whichever ID the consuming skill already uses; NEVER emit two findings for one defect.

**Anti-Rationalization:**

| Evasion                                                     | Rebuttal                                                                                                                |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| "I can't measure contrast from a screenshot, I'll estimate" | That is `NOT VERIFIABLE`. An invented number is a fabricated finding — the one failure this protocol exists to prevent. |
| "The section had nothing wrong, I'll skip reporting it"     | Report "no issues found." A silent section is indistinguishable from an unchecked one.                                  |
| "This deviates from the checklist, so it's a defect"        | Check intent first — project design-system docs and ADRs outrank this file. A documented convention is not a defect.    |
| "I found 30 issues, I'll list them all"                     | Cap at the top 10 by severity. An unranked list moves no decision.                                                      |
| "It's a small diff, the checklist is overkill"              | Then run §P — 10 checks. Small diffs ship P0s too.                                                                      |
| "Every changed file looks fine on its own"                  | Files do not render; surfaces do. Apply §0.5 — an overloaded page is built from individually reasonable diffs.          |
| "The form is long, but every field is technically valid"    | Valid is not needed. Fill the §R Field Necessity Matrix — a field with no consumer at this step is a finding.           |
