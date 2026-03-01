---
name: watzup
version: 1.1.0
description: '[Utilities] Review recent changes and wrap up the work'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Review current branch changes, summarize impact/quality, and check for documentation staleness.

**Workflow:**

1. **Review** — Analyze recent commits: what was modified, added, removed
2. **Summarize** — Provide detailed change summary with quality assessment
3. **Doc Check** — Cross-reference changed files against docs/ for staleness
4. **Lesson Learned** — Analyze AI mistakes/issues during the task and capture lessons

**Key Rules:**

- READ-ONLY: do not implement or fix anything, only flag
- Doc staleness check is REQUIRED (see mapping table below)
- Lesson-learned analysis is REQUIRED (see section below)
- Final review task MUST include doc-staleness check AND lesson-learned analysis

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Review my current branch and the most recent commits.
Provide a detailed summary of all changes, including what was modified, added, or removed.
Analyze the overall impact and quality of the changes.

**IMPORTANT**: **Do not** start implementing.

---

## Doc Staleness Check (REQUIRED)

After the change summary, run `git diff --name-only` (against base branch or recent commits) and cross-reference changed files against relevant documentation:

| Changed file pattern    | Docs to check for staleness                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `.claude/hooks/**`      | `.claude/docs/hooks/README.md`, hook count tables in `.claude/docs/hooks/*.md`          |
| `.claude/skills/**`     | `.claude/docs/skills/README.md`, skill count/catalog tables                             |
| `.claude/workflows/**`  | `CLAUDE.md` workflow catalog table, `.claude/docs/` workflow references                 |
| `src/Services/**`       | `docs/business-features/` doc for the affected service                                  |
| `src/{frontend-dir}/**` | `docs/project-reference/frontend-patterns-reference.md`, relevant business-feature docs |
| `CLAUDE.md`             | `.claude/docs/README.md` (navigation hub must stay in sync)                             |

**Output one of:**

- A bulleted list of docs that may need updating, with a brief note on what is likely stale (e.g., "hook count changed from 31 to 32").
- `No doc updates needed` — if no changed file pattern maps to a doc.

**Do not edit docs during watzup.** Only flag. The user decides whether to fix.

---

## AI Mistake & Lesson Learned Analysis (REQUIRED)

After the doc staleness check, review the entire session for AI mistakes and lessons learned:

1. **Analyze mistakes** — Did AI make any errors during this task? Examples:
    - Wrong assumptions about code behavior
    - Incorrect pattern usage (violated project conventions)
    - Missing edge cases or validation
    - Hallucinated APIs, methods, or file paths
    - Over-engineering or unnecessary complexity
    - Missed existing code that should have been reused
    - Wrong architectural layer placement

2. **Identify lessons** — For each mistake found, formulate a concise lesson:
    - What went wrong (specific, with file:line if applicable)
    - Why it happened (root cause)
    - How to prevent it next time (actionable rule)

3. **Ask user to persist** — If any lesson exists, ask the user:

    > "Found [N] lesson(s) learned during this task. Should I use `/learn` to remember them for future sessions?"

    Wait for user confirmation before invoking `/learn`.

**Output one of:**

- A numbered list of lessons with the `/learn` prompt above
- `No AI mistakes identified in this session` — if genuinely none found

**Be honest and self-critical.** The purpose is continuous improvement, not self-congratulation.

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/workflow-end (Recommended)"** — Complete and close the active workflow
- **"/commit"** — Commit changes if not using workflow
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
