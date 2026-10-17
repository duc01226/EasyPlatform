# Interactive Demo — Flow-Spec Schema, Prototype Engine, Guided Walkthrough, Scope Guard

Render-side reference for `work-item --mode=mockup`. Governs the **scripted clickable prototype** the mock-up becomes: the per-flow flow-spec schema, the vanilla-JS prototype engine (screen router + simulated state machine + demo controls), the guided-walkthrough/coach-mark pattern, the per-step explanation panel + "⚠ Simulated" banner, affordances/accessibility, the scope guard, and the demo-quality checklist. (Protocol + artifact discovery live in `references/mode-mockup.md`.)

**One vocabulary across the skill:** flow-spec, journey, screen/state, hotspot, `goTo`, narration, "⚠ Simulated" banner, demo controls (▶ Play · ⏭ Next · ⏮ Prev · ↺ Reset · ⏏ Exit).

**Scope guard (read first):** the prototype is **scripted/simulated interactivity only** — clickable navigation, canned state transitions, guided narration. NO real `fetch`/`XMLHttpRequest`/auth/persistence/backend, NO external `<script src>` (Google Fonts CSS only), and it MUST work self-contained inside an `<iframe srcdoc>` sandbox (the deck embeds it). Illustrative data only; a visible banner makes the simulation explicit. When the parent task carries `large_idea_decomposition`, every flow-spec also records the owning slice ID and must not cross its non-goals/deferred-work boundary.

---

## Contents

