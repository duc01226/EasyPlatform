---
name: figma-design
version: 1.0.0
description: '[Frontend] Use when you need to extract design context from Figma URLs via MCP, REST API, or screenshot fallback.'
---

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

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
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

### Level 4: Screenshot + visual analysis tooling (Always Available)

If no MCP and no API token:

1. Ask user via `AskUserQuestion`: "Please screenshot the Figma frame and paste here"
2. Analyze via `visual analysis tooling` skill with design extraction prompts
3. Extract: approximate colors, fonts, spacing, layout, components

## Figma URL Detection & MCP Extraction (canonical)

> Applies when reading PBI/design-spec files that reference Figma URLs. URL→MCP extraction runs inline in this skill.

When a PBI or design-spec references one or more Figma URLs, parse each URL and extract:

- **File Key** — the `[a-zA-Z0-9]+` segment after `figma.com/design/` or `figma.com/file/`.
- **Node ID** — the `node-id=NNN-NNN` query param (display form, e.g. `1-23`). API form replaces `-` with `:` → `1:23`.

Then extract the referenced nodes via the available Figma MCP tools:

```
# With a node id (preferred — narrow, cheap):
mcp__figma__get_file_nodes file_key="{fileKey}" node_ids="{apiNodeId}"

# Whole file (no node id):
mcp__figma__get_file file_key="{fileKey}"
```

**Token Budget:** extract specific nodes only — target <5K tokens per design. Never pull a whole file when a node id is available.

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
- Called by `plan` skill during Design Context Extraction step

## When NOT to Use

- No Figma URL present — skip, proceed to `design-spec` directly
- Hand-drawn wireframe — use `design-spec --mode=wireframe` instead
- Screenshot of existing app — use `design --mode=screenshot` instead

## See Also

- `references/figma-mcp-setup.md` — MCP server setup guide (created in Phase 09)
- `.claude/skills/plan/references/engine-figma.md` — integration protocol
- URL detection is handled inline in this skill

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.

<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **UI System Context:** read frontend-patterns, scss-styling, design-system before any UI change.
- **Critical Thinking:** traced proof per claim, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
