---
name: scan-docs-index
version: 2.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/docs-index-reference.md with documentation tree, file counts, category breakdown, doc relationships, and lookup table.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> - **Verify AI-generated content against actual code.** AI hallucinates file paths and counts. Glob to confirm existence before documenting.
> - **Trace full dependency chain after edits.** Always trace full chain.
> - **Surface ambiguity before coding.** NEVER pick silently.
> - **Update docs that embed canonical data when source changes.** Docs inlining counts go stale silently.

<!-- /SYNC:ai-mistake-prevention -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current state
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan the project's `docs/` directory → populate `docs/project-reference/docs-index-reference.md` with accurate documentation tree, file counts by category, doc relationships, and keyword-to-doc lookup table.

**Workflow:**

1. **Classify** — Detect doc organization type, scan mode
2. **Scan** — Count docs by category, trace relationships, build lookup
3. **Generate** — Build/update reference doc with verified counts and paths
4. **Fresh-Eyes** — Round 2 verification validates all counts and paths

**Key Rules:**

- Generic — discover everything dynamically, never hardcode project-specific values
- ALL file counts must be verified via glob, not copied from existing content
- **MUST ATTENTION** evidence gate required for EVERY count claim — never estimate

---

# Scan Docs Index

## Phase 0: Classify Doc Organization

**Before any other step**, run in parallel:

1. Read `docs/project-reference/docs-index-reference.md`
    - Detect mode: **init** (placeholder only) or **sync** (has real content)
    - In sync: note which sections exist and current file counts to diff

2. Detect documentation organization type:

| Signal                                    | Type                 | Scan Approach                                 |
| ----------------------------------------- | -------------------- | --------------------------------------------- |
| Structured `docs/{category}/` directories | Structured hierarchy | Scan per-category with phase table below      |
| Single flat `docs/` with all files        | Flat structure       | Single glob, categorize by filename prefix    |
| `wiki/` or external doc system            | Wiki-based           | Scan wiki directory, note external docs       |
| Mix of docs + inline README.md files      | Hybrid               | Scan both `docs/` and source-embedded READMEs |

3. Load service paths from `docs/project-config.json` if available

**Evidence gate:** Confidence <60% on organization type → ask user, DO NOT guess structure.

## Phase 1: Plan

Create `TaskCreate` entries for each scan dimension. **Do not start Phase 2 without tasks created.**

## Phase 2: Scan Documentation Tree

Write findings incrementally after each category — NEVER batch at end.

**Think (Coverage dimension):** Which directories exist under `docs/`? Which ones have content vs are empty/stub?

**Think (Accuracy dimension):** For each count in the existing doc, does the actual glob match? What's the delta?

**Think (Completeness dimension):** Are there markdown files outside documented directories (e.g., in `src/`, `.claude/`, project root)? Are those included in any category?

**Think (Discovery dimension):** Which files don't fit any existing category? Where do they go?

### Root-Level Docs

- Glob for `*.md` in project root (README.md, CLAUDE.md, CHANGELOG.md, etc.)
- Record each with one-line purpose description
- **Evidence gate:** File count verified via glob — NEVER estimate

### docs/ Directory

Scan each subdirectory with verified glob counts:

| Category                | Glob Pattern                                                                   | What to Extract                           |
| ----------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| project-reference/      | `docs/project-reference/**/*.md`                                               | File count (verified), list with purposes |
| business-features/      | `docs/business-features/**/*.md`                                               | Count per app, feature count              |
| operations              | `docs/getting-started.md`, `docs/deployment.md`, etc.                          | File count, list                          |
| design-system/          | `docs/design-system/**/*.md` or `docs/project-reference/design-system/**/*.md` | File count, app mapping                   |
| specs/                  | `docs/specs/**/*.md`                                                           | File count, module coverage               |
| architecture-decisions/ | `docs/architecture-decisions/**/*.md`                                          | ADR count                                 |
| templates/              | `docs/templates/**/*.md`                                                       | Template count and types                  |
| release-notes/          | `docs/release-notes/**/*.md`                                                   | File count                                |

