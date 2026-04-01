---
name: lint
version: 1.0.0
description: '[Code Quality] Run linters and fix issues for backend or frontend'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

**Prerequisites:** **MUST READ** before executing:

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

## Quick Summary

**Goal:** Run linters (.NET analyzers and/or ESLint/Prettier) and report or auto-fix code quality issues.

**Workflow:**

1. **Parse** — Determine scope from arguments: backend, frontend, or both; fix mode or report-only
2. **Execute** — Run `dotnet build` for .NET analyzers or `nx lint` / `prettier` for Angular
3. **Report** — Group issues by severity (error/warning/info) with file paths and line numbers

**Key Rules:**

- No argument = run both backend + frontend in report-only mode
- `fix` argument = apply safe auto-fixes, report remaining manual items
- Always show file paths and line numbers in output

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Run linting: $ARGUMENTS

## Instructions

1. **Parse arguments**:
    - `backend` or `be` → Run .NET analyzers
    - `frontend` or `fe` → Run ESLint/Prettier
    - `fix` → Auto-fix issues where possible
    - No argument → Run both, report only

2. **For Backend (.NET)**:

    ```bash
    dotnet build {SolutionName}.sln /p:TreatWarningsAsErrors=false
    ```

    - Check for analyzer warnings (CA*, IDE*, etc.)
    - Report code style violations

3. **For Frontend (Angular/Nx)**:

    ```bash
    cd src/{ExampleAppWeb}
    nx lint playground-text-snippet
    nx lint {lib-name}
    ```

    With auto-fix:

    ```bash
    nx lint playground-text-snippet --fix
    npx prettier --write "apps/**/*.{ts,html,scss}" "libs/**/*.{ts,html,scss}"
    ```

4. **Report format**:
    - Group issues by severity (error, warning, info)
    - Show file paths and line numbers
    - Suggest fixes for common issues

5. **Auto-fix behavior**:
    - If `fix` argument provided, apply safe auto-fixes
    - Report what was fixed vs what needs manual attention

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST** READ the following files before starting:
- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
