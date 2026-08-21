---
name: feature-presentation
version: 1.0.0
description: '[Documentation] Use when you need to synthesize all generated specs, PBIs, ideas and mockups into one standalone HTML slide presentation for stakeholders (PO/BA/Dev/QC).'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Synthesize every session-generated idea, Feature Spec, PBI, user story, design-spec, and mockup into ONE standalone HTML slide deck for PO/BA/Dev/QC — project-faithful styling, an interactive MVP demo of every main user journey, vanilla-JS slide engine — so the whole team reviews the feature from a single offline file before build.

**Summary:**

- **Purpose / altitude:** a SYNTHESIS deck at a higher altitude than `pbi-mockup` — accumulates many artifacts (ideas + specs + PBIs + stories + design-specs + mockups) into ONE stakeholder presentation, not one PBI's UI preview.
- **Main steps (read-this-if-nothing-else):** (1) resolve scope on `activePlan` created→now range → (2) gap-fill missing PBIs/mockups via SUB-AGENT → (3) load project design context → (4) [BLOCKING] inventory existing UI + map flows → (5) accumulate + extract main-story journeys (one todo each) → (6) assemble ONE standalone HTML deck → (7) save → (8) [BLOCKING] fidelity gate (incl. demo integrity) + (8b) Demo-Quality review → (9) report.
- **Output:** exactly ONE self-contained HTML file at `team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html` — inline CSS/JS, Google Fonts only, NO CDN (no reveal.js); a ~60-line vanilla-JS slide engine (keyboard ←/→/Home/End, nav dots, counter, light/dark toggle).
- **Interactive demo + mockup reuse:** every in-scope main user story is an **interactive MVP demo slide** ("click X → see Y → move to Z") with a plain-language narration strip + a "How to drive this demo" guide slide near the top; existing `team-artifacts/pbis/*-mockup.html` are REUSED (never regenerated), embedded via `<iframe srcdoc="…entity-escaped…">` (escaping rule in `references/deck-template.md`) — the mock-up is self-driving, the deck adds only narration; journeys are planned as an ordered list (Step 5, one todo each) and signed off by the final Demo-Quality review (Step 8b).
- **Spec-only branch:** `idea-to-spec` degrades to design-spec visuals (ASCII wireframes + inventory/states/tokens tables) + a narrated step-through of ASCII frames — NO HTML mockups, NO `pbi-mockup` invocation — preserving the spec-only contract; full HTML mockups appear only in `idea-to-pbi`.

**Workflow:**

1. **Resolve scope** — anchor on `activePlan`, accumulate its full artifact set across the plan's created→now date range (every `{YYMMDD}` in range, NOT just today); custom prompt widens; standalone + no prompt → `AskUserQuestion`.
2. **Gap-fill (smart routing — sub-agent)** — spec lacks PBIs → `workflow-spec-to-pbi` AS A SUB-AGENT; PBIs lack mockups (mockup-bearing workflow) → `pbi-mockup`. Spec-only `idea-to-spec` → SKIP mockup generation.
3. **Load project design context** — baseline + matched per-app design-system docs via `project-config.json`.
4. **[BLOCKING] Inventory existing UI + map connected flows** — `SYNC:existing-ui-research`.
5. **Accumulate + structure content (incl. journey extraction)** — parse each artifact into stakeholder sections; extract the main-story flows into an ordered journey list + `TaskCreate` one todo per journey; REAL domain data, never Lorem (`references/artifact-accumulation.md`).
6. **Assemble ONE standalone HTML deck** — inline CSS (design tokens, BEM) + vanilla-JS engine + a "How to drive this demo" guide slide + one interactive demo-flow slide per journey (embedded mockup + narration strip) + `<iframe srcdoc>` mockup embeds; spec-only path renders ASCII/tables + narrated ASCII frames; empty-state slide when no visual exists (`references/deck-template.md`).
7. **Save** → `team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html`.
8. **[BLOCKING] Fidelity gate (incl. demo integrity)** — validate deck visuals + every journey clicks through vs Step 4 inventory; record `Fidelity vs existing UI: PASS|FAIL` (`references/deck-template.md`).
   8b. **[BLOCKING] Demo-Quality review** — final stakeholder-comprehension pass; record `Demo quality: PASS|FAIL`.