**Uncategorized files discovery rule:** After scanning all categories above, run a broad glob for `docs/**/*.md` and diff against the union of all category globs. Files in the diff are uncategorized — create a separate "Uncategorized / Other" section for them. NEVER silently omit files.

### .claude/docs/

- Glob for `.claude/docs/**/*.md` — count and categorize
- Glob for `.claude/skills/**/*.md` — count skills

## Phase 3: Build Doc Relationship Map

**Think:** Which docs serve as entry points (README → guide chains)? Which docs are referenced from multiple places? Which are isolated?

Trace key doc relationships by grepping for markdown links between docs:

- Entry points (README → getting-started → deployment chain)
- CLAUDE.md → reference doc pointers
- Which docs link to which (cross-references)

## Phase 4: Build Lookup Table

For each `docs/business-features/{App}/` directory:

- Extract the app name and key business domain keywords
- Map keywords → directory path for the lookup table

For each `docs/project-reference/*.md`:

- Extract the domain covered
- Map keywords → file path

## Phase 5: Fresh-Eyes Verification

**Spawn a fresh sub-agent (zero memory)** to independently verify:

1. Sample 5 file paths from each category — do they exist? (Glob check)
2. Does the total count for each category match a fresh glob of that pattern?
3. Are there any files in `docs/**/*.md` that appear in no category? (Run the diff)
4. Does the lookup table have entries for all documented categories?
5. Are there duplicate entries in the lookup table (same path, different keyword)?
6. Are uncategorized files documented in a separate section?

**Do NOT proceed to Phase 6 until fresh-eyes verification passes.**

## Phase 6: Generate Reference Doc

Write to `docs/project-reference/docs-index-reference.md` with sections:

```markdown
<!-- Last scanned: {YYYY-MM-DD} -->

# Documentation Index Reference

> Auto-generated by `/scan-docs-index`. Do not edit manually.

## Documentation System

{total} markdown files across {N} categories. Last scanned: {date}.

## Documentation Graph

{ASCII tree with counts — counts from verified globs only}

## Key Doc Relationships

{ASCII relationship diagram — entry points and cross-references}

## Doc Lookup Guide

{keyword → path table}

## Uncategorized Files

{Files found by broad glob not in any category — with paths}
```

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting
- **IMPORTANT MUST ATTENTION** detect doc organization type in Phase 0 — scan approach depends on it
- **IMPORTANT MUST ATTENTION** evidence gate for EVERY count — glob to verify, NEVER estimate or copy from existing content
- **IMPORTANT MUST ATTENTION** write findings incrementally after each category — NEVER batch at end
- **IMPORTANT MUST ATTENTION** run uncategorized file discovery — NEVER silently omit files that don't fit categories
- **IMPORTANT MUST ATTENTION** Phase 5 fresh-eyes verification is mandatory before writing final doc
      <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
      <!-- /SYNC:scan-and-update-reference-doc:reminder -->
      <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs in the skill output itself, 1 example per pattern, lead with answer.
      <!-- /SYNC:output-quality-principles:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** critical thinking — every claim needs traced proof, confidence >80% to act. Never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** AI mistake prevention — holistic-first, fix at responsible layer, surface ambiguity before coding, re-read after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**Anti-Rationalization:**

| Evasion                                             | Rebuttal                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| "Count looks right from existing doc, skip glob"    | EVERY count requires fresh glob verification — no exceptions       |
| "Only need to check 3 paths"                        | Phase 5 has 6 specific checks — sample across all categories       |
| "All files fit into existing categories"            | Run the uncategorized discovery diff — NEVER assume full coverage  |
| "Round 2 verification not needed for small doc set" | Fresh-eyes mandatory — main agent's counts carry confirmation bias |
| "Lookup table doesn't need all keywords"            | Map keywords for EVERY documented category, not just top-level     |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
