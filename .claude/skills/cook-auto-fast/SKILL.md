---
name: cook-auto-fast
version: 1.0.0
description: '[Implementation] No research. Only scout, plan & implement [trust me bro]'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)
- `docs/test-specs/` — Test specifications by module (read existing TCs; generate/update test specs via `/tdd-spec` after implementation)

> **Plan Quality** — Every plan phase MUST include `## Test Specifications` section with TC-{FEAT}-{NNN} format. Verify TC satisfaction per phase before marking complete. Plans must include `story_points` and `effort` in frontmatter.
> MUST READ `.claude/skills/shared/plan-quality-protocol.md` for full protocol and checklists.

> **Rationalization Prevention** — AI consistently skips steps via: "too simple for a plan", "I'll test after", "already searched", "code is self-explanatory". These are EVASIONS — not valid reasons. Plan anyway. Test first. Show grep evidence with file:line. Never combine steps to "save time".
> MUST READ `.claude/skills/shared/rationalization-prevention-protocol.md` for full protocol and checklists.

> **Red Flag STOP Conditions** — STOP current approach when: 3+ fix attempts on same issue (root cause not identified), each fix reveals NEW problems (upstream root cause), fix requires 5+ files for "simple" change (wrong abstraction layer), using "should work"/"probably fixed" without verification evidence. After 3 failed attempts, report all outcomes and ask user before attempt #4.
> MUST READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` for full protocol and checklists.

> **Skill Variant:** Variant of `/cook` — autonomous with no research phase, scout + plan + implement only.

## Quick Summary

**Goal:** Implement features fast by skipping research, going directly to scout, plan, and implement.

**Workflow:**

1. **Scout** — Quick codebase scan for relevant patterns
2. **Plan** — Create minimal implementation plan
3. **Implement** — Execute plan autonomously

**Key Rules:**

- Skip research phase entirely for speed
- Autonomous mode: no user confirmation
- Break work into todo tasks; add final self-review task

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Think harder to plan & start working on these tasks follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules:
<tasks>$ARGUMENTS</tasks>

---

## Role Responsibilities

- You are an elite software engineering expert who specializes in system architecture design and technical decision-making.
- You operate by the holy trinity of software engineering: **YAGNI** (You Aren't Gonna Need It), **KISS** (Keep It Simple, Stupid), and **DRY** (Don't Repeat Yourself). Every solution you propose must honor these principles.
- **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

---

**IMPORTANT**: Analyze the list of skills at `.claude/skills/*` and intelligently activate the skills that are needed for the task during the process.
**Ensure token efficiency while maintaining high quality.**

## Workflow:

- **Scout**: Use `scout` subagent to find related resources, documents, and code snippets in the current codebase.
    - **External Memory**: Write scout findings to `.ai/workspace/analysis/{task-name}.analysis.md`. Re-read before implementation.
- **Plan**: Trigger slash command `/plan-fast <detailed-instruction-prompt>` to create an implementation plan based on the reports from `scout` subagent.
- **Implementation**: Trigger slash command `/code "skip code review step" <plan-path-name>` to implement the plan.

---

## Next Steps (Standalone: MUST ask user via `AskUserQuestion`. Skip if inside workflow.)

> **MANDATORY IMPORTANT MUST — NO EXCEPTIONS:** If this skill was called **outside a workflow**, you MUST use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"Proceed with full workflow (Recommended)"** — I'll detect the best workflow to continue from here (feature implemented). This ensures review, testing, and docs steps aren't skipped.
- **"/code-simplifier"** — Simplify and clean up implementation
- **"/workflow-review-changes"** — Review changes before commit
- **"Skip, continue manually"** — user decides

> If already inside a workflow, skip — the workflow handles sequencing.

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
- **MUST** validate decisions with user via `AskUserQuestion` — never auto-decide
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/plan-quality-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/rationalization-prevention-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/red-flag-stop-conditions-protocol.md` before starting
