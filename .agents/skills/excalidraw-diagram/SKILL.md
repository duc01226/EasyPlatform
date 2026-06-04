---
name: excalidraw-diagram
description: '[Utilities] Use when the user wants to visualize workflows, architectures, or concepts as Excalidraw diagram JSON files.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce `.excalidraw` JSON diagrams that visualize workflows, architectures, or concepts and visually ARGUE a concept — where the structure itself carries the meaning and (for technical diagrams) concrete evidence artifacts teach — validated through the render-view-fix loop until the rendered image matches the conceptual design.

**Summary:**

- Diagrams must ARGUE not DISPLAY: pass the Isomorphism Test (structure alone communicates the concept) — map each major concept to a DIFFERENT visual pattern (fan-out, convergence, timeline, tree, cycle) and default text to free-floating (<30% inside containers).
- Assess depth FIRST: simple/conceptual (abstract shapes) vs comprehensive/technical — technical diagrams MUST research real specs (actual event names, JSON formats, API/method names) and embed evidence artifacts across the three zoom levels (summary flow + section boundaries + concrete detail).
- Build comprehensive JSON section-by-section, never in one pass (hard ~32k-token output limit) — use descriptive string IDs, namespace seeds per section (100xxx, 200xxx), and update cross-section `boundElements` as you go; pull all colors from `references/color-palette.md` and never invent new ones.
- The Render & Validate loop is MANDATORY, not a final check: render to PNG via `render_excalidraw.py`, Read the image, audit against your planned vision plus visual defects (clipping, overlaps, arrows crossing shapes), fix, and re-render — typically 2-4 iterations until it matches the conceptual design.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Customization

**All colors and brand-specific styles live in one file:** `references/color-palette.md`. Read it before generating any diagram; use it as single source of truth for all color choices — shape fills, strokes, text colors, evidence artifact backgrounds, everything.

To produce diagrams in your own brand style, edit `color-palette.md`. Everything else in this file is universal design methodology and Excalidraw best practices.

---

## Core Philosophy

**Diagrams should ARGUE, not DISPLAY.**

A diagram isn't formatted text. It's a visual argument showing relationships, causality, and flow that words alone can't express. The shape should BE the meaning.

**The Isomorphism Test**: If you removed all text, would the structure alone communicate the concept? If not, redesign.

**The Education Test**: Could someone learn something concrete from this diagram, or does it just label boxes? A good diagram teaches—it shows actual formats, real event names, concrete examples.

---

## Depth Assessment (Do This First)

Before designing, determine what level of detail this diagram needs:

### Simple/Conceptual Diagrams

Use abstract shapes when:

- Explaining a mental model or philosophy
- The audience doesn't need technical specifics
- The concept IS the abstraction (e.g., "separation of concerns")

### Comprehensive/Technical Diagrams

Use concrete examples when:

- Diagramming a real system, protocol, or architecture
- The diagram will be used to teach or explain (e.g., YouTube video)
- The audience needs to understand what things actually look like
- You're showing how multiple technologies integrate

**For technical diagrams, you MUST ATTENTION include evidence artifacts** (see below).

---

## Research Mandate (For Technical Diagrams)

**Before drawing anything technical, research the actual specifications.**

If you're diagramming a protocol, API, or framework:

1. Look up the actual JSON/data formats
2. Find the real event names, method names, or API endpoints
3. Understand how the pieces actually connect
4. Use real terminology, not generic placeholders

Bad: "Protocol" → "Frontend"
Good: "AG-UI streams events (RUN_STARTED, STATE_DELTA, A2UI_UPDATE)" → "CopilotKit renders via createA2UIMessageRenderer()"

**Research makes diagrams accurate AND educational.**

---

## Evidence Artifacts

Evidence artifacts are concrete examples that prove your diagram is accurate and help viewers learn. Include them in technical diagrams.