9. **Report** — path, artifact count synthesized, demo journeys, stakeholder sections, fidelity + demo-quality verdicts.

**Key Rules:**

- Emit exactly ONE self-contained HTML file; inline CSS/JS; no external `<script src>` / `<link rel=stylesheet>` except Google Fonts; no CDN reveal.js — vanilla-JS engine only.
- Present every in-scope main user story as an interactive MVP demo slide (embedded interactive mockup + narration strip); plan journeys first (Step 5, one todo each), sign off with the Demo-Quality review (Step 8b).
- Embed existing `-mockup.html` via `<iframe srcdoc>` — never regenerate a mockup that already exists; the mock-up is self-driving, the deck adds only narration.
- Spec-only `idea-to-spec` → design-spec ASCII wireframes + inventory/states/tokens tables + narrated ASCII-frame step-through ONLY; never generate HTML mockups, never invoke `pbi-mockup`.
- Use REAL domain entity field names + realistic sample data — never Lorem ipsum or "Item 1, Item 2".
- Empty-state slide when an in-scope feature has no mockup AND no design-spec — never a broken/blank iframe.
- Run gap-fill multi-step workflows as SUB-AGENTS (summary returned + findings written to `plans/reports/`) per CLAUDE.md "Workflow Step Advancement §3".
- Keep accompanying prose/captions tech-agnostic (business/observable terms, not framework/CSS class names); the rendered HTML may use real class names internally.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Feature Presentation — Stakeholder HTML Slide Deck

Synthesize all session-generated specs, PBIs, ideas, and mockups into one standalone HTML slide presentation for PO/BA/Dev/QC.

---

## When to Use

- Near the end of `workflow-idea-to-pbi` and `workflow-idea-to-spec`, to present the whole feature set to stakeholders.
- Standalone, when a PO/BA/Dev/QC needs one offline deck synthesizing a feature's ideas, specs, PBIs, stories, and mockups.

**NOT for**: Generating a single PBI's UI preview (use `/pbi-mockup`), authoring a Feature Spec (use `/spec`), or producing a design spec (use `/design-spec`).

---

## Quick Reference

### Input

| Source         | Path                                                              |
| -------------- | ----------------------------------------------------------------- |
| Ideas          | `team-artifacts/ideas/{YYMMDD}-*`                                 |
| PBIs           | `team-artifacts/pbis/{YYMMDD}-pbi-*.md`                           |
| User stories   | `team-artifacts/pbis/stories/{YYMMDD}-us-*.md`                    |
| Mockups        | `team-artifacts/pbis/*-mockup.html`                               |
| Design specs   | `team-artifacts/design-specs/{YYMMDD}-designspec-*.md`            |
| Feature Specs  | `docs/specs/{Bucket}/README.{Feature}.md`                         |
| Active plan    | `activePlan` in `/tmp/ck-session-{id}.json` (set-active-plan.cjs) |
| Explicit scope | User provides specs/features as argument                          |

### Output

| Type      | Path                                                             |
| --------- | ---------------------------------------------------------------- |
| HTML deck | `team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html` |

### Related

- **Input from:** `/spec`, `/refine`, `/story`, `/pbi-mockup`, `/design-spec`
- **Command:** `/feature-presentation`
- **Detail:** `references/deck-template.md` (HTML scaffold + slide engine + iframe-srcdoc escaping + fidelity gate); `references/artifact-accumulation.md` (scope resolution + per-type parse map + gap-fill + branches)

---

## Detailed Workflow

### Step 1: Resolve Scope

Determine which artifacts the deck synthesizes. See `references/artifact-accumulation.md` → "Scope Resolution" for the full algorithm.

1. **Default (active-plan anchor):** Read `activePlan` from `/tmp/ck-session-{id}.json` (set by `.claude/scripts/set-active-plan.cjs`). Accumulate the plan's FULL artifact set across the plan's **created→now date range** — glob `team-artifacts/{ideas,pbis,pbis/stories,design-specs}` and `*-mockup.html` for EVERY `{YYMMDD}` in that range, plus the plan's `docs/specs` outputs.
    - **Multi-day rule:** a workflow that spans midnight authors specs on day 1 and PBIs on day 2 — a single-day `{YYMMDD}` glob silently drops day-1 artifacts. Glob over the whole created→now range, never just today.
