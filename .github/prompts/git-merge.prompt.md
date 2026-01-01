---
agent: 'agent'
description: 'Merge code from one branch to another safely'
tools: ['execute']
---

# Git Merge

Merge code from one branch to another following safe merge practices.

## Parameters

**Target Branch:** ${input:to_branch}
The branch to merge INTO (default: main)

**Source Branch:** ${input:from_branch}
The branch to merge FROM (default: current branch)

## Workflow

### Step 1: Sync with Remote (CRITICAL)

```bash
git fetch origin
git checkout {TO_BRANCH}
git pull origin {TO_BRANCH}
```

### Step 2: Merge from REMOTE Tracking Branch

```bash
# Use origin/{FROM_BRANCH} to merge remote state, not local WIP
git merge origin/{FROM_BRANCH} --no-ff -m "merge: {FROM_BRANCH} into {TO_BRANCH}"
```

**Why `origin/{FROM_BRANCH}`:** Ensures merging only committed+pushed changes, not local uncommitted work.

### Step 3: Resolve Conflicts (if any)

If conflicts exist:
1. Identify conflicting files: `git status`
2. Resolve each conflict manually
3. Stage resolved files: `git add .`
4. Complete merge: `git commit`

### Step 4: Push Merged Result

```bash
git push origin {TO_BRANCH}
```

## Safety Checklist

- [ ] Fetched latest from remote
- [ ] Pulled latest changes to target branch
- [ ] Merged from remote tracking branch (not local)
- [ ] All conflicts resolved properly
- [ ] Tests pass after merge
- [ ] Pushed to remote

## Notes

- If `gh` command is not available, instruct user to install and authorize GitHub CLI
- Always fetch and pull latest remote state before merging to avoid stale conflicts
- Use `--no-ff` to preserve branch history in merge commit
