---
agent: 'agent'
description: 'Review recent changes and provide summary of work done'
tools: ['read', 'search', 'execute']
---

# Review Recent Changes

Review the current branch and recent commits to summarize work done.

## Process

### Step 1: Get Git Status
```bash
git status
git branch --show-current
git log --oneline -20
```

### Step 2: Analyze Changes
```bash
# Diff against main/master
git diff main...HEAD --stat
git diff main...HEAD --name-only

# Recent commit details
git log main...HEAD --pretty=format:"%h - %s (%an, %ar)"
```

### Step 3: Categorize Changes

Group changes by:
- **New Features:** New functionality added
- **Bug Fixes:** Issues resolved
- **Refactoring:** Code improvements without behavior change
- **Documentation:** Docs, comments, README updates
- **Tests:** New or updated tests
- **Configuration:** Config, build, CI/CD changes

## Report Format

```markdown
## Changes Summary

**Branch:** [branch-name]
**Commits:** [X] commits ahead of main
**Files Changed:** [Y] files

### New Features
- [Feature 1]: Brief description
- [Feature 2]: Brief description

### Bug Fixes
- [Fix 1]: What was fixed

### Refactoring
- [Refactor 1]: What was improved

### Key Files Modified
| File | Type | Summary |
|------|------|---------|
| path/to/file | Added/Modified/Deleted | Brief description |

### Impact Analysis
- **Breaking Changes:** [Yes/No - details if yes]
- **Migration Required:** [Yes/No - details if yes]
- **Testing Status:** [Tested/Needs Testing]

### Next Steps
- [ ] [Recommended action 1]
- [ ] [Recommended action 2]
```

**IMPORTANT**: This is a read-only review - do not make changes.
