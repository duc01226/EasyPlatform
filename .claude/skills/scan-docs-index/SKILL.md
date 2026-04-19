---
name: scan-docs-index
version: 1.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/docs-index-reference.md with documentation tree, file counts, category breakdown, doc relationships, and lookup table.'
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
