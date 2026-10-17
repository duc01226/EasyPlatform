# Motion Storyboard — Planning an Animation Deliverable

> **Scope boundary — read first.** `DD-7` (motion sparingly and deliberately; `.claude/docs/design-knowledge.md` §7) governs motion ON a UI surface: page-load sequences, reveals, feedback on a person's action. **This file governs a deliverable that IS an animation or a video** — a launch clip, a product walkthrough, an animated explainer, a looping hero film exported to MP4 or GIF. There, motion is the content, not decoration on top of it, so `DD-7`'s "one orchestrated moment" budget does not cap it. If the motion lives inside a page a person operates, stop here and follow `DD-7`.
>
> **Still binding for an animation deliverable:** the brief's stated direction wins; the `DD-1` subject grounding and the `DD-3` design plan apply to every frame; project design-system docs outrank this file.

**Goal:** plan the animation on paper — shots, arc, camera, transitions — before any timeline code exists, then build it so it records deterministically and exports cleanly.

**Order of work:**

1. Write the one-sentence message the piece must leave behind.
2. Fill one storyboard card per shot (below).
3. Pick the poster frame of every shot and sketch it.
4. Lay the shots on the energy arc and check the pacing.
5. Spend the camera budget and choose transitions.
6. Build to the recorder contract, avoiding the pitfalls.
7. Export with the `html-export` skill (`--to=mp4|gif`), per §7.

---

## Contents

