---
name: pr
version: 1.0.0
description: '[Git] Create pull request with standard format'
disable-model-invocation: true
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

**Goal:** Create a pull request with standardized format (summary, test plan, changes list).

**Workflow:**

1. **Analyze** -- Review all commits and changes on the branch
2. **Draft** -- Create PR title (<70 chars) and body with summary + test plan
3. **Create** -- Push branch and create PR via `gh pr create`

**Key Rules:**

- PR title under 70 characters; use body for details
- Include summary bullets and test plan checklist
- Push to remote with `-u` flag before creating PR

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Create Pull Request: $ARGUMENTS

Create a pull request with the standard project format.

## Steps

1. **Check current branch status:**
    - Run `git status` to see all changes
    - Run `git diff` to review modifications
    - Ensure all changes are committed

2. **Analyze commits:**
    - Run `git log --oneline -10` to see recent commits
    - Identify all commits to include in the PR

3. **Create PR with standard format:**

    ```
    gh pr create --title "[Type] Brief description" --body "$(cat <<'EOF'
    ## Summary
    - Bullet points describing changes

    ## Changes
    - List of specific changes made

    ## Test Plan
    - [ ] Unit tests added/updated
    - [ ] Manual testing completed
    - [ ] No regressions introduced

    ## Related Issues
    - Closes #issue_number (if applicable)

    Generated with Claude Code
    EOF
    )"
    ```

4. **PR Title Format:**
    - `[Feature]` - New functionality
    - `[Fix]` - Bug fix
    - `[Refactor]` - Code improvement
    - `[Docs]` - Documentation only
    - `[Test]` - Test changes only

## Notes

- Ensure branch is pushed before creating PR
- Target branch is usually `develop` or `master`
- Add reviewers if specified in $ARGUMENTS

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
