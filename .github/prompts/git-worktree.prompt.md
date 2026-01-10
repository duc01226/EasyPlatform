---
description: "Create isolated git worktree for parallel development"
---

# Git Worktree

Create and manage isolated git worktrees for parallel feature development.

## When to Use

- Working on multiple features simultaneously
- Testing changes without affecting main work
- Reviewing PRs while keeping current work
- Isolating experimental changes

## Workflow

### Step 1: List Existing Worktrees

```bash
git worktree list
```

### Step 2: Create New Worktree

```bash
# Create with new branch
git worktree add ../worktrees/<feature-name> -b <branch-name>

# Create from existing branch
git worktree add ../worktrees/<feature-name> <existing-branch>

# Create from specific commit
git worktree add ../worktrees/<feature-name> <commit-hash>
```

### Step 3: Setup Worktree

```bash
cd ../worktrees/<feature-name>

# Copy environment files
cp ../main-repo/.env .env

# Install dependencies
npm install  # or dotnet restore
```

### Step 4: Work in Worktree

```bash
# Make changes, commit normally
git add .
git commit -m "feat: new feature"
```

### Step 5: Remove Worktree

```bash
# When done
git worktree remove ../worktrees/<feature-name>

# Force remove (if uncommitted changes)
git worktree remove --force ../worktrees/<feature-name>

# Delete associated branch
git branch -d <branch-name>
```

## Naming Convention

| Type | Branch Prefix | Example |
|------|---------------|---------|
| Feature | `feat/` | `feat/user-auth` |
| Fix | `fix/` | `fix/login-bug` |
| Refactor | `refactor/` | `refactor/api-layer` |
| Docs | `docs/` | `docs/readme-update` |

## Directory Structure

```
projects/
├── main-repo/           # Main worktree
├── worktrees/
│   ├── feature-auth/    # Feature worktree
│   ├── fix-login/       # Fix worktree
│   └── review-pr-123/   # PR review worktree
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `git worktree list` | List all worktrees |
| `git worktree add <path> -b <branch>` | Create new worktree |
| `git worktree remove <path>` | Remove worktree |
| `git worktree prune` | Clean up stale worktrees |

## Important

- Each worktree has its own working directory
- Branches can only be checked out in ONE worktree
- Share `.git` folder with main repo (saves space)
- Copy `.env` files manually (not tracked by git)
