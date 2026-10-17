---
name: presentation-builder
version: 1.0.0
description: '[Documentation] Use when creating, revising, auditing or generating a presentation: narrative-led self-contained HTML deck with speaker notes and edit mode.'
disable-model-invocation: true
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute the declared steps in order. Keep one task `in_progress`; mark each task completed with evidence immediately after it returns.
> **[BLOCKING]** If task tools are unavailable, maintain an equivalent tracker in the working response or a disposable report under `tmp/reports/`.
> **[BLOCKING]** Do not claim browser behavior passed when only static inspection was possible.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Turn any subject and source material into a clear, audience-specific presentation whose story, visuals, notes, and runtime behavior are all reviewable.

**Summary:**

- Frame audience/goal/environment and evidence boundaries; build a source ledger; select a subject-appropriate narrative archetype and slide map.
- Create and critique a subject-grounded design plan; generate semantic, self-contained HTML with stable slide/purpose/note markers.
- Guarantee the presenter runtime: complete notes, notes toggle, keyboard navigation, accessible state, explicit edit mode, local draft persistence, reset, export, overview, fullscreen, print, and reduced motion.
- Run static validation, browser/manual rehearsal when available, and a final evidence report that distinguishes PASS from `NOT VERIFIABLE`.

**Default output:** One self-contained HTML deck. If another format is requested, keep a companion editable HTML deck unless the requested artifact itself satisfies the runtime contract.

**Non-negotiables:** Every slide has a job, title, source/rationale, and detailed speaker notes. The deck always includes a visible notes toggle and an explicit edit mode with editable prose and notes, local draft persistence, reset, and clean export.

**Workflow:** frame audience/goal/environment → research and source claims → choose narrative archetype → write slide map → make a subject-grounded design plan → generate → validate → manually rehearse/review → report evidence and limits.

**Utilities:** `node .claude/skills/presentation-builder/scripts/create-presentation.cjs <deck.json> <output.html>` generates a self-contained contract-compliant starter deck; `node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> [--profile=presenter|review]` performs deterministic static checks against one conformance profile (default `presenter`; `review` makes only the five editing checks advisory — `references/web-runtime-contract.md` §9). Run both utility test files after changing them.

**Key Rules:**

- **MUST ATTENTION** give every slide a single job, stable ID, meaningful title, rationale, and non-empty notes.
- **MUST ATTENTION** keep notes detailed enough for presenter handoff: talk track, why, evidence/caveat, timing, transition, and question.
- **MUST ATTENTION** provide visible Notes and Edit mode controls with stateful accessible semantics.
- **MUST ATTENTION** protect structure and persist edits as a namespaced local draft with reset and clean export.
- **ALWAYS** preserve keyboard navigation and a visible progress/status path.
- **ALWAYS** run static validation, then verify browser behavior separately when a browser is available.
- **NEVER** invent subject claims, precision, sources, audience, or design rationale.
- **NEVER** claim interactive, offline, fullscreen, persistence, or accessibility behavior from static markup alone.

## Contents

