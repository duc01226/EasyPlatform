---
name: changelog
version: 1.1.0
description: '[Documentation] Use when you need to generate or update changelog entries.'
triggers:
    - changelog
    - update changelog
    - add changelog
    - log changes
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Produce a Keep-a-Changelog entry under `[Unreleased]` by systematically reviewing file changes — telling users, in business terms citing affected logical IDs and flagging breaking changes, what changed and why it matters, NEVER what files/classes were touched.

**Summary:**

- Translate every diff into business impact: name the user-facing capability, never the class/file/enum/migration (the "Business Focus" table is the lens — e.g. "Fixed pipeline loading error", not "Fixed null ref in GetById").
- Drive the review through a throwaway `.ai/workspace/changelog-notes-*.md` notes file (categorize Added/Changed/Fixed/Deprecated/Removed/Security), then DELETE it in the final cleanup step — a leftover notes file is an anti-pattern.
- Always write the entry under `[Unreleased]` (create the section if absent), grouped by module/feature rather than per-file, preserving existing entries.
- Cite affected logical IDs (`FR-`/`BR-`/`TC-`) in `**Refs**` and prefix any breaking change with `**BREAKING:**` plus a one-line migration/impact note; omit the Breaking block when there is none.

**Workflow:**

1. **Gather Changes** — Get changed files via `git diff` (PR, commit, or range mode)
2. **Create Temp Notes** — Build categorized review notes (Added/Changed/Fixed/etc.)
3. **Review Each File** — Read diffs, identify business impact, categorize changes
4. **Generate Entry** — Write Keep-a-Changelog formatted entry under `[Unreleased]`
5. **Cleanup** — Delete temp notes file

**Key Rules:**

- Use business-focused language, not technical jargon (e.g., "Added pipeline management" not "Added PipelineController.cs")
- Group related changes by module/feature, not by file
- Always insert under the `[Unreleased]` section; create it if missing
- **Cite logical IDs + flag breaking changes (M3/M1):** See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. Each entry cites the logical IDs it affects (`FR-`/`TC-`, plus `BR-` where relevant) and a business-level change description; keep implementation jargon and class/file names out of entry prose per `docs/project-reference/spec-principles.md` §3. Explicitly flag any breaking change with a `**BREAKING:**` prefix and a one-line migration/impact note.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Changelog Skill

Generate business-focused changelog entries by systematically reviewing file changes — name the user-facing capability, NEVER the class/file.

## Pre-Execution Checklist

1. **Find existing CHANGELOG.md location**
    - Check root: `./CHANGELOG.md` (preferred)
    - Fallback: `./docs/CHANGELOG.md`
    - Not found: create at root

2. **Read current changelog** — understand format + last entries

## Workflow

### Step 1: Gather Changes

Determine change scope by mode:

```bash
# PR/Branch-based (default)
git diff origin/develop...HEAD --name-only

# Commit-based
git show {commit} --name-only

# Range-based
git diff {from}..{to} --name-only
```

### Step 2: Create Temp Notes File

Create `.ai/workspace/changelog-notes-{YYMMDD-HHMM}.md`:

```markdown
# Changelog Review Notes - {date}

## Files Changed

- [ ] file1.ts -
- [ ] file2.cs -

## Categories

### Added (new features)

-

### Changed (modifications to existing)

-

### Fixed (bug fixes)

-

### Deprecated

-

### Removed

-

### Security

-

## Business Summary

<!-- What does this mean for users? -->
```

### Step 3: Systematic File Review

For each changed file:

1. Read file or diff
2. Identify **business impact** (not just technical change)
3. Check box, note in temp file
4. Categorize into appropriate section

**Business Focus Guidelines**:

| Technical (Avoid)                  | Business-Focused (Use)                       |
| ---------------------------------- | -------------------------------------------- |
| Added `StageCategory` enum         | Added stage categories for pipeline tracking |
| Created `PipelineController` class | Added API endpoints for pipeline management  |
| Fixed null reference in GetById    | Fixed pipeline loading error                 |
| Added migration file               | Database schema updated for new features     |

### Step 4: Holistic Review

Read temp notes file completely. Ask:

- Main feature/fix?
- Who benefits, how?
- What can users now do they couldn't before?

### Step 5: Generate Changelog Entry

Format (Keep a Changelog):

```markdown
## [Unreleased]

### {Module}: {Feature Title}

**Feature/Fix**: {One-line business description}
**Refs**: {FR-/BR-/TC- logical IDs affected}

#### Added

- {Business-focused item}

#### Changed

- {What behavior changed}

#### Fixed

- {What issue was resolved}

#### Breaking

- **BREAKING:** {what changed} — {migration/impact note}
```

> If no breaking change: omit the `#### Breaking` block. Cite logical IDs in `**Refs**`; keep class/file names out of all entry prose.

### Step 6: Update Changelog

1. Read existing CHANGELOG.md
2. Insert new entry under `[Unreleased]` section
3. No `[Unreleased]` section → create it after header
4. Preserve existing entries

### Step 7: Cleanup