2. **Custom prompt:** If the user names specs/features, widen scope to those named artifacts (plus their dependents).
3. **Standalone + no prompt:** Use `AskUserQuestion` to ask which specs/ideas to present — never silently guess scope.

### Step 2: Gap-Fill (Smart Routing — Sub-Agent)

Fill missing downstream artifacts so the deck is complete. See `references/artifact-accumulation.md` → "Gap-Fill Routing".

1. **Spec lacks PBIs:** Invoke `workflow-spec-to-pbi` **AS A SUB-AGENT** (Agent tool) — per CLAUDE.md "Workflow Step Advancement §3", a step that activates a multi-step workflow MUST run as a sub-agent: it returns only a summary and writes full findings to `plans/reports/`. This keeps the deck-build context bounded.
2. **PBIs lack `-mockup.html` AND the workflow is mockup-bearing (`idea-to-pbi`):** Invoke `pbi-mockup` per PBI to generate the missing mockup.
3. **Spec-only `idea-to-spec` context:** SKIP all mockup generation — never invoke `pbi-mockup`. The deck will use design-spec visuals only (Step 6 spec-only path). This preserves the `idea-to-spec` no-mockup contract.

### Step 3: Load Project Design Context

The deck CSS must use the project's design tokens (same discovery as `pbi-mockup`):

1. **Mandatory baseline:** Read `docs/project-reference/design-system/README.md` and `docs/project-reference/design-system/design-system-canonical.md`.
2. **Primary:** Read top-level `designSystem` in `docs/project-config.json` — use `designSystem.docsPath` + `designSystem.canonicalDoc`, then match the presented feature/app context against `designSystem.appMappings[]` to select the per-app doc.
3. **Fallback:** `Glob("docs/project-reference/design-system/*.md")` → case-insensitive substring match on app/feature name. **Default:** `README.md`.
4. Extract colors, typography, spacing, border-radius, shadows → these become the deck's CSS variables.

### Step 4: [BLOCKING] Inventory Existing UI + Map Connected Flows

> **[BLOCKING] Do NOT assemble the deck until this inventory + connected-flow map is done** (canonical: `SYNC:existing-ui-research`). The deck must faithfully match the current UI system, not generic HTML.

1. Read `docs/project-reference/frontend-patterns-reference.md` (first 200 lines) — base component classes, form/table/dialog patterns.
2. Sample 2-3 real shared/module components for layout patterns and CSS class naming.
3. Map the connected feature flows the presented features link to/from, so the deck's embedded visuals fit the surrounding navigation.

### Step 5: Accumulate + Structure Content (incl. journey extraction — think → plan → many todos)

Parse each in-scope artifact into stakeholder-oriented slide sections (see Slide Taxonomy). See `references/artifact-accumulation.md` → "Per-Artifact-Type Parse Map" for which artifact maps to which section.

- Use REAL domain entity field names + realistic sample data from `docs/project-reference/domain-entities-reference.md` — never Lorem ipsum or "Item 1, Item 2".
- Keep accompanying prose/captions tech-agnostic (business/observable terms, not framework/CSS class names).
- **Extract each PBI's priority/rank** — read the `priority` label + numeric `rank` from each PBI's frontmatter (and the ranked-order backlog artifact `team-artifacts/backlog/*-backlog.md` when present). The Scope & backlog slide MUST display PBIs in ranked order with a priority label per PBI card — the deck carries the same priority info the backlog and mockups do. If PBIs lack priority, note it explicitly rather than dropping the field.
- **Extract the main-story / MVP flows into an ordered journey list** — from PBI `## Acceptance Criteria` GIVEN/WHEN/THEN + story "As a / I want / So that" + each mock-up's flow-specs (`references/artifact-accumulation.md` §6 Journey-Extraction Map). One journey per main user story (MVP happy path), each an ordered sequence: entry → click steps ("click X → see Y → move to Z") → end state + one plain-language explanation per step. When a `-mockup.html` exists, reuse its flow-specs verbatim so the deck demo == the per-PBI prototype.
- **`TaskCreate` one todo per journey slide** — so each journey is assembled (Step 6) and later verified (Step 8 demo integrity / final demo-quality review) individually. (The "think → plan → many todos before do".)