- [Quick Summary](#quick-summary)
- [When to Use](#when-to-use)
- [Workflow](#workflow)
- [Hard Quality Checklist](#hard-quality-checklist)
- [Resources](#resources)
- [Closing Reminders](#closing-reminders)

## When to Use

Use for a decision deck, strategy, product story, teaching lesson, research readout, project update, technical explanation, sales narrative, demo, portfolio, or any other subject where an audience must understand, remember, decide, or act.

Use it to audit an existing HTML presentation when the request mentions structure, notes, edit mode, navigation, accessibility, or quality. For a UI-only mockup, use `work-item --mode=mockup`. When the deck synthesizes one feature's artifacts (its spec, tasks, mockups, design specs) for product, analysis, development and QA reviewers, use `feature-presentation` instead: it builds the feature review deck and passes this skill's validator with `--profile=review` — the same deck standard with editing features advisory, because review text must match the specifications it summarizes. Use this skill for a deck on any other subject.

## Workflow

### 1. Frame the communication contract

Record these before writing slides:

- **Audience:** who is in the room, what they already know, what they care about, and what they can decide.
- **Goal:** inform, teach, persuade, align, compare, demonstrate, or obtain a decision. Write one observable outcome.
- **Environment:** live or asynchronous, presenter-led or self-serve, screen/room size, estimated time, playback/browser constraints, and whether notes are presenter-only.
- **Subject and evidence boundary:** source files/URLs, dates, data ownership, sensitive content, assumptions, and what is explicitly out of scope.
- **Output and handoff:** requested file type, output path, offline/network policy, edit/persistence expectations, and required export/print behavior.

If the brief is silent, state assumptions. Do not invent facts, brand rules, metrics, quotations, or a target audience.

### 2. Research and build the source ledger

Search the supplied material first. Browse only when the claim needs current or external evidence. Create a compact source ledger mapping each consequential claim, number, visual, quote, and date to its source or to an explicit `assumption`/`illustration` label. Keep fact, interpretation, recommendation, and example visually and verbally distinct.

For every chart or diagram, record unit, time range, denominator, comparison baseline, source, and uncertainty. Prefer a small, legible chart or diagram to a paragraph; never use decorative data-shaped graphics that imply unsupported precision.

### 3. Choose the story before the layout

Write a one-sentence thesis and the audience takeaway. Select the smallest narrative archetype that fits the job from `references/presentation-principles.md`.

Create a slide map before generating HTML. Each row must contain `slide-id`, `purpose`, `claim`, `evidence/visual`, `transition`, `timing`, and `notes-status`. Every slide must earn its place; merge or remove slides that repeat a job. A useful default decision arc is:

`opening-context → thesis/BLUF → context → tension/problem → evidence → insight → options/trade-offs → recommendation → plan/risks → ask/next action → memorable close`

Adapt that arc for teaching, demos, stories, reports, or comparisons. Do not force every archetype into a strategy deck, and do not use a decorative agenda when a short roadmap or direct opening communicates better.

The opening must establish context quickly. The body must progress by causality, contrast, sequence, or increasing specificity. Signpost meaningful transitions. The close must restate the takeaway and make the desired next action unmistakable.

### 4. Make a subject-grounded design plan

**Read design authority first.** When the deck represents the project — its product, features, team, or brand — read the project's design authority BEFORE writing the plan. Resolve it from `designSystem` in `docs/project-config.json`: `docsPath` + `canonicalDoc`, every `tokenFiles` entry, and the `appMappings[]` entry whose app matches the deck's subject. Fallback when `designSystem` is absent or names no readable doc: the `design-system/` folder under the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides it), starting with its `README.md`. Open the plan with exactly one record:

- `Design authority read: <paths>` — then adopt its colour and type axes: take the palette and type families, roles, and scale from the authority, and add subject-specific tokens only where it is silent. Record each deliberate departure with its reason.
- `N/A — none configured (checked: <paths>)` — neither the config nor the fallback yields a doc; list every location checked and derive colour and type from the subject.

A deck whose subject is not the project (an external topic, a lesson, a talk) records `N/A — deck does not represent the project` and skips the read. The brief's stated visual direction outranks the authority; the authority outranks the `DD-*` clauses; a genuine conflict goes to the user, never resolved silently — why: a project deck that ignores its design system reads as someone else's product.

**Design-explore hand-off.** When `/ui-design` explore hands this skill a picked direction — `direction-approved.md` plus `run-notes.md` from its run folder — adopt `direction-approved.md`, including its `## Design Plan tokens` section (named colour hex values, type families with roles and scale, layout concept, web-font note), as this step's design plan instead of writing a new one; the pick counts as the brief's stated visual direction. A web font the picked draft loaded is kept only by packaging the font file inside the deck; otherwise use the project's type, then the closest system stack, and record the change as a departure in the design plan. Apply each fix in the `## Journey fixes (UX-8)` table of `run-notes.md` to the slide map and slide layouts, and list each fix as applied or `N/A` with a reason. Keep the design-authority record above, and confirm the adopted plan covers every item below; fill any gap.

Otherwise, before coding, write a compact plan:

- **Colour:** 4–6 named tokens with contrast checks and a reason tied to the subject.
- **Type:** families, roles, scale, weight, line length, and language/script constraints.
- **Layout:** one-sentence composition plus a small ASCII sketch for unusual or high-stakes slides; define alignment, focal point, density, and reading order.
- **Visual language:** what materials, artifacts, metaphors, diagrams, or image treatment belong to this subject; what generic defaults are intentionally rejected.
- **Motion:** one purposeful, optional moment at most; never use animation to hide weak sequencing.

Use real subject copy and data. Keep one dominant focal point per slide, one primary idea, generous grouping/whitespace, and a predictable visual grammar. Vary composition when the content changes; do not clone a card grid across the whole deck.

### 5. Generate the canonical deck structure

Use semantic HTML and a stable, self-contained runtime by default:

```html
<section class="slide" data-slide-id="context" data-purpose="context" data-principle="Why this slide earns its place">
  <header><h2>Descriptive slide title</h2></header>
  <div class="slide-body"><!-- one claim and its evidence/visual --></div>
  <template class="slide-notes">
    <p><strong>Say:</strong> a presenter-ready explanation.</p>
    <p><strong>Why:</strong> interpretation, evidence, caveat, and transition.</p>
    <p><strong>Timing:</strong> 00:45 · <strong>Question:</strong> likely audience question and answer.</p>
  </template>
</section>
```

The generated deck must include the stable markers used by the validator: `.slide`, `data-slide-id`, `data-purpose` or `data-principle`, `.slide-notes`, `data-action="toggle-notes"`, and `data-action="toggle-edit"`. Compatibility aliases such as `note-src`, `btnNotes`, and `btnEdit` are allowed but do not replace generic markers in new decks.

Keep CSS tokens named for the subject, inline CSS/JS, and all required assets packaged locally by default. If network dependencies are explicitly accepted, set `allowExternalAssets: true` and expose that policy in the generated artifact. Escape user/source content once at the HTML boundary. Keep slide content and runtime controls separate so editing prose cannot corrupt navigation, data, brand chrome, SVG structure, or notes metadata.

For repeatable generation, pass a JSON spec to `scripts/create-presentation.cjs`. The root must provide a stable `id`; each slide must provide a stable `id`, `title`, `purpose`, `principle`, one of `body`, `bodyHtml`, or typed `blocks`, and a `notes` object containing `say`, `why`, `evidence`, `transition`, `timing`, and `question`. A deck may contain one slide; zero slides are rejected. Typed blocks cover common text, list, quote, metric, image, and code needs; trusted author HTML remains available for subject-specific diagrams and visuals. The generator rejects missing structure or notes and emits the full runtime contract. Pass the Step 4 design plan as the root `theme` object (`paper`, `ink`, `muted`, `accent`, `accentSoft`, `panel`, `line`, `font`, `displayFont`); when `theme` is omitted or holds no usable key, the generator still builds the deck and warns on stderr that the default look was used — treat that warning as a missed design decision and fix the spec. Use `--example` to create a starter spec-shaped deck, then replace its content with sourced material.

**Showcase before batch (decks of ≥5 slides):** build two representative slides first, render them (`node .claude/skills/html-export/scripts/export.cjs --to=png <deck.html> --slides` when html-export is installed; apply the Step 7 exit rule), self-critique them against the Step 4 design plan, fix, then generate the rest. This is an agent self-critique — no user stop.

### 6. Implement the presenter runtime contract

The complete contract is in `references/web-runtime-contract.md`. At minimum:

- Provide visible Previous/Next controls and keyboard navigation: Arrow keys, PageUp/PageDown, Space, Home, and End. Do not trap typing inside editable fields; let Escape leave an editor.
- Provide a notes toggle and close action. Give the panel a name, current slide title/page, `aria-expanded`/`aria-pressed` state, keyboard focus handling, Escape close, and an `aria-live` status for slide changes.
- Provide a clearly labelled edit-mode toggle with `aria-pressed`. In edit mode, make intentional prose leaves and the current slide’s notes editable, show a visible editing state/focus outline, and keep structural/brand/data visual elements protected.
- Debounce saves to a namespaced browser-local draft key. Show “saved”, “unsaved”, and storage-unavailable/error states. Treat local storage as a local draft, never as collaboration or version history. Confirm destructive reset and provide a clean HTML export that removes edit state.
- Provide fullscreen with capability/rejection handling and `fullscreenchange` state sync. Provide progress text as well as a visual progress bar. Provide overview/jump navigation for decks longer than six slides.
- Make meaningful images, SVGs, charts, tables, and diagrams accessible: text alternatives/labels, headings, logical reading order, visible focus, contrast checks, and colour-independent encoding. Include print CSS and a reduced-motion path.
- Do not auto-advance. Touch/pointer navigation may supplement buttons and keyboard but must never be the only route. Do not claim “simulated”, “live”, or “offline” behavior unless the implementation and notes make the boundary clear.

### 7. Validate, rehearse, and report

Run the utility and its tests:

```text
node .claude/skills/presentation-builder/scripts/create-presentation.cjs <deck.json> <output.html>
node .claude/skills/presentation-builder/scripts/create-presentation.cjs --example <output.html>
node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html>
node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> --json
node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> --profile=review
node .claude/skills/presentation-builder/tests/create-presentation.test.cjs
node .claude/skills/presentation-builder/tests/validate-presentation.test.cjs
```

**Conformance profile:** `--profile=presenter|review`, written with `=`. No flag means `presenter` — the full standard, and the one this skill's decks must pass. `review` makes only the five editing checks advisory and is the profile `feature-presentation` passes; any other name is refused with exit 2 and no verdict. The verdict names the profile it was judged against — report it with the result. Profile table: `references/web-runtime-contract.md` §9.

Static validation is a gate, not a substitute for using the deck. When a browser is available, verify: first load; every navigation route; Home/End and Space; notes open/close/Escape; edit mode on/off; editing a slide and its notes; save status after reload; reset confirmation; on a slide taller than the screen at 200% zoom, the down keys scroll to its end before moving on; export opens cleanly; fullscreen success/failure; overview jump; print; narrow viewport; focus order; screen-reader names; reduced motion; missing/slow asset behavior; and console errors. Test the actual audience path, not only isolated buttons.

**Render check (when html-export is installed):** run `node .claude/skills/html-export/scripts/export.cjs --to=png <deck.html> --slides` (default slide selector). Exit 0 is evidence ONLY for first-load and per-slide render, zero page errors, and no blank captures; every other runtime check above stays `NOT VERIFIABLE` unless exercised another way. **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `/html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.

Write a short report under `tmp/reports/` with the output path, source ledger status, slide-map summary, validator result, manual/browser result or `NOT VERIFIABLE`, unresolved risks, and any assumptions. Never hide an unverified interaction behind a PASS.

## Hard Quality Checklist

Treat each item as a release gate. Record evidence or `N/A` with a reason; do not silently skip.

| Gate | Requirement | Evidence to record |
|---|---|---|
| Purpose | One audience, one primary job, one thesis/takeaway | Communication contract + opening slide |
| Narrative | The sequence is causal, contrastive, chronological, or otherwise explainable; each slide has one job | Slide map with transitions |
| Evidence | Consequential claims, charts, dates, quotes, and visuals have traceable sources or labels | Source ledger |
| Content | No unsupported precision, filler, lorem ipsum, orphan terms, or unexplained acronyms | Copy/coherence pass |
| Design | Design authority read and its colour/type adopted (or none configured), subject-grounded plan, deliberate type/colour/layout, focal point, readable density, meaningful variation | Design-authority record + design plan + built-artifact critique |
| Notes | Every slide has detailed presenter notes covering talk track, why, evidence/caveat, timing, transition, and likely question | Notes coverage report; validator |
| Edit mode | Visible toggle, state feedback, editable prose and notes, protected structure, local draft save/error status, reset confirmation, clean export | Manual interaction evidence + validator |
| Navigation | Buttons, keyboard parity, focus order, progress announcement, overview/jump for longer decks, no auto-advance | Browser or explicit static limitation |
| Accessibility | Semantic headings, labels/alt text, contrast, colour-independent meaning, visible focus, reduced motion, print path | Accessibility review |
| Handoff | Requested artifact opens in the target environment, offline policy is met, assumptions and limitations are visible | Open/reload/export/print evidence |

## Resources

- `references/presentation-principles.md` — research-backed structure principles, narrative archetypes, slide-level checklist, delivery/rehearsal checks, and source links.
- `references/web-runtime-contract.md` — canonical HTML schema and notes/edit/navigation/accessibility/persistence/export requirements, generalized baseline-runtime lessons and upgrade requirements, and the `presenter`/`review` conformance profiles (§9).
- `scripts/create-presentation.cjs` — dependency-free JSON-to-self-contained-HTML generator with enforced detailed notes and presenter runtime.
- `scripts/validate-presentation.cjs` — dependency-free static validator with JSON output and `--profile=presenter|review` (default `presenter`).
- `tests/create-presentation.test.cjs` — generator contract and rejection-path tests.
- `tests/validate-presentation.test.cjs` — regression tests for the validator’s hard requirements.
- `node .claude/skills/html-export/scripts/export.cjs --to=pdf <deck.html> --page=1920x1080` — optional PDF copy when html-export is installed (the print CSS sets no page size); apply the Step 7 exit rule.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

> **[BLOCKING]** Finish with the final review task and the AI-mistake/lessons gate. Extract only a lesson that passes the value (a project convention or a universal best-practice protocol worth reading on everyday work — never a rare AI-agent quirk or a detail of this task), recurrence and generality tests; ask the user to run `/learn` when a lesson should be persisted.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Turn any subject and source material into a clear, audience-specific presentation whose story, visuals, notes, and runtime behavior are all reviewable.

**MUST ATTENTION workflow:** 1) frame audience/goal/environment and evidence boundary → 2) research/source ledger → 3) thesis, archetype, and slide map → 4) design-authority record (`Design authority read:` or `N/A — none configured (checked: ...)`), subject-grounded design plan and distinctiveness review → 5) semantic self-contained generation → 6) notes/edit/navigation/accessibility/persistence runtime → 7) static validation (default `presenter` profile) and browser/manual rehearsal → 8) evidence report, final review, and lessons gate.

<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->
