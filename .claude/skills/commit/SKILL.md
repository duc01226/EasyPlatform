---
name: commit
version: 2.0.0
description: '[Git] Stage changes and create git commits with conventional commit messages. Use when asked to "commit", "stage and commit", "save changes", or after completing implementation tasks. Alias for /git/cm.'
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

**Goal:** Stage changes and create well-structured git commits following Conventional Commits format.

**Workflow:**

1. **Analyze Changes** — Run git status/diff to understand staged and unstaged changes
2. **Stage Changes** — Add relevant files (specific or all)
3. **Generate Message** — Detect type (feat/fix/refactor/etc.), extract scope from paths, write subject, and add detailed summary body
4. **Commit** — Create commit with HEREDOC (title + detailed summary + attribution footer)
5. **Verify** — Confirm with git status and git log

**Key Rules:**

- DO NOT push unless explicitly requested
- Never commit secrets, credentials, or .env files
- Never use `--amend` or `--no-verify` unless explicitly requested
- Include `Generated with [Claude Code]` attribution footer

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Git Commit Skill

Stage changes and create well-structured git commits following Conventional Commits format.

## IMPORTANT: Bypass git-commit-block Hook

Before running any `git add` or `git commit` commands, create the marker file to bypass the `git-commit-block` hook:

```bash
PROJ=$(git rev-parse --show-toplevel) && mkdir -p "$PROJ/tmp/claude-temp" && touch "$PROJ/tmp/claude-temp/.commit-skill-active"
```

After committing (success or failure), **always** clean up the marker:

```bash
rm -f "$(git rev-parse --show-toplevel)/tmp/claude-temp/.commit-skill-active"
```

## Workflow

### Step 1: Analyze Changes

```bash
# Check current status (never use -uall flag)
git status

# See staged changes
git diff --cached

# See unstaged changes
git diff

# Check recent commit style
git log --oneline -5
```

### Step 2: Stage Changes

```bash
# Stage all changes
git add .

# Or stage specific files
git add <file-path>
```

### Step 2.5: Docs-Update Triage

Before committing, check if staged files impact documentation:

1. Run `git diff --name-only --cached` to list staged files
2. Check if any staged file matches doc-impact patterns:
    - `src/Services/**` → may impact `docs/business-features/`
    - `.claude/skills/**` → may impact `.claude/docs/skills/`
    - `.claude/hooks/**` → may impact `.claude/docs/hooks/`
    - `.claude/workflows.json` → may impact `CLAUDE.md` workflow table
    - `src/WebV2/**` → may impact frontend pattern docs
3. If matches found: invoke `/docs-update` skill, then re-stage any doc changes with `git add`
4. If no matches: skip (log "No doc-impacting files staged")

### Step 3: Generate Commit Message

Analyze staged changes and generate message following **Conventional Commits**:

```
<type>(<scope>): <subject>

<detailed summary of changes>
```

#### Type Detection

| Change Pattern          | Type       |
| ----------------------- | ---------- |
| New file/feature        | `feat`     |
| Bug fix, error handling | `fix`      |
| Code restructure        | `refactor` |
| Documentation only      | `docs`     |
| Tests only              | `test`     |
| Dependencies, config    | `chore`    |
| Performance improvement | `perf`     |
| Formatting only         | `style`    |

#### Scope Rules

Extract from file paths:

- `src/auth/` → `auth`
- `.claude/skills/` → `claude-skills`
- `libs/{shared-lib}/` → `{shared-lib}`
- Multiple unrelated areas → omit scope

#### Subject Rules

- Imperative mood ("add" not "added")
- Lowercase start
- No period at end
- Max 50 characters

#### Body Rules (MANDATORY)

- Include a detailed summary body (not title-only commits)
- Describe what changed and why in 2-6 concise bullet points
- Keep each bullet specific to files/behavior changed
- Avoid vague lines like "update code" or "minor fixes"

### Step 4: Commit

Use HEREDOC for proper formatting:

```bash
git commit -m "$(cat <<'EOF'
type(scope): subject

- summarize key change 1 with intent
- summarize key change 2 with impact

Generated by AI
EOF
)"
```

### Step 5: Verify

```bash
git status
git log -1
```

## Examples

```
feat(employee): add department filter to list

- add department query parameter in employee list endpoint
- wire frontend filter control to request payload
- update tests for filtered and unfiltered list behavior

fix(validation): handle empty date range

- guard null/empty date inputs before parsing
- return validation message instead of throwing format exception
```

## Critical Rules

- **ALWAYS stage all unstaged changes** before committing — run `git add .` (or specific files) so nothing is left behind
- **DO NOT push** to remote unless explicitly requested
- **Review staged changes** before committing
- **Never commit** secrets, credentials, or .env files
- **Never use** `git commit --amend` unless explicitly requested AND the commit was created in this session AND not yet pushed
- **Never skip** hooks with `--no-verify` unless explicitly requested
- Commit message must include both a Conventional Commit title and a detailed summary body
- Include attribution footer: `Generated by AI`

## Push & PR Operations

This skill handles **commit only**. Push-to-remote and pull request creation are delegated to `git-manager` sub-agent (`subagent_type: "git-manager"`).

`git-manager` handles:

- Conventional commit message validation enforcement
- `--no-verify` bypass prevention
- PR creation with structured summaries

Spawn `git-manager` after committing when user says "push", "create PR", or "open PR".

## Sub-Agent Type Override

> **MANDATORY:** Push and PR operations spawn `git-manager` sub-agent (`subagent_type: "git-manager"`), NOT the main agent.
> **Rationale:** `git-manager` enforces conventional commits, prevents hook bypasses, and handles PR creation with structured summaries.

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** NEVER use `code-reviewer` for specialized domains (architecture, security, performance, DB, E2E, integration-test, git).

<!-- /SYNC:sub-agent-selection -->

## Related

- `changelog`
- `branch-comparison`

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
