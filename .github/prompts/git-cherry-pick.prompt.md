---
description: "Cherry-pick commits with conflict resolution guidance"
---

# Git Cherry-Pick

Cherry-pick commits from another branch with conflict resolution.

## Workflow

### Step 1: Identify Commits

```bash
# Find commits to cherry-pick
git log --oneline <source-branch> -20

# Show commit details
git show <commit-hash> --stat
```

### Step 2: Cherry-Pick

```bash
# Single commit
git cherry-pick <commit-hash>

# Multiple commits
git cherry-pick <hash1> <hash2> <hash3>

# Range of commits
git cherry-pick <start-hash>^..<end-hash>
```

### Step 3: Handle Conflicts

If conflicts occur:

```bash
# Check conflict status
git status

# View conflicting files
git diff --name-only --diff-filter=U
```

#### Resolve Conflicts

1. Open conflicting files
2. Find `<<<<<<<`, `=======`, `>>>>>>>` markers
3. Choose correct version or merge manually
4. Remove conflict markers

```bash
# After resolving
git add <resolved-file>
git cherry-pick --continue
```

#### Abort if Needed

```bash
git cherry-pick --abort
```

### Step 4: Verify

```bash
git log --oneline -5
git diff HEAD~1
```

## Options

| Flag | Purpose |
|------|---------|
| `-n` / `--no-commit` | Apply changes without committing |
| `-x` | Add "cherry picked from" reference |
| `--edit` | Edit commit message |
| `-m 1` | For merge commits, use parent 1 |

## Common Scenarios

### Pick Single Fix

```bash
git cherry-pick abc1234
```

### Pick Without Committing

```bash
git cherry-pick -n abc1234
# Make additional changes
git commit -m "feat: combined changes"
```

### Pick from Different Remote

```bash
git fetch upstream
git cherry-pick upstream/main~3
```

## Important

- Cherry-pick creates NEW commits (different hash)
- Original commits remain in source branch
- Use `-x` for traceability in shared repos