**Types of evidence artifacts** (choose what's relevant to your diagram):

| Artifact Type            | When to Use                                | How to Render                                                                         |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| **Code snippets**        | APIs, integrations, implementation details | Dark rectangle + syntax-colored text (see color palette for evidence artifact colors) |
| **Data/JSON examples**   | Data formats, schemas, payloads            | Dark rectangle + colored text (see color palette)                                     |
| **Event/step sequences** | Protocols, workflows, lifecycles           | Timeline pattern (line + dots + labels)                                               |
| **UI mockups**           | Showing actual output/results              | Nested rectangles mimicking real UI                                                   |
| **Real input content**   | Showing what goes IN to a system           | Rectangle with sample content visible                                                 |
| **API/method names**     | Real function calls, endpoints             | Use actual names from docs, not placeholders                                          |

**Example**: For a diagram about a streaming protocol, you might show:

- The actual event names from the spec (not just "Event 1", "Event 2")
- A code snippet showing how to connect
- What the streamed data actually looks like

**Example**: For a diagram about a data transformation pipeline:

- Show sample input data (actual format, not "Input")
- Show sample output data (actual format, not "Output")
- Show intermediate states if relevant

The key principle: **show what things actually look like**, not just what they're called.

---

## Multi-Zoom Architecture

Comprehensive diagrams operate at multiple zoom levels simultaneously. Think of it like a map that shows both the country borders AND the street names.

### Level 1: Summary Flow

A simplified overview showing the full pipeline or process at a glance. Often placed at the top or bottom of the diagram.

_Example_: `Input → Processing → Output` or `Client → Server → Database`

### Level 2: Section Boundaries

Labeled regions that group related components. These create visual "rooms" that help viewers understand what belongs together.

_Example_: Grouping by responsibility (Backend / Frontend), by phase (Setup / Execution / Cleanup), or by team (User / System / External)

### Level 3: Detail Inside Sections

Evidence artifacts, code snippets, and concrete examples within each section. This is where the educational value lives.

_Example_: Inside a "Backend" section, you might show the actual API response format, not just a box labeled "API Response"

**For comprehensive diagrams, aim to include all three levels.** The summary gives context, the sections organize, and the details teach.

### Bad vs Good

| Bad (Displaying)              | Good (Arguing)                                     |
| ----------------------------- | -------------------------------------------------- |
| 5 equal boxes with labels     | Each concept has a shape that mirrors its behavior |
| Card grid layout              | Visual structure matches conceptual structure      |
| Icons decorating text         | Shapes that ARE the meaning                        |
| Same container for everything | Distinct visual vocabulary per concept             |
| Everything in a box           | Free-floating text with selective containers       |

### Simple vs Comprehensive (Know Which You Need)

| Simple Diagram                                 | Comprehensive Diagram                                     |
| ---------------------------------------------- | --------------------------------------------------------- |
| Generic labels: "Input" → "Process" → "Output" | Specific: shows what the input/output actually looks like |
| Named boxes: "API", "Database", "Client"       | Named boxes + examples of actual requests/responses       |
| "Events" or "Messages" label                   | Timeline with real event/message names from the spec      |
| "UI" or "Dashboard" rectangle                  | Mockup showing actual UI elements and content             |
| ~30 seconds to explain                         | ~2-3 minutes of teaching content                          |
| Viewer learns the structure                    | Viewer learns the structure AND the details               |

**Simple diagrams** are fine for abstract concepts, quick overviews, or when the audience already knows the details. **Comprehensive diagrams** are needed for technical architectures, tutorials, educational content, or when you want the diagram itself to teach.

---

## Container vs. Free-Floating Text

**Not every piece of text needs a shape around it.** Default to free-floating text. Add containers only when they serve a purpose.

| Use a Container When...                                   | Use Free-Floating Text When...                |
| --------------------------------------------------------- | --------------------------------------------- |
| It's the focal point of a section                         | It's a label or description                   |
| It needs visual grouping with other elements              | It's supporting detail or metadata            |
| Arrows need to connect to it                              | It describes something nearby                 |
| The shape itself carries meaning (decision diamond, etc.) | Typography alone creates sufficient hierarchy |
| It represents a distinct "thing" in the system            | It's a section title, subtitle, or annotation |

**Typography as hierarchy**: Use font size, weight, and color to create visual hierarchy without boxes. A 28px title doesn't need a rectangle around it.

**The container test**: For each boxed element, ask "Would this work as free-floating text?" If yes, remove the container.

---

## Design Process (Do This BEFORE Generating JSON)

### Step 0: Assess Depth Required

Before anything else, determine if this needs to be:

- **Simple/Conceptual**: Abstract shapes, labels, relationships (mental models, philosophies)
- **Comprehensive/Technical**: Concrete examples, code snippets, real data (systems, architectures, tutorials)

**If comprehensive**: Do research first. Look up actual specs, formats, event names, APIs.

### Step 1: Understand Deeply

Read the content. For each concept, ask:

- What does this concept **DO**? (not what IS it)
- What relationships exist between concepts?
- What's the core transformation or flow?
- **What would someone need to SEE to understand this?** (not just read about)

### Step 2: Map Concepts to Patterns

For each concept, find the visual pattern that mirrors its behavior:

| If the concept...               | Use this pattern                                   |
| ------------------------------- | -------------------------------------------------- |
| Spawns multiple outputs         | **Fan-out** (radial arrows from center)            |
| Combines inputs into one        | **Convergence** (funnel, arrows merging)           |
| Has hierarchy/nesting           | **Tree** (lines + free-floating text)              |
| Is a sequence of steps          | **Timeline** (line + dots + free-floating labels)  |
| Loops or improves continuously  | **Spiral/Cycle** (arrow returning to start)        |
| Is an abstract state or context | **Cloud** (overlapping ellipses)                   |
| Transforms input to output      | **Assembly line** (before → process → after)       |
| Compares two things             | **Side-by-side** (parallel with contrast)          |
| Separates into phases           | **Gap/Break** (visual separation between sections) |

### Step 3: Ensure Variety

For multi-concept diagrams: **each major concept must use a different visual pattern**. No uniform cards or grids.

### Step 4: Sketch the Flow

Before JSON, mentally trace how the eye moves through the diagram. There should be a clear visual story.

### Step 5: Generate JSON

Only now create the Excalidraw elements. **See below for how to handle large diagrams.**

### Step 6: Render & Validate (MANDATORY)

After generating the JSON, you MUST ATTENTION run the render-view-fix loop until the diagram looks right. This is not optional — see the **Render & Validate** section below for the full process.

---

## Large / Comprehensive Diagram Strategy

**For comprehensive or technical diagrams, you MUST ATTENTION build the JSON one section at a time.** Do NOT attempt to generate the entire file in a single pass. This is a hard constraint — Claude Code has a ~32,000 token output limit per response, and a comprehensive diagram easily exceeds that in one shot. Even if it didn't, generating everything at once leads to worse quality. Section-by-section is better in every way.

### The Section-by-Section Workflow

**Phase 1: Build each section**

1. **Create the base file** with the JSON wrapper (`type`, `version`, `appState`, `files`) and the first section of elements.
2. **Add one section per edit.** Each section gets its own dedicated pass — take your time with it. Think carefully about the layout, spacing, and how this section connects to what's already there.
3. **Use descriptive string IDs** (e.g., `"trigger_rect"`, `"arrow_fan_left"`) so cross-section references are readable.
4. **Namespace seeds by section** (e.g., section 1 uses 100xxx, section 2 uses 200xxx) to avoid collisions.
5. **Update cross-section bindings** as you go. When a new section's element needs to bind to an element from a previous section (e.g., an arrow connecting sections), edit the earlier element's `boundElements` array at the same time.

**Phase 2: Review the whole**

After all sections are in place, read through the complete JSON and check:

- Are cross-section arrows bound correctly on both ends?
- Is the overall spacing balanced, or are some sections cramped while others have too much whitespace?
- Do IDs and bindings all reference elements that actually exist?

Fix any alignment or binding issues before rendering.

**Phase 3: Render & validate**

Now run the render-view-fix loop from the Render & Validate section. This is where you'll catch visual issues that aren't obvious from JSON — overlaps, clipping, imbalanced composition.

### Section Boundaries

Plan your sections around natural visual groupings from the diagram plan. A typical large diagram might split into:

- **Section 1**: Entry point / trigger
- **Section 2**: First decision or routing
- **Section 3**: Main content (hero section — may be the largest single section)
- **Section 4-N**: Remaining phases, outputs, etc.

Each section should be independently understandable: its elements, internal arrows, and any cross-references to adjacent sections.

### What NOT to Do

- **Don't generate the entire diagram in one response.** You will hit the output token limit and produce truncated, broken JSON. Even if the diagram is small enough to fit, splitting into sections produces better results.
- **Don't use a coding agent** to generate the JSON. The agent won't have sufficient context about the skill's rules, and the coordination overhead negates any benefit.
- **Don't write a Python generator script.** The templating and coordinate math seem helpful but introduce a layer of indirection that makes debugging harder. Hand-crafted JSON with descriptive IDs is more maintainable.

---

## Visual Pattern Library

### Fan-Out (One-to-Many)

Central element with arrows radiating to multiple targets. Use for: sources, PRDs, root causes, central hubs.

```
        ○
       ↗
  □ → ○
       ↘
        ○
```

### Convergence (Many-to-One)

Multiple inputs merging through arrows to single output. Use for: aggregation, funnels, synthesis.

```
  ○ ↘
  ○ → □
  ○ ↗
```

### Tree (Hierarchy)

Parent-child branching with connecting lines and free-floating text (no boxes needed). Use for: file systems, org charts, taxonomies.

```
  label
  ├── label
  │   ├── label
  │   └── label
  └── label
```

Use `line` elements for the trunk and branches, free-floating text for labels.

### Spiral/Cycle (Continuous Loop)

Elements in sequence with arrow returning to start. Use for: feedback loops, iterative processes, evolution.

```
  □ → □
  ↑     ↓
  □ ← □
```

### Cloud (Abstract State)

Overlapping ellipses with varied sizes. Use for: context, memory, conversations, mental states.

### Assembly Line (Transformation)

Input → Process Box → Output with clear before/after. Use for: transformations, processing, conversion.

```
  ○○○ → [PROCESS] → □□□
  chaos              order
```

### Side-by-Side (Comparison)

Two parallel structures with visual contrast. Use for: before/after, options, trade-offs.

### Gap/Break (Separation)

Visual whitespace or barrier between sections. Use for: phase changes, context resets, boundaries.

### Lines as Structure

Use lines (type: `line`, not arrows) as primary structural elements instead of boxes:

- **Timelines**: Vertical or horizontal line with small dots (10-20px ellipses) at intervals, free-floating labels beside each dot
- **Tree structures**: Vertical trunk line + horizontal branch lines, with free-floating text labels (no boxes needed)
- **Dividers**: Thin dashed lines to separate sections
- **Flow spines**: A central line that elements relate to, rather than connecting boxes

```
Timeline:           Tree:
  ●─── Label 1        │
  │                   ├── item
  ●─── Label 2        │   ├── sub
  │                   │   └── sub
  ●─── Label 3        └── item
```

Lines + free-floating text often creates a cleaner result than boxes + contained text.

---

## Shape Meaning

Choose shape based on what it represents—or use no shape at all:

| Concept Type                  | Shape                         | Why                          |
| ----------------------------- | ----------------------------- | ---------------------------- |
| Labels, descriptions, details | **none** (free-floating text) | Typography creates hierarchy |
| Section titles, annotations   | **none** (free-floating text) | Font size/weight is enough   |
| Markers on a timeline         | small `ellipse` (10-20px)     | Visual anchor, not container |
| Start, trigger, input         | `ellipse`                     | Soft, origin-like            |
| End, output, result           | `ellipse`                     | Completion, destination      |
| Decision, condition           | `diamond`                     | Classic decision symbol      |
| Process, action, step         | `rectangle`                   | Contained action             |
| Abstract state, context       | overlapping `ellipse`         | Fuzzy, cloud-like            |
| Hierarchy node                | lines + text (no boxes)       | Structure through lines      |

**Rule**: Default to no container. Add shapes only when they carry meaning. Aim for <30% of text elements to be inside containers.

---

## Color as Meaning

Colors encode information, not decoration. Every color choice should come from `references/color-palette.md` — the semantic shape colors, text hierarchy colors, and evidence artifact colors are all defined there.

**Key principles:**

- Each semantic purpose (start, end, decision, AI, error, etc.) has a specific fill/stroke pair
- Free-floating text uses color for hierarchy (titles, subtitles, details — each at a different level)
- Evidence artifacts (code snippets, JSON examples) use their own dark background + colored text scheme
- Always pair a darker stroke with a lighter fill for contrast

**Do not invent new colors.** If a concept doesn't fit an existing semantic category, use Primary/Neutral or Secondary.

---

## Modern Aesthetics

For clean, professional diagrams:

### Roughness

- `roughness: 0` — Clean, crisp edges. Use for modern/technical diagrams.
- `roughness: 1` — Hand-drawn, organic feel. Use for brainstorming/informal diagrams.

**Default to 0** for most professional use cases.

### Stroke Width

- `strokeWidth: 1` — Thin, elegant. Good for lines, dividers, subtle connections.
- `strokeWidth: 2` — Standard. Good for shapes and primary arrows.
- `strokeWidth: 3` — Bold. Use sparingly for emphasis (main flow line, key connections).

### Opacity

**Always use `opacity: 100` for all elements.** Use color, size, and stroke width to create hierarchy instead of transparency.

### Small Markers Instead of Shapes

Instead of full shapes, use small dots (10-20px ellipses) as:

- Timeline markers
- Bullet points
- Connection nodes
- Visual anchors for free-floating text

---

## Layout Principles

### Hierarchy Through Scale

- **Hero**: 300×150 - visual anchor, most important
- **Primary**: 180×90
- **Secondary**: 120×60
- **Small**: 60×40

### Whitespace = Importance

The most important element has the most empty space around it (200px+).

### Flow Direction

Guide the eye: typically left→right or top→bottom for sequences, radial for hub-and-spoke.

### Connections Required

Position alone doesn't show relationships. If A relates to B, there must be an arrow.

---

## Arrow Routing (Preventing Overlap)

**Straight arrows are the default, but they cause overlaps in dense diagrams.** When arrows cross through other elements, use curved or elbowed routing to clear obstacles. This is especially critical in ERDs, architecture diagrams, and any layout with many connections.

### Strategy Selection

1. **Straight** — Only for direct neighbors with a clear, unobstructed path between them. Use 2 points: `[[0,0], [dx, dy]]`.

2. **Curved** (primary overlap fix) — Use when a straight arrow would cross through other elements. Add `"roundness": {"type": 2}` and a 3-point arc: `[[0,0], [midX, -arcHeight], [endX, endY]]`. The midpoint's Y offset creates a smooth parabola that clears obstacles. Use 15-30px offset for short arrows, 30-50px for long ones. Negative Y = arc above, positive Y = arc below.

3. **Elbowed** — Use when curved isn't enough (same-row entities with many obstacles between). Set `"elbowed": true` with a 4-point right-angle path: `[[0,0], [0, -offset], [targetX, -offset], [targetX, 0]]`. Add `"fixedSegments"` to pin the horizontal segment.

### Binding Modes

Use the modern binding format with `mode` and `fixedPoint` (not the legacy `focus`/`gap` format):

- **`"orbit"`** — Arrow attaches to shape's outer edge. Best for most connections. `fixedPoint: [xRatio, yRatio]` where `[0,0.5]` = left, `[1,0.5]` = right, `[0.5,0]` = top, `[0.5,1]` = bottom.
- **`"inside"`** — Arrow starts/ends from inside the shape. Use for vertical drops within a column.

See `references/element-templates.md` for full JSON templates of each arrow type.

### When to Audit Arrows

During the render-view-fix loop, specifically check:

- Do any arrows cross through shapes they shouldn't?
- Are parallel arrows distinguishable (not overlapping each other)?
- For fan-out patterns (one entity with 5+ outgoing arrows), consider reducing to essential relationships or using varied arc heights to separate paths.

---

## Text Rules

**CRITICAL**: The JSON `text` property contains ONLY readable words.

```json
{
    "id": "myElement1",
    "text": "Start",
    "originalText": "Start"
}
```

Settings: `fontSize: 16`, `fontFamily: 3`, `textAlign: "center"`, `verticalAlign: "middle"`

---

## JSON Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

## Element Templates

See `references/element-templates.md` for copy-paste JSON templates for each element type (text, line, dot, rectangle, arrow). Pull colors from `references/color-palette.md` based on each element's semantic purpose.

---

## Render & Validate (MANDATORY)

You cannot judge a diagram from JSON alone. After generating or editing the Excalidraw JSON, you MUST ATTENTION render it to PNG, view the image, and fix what you see — in a loop until it's right. This is a core part of the workflow, not a final check.

### How to Render

```bash
cd .claude/skills/excalidraw-diagram/references && uv run python render_excalidraw.py <path-to-file.excalidraw>
```

This outputs a PNG next to the `.excalidraw` file. Then use the **Read tool** on the PNG to actually view it.

### The Loop

After generating the initial JSON, run this cycle:

**1. Render & View** — Run the render script, then Read the PNG.

**2. Audit against your original vision** — Before looking for bugs, compare the rendered result to what you designed in Steps 1-4. Ask:

- Does the visual structure match the conceptual structure you planned?
- Does each section use the pattern you intended (fan-out, convergence, timeline, etc.)?
- Does the eye flow through the diagram in the order you designed?
- Is the visual hierarchy correct — hero elements dominant, supporting elements smaller?
- For technical diagrams: are the evidence artifacts (code snippets, data examples) readable and properly placed?

**3. Check for visual defects:**

- Text clipped by or overflowing its container
- Text or shapes overlapping other elements
- Arrows crossing through elements instead of routing around them
- Arrows landing on the wrong element or pointing into empty space
- Labels floating ambiguously (not clearly anchored to what they describe)
- Uneven spacing between elements that should be evenly spaced
- Sections with too much whitespace next to sections that are too cramped
- Text too small to read at the rendered size
- Overall composition feels lopsided or unbalanced

**4. Fix** — Edit the JSON to address everything you found. Common fixes:

- Widen containers when text is clipped
- Adjust `x`/`y` coordinates to fix spacing and alignment
- Convert overlapping straight arrows to curved (`roundness: {"type": 2}` + 3-point arc) or elbowed (`elbowed: true` + 4-point path) — see **Arrow Routing** section
- Reposition labels closer to the element they describe
- Resize elements to rebalance visual weight across sections

**5. Re-render & re-view** — Run the render script again and Read the new PNG.

**6. Repeat** — Keep cycling until the diagram passes both the vision check (Step 2) and the defect check (Step 3). Typically takes 2-4 iterations. Don't stop after one pass just because no critical bugs — if the composition could be better, improve it.

### When to Stop

The loop is done when:

- The rendered diagram matches the conceptual design from your planning steps
- No text is clipped, overlapping, or unreadable
- Arrows route cleanly and connect to the right elements
- Spacing is consistent and the composition is balanced
- You'd be comfortable showing it to someone without caveats

### First-Time Setup

If the render script hasn't been set up yet:

```bash
cd .claude/skills/excalidraw-diagram/references
uv sync
uv run playwright install chromium
```

---

## Quality Checklist

### Depth & Evidence (Check First for Technical Diagrams)

1. **Research done**: Did you look up actual specs, formats, event names?
2. **Evidence artifacts**: Are there code snippets, JSON examples, or real data?
3. **Multi-zoom**: Does it have summary flow + section boundaries + detail?
4. **Concrete over abstract**: Real content shown, not just labeled boxes?
5. **Educational value**: Could someone learn something concrete from this?

### Conceptual

6. **Isomorphism**: Does each visual structure mirror its concept's behavior?
7. **Argument**: Does the diagram SHOW something text alone couldn't?
8. **Variety**: Does each major concept use a different visual pattern?
9. **No uniform containers**: Avoided card grids and equal boxes?

### Container Discipline

10. **Minimal containers**: Could any boxed element work as free-floating text instead?
11. **Lines as structure**: Are tree/timeline patterns using lines + text rather than boxes?
12. **Typography hierarchy**: Are font size and color creating visual hierarchy (reducing need for boxes)?

### Structural

13. **Connections**: Every relationship has an arrow or line
14. **Flow**: Clear visual path for the eye to follow
15. **Hierarchy**: Important elements are larger/more isolated
16. **Arrow routing**: No arrows crossing through shapes — use curved/elbowed routing where needed

### Technical

17. **Text clean**: `text` contains only readable words
18. **Font**: `fontFamily: 3`
19. **Roughness**: `roughness: 0` for clean/modern (unless hand-drawn style requested)
20. **Opacity**: `opacity: 100` for all elements (no transparency)
21. **Container ratio**: <30% of text elements should be inside containers

### Visual Validation (Render Required)

22. **Rendered to PNG**: Diagram has been rendered and visually inspected
23. **No text overflow**: All text fits within its container
24. **No overlapping elements**: Shapes and text don't overlap unintentionally
25. **Even spacing**: Similar elements have consistent spacing
26. **Arrows land correctly**: Arrows connect to intended elements without crossing others
27. **Readable at export size**: Text is legible in the rendered PNG
28. **Balanced composition**: No large empty voids or overcrowded regions

---

# Excalidraw Diagram Creator

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Generate `.excalidraw` JSON files that **argue visually**, not just display information.

**Output directory:** Save generated `.excalidraw` files to `docs/diagrams/`. Create the directory if it doesn't exist. Use kebab-case filenames that describe the diagram's subject (e.g., `docs/diagrams/cqrs-command-flow.excalidraw`, `docs/diagrams/cross-service-messaging.excalidraw`). If the user specifies a different path, use that instead.

**Setup:** If the user asks you to set up this skill (renderer, dependencies, etc.), see `README.md` for instructions.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
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

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce `.excalidraw` JSON diagrams that visually ARGUE a concept — where the structure itself carries the meaning and (for technical diagrams) concrete evidence artifacts teach — validated through the render-view-fix loop until the rendered image matches the conceptual design.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Apply critical + sequential thinking; every claim needs traced proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** diagrams must ARGUE not DISPLAY — pass the Isomorphism Test (structure alone communicates the concept); NEVER ship a card grid or equal-box layout — map each concept to a DIFFERENT visual pattern (fan-out, convergence, timeline, tree, cycle) — why: uniform containers display labels, they do not argue meaning
**IMPORTANT MUST ATTENTION** the Render & Validate loop is MANDATORY — NEVER ship JSON without rendering to PNG via `render_excalidraw.py`, Reading the image, and fixing visual defects (clipping, overlaps, arrows crossing shapes) across 2-4 iterations — why: you cannot judge a diagram from JSON alone
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim with confidence >80% to act (<60% DO NOT recommend) — why: speculation produces wrong diagrams that pass silent review
**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting, keep exactly one `in_progress`, mark `completed` immediately, add a final review todo — why: context loss without a task list silently drops findings
**IMPORTANT MUST ATTENTION** assess depth FIRST (simple/conceptual vs comprehensive/technical) — technical diagrams MUST research real specs (actual event names, JSON formats, API/method names), search 3+ existing patterns before inventing, and embed evidence artifacts at all three zoom levels — why: closest example ≠ matching preconditions, and generic placeholders teach nothing
**IMPORTANT MUST ATTENTION** build comprehensive JSON section-by-section, NEVER in one pass — pass it through the ~32k-token output limit, use descriptive string IDs, namespace seeds per section (100xxx, 200xxx), update cross-section `boundElements` as you go — why: a single pass produces truncated, broken JSON
**IMPORTANT MUST ATTENTION** pull ALL colors from `references/color-palette.md` and NEVER invent new ones — use Primary/Neutral or Secondary when no semantic category fits — why: color encodes meaning, invented colors break the encoding
**IMPORTANT MUST ATTENTION** default text to free-floating (<30% inside containers) — for each boxed element ask "Would this work as free-floating text?" and remove the container if yes — why: typography creates hierarchy without boxes

**Anti-Rationalization:**

| Evasion                                      | Rebuttal                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| "JSON looks correct, skip rendering"         | You cannot judge a diagram from JSON — render to PNG, Read it, fix what you see.      |
| "One render pass, no critical bugs, done"    | Vision check ≠ defect check. Keep cycling until composition is balanced (2-4 passes). |
| "Generate the whole diagram in one response" | You will hit the ~32k output limit and produce broken JSON. Build section-by-section. |
| "Generic labels are enough for this"         | Technical diagrams must show actual specs/formats/names — placeholders teach nothing. |
| "This color looks better"                    | Pull only from `references/color-palette.md`; invented colors break the meaning code. |
| "Box everything for consistency"             | Default to free-floating text (<30% boxed); typography is the hierarchy, not borders. |

**IMPORTANT MUST ATTENTION** diagrams must ARGUE not DISPLAY — Render & Validate loop is MANDATORY (render → Read PNG → fix → repeat)
**IMPORTANT MUST ATTENTION** assess depth FIRST, research real specs for technical diagrams, build comprehensive JSON section-by-section
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80% to act); break work into small task tracking todos before starting and add a final review todo

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