### Step 6: Assemble ONE Standalone HTML Deck

Build the single self-contained HTML file from the scaffold in `references/deck-template.md`:

- Inline `<style>` — design tokens as CSS variables, BEM class names, light/dark themes.
- Vanilla-JS slide engine — keyboard `←/→`/`Home`/`End`, nav dots, slide counter, theme toggle (no CDN reveal.js). Don't hijack arrow keys while a demo iframe is focused; OPTIONAL `postMessage('play')` to auto-start a journey degrades gracefully (`references/deck-template.md` §3b engine-coexistence note).
- **"How to drive this demo" guide slide** near the top — teach the viewer how to click hotspots and use each demo's own ▶ Play / ⏮ ⏭ / ↺ Reset controls (inside the mock-up) to walk a journey, and ←/→ to change slides, so a non-technical stakeholder is never lost (`references/deck-template.md` §3b).
- **Demo-flow slides (one per journey from Step 5):** each embeds the **interactive** `pbi-mockup` HTML scoped to that flow via `<iframe srcdoc="…escaped…">` and overlays a deck-level narration/explanation strip (current step + plain-language explanation, text only + "⚠ Simulated" note). The journey's ▶/⏮/⏭/↺ controls live INSIDE the embedded mock-up — it is self-driving; the deck adds only narration and does NOT re-implement or duplicate those controls (`references/deck-template.md` §3b).
- **Mockup-bearing path (`idea-to-pbi`):** embed each existing `-mockup.html` via `<iframe srcdoc="…escaped…">` — the entity-escaping rule (`&`-first, escape-once-unconditionally) is in `references/deck-template.md`. Never regenerate a mockup that already exists.
- **Spec-only path (`idea-to-spec`):** render the design-spec ASCII wireframes + Component Inventory / States / Design-Tokens tables instead of HTML mockups; the journey demo is a **narrated step-through of design-spec ASCII frames** advanced by Next, each with its step explanation. NO `<iframe srcdoc>` mockup embed, NEVER invoke `pbi-mockup`.
- **Empty-state (F3):** when an in-scope feature has NO `-mockup.html` AND NO design-spec, render an explicit empty-state slide ("No mockup/design-spec available for {feature}") — never a broken/blank iframe.

### Step 7: Save

- **Path:** `team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html` (create the `presentations/` dir if absent).
- `{slug}` = the presented feature(s) or plan slug.

### Step 8: [BLOCKING] Fidelity Validation — Deck Matches Existing UI

> **[BLOCKING] After the deck is assembled, validate its visuals faithfully match the existing UI inventoried in Step 4 before handoff.** Do NOT report the deck as done until this validation records a result. Full procedure: `references/deck-template.md` → "[BLOCKING] Fidelity Gate".

The fidelity gate also covers **demo integrity** — every journey/demo slide clicks through end-to-end inside its iframe (each step reaches its end state via real hotspots); no dead controls; the narration strip names the current step + explanation and stays tech-agnostic (M1/M2); the "⚠ Simulated" note is visible; spec-only journeys advance their narrated ASCII frames.

Record the outcome in the Step 9 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / embeds / demos matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the deck to match the existing UI and re-validate before handoff.

### Step 8b: [BLOCKING] Demo-Quality Review (final review todo)

> **[BLOCKING] Final review before the report (the per-journey todos and this gate were created in Step 5).** First confirm the deck **SATISFIES the intent**: every in-scope main user story is presented as a journey (coverage — no main story missing) AND each journey faithfully conveys that story's intended behavior, not merely that slides render. Then run a stakeholder-comprehension pass: _could a PO with no prior context follow each journey end-to-end?_ Confirm every demo-flow slide clicks through, narration explains each step in plain language, the "⚠ Simulated" note is present, and the spec-only path degrades to narrated ASCII frames (never an HTML mockup). Record `Demo quality: PASS | FAIL` — FAIL if any main story is unrepresented or misrepresented, regardless of polish.