- [§1. Flow-Spec Schema](#1-flow-spec-schema)
- [§2. Prototype Engine (vanilla JS, zero-dep)](#2-prototype-engine-vanilla-js-zero-dep)
- [§3. Guided Walkthrough / Coach-Marks](#3-guided-walkthrough--coach-marks)
- [§4. Explanation Panel + "⚠ Simulated" Banner](#4-explanation-panel---simulated-banner)
- [§5. Affordances + Accessibility](#5-affordances--accessibility)
- [§6. Scope Guard + Anti-Patterns](#6-scope-guard--anti-patterns)
- [§7. Demo-Quality Checklist](#7-demo-quality-checklist)

## §1. Flow-Spec Schema

The planning step (`references/mode-mockup.md` Step 2c) fills ONE flow-spec per main journey of the Step 2a Journey Report (`UX-1`) — the MVP happy path of each main user story. The flow-spec is the single source the engine renders; regenerate the prototype from it whenever the task's design/flow changes (cheap to re-author, avoids drift).

| Field      | Meaning                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `id`       | Stable flow id (`flow-create-goal`) — also the `data-flow` attribute on the rendered screens.    |
| `journey`  | The Journey Report journey this flow demonstrates (`J1`) — every main journey has ≥1 flow-spec.  |
| `title`    | Business-language journey name ("Create a goal") — tech-agnostic prose (M1/M2).                   |
| `persona`  | Who drives it ("Team member tracking objectives").                                               |
| `trigger`  | The entry condition / where the journey starts ("Opens the Goals list").                         |
| `steps[]`  | Ordered steps; each step = `{ action, result, explain }` (see below).                            |
| `endState` | The screen/state the journey lands on + what the user has achieved.                              |

Each `steps[]` item:

| Key       | Meaning                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------- |
| `action`  | What the user does — "user clicks/selects/types X" (names a hotspot).                           |
| `result`  | The screen/state that appears — "screen/state Y appears" (a `goTo` target).                     |
| `explain` | Plain-language WHY, business terms only — shown in the explanation panel (M1/M2 tech-agnostic). |

### Worked example — `flow-create-goal`

```yaml
id: flow-create-goal
journey: J1
title: Create a goal
persona: Team member tracking objectives
trigger: Opens the Goals list (empty or populated)
steps:
    - action: User clicks "New Goal"
      result: The create-goal form opens
      explain: A focused form keeps goal creation a single, deliberate step.
    - action: User types a goal title and selects a target date
      result: The form shows the entered values and enables Save
      explain: Save stays disabled until the goal has the minimum it needs.
    - action: User clicks "Save"
      result: A success message appears and the new goal joins the list
      explain: The goal is captured and immediately visible where work is tracked.
endState: Goals list now shows the new goal at the top, marked "On track".
```

> **Prose contract (M1/M2):** every `title`/`explain`/`endState` string is **business/observable language** — never a framework or CSS class name. The rendered HTML MAY use real class names internally (implementation, not prose) per `spec-principles.md` §3, in the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path).

---

## §2. Prototype Engine (vanilla JS, zero-dep)

A small inline state machine over DOM sections. Named **screens/states** are `<section>`s; `goTo(stateId)` toggles an `--active` class; **hotspots** carry `data-goto`; a **simulated submit** shows a success toast and reveals a new row — with NO real data write, NO network. Click + keyboard parity. Same zero-dep, inline-`<script>` posture as the deck slide engine (`feature-presentation/references/deck-template.md` §2). Self-contained per mock-up — no cross-frame dependency, so it runs inside `<iframe srcdoc>`.

Markup is declarative via data-attributes: `data-flow` (owning journey), `data-state` (screen id), `data-goto` (hotspot target), `data-step` (walkthrough index). The engine wires behavior from these — generation stays markup-driven.

```html
<script>
    (function () {
        // Screens/states: <section data-state="..."> ; the active one shows.
        const states = Array.from(document.querySelectorAll('[data-state]'));
        const toast = document.querySelector('.proto__toast');

        function goTo(stateId) {
            states.forEach((s) => s.classList.toggle('proto__state--active', s.dataset.state === stateId));
            announce(stateId); // updates the explanation panel (see §4)
        }

        // Hotspots: any element with data-goto routes on click + Enter/Space.
        document.querySelectorAll('[data-goto]').forEach((h) => {
            const go = () => goTo(h.dataset.goto);
            h.addEventListener('click', go);
            h.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                }
            });
        });

        // Simulated submit: NO fetch, NO persistence — canned success only.
        document.querySelectorAll('[data-simulate="submit"]').forEach((form) => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                showToast('Saved (simulated)'); // illustrative, no real write
                insertRow(form); // clones a template row into the list, in-memory only
                if (form.dataset.goto) goTo(form.dataset.goto);
            });
        });

        function showToast(msg) {
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('proto__toast--show');
            setTimeout(() => toast.classList.remove('proto__toast--show'), 1800);
        }

        function insertRow(form) {
            const list = document.querySelector('[data-list="' + (form.dataset.list || '') + '"]');
            const tpl = list && list.querySelector('[data-row-template]');
            if (!list || !tpl) return;
            const row = tpl.cloneNode(true);
            row.removeAttribute('data-row-template');
            row.hidden = false;
            // fill row cells from the form's named fields (illustrative values only)
            row.querySelectorAll('[data-bind]').forEach((cell) => {
                const field = form.elements[cell.dataset.bind];
                if (field) cell.textContent = field.value || cell.textContent;
            });
            list.prepend(row);
        }

        // Explanation panel + walkthrough are in §3/§4; expose goTo for them.
        window.__proto = { goTo, showToast };
        goTo(states.length ? states[0].dataset.state : null); // open at first screen
    })();
</script>
```

Engine contract: `goTo(stateId)` is the only router; hotspots and simulated submits both funnel through it; click and keyboard reach every hotspot; the success path is a canned toast + an in-memory row clone (template row carries `data-row-template`, starts `hidden`). No library, no build step, no network.

---

## §3. Guided Walkthrough / Coach-Marks

A **Play demo** mode walks a flow's `steps[]` in order, spotlighting the active hotspot and surfacing that step's `explain` text. The user can also step manually. Controls (one consistent set, living **inside** the mock-up — an embedding deck shows narration only, never its own copy of these): **▶ Play · ⏭ Next · ⏮ Prev · ↺ Reset · ⏏ Exit**.

```html
<script>
    (function () {
        const proto = window.__proto || {};
        const steps = Array.from(document.querySelectorAll('[data-step]')).sort((a, b) => +a.dataset.step - +b.dataset.step);
        let idx = -1;
        let timer = null;

        function spotlight(el) {
            document.querySelectorAll('.proto__hotspot--active').forEach((h) => h.classList.remove('proto__hotspot--active'));
            if (el) el.classList.add('proto__hotspot--active'); // pulse/outline (see §5)
        }

        function go(n) {
            idx = Math.max(0, Math.min(steps.length - 1, n));
            const step = steps[idx];
            if (step && step.dataset.goto && proto.goTo) proto.goTo(step.dataset.goto);
            spotlight(step);
            renderExplain(idx, steps.length, step); // §4
        }
        const next = () => go(idx + 1);
        const prev = () => go(idx - 1);

        function play() {
            stop();
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (reduce) {
                next();
                return;
            } // no auto-advance under reduced motion — manual Next only
            timer = setInterval(() => {
                if (idx >= steps.length - 1) return stop();
                next();
            }, 2600);
        }
        function stop() {
            if (timer) clearInterval(timer);
            timer = null;
        }
        function reset() {
            stop();
            idx = -1;
            go(0);
        }
        function exit() {
            stop();
            spotlight(null);
            idx = -1;
        } // always escapable — never traps the user

        document.querySelector('.proto__ctrl--play')?.addEventListener('click', play);
        document.querySelector('.proto__ctrl--next')?.addEventListener('click', next);
        document.querySelector('.proto__ctrl--prev')?.addEventListener('click', prev);
        document.querySelector('.proto__ctrl--reset')?.addEventListener('click', reset);
        document.querySelector('.proto__ctrl--exit')?.addEventListener('click', exit);

        // OPTIONAL auto-play receiver — inert when standalone. If a parent deck embeds this mock-up
        // and posts 'play' as the slide opens (deck-template.md §3b), auto-start the walkthrough.
        // No parent ⇒ no message ⇒ the mock-up still runs fully on direct clicks, so this adds NO
        // cross-frame *dependency* (it only listens; it never requires a parent) — see §6.
        window.addEventListener('message', (e) => {
            if (e.data === 'play') play();
        });
    })();
</script>
```

Coach-mark: the spotlighted hotspot gets `.proto__hotspot--active` (pulse/outline, §5); a callout near it (or the explanation panel, §4) shows the current `explain`. Auto-advance is disabled under `prefers-reduced-motion` — Next/Prev still work.

---

## §4. Explanation Panel + "⚠ Simulated" Banner

A persistent panel names the **current flow**, the **current step (`n / total`)**, and the step's `explain` text — turning a clickable screen into a *guided* journey a non-technical stakeholder can follow. A visible scope-guard banner makes the simulation explicit.

```html
<aside class="proto__narration" aria-live="polite">
    <p class="proto__narration-flow">Create a goal</p>
    <p class="proto__narration-step">Step 2 / 3</p>
    <p class="proto__narration-text">User types a goal title and selects a target date; Save enables.</p>
</aside>

<div class="proto__banner" role="note">⚠ Simulated — illustrative data, no real actions are performed</div>

<div class="proto__toast" role="status" aria-live="polite"></div>
```

```js
function renderExplain(i, total, stepEl) {
    set('.proto__narration-step', 'Step ' + (i + 1) + ' / ' + total);
    if (stepEl) set('.proto__narration-text', stepEl.dataset.explain || '');
}
function announce(stateId) {
    /* optional: name the active screen for screen readers */
}
function set(sel, text) {
    const el = document.querySelector(sel);
    if (el) el.textContent = text;
}
```

> **Banner is mandatory.** The "⚠ Simulated — illustrative data, no real actions are performed" banner is the scope guard satisfying the M1/M2 tech-agnostic-prose contract — a polished click-through must never read as committed/built behavior. Narration copy stays business-language, framing the demo as a *proposal*, not a build.

---

## §5. Affordances + Accessibility

- **Clickable hotspots are visibly highlighted** — `.proto__hotspot` gets a pulse/outline so a viewer knows where to click; the walkthrough spotlight (`--active`) intensifies it for the current step.
- **Disabled controls show a tooltip** (`title=` / `aria-disabled="true"`) — never a dead control with no feedback.
- **Never trap the user** — every demo offers ↺ Reset and ⏏ Exit; Play can always be stopped.
- **Respect `prefers-reduced-motion`** — suppress auto-advance and pulse animation; manual Next/Prev still drives the journey.
- **Keyboard parity** — hotspots reachable and activatable via Tab + Enter/Space (§2); controls are real `<button>`s.

---

## §6. Scope Guard + Anti-Patterns

| Anti-Pattern                                    | Correct Approach                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Real `fetch`/`XMLHttpRequest`/auth/persistence  | Scripted/simulated transitions only — canned toast + in-memory row, no network.  |
| External `<script src>` / CDN library           | Self-contained inline `<script>`; Google Fonts CSS only.                         |
| Cross-frame / parent-document dependency         | Engine is self-contained per mock-up so it runs inside `<iframe srcdoc>`.        |
| Dead / non-wired button                          | Every control advances the demo OR is visibly disabled-with-tooltip.            |
| Real business logic / validation rules           | Illustrative pre-scripted scenario only; the "⚠ Simulated" banner stays visible. |
| Tech jargon in narration                         | Narration/explain stays business-language (M1/M2); class names only in markup.   |

The prototype is an **illusion of behavior**, not behavior — it conveys "how it flows" at the lowest cost, between a still image and a built app. Keep it scripted.

---

## §7. Demo-Quality Checklist

The checklist `references/mode-mockup.md` Step 8 (Demo-Quality Review Gate) enforces. Record `Demo quality: PASS | FAIL`.

- [ ] **Every main-story flow clicks end-to-end** — each flow-spec's `steps[]` reach the `endState` via real hotspots; no path dead-ends.
- [ ] **Journey walkthrough + traceability (`UX-8`)** — every Journey Report main journey walked on the prototype (knows the step is needed · sees the action · links it to the goal · sees progress); traceability matrix has no unserved step and no orphan element.
- [ ] **No dead controls** — every button/hotspot advances the demo or is visibly disabled-with-tooltip.
- [ ] **Narration present + tech-agnostic** — every step shows its `explain`; copy is business-language (M1/M2), not class names.
- [ ] **"⚠ Simulated" banner present** — illustrative-data scope guard visible on every flow.
- [ ] **Opens offline standalone** — no external `<script src>`; Google Fonts CSS only.
- [ ] **No JS console errors** — engine + walkthrough run clean.
- [ ] **Real domain data** — screens/rows use real entity field names + realistic values, never Lorem ipsum.
- [ ] **iframe-safe** — works self-contained inside `<iframe srcdoc>` (no parent-document or network dependency) so the deck can embed it.
- [ ] **Reduced-motion + keyboard** — auto-advance suppressed under `prefers-reduced-motion`; hotspots reachable by keyboard; never traps the user.
