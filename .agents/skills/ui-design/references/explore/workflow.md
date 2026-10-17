# Explore Mode Workflow

> **Purpose:** `$ui-design --mode=explore` turns one text brief into N divergent drafts (N = the Step 0 count: 1, 2 or 3; different on every FREE axis), opens them and asks the user to pick one by looking at the drafts (or records the auto-selection when the user cannot be asked), records that choice, and then continues as `--mode=good` from the chosen draft (a Slide deliverable hands off to a deck builder instead, step 10).
>
> **Critical rules (read first):**
>
> 1. **Authority first.** A direction stated in the brief or pinned by the project design system is ADOPTED, never re-explored. Explore only diverges on FREE axes.
> 2. **Seeds are divergence seeds, not taste.** Each draft translates its seed into the subject's own world (`DD-1`) and passes the `DD-3` generic test, or it is replaced.
> 3. **The user picks from drafts, never from text.** After presenting the N drafts, open them and ask with `ask user question tool`, recommended draft first; never pick for the user while they can be asked (no question tool → ONE draft, auto-selected; drafts unshowable or the question tool errors → AUTO-SELECT the recommended draft, step 9); "continue" is not a pick.
> 4. **Journeys are shared, never explored.** The Journey Report (`UX-1`) and the design-authority read (`UX-2`) are produced ONCE, before any seed, and bind all N drafts: every draft serves the same main journeys and information priority; drafts diverge on visual axes and layout skeleton only.

Read this file when `--mode=explore` is selected. Create ONE task per step below.

## Contents

