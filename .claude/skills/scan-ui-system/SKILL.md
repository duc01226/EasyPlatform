---
name: scan-ui-system
version: 1.0.0
description: '[Documentation] Orchestrate all UI system scans in parallel: design system + SCSS styling + frontend patterns. Single command to populate all UI-related project reference docs. Use for project onboarding, post-scaffold setup, or periodic refresh.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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

**Goal:** Run all 3 UI scan skills in parallel and produce a summary.

**Workflow:**

1. **Check Prerequisites** — Verify project has frontend code (not backend-only)
2. **Launch Parallel Scans** — 3 skills simultaneously
3. **Collect Results** — Read scan output from reference docs
4. **Summarize** — Report what was found

**Key Rules:**

- Skip entirely if project has no frontend code
- All 3 scans run in PARALLEL for speed
- Does NOT modify code — only populates docs/project-reference/

## When to Use

- After `/scaffold` in greenfield-init workflow (design system just created)
- First time using easy-claude on an existing project (project onboarding)
- Periodic refresh when design system has changed significantly
- User runs `/scan-ui-system` manually
- Auto-triggered by `project-config` skill Phase 5 (scan task creation)

## When to Skip

- Backend-only project (no frontend code directories)
- All 3 reference docs are already populated and recent

## Auto-Trigger Integration

Follow existing pattern from `project-config/SKILL.md` Phase 5 scan table. The `project-config` skill creates TaskCreate items for all `/scan-*` skills. This skill replaces 3 separate scan entries with 1 orchestrator:

| Reference Docs                                                                         | Scan Skill        |
| -------------------------------------------------------------------------------------- | ----------------- |
| `design-system/README.md` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `/scan-ui-system` |

## Execution

Launch 3 skills in parallel:

### Scan 1: Design System

Activate `/scan-design-system` → populates `docs/project-reference/design-system/README.md`

### Scan 2: SCSS/Styling

Activate `/scan-scss-styling` → populates `docs/project-reference/scss-styling-guide.md`

### Scan 3: Frontend Patterns

Activate `/scan-frontend-patterns` → populates `docs/project-reference/frontend-patterns-reference.md`

## Summary Output

After all 3 scans complete, report:

"UI System Scan Complete:

- Design System: {X} tokens, {Y} components found → docs/project-reference/design-system/README.md (content auto-injected by hook — check for [Injected: ...] header before reading)
- Styling: {approach} detected, {Z} variables/mixins → docs/project-reference/scss-styling-guide.md
- Frontend Patterns: {framework} detected, {N} base classes → docs/project-reference/frontend-patterns-reference.md"

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
