---
name: git-conflict-resolve
version: 1.0.1
description: '[Git] Use when resolving git merge, cherry-pick, rebase or stash-apply conflicts, with backup and analysis.'
---

## Quick Summary

**Goal:** Resolve git merge/cherry-pick/rebase conflicts with backup, analysis, and structured reporting.

**Summary:** Detect the operation and conflict paths → back up distinct paths → analyze both sides and callers → resolve → verify → hand off or continue under caller authority → report → final review. Preserve recovery files and the owning review/commit gate.

**Workflow:**

1. **Backup** — Create safety backup of current state
2. **Analyze** — Identify conflict types and affected files
3. **Resolve** — Apply resolution strategy per conflict
4. **Report** — Generate conflict resolution report

**Key Rules:**

- Always create backup before resolving conflicts
- Prefer preserving both sides' intent over arbitrary choice
- Generate resolution report for audit trail

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [Purpose](#purpose)
- [Variables](#variables)
- [Workflow](#workflow)
- [Resolution Decision Framework](#resolution-decision-framework)
- [Notes](#notes)
- [Closing Reminders](#closing-reminders)

## Purpose

Systematically resolve git conflicts (merge, cherry-pick, rebase) with:

1. Backup of all conflicted files before resolution
2. Per-file conflict analysis with root cause explanation
3. Resolution with documented rationale
4. Comprehensive report generation

## Variables

OPERATION: auto-detect (cherry-pick, merge, rebase) from git state
REPORT_PATH: `tmp/reports/conflict-resolution-{date}-{operation}-{source}.md`
BACKUP_PATH: `tmp/conflict-backups-{date}/`

## Workflow

### Step 1: Detect conflict state

```bash
# Detect operation type
git status  # Check for "cherry-pick in progress", "merge in progress", etc.

# List all conflicted files
git diff --name-only --diff-filter=U  # Unmerged files (both modified)
git status --short | grep "^DU\|^UD\|^UU\|^AA\|^DD"  # All conflict types
```

**Which side is which.** The flags `--ours`/`--theirs`, and this skill's *target*/*source*, map by operation. Merge: ours = the branch you are on (target), theirs = the branch merged in (source). Cherry-pick and rebase: ours = the branch being built on (for a rebase, the upstream you replay onto), theirs = the commit being applied. Stash apply/pop: ours = the current branch, theirs = the stashed changes. A stash conflict shows no in-progress marker in `git status`, so take the operation from the caller. Choose what to keep from what each side holds, never from the flag name.

Classify each conflict:

- **DU (Deleted by us):** File exists on source but not on target branch
- **UD (Deleted by them):** File exists on target but deleted by source
- **UU (Both modified):** Both branches modified the same file
- **AA (Both added):** Both branches added a file at the same path
- **DD (Both deleted):** Both branches deleted the file

### Step 2: Create backup files

**MANDATORY before any resolution.**

```bash
mkdir -p {BACKUP_PATH}
```

Use the host's file APIs to copy each conflicted file's exact bytes, including markers, to `{BACKUP_PATH}/<repository-relative-path>.conflict`. Create its parent directories first and refuse to overwrite an existing backup. Preserve the full relative path: `src/a/config.json` and `src/b/config.json` must have separate backups. If a conflicted working-tree file is absent, record that absence and preserve the available index-stage versions before resolving it. Verify every saved copy before editing; a missing/failed backup blocks resolution. Use a new run directory when a prior backup already occupies the destination.

Create a TaskCreate item for each conflicted file PLUS report and review tasks.

### Step 3: Analyze each conflict (per file)

For each conflicted file, perform this analysis:

#### 3a. Understand the conflict type

- **DU/UD (deleted by one side):** Check if the file was introduced in a commit not present on the target branch. Read the file content from the source commit to understand what it provides.
- **UU (both modified):** Read the conflict markers. Identify what each side changed and why.

#### 3b. Read both versions

```bash
# For UU conflicts: read the file with conflict markers
# Look for <<<<<<< HEAD / ======= / >>>>>>> markers

# For DU conflicts: get the source version
git show <source-commit>:<file-path>

# Optionally extract clean versions
git show HEAD:<file-path> > {BACKUP_PATH}/<repository-relative-path>.ours
git show <source-commit>:<file-path> > {BACKUP_PATH}/<repository-relative-path>.theirs
```

Create parent directories and reserve distinct, nonexisting paths before extracting these optional versions. Use host file/process APIs on Windows rather than assuming POSIX `mkdir` or redirection; a failed extraction is not a valid backup.

#### 3c. Analyze dependencies

- **Check callers:** Do other files reference methods/classes in this file? Are caller names compatible?
- **Check constructor/DI:** Does the resolution require new dependencies?
- **Check cross-file consistency:** Will the resolution break other files?

#### 3d. Determine resolution strategy

| Conflict Pattern                                       | Resolution Strategy                                |
| ------------------------------------------------------ | -------------------------------------------------- |
| DU: File needed by feature                             | Accept theirs (add the file)                       |
| DU: File not needed                                    | Keep ours (skip the file)                          |
| UU: Non-overlapping changes                            | Merge both (keep all changes)                      |
| UU: Overlapping, source modifies methods not on target | Keep ours if methods don't exist on target         |
| UU: Overlapping, both modify same method               | Manual merge with careful analysis                 |
| UU: Schema/snapshot files                              | Accept theirs for new entities, merge for modified |

### Step 4: Resolve each conflict

Apply the determined strategy:

```bash
# Accept theirs (source version)
git checkout --theirs <file> && git add <file>

# Keep ours (target version)
git checkout --ours <file> && git add <file>

# Manual merge: Edit the file to remove conflict markers, then:
git add <file>
```

For manual merges:

1. Remove `<<<<<<< HEAD`, `=======`, `>>>>>>> <commit>` markers
2. Keep the correct content from each side
3. Verify no leftover conflict markers: `git diff --check`

### Step 5: Verify resolution

```bash
# Check no unmerged files remain
git diff --name-only --diff-filter=U

# Check no leftover conflict markers
git diff --check

# Review overall status
git status
```

### Step 6: Hand off or complete under Git authority

Determine the owning caller and its authorized operation before any continuation that changes history. When invoked by `/pull-request` or another caller requiring review before commit, return the resolved/staged candidate, operation markers, exact scope, HEAD and pending continuation; leave HEAD unchanged until the caller’s review/commit gate. Conflict-resolution authorization alone never overrides that gate.

Standalone: confirm the existing user authorization covers the exact history-changing operation; if absent, report the ready candidate and request the missing authorization. Route a merge commit through `/commit` and its candidate-review/receipt contract, never raw `git commit`. For an authorized cherry-pick/rebase continuation, satisfy the owning review/candidate authority first; use a noninteractive editor (`GIT_EDITOR=true git cherry-pick --continue` or `GIT_EDITOR=true git rebase --continue` on POSIX; equivalent process environment on Windows), inspect exit status and operation markers after each continuation, and stop to resolve any new conflicts. Do not claim completion while an operation marker remains. Stash conflicts have no continue command; report resolved state without inventing one.

### Step 7: Generate report

Create a comprehensive report at `{REPORT_PATH}` with:

1. **Header:** Date, source commit/branch, target branch, result commit
2. **Summary:** Total conflicts, categories, overall risk
3. **Per-file details:**
    - File path
    - Conflict type (DU/UU/etc.)
    - Root cause (why the conflict occurred)
    - Resolution chosen (accept theirs/keep ours/manual merge)
    - Rationale (why this resolution was chosen)
    - Risk level (Low/Medium/High)
4. **Summary table:** All files with conflict type, resolution, risk
5. **Root cause analysis:** Common patterns across conflicts
6. **Recommendations:** Follow-up actions, build verification, etc.

### Step 8: Final review

- Verify report is complete and accurate
- Check that all backup files exist
- Confirm build passes (if applicable)
- Flag any Medium/High risk resolutions for user attention

## Resolution Decision Framework

### When to "Accept Theirs" (source version)

- File is NEW (DU) and required by the feature being cherry-picked/merged
- File contains schema/config additions needed by new entities
- Source has strictly more content (e.g., empty class → populated class)

### When to "Keep Ours" (target version)

- Source modifies methods that don't exist on target (added by uncommitted prerequisite)
- Source renames methods/types that target callers still reference by old names
- Changes are not required for the feature being brought in

### When to "Manual Merge"

- Both sides have legitimate changes that need to coexist
- Schema files where both add new entries (keep both)
- Config files where both add new sections

### Risk Assessment

| Risk       | Criteria                                       | Action                                       |
| ---------- | ---------------------------------------------- | -------------------------------------------- |
| **Low**    | New file, no existing code affected            | Proceed                                      |
| **Medium** | Method changes, caller compatibility uncertain | Flag in report, recommend build verification |
| **High**   | Breaking changes, cross-service impact         | Require user confirmation before proceeding  |

## Notes

- Always create backup files BEFORE any resolution
- Understand the root cause first, then resolve — never force-resolve blind. — why: a guessed resolution silently drops or duplicates legitimate changes
- For complex conflicts (>3 conflict regions in one file), extract both clean versions for side-by-side analysis
- Check for prerequisite commits: if a cherry-pick modifies files from prior commits not on target, note this in the report
- Use `git diff <commit>^..<commit> -- <file>` to see the actual diff of a specific commit (not the full file state)

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `understand-code-first` — Read and trace the target and existing patterns before changing code; planning or editing code → .claude/skills/shared/protocols/understand-code-first.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** for code work, read the target and relevant conventions before planning or editing; seek 3+ fitting examples when available and record fewer/none. Do not impose code discovery on work with no code surface. The code graph is optional, stale-able advice for high-risk impact, never a requirement.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim; never speculate. Confidence >80% to act, <60% = do NOT recommend; "not enough evidence" is valid output.

<!-- /SYNC:evidence-based-reasoning:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Resolve git merge/cherry-pick/rebase conflicts with backup, analysis, and structured reporting.

**MUST ATTENTION Route:** detect → verify path-preserving backups → analyze both sides/callers → resolve → verify → authorized handoff/continuation → report → final review. Never overwrite recovery data or bypass the caller's review/commit gate.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Understand Code First:** search 3+ patterns and read code before any modification.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
