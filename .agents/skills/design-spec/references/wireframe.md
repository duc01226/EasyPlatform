# Wireframe-to-Spec Adapter

Read when `--mode=wireframe` is selected. Complete the entrypoint’s journey/context gates before image conversion; continue through its normal output and M1–M5/M7 gates afterward.

> **Mode flag:** use `--mode=wireframe` for hand-drawn/digital wireframes or UI sketches. This INPUT adapter analyzes the image, then continues through the normal Output Format and M1-M5/M7 gate; `design-spec` owns wireframe→spec conversion. A sketch does not waive Step 0a: infer the journeys it serves, tag them `INFERRED`, and record any step the sketch leaves unserved.

### Input Routing (wireframe)

| Input                   | Detection                               | Action                                       |
| ----------------------- | --------------------------------------- | -------------------------------------------- |
| Hand-drawn sketch photo | Image with rough/organic lines          | Analyze with wireframe prompts (this mode)   |
| Digital wireframe       | Image with clean lines/shapes           | Analyze with wireframe prompts (this mode)   |
| Wireframe tool export   | Image from Balsamiq/MockFlow/Figma    | Analyze with wireframe prompts (this mode)   |
| App screenshot          | Polished UI with real data              | Route to `$ui-design --mode=screenshot` instead |

### Wireframe Analysis

Use `visual analysis tooling` with these prompts:

**Prompt 1: Layout Extraction** — "Analyze this wireframe image. Identify: (1) page layout regions (header, sidebar, main, footer), (2) all UI elements with approximate position and type (button, input, table, card, dropdown, modal, tabs), (3) content hierarchy (what is primary vs secondary), (4) interactive elements, (5) any text labels or annotations, (6) navigation patterns."

**Prompt 2: Component Identification** — "From the wireframe, list every distinct UI component. For each: name it descriptively, classify its complexity (primitive=single element, composite=grouped elements, section=page region), note its purpose."

### Wireframe Output Generation

After image analysis and the Step 0a journey inference, generate (per `SYNC:ui-wireframe-protocol`):

1. **ASCII Wireframe** — Recreate layout using box-drawing characters
2. **Component Inventory** — Classify by documented project tiers or actual component ownership; do not impose a tier model
3. **States Table** — Default, Loading, Empty, Error per view
4. **Component Decomposition Tree** — If detail level warrants (refine/story)
5. **Responsive Suggestions** — Based on layout complexity

Apply the **M1-M5/M7** gate to all wireframe-derived prose: business-level component names, no code-prop refs, logical-ID feature mapping, observable transitions, rebuildability, and business-visible subject matter.

Wireframe-derived specs carry the same **Design-Principles Obligations** in the entrypoint: the States Table (item 3) is authored empty/loading/error FIRST (`UI-1.5`) and covers supported interaction states per interactive element, marking unsupported states N/A (`UI-5.2`); the Responsive Suggestions (item 5) break where the CONTENT breaks, not at device names (`UI-4.4`); and where the sketch is silent on type scale, spacing unit, or contrast (`UI-2.5`, `UI-4.1`, `UI-3.1`), record them in §4 as `[UNVERIFIED — needs design-system mapping]` rather than inventing one-off values measured off the drawing.

### Mapped Business Operations

Emit this table linking each interactive component to the feature operations/rules it drives (logical ID is the primary spine; mark `[UNVERIFIED — needs feature-spec mapping]` when the wireframe alone cannot determine it):

| Interactive Component | Interaction (observable) | Feature Operation / Rule (logical ID) | Notes                            |
| --------------------- | ------------------------ | ------------------------------------- | -------------------------------- |
| Primary Button        | Click → submit form      | OP-XX                                 | Triggers create/update operation |
| Filter Dropdown       | Select → reload list     | OP-XX                                 | Drives query/search operation    |
| Row Action Menu       | Click → confirm dialog   | BR-XX                                 | Guarded by authorization rule    |

### Wireframe Output Formats

- **Format A: Task Section (default)** — output a standalone `## UI Layout` section compatible with task/story templates (consumed by `$work-item --mode=mockup`).
- **Format B: Standalone Spec** — output to `design-specs/{YYMMDD}-wireframe-spec-{slug}.md` in the team-artifacts root (default `team-artifacts/`; `docsRoots.teamArtifacts.path` in `docs/project-config.json` overrides).

### Confidence & Review (wireframe)

- **Always display confidence level** for wireframe interpretation with evidence and remaining uncertainty.
- **Always recommend human review** before proceeding to implementation.
- If confidence <70%: ask clarifying questions about ambiguous elements via `ask user question tool`.

