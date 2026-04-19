---
name: status
version: 1.0.0
description: "[Project Management] Generate status reports for sprints or projects. Use when creating status reports, checking progress, or summarizing sprint metrics. Triggers on keywords like "status report", "sprint status", "progress", "how are we doing", "what's done", "project status"."
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**Goal:** Generate a project status report covering progress, blockers, and next steps.

**Workflow:**

1. **Gather** -- Collect data from git, tasks, plans, and recent activity
2. **Analyze** -- Assess progress against goals, identify blockers
3. **Report** -- Write structured status report with metrics

**Key Rules:**

- Include: completed items, in-progress work, blockers, next steps
- Quantify where possible (files changed, tests passing, coverage)
- Save report to plans/reports/ with standard naming

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Status Report

Generate project/sprint status reports with metrics.

## When to Use

- Sprint status needed
- Project progress report
- Stakeholder update

## Quick Reference

### Workflow

1. Read PBIs in scope
2. Check git log for recent commits
3. Find open issues/PRs
4. Calculate metrics
5. Generate report
6. Save to `plans/reports/`

### Metrics

- Completed vs Planned
- Velocity (if sprint)
- Bug count
- Blocker count

### Report Structure

```markdown
## Status Report - {Date}

### Sprint: {Name} | Day {N}/{Total}

#### Progress

| Metric | Planned | Actual | Status |
| ------ | ------- | ------ | ------ |

#### Completed

| Item | Owner |

#### In Progress

| Item | Status | Blocker |

#### Blockers

| Blocker | Impact | Action |

#### Risks

| Risk | Probability | Impact |
```

### Output

- **Path:** `plans/reports/{YYMMDD}-status-{scope}.md`

### Related

- **Role Skill:** `project-manager`
- **Command:** `/status`

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `pm-reporting` workflow** (Recommended) — status → dependency
> 2. **Execute `/status` directly** — run this skill standalone

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
