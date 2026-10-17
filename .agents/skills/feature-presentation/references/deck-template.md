# Deck Template — Standalone HTML Scaffold, Slide Engine, iframe-srcdoc Escaping, Fidelity Gate

Render-side reference for `feature-presentation`. Governs **rendering correctness**: the single-file HTML scaffold with its vanilla-JS slide engine, the `<iframe srcdoc>` mockup-embed escaping rule, the demo-flow slide, and the [BLOCKING] fidelity gate. (Content collection lives in `artifact-accumulation.md`.)

The deck is a **review deck**: it must pass `presentation-builder`'s validator under the `review` profile (`node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> --profile=review`) and follow the shared runtime standard `presentation-builder/references/web-runtime-contract.md` §1–§4 and §6–§7. It offers no in-place editing, draft saving, reset or export — its text must keep matching the specifications it summarizes (contract §9).

---

## Contents

- [1. Standalone HTML Scaffold](#1-standalone-html-scaffold)
- [2. Vanilla-JS Slide Engine (zero-dep)](#2-vanilla-js-slide-engine-zero-dep)
- [3. `<iframe srcdoc>` Mockup Embed — HTML-Escaping Spec (HIGHEST-RISK)](#3-iframe-srcdoc-mockup-embed--html-escaping-spec-highest-risk)
- [3b. Demo-Flow Slide Pattern (interactive journey + narration)](#3b-demo-flow-slide-pattern-interactive-journey--narration)
- [4. \[BLOCKING\] Fidelity Gate](#4-blocking-fidelity-gate)
- [5. Deck Quality Checklist](#5-deck-quality-checklist)

## 1. Standalone HTML Scaffold

ONE self-contained file: inline `<style>` and `<script>`, no `<script src>`, no stylesheet or font link, no `url(…)` to a network address, no CDN reveal.js. Type comes from the project's design tokens (SKILL.md Step 3), else the system font stack below. A web font the picked design-explore draft loaded is kept only by packaging its font file inside the deck (an `@font-face` whose `src` is a `data:` URL); otherwise it is replaced by the project's type token, then the closest system stack, and the replacement is recorded as a departure (SKILL.md Step 9). The scaffold below is complete and runnable as-is — copy it, keep every marker, and replace the `{…}` placeholders and the placeholder token values.

**Escape every inserted value.** Every value placed into a `{…}` placeholder — element text and attribute values alike (a journey title in `data-purpose` or `title="…"`, a step, a rule, a note) — and every ASCII wireframe's text is HTML-escaped once before insertion, `&` first: `&` → `&amp;`, then `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#39;`. Artifact text often carries `<`, `>` and `&` (`<input>`, `Q&A`), and a `"` in a title ends its attribute early. An unescaped `</section>` in inserted text ends the slide where the conformance check reads it (it ends a slide at the first `</section>`), so that slide fails the check — a deck defect, never the Step 8 "checker defect". The mockup inside `srcdoc` follows its own escape rule (§3); do not escape it twice.

**Tokens, then re-measure.** Replace each placeholder value with the project token read in SKILL.md Step 3 and keep the names. For the dark block, use the project's dark tokens; if the project has none, derive dark values from its light tokens and measure them — never mix the placeholder dark values into a branded light theme. After substituting, re-check contrast in BOTH themes: text at least 4.5:1 against its background, and controls, their borders and the focus ring at least 3:1 (non-text). Then re-check the deck at 200% zoom and at a narrow width: every slide can be read by keyboard scrolling and nothing scrolls sideways. The placeholders pass these checks; a project token can fail them, so record the measured values (fidelity gate §4 item 1).

What the scaffold guarantees (each item is a marker the `review` profile checks, or a behavior the Step 8 browser check records):

- **Slides** — every slide is `<section class="slide deck__slide" data-slide-id data-purpose data-principle>` with an `<h2>` title and a `<template class="slide-notes">`. Both classes stay: `slide` is the shared standard's selector, `deck__slide` is the existing export selector (`--slides=section.deck__slide`), so both routes find the same slides. A slide body never nests another `<section>` — group content inside a slide with `<div>` or `<article>`, because the conformance check ends a slide at its first `</section>`.
- **Slide identity** — `data-slide-id` names the slide's job (`title`, `how-to`, `business-context`, `scope-backlog`, `demo-{journey-slug}`, `summary`), never its position (`slide-3`), and is unique in the deck. A job that needs more than one slide — a second `rules` slide, the successive frames of a wireframe demo — keeps the first slide's id and numbers each continuation from 2: `rules`, `rules-2`, `rules-3`; `demo-{journey-slug}`, `demo-{journey-slug}-2`. Inserting a slide leaves every other identity unchanged. `data-presentation-id` on `<html>` stays the same each time the deck for this feature is rebuilt.
- **Notes on every slide, the demo slide included** — labelled `Say:` (what to say and what to show), `Why:`, `Evidence:`, `Transition:`, `Timing:`, `Question:` (the likely reviewer question and its answer); at least 40 characters, never a placeholder.
- **Controls** — native buttons with `data-action`: `previous`, `next`, `overview` (All slides), `toggle-notes` (`aria-controls="notes-panel"` + `aria-expanded`), `fullscreen` (`aria-pressed`, hidden when unsupported), `theme` (`aria-pressed` = dark). No per-slide dot row — the overview replaces it.
- **Keys** (runtime contract §3) — on a slide whose content overflows its scroll area, ArrowDown, ArrowUp, Space, PageDown and PageUp first scroll that area; they change slide only when it is already at the edge in that direction. ArrowLeft, ArrowRight, Home and End always change slide. Shift+Space acts as the backward scroll key (Space moves forward). The scroll area is the page below 900 CSS px and the slide stage otherwise, so a zoomed-in reader can reach the whole slide by keyboard; with the notes open below 900 CSS px the keys stop where the slide controls end, so the notes stacked under them never add presses between slides. While Tab has put the focus in the notes panel (Close notes, then the notes text), ArrowDown, ArrowUp, PageDown and PageUp — and Space and Shift+Space on the notes text — scroll only the notes, and move neither the page nor the slide, even at the notes' edge; the presenter leaves the notes (Tab or a click outside them) to move the deck, and ArrowLeft, ArrowRight, Home and End still change slide from there. Each slide's notes open at their top ("Slide N of M" and `Say:`), so notes stay readable by keyboard at 125–150% zoom. Space and Enter on a focused button, Close notes included, only activate that button. Focus that a mouse click put in the notes leaves the keys as they are elsewhere, so a clicker still needs one press per slide that fits.
- **Status** — ONE `aria-live="polite"` region, "Slide N of M: {title}", which is also the visible counter.
- **Notes panel** `id="notes-panel"` — a labelled, non-modal side panel beside the slide (the slide narrows; it is never covered); shows the current slide's position and title plus its notes; when it opens out of view (below the slide at a narrow width) it scrolls into view while focus stays on Notes; `close-notes` or Escape closes it and focus returns to the Notes button.
- **Overview** — a `<dialog>` opened with `showModal()` (background inert, Tab stays inside), a visible Close button (`close-overview`), one button per slide titled from its `<h2>`, the current one marked `aria-current="true"` and focused on open; arrow keys move between items, Enter jumps, Escape or Close returns focus to All slides.
- **Layout** — below 900 CSS px (which includes 200% zoom on a typical laptop) the page scrolls, the notes panel stacks below the slide (capped at 80% of the screen height, so long notes scroll inside it), and the controls wrap and follow the slide instead of staying pinned, so they never cover a third of a zoomed screen; nothing scrolls sideways. A demo's prototype and its narration stack whenever the slide area is narrower than 60rem (notes open on a laptop included), so the prototype is never squeezed into a phone-sized frame. `.deck` paints its own background.
- **Print** — one slide per page, controls, notes and overview hidden, light theme forced, a long slide flows onto the next page; the how-to slide says "Speaker notes are not included in print."
- **Motion and focus** — no decorative motion; `prefers-reduced-motion` removes the button transition, smooth keyboard scrolling and the demo auto-play; every focusable element shows a `:focus-visible` outline.
- **No JavaScript** — every slide renders as one readable page and the controls are hidden.

```html
<!DOCTYPE html>
<html lang="en" data-presentation-id="{feature-slug}-review" data-theme="light">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Feature review: {Feature(s)}</title>
        <!-- The outside-asset policy meta goes here ONLY when the Step 6 mockup scan found an outside asset (see the note under this scaffold). -->
        <style>
            /* Design tokens. The values are placeholders: replace each one with the project token read in
               SKILL.md Step 3 and keep the names. Font stack = project type token, else this system stack.
               Dark block: the project's dark tokens; none defined -> derive them and measure. After any
               substitution re-measure contrast in both themes (text >= 4.5:1, controls and focus >= 3:1). */
            :root {
                color-scheme: light;
                --color-bg: #ffffff;
                --color-surface: #f4f5f7;
                --color-text: #1a1a1a;
                --color-muted: #4a4f57;
                --color-border: #767b83;
                --color-primary: #1565c0;
                --color-on-primary: #ffffff;
                --color-focus: #1565c0;
                --font-body: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                --text-small: 0.9375rem;
                --text-body: 1.125rem;
                --text-lede: 1.375rem;
                --text-title: clamp(1.75rem, 1.25rem + 2vw, 2.75rem);
                --gap-sm: 8px;
                --gap-md: 16px;
                --gap-lg: 32px;
                --radius: 8px;
                --target: 44px;
            }
            @media screen {
                [data-theme='dark'] {
                    color-scheme: dark;
                    --color-bg: #121212;
                    --color-surface: #1e1f22;
                    --color-text: #e8e8e8;
                    --color-muted: #b4b8bf;
                    --color-border: #8b9099;
                    --color-primary: #90caf9;
                    --color-on-primary: #0d1b2a;
                    --color-focus: #90caf9;
                }
            }

            /* BEM blocks: deck (layout, slides, controls, notes, overview), deck__embed / deck__narration (demo slide). */
            *, *::before, *::after { box-sizing: border-box; }
            [hidden] { display: none !important; }
            html, body { margin: 0; }
            body { background: var(--color-bg); color: var(--color-text); font: var(--text-body) / 1.55 var(--font-body); }
            :focus-visible { outline: 3px solid var(--color-focus); outline-offset: 2px; }
            .deck__sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

            .deck {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                grid-template-rows: minmax(0, 1fr) auto;
                grid-template-areas: 'stage notes' 'nav notes';
                height: 100vh;
                background: var(--color-bg);
                color: var(--color-text);
                font-family: var(--font-body);
            }
            .deck__stage { grid-area: stage; overflow: auto; container-type: inline-size; }
            .deck__slide { display: flex; flex-direction: column; gap: var(--gap-md); min-height: 100%; padding: clamp(24px, 5vw, 64px); }
            .deck--live .deck__slide:not(.deck__slide--active) { display: none; }
            .deck__slide h2 { margin: 0; max-width: 30ch; font-size: var(--text-title); line-height: 1.15; font-weight: 700; }
            .deck__slide p:not(.deck__empty), .deck__list { margin: 0; max-width: 65ch; }
            .deck__lede { font-size: var(--text-lede); color: var(--color-muted); }
            .deck__facts { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: var(--gap-sm) var(--gap-md); margin: 0; }
            .deck__facts dt { font-weight: 600; }
            .deck__facts dd { margin: 0; }
            .deck__list { display: grid; gap: var(--gap-sm); padding-left: 1.25em; }
            .deck__sim-note, .deck__print-note { font-size: var(--text-small); color: var(--color-muted); }

            /* Demo slide: the embed and its narration sit side by side; they stack when the stage is narrower
               than 60rem (notes open on a laptop included), so the prototype keeps a desktop-sized frame. */
            .deck__body--demo { display: grid; grid-template-columns: minmax(0, 1fr) minmax(14rem, 20rem); gap: var(--gap-lg); align-items: start; }
            .deck__embed iframe { display: block; width: 100%; height: min(60vh, 44rem); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); }
            .deck__wireframe { margin: 0; padding: var(--gap-md); overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface); font: var(--text-small) / 1.35 ui-monospace, 'Cascadia Mono', Menlo, Consolas, monospace; white-space: pre; }
            .deck__embed figure { margin: 0; }
            .deck__narration-step[aria-current='step'] { font-weight: 600; }
            .deck__wireframe-caption { margin-top: var(--gap-sm); font-size: var(--text-small); color: var(--color-muted); }
            .deck__empty { display: grid; place-items: center; min-height: 16rem; padding: var(--gap-lg); border: 1px dashed var(--color-border); border-radius: var(--radius); background: var(--color-surface); text-align: center; }
            .deck__narration { display: grid; gap: var(--gap-md); padding: var(--gap-md); border-left: 4px solid var(--color-primary); background: var(--color-surface); }
            .deck__narration-title { margin: 0; font-size: var(--text-body); }
            .deck__narration-steps { display: grid; gap: var(--gap-sm); margin: 0; padding-left: 1.25em; }
            @container (max-width: 60rem) {
                .deck__body--demo { grid-template-columns: minmax(0, 1fr); }
            }

            .deck__nav { grid-area: nav; display: flex; flex-wrap: wrap; align-items: center; gap: var(--gap-sm); padding: var(--gap-sm) var(--gap-md); border-top: 1px solid var(--color-border); background: var(--color-bg); }
            .deck:not(.deck--live) .deck__nav { display: none; }
            .deck__status { flex: 1 1 14rem; min-width: 0; margin: 0; font-size: var(--text-small); color: var(--color-muted); }
            .deck__tools { display: flex; flex-wrap: wrap; gap: var(--gap-sm); }
            .deck__btn { min-width: var(--target); min-height: var(--target); padding: var(--gap-sm) var(--gap-md); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); font: inherit; font-size: var(--text-small); cursor: pointer; transition: background-color 120ms ease-out; }
            .deck__btn:hover { background: var(--color-surface); }
            .deck__btn--primary, .deck__btn--primary:hover { border-color: var(--color-primary); background: var(--color-primary); color: var(--color-on-primary); font-weight: 600; }
            .deck__btn[aria-pressed='true'], .deck__btn[aria-expanded='true'] { border-color: var(--color-primary); box-shadow: inset 0 -3px 0 var(--color-primary); }
            .deck__btn[aria-disabled='true'] { opacity: 0.5; cursor: not-allowed; }

            .deck__notes { grid-area: notes; display: flex; flex-direction: column; gap: var(--gap-md); width: min(26rem, 34vw); overflow: auto; padding: var(--gap-md); border-left: 1px solid var(--color-border); background: var(--color-surface); }
            .deck__notes-head { display: flex; align-items: center; justify-content: space-between; gap: var(--gap-sm); }
            .deck__notes-title { margin: 0; font-size: 1.25rem; }
            .deck__notes-slide { margin: 0; font-weight: 600; }
            .deck__notes-body p { margin: 0 0 var(--gap-sm); }

            .deck__overview { width: min(40rem, calc(100vw - 32px)); max-height: calc(100vh - 32px); padding: var(--gap-lg); border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg); color: var(--color-text); }
            .deck__overview::backdrop { background: rgb(0 0 0 / 0.55); }
            .deck__overview-head { display: flex; align-items: center; justify-content: space-between; gap: var(--gap-md); margin-bottom: var(--gap-md); }
            .deck__overview-head h2 { margin: 0; font-size: 1.5rem; }
            .deck__overview-list { display: grid; gap: 4px; margin: 0; padding-left: 2em; }
            .deck__overview-item { width: 100%; min-height: var(--target); padding: var(--gap-sm) 12px; border: 1px solid transparent; border-radius: var(--radius); background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
            .deck__overview-item:hover { background: var(--color-surface); }
            .deck__overview-item[aria-current='true'] { border-color: var(--color-primary); font-weight: 600; }

            /* Below 900px the page scrolls and the controls follow the slide, unpinned, so at 200% zoom
               they never cover a third of the screen; the scroll keys reach everything (engine keydown). */
            @media (max-width: 899px) {
                .deck { height: auto; min-height: 100vh; grid-template-columns: minmax(0, 1fr); grid-template-rows: 1fr auto auto; grid-template-areas: 'stage' 'nav' 'notes'; }
                .deck__stage { overflow: visible; }
                .deck__slide { min-height: 70vh; }
                /* Capped so long notes scroll inside their own panel: with the focus in the notes the keys move
                   the notes, never the page. */
                .deck__notes { width: auto; max-height: 80vh; border-left: 0; border-top: 1px solid var(--color-border); }
            }
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
            }
            @media print {
                @page { size: landscape; margin: 12mm; }
                .deck { display: block; height: auto; }
                .deck__stage { overflow: visible; }
                .deck__nav, .deck__notes, .deck__overview { display: none !important; }
                .deck__slide, .deck--live .deck__slide:not(.deck__slide--active) { display: flex; min-height: 0; padding: 0; break-after: page; }
                .deck__slide:last-child { break-after: auto; }
                .deck__embed iframe { height: 60vh; }
            }
        </style>
    </head>
    <body>
        <main class="deck">
            <h1 class="deck__sr-only">Feature review: {Feature(s)}</h1>
            <div class="deck__stage">
                <section class="slide deck__slide deck__slide--active" data-slide-id="title" data-purpose="Name the feature, the outcome it delivers and the scope under review" data-principle="Reviewers judge every later slide against the outcome and the boundary set here">
                    <h2>{Feature(s)}</h2>
                    <p class="deck__lede">{One sentence: the outcome this feature delivers, for whom}</p>
                    <dl class="deck__facts">
                        <dt>Scope</dt>
                        <dd>{tasks and specs in this review}</dd>
                        <dt>Prepared</dt>
                        <dd>{YYYY-MM-DD}</dd>
                    </dl>
                    <template class="slide-notes">
                        <p><strong>Say:</strong> Introduce {Feature(s)}: the problem it solves for {primary user} and the scope under review today. Point at the scope line.</p>
                        <p><strong>Why:</strong> Reviewers need the outcome and the boundary before any screen, so they judge each demo against the right goal.</p>
                        <p><strong>Evidence:</strong> {Initiative, spec and task files this deck was built from}.</p>
                        <p><strong>Transition:</strong> Before the demos, one slide on how to move through the deck.</p>
                        <p><strong>Timing:</strong> 00:45</p>
                        <p><strong>Question:</strong> Is anything reviewers expected left out of scope? Answer from the scope line and name where the deferred work is tracked.</p>
                    </template>
                </section>

                <section class="slide deck__slide" data-slide-id="how-to" data-purpose="Teach the viewer to move through the deck and drive the demos" data-principle="A reviewer who cannot drive the deck stops following the story">
                    <h2>How to use this deck</h2>
                    <ul class="deck__list">
                        <li>Previous and Next change slides, as do the Left and Right arrow keys. Home and End jump to the first and last slide.</li>
                        <li>The Down and Up arrows, Page Down, Page Up, Space and Shift+Space first scroll a slide that does not fit on screen, then move to the next or previous slide.</li>
                        <li>All slides lists every slide so you can jump straight to one.</li>
                        <li>Notes opens the talk track; Escape closes it. Tab into the notes to scroll them: while you are there the scroll keys move only the notes, so press Tab or click outside them to move the deck again.</li>
                        <li>Full screen and Dark theme change how the deck is shown.</li>
                        <li>Inside a demo, click the highlighted areas, or use its own controls: ▶ Play, ⏮ and ⏭ to step, ↺ Reset.</li>
                        <li>After clicking into a demo, click outside it, or press Tab until you leave it, to use the arrow keys for slides again.</li>
                    </ul>
                    <!-- The outside-asset viewer notice goes here ONLY when the Step 6 mockup scan found an outside asset (see the note under this scaffold). -->
                    <p class="deck__sim-note" role="note">⚠ Simulated — illustrative data, no real actions are performed</p>
                    <p class="deck__print-note">Speaker notes are not included in print.</p>
                    <template class="slide-notes">
                        <p><strong>Say:</strong> Show Previous and Next, All slides, Notes, Full screen and Dark theme. Say that the Down arrow scrolls a long slide before moving on, and that clicking inside a demo sends keys to the demo until you click outside it or press Tab to leave it.</p>
                        <p><strong>Why:</strong> Stakeholders who drive the deck themselves after the meeting need to know how to leave a demo and keep going.</p>
                        <p><strong>Evidence:</strong> The demos are simulated prototypes; no real data changes when anyone clicks inside them.</p>
                        <p><strong>Transition:</strong> With that, the first journey.</p>
                        <p><strong>Timing:</strong> 00:30</p>
                        <p><strong>Question:</strong> Can I print this? Yes: one slide per page, without the speaker notes.</p>
                    </template>
                </section>

                <section class="slide deck__slide" data-slide-id="demo-{journey-slug}" data-journey="{journey-slug}" data-purpose="Show {journey title} working end to end in the prototype" data-principle="Reviewers judge a flow by watching it happen, not by reading about it">
                    <h2>Demo: {journey title}</h2>
                    <div class="deck__body deck__body--demo">
                        <div class="deck__embed">
                            <!-- Flow-scoped interactive mockup, escaped &-first, escape once, unconditionally (§3). No visual for this feature: delete the iframe, the hidden attribute below and the narration's Simulated note, and use the no-visual notes (§3b). Spec-only journey: replace the iframe AND the empty-state line with the wireframe figure (§3b). -->
                            <iframe srcdoc="{ESCAPED_INTERACTIVE_MOCKUP_HTML}" title="Demo: {journey title}"></iframe>
                            <p class="deck__empty" role="note" hidden>No prototype or design available for {feature}</p>
                        </div>
                        <aside class="deck__narration" aria-labelledby="narration-{journey-slug}">
                            <h3 class="deck__narration-title" id="narration-{journey-slug}">What happens</h3>
                            <ol class="deck__narration-steps">
                                <li class="deck__narration-step">{Where the journey starts and what the user sees}</li>
                                <li class="deck__narration-step">{What the user does next and what changes on screen}</li>
                                <li class="deck__narration-step">{The end state the user reaches}</li>
                            </ol>
                            <p class="deck__sim-note" role="note">⚠ Simulated — illustrative data, no real actions are performed</p>
                        </aside>
                    </div>
                    <template class="slide-notes">
                        <p><strong>Say:</strong> Click {first highlighted area} in the demo, walk each step listed beside the frame, and stop on the end state so reviewers can read it.</p>
                        <p><strong>Why:</strong> This is the main path {primary user} takes; reviewers decide here whether it meets the acceptance criteria.</p>
                        <p><strong>Evidence:</strong> Simulated prototype {mockup file}; illustrative data. Acceptance criteria {AC IDs}.</p>
                        <p><strong>Transition:</strong> Click outside the demo, then Next for {next slide's topic}.</p>
                        <p><strong>Timing:</strong> 02:00</p>
                        <p><strong>Question:</strong> What happens when {most likely failure}? Answer from {business rule ID}, or record it as an open question.</p>
                    </template>
                </section>

                <section class="slide deck__slide" data-slide-id="summary" data-purpose="State the decisions reviewers must make and the next planned work items" data-principle="A review ends in decisions and owners, not in a recap">
                    <h2>Decisions and next steps</h2>
                    <ul class="deck__list">
                        <li>{Decision needed from reviewers, and who makes it}</li>
                        <li>{Next planned work item, in ranked order, with its priority}</li>
                        <li>{Open question, and who answers it by when}</li>
                    </ul>
                    <template class="slide-notes">
                        <p><strong>Say:</strong> Read each decision aloud and ask for a yes, a no or an owner before closing; point at the ranked planned work items.</p>
                        <p><strong>Why:</strong> Without a recorded decision the next delivery wave starts on assumptions the review was meant to settle.</p>
                        <p><strong>Evidence:</strong> {Planned-work or ranking file}; open questions from {spec or task section}.</p>
                        <p><strong>Transition:</strong> Close the review, or open All slides to revisit a demo.</p>
                        <p><strong>Timing:</strong> 03:00</p>
                        <p><strong>Question:</strong> What is deliberately left out? Answer from the deferred list and who owns it.</p>
                    </template>
                </section>
            </div>

            <nav class="deck__nav" aria-label="Slide controls">
                <button type="button" class="deck__btn" data-action="previous" aria-keyshortcuts="ArrowLeft ArrowUp PageUp Shift+Space">Previous</button>
                <button type="button" class="deck__btn deck__btn--primary" data-action="next" aria-keyshortcuts="ArrowRight ArrowDown PageDown Space">Next</button>
                <p class="deck__status" id="deck-status" aria-live="polite" aria-atomic="true"></p>
                <div class="deck__tools">
                    <button type="button" class="deck__btn" data-action="overview" aria-haspopup="dialog">All slides</button>
                    <button type="button" class="deck__btn" data-action="toggle-notes" aria-controls="notes-panel" aria-expanded="false">Notes</button>
                    <button type="button" class="deck__btn" data-action="fullscreen" aria-pressed="false">Full screen</button>
                    <button type="button" class="deck__btn" data-action="theme" aria-pressed="false">Dark theme</button>
                </div>
            </nav>

            <aside class="deck__notes" id="notes-panel" role="region" aria-labelledby="notes-title" hidden>
                <div class="deck__notes-head">
                    <h2 class="deck__notes-title" id="notes-title">Speaker notes</h2>
                    <button type="button" class="deck__btn" data-action="close-notes">Close notes</button>
                </div>
                <p class="deck__notes-slide" id="notes-slide"></p>
                <div class="deck__notes-body" id="notes-content" tabindex="0" role="group" aria-labelledby="notes-slide"></div>
            </aside>
        </main>

        <dialog class="deck__overview" id="overview" aria-labelledby="overview-title">
            <div class="deck__overview-head">
                <h2 id="overview-title">All slides</h2>
                <button type="button" class="deck__btn" data-action="close-overview">Close</button>
            </div>
            <ol class="deck__overview-list" id="overview-list"></ol>
        </dialog>

        <script>
            (function () {
                'use strict';
                const root = document.documentElement;
                const deck = document.querySelector('.deck');
                const stage = document.querySelector('.deck__stage');
                const nav = document.querySelector('.deck__nav');
                const slides = Array.from(document.querySelectorAll('section.deck__slide'));
                const status = document.getElementById('deck-status');
                const notesPanel = document.getElementById('notes-panel');
                const notesSlide = document.getElementById('notes-slide');
                const notesContent = document.getElementById('notes-content');
                const overview = document.getElementById('overview');
                const overviewList = document.getElementById('overview-list');
                const control = (action) => document.querySelector('[data-action="' + action + '"]');
                const buttons = {
                    previous: control('previous'),
                    next: control('next'),
                    notes: control('toggle-notes'),
                    overview: control('overview'),
                    fullscreen: control('fullscreen'),
                    theme: control('theme'),
                };
                const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
                const slideKeys = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1 };
                /* Keys that scroll an overflowing slide before they change slide (runtime contract §3). */
                const scrollKeys = { ArrowDown: 'line', ArrowUp: 'line', PageDown: 'page', PageUp: 'page', ' ': 'page' };
                const LINE_STEP_PX = 40; /* about one arrow-key step of native scrolling */
                const PAGE_STEP_SHARE = 0.85; /* a page step keeps a little of the previous view on screen */
                const has = (map, key) => Object.prototype.hasOwnProperty.call(map, key);
                const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');
                let index = -1;

                /* Below 900px the page scrolls (the stage is overflow: visible); otherwise the stage scrolls. */
                const scrollArea = () => (getComputedStyle(stage).overflowY === 'visible' ? document.scrollingElement || root : stage);

                /* How far the keys may scroll an area. Below 900px open notes stack under the controls on the
                   page: the page keys stop where the controls end, so open notes never add presses between
                   slides (the notes panel scrolls itself, CSS max-height). */
                function scrollEnd(area) {
                    const end = area.scrollHeight - area.clientHeight;
                    if (area === stage || area === notesPanel || notesPanel.hidden) return end;
                    const controlsEnd = Math.ceil(nav.getBoundingClientRect().bottom + area.scrollTop - area.clientHeight);
                    return Math.max(0, Math.min(end, controlsEnd));
                }

                /* Scrolls an area (the slide's by default) one step in the key's direction; false at that edge. */
                function scrollWithin(direction, key, area = scrollArea()) {
                    const room = direction > 0 ? scrollEnd(area) - area.scrollTop : area.scrollTop;
                    if (room <= 1) return false;
                    const step = scrollKeys[key] === 'page' ? Math.round(area.clientHeight * PAGE_STEP_SHARE) : LINE_STEP_PX;
                    area.scrollBy({ top: direction * Math.min(room, step), behavior: scrollBehavior() });
                    return true;
                }

                const titleOf = (slide) => {
                    const heading = slide.querySelector('h2');
                    return heading ? heading.textContent.trim() : slide.dataset.slideId;
                };
                const position = (i) => 'Slide ' + (i + 1) + ' of ' + slides.length + ': ' + titleOf(slides[i]);

                /* A demo iframe with nothing to embed shows its empty-state text, never a blank frame. Only an
                   embed that holds an iframe is checked: a wireframe demo (§3b) has none and is left as it is. */
                document.querySelectorAll('.deck__embed').forEach((embed) => {
                    const frame = embed.querySelector('iframe');
                    const empty = embed.querySelector('.deck__empty');
                    if (!frame || !empty || (frame.getAttribute('srcdoc') || frame.getAttribute('src') || '').trim()) return;
                    frame.remove();
                    empty.hidden = false;
                    /* Nothing is simulated when there is no prototype, so its Simulated note goes too. */
                    const slide = embed.closest('.deck__slide');
                    if (slide) slide.querySelectorAll('.deck__narration .deck__sim-note').forEach((note) => note.remove());
                });

                /* Each render starts the panel at its top, so every slide's notes open at "Slide N of M" and Say:. */
                function renderNotes() {
                    const source = slides[index].querySelector('template.slide-notes');
                    notesSlide.textContent = position(index);
                    notesContent.replaceChildren(source ? source.content.cloneNode(true) : document.createTextNode('This slide has no notes.'));
                    notesPanel.scrollTop = 0;
                }

                /* Below 900px the panel sits under the slide: bring its heading into view; focus stays on Notes. */
                function revealNotes() {
                    const head = notesPanel.querySelector('.deck__notes-head').getBoundingClientRect();
                    if (head.top >= 0 && head.bottom <= window.innerHeight) return;
                    notesPanel.scrollIntoView({ block: 'nearest', behavior: scrollBehavior() });
                }

                function setNotes(open, restoreFocus) {
                    notesPanel.hidden = !open;
                    buttons.notes.setAttribute('aria-expanded', String(open));
                    if (open) {
                        renderNotes();
                        revealNotes();
                    } else if (restoreFocus) buttons.notes.focus();
                }

                /* OPTIONAL auto-play: work-item --mode=mockup's engine starts its walkthrough on 'play' (§3b). */
                function playDemo(slide) {
                    if (!slide.hasAttribute('data-journey') || reducedMotion.matches) return;
                    const frame = slide.querySelector('.deck__embed iframe');
                    if (!frame || !frame.contentWindow) return;
                    try {
                        frame.contentWindow.postMessage('play', '*');
                    } catch (error) {
                        /* The post failed: the viewer presses Play inside the demo instead. */
                    }
                }

                /* A new slide starts at its top; going back with a scroll key starts it at its bottom, so
                   reading carries on in the same direction. */
                function showSlide(n, fromEnd) {
                    const target = Math.max(0, Math.min(slides.length - 1, n));
                    if (target === index) return;
                    index = target;
                    slides.forEach((slide, k) => slide.classList.toggle('deck__slide--active', k === index));
                    if (!notesPanel.hidden) renderNotes();
                    const area = scrollArea();
                    area.scrollTop = fromEnd ? scrollEnd(area) : 0;
                    buttons.previous.setAttribute('aria-disabled', String(index === 0));
                    buttons.next.setAttribute('aria-disabled', String(index === slides.length - 1));
                    status.textContent = position(index);
                    try {
                        history.replaceState(null, '', '#' + encodeURIComponent(slides[index].dataset.slideId));
                    } catch (error) {
                        /* Some file:// contexts refuse; the deck works without the address. */
                    }
                    playDemo(slides[index]);
                }

                function openOverview() {
                    overviewList.replaceChildren(...slides.map((slide, k) => {
                        const item = document.createElement('li');
                        const jump = document.createElement('button');
                        jump.type = 'button';
                        jump.className = 'deck__overview-item';
                        jump.textContent = titleOf(slide);
                        if (k === index) jump.setAttribute('aria-current', 'true');
                        jump.addEventListener('click', () => {
                            overview.close();
                            showSlide(k);
                        });
                        item.append(jump);
                        return item;
                    }));
                    overview.showModal();
                    overviewList.querySelector('[aria-current="true"]').focus();
                }

                overview.addEventListener('close', () => buttons.overview.focus());
                overview.addEventListener('keydown', (event) => {
                    const items = Array.from(overviewList.querySelectorAll('button'));
                    const at = items.indexOf(document.activeElement);
                    const moves = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: items.length - 1 };
                    if (!has(moves, event.key)) return;
                    event.preventDefault();
                    items[Math.max(0, Math.min(items.length - 1, moves[event.key]))].focus();
                });

                /* How the focus last moved: Tab sets it, a mouse, pen or touch press clears it (mousedown fires
                   for all three, before the focus moves; it is not a touch navigation supplement). Only focus that
                   Tab put in the notes gives the scroll keys to them; after a click in the notes a clicker still
                   changes slide exactly as with the focus anywhere else. */
                let focusByKeyboard = false;
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'Tab') focusByKeyboard = true;
                }, true);
                document.addEventListener('mousedown', () => {
                    focusByKeyboard = false;
                }, true);

                /* Slide keys work while a button has focus (clicker keys after pressing Next); they stop only
                   while typing or while the overview is open. Space and Enter on a button act only as the button.
                   Down, Up, Space, Page Down and Page Up scroll an overflowing slide first and change slide only
                   at its edge; a held key stops at the edge. Left, Right, Home and End always change slide.
                   Shift+Space acts as the backward scroll key. While Tab has put the focus inside the notes panel, the
                   scroll keys scroll only the notes, even at their edge, and never move the page or the slide; the
                   presenter leaves the notes (Tab or a click) to move the deck. Otherwise they never scroll into open
                   notes. Left, Right, Home and End change slide from the notes too. */
                document.addEventListener('keydown', (event) => {
                    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || overview.open) return;
                    const target = event.target;
                    if (event.key === 'Escape') {
                        if (!notesPanel.hidden) {
                            event.preventDefault();
                            setNotes(false, true);
                        }
                        return;
                    }
                    if (target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
                    if ((event.key === ' ' || event.key === 'Enter') && target.closest('button, a[href], summary')) return;
                    let destination = null;
                    let fromEnd = false;
                    if (event.key === 'Home') destination = 0;
                    else if (event.key === 'End') destination = slides.length - 1;
                    else if (has(slideKeys, event.key)) {
                        const direction = event.key === ' ' && event.shiftKey ? -1 : slideKeys[event.key];
                        if (has(scrollKeys, event.key)) {
                            if (focusByKeyboard && notesPanel.contains(target)) {
                                event.preventDefault();
                                scrollWithin(direction, event.key, notesPanel);
                                return;
                            }
                            if (scrollWithin(direction, event.key) || event.repeat) {
                                event.preventDefault();
                                return;
                            }
                            fromEnd = direction < 0;
                        }
                        destination = index + direction;
                    }
                    if (destination === null) return;
                    event.preventDefault();
                    showSlide(destination, fromEnd);
                });

                buttons.previous.addEventListener('click', () => showSlide(index - 1));
                buttons.next.addEventListener('click', () => showSlide(index + 1));
                buttons.notes.addEventListener('click', () => setNotes(notesPanel.hidden, false));
                control('close-notes').addEventListener('click', () => setNotes(false, true));
                buttons.overview.addEventListener('click', openOverview);
                control('close-overview').addEventListener('click', () => overview.close());

                buttons.fullscreen.hidden = !root.requestFullscreen || document.fullscreenEnabled === false;
                buttons.fullscreen.addEventListener('click', () => {
                    let request;
                    try {
                        request = document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen();
                    } catch (error) {
                        request = Promise.reject(error);
                    }
                    Promise.resolve(request).catch(() => {
                        status.textContent = position(index) + ' — Full screen is not available here; the deck still works in this window.';
                    });
                });
                document.addEventListener('fullscreenchange', () => {
                    buttons.fullscreen.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
                });

                function setTheme(dark) {
                    root.dataset.theme = dark ? 'dark' : 'light';
                    buttons.theme.setAttribute('aria-pressed', String(dark));
                }
                buttons.theme.addEventListener('click', () => setTheme(root.dataset.theme !== 'dark'));
                setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);

                deck.classList.add('deck--live');
                let start = 0;
                try {
                    const wanted = decodeURIComponent(location.hash.slice(1));
                    start = Math.max(0, slides.findIndex((slide) => slide.dataset.slideId === wanted));
                } catch (error) {
                    start = 0;
                }
                showSlide(start);
            })();
        </script>
    </body>
</html>
```

### Outside assets — a conditional declaration, never a default

The scaffold's own markup never loads anything from a network. The SKILL.md Step 6 scan decides the rest, per raw mockup, before escaping: it flags only what the mockup loads from a network address — a `src`, `poster` or object `data` attribute, any address in a `srcset`, a `<link>` (or SVG `<image>`/`<use>`) `href`, `url(…)` or `@import`, in any letter case. A plain link (`<a href="https://…">`), a `data-src`-style attribute and an address shown as text load nothing and are not flagged.

- **Any mockup hit** → add `<meta name="presentation-asset-policy" content="external-allowed" />` in `<head>` where the scaffold's comment marks it, and add `<p class="deck__sim-note" role="note">Demos load outside assets; open online to see them exactly.</p>` on the how-to slide where its comment marks it.
- **No hit** → no meta and no notice, even when a mockup or the deck's notes link out with `<a href>`. A deck that declares outside assets it does not load is as wrong as one that hides them.

### Per-slide partials (per the Slide Taxonomy)

The example above carries four slides; a real deck adds the taxonomy sections below with the same `<section class="slide deck__slide">` pattern — its `<h2>`, `data-purpose`/`data-principle`, and notes. `data-slide-id` is shown in brackets; a section that spans several slides numbers each continuation from 2 (`rules-2`, `qc-view-2`), each with its own `<h2>`, `data-purpose` and notes. Inside a slide, group content (cards, columns, a rule and its test cases) with `<div>` or `<article>`, never a nested `<section>`: the conformance check ends a slide at its first `</section>`, so a nested one cuts the slide short and fails the check.

- **Title / agenda** [`title`] — feature(s), run date, scope.
- **How to use this deck** [`how-to`] — the scaffold's how-to slide: deck controls and keys (including that the scroll keys first scroll a slide that does not fit), All slides, Notes, Full screen and Dark theme, each demo's own ▶ Play / ⏮ ⏭ / ↺ Reset controls, how to leave a demo, the print notice, and the outside-asset notice when declared (see §3b).
- **Business context** [`business-context`] — problem, value, initiative→spec narrative, areas.
- **Decomposition & boundaries** [`decomposition`] — when any large-idea signal is true, render the owning `large_idea_decomposition` block: stable slice IDs/outcomes, dependency order, non-goals, risks/evidence owners, and deferred-work owners. When all signals are false, render `N/A — ordinary isolated scope`; never invent a roadmap or milestone.
- **Scope & planned work** [`scope-backlog`] — task cards, user stories, acceptance criteria, priorities.
- **Behavior & rules** [`rules`] — Feature Spec §4 business rules / §5 invariants, §8 test cases.
- **Demo flows / user journeys** [`demo-{journey-slug}`] — one slide per main user story: interactive mockup embed + narration beside it (see §3b); spec-only → one wireframe-demo slide per ASCII frame [`demo-{journey-slug}`, `demo-{journey-slug}-2`, …] (§3b "Spec-only wireframe demo").
- **UI / mockups** [`ui-{feature-slug}`] — one of: `<iframe srcdoc>` embed (idea-to-tasks), design-spec ASCII wireframe in an escaped `<pre class="deck__wireframe" tabindex="0" role="region" aria-label="Wireframe: {screen}">` + Component Inventory / States / Design-Tokens tables (idea-to-spec), or the empty-state text "No prototype or design available for {feature}".
- **QC view** [`qc-view`] — test specifications, states matrix, edge cases.
- **Summary / next steps** [`summary`].

A typical deck has more than six slides, so All slides (the overview) is required, not optional.

---

## 2. Vanilla-JS Slide Engine (zero-dep)

The engine is the `<script>` at the end of the §1 scaffold — there is no second copy to keep in step. Copy it with the scaffold and change it only to fix a defect, then re-run the `review` check. Its contract:

- **One active slide, bounded index.** `showSlide(n)` clamps to the first and last slide, toggles `deck__slide--active`, starts the new slide at its top (at its bottom when reached backwards with a scroll key), sets `aria-disabled` on Previous at the first slide and on Next at the last, writes "Slide N of M: {h2 title}" to the single live status (which is also the visible counter), refreshes open notes, records the slide's `data-slide-id` in the address when the browser allows it, and posts the optional `'play'` to a demo slide (§3b). Opening the deck with `#{slide-id}` starts on that slide.
- **Keys** (runtime contract §3): on a slide whose content overflows its scroll area, ArrowDown, ArrowUp, Space, PageDown and PageUp first scroll that area; they change slide only when it is already at the edge in that direction. ArrowLeft, ArrowRight, Home and End always change slide. Shift+Space acts as the backward scroll key. The scroll area is the page below 900 CSS px and the slide stage otherwise (`scrollArea()`); with the notes open below 900 CSS px the page keys stop where the slide controls end (`scrollEnd()`), so the notes stacked below never add presses between slides, and a backward move lands at the previous slide's end there too. Scrolling is smooth unless the viewer prefers reduced motion. While Tab has put the focus inside the notes panel (Close notes or the notes text), ArrowDown, ArrowUp, PageDown and PageUp — and Space and Shift+Space on the notes text — scroll only the notes panel and move neither the page nor the slide, even at the notes' edge or when the notes fit; the presenter leaves the notes (Tab or a click outside them) to move the deck. ArrowLeft, ArrowRight, Home and End still change slide from the notes. Below 900 CSS px the panel is capped at 80vh, so it scrolls itself there too. Focus that a mouse, pen or touch press put in the notes counts as focus anywhere else, where nothing changes, so a clicker keeps one press per slide that fits (the engine records whether the focus last moved by Tab or by a pointer press). Every render of the notes starts the panel at its top, so each slide's notes open at "Slide N of M" and `Say:`. Forward keys go to the next slide at the edge and back keys to the previous one; a held-down scroll key stops at the edge instead of running through slides. The keys are ignored only while the focus is in a text field or editable element, or while the overview is open — a focused button does not block them, so a clicker keeps working after someone presses Next or closes the notes. Space and Enter on a focused button act only as that button. Escape closes the overview first (native dialog), else the notes panel.
- **Notes** — Notes and Close notes toggle the panel and keep `aria-expanded` in step; opening scrolls the panel into view when its heading is off screen (below 900 CSS px it sits under the slide) while focus stays on Notes; closing returns focus to Notes. The panel clones the slide's `template.slide-notes`; the template itself stays in place for export.
- **Overview** — built on open from the slide `h2` titles; `showModal()` makes the rest of the page inert; arrow keys, Home and End move between items; Enter or a click jumps and closes; Escape or Close closes; focus returns to All slides.
- **Fullscreen** — hidden when the API is missing or disabled; a rejected request adds a message to the status after the position ("Slide N of M: {title} — Full screen is not available here; …"), so the viewer never loses their place; `fullscreenchange` keeps `aria-pressed` accurate.
- **Theme** — starts from the viewer's colour-scheme preference; the toggle flips `data-theme` and `aria-pressed` (pressed = dark). Print always uses the light tokens.
- **Empty demo** — an embed whose `iframe` has no `srcdoc`/`src` is replaced by its empty-state text, and that slide's "⚠ Simulated" narration note is removed. An embed with no iframe (the wireframe demo, §3b) is left untouched.
- **No auto-advance, no storage.** The engine never changes slides on its own and saves nothing in the browser.

---

## 3. `<iframe srcdoc>` Mockup Embed — HTML-Escaping Spec (HIGHEST-RISK)

Each existing `tasks/*-mockup.html` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides) is a FULL HTML document containing `"`, `&`, `<`, `>`, and possibly inline `<script>`. It is embedded into the deck via:

```html
<div class="deck__embed">
    <iframe srcdoc="{ESCAPED_MOCKUP_HTML}" title="Mockup: {feature}"></iframe>
</div>
```

`{ESCAPED_MOCKUP_HTML}` is the **entity-escaped** raw mockup source. Inlining it raw breaks the deck (the first `"` in the mockup closes the `srcdoc` attribute).

### The escaping rule (escape ONCE, on the RAW source, unconditionally)

Replace the four entities, **in this exact order** (`&` MUST be first):

| Step | Replace | With     |
| ---- | ------- | -------- |
| 1    | `&`     | `&amp;`  |
| 2    | `"`     | `&quot;` |
| 3    | `<`     | `&lt;`   |
| 4    | `>`     | `&gt;`   |

**Rules:**

1. **`&` first, always.** Escaping `&` after `"`/`<`/`>` would double-escape the entities you just produced (`&lt;` → `&amp;lt;`). `&` first is the only correct order.
2. **Escape ONCE over the raw bytes, unconditionally.** Run the four-replace pass exactly once over the raw mockup source. NEVER inspect for pre-existing entities, NEVER detect-and-skip.
3. **A pre-existing literal entity is CORRECT to escape again.** A mockup that already contains a literal `&quot;` or `&amp;` is escaped again: `&`-first turns its literal `&quot;` into `&amp;quot;`, which the iframe decodes back to the literal text `&quot;` — round-trip faithful. The operation is correct precisely because it is **NOT idempotent-by-skipping**.
4. **The failure mode is the OPPOSITE — under-encoding.** A "smart" detect-and-skip that leaves an existing `&`/`<` unescaped produces an under-encoded `srcdoc` → that one embedded mockup renders blank while the deck still opens (silent partial loss). NEVER do entity-detection; escape every byte.

### Worked example A — pre-existing literal entity

Raw mockup fragment (already contains a literal `&quot;`):

```
<input title="a &quot;b&quot; c">
```

After escaping ONCE in `&`-first order (every `&`, `"`, `<`, `>` replaced):

```
&lt;input title=&quot;a &amp;quot;b&amp;quot; c&quot;&gt;
```

Trace of the pre-existing `&quot;`:

- Raw byte sequence `&quot;` → Step 1 (`&`→`&amp;`) turns its leading `&` into `&amp;`, yielding `&amp;quot;`.
- The browser, decoding the `srcdoc` value, turns `&amp;quot;` back into the literal text `&quot;` — exactly the original bytes. Round-trip faithful.
- The surrounding real `"` quotes (`title="…"`) each became `&quot;`, so they do NOT close the `srcdoc` attribute. Deck stays valid.

If we had "smartly skipped" the already-present `&quot;` (left it as `&quot;`), the browser would decode it to a literal `"` — corrupting the embedded mockup's title and, worse, any skipped real `&`/`<` would under-encode the document and render that iframe blank.

### Worked example B — inline `</script>`

Raw mockup fragment (a mockup's own inline script):

```
<script>if (a < b && c > d) alert("x");</script>
```

After escaping ONCE in `&`-first order:

```
&lt;script&gt;if (a &lt; b &amp;&amp; c &gt; d) alert(&quot;x&quot;);&lt;/script&gt;
```

The `</script>` becomes `&lt;/script&gt;` and the `<script>` becomes `&lt;script&gt;`, so the mockup's inline script is inert text inside the `srcdoc` attribute and cannot terminate the deck's own DOM parsing or close the `srcdoc` attribute early. The browser decodes the `srcdoc` value back into a real `</script>` inside the iframe's document, where the mockup script runs. **Demos run unsandboxed:** the demo iframe carries no `sandbox` attribute, so a mockup keeps its own scripts and storage; it runs with the deck's origin, which is why only first-party mockups are embedded, and any outside asset a mockup loads follows the asset policy (SKILL.md Step 6).

---

## 3b. Demo-Flow Slide Pattern (interactive journey + narration)

One demo slide per main user story (journey) — the `demo-{journey-slug}` slide in the §1 scaffold. It embeds the **interactive** `work-item --mode=mockup` HTML scoped to that flow via `<iframe srcdoc>` (the same escape-once rule as §3) and sets the **narration** beside it: the journey's steps in plain language, always visible, never hidden behind the notes. The journey is driven by the mock-up's own controls (▶ Play · ⏮ ⏭ · ↺) **inside** the iframe; the mock-up is self-driving (its engine lives in `work-item/references/mockup-interactive-demo.md` §2–§3) — the deck only navigates slides and adds narration; it does NOT re-implement (or duplicate) interactivity.

Demo slide markers:

- `data-journey="{journey-slug}"` on the section (the engine posts `'play'` only to these slides, and only when they hold an iframe) and `data-slide-id="demo-{journey-slug}"` (a wireframe demo numbers its later frames `-2`, `-3`, …).
- `.deck__body--demo` holds the embed and the narration side by side; they stack when the slide area is narrow (notes open, narrow window, high zoom).
- The narration is static text: a titled ordered list of the journey's steps. It carries no `aria-live` — the deck has exactly one live region, the slide status.
- The speaker notes cover the demo too: what to click and show (Say), why the journey matters, the prototype file and acceptance criteria (Evidence), and the likely reviewer question.
- **Empty state:** when a feature has no mockup and no design spec, delete the iframe, the `hidden` attribute on `.deck__empty` and the narration's "⚠ Simulated" note (nothing is simulated), so the slide reads "No prototype or design available for {feature}" beside the narrated journey steps. Replace the demo notes with the no-visual variant below — the presenter narrates the steps instead of clicking a demo that does not exist. The engine applies the same swap, Simulated note included, to any embed whose iframe has an empty `srcdoc`, so a demo is never a blank frame. When no demo in the deck embeds a prototype, also delete the how-to slide's "⚠ Simulated" note and its demo-controls bullets.

No-visual demo notes (same six labels; the build fills the `{…}` placeholders):

```html
<template class="slide-notes">
    <p><strong>Say:</strong> Narrate the journey steps listed on the slide, taken from the story: where {primary user} starts, what they do, and the end state they reach. There is no prototype to click yet.</p>
    <p><strong>Why:</strong> This is the main path {primary user} takes; reviewers decide here whether the steps meet the acceptance criteria before anything is built.</p>
    <p><strong>Evidence:</strong> No prototype or design exists yet for {feature}; the steps come from {story or spec file}. Acceptance criteria {AC IDs}.</p>
    <p><strong>Transition:</strong> Next for {next slide's topic}.</p>
    <p><strong>Timing:</strong> 01:30</p>
    <p><strong>Question:</strong> When will a prototype exist? Answer with {the planned work item or owner that delivers it}, or record it as an open question.</p>
</template>
```

### Spec-only wireframe demo (`idea-to-spec`)

A spec-only journey has no prototype: it steps through the design spec's ASCII wireframes, ONE SLIDE PER FRAME, so Next (or the Right arrow) advances the frames like any slide. Each frame slide replaces the scaffold demo's iframe AND its `.deck__empty` line with a wireframe figure — keeping the empty-state line would show "No prototype or design available" beside the design. Keep the narration and its "⚠ Simulated" note. The engine's empty-demo swap acts only on an embed that holds an iframe, so it leaves this slide alone.

- **Ids:** the first frame is `demo-{journey-slug}`, each later frame `demo-{journey-slug}-2`, `demo-{journey-slug}-3`, … (§1 "Slide identity"), so every id stays unique and job-named.
- **Text:** the wireframe and every placeholder value are HTML-escaped before insertion (§1 "Escape every inserted value") — wireframes are full of `<`, `>` and `&`. Keep a frame within about 80 columns; a wider frame scrolls sideways inside its own box only. That box is a named, focusable region (`tabindex="0"`, `role="region"`, `aria-label`) so a keyboard user can reach it at 200% zoom; keep all three.
- **Narration:** list every step of the journey on every frame and mark the step this frame shows with `aria-current="step"`.

```html
<section class="slide deck__slide" data-slide-id="demo-{journey-slug}-{n}" data-journey="{journey-slug}" data-purpose="Show step {n} of {journey title}: {what the user does and sees}" data-principle="Reviewers judge a flow by walking its steps, even before a prototype exists">
    <h2>Demo: {journey title}, step {n} of {total}</h2>
    <div class="deck__body deck__body--demo">
        <div class="deck__embed">
            <figure>
                <pre class="deck__wireframe" tabindex="0" role="region" aria-label="Wireframe, step {n} of {total}">{ESCAPED_ASCII_FRAME}</pre>
                <figcaption class="deck__wireframe-caption">Wireframe from {design-spec file}, step {n} of {total}</figcaption>
            </figure>
        </div>
        <aside class="deck__narration" aria-labelledby="narration-{journey-slug}-{n}">
            <h3 class="deck__narration-title" id="narration-{journey-slug}-{n}">What happens</h3>
            <ol class="deck__narration-steps">
                <li class="deck__narration-step">{Where the journey starts and what the user sees}</li>
                <li class="deck__narration-step" aria-current="step">{The step this frame shows and what changes on screen}</li>
                <li class="deck__narration-step">{The end state the user reaches}</li>
            </ol>
            <p class="deck__sim-note" role="note">⚠ Simulated — illustrative data, no real actions are performed</p>
        </aside>
    </div>
    <template class="slide-notes">
        <p><strong>Say:</strong> Point at the wireframe, read the highlighted step aloud, and say what {primary user} sees change before pressing Next for the following frame.</p>
        <p><strong>Why:</strong> The design exists only as a spec; walking its frames lets reviewers check the flow before anyone builds a prototype.</p>
        <p><strong>Evidence:</strong> Wireframe from {design-spec file}; the steps come from {story or spec file}. Acceptance criteria {AC IDs}.</p>
        <p><strong>Transition:</strong> Next for step {n + 1}, or for {next slide's topic} after the last frame.</p>
        <p><strong>Timing:</strong> 00:45</p>
        <p><strong>Question:</strong> What does the user see when {most likely failure}? Answer from {business rule ID} or the spec's States table, or record it as an open question.</p>
    </template>
</section>
```

For the first frame drop the `-{n}` suffix from `data-slide-id` (`demo-{journey-slug}`); the narration id keeps it so ids stay unique in the page.

### Narration BEM

BEM classes (deck-level narration of an embedded journey): `deck__narration`, `deck__narration-title`, `deck__narration-steps`, `deck__narration-step`, `deck__sim-note`; the embed uses `deck__embed` and `deck__empty`. (No control classes here by design — the journey controls live inside the embedded mock-up, not the deck.) Narration copy is **tech-agnostic** (business/observable terms, not framework/CSS class names) per M1/M2 — it turns a clickable screen into a *guided* journey a non-technical stakeholder can follow.

### "How to use this deck" guide slide (one per deck, near the top)

The `how-to` slide of the §1 scaffold teaches a viewer who has never seen the deck: Previous/Next and the slide keys (the scroll keys first scroll a slide that does not fit), All slides, Notes and Escape (with Tab into the notes to read long ones by keyboard; there the scroll keys move only the notes, so Tab or a click outside them returns the keys to the deck), that Full screen and Dark theme change how the deck is shown, each demo's own ▶ Play / ⏮ ⏭ / ↺ Reset controls and hotspots, and **how to get back to the deck after clicking into a demo — "click outside it, or press Tab until you leave it, to use the arrow keys for slides again."** It also carries the "⚠ Simulated" note (removed when no demo embeds a prototype), the sentence "Speaker notes are not included in print.", and — only when the Step 6 scan declared outside assets — "Demos load outside assets; open online to see them exactly."

### Engine coexistence — deck nav vs. in-iframe demo

The §2 engine is a single global slide router; per-journey interactivity lives INSIDE the embedded iframe. They do not fight:

1. **No key guard is needed.** Key presses inside an embedded demo stay in the demo's own document and never reach the deck, so the deck needs no guard; the viewer clicks outside the demo, or presses Tab until the focus leaves it, to hand the keys back to the deck, as the how-to slide says.

2. **OPTIONAL `postMessage('play')` to auto-start a journey when its slide opens** — the engine's `playDemo()` posts `'play'` to the slide's iframe each time a `data-journey` slide is shown, skipped when the viewer prefers reduced motion. It is a progressive enhancement that MUST degrade gracefully: a frame that has not finished loading misses it, and a mockup without the listener ignores it; the baseline is always the viewer clicking inside the frame.

    Optional only — never a hard dependency. The receiver is the engine's OPTIONAL, inert-when-standalone `message` listener in `work-item/references/mockup-interactive-demo.md` §3 (it calls the walkthrough's `play()` when the parent posts `'play'`). When that listener is absent the post is simply ignored — so the handshake is symmetric (a real receiver exists), not sender-only, and the embedded mock-up stays self-driving with direct clicking as the baseline.

---

## 4. [BLOCKING] Fidelity Gate

> **[BLOCKING] After the deck is assembled (SKILL.md Step 6) and passes the `review` conformance check (Step 8), validate its visuals faithfully match the existing UI inventoried in Step 4 before handoff.** Do NOT report the deck as done until this validation records a result — a deck that does not match the current system is not done. (Mirrors the `work-item --mode=mockup` *Fidelity Validation* gate — Step 7 — at deck scope.)

Validate the produced deck against the inventoried existing UI and record an explicit pass/fail:

1. **Design tokens** — the deck CSS variables (colors, typography, spacing, radius) match the project design system loaded in Step 3; no placeholder value from the §1 scaffold is left unreplaced where the project defines a token. The dark theme uses the project's dark tokens, or dark values derived from its light tokens when it defines none. After substitution, text and control contrast are re-measured in BOTH themes — text at least 4.5:1, controls, borders and the focus ring at least 3:1 — and the deck is re-checked at 200% zoom and at a narrow width (every slide readable by keyboard scrolling, nothing scrolling sideways). Record the measured values; a value below its floor is a FAIL.
2. **Component patterns** — tables, forms, dialogs, status chips, navigation reuse the existing component patterns inventoried in Step 4, not generic HTML.
3. **Layout/structure** — slide layouts and embedded visuals match the existing pages of the related features (sidebar / toolbar / card-grid conventions).
4. **Connected flows** — the deck reflects the entry/exit navigation of the connected feature flows mapped in Step 4.
5. **Embed integrity** — every `<iframe srcdoc>` renders its mockup (no blank/broken frame from under-encoding); every spec-only feature renders ASCII/tables; every visual-less feature renders its empty-state text.
6. **Demo integrity** — every journey/demo slide clicks through end-to-end inside its iframe (each step reaches its end state via real hotspots); no dead controls; the narration beside the demo lists each step with a plain-language explanation and stays tech-agnostic (M1/M2); the "⚠ Simulated" note is visible on every demo that embeds a prototype and absent from an empty-state demo. Spec-only journeys advance their narrated ASCII frames, one slide per frame, with the per-step explanation and no empty-state line beside the wireframe.

Record the outcome in the SKILL.md Step 9 report:

```
Fidelity vs existing UI: PASS | FAIL — tokens / components / layout / flows / embeds / demos matched? If FAIL: what diverged + the fix.
```

If **FAIL**, revise the deck to match the existing UI, re-run the `--profile=review` conformance check on the revised deck, and re-validate before handoff.

---

## 5. Deck Quality Checklist

Before completing:

- [ ] Exactly ONE self-contained HTML file (opens correctly without a server or a network)
- [ ] Inline CSS/JS; no `<script src>`, no stylesheet or font link, no network `url(…)` in the deck's own markup; type from project tokens, else the system stack
- [ ] Asset-policy meta present **iff** the Step 6 mockup scan found an outside asset — and then the how-to slide carries "Demos load outside assets; open online to see them exactly."
- [ ] Passes `validate-presentation.cjs <deck.html> --profile=review` (exit 0) — re-checked after every fix
- [ ] Every slide is `section.slide.deck__slide` with a unique job-named `data-slide-id` (never a position number), `data-purpose`/`data-principle`, an `<h2>`, and notes labelled Say/Why/Evidence/Transition/Timing/Question — the demo slides included; no slide body nests a `<section>`
- [ ] Engine from the §1 scaffold intact: Previous/Next, keys per runtime contract §3 (Left/Right/Home/End change slide; Down/Up/Page Down/Page Up/Space scroll an overflowing slide first, then change slide at its edge; with Tab focus in the notes they scroll only the notes, even at their edge; still working after a button click), All slides overview with Close, Notes panel with Close and Escape (scrolled into view at a narrow width), fullscreen, theme, one "Slide N of M: title" live status
- [ ] Contrast re-measured after token substitution in both themes (text ≥4.5:1, controls and focus ≥3:1), and every slide readable by keyboard at 200% zoom and a narrow width; notes readable by keyboard at 125–150% zoom (Tab into the notes panel; on every slide, not just the first, the notes open at their top, Down and Page Down scroll them to their end, and a further press there moves neither the page nor the slide until the focus leaves the notes; after a mouse click in the notes a clicker still needs one press per slide that fits)
- [ ] No editing, draft-saving, reset or export control
- [ ] Each existing `-mockup.html` embedded via `<iframe srcdoc>` (escaped `&`-first, escape-once-unconditionally) — not regenerated
- [ ] One demo-flow slide per main user story: interactive mockup embedded (driven by its own ▶/⏮/⏭/↺ controls) + narration beside it (each step, plain language) + "⚠ Simulated" note (an empty-state demo drops the note and uses the no-visual notes, §3b)
- [ ] A "How to use this deck" guide slide near the top, including the scroll-first keys, Full screen and Dark theme, how to get back to the deck after clicking into a demo (click outside it, or press Tab until you leave it) and "Speaker notes are not included in print."
- [ ] Demo integrity: every journey slide clicks through end-to-end inside its iframe; no dead controls; narration present + tech-agnostic
- [ ] Spec-only path renders design-spec ASCII wireframes + inventory/states/tokens tables (no HTML mockups); spec-only journeys advance narrated ASCII frames one slide per frame (`demo-{journey-slug}`, `-2`, …), with no empty-state line beside a wireframe
- [ ] Every inserted placeholder value and wireframe HTML-escaped once, `&` first (§1 "Escape every inserted value")
- [ ] Empty-state text "No prototype or design available for {feature}" for any visual-less feature (never a broken/blank iframe)
- [ ] CSS uses design-system tokens; BEM class names
- [ ] Real domain entity field names + realistic sample data (not Lorem ipsum)
- [ ] Saved at `presentations/{YYMMDD}-presentation-{slug}.html` under the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides)
- [ ] Fidelity gate (§4) recorded PASS — tokens, components, layout, flows, embeds, demos matched