If **FAIL**, fix the journey slides (re-extract from the §6 journey map / re-embed the flow-scoped mockup) and re-review before handoff.

### Step 9: Report to User

After assembly, output:

```
Deck generated: team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html
- Artifacts synthesized: {count} ({ideas}/{specs}/{pbis}/{stories}/{mockups}/{design-specs})
- Backlog priority: {ranked | not prioritized} — Scope & backlog slide shows {N} PBIs in ranked order with priority labels
- Demo journeys: {count} ({journey titles})
- Stakeholder sections: {title, how-to-demo, business-context, scope-backlog, behavior-rules, demo-flows, ui-mockups, qc-view, summary}
- Fidelity vs existing UI: PASS | FAIL
- Demo quality: PASS | FAIL

Open in browser to preview. Click highlighted hotspots or press ▶ Play to walk a journey; use ←/→ or nav dots to move between slides; theme toggle for light/dark.
```

---

## Slide Taxonomy (stakeholder-oriented)

Every slide section must serve the four stakeholder audiences (PO/BA/Dev/QC):

| Section                        | Audience  | Content                                                                                                                                                                                                                                            |
| ------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title / agenda**             | all       | Feature(s) presented, run date, scope                                                                                                                                                                                                              |
| **How to drive this demo**     | all       | Early guide slide: click hotspots + each demo's own ▶ Play / ⏮ ⏭ / ↺ Reset controls (inside the mock-up); ←/→ change slides (`references/deck-template.md` §3b)                                                                                  |
| **Business context**           | PO/BA     | Problem, value, idea→spec narrative, epics/features                                                                                                                                                                                                |
| **Scope & backlog**            | PO/BA/Dev | PBIs (in ranked order, each card showing its priority label + numeric rank from PBI frontmatter / backlog), user stories, acceptance criteria — priority is MANDATORY when PBIs are prioritized                                                    |
| **Behavior & rules**           | Dev/QC    | Feature Spec §4 business rules / §5 invariants, §8 test cases                                                                                                                                                                                      |
| **Demo flows / user journeys** | all       | One interactive MVP demo slide per main user story: embedded interactive mockup scoped to the flow + a narration strip explaining each step ("click X → see Y → move to Z"); spec-only → narrated ASCII frames (`references/deck-template.md` §3b) |
| **UI / mockups**               | all       | Embedded `pbi-mockup` HTML (idea-to-pbi) OR design-spec ASCII + tables (idea-to-spec) OR empty-state                                                                                                                                               |
| **QC view**                    | QC/QA     | Test specifications, states matrix, edge cases                                                                                                                                                                                                     |
| **Summary / next steps**       | all       | Recap, decisions needed, next workflow steps                                                                                                                                                                                                       |

---

## UI Layout

The deck is itself a UI artifact. ASCII of a slide frame:

```
┌────────────────────────────────────────────────┐
│ ◀  Feature Presentation — {Feature}     3 / 12  │  ← top bar: title + counter
├────────────────────────────────────────────────┤
│  ## Business Context                            │
│  • Problem  • Value  • Epics                     │  ← slide body (design-system tokens)
│  ┌──────────────────────────────────────────┐   │
│  │  <iframe srcdoc> embedded mockup / wire   │   │  ← embedded visual (or empty-state)
│  └──────────────────────────────────────────┘   │
├────────────────────────────────────────────────┤
│  ● ● ● ○ ○ ○ ○ ○ ○ ○ ○ ○        ◀ Prev  Next ▶  │  ← nav dots + buttons (vanilla JS)
└────────────────────────────────────────────────┘
```

Component tiers: common (slide shell, nav) — domain-shared (mockup/wireframe embed block) — page-app (per-artifact content slides). Keyboard `←/→`, `Home/End`; theme toggle (light/dark) reusing design-system tokens.

---

## Edge Cases

