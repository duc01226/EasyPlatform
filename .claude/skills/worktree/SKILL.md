---
name: worktree
version: 1.0.0
description: '[Git] Use when you need to create isolated git worktree for parallel development.'
disable-model-invocation: false
---

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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** Protocols in force (concise digest of the SYNC/shared blocks this skill carries):

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced proof per claim, confidence >80% to act, never guess as fact.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
