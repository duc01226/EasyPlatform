---
name: scan-design-system
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/design-system/README.md with design system overview, app-to-doc mapping, design tokens, and component inventory.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan project for design system artifacts and populate `docs/project-reference/design-system/README.md` with an overview of the design system, app-to-documentation mapping, design token inventory, and component catalog. (content auto-injected by hook — check for [Injected: ...] header before reading)

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Discover design system structure via parallel sub-agents
3. **Report** — Write findings to external report file
4. **Generate** — Build/update reference doc from report
5. **Verify** — Validate component paths and token files exist

**Key Rules:**

- Generic — works with any design system approach (custom, Storybook, Figma tokens, etc.)
- Discover design system organization dynamically from file system
- Map relationships between apps and their design documentation
- Every reference must point to real files found in this project

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan Design System

## Phase 0: Read & Assess

1. Read `docs/project-reference/design-system/README.md`
2. Resolve config-driven paths from `docs/project-config.json`:
    - `designSystem.canonicalDoc` (e.g., `design-system-canonical.md`) — single source of truth for new code
    - `designSystem.tokenFiles` (e.g., `["design-tokens.scss","design-tokens.css"]`) — drop-in token files
    - **Never hardcode these names** — content varies per project, names come from config.
3. Detect mode: init (placeholder, OR canonical/tokens missing on disk) or sync (populated and present)
4. If sync: extract existing sections and note what's already well-documented
5. Also check for app-specific design docs in the same directory

## Phase 1: Plan Scan Strategy

Discover design system locations:

- `docs/project-reference/design-system/` directory and its contents
- Storybook config (`.storybook/`, `*.stories.ts`)
- Design token files (JSON, CSS, SCSS variables)
- Component library directories (shared components, UI kit)
- Figma token exports or style dictionary config

Use `docs/project-config.json` designSystem section if available for:

- `docsPath` — where design docs live
- `appMappings` — which apps have which design docs (per-app inventory)
- `canonicalDoc` — single target/canonical design system filename
- `tokenFiles` — drop-in token files (SCSS/CSS) referenced by canonical

Resolve canonical doc + token file paths from config. Never hardcode names — they differ per project.

> This skill executes **3 parallel sub-agents** in Phase 2: (1) Design System Structure, (2) Component Inventory, (3) Token & Component Source Discovery.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3 Explore agents** in parallel:

### Agent 1: Design System Structure

- Glob for `docs/project-reference/design-system/**` to map all design docs
- Find design token files (CSS custom properties, SCSS variables, JSON tokens)
- Discover Storybook stories (`*.stories.ts`, `*.stories.tsx`, `*.stories.mdx`)
- Find component library entry points (index files, barrel exports)
- Look for style dictionary or token transformation configs
- Map app-to-design-doc relationships (which app uses which design doc)
- **Verify canonical doc** at `{docsPath}/{canonicalDoc}` has expected sections (Foundations / Components / Patterns / Accessibility / Adoption Strategy). Flag missing sections.
- **Verify token files** at `{docsPath}/{tokenFiles[i]}` exist and contain variable declarations (`--brand-*`, `$brand-*`, etc.). Flag empty/missing.

### Agent 2: Component Inventory

- Grep for reusable UI components (shared component directories, exported components)
- Find component categories (layout, forms, feedback, navigation, data display)
- Discover component variants (size, color, state variations)
- Count components per category
- Find icon sets or asset libraries
- Look for accessibility patterns in components (ARIA roles, keyboard support)
- Find documentation for individual components (JSDoc, README, Storybook docs)

### Agent 3: Token & Component Source Discovery (init-authoring support)

Scope: discover design tokens and component class prefixes from actual source code so init mode can author canonical doc + token files. **Bias toward declarations + frequency, NOT raw literal occurrences — auto-generated junk is strictly worse than placeholder.**

**Source scope (whitelist, not full repo):**

- `src/**/styles/**/*.{scss,css}`, `src/**/themes/**/*.{scss,css}`, `src/**/tokens/**/*.{scss,css}`
- `src/**/*.scss`, `src/**/*.css` ONLY when path contains `theme`, `token`, `palette`, `design`, `style-guide`, or `variables`
- Exclude `node_modules`, `dist`, `.nx`, `coverage`, `*.spec.scss`, component-local styles

**Discovery rules (declarations + frequency, NOT every literal):**

- **CSS custom properties (declarations only):** `--[a-zA-Z][a-zA-Z0-9_-]*\s*:` — capture LHS only, dedupe.
- **SCSS variable declarations:** `^\s*\$[a-zA-Z][a-zA-Z0-9_-]*\s*:` — anchor to start-of-line so usages are excluded.
- **Color values used ≥3 times** across whitelist:
    - Hex: `#[0-9a-fA-F]{3,8}\b`
    - RGB/RGBA: `rgba?\([^)]+\)`
    - HSL/HSLA: `hsla?\([^)]+\)`
    - Apply frequency filter: drop values appearing <3 times (one-offs ≠ design tokens).
