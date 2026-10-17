# Explore Directions — 1–3 design directions before the full mock app (`--explore`)

> **Purpose:** with `--explore`, `work-item --mode=mockup` Step 3d builds N divergent direction drafts (N = the `references/mode-mockup.md` Step 0 count: 1, 2 or 3) of the primary journey's KEY views, renders them with html-export, opens them and asks the user to pick one by looking at the drafts (or records the auto-selection when the user cannot be asked), records that choice, and then Step 4 builds the full interactive mock app in the chosen direction. Without `--explore` this file is not read and the skill stays single-direction.
>
> **Critical rules (read first):**
>
> 1. **Journey first, directions second.** Explore starts only after the Step 2a Journey Report (`UX-1`), the Step 2b/2c surface and flow plans, and the Step 3/3b design-authority read (`UX-2`) exist. All N drafts serve the SAME journeys, views, information-priority tiers, primary actions and rule treatments — they diverge ONLY on FREE visual axes and the layout skeleton. — why: a direction that changes what the user sees first is a different product, not a different look, and the pick would compare incomparable things.
> 2. **Authority first.** An axis pinned by the brief, the project design system or the existing UI is ADOPTED, never re-explored; a design system that pins colour, type AND layout skips explore with a logged reason. — why: a house style is an intentional identity; re-deciding it per task is incoherence.
> 3. **The user picks from drafts, never from text.** After presenting the N rendered drafts, open them in the default browser and ask with `ask user question tool`, your evidence-backed recommendation first; never pick for the user while they can be asked (no way to show the drafts or no question tool → AUTO-SELECT the recommended draft, Step 7); "continue", "looks good" and silence are NOT a pick. — why: the choice is the user's, and a paraphrased or assumed pick is not evidence.

Read this file at Step 3d, when `--explore` is set. It adapts the design skill's explore procedure — `.claude/skills/ui-design/references/explore/workflow.md` (steps cited below as `explore step N`) — to a mock app; that file stays the source for the shared mechanics, and the gate-file templates are in `.claude/skills/ui-design/references/explore/gate-files.md`. Create ONE task per step below. All run artifacts live under `tmp/design/<run>/`, where `<run>` is `YYMMDD-HHmm-<task-or-spec-slug>` — disposable run output, never project docs.

## Contents

