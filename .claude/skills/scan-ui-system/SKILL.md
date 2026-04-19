---
name: scan-ui-system
version: 1.0.0
description: '[Documentation] Orchestrate all UI system scans in parallel: design system + SCSS styling + frontend patterns. Single command to populate all UI-related project reference docs. Use for project onboarding, post-scaffold setup, or periodic refresh.'
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
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
