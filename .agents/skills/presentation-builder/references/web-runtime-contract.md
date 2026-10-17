# Web presentation runtime contract

This is the implementation contract for the default HTML output. It is intentionally generic: a deck may use different visual systems, layouts, and subject matter, but it must preserve these presenter and audience capabilities.

## Contents

- [1. Canonical slide schema](#1-canonical-slide-schema)
- [2. Required controls and state](#2-required-controls-and-state)
- [3. Navigation and presentation behavior](#3-navigation-and-presentation-behavior)
- [4. Notes toggle and presenter layer](#4-notes-toggle-and-presenter-layer)
- [5. Edit mode and persistence](#5-edit-mode-and-persistence)
- [6. Fullscreen, print, and resilience](#6-fullscreen-print-and-resilience)
- [7. Accessibility and interaction quality](#7-accessibility-and-interaction-quality)
- [8. Baseline runtime lessons → upgraded generic contract](#8-baseline-runtime-lessons--upgraded-generic-contract)
- [9. Conformance profiles](#9-conformance-profiles)
- [References](#references)

## 1. Canonical slide schema

Use one semantic slide element per slide and stable IDs. The presentation itself also needs a stable identity for draft persistence:

```html
<html data-presentation-id="unique-presentation-id">
<section class="slide" data-slide-id="unique-slide-id"
         data-purpose="the audience job"
         data-principle="why this slide earns its place">
  <header><h1>Meaningful title</h1></header>
  <div class="slide-body">Visible content</div>
  <template class="slide-notes" data-note-for="unique-id">
    <p><strong>Say:</strong> natural presenter talk track.</p>
    <p><strong>Why:</strong> interpretation and audience relevance.</p>
    <p><strong>Evidence:</strong> source, method, caveat, or illustration label.</p>
    <p><strong>Transition:</strong> why the next slide follows.</p>
    <p><strong>Timing:</strong> 00:45 · <strong>Question:</strong> likely question and answer.</p>
  </template>
</section>
```

The root `data-presentation-id` (or an equivalent `meta[name="presentation-id"]`) and every slide `data-slide-id` are durable content identities, not display labels. Do not derive them from mutable copy when a deck is revised.

A valid deck contains at least one slide; a single-slide briefing is valid when it fulfills the communication goal.

`data-purpose` and `data-principle` make the story inspectable. Use one or both; new generated decks should include both. The notes template must be present and non-empty on **every** slide, including cover, agenda/roadmap, appendix, and close. A notes panel may render a cloned template, but the source template must remain available for editing and export.

## 2. Required controls and state

Use native buttons with stable generic markers. Each toggle must update its accessible state and visible styling:

```html
<button data-action="toggle-notes" aria-controls="notes-panel" aria-expanded="false">Notes</button>
<button data-action="toggle-edit" aria-pressed="false">Edit mode</button>
<button data-action="previous">Previous</button>
<button data-action="next">Next</button>
<button data-action="overview">All slides</button>
<aside id="notes-panel" role="dialog" aria-labelledby="notes-title" hidden>
  <h2 id="notes-title">Speaker notes</h2>
  <button data-action="close-notes" aria-label="Close speaker notes">Close</button>
  <p id="notes-status" aria-live="polite"></p>
  <div id="notes-content" role="region" aria-label="Speaker notes text" tabindex="0"></div>
</aside>
```

The exact visual placement is flexible. The control layer must remain usable in normal, notes, edit, fullscreen, print, narrow, and high-zoom states. Compatibility aliases such as `#notes`, `btnNotes`, `btnEdit`, and `.note-src` can ease migration of older decks, but generic `data-action` markers are the new-deck contract.

## 3. Navigation and presentation behavior

- Maintain one active slide and a bounded index; update visual progress and an `aria-live` text status such as “Slide 3 of 12: Evidence.”
- Support Previous/Next buttons plus ArrowLeft/ArrowUp/PageUp/Shift+Space and ArrowRight/ArrowDown/PageDown/Space. Home and End jump to the first/last slide. Prevent these shortcuts only when the user is typing in an editable control. Space and Enter on a focused button, link or disclosure activate it and never move the deck.
- On a slide whose content overflows its scroll area, ArrowDown, ArrowUp, Space, Shift+Space, PageDown and PageUp first scroll that area; they change slide only when it is already at the edge in that direction. A held key (auto-repeat) stops at the slide's edge; only a fresh press there changes slide. ArrowLeft, ArrowRight, Home and End always change slide. A scroll step never skips content hidden under sticky controls, and every slide change opens the new slide at its top — except a backward move made with a scroll key at the top edge, which lands at the previous slide's end.
- The scroll keys move the deck only while the deck has the keyboard. With focus inside the notes panel they scroll the notes and move neither the page nor the slide; keep the notes reachable by keyboard (a focusable, named notes region or scrolling the panel from its controls). While the overview is open it holds the keys: the scroll keys scroll its list, no deck key scrolls the page behind it or changes slide, and Escape closes it.
- Provide an overview or jump menu for decks longer than six slides. It must be keyboard navigable, closeable with Escape, and return focus to its opener.
- Do not auto-advance. Do not make touch, swipe, pointer, or a shortcut the only route; visible buttons remain available.
- Keep the active slide addressable where practical (hash or stable internal ID), but do not make URL routing a prerequisite for local/offline operation.
- Show a short shortcut hint or help surface. Focus rings must remain visible in every mode.

## 4. Notes toggle and presenter layer

- Opening Notes reveals a named panel, current slide title/page, and the complete note content without moving the audience’s story out of order.
- The toggle exposes `aria-expanded` or `aria-pressed`; the panel has a label and logical focus behavior. Escape closes it and focus returns to the invoker.
- Notes are detailed enough for handoff: talk track, why it matters, evidence/caveat, timing, transition, and likely question. Empty or “add notes here” placeholders fail the contract.
- Editing notes changes the underlying per-slide source, survives reload when storage is available, and appears in clean export. Store note fields as text values or sanitized markup; never restore raw localStorage HTML into the document. Notes remain presenter-only in normal viewing and are not accidentally rendered over the audience slide.
- If notes are excluded from print, state that in the print/help surface or provide an explicit notes-print mode.

## 5. Edit mode and persistence

- The Edit mode control is always discoverable, labelled, keyboard accessible, and stateful (`aria-pressed` plus a visible `.is-editing`/equivalent state).
- Edit only intentional prose leaves and notes. Protect navigation, controls, data attributes, source markers, SVG structure, chart data, brand chrome, and layout scaffolding. Do not turn the whole document on with `designMode` unless the artifact has a deliberate safe editing model.
- Use `contenteditable` or an equivalent explicit editor, prevent shortcut collisions while typing, provide a visible focus/outline, and let Escape blur/exit the current editor.
- Persist a browser-local draft under a namespaced, versioned key that identifies the deck. Debounce writes. Detect unavailable/quota-blocked storage and show a user-facing status with an export/recovery path; never silently swallow storage errors.
- Distinguish saved, unsaved, and storage-unavailable states. Do not describe local draft persistence as collaboration, version history, sync, or source-of-truth storage.
- Reset must explain its scope and confirm before deleting the draft. Export must produce a clean standalone HTML file with edits baked in and editor-only classes/attributes removed. It must not overwrite the source without an explicit user action.

## 6. Fullscreen, print, and resilience

- Fullscreen is an enhancement. Handle unsupported APIs, rejected promises, user exit, and `fullscreenchange`; keep the button state accurate and show a recoverable message.
- Print CSS shows one slide per page, keeps titles/content readable, hides interactive controls, and preserves appropriate sources. Provide a separate notes-print option when notes are needed on paper.
- Prefer inline CSS/JS and local assets for offline decks. External fonts/assets require an explicit `allowExternalAssets: true` input policy and a visible artifact policy marker, plus graceful fallback. A broken optional asset must not create a blank slide.
- Avoid unsafe interpolation. Escape source/user text at the HTML boundary, validate URLs, and do not treat editable/localStorage HTML as trusted if untrusted users can reach the file.
- Respect `prefers-reduced-motion`; avoid unnecessary auto-motion, provide pause/stop for anything that moves, and keep content understandable with animation removed.

## 7. Accessibility and interaction quality

- Use semantic headings in a meaningful order and give every meaningful image, SVG, chart, table, and diagram an accessible name or text alternative. Mark purely decorative visuals as decorative.
- Use native buttons/links where possible, visible focus, predictable Tab order, and arrow keys only inside a clearly labelled composite such as an overview grid.
- Do not rely on colour alone. Measure text contrast (4.5:1 normal text; 3:1 large text/essential edges as applicable), preserve readable line lengths, and keep targets comfortably operable.
- Announce slide changes and mode changes without stealing focus. Dialog-like panels must be labelled, Escape-closeable, focus-contained when modal, and return focus to the invoker.
- Verify keyboard, zoom, narrow viewport, screen reader names, print, reduced motion, and the no-JavaScript/failed-asset fallback appropriate to the delivery environment.

## 8. Baseline runtime lessons → upgraded generic contract

The following observations generalize lessons from an existing HTML deck into requirements for any builder. They are not dependencies on a particular subject, visual identity, or source artifact.

| Baseline implementation observation | Preserve | Upgrade required in a generic builder |
|---|---|---|
| Self-contained HTML with inline CSS/JS, a predictable stage, scaling, and print CSS | Offline handoff, predictable stage, print path | Add responsive semantic fallback and explicitly report external-asset policy. |
| Semantic `.slide` sections with per-slide rationale and a coherent answer-first sequence | Stable slide model, per-slide “why”, BLUF → evidence → ask narrative | Add stable `data-slide-id`, `data-purpose`, source ledger, and archetype-specific map. |
| Notes overlay, current title/page, shortcut, note templates, and notes re-scaling | Presenter layer and usable notes view | Require a non-empty note source for every slide, dialog semantics, focus return, and notes status. |
| Prose-only edit mode, note editing, debounced localStorage, reset, and clean HTML export | Safe editing boundary and portable handoff | Add namespaced/versioned keys, save/error status, recovery path, `aria-pressed`, and explicit protection of metadata. |
| Buttons, keyboard controls, progress, and fullscreen | Familiar live-delivery controls | Add live announcements, overview/jump for long decks, fullscreen rejection/state handling, and touch as an optional supplement. |
| SVGs with `role="img"`/`aria-label` values | Label complex visuals | Require an audit for every meaningful visual plus semantic text paths and contrast. |
| Missing overview/hash/touch/reduced-motion/robust ARIA state in some paths, with incomplete notes coverage | Clear boundaries for improvement | Treat each as a checklist item; static validator must fail missing notes and warn/fail missing runtime safeguards. |

## 9. Conformance profiles

A deck is checked against exactly one profile: `node .claude/skills/presentation-builder/scripts/validate-presentation.cjs <deck.html> --profile=presenter|review`. `presenter` is the default — naming no profile gives the identical verdict — and it is the standard every `presentation-builder` deck passes. `review` is the profile `feature-presentation` passes: its feature review deck leaves editing out because its text must match the specifications it summarizes. Any other profile name is refused without a verdict.

`review` demotes exactly these five checks from failure to advisory; every other check keeps the same level in both profiles — a blocking check fails in both, an advisory check stays advisory in both:

| Validator check | Requirement (§5) | `presenter` | `review` |
|---|---|---|---|
| `edit-mode` | In-place editing control with an explicit editing implementation | FAIL | advisory |
| `edit-state` | Editing state announced (`aria-pressed`/`aria-expanded` on the edit toggle) | FAIL | advisory |
| `draft-persistence` | Browser-local draft saving | FAIL | advisory |
| `reset` | Draft reset control | FAIL | advisory |
| `export` | Clean export control | FAIL | advisory |
| Every other blocking check (notes coverage and depth, navigation, accessibility, print, asset policy, stable IDs, `overview` for decks longer than six slides, …) | §1–§4, §6–§7 | FAIL | FAIL |
| The advisory checks (`overview` for decks of six or fewer slides, `fullscreen-state`, `focus-style`, `touch-supplement`, `external-dependencies`) | §3, §6–§8 | advisory | advisory |

The demoted set is defined by the governing spec rule (BR-PD-03 of the Presentation Decks spec) and mirrored in this table and in the validator's `REVIEW_OPTIONAL`; change it in that rule first, then here and in the validator together — never with a local validator edit.

## References

- [W3C WAI — Presentations](https://www.w3.org/WAI/presentations/components/)
- [W3C APG — Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [W3C APG — Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [W3C WAI — Carousels](https://www.w3.org/WAI/tutorials/carousels/)
- [Google — Slides accessibility](https://support.google.com/docs/answer/6199477?hl=en)
- [Google — Presenter view](https://support.google.com/a/users/answer/9310270?hl=en)
- [MDN — `contentEditable`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/contentEditable) and [Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN — Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) and [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)
