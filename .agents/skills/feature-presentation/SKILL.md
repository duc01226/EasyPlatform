---
name: feature-presentation
description: '[Documentation] Use when a workflow step or the user asks for a standalone HTML stakeholder deck combining specs, tasks, initiatives and mockups with journey demos.'
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Synthesize every in-scope session initiative, Feature Spec, task, user story, design-spec, and mockup into ONE project-faithful standalone HTML deck with a vanilla-JS engine and interactive MVP demos for every main journey, so PO/BA/Dev/QC review the feature from one offline file before build.

**Summary:**

- **Purpose / altitude:** a SYNTHESIS deck at a higher altitude than `work-item --mode=mockup` — accumulates many artifacts (initiatives + specs + tasks + stories + design-specs + mockups) into ONE stakeholder presentation, not one task's UI preview.
- **Main steps (read-this-if-nothing-else):** (1) resolve `activePlan` scope across created→now → (2) gap-fill: missing tasks → ask once (an offer, not a required step), on a yes run `workflow-planned-work --mode=spec-to-tasks` as a SUB-AGENT, else report the gap; missing mockups in `idea-to-tasks` use `work-item --mode=mockup`, `idea-to-spec` skips mockups → (3) load design context → (4) [BLOCKING] inventory UI + flows → (5) extract journeys, one todo each → (6) assemble → (7) save → (8) [BLOCKING] `review`-profile conformance check, then fidelity/demo integrity → (8b) Demo-Quality → (9) report.
- **Output/demo contract:** exactly ONE HTML at `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` (`{artifacts-root}` defaults to `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path) with inline CSS/JS, self-contained; outside assets only with the deck's declared asset policy (added automatically when an embedded prototype loads an outside asset); project or system type, no CDN/reveal.js, vanilla-JS navigation, speaker notes on every slide, a guide slide, and one interactive demo-flow slide per main journey; reuse existing `*-mockup.html` via escaped `<iframe srcdoc>` and accept only complete task full flows. The deck meets `presentation-builder`'s deck standard and passes its validator with `--profile=review` before it is reported ready.
- **Branches and evidence:** evaluate shared `isLargeIdea`; true requires the complete `large_idea_decomposition` block, stable slice IDs, and Decomposition & boundaries beside the planned work for every task and the all-task presentation; missing/conflicting fields block deck quality and the presentation never creates the product roadmap artifact (default `docs/product-roadmap.md`; a `docsRoots.productRoadmap.path` entry in `docs/project-config.json` overrides the path). `idea-to-spec` uses only design-spec ASCII/tables + narrated frames; missing visuals render an empty state; use real domain data and keep prose tech-agnostic.

**Workflow:**

1. **Resolve scope** — anchor on `activePlan`, accumulate its full artifact set across the plan's created→now date range (every `{YYMMDD}` in range, NOT just today); custom prompt widens; standalone + no prompt → `ask user question tool`.
2. **Gap-fill (smart routing — sub-agent)** — spec lacks tasks → ask once (an offer, not a required step), on a yes `workflow-planned-work --mode=spec-to-tasks` AS A SUB-AGENT, else report the gap; tasks lack mockups (mockup-bearing workflow) → `work-item --mode=mockup`. Spec-only `idea-to-spec` → SKIP mockup generation.
3. **Load project design context** — baseline + matched per-app design-system docs via `project-config.json`.
4. **[BLOCKING] Inventory existing UI + map connected flows** — `SYNC:existing-ui-research`.
5. **Accumulate + structure content (incl. journey extraction)** — parse each artifact into stakeholder sections; extract the main-story flows into an ordered journey list + todo tracking one todo per journey; REAL domain data, never Lorem (`references/artifact-accumulation.md`).
6. **Assemble ONE standalone HTML deck** — inline CSS (design tokens, BEM) + vanilla-JS engine + speaker notes on every slide + a "How to use this deck" guide slide + one interactive demo-flow slide per journey (embedded mockup + narration strip) + `<iframe srcdoc>` mockup embeds, each raw mockup scanned for outside assets first; spec-only path renders ASCII/tables + narrated ASCII frames; empty-state slide when no visual exists (`references/deck-template.md`).
7. **Save** → `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` (see "Path roots").
8. **[BLOCKING] Conformance check, then fidelity gate (incl. demo integrity)** — `validate-presentation.cjs <deck.html> --profile=review` must exit 0 (fix and re-check until it does); then validate deck visuals + every journey clicks through vs Step 4 inventory; record `Conformance (review): PASS` and `Fidelity vs existing UI: PASS|FAIL` (`references/deck-template.md`).
8b. **[BLOCKING] Demo-Quality review** — final stakeholder-comprehension pass; record `Demo quality: PASS|FAIL`.
9. **Report** — path, artifact count synthesized, demo journeys, stakeholder sections, conformance + browser-behavior + fidelity + demo-quality verdicts.

**Key Rules:**

- Emit exactly ONE self-contained HTML file; inline CSS/JS; type from the project's design tokens or the system stack (a web font the picked design-explore draft loaded is kept only by packaging its font file inside the deck — otherwise the project's type token, then the closest system stack, recorded as a departure); no external `<script src>` / `<link rel=stylesheet>` / `url(https://…)` in the deck's own markup; outside assets only with the deck's declared asset policy (added automatically when an embedded prototype loads an outside asset); no CDN reveal.js — vanilla-JS engine only.
- [BLOCKING] Never report the deck ready while `validate-presentation.cjs --profile=review` fails — fix the deck and re-check (Step 8); `presentation-builder` owns the deck standard and that validator.
- Present every in-scope main user story as an interactive MVP demo slide (embedded interactive mockup + narration strip); plan journeys first (Step 5, one todo each), sign off with the Demo-Quality review (Step 8b).
- Embed existing `-mockup.html` via `<iframe srcdoc>` — never regenerate a mockup that already exists; the mock-up is self-driving, the deck adds only narration.
- Spec-only `idea-to-spec` → design-spec ASCII wireframes + inventory/states/tokens tables + narrated ASCII-frame step-through ONLY; never generate HTML mockups, never invoke `work-item --mode=mockup`.
- Use REAL domain entity field names + realistic sample data — never Lorem ipsum or "Item 1, Item 2".
- Empty-state slide when an in-scope feature has no mockup AND no design-spec — never a broken/blank iframe.
- Run gap-fill multi-step workflows as SUB-AGENTS (summary returned + findings written to `tmp/reports/`) per CLAUDE.md "Workflow Step Advancement §3".
- Keep accompanying prose/captions tech-agnostic (business/observable terms, not framework/CSS class names); the rendered HTML may use real class names internally.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Feature Presentation — Stakeholder HTML Slide Deck](#feature-presentation--stakeholder-html-slide-deck)
- [When to Use](#when-to-use)
- [Quick Reference](#quick-reference)
- [Detailed Workflow](#detailed-workflow)
- [Slide Taxonomy (stakeholder-oriented)](#slide-taxonomy-stakeholder-oriented)
- [UI Layout](#ui-layout)
- [Edge Cases](#edge-cases)
- [Anti-Patterns](#anti-patterns)
- [Alternatives Considered](#alternatives-considered)
- [Design Rationale](#design-rationale)
- [Security Considerations](#security-considerations)
- [Next Steps](#next-steps)
- [Prompt-Enhance Closing Anchors](#prompt-enhance-closing-anchors)
- [Closing Reminders](#closing-reminders)

# Feature Presentation — Stakeholder HTML Slide Deck

Synthesize session specs, tasks, initiatives, and mockups into one standalone HTML deck for PO/BA/Dev/QC.

---

## When to Use

- Near the end of a `workflow-planned-work` run (`idea-to-tasks` or `idea-to-spec`), to present the feature set to stakeholders.
- Standalone, when PO/BA/Dev/QC need one offline deck synthesizing a feature's initiatives, specs, tasks, stories, and mockups.

**NOT for**: one task UI preview (`$work-item --mode=mockup`), Feature Spec authoring (`$spec`), or design-spec production (`$design-spec`). General-subject decks go to `$presentation-builder` (user-run) — a talk, briefing, teaching or pitch deck that does not synthesize a feature's initiatives/specs/tasks/mockups.

**Deck standard:** `presentation-builder` owns the deck standard (runtime contract `presentation-builder/references/web-runtime-contract.md`) and its validator `presentation-builder/scripts/validate-presentation.cjs`. This skill's review deck conforms to that standard under the `review` profile and passes it before hand-off (Step 8). For a read-only review deck that profile makes five checks advisory — in-place editing, editing state, local draft saving, draft reset and clean export — and keeps every other check at the same level as the `presenter` profile; the Presentation Decks spec rule BR-PD-03 owns that list, mirrored in the runtime contract's §9 "Conformance profiles" and the validator — change it there first.

---

## Quick Reference

### Path roots (resolve before reading or writing any path below)

- `{artifacts-root}` — the team-artifacts root: default `team-artifacts`; a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` overrides the path.
- `{spec-root}` — the business Feature Spec root: default `docs/specs`; a `specRoots.business.path` entry in `docs/project-config.json` overrides the path.

Both placeholders stand for the RESOLVED value everywhere they appear in this skill; write the resolved path into every deck, report, and sub-agent brief — never the placeholder.

### Input

| Source        | Path                                                         |
| ------------- | ------------------------------------------------------------ |
| Initiatives   | `{artifacts-root}/initiatives/{YYMMDD}-*`                          |
| Tasks          | `{artifacts-root}/tasks/{YYMMDD}-task-*.md`, plus any `tasks/*.md` record without a date in its name whose frontmatter date is in range |
| User stories  | `{artifacts-root}/tasks/stories/{YYMMDD}-us-*.md`             |
| Mockups       | `{artifacts-root}/tasks/*-mockup.html`                        |
| Design specs  | `{artifacts-root}/design-specs/{YYMMDD}-designspec-*.md`     |
| Feature Specs | `{spec-root}/{Bucket}/README.{Feature}.md`                   |
| Active plan   | `activePlan` in the OS-temp `CK_TMP_DIR/session/{id}.json` (the path returned by `getSessionStatePath`, written by `set-active-plan.cjs`) |
| Explicit scope | User provides specs/features as argument                    |

### Output

| Type       | Path                                                          |
| ---------- | ------------------------------------------------------------- |
| HTML deck  | `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` |

### Related

- **Input from:** `$spec`, `$work-item --mode=refine`, `$work-item --mode=story`, `$work-item --mode=mockup`, `$design-spec`
- **Deck standard + validator:** `presentation-builder` — owns the shared deck standard and `validate-presentation.cjs`; this skill passes it with `--profile=review`. General-subject decks go to `$presentation-builder` (user-run).
- **Command:** `$feature-presentation`
- **Detail:** `references/deck-template.md` (HTML scaffold + slide engine + iframe-srcdoc escaping + fidelity gate); `references/artifact-accumulation.md` (scope resolution + per-type parse map + gap-fill + branches)

---

## Detailed Workflow

### Step 1: Resolve Scope

Determine deck scope; full algorithm: `references/artifact-accumulation.md` → "Scope Resolution".

1. **Default (active-plan anchor):** Read `activePlan` from `CK_TMP_DIR/session/{id}.json` (path returned by `getSessionStatePath`, written by `.claude/scripts/set-active-plan.cjs`). Accumulate the plan's FULL artifact set across its **created→now date range** — glob `team-artifacts/{initiatives,tasks,tasks/stories,design-specs}` and `*-mockup.html` for EVERY `{YYMMDD}` in range, plus plan `docs/specs` outputs. **Both roots in that glob are DEFAULTS** — keep the brace expression exactly as written and swap the `team-artifacts` / `docs/specs` prefixes for `{artifacts-root}` / `{spec-root}` whenever `docsRoots.teamArtifacts.path` / `specRoots.business.path` are declared in `docs/project-config.json`.
    - **Multi-day rule:** a workflow that spans midnight authors specs on day 1 and tasks on day 2 — a single-day `{YYMMDD}` glob silently drops day-1 artifacts. Glob over the whole created→now range, never just today.
2. **Custom prompt:** If user names specs/features, widen scope to those artifacts plus dependents.
3. **Standalone + no prompt:** Use `ask user question tool` to ask which specs/initiatives to present — never silently guess scope.

### Step 2: Gap-Fill (Smart Routing — Sub-Agent)

Fill missing downstream artifacts; routing: `references/artifact-accumulation.md` → "Gap-Fill Routing".

1. **Spec lacks tasks:** `workflow-planned-work --mode=spec-to-tasks` is an offer, not a required step of this skill — ask the user once whether to run it; only on a yes, invoke it **AS A SUB-AGENT** (`spawn_agent` tool), briefed to run `$start-workflow workflow-planned-work --mode=spec-to-tasks` and told the user explicitly said yes — that yes is the explicit request that lets it start, since a sub-agent's own `$start-workflow` call never counts as one; otherwise report the missing tasks and continue. Per CLAUDE.md "Workflow Step Advancement §3", multi-step workflows run as sub-agents: return a summary and write full findings to `tmp/reports/` to bound deck-build context.
2. **Tasks lack `-mockup.html` AND workflow is mockup-bearing (`idea-to-tasks`):** Invoke `work-item --mode=mockup` per task; require its Releasable Full-Flow gate to PASS before embedding.
3. **Spec-only `idea-to-spec` context:** SKIP mockup generation — never invoke `work-item --mode=mockup`; use design-spec visuals only (Step 6 spec-only path), preserving the no-mockup contract.

### Step 3: Load Project Design Context

Deck CSS uses project design tokens (same discovery as `work-item --mode=mockup`):

0. **Design-explore hand-off (when supplied):** a `$ui-design --mode=explore` run whose deliverable was a Slide hands over `direction-approved.md` and `run-notes.md`. Read the Design Plan tokens from the `## Design Plan tokens` section of `direction-approved.md` and adopt the approved direction as the deck's look — its colours and type become the CSS variables; the steps below still fill any axis it leaves open. Read the journey fixes from the `## Journey fixes (UX-8)` section of `run-notes.md` and apply each to the slide map, recording each fix as applied or `N/A — <reason>` in the Step 9 hand-off line. A web font the picked draft loaded is kept only by packaging its font file inside the deck (an embedded font file — the deck still loads nothing from a network, Step 6); otherwise it is replaced by the project's type token, then the closest system stack, and the replacement is recorded as a departure in the Step 9 hand-off line.

1. **Mandatory baseline:** Read `design-system/README.md` and `design-system/design-system-canonical.md` under the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).
2. **Primary:** Read top-level `designSystem` in `docs/project-config.json` — use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the presented feature/app context against `designSystem.appMappings[]` to select the per-app doc.
3. **Fallback:** `Glob("docs/project-reference/design-system/*.md")` → case-insensitive substring match on app/feature name. **Default:** `README.md`. The glob's `docs/project-reference` prefix is the DEFAULT root; substitute the value of `docsRoots.projectReference.path` from `docs/project-config.json` when it is declared, leaving the rest of the pattern unchanged.
4. Extract colors, typography, spacing, border-radius, shadows → these become the deck's CSS variables.

### Step 4: [BLOCKING] Inventory Existing UI + Map Connected Flows

> **[BLOCKING] Complete `SYNC:existing-ui-research` before assembly:** inventory related UI, not generic HTML; classify Common/Domain-Shared/Page components with base/owner; map connected flows; reuse before inventing; record findings. Skip only backend-only work and state that explicitly.

1. Read the first 200 lines of `frontend-patterns-reference.md` in the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — base components, form/table/dialog patterns.
2. Sample 2–3 real shared/module components for layout and CSS naming.
3. Map connected feature flows so embedded visuals fit surrounding navigation.

### Step 5: Accumulate + Structure Content (incl. journey extraction — think → plan → many todos)

Parse each in-scope artifact into stakeholder slide sections (see Slide Taxonomy); parse map: `references/artifact-accumulation.md` → "Per-Artifact-Type Parse Map".

- Use REAL domain entity field names + realistic sample data from `domain-entities-reference.md` in the project-reference root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path) — never Lorem ipsum or "Item 1, Item 2".
- Keep accompanying prose/captions tech-agnostic (business/observable terms, not framework/CSS class names).
- **Extract each task's priority/rank** — read the `priority_label` label + integer `priority` rank from each task's frontmatter (a task holding a label in `priority` and a number in `rank` reads the same way) (and the ranked-order planned-work artifact `{artifacts-root}/backlog/*-backlog.md` when present). The Scope & planned work slide MUST display tasks in ranked order with a priority label per task card — the deck carries the same priority info the planned work and mockups do. If tasks lack priority, note it explicitly rather than dropping the field.
- **Extract the decomposition context** — locate the owning initiative/spec/task block; evaluate shared `isLargeIdea`; when any signal is true, validate all five `large_idea_decomposition` fields (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and preserve each slice ID through every task/story/mockup. Add a Decomposition & boundaries slide (or equivalent Scope & planned work section) with dependency order, non-goals, evidence owners, and deferred-work ownership. If all signals are false, record `Decomposition: N/A — ordinary isolated scope` and do not invent a roadmap section.
- **Extract the main-story / MVP flows into an ordered journey list** — from task `## Acceptance Criteria` GIVEN/WHEN/THEN + story "As a / I want / So that" + each mock-up's flow-specs (`references/artifact-accumulation.md` §6 Journey-Extraction Map). One journey per main user story (MVP happy path), each an ordered sequence: entry → click steps ("click X → see Y → move to Z") → end state + one plain-language explanation per step. When a `-mockup.html` exists, reuse its flow-specs verbatim so the deck demo == the per-task prototype.
- **todo tracking one todo per journey slide** — so each journey is assembled (Step 6) and later verified (Step 8 demo integrity / final demo-quality review) individually. (The "think → plan → many todos before do".)

### Step 6: Assemble ONE Standalone HTML Deck

Build the single self-contained HTML from `references/deck-template.md`:

- Inline `<style>` — design-token CSS variables, BEM classes, light/dark themes; font stack from the project's design tokens, else the system stack — never a web-font link in the deck's own markup; a web font the picked design-explore draft loaded is kept only by packaging its font file inside the deck, otherwise it is replaced by the project's type token, then the closest system stack, and recorded as a departure (Step 3 item 0, Step 9).
- Every slide is a `<section class="slide deck__slide">` with an `<h2>` title and its own speaker notes (`references/deck-template.md` §1) — no slide ships without notes. Slide bodies never nest `<section>`: the checker ends a slide at the first `</section>`, so group content inside a slide with `<div>`.
- Vanilla-JS slide engine from the §1 scaffold — Previous/Next buttons, arrow keys, PageUp/PageDown, Space (Shift+Space goes back), `Home`/`End`, All slides (overview), Notes, fullscreen, theme toggle, and a "Slide N of M" status; no nav dots, no CDN reveal.js. On a slide whose content overflows, the vertical keys scroll it first and change slide only at its edge; while Tab has put the focus in the notes they scroll only the notes, even at the notes' edge, and move neither the page nor the slide (runtime contract §3). Key presses inside an embedded demo stay in the demo; OPTIONAL `postMessage('play')` auto-starts a journey only when supported (`references/deck-template.md` §3b).
- **"How to use this deck" guide slide** near the top — teach navigation (Previous/Next and the arrow, PageUp/PageDown, Space, `Home`/`End` keys), All slides (overview), Notes and Escape to close them, Tab into the notes to scroll them (there the scroll keys move only the notes; press Tab or click outside them to move the deck again), each mock-up's hotspots and ▶ Play / ⏮ ⏭ / ↺ Reset demo controls, leaving a demo (after clicking into one, click outside it, or press Tab until you leave it, to use the arrow keys for slides again), and Full screen and Dark theme (`references/deck-template.md` §3b).
- **Outside-asset scan (before escaping each raw `-mockup.html`):** search the raw mockup, case-insensitively (flag `i`), with the regex `(?<![\w-])(?:src|poster|data)\s*=\s*["']?\s*(?:https?:)?//|(?<![\w-])srcset\s*=\s*["']?[^"'>]*//|<(?:link|image|use)\b[^>]*?(?<![\w-])(?:xlink:)?href\s*=\s*["']?\s*(?:https?:)?//|url\(\s*["']?\s*(?:https?:)?//|@import\s*["']?\s*(?:https?:)?//` — it uses look-behind, so run it as a JavaScript RegExp with the `i` flag (`new RegExp(pattern, 'i')` in node) or with `grep -Pi` / `rg --pcre2 -i`; never `grep -E` or plain `rg`, which miss every hit silently or refuse the pattern. It flags only what the mockup LOADS from a network address (protocol-relative `//` included): a `src`, `poster` or `data` (object) attribute, a network address anywhere in a `srcset`, a `<link>` (or SVG `<image>`/`<use>`) `href`, a `url(…)`, or an `@import` with or without a space. A plain link (`<a href="https://…">`), a `data-src`-style attribute and an address shown as text are not loads and are not flagged. Any hit in any mockup → add `<meta name="presentation-asset-policy" content="external-allowed">` to the deck's `<head>` and put the viewer notice "Demos load outside assets; open online to see them exactly." on the how-to slide — demos need a network to show them exactly. No hit in any mockup → no meta, no notice. Record `Outside assets: declared ({N} mockups) | none`. The deck's own markup never loads an outside asset either way.
- **Demo-flow slides (one per Step 5 journey):** embed flow-scoped interactive `work-item --mode=mockup` HTML via escaped `<iframe srcdoc="…escaped…">` with a text-only narration strip beside the embed (never over it) listing each step with a plain-language explanation and "⚠ Simulated". Controls stay inside the self-driving mock-up; the deck adds no duplicate interactivity (`references/deck-template.md` §3b).
- **Mockup-bearing path (`idea-to-tasks`):** embed each existing `-mockup.html` via `<iframe srcdoc="…escaped…">`; use `&`-first, escape-once-unconditionally from `references/deck-template.md`. Never regenerate an existing mockup.
- **Decomposition integrity:** the deck aggregates; it must not split, merge, rename, or reinterpret slice IDs. Flag conflicts to the owning task/spec/refine step and stop fidelity validation until resolved.
- **Spec-only path (`idea-to-spec`):** render design-spec ASCII wireframes plus Component Inventory / States / Design-Tokens tables; each journey is a narrated wireframe demo with ONE SLIDE PER ASCII FRAME, so Next advances the frames — ids `demo-{journey-slug}`, `demo-{journey-slug}-2`, `demo-{journey-slug}-3`, … — each slide an escaped `<pre class="deck__wireframe">` made a named, focusable region (`tabindex="0" role="region" aria-label`) with no iframe and no empty-state line, keeping its narration and "⚠ Simulated" note (`references/deck-template.md` §3b "Spec-only wireframe demo"). NO `<iframe srcdoc>` mockup, NEVER invoke `work-item --mode=mockup`.
- **Escape inserted text:** every value placed into a `{…}` placeholder (element text or attribute value) and every ASCII wireframe is HTML-escaped once before insertion, `&` first, then `<` `>` `"` `'` (`references/deck-template.md` §1 "Escape every inserted value"). An unescaped `</section>` in inserted text ends the slide early for the conformance check — a deck defect to fix.
- **Continuation slides:** a job that needs more than one slide keeps its id and numbers each continuation from 2 (`rules`, `rules-2`) so every `data-slide-id` stays unique and job-named.
- **Empty-state (F3):** when a feature has NO `-mockup.html` AND NO design-spec, render "No prototype or design available for {feature}" — never a broken/blank iframe; drop that slide's "⚠ Simulated" note and use the no-visual notes variant (`references/deck-template.md` §3b).

### Step 7: Save

- **Path:** `{artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html` — `{artifacts-root}` defaults to `team-artifacts` and is relocated by a `docsRoots.teamArtifacts.path` entry in `docs/project-config.json` (create the `presentations/` dir under it if absent).
- `{slug}` = the presented feature(s) or plan slug.

### Step 8: [BLOCKING] Conformance Check, then Fidelity Validation — Deck Matches Existing UI

> **[BLOCKING] Conformance check first — run `presentation-builder`'s validator with the `review` profile on the saved deck:**
>
> ```
> node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> --profile=review
> ```
>
> Exit 0 is required. Exit 1 → fix every failed check in the deck and re-run until it exits 0. Exit 2 → a usage or read error: report it with its stderr and treat the check as not passed. **Never report the deck ready while the check fails** — a failing deck is fixed and re-checked, never handed off.
>
> **Checker defect:** if a failed check names something the deck visibly satisfies (for example notes reported missing on a slide that has them), treat it as a checker defect — stop the fix loop, report the check, the slide and the evidence to the user, and do not report the deck ready. First confirm no slide body nests `<section>` and no inserted text or wireframe carries an unescaped `<`, `&` or `</section>` (Step 6): the checker ends a slide at the first `</section>`, so either one is a deck defect to fix, not a checker defect.

Alongside the check, confirm the outside-asset contract: search the deck with every `srcdoc="…"` attribute value removed using the Step 6 regex, case-insensitively, in a look-behind engine (a JavaScript RegExp with the `i` flag, `grep -Pi` or `rg --pcre2 -i`; never `grep -E` or plain `rg`) — the deck's own markup must load nothing, so it has zero hits (a plain `<a href>` link in notes or evidence is not a load and does not count); the `presentation-asset-policy` meta is present exactly when the Step 6 mockup scan found an outside asset.

A static PASS is not browser proof. Record the browser behaviors — notes open/close/Escape, overview focus, keyboard navigation (including clicker keys after a button click), keyboard scroll-then-advance on an overflowing slide at 200% zoom / narrow width, notes readable by keyboard at 125–150% zoom with the deck not moving while the focus is in them, notes panel visible when opened at narrow width, text and control contrast in both themes after token substitution, print, reduced motion (no smooth scrolling, no demo auto-play), the screen-reader names of the controls and the notes panel, and the no-JavaScript fallback (every slide readable as one page, controls hidden) — each as browser-verified or `NOT VERIFIABLE`; never fold an unexercised behavior into the PASS.

> **[BLOCKING] After the conformance check passes, run `references/deck-template.md` → "[BLOCKING] Fidelity Gate" against the Step 4 UI inventory.** Do NOT report done until a result is recorded.

The gate also covers **demo integrity** — every journey slide clicks end-to-end in its iframe, reaches its end state via real hotspots, has no dead controls, lists each step with a plain-language explanation in tech-agnostic narration (M1/M2), shows "⚠ Simulated", and advances spec-only ASCII frames one slide per frame without an empty-state line beside the wireframe.

**Optional render evidence (when html-export is installed):** `node .claude/skills/html-export/scripts/export.cjs --to=png <deck.html> --slides=section.deck__slide` captures every slide. Exit 0 is evidence ONLY for first-load and per-slide render, zero page errors, and no blank captures; demo click-through and the other gate items stay `NOT VERIFIABLE` unless exercised another way. **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `$html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.

Record the outcome in the Step 9 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / embeds / demos matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the deck to match the existing UI and re-validate before handoff.

**Re-check after every fix:** any edit made for a fidelity, demo-integrity or Step 8b Demo-Quality failure changes the deck, so re-run the `--profile=review` conformance check on the saved deck before recording the verdicts again — `Conformance (review): PASS` in the Step 9 report is the result of the check on the final deck, never of an earlier version.

### Step 8b: [BLOCKING] Demo-Quality Review (final review todo)

> **[BLOCKING] Final review before the report (the per-journey todos and this gate were created in Step 5).** First confirm the deck **SATISFIES the intent**: every in-scope main user story is presented as a journey (coverage — no main story missing) AND each journey faithfully conveys that story's intended behavior, not merely that slides render. Then run a stakeholder-comprehension pass: *could a PO with no prior context follow each journey end-to-end?* Confirm every demo-flow slide clicks through, narration explains each step in plain language, the "⚠ Simulated" note is present, and the spec-only path degrades to narrated ASCII frames (never an HTML mockup). Record `Demo quality: PASS | FAIL` — FAIL if any main story is unrepresented or misrepresented, regardless of polish.

If **FAIL**, fix the journey slides (re-extract from the §6 journey map / re-embed the flow-scoped mockup), re-run the Step 8 conformance check, and re-review before handoff.

### Step 9: Report to User

After assembly, output:

```
Deck generated: {artifacts-root}/presentations/{YYMMDD}-presentation-{slug}.html
- Artifacts synthesized: {count} ({initiatives}/{specs}/{tasks}/{stories}/{mockups}/{design-specs})
- Planned-work priority: {ranked | not prioritized} — Scope & planned work slide shows {N} tasks in ranked order with priority labels
- Demo journeys: {count} ({journey titles})
- Stakeholder sections: {title, how-to-demo, business-context, scope-backlog, behavior-rules, demo-flows, ui-mockups, qc-view, summary}
- Conformance (review): PASS
- Browser behaviors: {notes open/close/Escape, notes readable by keyboard at 125–150% zoom with the deck not moving while the focus is in them, overview focus, keyboard, keyboard scroll-then-advance on an overflowing slide at 200% zoom / narrow width, notes panel visible when opened at narrow width, text and control contrast in both themes after token substitution, print, reduced motion, screen-reader names of the controls, no-JavaScript fallback} — each browser-verified | NOT VERIFIABLE
- Outside assets: declared ({N} mockups) | none
- Design-explore hand-off: none | journey fixes: {each fix — applied | N/A — <reason>}; departures from the picked direction: none | {e.g. web font → system stack}
- Fidelity vs existing UI: PASS | FAIL
- Demo quality: PASS | FAIL

Open in browser to preview. Click highlighted hotspots or press ▶ Play to walk a journey; use Previous/Next or the arrow keys to move between slides, All slides to jump, Notes for the talk track; theme toggle for light/dark.
```

When html-export is installed, offer a PDF copy: `node .claude/skills/html-export/scripts/export.cjs --to=pdf <deck.html> --page=1920x1080` (the deck's print styles put one slide per page); fall back to the slides route `--to=pdf <deck.html> --slides=section.deck__slide` when the print route fails (apply the Step 8 exit rule).

---

## Slide Taxonomy (stakeholder-oriented)

Every slide section must serve the four stakeholder audiences (PO/BA/Dev/QC):

| Section                | Audience  | Content                                                                                  |
| ---------------------- | --------- | ---------------------------------------------------------------------------------------- |
| **Title / agenda**     | all       | Feature(s) presented, run date, scope                                                    |
| **How to use this deck** | all     | Early guide slide: navigation (Previous/Next, arrow/PageUp/PageDown/Space/`Home`/`End` keys), All slides (overview), Notes and Escape, Tab into the notes to scroll them (the scroll keys then move only the notes), each demo's hotspots and own ▶ Play / ⏮ ⏭ / ↺ Reset controls (inside the mock-up), leaving a demo (click outside it, or press Tab until you leave it), Full screen and Dark theme; the outside-asset viewer notice when declared (`references/deck-template.md` §3b) |
| **Business context**   | PO/BA     | Problem, value, initiative→spec narrative, areas/features                                                |
| **Scope & planned work**    | PO/BA/Dev | Tasks (in ranked order, each card showing its priority label + numeric rank from task frontmatter / planned work), user stories, acceptance criteria — priority is MANDATORY when tasks are prioritized |
| **Behavior & rules**   | Dev/QC    | Feature Spec §4 business rules / §5 invariants, §8 test cases                             |
| **Demo flows / user journeys** | all | One interactive MVP demo slide per main user story: embedded interactive mockup scoped to the flow + a narration strip explaining each step ("click X → see Y → move to Z"); spec-only → narrated ASCII frames (`references/deck-template.md` §3b) |
| **UI / mockups**       | all       | Embedded `work-item --mode=mockup` HTML (idea-to-tasks) OR design-spec ASCII + tables (idea-to-spec) OR empty-state |
| **QC view**            | QC/QA     | Test specifications, states matrix, edge cases                                           |
| **Summary / next steps** | all     | Recap, decisions needed, next workflow steps                                             |

---

## UI Layout

The deck is itself a UI artifact. ASCII of a slide frame:

```
┌────────────────────────────────────────────────┐
│  ## Business Context                            │  ← slide title (h2); no top bar
│  • Problem  • Value  • Areas                     │  ← slide body (design-system tokens)
│  ┌──────────────────────────────────────────┐   │
│  │  <iframe srcdoc> embedded mockup / wire   │   │  ← embedded visual (or empty-state)
│  └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│  Slide 3 of 12: Business Context                │  ← status (live region) = the only counter
│  Previous  Next  All slides  Notes  Full screen │  ← text-labelled controls (+ Dark theme)
└────────────────────────────────────────────────┘
```

Component tiers: common (slide shell, controls, status, notes panel, overview) — domain-shared (mockup/wireframe embed block) — page-app (per-artifact content slides). Keyboard: arrows, PageUp/PageDown, Space, `Home/End`; All slides opens an overview of every slide title; Notes opens the speaker-notes panel beside the slide; theme toggle (light/dark) reusing design-system tokens.

---

## Edge Cases

| Scenario                                       | Handling                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Scope resolves to zero artifacts               | Emit an explicit empty-state slide rather than failing (Step 6 / TC-026) |
| Spec without tasks (mockup-bearing workflow)    | Ask once (an offer); on a yes, `workflow-planned-work --mode=spec-to-tasks` sub-agent (Step 2) |
| Spec-only `idea-to-spec`                       | Design-spec visuals only + narrated ASCII-frame step-through; never generate mockups, never invoke `work-item --mode=mockup` (Step 2 / Step 6) |
| Feature with no mockup AND no design-spec      | Empty-state slide ("No prototype or design available") — never blank iframe |
| Demo iframe focused while navigating slides    | Keys inside a demo stay in the demo; click outside it, or press Tab until you leave it, to navigate — the how-to slide says so (Step 6 / `deck-template.md` §3b) |
| Embedded mockup loads a web font or other outside asset | Declare the deck's asset policy + how-to viewer notice (Step 6 outside-asset scan); the deck's own markup still loads nothing |
| Deck fails the `review` conformance check      | Fix the failed checks and re-run; never report the deck ready while it fails (Step 8) |
| Workflow spans midnight (multi-day)            | Glob over plan's created→now range, not just today's `{YYMMDD}` (Step 1) |
| Standalone invocation with no prompt/scope     | `ask user question tool` which specs/initiatives to present (Step 1)                   |

---

## Anti-Patterns

| Anti-Pattern                                  | Correct Approach                                                   |
| --------------------------------------------- | ----------------------------------------------------------------- |
| CDN reveal.js / impress.js                    | The scaffold's vanilla-JS engine, self-contained                  |
| Web-font link in the deck's own markup        | Project or system type; declare the asset policy only for embedded demos that load outside assets |
| Reporting the deck ready on a failing check   | Fix, re-run `--profile=review` until exit 0, then report           |
| Regenerating a mockup that already exists     | Embed the existing `-mockup.html` via `<iframe srcdoc>`           |
| HTML mockups in `idea-to-spec`                | Design-spec ASCII wireframes + tables only (spec-only contract)   |
| Link to external mockup files                 | Inline via `<iframe srcdoc>` — one standalone file                |
| Lorem ipsum / "Item 1, Item 2"               | Real domain entity field names + realistic sample data            |
| Broken/blank iframe for a missing visual      | Explicit empty-state slide                                         |
| Running gap-fill workflow inline              | Run multi-step gap-fill workflows as SUB-AGENTS (context bounded)  |

---

## Alternatives Considered

1. **Extend `work-item --mode=mockup` with `--deck`** (rejected) — it serves one task; a synthesis deck has different inputs/audience. Separate ownership preserves single responsibility and the spec-only contract.
2. **CDN reveal.js / impress.js** (rejected) — breaks offline/no-external-deps and adds supply-chain risk; the scaffold's vanilla-JS engine matches `work-item --mode=mockup`'s zero-dependency posture.
3. **Link mockup files** (rejected) — violates the ONE-file mandate; `<iframe srcdoc>` keeps the deck portable when files move.

## Design Rationale

**Chosen:** a standalone synthesis skill and one inline HTML deck that reuses existing mockups through `<iframe srcdoc>`. Larger HTML trades size for offline portability. Existing-UI research/fidelity, spec-only/empty-state branches and delegated gap-fill preserve their respective contracts.

---

## Security Considerations

`<iframe srcdoc>` embeds first-party generated mockup HTML only — no remote content or user-supplied script. Entity-escape `srcdoc` (`&` first, once) to prevent `</iframe>`/`<script>` breakout. Demos run unsandboxed — the demo iframe has no `sandbox` attribute — so mockups keep their own scripts and storage; a mockup runs with the deck's origin, so only first-party mockups are embedded, and the outside assets it loads follow the asset policy (Step 6). The deck is self-contained; outside assets only with the deck's declared asset policy (added automatically when an embedded prototype loads an outside asset), and its own markup outside `srcdoc` loads nothing from a network; artifacts contain no secrets.

---

## Next Steps

> **Inside a workflow:** when this skill runs as a step of an active workflow, skip the prompts in this section and return the result — the workflow's next step decides what runs (`$start-workflow` → Step Execution Protocol, Workflow-step mode).

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** After completion, MUST ATTENTION use `ask user question tool` to present these options; the user decides, even when the task seems simple:

- **"Open the deck"** — open the standalone HTML in a browser to review with stakeholders
- **"$prioritize"** — prioritize the synthesized tasks in the planned work
- **"$plan"** — start implementation planning
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use todo tracking to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `design-distinctiveness-gate` — Design identity gate DD-1 to DD-8: subject, design plan, generic test, restraint; designing, implementing or reviewing a visual surface → .claude/skills/shared/protocols/design-distinctiveness-gate.md
- `design-review-checklist` — Executable front-end design review protocol CL-1 to CL-6; reviewing, planning or building front-end work → .claude/skills/shared/protocols/design-review-checklist.md
- `existing-ui-research` — Study the existing UI before designing or specifying a screen; designing or specifying a new or updated screen → .claude/skills/shared/protocols/existing-ui-research.md

<!-- PROTOCOL-GUIDES:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval; inside a workflow run, `$start-workflow` → Workflow-step mode bounds this
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->


<!-- SYNC:design-distinctiveness-gate:reminder -->

- **MUST ATTENTION** apply the design distinctiveness gate (`DD-1`–`DD-8`) to any user-facing visual surface: ground it in the named subject/audience/job and confirm when the brief is silent (`DD-1`) · every choice carries a WHY, token names included (`DD-2`) · write a design plan (colour 4–6 named hex · type families+roles+scale · layout prose+ASCII+alignment · principles) then run the BLOCKING generic test and state what you revised BEFORE coding (`DD-3`) · audit every free axis against the T1–T5 tell catalog — cream+serif+`#D97757`, acid-on-black, broadsheet, the SaaS-card kit, template chrome (ALL-CAPS eyebrows, `A · B · C`, spaced-em-dash labels, `#0B0B0B`, mono data labels, trailing `→`) — a match is a missed decision, never a defect (`DD-4`) · 1–2 clearly distinct families, real scale, <80ch, no single-word headline accent / ALL-CAPS labels / redundant eyebrows (`DD-5`) · numbering only on real sequences; hero = the subject's most characteristic thing, not big-number+gradient (`DD-6`) · one orchestrated motion moment, never per-section entrances plus universal card hovers (`DD-7`) · spend boldness once, critique the BUILT page, remove one accessory (`DD-8`). The brief's stated direction OUTRANKS the tell catalog; project design-system docs OUTRANK these clauses — genuine conflicts go to the user, NEVER resolved silently. Cite findings as `DD-<clause>` + `file:line`. Skip ONLY for surfaces with no user-facing visuals, stated explicitly.

<!-- /SYNC:design-distinctiveness-gate:reminder -->

<!-- SYNC:design-review-checklist:reminder -->

- **MUST ATTENTION** when the change/plan/artifact has an applicable user-facing UI surface, READ `.claude/docs/design-review-checklist.md` and run it: `CL-1` establish context first (platform · user · task · metric · constraints · scope · artifacts — state missing context and its confidence impact) · `CL-2` evidence or nothing, cite a location per finding, NEVER invent a measurement (unmeasurable → `NOT VERIFIABLE`), tag `MEASURED`/`OBSERVED`/`HEURISTIC` · `CL-3` rank `P0`–`P4`, cap at top 10 by severity, NEVER pad, concrete fix on every `P0`/`P1` · `CL-4` sweep §A–§N plus §R over whole surfaces (changed files → affected views, composition reconstructed, render or `ENVIRONMENT-BLOCKED`), including surface load B12–B15, container fit E9–E11, §H by usage, Field Necessity Matrix for input, applying only relevant platform/product sections and the WCAG 2.2 AA web baseline plus any stricter applicable legal/project requirement, or the documented standard for other platforms · `CL-5` short on time → use the §P prompts · `CL-6` report in the §O shape · for source code, assess component ownership, base abstractions, reuse, and duplication using the project's documented taxonomy or observed boundaries. Project design-system docs and ADRs OUTRANK the checklist; report a defect ONCE across `UI-*`/`DD-*`/`CL-*`. For a plan, bind only applicable sections and states to acceptance criteria, and name each UI view's primary task, container, information priority, and creation-vs-deferred inputs; a plan review flags a UI phase that omits them. Skip when the work has no user-facing UI surface, and state why.

<!-- /SYNC:design-review-checklist:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Synthesize every in-scope session initiative, Feature Spec, task, user story, design-spec, and mockup into ONE project-faithful standalone HTML deck with a vanilla-JS engine and interactive MVP demos for every main journey, so PO/BA/Dev/QC review the feature from one offline file before build.

**IMPORTANT MUST ATTENTION Main steps/modes (in order):** (1) resolve scope (`activePlan` created→now; custom prompt widens; standalone/no prompt asks) → (2) gap-fill (ask once, on a yes `workflow-planned-work --mode=spec-to-tasks` SUB-AGENT; `idea-to-tasks` missing mocks → `work-item --mode=mockup`; `idea-to-spec` skips) → (3) design context → (4) [BLOCKING] UI/flow inventory → (5) artifacts + journeys/todos → (6) one deck, or spec-only ASCII/empty state → (7) save → (8) [BLOCKING] `review`-profile conformance, then fidelity + demo integrity → (8b) [BLOCKING] Demo-Quality → (9) report. NEVER skip blocking gates or journey extraction — why: forgotten branches or gates produce incomplete, ungated decks.

**IMPORTANT MUST ATTENTION** keep one self-contained deck, reuse first-party mockups with `&`-first escape-once `srcdoc`, and declare outside assets only when the raw embed scan finds them. The deck's own markup loads nothing. Preserve notes, the how-to slide, narrated interactive journeys and "⚠ Simulated"; spec-only uses ASCII frames, missing visuals use explicit empty states.
**IMPORTANT MUST ATTENTION** existing-UI inventory, conformance, fidelity/demo integrity and final Demo-Quality gates are blocking. Re-check conformance after every deck edit; a static PASS is not browser proof. Report each unexercised browser behavior `NOT VERIFIABLE`.
**IMPORTANT MUST ATTENTION** resolve configurable roots, keep the active plan's created→now scope, ranked priorities and stable decomposition IDs. Manual-tier gap-fill needs the user's yes and runs as a sub-agent; standalone missing scope asks. Use real domain data, tech-agnostic narration and cited evidence (>80% to act); add final-review tasks and confirm next steps with the user.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
| "Static PASS proves the demo" | Exercise every main journey and report missing browser evidence. |
| "Rebuild a cleaner mockup" | Embed the existing self-driving first-party mockup; the deck adds narration only. |
| "Use today's artifacts" | Scope spans the active plan's created→now range. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using todo tracking.