| Scenario                                    | Handling                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Scope resolves to zero artifacts            | Emit an explicit empty-state slide rather than failing (Step 6 / TC-026)                                                          |
| Spec without PBIs (mockup-bearing workflow) | Gap-fill via `workflow-spec-to-pbi` sub-agent (Step 2)                                                                            |
| Spec-only `idea-to-spec`                    | Design-spec visuals only + narrated ASCII-frame step-through; never generate mockups, never invoke `pbi-mockup` (Step 2 / Step 6) |
| Feature with no mockup AND no design-spec   | Empty-state slide ("No mockup/design-spec available") — never blank iframe                                                        |
| Demo iframe focused while navigating slides | Don't hijack arrow keys while a demo iframe is focused (Step 6 / `deck-template.md` §3b)                                          |
| Workflow spans midnight (multi-day)         | Glob over plan's created→now range, not just today's `{YYMMDD}` (Step 1)                                                          |
| Standalone invocation with no prompt/scope  | `AskUserQuestion` which specs/ideas to present (Step 1)                                                                           |

---

## Anti-Patterns

| Anti-Pattern                              | Correct Approach                                                  |
| ----------------------------------------- | ----------------------------------------------------------------- |
| CDN reveal.js / impress.js                | Vanilla-JS slide engine (~60 lines), self-contained               |
| Regenerating a mockup that already exists | Embed the existing `-mockup.html` via `<iframe srcdoc>`           |
| HTML mockups in `idea-to-spec`            | Design-spec ASCII wireframes + tables only (spec-only contract)   |
| Link to external mockup files             | Inline via `<iframe srcdoc>` — one standalone file                |
| Lorem ipsum / "Item 1, Item 2"            | Real domain entity field names + realistic sample data            |
| Broken/blank iframe for a missing visual  | Explicit empty-state slide                                        |
| Running gap-fill workflow inline          | Run multi-step gap-fill workflows as SUB-AGENTS (context bounded) |

---

## Alternatives Considered

1. **Extend `pbi-mockup` with a `--deck` mode** (rejected) — `pbi-mockup` is per-PBI and mockup-scoped; a multi-artifact synthesis deck has a different input set and audience. Overloading one skill raises change cost and blurs the spec-only contract. Separate skill keeps each single-responsibility.
2. **CDN reveal.js / impress.js slide framework** (rejected) — violates the self-contained/no-external-deps contract (offline-break, supply-chain surface, new dependency). Vanilla-JS engine is ~60 lines, matches `pbi-mockup`'s zero-dep posture.
3. **Link to mockup files instead of inlining** (rejected) — breaks the "ONE standalone html file" mandate; a moved/un-co-located deck renders broken. `<iframe srcdoc>` keeps everything in one file.
4. **Chosen: standalone skill + inline single-file deck + iframe-srcdoc mockup embed.** Con: deck file size grows with embedded mockups — acceptable (HTML is text, gzips well; offline portability outweighs size).

## Design Rationale

A synthesis deck is a _different artifact at a different altitude_ than a per-PBI mockup, so it earns its own skill — but it must NOT duplicate the mockup engine (reuse/embed). `<iframe srcdoc>` is the one mechanism satisfying BOTH "single standalone file" AND "reuse existing mockups" without re-rendering. Carrying `SYNC:existing-ui-research` + the fidelity gate is what makes the deck _project-faithful_ rather than generic. The spec-only branch + empty-state slide preserve the `idea-to-spec` no-mockup contract while still giving stakeholders a visual. Running gap-fill sub-workflows as sub-agents keeps the deck-build context bounded — the deck skill consumes a summary, not the full workflow transcript.

---

## Security Considerations