Delete temp notes file: `.ai/workspace/changelog-notes-*.md`

## Grouping Strategy

Group related changes by module/feature:

```markdown
### Your Service: Order Pipeline Management

**Feature**: Customizable order pipeline/stage management.

#### Added

**Backend**:

- Entities: Pipeline, Stage, PipelineStage
- Controllers: PipelineController, StageController
- Commands: SavePipelineCommand, DeletePipelineCommand

**Frontend**:

- Pages: order-pipeline-page
- Components: pipeline-filter, pipeline-stage-display
```

## Anti-Patterns

1. ❌ Creating new changelog in docs/ when root exists
2. ❌ Skipping file review (leads to missed changes)
3. ❌ Technical jargon without business context
4. ❌ Forgetting to delete temp notes file
5. ❌ Not using [Unreleased] section
6. ❌ Listing every file instead of grouping by feature

## Examples

### Good Entry

```markdown
### Your Service: Order Pipeline Management

**Feature**: Customizable order pipeline/stage management for fulfillment workflows.

#### Added

- Drag-and-drop pipeline stage builder with default templates
- Stage categories (Created, Confirmed, Packed, Shipped, Delivered, Cancelled)
- Pipeline duplication for quick setup
- Multi-language stage names (EN/VI)

#### Changed

- Order cards now show current pipeline stage
- Order creation wizard includes pipeline selection
```

### Bad Entry (Too Technical)

```markdown
### Pipeline Changes

#### Added

- Pipeline.cs entity
- StageCategory enum
- PipelineController
- SavePipelineCommand
- 20251216000000_MigrateDefaultStages migration
```

## Reference

See `references/keep-a-changelog-format.md` for format specification.

## Related

- `documentation`
- `release-notes`
- `commit`

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-feature` workflow** (Recommended) — scout → investigate → plan → feature-implement → review → changelog
> 2. **Execute `/changelog` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/test (Recommended)"** — Run tests after changelog update
- **"/docs-update"** — Update docs if needed
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `/project-init`.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Produce a Keep-a-Changelog entry under `[Unreleased]` that tells users — in business terms, citing affected logical IDs and flagging breaking changes — what changed and why it matters, NEVER what files/classes were touched.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act.
- **Project Reference Docs:** Read required project-reference docs (always `lessons.md`) before target work.

**IMPORTANT MUST ATTENTION** use business-focused language, group by module/feature — name the user-facing capability, NEVER the class/file/enum/migration — why: changelog readers track impact, not implementation (see Business Focus table).
**IMPORTANT MUST ATTENTION** cite `FR-`/`BR-`/`TC-` logical IDs in `**Refs**`; prefix every breaking change with `**BREAKING:**` + one-line migration/impact note; omit the Breaking block when none — why: readers need traceability and a migration signal, not noise.
**IMPORTANT MUST ATTENTION** always insert under `[Unreleased]` (create it if absent), preserve existing entries; DELETE the temp `.ai/workspace/changelog-notes-*.md` notes file in cleanup — why: a leftover notes file is an anti-pattern and entries belong only under Unreleased.

**IMPORTANT MUST ATTENTION** drive the review through the throwaway notes file: review EVERY changed file, categorize Added/Changed/Fixed/Deprecated/Removed/Security — why: skipping file review silently drops changes.
**IMPORTANT MUST ATTENTION** verify each business-impact claim against the actual diff (`file:line`), confidence >80% to act, <80% re-read the diff first — NEVER speculate impact from a filename — why: a misread diff ships a wrong user-facing claim.
**IMPORTANT MUST ATTENTION** find the existing `CHANGELOG.md` before writing — root `./CHANGELOG.md` preferred, fallback `./docs/CHANGELOG.md` — NEVER create a new changelog in `docs/` when root exists — why: a split changelog fragments release history.
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` todos BEFORE starting (one per file read), keep one `in_progress`, mark `completed` immediately, add a final review todo — why: long diffs exhaust context and lose findings.
**IMPORTANT MUST ATTENTION** validate route/skip decisions with the user via `AskUserQuestion` — never auto-decide a workflow is "too simple to need".

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| "Diff is small, skip the notes file"      | Still categorize each file — uncategorized changes get silently dropped.               |
| "Filename says it all, skip the diff"     | Read the diff: a filename names the file, not the business impact. Show `file:line`.   |
| "Just list the files changed"             | Group by module/feature in business terms — file lists are the bad-entry anti-pattern. |
| "No existing CHANGELOG, make one in docs" | Search root first; only create at root when truly absent.                              |
| "Notes file is harmless, leave it"        | Delete it in cleanup — a leftover notes file is an anti-pattern.                       |

**IMPORTANT MUST ATTENTION Goal echo:** business-language Keep-a-Changelog entry under `[Unreleased]`, logical IDs cited, breaking changes flagged, NEVER file/class names — temp notes file deleted.
**IMPORTANT MUST ATTENTION** group by feature in business terms, cite logical IDs, flag `**BREAKING:**` — why: impact over implementation.
**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` todos before starting and delete the temp notes file in cleanup.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
