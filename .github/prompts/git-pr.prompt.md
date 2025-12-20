---
description: "Pull request creation workflow with proper documentation"
---

# Git Pull Request Prompt

## Overview

Create well-documented pull requests that facilitate code review and maintain project history.

## Workflow

### Step 1: Pre-PR Checks

Before creating PR:

```bash
# Ensure branch is up to date
git fetch origin main
git rebase origin/main

# Verify build passes
dotnet build
npm run build

# Run tests
dotnet test
npm run test

# Check for lint issues
npm run lint
```

### Step 2: Review Changes

```bash
# View all commits in branch
git log origin/main..HEAD --oneline

# View full diff from main
git diff origin/main...HEAD

# Check files changed
git diff origin/main...HEAD --stat
```

### Step 3: Push Branch

```bash
# Push with upstream tracking
git push -u origin <branch-name>
```

### Step 4: Create Pull Request

Use GitHub CLI or web interface:

```bash
gh pr create --title "type(scope): description" --body "$(cat <<'EOF'
## Summary

Brief description of what this PR does and why.

## Changes

- Change 1
- Change 2
- Change 3

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if UI changes)

[Add screenshots here]

## Checklist

- [ ] Code follows project conventions
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)

## Related Issues

Closes #XXX
EOF
)"
```

## PR Template

```markdown
## Summary

[One paragraph explaining the purpose of this PR]

## Changes

### Added
- [New features/files]

### Changed
- [Modifications to existing code]

### Fixed
- [Bug fixes]

### Removed
- [Deleted code/features]

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test addition/update

## Testing

### Automated Tests
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] All tests passing

### Manual Testing
- Tested on: [environment/browser]
- Steps to test:
  1. [Step 1]
  2. [Step 2]
  3. [Expected result]

## Screenshots

[If applicable, add screenshots to show UI changes]

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged

## Breaking Changes

[Describe any breaking changes and migration steps, or write "None"]

## Related Issues

Closes #[issue number]
Related to #[issue number]
```

## PR Guidelines

### Title Format

Follow conventional commit format:
```
type(scope): brief description
```

Examples:
- `feat(auth): add OAuth2 login support`
- `fix(api): handle null response in user endpoint`
- `refactor(employee): extract validation logic`

### Description Best Practices

1. **Be concise but complete**
   - Explain what and why
   - Don't repeat the diff

2. **Provide context**
   - Link to related issues
   - Explain design decisions

3. **Help reviewers**
   - Highlight areas needing attention
   - Explain complex changes

4. **Include testing info**
   - How to test manually
   - What tests were added

### Size Guidelines

| PR Size | Lines Changed | Review Time |
|---------|---------------|-------------|
| Small | < 100 | Quick review |
| Medium | 100-300 | Normal review |
| Large | 300-500 | Extended review |
| Very Large | > 500 | Consider splitting |

**Prefer smaller, focused PRs.**

## PR Checklist

Before requesting review:

- [ ] Branch is up to date with main
- [ ] Build passes
- [ ] All tests pass
- [ ] Lint passes
- [ ] Self-review completed
- [ ] Description is complete
- [ ] Related issues linked
- [ ] Breaking changes documented

## Responding to Review

1. **Address all comments**
   - Respond to each comment
   - Mark resolved when fixed

2. **Push fixes as new commits**
   - Easier to review incrementally
   - Squash when merging

3. **Re-request review**
   - After addressing feedback
   - Ping if urgent

## Important

- Keep PRs focused and small
- Write for reviewers, not yourself
- Document breaking changes
- Link to related issues

**IMPORTANT:** A good PR tells a story. Make it easy for reviewers to understand your changes.
