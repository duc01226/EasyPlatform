---
name: scan-scss-styling
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/scss-styling-guide.md with BEM methodology, SCSS architecture, mixins, variables, theming, and responsive patterns.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

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

**Goal:** Scan project stylesheets and populate `docs/project-reference/scss-styling-guide.md` with BEM methodology usage, SCSS architecture, mixins/variables inventory, theming patterns, responsive breakpoints, and design token conventions. (content auto-injected by hook — check for [Injected: ...] header before reading)

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Discover styling patterns via parallel sub-agents
3. **Report** — Write findings to external report file
4. **Generate** — Build/update reference doc from report
5. **Verify** — Validate file paths and variable names exist

**Key Rules:**

- Generic — works with any CSS methodology (SCSS, Less, CSS Modules, Tailwind, styled-components)
- Detect styling approach first, then scan for approach-specific patterns
- Every example must come from actual stylesheets with file:line references
- Focus on project conventions, not generic CSS tutorials

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scan SCSS Styling

## Phase 0: Read & Assess

1. Read `docs/project-reference/scss-styling-guide.md`
2. Detect mode: init (placeholder) or sync (populated)
3. If sync: extract existing sections and note what's already well-documented

## Phase 1: Plan Scan Strategy

Detect styling approach:

- `*.scss` files → SCSS/Sass (check for BEM patterns, mixins, variables)
- `*.less` files → Less
- `*.module.css` / `*.module.scss` → CSS Modules
- `tailwind.config.*` → Tailwind CSS
- `styled-components` / `emotion` in package.json → CSS-in-JS
- Multiple approaches → document each

Identify styling infrastructure:

- Global styles entry point (`styles.scss`, `global.css`)
- Theme files (CSS custom properties, SCSS theme maps)
- Design token files (JSON tokens, CSS variables)
- Shared mixins/variables directories

Use `docs/project-config.json` styling section if available.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **2 Explore agents** in parallel:

### Agent 1: SCSS Architecture & Variables

- Glob for `**/*.scss` (or detected extension) to map stylesheet tree
- Find the main/global stylesheet entry points and their @import/@use chains
- Grep for SCSS variables (`$variable-name`) — inventory the most-used ones
- Find mixin definitions (`@mixin`) and their usage frequency
- Discover function definitions (`@function`)
- Find design token files (CSS custom properties `--token-name`, JSON token files)
- Look for breakpoint definitions and responsive mixins

### Agent 2: BEM Patterns & Theming

- Grep for BEM class patterns in templates/HTML (`block__element--modifier`)
- Find BEM naming conventions (separator style, nesting depth)
- Discover theming patterns (light/dark, CSS custom properties, theme switching)
- Find component-scoped vs global style patterns
- Look for z-index management (variables, scale)
- Find animation/transition conventions
- Identify color palette definitions and usage patterns

Write all findings to: `plans/reports/scan-scss-styling-{YYMMDD}-{HHMM}-report.md`

## Phase 3: Analyze & Generate

Read the report. Build these sections:

### Target Sections

| Section                 | Content                                                                          |
| ----------------------- | -------------------------------------------------------------------------------- |
| **BEM Methodology**     | BEM naming convention used, nesting rules, examples from actual components       |
| **SCSS Architecture**   | File organization, import chain, global vs component styles                      |
| **Mixins & Variables**  | Inventory table: mixin/variable name, purpose, file location, usage count        |
| **Theming**             | Theme approach (CSS vars, SCSS maps, etc.), how to add/modify themes             |
| **Responsive Patterns** | Breakpoint definitions, responsive mixins, mobile-first vs desktop-first         |
| **Design Tokens**       | Token naming convention, categories (color, spacing, typography), file locations |
| **Color Palette**       | Color variables/tokens with their hex values and semantic names                  |
| **Z-Index Scale**       | Z-index variable definitions and layering conventions                            |

### Content Rules

- Show actual SCSS/CSS snippets (5-15 lines) from the project with `file:line` references
- Include variable/mixin inventory tables with usage counts
- Use color swatches or hex values for color palette documentation
- Show BEM examples from real components (not fabricated)

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Verify: 5 stylesheet file paths exist (Glob check)
3. Verify: variable names in examples match actual SCSS definitions
4. Report: sections updated, variables counted, theming approach documented

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST** READ the following before starting:
    <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **MUST** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
      <!-- /SYNC:scan-and-update-reference-doc:reminder -->
      <!-- SYNC:output-quality-principles:reminder -->
- **MUST** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
    <!-- /SYNC:output-quality-principles:reminder -->
