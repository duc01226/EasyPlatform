---
name: watzup
version: 1.1.0
description: '[Utilities] Review recent changes and wrap up the work'
activation: user-invoked
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** `.claude/skills/shared/evidence-based-reasoning-protocol.md` before executing.

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

Review my current branch and the most recent commits.
Provide a detailed summary of all changes, including what was modified, added, or removed.
Analyze the overall impact and quality of the changes.

**IMPORTANT**: **Do not** start implementing.

---

## Doc Staleness Check (REQUIRED)

After the change summary, run `git diff --name-only` (against base branch or recent commits) and cross-reference changed files against relevant documentation:

| Changed file pattern    | Docs to check for staleness                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `.claude/hooks/**`      | `docs/claude/hooks/README.md`, `docs/claude/hooks-reference.md`, hook count tables in `docs/claude/hooks/*.md` |
| `.claude/skills/**`     | `docs/claude/skills/README.md`, skill count/catalog tables                                                     |
| `.claude/workflows/**`  | `CLAUDE.md` workflow catalog table, `docs/claude/` workflow references                                         |
| `src/Services/**`       | `docs/business-features/` doc for the affected service                                                         |
| `src/{frontend-dir}/**` | `docs/frontend-patterns-reference.md`, relevant business-feature docs                                          |
| `CLAUDE.md`             | `docs/claude/README.md` (navigation hub must stay in sync)                                                     |

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

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
- The final review task MUST include a doc-staleness check AND a lesson-learned analysis