- [Step 0 — Apply the scope decision from `references/mode-mockup.md` Step 0](#step-0--apply-the-scope-decision-from-referencesmode-mockupmd-step-0)
- [Step 1 — Persist the shared inputs](#step-1--persist-the-shared-inputs)
- [Step 2 — Resolve authority per axis](#step-2--resolve-authority-per-axis)
- [Step 3 — Facts, references, brand, imagery, canvas](#step-3--facts-references-brand-imagery-canvas)
- [Step 4 — Pick N divergence seeds](#step-4--pick-n-divergence-seeds)
- [Step 5 — Fan out N drafts in ONE message](#step-5--fan-out-n-drafts-in-one-message)
- [Step 6 — All-return barrier, then render](#step-6--all-return-barrier-then-render)
- [Step 7 — Present side by side, open, recommend and ASK](#step-7--present-side-by-side-open-recommend-and-ask)
- [Step 8 — Record the pick, then build the full mock app](#step-8--record-the-pick-then-build-the-full-mock-app)
- [Closing Reminders](#closing-reminders)

## Step 0 — Apply the scope decision from `references/mode-mockup.md` Step 0

The user was asked at `references/mode-mockup.md` Step 0, before any analysis, so that a skip saves the whole run. Here, only the answer is applied:

- **Question tool available → asked at `references/mode-mockup.md` Step 0** with `ask user question tool`: "Generate design mockup options for <surface>?" Options: `3 options` · `2 options` · `1 option` · `Skip mockup`. Mark one `(Recommended)` by scope: a new page or multi-view flow → 3; a single component or dialog → 1–2.
- **`Skip mockup`** → handled at `references/mode-mockup.md` Step 0; this file is never read.
- **`1 option`** → build ONE draft in your recommended direction: Steps 1–6 (Step 4 one seed, Step 5 one sub-agent; Step 6 renders, reads the exit code and runs the `DD-8` critique), then open it in the default browser as Step 7 does — no question, no pick needed — record `Selection: USER — 1 option` and go to Step 8.
- **`2 options` / `3 options`** → run Steps 1–8 with N = that many drafts (`direction-a`, `-b`[, `-c`]) and N seeds.
- **Question tool NOT available** (a non-interactive host, a sub-agent only when no session in the run can ask the user, an autonomous or scheduled run) → generate ONLY ONE mockup in the recommended direction (best main-journey fit `UX-4`/`UX-9`/`UX-10` and best fit with the project design system and existing UI `UX-2`). Run it as the `1 option` path (Steps 1–6, open, Step 8), auto-select it, record `Selection: AUTO-SELECTED — no question tool (1 draft)` in `direction-approved.md` and in the plan or run report, and continue.

Step 2 can override the count: when authority pins every axis, explore is skipped and the answer is logged as superseded by the exemption.

## Step 1 — Persist the shared inputs

Sub-agents inherit nothing from this conversation, so write the inputs every draft needs to disk first:

- `tmp/design/<run>/journey-report.md` — the Step 2a Journey Report, verbatim.
- `tmp/design/<run>/run-notes.md` (template: gate-files `run-notes.md`) — plus a **Key views** section: the primary journey (`J1`, the top-ranked main journey) and the 2–4 views from the Step 2b inventory that host its steps, each with its hosted steps, container, information-priority tiers (Primary · Secondary · On demand · Not here) and ONE primary action (`UX-4`), the rule → interaction treatments on those steps (`UX-5`), the states each view must show (empty/loading/error first, `UI-1.5`), and the realistic domain sample data from Step 3c.
- The low-fi structure (`UX-7`): an ASCII sketch of each key view and the J1 path across them, walked once on the sketch before any draft exists. A step the sketch cannot serve is fixed in the plan now, not in N drafts later.

Key views only — not the whole app. The drafts compare directions; the full surface is built once, in Step 4, in the chosen direction.

## Step 2 — Resolve authority per axis

Classify **colour · type · layout** as `ADOPTED — <source>` or `FREE`, from the Step 3 design-system docs (`designSystem.canonicalDoc`, matched `appMappings[]` doc, token files) and the Step 3b existing-UI inventory, exactly as explore step 1 does.

| Situation | Action |
| --- | --- |
| The brief states a visual direction | `ADOPTED — brief`; write the exemption; skip explore |
| The project design system (or existing UI the task extends) pins ALL three axes | `ADOPTED — <doc path §>` per axis; write the exemption; skip explore |
| The user explicitly opts out | Record the opt-out verbatim as the exemption; skip explore |
| Some axes pinned | The pinned axes are shared by all N drafts; drafts diverge only on the FREE axes |
| Nothing pinned | All three axes `FREE` |

**Exemption** → write `tmp/design/<run>/direction-approved.md` with its `Exemption` section filled (reason + verbatim quote or doc path and section), set `Next` to `work-item --mode=mockup Step 4 in the adopted direction`, log `Explore: SKIPPED — <reason>` in the Step 6 report, and continue at Step 4 single-direction. A genuine conflict between the brief and the design system goes to the user with both sides — never resolved silently.

## Step 3 — Facts, references, brand, imagery, canvas

Run explore steps 2–5 as written: fact-check any named product or standard; ask the ONE optional reference question; run `.claude/skills/ui-design/references/explore/brand-asset-protocol.md` only when the brief names a real external brand (the project's own design system is authority, not a brand to scrape — record `Brand: N/A — project design system` otherwise); gather one shared imagery set only when content needs real images.

Canvas: an app screen → `--viewport=1440x900,390x844` unless the brief or the project states another size. Write the `DD-3` Design Plan skeleton — subject · audience · job (`DD-1`), canvas, ADOPTED axes with sources, FREE axes left open — shared by all N drafts.

## Step 4 — Pick N divergence seeds

Explore step 6 (take the first N): (a) `node .claude/skills/ui-design/scripts/pick-style.cjs` · (b) the user's liked reference, else one web-verified published design from an adjacent field, cited by URL · (c) a studio persona described only by traits, never a real name. A seed that clashes with an ADOPTED axis only informs the free axes.

## Step 5 — Fan out N drafts in ONE message

Spawn N `ui-ux-designer` sub-agents in ONE message (all-return barrier). Each brief is self-contained and carries:

- the paths `tmp/design/<run>/journey-report.md` and `run-notes.md`, the Design Plan skeleton, the canvas, and every ADOPTED axis with its source;
- its ONE seed, plus `brand-spec.md` / `product-facts.md` paths and the shared imagery set when they exist, and any disliked reference to avoid;
- the **same-journey rule**, verbatim: "Build ONLY the key views listed in run-notes.md for journey J1. Keep every view's hosted steps, information-priority tiers, single primary action, rule treatments, states and sample data exactly as listed. Diverge only on the FREE axes and the layout skeleton.";
- **when layout is FREE:** a layout skeleton STRUCTURALLY different from the other drafts (a different reading order, not a recoloured copy) that still keeps each view's Primary tier as its single focal point. **When layout is ADOPTED:** the pinned layout, unchanged;
- the grounding rule and the asset rule from explore step 7, verbatim;
- the gates: `UX-1`–`UX-11`, `DD-1`–`DD-8`, `UI-1.1`–`UI-9.4`, `CL-1`–`CL-6`, with `.claude/docs/ux-journey-process.md`, `.claude/docs/design-knowledge.md`, `.claude/docs/design-review-checklist.md` and the resolved project design-system doc paths;
- the output: ONE self-contained HTML file `tmp/design/<run>/direction-{a|b|c}.html` with each key view as an element marked `data-export-slide` (in J1 step order; simple click-through between them is welcome, full demo controls are not needed), plus a short note: the Design Plan built, what the generic test (`DD-3`) made it revise, and how the direction serves each J1 step.

**No sub-agent capability →** build the N drafts serially; draft b states what it avoided from a, draft c what it avoided from a and b.

## Step 6 — All-return barrier, then render

Wait until all N drafts exist. Before rendering, check each draft kept the same-journey rule (same views, same Primary tier and primary action per view); a draft that drifted is sent back, not rendered. Render each into its own folder at the Step 3 canvas:

```bash
node .claude/skills/html-export/scripts/export.cjs --to=png --viewport=<canvas> --slides --out=tmp/design/<run>/renders/direction-a/ tmp/design/<run>/direction-a.html
```

Repeat for each other draft (`direction-b`, `direction-c`). The bare `--slides` captures every `data-export-slide` key view; a `stacked` navigation fallback in `report.json` is still valid evidence. No `--offline` for the same reason explore step 8 gives; a draft that breaks the asset rule is fixed, or rendered with `--offline` and labelled.

Read the exit code first (`.claude/skills/html-export/SKILL.md` `## Calling from other skills`):

| Exit | Action |
| --- | --- |
| 0 | Evidence only as html-export scopes it (loaded, no page error, no blank capture). Open the PNGs `report.json` `files[]` names and judge them |
| 4 | Page fault — fix the draft, re-render |
| 3 | Mark the draft `NOT VERIFIABLE`, list its HTML path, one-line pointer to html-export setup. NEVER run an install command |
| 1 or 2 | Tool failure — quote stderr, mark `NOT VERIFIABLE`, list the HTML path. Never count it as a design defect or a pass |

Any other exit code (such as 130 after an interrupt) is an interrupted render: handle it like 1 or 2. Only files this run's `report.json` names are evidence; a reused `--out` keeps older PNGs. Critique each rendered draft against `DD-8`, remove one accessory, re-render; if that re-render fails, label the old PNG `stale — predates the DD-8 edit`.

## Step 7 — Present side by side, open, recommend and ASK

Show the N drafts side by side — the PNGs (or HTML paths marked `NOT VERIFIABLE`). Per draft, in business terms:

- its seed and its layout skeleton (or the free axes it varied when layout is ADOPTED);
- **how it serves the primary journey** — where the Primary-tier information and the one primary action sit on each key view, how the user moves between J1's steps, and what the direction trades away;
- what makes it THIS product's interface (`DD-1`).

**Open every draft in the user's default browser** — run `node .claude/scripts/open-report.cjs tmp/design/<run>/direction-<x>.html` once per draft; it opens nothing in CI or headless sessions and always prints the path. Then **ask with `ask user question tool`**: one option per draft, each labelled with its one-line summary and PNG/HTML path; put YOUR RECOMMENDED draft FIRST, labelled `(Recommended)`, with the evidence for it — which draft best serves the primary journey (Primary tier in the first viewport `UX-4`, lowest interaction cost `UX-9`, clearest wayfinding `UX-10`) and fits the subject (`DD-1`). The question's free-text answer covers a mix or "none fit". A recommendation is NOT a pick: only the user's answer is recorded. Never pick for the user while they can be asked, and never offer a text-only style choice instead of the drafts.

**Fallback: auto-select when the user cannot be asked.** A missing question tool is settled BEFORE drafting (one draft only, auto-selected). This fallback covers the later cases: the drafts cannot be shown (the browser open fails or is skipped, for example in CI, headless or no-display runs, AND no rendered PNG can be shown in the conversation) OR `ask user question tool` errors after the drafts exist. Do NOT block. AUTO-SELECT your recommended draft: the one that best serves the main journeys (Primary tier in the first viewport `UX-4`, lowest interaction cost `UX-9`, clearest wayfinding `UX-10`) AND best fits the project's design system and existing UI (`UX-2`). Record it in `direction-approved.md` as `Selection: AUTO-SELECTED — <fallback reason>`, with the evidence and the trade-offs of the drafts not chosen. Carry that note into the plan's UI Layout or the run report, continue working, and name it in the final hand-off so the user can re-pick later.

## Step 8 — Record the pick, then build the full mock app

Write `tmp/design/<run>/direction-approved.md` from the gate-files template, `Pick` section filled with the user's reply quoted verbatim — or, on the 1-option, no-question-tool or fallback paths, the recorded `Selection: USER — 1 option` / `Selection: AUTO-SELECTED — <reason>` line (never ask again on those paths). While the user can be asked, "continue", "looks good" or silence is NOT a pick — ask again. A mix ("a's layout with c's type") is valid: record it verbatim with the parts taken from each draft. "None fit" → record it, pick N new seeds (Step 4) and repeat from Step 5. Set `Next` to `work-item --mode=mockup Step 4 from tmp/design/<run>/direction-<x>.html`.

Return to `references/mode-mockup.md` Step 4: the chosen direction's visual axes and layout skeleton are now FIXED inputs, applied to EVERY view of the Step 2b inventory and every Step 2c flow — not only the key views. The draft is raised to the full bar (prototype engine, guided walkthrough, all states, `UI-*` build constraints). Step 6 reports the run folder and `direction-approved.md`; Step 7 fidelity also checks the mock app matches the approved direction.

## Closing Reminders

- **MUST** start explore only after the Journey Report, the surface/flow plans and the design-authority read exist, and keep all N drafts on the SAME journeys, views, priority tiers, primary actions, rules and data — why: the pick must compare looks, not different products.
- **MUST** resolve authority per axis first; a design system pinning colour, type and layout skips explore with a logged exemption — why: a house style is an intentional identity.
- **MUST** fan out N (the Step 0 count) `ui-ux-designer` sub-agents in ONE message, draft KEY views of the primary journey only, and render each draft with html-export into its own `--out` folder, reading the exit code first and never installing dependencies — why: parallel drafts avoid convergence, and a written PNG is not evidence until the exit code and manifest say so.
- **MUST** open every draft in the default browser and, with 2–3 drafts, ask with `ask user question tool` (recommended draft first, with evidence), never pick for the user while they can be asked (no browser/PNG or no question tool → AUTO-SELECT the recommended draft, recorded with its reason), record the verbatim pick or the `Selection:` line in `direction-approved.md`, then build the FULL mock app in that direction at Step 4 — why: the pick is the user's decision, and the drafts are not the deliverable.