- **Spacing scale (declarations only):** `(padding|margin|gap|width|height|inset|top|right|bottom|left)\s*:\s*[\d.]+(px|rem|em)` — extract numeric values, dedupe and sort.
- **Typography (declarations only):** `(font-family|font-size|font-weight|line-height|letter-spacing)\s*:` — extract RHS values, dedupe.
- **Breakpoints:** `@media[^{]*\((min|max)-width:\s*[\d.]+(px|em|rem)\)` — extract widths, dedupe.
- **Z-index (declarations only):** `z-index\s*:\s*[-\d]+` — extract values, dedupe and sort.
- **Elevation/shadow (declarations only):** `(box-shadow|filter\s*:\s*drop-shadow)\s*:` — extract RHS values, dedupe.
- **Component prefixes:** Use `componentSystem.selectorPrefixes` from `docs/project-config.json` if present; else grep BEM-style block selectors (`\.[a-z][a-z0-9-]*__` and `\.[a-z][a-z0-9-]*--`) and dedupe by block name.

**Categorise findings:** Colors / Typography / Spacing / Breakpoints / Z-Index / Elevation / Component-prefixes / Other.
**Persist incrementally** — append to report after each category, don't batch at end.
**Quality gate:** If a category has <3 unique entries OR >200 entries, log "scope too narrow/broad — manual refinement required" instead of dumping into canonical doc.

Write all findings to: `plans/reports/scan-design-system-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Analyze & Generate

Read the report. Build these sections:

### Target Sections

| Section                    | Content                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **Design System Overview** | High-level description of the design system approach, tools, and organization               |
| **App Documentation Map**  | Table: App name, Design doc path, Token source, Component library                           |
| **Design Tokens**          | Token categories (color, typography, spacing, elevation), file locations, naming convention |
| **Component Inventory**    | Table: Component name, Category, Variants, Path, Has docs?                                  |
| **Icon & Asset Library**   | Icon set source, asset directory paths, usage patterns                                      |
| **Storybook**              | Storybook setup (if exists), story organization, how to add new stories                     |
| **Usage Guidelines**       | How to consume tokens and components in application code                                    |

### Content Rules

- Use tables for component inventory and token listings
- Include actual token values (colors, spacing scale) where practical
- Show component usage examples from real application code
- Map each app to its specific design documentation file

### Authoring (init mode only)

When init mode detected (canonical doc missing or placeholder per Phase 0 detection):

1. **Author `{docsPath}/{canonicalDoc}`** from Agent 3 findings:
    - **Prepend regen marker:** First line MUST be `<!-- Generated by /scan-design-system on YYYY-MM-DD; refine sections manually -->` (substitute today's ISO date). Markdown renderers ignore HTML comments.
    - Sections (in order):
        - Foundations (intro, design philosophy)
        - Tokens (color palette, typography scale, spacing scale, breakpoints, z-index, elevation, radius)
        - Components (per-component class prefix + semantic role)
        - Patterns (composition examples)
        - Accessibility (WCAG 2.1 AA notes — color contrast, focus, motion)
        - Adoption Strategy (how to consume tokens in app code)
2. **Author each `{docsPath}/{tokenFiles[i]}`** by grouping discovered declarations by category and emitting valid SCSS/CSS:
    - **First action: REMOVE the `PLACEHOLDER_MARKER_SCSS` sentinel** (`/* @claude:placeholder — do not commit */`) from the placeholder file BEFORE writing real tokens. If sentinel survives, `session-init-docs.cjs` placeholder advisory loops indefinitely.
    - `.scss` file: SCSS variable block per category, then CSS custom property mirrors inside `:root {}`
    - `.css` file: CSS custom properties only inside `:root {}`
    - Categories emitted: Colors, Typography, Spacing, Breakpoints, Z-Index, Elevation/Shadow.
3. **Preserve manual content in sync mode** — if doc/token file already populated (not placeholder), DO NOT overwrite. Only add missing token entries.
4. **Token category scope (full):** colors (≥3-occurrence filter), CSS custom properties (`--*` declarations), SCSS variables (`$*` declarations), spacing scale (declarations), typography (declarations), breakpoints (`@media min/max-width`), z-index (declarations), elevation (`box-shadow`/`filter: drop-shadow`).

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Verify: 3 design doc paths exist on filesystem
3. Verify: component paths in inventory match actual files
4. **Verify config-driven paths exist:** `{docsPath}/{canonicalDoc}` and every `{docsPath}/{tokenFiles[i]}`.
    - **If init mode AND missing/placeholder:** invoke Phase 3 Authoring step to generate from Agent 3 findings.
    - **If sync mode AND missing:** log gap only (preserve manual content; flag for user re-authoring decision).
5. Report: sections updated, component count, token categories documented, **canonical + token presence**.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
  <!-- /SYNC:scan-and-update-reference-doc:reminder -->
  <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
  <!-- /SYNC:output-quality-principles:reminder -->
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->
