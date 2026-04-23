---
name: worktree
version: 1.0.0
description: '[Git] Create isolated git worktree for parallel development'
disable-model-invocation: false
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

**Goal:** Create isolated git worktrees for parallel feature development with automatic branch naming and env file setup.

**Workflow:**

1. **Get Repo Info** — Run `worktree.cjs info` to detect repo type, base branch, env files
2. **Detect Prefix** — Infer branch prefix from keywords (fix, feat, refactor, docs, etc.)
3. **Convert Slug** — Transform description to kebab-case slug (max 50 chars)
4. **Execute** — Run `worktree.cjs create` with project, slug, prefix, and env files

**Key Rules:**

- For monorepos, ask user which project if not specified
- Always ask which env files to copy via AskUserQuestion
- Handle error codes (BRANCH_CHECKED_OUT, WORKTREE_EXISTS, etc.) gracefully

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Create an isolated git worktree for parallel feature development.

## Workflow

### Step 1: Get Repository Info

```bash
node .claude/scripts/worktree.cjs info --json
```

**Response fields:**

- `repoType`: "monorepo" or "standalone"
- `baseBranch`: detected base branch
- `projects`: array of {name, path} for monorepo
- `envFiles`: array of .env\* files found
- `dirtyState`: boolean

### Step 2: Gather Info via AskUserQuestion

**Detect branch prefix from user's description:**

- Keywords "fix", "bug", "error", "issue" → prefix = `fix`
- Keywords "refactor", "restructure", "rewrite" → prefix = `refactor`
- Keywords "docs", "documentation", "readme" → prefix = `docs`
- Keywords "test", "spec", "coverage" → prefix = `test`
- Keywords "chore", "cleanup", "deps" → prefix = `chore`
- Keywords "perf", "performance", "optimize" → prefix = `perf`
- Everything else → prefix = `feat`

**For MONOREPO:** Use AskUserQuestion if project not specified:

```javascript
// If user said "/worktree add auth" but multiple projects exist
AskUserQuestion({
    questions: [
        {
            header: 'Project',
            question: 'Which project should the worktree be created for?',
            options: projects.map(p => ({ label: p.name, description: p.path })),
            multiSelect: false
        }
    ]
});
```

**For env files:** Always ask which to copy:

```javascript
AskUserQuestion({
    questions: [
        {
            header: 'Env files',
            question: 'Which environment files should be copied to the worktree?',
            options: envFiles.map(f => ({ label: f, description: 'Copy to worktree' })),
            multiSelect: true
        }
    ]
});
```

### Step 3: Convert Description to Slug

- "add authentication system" → `add-auth`
- "fix login bug" → `login-bug`
- Remove filler words, kebab-case, max 50 chars

### Step 4: Execute Command

**Monorepo:**

```bash
node .claude/scripts/worktree.cjs create "<PROJECT>" "<SLUG>" --prefix <TYPE> --env "<FILES>"
```

**Standalone:**

```bash
node .claude/scripts/worktree.cjs create "<SLUG>" --prefix <TYPE> --env "<FILES>"
```

**Options:**

- `--prefix` - Branch type: feat|fix|refactor|docs|test|chore|perf
- `--env` - Comma-separated .env files to copy
- `--json` - Output JSON for parsing
- `--dry-run` - Preview without executing

## Commands

| Command  | Usage                        | Description                |
| -------- | ---------------------------- | -------------------------- |
| `create` | `create [project] <feature>` | Create new worktree        |
| `remove` | `remove <name-or-path>`      | Remove worktree and branch |
| `info`   | `info`                       | Get repo info              |
| `list`   | `list`                       | List existing worktrees    |

## Error Codes

| Code                       | Meaning                              | Action                    |
| -------------------------- | ------------------------------------ | ------------------------- |
| `MISSING_ARGS`             | Missing project/feature for monorepo | Ask for both              |
| `MISSING_FEATURE`          | No feature name (standalone)         | Ask for feature           |
| `PROJECT_NOT_FOUND`        | Project not in .gitmodules           | Show available projects   |
| `MULTIPLE_PROJECTS_MATCH`  | Ambiguous project name               | Use AskUserQuestion       |
| `MULTIPLE_WORKTREES_MATCH` | Ambiguous worktree for remove        | Use AskUserQuestion       |
| `BRANCH_CHECKED_OUT`       | Branch in use elsewhere              | Suggest different name    |
| `WORKTREE_EXISTS`          | Path already exists                  | Suggest use or remove     |
| `WORKTREE_CREATE_FAILED`   | Git command failed                   | Show git error            |
| `WORKTREE_REMOVE_FAILED`   | Cannot remove worktree               | Check uncommitted changes |

## Example Session

```
User: /worktree fix the login validation bug

Claude: [Runs: node .claude/scripts/worktree.cjs info --json]
        [Detects: standalone repo, envFiles: [".env.example"]]
        [Detects prefix from "fix" keyword: fix]
        [Converts slug: "login-validation-bug"]

Claude: [Uses AskUserQuestion for env files]
        "Which environment files should be copied?"
        Options: .env.example

User: .env.example

Claude: [Runs: node .claude/scripts/worktree.cjs create "login-validation-bug" --prefix fix --env ".env.example"]

Output: Worktree created at ../worktrees/myrepo-login-validation-bug
        Branch: fix/login-validation-bug
```

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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
