---
name: scan-docs-index
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/docs-index-reference.md with documentation tree, file counts, category breakdown, doc relationships, and lookup table.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

**Goal:** Scan the project's `docs/` directory and populate `docs/project-reference/docs-index-reference.md` with accurate documentation tree, file counts by category, doc relationships, and a keyword-to-doc lookup table.

**Workflow:**

1. **Read** — Load current target doc, detect init vs sync mode
2. **Scan** — Count docs by category, discover doc tree structure, trace relationships
3. **Generate** — Build/update the reference doc with verified counts and paths
4. **Verify** — Spot-check file counts against actual directory contents

**Key Rules:**

- Generic — discover everything dynamically, never hardcode project-specific values
- Use `docs/project-config.json` for hints if available, fall back to filesystem scanning
- All file counts must be verified via glob, not copied from existing content

# Scan Docs Index

## Phase 0: Read & Assess

1. Read `docs/project-reference/docs-index-reference.md`
2. Detect mode: **init** (placeholder only) or **sync** (has real content)
3. If sync: note which sections exist and current file counts

## Phase 1: Scan Documentation Tree

### Root-Level Docs

- Glob for `*.md` in project root (README.md, CLAUDE.md, CHANGELOG.md, etc.)
- Count and list each with one-line purpose description

### docs/ Directory

Scan each subdirectory:

| Category                | Glob Pattern                                          | What to Extract                |
| ----------------------- | ----------------------------------------------------- | ------------------------------ |
| project-reference/      | `docs/project-reference/**/*.md`                      | File count, list with purposes |
| business-features/      | `docs/business-features/**/*.md`                      | Count per app, feature count   |
| operations              | `docs/getting-started.md`, `docs/deployment.md`, etc. | File count, list               |
| design-system/          | `docs/design-system/**/*.md`                          | File count, app mapping        |
| test-specs/             | `docs/test-specs/**/*.md`                             | File count, module coverage    |
| architecture-decisions/ | `docs/architecture-decisions/**/*.md`                 | ADR count                      |
| templates/              | `docs/templates/**/*.md`                              | Template count and types       |
| release-notes/          | `docs/release-notes/**/*.md`                          | File count                     |

### .claude/docs/

- Glob for `.claude/docs/**/*.md` — count and categorize

## Phase 2: Build Doc Relationship Map

Trace key doc relationships by grepping for markdown links between docs:

- Which docs link to which (cross-references)
- Entry points (README → getting-started → deployment chain)
- CLAUDE.md → reference doc pointers

## Phase 3: Build Lookup Table

For each `docs/business-features/{App}/` directory:

- Extract the app name and key business domain keywords
- Map keywords → directory path for the lookup table

For each `docs/project-reference/*.md`:

- Extract the domain covered
- Map keywords → file path

## Phase 4: Generate Reference Doc

Write to `docs/project-reference/docs-index-reference.md` with sections:

1. **Documentation System** — Total count, last scan date
2. **Documentation Graph** — ASCII tree with file counts per category
3. **Key Doc Relationships** — ASCII diagram of cross-references
4. **Doc Lookup Guide** — Keyword-to-path table

## Phase 5: Verify

Spot-check 3 file counts:

- `docs/business-features/**/*.md` count matches tree
- `docs/project-reference/*.md` count matches tree
- Root `*.md` count matches tree

## Output Format

```markdown
<!-- Last scanned: {YYYY-MM-DD} -->

# Documentation Index Reference

> Auto-generated by `/scan-docs-index`. Do not edit manually.

## Documentation System

{total} markdown files across {N} categories. Last scanned: {date}.

## Documentation Graph

{ASCII tree with counts}

## Key Doc Relationships

{ASCII relationship diagram}

## Doc Lookup Guide

{keyword → path table}
```

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
    <!-- SYNC:scan-and-update-reference-doc:reminder -->
- **MUST** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.
    <!-- /SYNC:scan-and-update-reference-doc:reminder -->
    <!-- SYNC:output-quality-principles:reminder -->
- **MUST** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
    <!-- /SYNC:output-quality-principles:reminder -->
