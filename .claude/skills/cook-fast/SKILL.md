---
name: cook-fast
version: 1.0.0
description: '[Implementation] Fast implementation - skip research, minimal planning'
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

> **Skill Variant:** Variant of `/cook` — fast implementation skipping research with minimal planning.

## Quick Summary

**Goal:** Implement features quickly with minimal research and streamlined planning.

**Workflow:**

1. **Scout** — Quick codebase scan for patterns
2. **Plan** — Lightweight implementation plan
3. **Implement** — Execute with code-simplifier review

**Key Rules:**

- Skip deep research; rely on codebase patterns
- Still requires user approval before implementing
- Break work into todo tasks; add final self-review task

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

> **UI System Context** — For frontend/UI/styling tasks, MUST READ these BEFORE implementing: `frontend-patterns-reference.md` (component base classes, stores, forms), `scss-styling-guide.md` (BEM methodology, SCSS vars, responsive), `design-system/README.md` (design tokens, component inventory, icons).
> MUST READ `.claude/skills/shared/ui-system-context.md` for full protocol and checklists.

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Start working on these tasks immediately with minimal planning:
<tasks>$ARGUMENTS</tasks>

**Mode:** FAST - Skip research, minimal planning, trust your knowledge.

## Workflow

1. **Quick Planning** (skip research phase)
    - Analyze task requirements directly
    - Create minimal todo list with `TaskCreate`
    - NO researcher subagents, NO scout commands
    - For non-trivial tasks: write brief analysis to `.ai/workspace/analysis/{task-name}.analysis.md` before implementing.

> **Graph-Assisted Investigation** — When `.code-graph/graph.db` exists, MUST run at least ONE graph command on key files before concluding. Pattern: Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details. Use `connections` for 1-hop, `callers_of`/`tests_for` for specific queries, `batch-query` for multiple files.
> MUST READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` for full protocol and checklists.
> After implementing, run `python .claude/scripts/code_graph connections <file> --json` on modified files to verify no related files need updates.

### Graph-Trace Quick Check

When graph DB is available, run a quick downstream trace before implementing:

- `python .claude/scripts/code_graph trace <file-to-modify> --direction downstream --json` — fast check for downstream impact

2. **Rapid Implementation**
    - Use `/code` directly on tasks
    - Skip multi-step planning documents
    - Focus on working code over documentation

3. **Quick Validation**
    - Run type-check and compile
    - Manual spot-check over full test suite
    - Skip code-reviewer subagent

4. **Commit** (optional)
    - Ask user if ready to commit via `AskUserQuestion`
    - If yes, use `/commit`

## When to Use

- Simple features with clear requirements
- Bug fixes with known solutions
- Refactoring tasks
- When user says "just do it"

## Trade-offs

| Aspect   | Fast Mode   | Full Mode       |
| -------- | ----------- | --------------- |
| Research | Skipped     | Multiple agents |
| Planning | Minimal     | Full plan docs  |
| Testing  | Quick check | Full test suite |
| Review   | Skipped     | Code-reviewer   |
| Speed    | ~2x faster  | Thorough        |

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
- **MUST** READ `.claude/skills/shared/ui-system-context.md` before starting
- **MUST** READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` before starting
