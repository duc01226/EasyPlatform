---
name: figma-design
version: 1.0.0
description: '[Frontend] Extract design context from Figma URLs via MCP, REST API, or screenshot fallback. Produces structured design tokens, component inventory, and layout specs for design-spec consumption. Triggers on figma url, figma design, extract figma, figma to code.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

## Quick Summary

**Goal:** Extract structured design context from Figma designs for downstream use by `design-spec` and planning skills.

**Workflow:**

1. **Detect Input** — Parse Figma URL, extract file key + node ID
2. **Select Extraction Method** — 4-level fallback chain
3. **Extract Context** — Design tokens, components, layout, typography
4. **Output Artifact** — Structured markdown for design-spec consumption

**Key Rules:**

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

- Component patterns: `docs/project-reference/frontend-patterns-reference.md` (content auto-injected by hook — check for [Injected: ...] header before reading)
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

- Always try highest-fidelity method first, fallback gracefully
- Output must be consumable by `design-spec` and `ui-wireframe-protocol`
- Keep extraction under 5K tokens per design

## Extraction Fallback Chain

### Level 1: Official Figma MCP (Best Fidelity)

Check if MCP tools available: look for `get_design_context` in tool list.

If available:

1. `get_design_context` — structured layout, components, tokens, constraints
2. `get_screenshot` — visual reference image
3. `get_code_connect_map` — map Figma components to code components

### Level 2: GLips Figma-Context-MCP (Good Fidelity)

Check if GLips MCP tools available (look for figma-context tools).

If available:

1. Extract file metadata, frame structure, component list
2. Limited to read-only operations

### Level 3: Figma REST API (Manual)

If `FIGMA_ACCESS_TOKEN` environment variable exists:

1. Call `GET /v1/files/{file_key}/nodes?ids={node_id}` via bash script
2. Parse response for: component names, styles, layout properties
3. Limited — no screenshot, no Code Connect

### Level 4: Screenshot + ai-multimodal (Always Available)

If no MCP and no API token:

1. Ask user via `AskUserQuestion`: "Please screenshot the Figma frame and paste here"
2. Analyze via `ai-multimodal` skill with design extraction prompts
3. Extract: approximate colors, fonts, spacing, layout, components

## Output Format

Save to `team-artifacts/design-specs/{YYMMDD}-figma-extract-{slug}.md`:

```markdown
# Figma Design Extract: {Name}

**Source:** {Figma URL}
**Method:** {MCP Level 1 | MCP Level 2 | REST API | Screenshot}
**Date:** {YYMMDD}

## Design Tokens

| Category   | Token     | Value                |
| ---------- | --------- | -------------------- |
| Color      | Primary   | {hex}                |
| Color      | Secondary | {hex}                |
| Typography | Heading   | {font, size, weight} |
| Spacing    | Base      | {px}                 |

## Component Inventory

- **{ComponentName}** — {description}, variants: {list}

## Layout

{ASCII wireframe per ui-wireframe-protocol}

## Responsive

{Breakpoint behavior if detectable}
```

## When to Use

- Figma URL detected in PBI, design-spec, or user prompt
- Called by `design-spec` when Figma URL is present
- Called by `planning` skill during Design Context Extraction step

## When NOT to Use

- No Figma URL present — skip, proceed to `design-spec` directly
- Hand-drawn wireframe — use `wireframe-to-spec` instead
- Screenshot of existing app — use `design-screenshot` instead

## See Also

- `references/figma-mcp-setup.md` — MCP server setup guide (created in Phase 09)
- `.claude/skills/planning/references/figma-integration.md` — integration protocol
- `.claude/hooks/figma-context-extractor.cjs` — URL detection hook

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:ui-system-context:reminder -->
- **IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.
      <!-- /SYNC:ui-system-context:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