- [1. Storyboard card — one per shot](#1-storyboard-card--one-per-shot)
- [2. Poster-worthy frame rule](#2-poster-worthy-frame-rule)
- [3. Energy arc — build → accelerate → peak → rest](#3-energy-arc--build--accelerate--peak--rest)
- [4. Camera-move budget](#4-camera-move-budget)
- [5. Transition grammar](#5-transition-grammar)
- [6. HTML-animation pitfalls](#6-html-animation-pitfalls)
- [7. Recording and export](#7-recording-and-export)
- [Closing Reminders](#closing-reminders)

## 1. Storyboard card — one per shot

A shot that cannot fill every field is not ready to build.

```md
### Shot {n} — {working title}
- Duration: {seconds}             (start {t0}s → end {t1}s)
- Purpose: {the one thing this shot tells the viewer}
- Arc phase: build | accelerate | peak | rest
- Framing: {wide | medium | close | detail} on {subject}
- Poster frame: {t}s — {what a still at that moment shows}
- On screen: {elements, in reading order}
- Text: {exact copy; word count}   Hold: {seconds readable}
- Motion: {what moves, from → to, easing}
- Camera: {static | pan | push-in | pull-out | none}  (see budget)
- In: {transition from previous shot}   Out: {transition to next}
- Audio cue (optional): {sync point, if the piece has sound}
```

**Readability check per card:** on-screen text needs roughly one second per three words plus one second to find it; a shot shorter than its text hold is a shot nobody reads.

---

## 2. Poster-worthy frame rule

**Every shot must contain at least one frame that works as a still image** — composed, legible, and on-brand if someone paused there or used it as a thumbnail.

- Mark that frame on the card and sketch it before animating. Motion is the path INTO and OUT OF the poster frame, not a substitute for it.
- Test: scrub to the marked time and screenshot it. If the still reads as half-built — elements mid-flight, text partly faded, nothing in focus — the shot has no resting composition; add a hold.
- The first and last frames of the whole piece are poster frames by default: they become the thumbnail and the frame that lingers after playback ends.

---

## 3. Energy arc — build → accelerate → peak → rest

Pace the piece as one curve, not a sequence of equally busy shots.

| Phase | Share of runtime | Character |
| --- | --- | --- |
| **Build** | ~25–35% | Establish the subject calmly. Few elements, generous holds, slow easing. |
| **Accelerate** | ~30–40% | Cuts get shorter, motion gets quicker, elements stack up. Tension rises. |
| **Peak** | ~10–15% | The single memorable moment — the reveal, the payoff, the product at full strength. Spend boldness here only. |
| **Rest** | ~15–25% | Settle. One clear message, the call to action or logo, held long enough to read twice. |

- **One peak.** Two peaks of equal weight read as no peak; demote one.
- **Rest is not optional.** A piece that ends at the peak feels cut off; the rest phase is where the message lands.
- **Contrast drives energy.** Acceleration is felt relative to the build; a fast opening leaves nowhere to accelerate to.
- For short loops (under ~6 s), compress to build → peak → rest and make the last frame match the first so the loop seam disappears.

---

## 4. Camera-move budget

A virtual camera (scaling or translating a stage container) is powerful and tiring. Budget it.

- **Minimum hold between moves:** let the frame sit still for at least **2 seconds** between the end of one camera move and the start of the next — longer when the frame carries text. Back-to-back moves read as a shaky handheld, not direction.
- **Bounded zoom range:** keep scale between about **1.1× and 2.5×** of the base framing. Below that the move is invisible; above it, raster assets blur and text reflows visibly. Need more magnification? Cut to a new, closer shot instead of zooming further.
- **One move per shot.** A push-in OR a pan, not both. Combining axes belongs to the peak, if anywhere.
- **Motivate every move.** The camera travels toward what the viewer should look at next; a move that points at nothing is decoration.
- **Ease in and out.** Start and stop moves with deceleration; linear camera motion looks mechanical. Keep one easing family for the whole piece.
- **Parallax sparingly:** two or three depth layers at clearly different speeds, never a layer that moves opposite to the camera.

---

## 5. Transition grammar

Transitions carry meaning. Choose them by what the change MEANS, then use the same transition for the same meaning every time.

| Transition | Means | Use when |
| --- | --- | --- |
| **Hard cut** | New topic, same energy | Default between shots; also for rhythm in the accelerate phase |
| **Match cut / morph** | Same thing, new context | A shared element carries across — a shape becomes a screen, a number becomes a chart |
| **Crossfade** | Time passes, mood continues | Build and rest phases; never in the peak |
| **Push / slide** | Next item in a sequence | Only when the content really IS a sequence |
| **Zoom through** | Going deeper into a detail | Entering a close-up the previous shot pointed at |
| **Fade to colour** | Chapter break or ending | At most once or twice per piece |

- **Prefer continuity over cuts to a blank frame.** Carrying one element across a transition keeps the viewer oriented; a cut to an empty stage restarts their attention from zero.
- **Keep transitions short** (roughly 0.3–0.6 s) — the shot is the content, the transition is punctuation.
- **No transition catalogue.** Three transition types, used consistently, beat seven used once each.

---

## 6. HTML-animation pitfalls

Recorded HTML is rendered frame by frame, often faster or slower than real time. The recorder controls the page clock, so most timing code records correctly; these are the design-side habits that still break an export. How time is driven is defined once in `.claude/skills/html-export/references/animation-recording.md` — follow it, do not re-derive it here.

1. **Time the recorder does not drive.** Timers, `requestAnimationFrame` timestamps and `performance.now()` are deterministic under recording, because the recorder steps the page clock — derive motion from them freely. What drifts is summing per-tick deltas that assume real-time spacing, and any time source outside that clock: WebGL or shader time, media playback, worker timers, an external animation timeline. Drive those from `window.__seek(ms)` per the contract; a page that defines `__seek` renders each frame from the `ms` it receives.
2. **Unseeded randomness.** `Math.random()` gives a different particle field on every render and every re-record. Use a seeded generator created once at setup.
3. **Fonts not loaded before frame 0.** The first frames render in a fallback face, then snap. Await `document.fonts.ready` (and every face you use) before signalling ready.
4. **Images and media not decoded.** Lazy or late images pop in mid-shot. Preload and `decode()` them before frame 0.
5. **Layout thrash.** Animating `width`, `height`, `top` or `left`, or reading layout (`getBoundingClientRect`) inside the frame loop → jank and slow renders. Animate `transform` and `opacity`; measure once at setup.
6. **Stateful, non-seekable animation.** Code that only works by playing forward from zero (accumulating positions each tick) cannot jump to frame N. Every frame must be a pure function of `t`.
7. **Hand-managing CSS motion for the recording.** When the page does NOT define `window.__seek`, the recorder pauses every CSS animation, CSS transition and Web Animation and pins it to the frame time, so declarative CSS motion needs no pause code; motion added between two frames starts at the next frame. When the page DOES define `__seek`, the page owns time and nothing is pinned: `__seek(t)` must set every animation's `currentTime` (or equivalent) itself, or that motion follows the real clock and recordings differ between runs.
8. **Text measured before fonts settle.** Line breaks and widths computed early are wrong for the final face; measure after fonts are ready.
9. **Viewport-dependent sizing.** `vw`/`vh` and media queries change with the recording window. Fix the stage to the output resolution and scale it as one unit.
10. **Sub-pixel shimmer.** Slow moves on thin lines and small text crawl or flicker. Round positions for slow moves or scale them slightly larger than the base.
11. **No settled first and last frame.** Recording starts mid-entrance or ends mid-exit. Hold the poster frame at both ends.
12. **Reduced-motion ignored for embedded playback.** When the same HTML is also shown live on a page, honour `prefers-reduced-motion` there; the exported file is a separate deliverable.

---

## 7. Recording and export

- **Recorder contract:** make the page recordable per `.claude/skills/html-export/references/animation-recording.md`. `html-export` owns that contract — the ready signal, how time is driven, what happens after each `__seek`, the per-frame timeout, the identical-frames warning, the `window.__recording` flag and hiding on-page controls with `data-export-hide`. Read it there; this file links rather than restates it.
- **Export:** invoke the `html-export` skill, or run its script by path — `node .claude/skills/html-export/scripts/export.cjs --to=mp4 <file> --duration=<seconds>` for video, `--to=gif` for a short loop. Read the exit code first, then `frames.json` (its `output` names the video this run wrote). **html-export exit rule:** exit 0 → evidence as scoped; exit 4 → fix the page and re-run; exit 3 → `NOT VERIFIABLE` plus a one-line pointer to `$html-export` setup, never run install commands; exit 1/2 → tool failure: quote stderr, mark `NOT VERIFIABLE`, never count it as a design defect or a pass; any other code (such as 130 after an interrupt) → handle it like 1/2; evidence is only the files this run's manifest names (`report.json` `files[]` for png, `output` for pdf, `frames.json` `output` for video), since a reused `--out` keeps older files. The HTML stays canonical; never restructure it for an exporter.
- **Before export, verify:** every poster frame screenshots cleanly at its marked time; two recordings give identical per-frame hashes in `frames.json` (determinism); total runtime matches the storyboard sum.
- **GIF budget:** keep loops short and palettes limited; long or photographic pieces belong in MP4.

---

## Closing Reminders

**IMPORTANT MUST ATTENTION** state the scope first: `DD-7` governs motion ON a UI surface; this file governs a deliverable that IS an animation — never use it to justify extra motion on a page.

**IMPORTANT MUST ATTENTION** fill a storyboard card and mark a poster frame for every shot BEFORE writing timeline code — why: a shot without a resting composition has nothing worth pausing on.

**IMPORTANT MUST ATTENTION** one peak on the build → accelerate → peak → rest arc; spend the camera budget (hold between moves, bounded zoom, one move per shot) — why: constant motion reads as noise, not energy.

**IMPORTANT MUST ATTENTION** make every frame a pure function of timeline time `t`: no time source outside the recorder's clock unless it goes through `__seek`, seeded randomness, fonts and media ready before frame 0 — then follow the html-export recorder contract and export with the `html-export` skill (`--to=mp4|gif`); never install its dependencies.