- [Step 0 — Draft count (before any analysis)](#step-0--draft-count-before-any-analysis)
- [Step 1 — Resolve authority per axis](#step-1--resolve-authority-per-axis)
- [Step 2 — Fact check](#step-2--fact-check)
- [Step 3 — User references and brand assets](#step-3--user-references-and-brand-assets)
- [Step 4 — Content imagery](#step-4--content-imagery)
- [Step 5 — Form questions, canvas and Design Plan skeleton](#step-5--form-questions-canvas-and-design-plan-skeleton)
- [Step 6 — Pick N divergence seeds (the first N of the table)](#step-6--pick-n-divergence-seeds-the-first-n-of-the-table)
- [Step 7 — Fan out N drafts](#step-7--fan-out-n-drafts)
- [Step 8 — All-return barrier, then render](#step-8--all-return-barrier-then-render)
- [Step 9 — Present, open, recommend and ASK](#step-9--present-open-recommend-and-ask)
- [Step 10 — Record the pick and continue](#step-10--record-the-pick-and-continue)
- [Closing Reminders](#closing-reminders)

## Step 0 — Draft count (before any analysis)

Called from `work-item --mode=mockup` → reuse its Step 0 answer; do not ask again. Otherwise, first action: **question tool available** → ask with `ask user question tool` "How many direction drafts for <surface>?" — `3 options` · `2 options` · `1 option` · `Skip explore`, one marked `(Recommended)` from the request text only (a new page or multi-view flow → 3; a single component or dialog → 1–2). `Skip explore` → the opt-out exemption in step 1, run `--mode=good`. **No question tool** → N = 1 in the recommended direction, auto-selected (`Selection: AUTO-SELECTED — no question tool (1 draft)`). With N = 1, steps 6–8 run with one seed and one draft, step 9 opens it without a question, and step 10 records the `Selection:` line (`USER — 1 option` or `AUTO-SELECTED`). A step-1 exemption (all axes pinned) supersedes the count. All run artifacts live under `tmp/design/<run>/`, where `<run>` is `YYMMDD-HHmm-<brief-slug>` — they are disposable run output, not project docs. Gate-file templates: `references/explore/gate-files.md`. Brand procedure: `references/explore/brand-asset-protocol.md`.

## Step 1 — Resolve authority per axis

**First, the Journey Report (`UX-1`)** — per the design skill's Step 0 and `.claude/docs/ux-journey-process.md` §4: actors and job statements, the ranked main journeys with their step tables and decision points, and the information-priority tiers per view (§6). Present it and confirm an inferred primary actor, main job or success outcome before continuing; with no question tool, record it as `INFERRED — unconfirmed (no question tool)` in the report's assumptions and continue. **Then the design-authority read (`UX-2`)** — the project's design principles, design system and existing UI, recorded as `Design authority read: <paths>` or `N/A — none configured (checked: <paths>)`. Both are produced ONCE and shared by all N drafts; save them to `tmp/design/<run>/journey-report.md`.

Resolve the project authority exactly as the design skill's research contract does (project config → `designSystem.canonicalDoc`, `tokenFiles`, `appMappings[]`; existing-UI inventory), then classify each of the three axes — **colour · type · layout** — as `ADOPTED — <source>` or `FREE`.

| Situation | Action |
| --- | --- |
| The brief states a visual direction | Record `ADOPTED — brief`, write the exemption in `direction-approved.md`, skip explore, run `--mode=good`. |
| The project design system pins ALL three axes | Record `ADOPTED — <doc path>` per axis, write the exemption, skip explore, run `--mode=good`. |
| Some axes pinned, some free | Record the pinned axes as `ADOPTED — <doc path>`; the N drafts SHARE the pinned axes and diverge ONLY on the free ones. |
| Nothing pinned | All three axes are `FREE`. |
| The user explicitly opts out of exploring | Record the opt-out verbatim as the exemption, run `--mode=good`. |

A genuine conflict between the brief and the project design system goes to the user with both sides — never resolve it silently.

## Step 2 — Fact check

Before asking the user anything, web-verify every named product, version, device, standard or spec the brief relies on. Cite the source URL for each fact. A fact you could not verify is stated as unverified and never used as a design input. Record the facts in `tmp/design/<run>/product-facts.md` when there is at least one. A verified fact that changes an actor, job, journey step or business rule updates `journey-report.md` before any seed is picked — the drafts inherit one corrected report, never one per draft.

## Step 3 — User references and brand assets

Ask the user ONE optional question: do they have reference designs they like or dislike (a URL, screenshot or file)? When the brief names a real brand, send this in the same message as the brand protocol's step-1 questions, so the user answers once.

- **A liked reference** becomes seed (b) in step 6, replacing the web-found reference. When the user says to follow it for a specific axis ("use this palette"), that axis becomes `ADOPTED — user reference <url or path>` instead.
- **A disliked reference** is a constraint every draft avoids; name what to avoid in each brief.
- **No reply or no reference** → proceed; seed (b) comes from the web as usual.

When the brief names a real brand, run `references/explore/brand-asset-protocol.md` and produce `tmp/design/<run>/brand-spec.md`. Brand facts from that file bind all N drafts. No named brand → record `Brand: N/A`. Record the references and the brand status in `tmp/design/<run>/run-notes.md`.

## Step 4 — Content imagery

Decide whether the subject needs real images to carry its content — a place, a product, a person, an animal, a physical object — as opposed to decoration. Test: would removing the image lose information? If not, the drafts need no content imagery; record `Imagery: none needed` and skip.

When images are needed, gather ONE shared set before any draft exists:

- Use files the user supplies, or images from sources whose licence permits this use (public domain, openly licensed, or the subject's own official press material). Image files only (`.svg`, `.png`, `.jpg`, `.webp`); never download executables or archives.
- Save them under `tmp/design/<run>/imagery/` and record each file's source URL or user path, licence, credit and retrieval date in `run-notes.md`.
- Verify every downloaded file exactly as step 4 of `references/explore/brand-asset-protocol.md` does — real image type, useful size, and no active content in an SVG — and delete any file that fails.
- Where no suitable image exists, use a clearly labelled placeholder that states what real image belongs there (for example a neutral frame captioned "Photo: harbour at dawn"). Never fill the gap with an unlicensed image.

All N drafts use this same set, so they differ on design, not on which pictures they found.

## Step 5 — Form questions, canvas and Design Plan skeleton

Answer the five form questions. Each answer cites where in the brief or content it comes from; an answer with no source is an assumption and is labelled so.

| Question | What it decides |
| --- | --- |
| Narrative role | What the surface must do for its reader: inform, persuade, operate, compare, celebrate |
| Viewing distance | Arm's length screen, glanced dashboard, projected room, phone in hand — sets type size and density |
| Visual temperature | Calm and quiet vs. energetic and loud, warm vs. cool — derived from the subject, not from taste |
| Content capacity | How much real content must fit per view — sets grid, density and hierarchy depth |
| Visual motif | One recurring element drawn from the subject's world that can carry identity |

Fix the **deliverable type and its pixel canvas**. Every draft is built for this canvas and rendered at it in step 8, so the drafts are comparable. A size stated in the brief or the project wins over these defaults:

| Deliverable | Canvas (`--viewport` in step 8) |
| --- | --- |
| Web page or app screen | `1440x900,390x844` (desktop and phone) |
| Slide | `1920x1080`; a draft holds one representative slide, or two marked `data-export-slide` |
| Social post | `1080x1350`, or the platform size the brief names |
| Poster or print piece | The print size in CSS pixels at 96 per inch, for example A3 portrait `1123x1587` |
| Animation or video | The output resolution, for example `1920x1080`; the draft is ONE key-frame still (its poster frame, per `references/lane-marketing/motion-storyboard.md`), not a full animation |

Then write the `DD-3` Design Plan skeleton: subject · audience · job (`DD-1`, taken from the Journey Report), the main journeys and the information-priority tiers per view (`UX-3`/`UX-4`), the deliverable and canvas, the ADOPTED axes with their sources, and the FREE axes left open for the drafts. The skeleton is shared by all N drafts: they diverge on visual axes and layout skeleton, never on the journeys they serve or the priority tier of any content.

## Step 6 — Pick N divergence seeds (the first N of the table)

| Seed | How to get it |
| --- | --- |
| (a) Random style | Run `node .claude/skills/ui-design/scripts/pick-style.cjs` (add `--seed=<n>` only to reproduce a run). It prints one style row as JSON `{ style, keywords, row }`. |
| (b) Real-world reference | The user's liked reference from step 3 when given; otherwise one published piece of design in an adjacent field that solved a similar job well — web-verified, cited by URL. |
| (c) Studio persona | A persona described only by traits ("a studio known for strict typographic grids and restrained colour"). Never name a real studio, designer or author — traits carry the divergence, names add nothing but borrowed authority. |

A seed is raw material. If a seed clashes with an ADOPTED axis, the adopted axis wins and the seed only informs the free axes.

## Step 7 — Fan out N drafts

Spawn N `ui-ux-designer` sub-agents in ONE message. Each brief is self-contained (a sub-agent inherits nothing from this conversation) and carries:

- the subject, audience, job and the Design Plan skeleton from step 5, including the deliverable, its canvas, and every ADOPTED axis with its source;
- the `journey-report.md` path and the rule, verbatim: "Serve the same main journeys and information-priority tiers as the other drafts; diverge only on visual axes and layout skeleton.";
- its ONE seed from step 6, plus the `brand-spec.md`, `product-facts.md` and `run-notes.md` paths when they exist, the shared imagery set from step 4, and any disliked reference to avoid;
- the gates: `DD-1`–`DD-8`, `UI-1.1`–`UI-9.4`, `CL-1`–`CL-6`, with the paths `.claude/docs/design-knowledge.md` and `.claude/docs/design-review-checklist.md`, plus the resolved project design-system doc paths;
- **when layout is FREE:** a layout skeleton that is STRUCTURALLY different from the other drafts (for example: single focal column vs. asymmetric split vs. modular grid — a different reading order, not a recoloured copy). **When layout is ADOPTED:** the pinned layout, unchanged, and the instruction to diverge on the free axes only;
- the grounding rule, verbatim: "Translate the seed into this subject. If the draft would fit another product unchanged, revise it.";
- the asset rule, verbatim: "Place brand and imagery files only as `<img src>` with a path relative to the draft (for example `brand/logo.svg`), never as inline SVG markup, `<object>`, `<iframe>` or `<embed>`. Load no remote script, frame or media; a remote web font through a CSS `<link>` or `@font-face` is the only remote resource allowed.";
- the output path `tmp/design/<run>/direction-{a|b|c}.html` (one self-contained HTML file) and a short note stating the Design Plan it built and what the generic test made it revise.

**No sub-agent capability →** build the N drafts serially yourself. Draft b states what it deliberately avoided from a; draft c states what it avoided from a and b — this keeps the drafts from converging.

## Step 8 — All-return barrier, then render

Wait until all N drafts exist. Then render each one at the step-5 canvas, into its own output folder so each draft keeps its own `report.json`. Run the html-export script by path (or invoke the `html-export` skill):

```bash
node .claude/skills/html-export/scripts/export.cjs --to=png --viewport=<canvas> --out=tmp/design/<run>/renders/direction-a/ tmp/design/<run>/direction-a.html
```

Repeat for each other draft (`direction-b`, `direction-c`). Add `--slides` for a slide draft that marks two slides.

**Why no `--offline`.** html-export's Trust rule (`.claude/skills/html-export/SKILL.md` `## Trust`) requires `--offline` for anything fetched or untrusted. The drafts are HTML this run produced; the fetched brand and imagery files enter them only as verified images through `<img src>`, where an SVG runs no script and loads nothing, and the asset rule allows no remote script, frame or media. Only the drafts' web fonts need the network, and rendering without `--offline` keeps them, so the evidence shows the real type. A draft that breaks the asset rule is not yet a project-produced page: fix it, or render it with `--offline` (its web fonts then fall back to system fonts; say so beside the PNG).

Read the exit code first, per the shared caller rule in `.claude/skills/html-export/SKILL.md`:

| Exit | Meaning | Action |
| --- | --- | --- |
| 0 | Evidence only as html-export scopes it: the page loaded at each viewport with no page error and no blank capture. Not proof that it looks right | Open the PNGs listed in `report.json` `files[]`, judge them, use them in step 9 |
| 4 | A page fault: page errors, a blank capture, or a failure the page caused (`pageFault: true` in `report.json` `failures[]`, e.g. never ready or a hung script); `report.json` names each | Fix the draft, re-render |
| 3 | A rendering dependency is missing | Mark the draft `NOT VERIFIABLE`, list its HTML path, and give a one-line pointer to the setup section of `.claude/skills/html-export/SKILL.md`. NEVER run an install command |
| 1 or 2 | Tool failure | Quote stderr, mark the draft `NOT VERIFIABLE`, list its HTML path. Never count it as a design defect or a pass |

Any other exit code (130 after an interrupt) is an interrupted render: handle it like 1 or 2. A re-render into the same `--out` keeps earlier PNGs beside the new ones; only `report.json` `files[]` lists this render's captures.

Critique each rendered draft against `DD-8` and remove one accessory, then re-render that draft with the same command so the PNG shows the edited HTML. If the re-render fails, label the old PNG `stale — predates the DD-8 edit`.

## Step 9 — Present, open, recommend and ASK

Show the N drafts side by side — PNGs when rendered, otherwise the HTML paths marked `NOT VERIFIABLE` — each with a short summary: its seed, its layout skeleton (or the free axes it varied when layout is ADOPTED), what makes it THIS subject's interface, and how it serves the primary journey (where each step happens and where the primary action sits). **Open every draft in the user's default browser** — run `node .claude/scripts/open-report.cjs tmp/design/<run>/direction-<x>.html` once per draft; it opens nothing in CI or headless sessions and always prints the path. Then, with 2–3 drafts, **ask with `ask user question tool`**: one option per draft, each labelled with its one-line summary and PNG/HTML path; put YOUR RECOMMENDED draft FIRST, labelled `(Recommended)`, with the evidence for it — which draft best serves the primary journey (Primary tier in the first viewport `UX-4`, lowest interaction cost `UX-9`, clearest wayfinding `UX-10`) and fits the subject (`DD-1`). The question's free-text answer covers a mix or "none fit". A recommendation is NOT a pick: only the user's answer is recorded.

- Never pick for the user while they can be asked; the recommendation is advice with evidence.
- **Fallback: auto-select when the user cannot be asked.** With no question tool at all, Step 0 already set ONE draft in the recommended direction, auto-selected. This fallback covers the later cases: the drafts cannot be shown (the browser open fails or is skipped, for example in CI, headless or no-display runs, AND no rendered PNG can be shown in the conversation) OR `ask user question tool` errors after the drafts exist. Do NOT block. AUTO-SELECT your recommended draft: the one that best serves the main journeys (Primary tier in the first viewport `UX-4`, lowest interaction cost `UX-9`, clearest wayfinding `UX-10`) AND best fits the project's design system and existing UI (`UX-2`). Record it in `direction-approved.md` as `Selection: AUTO-SELECTED — <fallback reason>`, with the evidence and the trade-offs of the drafts not chosen. Carry that note into the plan's UI Layout or the run report, continue working, and name it in the final hand-off so the user can re-pick later.
- Never offer a text-only style choice in place of the drafts.

## Step 10 — Record the pick and continue

Write `tmp/design/<run>/direction-approved.md` from the template in `references/explore/gate-files.md`, quoting the user's reply verbatim — or, on the 1-option, no-question-tool or fallback paths, the recorded `Selection: USER — 1 option` / `Selection: AUTO-SELECTED — <reason>` line (never ask again on those paths). While the user can be asked, "continue", "looks good" or silence is NOT a pick — ask again. A mix ("a's layout with c's type") is a valid pick; record it verbatim and name the parts taken from each draft. "None fit" → record it, pick N new seeds (step 6) and repeat from step 7. Fill its `## Design Plan tokens` section from the chosen draft's Design Plan (its step-7 note and HTML; for a mix, each part from the draft it was taken from): named colour hex values, type families with roles and scale, the layout concept, and each web font the draft loads with the packaging rule below — the next step reads the tokens from this file, never from a sub-agent note.

Before continuing, **walk the main journeys (`UX-8`)** on the chosen draft: a cognitive walkthrough per journey plus the traceability matrix (`.claude/docs/ux-journey-process.md` §9). Record every unserved step and orphan element in the `## Journey fixes (UX-8)` table of `run-notes.md` as a fix the next step must make.

Then continue by the deliverable type fixed in step 5:

- **Slide** → do NOT run `--mode=good`; it refines a product screen, not a deck. Hand a deck builder two files: `direction-approved.md`, whose `## Design Plan tokens` section carries the named colour hex values, type families with roles and scale, and layout concept, and `run-notes.md` with its `## Journey fixes (UX-8)` table. The builder adopts the direction and its tokens as its design plan and applies every fix. A general deck → `$presentation-builder`, which takes them as its Step 4 design plan; it is command-only, so STOP here and tell the user to run `$presentation-builder` with those two paths. A deck that reviews a feature's specs, tasks, initiatives or mockups → `feature-presentation`, with the same two files. Write the chosen builder in the `## Next` line of `direction-approved.md` in place of `--mode=good`. A web font the draft loaded travels only when the deck builder packages the font file inside the deck; otherwise the deck uses the project's type token, then the closest system stack, and records the substitution as a departure from the picked direction.
- **Every other deliverable** → run `--mode=good` from the chosen draft: the approved direction, every ADOPTED axis and the Journey Report are now fixed inputs, and `good` raises the draft to the full quality bar.

## Closing Reminders

- **MUST** present the Journey Report (`UX-1`) and read the design authority (`UX-2`) ONCE before any seed; every draft serves the same main journeys and priority tiers, and the chosen draft is walked (`UX-8`) before `good` or, for a Slide deliverable, before the deck-builder hand-off with `run-notes.md` — why: drafts that differ on the journey cannot be compared on design.
- **MUST** resolve authority per axis before any seed; adopted axes are never re-explored, and a pinned layout is shared by all N drafts — why: a house style or stated direction is an intentional identity.
- **MUST** fix the deliverable canvas and one shared imagery set before fan-out, and render every draft at that canvas into its own `--out` folder — why: drafts built for different sizes or with different pictures cannot be compared.
- **MUST** verify every fetched image (SVG: no active content) and have drafts place it only through `<img src>`, loading no remote script, frame or media — why: that is what keeps a draft project-produced, so html-export may render it without `--offline`.
- **MUST** open the N drafts and ask (recommended first) while the user can be asked — no question tool → ONE auto-selected draft; drafts unshowable or the question tool errors → AUTO-SELECT the recommended draft with its reason — and record the verbatim pick or the `Selection:` line in `direction-approved.md`; never install render dependencies — why: the pick is the user's decision, and installs are the user's opt-in.
