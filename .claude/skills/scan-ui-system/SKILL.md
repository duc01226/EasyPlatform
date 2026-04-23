---
name: scan-ui-system
version: 2.0.0
last_reviewed: 2026-04-22
description: '[Documentation] Orchestrate all UI system scans in parallel: design system + SCSS styling + frontend patterns. Single command to populate all UI-related project reference docs. Use for project onboarding, post-scaffold setup, or periodic refresh.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> - **Verify sub-skill results after completion.** Sub-skills may complete with partial output. Grep-verify each output doc has real content before declaring success.
> - **Do NOT skip a sub-skill because the others found nothing.** Each scan is independent — one empty result does not imply others will be empty.
> - **Surface ambiguity before coding.** NEVER pick silently.
> - **Check downstream references before deleting.** Map referencing files before removal.

<!-- /SYNC:ai-mistake-prevention -->

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

**Goal:** Run all 3 UI scan skills in parallel → produce a consolidated summary of what was found and what's still missing. Single command for full UI system documentation refresh.

**Workflow:**

1. **Pre-Flight** — Verify frontend code exists; assess which docs need refresh
2. **Launch** — 3 sub-skills run simultaneously
3. **Verify** — Confirm each output doc has real content (not placeholder)
4. **Summarize** — Report findings and remaining gaps

**Key Rules:**

- Skip entirely if project has no frontend code
- All 3 scans run in PARALLEL for speed
- Does NOT modify application code — only populates `docs/project-reference/`
- **MUST ATTENTION** verify each sub-skill output doc after completion — never trust "it ran" without checking

---

# Scan UI System

## Phase 0: Pre-Flight Check

**[BLOCKING]** Before launching sub-skills, determine:

1. Detect frontend code presence:

| Signal                                                                         | Action                                                           |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `angular.json`, `package.json` with frontend framework, `src/Web*` directories | Proceed with all 3 scans                                         |
| No frontend code detected                                                      | **STOP** — report "Backend-only project; scan-ui-system skipped" |

2. Assess each reference doc freshness:

| Reference Doc                                           | Glob to Check                   | Stale If                       |
| ------------------------------------------------------- | ------------------------------- | ------------------------------ |
| `docs/project-reference/design-system/README.md`        | Check last-scanned date in file | >30 days old OR is placeholder |
| `docs/project-reference/scss-styling-guide.md`          | Check last-scanned date in file | >30 days old OR is placeholder |
| `docs/project-reference/frontend-patterns-reference.md` | Check last-scanned date in file | >30 days old OR is placeholder |

3. Determine which scans to run:

| Condition                                     | Decision                                           |
| --------------------------------------------- | -------------------------------------------------- |
| All 3 docs fresh (≤30 days, has real content) | Ask user: "All UI docs are recent. Force refresh?" |
| 1-2 docs stale/missing                        | Run only the stale/missing scans                   |
| All 3 stale/missing                           | Run all 3 in parallel                              |
| User explicitly ran `/scan-ui-system`         | Run all 3 regardless of freshness                  |

4. Read `docs/project-config.json` for `designSystem` section if available — pass config-driven paths to sub-skills.

**Evidence gate:** Confidence <60% on frontend code existence → ask user before proceeding.

## Phase 1: Plan

Create `TaskCreate` entries for each sub-skill that will run + one verification task per sub-skill + one summary task. **Do not start Phase 2 without tasks created.**

## Phase 2: Launch Parallel Scans

Run the applicable sub-skills simultaneously. Each sub-skill is FULLY self-contained — do NOT pass context between them.

### Scan 1: Design System

Activate `/scan-design-system` → populates `docs/project-reference/design-system/README.md`

Passes: detected `project-config.json` `designSystem` config to sub-skill if available.

### Scan 2: SCSS/Styling

Activate `/scan-scss-styling` → populates `docs/project-reference/scss-styling-guide.md`

### Scan 3: Frontend Patterns

Activate `/scan-frontend-patterns` → populates `docs/project-reference/frontend-patterns-reference.md`

## Phase 3: Verify Sub-Skill Outputs

**Do NOT proceed to Phase 4 until all 3 are verified.**

For each output doc:

1. Check file exists and has content beyond placeholder headings (Glob + Read first 20 lines)
2. Verify `<!-- Last scanned: -->` header was updated to today's date
3. If a sub-skill output is placeholder-only or missing: flag it as FAILED and re-run that sub-skill once

**If re-run also produces placeholder:** escalate to user — "scan-{name} produced no output. Please run it manually and check for errors."

## Phase 4: Summarize

After all 3 verified, produce a concise summary:

```
UI System Scan Complete ({date}):

Design System    → docs/project-reference/design-system/README.md
  Tokens:        {approach: token-first | figma-driven | ad-hoc}
  Components:    {library | none detected}
  Gaps:          {list or "none identified"}

SCSS Styling     → docs/project-reference/scss-styling-guide.md
  Approach:      {SCSS | Tailwind | CSS-in-JS | CSS Modules | hybrid}
  BEM:           {active | partial | none}
  Gaps:          {list or "none identified"}

Frontend Patterns → docs/project-reference/frontend-patterns-reference.md
  Framework:     {Angular | React | Vue | Svelte | multi-framework}
  State:         {store type detected}
  Gaps:          {list or "none identified"}
```

Replace `{placeholders}` with actual findings from verified output docs — NEVER fabricate.

---

## When to Use

- After `/scaffold` in greenfield-init workflow (design system just created)
- First time using Claude Code on an existing project (onboarding)
- Periodic refresh when UI system has changed significantly
- Manual: user runs `/scan-ui-system`
- Auto-triggered by `project-config` skill Phase 5 scan task creation

## When to Skip

- Backend-only project (no frontend code directories)
- All 3 reference docs are current and recent (≤30 days) — ask user to confirm

## Auto-Trigger Integration

This skill replaces 3 separate scan entries in the `project-config` scan table:

| Reference Docs                                                                         | Scan Skill        |
| -------------------------------------------------------------------------------------- | ----------------- |
| `design-system/README.md` + `scss-styling-guide.md` + `frontend-patterns-reference.md` | `/scan-ui-system` |

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting — one per sub-skill, one per verification, one for summary
- **IMPORTANT MUST ATTENTION** run pre-flight check in Phase 0 — never launch scans on backend-only projects
- **IMPORTANT MUST ATTENTION** verify each sub-skill output doc has real content — "it ran" ≠ "it produced output"
- **IMPORTANT MUST ATTENTION** summary must come from actual verified doc content — NEVER fabricate token counts or component names
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** critical thinking — every claim needs traced proof, confidence >80% to act. Never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** AI mistake prevention — holistic-first, fix at responsible layer, surface ambiguity before coding, re-read after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**Anti-Rationalization:**

| Evasion                                        | Rebuttal                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| "Frontend code obvious, skip pre-flight check" | Phase 0 is BLOCKING — backend-only project wastes 3 sub-skill invocations      |
| "All docs are probably still fresh"            | Check last-scanned date with actual file read — never assume freshness         |
| "Sub-skills ran, so output must be there"      | Verify output doc content after each sub-skill — placeholder ≠ populated       |
| "Summary from memory is fine"                  | Summary must come from verified output docs — never fabricate findings         |
| "Only re-run needed sub-skills"                | If user ran `/scan-ui-system` explicitly, run all 3 — override freshness check |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
