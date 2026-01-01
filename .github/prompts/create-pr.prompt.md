---
agent: agent
description: Create a pull request with proper analysis of REMOTE branch differences, following conventional commit format.
---

# Create Pull Request

Create a pull request for the current branch.

## Parameters
$input

Default: `main` branch

## Workflow

### Step 1: Ensure Remote is Synced

```bash
git fetch origin
git push -u origin HEAD  # Push current branch if not pushed
```

### Step 2: Analyze REMOTE Diff (CRITICAL)

**IMPORTANT:** Always compare REMOTE branches, not local:

```bash
# Get current and target branch names
git rev-parse --abbrev-ref HEAD
# e.g., feature/add-employee-export

# Get commits between remote branches (what PR will actually contain)
git log origin/main...origin/HEAD --oneline

# Get file diff between remote branches
git diff origin/main...origin/HEAD --stat
git diff origin/main...origin/HEAD
```

**DO NOT use:**
- `git diff main...HEAD` (includes unpushed local changes)
- `git diff --cached` (staged local changes)
- `git status` (local working tree state)

### Step 3: Generate PR Content

Based on REMOTE diff analysis:

**Title Format (Conventional Commits):**
- `feat: add employee export functionality`
- `fix: resolve null reference in employee query`
- `refactor: simplify validation logic`
- `docs: update API documentation`

**Body Template:**
```markdown
## Summary

- [Primary change description]
- [Secondary change if applicable]

## Changes

### Added
- [New feature/file]

### Changed
- [Modified behavior]

### Fixed
- [Bug fix]

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related Issues

Closes #[issue-number]
```

### Step 4: Create PR

```bash
gh pr create \
  --base main \
  --head $(git rev-parse --abbrev-ref HEAD) \
  --title "feat: descriptive title" \
  --body "## Summary
- Change 1
- Change 2

## Testing
- [ ] Tests pass"
```

## PR Guidelines

### Title Conventions

| Prefix | Use When |
|--------|----------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code refactoring |
| `docs:` | Documentation only |
| `test:` | Adding/updating tests |
| `chore:` | Maintenance tasks |
| `perf:` | Performance improvement |

### Body Best Practices

1. **Be concise** - Focus on what and why, not how
2. **Link issues** - Use `Closes #123` or `Fixes #123`
3. **Include testing steps** if complex change
4. **Note breaking changes** prominently

### Pre-PR Checklist

Before creating PR:
- [ ] All changes are pushed to remote
- [ ] Branch is up-to-date with base branch
- [ ] Tests pass locally
- [ ] Code follows EasyPlatform patterns
- [ ] No secrets or sensitive data in commits

## Error Handling

If `gh` command not available:
```
GitHub CLI not found. Install and authenticate:
1. Install: https://cli.github.com/
2. Authenticate: gh auth login
```

If local has unpushed commits:
```bash
git push origin HEAD
```
Then retry PR creation.

## Output

After creating PR, provide:
- PR URL
- Summary of changes included
- Any review notes or concerns
