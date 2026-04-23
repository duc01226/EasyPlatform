---
name: changelog
version: 1.1.0
description: '[Documentation] Generate or update changelog entries. Use for release changelogs, version history, and change tracking across any project.'
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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

**Goal:** Generate business-focused changelog entries by systematically reviewing file changes.

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

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Changelog Skill

Generate business-focused changelog entries by systematically reviewing file changes.

## Pre-Execution Checklist

1. **Find existing CHANGELOG.md location**
    - Check root: `./CHANGELOG.md` (preferred)
    - Fallback: `./docs/CHANGELOG.md`
    - If not found: Create at root

2. **Read current changelog** to understand format and last entries

## Workflow

### Step 1: Gather Changes

Determine change scope based on mode:

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
3. Check box and note in temp file
4. Categorize into appropriate section

**Business Focus Guidelines**:

| Technical (Avoid)               | Business-Focused (Use)                       |
| ------------------------------- | -------------------------------------------- |
| Added `StageCategory` enum      | Added stage categories for pipeline tracking |
| Created `PipelineController.cs` | Added API endpoints for pipeline management  |
| Fixed null reference in GetById | Fixed pipeline loading error                 |
| Added migration file            | Database schema updated for new features     |

### Step 4: Holistic Review

Read temp notes file completely. Ask:

- What's the main feature/fix?
- Who benefits and how?
- What can users now do that they couldn't before?

### Step 5: Generate Changelog Entry

Format (Keep a Changelog):

```markdown
## [Unreleased]

### {Module}: {Feature Title}

**Feature/Fix**: {One-line business description}

#### Added

- {Business-focused item}

#### Changed

- {What behavior changed}

#### Fixed

- {What issue was resolved}
```

### Step 6: Update Changelog

1. Read existing CHANGELOG.md
2. Insert new entry under `[Unreleased]` section
3. If no `[Unreleased]` section, create it after header
4. Preserve existing entries

### Step 7: Cleanup

Delete temp notes file: `.ai/workspace/changelog-notes-*.md`

## Grouping Strategy

Group related changes by module/feature:

```markdown
### Your Service: Hiring Process Management

**Feature**: Customizable hiring process/pipeline management.

#### Added

**Backend**:

- Entities: Pipeline, Stage, PipelineStage
- Controllers: PipelineController, StageController
- Commands: SavePipelineCommand, DeletePipelineCommand

**Frontend**:

- Pages: hiring-process-page
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
### Your Service: Hiring Process Management

**Feature**: Customizable hiring process/pipeline management for recruitment workflows.

#### Added

- Drag-and-drop pipeline stage builder with default templates
- Stage categories (Sourced, Applied, Interviewing, Offered, Hired, Rejected)
- Pipeline duplication for quick setup
- Multi-language stage names (EN/VI)

#### Changed

- Candidate cards now show current pipeline stage
- Job creation wizard includes pipeline selection
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
> 1. **Activate `feature` workflow** (Recommended) — scout → investigate → plan → cook → review → changelog
> 2. **Execute `/changelog` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/test (Recommended)"** — Run tests after changelog update
- **"/docs-update"** — Update docs if needed
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

  <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
