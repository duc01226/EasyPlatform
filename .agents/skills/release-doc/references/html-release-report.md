# HTML Release Report — Canonical Procedure (R1–R9)

The **single source of truth** for the rich, standalone HTML release presentation. Owned by `release-doc` (Step 6, default-on). Never duplicate this procedure into a skill body — link to it.

**What this produces:** ONE self-contained, offline, professional HTML file that tells **a real user of the product** what's new and what changed in a release, and — when the release touched a user-facing surface — **renders faithful mock-ups of the real screens** using the project's real design tokens, real component patterns, and real domain field names.

**Non-negotiable order:** comprehend the whole change set (R1) → investigate each feature end-to-end (R2) → correlate specs (R3) → detect + inventory UI (R4) → **write the temp analysis report (R5)** → assemble HTML from that report (R6) → save (R7) → gates (R8) → auto-open (R9).

> **[BLOCKING] R5 before R6.** The HTML is assembled **from the temp report**, never straight from a diff or from memory. An HTML file produced without a written temp report is a protocol failure — regenerate. — why: the report is external memory; a large diff overflows context and the deck silently degrades into invented claims.

> **[BLOCKING] The HTML is a USER-FACING release announcement, not an engineering report.** Its reader is the person who USES the product, not the person who built it. Full contract: **R6.0**. The engineering view is not lost — it lives in the markdown release notes (the skill's other output) and in the collapsed §7/§8/§9 of this document. — why: a release page padded with refactors and class names buries the two or three things the user actually gained.

> **[BLOCKING] Quality goal: the HTML is beautiful, easy to read and easy to understand.** A reader who scrolls the first screen knows what changed for them and what, if anything, they must do; every highlight after that is understood from its picture plus a few plain sentences. Accurate content in a page that is hard to scan still fails. Full contract: **R6.5**; gate: **R8.4**. — why: nobody reads a wall of correct text, so an unreadable page ships no information.

---

<!-- SKILL-NAV:START -->
## Contents

- [R0. Preconditions](#r0-preconditions)
- [R1. Comprehend the WHOLE change set first (breadth before depth)](#r1-comprehend-the-whole-change-set-first-breadth-before-depth)
- [R2. Investigate each highlight END-TO-END (depth, one highlight at a time)](#r2-investigate-each-highlight-end-to-end-depth-one-highlight-at-a-time)
- [R3. Correlate SPEC changes (canonical behavior, not just code)](#r3-correlate-spec-changes-canonical-behavior-not-just-code)
- [R4. Detect UI change + \[BLOCKING\] inventory the REAL existing UI](#r4-detect-ui-change--blocking-inventory-the-real-existing-ui)
- [R5. \[BLOCKING\] Write the temp analysis report — BEFORE any HTML](#r5-blocking-write-the-temp-analysis-report--before-any-html)
- [R6. Assemble the standalone HTML release document](#r6-assemble-the-standalone-html-release-document)
- [R7. Save](#r7-save)
- [R8. \[BLOCKING\] Gates — run ALL FOUR before reporting done](#r8-blocking-gates--run-all-four-before-reporting-done)
- [R9. Auto-open the HTML](#r9-auto-open-the-html)
- [R10. Report to the user](#r10-report-to-the-user)
- [Closing Reminders](#closing-reminders)

<!-- SKILL-NAV:END -->

## R0. Preconditions

| Input                     | Where it comes from                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Changes target**        | the scope resolved in Step 0 — refs, `--range`, or a `--days`/`--since` time window                              |
| **Git artifacts on disk** | Step 0b dumps (`git-log-*.txt`, `diff-file-status-*.txt`, `diff-stat-*.txt`, `git-diff-*-full.txt`)              |
| **Categorized changes**   | Step 2 `categorize-commits.cjs` JSON · Step 3b thematic area map                                                  |
| **Canonical specs**       | the business spec root (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides) when the project has them |
| **Design context**        | design-system docs discovered per R4.2                                                                            |

If the git artifacts are not yet on disk, STOP and run the owning skill's dump step first. **Never read a full range diff into context.**

Create one todo tracking todo per R-stage plus one per **release highlight** identified in R1.4, so each highlight is investigated (R2), written to the temp report (R5), rendered (R6), and verified (R8) individually.

---

## R1. Comprehend the WHOLE change set first (breadth before depth)

> **[BLOCKING] Do not open a single feature until the whole change set is mapped.** Diving into the first interesting commit is the nearest-attention trap; it produces a release doc that over-reports one area and silently omits the rest.

1. **Read the file-status artifact end to end** — `diff-file-status-{PERIOD}.txt`. Every `A`/`M`/`D`/`R` line is in scope until you have consciously excluded it. Record the exclusions.
2. **Read the commit log artifact** — `git-log-{PERIOD}.txt`. Extract per commit: hash · type/scope · subject · `BREAKING CHANGE` marker · body rationale.
3. **Build the change map** — one row per changed area:

    | Area / module | Files (A/M/D) | Net lines | Owning commits | Surface (UI · API · CLI · data · docs · internal) | User-visible? |
    | ------------- | ------------- | --------- | -------------- | ------------------------------------------------- | ------------- |

    Reuse the Step 3b thematic area map when one was built; otherwise derive `Area` from `docs/project-config.json` modules — never from guesswork, and never as a second divergent grouping.

4. **Rank into release highlights** — select the changes a reader actually cares about, in this order: **breaking changes → new user-facing capability → changed user-facing behavior → notable fixes → performance → internal/tooling**. A highlight is a *user-meaningful outcome*, not a commit. Merge N commits that deliver one outcome into ONE highlight; split one commit that delivers two unrelated outcomes into two.
    **4b — apply the observability filter, one verdict per highlight.** Ask of each: *would a person who uses this product, and never reads its code, notice this?*

    - **`USER-VISIBLE`** — a new capability, a changed screen or flow, a fix whose symptom they felt, a speed-up they can perceive, an action they must now take. Eligible for the HTML's narrative sections (§2/§4/§5/§6).
    - **`INTERNAL`** — refactors, renames, tests, CI, build, tooling, dependency bumps, type/lint changes, doc-only edits, logging/metrics plumbing. **Never** enters §2/§4/§5/§6; it is carried, one line each, into the collapsed §7 "Under the Hood".

    Record the verdict in the temp report's §2 table. `INTERNAL` is a routing decision, not a deletion — the work is still reported, just where an engineer looks for it. Do NOT reword an internal change into invented user value to promote it; an honest §7 line beats a fabricated feature.

5. **Cross-check coverage** — every `A`/`D` file and every `BREAKING CHANGE` commit maps to a highlight or to a written exclusion reason. An unmapped added file is a missed feature.

**R1 exit bar:** change map complete · highlights ranked · **every highlight carries a `USER-VISIBLE` / `INTERNAL` verdict** · coverage cross-check written · zero unmapped `A`/`D`/breaking entries.

---

## R2. Investigate each highlight END-TO-END (depth, one highlight at a time)

> **[BLOCKING] A release claim you cannot trace is a hallucination.** For each highlight, understand the feature as a whole — not only the lines the diff touched. The diff shows *what moved*; the release doc must explain *what the feature now does*.

For every highlight from R1.4:

1. **Read the actual diff for its files** — `git show {hash}` per commit, or `git diff {base}..{head} -- {path}` per file. Read the *code*, never infer from the commit subject.
2. **Trace the feature end to end, in both directions** — entry point (route · command · handler · UI action) → domain/business logic → persistence/state → the observable result the user sees. Then trace backward from that observable result to confirm the path is real.
    - Grep the changed symbol names across the repo to find every consumer. Optional: for a high-risk highlight and when `.code-graph/graph.db` exists, `python .claude/scripts/code_graph trace <file> --direction both --json` (plus `connections` / `callers_of`) can hint at consumers the diff did not touch — it may be stale; verify by reading.
3. **Establish before → after** — state what the behavior was BEFORE and what it is AFTER, each with `file:line` evidence. "Before" usually lives on the diff's `-` side or in the parent commit; read it, do not assume it.
4. **Find the blast radius** — downstream consumers, cross-tier seams (client↔server route/DTO/field/type/nullability), cross-service events, migrations, config/env additions. Classify each seam `NONE` / `ADDITIVE` / `BREAKING`.
5. **Find the tests that prove it** — the integration/E2E/unit tests covering the highlight (`tests_for` on the graph, or grep). A highlight with no covering test is reported as such — never claimed as verified.
6. **Extract the user-facing narrative** — in the reader's words, not the codebase's: who benefits, what they can now do that they could not before, what they must do differently (migration/action-required), what stays the same.

**Confidence discipline (per highlight):** record a confidence % with its evidence. **>80%** → state it as fact. **60–80%** → state it with the caveat named. **<60%** → do NOT put it in the HTML; list it under "Needs confirmation" in the temp report.

**R2 exit bar per highlight:** before→after with `file:line` · end-to-end trace · blast radius classified · covering tests named or absence stated · user-facing narrative written · confidence recorded.

---

## R3. Correlate SPEC changes (canonical behavior, not just code)

Code says what happens; the spec says what was *intended*. A release doc built on code alone reports accidents as features.

1. **Detect spec churn** — filter the file-status artifact for the project's spec root (`docs/specs/**` by default; `docs/project-config.json` may relocate it). Read the diff of every changed spec.
2. **Map each highlight to its governing spec** — the Feature Spec section that owns the behavior. Extract: the business rule / invariant that changed (§4/§5) and the test cases added or amended (§8 `TC-{FEATURE}-{NNN}`).
3. **Adjudicate spec ↔ code drift** — for each highlight, one verdict:
    - `ALIGNED` — spec and code agree → report the behavior with confidence.
    - `SPEC-AHEAD` — spec changed, code did not → this is **not** a shipped feature; exclude it from "What's New" or label it explicitly as specified-not-yet-shipped.
    - `CODE-AHEAD` — code changed, spec did not → report the behavior from code, and record a follow-up ("spec not yet updated"). Never invent spec text.
    - `CONFLICT` — spec and code disagree → **do not resolve it silently.** Record it as a blocking finding and surface it to the user; a release doc must never paper over a contradiction.
4. **Harvest reader-facing material from specs** — business-language descriptions, acceptance criteria, and states/edge cases. Spec prose is tech-agnostic by construction, which makes it the best source for the HTML's narrative sections.

**If the project has no business spec tree** (default `docs/specs/**`; `specRoots.business.path` in `docs/project-config.json` overrides the path)**:** record `Spec correlation: N/A — no canonical spec tree` and source the narrative from R2.6 instead. Do not fabricate a spec.

---

## R4. Detect UI change + [BLOCKING] inventory the REAL existing UI

### R4.1 Decide whether the release has a visual surface

Classify each highlight:

| Verdict          | Trigger                                                                                                         | Mock-up? |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| `NEW-UI`         | A new page/screen/view/component was added                                                                      | Yes      |
| `CHANGED-UI`     | An existing screen/component changed layout, states, copy, or interaction                                       | Yes      |
| `BEHIND-UI`      | Backend/API change whose *effect* is visible on an existing screen (new field, new status, changed validation)   | Yes — render the affected existing screen showing the new effect |
| `NO-UI`          | Purely internal: tooling, refactor, infra, docs, tests                                                          | No       |

Detect by intersecting the changed-file list with the project's frontend roots and file types (`.tsx/.jsx/.vue/.svelte/.html/.scss/.css/.razor/…`) from `docs/project-config.json`, AND by checking each `BEHIND-UI` candidate's consumers found in R2.4.

**Prefer `BEHIND-UI` over `NO-UI` whenever the change surfaces anywhere.** A backend-only diff whose effect a user can see on an existing screen — a new column, a new status value, a changed validation message, a list that now loads — is `BEHIND-UI` and DOES get a mock-up of that existing screen. `NO-UI` is reserved for work with no observable surface at all. — why: "it's a backend change" is the most common excuse for shipping a screenshot-free release page, and it is usually wrong.

**If every highlight is `NO-UI`:** state `UI surface: none — release is internal/backend only` in the report and the HTML, SKIP R4.2–R4.4 and the mock-up sections, and still produce the full HTML doc. Per R6.0.6, if those highlights are also all `INTERNAL`, the document says so plainly and renders §7/§9 only — an honest "no user-facing changes this release" page, never §4 padded with maintenance work. A release doc without UI is still a release doc — never skip the HTML because there is no screen.

### R4.2 Load the project's design context

Same discovery ladder as `work-item --mode=mockup` Step 3 / `feature-presentation` — do not invent a third one:

Paths named below without a directory sit in the project-reference docs root — default `docs/project-reference/`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path.

1. **Baseline:** `design-system/README.md` and `design-system/design-system-canonical.md`.
2. **Primary:** top-level `designSystem` in `docs/project-config.json` — use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the touched app/module against `designSystem.appMappings[]` for the per-app doc.
3. **Fallback:** `Glob("design-system/*.md")` under that root → case-insensitive substring match on the module name.
4. **Default:** `design-system/README.md`.
5. **None of the above exist:** derive tokens by reading the project's actual theme/variables file (`_variables.scss`, `theme.ts`, `tailwind.config.*`, CSS custom properties) — real values from real files. Record where they came from.

Extract: **colors** (primary/secondary/accent/surface/background/text/semantic) · **typography** (families, sizes, weights, line-heights) · **spacing scale** · **border-radius** · **shadows/elevation** · **breakpoints**. These become the HTML's CSS variables — copy real values, never approximate.

Also read `configured styling reference` from that same project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) (first ~100 lines) for the project's project-selected class-naming methodology.

### R4.3 [BLOCKING] Inventory the real existing UI

> **[BLOCKING] Understand the existing UI before you render anything** — canonical rule: `SYNC:existing-ui-research` (source of truth: `.claude/skills/shared/sync-inline-versions.md`). Inventory the existing related UI, map the connected flows in and out, reuse before you invent, and record what matched — so the render faithfully matches the current UI system rather than generic HTML. **Skip ONLY** when the release is backend-only (no UI) — state that explicitly.

This is `work-item --mode=mockup` Step 3b applied to a release scope. Concretely, for each `NEW-UI` / `CHANGED-UI` / `BEHIND-UI` highlight:

1. Read `frontend-patterns-reference.md` from the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) (first ~200 lines) — base component classes, form/table/dialog/navigation patterns.
2. **Open the actual component/template files the diff touched** and 2–3 sibling components of the same tier. Copy their real markup structure and real class names — the mock-up must be a faithful reproduction of the project's UI, not a generic card grid.
3. Record, per highlight: the **real route/URL**, the **real page shell** (nav/header/sidebar the screen sits inside), the **real component names** used, and the **connected flows** in and out.
4. Read `domain-entities-reference.md` from the project-reference docs root (default `docs/project-reference/`; path from `docsRoots.projectReference.path` in `docs/project-config.json`) (or the real entity/model files) for **real field names, types, and enum values**.

### R4.4 Plan the render inventory

Per UI highlight, enumerate before writing any HTML:

- **Views** — every screen needed to show the change in context (the changed screen plus its entry point and result view when the change spans a flow).
- **Components** — which real components appear, at which tier (shell / shared / page).
- **States** — default · loading · empty · error · success, plus permission/validation states the change introduces. Record `N/A` with a reason for states the change does not touch.
- **Before / After pair** — for `CHANGED-UI` and `BEHIND-UI`, plan BOTH the previous rendering and the new one; a side-by-side is the single most valuable element in a release doc.

---

## R5. [BLOCKING] Write the temp analysis report — BEFORE any HTML

> **[BLOCKING] This file is the deliverable of R1–R4 and the ONLY input to R6.** Write it to disk before opening the HTML. It is external memory: large releases overflow context, and a deck assembled from memory invents facts.

**Path:** `docs/release-notes/tmp/{PERIOD}-release-analysis.md` (create the dir; `{PERIOD}` matches the artifact naming already used by the owning skill).
Projects that keep scratch elsewhere may use the session scratchpad instead — but the file MUST exist on disk and MUST be named in the final report.

**Write it incrementally — one highlight per append, not one final batch.** A long investigation that batches its write loses everything on a context cutoff.

### Required structure

```markdown
# Release Analysis (TEMP) — {Project} — {PERIOD}

Status: temp working artifact. Input to the HTML release doc. Not for publication.
Range: {BASE}..{HEAD} | Commits: {N} | Files: {N} | +{N}/−{N}

## 1. Change Map (R1.3)

| Area | Files (A/M/D) | Net lines | Commits | Surface | User-visible |

Excluded from highlights: {area — reason} …

## 2. Release Highlights (ranked, R1.4)

| # | Highlight (user outcome) | Kind (breaking/new/changed/fix/perf/internal) | Owning commits | Audience (USER-VISIBLE / INTERNAL, R1.4b) | UI verdict (NEW/CHANGED/BEHIND/NO-UI) |

## 3. Per-Highlight Deep Dive (R2 + R3)

### H{n} — {user-facing title}

- **What a reader gets:** {plain language, reader's words}
- **Before:** {behavior} — `file:line`
- **After:** {behavior} — `file:line`
- **End-to-end path:** {entry → logic → persistence → observable result}, evidence per hop
- **Blast radius / seams:** {consumer} — NONE | ADDITIVE | BREAKING
- **Spec verdict:** ALIGNED | SPEC-AHEAD | CODE-AHEAD | CONFLICT — {spec path §section, TC ids}
- **Tests proving it:** `path::test_name` — or `NONE FOUND`
- **Action required by users:** {migration/config/none}
- **Confidence:** {N}% — {what is verified, what is not}

## 4. UI Inventory & Render Plan (R4)

- Design tokens (real values + source file)
- Per UI highlight: real route · page shell · real components · real entity fields · connected flows
- Views / components / states to render; before-after pairs
- `UI surface: none` when the release is internal — with the reason

## 5. Statistics (from the diff-stat artifact, not estimated)

## 6. Needs Confirmation (confidence <60%, spec CONFLICT, unresolved questions)
```

**R5 exit bar:** file exists on disk · every R1 highlight has a §3 entry · **every §2 row carries its `USER-VISIBLE` / `INTERNAL` verdict** · every claim carries evidence · every UI highlight has a §4 render plan · §6 lists everything unproven. **Only now may the HTML be written.**

---

## R6. Assemble the standalone HTML release document

Build ONE self-contained file **from the temp report**. Re-read the temp report as you write each section — do not work from memory.

### R6.0 [BLOCKING] Audience — write for real users, not for engineers

> **[BLOCKING] The reader is the person who USES the product.** They have one question: *what can I do now that I could not do before?* They did not follow the work, do not know the codebase, and will not read a commit table. Every editorial decision in this document answers to that reader.

1. **Only `USER-VISIBLE` highlights (R1.4b) may appear in §2 At a glance, §4 What's New, §5 What Changed, and §6 Fixes & Improvements.** Everything an `INTERNAL` verdict covers — refactors, renames, tests, CI, build, tooling, dependency bumps, type/lint changes, doc-only edits, logging/metrics plumbing — is confined to the collapsed §7 "Under the Hood" and §9 Technical Appendix. It is reported, never promoted.
2. **Lead with the visible surface.** A `NEW-UI` / `CHANGED-UI` / `BEHIND-UI` highlight opens with its mock-up (R6.3); the prose explains the picture. A `USER-VISIBLE` highlight with no screen must still be stated as something the user can observe ("exports now finish without a timeout") — if it cannot be stated that way, its verdict was wrong: send it to §7.
3. **Prose carries no implementation vocabulary.** No class, component, file, module, table, endpoint, framework, or library names. No commit subjects. No `file:line` inside a sentence. Traceability lives in the evidence chips (R6.2) and the appendix — meaning lives in the sentences. Say "the order list now shows delivery status", never "added `DeliveryStatusColumn` to `OrderGrid.tsx`".
4. **Describe the outcome, not the mechanism.** A fix is named by the symptom the user no longer hits, not by the defect that caused it. A performance change is named in what the user perceives, not in milliseconds of a query plan.
5. **Never manufacture user value.** An internal change reworded to sound user-facing is a fabrication and fails R8.1. Honest routing to §7 is always the correct move.
6. **Honest emptiness beats padding.** A release whose entire change set is `INTERNAL` says so plainly — "no user-facing changes in this release; the work below is maintenance and tooling" — and renders §7/§9 only. Do not inflate §4 to fill the page.

**The gate question for every sentence in §2–§6:** *would a person who never reads code recognise this as something that changed for them?* No → it belongs in §7.

### R6.1 Hard constraints

- **Single file, fully offline.** Inline `<style>` and `<script>`. No external `<script src>` / `<link rel=stylesheet>` except the Google Fonts stylesheet. No CDN frameworks.
- **No network at runtime** — no `fetch`, no analytics, no remote images. Embed images/icons as inline SVG or `data:` URIs.
- **Real design tokens** as CSS variables, copied from R4.2 with a light/dark pair.
- **Responsive** — readable at 1440px and at 375px; wide tables/diffs scroll inside their own `overflow-x:auto` container, the page body never scrolls horizontally.
- **Accessible floor** — semantic landmarks, one `h1`, ordered heading levels, 4.5:1 text contrast, visible focus ring, `≥44×44` touch targets, `prefers-reduced-motion` honoured.
- **Print-friendly** — a `@media print` block so the page exports to PDF cleanly.

### R6.2 Required sections (in order)

Sections 2–6 are the **user narrative** — `USER-VISIBLE` highlights only, written per R6.0. Sections 7–9 are the **technical view** — collapsed by default and never a place the user has to go to learn what changed for them.

| # | Section                    | Audience | Content                                                                                                                                                     |
| - | -------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | **Header / hero**          | user     | Project · version or period · date · `Status: Draft` badge. Headline counts are **user-facing** ones (new / changed / fixed); commit, file and line stats belong in §9. |
| 2 | **At a glance**            | user     | 3–6 highlight cards, ranked as in R1.4 — each an outcome in the reader's words, not a commit subject                                                          |
| 3 | **⚠ Action required**      | user     | Breaking changes + migrations, with before→after and the concrete step the user takes. Rendered FIRST and visually distinct. Omit the section entirely when there are none. |
| 4 | **What's New**             | user     | One block per new-capability `USER-VISIBLE` highlight: **UI mock-up first when the highlight has a screen** · narrative · evidence chips                      |
| 5 | **What Changed**           | user     | One block per changed-behavior `USER-VISIBLE` highlight: **before → after**, side-by-side render for UI changes                                                |
| 6 | **Fixes & Improvements**   | user     | Grouped, each named by the **user-visible symptom that is now gone** — never by the defect or the code that caused it                                          |
| 7 | **Under the Hood**         | technical | Every `INTERNAL` highlight (R1.4b), one line each, collapsed by default (`<details>`). This is the ONLY home for refactors, tests, CI, tooling, deps, docs.  |
| 8 | **Spec & Test Coverage**   | technical | Per highlight: spec verdict + governing §/TC ids + covering tests (or the honest gap) — collapsed by default                                                  |
| 9 | **Technical Appendix**     | technical | Commit table (hash · type · subject) · file-change table by area · full statistics — collapsed by default                                                     |
| 10| **Footer**                 | —        | Generated date · branch · range `{OLD}..{HEAD}` · **paths of the temp report and git artifacts**                                                               |

Every claim in sections 3–8 carries an **evidence chip** — a small inline `commit • file:line` marker. A section with no chip is unsourced and must be removed or sourced. Chips are **markers, not prose**: they sit beside the sentence, they never replace it, and R6.0.3 still forbids implementation names inside the sentence itself.

### R6.3 Rendering the mock-ups (the part that must look real)

For every `NEW-UI` / `CHANGED-UI` / `BEHIND-UI` highlight, render a **faithful HTML reproduction of the real screen** inside the doc.

> **[BLOCKING] The mock-up procedure is the `work-item --mode=mockup` protocol — do not invent a second one.** How a screen is reproduced is owned by `.claude/skills/work-item/references/mode-mockup.md`: its **Step 3** (load the design system — canonical doc + the per-app doc matched from `docs/project-config.json`), **Step 3b** (`[BLOCKING]` inventory the existing UI and map connected flows by reading the real shared/module component files), **Step 3c** (real domain entity fields, types, enum values), and its **Step 7 fidelity validation**. R4.2–R4.4 above ARE that contract applied to a release scope — they must never drift from it. Where the two ever read differently, **`work-item --mode=mockup` governs HOW a screen is reproduced; this file governs WHAT gets rendered** (which highlights, before→after pairing, per-highlight scope, and the release document's own chrome).

**Deliberate scope difference — do not import the whole task skill.** `work-item --mode=mockup` builds a clickable multi-view prototype of an **unbuilt** task, with guided narration and scripted flows. A release mock-up reproduces a screen that has **already shipped**: static or lightly toggled is enough (rule 7 below), and the ▶ Play / ⏭ Next walkthrough machinery is not required. Borrow the fidelity contract, not the prototype machinery. Its `⚠ Simulated` banner does carry over, as the `⚠ Illustrative mock-up` label in rule 8.

**Fidelity rules — these are what separate a real release doc from a generic template:**

1. **Reproduce the project's actual markup structure and class names** taken from the real component files read in R4.3 — the same shell, the same nav, the same card/table/form composition. Never a generic invented layout.
2. **Use the real design tokens** from R4.2 — real hex values, real font families, real spacing scale, real radii and shadows.
3. **Use real domain field names, real enum values, and realistic sample data** from R4.3.4 — never `Lorem ipsum`, never `Item 1 / Item 2`, never `foo@bar.com`.
4. **Show the change in its real context** — the changed component inside its real page shell, at its real route, not floating on a blank canvas. Label the route.
5. **Before → after, side by side** for `CHANGED-UI` / `BEHIND-UI`, with the delta visibly marked (a highlight ring plus a text label — colour alone must never carry the meaning).
6. **Render the states the change introduces** — default plus any new loading/empty/error/validation/permission state, as toggleable panels or stacked labelled frames.
7. **Static or lightly interactive is enough.** A release doc reports; it does not need a clickable prototype. Any interactivity is **simulated only** — canned state toggles, zero `fetch`, zero auth, zero persistence.
8. **Label every render `⚠ Illustrative mock-up — not a live screenshot`.** A reader must never mistake a reconstruction for a screenshot of the running app. This label is mandatory and non-removable.
9. **Isolate each render** so the doc's own CSS and the reproduced app CSS cannot bleed into each other — scope the mock-up styles under a wrapper class, or embed via `<iframe srcdoc="…">`. When using `srcdoc`, apply the entity-escaping rule from `.claude/skills/feature-presentation/references/deck-template.md` §3 (`&`-first, escape once, unconditionally).
10. **Reuse, never regenerate.** If a `tasks/*-mockup.html` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) already exists for the shipped feature, embed it via `<iframe srcdoc>` instead of rebuilding the screen.

**Design gates bind here.** The mock-ups are a user-facing visual surface, so the `UI-1.1`–`UI-9.4` usability floor and the `DD-1`–`DD-8` distinctiveness gate both apply — with one precedence note specific to this skill: **the project's real design system WINS outright over distinctiveness.** The mock-up's job is to look exactly like the existing app; matching an established house style is the goal, never a `DD` finding. `DD` applies only to the *release document's own* chrome (its header, cards, typography, and layout), which should look like a considered document for THIS project — not the default report template any generator emits. Cite `.claude/docs/design-knowledge.md` for `DD`, `.claude/docs/design-review-checklist.md` for the review sweep.

### R6.4 Tone

R6.0 sets the audience; this sets the voice. Write for a reader who did not follow the work: business/observable language in all prose ("the record list now shows delivery status"), not framework or class names. Second person and present tense — what *you can now do*, not what *was implemented*. The rendered HTML may use real class names internally — that is implementation, not prose.

### R6.5 [BLOCKING] Visual clarity — beautiful, easy to read, easy to understand

R6.0 decides WHAT the reader sees; this decides whether they take it in. **Goal:** a reader who scrolls the first screen can say what changed for them and what they must do, and each §4/§5 highlight after that is understood from its visual plus two to four plain sentences. Correct but hard-to-scan content fails this goal.

1. **The first screen answers the reader's two questions.** Header with user-facing counts (R6.2 §1), then — immediately after the header, before §2 — §3 "Action required" as a **defaults board** (omitted when nothing requires action, per R6.2 §3): one row per change — *what* · *was → now* (both values visible, marked by text or strike-through, not colour alone) · *the one line that keeps the old behaviour or the step to take*. The reader must not open a section to learn they have work to do.
2. **Show, then tell — one explanatory visual per `USER-VISIBLE` highlight in §4/§5**, chosen by what it explains (§6 fixes stay a grouped list named by symptom, per R6.2 §6):

    | The highlight is about…                        | Visual                                                                                    |
    | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
    | a screen                                       | the R6.3 mock-up                                                                          |
    | changed text, output or behaviour              | before → after pair, delta marked                                                         |
    | a process, route or ordered steps              | flow / pipeline diagram with the real step names                                          |
    | a quantity that moved (size, time, count)      | paired comparison bars with value labels — measured numbers from the temp report only     |
    | a set of options, tiers or presets             | side-by-side option matrix                                                                |
    | CLI or chat output (the product's own surface) | terminal / chat frame built from the real source text, labelled per R6.3 rule 8           |

    A visual that explains nothing (decorative icon, stock illustration, chart of invented or rounded-up data) is removed, not kept for colour. A `NO-UI` highlight gets a diagram, comparison or terminal frame when one makes it faster to grasp than prose; when none does, record `no visual — prose is clearer` for it in the temp report (R5 §4) instead of adding filler.
3. **One card anatomy, repeated (§4/§5).** Each highlight: kind tag from its R1.4 kind (new / changed / perf; a fix lives in §6; add `default change` when a default moved) → outcome title in the reader's words → visual → 2–4 sentences → a "How to use / turn off" box with the exact command or setting → evidence chips. The same order everywhere lets the reader skim by position.
4. **Group by the reader's goal, not by commit type.** Cluster §4/§5 highlights under 2–4 themes named for what the reader is trying to get done; order themes by impact.
5. **Readable text.** Line length ≤ ~75 characters; one idea per paragraph of two to four sentences; lists for three or more parallel items; plain words, active voice, second person; every number carries its unit and its "compared to what".
6. **Hierarchy and restraint.** One focal point per section; generous whitespace instead of extra borders; one accent colour for "new/after", one warning colour reserved for "action required", a muted tone for "before". Apply `DD-1`–`DD-8` to the document chrome and drop the generated-page defaults from `.claude/docs/design-knowledge.md` §4 unless the subject calls for them — a redundant ALL-CAPS label above every heading, one accented word in the headline, numbered markers on items that are not a sequence, `→` appended to link text, a gradient hero.
7. **Technical detail stays one click away.** §7–§9 collapsed; a jump-link row near the top reaches every section; nothing the reader needs to act on exists only inside a collapsed block.
8. **Verify the rendered page, not the source.** Render it in a real browser at a wide (~1440px) and a narrow (~375px) viewport and look at the screenshots before R8. Headless browsers can enforce a minimum window width larger than 375px — confirm the actual viewport width (or render inside a fixed 375px frame) before trusting a narrow screenshot. Common narrow-width break: grid or flex children with preformatted blocks need `min-width: 0` so the block scrolls inside its own box instead of widening the page. **No renderer available** — no browser or screenshot tool can run in this session (a headless browser counts as a renderer, so CI and sub-agents with one must take the screenshots): run every R8.4 check that the source can answer, record `Release visual: PASS (source-only — screenshots unavailable: {reason})` or FAIL, and list each render check left unverified under Needs confirmation (R5 §6) and in the R10 report — never a plain PASS.

---

## R7. Save

| Output           | Path                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Markdown doc     | the skill's own markdown output, unchanged (`docs/release-notes/{PERIOD}.md`, or the `--output` path)       |
| HTML release doc | **the markdown doc's path with the `.html` extension** — same directory, same stem        |
| Temp report      | `docs/release-notes/tmp/{PERIOD}-release-analysis.md`                                            |

Deriving the HTML path from the markdown stem keeps the pair together and makes `--output` work for both with one flag. The HTML **complements** the markdown release doc — it never replaces it. Both are produced.

---

## R8. [BLOCKING] Gates — run ALL FOUR before reporting done

### R8.1 Accuracy gate

- [ ] Every highlight in the HTML traces to a §3 entry in the temp report
- [ ] Every §3 highlight with confidence >80% appears in the HTML; every one below is absent from it and present in §6
- [ ] Every claim in sections 3–8 carries an evidence chip that resolves to a real commit/file
- [ ] Statistics match the `diff-stat` artifact exactly — computed, not estimated
- [ ] Breaking changes: every `BREAKING CHANGE` commit from R1.2 appears in §3 "Action required"
- [ ] New/deleted files cross-checked — nothing added or removed in the range is silently unreported
- [ ] Spec `CONFLICT` verdicts are surfaced to the user, not smoothed over
- [ ] No `TODO`, no unfilled placeholder, no invented API/class/method name
- [ ] No `INTERNAL` change reworded into invented user value (R6.0.5)

Record: `Release accuracy: PASS | FAIL`.

### R8.2 Fidelity & presentation gate

- [ ] Each mock-up matches the R4.3 inventory — real tokens, real component structure, real class names, real route, real page shell
- [ ] Real domain field names and realistic data throughout — zero Lorem ipsum, zero `Item 1`
- [ ] Every `CHANGED-UI` / `BEHIND-UI` highlight shows a before→after pair with the delta marked by more than colour
- [ ] Every new state introduced by the change is rendered
- [ ] `⚠ Illustrative mock-up` label present on every render
- [ ] Single file, opens offline with the network disabled, no console errors, no external requests
- [ ] Responsive at 1440px and 375px; no horizontal body scroll; wide blocks scroll in their own container
- [ ] Contrast 4.5:1, one `h1`, ordered headings, visible focus ring, reduced-motion honoured
- [ ] `NO-UI` release: `UI surface: none` stated and no empty/broken mock-up frame rendered
- [ ] Mock-ups satisfy the `work-item --mode=mockup` fidelity contract (Steps 3 / 3b / 3c, Step 7) — a second, self-invented procedure was not used

Record: `Release fidelity: PASS | FAIL`.

### R8.3 [BLOCKING] Audience gate — is this readable by a real user?

Read the rendered §2–§6 as someone who uses the product and has never seen the codebase.

- [ ] Every §2/§4/§5/§6 entry names something the reader can observe — a capability, a screen, a symptom that is gone, an action they must take
- [ ] Zero implementation vocabulary in prose: no class, component, file, module, table, endpoint, framework, or library names; no commit subjects; no `file:line` inside a sentence (R6.0.3)
- [ ] Every `INTERNAL` highlight (R1.4b) appears ONLY in §7/§9 — none promoted into the user narrative
- [ ] Every `USER-VISIBLE` highlight with a UI verdict of `NEW-UI` / `CHANGED-UI` / `BEHIND-UI` carries its mock-up, placed before its prose
- [ ] §7, §8 and §9 are collapsed by default; nothing the user needs is buried inside them
- [ ] Fixes are named by symptom, not by cause; performance is named by what the user perceives
- [ ] An all-`INTERNAL` release says so plainly instead of padding §4 (R6.0.6)

Record: `Release audience: PASS | FAIL`.

### R8.4 [BLOCKING] Visual clarity gate — beautiful, easy to read, easy to understand

Run against the rendered screenshots from R6.5.8 — or, only when no renderer is available, against the source under the R6.5.8 source-only record.

- [ ] First screen: user-facing counts plus the "Action required" defaults board (was → now → keep-old / step) — or no board because nothing requires action
- [ ] Every `USER-VISIBLE` §4/§5 highlight has one explanatory visual chosen per the R6.5.2 table, or (`NO-UI` only) a recorded `no visual — prose is clearer`; no decorative-only visual; every chart value comes from the temp report
- [ ] Every §4/§5 highlight follows the R6.5.3 card anatomy, including a "How to use / turn off" line where a command or setting exists
- [ ] §4/§5 are grouped by reader goal (R6.5.4), not by commit type
- [ ] Text: line length ≤ ~75ch, one idea per paragraph of 2–4 sentences, numbers with unit and comparison
- [ ] None of the R6.5.6 generated-page defaults remain without a subject reason; one accent, one warning colour, a muted "before"
- [ ] Wide and narrow screenshots viewed; the narrow one taken at a verified ~375px viewport; no clipped text, overlap or horizontal page scroll (source-only runs list this item as unverified)
- [ ] A reader skimming headings, visuals and "How to use" boxes alone can say what changed and what to do

Record: `Release visual: PASS | PASS (source-only — {reason}) | FAIL`.

**On FAIL:** fix and re-run the gate. Never hand over a FAIL, and never downgrade a check to force a pass.

---

## R9. Auto-open the HTML

Open the saved file in the default browser as the final action, then report its path.

```bash
# Windows (PowerShell) — preferred
pwsh -NoProfile -Command "Start-Process 'docs/release-notes/{PERIOD}.html'"

# macOS
open docs/release-notes/{PERIOD}.html

# Linux
xdg-open docs/release-notes/{PERIOD}.html
```

Rules:

- **Never block on it.** Opening a browser is a convenience, not a deliverable — a non-zero exit, a sandbox, a headless CI runner, or a hook refusal is a **warning, not a failure**. Report `Auto-open: skipped ({reason})` and print the absolute path so the user can open it themselves.
- **Skip silently when non-interactive** — CI, a headless environment, or a sub-agent context. Print the path instead.
- **Honour an opt-out** — `--no-open` suppresses the launch; the path is still printed.
- **Open only the file just generated**, by its exact saved path. Never open anything else.

---

## R10. Report to the user

```
HTML release doc: docs/release-notes/{PERIOD}.html   (opened in browser)
Markdown release doc: docs/release-notes/{PERIOD}.md
Temp analysis:    docs/release-notes/tmp/{PERIOD}-release-analysis.md
Git artifacts:    docs/release-notes/tmp/git-log-{PERIOD}.txt, docs/release-notes/tmp/diff-file-status-{PERIOD}.txt

Range: {BASE}..{HEAD} | {N} commits | {N} files | +{N}/−{N}
Highlights: {N} ({N} breaking, {N} new, {N} changed, {N} fixes)
Audience split: {N} user-visible (in the narrative) | {N} internal (Under the Hood only)
UI surface: {N} screens rendered ({N} before/after pairs) | or: none — internal release
Spec correlation: {N} aligned, {N} code-ahead, {N} spec-ahead, {N} conflict
Release accuracy: PASS | FAIL
Release fidelity: PASS | FAIL
Release audience: PASS | FAIL
Release visual: PASS | PASS (source-only — {reason}) | FAIL
Needs confirmation: {N} items (see temp report §6)
Auto-open: opened | skipped ({reason})
```

---

## Closing Reminders

Complete R1–R10 in order: preserve breadth-first evidence in the temp report, surface spec/code conflicts, and route INTERNAL versus USER-VISIBLE work honestly. Reproduce real UI through the declared mock-up contract; label reconstructions, use realistic data, and keep traceability in evidence chips.

R8 accuracy, fidelity, audience and visual gates all remain blocking; source-only rendering follows its explicit limitation record. A NO-UI release still receives the full HTML report. R9 auto-open is best-effort and never blocks delivery.
