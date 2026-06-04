---
name: pr
version: 1.0.0
description: '[Git] Use when you need to create pull request with standard format.'
disable-model-invocation: false
---

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

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):** MUST ATTENTION honor every block below.

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** apply critical + sequential thinking; every claim needs traced `file:line` proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