`<iframe srcdoc>` embeds first-party generated mockup HTML only — no remote content, no user-supplied script. Entity-escaping the embedded mockup into `srcdoc` is also a safety boundary: it prevents an unescaped `</iframe>`/`<script>` in a mockup from breaking out of the embed. The deck opens offline (no network except the Google Fonts CSS). No secrets in artifacts.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-idea-to-pbi` workflow** (Recommended) — includes the presentation deck as a late step.
> 2. **Activate `workflow-idea-to-spec` workflow** — spec-only path; deck degrades to design-spec visuals.
> 3. **Execute `/feature-presentation` directly** — run this skill standalone on existing artifacts.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Open the deck"** — open the standalone HTML in a browser to review with stakeholders
- **"/prioritize"** — prioritize the synthesized PBIs in the backlog
- **"/plan"** — start implementation planning
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:existing-ui-research -->

> **[BLOCKING] Understand the existing UI before you design or spec a new/updated screen.** Before producing any wireframe, mockup, screen design, or UI spec:
>
> 1. **Inventory existing related UI** — search the project for screens, pages, and components already serving this feature or its domain (consult design-system docs + the real component inventory).
> 2. **Map connected flows** — identify every feature that links to, embeds, includes, or navigates to/from the new screen; trace its entry and exit flows so the new screen fits them.
> 3. **Reuse before invent** — prefer existing components, patterns, and layout conventions; justify any new component against what already exists.
> 4. **Record findings** — note the matched existing screens/components + connected flows in the artifact so downstream design faithfully matches the current UI system.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that explicitly.

<!-- /SYNC:existing-ui-research -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.
  <!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** synthesize every session idea/spec/PBI/story/design-spec/mockup into ONE standalone HTML slide deck for PO/BA/Dev/QC — project-faithful, an interactive MVP demo of every main user journey, vanilla-JS engine — so the whole team reviews from a single offline file before build.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Existing-UI Research:** [BLOCKING] inventory existing UI + map connected flows before any visual.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced proof per claim, confidence >80% to act, NEVER guess.

**IMPORTANT MUST ATTENTION** emit exactly ONE self-contained HTML deck at `team-artifacts/presentations/{YYMMDD}-presentation-{slug}.html` — inline CSS/JS, Google Fonts only, NO CDN reveal.js, vanilla-JS slide engine — why: stakeholders open one offline file with no server, no build step.
**IMPORTANT MUST ATTENTION** present every in-scope main user story as an interactive MVP demo slide ("click X → see Y → move to Z") — extract the journeys first (Step 5, one todo per journey), embed the self-driving interactive mockup + a deck narration strip + "⚠ Simulated" note, add a "How to drive this demo" guide slide, and sign off with the final Demo-Quality review (Step 8b) — why: a narrated journey answers "how does it work", which is what the user asked for; the deck adds only narration, never a second interactivity engine.
**IMPORTANT MUST ATTENTION** REUSE existing `-mockup.html` via `<iframe srcdoc="…escaped…">` — never regenerate a mockup that already exists; escaping rule (`&`-first, escape-once-unconditionally) lives in `references/deck-template.md` — why: re-rendering duplicates the mockup engine and risks divergence.
**IMPORTANT MUST ATTENTION** spec-only `idea-to-spec` → design-spec ASCII wireframes + inventory/states/tokens tables + a narrated step-through of ASCII frames ONLY; NEVER generate HTML mockups, NEVER invoke `pbi-mockup` — why: full mockups break the spec-only no-code contract.

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; add a final review todo to verify quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/next-step decisions with the user via `AskUserQuestion` — standalone + no prompt → ask which specs/ideas to present, never silently guess scope.

**Domain rules this skill must not skip:**

**IMPORTANT MUST ATTENTION** default scope anchors on `activePlan` and accumulates its FULL artifact set across the plan's created→now date range — NEVER just today's `{YYMMDD}` — why: a multi-day workflow authors specs on day 1 and PBIs on day 2; a single-day glob silently drops day-1 artifacts.
**IMPORTANT MUST ATTENTION** run multi-step gap-fill workflows (`workflow-spec-to-pbi`) as SUB-AGENTS — summary returned, full findings written to `plans/reports/` per CLAUDE.md "Workflow Step Advancement §3" — why: inline activation pollutes the deck-build context with the full workflow transcript.
**IMPORTANT MUST ATTENTION** render an explicit empty-state slide when scope resolves to zero artifacts OR a feature has no mockup AND no design-spec — never fail, never a broken/blank iframe — why: stakeholders must always get a coherent deck.
**IMPORTANT MUST ATTENTION** [BLOCKING] inventory existing UI (Step 4) BEFORE assembling, then run the [BLOCKING] fidelity gate (Step 8, incl. demo integrity — every journey clicks through, no dead controls, narration tech-agnostic) AFTER — record `Fidelity vs existing UI: PASS|FAIL` (tokens / components / layout / flows / embeds / demos) and the final `Demo quality: PASS|FAIL` (Step 8b) — why: a generic-HTML or click-broken deck previews a system that does not exist.
**IMPORTANT MUST ATTENTION** use REAL domain entity field names + realistic sample data — NEVER Lorem ipsum or "Item 1, Item 2"; keep prose tech-agnostic (business terms, not framework/CSS class names) — why: fake data and tech-coupled prose mislead stakeholders.
**IMPORTANT MUST ATTENTION** the Scope & backlog slide MUST show PBIs in ranked order with each card's priority label + numeric rank (read from PBI frontmatter / the ranked backlog artifact) whenever the PBIs are prioritized — why: priority is a primary PO/BA decision input; a deck that hides it forces stakeholders back to the raw backlog. Note explicitly if PBIs are not yet prioritized rather than dropping the field.

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim/finding (confidence >80% to act, <80% verify first) — NEVER speculate about artifacts, design tokens, or component patterns without reading the source.

**Anti-Rationalization:**

| Evasion                                            | Rebuttal                                                                                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "reveal.js is easier than a vanilla engine"        | CDN violates the self-contained contract. Vanilla-JS engine (~60 lines), Google Fonts only.                                                            |
| "Regenerate the mockup, it's cleaner"              | Embed the existing `-mockup.html` via `<iframe srcdoc>`. Never duplicate the mockup engine.                                                            |
| "Add a quick HTML mockup to the idea-to-spec deck" | Spec-only contract — design-spec ASCII + tables + narrated ASCII frames ONLY. No mockups, no `pbi-mockup`.                                             |
| "A still screenshot of the mockup is enough"       | The user asked for an interactive MVP demo of each main journey — embed the self-driving mockup + a narration strip, don't flatten it to a still.      |
| "Re-implement the click-through in the deck"       | The deck adds only narration; the mockup is self-driving (one engine). Embed it, don't duplicate its interactivity.                                    |
| "Glob today's date, it's the same session"         | Multi-day workflows span midnight. Glob the plan's created→now range or day-1 artifacts vanish.                                                        |
| "Run the gap-fill workflow inline, it's faster"    | Multi-step workflows run as SUB-AGENTS — summary + `plans/reports/`. Keeps context bounded.                                                            |
| "No mockup? leave the slide blank"                 | Render an explicit empty-state slide. Never a broken/blank iframe.                                                                                     |
| "PBI titles are enough on the backlog slide"       | Show each PBI in ranked order with its priority label + rank — priority is a primary PO/BA input; read it from PBI frontmatter / the backlog artifact. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

**IMPORTANT MUST ATTENTION Goal:** ONE standalone HTML deck synthesizing every session artifact for PO/BA/Dev/QC — project-faithful, offline, an interactive MVP demo of every main user journey.
**IMPORTANT MUST ATTENTION** ONE self-contained HTML (Google Fonts only, vanilla-JS engine), one interactive demo-flow slide per main journey (embedded self-driving mockup + narration strip + "⚠ Simulated" note) + a "How to drive this demo" guide slide; spec-only → design-spec visuals + narrated ASCII frames (never invoke `pbi-mockup`), empty-state slide never blank iframe.
**IMPORTANT MUST ATTENTION** plan journeys first (Step 5, one todo each), default scope = active-plan created→now range (not just today), gap-fill via SUB-AGENT, [BLOCKING] existing-UI inventory + fidelity gate (incl. demo integrity) + final Demo-Quality review (Step 8b), real domain data, cite `file:line` (>80% confidence) — NEVER guess.
**IMPORTANT MUST ATTENTION Main steps (do in order):** (1) resolve scope → (2) gap-fill (SUB-AGENT) → (3) load design context → (4) [BLOCKING] inventory existing UI + map flows → (5) accumulate + extract journeys (one todo each) → (6) assemble ONE deck → (7) save → (8) [BLOCKING] fidelity gate (+demo integrity) → (8b) Demo-Quality review → (9) report — NEVER skip the two [BLOCKING] gates or the journey extraction — why: AI keeps forgetting the skill's own pipeline, so the deck ships ungated or with main journeys missing.
